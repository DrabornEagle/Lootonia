begin;

create or replace function public.dkd_insert_business_order_history_if_missing(
  dkd_param_order_id bigint,
  dkd_param_business_id bigint,
  dkd_param_actor_user_id uuid,
  dkd_param_status_key text,
  dkd_param_title_text text,
  dkd_param_note_text text,
  dkd_param_created_at timestamptz default timezone('utc', now())
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if dkd_param_order_id is null or dkd_param_business_id is null or nullif(trim(coalesce(dkd_param_status_key, '')), '') is null then
    return;
  end if;

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
    dkd_param_order_id,
    dkd_param_business_id,
    dkd_param_actor_user_id,
    trim(lower(dkd_param_status_key)),
    dkd_param_title_text,
    dkd_param_note_text,
    coalesce(dkd_param_created_at, timezone('utc', now()))
  where not exists (
    select 1
    from public.dkd_business_order_status_history as dkd_existing_row
    where dkd_existing_row.order_id = dkd_param_order_id
      and lower(coalesce(dkd_existing_row.status_key, '')) = trim(lower(dkd_param_status_key))
  );
end;
$$;

revoke all on function public.dkd_insert_business_order_history_if_missing(bigint, bigint, uuid, text, text, text, timestamptz) from public;
grant execute on function public.dkd_insert_business_order_history_if_missing(bigint, bigint, uuid, text, text, text, timestamptz) to authenticated;

create or replace function public.dkd_apply_business_order_timeline_from_courier_job(
  dkd_param_order_id bigint,
  dkd_param_assigned_user_id uuid,
  dkd_param_job_status text,
  dkd_param_pickup_status text,
  dkd_param_accepted_at timestamptz,
  dkd_param_picked_up_at timestamptz,
  dkd_param_completed_at timestamptz,
  dkd_param_updated_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_business_id_value bigint;
  dkd_buyer_user_id_value uuid;
  dkd_job_status_value text := lower(coalesce(dkd_param_job_status, ''));
  dkd_pickup_status_value text := lower(coalesce(dkd_param_pickup_status, ''));
  dkd_now_value timestamptz := timezone('utc', now());
  dkd_assigned_at_value timestamptz := coalesce(dkd_param_accepted_at, dkd_param_updated_at, dkd_now_value);
  dkd_picked_up_at_value timestamptz := coalesce(dkd_param_picked_up_at, dkd_param_updated_at, dkd_now_value);
  dkd_delivered_at_value timestamptz := coalesce(dkd_param_completed_at, dkd_param_updated_at, dkd_now_value);
  dkd_should_mark_assigned_value boolean := false;
  dkd_should_mark_picked_value boolean := false;
  dkd_should_mark_shipping_value boolean := false;
  dkd_should_mark_delivered_value boolean := false;
begin
  if dkd_param_order_id is null then
    return;
  end if;

  select dkd_order_row.business_id, dkd_order_row.buyer_user_id
  into dkd_business_id_value, dkd_buyer_user_id_value
  from public.dkd_business_product_orders as dkd_order_row
  where dkd_order_row.id = dkd_param_order_id
  limit 1;

  if dkd_business_id_value is null then
    return;
  end if;

  dkd_should_mark_assigned_value := dkd_param_assigned_user_id is not null or dkd_job_status_value in ('accepted', 'assigned', 'to_business');
  dkd_should_mark_picked_value := dkd_job_status_value in ('picked_up', 'to_customer', 'delivering') or dkd_pickup_status_value = 'picked_up';
  dkd_should_mark_shipping_value := dkd_should_mark_picked_value;
  dkd_should_mark_delivered_value := dkd_job_status_value = 'completed' or dkd_pickup_status_value = 'delivered';

  if dkd_should_mark_assigned_value then
    update public.dkd_business_product_orders
    set status = case when lower(coalesce(status, '')) in ('delivered', 'completed') then status else 'assigned_courier' end,
        updated_at = greatest(coalesce(updated_at, dkd_now_value), dkd_assigned_at_value)
    where id = dkd_param_order_id;

    perform public.dkd_insert_business_order_history_if_missing(
      dkd_param_order_id,
      dkd_business_id_value,
      dkd_buyer_user_id_value,
      'assigned_courier',
      'Kurye atandı',
      'Sipariş bir kurye ile eşleştirildi.',
      dkd_assigned_at_value
    );
  end if;

  if dkd_should_mark_picked_value then
    perform public.dkd_insert_business_order_history_if_missing(
      dkd_param_order_id,
      dkd_business_id_value,
      dkd_buyer_user_id_value,
      'picked_up',
      'Hazırlandı',
      'Sipariş hazırlandı ve kurye teslim sürecine geçti.',
      dkd_picked_up_at_value
    );
  end if;

  if dkd_should_mark_shipping_value then
    update public.dkd_business_product_orders
    set status = case when lower(coalesce(status, '')) in ('delivered', 'completed') then status else 'on_the_way' end,
        updated_at = greatest(coalesce(updated_at, dkd_now_value), dkd_picked_up_at_value)
    where id = dkd_param_order_id;

    perform public.dkd_insert_business_order_history_if_missing(
      dkd_param_order_id,
      dkd_business_id_value,
      dkd_buyer_user_id_value,
      'on_the_way',
      'Yola çıktı',
      'Kurye siparişi teslimat adresine getiriyor.',
      dkd_picked_up_at_value
    );
  end if;

  if dkd_should_mark_delivered_value then
    update public.dkd_business_product_orders
    set status = 'delivered',
        updated_at = greatest(coalesce(updated_at, dkd_now_value), dkd_delivered_at_value)
    where id = dkd_param_order_id;

    perform public.dkd_insert_business_order_history_if_missing(
      dkd_param_order_id,
      dkd_business_id_value,
      dkd_buyer_user_id_value,
      'delivered',
      'Teslim edildi',
      'Sipariş başarıyla teslim edildi.',
      dkd_delivered_at_value
    );
  end if;
end;
$$;

revoke all on function public.dkd_apply_business_order_timeline_from_courier_job(bigint, uuid, text, text, timestamptz, timestamptz, timestamptz, timestamptz) from public;
grant execute on function public.dkd_apply_business_order_timeline_from_courier_job(bigint, uuid, text, text, timestamptz, timestamptz, timestamptz, timestamptz) to authenticated;

create or replace function public.dkd_sync_business_order_from_courier_job()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.dkd_apply_business_order_timeline_from_courier_job(
    coalesce(new.order_id, old.order_id),
    coalesce(new.assigned_user_id, old.assigned_user_id),
    coalesce(new.status, old.status),
    coalesce(new.pickup_status, old.pickup_status),
    coalesce(new.accepted_at, old.accepted_at),
    coalesce(new.picked_up_at, old.picked_up_at),
    coalesce(new.completed_at, old.completed_at),
    coalesce(new.updated_at, old.updated_at, timezone('utc', now()))
  );

  return new;
end;
$$;

drop trigger if exists dkd_sync_business_order_from_courier_job on public.dkd_courier_jobs;
create trigger dkd_sync_business_order_from_courier_job
after insert or update of status, pickup_status, assigned_user_id, accepted_at, picked_up_at, completed_at
on public.dkd_courier_jobs
for each row
execute function public.dkd_sync_business_order_from_courier_job();

-- publication düzeltmesi: web realtime kapanıp açmadan güncellesin
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.dkd_business_product_orders';
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.dkd_business_order_status_history';
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.dkd_courier_live_locations';
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.dkd_cargo_shipments';
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.dkd_courier_jobs';
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END
$$;

-- mevcut kurye işlerinden zaman çizgisi geri doldurma
DO $$
declare
  dkd_job_row record;
begin
  for dkd_job_row in
    select
      dkd_job_row.order_id,
      dkd_job_row.assigned_user_id,
      dkd_job_row.status,
      dkd_job_row.pickup_status,
      dkd_job_row.accepted_at,
      dkd_job_row.picked_up_at,
      dkd_job_row.completed_at,
      dkd_job_row.updated_at
    from public.dkd_courier_jobs as dkd_job_row
    where dkd_job_row.order_id is not null
  loop
    perform public.dkd_apply_business_order_timeline_from_courier_job(
      dkd_job_row.order_id,
      dkd_job_row.assigned_user_id,
      dkd_job_row.status,
      dkd_job_row.pickup_status,
      dkd_job_row.accepted_at,
      dkd_job_row.picked_up_at,
      dkd_job_row.completed_at,
      dkd_job_row.updated_at
    );
  end loop;
end;
$$;

commit;
