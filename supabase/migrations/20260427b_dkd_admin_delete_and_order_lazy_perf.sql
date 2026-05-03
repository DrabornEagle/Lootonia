-- dkd_20260427b_admin_delete_and_order_lazy_perf.sql
-- Admin SİL akışı, Acil Kurye Siparişi SİL RPC ve sipariş listesi hız indeksleri.

create index if not exists dkd_courier_jobs_source_status_updated_idx
  on public.dkd_courier_jobs (job_type, status, updated_at desc, created_at desc);

create index if not exists dkd_courier_jobs_active_status_updated_idx
  on public.dkd_courier_jobs (is_active, status, updated_at desc, created_at desc);

create index if not exists dkd_courier_jobs_customer_user_idx
  on public.dkd_courier_jobs (customer_user_id, updated_at desc, created_at desc);

create index if not exists dkd_courier_jobs_assigned_user_idx
  on public.dkd_courier_jobs (assigned_user_id, updated_at desc, created_at desc);

create index if not exists dkd_courier_jobs_urgent_order_meta_idx
  on public.dkd_courier_jobs ((cargo_meta ->> 'dkd_urgent_order_id'))
  where lower(coalesce(job_type, '')) in ('urgent', 'urgent_courier', 'acil', 'acil_kurye');

create index if not exists dkd_urgent_courier_orders_status_updated_idx
  on public.dkd_urgent_courier_orders (dkd_status_key, dkd_updated_at desc, dkd_created_at desc);

create index if not exists dkd_urgent_courier_orders_customer_updated_idx
  on public.dkd_urgent_courier_orders (dkd_customer_user_id, dkd_updated_at desc, dkd_created_at desc);

create index if not exists dkd_urgent_courier_orders_courier_updated_idx
  on public.dkd_urgent_courier_orders (dkd_courier_user_id, dkd_updated_at desc, dkd_created_at desc);

create index if not exists dkd_urgent_courier_items_order_created_idx
  on public.dkd_urgent_courier_order_items (dkd_order_id, dkd_created_at asc);

create index if not exists dkd_urgent_courier_messages_order_created_idx
  on public.dkd_urgent_courier_messages (dkd_order_id, dkd_created_at desc);

create or replace function public.dkd_admin_urgent_courier_order_delete_dkd(
  dkd_param_order_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $dkd_admin_urgent_delete$
declare
  dkd_user_id_value uuid := auth.uid();
  dkd_is_admin_value boolean := false;
  dkd_deleted_orders_count_value integer := 0;
  dkd_deleted_items_count_value integer := 0;
  dkd_deleted_messages_count_value integer := 0;
  dkd_deleted_jobs_count_value integer := 0;
begin
  if dkd_user_id_value is null then
    raise exception 'auth_required';
  end if;

  select public.dkd_is_admin() into dkd_is_admin_value;
  if coalesce(dkd_is_admin_value, false) is not true then
    raise exception 'not_admin';
  end if;

  if dkd_param_order_id is null then
    raise exception 'missing_order_id';
  end if;

  if to_regclass('public.dkd_courier_jobs') is not null then
    delete from public.dkd_courier_jobs dkd_job_row
    where coalesce(dkd_job_row.cargo_meta ->> 'dkd_urgent_order_id', '') = dkd_param_order_id::text
       or coalesce(dkd_job_row.cargo_meta -> 'dkd_original_order' ->> 'dkd_order_id', '') = dkd_param_order_id::text;
    get diagnostics dkd_deleted_jobs_count_value = row_count;
  end if;

  delete from public.dkd_urgent_courier_messages dkd_message_row
  where dkd_message_row.dkd_order_id = dkd_param_order_id;
  get diagnostics dkd_deleted_messages_count_value = row_count;

  delete from public.dkd_urgent_courier_order_items dkd_item_row
  where dkd_item_row.dkd_order_id = dkd_param_order_id;
  get diagnostics dkd_deleted_items_count_value = row_count;

  delete from public.dkd_urgent_courier_orders dkd_order_row
  where dkd_order_row.dkd_order_id = dkd_param_order_id;
  get diagnostics dkd_deleted_orders_count_value = row_count;

  return jsonb_build_object(
    'dkd_ok', true,
    'dkd_order_id', dkd_param_order_id,
    'dkd_deleted_orders_count', dkd_deleted_orders_count_value,
    'dkd_deleted_items_count', dkd_deleted_items_count_value,
    'dkd_deleted_messages_count', dkd_deleted_messages_count_value,
    'dkd_deleted_jobs_count', dkd_deleted_jobs_count_value
  );
end;
$dkd_admin_urgent_delete$;

revoke all on function public.dkd_admin_urgent_courier_order_delete_dkd(uuid) from public;
grant execute on function public.dkd_admin_urgent_courier_order_delete_dkd(uuid) to authenticated, service_role;

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
  dkd_is_admin_value boolean := false;
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

  select public.dkd_is_admin() into dkd_is_admin_value;
  dkd_has_courier_license_value := public.dkd_urgent_courier_license_active_dkd(dkd_user_id_value) or coalesce(dkd_is_admin_value, false);

  select jsonb_build_object(
    'user_id', dkd_profile_row.user_id,
    'wallet_tl', coalesce(dkd_profile_row.wallet_tl, 0),
    'courier_wallet_tl', coalesce(dkd_profile_row.courier_wallet_tl, 0),
    'courier_status', coalesce(dkd_profile_row.courier_status, ''),
    'is_admin', coalesce(dkd_profile_row.is_admin, false)
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
    select dkd_order_row.dkd_order_id, coalesce(dkd_order_row.dkd_updated_at, dkd_order_row.dkd_created_at) as dkd_sort_at
    from public.dkd_urgent_courier_orders dkd_order_row
    where dkd_order_row.dkd_customer_user_id = dkd_user_id_value
       or coalesce(dkd_is_admin_value, false) is true
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
      select dkd_order_row.dkd_order_id, coalesce(dkd_order_row.dkd_updated_at, dkd_order_row.dkd_created_at) as dkd_sort_at
      from public.dkd_urgent_courier_orders dkd_order_row
      where dkd_order_row.dkd_status_key not in ('dkd_completed', 'dkd_cancelled')
        and (
          coalesce(dkd_is_admin_value, false) is true
          or (dkd_order_row.dkd_status_key = 'dkd_open' and dkd_order_row.dkd_courier_user_id is null)
          or dkd_order_row.dkd_courier_user_id = dkd_user_id_value
        )
      order by coalesce(dkd_order_row.dkd_updated_at, dkd_order_row.dkd_created_at) desc
      limit dkd_order_limit_value
    ) dkd_courier_scope;
  end if;

  return jsonb_build_object(
    'dkd_ok', true,
    'dkd_fast_snapshot', true,
    'dkd_is_admin', coalesce(dkd_is_admin_value, false),
    'dkd_has_courier_license', dkd_has_courier_license_value,
    'dkd_profile', coalesce(dkd_profile_value, '{}'::jsonb),
    'dkd_customer_orders', dkd_customer_orders_value,
    'dkd_courier_orders', dkd_courier_orders_value
  );
end;
$dkd_snapshot_fast$;

revoke all on function public.dkd_urgent_courier_snapshot_fast_dkd(integer, integer) from public;
grant execute on function public.dkd_urgent_courier_snapshot_fast_dkd(integer, integer) to authenticated, service_role;

analyze public.dkd_courier_jobs;
analyze public.dkd_urgent_courier_orders;
analyze public.dkd_urgent_courier_order_items;
analyze public.dkd_urgent_courier_messages;
