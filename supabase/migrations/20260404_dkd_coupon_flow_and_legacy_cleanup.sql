begin;

-- ============================================================
-- LOOTONIA | 2026-04-04 | DKD one-shot coupon flow + legacy cleanup
-- Amac:
-- 1) Sponsorlu ödül sandığı açılınca kupon kodunun üretildiği RPC'yi kalıcı hale getirmek
-- 2) Bu RPC'nin sadece supabase/sql altında kalması yerine migration standardına taşınmasını desteklemek
-- 3) Canlı DB'de kalmış olabilir legacy public nesneleri audit edip güvenli şekilde dkd_ standardına taşımak
-- ============================================================

create index if not exists idx_dkd_business_drop_links_drop_primary
  on public.dkd_business_drop_links(drop_id, is_primary desc, created_at asc);

create index if not exists idx_dkd_business_coupons_campaign_player_status
  on public.dkd_business_coupons(campaign_id, player_id, status, issued_at desc);

create index if not exists idx_dkd_business_coupons_player_status
  on public.dkd_business_coupons(player_id, status, issued_at desc);

update public.dkd_business_campaigns dkd_alias_c
set redeemed_count = coalesce(src.used_count, 0),
    updated_at = now()
from (
  select campaign_id, count(*)::integer as used_count
  from public.dkd_business_coupons
  where campaign_id is not null
    and status in ('issued', 'redeemed')
  group by campaign_id
) src
where dkd_alias_c.id = src.campaign_id
  and coalesce(dkd_alias_c.redeemed_count, 0) <> coalesce(src.used_count, 0);

update public.dkd_business_campaigns
set redeemed_count = 0,
    updated_at = now()
where id not in (
  select distinct campaign_id
  from public.dkd_business_coupons
  where campaign_id is not null
    and status in ('issued', 'redeemed')
)
and coalesce(redeemed_count, 0) <> 0;

create or replace function public.dkd_player_claim_campaign_coupon_by_drop(
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
  dkd_var_existing public.dkd_business_coupons%rowtype;
  dkd_var_code text;
  dkd_var_used_count integer;
begin
  dkd_var_user_id := auth.uid();
  if dkd_var_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'auth_required');
  end if;

  select dkd_alias_b.*
    into dkd_var_business
  from public.dkd_business_drop_links dkd_alias_l
  join public.dkd_businesses dkd_alias_b on dkd_alias_b.id = dkd_alias_l.business_id
  where dkd_alias_l.drop_id = dkd_param_drop_id
  order by dkd_alias_l.is_primary desc, dkd_alias_l.created_at asc
  limit 1;

  if dkd_var_business.id is null then
    return jsonb_build_object('ok', false, 'reason', 'business_not_linked');
  end if;

  select dkd_alias_c.*
    into dkd_var_campaign
  from public.dkd_business_campaigns dkd_alias_c
  where dkd_alias_c.business_id = dkd_var_business.id
    and dkd_alias_c.is_active = true
    and (dkd_alias_c.starts_at is null or dkd_alias_c.starts_at <= now())
    and (dkd_alias_c.ends_at is null or dkd_alias_c.ends_at >= now())
    and (dkd_alias_c.closes_at is null or dkd_alias_c.closes_at >= now())
  order by dkd_alias_c.created_at desc
  limit 1
  for update;

  if dkd_var_campaign.id is null then
    return jsonb_build_object('ok', false, 'reason', 'no_active_campaign');
  end if;

  select *
    into dkd_var_existing
  from public.dkd_business_coupons
  where campaign_id = dkd_var_campaign.id
    and player_id = dkd_var_user_id
    and status = 'issued'
  order by issued_at desc
  limit 1;

  if dkd_var_existing.id is not null then
    return jsonb_build_object(
      'ok', true,
      'already_exists', true,
      'coupon_id', dkd_var_existing.id,
      'coupon_code', dkd_var_existing.coupon_code,
      'business_id', dkd_var_business.id,
      'business_name', dkd_var_business.name,
      'campaign_id', dkd_var_campaign.id,
      'campaign_title', dkd_var_campaign.title,
      'reward_label', dkd_var_campaign.reward_label,
      'stock_left', greatest(coalesce(dkd_var_campaign.stock_limit, 0) - coalesce(dkd_var_campaign.redeemed_count, 0), 0)
    );
  end if;

  dkd_var_used_count := coalesce(dkd_var_campaign.redeemed_count, 0);

  if coalesce(dkd_var_campaign.stock_limit, 0) > 0 and dkd_var_used_count >= dkd_var_campaign.stock_limit then
    return jsonb_build_object('ok', false, 'reason', 'campaign_stock_exhausted');
  end if;

  dkd_var_code := upper(coalesce(nullif(trim(dkd_var_campaign.coupon_prefix), ''), 'YSL'))
    || '-'
    || substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8);

  insert into public.dkd_business_coupons (
    business_id,
    campaign_id,
    player_id,
    coupon_code,
    task_key,
    status,
    meta
  ) values (
    dkd_var_business.id,
    dkd_var_campaign.id,
    dkd_var_user_id,
    dkd_var_code,
    nullif(trim(coalesce(dkd_param_task_key, '')), ''),
    'issued',
    coalesce(dkd_param_meta, '{}'::jsonb)
      || jsonb_build_object(
        'source_type', coalesce(nullif(trim(coalesce(dkd_param_source_type, '')), ''), 'qr'),
        'issued_from_drop_id', dkd_param_drop_id
      )
  );

  update public.dkd_business_campaigns
  set redeemed_count = coalesce(redeemed_count, 0) + 1,
      updated_at = now()
  where id = dkd_var_campaign.id
  returning * into dkd_var_campaign;

  return jsonb_build_object(
    'ok', true,
    'coupon_code', dkd_var_code,
    'business_id', dkd_var_business.id,
    'business_name', dkd_var_business.name,
    'campaign_id', dkd_var_campaign.id,
    'campaign_title', dkd_var_campaign.title,
    'reward_label', dkd_var_campaign.reward_label,
    'stock_left', greatest(coalesce(dkd_var_campaign.stock_limit, 0) - coalesce(dkd_var_campaign.redeemed_count, 0), 0)
  );
end;
$$;

grant execute on function public.dkd_player_claim_campaign_coupon_by_drop(uuid, text, text, jsonb) to authenticated;

create or replace function public.dkd_player_my_business_coupons()
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
    dkd_alias_c.id,
    dkd_alias_c.business_id,
    dkd_alias_c.campaign_id,
    dkd_alias_c.coupon_code,
    dkd_alias_c.task_key,
    dkd_alias_c.status,
    dkd_alias_c.issued_at,
    dkd_alias_c.redeemed_at,
    dkd_alias_c.expires_at,
    dkd_alias_b.name as business_name,
    dkd_alias_b.city,
    dkd_alias_b.district,
    cam.title as campaign_title,
    cam.reward_label,
    cam.sponsor_name
  from public.dkd_business_coupons dkd_alias_c
  join public.dkd_businesses dkd_alias_b on dkd_alias_b.id = dkd_alias_c.business_id
  left join public.dkd_business_campaigns cam on cam.id = dkd_alias_c.campaign_id
  where dkd_alias_c.player_id = auth.uid()
  order by dkd_alias_c.issued_at desc, dkd_alias_c.created_at desc;
$$;

grant execute on function public.dkd_player_my_business_coupons() to authenticated;

-- ------------------------------------------------------------
-- Legacy public object audit + safe rename to dkd_ standard
-- Repo taramasında böyle nesne görünmedi; bu blok canlı DB tarafını da tarar.
-- Hedef yoksa rename yapar, hedef varsa skip eder.
-- ------------------------------------------------------------

do $$
declare
  dkd_row record;
  dkd_var_new_name text;
  dkd_var_target_exists boolean;
begin
  -- tables / views / matviews / sequences
  for dkd_row in
    select dkd_alias_c.relname as old_name,
           dkd_alias_c.relkind as relkind
    from pg_class dkd_alias_c
    join pg_namespace dkd_alias_n on dkd_alias_n.oid = dkd_alias_c.relnamespace
    where dkd_alias_n.nspname = 'public'
      and dkd_alias_c.relkind in ('r','v','m','S')
      and dkd_alias_c.relname ~ '^[vrpt]_'
    order by dkd_alias_c.relname
  loop
    dkd_var_new_name := 'dkd_' || regexp_replace(dkd_row.old_name, '^[vrpt]_', '');

    select exists(
      select 1
      from pg_class c2
      join pg_namespace n2 on n2.oid = c2.relnamespace
      where n2.nspname = 'public'
        and c2.relname = dkd_var_new_name
    ) into dkd_var_target_exists;

    if dkd_var_target_exists then
      raise notice '[skip][relation] % -> % (target already exists)', dkd_row.old_name, dkd_var_new_name;
    else
      if dkd_row.relkind = 'r' then
        execute format('alter table public.%I rename to %I', dkd_row.old_name, dkd_var_new_name);
      elsif dkd_row.relkind = 'v' then
        execute format('alter view public.%I rename to %I', dkd_row.old_name, dkd_var_new_name);
      elsif dkd_row.relkind = 'm' then
        execute format('alter materialized view public.%I rename to %I', dkd_row.old_name, dkd_var_new_name);
      elsif dkd_row.relkind = 'S' then
        execute format('alter sequence public.%I rename to %I', dkd_row.old_name, dkd_var_new_name);
      end if;
      raise notice '[ok][relation] % -> %', dkd_row.old_name, dkd_var_new_name;
    end if;
  end loop;

  -- functions
  for dkd_row in
    select dkd_alias_p.oid,
           dkd_alias_p.proname as old_name,
           pg_get_function_identity_arguments(dkd_alias_p.oid) as args
    from pg_proc dkd_alias_p
    join pg_namespace dkd_alias_n on dkd_alias_n.oid = dkd_alias_p.pronamespace
    where dkd_alias_n.nspname = 'public'
      and dkd_alias_p.proname ~ '^[vrpt]_'
    order by dkd_alias_p.proname, pg_get_function_identity_arguments(dkd_alias_p.oid)
  loop
    dkd_var_new_name := 'dkd_' || regexp_replace(dkd_row.old_name, '^[vrpt]_', '');

    select exists(
      select 1
      from pg_proc p2
      join pg_namespace n2 on n2.oid = p2.pronamespace
      where n2.nspname = 'public'
        and p2.proname = dkd_var_new_name
        and pg_get_function_identity_arguments(p2.oid) = dkd_row.args
    ) into dkd_var_target_exists;

    if dkd_var_target_exists then
      raise notice '[skip][function] %.%(%) -> % (target already exists)', 'public', dkd_row.old_name, dkd_row.args, dkd_var_new_name;
    else
      execute format('alter function public.%I(%s) rename to %I', dkd_row.old_name, dkd_row.args, dkd_var_new_name);
      raise notice '[ok][function] %.%(%) -> %', 'public', dkd_row.old_name, dkd_row.args, dkd_var_new_name;
    end if;
  end loop;
end $$;

commit;
