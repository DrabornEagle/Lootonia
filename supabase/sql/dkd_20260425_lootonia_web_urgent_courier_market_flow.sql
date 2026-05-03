begin;

-- DKD Lootonia Web Market / Acil Kurye akışı
-- Müşteri: Market + Fırın + Eczane + Diğer mağaza listesiyle sipariş oluşturur.
-- Kurye: Taşıma ücretini teklif eder; müşteri cüzdandan onaylayınca sohbet ve alışveriş akışı açılır.

create extension if not exists pgcrypto;

create table if not exists public.dkd_urgent_courier_orders (
  dkd_order_id uuid primary key default gen_random_uuid(),
  dkd_customer_user_id uuid not null references auth.users(id) on delete cascade,
  dkd_courier_user_id uuid references auth.users(id) on delete set null,
  dkd_customer_full_name text not null default '',
  dkd_customer_phone_text text not null default '',
  dkd_customer_address_text text not null default '',
  dkd_customer_note_text text not null default '',
  dkd_status_key text not null default 'dkd_open',
  dkd_courier_fee_tl numeric(12,2) not null default 0,
  dkd_courier_fee_offered_at timestamptz,
  dkd_courier_fee_approved_at timestamptz,
  dkd_product_total_tl numeric(12,2) not null default 0,
  dkd_product_total_submitted_at timestamptz,
  dkd_product_total_approved_at timestamptz,
  dkd_invoice_image_url text not null default '',
  dkd_invoice_uploaded_at timestamptz,
  dkd_chat_enabled_value boolean not null default false,
  dkd_created_at timestamptz not null default now(),
  dkd_updated_at timestamptz not null default now()
);

create table if not exists public.dkd_urgent_courier_order_items (
  dkd_item_id uuid primary key default gen_random_uuid(),
  dkd_order_id uuid not null references public.dkd_urgent_courier_orders(dkd_order_id) on delete cascade,
  dkd_store_group_key text not null default '',
  dkd_store_name text not null default '',
  dkd_product_text text not null default '',
  dkd_is_nearest_pharmacy boolean not null default false,
  dkd_created_at timestamptz not null default now()
);

create table if not exists public.dkd_urgent_courier_messages (
  dkd_message_id uuid primary key default gen_random_uuid(),
  dkd_order_id uuid not null references public.dkd_urgent_courier_orders(dkd_order_id) on delete cascade,
  dkd_sender_user_id uuid not null references auth.users(id) on delete cascade,
  dkd_sender_role_key text not null default 'dkd_customer',
  dkd_message_text text not null default '',
  dkd_created_at timestamptz not null default now()
);

create index if not exists dkd_urgent_courier_orders_customer_idx
  on public.dkd_urgent_courier_orders(dkd_customer_user_id, dkd_created_at desc);
create index if not exists dkd_urgent_courier_orders_courier_idx
  on public.dkd_urgent_courier_orders(dkd_courier_user_id, dkd_created_at desc);
create index if not exists dkd_urgent_courier_orders_status_idx
  on public.dkd_urgent_courier_orders(dkd_status_key, dkd_created_at desc);
create index if not exists dkd_urgent_courier_order_items_order_idx
  on public.dkd_urgent_courier_order_items(dkd_order_id, dkd_created_at asc);
create index if not exists dkd_urgent_courier_messages_order_idx
  on public.dkd_urgent_courier_messages(dkd_order_id, dkd_created_at asc);

create or replace function public.dkd_urgent_courier_touch_updated_at_dkd()
returns trigger
language plpgsql
set search_path = public
as $dkd_touch_updated_at$
begin
  new.dkd_updated_at := now();
  return new;
end;
$dkd_touch_updated_at$;

drop trigger if exists dkd_urgent_courier_orders_touch_updated_at on public.dkd_urgent_courier_orders;
create trigger dkd_urgent_courier_orders_touch_updated_at
before update on public.dkd_urgent_courier_orders
for each row execute function public.dkd_urgent_courier_touch_updated_at_dkd();

alter table public.dkd_urgent_courier_orders enable row level security;
alter table public.dkd_urgent_courier_order_items enable row level security;
alter table public.dkd_urgent_courier_messages enable row level security;

drop policy if exists dkd_urgent_courier_orders_select_scope on public.dkd_urgent_courier_orders;
create policy dkd_urgent_courier_orders_select_scope
on public.dkd_urgent_courier_orders
for select
to authenticated
using (
  auth.uid() = dkd_customer_user_id
  or auth.uid() = dkd_courier_user_id
  or (dkd_courier_user_id is null and dkd_status_key = 'dkd_open')
);

drop policy if exists dkd_urgent_courier_orders_insert_customer on public.dkd_urgent_courier_orders;
create policy dkd_urgent_courier_orders_insert_customer
on public.dkd_urgent_courier_orders
for insert
to authenticated
with check (auth.uid() = dkd_customer_user_id);

drop policy if exists dkd_urgent_courier_orders_update_scope on public.dkd_urgent_courier_orders;
create policy dkd_urgent_courier_orders_update_scope
on public.dkd_urgent_courier_orders
for update
to authenticated
using (auth.uid() = dkd_customer_user_id or auth.uid() = dkd_courier_user_id or dkd_courier_user_id is null)
with check (auth.uid() = dkd_customer_user_id or auth.uid() = dkd_courier_user_id or dkd_courier_user_id is null);

drop policy if exists dkd_urgent_courier_items_select_scope on public.dkd_urgent_courier_order_items;
create policy dkd_urgent_courier_items_select_scope
on public.dkd_urgent_courier_order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.dkd_urgent_courier_orders dkd_order_row
    where dkd_order_row.dkd_order_id = dkd_urgent_courier_order_items.dkd_order_id
      and (
        auth.uid() = dkd_order_row.dkd_customer_user_id
        or auth.uid() = dkd_order_row.dkd_courier_user_id
        or (dkd_order_row.dkd_courier_user_id is null and dkd_order_row.dkd_status_key = 'dkd_open')
      )
  )
);

drop policy if exists dkd_urgent_courier_items_insert_scope on public.dkd_urgent_courier_order_items;
create policy dkd_urgent_courier_items_insert_scope
on public.dkd_urgent_courier_order_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.dkd_urgent_courier_orders dkd_order_row
    where dkd_order_row.dkd_order_id = dkd_urgent_courier_order_items.dkd_order_id
      and auth.uid() = dkd_order_row.dkd_customer_user_id
  )
);

drop policy if exists dkd_urgent_courier_messages_select_scope on public.dkd_urgent_courier_messages;
create policy dkd_urgent_courier_messages_select_scope
on public.dkd_urgent_courier_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.dkd_urgent_courier_orders dkd_order_row
    where dkd_order_row.dkd_order_id = dkd_urgent_courier_messages.dkd_order_id
      and (auth.uid() = dkd_order_row.dkd_customer_user_id or auth.uid() = dkd_order_row.dkd_courier_user_id)
  )
);

drop policy if exists dkd_urgent_courier_messages_insert_scope on public.dkd_urgent_courier_messages;
create policy dkd_urgent_courier_messages_insert_scope
on public.dkd_urgent_courier_messages
for insert
to authenticated
with check (auth.uid() = dkd_sender_user_id);

grant select, insert, update on public.dkd_urgent_courier_orders to authenticated;
grant select, insert on public.dkd_urgent_courier_order_items to authenticated;
grant select, insert on public.dkd_urgent_courier_messages to authenticated;

create or replace function public.dkd_urgent_courier_license_active_dkd(
  dkd_param_user_id uuid default auth.uid()
)
returns boolean
language plpgsql
stable
set search_path = public, auth
as $dkd_license_active$
declare
  dkd_license_value boolean := false;
  dkd_profile_meta_value jsonb := '{}'::jsonb;
  dkd_status_value text := '';
begin
  if dkd_param_user_id is null then
    return false;
  end if;

  if to_regprocedure('public.dkd_web_courier_license_active_dkd(uuid)') is not null then
    execute 'select public.dkd_web_courier_license_active_dkd($1)'
      using dkd_param_user_id
      into dkd_license_value;
    if dkd_license_value is true then
      return true;
    end if;
  end if;

  select coalesce(dkd_profile_row.courier_profile_meta, '{}'::jsonb), coalesce(dkd_profile_row.courier_status, '')
  into dkd_profile_meta_value, dkd_status_value
  from public.dkd_profiles dkd_profile_row
  where dkd_profile_row.user_id = dkd_param_user_id
  limit 1;

  return coalesce((dkd_profile_meta_value ->> 'has_courier_license')::boolean, false)
    or lower(dkd_status_value) in ('approved', 'active', 'onayli', 'onaylı', 'verified', 'enabled');
exception
  when others then
    return false;
end;
$dkd_license_active$;

create or replace function public.dkd_urgent_courier_order_json_dkd(
  dkd_param_order_id uuid
)
returns jsonb
language plpgsql
stable
set search_path = public
as $dkd_order_json$
declare
  dkd_result_value jsonb := '{}'::jsonb;
begin
  select jsonb_build_object(
    'dkd_order_id', dkd_order_row.dkd_order_id,
    'dkd_customer_user_id', dkd_order_row.dkd_customer_user_id,
    'dkd_courier_user_id', dkd_order_row.dkd_courier_user_id,
    'dkd_customer_full_name', dkd_order_row.dkd_customer_full_name,
    'dkd_customer_phone_text', dkd_order_row.dkd_customer_phone_text,
    'dkd_customer_address_text', dkd_order_row.dkd_customer_address_text,
    'dkd_customer_note_text', dkd_order_row.dkd_customer_note_text,
    'dkd_status_key', dkd_order_row.dkd_status_key,
    'dkd_courier_fee_tl', dkd_order_row.dkd_courier_fee_tl,
    'dkd_product_total_tl', dkd_order_row.dkd_product_total_tl,
    'dkd_invoice_image_url', dkd_order_row.dkd_invoice_image_url,
    'dkd_chat_enabled_value', dkd_order_row.dkd_chat_enabled_value,
    'dkd_created_at', dkd_order_row.dkd_created_at,
    'dkd_updated_at', dkd_order_row.dkd_updated_at,
    'dkd_item_values', coalesce((
      select jsonb_agg(jsonb_build_object(
        'dkd_item_id', dkd_item_row.dkd_item_id,
        'dkd_store_group_key', dkd_item_row.dkd_store_group_key,
        'dkd_store_name', dkd_item_row.dkd_store_name,
        'dkd_product_text', dkd_item_row.dkd_product_text,
        'dkd_is_nearest_pharmacy', dkd_item_row.dkd_is_nearest_pharmacy
      ) order by dkd_item_row.dkd_created_at asc)
      from public.dkd_urgent_courier_order_items dkd_item_row
      where dkd_item_row.dkd_order_id = dkd_order_row.dkd_order_id
    ), '[]'::jsonb),
    'dkd_message_values', coalesce((
      select jsonb_agg(jsonb_build_object(
        'dkd_message_id', dkd_message_row.dkd_message_id,
        'dkd_sender_role_key', dkd_message_row.dkd_sender_role_key,
        'dkd_message_text', dkd_message_row.dkd_message_text,
        'dkd_created_at', dkd_message_row.dkd_created_at
      ) order by dkd_message_row.dkd_created_at asc)
      from public.dkd_urgent_courier_messages dkd_message_row
      where dkd_message_row.dkd_order_id = dkd_order_row.dkd_order_id
    ), '[]'::jsonb)
  )
  into dkd_result_value
  from public.dkd_urgent_courier_orders dkd_order_row
  where dkd_order_row.dkd_order_id = dkd_param_order_id;

  return coalesce(dkd_result_value, '{}'::jsonb);
end;
$dkd_order_json$;

create or replace function public.dkd_urgent_courier_snapshot_dkd()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $dkd_snapshot$
declare
  dkd_user_id_value uuid := auth.uid();
  dkd_has_courier_license_value boolean := false;
  dkd_customer_orders_value jsonb := '[]'::jsonb;
  dkd_courier_orders_value jsonb := '[]'::jsonb;
  dkd_profile_value jsonb := '{}'::jsonb;
begin
  if dkd_user_id_value is null then
    raise exception 'auth_required';
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_user_id_value)
  on conflict (user_id) do nothing;

  dkd_has_courier_license_value := public.dkd_urgent_courier_license_active_dkd(dkd_user_id_value);

  select jsonb_build_object(
    'user_id', dkd_profile_row.user_id,
    'wallet_tl', coalesce(dkd_profile_row.wallet_tl, 0),
    'courier_wallet_tl', coalesce(dkd_profile_row.courier_wallet_tl, 0),
    'courier_status', coalesce(dkd_profile_row.courier_status, '')
  )
  into dkd_profile_value
  from public.dkd_profiles dkd_profile_row
  where dkd_profile_row.user_id = dkd_user_id_value;

  select coalesce(jsonb_agg(public.dkd_urgent_courier_order_json_dkd(dkd_order_row.dkd_order_id) order by dkd_order_row.dkd_created_at desc), '[]'::jsonb)
  into dkd_customer_orders_value
  from public.dkd_urgent_courier_orders dkd_order_row
  where dkd_order_row.dkd_customer_user_id = dkd_user_id_value;

  if dkd_has_courier_license_value is true then
    select coalesce(jsonb_agg(public.dkd_urgent_courier_order_json_dkd(dkd_order_row.dkd_order_id) order by dkd_order_row.dkd_created_at desc), '[]'::jsonb)
    into dkd_courier_orders_value
    from public.dkd_urgent_courier_orders dkd_order_row
    where dkd_order_row.dkd_status_key not in ('dkd_completed', 'dkd_cancelled')
      and (
        (dkd_order_row.dkd_status_key = 'dkd_open' and dkd_order_row.dkd_courier_user_id is null)
        or dkd_order_row.dkd_courier_user_id = dkd_user_id_value
      );
  end if;

  return jsonb_build_object(
    'dkd_ok', true,
    'dkd_has_courier_license', dkd_has_courier_license_value,
    'dkd_profile', coalesce(dkd_profile_value, '{}'::jsonb),
    'dkd_customer_orders', dkd_customer_orders_value,
    'dkd_courier_orders', dkd_courier_orders_value
  );
end;
$dkd_snapshot$;

create or replace function public.dkd_urgent_courier_create_order_dkd(
  dkd_param_customer_full_name text default null,
  dkd_param_customer_phone_text text default null,
  dkd_param_customer_address_text text default null,
  dkd_param_customer_note_text text default null,
  dkd_param_items jsonb default '[]'::jsonb
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
    dkd_status_key
  ) values (
    dkd_user_id_value,
    dkd_customer_name_value,
    dkd_customer_phone_value,
    dkd_customer_address_value,
    trim(coalesce(dkd_param_customer_note_text, '')),
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

create or replace function public.dkd_urgent_courier_offer_fee_dkd(
  dkd_param_order_id uuid,
  dkd_param_courier_fee_tl numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $dkd_offer_fee$
declare
  dkd_user_id_value uuid := auth.uid();
  dkd_fee_value numeric(12,2) := round(greatest(coalesce(dkd_param_courier_fee_tl, 0), 0), 2);
  dkd_updated_count_value integer := 0;
begin
  if dkd_user_id_value is null then
    raise exception 'auth_required';
  end if;
  if public.dkd_urgent_courier_license_active_dkd(dkd_user_id_value) is not true then
    raise exception 'courier_license_required';
  end if;
  if dkd_fee_value <= 0 then
    raise exception 'fee_required';
  end if;

  update public.dkd_urgent_courier_orders
  set dkd_courier_user_id = dkd_user_id_value,
      dkd_courier_fee_tl = dkd_fee_value,
      dkd_courier_fee_offered_at = now(),
      dkd_status_key = 'dkd_fee_offer_waiting'
  where dkd_order_id = dkd_param_order_id
    and dkd_status_key = 'dkd_open'
    and dkd_courier_user_id is null;

  get diagnostics dkd_updated_count_value = row_count;
  if dkd_updated_count_value <= 0 then
    return jsonb_build_object('dkd_ok', false, 'dkd_reason', 'order_not_available');
  end if;

  insert into public.dkd_urgent_courier_messages (dkd_order_id, dkd_sender_user_id, dkd_sender_role_key, dkd_message_text)
  values (dkd_param_order_id, dkd_user_id_value, 'dkd_courier', concat('Kurye taşıma ücreti teklif etti: ', dkd_fee_value::text, ' TL'));

  return jsonb_build_object('dkd_ok', true, 'dkd_courier_fee_tl', dkd_fee_value);
end;
$dkd_offer_fee$;

create or replace function public.dkd_urgent_courier_customer_approve_fee_dkd(
  dkd_param_order_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $dkd_approve_fee$
declare
  dkd_user_id_value uuid := auth.uid();
  dkd_order_row_value public.dkd_urgent_courier_orders%rowtype;
  dkd_wallet_before_value numeric(12,2) := 0;
  dkd_wallet_after_value numeric(12,2) := 0;
begin
  if dkd_user_id_value is null then
    raise exception 'auth_required';
  end if;

  select *
  into dkd_order_row_value
  from public.dkd_urgent_courier_orders
  where dkd_order_id = dkd_param_order_id
  for update;

  if dkd_order_row_value.dkd_order_id is null or dkd_order_row_value.dkd_customer_user_id <> dkd_user_id_value then
    raise exception 'order_not_found';
  end if;
  if dkd_order_row_value.dkd_status_key <> 'dkd_fee_offer_waiting' or dkd_order_row_value.dkd_courier_fee_tl <= 0 then
    raise exception 'fee_offer_not_ready';
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_user_id_value)
  on conflict (user_id) do nothing;

  select coalesce(dkd_profile_row.wallet_tl, 0)
  into dkd_wallet_before_value
  from public.dkd_profiles dkd_profile_row
  where dkd_profile_row.user_id = dkd_user_id_value
  for update;

  if coalesce(dkd_wallet_before_value, 0) < dkd_order_row_value.dkd_courier_fee_tl then
    return jsonb_build_object(
      'dkd_ok', false,
      'dkd_reason', 'wallet_insufficient',
      'dkd_wallet_tl', coalesce(dkd_wallet_before_value, 0),
      'dkd_required_tl', dkd_order_row_value.dkd_courier_fee_tl
    );
  end if;

  update public.dkd_profiles
  set wallet_tl = round(coalesce(wallet_tl, 0) - dkd_order_row_value.dkd_courier_fee_tl, 2)
  where user_id = dkd_user_id_value
  returning wallet_tl into dkd_wallet_after_value;

  update public.dkd_urgent_courier_orders
  set dkd_status_key = 'dkd_fee_paid_shopping',
      dkd_courier_fee_approved_at = now(),
      dkd_chat_enabled_value = true
  where dkd_order_id = dkd_param_order_id;

  insert into public.dkd_urgent_courier_messages (dkd_order_id, dkd_sender_user_id, dkd_sender_role_key, dkd_message_text)
  values (dkd_param_order_id, dkd_user_id_value, 'dkd_customer', 'Taşıma ücreti onaylandı ve sohbet aktif oldu.');

  return jsonb_build_object('dkd_ok', true, 'dkd_wallet_after_tl', dkd_wallet_after_value);
end;
$dkd_approve_fee$;

create or replace function public.dkd_urgent_courier_set_product_total_dkd(
  dkd_param_order_id uuid,
  dkd_param_product_total_tl numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $dkd_set_product_total$
declare
  dkd_user_id_value uuid := auth.uid();
  dkd_total_value numeric(12,2) := round(greatest(coalesce(dkd_param_product_total_tl, 0), 0), 2);
  dkd_updated_count_value integer := 0;
begin
  if dkd_user_id_value is null then
    raise exception 'auth_required';
  end if;
  if dkd_total_value <= 0 then
    raise exception 'product_total_required';
  end if;

  update public.dkd_urgent_courier_orders
  set dkd_product_total_tl = dkd_total_value,
      dkd_product_total_submitted_at = now(),
      dkd_status_key = 'dkd_product_total_waiting'
  where dkd_order_id = dkd_param_order_id
    and dkd_courier_user_id = dkd_user_id_value
    and dkd_status_key in ('dkd_fee_paid_shopping', 'dkd_product_total_waiting', 'dkd_product_total_approved');

  get diagnostics dkd_updated_count_value = row_count;
  if dkd_updated_count_value <= 0 then
    return jsonb_build_object('dkd_ok', false, 'dkd_reason', 'order_not_ready');
  end if;

  insert into public.dkd_urgent_courier_messages (dkd_order_id, dkd_sender_user_id, dkd_sender_role_key, dkd_message_text)
  values (dkd_param_order_id, dkd_user_id_value, 'dkd_courier', concat('Ürünlerin toplam TL fiyatı girildi: ', dkd_total_value::text, ' TL'));

  return jsonb_build_object('dkd_ok', true, 'dkd_product_total_tl', dkd_total_value);
end;
$dkd_set_product_total$;

create or replace function public.dkd_urgent_courier_customer_approve_product_total_dkd(
  dkd_param_order_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $dkd_approve_product_total$
declare
  dkd_user_id_value uuid := auth.uid();
  dkd_updated_count_value integer := 0;
begin
  if dkd_user_id_value is null then
    raise exception 'auth_required';
  end if;

  update public.dkd_urgent_courier_orders
  set dkd_status_key = 'dkd_product_total_approved',
      dkd_product_total_approved_at = now()
  where dkd_order_id = dkd_param_order_id
    and dkd_customer_user_id = dkd_user_id_value
    and dkd_status_key = 'dkd_product_total_waiting'
    and dkd_product_total_tl > 0;

  get diagnostics dkd_updated_count_value = row_count;
  if dkd_updated_count_value <= 0 then
    return jsonb_build_object('dkd_ok', false, 'dkd_reason', 'product_total_not_ready');
  end if;

  insert into public.dkd_urgent_courier_messages (dkd_order_id, dkd_sender_user_id, dkd_sender_role_key, dkd_message_text)
  values (dkd_param_order_id, dkd_user_id_value, 'dkd_customer', 'Ürün toplamı onaylandı. Kurye mağazadan satın alma adımına geçebilir.');

  return jsonb_build_object('dkd_ok', true);
end;
$dkd_approve_product_total$;

create or replace function public.dkd_urgent_courier_upload_invoice_dkd(
  dkd_param_order_id uuid,
  dkd_param_invoice_image_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $dkd_upload_invoice$
declare
  dkd_user_id_value uuid := auth.uid();
  dkd_invoice_value text := trim(coalesce(dkd_param_invoice_image_url, ''));
  dkd_updated_count_value integer := 0;
begin
  if dkd_user_id_value is null then
    raise exception 'auth_required';
  end if;
  if length(dkd_invoice_value) < 12 then
    raise exception 'invoice_image_required';
  end if;

  update public.dkd_urgent_courier_orders
  set dkd_invoice_image_url = dkd_invoice_value,
      dkd_invoice_uploaded_at = now(),
      dkd_status_key = 'dkd_invoice_uploaded'
  where dkd_order_id = dkd_param_order_id
    and dkd_courier_user_id = dkd_user_id_value
    and dkd_status_key in ('dkd_product_total_approved', 'dkd_invoice_uploaded');

  get diagnostics dkd_updated_count_value = row_count;
  if dkd_updated_count_value <= 0 then
    return jsonb_build_object('dkd_ok', false, 'dkd_reason', 'invoice_not_ready');
  end if;

  insert into public.dkd_urgent_courier_messages (dkd_order_id, dkd_sender_user_id, dkd_sender_role_key, dkd_message_text)
  values (dkd_param_order_id, dkd_user_id_value, 'dkd_courier', 'Fatura görseli sisteme yüklendi.');

  return jsonb_build_object('dkd_ok', true);
end;
$dkd_upload_invoice$;

create or replace function public.dkd_urgent_courier_send_message_dkd(
  dkd_param_order_id uuid,
  dkd_param_message_text text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $dkd_send_message$
declare
  dkd_user_id_value uuid := auth.uid();
  dkd_order_row_value public.dkd_urgent_courier_orders%rowtype;
  dkd_message_value text := trim(coalesce(dkd_param_message_text, ''));
  dkd_role_key_value text := 'dkd_customer';
begin
  if dkd_user_id_value is null then
    raise exception 'auth_required';
  end if;
  if length(dkd_message_value) < 1 then
    raise exception 'message_required';
  end if;

  select *
  into dkd_order_row_value
  from public.dkd_urgent_courier_orders
  where dkd_order_id = dkd_param_order_id;

  if dkd_order_row_value.dkd_order_id is null then
    raise exception 'order_not_found';
  end if;
  if dkd_order_row_value.dkd_chat_enabled_value is not true then
    raise exception 'chat_not_enabled';
  end if;
  if dkd_user_id_value = dkd_order_row_value.dkd_customer_user_id then
    dkd_role_key_value := 'dkd_customer';
  elsif dkd_user_id_value = dkd_order_row_value.dkd_courier_user_id then
    dkd_role_key_value := 'dkd_courier';
  else
    raise exception 'not_order_member';
  end if;

  insert into public.dkd_urgent_courier_messages (dkd_order_id, dkd_sender_user_id, dkd_sender_role_key, dkd_message_text)
  values (dkd_param_order_id, dkd_user_id_value, dkd_role_key_value, dkd_message_value);

  return jsonb_build_object('dkd_ok', true);
end;
$dkd_send_message$;

revoke all on function public.dkd_urgent_courier_license_active_dkd(uuid) from public;
revoke all on function public.dkd_urgent_courier_order_json_dkd(uuid) from public;
revoke all on function public.dkd_urgent_courier_snapshot_dkd() from public;
revoke all on function public.dkd_urgent_courier_create_order_dkd(text, text, text, text, jsonb) from public;
revoke all on function public.dkd_urgent_courier_offer_fee_dkd(uuid, numeric) from public;
revoke all on function public.dkd_urgent_courier_customer_approve_fee_dkd(uuid) from public;
revoke all on function public.dkd_urgent_courier_set_product_total_dkd(uuid, numeric) from public;
revoke all on function public.dkd_urgent_courier_customer_approve_product_total_dkd(uuid) from public;
revoke all on function public.dkd_urgent_courier_upload_invoice_dkd(uuid, text) from public;
revoke all on function public.dkd_urgent_courier_send_message_dkd(uuid, text) from public;

grant execute on function public.dkd_urgent_courier_license_active_dkd(uuid) to authenticated;
grant execute on function public.dkd_urgent_courier_order_json_dkd(uuid) to authenticated;
grant execute on function public.dkd_urgent_courier_snapshot_dkd() to authenticated;
grant execute on function public.dkd_urgent_courier_create_order_dkd(text, text, text, text, jsonb) to authenticated;
grant execute on function public.dkd_urgent_courier_offer_fee_dkd(uuid, numeric) to authenticated;
grant execute on function public.dkd_urgent_courier_customer_approve_fee_dkd(uuid) to authenticated;
grant execute on function public.dkd_urgent_courier_set_product_total_dkd(uuid, numeric) to authenticated;
grant execute on function public.dkd_urgent_courier_customer_approve_product_total_dkd(uuid) to authenticated;
grant execute on function public.dkd_urgent_courier_upload_invoice_dkd(uuid, text) to authenticated;
grant execute on function public.dkd_urgent_courier_send_message_dkd(uuid, text) to authenticated;

commit;
