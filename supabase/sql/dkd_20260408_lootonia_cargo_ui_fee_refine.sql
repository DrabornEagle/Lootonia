begin;

create or replace function public.dkd_cargo_fee_from_distance_km(
  dkd_param_distance_km numeric default null
)
returns numeric
language plpgsql
immutable
as $$
declare
  dkd_meter_value numeric := greatest(coalesce(dkd_param_distance_km, 0), 0) * 1000;
begin
  if dkd_meter_value <= 100 then return 50;
  elsif dkd_meter_value <= 3000 then return 100;
  elsif dkd_meter_value <= 7000 then return 130;
  elsif dkd_meter_value <= 20000 then return 200;
  else return 250;
  end if;
end;
$$;

create or replace function public.dkd_distance_km_between(
  dkd_param_lat_1 numeric default null,
  dkd_param_lng_1 numeric default null,
  dkd_param_lat_2 numeric default null,
  dkd_param_lng_2 numeric default null
)
returns numeric
language sql
immutable
as $$
  select case
    when dkd_param_lat_1 is null or dkd_param_lng_1 is null or dkd_param_lat_2 is null or dkd_param_lng_2 is null then null
    else (
      6371::numeric * 2::numeric * asin(
        sqrt(
          power(sin(radians((dkd_param_lat_2::double precision - dkd_param_lat_1::double precision) / 2.0)), 2) +
          cos(radians(dkd_param_lat_1::double precision)) *
          cos(radians(dkd_param_lat_2::double precision)) *
          power(sin(radians((dkd_param_lng_2::double precision - dkd_param_lng_1::double precision) / 2.0)), 2)
        )
      )::numeric
    )
  end;
$$;

update public.dkd_courier_jobs
set merchant_name = 'Kurye-Kargo Operasyon Merkezi',
    dropoff = case
      when coalesce(trim(dropoff), '') = '' or dropoff = 'Kargo Operasyon Merkezi' then 'Kurye-Kargo Operasyon Merkezi'
      else dropoff
    end,
    updated_at = now()
where coalesce(job_type, '') = 'cargo';

drop function if exists public.dkd_cargo_shipment_create(text, text, text, text, text, text, numeric, numeric, numeric);
create function public.dkd_cargo_shipment_create(
  dkd_param_customer_first_name text default null,
  dkd_param_customer_last_name text default null,
  dkd_param_customer_national_id text default null,
  dkd_param_pickup_address_text text default null,
  dkd_param_package_content_text text default null,
  dkd_param_package_image_url text default null,
  dkd_param_package_weight_kg numeric default 0,
  dkd_param_pickup_lat numeric default null,
  dkd_param_pickup_lng numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  dkd_user_id uuid := auth.uid();
  dkd_weight_kg numeric(10,2) := greatest(coalesce(dkd_param_package_weight_kg, 0.1), 0.1);
  dkd_reward_score integer := greatest(14, ceil(greatest(coalesce(dkd_param_package_weight_kg, 0.1), 0.1) * 8)::integer);
  dkd_fee_tl numeric(12,2) := 0;
  dkd_eta_min integer := greatest(8, least(60, ceil(10 + (greatest(coalesce(dkd_param_package_weight_kg, 0.1), 0.1) * 4))::integer));
  dkd_shipment_id bigint;
  dkd_job_id bigint;
  dkd_first_name_value text := coalesce(nullif(trim(coalesce(dkd_param_customer_first_name, '')), ''), 'Gönderici');
  dkd_last_name_value text := coalesce(nullif(trim(coalesce(dkd_param_customer_last_name, '')), ''), 'Müşteri');
  dkd_full_name_value text;
begin
  if dkd_user_id is null then
    raise exception 'auth_required';
  end if;

  if length(regexp_replace(coalesce(dkd_param_customer_national_id, ''), '\D', '', 'g')) <> 11 then
    raise exception 'national_id_required';
  end if;

  if coalesce(length(trim(coalesce(dkd_param_pickup_address_text, ''))), 0) < 10 then
    raise exception 'pickup_address_required';
  end if;

  if coalesce(length(trim(coalesce(dkd_param_package_content_text, ''))), 0) < 2 then
    raise exception 'package_content_required';
  end if;

  dkd_full_name_value := trim(concat(dkd_first_name_value, ' ', dkd_last_name_value));

  insert into public.dkd_cargo_shipments (
    customer_user_id,
    customer_first_name,
    customer_last_name,
    customer_national_id,
    pickup_address_text,
    package_content_text,
    package_image_url,
    package_weight_kg,
    status,
    pickup_lat,
    pickup_lng
  ) values (
    dkd_user_id,
    dkd_first_name_value,
    dkd_last_name_value,
    regexp_replace(coalesce(dkd_param_customer_national_id, ''), '\D', '', 'g'),
    trim(coalesce(dkd_param_pickup_address_text, '')),
    trim(coalesce(dkd_param_package_content_text, '')),
    nullif(trim(coalesce(dkd_param_package_image_url, '')), ''),
    dkd_weight_kg,
    'open',
    dkd_param_pickup_lat,
    dkd_param_pickup_lng
  )
  returning id into dkd_shipment_id;

  insert into public.dkd_courier_jobs (
    title,
    pickup,
    dropoff,
    reward_score,
    distance_km,
    eta_min,
    job_type,
    is_active,
    status,
    pickup_status,
    merchant_name,
    product_title,
    delivery_note,
    delivery_address_text,
    customer_user_id,
    pickup_lat,
    pickup_lng,
    fee_tl,
    cargo_shipment_id,
    cargo_meta
  ) values (
    concat('Kargo • ', dkd_full_name_value),
    trim(coalesce(dkd_param_pickup_address_text, '')),
    'Kurye-Kargo Operasyon Merkezi',
    dkd_reward_score,
    0,
    dkd_eta_min,
    'cargo',
    true,
    'open',
    'pending',
    'Kurye-Kargo Operasyon Merkezi',
    trim(coalesce(dkd_param_package_content_text, '')),
    concat('Gönderici • ', dkd_full_name_value),
    trim(coalesce(dkd_param_pickup_address_text, '')),
    dkd_user_id,
    dkd_param_pickup_lat,
    dkd_param_pickup_lng,
    dkd_fee_tl,
    dkd_shipment_id,
    jsonb_build_object(
      'customer_first_name', dkd_first_name_value,
      'customer_last_name', dkd_last_name_value,
      'package_weight_kg', dkd_weight_kg,
      'package_image_url', nullif(trim(coalesce(dkd_param_package_image_url, '')), '')
    )
  )
  returning id into dkd_job_id;

  update public.dkd_cargo_shipments
  set courier_job_id = dkd_job_id,
      updated_at = now()
  where id = dkd_shipment_id;

  return jsonb_build_object(
    'ok', true,
    'cargo_shipment_id', dkd_shipment_id,
    'courier_job_id', dkd_job_id,
    'reward_score', dkd_reward_score,
    'fee_tl', dkd_fee_tl
  );
end;
$$;

revoke all on function public.dkd_cargo_shipment_create(text, text, text, text, text, text, numeric, numeric, numeric) from public;
grant execute on function public.dkd_cargo_shipment_create(text, text, text, text, text, text, numeric, numeric, numeric) to authenticated;

create or replace function public.dkd_courier_job_accept(
  dkd_param_job_id bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  dkd_user_id uuid := auth.uid();
  dkd_cargo_shipment_id bigint := null;
  dkd_eta_min integer := null;
  dkd_plate_no text := null;
  dkd_vehicle_type text := null;
  dkd_pickup_lat numeric := null;
  dkd_pickup_lng numeric := null;
  dkd_fee_tl numeric(12,2) := 0;
  dkd_distance_km numeric(10,3) := 0;
  dkd_live_lat numeric := null;
  dkd_live_lng numeric := null;
  dkd_live_eta_min integer := null;
begin
  if dkd_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'auth_required');
  end if;

  update public.dkd_courier_jobs
  set assigned_user_id = dkd_user_id,
      status = 'accepted',
      accepted_at = coalesce(accepted_at, now()),
      updated_at = now()
  where public.dkd_courier_jobs.id = dkd_param_job_id
    and (public.dkd_courier_jobs.assigned_user_id is null or public.dkd_courier_jobs.assigned_user_id = dkd_user_id)
    and coalesce(public.dkd_courier_jobs.status, 'open') in ('open', 'ready', 'published', 'accepted')
  returning cargo_shipment_id, eta_min, pickup_lat, pickup_lng, coalesce(fee_tl, 0), coalesce(distance_km, 0)
  into dkd_cargo_shipment_id, dkd_eta_min, dkd_pickup_lat, dkd_pickup_lng, dkd_fee_tl, dkd_distance_km;

  if dkd_param_job_id is null or (dkd_cargo_shipment_id is null and not exists (select 1 from public.dkd_courier_jobs where id = dkd_param_job_id and assigned_user_id = dkd_user_id)) then
    return jsonb_build_object('ok', false, 'reason', 'job_not_available');
  end if;

  select
    nullif(trim(coalesce(dkd_profiles.courier_profile_meta->>'plate_no', dkd_profiles.courier_profile_meta->>'plateNo', '')), ''),
    nullif(trim(coalesce(dkd_profiles.courier_vehicle_type, dkd_profiles.courier_profile_meta->>'vehicle_type', '')), '')
  into dkd_plate_no, dkd_vehicle_type
  from public.dkd_profiles
  where public.dkd_profiles.user_id = dkd_user_id;

  select
    public.dkd_courier_live_locations.lat,
    public.dkd_courier_live_locations.lng,
    public.dkd_courier_live_locations.eta_min
  into dkd_live_lat, dkd_live_lng, dkd_live_eta_min
  from public.dkd_courier_live_locations
  where public.dkd_courier_live_locations.courier_user_id = dkd_user_id;

  if coalesce(dkd_fee_tl, 0) <= 0 then
    dkd_distance_km := coalesce(
      nullif(dkd_distance_km, 0),
      public.dkd_distance_km_between(dkd_live_lat, dkd_live_lng, dkd_pickup_lat, dkd_pickup_lng),
      0
    );
    dkd_fee_tl := public.dkd_cargo_fee_from_distance_km(dkd_distance_km);

    update public.dkd_courier_jobs
    set fee_tl = dkd_fee_tl,
        distance_km = case
          when coalesce(public.dkd_courier_jobs.distance_km, 0) <= 0 then dkd_distance_km
          else public.dkd_courier_jobs.distance_km
        end,
        updated_at = now()
    where public.dkd_courier_jobs.id = dkd_param_job_id;
  end if;

  if dkd_cargo_shipment_id is not null then
    update public.dkd_cargo_shipments
    set status = 'accepted',
        accepted_at = coalesce(accepted_at, now()),
        assigned_courier_user_id = dkd_user_id,
        assigned_courier_plate_no = coalesce(dkd_plate_no, assigned_courier_plate_no),
        assigned_courier_vehicle_type = coalesce(dkd_vehicle_type, assigned_courier_vehicle_type),
        courier_eta_min = coalesce(dkd_live_eta_min, dkd_eta_min, courier_eta_min),
        updated_at = now()
    where id = dkd_cargo_shipment_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'job_id', dkd_param_job_id,
    'cargo_shipment_id', dkd_cargo_shipment_id,
    'reason', 'accepted',
    'fee_tl', dkd_fee_tl,
    'distance_km', dkd_distance_km
  );
end;
$$;

grant execute on function public.dkd_courier_job_accept(bigint) to authenticated;

create or replace function public.dkd_courier_job_complete(
  dkd_param_job_id bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  dkd_user_id uuid := auth.uid();
  dkd_fee_tl numeric(12,2) := 0;
  dkd_reward_score integer := 0;
  dkd_token_reward integer := 0;
  dkd_eta_min integer := 0;
  dkd_wallet_after numeric(12,2) := 0;
  dkd_token_after integer := 0;
  dkd_courier_score_after integer := 0;
  dkd_courier_completed_jobs_after integer := 0;
  dkd_cargo_shipment_id bigint := null;
  dkd_distance_km numeric(10,3) := 0;
begin
  if dkd_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'auth_required');
  end if;

  update public.dkd_courier_jobs
  set status = 'completed',
      completed_at = coalesce(completed_at, now()),
      is_active = false,
      pickup_status = 'delivered',
      updated_at = now()
  where public.dkd_courier_jobs.id = dkd_param_job_id
    and public.dkd_courier_jobs.assigned_user_id = dkd_user_id
    and coalesce(public.dkd_courier_jobs.status, 'accepted') <> 'completed'
  returning coalesce(public.dkd_courier_jobs.fee_tl, 0), coalesce(public.dkd_courier_jobs.reward_score, 0), coalesce(public.dkd_courier_jobs.eta_min, 0), public.dkd_courier_jobs.cargo_shipment_id, coalesce(public.dkd_courier_jobs.distance_km, 0)
  into dkd_fee_tl, dkd_reward_score, dkd_eta_min, dkd_cargo_shipment_id, dkd_distance_km;

  if dkd_fee_tl is null then
    return jsonb_build_object('ok', false, 'reason', 'job_not_found');
  end if;

  if coalesce(dkd_fee_tl, 0) <= 0 then
    dkd_fee_tl := public.dkd_cargo_fee_from_distance_km(dkd_distance_km);
    update public.dkd_courier_jobs
    set fee_tl = dkd_fee_tl,
        updated_at = now()
    where public.dkd_courier_jobs.id = dkd_param_job_id;
  end if;

  dkd_token_reward := greatest(dkd_reward_score * 4, 10);

  insert into public.dkd_profiles (user_id)
  values (dkd_user_id)
  on conflict (user_id) do nothing;

  update public.dkd_profiles
  set courier_score = coalesce(public.dkd_profiles.courier_score, 0) + dkd_reward_score,
      courier_completed_jobs = coalesce(public.dkd_profiles.courier_completed_jobs, 0) + 1,
      token = coalesce(public.dkd_profiles.token, 0) + dkd_token_reward,
      wallet_tl = coalesce(public.dkd_profiles.wallet_tl, 0) + dkd_fee_tl,
      courier_wallet_tl = coalesce(public.dkd_profiles.courier_wallet_tl, 0) + dkd_fee_tl,
      courier_total_earned_tl = coalesce(public.dkd_profiles.courier_total_earned_tl, 0) + dkd_fee_tl,
      courier_last_completed_at = now(),
      courier_fastest_eta_min = case
        when dkd_eta_min <= 0 then public.dkd_profiles.courier_fastest_eta_min
        when public.dkd_profiles.courier_fastest_eta_min is null then dkd_eta_min
        else least(public.dkd_profiles.courier_fastest_eta_min, dkd_eta_min)
      end,
      updated_at = now()
  where public.dkd_profiles.user_id = dkd_user_id
  returning public.dkd_profiles.wallet_tl, public.dkd_profiles.token, public.dkd_profiles.courier_score, public.dkd_profiles.courier_completed_jobs
  into dkd_wallet_after, dkd_token_after, dkd_courier_score_after, dkd_courier_completed_jobs_after;

  if dkd_cargo_shipment_id is not null then
    update public.dkd_cargo_shipments
    set status = 'completed',
        completed_at = coalesce(completed_at, now()),
        courier_eta_min = 0,
        updated_at = now()
    where id = dkd_cargo_shipment_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'job_id', dkd_param_job_id,
    'cargo_shipment_id', dkd_cargo_shipment_id,
    'reason', 'completed',
    'fee_tl', dkd_fee_tl,
    'wallet_tl', dkd_wallet_after,
    'token', dkd_token_after,
    'courier_score', dkd_courier_score_after,
    'courier_completed_jobs', dkd_courier_completed_jobs_after
  );
end;
$$;

grant execute on function public.dkd_courier_job_complete(bigint) to authenticated;

commit;
