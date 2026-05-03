begin;

-- DKD Mapbox v0.9: rota bozan Null Island (0,0) ve Ankara/Türkiye lat-lng ters kayıtlarını temizler.

update public.dkd_urgent_courier_orders
set dkd_customer_lat = null,
    dkd_customer_lng = null,
    dkd_updated_at = now()
where dkd_customer_lat is not null
  and dkd_customer_lng is not null
  and (
    abs(dkd_customer_lat) > 90
    or abs(dkd_customer_lng) > 180
    or (abs(dkd_customer_lat) < 0.0001 and abs(dkd_customer_lng) < 0.0001)
  );

update public.dkd_urgent_courier_orders
set dkd_customer_lat = dkd_customer_lng,
    dkd_customer_lng = dkd_customer_lat,
    dkd_updated_at = now()
where dkd_customer_lat is not null
  and dkd_customer_lng is not null
  and dkd_customer_lat between 25 and 46
  and dkd_customer_lat not between 35 and 43
  and dkd_customer_lng between 35 and 43;

update public.dkd_urgent_courier_live_locations
set dkd_live_lat = null,
    dkd_live_lng = null,
    dkd_updated_at = now()
where dkd_live_lat is not null
  and dkd_live_lng is not null
  and (
    abs(dkd_live_lat) > 90
    or abs(dkd_live_lng) > 180
    or (abs(dkd_live_lat) < 0.0001 and abs(dkd_live_lng) < 0.0001)
  );

update public.dkd_urgent_courier_live_locations
set dkd_live_lat = dkd_live_lng,
    dkd_live_lng = dkd_live_lat,
    dkd_updated_at = now()
where dkd_live_lat is not null
  and dkd_live_lng is not null
  and dkd_live_lat between 25 and 46
  and dkd_live_lat not between 35 and 43
  and dkd_live_lng between 35 and 43;

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
  dkd_raw_customer_lat_value numeric := dkd_param_customer_lat;
  dkd_raw_customer_lng_value numeric := dkd_param_customer_lng;
  dkd_customer_lat_value numeric := null;
  dkd_customer_lng_value numeric := null;
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

  if dkd_raw_customer_lat_value is not null
    and dkd_raw_customer_lng_value is not null
    and abs(dkd_raw_customer_lat_value) <= 90
    and abs(dkd_raw_customer_lng_value) <= 180
    and not (abs(dkd_raw_customer_lat_value) < 0.0001 and abs(dkd_raw_customer_lng_value) < 0.0001) then
    if dkd_raw_customer_lat_value between 25 and 46
      and dkd_raw_customer_lat_value not between 35 and 43
      and dkd_raw_customer_lng_value between 35 and 43 then
      dkd_customer_lat_value := round(dkd_raw_customer_lng_value, 7);
      dkd_customer_lng_value := round(dkd_raw_customer_lat_value, 7);
    else
      dkd_customer_lat_value := round(dkd_raw_customer_lat_value, 7);
      dkd_customer_lng_value := round(dkd_raw_customer_lng_value, 7);
    end if;
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
    'Acil kurye siparişi oluşturuldu.'
  );

  return jsonb_build_object('dkd_ok', true, 'dkd_order_id', dkd_order_id_value);
end;
$dkd_create_order$;

drop function if exists public.dkd_urgent_courier_location_ping_dkd(uuid, numeric, numeric, numeric, integer);

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
  dkd_raw_live_lat_value numeric := dkd_param_live_lat;
  dkd_raw_live_lng_value numeric := dkd_param_live_lng;
  dkd_live_lat_value numeric := null;
  dkd_live_lng_value numeric := null;
  dkd_heading_value numeric := case when dkd_param_heading_deg is null then null else round(mod((dkd_param_heading_deg + 360)::numeric, 360), 1) end;
  dkd_eta_value integer := case when dkd_param_eta_min is null then null else least(greatest(dkd_param_eta_min, 0), 480) end;
begin
  if dkd_user_id_value is null then
    raise exception 'auth_required';
  end if;

  if dkd_raw_live_lat_value is not null
    and dkd_raw_live_lng_value is not null
    and abs(dkd_raw_live_lat_value) <= 90
    and abs(dkd_raw_live_lng_value) <= 180
    and not (abs(dkd_raw_live_lat_value) < 0.0001 and abs(dkd_raw_live_lng_value) < 0.0001) then
    if dkd_raw_live_lat_value between 25 and 46
      and dkd_raw_live_lat_value not between 35 and 43
      and dkd_raw_live_lng_value between 35 and 43 then
      dkd_live_lat_value := round(dkd_raw_live_lng_value, 7);
      dkd_live_lng_value := round(dkd_raw_live_lat_value, 7);
    else
      dkd_live_lat_value := round(dkd_raw_live_lat_value, 7);
      dkd_live_lng_value := round(dkd_raw_live_lng_value, 7);
    end if;
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
revoke all on function public.dkd_urgent_courier_location_ping_dkd(uuid, numeric, numeric, numeric, integer) from public;

grant execute on function public.dkd_urgent_courier_create_order_dkd(text, text, text, text, jsonb, numeric, numeric) to authenticated, service_role;
grant execute on function public.dkd_urgent_courier_location_ping_dkd(uuid, numeric, numeric, numeric, integer) to authenticated, service_role;

select pg_notify('pgrst', 'reload schema');

commit;
