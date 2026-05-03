begin;

alter table public.dkd_profiles add column if not exists nickname text;
alter table public.dkd_profiles add column if not exists avatar_emoji text;
alter table public.dkd_profiles add column if not exists avatar_image_url text;

create or replace function public.dkd_urgent_courier_order_json_dkd(
  dkd_param_order_id uuid
)
returns jsonb
language plpgsql
stable
set search_path = public
as $dkd_order_json$
declare
  dkd_result_value jsonb := '{}'::jsonb;
begin
  select jsonb_build_object(
    'dkd_order_id', dkd_order_row.dkd_order_id,
    'dkd_customer_user_id', dkd_order_row.dkd_customer_user_id,
    'dkd_courier_user_id', dkd_order_row.dkd_courier_user_id,
    'dkd_customer_full_name', dkd_order_row.dkd_customer_full_name,
    'dkd_customer_display_name', coalesce(nullif(trim(coalesce(dkd_order_row.dkd_customer_full_name, '')), ''), nullif(trim(coalesce(dkd_customer_profile_row.nickname, '')), ''), 'Müşteri'),
    'dkd_courier_display_name', coalesce(nullif(trim(coalesce(dkd_courier_profile_row.nickname, '')), ''), case when dkd_order_row.dkd_courier_user_id is null then '' else 'Kurye' end),
    'dkd_customer_avatar_image_url', coalesce(dkd_customer_profile_row.avatar_image_url, ''),
    'dkd_customer_avatar_emoji', coalesce(nullif(trim(coalesce(dkd_customer_profile_row.avatar_emoji, '')), ''), '👤'),
    'dkd_courier_avatar_image_url', coalesce(dkd_courier_profile_row.avatar_image_url, ''),
    'dkd_courier_avatar_emoji', coalesce(nullif(trim(coalesce(dkd_courier_profile_row.avatar_emoji, '')), ''), '🛵'),
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
        'dkd_is_nearest_pharmacy', dkd_item_row.dkd_is_nearest_pharmacy
      ) order by dkd_item_row.dkd_created_at asc)
      from public.dkd_urgent_courier_order_items dkd_item_row
      where dkd_item_row.dkd_order_id = dkd_order_row.dkd_order_id
    ), '[]'::jsonb),
    'dkd_message_values', coalesce((
      select jsonb_agg(jsonb_build_object(
        'dkd_message_id', dkd_message_row.dkd_message_id,
        'dkd_sender_role_key', dkd_message_row.dkd_sender_role_key,
        'dkd_sender_display_name', case
          when dkd_message_row.dkd_sender_role_key = 'dkd_customer' then coalesce(nullif(trim(coalesce(dkd_order_row.dkd_customer_full_name, '')), ''), nullif(trim(coalesce(dkd_message_profile_row.nickname, '')), ''), 'Müşteri')
          when dkd_message_row.dkd_sender_role_key = 'dkd_courier' then coalesce(nullif(trim(coalesce(dkd_message_profile_row.nickname, '')), ''), nullif(trim(coalesce(dkd_courier_profile_row.nickname, '')), ''), 'Kurye')
          else coalesce(nullif(trim(coalesce(dkd_message_profile_row.nickname, '')), ''), 'Lootonia')
        end,
        'dkd_sender_avatar_image_url', coalesce(dkd_message_profile_row.avatar_image_url, ''),
        'dkd_sender_avatar_emoji', case
          when dkd_message_row.dkd_sender_role_key = 'dkd_customer' then coalesce(nullif(trim(coalesce(dkd_message_profile_row.avatar_emoji, '')), ''), '👤')
          when dkd_message_row.dkd_sender_role_key = 'dkd_courier' then coalesce(nullif(trim(coalesce(dkd_message_profile_row.avatar_emoji, '')), ''), '🛵')
          else coalesce(nullif(trim(coalesce(dkd_message_profile_row.avatar_emoji, '')), ''), '●')
        end,
        'dkd_message_text', dkd_message_row.dkd_message_text,
        'dkd_created_at', dkd_message_row.dkd_created_at
      ) order by dkd_message_row.dkd_created_at asc)
      from public.dkd_urgent_courier_messages dkd_message_row
      left join public.dkd_profiles dkd_message_profile_row
        on dkd_message_profile_row.user_id = dkd_message_row.dkd_sender_user_id
      where dkd_message_row.dkd_order_id = dkd_order_row.dkd_order_id
    ), '[]'::jsonb)
  )
  into dkd_result_value
  from public.dkd_urgent_courier_orders dkd_order_row
  left join public.dkd_profiles dkd_customer_profile_row
    on dkd_customer_profile_row.user_id = dkd_order_row.dkd_customer_user_id
  left join public.dkd_profiles dkd_courier_profile_row
    on dkd_courier_profile_row.user_id = dkd_order_row.dkd_courier_user_id
  where dkd_order_row.dkd_order_id = dkd_param_order_id;

  return coalesce(dkd_result_value, '{}'::jsonb);
end;
$dkd_order_json$;

grant execute on function public.dkd_urgent_courier_order_json_dkd(uuid) to authenticated;

commit;
