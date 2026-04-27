begin;

create index if not exists dkd_cargo_shipments_customer_status_created_idx
  on public.dkd_cargo_shipments(customer_user_id, status, created_at desc);

create index if not exists dkd_cargo_shipments_assigned_status_created_idx
  on public.dkd_cargo_shipments(assigned_courier_user_id, status, created_at desc);

create index if not exists dkd_courier_jobs_assigned_active_status_created_idx
  on public.dkd_courier_jobs(assigned_user_id, is_active, status, created_at desc);

create index if not exists dkd_courier_live_locations_courier_updated_idx
  on public.dkd_courier_live_locations(courier_user_id, updated_at desc);

create or replace function public.dkd_cargo_shipments_for_me()
returns table (
  id bigint,
  customer_user_id uuid,
  customer_first_name text,
  customer_last_name text,
  customer_full_name text,
  customer_national_id text,
  pickup_address_text text,
  delivery_address_text text,
  delivery_note text,
  dropoff_lat numeric,
  dropoff_lng numeric,
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
  dkd_live_status_visible_values constant text[] := array['accepted', 'picked_up', 'completed'];
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
    dkd_shipment_row.pickup_address_text,
    dkd_shipment_row.delivery_address_text,
    dkd_shipment_row.delivery_note,
    dkd_shipment_row.dropoff_lat,
    dkd_shipment_row.dropoff_lng,
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
    case
      when lower(coalesce(dkd_shipment_row.status, 'open')) = any(dkd_live_status_visible_values)
        then coalesce(
          nullif(trim(coalesce(dkd_profile_row.nickname, '')), ''),
          case
            when dkd_shipment_row.assigned_courier_user_id is null then ''
            else concat('Kurye ', substr(dkd_shipment_row.assigned_courier_user_id::text, 1, 6))
          end
        )
      else ''
    end as courier_display_name,
    case
      when lower(coalesce(dkd_shipment_row.status, 'open')) = any(dkd_live_status_visible_values)
        then coalesce(
          nullif(trim(coalesce(dkd_location_row.plate_no, '')), ''),
          nullif(trim(coalesce(dkd_shipment_row.assigned_courier_plate_no, '')), ''),
          nullif(trim(coalesce(dkd_profile_row.courier_profile_meta->>'plate_no', '')), ''),
          nullif(trim(coalesce(dkd_profile_row.courier_profile_meta->>'plateNo', '')), '')
        )
      else null
    end as courier_plate_no,
    case
      when lower(coalesce(dkd_shipment_row.status, 'open')) = any(dkd_live_status_visible_values)
        then coalesce(
          nullif(trim(coalesce(dkd_location_row.vehicle_type, '')), ''),
          nullif(trim(coalesce(dkd_shipment_row.assigned_courier_vehicle_type, '')), ''),
          nullif(trim(coalesce(dkd_profile_row.courier_vehicle_type, '')), '')
        )
      else null
    end as courier_vehicle_type,
    case
      when lower(coalesce(dkd_shipment_row.status, 'open')) = any(dkd_live_status_visible_values) then dkd_location_row.lat
      else null
    end as courier_lat,
    case
      when lower(coalesce(dkd_shipment_row.status, 'open')) = any(dkd_live_status_visible_values) then dkd_location_row.lng
      else null
    end as courier_lng,
    case
      when lower(coalesce(dkd_shipment_row.status, 'open')) = any(dkd_live_status_visible_values)
        then coalesce(dkd_location_row.eta_min, dkd_shipment_row.courier_eta_min)
      else null
    end as courier_eta_min,
    case
      when lower(coalesce(dkd_shipment_row.status, 'open')) = any(dkd_live_status_visible_values) then dkd_location_row.updated_at
      else null
    end as courier_location_updated_at
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

analyze public.dkd_cargo_shipments;
analyze public.dkd_courier_jobs;
analyze public.dkd_courier_live_locations;

commit;
