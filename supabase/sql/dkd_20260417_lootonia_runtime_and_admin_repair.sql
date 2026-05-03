begin;

alter table if exists public.dkd_market_ui_config
  add column if not exists hero_icon_name text,
  add column if not exists hero_icon_accent text,
  add column if not exists hero_background_image_url text,
  add column if not exists hero_visual_preset text not null default 'aurora';

alter table if exists public.dkd_market_shop_defs
  add column if not exists art_image_url text,
  add column if not exists panel_style text not null default 'featured',
  add column if not exists background_tone text not null default 'auto',
  add column if not exists visual_preset text not null default 'auto';

create or replace function public.dkd_admin_courier_applications_list()
returns table (
  application_id bigint,
  user_id uuid,
  status text,
  city text,
  zone text,
  vehicle_type text,
  first_name text,
  last_name text,
  national_id text,
  phone text,
  email text,
  plate_no text,
  address_text text,
  emergency_name text,
  emergency_phone text,
  identity_front_url text,
  identity_back_url text,
  selfie_url text,
  driver_license_url text,
  vehicle_license_url text,
  insurance_url text,
  payload jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  profile_nickname text,
  profile_avatar_emoji text,
  profile_courier_status text,
  profile_vehicle_type text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not coalesce(public.dkd_is_admin(), false) then
    raise exception 'admin_required';
  end if;

  return query
  select
    dkd_application_alias.id::bigint as application_id,
    dkd_application_alias.user_id::uuid,
    coalesce(dkd_application_alias.status, 'pending')::text as status,
    coalesce(dkd_application_alias.city, 'Ankara')::text as city,
    coalesce(dkd_application_alias.zone, '')::text as zone,
    coalesce(dkd_application_alias.vehicle_type, 'moto')::text as vehicle_type,
    coalesce(dkd_application_alias.first_name, '')::text as first_name,
    coalesce(dkd_application_alias.last_name, '')::text as last_name,
    coalesce(dkd_application_alias.national_id, '')::text as national_id,
    coalesce(dkd_application_alias.phone, '')::text as phone,
    coalesce(dkd_application_alias.email, '')::text as email,
    coalesce(dkd_application_alias.plate_no, '')::text as plate_no,
    coalesce(dkd_application_alias.address_text, '')::text as address_text,
    coalesce(dkd_application_alias.emergency_name, '')::text as emergency_name,
    coalesce(dkd_application_alias.emergency_phone, '')::text as emergency_phone,
    coalesce(dkd_application_alias.identity_front_url, '')::text as identity_front_url,
    coalesce(dkd_application_alias.identity_back_url, '')::text as identity_back_url,
    coalesce(dkd_application_alias.selfie_url, '')::text as selfie_url,
    coalesce(dkd_application_alias.driver_license_url, '')::text as driver_license_url,
    coalesce(dkd_application_alias.vehicle_license_url, '')::text as vehicle_license_url,
    coalesce(dkd_application_alias.insurance_url, '')::text as insurance_url,
    coalesce(dkd_application_alias.payload, '{}'::jsonb)::jsonb as payload,
    dkd_application_alias.created_at::timestamptz,
    dkd_application_alias.updated_at::timestamptz,
    coalesce(coalesce(to_jsonb(dkd_profile_alias), '{}'::jsonb)->>'nickname', '')::text as profile_nickname,
    coalesce(coalesce(to_jsonb(dkd_profile_alias), '{}'::jsonb)->>'avatar_emoji', '')::text as profile_avatar_emoji,
    coalesce(coalesce(to_jsonb(dkd_profile_alias), '{}'::jsonb)->>'courier_status', 'none')::text as profile_courier_status,
    coalesce(coalesce(to_jsonb(dkd_profile_alias), '{}'::jsonb)->>'courier_vehicle_type', '')::text as profile_vehicle_type
  from public.dkd_courier_license_applications as dkd_application_alias
  left join public.dkd_profiles as dkd_profile_alias
    on dkd_profile_alias.user_id = dkd_application_alias.user_id
  order by
    case
      when coalesce(dkd_application_alias.status, 'pending') = 'pending' then 0
      when coalesce(dkd_application_alias.status, 'pending') = 'approved' then 1
      else 2
    end,
    coalesce(dkd_application_alias.updated_at, dkd_application_alias.created_at) desc,
    dkd_application_alias.id desc;
end;
$$;

revoke all on function public.dkd_admin_courier_applications_list() from public;
grant execute on function public.dkd_admin_courier_applications_list() to authenticated;

drop function if exists public.dkd_admin_market_ui_save(text, text, text, text, text);
drop function if exists public.dkd_admin_market_ui_save(text, text, text, text, text, text, text);
drop function if exists public.dkd_admin_market_ui_save(text, text, text, text, text, text, text, text, text);

create or replace function public.dkd_admin_market_ui_save(
  dkd_param_hero_kicker text,
  dkd_param_hero_title text,
  dkd_param_hero_subtitle text,
  dkd_param_logic_title text,
  dkd_param_logic_body text,
  dkd_param_hero_icon_name text,
  dkd_param_hero_icon_accent text,
  dkd_param_hero_background_image_url text,
  dkd_param_hero_visual_preset text
)
returns public.dkd_market_ui_config
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_row public.dkd_market_ui_config;
  dkd_hero_visual_preset text;
begin
  if not coalesce(public.dkd_is_admin(), false) then
    raise exception 'not_admin';
  end if;

  dkd_hero_visual_preset := lower(coalesce(trim(dkd_param_hero_visual_preset), 'aurora'));
  if dkd_hero_visual_preset not in ('aurora', 'neon', 'gold', 'frost') then
    dkd_hero_visual_preset := 'aurora';
  end if;

  insert into public.dkd_market_ui_config (
    id,
    hero_kicker,
    hero_title,
    hero_subtitle,
    logic_title,
    logic_body,
    hero_icon_name,
    hero_icon_accent,
    hero_background_image_url,
    hero_visual_preset,
    updated_at
  )
  values (
    1,
    coalesce(nullif(trim(dkd_param_hero_kicker), ''), 'TOKEN MAĞAZASI'),
    coalesce(nullif(trim(dkd_param_hero_title), ''), 'Anında al, anında kullan'),
    coalesce(nullif(trim(dkd_param_hero_subtitle), ''), 'Token cüzdanınla shard, boss bileti ve enerji satın al. Her paket ne işe yaradığını açık şekilde gösterir.'),
    coalesce(nullif(trim(dkd_param_logic_title), ''), 'Paket mantığı'),
    coalesce(nullif(trim(dkd_param_logic_body), ''), 'Shard = craft ve upgrade, Bilet = boss girişi, Enerji = daha fazla drop ve sandık akışı.'),
    coalesce(nullif(trim(dkd_param_hero_icon_name), ''), 'shopping-outline'),
    coalesce(nullif(trim(dkd_param_hero_icon_accent), ''), 'cyan'),
    nullif(trim(dkd_param_hero_background_image_url), ''),
    dkd_hero_visual_preset,
    now()
  )
  on conflict (id) do update set
    hero_kicker = excluded.hero_kicker,
    hero_title = excluded.hero_title,
    hero_subtitle = excluded.hero_subtitle,
    logic_title = excluded.logic_title,
    logic_body = excluded.logic_body,
    hero_icon_name = excluded.hero_icon_name,
    hero_icon_accent = excluded.hero_icon_accent,
    hero_background_image_url = excluded.hero_background_image_url,
    hero_visual_preset = excluded.hero_visual_preset,
    updated_at = now()
  returning * into dkd_row;

  return dkd_row;
end;
$$;

create or replace function public.dkd_admin_market_ui_save(
  dkd_param_hero_kicker text,
  dkd_param_hero_title text,
  dkd_param_hero_subtitle text,
  dkd_param_logic_title text,
  dkd_param_logic_body text,
  dkd_param_hero_icon_name text,
  dkd_param_hero_icon_accent text
)
returns public.dkd_market_ui_config
language sql
security definer
set search_path = public
as $$
  select public.dkd_admin_market_ui_save(
    dkd_param_hero_kicker,
    dkd_param_hero_title,
    dkd_param_hero_subtitle,
    dkd_param_logic_title,
    dkd_param_logic_body,
    dkd_param_hero_icon_name,
    dkd_param_hero_icon_accent,
    null,
    'aurora'
  );
$$;

create or replace function public.dkd_admin_market_ui_save(
  dkd_param_hero_kicker text,
  dkd_param_hero_title text,
  dkd_param_hero_subtitle text,
  dkd_param_logic_title text,
  dkd_param_logic_body text
)
returns public.dkd_market_ui_config
language sql
security definer
set search_path = public
as $$
  select public.dkd_admin_market_ui_save(
    dkd_param_hero_kicker,
    dkd_param_hero_title,
    dkd_param_hero_subtitle,
    dkd_param_logic_title,
    dkd_param_logic_body,
    'shopping-outline',
    'cyan',
    null,
    'aurora'
  );
$$;

revoke all on function public.dkd_admin_market_ui_save(text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.dkd_admin_market_ui_save(text, text, text, text, text, text, text, text, text) to authenticated;
revoke all on function public.dkd_admin_market_ui_save(text, text, text, text, text, text, text) from public;
grant execute on function public.dkd_admin_market_ui_save(text, text, text, text, text, text, text) to authenticated;
revoke all on function public.dkd_admin_market_ui_save(text, text, text, text, text) from public;
grant execute on function public.dkd_admin_market_ui_save(text, text, text, text, text) to authenticated;

drop function if exists public.dkd_admin_market_shop_upsert(bigint, text, text, text, text, text, text, text, integer, text, integer, integer, boolean);
drop function if exists public.dkd_admin_market_shop_upsert(bigint, text, text, text, text, text, text, text, text, text, text, integer, text, integer, integer, boolean);
drop function if exists public.dkd_admin_market_shop_upsert(bigint, text, text, text, text, text, text, text, text, text, text, text, integer, text, integer, integer, boolean);

create or replace function public.dkd_admin_market_shop_upsert(
  dkd_param_id bigint,
  dkd_param_pack_key text,
  dkd_param_title text,
  dkd_param_subtitle text,
  dkd_param_description text,
  dkd_param_badge_label text,
  dkd_param_icon_name text,
  dkd_param_accent_key text,
  dkd_param_art_image_url text,
  dkd_param_panel_style text,
  dkd_param_background_tone text,
  dkd_param_visual_preset text,
  dkd_param_price_token integer,
  dkd_param_reward_kind text,
  dkd_param_reward_amount integer,
  dkd_param_sort_order integer,
  dkd_param_is_active boolean
)
returns public.dkd_market_shop_defs
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_row public.dkd_market_shop_defs;
  dkd_reward_kind text;
  dkd_panel_style text;
  dkd_background_tone text;
  dkd_visual_preset text;
begin
  if not coalesce(public.dkd_is_admin(), false) then
    raise exception 'not_admin';
  end if;

  dkd_reward_kind := lower(coalesce(trim(dkd_param_reward_kind), ''));
  if dkd_reward_kind = '' then
    raise exception 'invalid_reward_kind';
  end if;

  dkd_panel_style := lower(coalesce(trim(dkd_param_panel_style), 'featured'));
  if dkd_panel_style not in ('featured', 'minimal', 'compact') then
    dkd_panel_style := 'featured';
  end if;

  dkd_background_tone := lower(coalesce(trim(dkd_param_background_tone), 'auto'));
  if dkd_background_tone not in ('auto', 'midnight', 'sunset', 'emerald', 'violet') then
    dkd_background_tone := 'auto';
  end if;

  dkd_visual_preset := lower(coalesce(trim(dkd_param_visual_preset), 'auto'));
  if dkd_visual_preset not in ('auto', 'aurora', 'neon', 'gold', 'frost') then
    dkd_visual_preset := 'auto';
  end if;

  if coalesce(nullif(trim(dkd_param_pack_key), ''), '') = '' then
    raise exception 'pack_key_required';
  end if;

  if coalesce(nullif(trim(dkd_param_title), ''), '') = '' then
    raise exception 'title_required';
  end if;

  if dkd_param_id is null then
    insert into public.dkd_market_shop_defs (
      pack_key,
      title,
      subtitle,
      description,
      badge_label,
      icon_name,
      accent_key,
      art_image_url,
      panel_style,
      background_tone,
      visual_preset,
      price_token,
      reward_kind,
      reward_amount,
      sort_order,
      is_active,
      updated_at
    ) values (
      trim(dkd_param_pack_key),
      trim(dkd_param_title),
      nullif(trim(dkd_param_subtitle), ''),
      nullif(trim(dkd_param_description), ''),
      nullif(trim(dkd_param_badge_label), ''),
      coalesce(nullif(trim(dkd_param_icon_name), ''), 'cube-outline'),
      coalesce(nullif(trim(dkd_param_accent_key), ''), 'cyan'),
      nullif(trim(dkd_param_art_image_url), ''),
      dkd_panel_style,
      dkd_background_tone,
      dkd_visual_preset,
      greatest(coalesce(dkd_param_price_token, 0), 0),
      dkd_reward_kind,
      greatest(coalesce(dkd_param_reward_amount, 1), 1),
      coalesce(dkd_param_sort_order, 100),
      coalesce(dkd_param_is_active, true),
      now()
    ) returning * into dkd_row;
  else
    update public.dkd_market_shop_defs
    set
      pack_key = trim(dkd_param_pack_key),
      title = trim(dkd_param_title),
      subtitle = nullif(trim(dkd_param_subtitle), ''),
      description = nullif(trim(dkd_param_description), ''),
      badge_label = nullif(trim(dkd_param_badge_label), ''),
      icon_name = coalesce(nullif(trim(dkd_param_icon_name), ''), 'cube-outline'),
      accent_key = coalesce(nullif(trim(dkd_param_accent_key), ''), 'cyan'),
      art_image_url = nullif(trim(dkd_param_art_image_url), ''),
      panel_style = dkd_panel_style,
      background_tone = dkd_background_tone,
      visual_preset = dkd_visual_preset,
      price_token = greatest(coalesce(dkd_param_price_token, 0), 0),
      reward_kind = dkd_reward_kind,
      reward_amount = greatest(coalesce(dkd_param_reward_amount, 1), 1),
      sort_order = coalesce(dkd_param_sort_order, 100),
      is_active = coalesce(dkd_param_is_active, true),
      updated_at = now()
    where id = dkd_param_id
    returning * into dkd_row;
  end if;

  return dkd_row;
end;
$$;

create or replace function public.dkd_admin_market_shop_upsert(
  dkd_param_id bigint,
  dkd_param_pack_key text,
  dkd_param_title text,
  dkd_param_subtitle text,
  dkd_param_description text,
  dkd_param_badge_label text,
  dkd_param_icon_name text,
  dkd_param_accent_key text,
  dkd_param_art_image_url text,
  dkd_param_panel_style text,
  dkd_param_background_tone text,
  dkd_param_price_token integer,
  dkd_param_reward_kind text,
  dkd_param_reward_amount integer,
  dkd_param_sort_order integer,
  dkd_param_is_active boolean
)
returns public.dkd_market_shop_defs
language sql
security definer
set search_path = public
as $$
  select public.dkd_admin_market_shop_upsert(
    dkd_param_id,
    dkd_param_pack_key,
    dkd_param_title,
    dkd_param_subtitle,
    dkd_param_description,
    dkd_param_badge_label,
    dkd_param_icon_name,
    dkd_param_accent_key,
    dkd_param_art_image_url,
    dkd_param_panel_style,
    dkd_param_background_tone,
    'auto',
    dkd_param_price_token,
    dkd_param_reward_kind,
    dkd_param_reward_amount,
    dkd_param_sort_order,
    dkd_param_is_active
  );
$$;

create or replace function public.dkd_admin_market_shop_upsert(
  dkd_param_id bigint,
  dkd_param_pack_key text,
  dkd_param_title text,
  dkd_param_subtitle text,
  dkd_param_description text,
  dkd_param_badge_label text,
  dkd_param_icon_name text,
  dkd_param_accent_key text,
  dkd_param_price_token integer,
  dkd_param_reward_kind text,
  dkd_param_reward_amount integer,
  dkd_param_sort_order integer,
  dkd_param_is_active boolean
)
returns public.dkd_market_shop_defs
language sql
security definer
set search_path = public
as $$
  select public.dkd_admin_market_shop_upsert(
    dkd_param_id,
    dkd_param_pack_key,
    dkd_param_title,
    dkd_param_subtitle,
    dkd_param_description,
    dkd_param_badge_label,
    dkd_param_icon_name,
    dkd_param_accent_key,
    null,
    'featured',
    'auto',
    'auto',
    dkd_param_price_token,
    dkd_param_reward_kind,
    dkd_param_reward_amount,
    dkd_param_sort_order,
    dkd_param_is_active
  );
$$;

revoke all on function public.dkd_admin_market_shop_upsert(bigint, text, text, text, text, text, text, text, text, text, text, text, integer, text, integer, integer, boolean) from public;
grant execute on function public.dkd_admin_market_shop_upsert(bigint, text, text, text, text, text, text, text, text, text, text, text, integer, text, integer, integer, boolean) to authenticated;
revoke all on function public.dkd_admin_market_shop_upsert(bigint, text, text, text, text, text, text, text, text, text, text, integer, text, integer, integer, boolean) from public;
grant execute on function public.dkd_admin_market_shop_upsert(bigint, text, text, text, text, text, text, text, text, text, text, integer, text, integer, integer, boolean) to authenticated;
revoke all on function public.dkd_admin_market_shop_upsert(bigint, text, text, text, text, text, text, text, integer, text, integer, integer, boolean) from public;
grant execute on function public.dkd_admin_market_shop_upsert(bigint, text, text, text, text, text, text, text, integer, text, integer, integer, boolean) to authenticated;

drop function if exists public.dkd_market_list_card(text, integer);
drop function if exists public.dkd_market_list_card(uuid, integer);

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
  dkd_var_id bigint;
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  insert into public.dkd_market_listings (seller_id, user_card_id, price_token, fee_token, status)
  values (
    auth.uid(),
    dkd_param_user_card_id,
    greatest(coalesce(dkd_param_price_token, 0), 1),
    greatest(floor(coalesce(dkd_param_price_token, 0) * 0.10), 0),
    'active'
  )
  returning id into dkd_var_id;

  return dkd_var_id;
end;
$$;

revoke all on function public.dkd_market_list_card(bigint, integer) from public;
grant execute on function public.dkd_market_list_card(bigint, integer) to authenticated;

drop function if exists public.dkd_open_boss_chest_secure(uuid, integer, integer, integer, numeric, numeric);

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
  dkd_var_card_def_id public.dkd_user_cards.card_def_id%TYPE;
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

revoke all on function public.dkd_open_boss_chest_secure(uuid, integer, integer, integer, double precision, double precision) from public;
grant execute on function public.dkd_open_boss_chest_secure(uuid, integer, integer, integer, double precision, double precision) to authenticated;

create or replace function public.dkd_shard_craft(dkd_param_rarity text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
  dkd_var_rarity text;
  dkd_var_cost integer := 0;
  dkd_var_card_id public.dkd_card_defs.id%TYPE;
  dkd_var_card_name text;
  dkd_var_shards integer := 0;
begin
  dkd_var_user_id := auth.uid();
  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  dkd_var_rarity := lower(coalesce(trim(dkd_param_rarity), ''));

  if dkd_var_rarity = 'common' then
    dkd_var_cost := 45;
  elsif dkd_var_rarity = 'rare' then
    dkd_var_cost := 110;
  elsif dkd_var_rarity = 'epic' then
    dkd_var_cost := 260;
  elsif dkd_var_rarity = 'legendary' then
    dkd_var_cost := 620;
  else
    return jsonb_build_object('ok', false, 'reason', 'invalid_rarity');
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_var_user_id)
  on conflict (user_id) do nothing;

  select coalesce(shards, 0)
  into dkd_var_shards
  from public.dkd_profiles
  where user_id = dkd_var_user_id
  for update;

  if dkd_var_shards < dkd_var_cost then
    return jsonb_build_object('ok', false, 'reason', 'not_enough_shards');
  end if;

  select
    dkd_alias_c.id,
    dkd_alias_c.name
  into
    dkd_var_card_id,
    dkd_var_card_name
  from public.dkd_card_defs dkd_alias_c
  where coalesce(dkd_alias_c.is_active, true) = true
    and lower(coalesce(dkd_alias_c.rarity, 'common')) = dkd_var_rarity
  order by random()
  limit 1;

  if dkd_var_card_id is null then
    return jsonb_build_object('ok', false, 'reason', 'card_pool_empty');
  end if;

  update public.dkd_profiles
  set
    shards = coalesce(shards, 0) - dkd_var_cost,
    updated_at = now()
  where user_id = dkd_var_user_id;

  insert into public.dkd_user_cards (user_id, card_def_id, source)
  values (dkd_var_user_id, dkd_var_card_id, 'shard_craft');

  return jsonb_build_object(
    'ok', true,
    'spent_shards', dkd_var_cost,
    'card_def_id', dkd_var_card_id,
    'card_name', dkd_var_card_name,
    'rarity', dkd_var_rarity
  );
end;
$$;

create or replace function public.dkd_shard_upgrade_random(dkd_param_from_rarity text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
  dkd_var_from text;
  dkd_var_to text;
  dkd_var_cost integer := 0;
  dkd_var_shards integer := 0;
  dkd_var_source_card_row_id bigint;
  dkd_var_burned_card_name text;
  dkd_var_new_card_id public.dkd_card_defs.id%TYPE;
  dkd_var_new_card_name text;
begin
  dkd_var_user_id := auth.uid();
  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  dkd_var_from := lower(coalesce(trim(dkd_param_from_rarity), ''));

  if dkd_var_from = 'common' then
    dkd_var_to := 'rare';
    dkd_var_cost := 50;
  elsif dkd_var_from = 'rare' then
    dkd_var_to := 'epic';
    dkd_var_cost := 140;
  elsif dkd_var_from = 'epic' then
    dkd_var_to := 'legendary';
    dkd_var_cost := 320;
  elsif dkd_var_from = 'legendary' then
    dkd_var_to := 'mythic';
    dkd_var_cost := 800;
  else
    return jsonb_build_object('ok', false, 'reason', 'invalid_from_rarity');
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_var_user_id)
  on conflict (user_id) do nothing;

  select coalesce(shards, 0)
  into dkd_var_shards
  from public.dkd_profiles
  where user_id = dkd_var_user_id
  for update;

  if dkd_var_shards < dkd_var_cost then
    return jsonb_build_object('ok', false, 'reason', 'not_enough_shards');
  end if;

  select
    uc.id,
    dkd_alias_c.name
  into
    dkd_var_source_card_row_id,
    dkd_var_burned_card_name
  from public.dkd_user_cards uc
  join public.dkd_card_defs dkd_alias_c
    on dkd_alias_c.id = uc.card_def_id
  where uc.user_id = dkd_var_user_id
    and lower(coalesce(dkd_alias_c.rarity, 'common')) = dkd_var_from
  order by uc.created_at asc, uc.id asc
  limit 1;

  if dkd_var_source_card_row_id is null then
    return jsonb_build_object('ok', false, 'reason', 'no_source_card');
  end if;

  select
    dkd_alias_c.id,
    dkd_alias_c.name
  into
    dkd_var_new_card_id,
    dkd_var_new_card_name
  from public.dkd_card_defs dkd_alias_c
  where coalesce(dkd_alias_c.is_active, true) = true
    and lower(coalesce(dkd_alias_c.rarity, 'common')) = dkd_var_to
  order by random()
  limit 1;

  if dkd_var_new_card_id is null then
    return jsonb_build_object('ok', false, 'reason', 'target_pool_empty');
  end if;

  delete from public.dkd_user_cards
  where id = dkd_var_source_card_row_id;

  update public.dkd_profiles
  set
    shards = coalesce(shards, 0) - dkd_var_cost,
    updated_at = now()
  where user_id = dkd_var_user_id;

  insert into public.dkd_user_cards (user_id, card_def_id, source)
  values (dkd_var_user_id, dkd_var_new_card_id, 'shard_upgrade');

  return jsonb_build_object(
    'ok', true,
    'spent_shards', dkd_var_cost,
    'burned_card_name', dkd_var_burned_card_name,
    'card_def_id', dkd_var_new_card_id,
    'card_name', dkd_var_new_card_name,
    'to_rarity', dkd_var_to
  );
end;
$$;

notify pgrst, 'reload schema';

commit;
