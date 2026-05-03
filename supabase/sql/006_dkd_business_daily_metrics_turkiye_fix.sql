-- Türkiye saatine göre günlük iş metrikleri düzeltmesi
-- Son 7 günlük akış ve bugün metriklerini UTC yerine Europe/Istanbul'a göre hesaplar.

create or replace view public.dkd_business_daily_metrics as
with scan_base as (
  select
    business_id,
    player_id,
    (created_at at time zone 'Europe/Istanbul')::date as bucket_day,
    created_at
  from public.dkd_business_qr_scans
),
scan_day as (
  select
    business_id,
    bucket_day,
    count(*)::int as scan_count,
    count(distinct player_id)::int as unique_players
  from scan_base
  group by business_id, bucket_day
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
    sb.business_id,
    sb.bucket_day,
    count(distinct case when pf.first_day = sb.bucket_day then sb.player_id end)::int as new_players,
    count(distinct case when pf.first_day < sb.bucket_day then sb.player_id end)::int as returning_players
  from scan_base sb
  left join player_first pf
    on pf.business_id = sb.business_id
   and pf.player_id = sb.player_id
  group by sb.business_id, sb.bucket_day
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
  coalesce(s.business_id, dkd_alias_c.business_id) as business_id,
  coalesce(s.bucket_day, dkd_alias_c.bucket_day) as bucket_day,
  coalesce(s.unique_players, 0) as unique_players,
  coalesce(s.scan_count, 0) as scan_count,
  coalesce(dkd_alias_c.coupon_count, 0) as coupon_count,
  coalesce(pm.new_players, 0) as new_players,
  coalesce(pm.returning_players, 0) as returning_players,
  case
    when coalesce(s.scan_count, 0) <= 0 then 0::numeric
    else round((coalesce(dkd_alias_c.coupon_count, 0)::numeric / s.scan_count::numeric) * 100.0, 1)
  end as conversion_rate_pct
from scan_day s
full outer join coupon_day dkd_alias_c
  on dkd_alias_c.business_id = s.business_id
 and dkd_alias_c.bucket_day = s.bucket_day
left join player_mix pm
  on pm.business_id = coalesce(s.business_id, dkd_alias_c.business_id)
 and pm.bucket_day = coalesce(s.bucket_day, dkd_alias_c.bucket_day);

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

create or replace view public.dkd_business_task_attribution as
select
  business_id,
  (created_at at time zone 'Europe/Istanbul')::date as bucket_day,
  coalesce(nullif(trim(task_key), ''), 'organik') as task_key,
  count(*)::int as scan_count
from public.dkd_business_qr_scans
group by business_id, (created_at at time zone 'Europe/Istanbul')::date, coalesce(nullif(trim(task_key), ''), 'organik');
