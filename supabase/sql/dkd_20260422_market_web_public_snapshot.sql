begin;

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
      dkd_business_table.lng as business_lng
    from public.dkd_business_products dkd_business_product_table
    join public.dkd_businesses dkd_business_table
      on dkd_business_table.id = dkd_business_product_table.business_id
    where coalesce(dkd_business_product_table.is_active, false) = true
      and coalesce(dkd_business_product_table.stock, 0) > 0
      and coalesce(dkd_business_table.is_active, true) = true
    order by dkd_business_product_table.sort_order asc, dkd_business_product_table.updated_at desc
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
