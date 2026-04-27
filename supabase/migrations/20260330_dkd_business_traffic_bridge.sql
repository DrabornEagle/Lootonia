begin;

create or replace function public.dkd_business_context_for_drop(dkd_param_drop_id uuid)
returns table (
  business_id uuid,
  business_key text,
  business_name text,
  drop_id uuid,
  campaign_id bigint,
  campaign_title text,
  task_key text,
  stock_left integer,
  sponsor_enabled boolean,
  opens_at time,
  closes_at time,
  timezone_name text,
  is_open_now boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with dkd_link as (
    select
      dkd_link.business_id,
      dkd_link.drop_id
    from public.dkd_business_drop_links dkd_link
    where dkd_link.drop_id = dkd_param_drop_id
    limit 1
  ),
  dkd_campaign as (
    select
      dkd_campaign.id,
      dkd_campaign.title,
      dkd_campaign.task_key,
      dkd_campaign.stock_left,
      dkd_campaign.business_id
    from public.dkd_business_campaigns dkd_campaign
    join dkd_link on dkd_link.business_id = dkd_campaign.business_id
    where dkd_campaign.is_active = true
      and (dkd_campaign.starts_at is null or dkd_campaign.starts_at <= now())
      and (dkd_campaign.ends_at is null or dkd_campaign.ends_at >= now())
    order by dkd_campaign.updated_at desc, dkd_campaign.id desc
    limit 1
  )
  select
    dkd_business.id as business_id,
    dkd_business.business_key,
    dkd_business.name as business_name,
    dkd_link.drop_id,
    dkd_campaign.id as campaign_id,
    dkd_campaign.title as campaign_title,
    dkd_campaign.task_key,
    dkd_campaign.stock_left,
    dkd_business.sponsor_enabled,
    dkd_business.opens_at,
    dkd_business.closes_at,
    dkd_business.timezone_name,
    case
      when dkd_business.opens_at is null or dkd_business.closes_at is null then true
      when dkd_business.opens_at <= dkd_business.closes_at then
        ((now() at time zone coalesce(dkd_business.timezone_name, 'Europe/Istanbul'))::time >= dkd_business.opens_at
          and (now() at time zone coalesce(dkd_business.timezone_name, 'Europe/Istanbul'))::time <= dkd_business.closes_at)
      else
        ((now() at time zone coalesce(dkd_business.timezone_name, 'Europe/Istanbul'))::time >= dkd_business.opens_at
          or (now() at time zone coalesce(dkd_business.timezone_name, 'Europe/Istanbul'))::time <= dkd_business.closes_at)
    end as is_open_now
  from dkd_link
  join public.dkd_businesses dkd_business on dkd_business.id = dkd_link.business_id
  left join dkd_campaign on dkd_campaign.business_id = dkd_business.id
  limit 1;
$$;

revoke all on function public.dkd_business_context_for_drop(uuid) from public;
grant execute on function public.dkd_business_context_for_drop(uuid) to authenticated;

commit;
