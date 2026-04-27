begin;

create table if not exists public.dkd_business_market_products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.dkd_businesses(id) on delete cascade,
  sku text,
  name text not null,
  description text,
  image_url text,
  category text not null default 'general',
  currency_code text not null default 'TRY',
  price_amount numeric(12,2) not null default 0,
  discounted_price_amount numeric(12,2),
  stock_quantity integer not null default 0,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dkd_business_market_products_price_nonneg check (price_amount >= 0),
  constraint dkd_business_market_products_discount_nonneg check (discounted_price_amount is null or discounted_price_amount >= 0),
  constraint dkd_business_market_products_discount_lte_price check (discounted_price_amount is null or discounted_price_amount <= price_amount),
  constraint dkd_business_market_products_stock_nonneg check (stock_quantity >= 0)
);

create index if not exists idx_dkd_business_market_products_business
on public.dkd_business_market_products(business_id, is_active, sort_order, updated_at desc);

create unique index if not exists idx_dkd_business_market_products_business_sku
on public.dkd_business_market_products(business_id, sku)
where sku is not null;

create or replace function public.dkd_business_market_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_dkd_business_market_products_updated_at on public.dkd_business_market_products;
create trigger trg_dkd_business_market_products_updated_at
before update on public.dkd_business_market_products
for each row
execute function public.dkd_business_market_touch_updated_at();

grant select, insert, update, delete on public.dkd_business_market_products to authenticated;

alter table public.dkd_business_market_products enable row level security;

drop policy if exists dkd_business_market_products_select on public.dkd_business_market_products;
create policy dkd_business_market_products_select
on public.dkd_business_market_products
for select
to authenticated
using (
  public.dkd_business_is_member(business_id)
  or coalesce(public.dkd_is_admin(), false)
  or is_active = true
);

drop policy if exists dkd_business_market_products_insert on public.dkd_business_market_products;
create policy dkd_business_market_products_insert
on public.dkd_business_market_products
for insert
to authenticated
with check (
  public.dkd_business_is_member(business_id)
  or coalesce(public.dkd_is_admin(), false)
);

drop policy if exists dkd_business_market_products_update on public.dkd_business_market_products;
create policy dkd_business_market_products_update
on public.dkd_business_market_products
for update
to authenticated
using (
  public.dkd_business_is_member(business_id)
  or coalesce(public.dkd_is_admin(), false)
)
with check (
  public.dkd_business_is_member(business_id)
  or coalesce(public.dkd_is_admin(), false)
);

drop policy if exists dkd_business_market_products_delete on public.dkd_business_market_products;
create policy dkd_business_market_products_delete
on public.dkd_business_market_products
for delete
to authenticated
using (
  public.dkd_business_is_member(business_id)
  or coalesce(public.dkd_is_admin(), false)
);

create or replace view public.dkd_business_market_products_public as
select
  dkd_alias_p.id,
  dkd_alias_p.business_id,
  dkd_alias_b.name as business_name,
  dkd_alias_b.city,
  dkd_alias_b.district,
  dkd_alias_p.sku,
  dkd_alias_p.name,
  dkd_alias_p.description,
  dkd_alias_p.image_url,
  dkd_alias_p.category,
  dkd_alias_p.currency_code,
  dkd_alias_p.price_amount,
  dkd_alias_p.discounted_price_amount,
  dkd_alias_p.stock_quantity,
  dkd_alias_p.sort_order,
  dkd_alias_p.meta,
  dkd_alias_p.created_at,
  dkd_alias_p.updated_at
from public.dkd_business_market_products dkd_alias_p
join public.dkd_businesses dkd_alias_b on dkd_alias_b.id = dkd_alias_p.business_id
where dkd_alias_p.is_active = true
  and dkd_alias_b.is_active = true;

grant select on public.dkd_business_market_products_public to authenticated;

create or replace function public.dkd_business_market_product_upsert(
  dkd_param_product_id uuid default null,
  dkd_param_business_id uuid default null,
  dkd_param_name text default null,
  dkd_param_description text default null,
  dkd_param_image_url text default null,
  dkd_param_category text default 'general',
  dkd_param_currency_code text default 'TRY',
  dkd_param_price_amount numeric default 0,
  dkd_param_discounted_price_amount numeric default null,
  dkd_param_stock_quantity integer default 0,
  dkd_param_sort_order integer default 0,
  dkd_param_is_active boolean default true,
  dkd_param_meta jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_business_id uuid;
  dkd_var_product_id uuid;
begin
  if dkd_param_product_id is null and dkd_param_business_id is null then
    raise exception 'business_id_required';
  end if;

  if dkd_param_product_id is not null then
    select business_id into dkd_var_business_id
    from public.dkd_business_market_products
    where id = dkd_param_product_id;
  end if;

  dkd_var_business_id := coalesce(dkd_var_business_id, dkd_param_business_id);

  if dkd_var_business_id is null then
    raise exception 'business_not_found';
  end if;

  if coalesce(public.dkd_is_admin(), false) is not true
     and coalesce(public.dkd_business_is_member(dkd_var_business_id), false) is not true then
    raise exception 'business_membership_required';
  end if;

  if dkd_param_product_id is null then
    insert into public.dkd_business_market_products (
      business_id,
      name,
      description,
      image_url,
      category,
      currency_code,
      price_amount,
      discounted_price_amount,
      stock_quantity,
      sort_order,
      is_active,
      meta
    ) values (
      dkd_var_business_id,
      coalesce(nullif(trim(coalesce(dkd_param_name, '')), ''), 'Yeni Ürün'),
      nullif(trim(coalesce(dkd_param_description, '')), ''),
      nullif(trim(coalesce(dkd_param_image_url, '')), ''),
      coalesce(nullif(trim(coalesce(dkd_param_category, '')), ''), 'general'),
      coalesce(nullif(trim(upper(coalesce(dkd_param_currency_code, 'TRY'))), ''), 'TRY'),
      greatest(coalesce(dkd_param_price_amount, 0), 0),
      case
        when dkd_param_discounted_price_amount is null then null
        else greatest(dkd_param_discounted_price_amount, 0)
      end,
      greatest(coalesce(dkd_param_stock_quantity, 0), 0),
      coalesce(dkd_param_sort_order, 0),
      coalesce(dkd_param_is_active, true),
      coalesce(dkd_param_meta, '{}'::jsonb)
    )
    returning id into dkd_var_product_id;
  else
    update public.dkd_business_market_products
    set
      name = coalesce(nullif(trim(coalesce(dkd_param_name, '')), ''), name),
      description = case when dkd_param_description is null then description else nullif(trim(coalesce(dkd_param_description, '')), '') end,
      image_url = case when dkd_param_image_url is null then image_url else nullif(trim(coalesce(dkd_param_image_url, '')), '') end,
      category = coalesce(nullif(trim(coalesce(dkd_param_category, '')), ''), category),
      currency_code = coalesce(nullif(trim(upper(coalesce(dkd_param_currency_code, ''))), ''), currency_code),
      price_amount = greatest(coalesce(dkd_param_price_amount, price_amount), 0),
      discounted_price_amount = case
        when dkd_param_discounted_price_amount is null then null
        else greatest(dkd_param_discounted_price_amount, 0)
      end,
      stock_quantity = greatest(coalesce(dkd_param_stock_quantity, stock_quantity), 0),
      sort_order = coalesce(dkd_param_sort_order, sort_order),
      is_active = coalesce(dkd_param_is_active, is_active),
      meta = coalesce(dkd_param_meta, meta)
    where id = dkd_param_product_id
    returning id into dkd_var_product_id;
  end if;

  return dkd_var_product_id;
end;
$$;

revoke all on function public.dkd_business_market_product_upsert(uuid, uuid, text, text, text, text, text, numeric, numeric, integer, integer, boolean, jsonb) from public;
grant execute on function public.dkd_business_market_product_upsert(uuid, uuid, text, text, text, text, text, numeric, numeric, integer, integer, boolean, jsonb) to authenticated;

create or replace function public.dkd_business_market_product_archive(
  dkd_param_product_id uuid,
  dkd_param_business_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_business_id uuid;
  dkd_var_product_id uuid;
begin
  select business_id into dkd_var_business_id
  from public.dkd_business_market_products
  where id = dkd_param_product_id;

  dkd_var_business_id := coalesce(dkd_var_business_id, dkd_param_business_id);

  if dkd_var_business_id is null then
    raise exception 'product_not_found';
  end if;

  if coalesce(public.dkd_is_admin(), false) is not true
     and coalesce(public.dkd_business_is_member(dkd_var_business_id), false) is not true then
    raise exception 'business_membership_required';
  end if;

  update public.dkd_business_market_products
  set is_active = false
  where id = dkd_param_product_id
  returning id into dkd_var_product_id;

  return dkd_var_product_id;
end;
$$;

revoke all on function public.dkd_business_market_product_archive(uuid, uuid) from public;
grant execute on function public.dkd_business_market_product_archive(uuid, uuid) to authenticated;

comment on table public.dkd_business_market_products is 'İşletmeye ait ürün kataloğu: isim, açıklama, görsel, fiyat, stok ve görünürlük';
comment on view public.dkd_business_market_products_public is 'Aktif işletme ürün kataloğunun oyuncu/kurye tarafında okunabilir görünümü';

commit;
