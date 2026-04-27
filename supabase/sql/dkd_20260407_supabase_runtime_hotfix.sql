-- dkd_20260407_supabase_runtime_hotfix.sql
-- Lootonia runtime/schema compatibility hotfix
-- Goal: normalize legacy business tables so JS app and latest view layer can run together.

begin;

alter table if exists public.dkd_business_qr_scans
  add column if not exists player_id uuid references auth.users(id) on delete set null,
  add column if not exists source_kind text,
  add column if not exists source_type text,
  add column if not exists qr_token text,
  add column if not exists code_value text,
  add column if not exists boss_reward boolean not null default false,
  add column if not exists session_key text,
  add column if not exists meta jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table if exists public.dkd_business_coupon_uses
  add column if not exists player_id uuid references auth.users(id) on delete set null,
  add column if not exists coupon_id uuid,
  add column if not exists note text,
  add column if not exists meta jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'dkd_business_qr_scans' and column_name = 'user_id'
  ) then
    execute 'update public.dkd_business_qr_scans set player_id = coalesce(player_id, user_id) where player_id is null';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'dkd_business_qr_scans' and column_name = 'scanned_at'
  ) then
    execute 'update public.dkd_business_qr_scans set created_at = coalesce(created_at, scanned_at, now()) where created_at is null';
    execute 'update public.dkd_business_qr_scans set updated_at = coalesce(updated_at, created_at, scanned_at, now()) where updated_at is null';
  else
    execute 'update public.dkd_business_qr_scans set created_at = coalesce(created_at, now()) where created_at is null';
    execute 'update public.dkd_business_qr_scans set updated_at = coalesce(updated_at, created_at, now()) where updated_at is null';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'dkd_business_coupon_uses' and column_name = 'user_id'
  ) then
    execute 'update public.dkd_business_coupon_uses set player_id = coalesce(player_id, user_id) where player_id is null';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'dkd_business_coupon_uses' and column_name = 'used_at'
  ) then
    execute 'update public.dkd_business_coupon_uses set created_at = coalesce(created_at, used_at, now()) where created_at is null';
  else
    execute 'update public.dkd_business_coupon_uses set created_at = coalesce(created_at, now()) where created_at is null';
  end if;
end $$;

alter table if exists public.dkd_business_qr_scans
  alter column created_at set default now(),
  alter column updated_at set default now();

alter table if exists public.dkd_business_coupon_uses
  alter column created_at set default now();

create index if not exists idx_dkd_business_qr_scans_business_created_hotfix
  on public.dkd_business_qr_scans(business_id, created_at desc);

create index if not exists idx_dkd_business_coupon_uses_business_created_hotfix
  on public.dkd_business_coupon_uses(business_id, created_at desc);

drop view if exists public.dkd_business_today_metrics;
drop view if exists public.dkd_business_hourly_heatmap;
drop view if exists public.dkd_business_daily_metrics;

create or replace view public.dkd_business_daily_metrics as
with scan_day as (
  select
    business_id,
    (created_at at time zone 'Europe/Istanbul')::date as bucket_day,
    count(*)::int as scan_count,
    count(distinct player_id)::int as unique_players
  from public.dkd_business_qr_scans
  group by business_id, (created_at at time zone 'Europe/Istanbul')::date
),
player_first as (
  select
    business_id,
    player_id,
    min((created_at at time zone 'Europe/Istanbul')::date) as first_day
  from public.dkd_business_qr_scans
  where player_id is not null
  group by business_id, player_id
),
player_mix as (
  select
    dkd_alias_scan.business_id,
    (dkd_alias_scan.created_at at time zone 'Europe/Istanbul')::date as bucket_day,
    count(distinct case when dkd_alias_player.first_day = (dkd_alias_scan.created_at at time zone 'Europe/Istanbul')::date then dkd_alias_scan.player_id end)::int as new_players,
    count(distinct case when dkd_alias_player.first_day < (dkd_alias_scan.created_at at time zone 'Europe/Istanbul')::date then dkd_alias_scan.player_id end)::int as returning_players
  from public.dkd_business_qr_scans dkd_alias_scan
  left join player_first dkd_alias_player
    on dkd_alias_player.business_id = dkd_alias_scan.business_id
   and dkd_alias_player.player_id = dkd_alias_scan.player_id
  group by dkd_alias_scan.business_id, (dkd_alias_scan.created_at at time zone 'Europe/Istanbul')::date
),
coupon_day as (
  select
    business_id,
    (created_at at time zone 'Europe/Istanbul')::date as bucket_day,
    count(*)::int as coupon_count
  from public.dkd_business_coupon_uses
  group by business_id, (created_at at time zone 'Europe/Istanbul')::date
)
select
  coalesce(dkd_alias_scan.business_id, dkd_alias_coupon.business_id) as business_id,
  coalesce(dkd_alias_scan.bucket_day, dkd_alias_coupon.bucket_day) as bucket_day,
  coalesce(dkd_alias_scan.unique_players, 0) as unique_players,
  coalesce(dkd_alias_scan.scan_count, 0) as scan_count,
  coalesce(dkd_alias_coupon.coupon_count, 0) as coupon_count,
  coalesce(dkd_alias_mix.new_players, 0) as new_players,
  coalesce(dkd_alias_mix.returning_players, 0) as returning_players,
  case
    when coalesce(dkd_alias_scan.scan_count, 0) <= 0 then 0::numeric
    else round((coalesce(dkd_alias_coupon.coupon_count, 0)::numeric / dkd_alias_scan.scan_count::numeric) * 100.0, 1)
  end as conversion_rate_pct
from scan_day dkd_alias_scan
full outer join coupon_day dkd_alias_coupon
  on dkd_alias_coupon.business_id = dkd_alias_scan.business_id
 and dkd_alias_coupon.bucket_day = dkd_alias_scan.bucket_day
left join player_mix dkd_alias_mix
  on dkd_alias_mix.business_id = coalesce(dkd_alias_scan.business_id, dkd_alias_coupon.business_id)
 and dkd_alias_mix.bucket_day = coalesce(dkd_alias_scan.bucket_day, dkd_alias_coupon.bucket_day);

create or replace view public.dkd_business_today_metrics as
select *
from public.dkd_business_daily_metrics
where bucket_day = ((now() at time zone 'Europe/Istanbul')::date);

create or replace view public.dkd_business_hourly_heatmap as
select
  business_id,
  (created_at at time zone 'Europe/Istanbul')::date as bucket_day,
  extract(hour from created_at at time zone 'Europe/Istanbul')::int as hour_slot,
  count(*)::int as scan_count
from public.dkd_business_qr_scans
group by business_id, (created_at at time zone 'Europe/Istanbul')::date, extract(hour from created_at at time zone 'Europe/Istanbul')::int;

grant select on public.dkd_business_daily_metrics to authenticated;
grant select on public.dkd_business_today_metrics to authenticated;
grant select on public.dkd_business_hourly_heatmap to authenticated;

commit;
