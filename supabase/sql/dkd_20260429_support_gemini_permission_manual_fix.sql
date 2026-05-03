begin;

-- DKD Gemini destek otomatik cevap sistemi için kesin izin düzeltmesi.
-- Hedef hata: permission denied for table dkd_support_threads / dkd_support_messages

create extension if not exists pgcrypto;

do $$
begin
  if to_regclass('public.dkd_support_threads') is null then
    raise exception 'dkd_support_threads_missing';
  end if;

  if to_regclass('public.dkd_support_messages') is null then
    raise exception 'dkd_support_messages_missing';
  end if;
end;
$$;

alter table public.dkd_support_threads
  add column if not exists dkd_ai_status_key text not null default 'dkd_ai_pending',
  add column if not exists dkd_ai_last_issue_text text,
  add column if not exists dkd_ai_answered_at timestamptz,
  add column if not exists dkd_admin_needed boolean not null default false;

create index if not exists dkd_support_threads_ticket_code_idx
  on public.dkd_support_threads(dkd_ticket_code);

create index if not exists dkd_support_threads_user_created_idx
  on public.dkd_support_threads(dkd_user_id, dkd_created_at desc);

create index if not exists dkd_support_messages_thread_created_idx
  on public.dkd_support_messages(dkd_thread_id, dkd_created_at desc);

create index if not exists dkd_support_messages_sender_created_idx
  on public.dkd_support_messages(dkd_sender_key, dkd_created_at desc);

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on table public.dkd_support_threads to service_role;
grant select, insert, update, delete on table public.dkd_support_messages to service_role;

grant select, insert, update on table public.dkd_support_threads to authenticated;
grant select, insert, update on table public.dkd_support_messages to authenticated;

do $$
begin
  if to_regclass('public.dkd_support_ai_daily_usage') is not null then
    grant select, insert, update, delete on table public.dkd_support_ai_daily_usage to service_role;
    grant select, insert, update on table public.dkd_support_ai_daily_usage to authenticated;
  end if;

  if to_regclass('public.dkd_support_ai_knowledge_base') is not null then
    grant select, insert, update, delete on table public.dkd_support_ai_knowledge_base to service_role;
    grant select on table public.dkd_support_ai_knowledge_base to authenticated;
  end if;
end;
$$;

alter table public.dkd_support_threads enable row level security;
alter table public.dkd_support_messages enable row level security;

drop policy if exists dkd_support_threads_select_owner_admin on public.dkd_support_threads;
create policy dkd_support_threads_select_owner_admin
  on public.dkd_support_threads
  for select
  to authenticated
  using (
    dkd_user_id = auth.uid()
    or coalesce(public.dkd_is_admin(), false)
  );

drop policy if exists dkd_support_threads_insert_owner on public.dkd_support_threads;
create policy dkd_support_threads_insert_owner
  on public.dkd_support_threads
  for insert
  to authenticated
  with check (dkd_user_id = auth.uid());

drop policy if exists dkd_support_threads_update_owner_admin on public.dkd_support_threads;
create policy dkd_support_threads_update_owner_admin
  on public.dkd_support_threads
  for update
  to authenticated
  using (
    dkd_user_id = auth.uid()
    or coalesce(public.dkd_is_admin(), false)
  )
  with check (
    dkd_user_id = auth.uid()
    or coalesce(public.dkd_is_admin(), false)
  );

drop policy if exists dkd_support_messages_select_owner_admin on public.dkd_support_messages;
create policy dkd_support_messages_select_owner_admin
  on public.dkd_support_messages
  for select
  to authenticated
  using (
    dkd_user_id = auth.uid()
    or coalesce(public.dkd_is_admin(), false)
    or exists (
      select 1
      from public.dkd_support_threads as dkd_support_thread_item
      where dkd_support_thread_item.dkd_id = dkd_support_messages.dkd_thread_id
        and dkd_support_thread_item.dkd_user_id = auth.uid()
    )
  );

drop policy if exists dkd_support_messages_insert_customer_admin on public.dkd_support_messages;
create policy dkd_support_messages_insert_customer_admin
  on public.dkd_support_messages
  for insert
  to authenticated
  with check (
    (
      dkd_user_id = auth.uid()
      and dkd_sender_key in ('dkd_customer', 'dkd_user')
    )
    or coalesce(public.dkd_is_admin(), false)
  );

drop policy if exists dkd_support_messages_update_admin on public.dkd_support_messages;
create policy dkd_support_messages_update_admin
  on public.dkd_support_messages
  for update
  to authenticated
  using (coalesce(public.dkd_is_admin(), false))
  with check (coalesce(public.dkd_is_admin(), false));

create or replace function public.dkd_support_gemini_permission_check()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_thread_count integer := 0;
  dkd_var_message_count integer := 0;
begin
  select count(*) into dkd_var_thread_count from public.dkd_support_threads;
  select count(*) into dkd_var_message_count from public.dkd_support_messages;

  return jsonb_build_object(
    'dkd_ok', true,
    'dkd_thread_count', dkd_var_thread_count,
    'dkd_message_count', dkd_var_message_count,
    'dkd_checked_at', timezone('utc', now())
  );
end;
$$;

revoke all on function public.dkd_support_gemini_permission_check() from public;
grant execute on function public.dkd_support_gemini_permission_check() to authenticated;
grant execute on function public.dkd_support_gemini_permission_check() to service_role;

do $$
begin
  if to_regprocedure('public.dkd_claim_support_ai_daily_slot(text,integer,integer)') is not null then
    grant execute on function public.dkd_claim_support_ai_daily_slot(text, integer, integer) to service_role;
    grant execute on function public.dkd_claim_support_ai_daily_slot(text, integer, integer) to authenticated;
  end if;

  if to_regprocedure('public.dkd_mark_support_thread_ai_status(uuid,text,boolean,text)') is not null then
    grant execute on function public.dkd_mark_support_thread_ai_status(uuid, text, boolean, text) to service_role;
    grant execute on function public.dkd_mark_support_thread_ai_status(uuid, text, boolean, text) to authenticated;
  end if;
end;
$$;

commit;
