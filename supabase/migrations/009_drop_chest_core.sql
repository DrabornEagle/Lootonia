-- 009_drop_chest_core.sql
-- Buradaki fonksiyonlar iskelet niteliğindedir. Gerçek ekonomi / uzaklık / anti-abuse kuralları bu dosyada tamamlanmalıdır.

create or replace function public.dkd_issue_drop_code(dkd_param_drop_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_code text;
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  dkd_var_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  update public.dkd_drops
  set code_last_issued = dkd_var_code,
      code_expires_at = now() + interval '10 minutes',
      updated_at = now()
  where id = dkd_param_drop_id;

  if not found then
    raise exception 'drop_not_found';
  end if;

  return dkd_var_code;
end;
$$;

-- TODO: uzaklık doğrulama, cooldown kontrolü, loot roll, transaction
create or replace function public.dkd_open_chest_secure(
  dkd_param_drop_id uuid,
  dkd_param_qr_secret text default null,
  dkd_param_lat numeric default null,
  dkd_param_lng numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('ok', false, 'reason', 'todo_open_chest_secure');
end;
$$;

create or replace function public.dkd_open_chest_by_code(dkd_param_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('ok', false, 'reason', 'todo_open_chest_by_code');
end;
$$;

create or replace function public.dkd_open_boss_chest_secure(
  dkd_param_drop_id uuid,
  dkd_param_tier integer,
  dkd_param_correct integer,
  dkd_param_total integer,
  dkd_param_lat numeric default null,
  dkd_param_lng numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('ok', false, 'reason', 'todo_open_boss_chest_secure');
end;
$$;
