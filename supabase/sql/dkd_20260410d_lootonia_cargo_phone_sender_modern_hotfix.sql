begin;

alter table if exists public.dkd_cargo_shipments
  add column if not exists customer_phone_text text not null default '+90';

update public.dkd_cargo_shipments
set customer_phone_text = '+90'
where nullif(trim(coalesce(customer_phone_text, '')), '') is null;

drop function if exists public.dkd_cargo_shipment_create(text, text, text, text, text, text, text, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric);
drop function if exists public.dkd_cargo_shipment_create(text, text, text, text, text, text, text, text, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric);

create or replace function public.dkd_cargo_shipment_create(
  dkd_param_customer_first_name text default null,
  dkd_param_customer_last_name text default null,
  dkd_param_customer_national_id text default null,
  dkd_param_customer_phone_text text default null,
  dkd_param_pickup_address_text text default null,
  dkd_param_delivery_address_text text default null,
  dkd_param_delivery_note_text text default null,
  dkd_param_package_content_text text default null,
  dkd_param_package_image_url text default null,
  dkd_param_package_weight_kg numeric default 0,
  dkd_param_pickup_lat numeric default null,
  dkd_param_pickup_lng numeric default null,
  dkd_param_dropoff_lat numeric default null,
  dkd_param_dropoff_lng numeric default null,
  dkd_param_pickup_distance_km numeric default null,
  dkd_param_delivery_distance_km numeric default null,
  dkd_param_courier_fee_tl numeric default null,
  dkd_param_customer_charge_tl numeric default null
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
  dkd_customer_charge_tl numeric(12,2) := 0;
  dkd_wallet_before numeric(12,2) := 0;
  dkd_wallet_after numeric(12,2) := 0;
  dkd_eta_min integer := greatest(8, least(60, ceil(10 + (greatest(coalesce(dkd_param_package_weight_kg, 0.1), 0.1) * 4))::integer));
  dkd_shipment_id bigint;
  dkd_job_id bigint;
  dkd_first_name_value text := coalesce(nullif(trim(coalesce(dkd_param_customer_first_name, '')), ''), 'Gönderici');
  dkd_last_name_value text := coalesce(nullif(trim(coalesce(dkd_param_customer_last_name, '')), ''), 'Müşteri');
  dkd_full_name_value text;
  dkd_pickup_address_value text := trim(coalesce(dkd_param_pickup_address_text, ''));
  dkd_delivery_address_value text := trim(coalesce(dkd_param_delivery_address_text, ''));
  dkd_delivery_note_value text := nullif(trim(coalesce(dkd_param_delivery_note_text, '')), '');
  dkd_pickup_distance_km_value numeric(10,3) := greatest(coalesce(dkd_param_pickup_distance_km, 0), 0);
  dkd_delivery_distance_km_value numeric(10,3) := greatest(coalesce(dkd_param_delivery_distance_km, public.dkd_distance_km_between(dkd_param_pickup_lat, dkd_param_pickup_lng, dkd_param_dropoff_lat, dkd_param_dropoff_lng), 0), 0);
  dkd_fee_seed_text_value text := public.dkd_cargo_delivery_seed_text(dkd_pickup_address_value, dkd_delivery_address_value, null);
  dkd_customer_phone_digits_value text := regexp_replace(coalesce(dkd_param_customer_phone_text, ''), '\D', '', 'g');
  dkd_customer_phone_local_digits_value text := '';
  dkd_customer_phone_value text := '+90';
begin
  if dkd_user_id is null then
    raise exception 'auth_required';
  end if;

  if length(regexp_replace(coalesce(dkd_param_customer_national_id, ''), '\D', '', 'g')) <> 11 then
    raise exception 'national_id_required';
  end if;

  if coalesce(length(dkd_pickup_address_value), 0) < 10 then
    raise exception 'pickup_address_required';
  end if;

  if coalesce(length(dkd_delivery_address_value), 0) < 10 then
    raise exception 'delivery_address_required';
  end if;

  if coalesce(length(trim(coalesce(dkd_param_package_content_text, ''))), 0) < 2 then
    raise exception 'package_content_required';
  end if;

  if dkd_param_pickup_lat is null or dkd_param_pickup_lng is null then
    raise exception 'pickup_coordinates_required';
  end if;

  if dkd_param_dropoff_lat is null or dkd_param_dropoff_lng is null then
    raise exception 'dropoff_coordinates_required';
  end if;

  dkd_customer_phone_local_digits_value := case
    when dkd_customer_phone_digits_value like '90%' then substr(dkd_customer_phone_digits_value, 3)
    else regexp_replace(dkd_customer_phone_digits_value, '^0+', '')
  end;
  dkd_customer_phone_local_digits_value := substr(coalesce(dkd_customer_phone_local_digits_value, ''), 1, 10);

  if char_length(dkd_customer_phone_local_digits_value) = 10 and left(dkd_customer_phone_local_digits_value, 1) = '5' then
    dkd_customer_phone_value := '+90' || dkd_customer_phone_local_digits_value;
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_user_id)
  on conflict (user_id) do nothing;

  select coalesce(public.dkd_profiles.wallet_tl, 0)
  into dkd_wallet_before
  from public.dkd_profiles
  where public.dkd_profiles.user_id = dkd_user_id
  for update;

  if dkd_wallet_before is null then
    raise exception 'profile_missing';
  end if;

  dkd_fee_tl := greatest(
    coalesce(dkd_param_courier_fee_tl, 0),
    public.dkd_cargo_total_fee_from_distance_km(
      dkd_pickup_distance_km_value,
      dkd_delivery_distance_km_value,
      dkd_fee_seed_text_value
    )
  );
  dkd_customer_charge_tl := greatest(
    coalesce(dkd_param_customer_charge_tl, 0),
    public.dkd_cargo_customer_charge_from_courier_fee(dkd_fee_tl)
  );

  if dkd_wallet_before < dkd_customer_charge_tl then
    raise exception 'wallet_insufficient';
  end if;

  update public.dkd_profiles
  set wallet_tl = coalesce(public.dkd_profiles.wallet_tl, 0) - dkd_customer_charge_tl,
      updated_at = now()
  where public.dkd_profiles.user_id = dkd_user_id
  returning public.dkd_profiles.wallet_tl into dkd_wallet_after;

  dkd_full_name_value := trim(concat(dkd_first_name_value, ' ', dkd_last_name_value));

  insert into public.dkd_cargo_shipments (
    customer_user_id,
    customer_first_name,
    customer_last_name,
    customer_national_id,
    customer_phone_text,
    pickup_address_text,
    delivery_address_text,
    delivery_note,
    package_content_text,
    package_image_url,
    package_weight_kg,
    status,
    pickup_lat,
    pickup_lng,
    dropoff_lat,
    dropoff_lng,
    courier_fee_tl,
    customer_charge_tl,
    payment_status,
    paid_at
  ) values (
    dkd_user_id,
    dkd_first_name_value,
    dkd_last_name_value,
    regexp_replace(coalesce(dkd_param_customer_national_id, ''), '\D', '', 'g'),
    dkd_customer_phone_value,
    dkd_pickup_address_value,
    dkd_delivery_address_value,
    dkd_delivery_note_value,
    trim(coalesce(dkd_param_package_content_text, '')),
    nullif(trim(coalesce(dkd_param_package_image_url, '')), ''),
    dkd_weight_kg,
    'open',
    dkd_param_pickup_lat,
    dkd_param_pickup_lng,
    dkd_param_dropoff_lat,
    dkd_param_dropoff_lng,
    dkd_fee_tl,
    dkd_customer_charge_tl,
    'paid',
    now()
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
    dropoff_lat,
    dropoff_lng,
    fee_tl,
    customer_charge_tl,
    cargo_shipment_id,
    cargo_meta
  ) values (
    concat('Kargo • ', dkd_full_name_value),
    dkd_pickup_address_value,
    dkd_delivery_address_value,
    dkd_reward_score,
    dkd_pickup_distance_km_value,
    dkd_eta_min,
    'cargo',
    true,
    'open',
    'pending',
    'Kurye-Kargo Operasyon Merkezi',
    trim(coalesce(dkd_param_package_content_text, '')),
    coalesce(dkd_delivery_note_value, concat('Gönderici • ', dkd_full_name_value)),
    dkd_delivery_address_value,
    dkd_user_id,
    dkd_param_pickup_lat,
    dkd_param_pickup_lng,
    dkd_param_dropoff_lat,
    dkd_param_dropoff_lng,
    dkd_fee_tl,
    dkd_customer_charge_tl,
    dkd_shipment_id,
    jsonb_build_object(
      'customer_first_name', dkd_first_name_value,
      'customer_last_name', dkd_last_name_value,
      'customer_phone_text', dkd_customer_phone_value,
      'package_weight_kg', dkd_weight_kg,
      'package_image_url', nullif(trim(coalesce(dkd_param_package_image_url, '')), ''),
      'delivery_note', dkd_delivery_note_value,
      'cargo_pickup_distance_km', dkd_pickup_distance_km_value,
      'cargo_delivery_distance_km', dkd_delivery_distance_km_value,
      'cargo_customer_charge_tl', dkd_customer_charge_tl,
      'cargo_courier_fee_tl', dkd_fee_tl,
      'cargo_platform_fee_tl', 0,
      'cargo_fee_seed_text', dkd_fee_seed_text_value
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
    'fee_tl', dkd_fee_tl,
    'customer_charge_tl', dkd_customer_charge_tl,
    'wallet_tl', dkd_wallet_after,
    'payment_status', 'paid'
  );
end;
$$;

revoke all on function public.dkd_cargo_shipment_create(text, text, text, text, text, text, text, text, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric) from public;
grant execute on function public.dkd_cargo_shipment_create(text, text, text, text, text, text, text, text, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric) to authenticated;

drop function if exists public.dkd_cargo_shipments_for_me();

create function public.dkd_cargo_shipments_for_me()
returns table (
  id bigint,
  customer_user_id uuid,
  customer_first_name text,
  customer_last_name text,
  customer_full_name text,
  customer_national_id text,
  customer_phone_text text,
  pickup_address_text text,
  delivery_address_text text,
  delivery_note text,
  pickup_lat numeric,
  pickup_lng numeric,
  dropoff_lat numeric,
  dropoff_lng numeric,
  courier_fee_tl numeric,
  customer_charge_tl numeric,
  payment_status text,
  paid_at timestamptz,
  package_content_text text,
  package_image_url text,
  package_weight_kg numeric,
  status text,
  created_at timestamptz,
  accepted_at timestamptz,
  picked_up_at timestamptz,
  completed_at timestamptz,
  courier_job_id bigint,
  assigned_courier_user_id uuid,
  courier_display_name text,
  courier_plate_no text,
  courier_vehicle_type text,
  courier_lat numeric,
  courier_lng numeric,
  courier_eta_min integer,
  courier_location_updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  dkd_user_id uuid := auth.uid();
begin
  if dkd_user_id is null then
    raise exception 'auth_required';
  end if;

  return query
  select
    dkd_shipment_row.id,
    dkd_shipment_row.customer_user_id,
    dkd_shipment_row.customer_first_name,
    dkd_shipment_row.customer_last_name,
    trim(concat(dkd_shipment_row.customer_first_name, ' ', dkd_shipment_row.customer_last_name)) as customer_full_name,
    dkd_shipment_row.customer_national_id,
    dkd_shipment_row.customer_phone_text,
    dkd_shipment_row.pickup_address_text,
    dkd_shipment_row.delivery_address_text,
    dkd_shipment_row.delivery_note,
    dkd_shipment_row.pickup_lat,
    dkd_shipment_row.pickup_lng,
    dkd_shipment_row.dropoff_lat,
    dkd_shipment_row.dropoff_lng,
    dkd_shipment_row.courier_fee_tl,
    dkd_shipment_row.customer_charge_tl,
    dkd_shipment_row.payment_status,
    dkd_shipment_row.paid_at,
    dkd_shipment_row.package_content_text,
    dkd_shipment_row.package_image_url,
    dkd_shipment_row.package_weight_kg,
    dkd_shipment_row.status,
    dkd_shipment_row.created_at,
    dkd_shipment_row.accepted_at,
    dkd_shipment_row.picked_up_at,
    dkd_shipment_row.completed_at,
    dkd_shipment_row.courier_job_id,
    dkd_shipment_row.assigned_courier_user_id,
    coalesce(nullif(trim(coalesce(dkd_profile_row.nickname, '')), ''), case when dkd_shipment_row.assigned_courier_user_id is null then '' else concat('Kurye ', substr(dkd_shipment_row.assigned_courier_user_id::text, 1, 6)) end) as courier_display_name,
    coalesce(nullif(trim(coalesce(dkd_location_row.plate_no, '')), ''), nullif(trim(coalesce(dkd_shipment_row.assigned_courier_plate_no, '')), ''), nullif(trim(coalesce(dkd_profile_row.courier_profile_meta->>'plate_no', '')), ''), nullif(trim(coalesce(dkd_profile_row.courier_profile_meta->>'plateNo', '')), '')) as courier_plate_no,
    coalesce(nullif(trim(coalesce(dkd_location_row.vehicle_type, '')), ''), nullif(trim(coalesce(dkd_shipment_row.assigned_courier_vehicle_type, '')), ''), nullif(trim(coalesce(dkd_profile_row.courier_vehicle_type, '')), '')) as courier_vehicle_type,
    dkd_location_row.lat as courier_lat,
    dkd_location_row.lng as courier_lng,
    coalesce(dkd_location_row.eta_min, dkd_shipment_row.courier_eta_min) as courier_eta_min,
    dkd_location_row.updated_at as courier_location_updated_at
  from public.dkd_cargo_shipments dkd_shipment_row
  left join public.dkd_profiles dkd_profile_row
    on dkd_profile_row.user_id = dkd_shipment_row.assigned_courier_user_id
  left join public.dkd_courier_live_locations dkd_location_row
    on dkd_location_row.courier_user_id = dkd_shipment_row.assigned_courier_user_id
  where dkd_shipment_row.customer_user_id = dkd_user_id
  order by dkd_shipment_row.created_at desc;
end;
$$;

revoke all on function public.dkd_cargo_shipments_for_me() from public;
grant execute on function public.dkd_cargo_shipments_for_me() to authenticated;

commit;
