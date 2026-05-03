begin;

create table if not exists public.dkd_support_threads (
  dkd_id uuid primary key default gen_random_uuid(),
  dkd_user_id uuid not null references auth.users(id) on delete cascade,
  dkd_ticket_code text not null unique,
  dkd_topic_key text not null default 'dkd_general',
  dkd_topic_title text not null default 'Destek',
  dkd_priority_key text not null default 'dkd_normal',
  dkd_status_key text not null default 'dkd_open',
  dkd_status_title text not null default 'Yeni talep',
  dkd_contact_note text,
  dkd_source_key text not null default 'dkd_mobile_app',
  dkd_last_message_text text,
  dkd_created_at timestamptz not null default timezone('utc', now()),
  dkd_updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.dkd_support_messages (
  dkd_id uuid primary key default gen_random_uuid(),
  dkd_thread_id uuid not null references public.dkd_support_threads(dkd_id) on delete cascade,
  dkd_user_id uuid not null references auth.users(id) on delete cascade,
  dkd_sender_key text not null default 'dkd_customer',
  dkd_sender_title text not null default 'Müşteri',
  dkd_message_text text not null,
  dkd_created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.dkd_support_ai_suggestions (
  dkd_id uuid primary key default gen_random_uuid(),
  dkd_thread_id uuid not null references public.dkd_support_threads(dkd_id) on delete cascade,
  dkd_message_id uuid references public.dkd_support_messages(dkd_id) on delete cascade,
  dkd_provider_key text not null default 'dkd_gemini',
  dkd_category_key text,
  dkd_priority_key text,
  dkd_summary_text text,
  dkd_reply_draft_text text,
  dkd_status_key text not null default 'dkd_draft',
  dkd_created_at timestamptz not null default timezone('utc', now())
);

create index if not exists dkd_support_threads_user_created_idx
  on public.dkd_support_threads(dkd_user_id, dkd_created_at desc);

create index if not exists dkd_support_threads_status_created_idx
  on public.dkd_support_threads(dkd_status_key, dkd_created_at desc);

create index if not exists dkd_support_messages_thread_created_idx
  on public.dkd_support_messages(dkd_thread_id, dkd_created_at asc);

create index if not exists dkd_support_ai_suggestions_thread_created_idx
  on public.dkd_support_ai_suggestions(dkd_thread_id, dkd_created_at desc);

alter table public.dkd_support_threads enable row level security;
alter table public.dkd_support_messages enable row level security;
alter table public.dkd_support_ai_suggestions enable row level security;

drop policy if exists dkd_support_threads_select_own_or_admin on public.dkd_support_threads;
create policy dkd_support_threads_select_own_or_admin
  on public.dkd_support_threads
  for select
  to authenticated
  using (auth.uid() = dkd_user_id or public.dkd_is_admin());

drop policy if exists dkd_support_threads_insert_own on public.dkd_support_threads;
create policy dkd_support_threads_insert_own
  on public.dkd_support_threads
  for insert
  to authenticated
  with check (auth.uid() = dkd_user_id);

drop policy if exists dkd_support_threads_update_admin on public.dkd_support_threads;
create policy dkd_support_threads_update_admin
  on public.dkd_support_threads
  for update
  to authenticated
  using (public.dkd_is_admin())
  with check (public.dkd_is_admin());

drop policy if exists dkd_support_messages_select_own_or_admin on public.dkd_support_messages;
create policy dkd_support_messages_select_own_or_admin
  on public.dkd_support_messages
  for select
  to authenticated
  using (auth.uid() = dkd_user_id or public.dkd_is_admin());

drop policy if exists dkd_support_messages_insert_customer_own on public.dkd_support_messages;
create policy dkd_support_messages_insert_customer_own
  on public.dkd_support_messages
  for insert
  to authenticated
  with check (auth.uid() = dkd_user_id and dkd_sender_key = 'dkd_customer');

drop policy if exists dkd_support_messages_insert_admin on public.dkd_support_messages;
create policy dkd_support_messages_insert_admin
  on public.dkd_support_messages
  for insert
  to authenticated
  with check (public.dkd_is_admin());

drop policy if exists dkd_support_ai_suggestions_select_admin on public.dkd_support_ai_suggestions;
create policy dkd_support_ai_suggestions_select_admin
  on public.dkd_support_ai_suggestions
  for select
  to authenticated
  using (public.dkd_is_admin());

drop policy if exists dkd_support_ai_suggestions_write_admin on public.dkd_support_ai_suggestions;
create policy dkd_support_ai_suggestions_write_admin
  on public.dkd_support_ai_suggestions
  for all
  to authenticated
  using (public.dkd_is_admin())
  with check (public.dkd_is_admin());

grant select, insert, update on public.dkd_support_threads to authenticated;
grant select, insert on public.dkd_support_messages to authenticated;
grant select, insert, update, delete on public.dkd_support_ai_suggestions to authenticated;

create or replace function public.dkd_touch_support_threads_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.dkd_updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists dkd_touch_support_threads_updated_at on public.dkd_support_threads;
create trigger dkd_touch_support_threads_updated_at
before update on public.dkd_support_threads
for each row
execute function public.dkd_touch_support_threads_updated_at();

create or replace function public.dkd_sync_support_thread_last_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.dkd_support_threads
  set
    dkd_last_message_text = left(new.dkd_message_text, 240),
    dkd_updated_at = timezone('utc', now())
  where dkd_id = new.dkd_thread_id;

  return new;
end;
$$;

drop trigger if exists dkd_sync_support_thread_last_message on public.dkd_support_messages;
create trigger dkd_sync_support_thread_last_message
after insert on public.dkd_support_messages
for each row
execute function public.dkd_sync_support_thread_last_message();

create or replace function public.dkd_create_support_thread_with_message(
  dkd_param_ticket_code text,
  dkd_param_topic_key text,
  dkd_param_topic_title text,
  dkd_param_priority_key text,
  dkd_param_contact_note text,
  dkd_param_message_text text,
  dkd_param_source_key text default 'dkd_mobile_app'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid := auth.uid();
  dkd_var_thread_id uuid;
  dkd_var_message_id uuid;
  dkd_var_ticket_code text;
  dkd_var_topic_key text;
  dkd_var_topic_title text;
  dkd_var_priority_key text;
  dkd_var_contact_note text;
  dkd_var_message_text text;
  dkd_var_source_key text;
begin
  if dkd_var_user_id is null then
    raise exception 'dkd_auth_required';
  end if;

  dkd_var_ticket_code := upper(left(coalesce(nullif(trim(dkd_param_ticket_code), ''), 'DKD-' || replace(gen_random_uuid()::text, '-', '')), 64));
  dkd_var_topic_key := left(coalesce(nullif(trim(dkd_param_topic_key), ''), 'dkd_general'), 80);
  dkd_var_topic_title := left(coalesce(nullif(trim(dkd_param_topic_title), ''), 'Destek'), 120);
  dkd_var_priority_key := left(coalesce(nullif(trim(dkd_param_priority_key), ''), 'dkd_normal'), 80);
  dkd_var_contact_note := nullif(left(trim(coalesce(dkd_param_contact_note, '')), 320), '');
  dkd_var_message_text := trim(coalesce(dkd_param_message_text, ''));
  dkd_var_source_key := left(coalesce(nullif(trim(dkd_param_source_key), ''), 'dkd_mobile_app'), 80);

  if length(dkd_var_message_text) < 12 then
    raise exception 'dkd_support_message_too_short';
  end if;

  insert into public.dkd_support_threads (
    dkd_user_id,
    dkd_ticket_code,
    dkd_topic_key,
    dkd_topic_title,
    dkd_priority_key,
    dkd_status_key,
    dkd_status_title,
    dkd_contact_note,
    dkd_source_key,
    dkd_last_message_text
  ) values (
    dkd_var_user_id,
    dkd_var_ticket_code,
    dkd_var_topic_key,
    dkd_var_topic_title,
    dkd_var_priority_key,
    'dkd_open',
    'Destek kuyruğunda',
    dkd_var_contact_note,
    dkd_var_source_key,
    left(dkd_var_message_text, 240)
  )
  returning dkd_id into dkd_var_thread_id;

  insert into public.dkd_support_messages (
    dkd_thread_id,
    dkd_user_id,
    dkd_sender_key,
    dkd_sender_title,
    dkd_message_text
  ) values (
    dkd_var_thread_id,
    dkd_var_user_id,
    'dkd_customer',
    'Müşteri',
    dkd_var_message_text
  )
  returning dkd_id into dkd_var_message_id;

  return jsonb_build_object(
    'dkd_ok', true,
    'dkd_thread_id', dkd_var_thread_id,
    'dkd_message_id', dkd_var_message_id,
    'dkd_ticket_code', dkd_var_ticket_code,
    'dkd_status_key', 'dkd_open',
    'dkd_status_title', 'Destek kuyruğunda'
  );
end;
$$;

revoke all on function public.dkd_create_support_thread_with_message(text, text, text, text, text, text, text) from public;
grant execute on function public.dkd_create_support_thread_with_message(text, text, text, text, text, text, text) to authenticated;

commit;
