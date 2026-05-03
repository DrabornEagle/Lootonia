begin;

alter table if exists public.dkd_business_products
  add column if not exists delivery_fee_tl numeric not null default 0;

alter table if exists public.dkd_business_products enable row level security;
grant select, insert, update, delete on public.dkd_business_products to authenticated;

drop policy if exists dkd_business_products_select_member_or_storefront on public.dkd_business_products;
create policy dkd_business_products_select_member_or_storefront
on public.dkd_business_products
for select
to authenticated
using (
  (
    coalesce(is_active, true) = true
    and coalesce(stock, 0) >= 0
  )
  or coalesce(public.dkd_business_is_member(business_id), false)
  or coalesce(public.dkd_is_admin(), false)
);

drop policy if exists dkd_business_products_insert_member on public.dkd_business_products;
create policy dkd_business_products_insert_member
on public.dkd_business_products
for insert
to authenticated
with check (
  coalesce(public.dkd_business_is_member(business_id), false)
  or coalesce(public.dkd_is_admin(), false)
);

drop policy if exists dkd_business_products_update_member on public.dkd_business_products;
create policy dkd_business_products_update_member
on public.dkd_business_products
for update
to authenticated
using (
  coalesce(public.dkd_business_is_member(business_id), false)
  or coalesce(public.dkd_is_admin(), false)
)
with check (
  coalesce(public.dkd_business_is_member(business_id), false)
  or coalesce(public.dkd_is_admin(), false)
);

drop policy if exists dkd_business_products_delete_member on public.dkd_business_products;
create policy dkd_business_products_delete_member
on public.dkd_business_products
for delete
to authenticated
using (
  coalesce(public.dkd_business_is_member(business_id), false)
  or coalesce(public.dkd_is_admin(), false)
);

drop function if exists public.dkd_business_product_upsert(bigint, uuid, text, text, text, text, integer, numeric, text, integer, numeric, integer, boolean, jsonb);
create function public.dkd_business_product_upsert(
  dkd_param_product_id bigint default null,
  dkd_param_business_id uuid default null,
  dkd_param_title text default null,
  dkd_param_description text default null,
  dkd_param_category text default 'genel',
  dkd_param_image_url text default null,
  dkd_param_price_token integer default 0,
  dkd_param_price_cash numeric default null,
  dkd_param_currency_code text default 'TRY',
  dkd_param_stock integer default 0,
  dkd_param_delivery_fee_tl numeric default 0,
  dkd_param_sort_order integer default 0,
  dkd_param_is_active boolean default true,
  dkd_param_meta jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_target_business_id uuid;
  dkd_product_id bigint;
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  dkd_target_business_id := dkd_param_business_id;
  if dkd_target_business_id is null and dkd_param_product_id is not null then
    select business_id into dkd_target_business_id
    from public.dkd_business_products
    where id = dkd_param_product_id;
  end if;

  if dkd_target_business_id is null then
    raise exception 'business_required';
  end if;

  if not (
    coalesce(public.dkd_business_is_member(dkd_target_business_id), false)
    or coalesce(public.dkd_is_admin(), false)
  ) then
    raise exception 'business_access_denied';
  end if;

  if dkd_param_product_id is null then
    insert into public.dkd_business_products (
      business_id,
      title,
      description,
      category,
      image_url,
      price_token,
      price_cash,
      currency_code,
      stock,
      delivery_fee_tl,
      sort_order,
      is_active,
      meta
    ) values (
      dkd_target_business_id,
      coalesce(nullif(trim(coalesce(dkd_param_title, '')), ''), 'İşletme Ürünü'),
      nullif(trim(coalesce(dkd_param_description, '')), ''),
      coalesce(nullif(trim(coalesce(dkd_param_category, '')), ''), 'genel'),
      nullif(trim(coalesce(dkd_param_image_url, '')), ''),
      greatest(coalesce(dkd_param_price_token, 0), 0),
      dkd_param_price_cash,
      coalesce(nullif(trim(upper(coalesce(dkd_param_currency_code, 'TRY'))), ''), 'TRY'),
      greatest(coalesce(dkd_param_stock, 0), 0),
      greatest(coalesce(dkd_param_delivery_fee_tl, 0), 0),
      greatest(coalesce(dkd_param_sort_order, 0), 0),
      coalesce(dkd_param_is_active, true),
      coalesce(dkd_param_meta, '{}'::jsonb)
    )
    returning id into dkd_product_id;
  else
    update public.dkd_business_products
    set
      title = coalesce(nullif(trim(coalesce(dkd_param_title, '')), ''), title),
      description = case when dkd_param_description is null then description else nullif(trim(coalesce(dkd_param_description, '')), '') end,
      category = coalesce(nullif(trim(coalesce(dkd_param_category, '')), ''), category),
      image_url = case when dkd_param_image_url is null then image_url else nullif(trim(coalesce(dkd_param_image_url, '')), '') end,
      price_token = greatest(coalesce(dkd_param_price_token, price_token), 0),
      price_cash = case when dkd_param_price_cash is null then price_cash else dkd_param_price_cash end,
      currency_code = coalesce(nullif(trim(upper(coalesce(dkd_param_currency_code, ''))), ''), currency_code),
      stock = greatest(coalesce(dkd_param_stock, stock), 0),
      delivery_fee_tl = greatest(coalesce(dkd_param_delivery_fee_tl, delivery_fee_tl), 0),
      sort_order = greatest(coalesce(dkd_param_sort_order, sort_order), 0),
      is_active = coalesce(dkd_param_is_active, is_active),
      meta = coalesce(dkd_param_meta, meta),
      updated_at = now()
    where id = dkd_param_product_id
    returning id into dkd_product_id;
  end if;

  return dkd_product_id;
end;
$$;

revoke all on function public.dkd_business_product_upsert(bigint, uuid, text, text, text, text, integer, numeric, text, integer, numeric, integer, boolean, jsonb) from public;
grant execute on function public.dkd_business_product_upsert(bigint, uuid, text, text, text, text, integer, numeric, text, integer, numeric, integer, boolean, jsonb) to authenticated;

drop function if exists public.dkd_business_product_delete(bigint);
create function public.dkd_business_product_delete(dkd_param_product_id bigint)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_target_business_id uuid;
begin
  select business_id into dkd_target_business_id
  from public.dkd_business_products
  where id = dkd_param_product_id;

  if dkd_target_business_id is null then
    return false;
  end if;

  if not (
    coalesce(public.dkd_business_is_member(dkd_target_business_id), false)
    or coalesce(public.dkd_is_admin(), false)
  ) then
    raise exception 'business_access_denied';
  end if;

  delete from public.dkd_business_products
  where id = dkd_param_product_id;

  return true;
end;
$$;

revoke all on function public.dkd_business_product_delete(bigint) from public;
grant execute on function public.dkd_business_product_delete(bigint) to authenticated;

alter table if exists public.dkd_courier_license_applications enable row level security;
grant select, insert, update on public.dkd_courier_license_applications to authenticated;

drop policy if exists dkd_courier_license_applications_select_own on public.dkd_courier_license_applications;
create policy dkd_courier_license_applications_select_own
on public.dkd_courier_license_applications
for select
to authenticated
using (auth.uid() = user_id or coalesce(public.dkd_is_admin(), false));

drop policy if exists dkd_courier_license_applications_insert_own on public.dkd_courier_license_applications;
create policy dkd_courier_license_applications_insert_own
on public.dkd_courier_license_applications
for insert
to authenticated
with check (auth.uid() = user_id or coalesce(public.dkd_is_admin(), false));

drop policy if exists dkd_courier_license_applications_update_own on public.dkd_courier_license_applications;
create policy dkd_courier_license_applications_update_own
on public.dkd_courier_license_applications
for update
to authenticated
using (auth.uid() = user_id or coalesce(public.dkd_is_admin(), false))
with check (auth.uid() = user_id or coalesce(public.dkd_is_admin(), false));

do $$
begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  select 'lootonia-business-product-art', 'lootonia-business-product-art', true, 5242880, array['image/jpeg','image/png','image/webp','image/heic']
  where not exists (select 1 from storage.buckets where id = 'lootonia-business-product-art');
exception when undefined_table then null;
end $$;

do $$
begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  select 'lootonia-courier-docs', 'lootonia-courier-docs', true, 8388608, array['image/jpeg','image/png','image/webp','image/heic']
  where not exists (select 1 from storage.buckets where id = 'lootonia-courier-docs');
exception when undefined_table then null;
end $$;

drop policy if exists dkd_lootonia_business_product_art_read on storage.objects;
create policy dkd_lootonia_business_product_art_read
on storage.objects
for select
to authenticated
using (bucket_id = 'lootonia-business-product-art');

drop policy if exists dkd_lootonia_business_product_art_insert on storage.objects;
create policy dkd_lootonia_business_product_art_insert
on storage.objects
for insert
to authenticated
with check (bucket_id = 'lootonia-business-product-art');

drop policy if exists dkd_lootonia_business_product_art_update on storage.objects;
create policy dkd_lootonia_business_product_art_update
on storage.objects
for update
to authenticated
using (bucket_id = 'lootonia-business-product-art')
with check (bucket_id = 'lootonia-business-product-art');

drop policy if exists dkd_lootonia_business_product_art_delete on storage.objects;
create policy dkd_lootonia_business_product_art_delete
on storage.objects
for delete
to authenticated
using (bucket_id = 'lootonia-business-product-art');

drop policy if exists dkd_lootonia_courier_docs_read on storage.objects;
create policy dkd_lootonia_courier_docs_read
on storage.objects
for select
to authenticated
using (bucket_id = 'lootonia-courier-docs');

drop policy if exists dkd_lootonia_courier_docs_insert on storage.objects;
create policy dkd_lootonia_courier_docs_insert
on storage.objects
for insert
to authenticated
with check (bucket_id = 'lootonia-courier-docs');

drop policy if exists dkd_lootonia_courier_docs_update on storage.objects;
create policy dkd_lootonia_courier_docs_update
on storage.objects
for update
to authenticated
using (bucket_id = 'lootonia-courier-docs')
with check (bucket_id = 'lootonia-courier-docs');

drop policy if exists dkd_lootonia_courier_docs_delete on storage.objects;
create policy dkd_lootonia_courier_docs_delete
on storage.objects
for delete
to authenticated
using (bucket_id = 'lootonia-courier-docs');

commit;
