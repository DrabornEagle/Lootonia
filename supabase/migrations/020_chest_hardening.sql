-- Lootonia Phase 24.2
-- 020_chest_hardening.sql
-- Amaç:
-- 1) missing location bypass'ını kapatmak
-- 2) aynı user/drop için tek aktif manuel kod garantisi vermek
-- 3) boss chest input'larını clamp etmek
-- 4) mevcut frontend RPC imzalarını bozmadan güvenliği artırmak

begin;

-- 0) Tek aktif kod için eski açık kayıtları normalize et
with ranked as (
  select
    code,
    row_number() over (
      partition by user_id, drop_id
      order by created_at desc, code desc
    ) as rn
  from public.dkd_drop_codes
  where consumed_at is null
)
update public.dkd_drop_codes dkd_alias_c
set consumed_at = now()
from ranked dkd_alias_r
where dkd_alias_c.code = dkd_alias_r.code
  and dkd_alias_r.rn > 1;

create unique index if not exists uq_dkd_drop_codes_user_drop_open
  on public.dkd_drop_codes(user_id, drop_id)
  where consumed_at is null;

create index if not exists idx_dkd_drop_codes_user_drop_created
  on public.dkd_drop_codes(user_id, drop_id, created_at desc);

create or replace function public.dkd_issue_drop_code(
  dkd_param_drop_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
  dkd_var_drop record;
  dkd_var_existing record;
  dkd_var_code text;
  dkd_var_expires_at timestamptz;
begin
  dkd_var_user_id := auth.uid();

  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  perform 1
  from public.dkd_profiles
  where user_id = dkd_var_user_id;

  if not found then
    raise exception 'profile_not_found';
  end if;

  select *
  into dkd_var_drop
  from public.dkd_drops d
  where d.id = dkd_param_drop_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'drop_not_found');
  end if;

  if not coalesce(dkd_var_drop.is_active, false) then
    return jsonb_build_object('ok', false, 'reason', 'drop_inactive');
  end if;

  -- Mevcut açık/geçerli kod varsa yeniden üretmek yerine onu döndür.
  select dkd_alias_c.code, dkd_alias_c.expires_at
  into dkd_var_existing
  from public.dkd_drop_codes dkd_alias_c
  where dkd_alias_c.user_id = dkd_var_user_id
    and dkd_alias_c.drop_id = dkd_param_drop_id
    and dkd_alias_c.consumed_at is null
    and dkd_alias_c.expires_at > now()
  order by dkd_alias_c.created_at desc
  limit 1
  for update;

  if found then
    return jsonb_build_object(
      'ok', true,
      'code', dkd_var_existing.code,
      'drop_id', dkd_param_drop_id,
      'expires_at', dkd_var_existing.expires_at,
      'reused', true
    );
  end if;

  -- Eski açık ama süresi geçmiş kayıtları kapat.
  update public.dkd_drop_codes
  set consumed_at = coalesce(consumed_at, now())
  where user_id = dkd_var_user_id
    and drop_id = dkd_param_drop_id
    and consumed_at is null;

  dkd_var_code := upper(substr(md5(random()::text || clock_timestamp()::text || dkd_param_drop_id::text || dkd_var_user_id::text), 1, 8));
  dkd_var_expires_at := now() + interval '5 minutes';

  insert into public.dkd_drop_codes (code, user_id, drop_id, expires_at)
  values (dkd_var_code, dkd_var_user_id, dkd_param_drop_id, dkd_var_expires_at);

  return jsonb_build_object(
    'ok', true,
    'code', dkd_var_code,
    'drop_id', dkd_param_drop_id,
    'expires_at', dkd_var_expires_at,
    'reused', false
  );
end;
$$;

create or replace function public.dkd_open_chest_secure(
  dkd_param_drop_id uuid,
  dkd_param_qr_secret text default null,
  dkd_param_lat double precision default null,
  dkd_param_lng double precision default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
  dkd_var_token integer;
  dkd_var_energy integer;
  dkd_var_energy_max integer;
  dkd_var_energy_updated_at timestamptz;
  dkd_var_effective_energy integer;
  dkd_var_drop record;
  dkd_var_last_opened_at timestamptz;
  dkd_var_next_open_at timestamptz;
  dkd_var_distance_m double precision;
  dkd_var_card_def_id integer;
  dkd_var_token_gain integer;
  dkd_var_requires_location boolean;
begin
  dkd_var_user_id := auth.uid();
  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  select
    coalesce(token, 0),
    greatest(coalesce(energy, 0), 0),
    greatest(coalesce(energy_max, 0), 0),
    coalesce(energy_updated_at, now())
  into dkd_var_token, dkd_var_energy, dkd_var_energy_max, dkd_var_energy_updated_at
  from public.dkd_profiles
  where user_id = dkd_var_user_id
  for update;

  if not found then
    raise exception 'profile_not_found';
  end if;

  select *
  into dkd_var_drop
  from public.dkd_drops d
  where d.id = dkd_param_drop_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'drop_not_found');
  end if;

  if not coalesce(dkd_var_drop.is_active, false) then
    return jsonb_build_object('ok', false, 'reason', 'drop_inactive');
  end if;

  if lower(coalesce(dkd_var_drop.type, 'map')) = 'qr' then
    if nullif(trim(coalesce(dkd_param_qr_secret, '')), '') is null then
      return jsonb_build_object('ok', false, 'reason', 'qr_secret_required');
    end if;
    if coalesce(dkd_var_drop.qr_secret, '') <> trim(dkd_param_qr_secret) then
      return jsonb_build_object('ok', false, 'reason', 'qr_secret_invalid');
    end if;
  end if;

  dkd_var_requires_location := dkd_var_drop.lat is not null and dkd_var_drop.lng is not null and dkd_var_drop.radius_m is not null;
  if dkd_var_requires_location and (dkd_param_lat is null or dkd_param_lng is null) then
    return jsonb_build_object('ok', false, 'reason', 'location_required');
  end if;

  dkd_var_distance_m := public.dkd__distance_meters(dkd_param_lat, dkd_param_lng, dkd_var_drop.lat, dkd_var_drop.lng);
  if dkd_var_requires_location and dkd_var_distance_m is null then
    return jsonb_build_object('ok', false, 'reason', 'location_invalid');
  end if;
  if dkd_var_distance_m is not null and dkd_var_drop.radius_m is not null and dkd_var_distance_m > (dkd_var_drop.radius_m + 8) then
    return jsonb_build_object(
      'ok', false,
      'reason', 'too_far',
      'distance_m', round(dkd_var_distance_m),
      'radius_m', dkd_var_drop.radius_m
    );
  end if;

  select ud.last_opened_at
  into dkd_var_last_opened_at
  from public.dkd_user_drops ud
  where ud.user_id = dkd_var_user_id
    and ud.drop_id = dkd_param_drop_id
  for update;

  if dkd_var_last_opened_at is not null and coalesce(dkd_var_drop.cooldown_seconds, 0) > 0 then
    dkd_var_next_open_at := dkd_var_last_opened_at + make_interval(secs => greatest(coalesce(dkd_var_drop.cooldown_seconds, 0), 0));
    if dkd_var_next_open_at > now() then
      return jsonb_build_object(
        'ok', false,
        'reason', 'cooldown',
        'next_open_at', dkd_var_next_open_at
      );
    end if;
  end if;

  dkd_var_effective_energy := public.dkd__effective_energy(dkd_var_energy, dkd_var_energy_max, dkd_var_energy_updated_at);
  if dkd_var_effective_energy < 1 then
    return jsonb_build_object(
      'ok', false,
      'reason', 'energy_empty',
      'energy', dkd_var_effective_energy,
      'energy_max', dkd_var_energy_max
    );
  end if;

  dkd_var_card_def_id := public.dkd__pick_card_def(lower(coalesce(dkd_var_drop.type, 'map')), 1);
  dkd_var_token_gain := case lower(coalesce(dkd_var_drop.type, 'map'))
    when 'qr' then 18 + floor(random() * 10)::integer
    when 'cafe' then 14 + floor(random() * 8)::integer
    when 'restaurant' then 16 + floor(random() * 10)::integer
    when 'metro' then 12 + floor(random() * 8)::integer
    when 'park' then 12 + floor(random() * 7)::integer
    when 'mall' then 15 + floor(random() * 9)::integer
    else 10 + floor(random() * 9)::integer
  end;

  update public.dkd_profiles
  set
    token = coalesce(token, 0) + dkd_var_token_gain,
    energy = greatest(dkd_var_effective_energy - 1, 0),
    energy_updated_at = now()
  where user_id = dkd_var_user_id;

  insert into public.dkd_user_cards (user_id, card_def_id, source)
  select dkd_var_user_id, dkd_var_card_def_id, 'secure_open'
  where dkd_var_card_def_id is not null;

  insert into public.dkd_user_drops (user_id, drop_id, last_opened_at, updated_at)
  values (dkd_var_user_id, dkd_param_drop_id, now(), now())
  on conflict (user_id, drop_id) do update
  set last_opened_at = excluded.last_opened_at,
      updated_at = now();

  perform public.dkd__log_chest_reward(
    dkd_var_user_id,
    dkd_param_drop_id,
    lower(coalesce(dkd_var_drop.type, 'map')),
    dkd_var_card_def_id,
    dkd_var_token_gain,
    'secure_open'
  );

  return jsonb_build_object(
    'ok', true,
    'drop_type', lower(coalesce(dkd_var_drop.type, 'map')),
    'token', dkd_var_token_gain,
    'token_mult', 1,
    'card_def_id', dkd_var_card_def_id,
    'distance_m', case when dkd_var_distance_m is not null then round(dkd_var_distance_m) else null end
  );
end;
$$;

create or replace function public.dkd_open_boss_chest_secure(
  dkd_param_drop_id uuid,
  dkd_param_tier integer default 1,
  dkd_param_correct integer default 0,
  dkd_param_total integer default 0,
  dkd_param_lat double precision default null,
  dkd_param_lng double precision default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
  dkd_var_token integer;
  dkd_var_energy integer;
  dkd_var_energy_max integer;
  dkd_var_energy_updated_at timestamptz;
  dkd_var_effective_energy integer;
  dkd_var_drop record;
  dkd_var_last_opened_at timestamptz;
  dkd_var_next_open_at timestamptz;
  dkd_var_distance_m double precision;
  dkd_var_card_def_id integer;
  dkd_var_token_gain integer;
  dkd_var_mult integer;
  dkd_var_tier integer := least(greatest(coalesce(dkd_param_tier, 1), 1), 3);
  dkd_var_total integer := least(greatest(coalesce(dkd_param_total, 0), 0), 20);
  dkd_var_correct integer;
  dkd_var_requires_location boolean;
begin
  dkd_var_correct := least(greatest(coalesce(dkd_param_correct, 0), 0), greatest(dkd_var_total, 0));

  dkd_var_user_id := auth.uid();
  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  select
    coalesce(token, 0),
    greatest(coalesce(energy, 0), 0),
    greatest(coalesce(energy_max, 0), 0),
    coalesce(energy_updated_at, now())
  into dkd_var_token, dkd_var_energy, dkd_var_energy_max, dkd_var_energy_updated_at
  from public.dkd_profiles
  where user_id = dkd_var_user_id
  for update;

  if not found then
    raise exception 'profile_not_found';
  end if;

  select *
  into dkd_var_drop
  from public.dkd_drops d
  where d.id = dkd_param_drop_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'drop_not_found');
  end if;

  if not coalesce(dkd_var_drop.is_active, false) then
    return jsonb_build_object('ok', false, 'reason', 'drop_inactive');
  end if;

  dkd_var_requires_location := dkd_var_drop.lat is not null and dkd_var_drop.lng is not null and dkd_var_drop.radius_m is not null;
  if dkd_var_requires_location and (dkd_param_lat is null or dkd_param_lng is null) then
    return jsonb_build_object('ok', false, 'reason', 'location_required');
  end if;

  dkd_var_distance_m := public.dkd__distance_meters(dkd_param_lat, dkd_param_lng, dkd_var_drop.lat, dkd_var_drop.lng);
  if dkd_var_requires_location and dkd_var_distance_m is null then
    return jsonb_build_object('ok', false, 'reason', 'location_invalid');
  end if;
  if dkd_var_distance_m is not null and dkd_var_drop.radius_m is not null and dkd_var_distance_m > (dkd_var_drop.radius_m + 10) then
    return jsonb_build_object(
      'ok', false,
      'reason', 'too_far',
      'distance_m', round(dkd_var_distance_m),
      'radius_m', dkd_var_drop.radius_m
    );
  end if;

  select ud.last_opened_at
  into dkd_var_last_opened_at
  from public.dkd_user_drops ud
  where ud.user_id = dkd_var_user_id
    and ud.drop_id = dkd_param_drop_id
  for update;

  if dkd_var_last_opened_at is not null and coalesce(dkd_var_drop.cooldown_seconds, 0) > 0 then
    dkd_var_next_open_at := dkd_var_last_opened_at + make_interval(secs => greatest(coalesce(dkd_var_drop.cooldown_seconds, 0), 0));
    if dkd_var_next_open_at > now() then
      return jsonb_build_object(
        'ok', false,
        'reason', 'cooldown',
        'next_open_at', dkd_var_next_open_at
      );
    end if;
  end if;

  dkd_var_effective_energy := public.dkd__effective_energy(dkd_var_energy, dkd_var_energy_max, dkd_var_energy_updated_at);
  if dkd_var_effective_energy < 1 then
    return jsonb_build_object(
      'ok', false,
      'reason', 'energy_empty',
      'energy', dkd_var_effective_energy,
      'energy_max', dkd_var_energy_max
    );
  end if;

  dkd_var_mult := case
    when dkd_var_total > 0 and dkd_var_correct >= dkd_var_total then 3
    when dkd_var_correct >= greatest(dkd_var_total - 1, 1) then 2
    else 1
  end;

  dkd_var_card_def_id := public.dkd__pick_card_def('boss', dkd_var_tier);
  dkd_var_token_gain := (30 + (dkd_var_tier * 10) + floor(random() * 16)::integer) * dkd_var_mult;

  update public.dkd_profiles
  set
    token = coalesce(token, 0) + dkd_var_token_gain,
    energy = greatest(dkd_var_effective_energy - 1, 0),
    energy_updated_at = now()
  where user_id = dkd_var_user_id;

  insert into public.dkd_user_cards (user_id, card_def_id, source)
  select dkd_var_user_id, dkd_var_card_def_id, 'boss_open'
  where dkd_var_card_def_id is not null;

  insert into public.dkd_user_drops (user_id, drop_id, last_opened_at, updated_at)
  values (dkd_var_user_id, dkd_param_drop_id, now(), now())
  on conflict (user_id, drop_id) do update
  set last_opened_at = excluded.last_opened_at,
      updated_at = now();

  perform public.dkd__log_chest_reward(
    dkd_var_user_id,
    dkd_param_drop_id,
    'boss',
    dkd_var_card_def_id,
    dkd_var_token_gain,
    'boss_open'
  );

  return jsonb_build_object(
    'ok', true,
    'drop_type', 'boss',
    'token', dkd_var_token_gain,
    'token_mult', dkd_var_mult,
    'card_def_id', dkd_var_card_def_id,
    'tier', dkd_var_tier,
    'correct', dkd_var_correct,
    'total', dkd_var_total,
    'distance_m', case when dkd_var_distance_m is not null then round(dkd_var_distance_m) else null end
  );
end;
$$;

revoke all on function public.dkd_issue_drop_code(uuid) from public;
grant execute on function public.dkd_issue_drop_code(uuid) to authenticated;

revoke all on function public.dkd_open_chest_secure(uuid, text, double precision, double precision) from public;
grant execute on function public.dkd_open_chest_secure(uuid, text, double precision, double precision) to authenticated;

revoke all on function public.dkd_open_boss_chest_secure(uuid, integer, integer, integer, double precision, double precision) from public;
grant execute on function public.dkd_open_boss_chest_secure(uuid, integer, integer, integer, double precision, double precision) to authenticated;

commit;
