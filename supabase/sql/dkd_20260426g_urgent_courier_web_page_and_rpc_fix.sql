begin;

alter table if exists public.dkd_courier_jobs
  add column if not exists customer_user_id uuid references auth.users(id) on delete set null,
  add column if not exists delivery_address_text text,
  add column if not exists delivery_note text,
  add column if not exists fee_tl numeric(12,2) not null default 0,
  add column if not exists cargo_meta jsonb not null default '{}'::jsonb;

create index if not exists dkd_courier_jobs_urgent_open_idx
  on public.dkd_courier_jobs(job_type, status, is_active, created_at desc);

create index if not exists dkd_courier_jobs_customer_created_idx
  on public.dkd_courier_jobs(customer_user_id, created_at desc);

drop function if exists public.dkd_market_web_create_urgent_courier_order_dkd(text, text, text, jsonb, text);

create function public.dkd_market_web_create_urgent_courier_order_dkd(
  dkd_param_customer_name text,
  dkd_param_phone_text text,
  dkd_param_delivery_address_text text,
  dkd_param_store_totals jsonb,
  dkd_param_note_text text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  dkd_user_id uuid := auth.uid();
  dkd_customer_name_value text := trim(coalesce(dkd_param_customer_name, ''));
  dkd_phone_text_value text := trim(coalesce(dkd_param_phone_text, ''));
  dkd_delivery_address_value text := trim(coalesce(dkd_param_delivery_address_text, ''));
  dkd_note_text_value text := nullif(trim(coalesce(dkd_param_note_text, '')), '');
  dkd_store_totals_value jsonb := coalesce(dkd_param_store_totals, '[]'::jsonb);
  dkd_store_total_amount numeric(12,2) := 0;
  dkd_store_summary_value text := '';
  dkd_job_id bigint;
  dkd_store_row_value jsonb;
begin
  if dkd_user_id is null then
    raise exception 'auth_required';
  end if;

  if length(dkd_customer_name_value) < 2 then
    raise exception 'customer_name_required';
  end if;

  if length(regexp_replace(dkd_phone_text_value, '\\D', '', 'g')) < 10 then
    raise exception 'phone_required';
  end if;

  if length(dkd_delivery_address_value) < 10 then
    raise exception 'delivery_address_required';
  end if;

  if jsonb_typeof(dkd_store_totals_value) <> 'array' or jsonb_array_length(dkd_store_totals_value) < 1 then
    raise exception 'store_total_required';
  end if;

  for dkd_store_row_value in
    select jsonb_array_elements(dkd_store_totals_value)
  loop
    dkd_store_total_amount := dkd_store_total_amount
      + greatest(coalesce(nullif(dkd_store_row_value->>'dkd_product_total_tl', '')::numeric, 0), 0);

    dkd_store_summary_value := concat_ws(
      ' | ',
      nullif(dkd_store_summary_value, ''),
      concat(
        coalesce(nullif(trim(dkd_store_row_value->>'dkd_store_name'), ''), 'Mağaza'),
        ': ',
        to_char(greatest(coalesce(nullif(dkd_store_row_value->>'dkd_product_total_tl', '')::numeric, 0), 0), 'FM999999990D00'),
        ' TL'
      )
    );
  end loop;

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
    customer_user_id,
    delivery_address_text,
    delivery_note,
    fee_tl,
    cargo_meta
  ) values (
    'Acil Kurye Siparişi',
    coalesce(nullif(dkd_store_summary_value, ''), 'Acil Kurye mağaza listesi'),
    dkd_delivery_address_value,
    18,
    1.0,
    15,
    'urgent',
    true,
    'open',
    dkd_user_id,
    dkd_delivery_address_value,
    dkd_note_text_value,
    50,
    jsonb_build_object(
      'dkd_source', 'web_urgent_courier_stable_panel',
      'dkd_customer_name', dkd_customer_name_value,
      'dkd_phone_text', dkd_phone_text_value,
      'dkd_delivery_address_text', dkd_delivery_address_value,
      'dkd_store_totals', dkd_store_totals_value,
      'dkd_product_total_tl', dkd_store_total_amount,
      'dkd_note_text', dkd_note_text_value,
      'dkd_created_from', 'www.draborneagle.com'
    )
  ) returning id into dkd_job_id;

  return jsonb_build_object(
    'dkd_ok', true,
    'dkd_job_id', dkd_job_id,
    'dkd_job_type', 'urgent',
    'dkd_status', 'open',
    'dkd_product_total_tl', dkd_store_total_amount
  );
end;
$$;

revoke all on function public.dkd_market_web_create_urgent_courier_order_dkd(text, text, text, jsonb, text) from public;
grant execute on function public.dkd_market_web_create_urgent_courier_order_dkd(text, text, text, jsonb, text) to authenticated;

commit;
