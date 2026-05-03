-- Lootonia DB Patch V13
-- Amaç:
-- 1) QR güvenli sandık açma RPC'si
-- 2) Manuel tek kullanımlık kod üretme / kullanma RPC'leri
-- 3) Boss secure chest RPC'si
-- 4) Cooldown + enerji + log + history uyumluluk katmanı
--
-- Önemli not:
-- Bu patch, public.dkd_profiles / public.dkd_drops / public.dkd_card_defs
-- ve tercihen public.dkd_loot_entries tablolarının zaten var olduğunu varsayar.
-- Gerçek 001 base schema hâlâ eksik olduğu için bu dosya bir "uyumluluk patch"idir.

create table if not exists public.dkd_user_drops (
  user_id uuid not null,
  drop_id uuid not null,
  last_opened_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, drop_id),
  constraint dkd_user_drops_drop_fk foreign key (drop_id) references public.dkd_drops(id) on delete cascade,
  constraint dkd_user_drops_profile_fk foreign key (user_id) references public.dkd_profiles(user_id) on delete cascade
);

alter table if exists public.dkd_user_drops
  add column if not exists last_opened_at timestamptz null;
alter table if exists public.dkd_user_drops
  add column if not exists created_at timestamptz not null default now();
alter table if exists public.dkd_user_drops
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_dkd_user_drops_last_opened_at on public.dkd_user_drops(last_opened_at desc);

create table if not exists public.dkd_drop_codes (
  code text primary key,
  user_id uuid not null,
  drop_id uuid not null,
  expires_at timestamptz not null,
  consumed_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint dkd_drop_codes_profile_fk foreign key (user_id) references public.dkd_profiles(user_id) on delete cascade,
  constraint dkd_drop_codes_drop_fk foreign key (drop_id) references public.dkd_drops(id) on delete cascade
);

create index if not exists idx_dkd_drop_codes_user on public.dkd_drop_codes(user_id, created_at desc);
create index if not exists idx_dkd_drop_codes_drop on public.dkd_drop_codes(drop_id, created_at desc);
create index if not exists idx_dkd_drop_codes_expires on public.dkd_drop_codes(expires_at);

create table if not exists public.dkd_chest_logs (
  id bigserial primary key,
  user_id uuid not null,
  drop_id uuid null,
  card_def_id integer null,
  gained_token integer not null default 0,
  drop_type text not null default 'map',
  source text not null default 'secure_open',
  created_at timestamptz not null default now(),
  constraint dkd_chest_logs_profile_fk foreign key (user_id) references public.dkd_profiles(user_id) on delete cascade,
  constraint dkd_chest_logs_drop_fk foreign key (drop_id) references public.dkd_drops(id) on delete set null,
  constraint dkd_chest_logs_card_fk foreign key (card_def_id) references public.dkd_card_defs(id) on delete set null
);

alter table if exists public.dkd_chest_logs
  add column if not exists user_id uuid null;
alter table if exists public.dkd_chest_logs
  add column if not exists drop_id uuid null;
alter table if exists public.dkd_chest_logs
  add column if not exists card_def_id integer null;
alter table if exists public.dkd_chest_logs
  add column if not exists gained_token integer not null default 0;
alter table if exists public.dkd_chest_logs
  add column if not exists drop_type text not null default 'map';
alter table if exists public.dkd_chest_logs
  add column if not exists source text not null default 'secure_open';
alter table if exists public.dkd_chest_logs
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_dkd_chest_logs_user_created on public.dkd_chest_logs(user_id, created_at desc);
create index if not exists idx_dkd_chest_logs_drop_created on public.dkd_chest_logs(drop_id, created_at desc);

create table if not exists public.dkd_chest_history (
  id bigserial primary key,
  user_id uuid not null,
  drop_id uuid null,
  drop_type text not null default 'map',
  card_def_id integer null,
  gained_token integer not null default 0,
  created_at timestamptz not null default now(),
  constraint dkd_chest_history_profile_fk foreign key (user_id) references public.dkd_profiles(user_id) on delete cascade,
  constraint dkd_chest_history_drop_fk foreign key (drop_id) references public.dkd_drops(id) on delete set null,
  constraint dkd_chest_history_card_fk foreign key (card_def_id) references public.dkd_card_defs(id) on delete set null
);

alter table if exists public.dkd_chest_history
  add column if not exists user_id uuid null;
alter table if exists public.dkd_chest_history
  add column if not exists drop_id uuid null;
alter table if exists public.dkd_chest_history
  add column if not exists drop_type text not null default 'map';
alter table if exists public.dkd_chest_history
  add column if not exists card_def_id integer null;
alter table if exists public.dkd_chest_history
  add column if not exists gained_token integer not null default 0;
alter table if exists public.dkd_chest_history
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_dkd_chest_history_user_created on public.dkd_chest_history(user_id, created_at desc);
create index if not exists idx_dkd_chest_history_user_drop_created on public.dkd_chest_history(user_id, drop_id, created_at desc);

create or replace function public.dkd__effective_energy(
  dkd_param_energy integer,
  dkd_param_energy_max integer,
  dkd_param_energy_updated_at timestamptz
)
returns integer
language sql
stable
set search_path = public
as $$
  select least(
    greatest(coalesce(dkd_param_energy_max, 0), 0),
    greatest(coalesce(dkd_param_energy, 0), 0)
    + floor(greatest(extract(epoch from (now() - coalesce(dkd_param_energy_updated_at, now()))), 0) / 60.0)::integer
  );
$$;

create or replace function public.dkd__distance_meters(
  dkd_param_user_lat double precision,
  dkd_param_user_lng double precision,
  dkd_param_drop_lat double precision,
  dkd_param_drop_lng double precision
)
returns double precision
language sql
immutable
set search_path = public
as $$
  select case
    when dkd_param_user_lat is null or dkd_param_user_lng is null or dkd_param_drop_lat is null or dkd_param_drop_lng is null then null
    else (
      6371000.0 * 2.0 * asin(
        sqrt(
          power(sin(radians((dkd_param_drop_lat - dkd_param_user_lat) / 2.0)), 2)
          + cos(radians(dkd_param_user_lat)) * cos(radians(dkd_param_drop_lat))
          * power(sin(radians((dkd_param_drop_lng - dkd_param_user_lng) / 2.0)), 2)
        )
      )
    )
  end;
$$;

create or replace function public.dkd__pick_card_def(
  dkd_param_drop_type text,
  dkd_param_boss_tier integer default 1
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_card_def_id integer;
  dkd_var_drop_type text := lower(coalesce(trim(dkd_param_drop_type), 'map'));
begin
  if to_regclass('public.dkd_loot_entries') is not null then
    if dkd_var_drop_type = 'boss' then
      select le.card_def_id
      into dkd_var_card_def_id
      from public.dkd_loot_entries le
      where le.card_def_id is not null
        and lower(coalesce(le.drop_type, '')) = 'boss'
        and (
          dkd_param_boss_tier <= 1 and lower(coalesce(le.rarity, 'common')) in ('common', 'rare', 'epic')
          or dkd_param_boss_tier = 2 and lower(coalesce(le.rarity, 'rare')) in ('rare', 'epic', 'legendary')
          or dkd_param_boss_tier >= 3 and lower(coalesce(le.rarity, 'epic')) in ('epic', 'legendary', 'mythic')
        )
      order by -ln(greatest(random(), 0.000001)) / greatest(le.weight, 0.000001)
      limit 1;
    else
      select le.card_def_id
      into dkd_var_card_def_id
      from public.dkd_loot_entries le
      where le.card_def_id is not null
        and lower(coalesce(le.drop_type, '')) in (dkd_var_drop_type, 'map', 'qr')
      order by
        case when lower(coalesce(le.drop_type, '')) = dkd_var_drop_type then 0 else 1 end,
        -ln(greatest(random(), 0.000001)) / greatest(le.weight, 0.000001)
      limit 1;
    end if;
  end if;

  if dkd_var_card_def_id is null and to_regclass('public.dkd_card_defs') is not null then
    if dkd_var_drop_type = 'boss' then
      select dkd_alias_c.id
      into dkd_var_card_def_id
      from public.dkd_card_defs dkd_alias_c
      where (
        dkd_param_boss_tier <= 1 and lower(coalesce(dkd_alias_c.rarity, 'common')) in ('common', 'rare', 'epic')
      ) or (
        dkd_param_boss_tier = 2 and lower(coalesce(dkd_alias_c.rarity, 'rare')) in ('rare', 'epic', 'legendary')
      ) or (
        dkd_param_boss_tier >= 3 and lower(coalesce(dkd_alias_c.rarity, 'epic')) in ('epic', 'legendary', 'mythic')
      )
      order by random()
      limit 1;
    else
      select dkd_alias_c.id
      into dkd_var_card_def_id
      from public.dkd_card_defs dkd_alias_c
      order by random()
      limit 1;
    end if;
  end if;

  return dkd_var_card_def_id;
end;
$$;

create or replace function public.dkd__log_chest_reward(
  dkd_param_user_id uuid,
  dkd_param_drop_id uuid,
  dkd_param_drop_type text,
  dkd_param_card_def_id integer,
  dkd_param_gained_token integer,
  dkd_param_source text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.dkd_chest_logs (
    user_id, drop_id, card_def_id, gained_token, drop_type, source, created_at
  )
  values (
    dkd_param_user_id,
    dkd_param_drop_id,
    dkd_param_card_def_id,
    greatest(coalesce(dkd_param_gained_token, 0), 0),
    lower(coalesce(dkd_param_drop_type, 'map')),
    lower(coalesce(dkd_param_source, 'secure_open')),
    now()
  );

  insert into public.dkd_chest_history (
    user_id, drop_id, drop_type, card_def_id, gained_token, created_at
  )
  values (
    dkd_param_user_id,
    dkd_param_drop_id,
    lower(coalesce(dkd_param_drop_type, 'map')),
    dkd_param_card_def_id,
    greatest(coalesce(dkd_param_gained_token, 0), 0),
    now()
  );
end;
$$;

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
  dkd_var_is_active boolean;
  dkd_var_code text;
  dkd_var_expires_at timestamptz;
begin
  dkd_var_user_id := auth.uid();

  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  select d.is_active
  into dkd_var_is_active
  from public.dkd_drops d
  where d.id = dkd_param_drop_id;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'drop_not_found');
  end if;

  if not coalesce(dkd_var_is_active, false) then
    return jsonb_build_object('ok', false, 'reason', 'drop_inactive');
  end if;

  dkd_var_code := upper(substr(md5(random()::text || clock_timestamp()::text || dkd_param_drop_id::text || dkd_var_user_id::text), 1, 8));
  dkd_var_expires_at := now() + interval '5 minutes';

  insert into public.dkd_drop_codes (code, user_id, drop_id, expires_at)
  values (dkd_var_code, dkd_var_user_id, dkd_param_drop_id, dkd_var_expires_at)
  on conflict (code) do update
  set expires_at = excluded.expires_at,
      consumed_at = null,
      created_at = now();

  return jsonb_build_object(
    'ok', true,
    'code', dkd_var_code,
    'drop_id', dkd_param_drop_id,
    'expires_at', dkd_var_expires_at
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

  dkd_var_distance_m := public.dkd__distance_meters(dkd_param_lat, dkd_param_lng, dkd_var_drop.lat, dkd_var_drop.lng);
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
    'card_def_id', dkd_var_card_def_id
  );
end;
$$;

create or replace function public.dkd_open_chest_by_code(
  dkd_param_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
  dkd_var_row record;
  dkd_var_token integer;
  dkd_var_energy integer;
  dkd_var_energy_max integer;
  dkd_var_energy_updated_at timestamptz;
  dkd_var_effective_energy integer;
  dkd_var_drop record;
  dkd_var_last_opened_at timestamptz;
  dkd_var_next_open_at timestamptz;
  dkd_var_card_def_id integer;
  dkd_var_token_gain integer;
begin
  dkd_var_user_id := auth.uid();
  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  select *
  into dkd_var_row
  from public.dkd_drop_codes dkd_alias_c
  where dkd_alias_c.code = upper(trim(coalesce(dkd_param_code, '')))
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'code_not_found');
  end if;

  if dkd_var_row.user_id <> dkd_var_user_id then
    return jsonb_build_object('ok', false, 'reason', 'code_user_mismatch');
  end if;

  if dkd_var_row.consumed_at is not null then
    return jsonb_build_object('ok', false, 'reason', 'code_already_used');
  end if;

  if dkd_var_row.expires_at <= now() then
    return jsonb_build_object('ok', false, 'reason', 'code_expired');
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
  where d.id = dkd_var_row.drop_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'drop_not_found');
  end if;

  if not coalesce(dkd_var_drop.is_active, false) then
    return jsonb_build_object('ok', false, 'reason', 'drop_inactive');
  end if;

  select ud.last_opened_at
  into dkd_var_last_opened_at
  from public.dkd_user_drops ud
  where ud.user_id = dkd_var_user_id
    and ud.drop_id = dkd_var_row.drop_id
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
  select dkd_var_user_id, dkd_var_card_def_id, 'code_open'
  where dkd_var_card_def_id is not null;

  insert into public.dkd_user_drops (user_id, drop_id, last_opened_at, updated_at)
  values (dkd_var_user_id, dkd_var_row.drop_id, now(), now())
  on conflict (user_id, drop_id) do update
  set last_opened_at = excluded.last_opened_at,
      updated_at = now();

  update public.dkd_drop_codes
  set consumed_at = now()
  where code = dkd_var_row.code;

  perform public.dkd__log_chest_reward(
    dkd_var_user_id,
    dkd_var_row.drop_id,
    lower(coalesce(dkd_var_drop.type, 'map')),
    dkd_var_card_def_id,
    dkd_var_token_gain,
    'code_open'
  );

  return jsonb_build_object(
    'ok', true,
    'drop_type', lower(coalesce(dkd_var_drop.type, 'map')),
    'token', dkd_var_token_gain,
    'token_mult', 1,
    'card_def_id', dkd_var_card_def_id
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
  dkd_var_tier integer := greatest(coalesce(dkd_param_tier, 1), 1);
  dkd_var_correct integer := greatest(coalesce(dkd_param_correct, 0), 0);
  dkd_var_total integer := greatest(coalesce(dkd_param_total, 0), 0);
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

  dkd_var_distance_m := public.dkd__distance_meters(dkd_param_lat, dkd_param_lng, dkd_var_drop.lat, dkd_var_drop.lng);
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
    'total', dkd_var_total
  );
end;
$$;

revoke all on function public.dkd__effective_energy(integer, integer, timestamptz) from public;
revoke all on function public.dkd__distance_meters(double precision, double precision, double precision, double precision) from public;
revoke all on function public.dkd__pick_card_def(text, integer) from public;
revoke all on function public.dkd__log_chest_reward(uuid, uuid, text, integer, integer, text) from public;

revoke all on function public.dkd_issue_drop_code(uuid) from public;
grant execute on function public.dkd_issue_drop_code(uuid) to authenticated;

revoke all on function public.dkd_open_chest_secure(uuid, text, double precision, double precision) from public;
grant execute on function public.dkd_open_chest_secure(uuid, text, double precision, double precision) to authenticated;

revoke all on function public.dkd_open_chest_by_code(text) from public;
grant execute on function public.dkd_open_chest_by_code(text) to authenticated;

revoke all on function public.dkd_open_boss_chest_secure(uuid, integer, integer, integer, double precision, double precision) from public;
grant execute on function public.dkd_open_boss_chest_secure(uuid, integer, integer, integer, double precision, double precision) to authenticated;
