begin;

-- DKD Lootonia Web Kurye-Kargo cüzdanla ödeme akışı.
-- Amaç: Web kargo oluşturma sırasında pending_cash yerine TL cüzdan ödemesiyle paid/Ödendi durumuna geçmek.

do $dkd_wallet_column_block$
declare
  dkd_wallet_column_exists_value boolean := false;
  dkd_courier_wallet_column_exists_value boolean := false;
begin
  select exists (
    select 1
    from information_schema.columns dkd_column_row
    where dkd_column_row.table_schema = 'public'
      and dkd_column_row.table_name = 'dkd_profiles'
      and dkd_column_row.column_name = 'wallet_tl'
  ) into dkd_wallet_column_exists_value;

  select exists (
    select 1
    from information_schema.columns dkd_column_row
    where dkd_column_row.table_schema = 'public'
      and dkd_column_row.table_name = 'dkd_profiles'
      and dkd_column_row.column_name = 'courier_wallet_tl'
  ) into dkd_courier_wallet_column_exists_value;

  if dkd_wallet_column_exists_value is not true then
    alter table public.dkd_profiles
      add column wallet_tl numeric(12,2) not null default 0;

    if dkd_courier_wallet_column_exists_value is true then
      update public.dkd_profiles
      set wallet_tl = greatest(coalesce(wallet_tl, 0), coalesce(courier_wallet_tl, 0));
    end if;
  end if;
end;
$dkd_wallet_column_block$;

create or replace function public.dkd_web_cargo_quote_dkd(
  dkd_param_package_weight_kg numeric default 1
)
returns jsonb
language plpgsql
stable
set search_path = public
as $dkd_quote$
declare
  dkd_weight_value numeric(10,2) := greatest(coalesce(dkd_param_package_weight_kg, 1), 0.1);
  dkd_courier_fee_value numeric(12,2) := 0;
  dkd_customer_charge_value numeric(12,2) := 0;
  dkd_eta_min_value integer := 18;
begin
  dkd_courier_fee_value := public.dkd_web_cargo_fee_from_weight_dkd(dkd_weight_value);
  dkd_customer_charge_value := public.dkd_web_cargo_customer_charge_dkd(dkd_courier_fee_value);
  dkd_eta_min_value := greatest(12, least(55, ceil(14 + (dkd_weight_value * 4))::integer));

  return jsonb_build_object(
    'ok', true,
    'weight_kg', dkd_weight_value,
    'fee_tl', dkd_courier_fee_value,
    'customer_charge_tl', dkd_customer_charge_value,
    'eta_min', dkd_eta_min_value
  );
end;
$dkd_quote$;

create or replace function public.dkd_web_cargo_create_wallet_paid_dkd(
  dkd_param_customer_first_name text default null,
  dkd_param_customer_last_name text default null,
  dkd_param_customer_phone_text text default null,
  dkd_param_pickup_address_text text default null,
  dkd_param_delivery_address_text text default null,
  dkd_param_package_content_text text default null,
  dkd_param_package_image_url text default null,
  dkd_param_package_weight_kg numeric default 1,
  dkd_param_delivery_note_text text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $dkd_wallet_paid$
declare
  dkd_user_id_value uuid := auth.uid();
  dkd_first_name_value text := coalesce(nullif(trim(coalesce(dkd_param_customer_first_name, '')), ''), 'Gönderici');
  dkd_last_name_value text := coalesce(nullif(trim(coalesce(dkd_param_customer_last_name, '')), ''), 'Müşteri');
  dkd_phone_digits_value text := regexp_replace(coalesce(dkd_param_customer_phone_text, ''), '\D', '', 'g');
  dkd_phone_local_value text := '';
  dkd_phone_value text := '+90';
  dkd_pickup_address_value text := trim(coalesce(dkd_param_pickup_address_text, ''));
  dkd_delivery_address_value text := trim(coalesce(dkd_param_delivery_address_text, ''));
  dkd_package_content_value text := trim(coalesce(dkd_param_package_content_text, ''));
  dkd_weight_value numeric(10,2) := greatest(coalesce(dkd_param_package_weight_kg, 1), 0.1);
  dkd_courier_fee_value numeric(12,2) := 0;
  dkd_customer_charge_value numeric(12,2) := 0;
  dkd_wallet_before_value numeric(12,2) := 0;
  dkd_wallet_after_value numeric(12,2) := 0;
  dkd_eta_min_value integer := 18;
  dkd_shipment_id_value public.dkd_cargo_shipments.id%type;
  dkd_job_id_value public.dkd_courier_jobs.id%type;
  dkd_full_name_value text;
begin
  if dkd_user_id_value is null then
    raise exception 'auth_required';
  end if;

  if length(dkd_pickup_address_value) < 8 then
    raise exception 'pickup_address_required';
  end if;

  if length(dkd_delivery_address_value) < 8 then
    raise exception 'delivery_address_required';
  end if;

  if length(dkd_package_content_value) < 2 then
    raise exception 'package_content_required';
  end if;

  dkd_phone_local_value := case
    when dkd_phone_digits_value like '90%' then substr(dkd_phone_digits_value, 3)
    else regexp_replace(dkd_phone_digits_value, '^0+', '')
  end;
  dkd_phone_local_value := substr(coalesce(dkd_phone_local_value, ''), 1, 10);

  if char_length(dkd_phone_local_value) = 10 and left(dkd_phone_local_value, 1) = '5' then
    dkd_phone_value := '+90' || dkd_phone_local_value;
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_user_id_value)
  on conflict (user_id) do nothing;

  dkd_courier_fee_value := public.dkd_web_cargo_fee_from_weight_dkd(dkd_weight_value);
  dkd_customer_charge_value := public.dkd_web_cargo_customer_charge_dkd(dkd_courier_fee_value);
  dkd_eta_min_value := greatest(12, least(55, ceil(14 + (dkd_weight_value * 4))::integer));
  dkd_full_name_value := trim(concat(dkd_first_name_value, ' ', dkd_last_name_value));

  select coalesce(dkd_profile_row.wallet_tl, 0)
  into dkd_wallet_before_value
  from public.dkd_profiles dkd_profile_row
  where dkd_profile_row.user_id = dkd_user_id_value
  for update;

  if coalesce(dkd_wallet_before_value, 0) < dkd_customer_charge_value then
    return jsonb_build_object(
      'ok', false,
      'reason', 'wallet_insufficient',
      'wallet_tl', coalesce(dkd_wallet_before_value, 0),
      'required_tl', dkd_customer_charge_value,
      'customer_charge_tl', dkd_customer_charge_value
    );
  end if;

  update public.dkd_profiles
  set wallet_tl = round(coalesce(wallet_tl, 0) - dkd_customer_charge_value, 2)
  where user_id = dkd_user_id_value
  returning wallet_tl into dkd_wallet_after_value;

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
    dkd_user_id_value,
    dkd_first_name_value,
    dkd_last_name_value,
    '',
    dkd_phone_value,
    dkd_pickup_address_value,
    dkd_delivery_address_value,
    nullif(trim(coalesce(dkd_param_delivery_note_text, '')), ''),
    dkd_package_content_value,
    nullif(trim(coalesce(dkd_param_package_image_url, '')), ''),
    dkd_weight_value,
    'open',
    39.92077,
    32.85411,
    39.92553,
    32.86628,
    dkd_courier_fee_value,
    dkd_customer_charge_value,
    'paid',
    now()
  ) returning id into dkd_shipment_id_value;

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
    greatest(14, ceil(dkd_weight_value * 8)::integer),
    2.4,
    dkd_eta_min_value,
    'cargo',
    true,
    'open',
    'pending',
    'Kurye-Kargo Operasyon Merkezi',
    dkd_package_content_value,
    coalesce(nullif(trim(coalesce(dkd_param_delivery_note_text, '')), ''), concat('Gönderici • ', dkd_full_name_value)),
    dkd_delivery_address_value,
    dkd_user_id_value,
    39.92077,
    32.85411,
    39.92553,
    32.86628,
    dkd_courier_fee_value,
    dkd_customer_charge_value,
    dkd_shipment_id_value,
    jsonb_build_object(
      'created_from', 'web_market',
      'customer_first_name', dkd_first_name_value,
      'customer_last_name', dkd_last_name_value,
      'customer_phone_text', dkd_phone_value,
      'package_weight_kg', dkd_weight_value,
      'package_image_url', nullif(trim(coalesce(dkd_param_package_image_url, '')), ''),
      'delivery_note', nullif(trim(coalesce(dkd_param_delivery_note_text, '')), ''),
      'cargo_customer_charge_tl', dkd_customer_charge_value,
      'cargo_courier_fee_tl', dkd_courier_fee_value,
      'payment_method', 'wallet_tl',
      'payment_status', 'paid',
      'paid_at', now()
    )
  ) returning id into dkd_job_id_value;

  update public.dkd_cargo_shipments
  set courier_job_id = dkd_job_id_value,
      updated_at = now()
  where id = dkd_shipment_id_value;

  return jsonb_build_object(
    'ok', true,
    'cargo_shipment_id', dkd_shipment_id_value::text,
    'courier_job_id', dkd_job_id_value::text,
    'fee_tl', dkd_courier_fee_value,
    'customer_charge_tl', dkd_customer_charge_value,
    'wallet_before_tl', dkd_wallet_before_value,
    'wallet_after_tl', dkd_wallet_after_value,
    'payment_status', 'paid'
  );
end;
$dkd_wallet_paid$;

drop function if exists public.dkd_web_cargo_create_dkd(text, text, text, text, text, text, text, numeric, text);
create function public.dkd_web_cargo_create_dkd(
  dkd_param_customer_first_name text default null,
  dkd_param_customer_last_name text default null,
  dkd_param_customer_phone_text text default null,
  dkd_param_pickup_address_text text default null,
  dkd_param_delivery_address_text text default null,
  dkd_param_package_content_text text default null,
  dkd_param_package_image_url text default null,
  dkd_param_package_weight_kg numeric default 1,
  dkd_param_delivery_note_text text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $dkd_compat_create$
begin
  return public.dkd_web_cargo_create_wallet_paid_dkd(
    dkd_param_customer_first_name,
    dkd_param_customer_last_name,
    dkd_param_customer_phone_text,
    dkd_param_pickup_address_text,
    dkd_param_delivery_address_text,
    dkd_param_package_content_text,
    dkd_param_package_image_url,
    dkd_param_package_weight_kg,
    dkd_param_delivery_note_text
  );
end;
$dkd_compat_create$;

revoke all on function public.dkd_web_cargo_quote_dkd(numeric) from public;
grant execute on function public.dkd_web_cargo_quote_dkd(numeric) to authenticated;

revoke all on function public.dkd_web_cargo_create_wallet_paid_dkd(text, text, text, text, text, text, text, numeric, text) from public;
grant execute on function public.dkd_web_cargo_create_wallet_paid_dkd(text, text, text, text, text, text, text, numeric, text) to authenticated;

revoke all on function public.dkd_web_cargo_create_dkd(text, text, text, text, text, text, text, numeric, text) from public;
grant execute on function public.dkd_web_cargo_create_dkd(text, text, text, text, text, text, text, numeric, text) to authenticated;

commit;
