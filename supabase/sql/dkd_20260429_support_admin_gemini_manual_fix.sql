begin;

create table if not exists public.dkd_admin_memberships (
  dkd_user_id uuid primary key references auth.users(id) on delete cascade,
  dkd_role_key text not null default 'dkd_admin',
  dkd_created_at timestamptz not null default timezone('utc', now()),
  dkd_updated_at timestamptz not null default timezone('utc', now())
);

alter table public.dkd_admin_memberships enable row level security;

drop policy if exists dkd_admin_memberships_select_admin on public.dkd_admin_memberships;
create policy dkd_admin_memberships_select_admin
  on public.dkd_admin_memberships
  for select
  to authenticated
  using (public.dkd_is_admin());

drop policy if exists dkd_admin_memberships_write_admin on public.dkd_admin_memberships;
create policy dkd_admin_memberships_write_admin
  on public.dkd_admin_memberships
  for all
  to authenticated
  using (public.dkd_is_admin())
  with check (public.dkd_is_admin());

grant select, insert, update, delete on public.dkd_admin_memberships to authenticated;

create or replace function public.dkd_touch_admin_memberships_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.dkd_updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists dkd_touch_admin_memberships_updated_at on public.dkd_admin_memberships;
create trigger dkd_touch_admin_memberships_updated_at
before update on public.dkd_admin_memberships
for each row
execute function public.dkd_touch_admin_memberships_updated_at();

create or replace function public.dkd_is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  dkd_var_auth_user_id uuid := auth.uid();
  dkd_var_is_admin boolean := false;
  dkd_var_has_profiles_admin_column boolean := false;
begin
  if dkd_var_auth_user_id is null then
    return false;
  end if;

  select exists (
    select 1
    from public.dkd_admin_memberships as dkd_admin_membership_item
    where dkd_admin_membership_item.dkd_user_id = dkd_var_auth_user_id
  ) into dkd_var_is_admin;

  if dkd_var_is_admin then
    return true;
  end if;

  if to_regclass('public.dkd_admin_users') is not null then
    execute 'select exists (select 1 from public.dkd_admin_users where user_id = $1)'
      into dkd_var_is_admin
      using dkd_var_auth_user_id;

    if dkd_var_is_admin then
      return true;
    end if;
  end if;

  select exists (
    select 1
    from information_schema.columns as dkd_column_item
    where dkd_column_item.table_schema = 'public'
      and dkd_column_item.table_name = 'dkd_profiles'
      and dkd_column_item.column_name = 'is_admin'
  ) into dkd_var_has_profiles_admin_column;

  if dkd_var_has_profiles_admin_column then
    execute 'select exists (select 1 from public.dkd_profiles where user_id = $1 and coalesce(is_admin, false) = true)'
      into dkd_var_is_admin
      using dkd_var_auth_user_id;

    if dkd_var_is_admin then
      return true;
    end if;
  end if;

  return false;
end;
$$;

revoke all on function public.dkd_is_admin() from public;
grant execute on function public.dkd_is_admin() to authenticated;
grant execute on function public.dkd_is_admin() to service_role;

create or replace function public.dkd_grant_admin_membership_by_email(
  dkd_param_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  dkd_var_clean_email text := lower(trim(coalesce(dkd_param_email, '')));
  dkd_var_user_id uuid;
begin
  if dkd_var_clean_email = '' then
    raise exception 'dkd_email_required';
  end if;

  if auth.role() <> 'service_role' and not coalesce(public.dkd_is_admin(), false) then
    raise exception 'dkd_admin_required';
  end if;

  select dkd_auth_user.id
    into dkd_var_user_id
  from auth.users as dkd_auth_user
  where lower(dkd_auth_user.email) = dkd_var_clean_email
  limit 1;

  if dkd_var_user_id is null then
    raise exception 'dkd_user_not_found_for_email';
  end if;

  insert into public.dkd_admin_memberships (
    dkd_user_id,
    dkd_role_key
  ) values (
    dkd_var_user_id,
    'dkd_admin'
  )
  on conflict (dkd_user_id) do update
  set
    dkd_role_key = excluded.dkd_role_key,
    dkd_updated_at = timezone('utc', now());

  return jsonb_build_object(
    'dkd_ok', true,
    'dkd_user_id', dkd_var_user_id,
    'dkd_email', dkd_var_clean_email,
    'dkd_role_key', 'dkd_admin'
  );
end;
$$;

revoke all on function public.dkd_grant_admin_membership_by_email(text) from public;
grant execute on function public.dkd_grant_admin_membership_by_email(text) to authenticated;
grant execute on function public.dkd_grant_admin_membership_by_email(text) to service_role;

alter table public.dkd_support_threads
  add column if not exists dkd_ai_status_key text not null default 'dkd_ai_pending',
  add column if not exists dkd_ai_last_issue_text text,
  add column if not exists dkd_ai_answered_at timestamptz,
  add column if not exists dkd_admin_needed boolean not null default false;

create index if not exists dkd_support_threads_admin_needed_idx
  on public.dkd_support_threads(dkd_admin_needed, dkd_updated_at desc);

create or replace function public.dkd_send_support_thread_message(
  dkd_param_thread_id uuid,
  dkd_param_message_text text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_auth_user_id uuid := auth.uid();
  dkd_var_is_admin boolean := coalesce(public.dkd_is_admin(), false);
  dkd_var_thread_record public.dkd_support_threads%rowtype;
  dkd_var_clean_message_text text;
  dkd_var_sender_key text;
  dkd_var_sender_title text;
  dkd_var_message_owner_id uuid;
  dkd_var_next_status_key text;
  dkd_var_next_status_title text;
  dkd_var_message_id uuid;
begin
  if dkd_var_auth_user_id is null then
    raise exception 'dkd_auth_required';
  end if;

  dkd_var_clean_message_text := trim(coalesce(dkd_param_message_text, ''));

  if length(dkd_var_clean_message_text) < 2 then
    raise exception 'dkd_support_message_too_short';
  end if;

  select dkd_support_thread_item.*
    into dkd_var_thread_record
  from public.dkd_support_threads as dkd_support_thread_item
  where dkd_support_thread_item.dkd_id = dkd_param_thread_id
    and (
      dkd_support_thread_item.dkd_user_id = dkd_var_auth_user_id
      or dkd_var_is_admin
    )
  limit 1;

  if not found then
    raise exception 'dkd_support_thread_not_found';
  end if;

  if dkd_var_is_admin then
    dkd_var_sender_key := 'dkd_admin';
    dkd_var_sender_title := 'Destek Ekibi';
    dkd_var_message_owner_id := dkd_var_thread_record.dkd_user_id;
    dkd_var_next_status_key := 'dkd_answered';
    dkd_var_next_status_title := 'Destek yanıtladı';
  else
    dkd_var_sender_key := 'dkd_customer';
    dkd_var_sender_title := 'Müşteri';
    dkd_var_message_owner_id := dkd_var_auth_user_id;
    dkd_var_next_status_key := 'dkd_open';
    dkd_var_next_status_title := 'Müşteri yanıtladı';
  end if;

  insert into public.dkd_support_messages (
    dkd_thread_id,
    dkd_user_id,
    dkd_sender_key,
    dkd_sender_title,
    dkd_message_text
  ) values (
    dkd_var_thread_record.dkd_id,
    dkd_var_message_owner_id,
    dkd_var_sender_key,
    dkd_var_sender_title,
    dkd_var_clean_message_text
  )
  returning dkd_id into dkd_var_message_id;

  update public.dkd_support_threads
  set
    dkd_status_key = dkd_var_next_status_key,
    dkd_status_title = dkd_var_next_status_title,
    dkd_admin_needed = case when dkd_var_is_admin then false else dkd_admin_needed end,
    dkd_ai_last_issue_text = case when dkd_var_is_admin then null else dkd_ai_last_issue_text end,
    dkd_last_message_text = left(dkd_var_clean_message_text, 240),
    dkd_updated_at = timezone('utc', now())
  where dkd_id = dkd_var_thread_record.dkd_id;

  return jsonb_build_object(
    'dkd_ok', true,
    'dkd_thread_id', dkd_var_thread_record.dkd_id,
    'dkd_message_id', dkd_var_message_id,
    'dkd_sender_key', dkd_var_sender_key,
    'dkd_sender_title', dkd_var_sender_title,
    'dkd_status_key', dkd_var_next_status_key,
    'dkd_status_title', dkd_var_next_status_title
  );
end;
$$;

revoke all on function public.dkd_send_support_thread_message(uuid, text) from public;
grant execute on function public.dkd_send_support_thread_message(uuid, text) to authenticated;

commit;
