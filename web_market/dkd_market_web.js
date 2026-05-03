(function dkd_market_bootstrap_value() {
  const dkd_market_state = {
    dkd_config_value: window.dkd_market_web_config || null,
    dkd_supabase_client_value: null,
    dkd_public_snapshot_value: null,
    dkd_active_category_value: 'all',
    dkd_search_value: '',
    dkd_cart_items_value: [],
    dkd_carousel_index_value: 0,
    dkd_carousel_timer_value: null,
    dkd_toast_timer_value: null,
    dkd_session_value: null,
    dkd_detail_item_value: null,
    dkd_purchase_busy_value: false,
    dkd_wallet_snapshot_value: null,
    dkd_business_owner_status_value: { dkd_is_business_owner_value: false, dkd_business_count_value: 0, dkd_primary_business_name_value: '' },
    dkd_profile_save_busy_value: false,
    dkd_purchase_result_value: null,
    dkd_pending_purchase_item_value: null,
    dkd_pending_purchase_options_value: {},
    dkd_pending_cart_checkout_values: [],
    dkd_pending_payment_mode_value: 'single',
    dkd_profile_sync_channel_value: null,
    dkd_profile_sync_busy_value: false,
    dkd_order_history_values: [],
    dkd_order_sync_channel_value: null,
    dkd_order_sync_busy_value: false,
    dkd_last_order_sync_at_value: '',
    dkd_last_wallet_sync_at_value: '',
    dkd_business_delivery_form_value: {
      dkd_address_text_value: '',
      dkd_note_text_value: '',
    },
    dkd_current_view_value: 'home',
    dkd_categories_panel_value: 'business',
    dkd_selected_business_name_value: 'all',
    dkd_support_busy_value: false,
    dkd_support_history_values: [],
    dkd_support_attachment_value: null,
    dkd_support_history_sync_busy_value: false,
    dkd_order_timeline_map_value: {},
    dkd_order_timeline_sync_channel_value: null,
    dkd_session_poll_timer_value: null,
  };

  const dkd_category_definition_values = [
    { dkd_key_value: 'all', dkd_label_value: 'Tümü', dkd_icon_value: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1.8" stroke="currentColor" stroke-width="1.8"/><rect x="14" y="4" width="6" height="6" rx="1.8" stroke="currentColor" stroke-width="1.8"/><rect x="4" y="14" width="6" height="6" rx="1.8" stroke="currentColor" stroke-width="1.8"/><rect x="14" y="14" width="6" height="6" rx="1.8" stroke="currentColor" stroke-width="1.8"/></svg>' },
    { dkd_key_value: 'business', dkd_label_value: 'Yemek', dkd_icon_value: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4.7 10.1c.5-3.2 3.4-5.6 7.3-5.6s6.8 2.4 7.3 5.6H4.7Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M4.4 12.8h15.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M6.1 15.1h11.8l-1 4.1H7.1l-1-4.1Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 7.7h.1M12 6.8h.1M16 7.7h.1" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M18.4 4.8h2.1l-.9 4.9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
    { dkd_key_value: 'courier_cargo', dkd_label_value: 'Kargo Paneli', dkd_icon_value: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 14.8h10.2l2-5.8H7.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.7 9h2.3l2.1 2.8v3h-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.2 18.2a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4Zm9.6 0a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4Z" fill="currentColor"/></svg>' },
    { dkd_key_value: 'urgent_courier', dkd_label_value: 'Acil Kurye', dkd_icon_value: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 15.8h8.8l1.8-5.7H7.4" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.7 12.4h5.1M4.8 8.9h7.6" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/><path d="M16 10.1h2.2l2.1 2.5v3.2h-2.1" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.1 18.8a1.55 1.55 0 1 0 0-3.1 1.55 1.55 0 0 0 0 3.1Zm9.8 0a1.55 1.55 0 1 0 0-3.1 1.55 1.55 0 0 0 0 3.1Z" fill="currentColor"/><path d="M17.6 3.6l-1.2 3.2h2.4l-1.7 3.6" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  ];

  const dkd_energy_regen_seconds_value = 1800;
  const dkd_support_history_storage_key_value = 'dkd_market_support_history_v1';
  const dkd_order_history_storage_key_value = 'dkd_market_order_history_v1';

  function dkd_get_order_history_current_user_id_value() {
    return String(dkd_market_state.dkd_session_value?.user?.id || '').trim();
  }

  function dkd_get_order_history_user_storage_key_value() {
    const dkd_current_user_id_value = dkd_get_order_history_current_user_id_value();
    return dkd_current_user_id_value
      ? `${dkd_order_history_storage_key_value}_user_${dkd_current_user_id_value}`
      : `${dkd_order_history_storage_key_value}_guest`;
  }

  function dkd_attach_order_history_owner_value(dkd_order_value) {
    const dkd_current_user_id_value = dkd_get_order_history_current_user_id_value();
    if (!dkd_current_user_id_value || !dkd_order_value || typeof dkd_order_value !== 'object') return dkd_order_value;
    return {
      ...dkd_order_value,
      dkd_owner_user_id_value: dkd_current_user_id_value,
      dkd_buyer_user_id_value: dkd_order_value.dkd_buyer_user_id_value || dkd_order_value.buyer_user_id || dkd_current_user_id_value,
    };
  }

  function dkd_is_order_history_owned_by_current_user_value(dkd_order_value) {
    const dkd_current_user_id_value = dkd_get_order_history_current_user_id_value();
    if (!dkd_current_user_id_value) return false;
    const dkd_owner_candidates_value = [
      dkd_order_value?.dkd_owner_user_id_value,
      dkd_order_value?.dkd_buyer_user_id_value,
      dkd_order_value?.buyer_user_id,
      dkd_order_value?.dkd_user_id_value,
      dkd_order_value?.user_id,
      dkd_order_value?.snapshot?.buyer_user_id,
      dkd_order_value?.snapshot?.user_id,
    ].map((dkd_candidate_value) => String(dkd_candidate_value || '').trim()).filter(Boolean);
    return dkd_owner_candidates_value.length > 0 && dkd_owner_candidates_value.includes(dkd_current_user_id_value);
  }

  const dkd_support_attachment_limit_bytes_value = 3 * 1024 * 1024;
  const dkd_market_session_poll_interval_ms_value = 12000;
  const dkd_market_pack_art_map_value = Object.freeze({
    energy: './assets/dkd_market_energy_pack.png',
    boost: './assets/dkd_market_shard_pack.png',
    ticket: './assets/dkd_market_boss_ticket_pack.png',
    package: './assets/dkd_market_shard_pack.png',
  });

  function dkd_get_element_value(dkd_element_id_value) {
    return document.getElementById(dkd_element_id_value);
  }

  function dkd_escape_html_value(dkd_raw_value) {
    return String(dkd_raw_value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function dkd_format_number_value(dkd_number_value) {
    return new Intl.NumberFormat('tr-TR').format(Number(dkd_number_value || 0));
  }

  function dkd_format_money_value(dkd_number_value) {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(dkd_number_value || 0));
  }

  function dkd_format_wallet_tl_value(dkd_number_value) {
    return `${Number(dkd_number_value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} TL`;
  }

  function dkd_build_cash_price_chip_html_value(dkd_number_value, dkd_class_name_value = 'dkd_market_cash_price_chip') {
    const dkd_safe_number_value = Number(dkd_number_value || 0);
    if (!Number.isFinite(dkd_safe_number_value) || dkd_safe_number_value <= 0) return '';
    return `<span class="${dkd_class_name_value}">${dkd_format_money_value(dkd_safe_number_value)}</span>`;
  }

  function dkd_build_emphasis_cash_price_html_value(dkd_number_value, dkd_class_name_value = 'dkd_market_cash_price_emphasis') {
    const dkd_safe_number_value = Number(dkd_number_value || 0);
    if (!Number.isFinite(dkd_safe_number_value) || dkd_safe_number_value <= 0) return '';
    return `
      <span class="${dkd_class_name_value}">
        <span class="dkd_market_cash_price_emphasis_label">TL Fiyatı</span>
        <strong>${dkd_format_money_value(dkd_safe_number_value)}</strong>
      </span>
    `;
  }

  function dkd_resolve_tl_price_value(dkd_item_value) {
    const dkd_cash_price_value = Number(dkd_item_value?.dkd_cash_price_value ?? dkd_item_value?.price_cash ?? 0);
    if (Number.isFinite(dkd_cash_price_value) && dkd_cash_price_value > 0) return dkd_cash_price_value;
    const dkd_token_fallback_value = Number(dkd_item_value?.dkd_price_token_value ?? dkd_item_value?.price_token ?? 0);
    return Number.isFinite(dkd_token_fallback_value) && dkd_token_fallback_value > 0 ? dkd_token_fallback_value : 0;
  }

  function dkd_build_tl_price_badge_html_value(dkd_item_value, dkd_class_name_value = 'dkd_market_tl_price_badge') {
    const dkd_tl_price_value = dkd_resolve_tl_price_value(dkd_item_value);
    if (!Number.isFinite(dkd_tl_price_value) || dkd_tl_price_value <= 0) return '<span class="dkd_market_tl_price_badge dkd_market_tl_price_badge_empty">TL fiyatı hazırlanıyor</span>';
    return `
      <span class="${dkd_class_name_value}">
        <strong>${dkd_format_money_value(dkd_tl_price_value)}</strong>
      </span>
    `;
  }

  function dkd_format_order_total_value(dkd_order_value) {
    const dkd_tl_total_value = Number(dkd_order_value?.dkd_total_price_tl_value || 0);
    if (Number.isFinite(dkd_tl_total_value) && dkd_tl_total_value > 0) return dkd_format_money_value(dkd_tl_total_value);
    const dkd_token_total_value = Number(dkd_order_value?.dkd_total_price_token_value || 0);
    return dkd_token_total_value > 0 ? `${dkd_format_number_value(dkd_token_total_value)}T` : dkd_format_money_value(0);
  }

  function dkd_get_payment_label_value(dkd_payment_method_value) {
    const dkd_key_value = String(dkd_payment_method_value || '').toLowerCase();
    if (dkd_key_value === 'cash_on_delivery' || dkd_key_value === 'kapida_nakit') return 'Kapıda Nakit';
    if (dkd_key_value === 'wallet_tl') return 'TL Cüzdan';
    if (dkd_key_value === 'token') return 'Token';
    return 'TL';
  }

  function dkd_build_avatar_markup_value(dkd_wallet_value, dkd_class_name_value = '') {
    const dkd_avatar_image_url_value = String(dkd_wallet_value?.dkd_avatar_image_url_value || '').trim();
    if (dkd_avatar_image_url_value) {
      return `<span class="dkd_market_wallet_avatar ${dkd_class_name_value}"><img src="${dkd_escape_html_value(dkd_avatar_image_url_value)}" alt="Profil" loading="lazy" /></span>`;
    }
    return `<span class="dkd_market_wallet_avatar ${dkd_class_name_value}">${dkd_escape_html_value(dkd_wallet_value?.dkd_avatar_emoji_value || '◉')}</span>`;
  }

  function dkd_resolve_energy_display_value(dkd_profile_value) {
    const dkd_base_max_value = Math.max(1, Math.min(10, Number(dkd_profile_value?.energy_max ?? 10)));
    const dkd_base_energy_value = Math.max(0, Math.min(Number(dkd_profile_value?.energy ?? 0), dkd_base_max_value));
    const dkd_lock_until_value = Number(dkd_profile_value?._energy_lock_until || 0);
    const dkd_now_value = Date.now();
    if (dkd_base_energy_value >= dkd_base_max_value) {
      return { dkd_energy_value: dkd_base_energy_value, dkd_energy_max_value: dkd_base_max_value };
    }
    if (dkd_lock_until_value > dkd_now_value) {
      return { dkd_energy_value: dkd_base_energy_value, dkd_energy_max_value: dkd_base_max_value };
    }
    const dkd_updated_ms_value = new Date(dkd_profile_value?.energy_updated_at || 0).getTime();
    if (Number.isNaN(dkd_updated_ms_value) || dkd_updated_ms_value <= 0) {
      return { dkd_energy_value: dkd_base_energy_value, dkd_energy_max_value: dkd_base_max_value };
    }
    const dkd_elapsed_seconds_value = Math.max(0, Math.floor((dkd_now_value - dkd_updated_ms_value) / 1000));
    const dkd_added_value = Math.floor(dkd_elapsed_seconds_value / dkd_energy_regen_seconds_value);
    return {
      dkd_energy_value: Math.min(dkd_base_energy_value + dkd_added_value, dkd_base_max_value),
      dkd_energy_max_value: dkd_base_max_value,
    };
  }

  function dkd_humanize_error_message_value(dkd_input_value) {
    const dkd_message_value = String(dkd_input_value || '').trim();
    if (!dkd_message_value) return 'Bir işlem hatası oluştu.';
    const dkd_message_key_value = dkd_message_value.toLowerCase();
    if (dkd_message_key_value === 'product_not_found') return 'Ürün şu an vitrinde bulunamadı.';
    if (dkd_message_key_value === 'listing_not_found') return 'İlan artık aktif değil.';
    if (dkd_message_key_value === 'insufficient_token') return 'Yeterli token bakiyesi yok.';
    if (dkd_message_key_value === 'stock_not_available' || dkd_message_key_value === 'out_of_stock') return 'Stok şu an yeterli değil.';
    if (dkd_message_key_value === 'not_enough_token') return 'Yeterli tokenın yok.';
    if (dkd_message_key_value === 'auth_required') return 'Önce giriş yapmalısın.';
    if (dkd_message_key_value === 'profile_missing') return 'Profil kaydı bulunamadı. Uygulamaya girip profili bir kez aç.';
    if (dkd_message_key_value === 'delivery_address_required') return 'İşletme ürünlerinde teslimat adresi zorunlu.';
    if (dkd_message_key_value === 'support_email_secret_missing' || dkd_message_key_value === 'support_function_env_missing') return 'Destek e-postası otomatik gönderime hazır değil.';
    return dkd_message_value.replaceAll('_', ' ');
  }


  function dkd_format_datetime_value(dkd_input_value) {
    if (!dkd_input_value) return '—';
    const dkd_date_value = new Date(dkd_input_value);
    if (Number.isNaN(dkd_date_value.getTime())) return '—';
    return dkd_date_value.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function dkd_map_order_status_value(dkd_status_value) {
    const dkd_status_key_value = String(dkd_status_value || '').toLowerCase();
    if (dkd_status_key_value === 'cash_on_delivery' || dkd_status_key_value === 'pending_cash' || dkd_status_key_value === 'cod_pending') {
      return { dkd_label_value: 'Kapıda Ödeme', dkd_tone_value: '#ffd46b', dkd_class_name_value: 'dkd_market_order_badge_cash' };
    }
    if (dkd_status_key_value === 'paid_token' || dkd_status_key_value === 'paid') {
      return { dkd_label_value: 'Hazırlanıyor', dkd_tone_value: '#6faeff', dkd_class_name_value: 'dkd_market_order_badge_preparing' };
    }
    if (dkd_status_key_value === 'assigned_courier' || dkd_status_key_value === 'courier_assigned') {
      return { dkd_label_value: 'Kurye Atandı', dkd_tone_value: '#9d88ff', dkd_class_name_value: 'dkd_market_order_badge_assigned' };
    }
    if (dkd_status_key_value === 'picked_up' || dkd_status_key_value === 'on_the_way' || dkd_status_key_value === 'shipping') {
      return { dkd_label_value: 'Yolda', dkd_tone_value: '#ffba62', dkd_class_name_value: 'dkd_market_order_badge_shipping' };
    }
    if (dkd_status_key_value === 'delivered' || dkd_status_key_value === 'completed') {
      return { dkd_label_value: 'Teslim', dkd_tone_value: '#78f2bd', dkd_class_name_value: 'dkd_market_order_badge_delivered' };
    }
    if (dkd_status_key_value === 'cancelled' || dkd_status_key_value === 'canceled' || dkd_status_key_value === 'failed') {
      return { dkd_label_value: 'İptal', dkd_tone_value: '#ff8d8d', dkd_class_name_value: 'dkd_market_order_badge_cancelled' };
    }
    return { dkd_label_value: dkd_status_key_value ? dkd_humanize_error_message_value(dkd_status_key_value) : 'Bilinmiyor', dkd_tone_value: '#cbd7ef', dkd_class_name_value: 'dkd_market_order_badge_unknown' };
  }

  function dkd_build_order_summary_value(dkd_order_history_values) {
    const dkd_safe_values = Array.isArray(dkd_order_history_values) ? dkd_order_history_values : [];
    const dkd_total_count_value = dkd_safe_values.length;
    const dkd_active_count_value = dkd_safe_values.filter((dkd_order_value) => ['cash_on_delivery', 'pending_cash', 'cod_pending', 'paid_token', 'paid', 'assigned_courier', 'courier_assigned', 'picked_up', 'on_the_way', 'shipping'].includes(dkd_get_latest_order_status_key_value(dkd_order_value))).length;
    const dkd_delivered_count_value = dkd_safe_values.filter((dkd_order_value) => ['delivered', 'completed'].includes(dkd_get_latest_order_status_key_value(dkd_order_value))).length;
    const dkd_total_spent_value = dkd_safe_values.reduce((dkd_running_total_value, dkd_order_value) => dkd_running_total_value + Number(dkd_order_value.dkd_total_price_tl_value || dkd_order_value.dkd_total_price_token_value || 0), 0);
    const dkd_latest_order_value = dkd_safe_values[0] || null;
    return {
      dkd_total_count_value,
      dkd_active_count_value,
      dkd_delivered_count_value,
      dkd_total_spent_value,
      dkd_latest_order_value,
    };
  }

  function dkd_normalize_order_history_value(dkd_order_row_value) {
    const dkd_snapshot_value = dkd_order_row_value?.snapshot && typeof dkd_order_row_value.snapshot === 'object'
      ? dkd_order_row_value.snapshot
      : {};
    const dkd_status_meta_value = dkd_map_order_status_value(dkd_order_row_value?.status || '');
    return {
      dkd_order_id_value: dkd_order_row_value?.id,
      dkd_product_id_value: dkd_order_row_value?.product_id,
      dkd_business_id_value: dkd_order_row_value?.business_id,
      dkd_quantity_value: Number(dkd_order_row_value?.quantity || 0),
      dkd_unit_price_token_value: Number(dkd_order_row_value?.unit_price_token || 0),
      dkd_total_price_token_value: Number(dkd_order_row_value?.total_price_token || 0),
      dkd_unit_price_tl_value: Number(dkd_order_row_value?.unit_price_tl ?? dkd_snapshot_value.unit_price_tl ?? dkd_snapshot_value.price_cash ?? 0),
      dkd_total_price_tl_value: Number(dkd_order_row_value?.total_price_tl ?? dkd_snapshot_value.total_price_tl ?? dkd_snapshot_value.price_cash ?? 0),
      dkd_payment_method_value: String(dkd_order_row_value?.payment_method || dkd_snapshot_value.payment_method || ''),
      dkd_payment_status_value: String(dkd_order_row_value?.payment_status || dkd_snapshot_value.payment_status || ''),
      dkd_status_value: String(dkd_order_row_value?.status || ''),
      dkd_status_meta_value,
      dkd_currency_code_value: String(dkd_order_row_value?.currency_code || 'TOKEN'),
      dkd_created_at_value: dkd_order_row_value?.created_at || '',
      dkd_updated_at_value: dkd_order_row_value?.updated_at || '',
      dkd_product_name_value: dkd_snapshot_value.product_title || dkd_snapshot_value.product_name || 'İşletme ürünü',
      dkd_business_name_value: dkd_snapshot_value.business_name || 'İşletme',
      dkd_image_url_value: dkd_snapshot_value.image_url || '',
      dkd_delivery_address_text_value: dkd_snapshot_value.delivery_address_text || dkd_snapshot_value.address_text || '',
      dkd_delivery_note_text_value: dkd_snapshot_value.delivery_note_text || dkd_snapshot_value.note_text || '',
    };
  }



  function dkd_get_order_timeline_entries_value(dkd_order_id_value) {
    return Array.isArray(dkd_market_state.dkd_order_timeline_map_value?.[String(dkd_order_id_value || '')])
      ? dkd_market_state.dkd_order_timeline_map_value[String(dkd_order_id_value || '')]
      : [];
  }

  function dkd_get_latest_order_status_key_value(dkd_order_value) {
    const dkd_remote_entries_value = dkd_get_order_timeline_entries_value(dkd_order_value?.dkd_order_id_value);
    const dkd_latest_entry_value = Array.isArray(dkd_remote_entries_value) && dkd_remote_entries_value.length
      ? dkd_remote_entries_value[dkd_remote_entries_value.length - 1]
      : null;
    const dkd_latest_status_value = String(dkd_latest_entry_value?.dkd_status_value || '').trim().toLowerCase();
    if (dkd_latest_status_value) return dkd_latest_status_value;
    return String(dkd_order_value?.dkd_status_value || '').trim().toLowerCase();
  }

  function dkd_build_order_badge_meta_value(dkd_order_value) {
    return dkd_map_order_status_value(dkd_get_latest_order_status_key_value(dkd_order_value));
  }

  function dkd_build_order_timeline_step_values(dkd_order_value) {
    const dkd_status_key_value = dkd_get_latest_order_status_key_value(dkd_order_value);
    const dkd_remote_entries_value = dkd_get_order_timeline_entries_value(dkd_order_value?.dkd_order_id_value);
    const dkd_template_values = [
      { dkd_key_value: 'cash_on_delivery', dkd_label_value: dkd_order_value?.dkd_payment_method_value === 'cash_on_delivery' ? 'Kapıda nakit ödeme seçildi' : 'Sipariş alındı', dkd_fallback_time_value: dkd_order_value?.dkd_created_at_value || '' },
      { dkd_key_value: 'assigned_courier', dkd_label_value: 'Kurye atandı', dkd_fallback_time_value: '' },
      { dkd_key_value: 'picked_up', dkd_label_value: 'Hazırlandı ve yola çıktı', dkd_fallback_time_value: '' },
      { dkd_key_value: 'delivered', dkd_label_value: 'Teslim edildi', dkd_fallback_time_value: '' },
    ];
    const dkd_reached_step_map_value = {
      cash_on_delivery: 0,
      pending_cash: 0,
      cod_pending: 0,
      paid_token: 0,
      paid: 0,
      assigned_courier: 1,
      courier_assigned: 1,
      picked_up: 2,
      on_the_way: 2,
      shipping: 2,
      delivered: 3,
      completed: 3,
    };
    const dkd_last_completed_index_value = dkd_reached_step_map_value[dkd_status_key_value] ?? 0;
    const dkd_lookup_value = {};
    dkd_remote_entries_value.forEach((dkd_entry_value) => {
      const dkd_entry_status_value = String(dkd_entry_value?.dkd_status_value || '').toLowerCase();
      if (!dkd_entry_status_value) return;
      dkd_lookup_value[dkd_entry_status_value] = dkd_entry_value;
    });
    if (['cancelled', 'canceled', 'failed'].includes(dkd_status_key_value)) {
      dkd_template_values.push({ dkd_key_value: 'cancelled', dkd_label_value: 'İptal', dkd_fallback_time_value: dkd_order_value?.dkd_updated_at_value || '' });
    }
    return dkd_template_values.map((dkd_step_value, dkd_step_index_value) => {
      const dkd_lookup_entry_value = dkd_lookup_value[dkd_step_value.dkd_key_value]
        || (dkd_step_value.dkd_key_value === 'cash_on_delivery' ? (dkd_lookup_value.cash_on_delivery || dkd_lookup_value.pending_cash || dkd_lookup_value.cod_pending || dkd_lookup_value.paid || dkd_lookup_value.paid_token) : null)
        || (dkd_step_value.dkd_key_value === 'assigned_courier' ? (dkd_lookup_value.assigned_courier || dkd_lookup_value.courier_assigned) : null)
        || (dkd_step_value.dkd_key_value === 'picked_up' ? (dkd_lookup_value.picked_up || dkd_lookup_value.on_the_way || dkd_lookup_value.shipping) : null)
        || (dkd_step_value.dkd_key_value === 'delivered' ? (dkd_lookup_value.delivered || dkd_lookup_value.completed) : null)
        || (dkd_step_value.dkd_key_value === 'cancelled' ? (dkd_lookup_value.cancelled || dkd_lookup_value.canceled || dkd_lookup_value.failed) : null);
      const dkd_effective_time_value = dkd_lookup_entry_value?.dkd_created_at_value || dkd_step_value.dkd_fallback_time_value || (dkd_step_index_value <= dkd_last_completed_index_value ? dkd_order_value?.dkd_updated_at_value || '' : '');
      const dkd_effective_note_value = dkd_lookup_entry_value?.dkd_note_text_value || (
        dkd_step_value.dkd_key_value === 'cash_on_delivery'
          ? (dkd_order_value?.dkd_delivery_address_text_value ? `Teslimat: ${dkd_order_value.dkd_delivery_address_text_value} • ödeme kapıda nakit alınacak.` : 'Sipariş sisteme düştü, ödeme kapıda nakit alınacak.')
          : (dkd_step_value.dkd_key_value === 'picked_up' ? 'Kurye ürünü teslim aldı ve teslimat hattına çıktı.' : '')
      );
      const dkd_is_current_value = (
        String(dkd_step_value.dkd_key_value || '') === dkd_status_key_value
        || (dkd_step_value.dkd_key_value === 'cash_on_delivery' && ['cash_on_delivery', 'pending_cash', 'cod_pending', 'paid', 'paid_token'].includes(dkd_status_key_value))
        || (dkd_step_value.dkd_key_value === 'assigned_courier' && dkd_status_key_value === 'courier_assigned')
        || (dkd_step_value.dkd_key_value === 'picked_up' && ['picked_up', 'on_the_way', 'shipping'].includes(dkd_status_key_value))
        || (dkd_step_value.dkd_key_value === 'delivered' && dkd_status_key_value === 'completed')
      );
      const dkd_is_completed_value = Boolean(dkd_lookup_entry_value) || dkd_step_index_value <= dkd_last_completed_index_value || (dkd_step_value.dkd_key_value === 'cancelled' && ['cancelled', 'canceled', 'failed'].includes(dkd_status_key_value));
      return {
        ...dkd_step_value,
        dkd_time_text_value: dkd_format_datetime_value(dkd_effective_time_value),
        dkd_note_text_value: dkd_effective_note_value,
        dkd_is_completed_value: dkd_is_completed_value && dkd_effective_time_value,
        dkd_is_current_value,
      };
    });
  }


  function dkd_render_order_timeline_html_value(dkd_order_value) {
    const dkd_step_values = dkd_build_order_timeline_step_values(dkd_order_value);
    if (!dkd_step_values.length) return '';
    return `
      <section class="dkd_market_order_timeline_section">
        <div class="dkd_market_order_timeline_head">
          <strong>Canlı durum çizgisi</strong>
          <span>Supabase senkron durum akışı</span>
        </div>
        <div class="dkd_market_order_timeline_list">
          ${dkd_step_values.map((dkd_step_value) => `
            <div class="dkd_market_order_timeline_item${dkd_step_value.dkd_is_completed_value ? ' dkd_market_order_timeline_item_done' : ''}${dkd_step_value.dkd_is_current_value ? ' dkd_market_order_timeline_item_active' : ''}">
              <div class="dkd_market_order_timeline_dot"></div>
              <div class="dkd_market_order_timeline_copy">
                <div class="dkd_market_order_timeline_row">
                  <strong>${dkd_escape_html_value(dkd_step_value.dkd_label_value)}</strong>
                  <span>${dkd_escape_html_value(dkd_step_value.dkd_time_text_value)}</span>
                </div>
                ${dkd_step_value.dkd_note_text_value ? `<div class="dkd_market_order_timeline_note">${dkd_escape_html_value(dkd_step_value.dkd_note_text_value)}</div>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }

  function dkd_build_order_history_key_value(dkd_order_value) {
    const dkd_order_id_value = String(dkd_order_value?.dkd_order_id_value || dkd_order_value?.id || '').trim();
    if (dkd_order_id_value) return `id:${dkd_order_id_value}`;
    const dkd_product_name_value = String(dkd_order_value?.dkd_product_name_value || dkd_order_value?.snapshot?.product_title || '').trim();
    const dkd_created_at_value = String(dkd_order_value?.dkd_created_at_value || dkd_order_value?.created_at || '').trim();
    const dkd_total_value = Number(dkd_order_value?.dkd_total_price_tl_value || dkd_order_value?.total_price_tl || dkd_order_value?.dkd_total_price_token_value || dkd_order_value?.total_price_token || 0);
    return `fallback:${dkd_product_name_value}:${dkd_created_at_value}:${dkd_total_value}`;
  }


  function dkd_load_local_order_history_value() {
    try {
      const dkd_storage_key_value = dkd_get_order_history_user_storage_key_value();
      const dkd_raw_value = window.localStorage.getItem(dkd_storage_key_value);
      if (!dkd_raw_value) return [];
      const dkd_parsed_value = JSON.parse(dkd_raw_value);
      const dkd_current_user_id_value = dkd_get_order_history_current_user_id_value();
      const dkd_safe_values = Array.isArray(dkd_parsed_value) ? dkd_parsed_value : [];
      if (!dkd_current_user_id_value) return [];
      return dkd_safe_values
        .map(dkd_attach_order_history_owner_value)
        .filter(dkd_is_order_history_owned_by_current_user_value);
    } catch (_dkd_error_value) {
      return [];
    }
  }


  function dkd_save_local_order_history_value(dkd_order_history_values) {
    try {
      const dkd_current_user_id_value = dkd_get_order_history_current_user_id_value();
      if (!dkd_current_user_id_value) return;
      const dkd_user_scoped_values = (Array.isArray(dkd_order_history_values) ? dkd_order_history_values : [])
        .map(dkd_attach_order_history_owner_value)
        .filter(dkd_is_order_history_owned_by_current_user_value)
        .slice(0, 30);
      window.localStorage.setItem(dkd_get_order_history_user_storage_key_value(), JSON.stringify(dkd_user_scoped_values));
    } catch (_dkd_error_value) {
      // no-op
    }
  }

  function dkd_merge_order_history_values(dkd_primary_values, dkd_secondary_values) {
    const dkd_merged_values = [];
    const dkd_seen_keys_value = new Set();
    [...(Array.isArray(dkd_primary_values) ? dkd_primary_values : []), ...(Array.isArray(dkd_secondary_values) ? dkd_secondary_values : [])].forEach((dkd_order_value) => {
      const dkd_key_value = dkd_build_order_history_key_value(dkd_order_value);
      if (dkd_seen_keys_value.has(dkd_key_value)) return;
      dkd_seen_keys_value.add(dkd_key_value);
      dkd_merged_values.push(dkd_order_value);
    });
    return dkd_merged_values
      .sort((dkd_left_value, dkd_right_value) => new Date(dkd_right_value?.dkd_created_at_value || 0).getTime() - new Date(dkd_left_value?.dkd_created_at_value || 0).getTime())
      .slice(0, 30);
  }


  function dkd_get_effective_order_history_values() {
    const dkd_current_user_id_value = dkd_get_order_history_current_user_id_value();
    if (!dkd_current_user_id_value) {
      dkd_market_state.dkd_order_history_values = [];
      return [];
    }
    const dkd_state_values = (Array.isArray(dkd_market_state.dkd_order_history_values) ? dkd_market_state.dkd_order_history_values : [])
      .map(dkd_attach_order_history_owner_value)
      .filter(dkd_is_order_history_owned_by_current_user_value);
    const dkd_local_values = dkd_load_local_order_history_value();
    const dkd_merged_values = dkd_merge_order_history_values(dkd_state_values, dkd_local_values)
      .map(dkd_attach_order_history_owner_value)
      .filter(dkd_is_order_history_owned_by_current_user_value);
    dkd_market_state.dkd_order_history_values = dkd_merged_values;
    return dkd_merged_values;
  }


  function dkd_push_local_order_history_entry_value(dkd_item_value, dkd_purchase_response_value) {
    if (dkd_item_value?.dkd_source_kind_value !== 'business') return;
    const dkd_current_user_id_value = dkd_get_order_history_current_user_id_value();
    if (!dkd_current_user_id_value) return;
    const dkd_local_values = dkd_load_local_order_history_value();
    const dkd_now_value = new Date().toISOString();
    const dkd_new_entry_value = dkd_attach_order_history_owner_value({
      dkd_order_id_value: dkd_purchase_response_value?.order_id || '',
      dkd_product_id_value: dkd_item_value?.dkd_business_product_id_value || '',
      dkd_business_id_value: dkd_item_value?.dkd_business_id_value || '',
      dkd_quantity_value: Number(dkd_purchase_response_value?.quantity || 1),
      dkd_unit_price_token_value: Number(dkd_purchase_response_value?.price_token || dkd_item_value?.dkd_price_token_value || 0),
      dkd_total_price_token_value: Number(dkd_purchase_response_value?.spent_token || dkd_purchase_response_value?.total_price_tl || dkd_item_value?.dkd_price_tl_value || dkd_item_value?.dkd_price_token_value || 0),
      dkd_status_value: dkd_purchase_response_value?.payment_status || dkd_purchase_response_value?.status || 'paid',
      dkd_status_meta_value: dkd_map_order_status_value(dkd_purchase_response_value?.payment_status || dkd_purchase_response_value?.status || 'paid'),
      dkd_currency_code_value: dkd_purchase_response_value?.currency_code || 'TRY',
      dkd_created_at_value: dkd_now_value,
      dkd_updated_at_value: dkd_now_value,
      dkd_product_name_value: dkd_item_value?.dkd_name_value || dkd_purchase_response_value?.product_name || 'İşletme ürünü',
      dkd_business_name_value: dkd_item_value?.dkd_business_name_value || dkd_purchase_response_value?.business_name || 'İşletme',
      dkd_image_url_value: dkd_item_value?.dkd_art_url_value || '',
      dkd_delivery_address_text_value: dkd_item_value?.dkd_delivery_address_text_value || '',
      dkd_delivery_note_text_value: dkd_item_value?.dkd_delivery_note_text_value || '',
    });
    const dkd_merged_values = dkd_merge_order_history_values([dkd_new_entry_value], dkd_local_values);
    dkd_save_local_order_history_value(dkd_merged_values);
  }

  function dkd_clone_market_item_value(dkd_item_value) {
    return dkd_item_value ? { ...dkd_item_value } : null;
  }

  function dkd_pick_wallet_number_value(dkd_payload_value, dkd_field_name_value, dkd_fallback_value = 0) {
    const dkd_next_value = Number(dkd_payload_value?.[dkd_field_name_value]);
    return Number.isFinite(dkd_next_value) ? dkd_next_value : Number(dkd_fallback_value || 0);
  }

  function dkd_resolve_wallet_tl_value(dkd_profile_value) {
    const dkd_direct_wallet_value = dkd_pick_wallet_number_value(dkd_profile_value, 'wallet_tl', 0);
    if (dkd_direct_wallet_value > 0 || Object.prototype.hasOwnProperty.call(dkd_profile_value || {}, 'wallet_tl')) return dkd_direct_wallet_value;
    const dkd_courier_wallet_value = dkd_pick_wallet_number_value(dkd_profile_value, 'courier_wallet_tl', 0);
    if (dkd_courier_wallet_value > 0 || Object.prototype.hasOwnProperty.call(dkd_profile_value || {}, 'courier_wallet_tl')) return dkd_courier_wallet_value;
    const dkd_merchant_wallet_value = dkd_pick_wallet_number_value(dkd_profile_value, 'merchant_wallet_tl', 0);
    if (dkd_merchant_wallet_value > 0 || Object.prototype.hasOwnProperty.call(dkd_profile_value || {}, 'merchant_wallet_tl')) return dkd_merchant_wallet_value;
    return 0;
  }

  function dkd_normalize_wallet_snapshot_value(dkd_profile_value) {
    if (!dkd_profile_value) return null;
    const dkd_nickname_value = dkd_profile_value.nickname || dkd_market_state.dkd_session_value?.user?.email || 'Lootonia Oyuncusu';
    const dkd_energy_display_value = dkd_resolve_energy_display_value(dkd_profile_value);
    const dkd_wallet_snapshot_value = {
      dkd_nickname_value,
      dkd_user_email_value: dkd_market_state.dkd_session_value?.user?.email || '',
      dkd_wallet_tl_value: dkd_resolve_wallet_tl_value(dkd_profile_value),
      dkd_token_value: dkd_pick_wallet_number_value(dkd_profile_value, 'token', 0),
      dkd_shards_value: dkd_pick_wallet_number_value(dkd_profile_value, 'shards', 0),
      dkd_energy_value: dkd_energy_display_value.dkd_energy_value,
      dkd_energy_max_value: dkd_energy_display_value.dkd_energy_max_value,
      dkd_boss_tickets_value: dkd_pick_wallet_number_value(dkd_profile_value, 'boss_tickets', 0),
      dkd_avatar_image_url_value: dkd_profile_value.avatar_image_url ? String(dkd_profile_value.avatar_image_url) : '',
      dkd_avatar_emoji_value: dkd_profile_value.avatar_emoji ? String(dkd_profile_value.avatar_emoji) : '',
    };
    return dkd_wallet_snapshot_value;
  }

  function dkd_build_wallet_fallback_value() {
    return {
      dkd_nickname_value: dkd_market_state.dkd_session_value?.user?.email || 'Web Senkronu',
      dkd_user_email_value: dkd_market_state.dkd_session_value?.user?.email || '',
      dkd_wallet_tl_value: 0,
      dkd_token_value: 0,
      dkd_shards_value: 0,
      dkd_energy_value: 0,
      dkd_energy_max_value: 10,
      dkd_boss_tickets_value: 0,
      dkd_avatar_image_url_value: '',
      dkd_avatar_emoji_value: '🧿',
    };
  }

  function dkd_get_profile_select_try_values() {
    return [
      'user_id, ally_id, social_last_seen_at, nickname, avatar_emoji, avatar_image_url, token, shards, boss_tickets, energy, energy_max, energy_updated_at, task_state, boss_state, weekly_task_state, xp, level, rank_key, wallet_tl, courier_status, courier_score, courier_completed_jobs, courier_wallet_tl, courier_total_earned_tl, courier_withdrawn_tl, courier_active_days, courier_last_completed_at, courier_fastest_eta_min, courier_city, courier_zone, courier_vehicle_type, courier_profile_meta',
      'user_id, ally_id, social_last_seen_at, nickname, avatar_emoji, token, shards, boss_tickets, energy, energy_max, energy_updated_at, task_state, boss_state, weekly_task_state, xp, level, rank_key, wallet_tl, courier_status, courier_score, courier_completed_jobs, courier_wallet_tl, courier_total_earned_tl, courier_withdrawn_tl, courier_active_days, courier_last_completed_at, courier_fastest_eta_min, courier_city, courier_zone, courier_vehicle_type, courier_profile_meta',
      'user_id, ally_id, social_last_seen_at, nickname, avatar_emoji, token, shards, boss_tickets, energy, energy_max, energy_updated_at, task_state, boss_state, weekly_task_state, xp, level, rank_key, courier_status, courier_score, courier_completed_jobs, courier_wallet_tl, courier_total_earned_tl, courier_withdrawn_tl, courier_active_days, courier_last_completed_at, courier_fastest_eta_min',
      'user_id, nickname, avatar_emoji, token, shards, boss_tickets, energy, energy_max, energy_updated_at, task_state, boss_state, weekly_task_state, xp, level, rank_key, courier_status, courier_score, courier_completed_jobs',
      'user_id, nickname, avatar_emoji, token, shards, boss_tickets, energy, energy_max, energy_updated_at, task_state, boss_state, weekly_task_state, xp, level, rank_key',
      'user_id, nickname, avatar_emoji, token, shards, boss_tickets, energy, energy_max, energy_updated_at, task_state, boss_state, weekly_task_state',
      'user_id, nickname, avatar_emoji, token, shards, energy, energy_max, energy_updated_at, task_state, boss_state, weekly_task_state',
      'user_id, nickname, avatar_emoji, token, energy, energy_max, energy_updated_at, task_state, boss_state, weekly_task_state',
      'user_id, token, energy, energy_max, energy_updated_at, task_state, boss_state, weekly_task_state',
      'user_id, token, energy, energy_max, energy_updated_at, task_state, boss_state',
      'user_id, token, energy, energy_max, energy_updated_at',
      'user_id, nickname, wallet_tl, courier_wallet_tl, token, shards, energy, energy_max, boss_tickets',
      'user_id, wallet_tl, courier_wallet_tl, token, energy, energy_max',
    ];
  }

  async function dkd_try_load_wallet_snapshot_from_rpc_value() {
    if (!dkd_market_state.dkd_supabase_client_value) return null;
    const dkd_result_value = await dkd_market_state.dkd_supabase_client_value.rpc('dkd_market_web_profile_sync_snapshot');
    if (dkd_result_value.error || !dkd_result_value.data) return null;
    if (typeof dkd_result_value.data === 'object' && !Array.isArray(dkd_result_value.data)) {
      return dkd_result_value.data;
    }
    return null;
  }

  async function dkd_try_load_wallet_snapshot_from_table_value() {
    const dkd_select_try_values = dkd_get_profile_select_try_values();
    for (const dkd_select_value of dkd_select_try_values) {
      const dkd_result_value = await dkd_market_state.dkd_supabase_client_value
        .from('dkd_profiles')
        .select(dkd_select_value)
        .eq('user_id', dkd_market_state.dkd_session_value.user.id)
        .maybeSingle();
      if (!dkd_result_value.error && dkd_result_value.data) {
        return dkd_result_value.data;
      }
    }
    return null;
  }

  async function dkd_load_wallet_snapshot_value() {
    if (!dkd_market_state.dkd_supabase_client_value || !dkd_market_state.dkd_session_value?.user?.id) {
      dkd_market_state.dkd_wallet_snapshot_value = null;
      return;
    }
    if (dkd_market_state.dkd_profile_sync_busy_value) return;
    dkd_market_state.dkd_profile_sync_busy_value = true;

    try {
      let dkd_profile_value = await dkd_try_load_wallet_snapshot_from_rpc_value();
      if (!dkd_profile_value) {
        dkd_profile_value = await dkd_try_load_wallet_snapshot_from_table_value();
      }
      dkd_market_state.dkd_wallet_snapshot_value = dkd_normalize_wallet_snapshot_value(dkd_profile_value) || dkd_build_wallet_fallback_value();
      dkd_market_state.dkd_last_wallet_sync_at_value = new Date().toISOString();
    } finally {
      dkd_market_state.dkd_profile_sync_busy_value = false;
    }
  }

  function dkd_teardown_profile_sync_value() {
    if (!dkd_market_state.dkd_profile_sync_channel_value || !dkd_market_state.dkd_supabase_client_value) return;
    dkd_market_state.dkd_supabase_client_value.removeChannel(dkd_market_state.dkd_profile_sync_channel_value);
    dkd_market_state.dkd_profile_sync_channel_value = null;
  }

  function dkd_attach_profile_sync_value() {
    dkd_teardown_profile_sync_value();
    if (!dkd_market_state.dkd_supabase_client_value || !dkd_market_state.dkd_session_value?.user?.id) return;
    const dkd_user_id_value = dkd_market_state.dkd_session_value.user.id;
    const dkd_channel_value = dkd_market_state.dkd_supabase_client_value
      .channel(`dkd_market_profile_sync_${dkd_user_id_value}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'dkd_profiles',
        filter: `user_id=eq.${dkd_user_id_value}`,
      }, async () => {
        await dkd_load_wallet_snapshot_value();
        dkd_render_wallet_strip_value();
        dkd_render_account_card_value();
        dkd_render_result_drawer_value();
      })
      .subscribe();
    dkd_market_state.dkd_profile_sync_channel_value = dkd_channel_value;
  }

  async function dkd_load_order_history_value() {
    if (!dkd_market_state.dkd_supabase_client_value || !dkd_market_state.dkd_session_value?.user?.id) {
      dkd_market_state.dkd_order_history_values = [];
      dkd_market_state.dkd_order_timeline_map_value = {};
      return;
    }
    if (dkd_market_state.dkd_order_sync_busy_value) return;
    dkd_market_state.dkd_order_sync_busy_value = true;
    try {
      const dkd_client_value = dkd_market_state.dkd_supabase_client_value;
      const dkd_user_id_value = dkd_market_state.dkd_session_value.user.id;
      let dkd_order_result_value = await dkd_client_value
        .from('dkd_business_product_orders')
        .select('id, product_id, business_id, quantity, unit_price_token, total_price_token, unit_price_tl, total_price_tl, payment_method, payment_status, status, currency_code, snapshot, created_at, updated_at')
        .eq('buyer_user_id', dkd_user_id_value)
        .order('created_at', { ascending: false })
        .limit(24);

      if (dkd_order_result_value.error) {
        const dkd_legacy_result_value = await dkd_client_value
          .from('dkd_business_product_orders')
          .select('id, product_id, business_id, quantity, status, snapshot, created_at, updated_at, token_spent, unit_price_token, total_price_token')
          .eq('user_id', dkd_user_id_value)
          .order('created_at', { ascending: false })
          .limit(24);

        if (!dkd_legacy_result_value.error) {
          dkd_order_result_value = {
            error: null,
            data: (Array.isArray(dkd_legacy_result_value.data) ? dkd_legacy_result_value.data : []).map((dkd_row_value) => {
              const dkd_quantity_value = Number(dkd_row_value?.quantity || 1) || 1;
              const dkd_total_price_token_value = Number(
                dkd_row_value?.total_price_token
                ?? dkd_row_value?.token_spent
                ?? 0,
              );
              const dkd_unit_price_token_value = Number(
                dkd_row_value?.unit_price_token
                ?? (dkd_total_price_token_value > 0 ? Math.round(dkd_total_price_token_value / dkd_quantity_value) : 0),
              );
              return {
                ...dkd_row_value,
                unit_price_token: dkd_unit_price_token_value,
                total_price_token: dkd_total_price_token_value,
                currency_code: dkd_row_value?.currency_code || 'TOKEN',
              };
            }),
          };
        }
      }

      if (dkd_order_result_value.error) {
        dkd_market_state.dkd_order_history_values = dkd_load_local_order_history_value();
      } else {
        const dkd_server_values = (Array.isArray(dkd_order_result_value.data) ? dkd_order_result_value.data : []).map(dkd_normalize_order_history_value);
        const dkd_local_values = dkd_load_local_order_history_value();
        dkd_market_state.dkd_order_history_values = dkd_merge_order_history_values(dkd_server_values, dkd_local_values);
        dkd_save_local_order_history_value(dkd_market_state.dkd_order_history_values);
        dkd_market_state.dkd_last_order_sync_at_value = new Date().toISOString();
      }
      dkd_market_state.dkd_order_history_values = dkd_get_effective_order_history_values();
      await dkd_load_order_timeline_map_value();
    } finally {
      dkd_market_state.dkd_order_sync_busy_value = false;
    }
  }


  function dkd_teardown_order_sync_value() {
    if (!dkd_market_state.dkd_order_sync_channel_value || !dkd_market_state.dkd_supabase_client_value) return;
    dkd_market_state.dkd_supabase_client_value.removeChannel(dkd_market_state.dkd_order_sync_channel_value);
    dkd_market_state.dkd_order_sync_channel_value = null;
  }

  function dkd_attach_order_sync_value() {
    dkd_teardown_order_sync_value();
    if (!dkd_market_state.dkd_supabase_client_value || !dkd_market_state.dkd_session_value?.user?.id) return;
    const dkd_user_id_value = dkd_market_state.dkd_session_value.user.id;
    const dkd_channel_value = dkd_market_state.dkd_supabase_client_value
      .channel(`dkd_market_order_sync_${dkd_user_id_value}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'dkd_business_product_orders',
        filter: `buyer_user_id=eq.${dkd_user_id_value}`,
      }, async () => {
        await dkd_load_order_history_value();
        dkd_render_account_card_value();
        dkd_render_orders_drawer_value();
      })
      .subscribe();
    dkd_market_state.dkd_order_sync_channel_value = dkd_channel_value;
  }

  function dkd_teardown_order_timeline_sync_value() {
    if (!dkd_market_state.dkd_order_timeline_sync_channel_value || !dkd_market_state.dkd_supabase_client_value) return;
    dkd_market_state.dkd_supabase_client_value.removeChannel(dkd_market_state.dkd_order_timeline_sync_channel_value);
    dkd_market_state.dkd_order_timeline_sync_channel_value = null;
  }

  function dkd_attach_order_timeline_sync_value() {
    dkd_teardown_order_timeline_sync_value();
    if (!dkd_market_state.dkd_supabase_client_value || !dkd_market_state.dkd_session_value?.user?.id) return;
    const dkd_user_id_value = dkd_market_state.dkd_session_value.user.id;
    const dkd_channel_value = dkd_market_state.dkd_supabase_client_value
      .channel(`dkd_market_order_timeline_sync_${dkd_user_id_value}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'dkd_business_order_status_history',
      }, async () => {
        await dkd_load_order_history_value();
        dkd_render_account_card_value();
        dkd_render_orders_drawer_value();
      })
      .subscribe();
    dkd_market_state.dkd_order_timeline_sync_channel_value = dkd_channel_value;
  }

  function dkd_stop_session_polling_value() {
    if (!dkd_market_state.dkd_session_poll_timer_value) return;
    window.clearInterval(dkd_market_state.dkd_session_poll_timer_value);
    dkd_market_state.dkd_session_poll_timer_value = null;
  }

  function dkd_start_session_polling_value() {
    dkd_stop_session_polling_value();
    if (!dkd_market_state.dkd_session_value?.user?.id) return;
    dkd_market_state.dkd_session_poll_timer_value = window.setInterval(async () => {
      if (!dkd_market_state.dkd_session_value?.user?.id || document.hidden) return;
      await dkd_load_wallet_snapshot_value();
      await dkd_load_order_history_value();
      await dkd_load_business_owner_status_value();
      dkd_render_wallet_strip_value();
      dkd_render_account_card_value();
      dkd_render_orders_drawer_value();
    }, dkd_market_session_poll_interval_ms_value);
  }


  function dkd_render_orders_drawer_value() {
    const dkd_orders_node_value = dkd_get_element_value('dkd_market_orders_body');
    if (!dkd_orders_node_value) return;
    const dkd_order_values = dkd_get_effective_order_history_values();
    if (!dkd_market_state.dkd_session_value?.user?.email) {
      dkd_orders_node_value.innerHTML = '<div class="dkd_market_empty_card">Sipariş geçmişi için önce giriş yap.</div>';
      return;
    }
    if (!dkd_order_values.length) {
      dkd_orders_node_value.innerHTML = '<div class="dkd_market_empty_card">Henüz işletme siparişi görünmüyor. İşletme ürünleri aldığında burada durum rozetleriyle listelenecek.</div>';
      return;
    }
    const dkd_summary_value = dkd_build_order_summary_value(dkd_order_values);
    dkd_orders_node_value.innerHTML = `
      <section class="dkd_market_orders_summary_card">
        <div class="dkd_market_orders_summary_grid">
          <div class="dkd_market_orders_summary_item"><span>Toplam Sipariş</span><strong>${dkd_format_number_value(dkd_summary_value.dkd_total_count_value)}</strong></div>
          <div class="dkd_market_orders_summary_item"><span>Aktif</span><strong>${dkd_format_number_value(dkd_summary_value.dkd_active_count_value)}</strong></div>
          <div class="dkd_market_orders_summary_item"><span>Teslim</span><strong>${dkd_format_number_value(dkd_summary_value.dkd_delivered_count_value)}</strong></div>
          <div class="dkd_market_orders_summary_item"><span>TL Toplam</span><strong>${dkd_format_money_value(dkd_summary_value.dkd_total_spent_value)}</strong></div>
        </div>
      </section>
      <div class="dkd_market_orders_list">
        ${dkd_order_values.map((dkd_order_value) => {
          const dkd_image_style_value = dkd_order_value.dkd_image_url_value ? `url('${dkd_order_value.dkd_image_url_value}')` : dkd_build_inline_art_value('business', '#6cc9ff');
          const dkd_badge_meta_value = dkd_build_order_badge_meta_value(dkd_order_value);
          return `
            <article class="dkd_market_order_card">
              ${dkd_build_art_surface_html_value({ dkd_art_url_value: dkd_image_style_value, dkd_source_kind_value: 'business', dkd_name_value: dkd_order_value.dkd_product_name_value }, 'dkd_market_order_art')}
              <div class="dkd_market_order_main">
                <div class="dkd_market_order_head">
                  <div>
                    <div class="dkd_market_order_name">${dkd_escape_html_value(dkd_order_value.dkd_product_name_value)}</div>
                    <div class="dkd_market_order_meta">${dkd_escape_html_value(dkd_order_value.dkd_business_name_value)} • ${dkd_format_datetime_value(dkd_order_value.dkd_created_at_value)}</div>
                  </div>
                  <span class="dkd_market_order_badge ${dkd_badge_meta_value.dkd_class_name_value}">${dkd_escape_html_value(dkd_badge_meta_value.dkd_label_value)}</span>
                </div>
                <div class="dkd_market_order_stat_row">
                  <span>Adet ${dkd_format_number_value(dkd_order_value.dkd_quantity_value)}</span>
                  <span>Toplam ${dkd_format_order_total_value(dkd_order_value)}</span><span>${dkd_escape_html_value(dkd_get_payment_label_value(dkd_order_value.dkd_payment_method_value))}</span>
                </div>
                ${dkd_order_value.dkd_delivery_address_text_value ? `<div class="dkd_market_order_note">Teslimat: ${dkd_escape_html_value(dkd_order_value.dkd_delivery_address_text_value)}</div>` : ''}
                ${dkd_render_order_timeline_html_value(dkd_order_value)}
              </div>
            </article>
          `;
        }).join('')}
      </div>
    `;
  }


  function dkd_render_wallet_strip_value() {
    const dkd_wallet_node_value = dkd_get_element_value('dkd_market_wallet_strip');
    if (!dkd_wallet_node_value) return;

    const dkd_wallet_value = dkd_market_state.dkd_wallet_snapshot_value;
    if (!dkd_market_state.dkd_session_value?.user?.email) {
      dkd_wallet_node_value.hidden = false;
      dkd_wallet_node_value.innerHTML = `
        <div class="dkd_market_wallet_card dkd_market_wallet_card_topbar">
          <div class="dkd_market_wallet_topbar_identity">
            <div>
              <div class="dkd_market_wallet_title">Uygulama Cüzdanı</div>
              <div class="dkd_market_wallet_subtitle">Giriş yapınca uygulamadaki bakiye burada görünür.</div>
            </div>
          </div>
          <button class="dkd_market_wallet_link_button" data-dkd-bottom-action="account">Bağlan</button>
        </div>
      `;
      return;
    }

    const dkd_safe_wallet_value = dkd_wallet_value || dkd_build_wallet_fallback_value();
    const dkd_sync_label_value = dkd_market_state.dkd_last_wallet_sync_at_value
      ? `Senkron ${new Date(dkd_market_state.dkd_last_wallet_sync_at_value).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`
      : 'Senkron';
    dkd_wallet_node_value.hidden = false;
    dkd_wallet_node_value.innerHTML = `
      <div class="dkd_market_wallet_card dkd_market_wallet_card_topbar">
        <div class="dkd_market_wallet_topbar_identity">
          ${dkd_build_avatar_markup_value(dkd_safe_wallet_value, 'dkd_market_wallet_avatar_compact')}
          <div>
            <div class="dkd_market_wallet_title">${dkd_escape_html_value(dkd_safe_wallet_value.dkd_nickname_value)}</div>
            <div class="dkd_market_wallet_subtitle">${dkd_escape_html_value(dkd_sync_label_value)}</div>
          </div>
        </div>
        <div class="dkd_market_wallet_topbar_stats">
          <div class="dkd_market_wallet_topbar_chip dkd_market_wallet_topbar_chip_primary"><small>Cüzdan</small><strong>${dkd_format_wallet_tl_value(dkd_safe_wallet_value.dkd_wallet_tl_value)}</strong></div>
          <div class="dkd_market_wallet_topbar_chip"><small>Token</small><strong>${dkd_format_number_value(dkd_safe_wallet_value.dkd_token_value)}</strong></div>
          <div class="dkd_market_wallet_topbar_chip"><small>Shard</small><strong>${dkd_format_number_value(dkd_safe_wallet_value.dkd_shards_value)}</strong></div>
          <div class="dkd_market_wallet_topbar_chip"><small>Enerji</small><strong>${dkd_format_number_value(dkd_safe_wallet_value.dkd_energy_value)}/${dkd_format_number_value(dkd_safe_wallet_value.dkd_energy_max_value)}</strong></div>
          <div class="dkd_market_wallet_topbar_chip"><small>Boss</small><strong>${dkd_format_number_value(dkd_safe_wallet_value.dkd_boss_tickets_value)}</strong></div>
        </div>
        <button class="dkd_market_wallet_refresh_button dkd_market_wallet_refresh_button_compact" id="dkd_market_wallet_refresh_button">Yenile</button>
      </div>
    `;
  }

  function dkd_render_categories_page_value() {
    const dkd_switch_node_value = dkd_get_element_value('dkd_market_categories_switch');
    const dkd_business_filter_node_value = dkd_get_element_value('dkd_market_business_filter_row');
    const dkd_result_node_value = dkd_get_element_value('dkd_market_categories_result');
    if (!dkd_switch_node_value || !dkd_result_node_value || !dkd_business_filter_node_value) return;
    if (dkd_market_state.dkd_categories_panel_value !== 'business') {
      dkd_market_state.dkd_categories_panel_value = 'business';
    }

    const dkd_panel_definition_values = [
      { dkd_key_value: 'business', dkd_label_value: 'Yemek Menüsü', dkd_empty_value: 'Aktif yemek ürünü bulunamadı.' },
    ];

    const dkd_quick_action_values = [
      { dkd_key_value: 'urgent_courier', dkd_label_value: 'Acil Kurye', dkd_icon_value: '⚡' },
      { dkd_key_value: 'courier_cargo', dkd_label_value: 'Kargo Paneli', dkd_icon_value: '🛵' },
    ];

    dkd_switch_node_value.innerHTML = dkd_quick_action_values.map((dkd_action_value) => [
      '<button class="dkd_market_categories_switch_button dkd_market_categories_switch_button_action" data-dkd-category="',
      dkd_escape_html_value(dkd_action_value.dkd_key_value),
      '"><span>',
      dkd_escape_html_value(dkd_action_value.dkd_icon_value),
      '</span>',
      dkd_escape_html_value(dkd_action_value.dkd_label_value),
      '</button>',
    ].join('')).join('') + dkd_panel_definition_values.map((dkd_panel_value) => [
      '<button class="dkd_market_categories_switch_button',
      dkd_market_state.dkd_categories_panel_value === dkd_panel_value.dkd_key_value ? ' dkd_market_categories_switch_button_active' : '',
      '" data-dkd-categories-panel="',
      dkd_escape_html_value(dkd_panel_value.dkd_key_value),
      '">',
      dkd_escape_html_value(dkd_panel_value.dkd_label_value),
      '</button>',
    ].join('')).join('');

    const dkd_snapshot_value = dkd_get_normalized_snapshot_value();
    const dkd_collection_map_value = {
      listings: dkd_snapshot_value.dkd_listing_values,
      business: dkd_snapshot_value.dkd_business_values,
      packages: dkd_snapshot_value.dkd_package_values,
    };
    let dkd_active_values = dkd_filter_by_search_and_category_value(dkd_collection_map_value[dkd_market_state.dkd_categories_panel_value] || [], false);
    const dkd_empty_text_value = dkd_panel_definition_values.find((dkd_panel_value) => dkd_panel_value.dkd_key_value === dkd_market_state.dkd_categories_panel_value)?.dkd_empty_value || 'Ürün bulunamadı.';

    if (dkd_market_state.dkd_categories_panel_value === 'business') {
      const dkd_business_name_values = Array.from(new Set((dkd_snapshot_value.dkd_business_values || []).map((dkd_item_value) => String(dkd_item_value.dkd_business_name_value || '').trim()).filter(Boolean)));
      if (!dkd_business_name_values.includes(dkd_market_state.dkd_selected_business_name_value)) {
        dkd_market_state.dkd_selected_business_name_value = dkd_business_name_values[0] || 'all';
      }
      dkd_business_filter_node_value.hidden = false;
      dkd_business_filter_node_value.innerHTML = dkd_business_name_values.map((dkd_business_name_value) => `
        <button class="dkd_market_business_filter_button${dkd_market_state.dkd_selected_business_name_value === dkd_business_name_value ? ' dkd_market_business_filter_button_active' : ''}" data-dkd-business-name="${dkd_escape_html_value(dkd_business_name_value)}">${dkd_escape_html_value(dkd_business_name_value)}</button>
      `).join('');
      dkd_active_values = dkd_active_values.filter((dkd_item_value) => String(dkd_item_value.dkd_business_name_value || '').trim() === dkd_market_state.dkd_selected_business_name_value);
    } else {
      dkd_business_filter_node_value.hidden = true;
      dkd_business_filter_node_value.innerHTML = '';
    }

    if (!dkd_active_values.length) {
      dkd_result_node_value.innerHTML = `<div class="dkd_market_empty_state">${dkd_escape_html_value(dkd_empty_text_value)}</div>`;
      return;
    }

    dkd_result_node_value.innerHTML = `<div class="dkd_market_categories_grid">${dkd_active_values.map((dkd_item_value) => dkd_build_categories_card_html_value(dkd_item_value)).join('')}</div>`;
  }

  function dkd_build_categories_card_html_value(dkd_item_value) {
    const dkd_source_text_value = dkd_item_value.dkd_source_kind_value === 'listing'
      ? (dkd_item_value.dkd_seller_name_value || 'Pazar İlanı')
      : (dkd_item_value.dkd_source_kind_value === 'business'
        ? 'Sıcak teslimat açık'
        : (dkd_item_value.dkd_detail_subtitle_value || 'Takviye Paketi'));
    const dkd_cash_price_html_value = dkd_build_emphasis_cash_price_html_value(dkd_item_value.dkd_cash_price_value, 'dkd_market_categories_cash_price');
    return `
      <article class="dkd_market_categories_card dkd_market_card_tap_target" data-dkd-open-detail="${dkd_escape_html_value(dkd_item_value.dkd_id_value)}">
        ${dkd_build_art_surface_html_value(dkd_item_value, 'dkd_market_categories_card_art')}
        <div class="dkd_market_categories_card_body">
          <div class="dkd_market_badge_row">
            <span class="dkd_market_rarity_badge" style="background:${dkd_item_value.dkd_rarity_background_value};color:${dkd_item_value.dkd_rarity_tone_value}">${dkd_escape_html_value(dkd_item_value.dkd_rarity_label_value)}</span>
            <span class="dkd_market_categories_meta_chip">${dkd_escape_html_value(dkd_item_value.dkd_stock_label_value || 'Hazır')}</span>
          </div>
          <div class="dkd_market_categories_card_name">${dkd_escape_html_value(dkd_item_value.dkd_name_value)}</div>
          <div class="dkd_market_categories_card_meta">${dkd_escape_html_value(dkd_source_text_value)}</div>
          <div class="dkd_market_categories_price_stack">
            ${dkd_build_tl_price_badge_html_value(dkd_item_value, 'dkd_market_categories_tl_price')}
          </div>
          <div class="dkd_market_categories_card_footer">
            <div class="dkd_market_categories_footer_note">${dkd_item_value.dkd_source_kind_value === 'business' ? 'Sıcak teslimat açık' : (dkd_item_value.dkd_source_kind_value === 'listing' ? 'Pazar teslimi' : 'Anında takviye teslimi')}</div>
            <button class="dkd_market_categories_card_button" data-dkd-open-detail="${dkd_escape_html_value(dkd_item_value.dkd_id_value)}">İncele</button>
          </div>
        </div>
      </article>
    `;
  }


  function dkd_set_view_value(dkd_view_key_value) {
    dkd_market_state.dkd_current_view_value = ['categories', 'support'].includes(dkd_view_key_value) ? dkd_view_key_value : 'home';
    const dkd_home_node_value = dkd_get_element_value('dkd_market_home_view');
    const dkd_categories_node_value = dkd_get_element_value('dkd_market_categories_view');
    const dkd_support_node_value = dkd_get_element_value('dkd_market_support_view');
    if (dkd_home_node_value) dkd_home_node_value.hidden = dkd_market_state.dkd_current_view_value !== 'home';
    if (dkd_categories_node_value) dkd_categories_node_value.hidden = dkd_market_state.dkd_current_view_value !== 'categories';
    if (dkd_support_node_value) dkd_support_node_value.hidden = dkd_market_state.dkd_current_view_value !== 'support';
    dkd_set_bottom_active_value(dkd_market_state.dkd_current_view_value === 'categories' ? 'categories' : (dkd_market_state.dkd_current_view_value === 'support' ? 'account' : 'home'));
  }

  function dkd_render_result_drawer_value() {
    const dkd_result_node_value = dkd_get_element_value('dkd_market_result_body');
    const dkd_secondary_button_node_value = dkd_get_element_value('dkd_market_result_secondary_button');
    if (!dkd_result_node_value || !dkd_secondary_button_node_value) return;

    const dkd_result_value = dkd_market_state.dkd_purchase_result_value;
    if (!dkd_result_value) {
      dkd_result_node_value.innerHTML = '<div class="dkd_market_empty_card">Satın alma işlemi tamamlandığında özet burada görünür.</div>';
      dkd_secondary_button_node_value.textContent = 'Sepeti Gör';
      return;
    }

    dkd_secondary_button_node_value.textContent = dkd_result_value.dkd_failed_items_value?.length ? 'Sepeti Gör' : 'Ana Sayfaya Dön';
    dkd_result_node_value.innerHTML = `
      <div class="dkd_market_result_summary_card">
        <div class="dkd_market_result_summary_head">
          <div class="dkd_market_result_summary_icon">${dkd_result_value.dkd_failed_items_value?.length ? '△' : '✓'}</div>
          <div>
            <strong>${dkd_escape_html_value(dkd_result_value.dkd_title_value || 'Satın alma tamamlandı')}</strong>
            <div class="dkd_market_result_summary_text">${dkd_escape_html_value(dkd_result_value.dkd_text_value || '')}</div>
          </div>
        </div>
        <div class="dkd_market_result_stat_row">
          <div class="dkd_market_result_stat_chip"><span>Alınan</span><strong>${dkd_format_number_value(dkd_result_value.dkd_success_count_value || 0)}</strong></div>
          <div class="dkd_market_result_stat_chip"><span>Kalan</span><strong>${dkd_format_number_value(dkd_result_value.dkd_failed_items_value?.length || 0)}</strong></div>
          <div class="dkd_market_result_stat_chip dkd_market_result_stat_chip_tl"><span>TL Toplam</span><strong>${dkd_format_money_value(dkd_result_value.dkd_total_price_tl_value || 0)}</strong></div><div class="dkd_market_result_stat_chip"><span>Ödeme</span><strong>${dkd_escape_html_value(dkd_get_payment_label_value(dkd_result_value.dkd_payment_method_value))}</strong></div>
        </div>
      </div>
      ${(dkd_result_value.dkd_wallet_after_value ? `
      <div class="dkd_market_result_wallet_card">
        <div class="dkd_market_result_wallet_title">Güncel Cüzdan</div>
        <div class="dkd_market_result_wallet_row">
          <span>Cüzdan ${dkd_format_wallet_tl_value(dkd_result_value.dkd_wallet_after_value.dkd_wallet_tl_value)}</span>
          <span>🪙 ${dkd_format_number_value(dkd_result_value.dkd_wallet_after_value.dkd_token_value)}</span>
          <span>💠 ${dkd_format_number_value(dkd_result_value.dkd_wallet_after_value.dkd_shards_value)}</span>
          <span>⚡ ${dkd_format_number_value(dkd_result_value.dkd_wallet_after_value.dkd_energy_value)}/${dkd_format_number_value(dkd_result_value.dkd_wallet_after_value.dkd_energy_max_value)}</span>
          <span>🎟️ ${dkd_format_number_value(dkd_result_value.dkd_wallet_after_value.dkd_boss_tickets_value)}</span>
        </div>
      </div>
      ` : '')}
      ${(dkd_result_value.dkd_delivery_address_text_value ? `
      <div class="dkd_market_result_delivery_card">
        <div class="dkd_market_result_delivery_title">Teslimat Bilgisi</div>
        <div class="dkd_market_result_delivery_line"><strong>Adres:</strong> ${dkd_escape_html_value(dkd_result_value.dkd_delivery_address_text_value)}</div>
        ${dkd_result_value.dkd_delivery_note_text_value ? `<div class="dkd_market_result_delivery_line"><strong>Not:</strong> ${dkd_escape_html_value(dkd_result_value.dkd_delivery_note_text_value)}</div>` : ''}
      </div>
      ` : '')}
      <div class="dkd_market_result_list_wrap">
        <div class="dkd_market_result_list_head">Başarılı Ürünler</div>
        ${dkd_result_value.dkd_success_items_value?.length ? dkd_result_value.dkd_success_items_value.map((dkd_item_name_value) => `<div class="dkd_market_result_list_item">✓ ${dkd_escape_html_value(dkd_item_name_value)}</div>`).join('') : '<div class="dkd_market_empty_card">Başarılı ürün yok.</div>'}
      </div>
      ${(dkd_result_value.dkd_failed_items_value?.length ? `
      <div class="dkd_market_result_list_wrap">
        <div class="dkd_market_result_list_head">Tamamlanmayan Ürünler</div>
        ${dkd_result_value.dkd_failed_items_value.map((dkd_fail_item_value) => `<div class="dkd_market_result_list_item dkd_market_result_list_item_warn">${dkd_escape_html_value(dkd_fail_item_value)}</div>`).join('')}
      </div>
      ` : '')}
    `;
  }


  function dkd_show_toast_value(dkd_message_value, dkd_is_error_value = false) {
    const dkd_toast_node_value = dkd_get_element_value('dkd_market_toast');
    if (!dkd_toast_node_value) return;
    dkd_toast_node_value.hidden = false;
    dkd_toast_node_value.textContent = dkd_humanize_error_message_value(dkd_message_value);
    dkd_toast_node_value.style.borderColor = dkd_is_error_value
      ? 'rgba(255, 140, 140, 0.3)'
      : 'rgba(117, 242, 191, 0.28)';
    window.clearTimeout(dkd_market_state.dkd_toast_timer_value);
    dkd_market_state.dkd_toast_timer_value = window.setTimeout(() => {
      dkd_toast_node_value.hidden = true;
    }, 2800);
  }

  function dkd_pick_rarity_meta_value(dkd_rarity_value) {
    const dkd_key_value = String(dkd_rarity_value || 'rare').toLowerCase();
    if (dkd_key_value === 'mythic') {
      return { dkd_label_value: 'Mitik', dkd_tone_value: '#ff6faa', dkd_background_value: 'rgba(255,111,170,0.18)' };
    }
    if (dkd_key_value === 'legendary') {
      return { dkd_label_value: 'Efsanevi', dkd_tone_value: '#ffba62', dkd_background_value: 'rgba(255,186,98,0.18)' };
    }
    if (dkd_key_value === 'epic') {
      return { dkd_label_value: 'Epik', dkd_tone_value: '#a76cff', dkd_background_value: 'rgba(167,108,255,0.18)' };
    }
    if (dkd_key_value === 'common') {
      return { dkd_label_value: 'Normal', dkd_tone_value: '#c7d8e9', dkd_background_value: 'rgba(199,216,233,0.16)' };
    }
    return { dkd_label_value: 'Nadir', dkd_tone_value: '#61d4ff', dkd_background_value: 'rgba(97,212,255,0.18)' };
  }

  function dkd_build_item_art_markup_value(dkd_kind_value, dkd_title_value, dkd_tone_value, dkd_variant_value = '') {
    const dkd_title_key_value = String(dkd_title_value || '').toLowerCase();
    const dkd_variant_key_value = String(dkd_variant_value || '').toLowerCase();
    let dkd_svg_markup_value = '';

    if (dkd_kind_value === 'shard' || dkd_title_key_value.includes('shard')) {
      dkd_svg_markup_value = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
          <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#8af3d3"/><stop offset="100%" stop-color="#22ba70"/></linearGradient></defs>
          <rect width="240" height="240" rx="34" fill="#08152e"/>
          <rect x="18" y="18" width="204" height="204" rx="30" fill="#0b1a3d" stroke="rgba(132,180,255,.14)" stroke-width="2"/>
          <circle cx="166" cy="68" r="28" fill="rgba(114,255,205,.16)"/>
          <path d="M120 34 172 92 120 206 68 92Z" fill="url(#g)" stroke="rgba(237,255,248,.44)" stroke-width="8"/>
          <path d="M120 34v172M68 92h104" stroke="rgba(240,255,248,.32)" stroke-width="6"/>
          <path d="M120 34 153 92 120 206 87 92Z" fill="rgba(255,255,255,.08)"/>
        </svg>`;
    } else if (dkd_kind_value === 'energy' || dkd_title_key_value.includes('enerji')) {
      dkd_svg_markup_value = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#8dffd7"/><stop offset="100%" stop-color="#24b86f"/></linearGradient>
            <linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#173058"/><stop offset="100%" stop-color="#091a3c"/></linearGradient>
          </defs>
          <rect width="240" height="240" rx="34" fill="#07142d"/>
          <rect x="18" y="18" width="204" height="204" rx="30" fill="#091a3b" stroke="rgba(132,180,255,.14)" stroke-width="2"/>
          <circle cx="173" cy="66" r="32" fill="rgba(87,255,180,.18)"/>
          <g transform="translate(40 36)">
            <rect x="22" y="20" width="116" height="148" rx="30" fill="url(#b)" stroke="rgba(168,230,255,.18)" stroke-width="4"/>
            <rect x="46" y="0" width="68" height="20" rx="10" fill="#d7efe0" fill-opacity=".96"/>
            <rect x="34" y="32" width="92" height="124" rx="24" fill="url(#g)"/>
            <rect x="34" y="32" width="92" height="124" rx="24" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="6"/>
            <path d="M83 58 62 104h20l-10 42 34-52H86l8-36Z" fill="#f9fff9"/>
          </g>
        </svg>`;
    } else if (dkd_kind_value === 'ticket' || dkd_title_key_value.includes('bilet')) {
      dkd_svg_markup_value = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffe28b"/><stop offset="100%" stop-color="#ff7b39"/></linearGradient>
            <linearGradient id="ticket" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#2dff88"/><stop offset="100%" stop-color="#1aa661"/></linearGradient>
          </defs>
          <rect width="240" height="240" rx="34" fill="#07142d"/>
          <rect x="18" y="18" width="204" height="204" rx="30" fill="#091a3b" stroke="rgba(132,180,255,.14)" stroke-width="2"/>
          <circle cx="176" cy="66" r="34" fill="rgba(255,174,92,.18)"/>
          <g transform="translate(28 66) rotate(-8 92 52)">
            <path d="M24 8h136c4 13 15 23 28 26v36c-13 3-24 13-28 26H24C20 83 9 73 0 70V34C9 31 20 21 24 8Z" fill="#153154" stroke="rgba(255,255,255,.12)" stroke-width="4"/>
            <path d="M37 22h110c2 8 9 14 17 16v28c-8 2-15 8-17 16H37c-2-8-9-14-17-16V38c8-2 15-8 17-16Z" fill="url(#ticket)"/>
            <path d="M91 26v60" stroke="rgba(255,255,255,.48)" stroke-width="7" stroke-linecap="round" stroke-dasharray="8 10"/>
            <circle cx="91" cy="56" r="17" fill="rgba(10,34,54,.22)" stroke="rgba(255,255,255,.22)" stroke-width="4"/>
            <path d="m77 57 14-14 14 14" stroke="#fffef6" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          </g>
        </svg>`;
    } else if (dkd_kind_value === 'boost' || dkd_title_key_value.includes('takviye')) {
      dkd_svg_markup_value = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
          <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffdf6c"/><stop offset="100%" stop-color="#b07307"/></linearGradient></defs>
          <rect width="240" height="240" rx="34" fill="#081631"/>
          <circle cx="120" cy="120" r="68" fill="url(#g)" stroke="#fff0b1" stroke-opacity=".35" stroke-width="10"/>
          <path d="m87 131 33-35 33 35" stroke="#fff8da" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <path d="m87 154 33-35 33 35" stroke="#fff8da" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </svg>`;
    } else if (dkd_kind_value === 'package') {
      const dkd_is_energy_value = dkd_title_key_value.includes('enerji');
      const dkd_is_shard_value = dkd_title_key_value.includes('shard');
      const dkd_is_ticket_value = dkd_title_key_value.includes('bilet');
      const dkd_start_value = dkd_is_energy_value ? '#55ffbd' : (dkd_is_shard_value ? '#7fe1ff' : (dkd_is_ticket_value ? '#ffbe72' : '#8d8cff'));
      const dkd_end_value = dkd_is_energy_value ? '#125f58' : (dkd_is_shard_value ? '#2a52ff' : (dkd_is_ticket_value ? '#b65513' : '#3039a9'));
      const dkd_glow_value = dkd_is_energy_value ? 'rgba(85,255,189,.22)' : (dkd_is_shard_value ? 'rgba(127,225,255,.22)' : (dkd_is_ticket_value ? 'rgba(255,190,114,.22)' : 'rgba(141,140,255,.22)'));
      const dkd_symbol_markup_value = dkd_is_energy_value
        ? '<path d="M128 64 95 118h24l-10 53 44-64h-27l8-43Z" fill="#f6fff6"/><rect x="86" y="42" width="70" height="156" rx="24" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="6"/>'
        : (dkd_is_shard_value
          ? '<path d="M121 49 171 95 121 191 71 95Z" fill="#eff9ff"/><path d="M121 49v142M71 95h100" stroke="rgba(22,63,171,.35)" stroke-width="7"/><circle cx="121" cy="120" r="50" fill="rgba(255,255,255,.08)"/>'
          : (dkd_is_ticket_value
            ? '<path d="M74 90h94c3 10 11 18 21 20v20c-10 2-18 10-21 20H74c-3-10-11-18-21-20v-20c10-2 18-10 21-20Z" fill="#fff5de"/><path d="M121 92v56" stroke="#cf6b22" stroke-width="8" stroke-linecap="round" stroke-dasharray="7 8"/><path d="m103 119 16-16 16 16" stroke="#924217" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'
            : '<circle cx="121" cy="121" r="49" fill="#f3f5ff" fill-opacity=".96"/><path d="m95 124 26-30 27 30" stroke="#5562ff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="m95 147 26-30 27 30" stroke="#5562ff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'));
      dkd_svg_markup_value = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${dkd_start_value}"/><stop offset="100%" stop-color="${dkd_end_value}"/></linearGradient>
            <linearGradient id="frame" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(255,255,255,.24)"/><stop offset="100%" stop-color="rgba(255,255,255,.04)"/></linearGradient>
          </defs>
          <rect width="240" height="240" rx="34" fill="#06132d"/>
          <rect x="18" y="18" width="204" height="204" rx="30" fill="#091a3b" stroke="rgba(131,175,255,.14)" stroke-width="2"/>
          <circle cx="176" cy="66" r="34" fill="${dkd_glow_value}"/>
          <circle cx="70" cy="174" r="42" fill="${dkd_glow_value}"/>
          <g transform="translate(39 39)">
            <rect x="11" y="11" width="140" height="140" rx="34" fill="url(#g)"/>
            <rect x="11" y="11" width="140" height="140" rx="34" fill="none" stroke="url(#frame)" stroke-width="8"/>
            <rect x="25" y="25" width="112" height="112" rx="28" fill="rgba(8,18,42,.26)" stroke="rgba(255,255,255,.14)" stroke-width="2"/>
            ${dkd_symbol_markup_value}
          </g>
        </svg>`;
    } else if (dkd_kind_value === 'business') {
      dkd_svg_markup_value = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
          <rect width="240" height="240" rx="34" fill="#0b1734"/>
          <path d="M46 86 63 46h114l17 40" fill="#204b9e"/>
          <path d="M46 86h148v102H46z" fill="#16336d" stroke="#8cc7ff" stroke-opacity=".24" stroke-width="8"/>
          <path d="M89 123h62" stroke="#d4ecff" stroke-width="10" stroke-linecap="round"/>
          <path d="M89 153h62" stroke="#d4ecff" stroke-width="10" stroke-linecap="round"/>
        </svg>`;
    } else {
      const dkd_frame_tone_value = dkd_tone_value || '#a76cff';
      dkd_svg_markup_value = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 300">
          <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${dkd_frame_tone_value}"/><stop offset="100%" stop-color="#1d2f76"/></linearGradient></defs>
          <rect width="240" height="300" rx="26" fill="#0a1430"/>
          <rect x="20" y="20" width="200" height="260" rx="22" fill="url(#g)" stroke="#fff" stroke-opacity=".16" stroke-width="6"/>
          <ellipse cx="120" cy="128" rx="54" ry="66" fill="rgba(9,17,40,.38)"/>
          <circle cx="120" cy="104" r="26" fill="#f4e6df" fill-opacity=".84"/>
          <path d="M75 192c15-35 76-35 90 0" fill="#1d123d"/>
          <path d="M102 76c8-18 28-21 38-8" stroke="#1f133e" stroke-width="9" stroke-linecap="round"/>
        </svg>`;
    }

    return dkd_svg_markup_value;
  }

  function dkd_build_item_art_value(dkd_kind_value, dkd_title_value, dkd_tone_value, dkd_variant_value = '') {
    const dkd_svg_markup_value = dkd_build_item_art_markup_value(dkd_kind_value, dkd_title_value, dkd_tone_value, dkd_variant_value);
    return `url("data:image/svg+xml;charset=UTF-8,${encodeURIComponent(dkd_svg_markup_value)}")`;
  }

  function dkd_build_inline_art_value(dkd_kind_value, dkd_tone_value, dkd_variant_value = '') {
    return dkd_build_item_art_value(dkd_kind_value, dkd_variant_value, dkd_tone_value, dkd_variant_value);
  }

  function dkd_guess_art_kind_value(dkd_item_value) {
    if (dkd_item_value?.dkd_source_kind_value === 'business') return 'business';
    if (dkd_item_value?.dkd_source_kind_value === 'listing') return 'card';
    if (dkd_item_value?.dkd_category_value === 'energy') return 'energy';
    if (dkd_item_value?.dkd_category_value === 'ticket') return 'ticket';
    if (String(dkd_item_value?.dkd_name_value || '').toLowerCase().includes('shard')) return 'shard';
    if (dkd_item_value?.dkd_category_value === 'boost') return 'boost';
    if (dkd_item_value?.dkd_source_kind_value === 'token_pack') return 'package';
    return 'card';
  }

  function dkd_build_art_surface_html_value(dkd_item_value, dkd_class_name_value) {
    const dkd_art_url_value = String(dkd_item_value?.dkd_art_url_value || '').trim();
    const dkd_has_inline_svg_value = dkd_art_url_value.includes('data:image/svg+xml');
    if (dkd_has_inline_svg_value) {
      const dkd_svg_markup_value = dkd_build_item_art_markup_value(
        dkd_guess_art_kind_value(dkd_item_value),
        dkd_item_value?.dkd_name_value || dkd_item_value?.dkd_subtitle_value || '',
        dkd_item_value?.dkd_rarity_tone_value || '#6faeff',
        dkd_item_value?.dkd_name_value || dkd_item_value?.dkd_subtitle_value || '',
      );
      return `<div class="${dkd_class_name_value} dkd_market_art_surface_inline">${dkd_svg_markup_value}</div>`;
    }
    const dkd_art_style_value = dkd_art_url_value.startsWith('url(') ? dkd_art_url_value : `url('${dkd_art_url_value}')`;
    return `<div class="${dkd_class_name_value}" style="background-image:${dkd_art_style_value}"></div>`;
  }

  function dkd_resolve_market_art_url_value(dkd_raw_url_value, dkd_fallback_url_value) {
    const dkd_clean_value = String(dkd_raw_url_value || '').trim();
    if (!dkd_clean_value || dkd_clean_value === 'null' || dkd_clean_value === 'undefined') return dkd_fallback_url_value;
    if (dkd_clean_value.startsWith('http://') || dkd_clean_value.startsWith('https://') || dkd_clean_value.startsWith('data:') || dkd_clean_value.startsWith('blob:') || dkd_clean_value.startsWith('/') || dkd_clean_value.startsWith('url(')) {
      return dkd_clean_value;
    }
    return dkd_fallback_url_value;
  }

  function dkd_resolve_pack_art_key_value(dkd_pack_value) {
    const dkd_reward_key_value = String(dkd_pack_value?.reward_kind || '').toLowerCase();
    const dkd_title_value = String(dkd_pack_value?.title || '').toLowerCase();
    if (dkd_reward_key_value.includes('energy') || dkd_title_value.includes('enerji')) return 'energy';
    if (dkd_reward_key_value.includes('ticket') || dkd_title_value.includes('bilet') || dkd_title_value.includes('boss')) return 'ticket';
    if (dkd_reward_key_value.includes('shard') || dkd_title_value.includes('shard')) return 'boost';
    return 'package';
  }

  function dkd_get_pack_art_url_value(dkd_pack_value) {
    const dkd_pack_art_key_value = dkd_resolve_pack_art_key_value(dkd_pack_value);
    return dkd_market_pack_art_map_value[dkd_pack_art_key_value] || dkd_market_pack_art_map_value.package;
  }

  function dkd_resolve_pack_art_key_value(dkd_pack_value) {
    const dkd_reward_key_value = String(dkd_pack_value?.reward_kind || '').toLowerCase();
    const dkd_title_value = String(dkd_pack_value?.title || '').toLowerCase();
    if (dkd_reward_key_value.includes('energy') || dkd_title_value.includes('enerji')) return 'energy';
    if (dkd_reward_key_value.includes('ticket') || dkd_title_value.includes('bilet') || dkd_title_value.includes('boss')) return 'ticket';
    if (dkd_reward_key_value.includes('shard') || dkd_title_value.includes('shard')) return 'boost';
    return 'package';
  }

  function dkd_get_pack_art_url_value(dkd_pack_value) {
    const dkd_pack_art_key_value = dkd_resolve_pack_art_key_value(dkd_pack_value);
    return dkd_market_pack_art_map_value[dkd_pack_art_key_value] || dkd_market_pack_art_map_value.package;
  }

  function dkd_resolve_local_market_asset_url_value(dkd_asset_file_name_value) {
    return `./assets/${dkd_asset_file_name_value}`;
  }

  function dkd_resolve_token_pack_art_url_value(dkd_pack_value, dkd_category_value, dkd_rarity_meta_value) {
    const dkd_title_value = String(dkd_pack_value?.title || '').toLowerCase();
    const dkd_reward_kind_value = String(dkd_pack_value?.reward_kind || '').toLowerCase();
    if (dkd_reward_kind_value.includes('energy') || dkd_title_value.includes('enerji')) {
      return dkd_resolve_local_market_asset_url_value('dkd_market_energy_pack_cropped.png');
    }
    if (dkd_reward_kind_value.includes('shard') || dkd_title_value.includes('shard')) {
      return dkd_resolve_local_market_asset_url_value('dkd_market_shard_pack_cropped.png');
    }
    if (dkd_reward_kind_value.includes('ticket') || dkd_reward_kind_value.includes('boss') || dkd_title_value.includes('boss') || dkd_title_value.includes('bilet')) {
      return dkd_resolve_local_market_asset_url_value('dkd_market_boss_ticket_cropped.png');
    }
    return dkd_build_inline_art_value(
      dkd_category_value === 'boost' ? 'boost' : (dkd_category_value === 'energy' ? 'energy' : (dkd_category_value === 'ticket' ? 'ticket' : 'package')),
      dkd_rarity_meta_value?.dkd_tone_value || '#6faeff',
      dkd_pack_value?.title || dkd_pack_value?.subtitle || '',
    );
  }
  function dkd_normalize_token_pack_values(dkd_token_pack_values) {
    return (Array.isArray(dkd_token_pack_values) ? dkd_token_pack_values : []).map((dkd_pack_value, dkd_pack_index_value) => {
      const dkd_category_value = dkd_pick_token_category_value(dkd_pack_value);
      const dkd_rarity_key_value = dkd_pick_token_rarity_value(dkd_pack_value);
      const dkd_rarity_meta_value = dkd_pick_rarity_meta_value(dkd_rarity_key_value);
      return {
        dkd_source_kind_value: 'token_pack',
        dkd_id_value: `token_${dkd_pack_value.id || dkd_pack_index_value}`,
        dkd_name_value: dkd_pack_value.title || 'Takviye Paketi',
        dkd_subtitle_value: dkd_pack_value.subtitle || dkd_pack_value.description || 'Web ve uygulama için anında takviye paketi.',
        dkd_description_value: dkd_pack_value.description || dkd_pack_value.subtitle || 'Anında tanımlanan takviye paketi.',
        dkd_category_value,
        dkd_rarity_value: dkd_rarity_key_value,
        dkd_rarity_label_value: dkd_rarity_meta_value.dkd_label_value,
        dkd_rarity_tone_value: dkd_rarity_meta_value.dkd_tone_value,
        dkd_rarity_background_value: dkd_rarity_meta_value.dkd_background_value,
        dkd_price_token_value: Number(dkd_pack_value.price_token || 0),
        dkd_cash_price_value: null,
        dkd_badge_value: dkd_pack_value.badge_label || 'Takviye Paketi',
        dkd_art_url_value: dkd_resolve_token_pack_art_url_value(dkd_pack_value, dkd_category_value, dkd_rarity_meta_value),
        dkd_reward_amount_value: dkd_pack_value.reward_amount || 0,
        dkd_pack_key_value: String(dkd_pack_value.pack_key || dkd_pack_value.id || '').trim(),
        dkd_sort_order_value: Number(dkd_pack_value.sort_order || dkd_pack_index_value || 0),
        dkd_stock_label_value: 'Anında teslim',
        dkd_remaining_count_value: null,
        dkd_detail_subtitle_value: dkd_category_value === 'energy'
          ? 'Enerji Takviyesi'
          : (dkd_category_value === 'ticket' ? 'Boss Bileti Paketi' : 'Shard Takviyesi'),
      };
    });
  }


  function dkd_normalize_listing_values(dkd_listing_values) {
    return (Array.isArray(dkd_listing_values) ? dkd_listing_values : []).map((dkd_listing_value, dkd_listing_index_value) => {
      const dkd_rarity_meta_value = dkd_pick_rarity_meta_value(dkd_listing_value.card_rarity || 'rare');
      return {
        dkd_source_kind_value: 'listing',
        dkd_id_value: `listing_${dkd_listing_value.id || dkd_listing_index_value}`,
        dkd_name_value: dkd_listing_value.card_name || 'Pazar Kartı',
        dkd_subtitle_value: dkd_listing_value.card_series || 'Saldırı kartı',
        dkd_description_value: dkd_listing_value.card_serial_code || '',
        dkd_category_value: 'card',
        dkd_rarity_value: String(dkd_listing_value.card_rarity || 'rare').toLowerCase(),
        dkd_rarity_label_value: dkd_rarity_meta_value.dkd_label_value,
        dkd_rarity_tone_value: dkd_rarity_meta_value.dkd_tone_value,
        dkd_rarity_background_value: dkd_rarity_meta_value.dkd_background_value,
        dkd_price_token_value: Number(dkd_listing_value.price_token || 0),
        dkd_cash_price_value: null,
        dkd_badge_value: dkd_rarity_meta_value.dkd_label_value,
        dkd_art_url_value: dkd_resolve_market_art_url_value(
          dkd_listing_value.card_art_image_url,
          dkd_build_inline_art_value('card', dkd_rarity_meta_value.dkd_tone_value, dkd_listing_value.card_name || dkd_listing_value.card_series || ''),
        ),
        dkd_seller_name_value: dkd_listing_value.seller_nickname || 'DarkHunter',
        dkd_listing_id_value: Number(dkd_listing_value.id || 0),
        dkd_stock_label_value: 'Tekil kart',
        dkd_remaining_count_value: 1,
      };
    });
  }

  function dkd_normalize_business_values(dkd_business_product_values) {
    return (Array.isArray(dkd_business_product_values) ? dkd_business_product_values : []).map((dkd_business_value, dkd_business_index_value) => {
      const dkd_rarity_meta_value = dkd_pick_rarity_meta_value('rare');
      const dkd_order_count_value = Number(
        dkd_business_value.order_count
        ?? dkd_business_value.total_order_count
        ?? dkd_business_value.order_total
        ?? 0,
      );
      return {
        dkd_source_kind_value: 'business',
        dkd_id_value: `business_${dkd_business_value.id || dkd_business_index_value}`,
        dkd_name_value: dkd_business_value.title || 'İşletme Ürünü',
        dkd_subtitle_value: dkd_business_value.description || 'Kurye teslimatlı işletme ürünü.',
        dkd_description_value: dkd_business_value.description || '',
        dkd_category_value: 'business',
        dkd_rarity_value: 'rare',
        dkd_rarity_label_value: dkd_business_value.category || 'İşletme',
        dkd_rarity_tone_value: dkd_rarity_meta_value.dkd_tone_value,
        dkd_rarity_background_value: dkd_rarity_meta_value.dkd_background_value,
        dkd_price_token_value: Number(dkd_business_value.price_token || 0),
        dkd_cash_price_value: Number(dkd_business_value.price_cash || 0),
        dkd_badge_value: dkd_order_count_value > 0 ? `${dkd_format_number_value(dkd_order_count_value)} sipariş` : 'Kurye teslimatı',
        dkd_art_url_value: dkd_resolve_market_art_url_value(
          dkd_business_value.image_url,
          dkd_build_inline_art_value('business', '#6cc9ff', dkd_business_value.title || dkd_business_value.business_name || ''),
        ),
        dkd_business_name_value: dkd_business_value.business_name || 'Lootonia İşletme',
        dkd_business_product_id_value: Number(dkd_business_value.legacy_id ?? dkd_business_value.legacy_product_id ?? (/^[0-9]+$/.test(String(dkd_business_value.id || '').trim()) ? dkd_business_value.id : 0)),
        dkd_business_product_key_value: String(dkd_business_value.product_key || dkd_business_value.token || dkd_business_value.product_token || dkd_business_value.legacy_id || dkd_business_value.id || '').trim(),
        dkd_business_product_token_value: String(dkd_business_value.product_key || dkd_business_value.token || dkd_business_value.product_token || dkd_business_value.legacy_id || dkd_business_value.id || '').trim(),
        dkd_stock_label_value: Number(dkd_business_value.stock || 0) > 0 ? 'Stokta' : 'Kontrollü stok',
        dkd_remaining_count_value: Number(dkd_business_value.stock || 0) > 0 ? Number(dkd_business_value.stock || 0) : null,
        dkd_order_count_value,
        dkd_detail_subtitle_value: 'Kurye teslimatlı ürün',
      };
    }).sort((dkd_left_value, dkd_right_value) => {
      const dkd_order_compare_value = Number(dkd_right_value.dkd_order_count_value || 0) - Number(dkd_left_value.dkd_order_count_value || 0);
      if (dkd_order_compare_value !== 0) return dkd_order_compare_value;
      const dkd_business_compare_value = String(dkd_left_value.dkd_business_name_value || '').localeCompare(String(dkd_right_value.dkd_business_name_value || ''), 'tr');
      if (dkd_business_compare_value !== 0) return dkd_business_compare_value;
      return String(dkd_left_value.dkd_name_value || '').localeCompare(String(dkd_right_value.dkd_name_value || ''), 'tr');
    });
  }


  function dkd_pick_token_category_value(dkd_pack_value) {
    const dkd_reward_key_value = String(dkd_pack_value?.reward_kind || '').toLowerCase();
    const dkd_title_value = String(dkd_pack_value?.title || '').toLowerCase();
    if (dkd_reward_key_value.includes('energy') || dkd_title_value.includes('enerji')) return 'energy';
    if (dkd_reward_key_value.includes('shard') || dkd_title_value.includes('shard')) return 'boost';
    if (dkd_reward_key_value.includes('ticket') || dkd_title_value.includes('bilet')) return 'ticket';
    if (dkd_reward_key_value.includes('boost') || dkd_title_value.includes('takviye')) return 'boost';
    if (dkd_reward_key_value.includes('card') || dkd_title_value.includes('kart')) return 'card';
    return 'boost';
  }

  function dkd_pick_token_rarity_value(dkd_pack_value) {
    const dkd_title_value = String(dkd_pack_value?.title || '').toLowerCase();
    const dkd_badge_value = String(dkd_pack_value?.badge_label || '').toLowerCase();
    if (dkd_title_value.includes('efsane') || dkd_badge_value.includes('efsane')) return 'legendary';
    if (dkd_title_value.includes('savaş') || dkd_badge_value.includes('özel')) return 'epic';
    if (dkd_title_value.includes('başlangıç')) return 'rare';
    return 'rare';
  }

  function dkd_pick_cash_price_value() {
    return null;
  }


  function dkd_build_demo_snapshot_value() {
    return {
      ui: {
        hero_kicker: 'Haftalık Kampanya',
        hero_title: 'Boss Savaşı Haftası!',
        hero_subtitle: 'Boss bileti paketlerinde %15 indirim!',
      },
      token_packs: [
        { id: 1, title: 'Yeni Başlayan Paketi', subtitle: 'Kart + Enerji + Bilet', description: 'İlk adım için ideal paket', badge_label: 'Paket', reward_kind: 'card_bundle', reward_amount: 1, price_token: 450 },
        { id: 2, title: 'Savaşçı Paketi', subtitle: 'Kart + Enerji + Takviye', description: 'Daha agresif ilerleme için', badge_label: 'Özel Paket', reward_kind: 'boost_bundle', reward_amount: 2, price_token: 860 },
        { id: 3, title: 'Efsanevi Paket', subtitle: 'En güçlü içerikler!', description: 'Üst seviye savaş hazırlığı', badge_label: 'Efsanevi', reward_kind: 'ticket_bundle', reward_amount: 10, price_token: 1600 },
        { id: 4, title: 'Enerji Deposu', subtitle: '250 Enerji', description: 'Akışı hızlandırır', badge_label: 'Nadir', reward_kind: 'energy', reward_amount: 250, price_token: 250 },
        { id: 5, title: 'Boss Bileti', subtitle: "10'lu Paket", description: 'Boss giriş paketi', badge_label: 'Efsanevi', reward_kind: 'boss_ticket', reward_amount: 10, price_token: 1250 },
        { id: 6, title: 'Saldırı Takviyesi', subtitle: '%20 Saldırı Artışı', description: 'Kısa süreli takviye', badge_label: 'Nadir', reward_kind: 'boost', reward_amount: 20, price_token: 200 },
      ],
      listings: [
        { id: 101, card_name: 'Gölge Şövalyesi', card_series: 'Saldırı kartı', price_token: 450, card_rarity: 'epic', seller_nickname: 'NightForge' },
        { id: 102, card_name: 'Alev Gururu', card_series: 'Saldırı kartı', price_token: 600, card_rarity: 'epic', seller_nickname: 'DarkHunter' },
        { id: 103, card_name: 'Enerji Deposu', card_series: '250 Enerji', price_token: 250, card_rarity: 'rare', seller_nickname: 'PowerNode' },
        { id: 104, card_name: 'Boss Bileti', card_series: "10'lu Paket", price_token: 1250, card_rarity: 'legendary', seller_nickname: 'BossCore' },
        { id: 105, card_name: 'Saldırı Takviyesi', card_series: '%20 Saldırı Artışı', price_token: 200, card_rarity: 'rare', seller_nickname: 'EchoWing' },
      ],
      business_products: [
        { id: 201, title: 'Lootonia Kupa', description: 'Özel baskı kupa', business_name: 'Kartal Atölye', category: 'Merch', price_token: 90, price_cash: 139.9 },
        { id: 202, title: 'Enerji Kutusu', description: 'Kurye destek paketi', business_name: 'Boss Market', category: 'Kampanya', price_token: 180, price_cash: 229.9 },
        { id: 203, title: 'Takviye Sandığı', description: 'Sürpriz takviye paketi', business_name: 'Eagle Store', category: 'Premium', price_token: 240, price_cash: 329.9 },
      ],
      generated_at: new Date().toISOString(),
    };
  }

  function dkd_get_normalized_snapshot_value() {
    const dkd_snapshot_value = dkd_market_state.dkd_public_snapshot_value || dkd_build_demo_snapshot_value();
    const dkd_business_values = dkd_normalize_business_values(dkd_snapshot_value.business_products || []);
    return {
      dkd_ui_value: dkd_snapshot_value.ui || {},
      dkd_featured_values: dkd_build_featured_collection_value({ ...dkd_snapshot_value, business_products: dkd_snapshot_value.business_products || [] }),
      dkd_package_values: [],
      dkd_listing_values: [],
      dkd_business_values,
    };
  }

  function dkd_build_featured_collection_value(dkd_snapshot_value) {
    const dkd_business_values = dkd_normalize_business_values(dkd_snapshot_value.business_products || []);
    return [...dkd_business_values]
      .sort((dkd_left_value, dkd_right_value) => {
        const dkd_order_compare_value = Number(dkd_right_value.dkd_order_count_value || 0) - Number(dkd_left_value.dkd_order_count_value || 0);
        if (dkd_order_compare_value !== 0) return dkd_order_compare_value;
        return String(dkd_left_value.dkd_name_value || '').localeCompare(String(dkd_right_value.dkd_name_value || ''), 'tr');
      })
      .slice(0, 4);
  }


  function dkd_filter_by_search_and_category_value(dkd_input_values, dkd_apply_category_filter_value = true) {
    const dkd_search_value = String(dkd_market_state.dkd_search_value || '').trim().toLowerCase();
    return (Array.isArray(dkd_input_values) ? dkd_input_values : []).filter((dkd_item_value) => {
      if (dkd_apply_category_filter_value && dkd_market_state.dkd_active_category_value !== 'all' && dkd_item_value.dkd_category_value !== dkd_market_state.dkd_active_category_value) {
        return false;
      }
      if (!dkd_search_value) return true;
      const dkd_search_haystack_value = [
        dkd_item_value.dkd_name_value,
        dkd_item_value.dkd_subtitle_value,
        dkd_item_value.dkd_description_value,
        dkd_item_value.dkd_badge_value,
        dkd_item_value.dkd_seller_name_value,
        dkd_item_value.dkd_business_name_value,
      ]
        .map((dkd_field_value) => String(dkd_field_value || '').toLowerCase())
        .join(' ');
      return dkd_search_haystack_value.includes(dkd_search_value);
    });
  }

  function dkd_render_category_row_value() {
    const dkd_mount_node_value = dkd_get_element_value('dkd_market_category_row');
    if (!dkd_mount_node_value) return;
    const dkd_visible_category_values = dkd_category_definition_values.filter((dkd_category_value) => {
      if (dkd_category_value.dkd_key_value !== 'business_panel') return true;
      return dkd_has_business_panel_access_value();
    });
    if (dkd_market_state.dkd_active_category_value === 'business_panel' && !dkd_has_business_panel_access_value()) {
      dkd_market_state.dkd_active_category_value = 'all';
    }
    dkd_mount_node_value.innerHTML = dkd_visible_category_values.map((dkd_category_value) => {
      const dkd_is_active_value = dkd_market_state.dkd_active_category_value === dkd_category_value.dkd_key_value;
      return `
        <button
          class="dkd_market_category_button${dkd_is_active_value ? ' dkd_market_category_button_active' : ''}${dkd_category_value.dkd_key_value === 'business_panel' ? ' dkd_market_category_button_business_panel' : ''}"
          data-dkd-category="${dkd_escape_html_value(dkd_category_value.dkd_key_value)}"
        >
          <span class="dkd_market_category_icon">${dkd_category_value.dkd_icon_value}</span>
          <span>${dkd_escape_html_value(dkd_category_value.dkd_label_value)}</span>
        </button>
      `;
    }).join('');
  }

  function dkd_render_hero_banner_value() {
    const dkd_mount_node_value = dkd_get_element_value('dkd_market_hero_banner');
    if (dkd_mount_node_value) dkd_mount_node_value.innerHTML = '';
  }

  function dkd_render_featured_grid_value() {
    const dkd_mount_node_value = dkd_get_element_value('dkd_market_featured_grid');
    if (!dkd_mount_node_value) return;
    const dkd_snapshot_value = dkd_get_normalized_snapshot_value();
    const dkd_visible_values = dkd_filter_by_search_and_category_value(dkd_snapshot_value.dkd_featured_values);
    if (!dkd_visible_values.length) {
      dkd_mount_node_value.innerHTML = '<div class="dkd_market_empty_state">Bu filtre için öne çıkan ürün bulunamadı.</div>';
      return;
    }
    dkd_mount_node_value.innerHTML = dkd_visible_values.map((dkd_item_value) => dkd_build_featured_card_html_value(dkd_item_value)).join('');
  }

  function dkd_build_featured_card_html_value(dkd_item_value) {
    const dkd_cash_price_html_value = dkd_item_value.dkd_cash_price_value
      ? dkd_build_emphasis_cash_price_html_value(dkd_item_value.dkd_cash_price_value, 'dkd_market_featured_cash_price')
      : '';
    const dkd_subtext_value = dkd_item_value.dkd_source_kind_value === 'business'
      ? (dkd_item_value.dkd_business_name_value || dkd_item_value.dkd_subtitle_value || 'Kurye teslimatlı işletme ürünü.')
      : dkd_item_value.dkd_subtitle_value;
    return `
      <article class="dkd_market_featured_card dkd_market_card_tap_target" data-dkd-open-detail="${dkd_escape_html_value(dkd_item_value.dkd_id_value)}">
        <div class="dkd_market_featured_head_row">
          <span class="dkd_market_rarity_badge" style="background:${dkd_item_value.dkd_rarity_background_value};color:${dkd_item_value.dkd_rarity_tone_value}">${dkd_escape_html_value(dkd_item_value.dkd_rarity_label_value)}</span>
          <span class="dkd_market_featured_micro_badge">Öne Çıkan</span>
        </div>
        ${dkd_build_art_surface_html_value(dkd_item_value, 'dkd_market_featured_art')}
        <div class="dkd_market_featured_name">${dkd_escape_html_value(dkd_item_value.dkd_name_value)}</div>
        <div class="dkd_market_featured_subtext">${dkd_escape_html_value(dkd_subtext_value)}</div>
        <div class="dkd_market_featured_price_wrap dkd_market_tl_price_wrap">
          ${dkd_build_tl_price_badge_html_value(dkd_item_value, 'dkd_market_featured_tl_price')}
        </div>
      </article>
    `;
  }
  function dkd_render_package_row_value() {
    const dkd_mount_node_value = dkd_get_element_value('dkd_market_package_row');
    if (!dkd_mount_node_value) return;
    const dkd_snapshot_value = dkd_get_normalized_snapshot_value();
    const dkd_visible_values = dkd_filter_by_search_and_category_value(dkd_snapshot_value.dkd_package_values);
    if (!dkd_visible_values.length) {
      dkd_mount_node_value.innerHTML = '<div class="dkd_market_empty_state">Bu filtre için paket bulunamadı.</div>';
      return;
    }
    dkd_mount_node_value.innerHTML = dkd_visible_values.map((dkd_item_value) => `
      <article class="dkd_market_package_card dkd_market_card_tap_target" data-dkd-open-detail="${dkd_escape_html_value(dkd_item_value.dkd_id_value)}">
        ${dkd_build_art_surface_html_value(dkd_item_value, 'dkd_market_package_art')}
        <div class="dkd_market_package_copy">
          <div class="dkd_market_package_topline">Popüler Paket</div>
          <div class="dkd_market_package_name">${dkd_escape_html_value(dkd_item_value.dkd_name_value)}</div>
          <div class="dkd_market_package_meta">${dkd_escape_html_value(dkd_item_value.dkd_subtitle_value)}</div>
          <div class="dkd_market_package_footer">
            <div class="dkd_market_package_cash_price">${dkd_build_cash_price_chip_html_value(dkd_item_value.dkd_cash_price_value, 'dkd_market_package_cash_chip')}</div>
            <div class="dkd_market_package_arrow">›</div>
          </div>
        </div>
      </article>
    `).join('');
  }

  function dkd_render_listing_stack_value() {
    const dkd_mount_node_value = dkd_get_element_value('dkd_market_listing_stack');
    if (!dkd_mount_node_value) return;
    const dkd_snapshot_value = dkd_get_normalized_snapshot_value();
    const dkd_visible_values = dkd_filter_by_search_and_category_value(dkd_snapshot_value.dkd_listing_values);
    if (!dkd_visible_values.length) {
      dkd_mount_node_value.innerHTML = '<div class="dkd_market_empty_state">Bu filtre için ilan bulunamadı.</div>';
      return;
    }
    dkd_mount_node_value.innerHTML = dkd_visible_values.map((dkd_item_value) => `
      <article class="dkd_market_listing_card dkd_market_card_tap_target" data-dkd-open-detail="${dkd_escape_html_value(dkd_item_value.dkd_id_value)}">
        ${dkd_build_art_surface_html_value(dkd_item_value, 'dkd_market_listing_art')}
        <div>
          <div class="dkd_market_listing_name_row">
            <div class="dkd_market_listing_name">${dkd_escape_html_value(dkd_item_value.dkd_name_value)}</div>
            <span class="dkd_market_rarity_badge" style="background:${dkd_item_value.dkd_rarity_background_value};color:${dkd_item_value.dkd_rarity_tone_value}">${dkd_escape_html_value(dkd_item_value.dkd_rarity_label_value)}</span>
          </div>
          <div class="dkd_market_listing_type">${dkd_escape_html_value(dkd_item_value.dkd_subtitle_value)}</div>
          <div class="dkd_market_listing_seller">Satıcı: ${dkd_escape_html_value(dkd_item_value.dkd_seller_name_value || 'DarkHunter')} <span class="dkd_market_online_dot">●</span></div>
        </div>
        <div class="dkd_market_listing_price_box">
          <div class="dkd_market_listing_price_value"><span class="dkd_market_token_icon"></span>${dkd_format_number_value(dkd_item_value.dkd_price_token_value)}</div>
          <button class="dkd_market_listing_button" data-dkd-buy-id="${dkd_escape_html_value(dkd_item_value.dkd_id_value)}">Sepete Ekle</button>
        </div>
      </article>
    `).join('');
  }

  function dkd_render_business_row_value() {
    const dkd_mount_node_value = dkd_get_element_value('dkd_market_business_row');
    if (!dkd_mount_node_value) return;
    const dkd_snapshot_value = dkd_get_normalized_snapshot_value();
    const dkd_visible_values = dkd_filter_by_search_and_category_value(dkd_snapshot_value.dkd_business_values);
    if (!dkd_visible_values.length) {
      dkd_mount_node_value.innerHTML = '<div class="dkd_market_empty_state">Bu filtre için işletme ürünü bulunamadı.</div>';
      return;
    }
    dkd_mount_node_value.innerHTML = dkd_visible_values.map((dkd_item_value) => `
      <article class="dkd_market_business_card dkd_market_card_tap_target" data-dkd-open-detail="${dkd_escape_html_value(dkd_item_value.dkd_id_value)}">
        ${dkd_build_art_surface_html_value(dkd_item_value, 'dkd_market_business_art')}
        <div>
          <div class="dkd_market_business_name">${dkd_escape_html_value(dkd_item_value.dkd_name_value)}</div>
          <div class="dkd_market_business_meta">${dkd_escape_html_value(dkd_item_value.dkd_order_count_value > 0 ? `${dkd_format_number_value(dkd_item_value.dkd_order_count_value)} sipariş • kurye teslimatı` : 'Sıcak teslimat açık')}</div>
          <div class="dkd_market_business_price_wrap dkd_market_business_price_wrap_tl">
            ${dkd_build_tl_price_badge_html_value(dkd_item_value, 'dkd_market_business_tl_price')}
          </div>
        </div>
      </article>
    `).join('');
  }



  function dkd_build_detail_stat_values(dkd_item_value) {
    return [
      {
        dkd_label_value: 'Kategori',
        dkd_value_value: dkd_item_value.dkd_category_value === 'card' ? 'Kart' : dkd_item_value.dkd_category_value === 'energy' ? 'Enerji' : dkd_item_value.dkd_category_value === 'ticket' ? 'Bilet' : dkd_item_value.dkd_category_value === 'boost' ? 'Takviye' : dkd_item_value.dkd_category_value === 'business' ? 'İşletme' : 'Paket',
      },
      {
        dkd_label_value: 'Kaynak',
        dkd_value_value: dkd_item_value.dkd_source_kind_value === 'listing' ? 'Pazar İlanı' : dkd_item_value.dkd_source_kind_value === 'business' ? 'İşletme Vitrini' : 'Lootonia Market',
      },
      {
        dkd_label_value: dkd_item_value.dkd_source_kind_value === 'listing' ? 'Satıcı' : 'Bilgi',
        dkd_value_value: dkd_item_value.dkd_seller_name_value || dkd_item_value.dkd_business_name_value || dkd_item_value.dkd_badge_value || 'Lootonia',
      },
      {
        dkd_label_value: 'Stok',
        dkd_value_value: dkd_item_value.dkd_remaining_count_value == null
          ? (dkd_item_value.dkd_stock_label_value || 'Hazır')
          : `${dkd_format_number_value(dkd_item_value.dkd_remaining_count_value)} adet`,
      },
    ];
  }

  function dkd_render_detail_drawer_value() {
    const dkd_body_node_value = dkd_get_element_value('dkd_market_detail_body');
    const dkd_add_button_node_value = dkd_get_element_value('dkd_market_detail_add_button');
    const dkd_buy_button_node_value = dkd_get_element_value('dkd_market_detail_buy_button');
    if (!dkd_body_node_value || !dkd_add_button_node_value || !dkd_buy_button_node_value) return;

    const dkd_item_value = dkd_market_state.dkd_detail_item_value;
    if (!dkd_item_value) {
      dkd_body_node_value.innerHTML = '<div class="dkd_market_empty_card">Detay açmak için bir ürüne dokun.</div>';
      dkd_add_button_node_value.disabled = true;
      dkd_buy_button_node_value.disabled = true;
      return;
    }

    dkd_add_button_node_value.disabled = dkd_market_state.dkd_purchase_busy_value;
    dkd_buy_button_node_value.disabled = dkd_market_state.dkd_purchase_busy_value;
    dkd_add_button_node_value.textContent = dkd_market_state.dkd_purchase_busy_value ? 'İşleniyor…' : 'Sepete Ekle';
    dkd_buy_button_node_value.textContent = dkd_market_state.dkd_purchase_busy_value ? 'İşleniyor…' : 'Hemen Al';

    const dkd_is_business_item_value = dkd_item_value.dkd_source_kind_value === 'business';
    const dkd_is_listing_item_value = dkd_item_value.dkd_source_kind_value === 'listing';
    const dkd_is_package_item_value = dkd_item_value.dkd_source_kind_value === 'token_pack';
    const dkd_description_value = dkd_item_value.dkd_description_value || dkd_item_value.dkd_subtitle_value || 'Bu ürün web ve uygulama arasında aynı market omurgasında görünür.';
    const dkd_delivery_address_text_value = dkd_market_state.dkd_business_delivery_form_value.dkd_address_text_value || '';
    const dkd_delivery_note_text_value = dkd_market_state.dkd_business_delivery_form_value.dkd_note_text_value || '';
    const dkd_source_label_value = dkd_is_business_item_value
      ? 'İşletme Teslimatı'
      : (dkd_is_listing_item_value ? 'Pazar İlanı' : 'Takviye Paketi');
    const dkd_stock_label_value = dkd_item_value.dkd_stock_label_value || 'Stokta';
    const dkd_secondary_price_html_value = dkd_build_cash_price_chip_html_value(dkd_item_value.dkd_cash_price_value, 'dkd_market_detail_secondary_price');
    const dkd_subtitle_value = dkd_is_listing_item_value
      ? `Satıcı • ${dkd_item_value.dkd_seller_name_value || 'DarkHunter'}`
      : (dkd_is_package_item_value ? (dkd_item_value.dkd_detail_subtitle_value || 'Takviye Paketi') : 'Kurye teslimatlı ürün');
    const dkd_info_item_html_values = [
      `<div class="dkd_market_detail_info_item"><span>Kategori</span><strong>${dkd_escape_html_value(dkd_item_value.dkd_category_label_value || dkd_item_value.dkd_rarity_label_value || 'Market')}</strong></div>`,
      `<div class="dkd_market_detail_info_item"><span>Kaynak</span><strong>${dkd_escape_html_value(dkd_source_label_value)}</strong></div>`,
      dkd_is_listing_item_value
        ? `<div class="dkd_market_detail_info_item"><span>Satıcı</span><strong>${dkd_escape_html_value(dkd_item_value.dkd_seller_name_value || 'DarkHunter')}</strong></div>`
        : `<div class="dkd_market_detail_info_item"><span>Durum</span><strong>${dkd_escape_html_value(dkd_stock_label_value)}</strong></div>`,
      dkd_is_business_item_value && Number(dkd_item_value.dkd_order_count_value || 0) > 0
        ? `<div class="dkd_market_detail_info_item"><span>Toplam Sipariş</span><strong>${dkd_format_number_value(dkd_item_value.dkd_order_count_value)}</strong></div>`
        : '',
    ].filter(Boolean).join('');

    dkd_body_node_value.innerHTML = `
      <div class="dkd_market_detail_body dkd_market_detail_body_minimal dkd_market_detail_body_modern">
        <div class="dkd_market_detail_art_wrap dkd_market_detail_art_wrap_modern">
          ${dkd_build_art_surface_html_value(dkd_item_value, dkd_item_value.dkd_source_kind_value === 'token_pack' ? 'dkd_market_detail_art dkd_market_detail_art_fit' : 'dkd_market_detail_art')}
        </div>
        <div class="dkd_market_detail_badge_row dkd_market_detail_badge_row_minimal">
          <span class="dkd_market_rarity_badge" style="background:${dkd_item_value.dkd_rarity_background_value};color:${dkd_item_value.dkd_rarity_tone_value}">${dkd_escape_html_value(dkd_item_value.dkd_rarity_label_value)}</span>
          <span class="dkd_market_detail_chip">${dkd_escape_html_value(dkd_source_label_value)}</span>
          <span class="dkd_market_detail_chip">${dkd_escape_html_value(dkd_stock_label_value)}</span>
        </div>
        <h4 class="dkd_market_detail_name">${dkd_escape_html_value(dkd_item_value.dkd_name_value)}</h4>
        <div class="dkd_market_detail_subtitle">${dkd_escape_html_value(dkd_subtitle_value)}</div>
        <div class="dkd_market_detail_description">${dkd_escape_html_value(dkd_description_value)}</div>
        <div class="dkd_market_detail_price_card dkd_market_detail_price_card_modern dkd_market_detail_price_card_tl">
          <div>
            <div class="dkd_market_detail_price_caption">TL satış fiyatı • ödeme kapıda nakit alınabilir</div>
            ${dkd_build_tl_price_badge_html_value(dkd_item_value, 'dkd_market_detail_tl_price')}
          </div>
        </div>
        <div class="dkd_market_detail_info_list dkd_market_detail_info_list_modern">
          ${dkd_info_item_html_values}
        </div>
        ${dkd_is_business_item_value ? `
          <section class="dkd_market_detail_delivery_section dkd_market_detail_delivery_section_minimal dkd_market_detail_delivery_section_modern">
            <div class="dkd_market_detail_delivery_head">
              <strong>Teslimat Bilgisi</strong>
              <span>Kurye siparişi bu adres ve not ile teslim hattına düşer.</span>
            </div>
            <label class="dkd_market_field_block">
              <span>Teslimat Adresi</span>
              <input id="dkd_market_detail_delivery_address" type="text" placeholder="Mahalle, cadde, bina, daire" value="${dkd_escape_html_value(dkd_delivery_address_text_value)}" />
            </label>
            <label class="dkd_market_field_block">
              <span>Teslimat Notu</span>
              <textarea id="dkd_market_detail_delivery_note" class="dkd_market_detail_textarea" placeholder="Kurye için kısa not yaz">${dkd_escape_html_value(dkd_delivery_note_text_value)}</textarea>
            </label>
          </section>
        ` : ''}
      </div>
    `;
  }


  function dkd_open_detail_drawer_value(dkd_target_id_value) {
    const dkd_item_value = dkd_find_item_by_id_value(dkd_target_id_value);
    if (!dkd_item_value) {
      dkd_show_toast_value('Ürün detayı açılamadı.', true);
      return;
    }
    dkd_market_state.dkd_detail_item_value = dkd_item_value;
    dkd_market_state.dkd_business_delivery_form_value = {
      dkd_address_text_value: dkd_item_value.dkd_delivery_address_text_value || '',
      dkd_note_text_value: dkd_item_value.dkd_delivery_note_text_value || '',
    };
    dkd_render_detail_drawer_value();
    dkd_set_drawer_visibility_value('detail', true);
  }

  function dkd_render_cart_drawer_value() {
    const dkd_mount_node_value = dkd_get_element_value('dkd_market_cart_items');
    const dkd_total_node_value = dkd_get_element_value('dkd_market_cart_total');
    if (!dkd_mount_node_value || !dkd_total_node_value) return;
    if (!dkd_market_state.dkd_cart_items_value.length) {
      dkd_mount_node_value.innerHTML = '<div class="dkd_market_empty_card">Sepetin şu an boş. Ürünleri sepete ekleyip burada görebilirsin.</div>';
      dkd_total_node_value.textContent = '0,00 TL';
      return;
    }
    dkd_mount_node_value.innerHTML = dkd_market_state.dkd_cart_items_value.map((dkd_item_value) => `
      <article class="dkd_market_cart_item">
        ${dkd_build_art_surface_html_value(dkd_item_value, 'dkd_market_cart_item_art')}
        <div>
          <div class="dkd_market_cart_item_name">${dkd_escape_html_value(dkd_item_value.dkd_name_value)}</div>
          <div class="dkd_market_cart_item_meta">${dkd_escape_html_value(dkd_item_value.dkd_subtitle_value)}</div>
          ${dkd_item_value.dkd_source_kind_value === 'business' && dkd_item_value.dkd_delivery_address_text_value ? `<div class="dkd_market_cart_item_meta">Adres: ${dkd_escape_html_value(dkd_item_value.dkd_delivery_address_text_value)}</div>` : ''}
          <div class="dkd_market_cart_item_price">${dkd_format_money_value(dkd_resolve_tl_price_value(dkd_item_value))}</div>
        </div>
        <button class="dkd_market_text_button" data-dkd-remove-id="${dkd_escape_html_value(dkd_item_value.dkd_id_value)}">Kaldır</button>
      </article>
    `).join('');
    const dkd_total_value = dkd_market_state.dkd_cart_items_value.reduce((dkd_running_total_value, dkd_item_value) => dkd_running_total_value + Number(dkd_resolve_tl_price_value(dkd_item_value) || 0), 0);
    dkd_total_node_value.textContent = dkd_format_money_value(dkd_total_value);
  }

  function dkd_normalize_business_owner_status_value(dkd_payload_value) {
    const dkd_source_value = Array.isArray(dkd_payload_value) ? (dkd_payload_value[0] || {}) : (dkd_payload_value || {});
    const dkd_is_business_owner_value = Boolean(
      dkd_source_value.is_business_owner
      ?? dkd_source_value.dkd_is_business_owner_value
      ?? dkd_source_value.is_owner
      ?? false,
    );
    const dkd_business_count_value = Number(
      dkd_source_value.business_count
      ?? dkd_source_value.dkd_business_count_value
      ?? dkd_source_value.count
      ?? 0,
    );
    const dkd_primary_business_name_value = String(
      dkd_source_value.primary_business_name
      ?? dkd_source_value.dkd_primary_business_name_value
      ?? dkd_source_value.business_name
      ?? '',
    ).trim();
    return {
      dkd_is_business_owner_value: dkd_is_business_owner_value || dkd_business_count_value > 0,
      dkd_business_count_value: Math.max(0, dkd_business_count_value),
      dkd_primary_business_name_value,
    };
  }

  function dkd_reset_business_owner_status_value() {
    dkd_market_state.dkd_business_owner_status_value = {
      dkd_is_business_owner_value: false,
      dkd_business_count_value: 0,
      dkd_primary_business_name_value: '',
    };
  }

  async function dkd_load_business_owner_status_value() {
    const dkd_client_value = dkd_market_state.dkd_supabase_client_value;
    const dkd_user_id_value = dkd_market_state.dkd_session_value?.user?.id;
    if (!dkd_client_value || !dkd_user_id_value) {
      dkd_reset_business_owner_status_value();
      return dkd_market_state.dkd_business_owner_status_value;
    }
    try {
      const dkd_status_result_value = await dkd_client_value.rpc('dkd_web_business_owner_status_dkd');
      if (dkd_status_result_value.error) throw dkd_status_result_value.error;
      dkd_market_state.dkd_business_owner_status_value = dkd_normalize_business_owner_status_value(dkd_status_result_value.data);
    } catch (_dkd_error_value) {
      dkd_reset_business_owner_status_value();
    }
    return dkd_market_state.dkd_business_owner_status_value;
  }

  function dkd_has_business_panel_access_value() {
    return Boolean(dkd_market_state.dkd_business_owner_status_value?.dkd_is_business_owner_value);
  }

  function dkd_render_business_panel_summary_html_value() {
    if (!dkd_has_business_panel_access_value()) return '';
    const dkd_status_value = dkd_market_state.dkd_business_owner_status_value || {};
    const dkd_business_name_value = dkd_status_value.dkd_primary_business_name_value || 'Aktif işletme';
    const dkd_business_count_text_value = dkd_status_value.dkd_business_count_value > 1
      ? `${dkd_format_number_value(dkd_status_value.dkd_business_count_value)} işletme bağlı`
      : 'Mobil uygulama işletme paneli aktif';
    return `
      <section class="dkd_market_business_owner_card">
        <div class="dkd_market_business_owner_icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><path d="M4 9.4 6.3 5h11.4L20 9.4" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M5.5 9.4h13v10h-13v-10Z" stroke="currentColor" stroke-width="1.8"/><path d="M8.5 14.2h7M8.5 16.8h4.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        </div>
        <div class="dkd_market_business_owner_copy">
          <span>İşletme Panelim</span>
          <strong>${dkd_escape_html_value(dkd_business_name_value)}</strong>
          <small>${dkd_escape_html_value(dkd_business_count_text_value)}</small>
        </div>
        <button class="dkd_market_business_owner_button" type="button" data-dkd-business-panel-action="open">Panelimi Aç</button>
      </section>
    `;
  }

  function dkd_render_profile_editor_html_value(dkd_wallet_value) {
    const dkd_nickname_value = String(dkd_wallet_value?.dkd_nickname_value || '').trim();
    return `
      <section class="dkd_market_profile_editor_card">
        <div class="dkd_market_profile_editor_head">
          <div>
            <span>Profil Senkronu</span>
            <strong>Kullanıcı adı ve profil resmi</strong>
          </div>
          <button class="dkd_market_profile_avatar_pick" type="button" id="dkd_market_profile_avatar_pick_button">Resim Seç</button>
        </div>
        <input id="dkd_market_profile_avatar_file" class="dkd_market_profile_avatar_file" type="file" accept="image/png,image/jpeg,image/webp" hidden />
        <label class="dkd_market_profile_editor_field" for="dkd_market_profile_nickname_input">
          <span>Kullanıcı adı</span>
          <input id="dkd_market_profile_nickname_input" type="text" maxlength="32" value="${dkd_escape_html_value(dkd_nickname_value)}" placeholder="Örn. DrabornEagle" autocomplete="nickname" />
        </label>
        <button class="dkd_market_profile_save_button" type="button" id="dkd_market_profile_save_button">Profili Kaydet</button>
        <p class="dkd_market_profile_sync_hint">Buradan yaptığın kullanıcı adı ve profil resmi değişikliği uygulamadaki aynı profil kaydına yazılır.</p>
      </section>
    `;
  }

  function dkd_read_profile_avatar_data_url_value(dkd_file_value) {
    return new Promise((dkd_resolve_value, dkd_reject_value) => {
      if (!dkd_file_value) {
        dkd_resolve_value(null);
        return;
      }
      if (!/^image\/(png|jpeg|webp)$/i.test(String(dkd_file_value.type || ''))) {
        dkd_reject_value(new Error('Profil resmi PNG, JPG veya WEBP olmalı.'));
        return;
      }
      const dkd_reader_value = new FileReader();
      dkd_reader_value.onerror = () => dkd_reject_value(new Error('Profil resmi okunamadı.'));
      dkd_reader_value.onload = () => {
        const dkd_image_value = new Image();
        dkd_image_value.onerror = () => dkd_reject_value(new Error('Profil resmi işlenemedi.'));
        dkd_image_value.onload = () => {
          const dkd_max_size_value = 512;
          const dkd_source_width_value = Math.max(1, dkd_image_value.naturalWidth || dkd_image_value.width || 1);
          const dkd_source_height_value = Math.max(1, dkd_image_value.naturalHeight || dkd_image_value.height || 1);
          const dkd_scale_value = Math.min(1, dkd_max_size_value / Math.max(dkd_source_width_value, dkd_source_height_value));
          const dkd_canvas_node_value = document.createElement('canvas');
          dkd_canvas_node_value.width = Math.max(1, Math.round(dkd_source_width_value * dkd_scale_value));
          dkd_canvas_node_value.height = Math.max(1, Math.round(dkd_source_height_value * dkd_scale_value));
          const dkd_context_value = dkd_canvas_node_value.getContext('2d');
          dkd_context_value.drawImage(dkd_image_value, 0, 0, dkd_canvas_node_value.width, dkd_canvas_node_value.height);
          dkd_resolve_value(dkd_canvas_node_value.toDataURL('image/jpeg', 0.82));
        };
        dkd_image_value.src = String(dkd_reader_value.result || '');
      };
      dkd_reader_value.readAsDataURL(dkd_file_value);
    });
  }

  async function dkd_save_profile_from_account_value(dkd_avatar_file_value = null) {
    if (dkd_market_state.dkd_profile_save_busy_value) return;
    const dkd_client_value = dkd_market_state.dkd_supabase_client_value;
    const dkd_user_id_value = dkd_market_state.dkd_session_value?.user?.id;
    if (!dkd_client_value || !dkd_user_id_value) {
      dkd_show_toast_value('Profil kaydı için giriş yapmalısın.', true);
      return;
    }
    const dkd_save_button_node_value = dkd_get_element_value('dkd_market_profile_save_button');
    const dkd_nickname_value = String(dkd_get_element_value('dkd_market_profile_nickname_input')?.value || '').trim();
    if (dkd_nickname_value.length < 2) {
      dkd_show_toast_value('Kullanıcı adı en az 2 karakter olmalı.', true);
      return;
    }
    try {
      dkd_market_state.dkd_profile_save_busy_value = true;
      if (dkd_save_button_node_value) {
        dkd_save_button_node_value.disabled = true;
        dkd_save_button_node_value.textContent = 'Kaydediliyor...';
      }
      const dkd_avatar_data_url_value = await dkd_read_profile_avatar_data_url_value(dkd_avatar_file_value);
      const dkd_save_result_value = await dkd_client_value.rpc('dkd_web_profile_save_dkd', {
        dkd_nickname_value,
        dkd_avatar_image_url_value: dkd_avatar_data_url_value,
        dkd_avatar_emoji_value: '🦅',
      });
      if (dkd_save_result_value.error) throw dkd_save_result_value.error;
      const dkd_profile_payload_value = dkd_save_result_value.data?.profile || dkd_save_result_value.data || null;
      dkd_market_state.dkd_wallet_snapshot_value = dkd_normalize_wallet_snapshot_value(dkd_profile_payload_value) || dkd_market_state.dkd_wallet_snapshot_value || dkd_build_wallet_fallback_value();
      dkd_market_state.dkd_last_wallet_sync_at_value = new Date().toISOString();
      dkd_render_wallet_strip_value();
      dkd_render_account_card_value();
      dkd_show_toast_value(dkd_avatar_file_value ? 'Profil resmi ve kullanıcı adı senkronlandı.' : 'Kullanıcı adı senkronlandı.');
    } catch (dkd_error_value) {
      dkd_show_toast_value(dkd_error_value.message || 'Profil kaydedilemedi.', true);
    } finally {
      dkd_market_state.dkd_profile_save_busy_value = false;
      if (dkd_save_button_node_value) {
        dkd_save_button_node_value.disabled = false;
        dkd_save_button_node_value.textContent = 'Profili Kaydet';
      }
    }
  }

  function dkd_open_business_panel_from_filter_value() {
    if (!dkd_has_business_panel_access_value()) {
      dkd_show_toast_value('İşletme Panelim yalnızca işletme sahibi hesaplarda görünür.', true);
      return;
    }
    dkd_show_toast_value('İşletme Panelim mobil uygulamadaki paneldir. Web tarafında ayrı panel açılmaz.');
  }


  function dkd_render_account_card_value() {
    const dkd_account_node_value = dkd_get_element_value('dkd_market_account_card');
    const dkd_sync_node_value = dkd_get_element_value('dkd_market_sync_notice');
    const dkd_sign_out_node_value = dkd_get_element_value('dkd_market_sign_out_button');
    const dkd_login_form_node_value = dkd_get_element_value('dkd_market_login_form');
    if (!dkd_account_node_value || !dkd_sync_node_value || !dkd_sign_out_node_value || !dkd_login_form_node_value) return;

    if (dkd_market_state.dkd_session_value?.user?.email) {
      const dkd_wallet_value = dkd_market_state.dkd_wallet_snapshot_value || dkd_build_wallet_fallback_value();
      const dkd_order_summary_value = dkd_build_order_summary_value(dkd_get_effective_order_history_values());
      const dkd_last_status_meta_value = dkd_order_summary_value.dkd_latest_order_value
        ? dkd_order_summary_value.dkd_latest_order_value.dkd_status_meta_value
        : null;
      dkd_sync_node_value.textContent = dkd_market_state.dkd_last_wallet_sync_at_value
        ? `Uygulama ve web senkronu açık • ${new Date(dkd_market_state.dkd_last_wallet_sync_at_value).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`
        : 'Uygulama ve web senkronu açık';
      dkd_account_node_value.innerHTML = `
        <div class="dkd_market_profile_card dkd_market_profile_card_compact dkd_market_profile_card_premium">
          <div class="dkd_market_profile_identity dkd_market_profile_identity_premium">
            <div class="dkd_market_profile_avatar_shell">
              ${dkd_build_avatar_markup_value(dkd_wallet_value, 'dkd_market_profile_avatar dkd_market_profile_avatar_large')}
              <button class="dkd_market_profile_avatar_overlay" type="button" id="dkd_market_profile_avatar_pick_button_overlay" aria-label="Profil resmi seç">＋</button>
            </div>
            <div>
              <strong>${dkd_escape_html_value(dkd_wallet_value.dkd_nickname_value)}</strong>
              <div class="dkd_market_account_mini_line">${dkd_escape_html_value(dkd_market_state.dkd_session_value.user.email)}</div>
            </div>
          </div>
          ${dkd_render_profile_editor_html_value(dkd_wallet_value)}
          ${dkd_render_business_panel_summary_html_value()}
          <div class="dkd_market_profile_section_label">Canlı hesap özeti</div>
          <div class="dkd_market_profile_stat_grid dkd_market_profile_stat_grid_compact dkd_market_profile_stat_grid_premium">
            <div class="dkd_market_profile_stat_item dkd_market_profile_stat_item_wallet"><small>Cüzdan</small><strong>${dkd_format_wallet_tl_value(dkd_wallet_value.dkd_wallet_tl_value)}</strong></div>
            <div class="dkd_market_profile_stat_item dkd_market_profile_stat_item_token"><small>Token</small><strong>${dkd_format_number_value(dkd_wallet_value.dkd_token_value)}</strong></div>
            <div class="dkd_market_profile_stat_item dkd_market_profile_stat_item_energy"><small>Enerji</small><strong>${dkd_format_number_value(dkd_wallet_value.dkd_energy_value)}/${dkd_format_number_value(dkd_wallet_value.dkd_energy_max_value)}</strong></div>
            <div class="dkd_market_profile_stat_item dkd_market_profile_stat_item_boss"><small>Boss</small><strong>${dkd_format_number_value(dkd_wallet_value.dkd_boss_tickets_value)}</strong></div>
          </div>
          <div class="dkd_market_profile_orders_card dkd_market_profile_orders_card_premium">
            <div class="dkd_market_profile_orders_head">
              <div>
                <div class="dkd_market_profile_orders_title">Sipariş Özeti</div>
                <div class="dkd_market_account_mini_line">${dkd_market_state.dkd_last_order_sync_at_value ? `Sipariş senkronu • ${new Date(dkd_market_state.dkd_last_order_sync_at_value).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}` : 'İşletme siparişleri burada görünür'}</div>
              </div>
              ${dkd_last_status_meta_value ? `<span class="dkd_market_order_badge ${dkd_last_status_meta_value.dkd_class_name_value}">${dkd_escape_html_value(dkd_last_status_meta_value.dkd_label_value)}</span>` : ''}
            </div>
            <div class="dkd_market_profile_orders_grid">
              <div class="dkd_market_profile_orders_stat"><small>Toplam</small><strong>${dkd_format_number_value(dkd_order_summary_value.dkd_total_count_value)}</strong></div>
              <div class="dkd_market_profile_orders_stat"><small>Aktif</small><strong>${dkd_format_number_value(dkd_order_summary_value.dkd_active_count_value)}</strong></div>
              <div class="dkd_market_profile_orders_stat"><small>Teslim</small><strong>${dkd_format_number_value(dkd_order_summary_value.dkd_delivered_count_value)}</strong></div>
              <div class="dkd_market_profile_orders_stat"><small>TL Toplam</small><strong>${dkd_format_wallet_tl_value(dkd_order_summary_value.dkd_total_spent_value)}</strong></div>
            </div>
            <button class="dkd_market_secondary_action dkd_market_profile_orders_button" data-dkd-open-drawer="orders">Sipariş Geçmişi</button>
          </div>
        </div>
      `;
      dkd_login_form_node_value.hidden = true;
      dkd_login_form_node_value.style.display = 'none';
      dkd_sign_out_node_value.hidden = false;
      dkd_sign_out_node_value.style.display = 'block';
      return;
    }

    dkd_sync_node_value.textContent = dkd_market_state.dkd_supabase_client_value
      ? 'Giriş yapınca uygulamadaki profil, cüzdan ve siparişlerin burada aynı görünür.'
      : 'Canlı Supabase anahtarı yüklenirse profil senkronu açılır.';
    dkd_account_node_value.innerHTML = `
      <div class="dkd_market_profile_card dkd_market_profile_card_placeholder">
        <strong>Profilini bağla</strong>
        <div>Web market, uygulamadaki profil, cüzdan ve işletme sipariş geçmişini aynı hesap üzerinden çeker.</div>
      </div>
    `;
    dkd_login_form_node_value.hidden = false;
    dkd_login_form_node_value.style.display = '';
    dkd_sign_out_node_value.hidden = true;
    dkd_sign_out_node_value.style.display = 'none';
  }

  function dkd_load_support_history_value() {
    try {
      const dkd_raw_value = window.localStorage.getItem(dkd_support_history_storage_key_value);
      const dkd_parsed_value = JSON.parse(dkd_raw_value || '[]');
      dkd_market_state.dkd_support_history_values = Array.isArray(dkd_parsed_value) ? dkd_parsed_value : [];
    } catch (_dkd_error_value) {
      dkd_market_state.dkd_support_history_values = [];
    }
  }

  function dkd_persist_support_history_value() {
    try {
      window.localStorage.setItem(
        dkd_support_history_storage_key_value,
        JSON.stringify(dkd_market_state.dkd_support_history_values.slice(0, 12)),
      );
    } catch (_dkd_error_value) {
      // sessiz geç
    }
  }


  async function dkd_load_remote_support_history_value() {
    const dkd_client_value = dkd_market_state.dkd_supabase_client_value;
    const dkd_user_id_value = dkd_market_state.dkd_session_value?.user?.id;
    if (!dkd_client_value || !dkd_user_id_value) return;
    dkd_market_state.dkd_support_history_sync_busy_value = true;
    try {
      const dkd_result_value = await dkd_client_value
        .from('dkd_market_support_messages')
        .select('id, user_id, subject_text, message_text, order_number, email_address, phone_text, attachment_name, delivery_status, delivery_channel, created_at, updated_at')
        .eq('user_id', dkd_user_id_value)
        .order('created_at', { ascending: false })
        .limit(20);
      if (dkd_result_value.error) throw dkd_result_value.error;
      const dkd_remote_values = (Array.isArray(dkd_result_value.data) ? dkd_result_value.data : []).map((dkd_row_value) => ({
        dkd_id_value: `remote_${dkd_row_value.id}`,
        dkd_subject_value: dkd_row_value.subject_text || 'Destek mesajı',
        dkd_message_value: dkd_row_value.message_text || '',
        dkd_delivery_status_value: dkd_row_value.delivery_status || 'queued',
        dkd_delivery_channel_value: dkd_row_value.delivery_channel || 'supabase',
        dkd_created_at_value: dkd_row_value.created_at || dkd_row_value.updated_at || new Date().toISOString(),
        dkd_order_number_value: dkd_row_value.order_number || '',
        dkd_email_value: dkd_row_value.email_address || '',
        dkd_phone_value: dkd_row_value.phone_text || '',
        dkd_attachment_name_value: dkd_row_value.attachment_name || '',
      }));
      const dkd_local_values = Array.isArray(dkd_market_state.dkd_support_history_values) ? dkd_market_state.dkd_support_history_values : [];
      const dkd_seen_values = new Set();
      dkd_market_state.dkd_support_history_values = [...dkd_remote_values, ...dkd_local_values].filter((dkd_item_value) => {
        const dkd_key_value = String(dkd_item_value?.dkd_id_value || `${dkd_item_value?.dkd_subject_value || ''}_${dkd_item_value?.dkd_created_at_value || ''}`);
        if (dkd_seen_values.has(dkd_key_value)) return false;
        dkd_seen_values.add(dkd_key_value);
        return true;
      }).sort((dkd_left_value, dkd_right_value) => new Date(dkd_right_value.dkd_created_at_value || 0) - new Date(dkd_left_value.dkd_created_at_value || 0)).slice(0, 20);
      dkd_persist_support_history_value();
    } catch (_dkd_error_value) {
      // local geçmiş ile devam
    } finally {
      dkd_market_state.dkd_support_history_sync_busy_value = false;
    }
  }

  async function dkd_load_order_timeline_map_value() {
    const dkd_client_value = dkd_market_state.dkd_supabase_client_value;
    const dkd_user_id_value = dkd_market_state.dkd_session_value?.user?.id;
    if (!dkd_client_value || !dkd_user_id_value) {
      dkd_market_state.dkd_order_timeline_map_value = {};
      return;
    }
    const dkd_order_id_values = Array.from(new Set(
      (Array.isArray(dkd_market_state.dkd_order_history_values) ? dkd_market_state.dkd_order_history_values : [])
        .map((dkd_order_value) => String(dkd_order_value?.dkd_order_id_value || '').trim())
        .filter(Boolean)
    ));
    if (!dkd_order_id_values.length) {
      dkd_market_state.dkd_order_timeline_map_value = {};
      return;
    }
    try {
      const dkd_result_value = await dkd_client_value
        .from('dkd_business_order_status_history')
        .select('id, order_id, status_key, title_text, note_text, created_at')
        .in('order_id', dkd_order_id_values)
        .order('created_at', { ascending: true });
      if (dkd_result_value.error) throw dkd_result_value.error;
      const dkd_grouped_values = {};
      (Array.isArray(dkd_result_value.data) ? dkd_result_value.data : []).forEach((dkd_row_value) => {
        const dkd_order_key_value = String(dkd_row_value.order_id || '').trim();
        if (!dkd_order_key_value) return;
        if (!Array.isArray(dkd_grouped_values[dkd_order_key_value])) dkd_grouped_values[dkd_order_key_value] = [];
        dkd_grouped_values[dkd_order_key_value].push({
          dkd_status_value: dkd_row_value.status_key || '',
          dkd_title_value: dkd_row_value.title_text || '',
          dkd_note_text_value: dkd_row_value.note_text || '',
          dkd_created_at_value: dkd_row_value.created_at || '',
        });
      });
      dkd_market_state.dkd_order_timeline_map_value = dkd_grouped_values;
    } catch (_dkd_error_value) {
      dkd_market_state.dkd_order_timeline_map_value = {};
    }
  }

  async function dkd_upsert_remote_support_history_value(dkd_history_entry_value) {
    const dkd_client_value = dkd_market_state.dkd_supabase_client_value;
    const dkd_user_id_value = dkd_market_state.dkd_session_value?.user?.id;
    if (!dkd_client_value || !dkd_user_id_value || !dkd_history_entry_value) return null;
    const dkd_insert_payload_value = {
      user_id: dkd_user_id_value,
      subject_text: dkd_history_entry_value.dkd_subject_value || 'Destek mesajı',
      message_text: dkd_history_entry_value.dkd_message_value || '',
      order_number: dkd_history_entry_value.dkd_order_number_value || null,
      email_address: dkd_history_entry_value.dkd_email_value || '',
      phone_text: dkd_history_entry_value.dkd_phone_value || '',
      attachment_name: dkd_history_entry_value.dkd_attachment_name_value || null,
      delivery_status: dkd_history_entry_value.dkd_delivery_status_value || 'queued',
      delivery_channel: dkd_history_entry_value.dkd_delivery_channel_value || 'supabase',
    };
    const dkd_insert_result_value = await dkd_client_value
      .from('dkd_market_support_messages')
      .insert(dkd_insert_payload_value)
      .select('id')
      .single();
    if (dkd_insert_result_value.error) throw dkd_insert_result_value.error;
    return dkd_insert_result_value.data?.id || null;
  }

  async function dkd_update_remote_support_history_value(dkd_remote_id_value, dkd_patch_value) {
    const dkd_client_value = dkd_market_state.dkd_supabase_client_value;
    const dkd_user_id_value = dkd_market_state.dkd_session_value?.user?.id;
    if (!dkd_client_value || !dkd_user_id_value || !dkd_remote_id_value || !dkd_patch_value) return;
    const dkd_update_payload_value = { ...dkd_patch_value, updated_at: new Date().toISOString() };
    await dkd_client_value
      .from('dkd_market_support_messages')
      .update(dkd_update_payload_value)
      .eq('id', dkd_remote_id_value)
      .eq('user_id', dkd_user_id_value);
  }

  function dkd_render_support_history_value() {
    const dkd_history_node_value = dkd_get_element_value('dkd_market_support_history_list');
    if (!dkd_history_node_value) return;
    const dkd_history_values = Array.isArray(dkd_market_state.dkd_support_history_values)
      ? dkd_market_state.dkd_support_history_values
      : [];
    if (!dkd_history_values.length) {
      dkd_history_node_value.innerHTML = '<div class="dkd_market_empty_card">Henüz destek mesajı gönderilmedi.</div>';
      return;
    }
    dkd_history_node_value.innerHTML = dkd_history_values.map((dkd_history_item_value) => {
      const dkd_created_at_value = dkd_history_item_value?.dkd_created_at_value
        ? new Date(dkd_history_item_value.dkd_created_at_value).toLocaleString('tr-TR')
        : '—';
      const dkd_status_text_value = dkd_history_item_value?.dkd_status_value === 'mailto'
        ? 'E-posta Uygulaması'
        : dkd_history_item_value?.dkd_status_value === 'sent'
          ? 'Gönderildi'
          : 'Taslak';
      const dkd_attachment_text_value = dkd_history_item_value?.dkd_attachment_name_value
        ? ` • Ek: ${dkd_history_item_value.dkd_attachment_name_value}`
        : '';
      const dkd_order_text_value = dkd_history_item_value?.dkd_order_number_value
        ? `Sipariş: ${dkd_history_item_value.dkd_order_number_value}`
        : 'Sipariş numarası yok';
      return `
        <article class="dkd_market_support_history_item">
          <div class="dkd_market_support_history_meta">
            <div class="dkd_market_support_history_subject">${dkd_escape_html_value(dkd_history_item_value?.dkd_subject_value || 'Destek mesajı')}</div>
            <span class="dkd_market_support_history_badge">${dkd_escape_html_value(dkd_status_text_value)}</span>
          </div>
          <div class="dkd_market_support_history_text">${dkd_escape_html_value(dkd_history_item_value?.dkd_message_preview_value || '—')}</div>
          <div class="dkd_market_support_history_aux">${dkd_escape_html_value(dkd_created_at_value)} • ${dkd_escape_html_value(dkd_order_text_value)}${dkd_escape_html_value(dkd_attachment_text_value)}</div>
        </article>
      `;
    }).join('');
  }

  function dkd_push_support_history_entry_value(dkd_support_payload_value, dkd_status_value) {
    const dkd_history_entry_value = {
      dkd_created_at_value: new Date().toISOString(),
      dkd_status_value,
      dkd_subject_value: dkd_support_payload_value.dkd_subject_value,
      dkd_message_preview_value: dkd_support_payload_value.dkd_message_value.slice(0, 140),
      dkd_order_number_value: dkd_support_payload_value.dkd_order_number_value,
      dkd_attachment_name_value: dkd_support_payload_value.dkd_attachment_name_value,
    };
    dkd_market_state.dkd_support_history_values = [
      dkd_history_entry_value,
      ...dkd_market_state.dkd_support_history_values,
    ].slice(0, 12);
    dkd_persist_support_history_value();
    dkd_render_support_history_value();
  }

  async function dkd_clear_support_history_value() {
    dkd_market_state.dkd_support_history_values = [];
    dkd_persist_support_history_value();
    dkd_render_support_history_value();
    if (dkd_market_state.dkd_session_value?.user?.id) {
      await dkd_load_remote_support_history_value();
      dkd_render_support_history_value();
    }
  }

  function dkd_reset_support_attachment_value() {
    dkd_market_state.dkd_support_attachment_value = null;
    const dkd_file_input_node_value = dkd_get_element_value('dkd_market_support_attachment');
    const dkd_preview_node_value = dkd_get_element_value('dkd_market_support_file_preview');
    if (dkd_file_input_node_value) dkd_file_input_node_value.value = '';
    if (dkd_preview_node_value) {
      dkd_preview_node_value.hidden = true;
      dkd_preview_node_value.innerHTML = '';
    }
  }

  function dkd_render_support_attachment_preview_value() {
    const dkd_preview_node_value = dkd_get_element_value('dkd_market_support_file_preview');
    const dkd_attachment_value = dkd_market_state.dkd_support_attachment_value;
    if (!dkd_preview_node_value) return;
    if (!dkd_attachment_value) {
      dkd_preview_node_value.hidden = true;
      dkd_preview_node_value.innerHTML = '';
      return;
    }
    dkd_preview_node_value.hidden = false;
    dkd_preview_node_value.innerHTML = `
      <div class="dkd_market_support_file_preview_thumb" style="background-image:url('${dkd_escape_html_value(dkd_attachment_value.dkd_data_url_value)}')"></div>
      <div class="dkd_market_support_file_preview_text">
        <div class="dkd_market_support_file_preview_name">${dkd_escape_html_value(dkd_attachment_value.dkd_file_name_value)}</div>
        <div class="dkd_market_support_file_preview_meta">${dkd_escape_html_value(dkd_format_number_value(Math.round((dkd_attachment_value.dkd_file_size_value || 0) / 1024)))} KB • ${dkd_escape_html_value(dkd_attachment_value.dkd_mime_type_value || 'image')}</div>
      </div>
      <button class="dkd_market_text_button" type="button" id="dkd_market_support_attachment_remove_button">Kaldır</button>
    `;
    dkd_get_element_value('dkd_market_support_attachment_remove_button')?.addEventListener('click', () => {
      dkd_reset_support_attachment_value();
    }, { once: true });
  }

  async function dkd_handle_support_attachment_change_value(dkd_file_value) {
    if (!dkd_file_value) {
      dkd_reset_support_attachment_value();
      return;
    }
    if ((dkd_file_value.size || 0) > dkd_support_attachment_limit_bytes_value) {
      dkd_show_toast_value('Ekran görüntüsü en fazla 3 MB olabilir.', true);
      dkd_reset_support_attachment_value();
      return;
    }
    const dkd_data_url_value = await new Promise((dkd_resolve_value, dkd_reject_value) => {
      const dkd_reader_value = new FileReader();
      dkd_reader_value.onload = () => dkd_resolve_value(String(dkd_reader_value.result || ''));
      dkd_reader_value.onerror = () => dkd_reject_value(dkd_reader_value.error || new Error('file_read_failed'));
      dkd_reader_value.readAsDataURL(dkd_file_value);
    }).catch(() => '');
    if (!dkd_data_url_value) {
      dkd_show_toast_value('Ekran görüntüsü okunamadı.', true);
      dkd_reset_support_attachment_value();
      return;
    }
    dkd_market_state.dkd_support_attachment_value = {
      dkd_file_name_value: String(dkd_file_value.name || 'ekran-goruntusu.png').trim(),
      dkd_file_size_value: Number(dkd_file_value.size || 0),
      dkd_mime_type_value: String(dkd_file_value.type || 'image/png').trim(),
      dkd_data_url_value,
    };
    dkd_render_support_attachment_preview_value();
  }

  function dkd_prefill_support_form_value() {
    const dkd_name_node_value = dkd_get_element_value('dkd_market_support_name');
    const dkd_email_node_value = dkd_get_element_value('dkd_market_support_email');
    const dkd_notice_node_value = dkd_get_element_value('dkd_market_support_notice');
    if (dkd_name_node_value && !dkd_name_node_value.value) {
      dkd_name_node_value.value = String(dkd_market_state.dkd_wallet_snapshot_value?.dkd_nickname_value || '').trim();
    }
    if (dkd_email_node_value && !dkd_email_node_value.value) {
      dkd_email_node_value.value = String(dkd_market_state.dkd_session_value?.user?.email || '').trim();
    }
    if (dkd_notice_node_value) {
      dkd_notice_node_value.textContent = 'Mesajın draborneagle@gmail.com adresine iletilsin. Sipariş numarası ve ekran görüntüsü de ekleyebilirsin.';
    }
  }

  function dkd_collect_support_payload_value() {
    return {
      dkd_name_value: String(dkd_get_element_value('dkd_market_support_name')?.value || '').trim(),
      dkd_email_value: String(dkd_get_element_value('dkd_market_support_email')?.value || '').trim(),
      dkd_phone_value: String(dkd_get_element_value('dkd_market_support_phone')?.value || '').trim(),
      dkd_subject_value: String(dkd_get_element_value('dkd_market_support_subject')?.value || '').trim(),
      dkd_order_number_value: String(dkd_get_element_value('dkd_market_support_order_number')?.value || '').trim(),
      dkd_message_value: String(dkd_get_element_value('dkd_market_support_message')?.value || '').trim(),
      dkd_attachment_name_value: String(dkd_market_state.dkd_support_attachment_value?.dkd_file_name_value || '').trim(),
      dkd_attachment_mime_type_value: String(dkd_market_state.dkd_support_attachment_value?.dkd_mime_type_value || '').trim(),
      dkd_attachment_data_url_value: String(dkd_market_state.dkd_support_attachment_value?.dkd_data_url_value || '').trim(),
    };
  }

  function dkd_open_support_mailto_fallback_value(dkd_support_payload_value) {
    const dkd_subject_line_value = `[Lootonia Destek] ${dkd_support_payload_value.dkd_subject_value || 'Destek Mesajı'}`;
    const dkd_body_line_value = [
      `Ad Soyad: ${dkd_support_payload_value.dkd_name_value}`,
      `E-posta: ${dkd_support_payload_value.dkd_email_value}`,
      `Telefon: ${dkd_support_payload_value.dkd_phone_value || '—'}`,
      `Sipariş Numarası: ${dkd_support_payload_value.dkd_order_number_value || '—'}`,
      `Ekran Görüntüsü: ${dkd_support_payload_value.dkd_attachment_name_value || 'Yok'}`,
      '',
      dkd_support_payload_value.dkd_message_value,
    ].join('\n');
    window.location.href = `mailto:draborneagle@gmail.com?subject=${encodeURIComponent(dkd_subject_line_value)}&body=${encodeURIComponent(dkd_body_line_value)}`;
  }

  async function dkd_send_support_edge_message_value(dkd_support_payload_value) {
    const dkd_supabase_url_value = String(dkd_market_state.dkd_config_value?.dkd_supabase_url || '').trim();
    const dkd_anon_key_value = String(dkd_market_state.dkd_config_value?.dkd_supabase_anon_key || '').trim();
    if (!dkd_supabase_url_value || !dkd_anon_key_value) {
      throw new Error('support_function_env_missing');
    }
    const dkd_function_url_value = `${dkd_supabase_url_value.replace(/\/$/, '')}/functions/v1/send-market-support-message`;
    const dkd_access_token_value = dkd_market_state.dkd_session_value?.access_token || dkd_anon_key_value;
    const dkd_response_value = await fetch(dkd_function_url_value, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: dkd_anon_key_value,
        Authorization: `Bearer ${dkd_access_token_value}`,
      },
      body: JSON.stringify({
        dkd_name: dkd_support_payload_value.dkd_name_value,
        dkd_email: dkd_support_payload_value.dkd_email_value,
        dkd_phone: dkd_support_payload_value.dkd_phone_value,
        dkd_subject: dkd_support_payload_value.dkd_subject_value,
        dkd_order_number: dkd_support_payload_value.dkd_order_number_value,
        dkd_message: dkd_support_payload_value.dkd_message_value,
        dkd_attachment_name: dkd_support_payload_value.dkd_attachment_name_value,
        dkd_attachment_mime_type: dkd_support_payload_value.dkd_attachment_mime_type_value,
        dkd_attachment_data_url: dkd_support_payload_value.dkd_attachment_data_url_value,
      }),
    });
    const dkd_json_value = await dkd_response_value.json().catch(() => ({}));
    if (!dkd_response_value.ok || dkd_json_value?.ok === false) {
      throw new Error(dkd_json_value?.error || dkd_json_value?.message || `support_http_${dkd_response_value.status}`);
    }
    return dkd_json_value;
  }

  async function dkd_submit_support_message_value() {
    if (dkd_market_state.dkd_support_busy_value) return;
    const dkd_support_payload_value = dkd_collect_support_payload_value();
    if (dkd_support_payload_value.dkd_name_value.length < 2 || dkd_support_payload_value.dkd_email_value.length < 5 || dkd_support_payload_value.dkd_subject_value.length < 3 || dkd_support_payload_value.dkd_message_value.length < 5) {
      dkd_show_toast_value('Destek formunu eksiksiz doldur.', true);
      return;
    }
    dkd_market_state.dkd_support_busy_value = true;
    const dkd_submit_button_node_value = dkd_get_element_value('dkd_market_support_submit_button');
    const dkd_notice_node_value = dkd_get_element_value('dkd_market_support_notice');
    if (dkd_submit_button_node_value) dkd_submit_button_node_value.disabled = true;
    if (dkd_notice_node_value) dkd_notice_node_value.textContent = 'Mesaj gönderiliyor…';
    try {
      await dkd_send_support_edge_message_value(dkd_support_payload_value);
      if (dkd_notice_node_value) dkd_notice_node_value.textContent = 'Mesaj gönderildi. Yanıt draborneagle@gmail.com üzerinden takip edilecek.';
      dkd_show_toast_value('Destek mesajı gönderildi.');
      dkd_push_support_history_entry_value(dkd_support_payload_value, 'sent');
      const dkd_message_node_value = dkd_get_element_value('dkd_market_support_message');
      const dkd_subject_node_value = dkd_get_element_value('dkd_market_support_subject');
      const dkd_phone_node_value = dkd_get_element_value('dkd_market_support_phone');
      const dkd_order_node_value = dkd_get_element_value('dkd_market_support_order_number');
      if (dkd_message_node_value) dkd_message_node_value.value = '';
      if (dkd_subject_node_value) dkd_subject_node_value.value = '';
      if (dkd_phone_node_value) dkd_phone_node_value.value = '';
      if (dkd_order_node_value) dkd_order_node_value.value = '';
      dkd_reset_support_attachment_value();
    } catch (dkd_error_value) {
      if (dkd_notice_node_value) dkd_notice_node_value.textContent = 'Otomatik gönderim hazır değil. E-posta uygulaması açılıyor.';
      dkd_open_support_mailto_fallback_value(dkd_support_payload_value);
      dkd_push_support_history_entry_value(dkd_support_payload_value, 'mailto');
      dkd_show_toast_value('Destek formu e-posta uygulamasına yönlendirildi.', true);
    } finally {
      dkd_market_state.dkd_support_busy_value = false;
      if (dkd_submit_button_node_value) dkd_submit_button_node_value.disabled = false;
    }
  }

  function dkd_render_bottom_counter_value() {
    const dkd_counter_node_value = dkd_get_element_value('dkd_market_bottom_counter');
    if (!dkd_counter_node_value) return;
    dkd_counter_node_value.textContent = String(dkd_market_state.dkd_cart_items_value.length);
  }

  function dkd_sync_home_visibility_value() {
    const dkd_hero_node_value = dkd_get_element_value('dkd_market_hero_banner');
    const dkd_featured_node_value = dkd_get_element_value('dkd_market_featured_block');
    const dkd_package_node_value = dkd_get_element_value('dkd_market_package_block');
    const dkd_listing_node_value = dkd_get_element_value('dkd_market_listing_block');
    const dkd_business_node_value = dkd_get_element_value('dkd_market_business_block');
    const dkd_active_category_value = dkd_market_state.dkd_active_category_value;
    const dkd_is_all_value = dkd_active_category_value === 'all';
    if (dkd_hero_node_value) dkd_hero_node_value.hidden = true;
    if (dkd_featured_node_value) dkd_featured_node_value.hidden = !dkd_is_all_value;
    if (dkd_package_node_value) dkd_package_node_value.hidden = true;
    if (dkd_listing_node_value) dkd_listing_node_value.hidden = true;
    if (dkd_business_node_value) dkd_business_node_value.hidden = !(dkd_is_all_value || dkd_active_category_value === 'business');
  }

  function dkd_render_all_value() {
    dkd_render_wallet_strip_value();
    dkd_render_category_row_value();
    dkd_render_hero_banner_value();
    dkd_render_featured_grid_value();
    dkd_render_package_row_value();
    dkd_render_listing_stack_value();
    dkd_render_business_row_value();
    dkd_render_categories_page_value();
    dkd_sync_home_visibility_value();
    dkd_render_cart_drawer_value();
    dkd_render_detail_drawer_value();
    dkd_render_result_drawer_value();
    dkd_render_orders_drawer_value();
    dkd_render_account_card_value();
    dkd_render_bottom_counter_value();
    dkd_set_view_value(dkd_market_state.dkd_current_view_value);
  }

  function dkd_find_item_by_id_value(dkd_target_id_value) {
    const dkd_snapshot_value = dkd_get_normalized_snapshot_value();
    const dkd_all_values = [
      ...dkd_snapshot_value.dkd_featured_values,
      ...dkd_snapshot_value.dkd_package_values,
      ...dkd_snapshot_value.dkd_listing_values,
      ...dkd_snapshot_value.dkd_business_values,
    ];
    return dkd_all_values.find((dkd_item_value) => dkd_item_value.dkd_id_value === dkd_target_id_value) || null;
  }

  function dkd_add_to_cart_value(dkd_target_id_value) {
    const dkd_item_value = dkd_find_item_by_id_value(dkd_target_id_value);
    if (!dkd_item_value) {
      dkd_show_toast_value('Ürün bulunamadı.', true);
      return;
    }
    if (dkd_item_value.dkd_source_kind_value !== 'business') {
      dkd_show_toast_value('Token paketleri ve pazar ilanları web markette şimdilik kapalı.', true);
      return;
    }
    const dkd_next_cart_item_value = dkd_clone_market_item_value(dkd_item_value);
    if (dkd_next_cart_item_value?.dkd_source_kind_value === 'business') {
      dkd_next_cart_item_value.dkd_delivery_address_text_value = dkd_market_state.dkd_business_delivery_form_value.dkd_address_text_value || '';
      dkd_next_cart_item_value.dkd_delivery_note_text_value = dkd_market_state.dkd_business_delivery_form_value.dkd_note_text_value || '';
    }
    dkd_market_state.dkd_cart_items_value.push(dkd_next_cart_item_value);
    dkd_render_cart_drawer_value();
    dkd_render_bottom_counter_value();
    dkd_show_toast_value(`${dkd_item_value.dkd_name_value} sepete eklendi.`);
  }

  function dkd_remove_from_cart_value(dkd_target_id_value) {
    const dkd_target_index_value = dkd_market_state.dkd_cart_items_value.findIndex(
      (dkd_item_value) => dkd_item_value.dkd_id_value === dkd_target_id_value,
    );
    if (dkd_target_index_value < 0) return;
    dkd_market_state.dkd_cart_items_value.splice(dkd_target_index_value, 1);
    dkd_render_cart_drawer_value();
    dkd_render_bottom_counter_value();
  }


  function dkd_build_delivery_payload_value(dkd_item_value) {
    if (dkd_item_value?.dkd_source_kind_value !== 'business') {
      return {
        dkd_address_text_value: null,
        dkd_note_text_value: null,
        dkd_delivery_lat_value: null,
        dkd_delivery_lng_value: null,
      };
    }
    const dkd_address_text_value = String(dkd_item_value.dkd_delivery_address_text_value || '').trim() || null;
    const dkd_note_text_value = String(dkd_item_value.dkd_delivery_note_text_value || '').trim() || null;
    if (!dkd_address_text_value) {
      throw new Error('İşletme ürünü için teslimat adresi girmelisin.');
    }
    return {
      dkd_address_text_value,
      dkd_note_text_value,
      dkd_delivery_lat_value: null,
      dkd_delivery_lng_value: null,
    };
  }


  async function dkd_refresh_business_product_row_value(dkd_product_id_value) {
    if (!dkd_market_state.dkd_supabase_client_value || !dkd_product_id_value) return null;
    const dkd_result_value = await dkd_market_state.dkd_supabase_client_value
      .from('dkd_business_products')
      .select('id, business_id, title, description, category, image_url, price_token, price_cash, currency_code, stock, is_active, sort_order, delivery_fee_tl, dkd_businesses(name, category, address_text, lat, lng)')
      .eq('id', dkd_product_id_value)
      .maybeSingle();
    if (dkd_result_value.error || !dkd_result_value.data) return null;
    return dkd_result_value.data;
  }

  async function dkd_prepare_business_item_for_purchase_value(dkd_item_value) {
    const dkd_product_id_value = Number(dkd_item_value?.dkd_business_product_id_value || 0);
    if (!dkd_product_id_value) return dkd_item_value;
    const dkd_live_row_value = await dkd_refresh_business_product_row_value(dkd_product_id_value);
    if (!dkd_live_row_value) return dkd_item_value;
    if (dkd_live_row_value.is_active === false) {
      throw new Error('Ürün şu an vitrinde bulunamadı.');
    }
    if (Number(dkd_live_row_value.stock || 0) <= 0) {
      throw new Error('Stok şu an yeterli değil.');
    }
    const dkd_live_item_value = dkd_normalize_business_values([{
      id: dkd_live_row_value.id,
      business_id: dkd_live_row_value.business_id,
      title: dkd_live_row_value.title,
      description: dkd_live_row_value.description,
      category: dkd_live_row_value.category,
      image_url: dkd_live_row_value.image_url,
      price_token: dkd_live_row_value.price_token,
      price_cash: dkd_live_row_value.price_cash,
      currency_code: dkd_live_row_value.currency_code,
      stock: dkd_live_row_value.stock,
      delivery_fee_tl: dkd_live_row_value.delivery_fee_tl,
      sort_order: dkd_live_row_value.sort_order,
      business_name: dkd_live_row_value.dkd_businesses?.name || dkd_item_value?.dkd_business_name_value || '',
      business_category: dkd_live_row_value.dkd_businesses?.category || '',
      business_address_text: dkd_live_row_value.dkd_businesses?.address_text || '',
      business_lat: dkd_live_row_value.dkd_businesses?.lat ?? null,
      business_lng: dkd_live_row_value.dkd_businesses?.lng ?? null,
    }])[0];
    dkd_live_item_value.dkd_delivery_address_text_value = dkd_item_value?.dkd_delivery_address_text_value || '';
    dkd_live_item_value.dkd_delivery_note_text_value = dkd_item_value?.dkd_delivery_note_text_value || '';
    return dkd_live_item_value;
  }

  function dkd_create_purchase_result_value(dkd_input_value = {}) {
    return {
      dkd_title_value: dkd_input_value.dkd_title_value || 'Satın alma tamamlandı',
      dkd_text_value: dkd_input_value.dkd_text_value || 'İşlem sonucu hazır.',
      dkd_success_count_value: Number(dkd_input_value.dkd_success_count_value || 0),
      dkd_spent_token_value: Number(dkd_input_value.dkd_spent_token_value || 0),
      dkd_total_price_tl_value: Number(dkd_input_value.dkd_total_price_tl_value || 0),
      dkd_payment_method_value: String(dkd_input_value.dkd_payment_method_value || 'cash_on_delivery'),
      dkd_success_items_value: Array.isArray(dkd_input_value.dkd_success_items_value) ? dkd_input_value.dkd_success_items_value : [],
      dkd_failed_items_value: Array.isArray(dkd_input_value.dkd_failed_items_value) ? dkd_input_value.dkd_failed_items_value : [],
      dkd_delivery_address_text_value: dkd_input_value.dkd_delivery_address_text_value || null,
      dkd_delivery_note_text_value: dkd_input_value.dkd_delivery_note_text_value || null,
      dkd_wallet_after_value: dkd_market_state.dkd_wallet_snapshot_value,
    };
  }


  async function dkd_run_market_purchase_value(dkd_item_value, dkd_payment_method_value = 'cash_on_delivery') {
    if (!dkd_market_state.dkd_supabase_client_value || !dkd_market_state.dkd_session_value?.user?.id) {
      dkd_set_drawer_visibility_value('account', true);
      dkd_set_bottom_active_value('account');
      throw new Error('Kapıda ödeme siparişi için önce giriş yapmalısın.');
    }

    if (dkd_item_value.dkd_source_kind_value !== 'business') {
      throw new Error('Web markette şimdilik sadece TL fiyatlı işletme ürünleri satılıyor.');
    }

    if (dkd_payment_method_value !== 'cash_on_delivery') {
      throw new Error('Şimdilik kapıda nakit ödeme seç.');
    }

    const dkd_fresh_business_item_value = await dkd_prepare_business_item_for_purchase_value(dkd_item_value);
    const dkd_product_id_value = Number(dkd_fresh_business_item_value.dkd_business_product_id_value || 0);
    const dkd_delivery_payload_value = dkd_build_delivery_payload_value(dkd_fresh_business_item_value);
    const dkd_product_key_value = String(
      dkd_fresh_business_item_value.dkd_business_product_key_value
      || dkd_fresh_business_item_value.dkd_business_product_token_value
      || dkd_product_id_value
      || ''
    ).replace(/^merchant_product:/, '').trim();
    const dkd_result_value = await dkd_market_state.dkd_supabase_client_value.rpc('dkd_business_product_order_cash_on_delivery_dkd', {
      dkd_param_product_key: dkd_product_key_value || null,
      dkd_param_quantity: 1,
      dkd_param_delivery_address_text: dkd_delivery_payload_value.dkd_address_text_value,
      dkd_param_delivery_note: dkd_delivery_payload_value.dkd_note_text_value,
      dkd_param_delivery_lat: dkd_delivery_payload_value.dkd_delivery_lat_value,
      dkd_param_delivery_lng: dkd_delivery_payload_value.dkd_delivery_lng_value,
    });
    if (dkd_result_value?.error) {
      const dkd_message_value = String(dkd_result_value.error.message || '');
      if (dkd_message_value.toLowerCase().includes('could not find the function') || dkd_message_value.toLowerCase().includes('schema cache')) {
        throw new Error('Kapıda nakit ödeme SQL dosyasını Supabase üzerinde çalıştırmalısın.');
      }
      throw dkd_result_value.error;
    }
    if (dkd_result_value.data?.ok === false) throw new Error(dkd_humanize_error_message_value(dkd_result_value.data?.reason || 'İşletme ürünü satın alınamadı.'));
    return dkd_result_value.data;
  }

  async function dkd_purchase_single_item_value(dkd_item_value, dkd_options_value = {}) {
    if (!dkd_item_value) return;
    if (dkd_market_state.dkd_purchase_busy_value) return;
    dkd_market_state.dkd_purchase_busy_value = true;
    dkd_render_detail_drawer_value();
    try {
      const dkd_purchase_response_value = await dkd_run_market_purchase_value(dkd_item_value, 'cash_on_delivery');
      if (dkd_item_value?.dkd_source_kind_value === 'business') {
        dkd_push_local_order_history_entry_value(dkd_item_value, dkd_purchase_response_value);
      }
      if (dkd_options_value.dkd_remove_from_cart_value) {
        dkd_remove_from_cart_value(dkd_item_value.dkd_id_value);
      }
      await dkd_load_public_snapshot_value();
      await dkd_load_wallet_snapshot_value();
      await dkd_load_order_history_value();
      await dkd_load_remote_support_history_value();
      dkd_market_state.dkd_purchase_result_value = dkd_create_purchase_result_value({
        dkd_title_value: 'Kapıda nakit ödeme seçildi',
        dkd_text_value: `${dkd_item_value.dkd_name_value} siparişi oluşturuldu. Ödeme teslimatta nakit alınacak.`,
        dkd_success_count_value: 1,
        dkd_spent_token_value: 0,
        dkd_total_price_tl_value: Number(dkd_purchase_response_value?.total_price_tl ?? dkd_resolve_tl_price_value(dkd_item_value)),
        dkd_payment_method_value: 'cash_on_delivery',
        dkd_success_items_value: [dkd_item_value.dkd_name_value],
        dkd_failed_items_value: [],
        dkd_delivery_address_text_value: dkd_item_value.dkd_delivery_address_text_value || null,
        dkd_delivery_note_text_value: dkd_item_value.dkd_delivery_note_text_value || null,
      });
      dkd_market_state.dkd_detail_item_value = dkd_find_item_by_id_value(dkd_item_value.dkd_id_value) || { ...dkd_item_value, dkd_stock_label_value: 'Sipariş alındı' };
      dkd_show_toast_value(`${dkd_item_value.dkd_name_value} siparişi oluşturuldu.`);
      dkd_render_all_value();
      dkd_render_result_drawer_value();
      dkd_set_drawer_visibility_value('result', true);
    } finally {
      dkd_market_state.dkd_purchase_busy_value = false;
      dkd_render_detail_drawer_value();
    }
  }

  function dkd_open_payment_choice_value(dkd_mode_value, dkd_item_values, dkd_options_value = {}) {
    const dkd_safe_values = (Array.isArray(dkd_item_values) ? dkd_item_values : []).filter(Boolean);
    if (!dkd_safe_values.length) {
      dkd_show_toast_value('Ödeme için ürün bulunamadı.', true);
      return;
    }
    const dkd_blocked_values = dkd_safe_values.filter((dkd_item_value) => dkd_item_value?.dkd_source_kind_value !== 'business');
    if (dkd_blocked_values.length) {
      dkd_show_toast_value('Token paketleri ve pazar ilanları web markette şimdilik kapalı.', true);
      return;
    }
    dkd_market_state.dkd_pending_payment_mode_value = dkd_mode_value === 'cart' ? 'cart' : 'single';
    dkd_market_state.dkd_pending_purchase_item_value = dkd_safe_values[0] || null;
    dkd_market_state.dkd_pending_purchase_options_value = dkd_options_value || {};
    dkd_market_state.dkd_pending_cart_checkout_values = dkd_safe_values;
    dkd_render_payment_drawer_value();
    dkd_set_drawer_visibility_value('payment', true);
  }

  function dkd_render_payment_drawer_value() {
    const dkd_payment_node_value = dkd_get_element_value('dkd_market_payment_body');
    const dkd_cash_button_node_value = dkd_get_element_value('dkd_market_payment_cash_button');
    const dkd_card_button_node_value = dkd_get_element_value('dkd_market_payment_card_button');
    if (!dkd_payment_node_value) return;
    const dkd_item_values = dkd_market_state.dkd_pending_payment_mode_value === 'cart'
      ? dkd_market_state.dkd_pending_cart_checkout_values
      : [dkd_market_state.dkd_pending_purchase_item_value].filter(Boolean);
    const dkd_total_tl_value = dkd_item_values.reduce((dkd_total_value, dkd_item_value) => dkd_total_value + Number(dkd_resolve_tl_price_value(dkd_item_value) || 0), 0);
    if (dkd_cash_button_node_value) {
      dkd_cash_button_node_value.disabled = dkd_market_state.dkd_purchase_busy_value;
      dkd_cash_button_node_value.textContent = dkd_market_state.dkd_purchase_busy_value ? 'Sipariş oluşturuluyor…' : 'Kapıda Nakit Öde';
    }
    if (dkd_card_button_node_value) {
      dkd_card_button_node_value.disabled = dkd_market_state.dkd_purchase_busy_value;
    }
    dkd_payment_node_value.innerHTML = `
      <section class="dkd_market_payment_choice_card">
        <div class="dkd_market_payment_choice_icon">₺</div>
        <div class="dkd_market_payment_choice_copy">
          <h4>Ödeme yöntemini seç</h4>
        </div>
      </section>
      <section class="dkd_market_payment_total_card">
        <span>Ödenecek TL Tutarı</span>
        <strong>${dkd_format_money_value(dkd_total_tl_value)}</strong>
      </section>
      <div class="dkd_market_payment_item_list">
        ${dkd_item_values.map((dkd_item_value) => `
          <div class="dkd_market_payment_item_row">
            <span>${dkd_escape_html_value(dkd_item_value.dkd_name_value || 'Ürün')}</span>
            <strong>${dkd_format_money_value(dkd_resolve_tl_price_value(dkd_item_value))}</strong>
          </div>
        `).join('')}
      </div>
      <section class="dkd_market_payment_cash_notice">
        <strong>Kapıda Nakit Ödeme</strong>
      </section>
    `;
  }

  async function dkd_confirm_cash_payment_value() {
    if (dkd_market_state.dkd_pending_payment_mode_value === 'cart') {
      await dkd_checkout_cart_value();
      return;
    }
    const dkd_item_value = dkd_market_state.dkd_pending_purchase_item_value;
    if (!dkd_item_value) {
      dkd_show_toast_value('Ödeme için ürün bulunamadı.', true);
      return;
    }
    await dkd_purchase_single_item_value(dkd_item_value, dkd_market_state.dkd_pending_purchase_options_value || {});
    dkd_set_drawer_visibility_value('payment', false);
    dkd_set_drawer_visibility_value('detail', false);
  }

  async function dkd_checkout_cart_value() {
    if (!dkd_market_state.dkd_cart_items_value.length && dkd_market_state.dkd_pending_payment_mode_value !== 'cart') {
      dkd_show_toast_value('Sepetin şu an boş.', true);
      return;
    }
    if (!dkd_market_state.dkd_supabase_client_value || !dkd_market_state.dkd_session_value?.user?.id) {
      dkd_set_drawer_visibility_value('account', true);
      dkd_set_bottom_active_value('account');
      dkd_show_toast_value('Kapıda ödeme siparişi için giriş yapmalısın.', true);
      return;
    }
    if (dkd_market_state.dkd_purchase_busy_value) return;

    dkd_market_state.dkd_purchase_busy_value = true;
    dkd_render_payment_drawer_value();
    dkd_render_detail_drawer_value();
    const dkd_success_values = [];
    const dkd_success_id_values = [];
    const dkd_fail_values = [];
    const dkd_cart_snapshot_values = dkd_market_state.dkd_pending_payment_mode_value === 'cart' && dkd_market_state.dkd_pending_cart_checkout_values.length
      ? [...dkd_market_state.dkd_pending_cart_checkout_values]
      : [...dkd_market_state.dkd_cart_items_value];
    try {
      for (const dkd_item_value of dkd_cart_snapshot_values) {
        try {
          const dkd_purchase_response_value = await dkd_run_market_purchase_value(dkd_item_value, 'cash_on_delivery');
          dkd_push_local_order_history_entry_value(dkd_item_value, dkd_purchase_response_value);
          dkd_success_values.push(dkd_item_value.dkd_name_value);
          dkd_success_id_values.push(dkd_item_value.dkd_id_value);
        } catch (dkd_error_value) {
          dkd_fail_values.push(`${dkd_item_value.dkd_name_value}: ${dkd_error_value.message || 'hata'}`);
        }
      }
      dkd_market_state.dkd_cart_items_value = dkd_market_state.dkd_cart_items_value.filter(
        (dkd_item_value) => !dkd_success_id_values.includes(dkd_item_value.dkd_id_value),
      );
      await dkd_load_public_snapshot_value();
      await dkd_load_wallet_snapshot_value();
      await dkd_load_order_history_value();
      const dkd_total_price_tl_value = dkd_cart_snapshot_values
        .filter((dkd_item_value) => dkd_success_id_values.includes(dkd_item_value.dkd_id_value))
        .reduce((dkd_total_value, dkd_item_value) => dkd_total_value + Number(dkd_resolve_tl_price_value(dkd_item_value) || 0), 0);
      dkd_market_state.dkd_purchase_result_value = dkd_create_purchase_result_value({
        dkd_title_value: dkd_success_values.length ? (dkd_fail_values.length ? 'Kapıda ödeme kısmen oluşturuldu' : 'Kapıda ödeme siparişleri oluşturuldu') : 'Satın alma başarısız',
        dkd_text_value: dkd_success_values.length
          ? `${dkd_success_values.length} ürün için kapıda nakit ödeme seçildi${dkd_fail_values.length ? `, ${dkd_fail_values.length} ürün beklemede kaldı.` : '.'}`
          : (dkd_fail_values[0] || 'Satın alma başarısız.'),
        dkd_success_count_value: dkd_success_values.length,
        dkd_spent_token_value: 0,
        dkd_total_price_tl_value,
        dkd_payment_method_value: 'cash_on_delivery',
        dkd_success_items_value: dkd_success_values,
        dkd_failed_items_value: dkd_fail_values,
      });
      if (dkd_success_values.length && !dkd_fail_values.length) {
        dkd_show_toast_value(`${dkd_success_values.length} ürün için kapıda ödeme oluşturuldu.`);
      } else if (dkd_success_values.length && dkd_fail_values.length) {
        dkd_show_toast_value(`${dkd_success_values.length} ürün oluşturuldu, ${dkd_fail_values.length} ürün kaldı.`, true);
      } else {
        dkd_show_toast_value(dkd_fail_values[0] || 'Satın alma başarısız.', true);
      }
      dkd_market_state.dkd_pending_cart_checkout_values = [];
      dkd_render_all_value();
      dkd_render_payment_drawer_value();
      dkd_render_result_drawer_value();
      dkd_set_drawer_visibility_value('payment', false);
      dkd_set_drawer_visibility_value('result', true);
    } finally {
      dkd_market_state.dkd_purchase_busy_value = false;
      dkd_render_payment_drawer_value();
      dkd_render_detail_drawer_value();
    }
  }

  function dkd_set_drawer_visibility_value(dkd_drawer_key_value, dkd_is_visible_value) {
    const dkd_drawer_id_map_value = {
      cart: 'dkd_market_cart_drawer',
      account: 'dkd_market_account_drawer',
      detail: 'dkd_market_detail_drawer',
      payment: 'dkd_market_payment_drawer',
      result: 'dkd_market_result_drawer',
      orders: 'dkd_market_orders_drawer',
    };
    const dkd_drawer_node_value = dkd_get_element_value(dkd_drawer_id_map_value[dkd_drawer_key_value]);
    if (!dkd_drawer_node_value) return;
    dkd_drawer_node_value.hidden = !dkd_is_visible_value;
  }

  function dkd_set_bottom_active_value(dkd_action_key_value) {
    document.querySelectorAll('[data-dkd-bottom-action]').forEach((dkd_button_node_value) => {
      const dkd_is_active_value = dkd_button_node_value.getAttribute('data-dkd-bottom-action') === dkd_action_key_value;
      dkd_button_node_value.classList.toggle('dkd_market_bottom_button_active', dkd_is_active_value);
    });
  }

  function dkd_handle_document_click_value(dkd_click_event_value) {
    const dkd_profile_avatar_pick_node_value = dkd_click_event_value.target.closest('#dkd_market_profile_avatar_pick_button, #dkd_market_profile_avatar_pick_button_overlay');
    if (dkd_profile_avatar_pick_node_value) {
      dkd_get_element_value('dkd_market_profile_avatar_file')?.click();
      return;
    }

    const dkd_profile_save_node_value = dkd_click_event_value.target.closest('#dkd_market_profile_save_button');
    if (dkd_profile_save_node_value) {
      dkd_save_profile_from_account_value();
      return;
    }

    const dkd_business_panel_action_node_value = dkd_click_event_value.target.closest('[data-dkd-business-panel-action="open"]');
    if (dkd_business_panel_action_node_value) {
      dkd_open_business_panel_from_filter_value();
      return;
    }
    const dkd_category_button_node_value = dkd_click_event_value.target.closest('[data-dkd-category]');
    if (dkd_category_button_node_value) {
      const dkd_selected_category_value = dkd_category_button_node_value.getAttribute('data-dkd-category') || 'all';
      if (dkd_selected_category_value === 'courier_cargo') {
        const dkd_courier_button_node_value = document.querySelector('[data-dkd-bottom-action="courier_cargo"]');
        if (dkd_courier_button_node_value) {
          dkd_courier_button_node_value.click();
        } else {
          dkd_show_toast_value('Kargo Oluştur alanı yükleniyor. Alt menüden Kurye/Kargo seçebilirsin.');
        }
        return;
      }
      if (dkd_selected_category_value === 'business_panel') {
        dkd_open_business_panel_from_filter_value();
        return;
      }
      if (dkd_selected_category_value === 'all') {
        dkd_market_state.dkd_active_category_value = 'all';
        dkd_market_state.dkd_categories_panel_value = 'business';
        dkd_market_state.dkd_current_view_value = 'categories';
        dkd_render_all_value();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      dkd_market_state.dkd_active_category_value = dkd_selected_category_value;
      if (dkd_market_state.dkd_active_category_value === 'business') dkd_market_state.dkd_categories_panel_value = 'business';
      dkd_market_state.dkd_current_view_value = 'home';
      dkd_render_all_value();
      return;
    }

    const dkd_categories_panel_node_value = dkd_click_event_value.target.closest('[data-dkd-categories-panel]');
    if (dkd_categories_panel_node_value) {
      dkd_market_state.dkd_categories_panel_value = dkd_categories_panel_node_value.getAttribute('data-dkd-categories-panel') || 'business';
      if (dkd_market_state.dkd_categories_panel_value !== 'business') {
        dkd_market_state.dkd_selected_business_name_value = 'all';
      }
      dkd_market_state.dkd_current_view_value = 'categories';
      dkd_render_all_value();
      return;
    }

    const dkd_business_name_node_value = dkd_click_event_value.target.closest('[data-dkd-business-name]');
    if (dkd_business_name_node_value) {
      dkd_market_state.dkd_selected_business_name_value = dkd_business_name_node_value.getAttribute('data-dkd-business-name') || 'all';
      dkd_market_state.dkd_current_view_value = 'categories';
      dkd_render_categories_page_value();
      return;
    }

    const dkd_go_home_brand_node_value = dkd_click_event_value.target.closest('.dkd_market_brand_block');
    if (dkd_go_home_brand_node_value) {
      dkd_market_state.dkd_current_view_value = 'home';
      dkd_render_all_value();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const dkd_open_support_node_value = dkd_click_event_value.target.closest('[data-dkd-open-support]');
    if (dkd_open_support_node_value) {
      dkd_prefill_support_form_value();
      dkd_set_view_value('support');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const dkd_buy_button_node_value = dkd_click_event_value.target.closest('[data-dkd-buy-id]');
    if (dkd_buy_button_node_value) {
      dkd_add_to_cart_value(dkd_buy_button_node_value.getAttribute('data-dkd-buy-id'));
      return;
    }

    const dkd_remove_button_node_value = dkd_click_event_value.target.closest('[data-dkd-remove-id]');
    if (dkd_remove_button_node_value) {
      dkd_remove_from_cart_value(dkd_remove_button_node_value.getAttribute('data-dkd-remove-id'));
      return;
    }

    const dkd_close_drawer_node_value = dkd_click_event_value.target.closest('[data-dkd-close-drawer]');
    if (dkd_close_drawer_node_value) {
      dkd_set_drawer_visibility_value(dkd_close_drawer_node_value.getAttribute('data-dkd-close-drawer'), false);
      return;
    }

    const dkd_open_drawer_node_value = dkd_click_event_value.target.closest('[data-dkd-open-drawer]');
    if (dkd_open_drawer_node_value) {
      const dkd_drawer_key_value = dkd_open_drawer_node_value.getAttribute('data-dkd-open-drawer');
      if (dkd_drawer_key_value === 'orders' && dkd_market_state.dkd_session_value?.user?.id) {
        dkd_render_orders_drawer_value();
        dkd_load_order_history_value().then(() => {
          dkd_render_orders_drawer_value();
          dkd_render_account_card_value();
        });
      }
      if (dkd_drawer_key_value === 'account' && dkd_market_state.dkd_session_value?.user?.id) {
        dkd_render_account_card_value();
        Promise.all([dkd_load_wallet_snapshot_value(), dkd_load_order_history_value()]).then(() => {
          dkd_render_wallet_strip_value();
          dkd_render_account_card_value();
          dkd_render_orders_drawer_value();
        });
      }
      dkd_set_drawer_visibility_value(dkd_drawer_key_value, true);
      return;
    }

    if (dkd_click_event_value.target?.id === 'dkd_market_wallet_refresh_button') {
      Promise.all([dkd_load_wallet_snapshot_value(), dkd_load_order_history_value()]).then(() => {
        dkd_render_wallet_strip_value();
        dkd_render_result_drawer_value();
        dkd_render_orders_drawer_value();
        dkd_render_account_card_value();
        dkd_show_toast_value('Cüzdan ve sipariş özeti yenilendi.');
      });
      return;
    }

    const dkd_open_detail_node_value = dkd_click_event_value.target.closest('[data-dkd-open-detail]');
    if (dkd_open_detail_node_value) {
      dkd_open_detail_drawer_value(dkd_open_detail_node_value.getAttribute('data-dkd-open-detail'));
      return;
    }

    const dkd_hero_dot_node_value = dkd_click_event_value.target.closest('[data-dkd-hero-dot]');
    if (dkd_hero_dot_node_value) {
      dkd_market_state.dkd_carousel_index_value = Number(dkd_hero_dot_node_value.getAttribute('data-dkd-hero-dot') || 0);
      dkd_render_hero_banner_value();
      return;
    }

    const dkd_hero_action_node_value = dkd_click_event_value.target.closest('[data-dkd-hero-category]');
    if (dkd_hero_action_node_value) {
      const dkd_category_value = dkd_hero_action_node_value.getAttribute('data-dkd-hero-category') || 'all';
      dkd_market_state.dkd_active_category_value = dkd_category_value;
      dkd_market_state.dkd_categories_panel_value = 'business';
      dkd_market_state.dkd_current_view_value = 'categories';
      dkd_render_all_value();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const dkd_nav_target_node_value = dkd_click_event_value.target.closest('[data-dkd-nav-target]');
    if (dkd_nav_target_node_value) {
      const dkd_nav_target_value = dkd_nav_target_node_value.getAttribute('data-dkd-nav-target');
      const dkd_panel_map_value = {
        featured: 'business',
        packages: 'business',
        listings: 'business',
        business: 'business',
      };
      dkd_market_state.dkd_categories_panel_value = dkd_panel_map_value[dkd_nav_target_value] || 'business';
      dkd_market_state.dkd_current_view_value = 'categories';
      dkd_render_all_value();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const dkd_bottom_action_node_value = dkd_click_event_value.target.closest('[data-dkd-bottom-action]');
    if (dkd_bottom_action_node_value) {
      const dkd_bottom_action_value = dkd_bottom_action_node_value.getAttribute('data-dkd-bottom-action');
      if (dkd_bottom_action_value === 'home') {
        dkd_market_state.dkd_current_view_value = 'home';
        dkd_render_all_value();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (dkd_bottom_action_value === 'categories') {
        dkd_market_state.dkd_categories_panel_value = 'business';
        dkd_market_state.dkd_current_view_value = 'categories';
        dkd_render_all_value();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (dkd_bottom_action_value === 'cart') {
        dkd_set_drawer_visibility_value('cart', true);
        dkd_set_bottom_active_value('cart');
        return;
      }
      if (dkd_bottom_action_value === 'account') {
        dkd_render_account_card_value();
        dkd_set_drawer_visibility_value('account', true);
        dkd_set_bottom_active_value('account');
        if (dkd_market_state.dkd_session_value?.user?.id) {
          Promise.all([dkd_load_wallet_snapshot_value(), dkd_load_order_history_value()]).then(() => {
            dkd_render_wallet_strip_value();
            dkd_render_account_card_value();
            dkd_render_orders_drawer_value();
          });
        }
      }
    }
  }


  async function dkd_register_account_from_drawer_value() {
    if (!dkd_market_state.dkd_supabase_client_value) {
      dkd_show_toast_value('Canlı kayıt için Supabase ayarlarını yüklemelisin.', true);
      return;
    }
    const dkd_email_value = String(dkd_get_element_value('dkd_market_login_email')?.value || '').trim();
    const dkd_password_value = String(dkd_get_element_value('dkd_market_login_password')?.value || '');
    const dkd_register_button_node_value = dkd_get_element_value('dkd_market_account_register_button');
    if (!dkd_email_value || !dkd_password_value) {
      dkd_show_toast_value('Kayıt için e-posta ve şifre gir.', true);
      return;
    }
    if (dkd_password_value.length < 6) {
      dkd_show_toast_value('Şifre en az 6 karakter olmalı.', true);
      return;
    }
    try {
      if (dkd_register_button_node_value) {
        dkd_register_button_node_value.disabled = true;
        dkd_register_button_node_value.textContent = 'Kayıt açılıyor...';
      }
      const dkd_signup_result_value = await dkd_market_state.dkd_supabase_client_value.auth.signUp({
        email: dkd_email_value,
        password: dkd_password_value,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      if (dkd_signup_result_value.error) throw dkd_signup_result_value.error;
      let dkd_session_value = dkd_signup_result_value.data?.session || null;
      if (!dkd_session_value) {
        const dkd_login_result_value = await dkd_market_state.dkd_supabase_client_value.auth.signInWithPassword({
          email: dkd_email_value,
          password: dkd_password_value,
        });
        if (dkd_login_result_value.error) {
          dkd_show_toast_value('Kayıt alındı; Supabase e-posta onayı açıksa Dashboard üzerinden Email Confirm kapatılmalı.', true);
          return;
        }
        dkd_session_value = dkd_login_result_value.data?.session || null;
      }
      dkd_market_state.dkd_session_value = dkd_session_value;
      await dkd_load_wallet_snapshot_value();
        await dkd_load_order_history_value();
        await dkd_load_business_owner_status_value();
        dkd_render_account_card_value();
      dkd_render_wallet_strip_value();
      dkd_render_orders_drawer_value();
      dkd_show_toast_value('Kayıt başarılı. Ana sayfa açıldı.');
      dkd_set_drawer_visibility_value('account', false);
      dkd_set_bottom_active_value('home');
      dkd_market_state.dkd_current_view_value = 'home';
      dkd_render_all_value();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (dkd_error_value) {
      dkd_show_toast_value(dkd_error_value.message || 'Kayıt başarısız.', true);
    } finally {
      if (dkd_register_button_node_value) {
        dkd_register_button_node_value.disabled = false;
        dkd_register_button_node_value.textContent = 'Kayıt Ol';
      }
    }
  }

  function dkd_bind_event_listeners_value() {
    document.addEventListener('click', dkd_handle_document_click_value);
    dkd_get_element_value('dkd_market_search_input')?.addEventListener('input', (dkd_input_event_value) => {
      dkd_market_state.dkd_search_value = dkd_input_event_value.target.value || '';
      dkd_render_all_value();
    });

    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState !== 'visible' || !dkd_market_state.dkd_session_value?.user?.id) return;
      await dkd_load_wallet_snapshot_value();
      await dkd_load_order_history_value();
      await dkd_load_remote_support_history_value();
      dkd_render_wallet_strip_value();
      dkd_render_account_card_value();
      dkd_render_orders_drawer_value();
    });

    window.addEventListener('focus', async () => {
      if (!dkd_market_state.dkd_session_value?.user?.id) return;
      await dkd_load_wallet_snapshot_value();
      await dkd_load_order_history_value();
      await dkd_load_remote_support_history_value();
      dkd_render_wallet_strip_value();
      dkd_render_account_card_value();
      dkd_render_orders_drawer_value();
    });

    document.addEventListener('input', (dkd_input_event_value) => {
      if (dkd_input_event_value.target?.id === 'dkd_market_detail_delivery_address') {
        dkd_market_state.dkd_business_delivery_form_value.dkd_address_text_value = dkd_input_event_value.target.value || '';
      }
      if (dkd_input_event_value.target?.id === 'dkd_market_detail_delivery_note') {
        dkd_market_state.dkd_business_delivery_form_value.dkd_note_text_value = dkd_input_event_value.target.value || '';
      }
    });

    dkd_get_element_value('dkd_market_support_form')?.addEventListener('submit', async (dkd_submit_event_value) => {
      dkd_submit_event_value.preventDefault();
      await dkd_submit_support_message_value();
    });

    dkd_get_element_value('dkd_market_support_attachment')?.addEventListener('change', async (dkd_change_event_value) => {
      const dkd_file_value = dkd_change_event_value.target?.files?.[0] || null;
      await dkd_handle_support_attachment_change_value(dkd_file_value);
    });

    dkd_get_element_value('dkd_market_support_history_clear_button')?.addEventListener('click', async () => {
      await dkd_clear_support_history_value();
      dkd_show_toast_value('Yerel destek geçmişi temizlendi.');
    });

    dkd_get_element_value('dkd_market_support_cancel_button')?.addEventListener('click', () => {
      dkd_set_view_value('home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    dkd_get_element_value('dkd_market_checkout_button')?.addEventListener('click', () => {
      dkd_open_payment_choice_value('cart', [...dkd_market_state.dkd_cart_items_value]);
    });

    dkd_get_element_value('dkd_market_payment_cancel_button')?.addEventListener('click', () => {
      dkd_set_drawer_visibility_value('payment', false);
    });

    dkd_get_element_value('dkd_market_payment_cash_button')?.addEventListener('click', async () => {
      try {
        await dkd_confirm_cash_payment_value();
      } catch (dkd_error_value) {
        dkd_show_toast_value(dkd_error_value.message || 'Kapıda ödeme oluşturulamadı.', true);
      }
    });

    dkd_get_element_value('dkd_market_payment_card_button')?.addEventListener('click', () => {
      dkd_show_toast_value('Kart ile ödeme çok yakında aktif olacak.');
    });

    dkd_get_element_value('dkd_market_login_form')?.addEventListener('submit', async (dkd_submit_event_value) => {
      dkd_submit_event_value.preventDefault();
      if (!dkd_market_state.dkd_supabase_client_value) {
        dkd_show_toast_value('Canlı giriş için Supabase ayarlarını yüklemelisin.', true);
        return;
      }
      const dkd_email_value = dkd_get_element_value('dkd_market_login_email')?.value || '';
      const dkd_password_value = dkd_get_element_value('dkd_market_login_password')?.value || '';
      try {
        const dkd_result_value = await dkd_market_state.dkd_supabase_client_value.auth.signInWithPassword({
          email: dkd_email_value,
          password: dkd_password_value,
        });
        if (dkd_result_value.error) throw dkd_result_value.error;
        dkd_market_state.dkd_session_value = dkd_result_value.data?.session || null;
        dkd_market_state.dkd_order_history_values = [];
        dkd_market_state.dkd_order_timeline_map_value = {};
        await dkd_load_wallet_snapshot_value();
        await dkd_load_order_history_value();
        await dkd_load_business_owner_status_value();
        dkd_render_account_card_value();
        dkd_render_wallet_strip_value();
        dkd_render_orders_drawer_value();
        dkd_show_toast_value('Giriş başarılı.');
      } catch (dkd_error_value) {
        dkd_show_toast_value(dkd_error_value.message || 'Giriş başarısız.', true);
      }
    });


    dkd_get_element_value('dkd_market_account_register_button')?.addEventListener('click', async () => {
      await dkd_register_account_from_drawer_value();
    });

    dkd_get_element_value('dkd_market_sign_out_button')?.addEventListener('click', async () => {
      if (!dkd_market_state.dkd_supabase_client_value) return;
      await dkd_market_state.dkd_supabase_client_value.auth.signOut();
      dkd_market_state.dkd_session_value = null;
      dkd_market_state.dkd_wallet_snapshot_value = null;
      dkd_market_state.dkd_order_history_values = [];
      dkd_reset_business_owner_status_value();
      dkd_teardown_profile_sync_value();
      dkd_teardown_order_sync_value();
      dkd_teardown_order_timeline_sync_value();
      dkd_stop_session_polling_value();
      dkd_render_account_card_value();
      dkd_render_wallet_strip_value();
      dkd_render_orders_drawer_value();
      dkd_show_toast_value('Çıkış yapıldı.');
    });

    dkd_get_element_value('dkd_market_detail_add_button')?.addEventListener('click', () => {
      const dkd_target_id_value = dkd_market_state.dkd_detail_item_value?.dkd_id_value;
      if (!dkd_target_id_value) return;
      dkd_add_to_cart_value(dkd_target_id_value);
    });

    dkd_get_element_value('dkd_market_detail_buy_button')?.addEventListener('click', () => {
      const dkd_item_value = dkd_market_state.dkd_detail_item_value;
      if (!dkd_item_value) return;
      const dkd_purchase_item_value = dkd_clone_market_item_value(dkd_item_value);
      if (dkd_purchase_item_value?.dkd_source_kind_value === 'business') {
        dkd_purchase_item_value.dkd_delivery_address_text_value = dkd_market_state.dkd_business_delivery_form_value.dkd_address_text_value || '';
        dkd_purchase_item_value.dkd_delivery_note_text_value = dkd_market_state.dkd_business_delivery_form_value.dkd_note_text_value || '';
      }
      dkd_open_payment_choice_value('single', [dkd_purchase_item_value]);
    });

    dkd_get_element_value('dkd_market_result_primary_button')?.addEventListener('click', () => {
      dkd_set_drawer_visibility_value('result', false);
      dkd_set_bottom_active_value('home');
    });

    dkd_get_element_value('dkd_market_result_secondary_button')?.addEventListener('click', () => {
      if (dkd_market_state.dkd_purchase_result_value?.dkd_failed_items_value?.length) {
        dkd_set_drawer_visibility_value('result', false);
        dkd_set_drawer_visibility_value('cart', true);
        dkd_set_bottom_active_value('cart');
        return;
      }
      dkd_set_drawer_visibility_value('result', false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      dkd_set_bottom_active_value('home');
    });

    dkd_get_element_value('dkd_market_orders_refresh_button')?.addEventListener('click', async () => {
      await dkd_load_order_history_value();
      dkd_render_orders_drawer_value();
      dkd_render_account_card_value();
      dkd_show_toast_value('Sipariş geçmişi yenilendi.');
    });
  }

  async function dkd_load_public_snapshot_value() {
    if (!dkd_market_state.dkd_supabase_client_value) {
      dkd_market_state.dkd_public_snapshot_value = dkd_build_demo_snapshot_value();
      dkd_render_all_value();
      return;
    }

    try {
      const dkd_snapshot_result_value = await dkd_market_state.dkd_supabase_client_value.rpc('dkd_market_web_public_snapshot');
      if (dkd_snapshot_result_value.error) throw dkd_snapshot_result_value.error;
      dkd_market_state.dkd_public_snapshot_value = dkd_snapshot_result_value.data || dkd_build_demo_snapshot_value();
    } catch (dkd_error_value) {
      dkd_market_state.dkd_public_snapshot_value = dkd_build_demo_snapshot_value();
      dkd_show_toast_value('Canlı veri alınamadı, demo görünüm açıldı.', true);
    }
    dkd_render_all_value();
  }

  async function dkd_boot_supabase_value() {
    const dkd_has_live_config_value = Boolean(
      dkd_market_state.dkd_config_value?.dkd_supabase_url
      && dkd_market_state.dkd_config_value?.dkd_supabase_anon_key
      && window.supabase?.createClient
    );

    if (!dkd_has_live_config_value) {
      dkd_market_state.dkd_public_snapshot_value = dkd_build_demo_snapshot_value();
      dkd_render_all_value();
      return;
    }

    dkd_market_state.dkd_supabase_client_value = window.supabase.createClient(
      dkd_market_state.dkd_config_value.dkd_supabase_url,
      dkd_market_state.dkd_config_value.dkd_supabase_anon_key,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      },
    );

    try {
      const dkd_session_result_value = await dkd_market_state.dkd_supabase_client_value.auth.getSession();
      if (!dkd_session_result_value.error) {
        dkd_market_state.dkd_session_value = dkd_session_result_value.data?.session || null;
      }
      dkd_market_state.dkd_supabase_client_value.auth.onAuthStateChange(async (_dkd_event_name_value, dkd_session_value) => {
        dkd_market_state.dkd_session_value = dkd_session_value || null;
        dkd_market_state.dkd_order_history_values = [];
        dkd_market_state.dkd_order_timeline_map_value = {};
        if (dkd_market_state.dkd_session_value?.user?.id) {
          dkd_attach_profile_sync_value();
          dkd_attach_order_sync_value();
          dkd_attach_order_timeline_sync_value();
          dkd_start_session_polling_value();
          await dkd_load_wallet_snapshot_value();
          await dkd_load_order_history_value();
          await dkd_load_business_owner_status_value();
          await dkd_load_remote_support_history_value();
        } else {
          dkd_teardown_profile_sync_value();
          dkd_teardown_order_sync_value();
          dkd_teardown_order_timeline_sync_value();
          dkd_stop_session_polling_value();
          dkd_market_state.dkd_wallet_snapshot_value = null;
          dkd_market_state.dkd_order_history_values = [];
        }
        dkd_render_account_card_value();
        dkd_render_wallet_strip_value();
        dkd_render_result_drawer_value();
        dkd_render_orders_drawer_value();
      });
    } catch (_dkd_error_value) {
      dkd_market_state.dkd_session_value = null;
    }

    await dkd_load_public_snapshot_value();
    if (dkd_market_state.dkd_session_value?.user?.id) {
      dkd_attach_profile_sync_value();
      dkd_attach_order_sync_value();
      dkd_attach_order_timeline_sync_value();
      dkd_start_session_polling_value();
      await dkd_load_wallet_snapshot_value();
      await dkd_load_order_history_value();
    }
    dkd_render_wallet_strip_value();
    dkd_render_orders_drawer_value();
  }

  function dkd_start_hero_timer_value() {
    window.clearInterval(dkd_market_state.dkd_carousel_timer_value);
    dkd_market_state.dkd_carousel_timer_value = window.setInterval(() => {
      dkd_market_state.dkd_carousel_index_value += 1;
      dkd_render_hero_banner_value();
    }, 4800);
  }

  function dkd_init_value() {
    dkd_load_support_history_value();
    dkd_bind_event_listeners_value();
    dkd_render_all_value();
    dkd_start_hero_timer_value();
    dkd_boot_supabase_value();
  }

  dkd_init_value();
})();
