begin;

-- DKD Mapbox Acil Kurye canlı takip katmanı
-- Müşteri teslimat koordinatı + kurye canlı ping + güvenli canlı takip RPC akışı.

create extension if not exists pgcrypto;

alter table public.dkd_urgent_courier_orders
  add column if not exists dkd_customer_lat numeric,
  add column if not exists dkd_customer_lng numeric;

create table if not exists public.dkd_urgent_courier_live_locations (
  dkd_order_id uuid primary key references public.dkd_urgent_courier_orders(dkd_order_id) on delete cascade,
  dkd_courier_user_id uuid not null references auth.users(id) on delete cascade,
  dkd_live_lat numeric not null,
  dkd_live_lng numeric not null,
  dkd_heading_deg numeric,
  dkd_eta_min integer,
  dkd_created_at timestamptz not null default now(),
  dkd_updated_at timestamptz not null default now()
);

create index if not exists dkd_urgent_courier_live_locations_courier_idx
  on public.dkd_urgent_courier_live_locations(dkd_courier_user_id, dkd_updated_at desc);

create index if not exists dkd_urgent_courier_orders_customer_location_idx
  on public.dkd_urgent_courier_orders(dkd_customer_lat, dkd_customer_lng)
  where dkd_customer_lat is not null and dkd_customer_lng is not null;

alter table public.dkd_urgent_courier_live_locations enable row level security;

drop policy if exists dkd_urgent_courier_live_locations_select_dkd on public.dkd_urgent_courier_live_locations;
create policy dkd_urgent_courier_live_locations_select_dkd
on public.dkd_urgent_courier_live_locations
for select
to authenticated
using (
  public.dkd_is_admin()
  or exists (
    select 1
    from public.dkd_urgent_courier_orders dkd_order_scope
    where dkd_order_scope.dkd_order_id = dkd_urgent_courier_live_locations.dkd_order_id
      and (
        dkd_order_scope.dkd_customer_user_id = auth.uid()
        or dkd_order_scope.dkd_courier_user_id = auth.uid()
      )
  )
);

drop policy if exists dkd_urgent_courier_live_locations_insert_dkd on public.dkd_urgent_courier_live_locations;
create policy dkd_urgent_courier_live_locations_insert_dkd
on public.dkd_urgent_courier_live_locations
for insert
to authenticated
with check (
  public.dkd_is_admin()
  or (
    dkd_courier_user_id = auth.uid()
    and exists (
      select 1
      from public.dkd_urgent_courier_orders dkd_order_scope
      where dkd_order_scope.dkd_order_id = dkd_urgent_courier_live_locations.dkd_order_id
        and dkd_order_scope.dkd_courier_user_id = auth.uid()
        and dkd_order_scope.dkd_status_key not in ('dkd_completed', 'dkd_cancelled')
    )
  )
);

drop policy if exists dkd_urgent_courier_live_locations_update_dkd on public.dkd_urgent_courier_live_locations;
create policy dkd_urgent_courier_live_locations_update_dkd
on public.dkd_urgent_courier_live_locations
for update
to authenticated
using (
  public.dkd_is_admin()
  or (
    dkd_courier_user_id = auth.uid()
    and exists (
      select 1
      from public.dkd_urgent_courier_orders dkd_order_scope
      where dkd_order_scope.dkd_order_id = dkd_urgent_courier_live_locations.dkd_order_id
        and dkd_order_scope.dkd_courier_user_id = auth.uid()
        and dkd_order_scope.dkd_status_key not in ('dkd_completed', 'dkd_cancelled')
    )
  )
)
with check (
  public.dkd_is_admin()
  or (
    dkd_courier_user_id = auth.uid()
    and exists (
      select 1
      from public.dkd_urgent_courier_orders dkd_order_scope
      where dkd_order_scope.dkd_order_id = dkd_urgent_courier_live_locations.dkd_order_id
        and dkd_order_scope.dkd_courier_user_id = auth.uid()
        and dkd_order_scope.dkd_status_key not in ('dkd_completed', 'dkd_cancelled')
    )
  )
);

grant select, insert, update on public.dkd_urgent_courier_live_locations to authenticated;
grant all on public.dkd_urgent_courier_live_locations to service_role;

drop function if exists public.dkd_urgent_courier_create_order_dkd(text, text, text, text, jsonb);
drop function if exists public.dkd_urgent_courier_create_order_dkd(text, text, text, text, jsonb, numeric, numeric);

create or replace function public.dkd_urgent_courier_create_order_dkd(
  dkd_param_customer_full_name text default null,
  dkd_param_customer_phone_text text default null,
  dkd_param_customer_address_text text default null,
  dkd_param_customer_note_text text default null,
  dkd_param_items jsonb default '[]'::jsonb,
  dkd_param_customer_lat numeric default null,
  dkd_param_customer_lng numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $dkd_create_order$
declare
  dkd_user_id_value uuid := auth.uid();
  dkd_order_id_value uuid;
  dkd_item_count_value integer := 0;
  dkd_customer_name_value text := coalesce(nullif(trim(coalesce(dkd_param_customer_full_name, '')), ''), 'Lootonia Müşterisi');
  dkd_customer_phone_value text := trim(coalesce(dkd_param_customer_phone_text, ''));
  dkd_customer_address_value text := trim(coalesce(dkd_param_customer_address_text, ''));
  dkd_customer_lat_value numeric := case when abs(coalesce(dkd_param_customer_lat, 999)) <= 90 then round(dkd_param_customer_lat, 7) else null end;
  dkd_customer_lng_value numeric := case when abs(coalesce(dkd_param_customer_lng, 999)) <= 180 then round(dkd_param_customer_lng, 7) else null end;
begin
  if dkd_user_id_value is null then
    raise exception 'auth_required';
  end if;
  if length(dkd_customer_address_value) < 8 then
    raise exception 'delivery_address_required';
  end if;
  if jsonb_typeof(coalesce(dkd_param_items, '[]'::jsonb)) <> 'array' then
    raise exception 'items_required';
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_user_id_value)
  on conflict (user_id) do nothing;

  insert into public.dkd_urgent_courier_orders (
    dkd_customer_user_id,
    dkd_customer_full_name,
    dkd_customer_phone_text,
    dkd_customer_address_text,
    dkd_customer_note_text,
    dkd_customer_lat,
    dkd_customer_lng,
    dkd_status_key
  ) values (
    dkd_user_id_value,
    dkd_customer_name_value,
    dkd_customer_phone_value,
    dkd_customer_address_value,
    trim(coalesce(dkd_param_customer_note_text, '')),
    dkd_customer_lat_value,
    dkd_customer_lng_value,
    'dkd_open'
  ) returning dkd_order_id into dkd_order_id_value;

  insert into public.dkd_urgent_courier_order_items (
    dkd_order_id,
    dkd_store_group_key,
    dkd_store_name,
    dkd_product_text,
    dkd_is_nearest_pharmacy
  )
  select
    dkd_order_id_value,
    trim(coalesce(dkd_item_source_value.dkd_item_value ->> 'dkd_store_group_key', '')),
    trim(coalesce(dkd_item_source_value.dkd_item_value ->> 'dkd_store_name', '')),
    trim(coalesce(dkd_item_source_value.dkd_item_value ->> 'dkd_product_text', '')),
    coalesce((dkd_item_source_value.dkd_item_value ->> 'dkd_is_nearest_pharmacy')::boolean, false)
  from jsonb_array_elements(coalesce(dkd_param_items, '[]'::jsonb)) dkd_item_source_value(dkd_item_value)
  where trim(coalesce(dkd_item_source_value.dkd_item_value ->> 'dkd_store_name', '')) <> ''
    and trim(coalesce(dkd_item_source_value.dkd_item_value ->> 'dkd_product_text', '')) <> '';

  get diagnostics dkd_item_count_value = row_count;
  if dkd_item_count_value <= 0 then
    delete from public.dkd_urgent_courier_orders where dkd_order_id = dkd_order_id_value;
    raise exception 'items_required';
  end if;

  insert into public.dkd_urgent_courier_messages (
    dkd_order_id,
    dkd_sender_user_id,
    dkd_sender_role_key,
    dkd_message_text
  ) values (
    dkd_order_id_value,
    dkd_user_id_value,
    'dkd_customer',
    'Acil Kurye market siparişi oluşturuldu.'
  );

  return jsonb_build_object('dkd_ok', true, 'dkd_order_id', dkd_order_id_value);
end;
$dkd_create_order$;

create or replace function public.dkd_urgent_courier_order_json_fast_dkd(
  dkd_param_order_id uuid,
  dkd_param_message_limit integer default 24
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $dkd_order_json_fast$
declare
  dkd_result_value jsonb := '{}'::jsonb;
  dkd_message_limit_value integer := least(greatest(coalesce(dkd_param_message_limit, 24), 5), 60);
begin
  select jsonb_build_object(
    'dkd_order_id', dkd_order_row.dkd_order_id,
    'dkd_customer_user_id', dkd_order_row.dkd_customer_user_id,
    'dkd_courier_user_id', dkd_order_row.dkd_courier_user_id,
    'dkd_customer_full_name', dkd_order_row.dkd_customer_full_name,
    'dkd_customer_phone_text', dkd_order_row.dkd_customer_phone_text,
    'dkd_customer_address_text', dkd_order_row.dkd_customer_address_text,
    'dkd_customer_note_text', dkd_order_row.dkd_customer_note_text,
    'dkd_customer_lat', dkd_order_row.dkd_customer_lat,
    'dkd_customer_lng', dkd_order_row.dkd_customer_lng,
    'dkd_status_key', dkd_order_row.dkd_status_key,
    'dkd_courier_fee_tl', dkd_order_row.dkd_courier_fee_tl,
    'dkd_product_total_tl', dkd_order_row.dkd_product_total_tl,
    'dkd_invoice_image_url', dkd_order_row.dkd_invoice_image_url,
    'dkd_chat_enabled_value', dkd_order_row.dkd_chat_enabled_value,
    'dkd_courier_lat', dkd_location_row.dkd_live_lat,
    'dkd_courier_lng', dkd_location_row.dkd_live_lng,
    'dkd_courier_heading_deg', dkd_location_row.dkd_heading_deg,
    'dkd_courier_eta_min', dkd_location_row.dkd_eta_min,
    'dkd_courier_location_updated_at', dkd_location_row.dkd_updated_at,
    'dkd_created_at', dkd_order_row.dkd_created_at,
    'dkd_updated_at', dkd_order_row.dkd_updated_at,
    'dkd_item_values', coalesce((
      select jsonb_agg(jsonb_build_object(
        'dkd_item_id', dkd_item_row.dkd_item_id,
        'dkd_store_group_key', dkd_item_row.dkd_store_group_key,
        'dkd_store_name', dkd_item_row.dkd_store_name,
        'dkd_product_text', dkd_item_row.dkd_product_text,
        'dkd_is_nearest_pharmacy', dkd_item_row.dkd_is_nearest_pharmacy,
        'dkd_product_total_tl', coalesce(dkd_item_row.dkd_product_total_tl, 0)
      ) order by dkd_item_row.dkd_created_at asc)
      from public.dkd_urgent_courier_order_items dkd_item_row
      where dkd_item_row.dkd_order_id = dkd_order_row.dkd_order_id
    ), '[]'::jsonb),
    'dkd_message_values', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'dkd_message_id', dkd_message_scope.dkd_message_id,
          'dkd_sender_role_key', dkd_message_scope.dkd_sender_role_key,
          'dkd_message_text', dkd_message_scope.dkd_message_text,
          'dkd_created_at', dkd_message_scope.dkd_created_at
        )
        order by dkd_message_scope.dkd_created_at asc
      )
      from (
        select
          dkd_message_row.dkd_message_id,
          dkd_message_row.dkd_sender_role_key,
          dkd_message_row.dkd_message_text,
          dkd_message_row.dkd_created_at
        from public.dkd_urgent_courier_messages dkd_message_row
        where dkd_message_row.dkd_order_id = dkd_order_row.dkd_order_id
        order by dkd_message_row.dkd_created_at desc
        limit dkd_message_limit_value
      ) dkd_message_scope
    ), '[]'::jsonb)
  )
  into dkd_result_value
  from public.dkd_urgent_courier_orders dkd_order_row
  left join public.dkd_urgent_courier_live_locations dkd_location_row
    on dkd_location_row.dkd_order_id = dkd_order_row.dkd_order_id
  where dkd_order_row.dkd_order_id = dkd_param_order_id;

  return coalesce(dkd_result_value, '{}'::jsonb);
end;
$dkd_order_json_fast$;

create or replace function public.dkd_urgent_courier_live_map_order_dkd(
  dkd_param_order_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $dkd_live_map_order$
declare
  dkd_user_id_value uuid := auth.uid();
  dkd_order_row_value public.dkd_urgent_courier_orders%rowtype;
begin
  if dkd_user_id_value is null then
    raise exception 'auth_required';
  end if;

  select *
  into dkd_order_row_value
  from public.dkd_urgent_courier_orders dkd_order_row
  where dkd_order_row.dkd_order_id = dkd_param_order_id;

  if dkd_order_row_value.dkd_order_id is null then
    return jsonb_build_object('dkd_ok', false, 'dkd_reason', 'order_not_found');
  end if;

  if public.dkd_is_admin() is not true
    and dkd_order_row_value.dkd_customer_user_id is distinct from dkd_user_id_value
    and dkd_order_row_value.dkd_courier_user_id is distinct from dkd_user_id_value then
    return jsonb_build_object('dkd_ok', false, 'dkd_reason', 'order_not_allowed');
  end if;

  return jsonb_build_object(
    'dkd_ok', true,
    'dkd_order', public.dkd_urgent_courier_order_json_fast_dkd(dkd_param_order_id, 24)
  );
end;
$dkd_live_map_order$;

create or replace function public.dkd_urgent_courier_location_ping_dkd(
  dkd_param_order_id uuid,
  dkd_param_live_lat numeric,
  dkd_param_live_lng numeric,
  dkd_param_heading_deg numeric default null,
  dkd_param_eta_min integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $dkd_location_ping$
declare
  dkd_user_id_value uuid := auth.uid();
  dkd_order_row_value public.dkd_urgent_courier_orders%rowtype;
  dkd_live_lat_value numeric := case when abs(coalesce(dkd_param_live_lat, 999)) <= 90 then round(dkd_param_live_lat, 7) else null end;
  dkd_live_lng_value numeric := case when abs(coalesce(dkd_param_live_lng, 999)) <= 180 then round(dkd_param_live_lng, 7) else null end;
  dkd_heading_value numeric := case when dkd_param_heading_deg is null then null else round(mod((dkd_param_heading_deg + 360)::numeric, 360), 1) end;
  dkd_eta_value integer := case when dkd_param_eta_min is null then null else least(greatest(dkd_param_eta_min, 0), 480) end;
begin
  if dkd_user_id_value is null then
    raise exception 'auth_required';
  end if;

  if dkd_live_lat_value is null or dkd_live_lng_value is null then
    return jsonb_build_object('dkd_ok', false, 'dkd_reason', 'missing_live_location');
  end if;

  select *
  into dkd_order_row_value
  from public.dkd_urgent_courier_orders dkd_order_row
  where dkd_order_row.dkd_order_id = dkd_param_order_id
  for update;

  if dkd_order_row_value.dkd_order_id is null then
    return jsonb_build_object('dkd_ok', false, 'dkd_reason', 'order_not_found');
  end if;

  if dkd_order_row_value.dkd_status_key in ('dkd_completed', 'dkd_cancelled') then
    return jsonb_build_object('dkd_ok', false, 'dkd_reason', 'order_closed');
  end if;

  if public.dkd_is_admin() is not true and dkd_order_row_value.dkd_courier_user_id is distinct from dkd_user_id_value then
    return jsonb_build_object('dkd_ok', false, 'dkd_reason', 'courier_not_allowed');
  end if;

  insert into public.dkd_urgent_courier_live_locations (
    dkd_order_id,
    dkd_courier_user_id,
    dkd_live_lat,
    dkd_live_lng,
    dkd_heading_deg,
    dkd_eta_min,
    dkd_updated_at
  ) values (
    dkd_order_row_value.dkd_order_id,
    coalesce(dkd_order_row_value.dkd_courier_user_id, dkd_user_id_value),
    dkd_live_lat_value,
    dkd_live_lng_value,
    dkd_heading_value,
    dkd_eta_value,
    now()
  )
  on conflict (dkd_order_id) do update
  set dkd_courier_user_id = excluded.dkd_courier_user_id,
      dkd_live_lat = excluded.dkd_live_lat,
      dkd_live_lng = excluded.dkd_live_lng,
      dkd_heading_deg = excluded.dkd_heading_deg,
      dkd_eta_min = excluded.dkd_eta_min,
      dkd_updated_at = now();

  update public.dkd_urgent_courier_orders
  set dkd_updated_at = now()
  where dkd_order_id = dkd_order_row_value.dkd_order_id;

  return jsonb_build_object(
    'dkd_ok', true,
    'dkd_order_id', dkd_order_row_value.dkd_order_id,
    'dkd_live_lat', dkd_live_lat_value,
    'dkd_live_lng', dkd_live_lng_value,
    'dkd_updated_at', now()
  );
end;
$dkd_location_ping$;

revoke all on function public.dkd_urgent_courier_create_order_dkd(text, text, text, text, jsonb, numeric, numeric) from public;
revoke all on function public.dkd_urgent_courier_order_json_fast_dkd(uuid, integer) from public;
revoke all on function public.dkd_urgent_courier_live_map_order_dkd(uuid) from public;
revoke all on function public.dkd_urgent_courier_location_ping_dkd(uuid, numeric, numeric, numeric, integer) from public;

grant execute on function public.dkd_urgent_courier_create_order_dkd(text, text, text, text, jsonb, numeric, numeric) to authenticated, service_role;
grant execute on function public.dkd_urgent_courier_order_json_fast_dkd(uuid, integer) to authenticated, service_role;
grant execute on function public.dkd_urgent_courier_live_map_order_dkd(uuid) to authenticated, service_role;
grant execute on function public.dkd_urgent_courier_location_ping_dkd(uuid, numeric, numeric, numeric, integer) to authenticated, service_role;

select pg_notify('pgrst', 'reload schema');

commit;
