begin;

alter table if exists public.dkd_businesses
  add column if not exists district text,
  add column if not exists opens_at time,
  add column if not exists closes_at time,
  add column if not exists daily_scan_goal integer not null default 40;

alter table if exists public.dkd_business_drop_links
  add column if not exists traffic_weight integer not null default 1;

alter table if exists public.dkd_business_campaigns
  add column if not exists reward_label text,
  add column if not exists coupon_prefix text;

create or replace function public.dkd_business_admin_delete(dkd_param_business_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(public.dkd_is_admin(), false) is not true then
    raise exception 'admin_required';
  end if;

  delete from public.dkd_businesses
  where id = dkd_param_business_id;

  return jsonb_build_object(
    'ok', true,
    'business_id', dkd_param_business_id
  );
end;
$$;

grant execute on function public.dkd_business_admin_delete(uuid) to authenticated;

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
    group by dkd_alias_c.campaign_id
  )
  select
    dkd_alias_l.drop_id,
    dkd_alias_b.id as business_id,
    cam.id as campaign_id,
    dkd_alias_b.name as business_name,
    cam.title as campaign_title,
    coalesce(nullif(trim(cam.reward_label), ''), 'Ödül var') as reward_badge_label,
    greatest(coalesce(cam.stock_limit, 0) - greatest(coalesce(cam.redeemed_count, 0), coalesce(cs.player_total, 0)), 0)::int as campaign_stock_left,
    cam.ends_at as campaign_expires_at,
    coalesce(cs.player_today, 0)::int as campaign_players_today,
    coalesce(cs.player_total, 0)::int as campaign_players_total,
    coalesce(dkd_alias_l.is_primary, false) as is_primary,
    coalesce(dkd_alias_l.traffic_weight, 1)::int as traffic_weight
  from public.dkd_business_drop_links dkd_alias_l
  join public.dkd_businesses dkd_alias_b
    on dkd_alias_b.id = dkd_alias_l.business_id
   and coalesce(dkd_alias_b.is_active, true) = true
  join lateral (
    select dkd_alias_c.*
    from public.dkd_business_campaigns dkd_alias_c
    where dkd_alias_c.business_id = dkd_alias_b.id
      and coalesce(dkd_alias_c.is_active, true) = true
      and (dkd_alias_c.starts_at is null or dkd_alias_c.starts_at <= now())
      and (dkd_alias_c.ends_at is null or dkd_alias_c.ends_at >= now())
      and (
        coalesce(dkd_alias_c.stock_limit, 0) <= 0
        or greatest(coalesce(dkd_alias_c.stock_limit, 0) - greatest(coalesce(dkd_alias_c.redeemed_count, 0), 0), 0) > 0
      )
    order by coalesce(dkd_alias_c.starts_at, dkd_alias_c.created_at) desc, dkd_alias_c.created_at desc
    limit 1
  ) cam on true
  left join dkd_coupon_stats cs
    on cs.campaign_id = cam.id
  where dkd_alias_l.drop_id is not null;
$$;

grant execute on function public.dkd_drop_campaign_public_meta() to authenticated;

commit;
