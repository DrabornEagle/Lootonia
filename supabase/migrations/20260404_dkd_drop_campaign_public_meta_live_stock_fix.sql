begin;

create or replace function public.dkd_drop_campaign_public_meta()
returns table (
  drop_id uuid,
  business_id uuid,
  campaign_id uuid,
  business_name text,
  campaign_title text,
  reward_badge_label text,
  campaign_stock_left integer,
  campaign_expires_at timestamptz,
  campaign_players_today integer,
  campaign_players_total integer,
  is_primary boolean,
  traffic_weight integer
)
language sql
security definer
set search_path = public
as $$
  with dkd_coupon_stats as (
    select
      dkd_alias_c.campaign_id,
      count(distinct coalesce(dkd_alias_c.player_id::text, dkd_alias_c.coupon_code))::int as player_total,
      count(distinct coalesce(dkd_alias_c.player_id::text, dkd_alias_c.coupon_code)) filter (
        where (coalesce(dkd_alias_c.issued_at, dkd_alias_c.created_at) at time zone 'Europe/Istanbul')::date = (now() at time zone 'Europe/Istanbul')::date
      )::int as player_today
    from public.dkd_business_coupons dkd_alias_c
    where dkd_alias_c.campaign_id is not null
      and coalesce(dkd_alias_c.status, 'issued') in ('issued', 'redeemed')
    group by dkd_alias_c.campaign_id
  ),
  dkd_live_campaigns as (
    select
      cam.*,
      coalesce(cs.player_today, 0)::int as player_today,
      coalesce(cs.player_total, 0)::int as player_total,
      greatest(coalesce(cam.redeemed_count, 0), coalesce(cs.player_total, 0))::int as live_used_count,
      greatest(
        coalesce(cam.stock_limit, 0) - greatest(coalesce(cam.redeemed_count, 0), coalesce(cs.player_total, 0)),
        0
      )::int as live_stock_left
    from public.dkd_business_campaigns cam
    left join dkd_coupon_stats cs
      on cs.campaign_id = cam.id
    where coalesce(cam.is_active, true) = true
      and (cam.starts_at is null or cam.starts_at <= now())
      and (cam.ends_at is null or cam.ends_at >= now())
      and (cam.closes_at is null or cam.closes_at >= now())
  )
  select
    dkd_alias_l.drop_id,
    dkd_alias_b.id as business_id,
    cam.id as campaign_id,
    dkd_alias_b.name as business_name,
    cam.title as campaign_title,
    coalesce(nullif(trim(cam.reward_label), ''), 'Ödül var') as reward_badge_label,
    cam.live_stock_left::int as campaign_stock_left,
    cam.ends_at as campaign_expires_at,
    cam.player_today::int as campaign_players_today,
    cam.player_total::int as campaign_players_total,
    coalesce(dkd_alias_l.is_primary, false) as is_primary,
    coalesce(dkd_alias_l.traffic_weight, 1)::int as traffic_weight
  from public.dkd_business_drop_links dkd_alias_l
  join public.dkd_businesses dkd_alias_b
    on dkd_alias_b.id = dkd_alias_l.business_id
   and coalesce(dkd_alias_b.is_active, true) = true
  join lateral (
    select lc.*
    from dkd_live_campaigns lc
    where lc.business_id = dkd_alias_b.id
      and (
        coalesce(lc.stock_limit, 0) <= 0
        or lc.live_stock_left > 0
      )
    order by coalesce(lc.starts_at, lc.created_at) desc, lc.created_at desc
    limit 1
  ) cam on true
  where dkd_alias_l.drop_id is not null;
$$;

grant execute on function public.dkd_drop_campaign_public_meta() to authenticated;

commit;
