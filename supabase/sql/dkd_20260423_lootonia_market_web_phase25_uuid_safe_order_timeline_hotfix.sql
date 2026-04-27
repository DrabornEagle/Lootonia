begin;

alter table if exists public.dkd_business_product_orders
  add column if not exists buyer_user_id uuid,
  add column if not exists unit_price_token integer not null default 0,
  add column if not exists total_price_token integer not null default 0,
  add column if not exists currency_code text not null default 'TOKEN',
  add column if not exists snapshot jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default timezone('utc', now()),
  add column if not exists delivery_address_text text,
  add column if not exists delivery_note_text text,
  add column if not exists delivery_lat numeric,
  add column if not exists delivery_lng numeric;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'dkd_business_product_orders'
      and column_name = 'user_id'
  ) then
    execute $update$
      update public.dkd_business_product_orders
      set buyer_user_id = coalesce(buyer_user_id, user_id)
      where buyer_user_id is null
        and user_id is not null
    $update$;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'dkd_business_product_orders'
      and column_name = 'token_spent'
  ) then
    execute $update$
      update public.dkd_business_product_orders
      set total_price_token = case
            when coalesce(total_price_token, 0) > 0 then total_price_token
            else greatest(coalesce(token_spent, 0), 0)
          end
      where coalesce(total_price_token, 0) <= 0
    $update$;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'dkd_business_product_orders'
      and column_name = 'delivery_note'
  ) then
    execute $update$
      update public.dkd_business_product_orders
      set delivery_note_text = coalesce(nullif(trim(delivery_note_text), ''), nullif(trim(delivery_note), ''))
      where coalesce(nullif(trim(delivery_note_text), ''), '') = ''
    $update$;
  end if;
end $$;

update public.dkd_business_product_orders
set unit_price_token = case
      when coalesce(unit_price_token, 0) > 0 then unit_price_token
      when greatest(coalesce(quantity, 1), 1) > 0 then floor(coalesce(total_price_token, 0)::numeric / greatest(coalesce(quantity, 1), 1))::integer
      else coalesce(total_price_token, 0)
    end,
    currency_code = case when coalesce(nullif(trim(currency_code), ''), '') = '' then 'TOKEN' else currency_code end,
    updated_at = coalesce(updated_at, created_at, timezone('utc', now()))
where true;

update public.dkd_business_product_orders
set status = case lower(coalesce(status, ''))
    when 'placed' then 'paid_token'
    when 'paid' then 'paid_token'
    when 'assigned' then 'assigned_courier'
    when 'accepted' then 'assigned_courier'
    when 'completed' then 'delivered'
    else status
  end
where lower(coalesce(status, '')) in ('placed', 'paid', 'assigned', 'accepted', 'completed');

update public.dkd_business_product_orders
set snapshot = coalesce(snapshot, '{}'::jsonb)
  || jsonb_strip_nulls(
      jsonb_build_object(
        'product_title', coalesce(snapshot->>'product_title', snapshot->>'product_name'),
        'business_name', snapshot->>'business_name',
        'image_url', snapshot->>'image_url',
        'delivery_address_text', coalesce(snapshot->>'delivery_address_text', delivery_address_text),
        'delivery_note_text', coalesce(snapshot->>'delivery_note_text', delivery_note_text)
      )
    )
where true;

create index if not exists idx_dkd_business_product_orders_buyer_created_v3
  on public.dkd_business_product_orders(buyer_user_id, created_at desc);

create index if not exists idx_dkd_business_product_orders_product_created_v3
  on public.dkd_business_product_orders(product_id, created_at desc);

create index if not exists idx_dkd_courier_jobs_order_id_v3
  on public.dkd_courier_jobs(order_id);

drop trigger if exists dkd_write_business_order_status_history on public.dkd_business_product_orders;
drop function if exists public.dkd_write_business_order_status_history();
drop trigger if exists dkd_sync_business_order_status_from_courier_job on public.dkd_courier_jobs;
drop function if exists public.dkd_sync_business_order_status_from_courier_job();
drop function if exists public.dkd_map_courier_job_status_to_business_order_status(text, text);
drop table if exists public.dkd_business_order_status_history cascade;

do $$
declare
  dkd_order_id_type_value text;
  dkd_business_id_type_value text;
begin
  select pg_catalog.format_type(dkd_attribute_table.atttypid, dkd_attribute_table.atttypmod)
  into dkd_order_id_type_value
  from pg_catalog.pg_attribute dkd_attribute_table
  join pg_catalog.pg_class dkd_class_table
    on dkd_class_table.oid = dkd_attribute_table.attrelid
  join pg_catalog.pg_namespace dkd_namespace_table
    on dkd_namespace_table.oid = dkd_class_table.relnamespace
  where dkd_namespace_table.nspname = 'public'
    and dkd_class_table.relname = 'dkd_business_product_orders'
    and dkd_attribute_table.attname = 'id'
    and dkd_attribute_table.attnum > 0
    and not dkd_attribute_table.attisdropped;

  select pg_catalog.format_type(dkd_attribute_table.atttypid, dkd_attribute_table.atttypmod)
  into dkd_business_id_type_value
  from pg_catalog.pg_attribute dkd_attribute_table
  join pg_catalog.pg_class dkd_class_table
    on dkd_class_table.oid = dkd_attribute_table.attrelid
  join pg_catalog.pg_namespace dkd_namespace_table
    on dkd_namespace_table.oid = dkd_class_table.relnamespace
  where dkd_namespace_table.nspname = 'public'
    and dkd_class_table.relname = 'dkd_business_product_orders'
    and dkd_attribute_table.attname = 'business_id'
    and dkd_attribute_table.attnum > 0
    and not dkd_attribute_table.attisdropped;

  if dkd_order_id_type_value is null then
    raise exception 'dkd_business_product_orders.id tipi okunamadı';
  end if;

  if dkd_business_id_type_value is null then
    dkd_business_id_type_value := 'uuid';
  end if;

  execute format($create_table$
    create table public.dkd_business_order_status_history (
      id bigserial primary key,
      order_id %s not null,
      business_id %s,
      actor_user_id uuid,
      status_key text not null,
      title_text text not null,
      note_text text,
      created_at timestamptz not null default timezone('utc', now())
    )
  $create_table$, dkd_order_id_type_value, dkd_business_id_type_value);
end $$;

create index if not exists dkd_business_order_status_history_order_created_idx
  on public.dkd_business_order_status_history(order_id, created_at asc);

alter table public.dkd_business_order_status_history enable row level security;

drop policy if exists dkd_business_order_status_history_select_readers on public.dkd_business_order_status_history;
create policy dkd_business_order_status_history_select_readers
  on public.dkd_business_order_status_history
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.dkd_business_product_orders as dkd_order
      where dkd_order.id::text = dkd_business_order_status_history.order_id::text
        and (
          dkd_order.buyer_user_id = auth.uid()
          or public.dkd_business_is_member(dkd_order.business_id)
          or coalesce(public.dkd_is_admin(), false)
        )
    )
  );

grant select on public.dkd_business_order_status_history to authenticated;
grant usage, select on sequence public.dkd_business_order_status_history_id_seq to authenticated;

create or replace function public.dkd_market_business_order_status_title(
  dkd_param_status text
)
returns text
language sql
immutable
as $$
  select case lower(coalesce(dkd_param_status, 'paid_token'))
    when 'paid' then 'Sipariş alındı'
    when 'paid_token' then 'Sipariş alındı'
    when 'assigned_courier' then 'Kurye atandı'
    when 'courier_assigned' then 'Kurye atandı'
    when 'picked_up' then 'Hazırlandı ve yola çıktı'
    when 'on_the_way' then 'Hazırlandı ve yola çıktı'
    when 'shipping' then 'Hazırlandı ve yola çıktı'
    when 'delivered' then 'Teslim edildi'
    when 'completed' then 'Teslim edildi'
    when 'cancelled' then 'Sipariş iptal edildi'
    when 'canceled' then 'Sipariş iptal edildi'
    when 'failed' then 'Sipariş iptal edildi'
    else 'Sipariş güncellendi'
  end
$$;

create or replace function public.dkd_market_business_order_status_note(
  dkd_param_status text,
  dkd_param_delivery_address_text text,
  dkd_param_snapshot jsonb
)
returns text
language sql
immutable
as $$
  select case lower(coalesce(dkd_param_status, 'paid_token'))
    when 'paid' then coalesce(nullif(trim(dkd_param_delivery_address_text), ''), nullif(trim(dkd_param_snapshot->>'delivery_address_text'), ''), 'Ödeme onayı tamamlandı.')
    when 'paid_token' then coalesce(nullif(trim(dkd_param_delivery_address_text), ''), nullif(trim(dkd_param_snapshot->>'delivery_address_text'), ''), 'Ödeme onayı tamamlandı.')
    when 'assigned_courier' then 'Kurye ataması yapıldı.'
    when 'courier_assigned' then 'Kurye ataması yapıldı.'
    when 'picked_up' then 'Kurye ürünü teslim aldı ve teslimat hattına çıktı.'
    when 'on_the_way' then 'Kurye ürünü teslim aldı ve teslimat hattına çıktı.'
    when 'shipping' then 'Kurye ürünü teslim aldı ve teslimat hattına çıktı.'
    when 'delivered' then 'Sipariş başarıyla teslim edildi.'
    when 'completed' then 'Sipariş başarıyla teslim edildi.'
    when 'cancelled' then 'Sipariş iptal edildi.'
    when 'canceled' then 'Sipariş iptal edildi.'
    when 'failed' then 'Sipariş iptal edildi.'
    else null
  end
$$;

create or replace function public.dkd_write_business_order_status_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_status_key_value text := coalesce(new.status, 'paid_token');
  dkd_title_text_value text;
  dkd_note_text_value text;
begin
  dkd_title_text_value := public.dkd_market_business_order_status_title(dkd_status_key_value);
  dkd_note_text_value := public.dkd_market_business_order_status_note(
    dkd_status_key_value,
    new.delivery_address_text,
    coalesce(new.snapshot, '{}'::jsonb)
  );

  if tg_op = 'INSERT' then
    insert into public.dkd_business_order_status_history (
      order_id,
      business_id,
      actor_user_id,
      status_key,
      title_text,
      note_text,
      created_at
    ) values (
      new.id,
      new.business_id,
      coalesce(new.buyer_user_id, auth.uid()),
      dkd_status_key_value,
      dkd_title_text_value,
      dkd_note_text_value,
      coalesce(new.created_at, timezone('utc', now()))
    );
    return new;
  end if;

  if coalesce(old.status, '') is distinct from coalesce(new.status, '') then
    insert into public.dkd_business_order_status_history (
      order_id,
      business_id,
      actor_user_id,
      status_key,
      title_text,
      note_text,
      created_at
    ) values (
      new.id,
      new.business_id,
      coalesce(auth.uid(), new.buyer_user_id),
      dkd_status_key_value,
      dkd_title_text_value,
      dkd_note_text_value,
      timezone('utc', now())
    );
  end if;

  return new;
end;
$$;

create trigger dkd_write_business_order_status_history
after insert or update of status on public.dkd_business_product_orders
for each row
execute function public.dkd_write_business_order_status_history();

create or replace function public.dkd_map_courier_job_status_to_business_order_status(
  dkd_param_status text,
  dkd_param_pickup_status text default null
)
returns text
language sql
immutable
as $$
  select case
    when lower(coalesce(dkd_param_pickup_status, '')) = 'delivered' then 'delivered'
    when lower(coalesce(dkd_param_status, '')) = 'accepted' then 'assigned_courier'
    when lower(coalesce(dkd_param_status, '')) = 'picked_up' then 'picked_up'
    when lower(coalesce(dkd_param_status, '')) in ('completed', 'delivered') then 'delivered'
    else null
  end
$$;

do $$
begin
  if to_regclass('public.dkd_courier_jobs') is null then
    return;
  end if;

  execute $sql$
    create or replace function public.dkd_sync_business_order_status_from_courier_job()
    returns trigger
    language plpgsql
    security definer
    set search_path = public
    as $$
    declare
      dkd_target_status_value text;
    begin
      if new.order_id is null then
        return new;
      end if;

      dkd_target_status_value := public.dkd_map_courier_job_status_to_business_order_status(new.status, new.pickup_status);
      if dkd_target_status_value is null then
        return new;
      end if;

      update public.dkd_business_product_orders
      set status = dkd_target_status_value,
          updated_at = timezone('utc', now())
      where id::text = new.order_id::text
        and coalesce(status, '') is distinct from dkd_target_status_value;

      return new;
    end;
    $$;
  $sql$;

  execute $sql$
    create trigger dkd_sync_business_order_status_from_courier_job
    after insert or update of status, pickup_status on public.dkd_courier_jobs
    for each row
    execute function public.dkd_sync_business_order_status_from_courier_job()
  $sql$;

  execute $sql$
    with dkd_courier_order_state_values as (
      select distinct on (dkd_courier_job_table.order_id::text)
        dkd_courier_job_table.order_id::text as dkd_order_key_value,
        public.dkd_map_courier_job_status_to_business_order_status(dkd_courier_job_table.status, dkd_courier_job_table.pickup_status) as dkd_target_status_value
      from public.dkd_courier_jobs as dkd_courier_job_table
      where dkd_courier_job_table.order_id is not null
        and public.dkd_map_courier_job_status_to_business_order_status(dkd_courier_job_table.status, dkd_courier_job_table.pickup_status) is not null
      order by dkd_courier_job_table.order_id::text, coalesce(dkd_courier_job_table.updated_at, dkd_courier_job_table.created_at) desc, dkd_courier_job_table.id desc
    )
    update public.dkd_business_product_orders as dkd_order
    set status = dkd_courier_order_state_values.dkd_target_status_value,
        updated_at = timezone('utc', now())
    from dkd_courier_order_state_values
    where dkd_order.id::text = dkd_courier_order_state_values.dkd_order_key_value
      and coalesce(dkd_order.status, '') is distinct from dkd_courier_order_state_values.dkd_target_status_value
  $sql$;
end $$;

insert into public.dkd_business_order_status_history (
  order_id,
  business_id,
  actor_user_id,
  status_key,
  title_text,
  note_text,
  created_at
)
select
  dkd_order.id,
  dkd_order.business_id,
  dkd_order.buyer_user_id,
  coalesce(dkd_order.status, 'paid_token') as status_key,
  public.dkd_market_business_order_status_title(coalesce(dkd_order.status, 'paid_token')),
  public.dkd_market_business_order_status_note(coalesce(dkd_order.status, 'paid_token'), dkd_order.delivery_address_text, coalesce(dkd_order.snapshot, '{}'::jsonb)),
  coalesce(dkd_order.created_at, timezone('utc', now()))
from public.dkd_business_product_orders as dkd_order;

create or replace function public.dkd_market_web_public_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_ui_payload_value jsonb;
  dkd_token_pack_payload_value jsonb;
  dkd_business_product_payload_value jsonb;
  dkd_listing_payload_value jsonb;
begin
  select to_jsonb(dkd_ui_row_value)
  into dkd_ui_payload_value
  from (
    select
      dkd_market_ui_config_table.id,
      dkd_market_ui_config_table.hero_kicker,
      dkd_market_ui_config_table.hero_title,
      dkd_market_ui_config_table.hero_subtitle,
      dkd_market_ui_config_table.logic_title,
      dkd_market_ui_config_table.logic_body,
      dkd_market_ui_config_table.hero_icon_name,
      dkd_market_ui_config_table.hero_icon_accent,
      dkd_market_ui_config_table.hero_background_image_url,
      dkd_market_ui_config_table.hero_visual_preset
    from public.dkd_market_ui_config dkd_market_ui_config_table
    where dkd_market_ui_config_table.id = 1
  ) dkd_ui_row_value;

  select coalesce(jsonb_agg(to_jsonb(dkd_token_pack_row_value)), '[]'::jsonb)
  into dkd_token_pack_payload_value
  from (
    select
      dkd_market_shop_defs_table.id,
      dkd_market_shop_defs_table.pack_key,
      dkd_market_shop_defs_table.title,
      dkd_market_shop_defs_table.subtitle,
      dkd_market_shop_defs_table.description,
      dkd_market_shop_defs_table.badge_label,
      dkd_market_shop_defs_table.icon_name,
      dkd_market_shop_defs_table.accent_key,
      dkd_market_shop_defs_table.art_image_url,
      dkd_market_shop_defs_table.panel_style,
      dkd_market_shop_defs_table.background_tone,
      dkd_market_shop_defs_table.visual_preset,
      dkd_market_shop_defs_table.price_token,
      dkd_market_shop_defs_table.reward_kind,
      dkd_market_shop_defs_table.reward_amount,
      dkd_market_shop_defs_table.sort_order,
      dkd_market_shop_defs_table.is_active
    from public.dkd_market_shop_defs dkd_market_shop_defs_table
    where coalesce(dkd_market_shop_defs_table.is_active, false) = true
    order by dkd_market_shop_defs_table.sort_order asc, dkd_market_shop_defs_table.id asc
  ) dkd_token_pack_row_value;

  select coalesce(jsonb_agg(to_jsonb(dkd_business_product_row_value)), '[]'::jsonb)
  into dkd_business_product_payload_value
  from (
    select
      dkd_business_product_table.id,
      dkd_business_product_table.business_id,
      dkd_business_product_table.title,
      dkd_business_product_table.description,
      dkd_business_product_table.category,
      dkd_business_product_table.image_url,
      dkd_business_product_table.price_token,
      dkd_business_product_table.price_cash,
      dkd_business_product_table.currency_code,
      dkd_business_product_table.stock,
      dkd_business_product_table.delivery_fee_tl,
      dkd_business_product_table.sort_order,
      dkd_business_table.name as business_name,
      dkd_business_table.category as business_category,
      dkd_business_table.address_text as business_address_text,
      dkd_business_table.lat as business_lat,
      dkd_business_table.lng as business_lng,
      coalesce(dkd_order_stats_table.dkd_total_order_count_value, 0) as total_order_count,
      coalesce(dkd_order_stats_table.dkd_completed_order_count_value, 0) as completed_order_count,
      coalesce(dkd_order_stats_table.dkd_total_order_count_value, 0) as order_count
    from public.dkd_business_products dkd_business_product_table
    join public.dkd_businesses dkd_business_table
      on dkd_business_table.id = dkd_business_product_table.business_id
    left join lateral (
      select
        count(*)::integer as dkd_total_order_count_value,
        count(*) filter (where lower(coalesce(dkd_order_table.status, '')) in ('delivered', 'completed'))::integer as dkd_completed_order_count_value
      from public.dkd_business_product_orders dkd_order_table
      where dkd_order_table.product_id = dkd_business_product_table.id
    ) dkd_order_stats_table on true
    where coalesce(dkd_business_product_table.is_active, false) = true
      and coalesce(dkd_business_product_table.stock, 0) > 0
      and coalesce(dkd_business_table.is_active, true) = true
    order by
      coalesce(dkd_order_stats_table.dkd_completed_order_count_value, 0) desc,
      coalesce(dkd_order_stats_table.dkd_total_order_count_value, 0) desc,
      dkd_business_product_table.sort_order asc,
      dkd_business_product_table.updated_at desc
  ) dkd_business_product_row_value;

  select coalesce(jsonb_agg(to_jsonb(dkd_listing_row_value)), '[]'::jsonb)
  into dkd_listing_payload_value
  from (
    select
      dkd_market_listing_table.id,
      dkd_market_listing_table.seller_id,
      dkd_market_listing_table.user_card_id,
      dkd_user_card_table.card_def_id,
      dkd_market_listing_table.price_token,
      dkd_market_listing_table.fee_token,
      dkd_market_listing_table.status,
      dkd_market_listing_table.created_at,
      dkd_market_listing_table.updated_at,
      dkd_card_def_table.name as card_name,
      dkd_card_def_table.series as card_series,
      dkd_card_def_table.serial_code as card_serial_code,
      dkd_card_def_table.rarity as card_rarity,
      dkd_card_def_table.theme as card_theme,
      dkd_card_def_table.art_image_url as card_art_image_url,
      dkd_profile_table.nickname as seller_nickname
    from public.dkd_market_listings dkd_market_listing_table
    left join public.dkd_user_cards dkd_user_card_table
      on dkd_user_card_table.id = dkd_market_listing_table.user_card_id
    left join public.dkd_card_defs dkd_card_def_table
      on dkd_card_def_table.id = dkd_user_card_table.card_def_id
    left join public.dkd_profiles dkd_profile_table
      on dkd_profile_table.user_id = dkd_market_listing_table.seller_id
    where dkd_market_listing_table.status = 'active'
    order by dkd_market_listing_table.created_at desc
    limit 48
  ) dkd_listing_row_value;

  return jsonb_build_object(
    'ui', coalesce(dkd_ui_payload_value, '{}'::jsonb),
    'token_packs', coalesce(dkd_token_pack_payload_value, '[]'::jsonb),
    'business_products', coalesce(dkd_business_product_payload_value, '[]'::jsonb),
    'listings', coalesce(dkd_listing_payload_value, '[]'::jsonb),
    'generated_at', now()
  );
end;
$$;

revoke all on function public.dkd_market_web_public_snapshot() from public;
grant execute on function public.dkd_market_web_public_snapshot() to anon;
grant execute on function public.dkd_market_web_public_snapshot() to authenticated;
grant execute on function public.dkd_market_web_public_snapshot() to service_role;

commit;
