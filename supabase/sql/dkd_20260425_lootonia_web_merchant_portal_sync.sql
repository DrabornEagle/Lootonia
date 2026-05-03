-- DKD Lootonia Web Merchant Portal Sync
-- Standard: dkd_

begin;

create extension if not exists pgcrypto;

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

alter table if exists public.dkd_business_campaigns add column if not exists campaign_key text;
alter table if exists public.dkd_business_campaigns add column if not exists subtitle text;
alter table if exists public.dkd_business_campaigns add column if not exists task_key text;
alter table if exists public.dkd_business_campaigns add column if not exists source_kind text default 'sponsor';
alter table if exists public.dkd_business_campaigns add column if not exists stock_total integer default 0;
alter table if exists public.dkd_business_campaigns add column if not exists stock_left integer default 0;
alter table if exists public.dkd_business_campaigns add column if not exists coupon_reward_label text;
alter table if exists public.dkd_business_campaigns add column if not exists starts_at timestamptz default now();
alter table if exists public.dkd_business_campaigns add column if not exists ends_at timestamptz;
alter table if exists public.dkd_business_campaigns add column if not exists is_active boolean default true;
alter table if exists public.dkd_business_campaigns add column if not exists updated_at timestamptz default now();

create or replace function public.dkd_web_merchant_portal_can_manage_dkd(
  dkd_param_business_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.dkd_business_memberships dkd_membership
    where dkd_membership.business_id = dkd_param_business_id
      and dkd_membership.user_id = auth.uid()
      and coalesce(dkd_membership.is_active, true) = true
      and coalesce(dkd_membership.role_key, 'manager') in ('owner', 'manager', 'staff', 'admin')
  );
$$;

create or replace function public.dkd_web_merchant_portal_snapshot_dkd()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_user_id_value uuid;
  dkd_business_id_value uuid;
  dkd_business_json_value jsonb := '{}'::jsonb;
  dkd_membership_json_value jsonb := '{}'::jsonb;
  dkd_scan_time_column_value text;
  dkd_scan_user_column_value text;
  dkd_coupon_time_column_value text;
  dkd_coupon_user_column_value text;
  dkd_scan_count_value integer := 0;
  dkd_unique_count_value integer := 0;
  dkd_coupon_count_value integer := 0;
  dkd_new_player_count_value integer := 0;
  dkd_returning_player_count_value integer := 0;
  dkd_conversion_rate_value numeric := 0;
  dkd_hourly_json_value jsonb := '[]'::jsonb;
  dkd_daily_json_value jsonb := '[]'::jsonb;
  dkd_task_json_value jsonb := '[]'::jsonb;
  dkd_campaign_json_value jsonb := '[]'::jsonb;
  dkd_product_json_value jsonb := '[]'::jsonb;
  dkd_market_product_json_value jsonb := '[]'::jsonb;
  dkd_cash_json_value jsonb := '{}'::jsonb;
  dkd_sql_value text;
begin
  dkd_user_id_value := auth.uid();
  if dkd_user_id_value is null then
    return jsonb_build_object('ok', false, 'reason', 'auth_required');
  end if;

  select dkd_membership.business_id,
         to_jsonb(dkd_membership)
    into dkd_business_id_value,
         dkd_membership_json_value
  from public.dkd_business_memberships dkd_membership
  where dkd_membership.user_id = dkd_user_id_value
    and coalesce(dkd_membership.is_active, true) = true
  order by case coalesce(dkd_membership.role_key, '')
    when 'owner' then 1
    when 'manager' then 2
    when 'admin' then 3
    when 'staff' then 4
    else 9
  end,
  dkd_membership.created_at desc
  limit 1;

  if dkd_business_id_value is null then
    return jsonb_build_object('ok', false, 'reason', 'business_not_found');
  end if;

  select to_jsonb(dkd_business_row)
    into dkd_business_json_value
  from (
    select *
    from public.dkd_businesses
    where id = dkd_business_id_value
    limit 1
  ) dkd_business_row;

  select dkd_column.column_name
    into dkd_scan_time_column_value
  from information_schema.columns dkd_column
  where dkd_column.table_schema = 'public'
    and dkd_column.table_name = 'dkd_business_qr_scans'
    and dkd_column.column_name in ('scanned_at', 'created_at')
  order by case dkd_column.column_name when 'scanned_at' then 1 else 2 end
  limit 1;

  select dkd_column.column_name
    into dkd_scan_user_column_value
  from information_schema.columns dkd_column
  where dkd_column.table_schema = 'public'
    and dkd_column.table_name = 'dkd_business_qr_scans'
    and dkd_column.column_name in ('user_id', 'player_id')
  order by case dkd_column.column_name when 'user_id' then 1 else 2 end
  limit 1;

  if dkd_scan_time_column_value is not null then
    dkd_sql_value := format(
      'select count(*)::int, %s from public.dkd_business_qr_scans where business_id = $1 and (%I at time zone ''Europe/Istanbul'')::date = (now() at time zone ''Europe/Istanbul'')::date',
      case when dkd_scan_user_column_value is null then '0::int' else format('count(distinct %I)::int', dkd_scan_user_column_value) end,
      dkd_scan_time_column_value
    );
    execute dkd_sql_value using dkd_business_id_value into dkd_scan_count_value, dkd_unique_count_value;

    dkd_sql_value := format(
      'select coalesce(jsonb_agg(jsonb_build_object(''hour'', dkd_hour_value, ''count'', dkd_count_value) order by dkd_hour_value), ''[]''::jsonb) from (select extract(hour from (%I at time zone ''Europe/Istanbul''))::int as dkd_hour_value, count(*)::int as dkd_count_value from public.dkd_business_qr_scans where business_id = $1 and (%I at time zone ''Europe/Istanbul'')::date = (now() at time zone ''Europe/Istanbul'')::date group by 1) dkd_hour_rows',
      dkd_scan_time_column_value,
      dkd_scan_time_column_value
    );
    execute dkd_sql_value using dkd_business_id_value into dkd_hourly_json_value;

    dkd_sql_value := format(
      'select coalesce(jsonb_agg(jsonb_build_object(''day'', dkd_day_value, ''count'', dkd_count_value) order by dkd_day_value), ''[]''::jsonb) from (select (%I at time zone ''Europe/Istanbul'')::date as dkd_day_value, count(*)::int as dkd_count_value from public.dkd_business_qr_scans where business_id = $1 and (%I at time zone ''Europe/Istanbul'')::date >= ((now() at time zone ''Europe/Istanbul'')::date - 6) group by 1) dkd_day_rows',
      dkd_scan_time_column_value,
      dkd_scan_time_column_value
    );
    execute dkd_sql_value using dkd_business_id_value into dkd_daily_json_value;

    if dkd_scan_user_column_value is not null then
      dkd_sql_value := format(
        'with dkd_first_scan as (select %I as dkd_player_id_value, min((%I at time zone ''Europe/Istanbul'')::date) as dkd_first_day_value from public.dkd_business_qr_scans where business_id = $1 and %I is not null group by %I), dkd_today_scan as (select distinct %I as dkd_player_id_value from public.dkd_business_qr_scans where business_id = $1 and %I is not null and (%I at time zone ''Europe/Istanbul'')::date = (now() at time zone ''Europe/Istanbul'')::date) select count(*) filter (where dkd_first_scan.dkd_first_day_value = (now() at time zone ''Europe/Istanbul'')::date)::int, count(*) filter (where dkd_first_scan.dkd_first_day_value < (now() at time zone ''Europe/Istanbul'')::date)::int from dkd_today_scan join dkd_first_scan using (dkd_player_id_value)',
        dkd_scan_user_column_value,
        dkd_scan_time_column_value,
        dkd_scan_user_column_value,
        dkd_scan_user_column_value,
        dkd_scan_user_column_value,
        dkd_scan_user_column_value,
        dkd_scan_time_column_value
      );
      execute dkd_sql_value using dkd_business_id_value into dkd_new_player_count_value, dkd_returning_player_count_value;
    end if;

    if exists (
      select 1 from information_schema.columns dkd_column
      where dkd_column.table_schema = 'public'
        and dkd_column.table_name = 'dkd_business_qr_scans'
        and dkd_column.column_name = 'task_key'
    ) then
      dkd_sql_value := format(
        'select coalesce(jsonb_agg(jsonb_build_object(''task_key'', dkd_task_key_value, ''count'', dkd_count_value) order by dkd_count_value desc), ''[]''::jsonb) from (select coalesce(nullif(trim(task_key), ''''), ''organik'') as dkd_task_key_value, count(*)::int as dkd_count_value from public.dkd_business_qr_scans where business_id = $1 and (%I at time zone ''Europe/Istanbul'')::date >= ((now() at time zone ''Europe/Istanbul'')::date - 6) group by 1 limit 8) dkd_task_rows',
        dkd_scan_time_column_value
      );
      execute dkd_sql_value using dkd_business_id_value into dkd_task_json_value;
    end if;
  end if;

  select dkd_column.column_name
    into dkd_coupon_time_column_value
  from information_schema.columns dkd_column
  where dkd_column.table_schema = 'public'
    and dkd_column.table_name = 'dkd_business_coupon_uses'
    and dkd_column.column_name in ('used_at', 'created_at')
  order by case dkd_column.column_name when 'used_at' then 1 else 2 end
  limit 1;

  select dkd_column.column_name
    into dkd_coupon_user_column_value
  from information_schema.columns dkd_column
  where dkd_column.table_schema = 'public'
    and dkd_column.table_name = 'dkd_business_coupon_uses'
    and dkd_column.column_name in ('user_id', 'player_id')
  order by case dkd_column.column_name when 'user_id' then 1 else 2 end
  limit 1;

  if dkd_coupon_time_column_value is not null then
    dkd_sql_value := format(
      'select count(*)::int from public.dkd_business_coupon_uses where business_id = $1 and (%I at time zone ''Europe/Istanbul'')::date = (now() at time zone ''Europe/Istanbul'')::date',
      dkd_coupon_time_column_value
    );
    execute dkd_sql_value using dkd_business_id_value into dkd_coupon_count_value;
  end if;

  if coalesce(dkd_scan_count_value, 0) > 0 then
    dkd_conversion_rate_value := round((coalesce(dkd_coupon_count_value, 0)::numeric / dkd_scan_count_value::numeric) * 100.0, 1);
  end if;

  if to_regclass('public.dkd_business_campaigns') is not null then
    select coalesce(jsonb_agg(to_jsonb(dkd_campaign_row)), '[]'::jsonb)
      into dkd_campaign_json_value
    from (
      select *
      from public.dkd_business_campaigns
      where business_id = dkd_business_id_value
      order by coalesce(updated_at, starts_at, now()) desc
      limit 10
    ) dkd_campaign_row;
  end if;

  if to_regclass('public.dkd_business_products') is not null then
    select coalesce(jsonb_agg(jsonb_build_object(
      'source_table', 'dkd_business_products',
      'id', dkd_product.id::text,
      'title', dkd_product.title,
      'description', dkd_product.description,
      'category', dkd_product.category,
      'image_url', dkd_product.image_url,
      'price_cash', dkd_product.price_cash,
      'currency_code', dkd_product.currency_code,
      'stock', dkd_product.stock,
      'sort_order', dkd_product.sort_order,
      'is_active', dkd_product.is_active
    ) order by dkd_product.sort_order, dkd_product.updated_at desc), '[]'::jsonb)
      into dkd_product_json_value
    from public.dkd_business_products dkd_product
    where dkd_product.business_id = dkd_business_id_value;
  end if;

  if to_regclass('public.dkd_business_market_products') is not null then
    select coalesce(jsonb_agg(jsonb_build_object(
      'source_table', 'dkd_business_market_products',
      'id', dkd_market_product.id::text,
      'title', dkd_market_product.name,
      'description', dkd_market_product.description,
      'category', dkd_market_product.category,
      'image_url', dkd_market_product.image_url,
      'price_cash', coalesce(dkd_market_product.discounted_price_amount, dkd_market_product.price_amount),
      'currency_code', dkd_market_product.currency_code,
      'stock', dkd_market_product.stock_quantity,
      'sort_order', dkd_market_product.sort_order,
      'is_active', dkd_market_product.is_active
    ) order by dkd_market_product.sort_order, dkd_market_product.updated_at desc), '[]'::jsonb)
      into dkd_market_product_json_value
    from public.dkd_business_market_products dkd_market_product
    where dkd_market_product.business_id = dkd_business_id_value;
  end if;

  if to_regclass('public.dkd_business_product_orders') is not null then
    select jsonb_build_object(
      'order_count', count(*)::int,
      'active_count', count(*) filter (where coalesce(dkd_order.status, '') not in ('delivered', 'completed', 'cancelled'))::int,
      'delivered_count', count(*) filter (where coalesce(dkd_order.status, '') in ('delivered', 'completed'))::int
    )
      into dkd_cash_json_value
    from public.dkd_business_product_orders dkd_order
    where dkd_order.business_id = dkd_business_id_value;
  end if;

  return jsonb_build_object(
    'ok', true,
    'business', coalesce(dkd_business_json_value, '{}'::jsonb),
    'membership', coalesce(dkd_membership_json_value, '{}'::jsonb),
    'metrics', jsonb_build_object(
      'today_players', coalesce(dkd_unique_count_value, 0),
      'scan_count', coalesce(dkd_scan_count_value, 0),
      'coupon_count', coalesce(dkd_coupon_count_value, 0),
      'conversion_rate', coalesce(dkd_conversion_rate_value, 0),
      'new_players', coalesce(dkd_new_player_count_value, 0),
      'returning_players', coalesce(dkd_returning_player_count_value, 0)
    ),
    'hourly', coalesce(dkd_hourly_json_value, '[]'::jsonb),
    'daily', coalesce(dkd_daily_json_value, '[]'::jsonb),
    'tasks', coalesce(dkd_task_json_value, '[]'::jsonb),
    'campaigns', coalesce(dkd_campaign_json_value, '[]'::jsonb),
    'products', coalesce(dkd_product_json_value, '[]'::jsonb) || coalesce(dkd_market_product_json_value, '[]'::jsonb),
    'cash', coalesce(dkd_cash_json_value, '{}'::jsonb)
  );
end;
$$;

create or replace function public.dkd_web_merchant_portal_save_business_dkd(
  dkd_param_business_id uuid,
  dkd_param_name text,
  dkd_param_category text default null,
  dkd_param_address_text text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.dkd_web_merchant_portal_can_manage_dkd(dkd_param_business_id) then
    return jsonb_build_object('ok', false, 'reason', 'business_access_denied');
  end if;

  update public.dkd_businesses
  set name = coalesce(nullif(trim(coalesce(dkd_param_name, '')), ''), name),
      category = coalesce(nullif(trim(coalesce(dkd_param_category, '')), ''), category),
      address_text = case when dkd_param_address_text is null then address_text else nullif(trim(coalesce(dkd_param_address_text, '')), '') end,
      updated_at = now()
  where id = dkd_param_business_id;

  return jsonb_build_object('ok', true, 'business_id', dkd_param_business_id);
end;
$$;

create or replace function public.dkd_web_merchant_portal_save_campaign_dkd(
  dkd_param_business_id uuid,
  dkd_param_campaign_id text default null,
  dkd_param_title text default null,
  dkd_param_subtitle text default null,
  dkd_param_reward_label text default null,
  dkd_param_stock_total integer default 0,
  dkd_param_is_active boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_campaign_id_value text;
begin
  if not public.dkd_web_merchant_portal_can_manage_dkd(dkd_param_business_id) then
    return jsonb_build_object('ok', false, 'reason', 'business_access_denied');
  end if;

  dkd_campaign_id_value := nullif(trim(coalesce(dkd_param_campaign_id, '')), '');

  if dkd_campaign_id_value is null then
    select dkd_campaign.id::text
      into dkd_campaign_id_value
    from public.dkd_business_campaigns dkd_campaign
    where dkd_campaign.business_id = dkd_param_business_id
    order by coalesce(dkd_campaign.updated_at, dkd_campaign.starts_at, now()) desc
    limit 1;
  end if;

  if dkd_campaign_id_value is not null then
    update public.dkd_business_campaigns
    set title = coalesce(nullif(trim(coalesce(dkd_param_title, '')), ''), title),
        subtitle = case when dkd_param_subtitle is null then subtitle else nullif(trim(coalesce(dkd_param_subtitle, '')), '') end,
        coupon_reward_label = case when dkd_param_reward_label is null then coupon_reward_label else nullif(trim(coalesce(dkd_param_reward_label, '')), '') end,
        stock_total = greatest(coalesce(dkd_param_stock_total, stock_total, 0), 0),
        stock_left = greatest(coalesce(dkd_param_stock_total, stock_left, 0), 0),
        is_active = coalesce(dkd_param_is_active, is_active, true),
        updated_at = now()
    where business_id = dkd_param_business_id
      and id::text = dkd_campaign_id_value;

    if found then
      return jsonb_build_object('ok', true, 'campaign_id', dkd_campaign_id_value, 'mode', 'updated');
    end if;
  end if;

  insert into public.dkd_business_campaigns (
    business_id,
    campaign_key,
    title,
    subtitle,
    task_key,
    source_kind,
    starts_at,
    stock_total,
    stock_left,
    coupon_reward_label,
    is_active,
    updated_at
  ) values (
    dkd_param_business_id,
    'dkd-web-' || replace(gen_random_uuid()::text, '-', ''),
    coalesce(nullif(trim(coalesce(dkd_param_title, '')), ''), 'Web Kampanyası'),
    nullif(trim(coalesce(dkd_param_subtitle, '')), ''),
    'web_merchant',
    'sponsor',
    now(),
    greatest(coalesce(dkd_param_stock_total, 0), 0),
    greatest(coalesce(dkd_param_stock_total, 0), 0),
    nullif(trim(coalesce(dkd_param_reward_label, '')), ''),
    coalesce(dkd_param_is_active, true),
    now()
  )
  returning id::text into dkd_campaign_id_value;

  return jsonb_build_object('ok', true, 'campaign_id', dkd_campaign_id_value, 'mode', 'inserted');
end;
$$;

create or replace function public.dkd_web_merchant_portal_save_product_dkd(
  dkd_param_business_id uuid,
  dkd_param_product_id text default null,
  dkd_param_title text default null,
  dkd_param_price_cash numeric default 0,
  dkd_param_stock integer default 0,
  dkd_param_is_active boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_product_id_value text;
begin
  if not public.dkd_web_merchant_portal_can_manage_dkd(dkd_param_business_id) then
    return jsonb_build_object('ok', false, 'reason', 'business_access_denied');
  end if;

  dkd_product_id_value := nullif(trim(coalesce(dkd_param_product_id, '')), '');

  if dkd_product_id_value is not null then
    update public.dkd_business_products
    set title = coalesce(nullif(trim(coalesce(dkd_param_title, '')), ''), title),
        price_cash = greatest(coalesce(dkd_param_price_cash, price_cash, 0), 0),
        stock = greatest(coalesce(dkd_param_stock, stock, 0), 0),
        currency_code = 'TRY',
        is_active = coalesce(dkd_param_is_active, is_active, true),
        updated_at = now()
    where business_id = dkd_param_business_id
      and id::text = dkd_product_id_value;

    if found then
      return jsonb_build_object('ok', true, 'product_id', dkd_product_id_value, 'mode', 'updated');
    end if;
  end if;

  insert into public.dkd_business_products (
    business_id,
    title,
    category,
    price_token,
    price_cash,
    currency_code,
    stock,
    sort_order,
    is_active,
    meta
  ) values (
    dkd_param_business_id,
    coalesce(nullif(trim(coalesce(dkd_param_title, '')), ''), 'Yeni Ürün'),
    'yemek',
    0,
    greatest(coalesce(dkd_param_price_cash, 0), 0),
    'TRY',
    greatest(coalesce(dkd_param_stock, 0), 0),
    0,
    coalesce(dkd_param_is_active, true),
    jsonb_build_object('source', 'web_merchant_portal')
  )
  returning id::text into dkd_product_id_value;

  return jsonb_build_object('ok', true, 'product_id', dkd_product_id_value, 'mode', 'inserted');
end;
$$;

grant execute on function public.dkd_web_merchant_portal_can_manage_dkd(uuid) to authenticated;
grant execute on function public.dkd_web_merchant_portal_snapshot_dkd() to authenticated;
grant execute on function public.dkd_web_merchant_portal_save_business_dkd(uuid, text, text, text) to authenticated;
grant execute on function public.dkd_web_merchant_portal_save_campaign_dkd(uuid, text, text, text, text, integer, boolean) to authenticated;
grant execute on function public.dkd_web_merchant_portal_save_product_dkd(uuid, text, text, numeric, integer, boolean) to authenticated;

commit;
