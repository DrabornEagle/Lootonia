-- dkd_20260410_lootonia_courier_cargo_perf_ui_hotfix.sql
-- Courier / cargo performance support indexes for Lootonia.
-- Safe to run multiple times.

do $$
begin
  if to_regclass('public.dkd_cargo_shipments') is not null then
    execute 'create index if not exists dkd_cargo_shipments_customer_created_desc_idx on public.dkd_cargo_shipments(customer_user_id, created_at desc)';
    execute 'create index if not exists dkd_cargo_shipments_customer_status_created_desc_idx on public.dkd_cargo_shipments(customer_user_id, status, created_at desc)';
    execute 'create index if not exists dkd_cargo_shipments_assigned_status_updated_desc_idx on public.dkd_cargo_shipments(assigned_courier_user_id, status, updated_at desc)';
  end if;

  if to_regclass('public.dkd_courier_jobs') is not null then
    execute 'create index if not exists dkd_courier_jobs_active_created_desc_idx on public.dkd_courier_jobs(is_active, created_at desc)';
    execute 'create index if not exists dkd_courier_jobs_assigned_status_updated_desc_idx on public.dkd_courier_jobs(assigned_user_id, status, updated_at desc)';
  end if;

  if to_regclass('public.dkd_courier_live_locations') is not null then
    execute 'create index if not exists dkd_courier_live_locations_courier_updated_desc_idx on public.dkd_courier_live_locations(courier_user_id, updated_at desc)';
  end if;
end
$$;
