-- 003_rpc_chests_and_market.sql
-- Lootonia sandik acma ve market RPC'leri

create or replace function public.dkd_distance_m(
  dkd_param_lat1 double precision,
  dkd_param_lng1 double precision,
  dkd_param_lat2 double precision,
  dkd_param_lng2 double precision
)
returns numeric
language sql
immutable
as $$
  select
    6371000 * 2 * asin(
      sqrt(
        power(sin(radians((dkd_param_lat2 - dkd_param_lat1) / 2)), 2) +
        cos(radians(dkd_param_lat1)) * cos(radians(dkd_param_lat2)) *
        power(sin(radians((dkd_param_lng2 - dkd_param_lng1) / 2)), 2)
      )
    )
$$;

create or replace function public.dkd_pick_card(
  dkd_param_drop_type text default 'all',
  dkd_param_prefer_rarity text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_id uuid;
  dkd_var_name text;
  dkd_var_series text;
  dkd_var_rarity text;
  dkd_var_theme text;
begin
  select
    dkd_alias_c.id,
    dkd_alias_c.name,
    dkd_alias_c.series,
    dkd_alias_c.rarity,
    dkd_alias_c.theme
  into
    dkd_var_id,
    dkd_var_name,
    dkd_var_series,
    dkd_var_rarity,
    dkd_var_theme
  from public.dkd_loot_entries le
  join public.dkd_card_defs dkd_alias_c
    on dkd_alias_c.id = le.card_def_id
  where coalesce(dkd_alias_c.is_active, true) = true
    and (
      lower(coalesce(le.drop_type, 'all')) = 'all'
      or lower(coalesce(le.drop_type, 'all')) = lower(coalesce(dkd_param_drop_type, 'all'))
    )
    and (
      dkd_param_prefer_rarity is null
      or lower(coalesce(dkd_alias_c.rarity, 'common')) = lower(dkd_param_prefer_rarity)
      or lower(coalesce(le.rarity, 'common')) = lower(dkd_param_prefer_rarity)
    )
  order by greatest(coalesce(le.weight, 1), 0.01) * (0.35 + random()) desc, random()
  limit 1;

  if dkd_var_id is null then
    select
      dkd_alias_c.id,
      dkd_alias_c.name,
      dkd_alias_c.series,
      dkd_alias_c.rarity,
      dkd_alias_c.theme
    into
      dkd_var_id,
      dkd_var_name,
      dkd_var_series,
      dkd_var_rarity,
      dkd_var_theme
    from public.dkd_card_defs dkd_alias_c
    where coalesce(dkd_alias_c.is_active, true) = true
      and (
        dkd_param_prefer_rarity is null
        or lower(coalesce(dkd_alias_c.rarity, 'common')) = lower(dkd_param_prefer_rarity)
      )
    order by random()
    limit 1;
  end if;

  return jsonb_build_object(
    'card_def_id', dkd_var_id,
    'name', dkd_var_name,
    'series', dkd_var_series,
    'rarity', dkd_var_rarity,
    'theme', dkd_var_theme
  );
end;
$$;

create or replace function public.dkd_open_chest_core(
  dkd_param_drop_id uuid,
  dkd_param_ignore_qr boolean default false,
  dkd_param_qr_secret text default null,
  dkd_param_lat double precision default null,
  dkd_param_lng double precision default null,
  dkd_param_prefer_rarity text default null,
  dkd_param_bonus_token integer default 0,
  dkd_param_bonus_energy integer default 0,
  dkd_param_token_mult numeric default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
  dkd_var_drop public.dkd_drops%rowtype;
  dkd_var_last_opened timestamptz;
  dkd_var_next_open_at timestamptz;
  dkd_var_distance numeric;
  dkd_var_pick jsonb;
  dkd_var_card_def_id uuid;
  dkd_var_token integer;
  dkd_var_energy_gain integer;
begin
  dkd_var_user_id := auth.uid();

  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  select *
  into dkd_var_drop
  from public.dkd_drops
  where id = dkd_param_drop_id
    and is_active = true
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'drop_not_found');
  end if;

  if not dkd_param_ignore_qr
     and lower(coalesce(dkd_var_drop.type, 'map')) = 'qr'
     and coalesce(nullif(dkd_var_drop.qr_secret, ''), '') <> coalesce(nullif(dkd_param_qr_secret, ''), '')
  then
    return jsonb_build_object('ok', false, 'reason', 'invalid_qr');
  end if;

  if dkd_param_lat is not null and dkd_param_lng is not null and dkd_var_drop.lat is not null and dkd_var_drop.lng is not null then
    dkd_var_distance := public.dkd_distance_m(dkd_param_lat, dkd_param_lng, dkd_var_drop.lat, dkd_var_drop.lng);
    if dkd_var_distance > greatest(coalesce(dkd_var_drop.radius_m, 60), 1) then
      return jsonb_build_object(
        'ok', false,
        'reason', 'too_far',
        'distance_m', round(dkd_var_distance),
        'radius_m', dkd_var_drop.radius_m
      );
    end if;
  end if;

  select ud.last_opened_at
  into dkd_var_last_opened
  from public.dkd_user_drops ud
  where ud.user_id = dkd_var_user_id
    and ud.drop_id = dkd_var_drop.id
  limit 1;

  if dkd_var_last_opened is not null then
    dkd_var_next_open_at := dkd_var_last_opened + make_interval(secs => greatest(coalesce(dkd_var_drop.cooldown_seconds, 900), 0));
    if dkd_var_next_open_at > now() then
      return jsonb_build_object(
        'ok', false,
        'reason', 'cooldown',
        'next_open_at', dkd_var_next_open_at
      );
    end if;
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_var_user_id)
  on conflict (user_id) do nothing;

  dkd_var_pick := public.dkd_pick_card(dkd_var_drop.type, dkd_param_prefer_rarity);
  dkd_var_card_def_id := nullif(dkd_var_pick->>'card_def_id', '')::uuid;

  dkd_var_token :=
    greatest(
      (
        case lower(coalesce(dkd_var_drop.type, 'map'))
          when 'qr' then 18 + floor(random() * 14)::int
          when 'boss' then 55 + floor(random() * 26)::int
          else 12 + floor(random() * 11)::int
        end
      ),
      1
    );

  dkd_var_token := greatest(((dkd_var_token * greatest(coalesce(dkd_param_token_mult, 1), 0.10))::numeric)::int + greatest(coalesce(dkd_param_bonus_token, 0), 0), 1);
  dkd_var_energy_gain := greatest(coalesce(dkd_param_bonus_energy, 0), 0);

  update public.dkd_profiles
  set
    token = coalesce(token, 0) + dkd_var_token,
    energy = least(coalesce(energy_max, 100), coalesce(energy, 0) + dkd_var_energy_gain),
    updated_at = now()
  where user_id = dkd_var_user_id;

  if dkd_var_card_def_id is not null then
    insert into public.dkd_user_cards (user_id, card_def_id, source)
    values (dkd_var_user_id, dkd_var_card_def_id, 'chest_' || lower(coalesce(dkd_var_drop.type, 'map')));
  end if;

  insert into public.dkd_user_drops (user_id, drop_id, last_opened_at)
  values (dkd_var_user_id, dkd_var_drop.id, now())
  on conflict (user_id, drop_id) do update
  set last_opened_at = excluded.last_opened_at;

  insert into public.dkd_chest_logs (
    user_id,
    drop_id,
    card_def_id,
    gained_token,
    gained_shards,
    gained_energy,
    gained_boss_tickets,
    drop_type
  )
  values (
    dkd_var_user_id,
    dkd_var_drop.id,
    dkd_var_card_def_id,
    dkd_var_token,
    0,
    dkd_var_energy_gain,
    0,
    lower(coalesce(dkd_var_drop.type, 'map'))
  );

  return jsonb_build_object(
    'ok', true,
    'drop_id', dkd_var_drop.id,
    'drop_type', lower(coalesce(dkd_var_drop.type, 'map')),
    'token', dkd_var_token,
    'token_mult', dkd_param_token_mult,
    'gained_energy', dkd_var_energy_gain,
    'card_def_id', dkd_var_card_def_id
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
begin
  return public.dkd_open_chest_core(
    dkd_param_drop_id,
    false,
    dkd_param_qr_secret,
    dkd_param_lat,
    dkd_param_lng,
    null,
    0,
    0,
    1
  );
end;
$$;

revoke all on function public.dkd_open_chest_secure(uuid, text, double precision, double precision) from public;
grant execute on function public.dkd_open_chest_secure(uuid, text, double precision, double precision) to authenticated;

create or replace function public.dkd_open_chest_by_code(dkd_param_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_drop_id uuid;
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  select d.id
  into dkd_var_drop_id
  from public.dkd_drops d
  where upper(coalesce(d.current_code, '')) = upper(coalesce(trim(dkd_param_code), ''))
    and d.is_active = true
    and (d.current_code_expires_at is null or d.current_code_expires_at > now())
  limit 1;

  if dkd_var_drop_id is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_code');
  end if;

  return public.dkd_open_chest_core(
    dkd_var_drop_id,
    true,
    null,
    null,
    null,
    null,
    0,
    0,
    1
  );
end;
$$;

revoke all on function public.dkd_open_chest_by_code(text) from public;
grant execute on function public.dkd_open_chest_by_code(text) to authenticated;

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
  dkd_var_drop_type text;
  dkd_var_prefer_rarity text;
  dkd_var_mult numeric;
  dkd_var_bonus_token integer;
  dkd_var_bonus_energy integer;
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  select lower(coalesce(type, 'map'))
  into dkd_var_drop_type
  from public.dkd_drops
  where id = dkd_param_drop_id
    and is_active = true
  limit 1;

  if dkd_var_drop_type is null then
    return jsonb_build_object('ok', false, 'reason', 'drop_not_found');
  end if;

  if dkd_var_drop_type <> 'boss' then
    return jsonb_build_object('ok', false, 'reason', 'not_boss_drop');
  end if;

  dkd_var_prefer_rarity :=
    case
      when coalesce(dkd_param_tier, 1) >= 3 then 'legendary'
      when coalesce(dkd_param_tier, 1) = 2 then 'epic'
      else 'rare'
    end;

  dkd_var_mult :=
    case
      when coalesce(dkd_param_tier, 1) >= 3 then 3.2
      when coalesce(dkd_param_tier, 1) = 2 then 2.5
      else 1.9
    end;

  dkd_var_bonus_token := greatest(coalesce(dkd_param_correct, 0), 0) * 4;
  dkd_var_bonus_energy := least(greatest(coalesce(dkd_param_total, 0), 0), 12);

  return public.dkd_open_chest_core(
    dkd_param_drop_id,
    true,
    null,
    dkd_param_lat,
    dkd_param_lng,
    dkd_var_prefer_rarity,
    dkd_var_bonus_token,
    dkd_var_bonus_energy,
    dkd_var_mult
  );
end;
$$;

revoke all on function public.dkd_open_boss_chest_secure(uuid, integer, integer, integer, double precision, double precision) from public;
grant execute on function public.dkd_open_boss_chest_secure(uuid, integer, integer, integer, double precision, double precision) to authenticated;

create or replace function public.dkd_market_list_card(
  dkd_param_user_card_id bigint,
  dkd_param_price_token integer
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
  dkd_var_card_def_id uuid;
  dkd_var_listing_id bigint;
begin
  dkd_var_user_id := auth.uid();

  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  if coalesce(dkd_param_price_token, 0) < 1 then
    raise exception 'invalid_price';
  end if;

  select uc.card_def_id
  into dkd_var_card_def_id
  from public.dkd_user_cards uc
  where uc.id = dkd_param_user_card_id
    and uc.user_id = dkd_var_user_id
  limit 1;

  if dkd_var_card_def_id is null then
    raise exception 'card_not_owned';
  end if;

  if exists (
    select 1
    from public.dkd_market_listings ml
    where ml.user_card_id = dkd_param_user_card_id
      and ml.status = 'active'
  ) then
    raise exception 'already_listed';
  end if;

  insert into public.dkd_market_listings
    (seller_id, user_card_id, card_def_id, price_token, status)
  values
    (dkd_var_user_id, dkd_param_user_card_id, dkd_var_card_def_id, dkd_param_price_token, 'active')
  returning id into dkd_var_listing_id;

  return dkd_var_listing_id;
end;
$$;

revoke all on function public.dkd_market_list_card(bigint, integer) from public;
grant execute on function public.dkd_market_list_card(bigint, integer) to authenticated;

create or replace function public.dkd_market_cancel(dkd_param_listing_id bigint)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
begin
  dkd_var_user_id := auth.uid();

  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  update public.dkd_market_listings
  set
    status = 'cancelled',
    updated_at = now()
  where id = dkd_param_listing_id
    and status = 'active'
    and (
      seller_id = dkd_var_user_id
      or public.dkd_is_admin()
    );

  if not found then
    raise exception 'listing_not_found';
  end if;

  return dkd_param_listing_id;
end;
$$;

revoke all on function public.dkd_market_cancel(bigint) from public;
grant execute on function public.dkd_market_cancel(bigint) to authenticated;

create or replace function public.dkd_market_buy(dkd_param_listing_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
  dkd_var_seller_id uuid;
  dkd_var_user_card_id bigint;
  dkd_var_price integer;
  dkd_var_status text;
  dkd_var_fee integer;
  dkd_var_seller_gain integer;
  dkd_var_buyer_token integer;
begin
  dkd_var_user_id := auth.uid();

  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_var_user_id)
  on conflict (user_id) do nothing;

  select
    ml.seller_id,
    ml.user_card_id,
    ml.price_token,
    ml.status
  into
    dkd_var_seller_id,
    dkd_var_user_card_id,
    dkd_var_price,
    dkd_var_status
  from public.dkd_market_listings ml
  where ml.id = dkd_param_listing_id
  for update;

  if dkd_var_seller_id is null then
    return jsonb_build_object('ok', false, 'reason', 'listing_not_found');
  end if;

  if coalesce(dkd_var_status, '') <> 'active' then
    return jsonb_build_object('ok', false, 'reason', 'listing_not_active');
  end if;

  if dkd_var_seller_id = dkd_var_user_id then
    return jsonb_build_object('ok', false, 'reason', 'own_listing');
  end if;

  select coalesce(dkd_alias_p.token, 0)
  into dkd_var_buyer_token
  from public.dkd_profiles dkd_alias_p
  where dkd_alias_p.user_id = dkd_var_user_id
  limit 1;

  if coalesce(dkd_var_buyer_token, 0) < coalesce(dkd_var_price, 0) then
    return jsonb_build_object('ok', false, 'reason', 'insufficient_token');
  end if;

  dkd_var_fee := greatest(floor(coalesce(dkd_var_price, 0) * 0.10)::int, 1);
  dkd_var_seller_gain := greatest(coalesce(dkd_var_price, 0) - dkd_var_fee, 0);

  insert into public.dkd_profiles (user_id)
  values (dkd_var_seller_id)
  on conflict (user_id) do nothing;

  update public.dkd_profiles
  set
    token = coalesce(token, 0) - dkd_var_price,
    updated_at = now()
  where user_id = dkd_var_user_id;

  update public.dkd_profiles
  set
    token = coalesce(token, 0) + dkd_var_seller_gain,
    updated_at = now()
  where user_id = dkd_var_seller_id;

  update public.dkd_user_cards
  set
    user_id = dkd_var_user_id,
    source = 'market'
  where id = dkd_var_user_card_id;

  update public.dkd_market_listings
  set
    status = 'sold',
    buyer_id = dkd_var_user_id,
    updated_at = now()
  where id = dkd_param_listing_id;

  return jsonb_build_object(
    'ok', true,
    'price', dkd_var_price,
    'fee', dkd_var_fee,
    'seller_gain', dkd_var_seller_gain
  );
end;
$$;

revoke all on function public.dkd_market_buy(bigint) from public;
grant execute on function public.dkd_market_buy(bigint) to authenticated;
