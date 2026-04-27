begin;

alter table if exists public.dkd_business_product_orders
  add column if not exists unit_price_tl numeric not null default 0,
  add column if not exists total_price_tl numeric not null default 0,
  add column if not exists payment_method text not null default 'token',
  add column if not exists payment_status text not null default 'paid';

create index if not exists dkd_business_product_orders_payment_method_idx
  on public.dkd_business_product_orders(payment_method, created_at desc);

create or replace function public.dkd_business_product_order_cash_on_delivery_dkd(
  dkd_param_product_key text,
  dkd_param_quantity integer default 1,
  dkd_param_delivery_address_text text default null,
  dkd_param_delivery_note text default null,
  dkd_param_delivery_lat numeric default null,
  dkd_param_delivery_lng numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $dkd_cash_order$
declare
  dkd_user_id_value uuid := auth.uid();
  dkd_quantity_value integer := greatest(coalesce(dkd_param_quantity, 1), 1);
  dkd_product_id_value bigint;
  dkd_product_row_value public.dkd_business_products%rowtype;
  dkd_business_row_value public.dkd_businesses%rowtype;
  dkd_unit_price_tl_value numeric := 0;
  dkd_total_price_tl_value numeric := 0;
  dkd_order_id_value bigint;
  dkd_delivery_address_text_value text := nullif(trim(coalesce(dkd_param_delivery_address_text, '')), '');
  dkd_delivery_note_text_value text := nullif(trim(coalesce(dkd_param_delivery_note, '')), '');
begin
  if dkd_user_id_value is null then
    return jsonb_build_object('ok', false, 'reason', 'auth_required');
  end if;

  if nullif(trim(coalesce(dkd_param_product_key, '')), '') is null then
    return jsonb_build_object('ok', false, 'reason', 'product_not_found');
  end if;

  if trim(dkd_param_product_key) ~ '^[0-9]+$' then
    dkd_product_id_value := trim(dkd_param_product_key)::bigint;
  else
    select dkd_business_product_table.id
      into dkd_product_id_value
    from public.dkd_business_products as dkd_business_product_table
    where lower(coalesce(dkd_business_product_table.meta->>'product_key', '')) = lower(trim(dkd_param_product_key))
       or lower(coalesce(dkd_business_product_table.meta->>'token', '')) = lower(trim(dkd_param_product_key))
       or lower(coalesce(dkd_business_product_table.meta->>'slug', '')) = lower(trim(dkd_param_product_key))
    order by dkd_business_product_table.id desc
    limit 1;
  end if;

  if dkd_product_id_value is null then
    return jsonb_build_object('ok', false, 'reason', 'product_not_found');
  end if;

  select *
    into dkd_product_row_value
  from public.dkd_business_products
  where id = dkd_product_id_value
  for update;

  if dkd_product_row_value.id is null then
    return jsonb_build_object('ok', false, 'reason', 'product_not_found');
  end if;

  if coalesce(dkd_product_row_value.is_active, true) is not true then
    return jsonb_build_object('ok', false, 'reason', 'product_inactive');
  end if;

  if coalesce(dkd_product_row_value.stock, 0) < dkd_quantity_value then
    return jsonb_build_object('ok', false, 'reason', 'out_of_stock');
  end if;

  if dkd_delivery_address_text_value is null then
    return jsonb_build_object('ok', false, 'reason', 'delivery_address_required');
  end if;

  select *
    into dkd_business_row_value
  from public.dkd_businesses
  where id = dkd_product_row_value.business_id
  limit 1;

  dkd_unit_price_tl_value := round(greatest(coalesce(dkd_product_row_value.price_cash, dkd_product_row_value.price_token::numeric, 0), 0), 2);
  dkd_total_price_tl_value := round(dkd_unit_price_tl_value * dkd_quantity_value, 2);

  insert into public.dkd_profiles (user_id)
  values (dkd_user_id_value)
  on conflict (user_id) do nothing;

  update public.dkd_business_products
  set stock = greatest(coalesce(stock, 0) - dkd_quantity_value, 0),
      updated_at = timezone('utc', now())
  where id = dkd_product_row_value.id;

  insert into public.dkd_business_product_orders (
    product_id,
    business_id,
    buyer_user_id,
    quantity,
    unit_price_token,
    total_price_token,
    unit_price_tl,
    total_price_tl,
    payment_method,
    payment_status,
    status,
    currency_code,
    snapshot,
    delivery_address_text,
    delivery_note_text,
    delivery_lat,
    delivery_lng,
    created_at,
    updated_at
  ) values (
    dkd_product_row_value.id,
    dkd_product_row_value.business_id,
    dkd_user_id_value,
    dkd_quantity_value,
    0,
    0,
    dkd_unit_price_tl_value,
    dkd_total_price_tl_value,
    'cash_on_delivery',
    'pending_cash',
    'cash_on_delivery',
    'TRY',
    jsonb_strip_nulls(jsonb_build_object(
      'product_title', dkd_product_row_value.title,
      'product_category', dkd_product_row_value.category,
      'business_name', dkd_business_row_value.name,
      'image_url', dkd_product_row_value.image_url,
      'unit_price_tl', dkd_unit_price_tl_value,
      'total_price_tl', dkd_total_price_tl_value,
      'payment_method', 'cash_on_delivery',
      'payment_status', 'pending_cash',
      'delivery_address_text', dkd_delivery_address_text_value,
      'delivery_note_text', dkd_delivery_note_text_value,
      'delivery_location', case
        when dkd_param_delivery_lat is null or dkd_param_delivery_lng is null then null
        else jsonb_build_object('lat', dkd_param_delivery_lat, 'lng', dkd_param_delivery_lng)
      end
    )),
    dkd_delivery_address_text_value,
    dkd_delivery_note_text_value,
    dkd_param_delivery_lat,
    dkd_param_delivery_lng,
    timezone('utc', now()),
    timezone('utc', now())
  )
  returning id into dkd_order_id_value;

  return jsonb_build_object(
    'ok', true,
    'order_id', dkd_order_id_value,
    'product_id', dkd_product_row_value.id,
    'product_name', dkd_product_row_value.title,
    'business_name', coalesce(dkd_business_row_value.name, 'İşletme'),
    'unit_price_tl', dkd_unit_price_tl_value,
    'total_price_tl', dkd_total_price_tl_value,
    'quantity', dkd_quantity_value,
    'currency_code', 'TRY',
    'payment_method', 'cash_on_delivery',
    'payment_status', 'pending_cash',
    'status', 'cash_on_delivery',
    'reward_label', coalesce(dkd_business_row_value.name, 'İşletme') || ' • ' || coalesce(dkd_product_row_value.title, 'Ürün') || ' kapıda nakit ödeme ile sipariş edildi.'
  );
end;
$dkd_cash_order$;

revoke all on function public.dkd_business_product_order_cash_on_delivery_dkd(text, integer, text, text, numeric, numeric) from public;
grant execute on function public.dkd_business_product_order_cash_on_delivery_dkd(text, integer, text, text, numeric, numeric) to authenticated;

commit;
