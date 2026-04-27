begin;

-- ============================================================
-- LOOTONIA | 2026-04-08 | DKD sponsor coupon + drop radar hotfix
-- Hedefler:
-- 1) Sponsor ödüllü sandık açılınca kupon kodu üretimini garantiye almak
-- 2) Drop radarında kalan stok / oyuncu sayılarını canlı ve doğru döndürmek
-- 3) Oyuncunun kupon listesini tek RPC ile uygulamanın beklediği formatta vermek
-- ============================================================

create table if not exists public.dkd_business_coupons (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.dkd_businesses(id) on delete cascade,
  campaign_id uuid references public.dkd_business_campaigns(id) on delete set null,
  player_id uuid references auth.users(id) on delete set null,
  coupon_code text not null,
  task_key text,
  status text not null default 'issued',
  meta jsonb not null default '{}'::jsonb,
  issued_at timestamptz not null default now(),
  redeemed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.dkd_businesses
  add column if not exists city text default 'Ankara',
  add column if not exists district text,
  add column if not exists sponsor_name text;

alter table if exists public.dkd_business_drop_links
  add column if not exists traffic_weight integer not null default 1;

alter table if exists public.dkd_business_campaigns
  add column if not exists reward_label text,
  add column if not exists coupon_prefix text,
  add column if not exists sponsor_name text,
  add column if not exists stock_limit integer not null default 0,
  add column if not exists redeemed_count integer not null default 0;

alter table if exists public.dkd_business_coupons
  add column if not exists task_key text,
  add column if not exists status text not null default 'issued',
  add column if not exists meta jsonb not null default '{}'::jsonb,
  add column if not exists issued_at timestamptz not null default now(),
  add column if not exists redeemed_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.dkd_business_coupons
set coupon_code = upper(trim(coupon_code))
where coupon_code is not null
  and coupon_code <> upper(trim(coupon_code));

update public.dkd_business_coupons
set status = 'issued'
where status is null
   or trim(status) = '';

create index if not exists idx_dkd_business_coupons_coupon_code
  on public.dkd_business_coupons(coupon_code);

create index if not exists idx_dkd_business_coupons_campaign_player_status
  on public.dkd_business_coupons(campaign_id, player_id, status, issued_at desc);

create index if not exists idx_dkd_business_coupons_player_status
  on public.dkd_business_coupons(player_id, status, issued_at desc);

create index if not exists idx_dkd_business_drop_links_drop_primary
  on public.dkd_business_drop_links(drop_id, is_primary desc, created_at asc);

create or replace function public.dkd_business_coupon_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_dkd_business_coupons_touch_updated_at on public.dkd_business_coupons;
create trigger trg_dkd_business_coupons_touch_updated_at
before update on public.dkd_business_coupons
for each row
execute function public.dkd_business_coupon_touch_updated_at();

with dkd_campaign_coupon_counts as (
  select
    dkd_coupon_row.campaign_id,
    count(*)::integer as dkd_used_count
  from public.dkd_business_coupons dkd_coupon_row
  where dkd_coupon_row.campaign_id is not null
    and coalesce(dkd_coupon_row.status, 'issued') in ('issued', 'redeemed')
  group by dkd_coupon_row.campaign_id
)
update public.dkd_business_campaigns dkd_campaign_row
set redeemed_count = coalesce(dkd_campaign_coupon_counts.dkd_used_count, 0),
    updated_at = now()
from dkd_campaign_coupon_counts
where dkd_campaign_coupon_counts.campaign_id = dkd_campaign_row.id
  and coalesce(dkd_campaign_row.redeemed_count, 0) <> coalesce(dkd_campaign_coupon_counts.dkd_used_count, 0);

update public.dkd_business_campaigns dkd_campaign_row
set redeemed_count = 0,
    updated_at = now()
where not exists (
  select 1
  from public.dkd_business_coupons dkd_coupon_row
  where dkd_coupon_row.campaign_id = dkd_campaign_row.id
    and coalesce(dkd_coupon_row.status, 'issued') in ('issued', 'redeemed')
)
and coalesce(dkd_campaign_row.redeemed_count, 0) <> 0;

drop function if exists public.dkd_business_issue_coupon(uuid, uuid, uuid, text, text, timestamptz, jsonb);
create function public.dkd_business_issue_coupon(
  dkd_param_business_id uuid default null,
  dkd_param_campaign_id uuid default null,
  dkd_param_player_id uuid default null,
  dkd_param_coupon_code text default null,
  dkd_param_task_key text default null,
  dkd_param_expires_at timestamptz default null,
  dkd_param_meta jsonb default '{}'::jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_coupon_code text;
  dkd_var_try_count integer := 0;
  dkd_var_has_conflict boolean := false;
begin
  if coalesce(public.dkd_is_admin(), false) is not true
     and coalesce(public.dkd_business_is_member(dkd_param_business_id), false) is not true then
    raise exception 'business_role_required';
  end if;

  loop
    dkd_var_try_count := dkd_var_try_count + 1;
    dkd_var_coupon_code := upper(nullif(trim(coalesce(dkd_param_coupon_code, '')), ''));
    if dkd_var_coupon_code is null then
      dkd_var_coupon_code := 'DKD-' || substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8);
    end if;

    select exists (
      select 1
      from public.dkd_business_coupons dkd_coupon_row
      where upper(coalesce(dkd_coupon_row.coupon_code, '')) = dkd_var_coupon_code
    ) into dkd_var_has_conflict;

    exit when dkd_var_has_conflict is false;

    if nullif(trim(coalesce(dkd_param_coupon_code, '')), '') is not null then
      raise exception 'coupon_code_conflict';
    end if;

    if dkd_var_try_count >= 8 then
      raise exception 'coupon_code_generation_failed';
    end if;
  end loop;

  insert into public.dkd_business_coupons (
    business_id,
    campaign_id,
    player_id,
    coupon_code,
    task_key,
    status,
    expires_at,
    meta,
    issued_at,
    created_at,
    updated_at
  ) values (
    dkd_param_business_id,
    dkd_param_campaign_id,
    dkd_param_player_id,
    dkd_var_coupon_code,
    nullif(trim(coalesce(dkd_param_task_key, '')), ''),
    'issued',
    dkd_param_expires_at,
    coalesce(dkd_param_meta, '{}'::jsonb),
    now(),
    now(),
    now()
  );

  return dkd_var_coupon_code;
end;
$$;

revoke all on function public.dkd_business_issue_coupon(uuid, uuid, uuid, text, text, timestamptz, jsonb) from public;
grant execute on function public.dkd_business_issue_coupon(uuid, uuid, uuid, text, text, timestamptz, jsonb) to authenticated;

drop function if exists public.dkd_player_claim_campaign_coupon_by_drop(uuid, text, text, jsonb);
create function public.dkd_player_claim_campaign_coupon_by_drop(
  dkd_param_drop_id uuid,
  dkd_param_task_key text default null,
  dkd_param_source_type text default 'qr',
  dkd_param_meta jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_var_user_id uuid;
  dkd_var_business public.dkd_businesses%rowtype;
  dkd_var_campaign public.dkd_business_campaigns%rowtype;
  dkd_var_existing_coupon public.dkd_business_coupons%rowtype;
  dkd_var_live_used_count integer := 0;
  dkd_var_next_used_count integer := 0;
  dkd_var_stock_left integer := 0;
  dkd_var_coupon_code text;
  dkd_var_coupon_prefix text;
  dkd_var_try_count integer := 0;
  dkd_var_has_conflict boolean := false;
begin
  dkd_var_user_id := auth.uid();
  if dkd_var_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'auth_required');
  end if;

  if dkd_param_drop_id is null then
    return jsonb_build_object('ok', false, 'reason', 'drop_required');
  end if;

  select dkd_business_row.*
    into dkd_var_business
  from public.dkd_business_drop_links dkd_link_row
  join public.dkd_businesses dkd_business_row
    on dkd_business_row.id = dkd_link_row.business_id
  where dkd_link_row.drop_id = dkd_param_drop_id
    and coalesce(dkd_business_row.is_active, true) = true
  order by coalesce(dkd_link_row.is_primary, false) desc,
           coalesce(dkd_link_row.traffic_weight, 1) desc,
           dkd_link_row.created_at asc
  limit 1;

  if dkd_var_business.id is null then
    return jsonb_build_object('ok', false, 'reason', 'business_not_linked');
  end if;

  select dkd_campaign_row.*
    into dkd_var_campaign
  from public.dkd_business_campaigns dkd_campaign_row
  where dkd_campaign_row.business_id = dkd_var_business.id
    and coalesce(dkd_campaign_row.is_active, true) = true
    and (dkd_campaign_row.starts_at is null or dkd_campaign_row.starts_at <= now())
    and (dkd_campaign_row.ends_at is null or dkd_campaign_row.ends_at >= now())
    and (
      coalesce(dkd_campaign_row.stock_limit, 0) <= 0
      or coalesce(dkd_campaign_row.redeemed_count, 0) < dkd_campaign_row.stock_limit
    )
  order by coalesce(dkd_campaign_row.starts_at, dkd_campaign_row.created_at) desc,
           dkd_campaign_row.created_at desc
  limit 1
  for update;

  if dkd_var_campaign.id is null then
    return jsonb_build_object('ok', false, 'reason', 'no_active_campaign');
  end if;

  select dkd_coupon_row.*
    into dkd_var_existing_coupon
  from public.dkd_business_coupons dkd_coupon_row
  where dkd_coupon_row.campaign_id = dkd_var_campaign.id
    and dkd_coupon_row.player_id = dkd_var_user_id
    and coalesce(dkd_coupon_row.status, 'issued') in ('issued', 'redeemed')
  order by coalesce(dkd_coupon_row.issued_at, dkd_coupon_row.created_at) desc
  limit 1;

  select count(*)::integer
    into dkd_var_live_used_count
  from public.dkd_business_coupons dkd_coupon_row
  where dkd_coupon_row.campaign_id = dkd_var_campaign.id
    and coalesce(dkd_coupon_row.status, 'issued') in ('issued', 'redeemed');

  dkd_var_live_used_count := greatest(coalesce(dkd_var_campaign.redeemed_count, 0), coalesce(dkd_var_live_used_count, 0));
  dkd_var_stock_left := greatest(coalesce(dkd_var_campaign.stock_limit, 0) - dkd_var_live_used_count, 0);

  if dkd_var_existing_coupon.id is not null then
    return jsonb_build_object(
      'ok', true,
      'already_exists', true,
      'coupon_id', dkd_var_existing_coupon.id,
      'coupon_code', dkd_var_existing_coupon.coupon_code,
      'business_id', dkd_var_business.id,
      'business_name', dkd_var_business.name,
      'campaign_id', dkd_var_campaign.id,
      'campaign_title', dkd_var_campaign.title,
      'reward_label', coalesce(nullif(trim(dkd_var_campaign.reward_label), ''), 'Sponsor Ödülü'),
      'status', coalesce(dkd_var_existing_coupon.status, 'issued'),
      'stock_left', dkd_var_stock_left
    );
  end if;

  if coalesce(dkd_var_campaign.stock_limit, 0) > 0 and dkd_var_live_used_count >= dkd_var_campaign.stock_limit then
    return jsonb_build_object('ok', false, 'reason', 'campaign_stock_exhausted');
  end if;

  dkd_var_coupon_prefix := upper(coalesce(nullif(trim(dkd_var_campaign.coupon_prefix), ''), 'DKD'));

  loop
    dkd_var_try_count := dkd_var_try_count + 1;
    dkd_var_coupon_code := dkd_var_coupon_prefix || '-' || substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8);

    select exists (
      select 1
      from public.dkd_business_coupons dkd_coupon_row
      where upper(coalesce(dkd_coupon_row.coupon_code, '')) = dkd_var_coupon_code
    ) into dkd_var_has_conflict;

    exit when dkd_var_has_conflict is false;

    if dkd_var_try_count >= 8 then
      return jsonb_build_object('ok', false, 'reason', 'coupon_code_generation_failed');
    end if;
  end loop;

  insert into public.dkd_business_coupons (
    business_id,
    campaign_id,
    player_id,
    coupon_code,
    task_key,
    status,
    meta,
    issued_at,
    created_at,
    updated_at
  ) values (
    dkd_var_business.id,
    dkd_var_campaign.id,
    dkd_var_user_id,
    dkd_var_coupon_code,
    nullif(trim(coalesce(dkd_param_task_key, '')), ''),
    'issued',
    coalesce(dkd_param_meta, '{}'::jsonb)
      || jsonb_build_object(
        'source_type', coalesce(nullif(trim(coalesce(dkd_param_source_type, '')), ''), 'qr'),
        'issued_from_drop_id', dkd_param_drop_id
      ),
    now(),
    now(),
    now()
  );

  dkd_var_next_used_count := dkd_var_live_used_count + 1;

  update public.dkd_business_campaigns dkd_campaign_row
  set redeemed_count = greatest(coalesce(dkd_campaign_row.redeemed_count, 0), dkd_var_next_used_count),
      updated_at = now()
  where dkd_campaign_row.id = dkd_var_campaign.id;

  dkd_var_stock_left := greatest(coalesce(dkd_var_campaign.stock_limit, 0) - dkd_var_next_used_count, 0);

  return jsonb_build_object(
    'ok', true,
    'already_exists', false,
    'coupon_code', dkd_var_coupon_code,
    'business_id', dkd_var_business.id,
    'business_name', dkd_var_business.name,
    'campaign_id', dkd_var_campaign.id,
    'campaign_title', dkd_var_campaign.title,
    'reward_label', coalesce(nullif(trim(dkd_var_campaign.reward_label), ''), 'Sponsor Ödülü'),
    'status', 'issued',
    'stock_left', dkd_var_stock_left
  );
end;
$$;

grant execute on function public.dkd_player_claim_campaign_coupon_by_drop(uuid, text, text, jsonb) to authenticated;

drop function if exists public.dkd_player_my_business_coupons();
create function public.dkd_player_my_business_coupons()
returns table (
  id uuid,
  business_id uuid,
  campaign_id uuid,
  coupon_code text,
  task_key text,
  status text,
  issued_at timestamptz,
  redeemed_at timestamptz,
  expires_at timestamptz,
  business_name text,
  city text,
  district text,
  campaign_title text,
  reward_label text,
  sponsor_name text
)
language sql
security definer
set search_path = public
as $$
  select
    dkd_coupon_row.id,
    dkd_coupon_row.business_id,
    dkd_coupon_row.campaign_id,
    dkd_coupon_row.coupon_code,
    dkd_coupon_row.task_key,
    dkd_coupon_row.status,
    dkd_coupon_row.issued_at,
    dkd_coupon_row.redeemed_at,
    dkd_coupon_row.expires_at,
    dkd_business_row.name as business_name,
    dkd_business_row.city,
    dkd_business_row.district,
    dkd_campaign_row.title as campaign_title,
    dkd_campaign_row.reward_label,
    dkd_campaign_row.sponsor_name
  from public.dkd_business_coupons dkd_coupon_row
  join public.dkd_businesses dkd_business_row
    on dkd_business_row.id = dkd_coupon_row.business_id
  left join public.dkd_business_campaigns dkd_campaign_row
    on dkd_campaign_row.id = dkd_coupon_row.campaign_id
  where dkd_coupon_row.player_id = auth.uid()
  order by coalesce(dkd_coupon_row.issued_at, dkd_coupon_row.created_at) desc;
$$;

grant execute on function public.dkd_player_my_business_coupons() to authenticated;

drop function if exists public.dkd_drop_campaign_public_meta();
create function public.dkd_drop_campaign_public_meta()
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
      dkd_coupon_row.campaign_id,
      count(distinct coalesce(dkd_coupon_row.player_id::text, dkd_coupon_row.coupon_code))::int as dkd_player_total,
      count(distinct coalesce(dkd_coupon_row.player_id::text, dkd_coupon_row.coupon_code)) filter (
        where (coalesce(dkd_coupon_row.issued_at, dkd_coupon_row.created_at) at time zone 'Europe/Istanbul')::date = (now() at time zone 'Europe/Istanbul')::date
      )::int as dkd_player_today
    from public.dkd_business_coupons dkd_coupon_row
    where dkd_coupon_row.campaign_id is not null
      and coalesce(dkd_coupon_row.status, 'issued') in ('issued', 'redeemed')
    group by dkd_coupon_row.campaign_id
  ),
  dkd_live_campaigns as (
    select
      dkd_campaign_row.*,
      coalesce(dkd_coupon_stats.dkd_player_today, 0)::int as dkd_player_today,
      coalesce(dkd_coupon_stats.dkd_player_total, 0)::int as dkd_player_total,
      greatest(coalesce(dkd_campaign_row.redeemed_count, 0), coalesce(dkd_coupon_stats.dkd_player_total, 0))::int as dkd_live_used_count,
      greatest(
        coalesce(dkd_campaign_row.stock_limit, 0) - greatest(coalesce(dkd_campaign_row.redeemed_count, 0), coalesce(dkd_coupon_stats.dkd_player_total, 0)),
        0
      )::int as dkd_live_stock_left
    from public.dkd_business_campaigns dkd_campaign_row
    left join dkd_coupon_stats
      on dkd_coupon_stats.campaign_id = dkd_campaign_row.id
    where coalesce(dkd_campaign_row.is_active, true) = true
      and (dkd_campaign_row.starts_at is null or dkd_campaign_row.starts_at <= now())
      and (dkd_campaign_row.ends_at is null or dkd_campaign_row.ends_at >= now())
      and (
        coalesce(dkd_campaign_row.stock_limit, 0) <= 0
        or greatest(coalesce(dkd_campaign_row.redeemed_count, 0), coalesce(dkd_coupon_stats.dkd_player_total, 0)) < dkd_campaign_row.stock_limit
      )
  )
  select
    dkd_link_row.drop_id,
    dkd_business_row.id as business_id,
    dkd_campaign_pick.id as campaign_id,
    dkd_business_row.name as business_name,
    dkd_campaign_pick.title as campaign_title,
    coalesce(nullif(trim(dkd_campaign_pick.reward_label), ''), 'Ödül var') as reward_badge_label,
    dkd_campaign_pick.dkd_live_stock_left::int as campaign_stock_left,
    dkd_campaign_pick.ends_at as campaign_expires_at,
    dkd_campaign_pick.dkd_player_today::int as campaign_players_today,
    dkd_campaign_pick.dkd_player_total::int as campaign_players_total,
    coalesce(dkd_link_row.is_primary, false) as is_primary,
    coalesce(dkd_link_row.traffic_weight, 1)::int as traffic_weight
  from public.dkd_business_drop_links dkd_link_row
  join public.dkd_businesses dkd_business_row
    on dkd_business_row.id = dkd_link_row.business_id
   and coalesce(dkd_business_row.is_active, true) = true
  join lateral (
    select dkd_live_campaign_row.*
    from dkd_live_campaigns dkd_live_campaign_row
    where dkd_live_campaign_row.business_id = dkd_business_row.id
    order by coalesce(dkd_live_campaign_row.starts_at, dkd_live_campaign_row.created_at) desc,
             dkd_live_campaign_row.created_at desc
    limit 1
  ) dkd_campaign_pick on true
  where dkd_link_row.drop_id is not null;
$$;

grant execute on function public.dkd_drop_campaign_public_meta() to authenticated;

commit;
