begin;

create table if not exists public.dkd_business_access_codes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.dkd_businesses(id) on delete cascade,
  access_code text not null unique,
  role_key text not null default 'manager',
  label text,
  is_active boolean not null default true,
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  expires_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_dkd_business_access_codes_business on public.dkd_business_access_codes(business_id, created_at desc);
create index if not exists idx_dkd_business_access_codes_code on public.dkd_business_access_codes(access_code);

drop trigger if exists dkd_trg_business_access_codes_updated_at on public.dkd_business_access_codes;
create trigger dkd_trg_business_access_codes_updated_at
before update on public.dkd_business_access_codes
for each row execute function public.dkd_touch_updated_at();

create or replace function public.dkd_business_create_access_code(
  dkd_param_business_id uuid,
  dkd_param_role_key text default 'manager',
  dkd_param_label text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_code text;
begin
  if coalesce(public.dkd_is_admin(), false) is not true then
    raise exception 'admin_required';
  end if;

  dkd_var_code := 'YSL-' || substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8);

  insert into public.dkd_business_access_codes (
    business_id, access_code, role_key, label, is_active
  ) values (
    dkd_param_business_id,
    upper(dkd_var_code),
    coalesce(nullif(trim(coalesce(dkd_param_role_key, '')), ''), 'manager'),
    nullif(trim(coalesce(dkd_param_label, '')), ''),
    true
  );

  return upper(dkd_var_code);
end;
$$;

create or replace function public.dkd_business_claim_access_code(
  dkd_param_access_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_code public.dkd_business_access_codes%rowtype;
  dkd_var_user_id uuid;
begin
  dkd_var_user_id := auth.uid();
  if dkd_var_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'auth_required');
  end if;

  select *
    into dkd_var_code
  from public.dkd_business_access_codes
  where access_code = upper(trim(coalesce(dkd_param_access_code, '')))
  limit 1;

  if dkd_var_code.id is null then
    return jsonb_build_object('ok', false, 'reason', 'code_not_found');
  end if;

  if dkd_var_code.is_active is not true then
    return jsonb_build_object('ok', false, 'reason', 'code_inactive');
  end if;

  if dkd_var_code.expires_at is not null and dkd_var_code.expires_at < now() then
    return jsonb_build_object('ok', false, 'reason', 'code_expired');
  end if;

  insert into public.dkd_business_memberships (
    business_id, user_id, role_key, is_active
  ) values (
    dkd_var_code.business_id,
    dkd_var_user_id,
    coalesce(nullif(trim(coalesce(dkd_var_code.role_key, '')), ''), 'manager'),
    true
  )
  on conflict (business_id, user_id) do update
    set role_key = excluded.role_key,
        is_active = true,
        updated_at = now();

  update public.dkd_business_access_codes
  set is_active = false,
      claimed_by = dkd_var_user_id,
      claimed_at = now(),
      updated_at = now()
  where id = dkd_var_code.id;

  return jsonb_build_object(
    'ok', true,
    'business_id', dkd_var_code.business_id,
    'role_key', dkd_var_code.role_key,
    'access_code', dkd_var_code.access_code
  );
end;
$$;

grant select, insert, update on public.dkd_business_access_codes to authenticated;
grant execute on function public.dkd_business_create_access_code(uuid, text, text) to authenticated;
grant execute on function public.dkd_business_claim_access_code(text) to authenticated;

commit;
