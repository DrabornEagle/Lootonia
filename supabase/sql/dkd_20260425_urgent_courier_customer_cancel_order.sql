begin;

create or replace function public.dkd_urgent_courier_customer_cancel_order_dkd(
  dkd_param_order_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $dkd_cancel_order$
declare
  dkd_user_id_value uuid := auth.uid();
  dkd_updated_count_value integer := 0;
begin
  if dkd_user_id_value is null then
    raise exception 'auth_required';
  end if;

  update public.dkd_urgent_courier_orders
  set dkd_status_key = 'dkd_cancelled',
      dkd_chat_enabled_value = false
  where dkd_order_id = dkd_param_order_id
    and dkd_customer_user_id = dkd_user_id_value
    and dkd_status_key = 'dkd_open'
    and dkd_courier_user_id is null;

  get diagnostics dkd_updated_count_value = row_count;

  if dkd_updated_count_value <= 0 then
    return jsonb_build_object(
      'dkd_ok', false,
      'dkd_reason', 'cancel_not_available'
    );
  end if;

  insert into public.dkd_urgent_courier_messages (
    dkd_order_id,
    dkd_sender_user_id,
    dkd_sender_role_key,
    dkd_message_text
  ) values (
    dkd_param_order_id,
    dkd_user_id_value,
    'dkd_customer',
    'Müşteri kurye kabul etmeden önce siparişi iptal etti.'
  );

  return jsonb_build_object('dkd_ok', true);
end;
$dkd_cancel_order$;

revoke all on function public.dkd_urgent_courier_customer_cancel_order_dkd(uuid) from public;
grant execute on function public.dkd_urgent_courier_customer_cancel_order_dkd(uuid) to authenticated;

commit;
