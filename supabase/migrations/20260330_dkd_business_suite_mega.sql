begin;

create table if not exists public.dkd_businesses (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  name text not null,
  category text not null default 'general',
  city text not null default 'Ankara',
  address_text text,
  sponsor_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dkd_business_memberships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.dkd_businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_key text not null default 'manager',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create table if not exists public.dkd_business_drop_links (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.dkd_businesses(id) on delete cascade,
  drop_id uuid not null references public.dkd_drops(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (business_id, drop_id),
  unique (drop_id)
);

create table if not exists public.dkd_business_campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.dkd_businesses(id) on delete cascade,
  title text not null,
  sponsor_name text,
  stock_limit integer not null default 0,
  redeemed_count integer not null default 0,
  closes_at timestamptz,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dkd_business_qr_scans (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.dkd_businesses(id) on delete cascade,
  player_id uuid references auth.users(id) on delete set null,
  drop_id uuid references public.dkd_drops(id) on delete set null,
  source_type text not null default 'qr',
  task_key text,
  qr_token text,
  code_value text,
  boss_reward boolean not null default false,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.dkd_business_coupon_uses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.dkd_businesses(id) on delete cascade,
  player_id uuid references auth.users(id) on delete set null,
  campaign_id uuid references public.dkd_business_campaigns(id) on delete set null,
  coupon_code text,
  task_key text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_dkd_businesses_active on public.dkd_businesses(is_active);
create index if not exists idx_dkd_business_memberships_user on public.dkd_business_memberships(user_id, is_active);
create index if not exists idx_dkd_business_drop_links_drop on public.dkd_business_drop_links(drop_id);
create index if not exists idx_dkd_business_campaigns_business on public.dkd_business_campaigns(business_id, is_active, updated_at desc);
create index if not exists idx_dkd_business_qr_scans_business_created on public.dkd_business_qr_scans(business_id, created_at desc);
create index if not exists idx_dkd_business_qr_scans_task on public.dkd_business_qr_scans(business_id, task_key, created_at desc);
create index if not exists idx_dkd_business_coupon_uses_business_created on public.dkd_business_coupon_uses(business_id, created_at desc);

create or replace function public.dkd_business_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_dkd_businesses_updated_at on public.dkd_businesses;
create trigger trg_dkd_businesses_updated_at
before update on public.dkd_businesses
for each row
execute function public.dkd_business_touch_updated_at();

drop trigger if exists trg_dkd_business_memberships_updated_at on public.dkd_business_memberships;
create trigger trg_dkd_business_memberships_updated_at
before update on public.dkd_business_memberships
for each row
execute function public.dkd_business_touch_updated_at();

drop trigger if exists trg_dkd_business_campaigns_updated_at on public.dkd_business_campaigns;
create trigger trg_dkd_business_campaigns_updated_at
before update on public.dkd_business_campaigns
for each row
execute function public.dkd_business_touch_updated_at();

create or replace function public.dkd_business_upsert_campaign(
  dkd_param_business_id uuid,
  dkd_param_title text,
  dkd_param_sponsor_name text default null,
  dkd_param_stock_limit integer default 0,
  dkd_param_closes_at timestamptz default null,
  dkd_param_starts_at timestamptz default null,
  dkd_param_ends_at timestamptz default null,
  dkd_param_is_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_id uuid;
begin
  if coalesce(public.dkd_is_admin(), false) is not true then
    raise exception 'admin_required';
  end if;

  insert into public.dkd_business_campaigns (
    business_id,
    title,
    sponsor_name,
    stock_limit,
    closes_at,
    starts_at,
    ends_at,
    is_active
  ) values (
    dkd_param_business_id,
    dkd_param_title,
    nullif(trim(coalesce(dkd_param_sponsor_name, '')), ''),
    greatest(coalesce(dkd_param_stock_limit, 0), 0),
    dkd_param_closes_at,
    dkd_param_starts_at,
    dkd_param_ends_at,
    coalesce(dkd_param_is_active, true)
  )
  returning id into dkd_var_id;

  return dkd_var_id;
end;
$$;

create or replace function public.dkd_business_qr_scan_log(
  dkd_param_business_id uuid,
  dkd_param_player_id uuid default null,
  dkd_param_drop_id uuid default null,
  dkd_param_source_type text default 'qr',
  dkd_param_task_key text default null,
  dkd_param_qr_token text default null,
  dkd_param_code_value text default null,
  dkd_param_boss_reward boolean default false,
  dkd_param_meta jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_id uuid;
begin
  insert into public.dkd_business_qr_scans (
    business_id,
    player_id,
    drop_id,
    source_type,
    task_key,
    qr_token,
    code_value,
    boss_reward,
    meta
  ) values (
    dkd_param_business_id,
    case when dkd_param_player_id = auth.uid() or coalesce(public.dkd_is_admin(), false) then dkd_param_player_id else auth.uid() end,
    dkd_param_drop_id,
    coalesce(nullif(trim(coalesce(dkd_param_source_type, '')), ''), 'qr'),
    nullif(trim(coalesce(dkd_param_task_key, '')), ''),
    nullif(trim(coalesce(dkd_param_qr_token, '')), ''),
    nullif(trim(coalesce(dkd_param_code_value, '')), ''),
    coalesce(dkd_param_boss_reward, false),
    coalesce(dkd_param_meta, '{}'::jsonb)
  )
  returning id into dkd_var_id;

  return dkd_var_id;
end;
$$;

create or replace function public.dkd_business_coupon_use_log(
  dkd_param_business_id uuid,
  dkd_param_player_id uuid default null,
  dkd_param_coupon_code text default null,
  dkd_param_task_key text default null,
  dkd_param_campaign_id uuid default null,
  dkd_param_meta jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_id uuid;
begin
  insert into public.dkd_business_coupon_uses (
    business_id,
    player_id,
    campaign_id,
    coupon_code,
    task_key,
    meta
  ) values (
    dkd_param_business_id,
    case when dkd_param_player_id = auth.uid() or coalesce(public.dkd_is_admin(), false) then dkd_param_player_id else auth.uid() end,
    dkd_param_campaign_id,
    nullif(trim(coalesce(dkd_param_coupon_code, '')), ''),
    nullif(trim(coalesce(dkd_param_task_key, '')), ''),
    coalesce(dkd_param_meta, '{}'::jsonb)
  )
  returning id into dkd_var_id;

  return dkd_var_id;
end;
$$;

drop view if exists public.dkd_business_today_metrics;
create view public.dkd_business_today_metrics as
with scan_day as (
  select
    business_id,
    (created_at at time zone 'UTC')::date as bucket_day,
    count(*)::int as scan_count,
    count(distinct player_id)::int as unique_players
  from public.dkd_business_qr_scans
  group by business_id, (created_at at time zone 'UTC')::date
),
coupon_day as (
  select
    business_id,
    (created_at at time zone 'UTC')::date as bucket_day,
    count(*)::int as coupon_count
  from public.dkd_business_coupon_uses
  group by business_id, (created_at at time zone 'UTC')::date
)
select
  coalesce(s.business_id, dkd_alias_c.business_id) as business_id,
  coalesce(s.bucket_day, dkd_alias_c.bucket_day) as bucket_day,
  coalesce(s.unique_players, 0) as unique_players,
  coalesce(s.scan_count, 0) as scan_count,
  coalesce(dkd_alias_c.coupon_count, 0) as coupon_count,
  case
    when coalesce(s.scan_count, 0) <= 0 then 0::numeric
    else round((coalesce(dkd_alias_c.coupon_count, 0)::numeric / s.scan_count::numeric) * 100.0, 1)
  end as conversion_rate_pct
from scan_day s
full outer join coupon_day dkd_alias_c
  on dkd_alias_c.business_id = s.business_id
 and dkd_alias_c.bucket_day = s.bucket_day;

drop view if exists public.dkd_business_hourly_heatmap;
create view public.dkd_business_hourly_heatmap as
select
  business_id,
  (created_at at time zone 'UTC')::date as bucket_day,
  extract(hour from created_at at time zone 'UTC')::int as hour_slot,
  count(*)::int as scan_count
from public.dkd_business_qr_scans
group by business_id, (created_at at time zone 'UTC')::date, extract(hour from created_at at time zone 'UTC')::int;

drop view if exists public.dkd_business_task_attribution;
create view public.dkd_business_task_attribution as
select
  business_id,
  (created_at at time zone 'UTC')::date as bucket_day,
  coalesce(nullif(trim(task_key), ''), 'organik') as task_key,
  count(*)::int as scan_count
from public.dkd_business_qr_scans
group by business_id, (created_at at time zone 'UTC')::date, coalesce(nullif(trim(task_key), ''), 'organik');

drop view if exists public.dkd_business_dashboard_snapshot;
create view public.dkd_business_dashboard_snapshot as
select
  dkd_alias_b.id as business_id,
  dkd_alias_b.name,
  dkd_alias_b.category,
  dkd_alias_b.city,
  m.bucket_day,
  m.unique_players,
  m.scan_count,
  m.coupon_count,
  m.conversion_rate_pct
from public.dkd_businesses dkd_alias_b
left join public.dkd_business_today_metrics m
  on m.business_id = dkd_alias_b.id
 and m.bucket_day = ((now() at time zone 'UTC')::date);

grant usage on schema public to authenticated;
grant select on public.dkd_businesses to authenticated;
grant select on public.dkd_business_memberships to authenticated;
grant select on public.dkd_business_drop_links to authenticated;
grant select on public.dkd_business_campaigns to authenticated;
grant select on public.dkd_business_qr_scans to authenticated;
grant select on public.dkd_business_coupon_uses to authenticated;
grant select on public.dkd_business_today_metrics to authenticated;
grant select on public.dkd_business_hourly_heatmap to authenticated;
grant select on public.dkd_business_task_attribution to authenticated;
grant select on public.dkd_business_dashboard_snapshot to authenticated;
grant insert, update, delete on public.dkd_business_campaigns to authenticated;
grant insert on public.dkd_business_qr_scans to authenticated;
grant insert on public.dkd_business_coupon_uses to authenticated;
grant execute on function public.dkd_business_upsert_campaign(uuid, text, text, integer, timestamptz, timestamptz, timestamptz, boolean) to authenticated;
grant execute on function public.dkd_business_qr_scan_log(uuid, uuid, uuid, text, text, text, text, boolean, jsonb) to authenticated;
grant execute on function public.dkd_business_coupon_use_log(uuid, uuid, text, text, uuid, jsonb) to authenticated;

alter table public.dkd_businesses enable row level security;
alter table public.dkd_business_memberships enable row level security;
alter table public.dkd_business_drop_links enable row level security;
alter table public.dkd_business_campaigns enable row level security;
alter table public.dkd_business_qr_scans enable row level security;
alter table public.dkd_business_coupon_uses enable row level security;

drop policy if exists dkd_businesses_select_active_or_admin on public.dkd_businesses;
create policy dkd_businesses_select_active_or_admin
on public.dkd_businesses
for select
using (is_active = true or public.dkd_is_admin());

drop policy if exists dkd_businesses_admin_write on public.dkd_businesses;
create policy dkd_businesses_admin_write
on public.dkd_businesses
for all
using (public.dkd_is_admin())
with check (public.dkd_is_admin());

drop policy if exists dkd_business_memberships_self_or_admin on public.dkd_business_memberships;
create policy dkd_business_memberships_self_or_admin
on public.dkd_business_memberships
for select
using (user_id = auth.uid() or public.dkd_is_admin());

drop policy if exists dkd_business_memberships_admin_write on public.dkd_business_memberships;
create policy dkd_business_memberships_admin_write
on public.dkd_business_memberships
for all
using (public.dkd_is_admin())
with check (public.dkd_is_admin());

drop policy if exists dkd_business_drop_links_select on public.dkd_business_drop_links;
create policy dkd_business_drop_links_select
on public.dkd_business_drop_links
for select
using (true);

drop policy if exists dkd_business_drop_links_admin_write on public.dkd_business_drop_links;
create policy dkd_business_drop_links_admin_write
on public.dkd_business_drop_links
for all
using (public.dkd_is_admin())
with check (public.dkd_is_admin());

drop policy if exists dkd_business_campaigns_select on public.dkd_business_campaigns;
create policy dkd_business_campaigns_select
on public.dkd_business_campaigns
for select
using (public.dkd_is_admin());

drop policy if exists dkd_business_campaigns_admin_write on public.dkd_business_campaigns;
create policy dkd_business_campaigns_admin_write
on public.dkd_business_campaigns
for all
using (public.dkd_is_admin())
with check (public.dkd_is_admin());

drop policy if exists dkd_business_qr_scans_select_admin on public.dkd_business_qr_scans;
create policy dkd_business_qr_scans_select_admin
on public.dkd_business_qr_scans
for select
using (public.dkd_is_admin());

drop policy if exists dkd_business_qr_scans_insert_owner_or_admin on public.dkd_business_qr_scans;
create policy dkd_business_qr_scans_insert_owner_or_admin
on public.dkd_business_qr_scans
for insert
with check (player_id = auth.uid() or public.dkd_is_admin());

drop policy if exists dkd_business_coupon_uses_select_admin on public.dkd_business_coupon_uses;
create policy dkd_business_coupon_uses_select_admin
on public.dkd_business_coupon_uses
for select
using (public.dkd_is_admin());

drop policy if exists dkd_business_coupon_uses_insert_owner_or_admin on public.dkd_business_coupon_uses;
create policy dkd_business_coupon_uses_insert_owner_or_admin
on public.dkd_business_coupon_uses
for insert
with check (player_id = auth.uid() or public.dkd_is_admin());

commit;
