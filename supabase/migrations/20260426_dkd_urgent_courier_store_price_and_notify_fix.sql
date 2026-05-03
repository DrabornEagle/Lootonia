-- Lootonia DKD Acil Kurye mağaza fiyat + bildirim köprüsü düzeltmesi
-- Tarih: 2026-04-26
-- Genel kargo/işletme bildirim hattına dokunmaz; sadece Acil Kurye fiyat ve bildirim köprüsünü düzeltir.

begin;

alter table if exists public.dkd_courier_jobs
  add column if not exists customer_user_id uuid references auth.users(id) on delete set null,
  add column if not exists delivery_address_text text,
  add column if not exists delivery_note text,
  add column if not exists fee_tl numeric(12,2) not null default 0,
  add column if not exists cargo_meta jsonb not null default '{}'::jsonb;

do $$
begin
  if to_regclass('public.dkd_courier_jobs') is not null then
    execute 'alter table public.dkd_courier_jobs replica identity full';
    execute 'create index if not exists dkd_courier_jobs_urgent_meta_order_idx on public.dkd_courier_jobs ((cargo_meta ->> ''dkd_urgent_order_id'')) where job_type in (''urgent'', ''urgent_courier'', ''acil'', ''acil_kurye'')';
    execute 'create index if not exists dkd_courier_jobs_urgent_open_created_idx on public.dkd_courier_jobs(job_type, status, is_active, created_at desc)';
  end if;

  if to_regclass('public.dkd_urgent_courier_order_items') is not null then
    execute 'alter table public.dkd_urgent_courier_order_items add column if not exists dkd_product_total_tl numeric not null default 0';
    execute 'alter table public.dkd_urgent_courier_order_items add column if not exists dkd_updated_at timestamptz not null default timezone(''utc'', now())';
    execute 'alter table public.dkd_urgent_courier_order_items replica identity full';
  end if;

  if to_regclass('public.dkd_urgent_courier_orders') is not null then
    execute 'alter table public.dkd_urgent_courier_orders add column if not exists dkd_product_total_tl numeric not null default 0';
    execute 'alter table public.dkd_urgent_courier_orders add column if not exists dkd_updated_at timestamptz not null default timezone(''utc'', now())';
    execute 'alter table public.dkd_urgent_courier_orders replica identity full';
  end if;

  if to_regclass('public.dkd_urgent_courier_messages') is not null then
    execute 'alter table public.dkd_urgent_courier_messages replica identity full';
  end if;
end $$;

create or replace function public.dkd_safe_uuid_from_text_dkd(dkd_param_text text)
returns uuid
language plpgsql
immutable
as $$
declare
  dkd_clean_text_value text := nullif(trim(coalesce(dkd_param_text, '')), '');
begin
  if dkd_clean_text_value is null then
    return null;
  end if;

  return dkd_clean_text_value::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

revoke all on function public.dkd_safe_uuid_from_text_dkd(text) from public;
grant execute on function public.dkd_safe_uuid_from_text_dkd(text) to authenticated, service_role;

drop function if exists public.dkd_urgent_courier_set_single_store_total_dkd(uuid, text, numeric);
drop function if exists public.dkd_urgent_courier_set_item_totals_dkd(uuid, jsonb);

create or replace function public.dkd_urgent_courier_set_item_totals_dkd(
  dkd_param_order_id uuid,
  dkd_param_item_totals jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  dkd_payload_value jsonb;
  dkd_item_id_value text;
  dkd_product_total_tl_value numeric;
  dkd_updated_count_value integer := 0;
  dkd_last_updated_count_value integer := 0;
  dkd_total_item_count_value integer := 0;
  dkd_ready_item_count_value integer := 0;
  dkd_all_product_total_tl_value numeric := 0;
  dkd_all_ready_value boolean := false;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'reason', 'dkd_auth_required');
  end if;

  if to_regclass('public.dkd_urgent_courier_orders') is null or to_regclass('public.dkd_urgent_courier_order_items') is null then
    return jsonb_build_object('ok', false, 'reason', 'dkd_urgent_tables_missing');
  end if;

  if dkd_param_order_id is null then
    return jsonb_build_object('ok', false, 'reason', 'dkd_order_id_required');
  end if;

  if jsonb_typeof(coalesce(dkd_param_item_totals, '[]'::jsonb)) <> 'array' then
    return jsonb_build_object('ok', false, 'reason', 'dkd_item_totals_array_required');
  end if;

  for dkd_payload_value in
    select dkd_payload_source_value
    from jsonb_array_elements(coalesce(dkd_param_item_totals, '[]'::jsonb)) as dkd_payload_source_table(dkd_payload_source_value)
  loop
    dkd_item_id_value := nullif(trim(coalesce(
      dkd_payload_value ->> 'dkd_item_id',
      dkd_payload_value ->> 'item_id',
      dkd_payload_value ->> 'id',
      dkd_payload_value ->> 'dkd_store_key',
      dkd_payload_value ->> 'store_key',
      ''
    )), '');

    begin
      dkd_product_total_tl_value := greatest(coalesce(nullif(trim(coalesce(
        dkd_payload_value ->> 'dkd_product_total_tl',
        dkd_payload_value ->> 'product_total_tl',
        dkd_payload_value ->> 'total_tl',
        '0'
      )), '')::numeric, 0), 0);
    exception
      when invalid_text_representation then
        dkd_product_total_tl_value := 0;
    end;

    if dkd_item_id_value is not null and coalesce(dkd_product_total_tl_value, 0) > 0 then
      begin
        execute '
          update public.dkd_urgent_courier_order_items
             set dkd_product_total_tl = $3,
                 dkd_updated_at = timezone(''utc'', now())
           where dkd_order_id::text = $1::text
             and dkd_item_id::text = $2
        ' using dkd_param_order_id, dkd_item_id_value, dkd_product_total_tl_value;
      exception
        when undefined_column then
          execute '
            update public.dkd_urgent_courier_order_items
               set dkd_product_total_tl = $3
             where dkd_order_id::text = $1::text
               and dkd_item_id::text = $2
          ' using dkd_param_order_id, dkd_item_id_value, dkd_product_total_tl_value;
      end;

      get diagnostics dkd_last_updated_count_value = row_count;
      dkd_updated_count_value := dkd_updated_count_value + coalesce(dkd_last_updated_count_value, 0);
    end if;
  end loop;

  execute '
    select count(*)::integer,
           count(*) filter (where coalesce(dkd_product_total_tl, 0) > 0)::integer,
           coalesce(sum(coalesce(dkd_product_total_tl, 0)), 0)::numeric
      from public.dkd_urgent_courier_order_items
     where dkd_order_id::text = $1::text
  ' into dkd_total_item_count_value, dkd_ready_item_count_value, dkd_all_product_total_tl_value
  using dkd_param_order_id;

  dkd_all_ready_value := dkd_total_item_count_value > 0 and dkd_total_item_count_value = dkd_ready_item_count_value;

  begin
    execute '
      update public.dkd_urgent_courier_orders
         set dkd_status_key = case when $3 then ''dkd_product_total_waiting'' else coalesce(dkd_status_key, ''dkd_courier_shopping'') end,
             dkd_product_total_tl = $2,
             dkd_updated_at = timezone(''utc'', now())
       where dkd_order_id::text = $1::text
    ' using dkd_param_order_id, dkd_all_product_total_tl_value, dkd_all_ready_value;
  exception
    when undefined_column then
      begin
        execute '
          update public.dkd_urgent_courier_orders
             set dkd_status_key = case when $2 then ''dkd_product_total_waiting'' else coalesce(dkd_status_key, ''dkd_courier_shopping'') end
           where dkd_order_id::text = $1::text
        ' using dkd_param_order_id, dkd_all_ready_value;
      exception
        when undefined_column then null;
      end;
  end;

  if to_regclass('public.dkd_urgent_courier_messages') is not null then
    begin
      execute '
        insert into public.dkd_urgent_courier_messages (
          dkd_order_id,
          dkd_sender_user_id,
          dkd_message_kind,
          dkd_message_text,
          dkd_created_at
        ) values ($1, auth.uid(), $2, $3, timezone(''utc'', now()))
      ' using
        dkd_param_order_id,
        case when dkd_all_ready_value then 'dkd_all_store_totals_ready' else 'dkd_single_store_total_ready' end,
        case when dkd_all_ready_value then 'Tüm mağaza ürün toplamları müşteriye gönderildi.' else 'Bir mağaza ürün toplamı müşteriye gönderildi.' end;
    exception
      when others then null;
    end;
  end if;

  return jsonb_build_object(
    'ok', true,
    'dkd_updated_item_count', dkd_updated_count_value,
    'dkd_total_item_count', dkd_total_item_count_value,
    'dkd_ready_item_count', dkd_ready_item_count_value,
    'dkd_all_store_totals_ready', dkd_all_ready_value,
    'dkd_product_total_tl', dkd_all_product_total_tl_value
  );
end;
$$;

create or replace function public.dkd_urgent_courier_set_single_store_total_dkd(
  dkd_param_order_id uuid,
  dkd_param_item_id text,
  dkd_param_product_total_tl numeric
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.dkd_urgent_courier_set_item_totals_dkd(
    dkd_param_order_id,
    jsonb_build_array(jsonb_build_object(
      'dkd_item_id', dkd_param_item_id,
      'dkd_product_total_tl', dkd_param_product_total_tl
    ))
  );
$$;

revoke all on function public.dkd_urgent_courier_set_item_totals_dkd(uuid, jsonb) from public;
revoke all on function public.dkd_urgent_courier_set_single_store_total_dkd(uuid, text, numeric) from public;
grant execute on function public.dkd_urgent_courier_set_item_totals_dkd(uuid, jsonb) to authenticated, service_role;
grant execute on function public.dkd_urgent_courier_set_single_store_total_dkd(uuid, text, numeric) to authenticated, service_role;

create table if not exists public.dkd_urgent_courier_notify_bridge_audit (
  dkd_id bigint generated by default as identity primary key,
  dkd_created_at timestamptz not null default timezone('utc', now()),
  dkd_urgent_order_id text not null,
  dkd_courier_job_id bigint null,
  dkd_bridge_status text not null default 'created',
  dkd_bridge_note text null
);

alter table public.dkd_urgent_courier_notify_bridge_audit enable row level security;
grant select, insert on public.dkd_urgent_courier_notify_bridge_audit to service_role;

create or replace function public.dkd_urgent_courier_enqueue_job_from_order_dkd(dkd_param_order_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dkd_order_payload_value jsonb := coalesce(dkd_param_order_payload, '{}'::jsonb);
  dkd_order_id_text_value text;
  dkd_status_text_value text;
  dkd_customer_user_id_value uuid;
  dkd_delivery_address_text_value text;
  dkd_delivery_note_text_value text;
  dkd_customer_name_text_value text;
  dkd_phone_text_value text;
  dkd_store_summary_text_value text;
  dkd_fee_tl_value numeric := 50;
  dkd_existing_job_id_value bigint;
  dkd_new_job_id_value bigint;
begin
  if to_regclass('public.dkd_courier_jobs') is null then
    return jsonb_build_object('ok', false, 'reason', 'dkd_courier_jobs_missing');
  end if;

  dkd_order_id_text_value := nullif(trim(coalesce(
    dkd_order_payload_value ->> 'dkd_order_id',
    dkd_order_payload_value ->> 'id',
    dkd_order_payload_value ->> 'order_id',
    dkd_order_payload_value ->> 'uuid',
    dkd_order_payload_value ->> 'request_id',
    ''
  )), '');

  if dkd_order_id_text_value is null then
    dkd_order_id_text_value := md5(dkd_order_payload_value::text);
  end if;

  dkd_status_text_value := lower(trim(coalesce(
    dkd_order_payload_value ->> 'dkd_status_key',
    dkd_order_payload_value ->> 'status',
    dkd_order_payload_value ->> 'order_status',
    'open'
  )));

  if dkd_status_text_value in ('completed', 'cancelled', 'closed', 'done', 'finished', 'dkd_completed', 'dkd_cancelled', 'dkd_archived_completed') then
    return jsonb_build_object('ok', true, 'reason', 'dkd_closed_order_skipped', 'dkd_urgent_order_id', dkd_order_id_text_value);
  end if;

  select public.dkd_safe_uuid_from_text_dkd(coalesce(
    dkd_order_payload_value ->> 'dkd_customer_user_id',
    dkd_order_payload_value ->> 'customer_user_id',
    dkd_order_payload_value ->> 'user_id',
    dkd_order_payload_value ->> 'buyer_user_id',
    dkd_order_payload_value ->> 'created_by',
    dkd_order_payload_value ->> 'dkd_created_by'
  )) into dkd_customer_user_id_value;

  dkd_delivery_address_text_value := nullif(trim(coalesce(
    dkd_order_payload_value ->> 'dkd_delivery_address_text',
    dkd_order_payload_value ->> 'delivery_address_text',
    dkd_order_payload_value ->> 'delivery_address',
    dkd_order_payload_value ->> 'dropoff',
    dkd_order_payload_value ->> 'address_text',
    'Acil Kurye teslimat adresi'
  )), '');

  dkd_delivery_note_text_value := nullif(trim(coalesce(
    dkd_order_payload_value ->> 'dkd_note_text',
    dkd_order_payload_value ->> 'delivery_note',
    dkd_order_payload_value ->> 'note',
    dkd_order_payload_value ->> 'description',
    ''
  )), '');

  dkd_customer_name_text_value := nullif(trim(coalesce(
    dkd_order_payload_value ->> 'dkd_customer_name',
    dkd_order_payload_value ->> 'customer_name',
    dkd_order_payload_value ->> 'full_name',
    ''
  )), '');

  dkd_phone_text_value := nullif(trim(coalesce(
    dkd_order_payload_value ->> 'dkd_phone_text',
    dkd_order_payload_value ->> 'phone_text',
    dkd_order_payload_value ->> 'phone',
    ''
  )), '');

  dkd_store_summary_text_value := nullif(trim(coalesce(
    dkd_order_payload_value ->> 'dkd_store_summary_text',
    dkd_order_payload_value ->> 'store_summary',
    dkd_order_payload_value ->> 'store_name',
    dkd_order_payload_value ->> 'business_name',
    dkd_order_payload_value ->> 'pickup',
    'Acil Kurye mağaza listesi'
  )), '');

  begin
    dkd_fee_tl_value := greatest(coalesce(nullif(trim(coalesce(
      dkd_order_payload_value ->> 'dkd_courier_fee_tl',
      dkd_order_payload_value ->> 'courier_fee_tl',
      dkd_order_payload_value ->> 'fee_tl',
      '50'
    )), '')::numeric, 50), 0);
  exception
    when invalid_text_representation then
      dkd_fee_tl_value := 50;
  end;

  select public.dkd_courier_jobs.id
    into dkd_existing_job_id_value
    from public.dkd_courier_jobs
   where coalesce(public.dkd_courier_jobs.cargo_meta ->> 'dkd_urgent_order_id', '') = dkd_order_id_text_value
     and lower(coalesce(public.dkd_courier_jobs.job_type, '')) in ('urgent', 'urgent_courier', 'acil', 'acil_kurye')
   order by public.dkd_courier_jobs.id desc
   limit 1;

  if dkd_existing_job_id_value is not null then
    return jsonb_build_object('ok', true, 'reason', 'dkd_existing_bridge_job', 'dkd_urgent_order_id', dkd_order_id_text_value, 'dkd_courier_job_id', dkd_existing_job_id_value);
  end if;

  insert into public.dkd_courier_jobs (
    title,
    pickup,
    dropoff,
    reward_score,
    distance_km,
    eta_min,
    job_type,
    is_active,
    status,
    assigned_user_id,
    customer_user_id,
    delivery_address_text,
    delivery_note,
    fee_tl,
    cargo_meta
  ) values (
    'Acil Kurye Siparişi',
    coalesce(dkd_store_summary_text_value, 'Acil Kurye mağaza listesi'),
    coalesce(dkd_delivery_address_text_value, 'Acil Kurye teslimat adresi'),
    18,
    1.0,
    15,
    'urgent',
    true,
    'open',
    null,
    dkd_customer_user_id_value,
    dkd_delivery_address_text_value,
    dkd_delivery_note_text_value,
    dkd_fee_tl_value,
    jsonb_build_object(
      'dkd_source', 'urgent_courier_order_notify_bridge',
      'dkd_urgent_order_id', dkd_order_id_text_value,
      'dkd_customer_name', dkd_customer_name_text_value,
      'dkd_phone_text', dkd_phone_text_value,
      'dkd_delivery_address_text', dkd_delivery_address_text_value,
      'dkd_delivery_note_text', dkd_delivery_note_text_value,
      'dkd_status_key', dkd_status_text_value,
      'dkd_original_order', dkd_order_payload_value
    )
  ) returning id into dkd_new_job_id_value;

  insert into public.dkd_urgent_courier_notify_bridge_audit (
    dkd_urgent_order_id,
    dkd_courier_job_id,
    dkd_bridge_status,
    dkd_bridge_note
  ) values (
    dkd_order_id_text_value,
    dkd_new_job_id_value,
    'created',
    'Acil Kurye siparişi dkd_courier_jobs urgent hattına bağlandı.'
  );

  return jsonb_build_object('ok', true, 'dkd_urgent_order_id', dkd_order_id_text_value, 'dkd_courier_job_id', dkd_new_job_id_value);
exception
  when others then
    insert into public.dkd_urgent_courier_notify_bridge_audit (
      dkd_urgent_order_id,
      dkd_courier_job_id,
      dkd_bridge_status,
      dkd_bridge_note
    ) values (
      coalesce(dkd_order_id_text_value, 'dkd_unknown'),
      null,
      'failed',
      sqlerrm
    );
    return jsonb_build_object('ok', false, 'reason', sqlerrm, 'dkd_urgent_order_id', coalesce(dkd_order_id_text_value, 'dkd_unknown'));
end;
$$;

revoke all on function public.dkd_urgent_courier_enqueue_job_from_order_dkd(jsonb) from public;
grant execute on function public.dkd_urgent_courier_enqueue_job_from_order_dkd(jsonb) to authenticated, service_role;

create or replace function public.dkd_urgent_courier_order_notify_bridge_trigger_dkd()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.dkd_urgent_courier_enqueue_job_from_order_dkd(to_jsonb(new));
  return new;
end;
$$;

do $$
begin
  if to_regclass('public.dkd_urgent_courier_orders') is not null then
    execute 'drop trigger if exists dkd_urgent_courier_order_notify_bridge_trigger on public.dkd_urgent_courier_orders';
    execute 'create trigger dkd_urgent_courier_order_notify_bridge_trigger after insert on public.dkd_urgent_courier_orders for each row execute function public.dkd_urgent_courier_order_notify_bridge_trigger_dkd()';
  end if;
end $$;

select
  to_regclass('public.dkd_urgent_courier_orders') is not null as dkd_has_urgent_orders_table,
  to_regclass('public.dkd_urgent_courier_order_items') is not null as dkd_has_urgent_items_table,
  to_regclass('public.dkd_courier_jobs') is not null as dkd_has_courier_jobs_table,
  to_regprocedure('public.dkd_urgent_courier_set_single_store_total_dkd(uuid,text,numeric)') is not null as dkd_has_store_total_rpc,
  to_regprocedure('public.dkd_urgent_courier_enqueue_job_from_order_dkd(jsonb)') is not null as dkd_has_notify_bridge;

commit;
