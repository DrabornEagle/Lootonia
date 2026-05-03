-- dkd_20260430_courier_reassign_admin_delete_order_details.sql
-- Kurye reddederse: reddeden kurye kara listeye alınır, sipariş en yakın uygun başka kuryeye aktarılır.
-- Admin silerse: ilişkili kurye işi / kargo gönderisi / işletme siparişi / acil kurye kayıtları tüm kullanıcılardan kaldırılır.

begin;

alter table if exists public.dkd_courier_jobs
  add column if not exists cargo_meta jsonb not null default '{}'::jsonb;

alter table if exists public.dkd_courier_jobs
  add column if not exists customer_charge_tl numeric(12,2) not null default 0;

alter table if exists public.dkd_courier_jobs
  add column if not exists fee_tl numeric(12,2) not null default 0;

alter table if exists public.dkd_courier_jobs
  add column if not exists dkd_auto_assigned_at timestamptz;

alter table if exists public.dkd_courier_jobs
  add column if not exists dkd_assignment_expires_at timestamptz;

alter table if exists public.dkd_courier_jobs
  add column if not exists dkd_country text;

alter table if exists public.dkd_courier_jobs
  add column if not exists dkd_city text;

alter table if exists public.dkd_courier_jobs
  add column if not exists dkd_region text;

alter table if exists public.dkd_profiles
  add column if not exists dkd_courier_auto_assigned_job_id bigint;

alter table if exists public.dkd_profiles
  add column if not exists dkd_courier_online boolean not null default false;

alter table if exists public.dkd_profiles
  add column if not exists dkd_courier_online_lat numeric;

alter table if exists public.dkd_profiles
  add column if not exists dkd_courier_online_lng numeric;

alter table if exists public.dkd_profiles
  add column if not exists dkd_courier_online_country text;

alter table if exists public.dkd_profiles
  add column if not exists dkd_courier_online_city text;

alter table if exists public.dkd_profiles
  add column if not exists dkd_courier_online_region text;

alter table if exists public.dkd_profiles
  add column if not exists dkd_country text;

alter table if exists public.dkd_profiles
  add column if not exists dkd_city text;

alter table if exists public.dkd_profiles
  add column if not exists dkd_region text;

alter table if exists public.dkd_profiles
  add column if not exists courier_city text;

alter table if exists public.dkd_profiles
  add column if not exists courier_zone text;

alter table if exists public.dkd_profiles
  add column if not exists dkd_courier_last_online_at timestamptz;

create or replace function public.dkd_jsonb_array_has_text_dkd(
  dkd_param_array jsonb,
  dkd_param_value text
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from jsonb_array_elements_text(coalesce(dkd_param_array, '[]'::jsonb)) as dkd_array_row(dkd_array_text_value)
    where dkd_array_row.dkd_array_text_value = dkd_param_value
  );
$$;

create index if not exists dkd_courier_jobs_rejected_couriers_gin_idx
  on public.dkd_courier_jobs using gin ((coalesce(cargo_meta, '{}'::jsonb) -> 'dkd_rejected_courier_user_ids'));

create index if not exists dkd_courier_jobs_assignment_status_idx
  on public.dkd_courier_jobs (assigned_user_id, status, updated_at desc, created_at desc);

create index if not exists dkd_profiles_online_region_assignment_idx
  on public.dkd_profiles (dkd_courier_online, courier_status, dkd_courier_online_country, dkd_courier_online_city, dkd_courier_online_region, dkd_courier_auto_assigned_job_id);

do $$
begin
  if to_regclass('public.dkd_courier_jobs') is not null then
    execute 'alter table public.dkd_courier_jobs replica identity full';
  end if;
  if to_regclass('public.dkd_cargo_shipments') is not null then
    execute 'alter table public.dkd_cargo_shipments replica identity full';
  end if;
  if to_regclass('public.dkd_business_product_orders') is not null then
    execute 'alter table public.dkd_business_product_orders replica identity full';
  end if;
  if to_regclass('public.dkd_business_order_status_history') is not null then
    execute 'alter table public.dkd_business_order_status_history replica identity full';
  end if;
exception when others then
  null;
end $$;

do $$
declare
  dkd_table_name_value text;
begin
  foreach dkd_table_name_value in array array[
    'dkd_courier_jobs',
    'dkd_cargo_shipments',
    'dkd_business_product_orders',
    'dkd_business_order_status_history'
  ] loop
    if to_regclass('public.' || dkd_table_name_value) is not null then
      begin
        execute format('alter publication supabase_realtime add table public.%I', dkd_table_name_value);
      exception when duplicate_object then
        null;
      exception when undefined_object then
        null;
      exception when insufficient_privilege then
        null;
      end;
    end if;
  end loop;
end $$;

drop function if exists public.dkd_courier_jobs_for_me();
create function public.dkd_courier_jobs_for_me()
returns setof public.dkd_courier_jobs
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  dkd_user_id_value uuid := auth.uid();
  dkd_country_value text := 'Türkiye';
  dkd_city_value text := 'Ankara';
  dkd_region_value text := '';
begin
  if dkd_user_id_value is null then
    return;
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_user_id_value)
  on conflict (user_id) do nothing;

  select
    coalesce(nullif(trim(dkd_courier_online_country), ''), nullif(trim(dkd_country), ''), 'Türkiye'),
    coalesce(nullif(trim(dkd_courier_online_city), ''), nullif(trim(dkd_city), ''), nullif(trim(courier_city), ''), 'Ankara'),
    coalesce(nullif(trim(dkd_courier_online_region), ''), nullif(trim(dkd_region), ''), nullif(trim(courier_zone), ''), '')
  into dkd_country_value, dkd_city_value, dkd_region_value
  from public.dkd_profiles
  where user_id = dkd_user_id_value;

  return query
  select dkd_job_row.*
  from public.dkd_courier_jobs dkd_job_row
  where
    (
      dkd_job_row.assigned_user_id = dkd_user_id_value
      and coalesce(dkd_job_row.is_active, true) = true
      and lower(coalesce(dkd_job_row.status, '')) not in ('deleted', 'admin_deleted', 'cancelled_by_admin')
    )
    or (
      dkd_job_row.assigned_user_id is null
      and coalesce(dkd_job_row.is_active, true) = true
      and coalesce(dkd_job_row.status, 'open') in ('open', 'ready', 'published')
      and public.dkd_region_match_dkd(dkd_job_row.dkd_country, dkd_job_row.dkd_city, dkd_job_row.dkd_region, dkd_country_value, dkd_city_value, dkd_region_value)
      and not public.dkd_jsonb_array_has_text_dkd(coalesce(dkd_job_row.cargo_meta, '{}'::jsonb)->'dkd_rejected_courier_user_ids', dkd_user_id_value::text)
    )
  order by
    case
      when dkd_job_row.assigned_user_id = dkd_user_id_value and coalesce(dkd_job_row.status, '') in ('dkd_auto_assigned', 'dkd_assigned_offer') then 0
      when dkd_job_row.assigned_user_id = dkd_user_id_value then 1
      else 2
    end,
    dkd_job_row.updated_at desc nulls last,
    dkd_job_row.created_at desc;
end;
$$;

drop function if exists public.dkd_courier_job_reject_dkd(bigint);
create function public.dkd_courier_job_reject_dkd(dkd_param_job_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  dkd_user_id_value uuid := auth.uid();
  dkd_job_country_value text := null;
  dkd_job_city_value text := null;
  dkd_job_region_value text := null;
  dkd_pickup_lat_value numeric := null;
  dkd_pickup_lng_value numeric := null;
  dkd_rejected_user_ids_value jsonb := '[]'::jsonb;
  dkd_next_courier_user_id_value uuid := null;
begin
  if dkd_user_id_value is null then
    return jsonb_build_object('ok', false, 'reason', 'auth_required');
  end if;

  select dkd_country, dkd_city, dkd_region, pickup_lat, pickup_lng
  into dkd_job_country_value, dkd_job_city_value, dkd_job_region_value, dkd_pickup_lat_value, dkd_pickup_lng_value
  from public.dkd_courier_jobs
  where id = dkd_param_job_id
    and assigned_user_id = dkd_user_id_value
    and coalesce(status, '') in ('dkd_auto_assigned', 'dkd_assigned_offer', 'courier_offer', 'auto_assigned', 'assigned_offer')
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'job_not_assigned_to_you');
  end if;

  update public.dkd_courier_jobs dkd_job_row
  set assigned_user_id = null,
      status = 'open',
      dkd_auto_assigned_at = null,
      dkd_assignment_expires_at = null,
      cargo_meta = jsonb_set(
        coalesce(dkd_job_row.cargo_meta, '{}'::jsonb),
        '{dkd_rejected_courier_user_ids}',
        coalesce((
          select jsonb_agg(to_jsonb(dkd_rejected_user_id_value))
          from (
            select distinct dkd_rejected_user_id_value
            from (
              select dkd_alias_rejected_value as dkd_rejected_user_id_value
              from jsonb_array_elements_text(coalesce(dkd_job_row.cargo_meta->'dkd_rejected_courier_user_ids', '[]'::jsonb)) as dkd_alias_rejected_row(dkd_alias_rejected_value)
              union all
              select dkd_user_id_value::text
            ) dkd_distinct_source
          ) dkd_distinct_rows
        ), '[]'::jsonb),
        true
      ) || jsonb_build_object('dkd_last_rejected_by', dkd_user_id_value::text, 'dkd_last_rejected_at', now()),
      updated_at = now()
  where dkd_job_row.id = dkd_param_job_id
  returning coalesce(cargo_meta->'dkd_rejected_courier_user_ids', '[]'::jsonb)
  into dkd_rejected_user_ids_value;

  update public.dkd_profiles
  set dkd_courier_auto_assigned_job_id = null
  where user_id = dkd_user_id_value;

  select dkd_profile_row.user_id
  into dkd_next_courier_user_id_value
  from public.dkd_profiles dkd_profile_row
  where dkd_profile_row.user_id <> dkd_user_id_value
    and coalesce(dkd_profile_row.courier_status, '') = 'approved'
    and coalesce(dkd_profile_row.dkd_courier_online, false) = true
    and dkd_profile_row.dkd_courier_auto_assigned_job_id is null
    and not public.dkd_jsonb_array_has_text_dkd(dkd_rejected_user_ids_value, dkd_profile_row.user_id::text)
    and not exists (
      select 1
      from public.dkd_courier_jobs dkd_busy_job_row
      where dkd_busy_job_row.assigned_user_id = dkd_profile_row.user_id
        and coalesce(dkd_busy_job_row.is_active, true) = true
        and lower(coalesce(dkd_busy_job_row.status, '')) in (
          'dkd_auto_assigned', 'dkd_assigned_offer', 'courier_offer', 'auto_assigned', 'assigned_offer',
          'accepted', 'assigned', 'to_business', 'picked_up', 'to_customer', 'delivering'
        )
    )
    and public.dkd_region_match_dkd(
      dkd_job_country_value,
      dkd_job_city_value,
      dkd_job_region_value,
      dkd_profile_row.dkd_courier_online_country,
      dkd_profile_row.dkd_courier_online_city,
      dkd_profile_row.dkd_courier_online_region
    )
  order by
    case
      when dkd_pickup_lat_value is not null and dkd_pickup_lng_value is not null and dkd_profile_row.dkd_courier_online_lat is not null and dkd_profile_row.dkd_courier_online_lng is not null
      then public.dkd_distance_km_between(dkd_profile_row.dkd_courier_online_lat, dkd_profile_row.dkd_courier_online_lng, dkd_pickup_lat_value, dkd_pickup_lng_value)
      else null
    end asc nulls last,
    dkd_profile_row.dkd_courier_last_online_at desc nulls last
  limit 1;

  if dkd_next_courier_user_id_value is not null then
    update public.dkd_courier_jobs dkd_job_row
    set assigned_user_id = dkd_next_courier_user_id_value,
        status = 'dkd_assigned_offer',
        dkd_auto_assigned_at = now(),
        dkd_assignment_expires_at = now() + interval '4 minutes',
        cargo_meta = coalesce(dkd_job_row.cargo_meta, '{}'::jsonb)
          || jsonb_build_object(
            'dkd_reassigned_after_reject_by', dkd_user_id_value::text,
            'dkd_reassigned_to', dkd_next_courier_user_id_value::text,
            'dkd_reassigned_at', now()
          ),
        updated_at = now()
    where dkd_job_row.id = dkd_param_job_id;

    update public.dkd_profiles
    set dkd_courier_auto_assigned_job_id = dkd_param_job_id
    where user_id = dkd_next_courier_user_id_value;
  end if;

  return jsonb_build_object(
    'ok', true,
    'dkd_rejected_job_id', dkd_param_job_id,
    'dkd_hidden_from_rejected_courier', true,
    'dkd_reassigned_courier_user_id', dkd_next_courier_user_id_value
  );
end;
$$;

drop function if exists public.dkd_admin_courier_job_delete(bigint);
create function public.dkd_admin_courier_job_delete(dkd_param_job_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  dkd_job_json_value jsonb := '{}'::jsonb;
  dkd_cargo_meta_value jsonb := '{}'::jsonb;
  dkd_order_id_text_value text := '';
  dkd_cargo_shipment_id_text_value text := '';
  dkd_urgent_order_id_text_value text := '';
  dkd_deleted_jobs_count_value integer := 0;
  dkd_deleted_cargo_count_value integer := 0;
  dkd_deleted_business_orders_count_value integer := 0;
  dkd_deleted_business_history_count_value integer := 0;
  dkd_deleted_urgent_orders_count_value integer := 0;
  dkd_deleted_urgent_items_count_value integer := 0;
  dkd_deleted_urgent_messages_count_value integer := 0;
begin
  if not public.dkd_is_admin() then
    raise exception 'admin_required';
  end if;

  select to_jsonb(dkd_job_row)
  into dkd_job_json_value
  from public.dkd_courier_jobs dkd_job_row
  where dkd_job_row.id = dkd_param_job_id
  for update;

  if dkd_job_json_value is null then
    raise exception 'job_not_found';
  end if;

  dkd_cargo_meta_value := coalesce(dkd_job_json_value->'cargo_meta', '{}'::jsonb);
  dkd_order_id_text_value := coalesce(nullif(dkd_job_json_value->>'order_id', ''), nullif(dkd_cargo_meta_value->>'dkd_order_id', ''), '');
  dkd_cargo_shipment_id_text_value := coalesce(nullif(dkd_job_json_value->>'cargo_shipment_id', ''), nullif(dkd_cargo_meta_value->>'dkd_cargo_shipment_id', ''), '');
  dkd_urgent_order_id_text_value := coalesce(
    nullif(dkd_cargo_meta_value->>'dkd_urgent_order_id', ''),
    nullif(dkd_cargo_meta_value->'dkd_original_order'->>'dkd_order_id', ''),
    nullif(dkd_job_json_value->>'dkd_urgent_order_id', ''),
    ''
  );

  update public.dkd_profiles
  set dkd_courier_auto_assigned_job_id = null
  where dkd_courier_auto_assigned_job_id = dkd_param_job_id;

  delete from public.dkd_courier_jobs dkd_job_row
  where dkd_job_row.id = dkd_param_job_id
     or (dkd_order_id_text_value <> '' and coalesce(to_jsonb(dkd_job_row)->>'order_id', '') = dkd_order_id_text_value)
     or (dkd_cargo_shipment_id_text_value <> '' and coalesce(to_jsonb(dkd_job_row)->>'cargo_shipment_id', '') = dkd_cargo_shipment_id_text_value)
     or (dkd_urgent_order_id_text_value <> '' and (
       coalesce(to_jsonb(dkd_job_row)->'cargo_meta'->>'dkd_urgent_order_id', '') = dkd_urgent_order_id_text_value
       or coalesce(to_jsonb(dkd_job_row)->'cargo_meta'->'dkd_original_order'->>'dkd_order_id', '') = dkd_urgent_order_id_text_value
     ));
  get diagnostics dkd_deleted_jobs_count_value = row_count;

  if to_regclass('public.dkd_business_order_status_history') is not null and dkd_order_id_text_value <> '' then
    execute 'delete from public.dkd_business_order_status_history dkd_history_row where dkd_history_row.order_id::text = $1'
      using dkd_order_id_text_value;
    get diagnostics dkd_deleted_business_history_count_value = row_count;
  end if;

  if to_regclass('public.dkd_business_product_orders') is not null and dkd_order_id_text_value <> '' then
    execute 'delete from public.dkd_business_product_orders dkd_order_row where dkd_order_row.id::text = $1'
      using dkd_order_id_text_value;
    get diagnostics dkd_deleted_business_orders_count_value = row_count;
  end if;

  if to_regclass('public.dkd_cargo_shipments') is not null and dkd_cargo_shipment_id_text_value <> '' then
    execute 'delete from public.dkd_cargo_shipments dkd_shipment_row where dkd_shipment_row.id::text = $1'
      using dkd_cargo_shipment_id_text_value;
    get diagnostics dkd_deleted_cargo_count_value = row_count;
  end if;

  if to_regclass('public.dkd_urgent_courier_messages') is not null and dkd_urgent_order_id_text_value <> '' then
    execute 'delete from public.dkd_urgent_courier_messages dkd_message_row where dkd_message_row.dkd_order_id::text = $1'
      using dkd_urgent_order_id_text_value;
    get diagnostics dkd_deleted_urgent_messages_count_value = row_count;
  end if;

  if to_regclass('public.dkd_urgent_courier_order_items') is not null and dkd_urgent_order_id_text_value <> '' then
    execute 'delete from public.dkd_urgent_courier_order_items dkd_item_row where dkd_item_row.dkd_order_id::text = $1'
      using dkd_urgent_order_id_text_value;
    get diagnostics dkd_deleted_urgent_items_count_value = row_count;
  end if;

  if to_regclass('public.dkd_urgent_courier_orders') is not null and dkd_urgent_order_id_text_value <> '' then
    execute 'delete from public.dkd_urgent_courier_orders dkd_order_row where dkd_order_row.dkd_order_id::text = $1'
      using dkd_urgent_order_id_text_value;
    get diagnostics dkd_deleted_urgent_orders_count_value = row_count;
  end if;

  return jsonb_build_object(
    'dkd_ok', true,
    'dkd_deleted_job_id', dkd_param_job_id,
    'dkd_deleted_jobs_count', dkd_deleted_jobs_count_value,
    'dkd_deleted_cargo_count', dkd_deleted_cargo_count_value,
    'dkd_deleted_business_orders_count', dkd_deleted_business_orders_count_value,
    'dkd_deleted_business_history_count', dkd_deleted_business_history_count_value,
    'dkd_deleted_urgent_orders_count', dkd_deleted_urgent_orders_count_value,
    'dkd_deleted_urgent_items_count', dkd_deleted_urgent_items_count_value,
    'dkd_deleted_urgent_messages_count', dkd_deleted_urgent_messages_count_value
  );
end;
$$;

revoke all on function public.dkd_courier_job_reject_dkd(bigint) from public;
revoke all on function public.dkd_admin_courier_job_delete(bigint) from public;
revoke all on function public.dkd_courier_jobs_for_me() from public;

grant execute on function public.dkd_courier_job_reject_dkd(bigint) to authenticated, service_role;
grant execute on function public.dkd_admin_courier_job_delete(bigint) to authenticated, service_role;
grant execute on function public.dkd_courier_jobs_for_me() to authenticated, service_role;

commit;
