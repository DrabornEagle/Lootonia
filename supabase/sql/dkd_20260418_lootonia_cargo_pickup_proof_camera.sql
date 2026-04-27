-- Lootonia / Kurye teslim alma fotoğrafı akışı
-- Uygulama: src/features/courier/CourierBoardModal.js

alter table if exists public.dkd_cargo_shipments
  add column if not exists pickup_proof_image_url text,
  add column if not exists pickup_proof_captured_at timestamptz;

drop function if exists public.dkd_courier_job_mark_picked_up(bigint);
drop function if exists public.dkd_courier_job_mark_picked_up(bigint, text);

create or replace function public.dkd_courier_job_mark_picked_up(
  dkd_param_job_id bigint default null,
  dkd_param_pickup_proof_image_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  dkd_user_id uuid := auth.uid();
  dkd_cargo_shipment_id bigint := null;
  dkd_pickup_proof_image_url text := nullif(trim(coalesce(dkd_param_pickup_proof_image_url, '')), '');
begin
  if dkd_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'auth_required');
  end if;

  update public.dkd_courier_jobs
  set pickup_status = 'picked_up',
      status = 'picked_up',
      picked_up_at = coalesce(picked_up_at, now()),
      updated_at = now()
  where public.dkd_courier_jobs.id = dkd_param_job_id
    and public.dkd_courier_jobs.assigned_user_id = dkd_user_id
  returning cargo_shipment_id into dkd_cargo_shipment_id;

  if dkd_cargo_shipment_id is null and not exists (
    select 1
    from public.dkd_courier_jobs
    where id = dkd_param_job_id
      and assigned_user_id = dkd_user_id
  ) then
    return jsonb_build_object('ok', false, 'reason', 'job_not_found');
  end if;

  if dkd_cargo_shipment_id is not null then
    update public.dkd_cargo_shipments
    set status = 'picked_up',
        picked_up_at = coalesce(picked_up_at, now()),
        pickup_proof_image_url = coalesce(dkd_pickup_proof_image_url, pickup_proof_image_url),
        pickup_proof_captured_at = case
          when dkd_pickup_proof_image_url is null then pickup_proof_captured_at
          else coalesce(pickup_proof_captured_at, now())
        end,
        updated_at = now()
    where id = dkd_cargo_shipment_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'job_id', dkd_param_job_id,
    'cargo_shipment_id', dkd_cargo_shipment_id,
    'pickup_proof_image_url', dkd_pickup_proof_image_url,
    'reason', 'picked_up',
    'message', 'Teslim aldım'
  );
end;
$$;

revoke all on function public.dkd_courier_job_mark_picked_up(bigint, text) from public;
grant execute on function public.dkd_courier_job_mark_picked_up(bigint, text) to authenticated;

create or replace function public.dkd_cargo_shipments_for_me()
returns table(
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
  pickup_proof_image_url text,
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
  courier_heading_deg integer,
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
    dkd_shipment_row.pickup_proof_image_url,
    dkd_shipment_row.package_weight_kg,
    dkd_shipment_row.status,
    dkd_shipment_row.created_at,
    dkd_shipment_row.accepted_at,
    dkd_shipment_row.picked_up_at,
    dkd_shipment_row.completed_at,
    dkd_shipment_row.courier_job_id,
    dkd_shipment_row.assigned_courier_user_id,
    coalesce(
      nullif(trim(coalesce(dkd_profile_row.nickname, '')), ''),
      case
        when dkd_shipment_row.assigned_courier_user_id is null then ''
        else concat('Kurye ', substr(dkd_shipment_row.assigned_courier_user_id::text, 1, 6))
      end
    ) as courier_display_name,
    coalesce(
      nullif(trim(coalesce(dkd_location_row.plate_no, '')), ''),
      nullif(trim(coalesce(dkd_shipment_row.assigned_courier_plate_no, '')), ''),
      nullif(trim(coalesce(dkd_profile_row.courier_profile_meta->>'plate_no', '')), ''),
      nullif(trim(coalesce(dkd_profile_row.courier_profile_meta->>'plateNo', '')), '')
    ) as courier_plate_no,
    coalesce(
      nullif(trim(coalesce(dkd_location_row.vehicle_type, '')), ''),
      nullif(trim(coalesce(dkd_shipment_row.assigned_courier_vehicle_type, '')), ''),
      nullif(trim(coalesce(dkd_profile_row.courier_vehicle_type, '')), '')
    ) as courier_vehicle_type,
    dkd_location_row.lat as courier_lat,
    dkd_location_row.lng as courier_lng,
    coalesce(dkd_location_row.eta_min, dkd_shipment_row.courier_eta_min) as courier_eta_min,
    dkd_location_row.heading_deg as courier_heading_deg,
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
