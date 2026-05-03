-- dkd_20260426j_urgent_courier_performance_boost.sql
-- Acil Kurye web + uygulama performans hızlandırma paketi.
-- Amaç: liste yüklemelerini indekslemek, mesaj/fiyat/sipariş sorgularını hafifletmek,
-- push event fonksiyonunun audit tablolarını hızlı okumasını sağlamak.

create or replace function public.dkd_column_exists_dkd(
  dkd_param_table_name text,
  dkd_param_column_name text
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
      from information_schema.columns dkd_column_row
     where dkd_column_row.table_schema = 'public'
       and dkd_column_row.table_name = dkd_param_table_name
       and dkd_column_row.column_name = dkd_param_column_name
  );
$$;

revoke all on function public.dkd_column_exists_dkd(text, text) from public;
grant execute on function public.dkd_column_exists_dkd(text, text) to authenticated, service_role;

do $dkd_performance_indexes$
begin
  if to_regclass('public.dkd_urgent_courier_orders') is not null then
    execute 'alter table public.dkd_urgent_courier_orders replica identity full';

    if public.dkd_column_exists_dkd('dkd_urgent_courier_orders', 'dkd_updated_at') then
      execute 'create index if not exists dkd_urgent_courier_orders_updated_desc_idx on public.dkd_urgent_courier_orders(dkd_updated_at desc)';
    end if;

    if public.dkd_column_exists_dkd('dkd_urgent_courier_orders', 'dkd_created_at') then
      execute 'create index if not exists dkd_urgent_courier_orders_created_desc_idx on public.dkd_urgent_courier_orders(dkd_created_at desc)';
    end if;

    if public.dkd_column_exists_dkd('dkd_urgent_courier_orders', 'created_at') then
      execute 'create index if not exists dkd_urgent_courier_orders_created_at_desc_idx on public.dkd_urgent_courier_orders(created_at desc)';
    end if;

    if public.dkd_column_exists_dkd('dkd_urgent_courier_orders', 'dkd_status_key') and public.dkd_column_exists_dkd('dkd_urgent_courier_orders', 'dkd_updated_at') then
      execute 'create index if not exists dkd_urgent_courier_orders_status_updated_idx on public.dkd_urgent_courier_orders(dkd_status_key, dkd_updated_at desc)';
    end if;

    if public.dkd_column_exists_dkd('dkd_urgent_courier_orders', 'dkd_customer_user_id') and public.dkd_column_exists_dkd('dkd_urgent_courier_orders', 'dkd_updated_at') then
      execute 'create index if not exists dkd_urgent_courier_orders_customer_updated_idx on public.dkd_urgent_courier_orders(dkd_customer_user_id, dkd_updated_at desc)';
    end if;

    if public.dkd_column_exists_dkd('dkd_urgent_courier_orders', 'dkd_courier_user_id') and public.dkd_column_exists_dkd('dkd_urgent_courier_orders', 'dkd_updated_at') then
      execute 'create index if not exists dkd_urgent_courier_orders_courier_updated_idx on public.dkd_urgent_courier_orders(dkd_courier_user_id, dkd_updated_at desc)';
    end if;

    if public.dkd_column_exists_dkd('dkd_urgent_courier_orders', 'dkd_status_key') and public.dkd_column_exists_dkd('dkd_urgent_courier_orders', 'dkd_courier_user_id') then
      execute 'create index if not exists dkd_urgent_courier_orders_status_courier_idx on public.dkd_urgent_courier_orders(dkd_status_key, dkd_courier_user_id)';
    end if;
  end if;

  if to_regclass('public.dkd_urgent_courier_order_items') is not null then
    execute 'alter table public.dkd_urgent_courier_order_items replica identity full';

    if public.dkd_column_exists_dkd('dkd_urgent_courier_order_items', 'dkd_order_id') then
      execute 'create index if not exists dkd_urgent_courier_order_items_order_idx on public.dkd_urgent_courier_order_items(dkd_order_id)';
    end if;

    if public.dkd_column_exists_dkd('dkd_urgent_courier_order_items', 'dkd_order_id') and public.dkd_column_exists_dkd('dkd_urgent_courier_order_items', 'dkd_updated_at') then
      execute 'create index if not exists dkd_urgent_courier_order_items_order_updated_idx on public.dkd_urgent_courier_order_items(dkd_order_id, dkd_updated_at desc)';
    end if;
  end if;

  if to_regclass('public.dkd_urgent_courier_messages') is not null then
    execute 'alter table public.dkd_urgent_courier_messages replica identity full';

    if public.dkd_column_exists_dkd('dkd_urgent_courier_messages', 'dkd_order_id') then
      execute 'create index if not exists dkd_urgent_courier_messages_order_idx on public.dkd_urgent_courier_messages(dkd_order_id)';
    end if;

    if public.dkd_column_exists_dkd('dkd_urgent_courier_messages', 'dkd_order_id') and public.dkd_column_exists_dkd('dkd_urgent_courier_messages', 'dkd_created_at') then
      execute 'create index if not exists dkd_urgent_courier_messages_order_created_idx on public.dkd_urgent_courier_messages(dkd_order_id, dkd_created_at desc)';
    end if;

    if public.dkd_column_exists_dkd('dkd_urgent_courier_messages', 'dkd_message_id') then
      execute 'create index if not exists dkd_urgent_courier_messages_message_idx on public.dkd_urgent_courier_messages(dkd_message_id)';
    end if;
  end if;

  if to_regclass('public.dkd_urgent_courier_push_audit') is not null then
    if public.dkd_column_exists_dkd('dkd_urgent_courier_push_audit', 'dkd_dedupe_key') then
      execute 'create unique index if not exists dkd_urgent_courier_push_audit_dedupe_key_idx on public.dkd_urgent_courier_push_audit(dkd_dedupe_key)';
    end if;

    if public.dkd_column_exists_dkd('dkd_urgent_courier_push_audit', 'dkd_order_id') and public.dkd_column_exists_dkd('dkd_urgent_courier_push_audit', 'dkd_created_at') then
      execute 'create index if not exists dkd_urgent_courier_push_audit_order_created_idx on public.dkd_urgent_courier_push_audit(dkd_order_id, dkd_created_at desc)';
    end if;

    if public.dkd_column_exists_dkd('dkd_urgent_courier_push_audit', 'dkd_send_status') then
      execute 'create index if not exists dkd_urgent_courier_push_audit_status_idx on public.dkd_urgent_courier_push_audit(dkd_send_status)';
    end if;
  end if;

  if to_regclass('public.dkd_push_tokens') is not null then
    if public.dkd_column_exists_dkd('dkd_push_tokens', 'user_id') and public.dkd_column_exists_dkd('dkd_push_tokens', 'is_active') then
      execute 'create index if not exists dkd_push_tokens_user_active_idx on public.dkd_push_tokens(user_id, is_active)';
    end if;

    if public.dkd_column_exists_dkd('dkd_push_tokens', 'expo_push_token') then
      execute 'create index if not exists dkd_push_tokens_expo_token_idx on public.dkd_push_tokens(expo_push_token)';
    end if;

    if public.dkd_column_exists_dkd('dkd_push_tokens', 'updated_at') then
      execute 'create index if not exists dkd_push_tokens_active_updated_idx on public.dkd_push_tokens(updated_at desc) where is_active = true and expo_push_token is not null';
    end if;
  end if;

  if to_regclass('public.dkd_courier_jobs') is not null then
    execute 'alter table public.dkd_courier_jobs replica identity full';

    if public.dkd_column_exists_dkd('dkd_courier_jobs', 'job_type') and public.dkd_column_exists_dkd('dkd_courier_jobs', 'status') and public.dkd_column_exists_dkd('dkd_courier_jobs', 'created_at') then
      execute 'create index if not exists dkd_courier_jobs_type_status_created_idx on public.dkd_courier_jobs(job_type, status, created_at desc)';
    end if;

    if public.dkd_column_exists_dkd('dkd_courier_jobs', 'is_active') and public.dkd_column_exists_dkd('dkd_courier_jobs', 'created_at') then
      execute 'create index if not exists dkd_courier_jobs_active_created_idx on public.dkd_courier_jobs(is_active, created_at desc)';
    end if;

    if public.dkd_column_exists_dkd('dkd_courier_jobs', 'cargo_meta') then
      execute 'create index if not exists dkd_courier_jobs_urgent_order_meta_idx on public.dkd_courier_jobs ((cargo_meta ->> ''dkd_urgent_order_id''))';
    end if;
  end if;
end;
$dkd_performance_indexes$;

create or replace function public.dkd_urgent_courier_fast_active_orders_dkd(
  dkd_param_limit integer default 40
)
returns jsonb
language sql
security definer
set search_path = public, auth
as $dkd_fast_orders$
  with dkd_limit_scope as (
    select least(greatest(coalesce(dkd_param_limit, 40), 5), 80) as dkd_limit_value
  ),
  dkd_order_scope as (
    select
      dkd_order_row.dkd_order_id,
      dkd_order_row.dkd_customer_user_id,
      dkd_order_row.dkd_courier_user_id,
      dkd_order_row.dkd_status_key,
      dkd_order_row.dkd_customer_full_name,
      dkd_order_row.dkd_customer_phone_text,
      dkd_order_row.dkd_customer_address_text,
      dkd_order_row.dkd_courier_fee_tl,
      dkd_order_row.dkd_product_total_tl,
      coalesce(dkd_order_row.dkd_updated_at, dkd_order_row.dkd_created_at, timezone('utc', now())) as dkd_sort_at
    from public.dkd_urgent_courier_orders dkd_order_row
    cross join dkd_limit_scope
    where auth.uid() is not null
      and (
        dkd_order_row.dkd_customer_user_id = auth.uid()
        or dkd_order_row.dkd_courier_user_id = auth.uid()
        or coalesce(dkd_order_row.dkd_status_key, '') in (
          'dkd_created',
          'dkd_waiting_courier',
          'dkd_courier_offer_waiting',
          'dkd_fee_waiting',
          'dkd_courier_shopping',
          'dkd_product_total_waiting',
          'dkd_items_picked_up'
        )
      )
    order by coalesce(dkd_order_row.dkd_updated_at, dkd_order_row.dkd_created_at, timezone('utc', now())) desc
    limit (select dkd_limit_value from dkd_limit_scope)
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'dkd_order_id', dkd_order_scope.dkd_order_id,
      'dkd_customer_user_id', dkd_order_scope.dkd_customer_user_id,
      'dkd_courier_user_id', dkd_order_scope.dkd_courier_user_id,
      'dkd_status_key', dkd_order_scope.dkd_status_key,
      'dkd_customer_full_name', dkd_order_scope.dkd_customer_full_name,
      'dkd_customer_phone_text', dkd_order_scope.dkd_customer_phone_text,
      'dkd_customer_address_text', dkd_order_scope.dkd_customer_address_text,
      'dkd_courier_fee_tl', dkd_order_scope.dkd_courier_fee_tl,
      'dkd_product_total_tl', dkd_order_scope.dkd_product_total_tl,
      'dkd_sort_at', dkd_order_scope.dkd_sort_at
    )
    order by dkd_order_scope.dkd_sort_at desc
  ), '[]'::jsonb)
  from dkd_order_scope;
$dkd_fast_orders$;

revoke all on function public.dkd_urgent_courier_fast_active_orders_dkd(integer) from public;
grant execute on function public.dkd_urgent_courier_fast_active_orders_dkd(integer) to authenticated, service_role;

create or replace function public.dkd_urgent_courier_fast_messages_dkd(
  dkd_param_order_id uuid,
  dkd_param_limit integer default 30
)
returns jsonb
language sql
security definer
set search_path = public, auth
as $dkd_fast_messages$
  with dkd_limit_scope as (
    select least(greatest(coalesce(dkd_param_limit, 30), 5), 80) as dkd_limit_value
  ),
  dkd_order_scope as (
    select dkd_order_row.dkd_order_id
    from public.dkd_urgent_courier_orders dkd_order_row
    where dkd_order_row.dkd_order_id = dkd_param_order_id
      and auth.uid() is not null
      and (
        dkd_order_row.dkd_customer_user_id = auth.uid()
        or dkd_order_row.dkd_courier_user_id = auth.uid()
      )
  ),
  dkd_message_scope as (
    select
      dkd_message_row.dkd_message_id,
      dkd_message_row.dkd_sender_user_id,
      dkd_message_row.dkd_sender_role_key,
      dkd_message_row.dkd_message_kind,
      dkd_message_row.dkd_message_text,
      dkd_message_row.dkd_created_at
    from public.dkd_urgent_courier_messages dkd_message_row
    join dkd_order_scope
      on dkd_order_scope.dkd_order_id = dkd_message_row.dkd_order_id
    order by dkd_message_row.dkd_created_at desc
    limit (select dkd_limit_value from dkd_limit_scope)
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'dkd_message_id', dkd_message_scope.dkd_message_id,
      'dkd_sender_user_id', dkd_message_scope.dkd_sender_user_id,
      'dkd_sender_role_key', dkd_message_scope.dkd_sender_role_key,
      'dkd_message_kind', dkd_message_scope.dkd_message_kind,
      'dkd_message_text', dkd_message_scope.dkd_message_text,
      'dkd_created_at', dkd_message_scope.dkd_created_at
    )
    order by dkd_message_scope.dkd_created_at asc
  ), '[]'::jsonb)
  from dkd_message_scope;
$dkd_fast_messages$;

revoke all on function public.dkd_urgent_courier_fast_messages_dkd(uuid, integer) from public;
grant execute on function public.dkd_urgent_courier_fast_messages_dkd(uuid, integer) to authenticated, service_role;

do $dkd_performance_analyze$
begin
  if to_regclass('public.dkd_urgent_courier_orders') is not null then
    execute 'analyze public.dkd_urgent_courier_orders';
  end if;

  if to_regclass('public.dkd_urgent_courier_order_items') is not null then
    execute 'analyze public.dkd_urgent_courier_order_items';
  end if;

  if to_regclass('public.dkd_urgent_courier_messages') is not null then
    execute 'analyze public.dkd_urgent_courier_messages';
  end if;

  if to_regclass('public.dkd_urgent_courier_push_audit') is not null then
    execute 'analyze public.dkd_urgent_courier_push_audit';
  end if;

  if to_regclass('public.dkd_push_tokens') is not null then
    execute 'analyze public.dkd_push_tokens';
  end if;

  if to_regclass('public.dkd_courier_jobs') is not null then
    execute 'analyze public.dkd_courier_jobs';
  end if;
end;
$dkd_performance_analyze$;


create or replace function public.dkd_urgent_courier_order_json_fast_dkd(
  dkd_param_order_id uuid,
  dkd_param_message_limit integer default 24
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $dkd_order_json_fast$
declare
  dkd_result_value jsonb := '{}'::jsonb;
  dkd_message_limit_value integer := least(greatest(coalesce(dkd_param_message_limit, 24), 5), 60);
begin
  select jsonb_build_object(
    'dkd_order_id', dkd_order_row.dkd_order_id,
    'dkd_customer_user_id', dkd_order_row.dkd_customer_user_id,
    'dkd_courier_user_id', dkd_order_row.dkd_courier_user_id,
    'dkd_customer_full_name', dkd_order_row.dkd_customer_full_name,
    'dkd_customer_phone_text', dkd_order_row.dkd_customer_phone_text,
    'dkd_customer_address_text', dkd_order_row.dkd_customer_address_text,
    'dkd_customer_note_text', dkd_order_row.dkd_customer_note_text,
    'dkd_status_key', dkd_order_row.dkd_status_key,
    'dkd_courier_fee_tl', dkd_order_row.dkd_courier_fee_tl,
    'dkd_product_total_tl', dkd_order_row.dkd_product_total_tl,
    'dkd_invoice_image_url', dkd_order_row.dkd_invoice_image_url,
    'dkd_chat_enabled_value', dkd_order_row.dkd_chat_enabled_value,
    'dkd_created_at', dkd_order_row.dkd_created_at,
    'dkd_updated_at', dkd_order_row.dkd_updated_at,
    'dkd_item_values', coalesce((
      select jsonb_agg(jsonb_build_object(
        'dkd_item_id', dkd_item_row.dkd_item_id,
        'dkd_store_group_key', dkd_item_row.dkd_store_group_key,
        'dkd_store_name', dkd_item_row.dkd_store_name,
        'dkd_product_text', dkd_item_row.dkd_product_text,
        'dkd_is_nearest_pharmacy', dkd_item_row.dkd_is_nearest_pharmacy,
        'dkd_product_total_tl', coalesce(dkd_item_row.dkd_product_total_tl, 0)
      ) order by dkd_item_row.dkd_created_at asc)
      from public.dkd_urgent_courier_order_items dkd_item_row
      where dkd_item_row.dkd_order_id = dkd_order_row.dkd_order_id
    ), '[]'::jsonb),
    'dkd_message_values', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'dkd_message_id', dkd_message_scope.dkd_message_id,
          'dkd_sender_role_key', dkd_message_scope.dkd_sender_role_key,
          'dkd_message_text', dkd_message_scope.dkd_message_text,
          'dkd_created_at', dkd_message_scope.dkd_created_at
        )
        order by dkd_message_scope.dkd_created_at asc
      )
      from (
        select
          dkd_message_row.dkd_message_id,
          dkd_message_row.dkd_sender_role_key,
          dkd_message_row.dkd_message_text,
          dkd_message_row.dkd_created_at
        from public.dkd_urgent_courier_messages dkd_message_row
        where dkd_message_row.dkd_order_id = dkd_order_row.dkd_order_id
        order by dkd_message_row.dkd_created_at desc
        limit dkd_message_limit_value
      ) dkd_message_scope
    ), '[]'::jsonb)
  )
  into dkd_result_value
  from public.dkd_urgent_courier_orders dkd_order_row
  where dkd_order_row.dkd_order_id = dkd_param_order_id;

  return coalesce(dkd_result_value, '{}'::jsonb);
end;
$dkd_order_json_fast$;

revoke all on function public.dkd_urgent_courier_order_json_fast_dkd(uuid, integer) from public;
grant execute on function public.dkd_urgent_courier_order_json_fast_dkd(uuid, integer) to authenticated, service_role;

create or replace function public.dkd_urgent_courier_snapshot_fast_dkd(
  dkd_param_order_limit integer default 32,
  dkd_param_message_limit integer default 24
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $dkd_snapshot_fast$
declare
  dkd_user_id_value uuid := auth.uid();
  dkd_has_courier_license_value boolean := false;
  dkd_customer_orders_value jsonb := '[]'::jsonb;
  dkd_courier_orders_value jsonb := '[]'::jsonb;
  dkd_profile_value jsonb := '{}'::jsonb;
  dkd_order_limit_value integer := least(greatest(coalesce(dkd_param_order_limit, 32), 8), 60);
  dkd_message_limit_value integer := least(greatest(coalesce(dkd_param_message_limit, 24), 5), 60);
begin
  if dkd_user_id_value is null then
    raise exception 'auth_required';
  end if;

  insert into public.dkd_profiles (user_id)
  values (dkd_user_id_value)
  on conflict (user_id) do nothing;

  dkd_has_courier_license_value := public.dkd_urgent_courier_license_active_dkd(dkd_user_id_value);

  select jsonb_build_object(
    'user_id', dkd_profile_row.user_id,
    'wallet_tl', coalesce(dkd_profile_row.wallet_tl, 0),
    'courier_wallet_tl', coalesce(dkd_profile_row.courier_wallet_tl, 0),
    'courier_status', coalesce(dkd_profile_row.courier_status, '')
  )
  into dkd_profile_value
  from public.dkd_profiles dkd_profile_row
  where dkd_profile_row.user_id = dkd_user_id_value;

  select coalesce(jsonb_agg(
    public.dkd_urgent_courier_order_json_fast_dkd(dkd_customer_scope.dkd_order_id, dkd_message_limit_value)
    order by dkd_customer_scope.dkd_sort_at desc
  ), '[]'::jsonb)
  into dkd_customer_orders_value
  from (
    select
      dkd_order_row.dkd_order_id,
      coalesce(dkd_order_row.dkd_updated_at, dkd_order_row.dkd_created_at) as dkd_sort_at
    from public.dkd_urgent_courier_orders dkd_order_row
    where dkd_order_row.dkd_customer_user_id = dkd_user_id_value
    order by coalesce(dkd_order_row.dkd_updated_at, dkd_order_row.dkd_created_at) desc
    limit dkd_order_limit_value
  ) dkd_customer_scope;

  if dkd_has_courier_license_value is true then
    select coalesce(jsonb_agg(
      public.dkd_urgent_courier_order_json_fast_dkd(dkd_courier_scope.dkd_order_id, dkd_message_limit_value)
      order by dkd_courier_scope.dkd_sort_at desc
    ), '[]'::jsonb)
    into dkd_courier_orders_value
    from (
      select
        dkd_order_row.dkd_order_id,
        coalesce(dkd_order_row.dkd_updated_at, dkd_order_row.dkd_created_at) as dkd_sort_at
      from public.dkd_urgent_courier_orders dkd_order_row
      where dkd_order_row.dkd_status_key not in ('dkd_completed', 'dkd_cancelled')
        and (
          (dkd_order_row.dkd_status_key = 'dkd_open' and dkd_order_row.dkd_courier_user_id is null)
          or dkd_order_row.dkd_courier_user_id = dkd_user_id_value
        )
      order by coalesce(dkd_order_row.dkd_updated_at, dkd_order_row.dkd_created_at) desc
      limit dkd_order_limit_value
    ) dkd_courier_scope;
  end if;

  return jsonb_build_object(
    'dkd_ok', true,
    'dkd_fast_snapshot', true,
    'dkd_has_courier_license', dkd_has_courier_license_value,
    'dkd_profile', coalesce(dkd_profile_value, '{}'::jsonb),
    'dkd_customer_orders', dkd_customer_orders_value,
    'dkd_courier_orders', dkd_courier_orders_value
  );
end;
$dkd_snapshot_fast$;

revoke all on function public.dkd_urgent_courier_snapshot_fast_dkd(integer, integer) from public;
grant execute on function public.dkd_urgent_courier_snapshot_fast_dkd(integer, integer) to authenticated, service_role;
