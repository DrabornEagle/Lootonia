begin;

-- DKD Lootonia v0.13
-- Müşteri taşıma ücretini reddederse sipariş yeniden Acil Kurye havuzuna açılır.
-- Reddedilen kurye aynı siparişe tekrar teklif gönderemez; başka kurye teklif verebilir.

create extension if not exists pgcrypto;

create table if not exists public.dkd_urgent_courier_fee_rejections (
  dkd_rejection_id uuid primary key default gen_random_uuid(),
  dkd_order_id uuid not null references public.dkd_urgent_courier_orders(dkd_order_id) on delete cascade,
  dkd_customer_user_id uuid not null references auth.users(id) on delete cascade,
  dkd_courier_user_id uuid not null references auth.users(id) on delete cascade,
  dkd_rejected_fee_tl numeric(12,2) not null default 0,
  dkd_created_at timestamptz not null default now(),
  constraint dkd_urgent_courier_fee_rejections_unique unique (dkd_order_id, dkd_courier_user_id)
);

create index if not exists dkd_urgent_courier_fee_rejections_order_idx
  on public.dkd_urgent_courier_fee_rejections(dkd_order_id, dkd_created_at desc);

create index if not exists dkd_urgent_courier_fee_rejections_courier_idx
  on public.dkd_urgent_courier_fee_rejections(dkd_courier_user_id, dkd_created_at desc);

alter table public.dkd_urgent_courier_fee_rejections enable row level security;

drop policy if exists dkd_urgent_courier_fee_rejections_select_scope on public.dkd_urgent_courier_fee_rejections;
create policy dkd_urgent_courier_fee_rejections_select_scope
on public.dkd_urgent_courier_fee_rejections
for select
to authenticated
using (
  auth.uid() = dkd_customer_user_id
  or auth.uid() = dkd_courier_user_id
);

grant select on public.dkd_urgent_courier_fee_rejections to authenticated;

create or replace function public.dkd_urgent_courier_offer_fee_dkd(
  dkd_param_order_id uuid,
  dkd_param_courier_fee_tl numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $dkd_offer_fee$
declare
  dkd_user_id_value uuid := auth.uid();
  dkd_fee_value numeric(12,2) := round(greatest(coalesce(dkd_param_courier_fee_tl, 0), 0), 2);
  dkd_updated_count_value integer := 0;
begin
  if dkd_user_id_value is null then
    raise exception 'auth_required';
  end if;
  if public.dkd_urgent_courier_license_active_dkd(dkd_user_id_value) is not true then
    raise exception 'courier_license_required';
  end if;
  if dkd_fee_value <= 0 then
    raise exception 'fee_required';
  end if;

  if exists (
    select 1
    from public.dkd_urgent_courier_fee_rejections dkd_rejection_row
    where dkd_rejection_row.dkd_order_id = dkd_param_order_id
      and dkd_rejection_row.dkd_courier_user_id = dkd_user_id_value
  ) then
    return jsonb_build_object(
      'dkd_ok', false,
      'dkd_reason', 'fee_offer_rejected_by_customer',
      'dkd_order_id', dkd_param_order_id
    );
  end if;

  update public.dkd_urgent_courier_orders
  set dkd_courier_user_id = dkd_user_id_value,
      dkd_courier_fee_tl = dkd_fee_value,
      dkd_courier_fee_offered_at = now(),
      dkd_status_key = 'dkd_fee_offer_waiting'
  where dkd_order_id = dkd_param_order_id
    and dkd_status_key = 'dkd_open'
    and dkd_courier_user_id is null;

  get diagnostics dkd_updated_count_value = row_count;
  if dkd_updated_count_value <= 0 then
    return jsonb_build_object('dkd_ok', false, 'dkd_reason', 'order_not_available', 'dkd_order_id', dkd_param_order_id);
  end if;

  insert into public.dkd_urgent_courier_messages (dkd_order_id, dkd_sender_user_id, dkd_sender_role_key, dkd_message_text)
  values (dkd_param_order_id, dkd_user_id_value, 'dkd_courier', concat('Kurye taşıma ücreti teklif etti: ', dkd_fee_value::text, ' TL'));

  return jsonb_build_object('dkd_ok', true, 'dkd_order_id', dkd_param_order_id, 'dkd_courier_fee_tl', dkd_fee_value);
end;
$dkd_offer_fee$;

create or replace function public.dkd_urgent_courier_customer_reject_fee_dkd(
  dkd_param_order_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $dkd_reject_fee$
declare
  dkd_user_id_value uuid := auth.uid();
  dkd_order_row_value public.dkd_urgent_courier_orders%rowtype;
begin
  if dkd_user_id_value is null then
    raise exception 'auth_required';
  end if;

  select *
  into dkd_order_row_value
  from public.dkd_urgent_courier_orders
  where dkd_order_id = dkd_param_order_id
  for update;

  if dkd_order_row_value.dkd_order_id is null or dkd_order_row_value.dkd_customer_user_id <> dkd_user_id_value then
    raise exception 'order_not_found';
  end if;

  if dkd_order_row_value.dkd_status_key <> 'dkd_fee_offer_waiting'
     or dkd_order_row_value.dkd_courier_user_id is null then
    return jsonb_build_object(
      'dkd_ok', false,
      'dkd_reason', 'fee_offer_not_ready',
      'dkd_order_id', dkd_param_order_id
    );
  end if;

  insert into public.dkd_urgent_courier_fee_rejections (
    dkd_order_id,
    dkd_customer_user_id,
    dkd_courier_user_id,
    dkd_rejected_fee_tl
  )
  values (
    dkd_order_row_value.dkd_order_id,
    dkd_order_row_value.dkd_customer_user_id,
    dkd_order_row_value.dkd_courier_user_id,
    coalesce(dkd_order_row_value.dkd_courier_fee_tl, 0)
  )
  on conflict (dkd_order_id, dkd_courier_user_id)
  do update set
    dkd_rejected_fee_tl = excluded.dkd_rejected_fee_tl,
    dkd_created_at = now();

  update public.dkd_urgent_courier_orders
  set dkd_courier_user_id = null,
      dkd_courier_fee_tl = 0,
      dkd_courier_fee_offered_at = null,
      dkd_courier_fee_approved_at = null,
      dkd_chat_enabled_value = false,
      dkd_status_key = 'dkd_open'
  where dkd_order_id = dkd_param_order_id;

  insert into public.dkd_urgent_courier_messages (dkd_order_id, dkd_sender_user_id, dkd_sender_role_key, dkd_message_text)
  values (dkd_param_order_id, dkd_user_id_value, 'dkd_customer', 'Taşıma ücreti reddedildi. Sipariş başka kurye tekliflerine yeniden açıldı.');

  return jsonb_build_object(
    'dkd_ok', true,
    'dkd_order_id', dkd_param_order_id,
    'dkd_reopened_for_other_couriers', true
  );
end;
$dkd_reject_fee$;

revoke all on function public.dkd_urgent_courier_offer_fee_dkd(uuid, numeric) from public;
revoke all on function public.dkd_urgent_courier_customer_reject_fee_dkd(uuid) from public;

grant execute on function public.dkd_urgent_courier_offer_fee_dkd(uuid, numeric) to authenticated;
grant execute on function public.dkd_urgent_courier_customer_reject_fee_dkd(uuid) to authenticated;

commit;
