-- Lootonia phase fix pack
-- Standard: dkd_
-- Kapsam:
-- 1) Liderlik loop/hata tarafi icin eksik SQL nesneleri
-- 2) Kurye paneli eksik tablo/RPC nesneleri
-- 3) Isletme market urunleri + token ile satin alma

create extension if not exists pgcrypto;

create or replace function public.dkd_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ------------------------------
-- CHEST HISTORY + LEADERBOARD
-- ------------------------------
do $$
begin
  if to_regclass('public.dkd_chest_history') is null then
    execute $ct$
      create table public.dkd_chest_history (
        id bigserial primary key,
        user_id uuid not null references auth.users(id) on delete cascade,
        drop_id bigint,
        drop_type text,
        card_def_id bigint,
        gained_token integer not null default 0,
        boss_damage integer not null default 0,
        meta jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    $ct$;
  end if;
end $$;

alter table if exists public.dkd_chest_history add column if not exists gained_token integer not null default 0;
alter table if exists public.dkd_chest_history add column if not exists boss_damage integer not null default 0;
alter table if exists public.dkd_chest_history add column if not exists updated_at timestamptz not null default now();
create index if not exists idx_dkd_chest_history_user_created on public.dkd_chest_history(user_id, created_at desc);
create index if not exists idx_dkd_chest_history_created on public.dkd_chest_history(created_at desc);

drop trigger if exists dkd_touch_updated_at_chest_history on public.dkd_chest_history;
create trigger dkd_touch_updated_at_chest_history
before update on public.dkd_chest_history
for each row execute function public.dkd_touch_updated_at();

create table if not exists public.dkd_weekly_leaderboard_cache (
  id bigserial primary key,
  metric text not null,
  week_start date not null,
  closed boolean not null default false,
  rows jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(metric, week_start)
);

create table if not exists public.dkd_weekly_reward_claims (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  metric text not null,
  week_start date not null,
  rank integer not null,
  reward_token integer not null default 0,
  reward_energy integer not null default 0,
  created_at timestamptz not null default now(),
  unique(user_id, metric, week_start)
);

create index if not exists idx_dkd_weekly_cache_metric_week on public.dkd_weekly_leaderboard_cache(metric, week_start desc);
create index if not exists idx_dkd_weekly_reward_claims_user on public.dkd_weekly_reward_claims(user_id, week_start desc);

drop trigger if exists dkd_touch_updated_at_weekly_cache on public.dkd_weekly_leaderboard_cache;
create trigger dkd_touch_updated_at_weekly_cache
before update on public.dkd_weekly_leaderboard_cache
for each row execute function public.dkd_touch_updated_at();

create or replace function public.dkd_week_start_from_offset(dkd_param_week_offset integer default 0)
returns date
language sql
stable
as $$
  select (date_trunc('week', now() at time zone 'utc')::date + ((coalesce(dkd_param_week_offset, 0)) * interval '7 day'))::date;
$$;

create or replace function public.dkd_compute_weekly_rows(
  dkd_param_metric text default 'token',
  dkd_param_week_start date default public.dkd_week_start_from_offset(0),
  dkd_param_limit integer default 25
)
returns jsonb
language sql
stable
as $$
with bounds as (
  select dkd_param_week_start::timestamptz as week_start_ts,
         (dkd_param_week_start::timestamptz + interval '7 day') as week_end_ts
),
scored as (
  select
    dkd_alias_h.user_id,
    max(coalesce(dkd_alias_p.nickname, split_part(dkd_alias_h.user_id::text, '-', 1))) as nickname,
    sum(
      case
        when lower(coalesce(dkd_param_metric, 'token')) = 'boss' then coalesce(dkd_alias_h.boss_damage, 0)
        else coalesce(dkd_alias_h.gained_token, 0)
      end
    )::integer as value
  from public.dkd_chest_history dkd_alias_h
  join bounds dkd_alias_b on dkd_alias_h.created_at >= dkd_alias_b.week_start_ts and dkd_alias_h.created_at < dkd_alias_b.week_end_ts
  left join public.dkd_profiles dkd_alias_p on dkd_alias_p.user_id = dkd_alias_h.user_id
  group by dkd_alias_h.user_id
),
ranked as (
  select
    row_number() over (order by s.value desc, s.user_id asc)::integer as rank,
    s.user_id,
    s.nickname,
    s.value
  from scored s
  where s.value > 0
  order by s.value desc, s.user_id asc
  limit greatest(coalesce(dkd_param_limit, 25), 1)
)
select coalesce(
  jsonb_agg(
    jsonb_build_object(
      'rank', rank,
      'user_id', user_id,
      'nickname', nickname,
      'value', value
    )
    order by rank asc
  ),
  '[]'::jsonb
)
from ranked;
$$;

create or replace function public.dkd_get_weekly_leaderboard2(
  dkd_param_metric text default 'token',
  dkd_param_limit integer default 25,
  dkd_param_week_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_week_start date := public.dkd_week_start_from_offset(coalesce(dkd_param_week_offset, 0));
  dkd_rows jsonb := '[]'::jsonb;
  dkd_closed boolean := false;
begin
  select rows, closed
    into dkd_rows, dkd_closed
  from public.dkd_weekly_leaderboard_cache
  where metric = lower(coalesce(dkd_param_metric, 'token'))
    and week_start = dkd_week_start
  limit 1;

  if dkd_rows is null then
    dkd_rows := public.dkd_compute_weekly_rows(lower(coalesce(dkd_param_metric, 'token')), dkd_week_start, greatest(coalesce(dkd_param_limit, 25), 1));
  end if;

  return jsonb_build_object(
    'week_start', dkd_week_start,
    'closed', coalesce(dkd_closed, false),
    'rows', coalesce(dkd_rows, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.dkd_get_weekly_leaderboard2(text, integer, integer) from public;
grant execute on function public.dkd_get_weekly_leaderboard2(text, integer, integer) to authenticated;

create or replace function public.dkd_admin_close_week(
  dkd_param_week_offset integer default -1,
  dkd_param_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_week_start date := public.dkd_week_start_from_offset(coalesce(dkd_param_week_offset, -1));
  dkd_rows jsonb;
  dkd_already_closed boolean := false;
begin
  if coalesce(public.dkd_is_admin(), false) is not true then
    raise exception 'not_admin';
  end if;

  select closed into dkd_already_closed
  from public.dkd_weekly_leaderboard_cache
  where metric = 'token' and week_start = dkd_week_start
  limit 1;

  for dkd_rows in
    select public.dkd_compute_weekly_rows(metric, dkd_week_start, greatest(coalesce(dkd_param_limit, 50), 1))
    from (values ('token'::text), ('boss'::text)) as m(metric)
  loop
    null;
  end loop;

  insert into public.dkd_weekly_leaderboard_cache(metric, week_start, closed, rows, updated_at)
  values ('token', dkd_week_start, true, public.dkd_compute_weekly_rows('token', dkd_week_start, greatest(coalesce(dkd_param_limit, 50), 1)), now())
  on conflict (metric, week_start)
  do update set closed = true, rows = excluded.rows, updated_at = now();

  insert into public.dkd_weekly_leaderboard_cache(metric, week_start, closed, rows, updated_at)
  values ('boss', dkd_week_start, true, public.dkd_compute_weekly_rows('boss', dkd_week_start, greatest(coalesce(dkd_param_limit, 50), 1)), now())
  on conflict (metric, week_start)
  do update set closed = true, rows = excluded.rows, updated_at = now();

  return jsonb_build_object('ok', true, 'already_closed', coalesce(dkd_already_closed, false), 'week_start', dkd_week_start);
end;
$$;

revoke all on function public.dkd_admin_close_week(integer, integer) from public;
grant execute on function public.dkd_admin_close_week(integer, integer) to authenticated;

create or replace function public.dkd_claim_weekly_top_reward(
  dkd_param_metric text default 'token'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_user_id uuid := auth.uid();
  dkd_metric text := lower(coalesce(dkd_param_metric, 'token'));
  dkd_week_start date := public.dkd_week_start_from_offset(-1);
  dkd_rows jsonb;
  dkd_row jsonb;
  dkd_rank integer;
  dkd_reward_token integer := 0;
  dkd_reward_energy integer := 0;
begin
  if dkd_user_id is null then
    raise exception 'auth_required';
  end if;

  select rows into dkd_rows
  from public.dkd_weekly_leaderboard_cache
  where metric = dkd_metric and week_start = dkd_week_start
  limit 1;

  if dkd_rows is null then
    insert into public.dkd_weekly_leaderboard_cache(metric, week_start, closed, rows)
    values (dkd_metric, dkd_week_start, true, public.dkd_compute_weekly_rows(dkd_metric, dkd_week_start, 50))
    on conflict (metric, week_start)
    do update set closed = true, rows = excluded.rows, updated_at = now();

    select rows into dkd_rows
    from public.dkd_weekly_leaderboard_cache
    where metric = dkd_metric and week_start = dkd_week_start
    limit 1;
  end if;

  select elem into dkd_row
  from jsonb_array_elements(coalesce(dkd_rows, '[]'::jsonb)) elem
  where elem ->> 'user_id' = dkd_user_id::text
  limit 1;

  if dkd_row is null then
    return jsonb_build_object('ok', false, 'reason', 'not_in_top10');
  end if;

  dkd_rank := coalesce((dkd_row ->> 'rank')::integer, 9999);
  if dkd_rank > 10 then
    return jsonb_build_object('ok', false, 'reason', 'not_in_top10', 'rank', dkd_rank);
  end if;

  if exists (
    select 1 from public.dkd_weekly_reward_claims
    where user_id = dkd_user_id and metric = dkd_metric and week_start = dkd_week_start
  ) then
    return jsonb_build_object('ok', false, 'reason', 'already_claimed', 'rank', dkd_rank);
  end if;

  if dkd_rank = 1 then
    dkd_reward_token := 1500; dkd_reward_energy := 10;
  elsif dkd_rank = 2 then
    dkd_reward_token := 1000; dkd_reward_energy := 6;
  elsif dkd_rank = 3 then
    dkd_reward_token := 750; dkd_reward_energy := 4;
  else
    dkd_reward_token := 300; dkd_reward_energy := 0;
  end if;

  update public.dkd_profiles
  set token = coalesce(token, 0) + dkd_reward_token,
      energy = least(coalesce(energy_max, 20), coalesce(energy, 0) + dkd_reward_energy),
      updated_at = now()
  where user_id = dkd_user_id;

  insert into public.dkd_weekly_reward_claims(user_id, metric, week_start, rank, reward_token, reward_energy)
  values (dkd_user_id, dkd_metric, dkd_week_start, dkd_rank, dkd_reward_token, dkd_reward_energy);

  return jsonb_build_object(
    'ok', true,
    'rank', dkd_rank,
    'reward_token', dkd_reward_token,
    'reward_energy', dkd_reward_energy
  );
end;
$$;

revoke all on function public.dkd_claim_weekly_top_reward(text) from public;
grant execute on function public.dkd_claim_weekly_top_reward(text) to authenticated;

-- ------------------------------
-- COURIER
-- ------------------------------
create table if not exists public.dkd_courier_jobs (
  id bigserial primary key,
  title text not null default 'Teslimat',
  pickup text,
  dropoff text,
  reward_score integer not null default 12,
  distance_km numeric not null default 1.0,
  eta_min integer not null default 15,
  job_type text not null default 'food',
  is_active boolean not null default true,
  status text not null default 'open',
  assigned_user_id uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_dkd_courier_jobs_status on public.dkd_courier_jobs(status);
create index if not exists idx_dkd_courier_jobs_assigned on public.dkd_courier_jobs(assigned_user_id);
create index if not exists idx_dkd_courier_jobs_active on public.dkd_courier_jobs(is_active);

drop trigger if exists dkd_touch_updated_at_courier_jobs on public.dkd_courier_jobs;
create trigger dkd_touch_updated_at_courier_jobs
before update on public.dkd_courier_jobs
for each row execute function public.dkd_touch_updated_at();

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
  status text,
  assigned_user_id uuid,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    j.id,
    j.title,
    j.pickup,
    j.dropoff,
    j.reward_score,
    j.distance_km,
    j.eta_min,
    j.job_type,
    j.status,
    j.assigned_user_id,
    j.created_at
  from public.dkd_courier_jobs j
  where j.is_active = true
    and (
      j.status = 'open'
      or j.assigned_user_id = auth.uid()
    )
  order by case when j.status = 'accepted' and j.assigned_user_id = auth.uid() then 0 else 1 end, j.created_at desc;
$$;

revoke all on function public.dkd_courier_jobs_for_me() from public;
grant execute on function public.dkd_courier_jobs_for_me() to authenticated;

create or replace function public.dkd_courier_job_accept(dkd_param_job_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_user_id uuid := auth.uid();
  dkd_job public.dkd_courier_jobs%rowtype;
begin
  if dkd_user_id is null then
    raise exception 'auth_required';
  end if;

  update public.dkd_courier_jobs
  set status = 'accepted', assigned_user_id = dkd_user_id, accepted_at = now(), updated_at = now()
  where id = dkd_param_job_id and status = 'open' and is_active = true
  returning * into dkd_job;

  if dkd_job.id is null then
    return jsonb_build_object('ok', false, 'reason', 'job_not_open');
  end if;

  return jsonb_build_object('ok', true, 'job_id', dkd_job.id);
end;
$$;

revoke all on function public.dkd_courier_job_accept(bigint) from public;
grant execute on function public.dkd_courier_job_accept(bigint) to authenticated;

create or replace function public.dkd_courier_job_complete(dkd_param_job_id bigint)
returns table(courier_score integer, courier_completed_jobs integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_user_id uuid := auth.uid();
  dkd_reward integer := 0;
begin
  if dkd_user_id is null then
    raise exception 'auth_required';
  end if;

  update public.dkd_courier_jobs
  set status = 'completed', completed_at = now(), updated_at = now()
  where id = dkd_param_job_id and assigned_user_id = dkd_user_id and status in ('open', 'accepted') and is_active = true
  returning reward_score into dkd_reward;

  if dkd_reward is null then
    return;
  end if;

  update public.dkd_profiles
  set courier_status = case when courier_status = 'none' then 'approved' else courier_status end,
      courier_score = coalesce(courier_score, 0) + greatest(coalesce(dkd_reward, 0), 0),
      courier_completed_jobs = coalesce(courier_completed_jobs, 0) + 1,
      updated_at = now()
  where user_id = dkd_user_id;

  return query
  select coalesce(dkd_alias_p.courier_score, 0), coalesce(dkd_alias_p.courier_completed_jobs, 0)
  from public.dkd_profiles dkd_alias_p
  where dkd_alias_p.user_id = dkd_user_id;
end;
$$;

revoke all on function public.dkd_courier_job_complete(bigint) from public;
grant execute on function public.dkd_courier_job_complete(bigint) to authenticated;

insert into public.dkd_courier_jobs (title, pickup, dropoff, reward_score, distance_km, eta_min, job_type, is_active, status)
select 'Göksu Cafe paket teslimi', 'Göksu Cafe', 'Eryaman Teslimat Bölgesi', 12, 2.4, 18, 'food', true, 'open'
where not exists (select 1 from public.dkd_courier_jobs);

-- ------------------------------
-- BUSINESS MARKET
-- ------------------------------
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
for select to authenticated
using (((coalesce(is_active, true) = true and coalesce(stock, 0) > 0) or public.dkd_business_is_member(business_id) or coalesce(public.dkd_is_admin(), false)));

drop policy if exists dkd_business_product_orders_select on public.dkd_business_product_orders;
create policy dkd_business_product_orders_select
on public.dkd_business_product_orders
for select to authenticated
using (buyer_user_id = auth.uid() or public.dkd_business_is_member(business_id) or coalesce(public.dkd_is_admin(), false));

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
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'lootonia business product art public read') then
    create policy "lootonia business product art public read"
    on storage.objects for select
    using (bucket_id = 'lootonia-business-product-art');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'lootonia business product art auth insert') then
    create policy "lootonia business product art auth insert"
    on storage.objects for insert to authenticated
    with check (bucket_id = 'lootonia-business-product-art');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'lootonia business product art auth update') then
    create policy "lootonia business product art auth update"
    on storage.objects for update to authenticated
    using (bucket_id = 'lootonia-business-product-art')
    with check (bucket_id = 'lootonia-business-product-art');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'lootonia business product art auth delete') then
    create policy "lootonia business product art auth delete"
    on storage.objects for delete to authenticated
    using (bucket_id = 'lootonia-business-product-art');
  end if;
exception when undefined_table then
  null;
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
  dkd_target_business_id uuid;
  dkd_product_id bigint;
begin
  if auth.uid() is null then
    raise exception 'auth_required';
  end if;

  dkd_target_business_id := dkd_param_business_id;
  if dkd_target_business_id is null and dkd_param_product_id is not null then
    select business_id into dkd_target_business_id from public.dkd_business_products where id = dkd_param_product_id;
  end if;

  if dkd_target_business_id is null then
    raise exception 'business_required';
  end if;

  if not (public.dkd_business_is_member(dkd_target_business_id) or coalesce(public.dkd_is_admin(), false)) then
    raise exception 'business_access_denied';
  end if;

  if dkd_param_product_id is null then
    insert into public.dkd_business_products (
      business_id, title, description, category, image_url, price_token, price_cash, currency_code, stock, sort_order, is_active, meta
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
    set title = coalesce(nullif(trim(dkd_param_title), ''), title),
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

create or replace function public.dkd_business_product_delete(dkd_param_product_id bigint)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_target_business_id uuid;
begin
  select business_id into dkd_target_business_id from public.dkd_business_products where id = dkd_param_product_id;
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
  title text,
  description text,
  category text,
  image_url text,
  price_token integer,
  price_cash numeric,
  currency_code text,
  stock integer,
  is_active boolean,
  sort_order integer,
  business_name text,
  business_category text
)
language sql
security definer
set search_path = public
as $$
  select
    dkd_alias_p.id,
    dkd_alias_p.business_id,
    dkd_alias_p.title,
    dkd_alias_p.description,
    dkd_alias_p.category,
    dkd_alias_p.image_url,
    dkd_alias_p.price_token,
    dkd_alias_p.price_cash,
    dkd_alias_p.currency_code,
    dkd_alias_p.stock,
    dkd_alias_p.is_active,
    dkd_alias_p.sort_order,
    dkd_alias_b.name as business_name,
    dkd_alias_b.category as business_category
  from public.dkd_business_products dkd_alias_p
  join public.dkd_businesses dkd_alias_b on dkd_alias_b.id = dkd_alias_p.business_id
  where dkd_alias_p.is_active = true
    and coalesce(dkd_alias_p.stock, 0) > 0
  order by dkd_alias_p.sort_order asc, dkd_alias_p.updated_at desc;
$$;

revoke all on function public.dkd_business_market_catalog() from public;
grant execute on function public.dkd_business_market_catalog() to authenticated;

create or replace function public.dkd_business_product_buy_with_token(dkd_param_product_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_user_id uuid := auth.uid();
  dkd_product public.dkd_business_products%rowtype;
  dkd_profile public.dkd_profiles%rowtype;
  dkd_business_name text;
  dkd_order_id bigint;
begin
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
  if dkd_product.is_active is not true then
    return jsonb_build_object('ok', false, 'reason', 'product_inactive');
  end if;
  if coalesce(dkd_product.stock, 0) <= 0 then
    return jsonb_build_object('ok', false, 'reason', 'out_of_stock');
  end if;

  select * into dkd_profile
  from public.dkd_profiles
  where user_id = dkd_user_id
  for update;

  if dkd_profile.user_id is null then
    raise exception 'profile_missing';
  end if;
  if coalesce(dkd_profile.token, 0) < coalesce(dkd_product.price_token, 0) then
    return jsonb_build_object('ok', false, 'reason', 'not_enough_token');
  end if;

  update public.dkd_profiles
  set token = greatest(coalesce(token, 0) - coalesce(dkd_product.price_token, 0), 0),
      updated_at = now()
  where user_id = dkd_user_id;

  update public.dkd_business_products
  set stock = greatest(coalesce(stock, 0) - 1, 0),
      updated_at = now()
  where id = dkd_product.id;

  select name into dkd_business_name
  from public.dkd_businesses
  where id = dkd_product.business_id;

  insert into public.dkd_business_product_orders (
    product_id, business_id, buyer_user_id, quantity, unit_price_token, total_price_token, status, currency_code, snapshot
  ) values (
    dkd_product.id,
    dkd_product.business_id,
    dkd_user_id,
    1,
    coalesce(dkd_product.price_token, 0),
    coalesce(dkd_product.price_token, 0),
    'paid_token',
    'TOKEN',
    jsonb_build_object(
      'title', dkd_product.title,
      'category', dkd_product.category,
      'image_url', dkd_product.image_url,
      'business_name', dkd_business_name
    )
  ) returning id into dkd_order_id;

  return jsonb_build_object(
    'ok', true,
    'order_id', dkd_order_id,
    'spent_token', coalesce(dkd_product.price_token, 0),
    'reward_label', coalesce(dkd_product.title, 'İşletme ürünü'),
    'product_title', coalesce(dkd_product.title, 'İşletme ürünü'),
    'business_name', coalesce(dkd_business_name, 'İşletme'),
    'remaining_stock', greatest(coalesce(dkd_product.stock, 0) - 1, 0)
  );
end;
$$;

revoke all on function public.dkd_business_product_buy_with_token(bigint) from public;
grant execute on function public.dkd_business_product_buy_with_token(bigint) to authenticated;
