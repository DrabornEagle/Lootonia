-- Lootonia merchant market + courier hotfix + storefront catalog
-- Standard: dkd_

create table if not exists public.dkd_business_products (
  id bigserial primary key,
  business_id uuid not null references public.dkd_businesses(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'genel',
  image_url text,
  price_token integer not null default 0,
  price_cash numeric,
  currency_code text not null default 'TRY',
  stock integer not null default 0,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dkd_business_product_orders (
  id bigserial primary key,
  product_id bigint not null references public.dkd_business_products(id) on delete restrict,
  business_id uuid not null references public.dkd_businesses(id) on delete cascade,
  buyer_user_id uuid not null references auth.users(id) on delete cascade,
  quantity integer not null default 1,
  unit_price_token integer not null default 0,
  total_price_token integer not null default 0,
  status text not null default 'paid_token',
  currency_code text not null default 'TOKEN',
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_dkd_business_products_business on public.dkd_business_products(business_id, is_active, sort_order);
create index if not exists idx_dkd_business_products_storefront on public.dkd_business_products(is_active, stock, sort_order);
create index if not exists idx_dkd_business_product_orders_buyer on public.dkd_business_product_orders(buyer_user_id, created_at desc);
create index if not exists idx_dkd_business_product_orders_business on public.dkd_business_product_orders(business_id, created_at desc);

drop trigger if exists dkd_touch_updated_at_business_products on public.dkd_business_products;
create trigger dkd_touch_updated_at_business_products
before update on public.dkd_business_products
for each row execute function public.dkd_touch_updated_at();

drop trigger if exists dkd_touch_updated_at_business_product_orders on public.dkd_business_product_orders;
create trigger dkd_touch_updated_at_business_product_orders
before update on public.dkd_business_product_orders
for each row execute function public.dkd_touch_updated_at();

alter table public.dkd_business_products enable row level security;
alter table public.dkd_business_product_orders enable row level security;

drop policy if exists dkd_business_products_storefront_select on public.dkd_business_products;
create policy dkd_business_products_storefront_select
on public.dkd_business_products
for select
to authenticated
using (
  (
    coalesce(is_active, true) = true
    and coalesce(stock, 0) > 0
  )
  or public.dkd_business_is_member(business_id)
  or coalesce(public.dkd_is_admin(), false)
);

drop policy if exists dkd_business_product_orders_buyer_select on public.dkd_business_product_orders;
create policy dkd_business_product_orders_buyer_select
on public.dkd_business_product_orders
for select
to authenticated
using (
  buyer_user_id = auth.uid()
  or public.dkd_business_is_member(business_id)
  or coalesce(public.dkd_is_admin(), false)
);

grant select on public.dkd_business_products to authenticated;
grant select on public.dkd_business_product_orders to authenticated;

do $$
begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  select 'lootonia-business-product-art', 'lootonia-business-product-art', true, 5242880, array['image/jpeg','image/png','image/webp','image/heic']
  where not exists (select 1 from storage.buckets where id = 'lootonia-business-product-art');
exception when undefined_table then
  null;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'lootonia business product art public read'
  ) then
    create policy "lootonia business product art public read"
    on storage.objects for select
    using (bucket_id = 'lootonia-business-product-art');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'lootonia business product art auth insert'
  ) then
    create policy "lootonia business product art auth insert"
    on storage.objects for insert to authenticated
    with check (bucket_id = 'lootonia-business-product-art');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'lootonia business product art auth update'
  ) then
    create policy "lootonia business product art auth update"
    on storage.objects for update to authenticated
    using (bucket_id = 'lootonia-business-product-art')
    with check (bucket_id = 'lootonia-business-product-art');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'lootonia business product art auth delete'
  ) then
    create policy "lootonia business product art auth delete"
    on storage.objects for delete to authenticated
    using (bucket_id = 'lootonia-business-product-art');
  end if;
end $$;

create or replace function public.dkd_business_product_upsert(
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
  dkd_user_id uuid;
  dkd_target_business_id uuid;
  dkd_product_id bigint;
begin
  dkd_user_id := auth.uid();
  if dkd_user_id is null then
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

  if not (public.dkd_business_is_member(dkd_target_business_id) or coalesce(public.dkd_is_admin(), false)) then
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
      sort_order,
      is_active,
      meta
    ) values (
      dkd_target_business_id,
      coalesce(nullif(trim(dkd_param_title), ''), 'İşletme Ürünü'),
      nullif(trim(coalesce(dkd_param_description, '')), ''),
      coalesce(nullif(trim(dkd_param_category), ''), 'genel'),
      nullif(trim(coalesce(dkd_param_image_url, '')), ''),
      greatest(coalesce(dkd_param_price_token, 0), 0),
      dkd_param_price_cash,
      coalesce(nullif(trim(dkd_param_currency_code), ''), 'TRY'),
      greatest(coalesce(dkd_param_stock, 0), 0),
      greatest(coalesce(dkd_param_sort_order, 0), 0),
      coalesce(dkd_param_is_active, true),
      coalesce(dkd_param_meta, '{}'::jsonb)
    ) returning id into dkd_product_id;
  else
    update public.dkd_business_products
    set
      title = coalesce(nullif(trim(dkd_param_title), ''), title),
      description = case when dkd_param_description is null then description else nullif(trim(dkd_param_description), '') end,
      category = coalesce(nullif(trim(dkd_param_category), ''), category),
      image_url = case when dkd_param_image_url is null then image_url else nullif(trim(dkd_param_image_url), '') end,
      price_token = greatest(coalesce(dkd_param_price_token, 0), 0),
      price_cash = dkd_param_price_cash,
      currency_code = coalesce(nullif(trim(dkd_param_currency_code), ''), currency_code),
      stock = greatest(coalesce(dkd_param_stock, 0), 0),
      sort_order = greatest(coalesce(dkd_param_sort_order, 0), 0),
      is_active = coalesce(dkd_param_is_active, is_active),
      meta = coalesce(dkd_param_meta, meta),
      updated_at = now()
    where id = dkd_param_product_id
    returning id into dkd_product_id;
  end if;

  return dkd_product_id;
end;
$$;

revoke all on function public.dkd_business_product_upsert(bigint, uuid, text, text, text, text, integer, numeric, text, integer, integer, boolean, jsonb) from public;
grant execute on function public.dkd_business_product_upsert(bigint, uuid, text, text, text, text, integer, numeric, text, integer, integer, boolean, jsonb) to authenticated;

create or replace function public.dkd_business_product_delete(
  dkd_param_product_id bigint
)
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

  if not (public.dkd_business_is_member(dkd_target_business_id) or coalesce(public.dkd_is_admin(), false)) then
    raise exception 'business_access_denied';
  end if;

  delete from public.dkd_business_products where id = dkd_param_product_id;
  return true;
end;
$$;

revoke all on function public.dkd_business_product_delete(bigint) from public;
grant execute on function public.dkd_business_product_delete(bigint) to authenticated;

create or replace function public.dkd_business_market_catalog()
returns table (
  id bigint,
  business_id uuid,
  business_name text,
  business_category text,
  title text,
  description text,
  category text,
  image_url text,
  price_token integer,
  price_cash numeric,
  currency_code text,
  stock integer,
  is_active boolean,
  sort_order integer
)
language sql
security definer
set search_path = public
as $$
  select
    dkd_alias_p.id,
    dkd_alias_p.business_id,
    dkd_alias_b.name as business_name,
    dkd_alias_b.category as business_category,
    dkd_alias_p.title,
    dkd_alias_p.description,
    dkd_alias_p.category,
    dkd_alias_p.image_url,
    coalesce(dkd_alias_p.price_token, 0) as price_token,
    dkd_alias_p.price_cash,
    dkd_alias_p.currency_code,
    coalesce(dkd_alias_p.stock, 0) as stock,
    coalesce(dkd_alias_p.is_active, true) as is_active,
    coalesce(dkd_alias_p.sort_order, 0) as sort_order
  from public.dkd_business_products dkd_alias_p
  join public.dkd_businesses dkd_alias_b on dkd_alias_b.id = dkd_alias_p.business_id
  where coalesce(dkd_alias_p.is_active, true) = true
    and coalesce(dkd_alias_p.stock, 0) > 0
    and coalesce(dkd_alias_b.is_active, true) = true
  order by coalesce(dkd_alias_p.sort_order, 0) asc, dkd_alias_p.updated_at desc;
$$;

revoke all on function public.dkd_business_market_catalog() from public;
grant execute on function public.dkd_business_market_catalog() to authenticated;

create or replace function public.dkd_business_product_buy_with_token(
  dkd_param_product_id bigint,
  dkd_param_quantity integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_user_id uuid;
  dkd_qty integer := greatest(coalesce(dkd_param_quantity, 1), 1);
  dkd_product public.dkd_business_products%rowtype;
  dkd_profile public.dkd_profiles%rowtype;
  dkd_business public.dkd_businesses%rowtype;
  dkd_total integer;
  dkd_order_id bigint;
begin
  dkd_user_id := auth.uid();
  if dkd_user_id is null then
    raise exception 'auth_required';
  end if;

  select * into dkd_product
  from public.dkd_business_products
  where id = dkd_param_product_id
  for update;

  if dkd_product.id is null then
    return jsonb_build_object('ok', false, 'reason', 'product_not_found');
  end if;

  if coalesce(dkd_product.is_active, true) is not true then
    return jsonb_build_object('ok', false, 'reason', 'product_inactive');
  end if;

  if coalesce(dkd_product.stock, 0) < dkd_qty then
    return jsonb_build_object('ok', false, 'reason', 'out_of_stock');
  end if;

  select * into dkd_business from public.dkd_businesses where id = dkd_product.business_id limit 1;

  insert into public.dkd_profiles (user_id)
  values (dkd_user_id)
  on conflict (user_id) do nothing;

  select * into dkd_profile
  from public.dkd_profiles
  where user_id = dkd_user_id
  for update;

  dkd_total := greatest(coalesce(dkd_product.price_token, 0), 0) * dkd_qty;
  if coalesce(dkd_profile.token, 0) < dkd_total then
    return jsonb_build_object('ok', false, 'reason', 'not_enough_token');
  end if;

  update public.dkd_profiles
  set token = coalesce(token, 0) - dkd_total,
      updated_at = now()
  where user_id = dkd_user_id;

  update public.dkd_business_products
  set stock = greatest(coalesce(stock, 0) - dkd_qty, 0),
      updated_at = now()
  where id = dkd_product.id;

  insert into public.dkd_business_product_orders (
    product_id,
    business_id,
    buyer_user_id,
    quantity,
    unit_price_token,
    total_price_token,
    status,
    currency_code,
    snapshot
  ) values (
    dkd_product.id,
    dkd_product.business_id,
    dkd_user_id,
    dkd_qty,
    greatest(coalesce(dkd_product.price_token, 0), 0),
    dkd_total,
    'paid_token',
    'TOKEN',
    jsonb_build_object(
      'product_title', dkd_product.title,
      'product_category', dkd_product.category,
      'business_name', dkd_business.name,
      'image_url', dkd_product.image_url
    )
  ) returning id into dkd_order_id;

  return jsonb_build_object(
    'ok', true,
    'order_id', dkd_order_id,
    'product_id', dkd_product.id,
    'product_name', dkd_product.title,
    'business_name', coalesce(dkd_business.name, 'İşletme'),
    'spent_token', dkd_total,
    'price_token', greatest(coalesce(dkd_product.price_token, 0), 0),
    'quantity', dkd_qty,
    'reward_label', coalesce(dkd_business.name, 'İşletme') || ' • ' || coalesce(dkd_product.title, 'Ürün') || ' satın alındı.'
  );
end;
$$;

revoke all on function public.dkd_business_product_buy_with_token(bigint, integer) from public;
grant execute on function public.dkd_business_product_buy_with_token(bigint, integer) to authenticated;

create or replace function public.dkd_courier_jobs_for_me()
returns table (
  id bigint,
  title text,
  pickup text,
  dropoff text,
  reward_score integer,
  distance_km numeric,
  eta_min integer,
  job_type text,
  is_active boolean,
  status text,
  assigned_user_id uuid,
  accepted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
  dkd_var_courier_status text;
begin
  dkd_var_user_id := auth.uid();
  if dkd_var_user_id is null then
    raise exception 'auth_required';
  end if;

  select coalesce(courier_status, 'none')
  into dkd_var_courier_status
  from public.dkd_profiles
  where user_id = dkd_var_user_id
  limit 1;

  if coalesce(dkd_var_courier_status, 'none') <> 'approved' then
    return;
  end if;

  return query
  select
    j.id,
    j.title,
    j.pickup,
    j.dropoff,
    coalesce(j.reward_score, 0),
    coalesce(j.distance_km, 0),
    coalesce(j.eta_min, 0),
    coalesce(j.job_type, 'food'),
    coalesce(j.is_active, true),
    coalesce(j.status, 'open'),
    j.assigned_user_id,
    j.accepted_at,
    j.completed_at,
    j.created_at,
    j.updated_at
  from public.dkd_courier_jobs j
  where coalesce(j.is_active, true) = true
    and (
      coalesce(j.status, 'open') = 'open'
      or j.assigned_user_id = dkd_var_user_id
    )
  order by
    case
      when j.assigned_user_id = dkd_var_user_id and coalesce(j.status, 'open') = 'accepted' then 0
      when coalesce(j.status, 'open') = 'open' then 1
      when j.assigned_user_id = dkd_var_user_id and coalesce(j.status, 'open') = 'completed' then 2
      else 3
    end,
    j.created_at desc;
end;
$$;

revoke all on function public.dkd_courier_jobs_for_me() from public;
grant execute on function public.dkd_courier_jobs_for_me() to authenticated;
