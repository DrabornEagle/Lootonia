(function dkd_market_urgent_courier_bootstrap_value() {
  const dkd_urgent_state_value = {
    dkd_config_value: window.dkd_market_web_config || {},
    dkd_supabase_client_value: null,
    dkd_session_value: null,
    dkd_snapshot_value: {
      dkd_customer_orders_values: [],
      dkd_courier_orders_values: [],
      dkd_profile_value: null,
      dkd_has_courier_license_value: false,
    },
    dkd_active_tab_value: 'create',
    dkd_busy_value: false,
    dkd_refresh_timer_value: null,
    dkd_realtime_channel_value: null,
    dkd_realtime_debounce_timer_value: null,
  };

  const dkd_urgent_store_groups_value = Object.freeze([
    {
      dkd_group_key_value: 'market',
      dkd_group_label_value: 'Market',
      dkd_group_icon_value: '🛒',
      dkd_store_values: ['Gimsa', 'BİM', 'A 101', 'Migros', 'YUNUS'],
    },
    {
      dkd_group_key_value: 'firin',
      dkd_group_label_value: 'Fırın',
      dkd_group_icon_value: '🥖',
      dkd_store_values: ['Mutlu Günler', 'Fırıncı Orhan', 'Tarihi Fırın'],
    },
  ]);

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

  function dkd_format_money_value(dkd_number_value) {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(dkd_number_value || 0));
  }

  function dkd_format_date_value(dkd_input_value) {
    if (!dkd_input_value) return '—';
    const dkd_date_value = new Date(dkd_input_value);
    if (Number.isNaN(dkd_date_value.getTime())) return '—';
    return dkd_date_value.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function dkd_show_toast_value(dkd_message_value, dkd_is_error_value = false) {
    const dkd_toast_node_value = dkd_get_element_value('dkd_market_toast');
    if (!dkd_toast_node_value) {
      window.alert(dkd_message_value);
      return;
    }
    dkd_toast_node_value.textContent = dkd_message_value;
    dkd_toast_node_value.hidden = false;
    dkd_toast_node_value.classList.toggle('dkd_market_toast_error', Boolean(dkd_is_error_value));
    window.clearTimeout(dkd_toast_node_value.dkd_urgent_hide_timer_value);
    dkd_toast_node_value.dkd_urgent_hide_timer_value = window.setTimeout(() => {
      dkd_toast_node_value.hidden = true;
    }, 3400);
  }

  function dkd_create_supabase_client_value() {
    if (dkd_urgent_state_value.dkd_supabase_client_value) return dkd_urgent_state_value.dkd_supabase_client_value;
    const dkd_has_config_value = Boolean(
      dkd_urgent_state_value.dkd_config_value?.dkd_supabase_url
      && dkd_urgent_state_value.dkd_config_value?.dkd_supabase_anon_key
      && window.supabase?.createClient
    );
    if (!dkd_has_config_value) return null;
    dkd_urgent_state_value.dkd_supabase_client_value = window.supabase.createClient(
      dkd_urgent_state_value.dkd_config_value.dkd_supabase_url,
      dkd_urgent_state_value.dkd_config_value.dkd_supabase_anon_key,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      },
    );
    return dkd_urgent_state_value.dkd_supabase_client_value;
  }

  async function dkd_refresh_session_value() {
    const dkd_client_value = dkd_create_supabase_client_value();
    if (!dkd_client_value) return null;
    const dkd_session_result_value = await dkd_client_value.auth.getSession();
    if (dkd_session_result_value.error) return null;
    dkd_urgent_state_value.dkd_session_value = dkd_session_result_value.data?.session || null;
    return dkd_urgent_state_value.dkd_session_value;
  }

  function dkd_status_label_value(dkd_status_key_raw_value) {
    const dkd_status_key_value = String(dkd_status_key_raw_value || '').toLowerCase();
    const dkd_status_map_value = {
      dkd_open: 'Kurye Bekliyor',
      dkd_fee_offer_waiting: 'Taşıma Ücreti Onayı',
      dkd_fee_paid_shopping: 'Kurye Alışverişte',
      dkd_product_total_waiting: 'Ürün Tutarı Onayı',
      dkd_product_total_approved: 'Satın Alma Onaylandı',
      dkd_invoice_uploaded: 'Fatura Yüklendi',
      dkd_on_the_way: 'Kurye Yolda',
      dkd_completed: 'Tamamlandı',
      dkd_cancelled: 'İptal',
    };
    return dkd_status_map_value[dkd_status_key_value] || (dkd_status_key_value ? dkd_status_key_value.replaceAll('_', ' ') : 'Bilinmiyor');
  }

  function dkd_profile_wallet_value() {
    const dkd_profile_value = dkd_urgent_state_value.dkd_snapshot_value.dkd_profile_value || {};
    const dkd_wallet_value = Number(dkd_profile_value.wallet_tl ?? dkd_profile_value.dkd_wallet_tl ?? 0);
    return Number.isFinite(dkd_wallet_value) ? dkd_wallet_value : 0;
  }

  function dkd_install_urgent_shell_value() {
    const dkd_existing_view_node_value = dkd_get_element_value('dkd_market_urgent_courier_view');
    const dkd_home_view_node_value = dkd_get_element_value('dkd_market_home_view');
    const dkd_categories_view_node_value = dkd_get_element_value('dkd_market_categories_view');
    const dkd_bottom_nav_node_value = document.querySelector('.dkd_market_bottom_nav');
    const dkd_anchor_node_value = dkd_home_view_node_value || dkd_categories_view_node_value || dkd_bottom_nav_node_value;
    if (dkd_existing_view_node_value) {
      if (dkd_anchor_node_value && dkd_existing_view_node_value.nextElementSibling !== dkd_anchor_node_value) {
        dkd_anchor_node_value.parentNode.insertBefore(dkd_existing_view_node_value, dkd_anchor_node_value);
      }
      return;
    }
    if (!dkd_anchor_node_value) return;
    dkd_anchor_node_value.insertAdjacentHTML('beforebegin', [
      '<section class="dkd_market_urgent_courier_view" id="dkd_market_urgent_courier_view" hidden aria-hidden="true">',
        '<div class="dkd_market_urgent_shell">',
          '<div class="dkd_market_urgent_hero">',
            '<div class="dkd_market_urgent_hero_left">',
              '<div class="dkd_market_urgent_icon" aria-hidden="true">🛵</div>',
              '<div>',
                '<div class="dkd_market_urgent_kicker">Premium hızlı teslimat hattı</div>',
                '<h2>Acil Kurye</h2>',
                '<p>Market, fırın, eczane veya istediğin mağazadan ürünlerini listele. Kurye taşıma ücretini teklif eder; onay sonrası iletişim de kal, ürün toplamı ve fatura akışı tek ekranda ilerler.</p>',
              '</div>',
            '</div>',
            '<div class="dkd_market_urgent_summary" id="dkd_market_urgent_summary"></div>',
          '</div>',
          '<div class="dkd_market_urgent_steps">',
            '<div><span>1</span><strong>Mağaza Seç</strong><small>Birden fazla mağaza ekle</small></div>',
            '<div><span>2</span><strong>Kurye Teklifi</strong><small>Taşıma ücreti cüzdandan onaylanır</small></div>',
            '<div><span>3</span><strong>Alışveriş</strong><small>Ürün toplamı ve fatura görünür</small></div>',
          '</div>',
          '<div class="dkd_market_urgent_tabs" id="dkd_market_urgent_tabs"></div>',
          '<div class="dkd_market_urgent_panel" id="dkd_market_urgent_panel"></div>',
        '</div>',
      '</section>',
    ].join(''));
  }

  function dkd_hide_urgent_view_value() {
    const dkd_view_node_value = dkd_get_element_value('dkd_market_urgent_courier_view');
    if (!dkd_view_node_value) return;
    dkd_view_node_value.hidden = true;
    dkd_view_node_value.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('dkd_market_urgent_mode');
  }

  async function dkd_open_urgent_view_value() {
    await dkd_refresh_session_value();
    dkd_install_urgent_shell_value();
    const dkd_view_node_value = dkd_get_element_value('dkd_market_urgent_courier_view');
    if (!dkd_view_node_value) return;
    const dkd_anchor_node_value = dkd_get_element_value('dkd_market_home_view') || dkd_get_element_value('dkd_market_categories_view') || document.querySelector('.dkd_market_bottom_nav');
    if (dkd_anchor_node_value && dkd_view_node_value.nextElementSibling !== dkd_anchor_node_value) {
      dkd_anchor_node_value.parentNode.insertBefore(dkd_view_node_value, dkd_anchor_node_value);
    }
    ['dkd_market_home_view', 'dkd_market_categories_view', 'dkd_market_support_view', 'dkd_market_courier_cargo_view'].forEach((dkd_element_id_value) => {
      const dkd_node_value = dkd_get_element_value(dkd_element_id_value);
      if (dkd_node_value) dkd_node_value.hidden = true;
    });
    document.querySelectorAll('[data-dkd-category]').forEach((dkd_button_node_value) => {
      dkd_button_node_value.classList.toggle('dkd_market_category_button_active', dkd_button_node_value.getAttribute('data-dkd-category') === 'urgent_courier');
    });
    document.querySelectorAll('[data-dkd-bottom-action]').forEach((dkd_button_node_value) => {
      dkd_button_node_value.classList.remove('dkd_market_bottom_button_active');
    });
    document.body.classList.add('dkd_market_urgent_mode');
    dkd_view_node_value.hidden = false;
    dkd_view_node_value.setAttribute('aria-hidden', 'false');
    await dkd_load_snapshot_value({ dkd_force_value: true });
    window.requestAnimationFrame(() => dkd_view_node_value.scrollIntoView({ block: 'start', behavior: 'smooth' }));
  }

  function dkd_render_tabs_value() {
    const dkd_tabs_node_value = dkd_get_element_value('dkd_market_urgent_tabs');
    if (!dkd_tabs_node_value) return;
    const dkd_tab_values = [
      ['create', '⚡ Sipariş Oluştur'],
      ['customer', '🧾 Market Siparişlerim'],
      ['courier', '🛵 Kurye Siparişleri'],
    ];
    dkd_tabs_node_value.innerHTML = dkd_tab_values.map(([dkd_tab_key_value, dkd_tab_label_value]) => [
      '<button class="dkd_market_urgent_tab ',
      dkd_urgent_state_value.dkd_active_tab_value === dkd_tab_key_value ? 'dkd_market_urgent_tab_active' : '',
      '" type="button" data-dkd-urgent-tab="', dkd_escape_html_value(dkd_tab_key_value), '">',
      dkd_escape_html_value(dkd_tab_label_value),
      '</button>',
    ].join('')).join('');
  }

  function dkd_render_summary_value() {
    const dkd_summary_node_value = dkd_get_element_value('dkd_market_urgent_summary');
    if (!dkd_summary_node_value) return;
    const dkd_customer_orders_values = dkd_urgent_state_value.dkd_snapshot_value.dkd_customer_orders_values || [];
    const dkd_courier_orders_values = dkd_urgent_state_value.dkd_snapshot_value.dkd_courier_orders_values || [];
    const dkd_active_customer_count_value = dkd_customer_orders_values.filter((dkd_order_value) => !['dkd_completed', 'dkd_cancelled'].includes(String(dkd_order_value.dkd_status_key || '').toLowerCase())).length;
    dkd_summary_node_value.innerHTML = [
      '<div><span>Cüzdan</span><strong>', dkd_format_money_value(dkd_profile_wallet_value()), '</strong></div>',
      '<div><span>Market Siparişlerim</span><strong>', dkd_escape_html_value(String(dkd_active_customer_count_value)), '</strong></div>',
      '<div><span>Açık Acil İş</span><strong>', dkd_escape_html_value(String(dkd_courier_orders_values.length)), '</strong></div>',
    ].join('');
  }

  function dkd_render_store_card_value(dkd_group_value, dkd_store_name_value) {
    const dkd_safe_key_value = `${dkd_group_value.dkd_group_key_value}_${dkd_store_name_value}`.replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase();
    return [
      '<article class="dkd_market_urgent_store_card">',
        '<label class="dkd_market_urgent_store_check">',
          '<input type="checkbox" data-dkd-urgent-store-check="true" data-dkd-urgent-group="', dkd_escape_html_value(dkd_group_value.dkd_group_key_value), '" data-dkd-urgent-store="', dkd_escape_html_value(dkd_store_name_value), '" />',
          '<span>', dkd_escape_html_value(dkd_store_name_value), '</span>',
        '</label>',
        '<textarea data-dkd-urgent-store-products="', dkd_escape_html_value(dkd_safe_key_value), '" placeholder="Bu mağazadan alınacak ürünleri yaz"></textarea>',
      '</article>',
    ].join('');
  }

  function dkd_render_create_panel_value() {
    const dkd_group_markup_value = dkd_urgent_store_groups_value.map((dkd_group_value) => [
      '<section class="dkd_market_urgent_group">',
        '<div class="dkd_market_urgent_group_head"><span>', dkd_escape_html_value(dkd_group_value.dkd_group_icon_value), '</span><strong>', dkd_escape_html_value(dkd_group_value.dkd_group_label_value), '</strong></div>',
        '<div class="dkd_market_urgent_store_grid">',
          dkd_group_value.dkd_store_values.map((dkd_store_name_value) => dkd_render_store_card_value(dkd_group_value, dkd_store_name_value)).join(''),
        '</div>',
      '</section>',
    ].join('')).join('');
    return [
      '<form class="dkd_market_urgent_form" id="dkd_market_urgent_create_form">',
        '<div class="dkd_market_urgent_form_grid">',
          '<label class="dkd_market_urgent_field"><span>Ad Soyad</span><input id="dkd_urgent_customer_name" type="text" placeholder="Ad Soyad" required /></label>',
          '<label class="dkd_market_urgent_field"><span>Telefon</span><input id="dkd_urgent_customer_phone" type="tel" value="+90" placeholder="+905xxxxxxxxx" required /></label>',
        '</div>',
        '<label class="dkd_market_urgent_field"><span>Teslimat Adresi</span><textarea id="dkd_urgent_customer_address" placeholder="Mahalle, sokak, bina, daire ve tarif" required></textarea></label>',
        dkd_group_markup_value,
        '<section class="dkd_market_urgent_group dkd_market_urgent_pharmacy_group">',
          '<div class="dkd_market_urgent_group_head"><span>💊</span><strong>Eczane</strong></div>',
          '<article class="dkd_market_urgent_store_card dkd_market_urgent_store_card_wide">',
            '<label class="dkd_market_urgent_store_check">',
              '<input type="checkbox" id="dkd_urgent_nearest_pharmacy_check" />',
              '<span>En Yakın Eczaneden AL</span>',
            '</label>',
            '<textarea id="dkd_urgent_nearest_pharmacy_products" placeholder="Eczaneden alınacak ürünleri veya notu yaz"></textarea>',
          '</article>',
        '</section>',
        '<section class="dkd_market_urgent_group dkd_market_urgent_other_group">',
          '<div class="dkd_market_urgent_group_head"><span>✨</span><strong>Diğer</strong></div>',
          '<div class="dkd_market_urgent_form_grid">',
            '<label class="dkd_market_urgent_field"><span>Mağaza İsmi</span><input id="dkd_urgent_other_store_name" type="text" placeholder="Müşterinin istediği mağaza" /></label>',
            '<label class="dkd_market_urgent_field"><span>Ürünler</span><textarea id="dkd_urgent_other_products" placeholder="Bu mağazadan alınacak ürünleri yaz"></textarea></label>',
          '</div>',
        '</section>',
        '<label class="dkd_market_urgent_field"><span>Kurye Notu</span><textarea id="dkd_urgent_customer_note" placeholder="Marka tercihi, alternatif ürün, kapı kodu vb."></textarea></label>',
        '<div class="dkd_market_urgent_action_row">',
          '<button class="dkd_market_urgent_primary" type="submit">Sipariş Oluştur</button>',
          '<button class="dkd_market_urgent_ghost" type="button" id="dkd_market_urgent_refresh_button">Canlı Veriyi Yenile</button>',
        '</div>',
      '</form>',
    ].join('');
  }

  function dkd_collect_order_items_value() {
    const dkd_items_values = [];
    document.querySelectorAll('[data-dkd-urgent-store-check="true"]').forEach((dkd_check_node_value) => {
      if (!dkd_check_node_value.checked) return;
      const dkd_group_key_value = dkd_check_node_value.getAttribute('data-dkd-urgent-group') || '';
      const dkd_store_name_value = dkd_check_node_value.getAttribute('data-dkd-urgent-store') || '';
      const dkd_safe_key_value = `${dkd_group_key_value}_${dkd_store_name_value}`.replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase();
      const dkd_product_node_value = document.querySelector(`[data-dkd-urgent-store-products="${dkd_safe_key_value}"]`);
      dkd_items_values.push({
        dkd_store_group_key: dkd_group_key_value,
        dkd_store_name: dkd_store_name_value,
        dkd_product_text: String(dkd_product_node_value?.value || '').trim(),
        dkd_is_nearest_pharmacy: false,
      });
    });
    const dkd_nearest_pharmacy_node_value = dkd_get_element_value('dkd_urgent_nearest_pharmacy_check');
    if (dkd_nearest_pharmacy_node_value?.checked) {
      dkd_items_values.push({
        dkd_store_group_key: 'eczane',
        dkd_store_name: 'En Yakın Eczaneden AL',
        dkd_product_text: String(dkd_get_element_value('dkd_urgent_nearest_pharmacy_products')?.value || '').trim(),
        dkd_is_nearest_pharmacy: true,
      });
    }
    const dkd_other_store_name_value = String(dkd_get_element_value('dkd_urgent_other_store_name')?.value || '').trim();
    const dkd_other_products_value = String(dkd_get_element_value('dkd_urgent_other_products')?.value || '').trim();
    if (dkd_other_store_name_value || dkd_other_products_value) {
      dkd_items_values.push({
        dkd_store_group_key: 'diger',
        dkd_store_name: dkd_other_store_name_value || 'Diğer Mağaza',
        dkd_product_text: dkd_other_products_value,
        dkd_is_nearest_pharmacy: false,
      });
    }
    return dkd_items_values.filter((dkd_item_value) => String(dkd_item_value.dkd_store_name || '').trim());
  }

  function dkd_render_items_value(dkd_items_values) {
    if (!Array.isArray(dkd_items_values) || !dkd_items_values.length) return '<div class="dkd_market_urgent_empty_mini">Ürün listesi bekleniyor.</div>';
    return '<div class="dkd_market_urgent_items">' + dkd_items_values.map((dkd_item_value) => [
      '<div class="dkd_market_urgent_item">',
        '<strong>', dkd_escape_html_value(dkd_item_value.dkd_store_name || 'Mağaza'), '</strong>',
        '<span>', dkd_escape_html_value(dkd_item_value.dkd_product_text || 'Ürün listesi yazılmadı'), '</span>',
        Number(dkd_item_value.dkd_product_total_tl || 0) > 0 ? '<em class="dkd_market_urgent_item_total">Mağaza toplamı: ' + dkd_escape_html_value(dkd_format_money_value(dkd_item_value.dkd_product_total_tl)) + '</em>' : '',
      '</div>',
    ].join('')).join('') + '</div>';
  }

  function dkd_find_order_by_id_value(dkd_order_id_value) {
    const dkd_all_orders_values = [
      ...(dkd_urgent_state_value.dkd_snapshot_value.dkd_customer_orders_values || []),
      ...(dkd_urgent_state_value.dkd_snapshot_value.dkd_courier_orders_values || []),
    ];
    return dkd_all_orders_values.find((dkd_order_value) => String(dkd_order_value?.dkd_order_id || '') === String(dkd_order_id_value || '')) || null;
  }

  function dkd_render_item_total_inputs_value(dkd_order_value) {
    const dkd_item_values = Array.isArray(dkd_order_value?.dkd_item_values) ? dkd_order_value.dkd_item_values : [];
    if (!dkd_item_values.length) return '';
    return [
      '<div class="dkd_market_urgent_store_total_box">',
        '<div class="dkd_market_urgent_store_total_head"><strong>Mağaza Bazlı Ürün Toplamları</strong><small>Her mağaza için ayrı TL tutarı gir</small></div>',
        dkd_item_values.map((dkd_item_value, dkd_item_index_value) => [
          '<label class="dkd_market_urgent_store_total_row">',
            '<span><strong>', dkd_escape_html_value(dkd_item_value.dkd_store_name || 'Mağaza'), '</strong><small>', dkd_escape_html_value(dkd_item_value.dkd_product_text || 'Ürün listesi'), '</small></span>',
            '<input type="number" min="1" step="0.01" placeholder="TL" value="', dkd_escape_html_value(Number(dkd_item_value.dkd_product_total_tl || 0) > 0 ? String(dkd_item_value.dkd_product_total_tl) : ''), '" data-dkd-urgent-item-total-input="', dkd_escape_html_value(dkd_order_value.dkd_order_id), '" data-dkd-urgent-item-id="', dkd_escape_html_value(dkd_item_value.dkd_item_id || `dkd_item_${dkd_item_index_value}`), '" />',
          '</label>',
        ].join('')).join(''),
        '<button class="dkd_market_urgent_ghost" type="button" data-dkd-urgent-action="set_item_totals" data-dkd-urgent-order-id="', dkd_escape_html_value(dkd_order_value.dkd_order_id), '">Toplamları Gönder</button>',
      '</div>',
    ].join('');
  }

  function dkd_open_invoice_preview_value(dkd_invoice_url_value) {
    const dkd_safe_url_value = String(dkd_invoice_url_value || '').trim();
    if (!dkd_safe_url_value) return;
    let dkd_modal_node_value = dkd_get_element_value('dkd_market_urgent_invoice_modal');
    if (!dkd_modal_node_value) {
      document.body.insertAdjacentHTML('beforeend', [
        '<div class="dkd_market_urgent_invoice_modal" id="dkd_market_urgent_invoice_modal" hidden>',
          '<div class="dkd_market_urgent_invoice_modal_card">',
            '<div class="dkd_market_urgent_invoice_modal_head"><strong>Fatura Görseli</strong><button type="button" data-dkd-urgent-invoice-close="true">×</button></div>',
            '<img id="dkd_market_urgent_invoice_modal_img" alt="Fatura görseli" />',
          '</div>',
        '</div>',
      ].join(''));
      dkd_modal_node_value = dkd_get_element_value('dkd_market_urgent_invoice_modal');
    }
    const dkd_image_node_value = dkd_get_element_value('dkd_market_urgent_invoice_modal_img');
    if (dkd_image_node_value) dkd_image_node_value.setAttribute('src', dkd_safe_url_value);
    dkd_modal_node_value.hidden = false;
  }

  function dkd_close_invoice_preview_value() {
    const dkd_modal_node_value = dkd_get_element_value('dkd_market_urgent_invoice_modal');
    const dkd_image_node_value = dkd_get_element_value('dkd_market_urgent_invoice_modal_img');
    if (dkd_image_node_value) dkd_image_node_value.setAttribute('src', '');
    if (dkd_modal_node_value) dkd_modal_node_value.hidden = true;
  }

  function dkd_resolve_message_sender_name_value(dkd_order_value, dkd_message_value) {
    const dkd_role_key_value = String(dkd_message_value?.dkd_sender_role_key || '').toLowerCase();
    if (dkd_role_key_value === 'dkd_customer') {
      return String(dkd_message_value?.dkd_sender_display_name || dkd_order_value?.dkd_customer_display_name || dkd_order_value?.dkd_customer_full_name || 'Müşteri');
    }
    if (dkd_role_key_value === 'dkd_courier') {
      return String(dkd_message_value?.dkd_sender_display_name || dkd_order_value?.dkd_courier_display_name || 'Kurye');
    }
    return String(dkd_message_value?.dkd_sender_display_name || 'Lootonia');
  }

  function dkd_render_messages_value(dkd_order_value) {
    const dkd_message_values = Array.isArray(dkd_order_value.dkd_message_values) ? dkd_order_value.dkd_message_values : [];
    const dkd_moto_svg_value = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 15.5h8.7l1.7-5.4H7.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 11.8h4.7M5.2 8.5h6.7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M15.6 10.1h2.2l2.1 2.5v2.9h-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.2 18.5a1.55 1.55 0 1 0 0-3.1 1.55 1.55 0 0 0 0 3.1Zm9.7 0a1.55 1.55 0 1 0 0-3.1 1.55 1.55 0 0 0 0 3.1Z" fill="currentColor"/></svg>';
    const dkd_message_list_value = dkd_message_values.length
      ? dkd_message_values.map((dkd_message_value) => {
        const dkd_role_key_value = String(dkd_message_value.dkd_sender_role_key || '').toLowerCase();
        const dkd_sender_name_value = String(dkd_message_value.dkd_sender_display_name || (dkd_role_key_value === 'dkd_customer' ? (dkd_order_value.dkd_customer_display_name || dkd_order_value.dkd_customer_full_name || 'Müşteri') : (dkd_order_value.dkd_courier_display_name || 'Kurye')));
        const dkd_avatar_image_url_value = String(dkd_message_value.dkd_sender_avatar_image_url || (dkd_role_key_value === 'dkd_customer' ? dkd_order_value.dkd_customer_avatar_image_url : dkd_order_value.dkd_courier_avatar_image_url) || '').trim();
        const dkd_avatar_markup_value = dkd_avatar_image_url_value
          ? '<span class="dkd_market_urgent_message_avatar dkd_market_urgent_message_avatar_image"><img src="' + dkd_escape_html_value(dkd_avatar_image_url_value) + '" alt="' + dkd_escape_html_value(dkd_sender_name_value) + '" loading="lazy" /></span>'
          : '<span class="dkd_market_urgent_message_avatar dkd_market_urgent_message_avatar_moto">' + dkd_moto_svg_value + '</span>';
        return [
          '<div class="dkd_market_urgent_message ', dkd_role_key_value === 'dkd_customer' ? 'dkd_market_urgent_message_customer' : 'dkd_market_urgent_message_courier', '">',
            dkd_avatar_markup_value,
            '<div class="dkd_market_urgent_message_body">',
              '<strong><span>', dkd_escape_html_value(dkd_sender_name_value), '</span><small>', dkd_escape_html_value(dkd_format_date_value(dkd_message_value.dkd_created_at)), '</small></strong>',
              '<span>', dkd_escape_html_value(dkd_message_value.dkd_message_text || ''), '</span>',
            '</div>',
          '</div>',
        ].join('');
      }).join('')
      : '<div class="dkd_market_urgent_empty_mini">Sohbet, taşıma ücreti onaylanınca aktif olur.</div>';
    const dkd_can_chat_value = dkd_order_value.dkd_chat_enabled_value === true;
    return [
      '<div class="dkd_market_urgent_chat_box">',
        '<div class="dkd_market_urgent_chat_head"><strong>Canlı Mesajlaşma</strong><small>', dkd_can_chat_value ? 'Aktif' : 'Bekliyor', '</small></div>',
        '<div class="dkd_market_urgent_message_list">', dkd_message_list_value, '</div>',
        dkd_can_chat_value ? [
          '<div class="dkd_market_urgent_chat_send">',
            '<input type="text" placeholder="Mesaj yaz" data-dkd-urgent-message-input="', dkd_escape_html_value(dkd_order_value.dkd_order_id), '" />',
            '<button class="dkd_market_urgent_ghost" type="button" data-dkd-urgent-action="send_message" data-dkd-urgent-order-id="', dkd_escape_html_value(dkd_order_value.dkd_order_id), '">Gönder</button>',
          '</div>',
        ].join('') : '',
      '</div>',
    ].join('');
  }

  function dkd_render_customer_order_card_value(dkd_order_value) {
    const dkd_status_key_value = String(dkd_order_value.dkd_status_key || '').toLowerCase();
    const dkd_fee_value = Number(dkd_order_value.dkd_courier_fee_tl || 0);
    const dkd_product_total_value = Number(dkd_order_value.dkd_product_total_tl || 0);
    const dkd_invoice_value = String(dkd_order_value.dkd_invoice_image_url || '').trim();
    const dkd_can_cancel_value = dkd_status_key_value === 'dkd_open' && !String(dkd_order_value.dkd_courier_user_id || '').trim();
    return [
      '<article class="dkd_market_urgent_order_card">',
        '<div class="dkd_market_urgent_order_head">',
          '<div><h3>Acil Market Siparişi</h3><small>', dkd_escape_html_value(dkd_format_date_value(dkd_order_value.dkd_created_at)), '</small></div>',
          '<span class="dkd_market_urgent_status">', dkd_escape_html_value(dkd_status_label_value(dkd_status_key_value)), '</span>',
        '</div>',
        dkd_render_items_value(dkd_order_value.dkd_item_values),
        '<div class="dkd_market_urgent_money_grid">',
          '<div><small>Taşıma Ücreti</small><strong>', dkd_fee_value > 0 ? dkd_format_money_value(dkd_fee_value) : 'Kurye bekleniyor', '</strong></div>',
          '<div><small>Ürün Toplamı</small><strong>', dkd_product_total_value > 0 ? dkd_format_money_value(dkd_product_total_value) : 'Bekleniyor', '</strong></div>',
        '</div>',
        dkd_can_cancel_value ? [
          '<div class="dkd_market_urgent_notice dkd_market_urgent_cancel_notice">Kurye görevi kabul edene kadar bu siparişi iptal edebilirsin.</div>',
          '<button class="dkd_market_urgent_ghost dkd_market_urgent_danger" type="button" data-dkd-urgent-action="cancel_order" data-dkd-urgent-order-id="', dkd_escape_html_value(dkd_order_value.dkd_order_id), '">Siparişi İptal Et</button>',
        ].join('') : '',
        dkd_status_key_value === 'dkd_fee_offer_waiting' ? [
          '<div class="dkd_market_urgent_notice">Kurye taşıma ücretini belirledi. Onaylarsan tutar cüzdanından çekilir ve sohbet açılır.</div>',
          '<button class="dkd_market_urgent_primary" type="button" data-dkd-urgent-action="approve_fee" data-dkd-urgent-order-id="', dkd_escape_html_value(dkd_order_value.dkd_order_id), '">Taşıma Ücretini Onayla</button>',
        ].join('') : '',
        dkd_status_key_value === 'dkd_product_total_waiting' ? [
          '<div class="dkd_market_urgent_notice">Kurye ürünlerin toplam TL fiyatını girdi. Onaydan sonra kurye satın alma adımına geçer.</div>',
          '<button class="dkd_market_urgent_primary" type="button" data-dkd-urgent-action="approve_product_total" data-dkd-urgent-order-id="', dkd_escape_html_value(dkd_order_value.dkd_order_id), '">Ürün Toplamını Onayla</button>',
        ].join('') : '',
        dkd_invoice_value ? '<button class="dkd_market_urgent_invoice" type="button" data-dkd-urgent-action="open_invoice" data-dkd-urgent-order-id="' + dkd_escape_html_value(dkd_order_value.dkd_order_id) + '">Fatura Görselini Aç</button>' : '',
        dkd_render_messages_value(dkd_order_value),
      '</article>',
    ].join('');
  }

  function dkd_render_courier_order_card_value(dkd_order_value) {
    const dkd_status_key_value = String(dkd_order_value.dkd_status_key || '').toLowerCase();
    const dkd_is_open_value = dkd_status_key_value === 'dkd_open';
    const dkd_can_product_total_value = ['dkd_fee_paid_shopping', 'dkd_product_total_waiting', 'dkd_product_total_approved'].includes(dkd_status_key_value);
    const dkd_can_invoice_value = ['dkd_product_total_approved', 'dkd_invoice_uploaded'].includes(dkd_status_key_value);
    const dkd_invoice_value = String(dkd_order_value.dkd_invoice_image_url || '').trim();
    const dkd_can_pickup_items_value = dkd_status_key_value === 'dkd_invoice_uploaded';
    const dkd_can_complete_delivery_value = dkd_status_key_value === 'dkd_on_the_way';
    return [
      '<article class="dkd_market_urgent_order_card dkd_market_urgent_order_card_courier">',
        '<div class="dkd_market_urgent_order_head">',
          '<div><h3>', dkd_escape_html_value(dkd_order_value.dkd_customer_full_name || 'Acil Kurye Müşterisi'), '</h3><small>', dkd_escape_html_value(dkd_order_value.dkd_customer_address_text || 'Adres bekleniyor'), '</small></div>',
          '<span class="dkd_market_urgent_status">', dkd_escape_html_value(dkd_status_label_value(dkd_status_key_value)), '</span>',
        '</div>',
        dkd_render_items_value(dkd_order_value.dkd_item_values),
        dkd_is_open_value ? [
          '<div class="dkd_market_urgent_inline_form">',
            '<input type="number" min="1" step="1" placeholder="Taşıma ücreti TL" data-dkd-urgent-fee-input="', dkd_escape_html_value(dkd_order_value.dkd_order_id), '" />',
            '<button class="dkd_market_urgent_primary" type="button" data-dkd-urgent-action="offer_fee" data-dkd-urgent-order-id="', dkd_escape_html_value(dkd_order_value.dkd_order_id), '">Görevi Kabul Et</button>',
          '</div>',
        ].join('') : '',
        dkd_can_product_total_value ? dkd_render_item_total_inputs_value(dkd_order_value) : '',
        dkd_invoice_value ? '<button class="dkd_market_urgent_invoice" type="button" data-dkd-urgent-action="open_invoice" data-dkd-urgent-order-id="' + dkd_escape_html_value(dkd_order_value.dkd_order_id) + '">Fatura Görselini Aç</button>' : '',
        dkd_can_invoice_value ? [
          '<div class="dkd_market_urgent_invoice_upload">',
            '<label>Fatura Resmi<input type="file" accept="image/png,image/jpeg,image/webp" data-dkd-urgent-invoice-input="', dkd_escape_html_value(dkd_order_value.dkd_order_id), '" /></label>',
            '<button class="dkd_market_urgent_ghost" type="button" data-dkd-urgent-action="upload_invoice" data-dkd-urgent-order-id="', dkd_escape_html_value(dkd_order_value.dkd_order_id), '">', dkd_invoice_value ? 'Faturayı Düzenle' : 'Faturayı Yükle', '</button>',
          '</div>',
        ].join('') : '',
        dkd_can_pickup_items_value ? '<button class="dkd_market_urgent_primary" type="button" data-dkd-urgent-action="pickup_items" data-dkd-urgent-order-id="' + dkd_escape_html_value(dkd_order_value.dkd_order_id) + '">Ürünleri Teslim Aldım • Yola Çık</button>' : '',
        dkd_can_complete_delivery_value ? '<button class="dkd_market_urgent_primary" type="button" data-dkd-urgent-action="complete_delivery" data-dkd-urgent-order-id="' + dkd_escape_html_value(dkd_order_value.dkd_order_id) + '">Teslim Ettim • Siparişi Tamamla</button>' : '',
        dkd_render_messages_value(dkd_order_value),
      '</article>',
    ].join('');
  }

  function dkd_render_customer_panel_value() {
    const dkd_orders_values = dkd_urgent_state_value.dkd_snapshot_value.dkd_customer_orders_values || [];
    if (!dkd_orders_values.length) return '<div class="dkd_market_urgent_empty">Henüz Acil Kurye market siparişin yok. İlk siparişi oluşturunca burada görünecek.</div>';
    return '<div class="dkd_market_urgent_order_grid">' + dkd_orders_values.map(dkd_render_customer_order_card_value).join('') + '</div>';
  }

  function dkd_render_courier_panel_value() {
    if (!dkd_urgent_state_value.dkd_snapshot_value.dkd_has_courier_license_value) {
      return '<div class="dkd_market_urgent_empty"><strong>Kurye lisansı gerekli.</strong><span>Acil Kurye siparişlerini yalnızca aktif kurye hesabı görebilir.</span></div>';
    }
    const dkd_orders_values = dkd_urgent_state_value.dkd_snapshot_value.dkd_courier_orders_values || [];
    if (!dkd_orders_values.length) return '<div class="dkd_market_urgent_empty">Şu an açık Acil Kurye işi yok.</div>';
    return '<div class="dkd_market_urgent_order_grid">' + dkd_orders_values.map(dkd_render_courier_order_card_value).join('') + '</div>';
  }

  function dkd_render_panel_value() {
    const dkd_panel_node_value = dkd_get_element_value('dkd_market_urgent_panel');
    if (!dkd_panel_node_value) return;
    dkd_render_tabs_value();
    dkd_render_summary_value();
    if (!dkd_urgent_state_value.dkd_session_value?.user?.id) {
      dkd_panel_node_value.innerHTML = '<div class="dkd_market_urgent_empty"><strong>Giriş gerekiyor.</strong><span>Acil Kurye siparişi oluşturmak ve takip etmek için Lootonia hesabıyla giriş yap.</span></div>';
      return;
    }
    if (dkd_urgent_state_value.dkd_busy_value) {
      dkd_panel_node_value.innerHTML = '<div class="dkd_market_urgent_empty">Acil Kurye verisi yükleniyor…</div>';
      return;
    }
    if (dkd_urgent_state_value.dkd_active_tab_value === 'customer') {
      dkd_panel_node_value.innerHTML = dkd_render_customer_panel_value();
      return;
    }
    if (dkd_urgent_state_value.dkd_active_tab_value === 'courier') {
      dkd_panel_node_value.innerHTML = dkd_render_courier_panel_value();
      return;
    }
    dkd_panel_node_value.innerHTML = dkd_render_create_panel_value();
  }

  async function dkd_load_snapshot_value(dkd_options_value = {}) {
    const dkd_client_value = dkd_create_supabase_client_value();
    await dkd_refresh_session_value();
    if (!dkd_client_value || !dkd_urgent_state_value.dkd_session_value?.user?.id) {
      dkd_render_panel_value();
      return;
    }
    if (dkd_urgent_state_value.dkd_busy_value && !dkd_options_value.dkd_force_value) return;
    dkd_urgent_state_value.dkd_busy_value = true;
    if (dkd_urgent_state_value.dkd_active_tab_value !== 'create') dkd_render_panel_value();
    try {
      const dkd_result_value = await dkd_client_value.rpc('dkd_urgent_courier_snapshot_dkd');
      if (dkd_result_value.error) throw dkd_result_value.error;
      const dkd_data_value = dkd_result_value.data || {};
      dkd_urgent_state_value.dkd_snapshot_value = {
        dkd_customer_orders_values: Array.isArray(dkd_data_value.dkd_customer_orders) ? dkd_data_value.dkd_customer_orders : [],
        dkd_courier_orders_values: Array.isArray(dkd_data_value.dkd_courier_orders) ? dkd_data_value.dkd_courier_orders : [],
        dkd_profile_value: dkd_data_value.dkd_profile || null,
        dkd_has_courier_license_value: dkd_data_value.dkd_has_courier_license === true,
      };
    } catch (dkd_error_value) {
      dkd_show_toast_value(dkd_error_value?.message || 'Acil Kurye verisi alınamadı.', true);
    } finally {
      dkd_urgent_state_value.dkd_busy_value = false;
      const dkd_panel_node_value = dkd_get_element_value('dkd_market_urgent_panel');
      const dkd_panel_has_content_value = Boolean(dkd_panel_node_value && String(dkd_panel_node_value.innerHTML || '').trim());
      if (dkd_urgent_state_value.dkd_active_tab_value !== 'create' || !dkd_panel_has_content_value) {
        dkd_render_panel_value();
      } else {
        dkd_render_summary_value();
        if (typeof dkd_restore_create_form_draft_value === 'function') dkd_restore_create_form_draft_value();
      }
    }
  }

  async function dkd_rpc_action_value(dkd_rpc_name_value, dkd_payload_value, dkd_success_message_value) {
    const dkd_client_value = dkd_create_supabase_client_value();
    if (!dkd_client_value || !dkd_urgent_state_value.dkd_session_value?.user?.id) {
      dkd_show_toast_value('Bu işlem için giriş yapmalısın.', true);
      return;
    }
    try {
      const dkd_result_value = await dkd_client_value.rpc(dkd_rpc_name_value, dkd_payload_value || {});
      if (dkd_result_value.error) throw dkd_result_value.error;
      if (dkd_result_value.data?.dkd_ok === false || dkd_result_value.data?.ok === false) throw new Error(dkd_result_value.data?.dkd_reason || dkd_result_value.data?.reason || 'İşlem tamamlanamadı.');
      if (dkd_success_message_value) dkd_show_toast_value(dkd_success_message_value);
      await dkd_load_snapshot_value({ dkd_force_value: true });
      return dkd_result_value.data || {};
    } catch (dkd_error_value) {
      dkd_show_toast_value(dkd_error_value?.message || 'İşlem başarısız.', true);
      return null;
    }
  }

  async function dkd_send_push_event_value(dkd_event_key_value, dkd_order_id_value, dkd_message_id_value = '') {
    const dkd_client_value = dkd_create_supabase_client_value();
    const dkd_safe_order_id_value = String(dkd_order_id_value || '').trim();
    if (!dkd_client_value || !dkd_safe_order_id_value) return;
    try {
      const dkd_body_value = {
        dkd_event_key: String(dkd_event_key_value || '').trim(),
        dkd_order_id: dkd_safe_order_id_value,
      };
      if (dkd_message_id_value) dkd_body_value.dkd_message_id = String(dkd_message_id_value).trim();
      await dkd_client_value.functions.invoke('send-urgent-courier-alert', { body: dkd_body_value });
    } catch (dkd_error_value) {
      console.warn('dkd urgent courier push skipped', dkd_error_value?.message || dkd_error_value);
    }
  }

  async function dkd_submit_order_value(dkd_submit_event_value) {
    dkd_submit_event_value.preventDefault();
    const dkd_items_values = dkd_collect_order_items_value();
    if (!dkd_items_values.length) {
      dkd_show_toast_value('En az bir mağaza seçmelisin.', true);
      return;
    }
    const dkd_missing_product_value = dkd_items_values.some((dkd_item_value) => !String(dkd_item_value.dkd_product_text || '').trim());
    if (dkd_missing_product_value) {
      dkd_show_toast_value('Seçtiğin her mağaza için ürün listesini yazmalısın.', true);
      return;
    }
    const dkd_result_data_value = await dkd_rpc_action_value('dkd_urgent_courier_create_order_dkd', {
      dkd_param_customer_full_name: String(dkd_get_element_value('dkd_urgent_customer_name')?.value || '').trim(),
      dkd_param_customer_phone_text: String(dkd_get_element_value('dkd_urgent_customer_phone')?.value || '').trim(),
      dkd_param_customer_address_text: String(dkd_get_element_value('dkd_urgent_customer_address')?.value || '').trim(),
      dkd_param_customer_note_text: String(dkd_get_element_value('dkd_urgent_customer_note')?.value || '').trim(),
      dkd_param_items: dkd_items_values,
    }, 'Acil Kurye siparişi oluşturuldu. Market Siparişlerim ekranına düştü.');
    if (dkd_result_data_value?.dkd_order_id) await dkd_send_push_event_value('dkd_urgent_order_created', dkd_result_data_value.dkd_order_id);
    dkd_urgent_state_value.dkd_active_tab_value = 'customer';
    dkd_render_panel_value();
  }

  function dkd_read_number_input_value(dkd_selector_value) {
    const dkd_input_node_value = document.querySelector(dkd_selector_value);
    const dkd_number_value = Number(dkd_input_node_value?.value || 0);
    return Number.isFinite(dkd_number_value) ? dkd_number_value : 0;
  }

  function dkd_file_to_data_url_value(dkd_file_value) {
    return new Promise((dkd_resolve_value, dkd_reject_value) => {
      const dkd_reader_value = new FileReader();
      dkd_reader_value.onload = () => dkd_resolve_value(String(dkd_reader_value.result || ''));
      dkd_reader_value.onerror = () => dkd_reject_value(new Error('Fatura resmi okunamadı.'));
      dkd_reader_value.readAsDataURL(dkd_file_value);
    });
  }

  async function dkd_handle_invoice_upload_value(dkd_order_id_value) {
    const dkd_input_node_value = document.querySelector(`[data-dkd-urgent-invoice-input="${dkd_order_id_value}"]`);
    const dkd_file_value = dkd_input_node_value?.files?.[0] || null;
    if (!dkd_file_value) {
      dkd_show_toast_value('Fatura resmi seçmelisin.', true);
      return;
    }
    if (dkd_file_value.size > 2.5 * 1024 * 1024) {
      dkd_show_toast_value('Fatura görseli 2.5 MB altında olmalı.', true);
      return;
    }
    const dkd_invoice_url_value = await dkd_file_to_data_url_value(dkd_file_value);
    const dkd_result_data_value = await dkd_rpc_action_value('dkd_urgent_courier_upload_invoice_dkd', {
      dkd_param_order_id: dkd_order_id_value,
      dkd_param_invoice_image_url: dkd_invoice_url_value,
    }, 'Fatura müşterinin paneline yüklendi.');
    if (dkd_result_data_value) await dkd_send_push_event_value('dkd_urgent_invoice_uploaded', dkd_order_id_value);
  }

  async function dkd_handle_action_value(dkd_action_value, dkd_order_id_value) {
    if (dkd_action_value === 'cancel_order') {
      const dkd_cancel_confirm_value = window.confirm('Kurye kabul etmeden önce bu Acil Kurye siparişini iptal etmek istiyor musun?');
      if (!dkd_cancel_confirm_value) return;
      const dkd_result_data_value = await dkd_rpc_action_value('dkd_urgent_courier_customer_cancel_order_dkd', { dkd_param_order_id: dkd_order_id_value }, 'Sipariş iptal edildi.');
      if (dkd_result_data_value) await dkd_send_push_event_value('dkd_urgent_order_cancelled', dkd_order_id_value);
      return;
    }
    if (dkd_action_value === 'offer_fee') {
      const dkd_fee_value = dkd_read_number_input_value(`[data-dkd-urgent-fee-input="${dkd_order_id_value}"]`);
      if (dkd_fee_value <= 0) {
        dkd_show_toast_value('Taşıma ücretini TL olarak gir.', true);
        return;
      }
      const dkd_result_data_value = await dkd_rpc_action_value('dkd_urgent_courier_offer_fee_dkd', { dkd_param_order_id: dkd_order_id_value, dkd_param_courier_fee_tl: dkd_fee_value }, 'Taşıma ücreti müşteriye gönderildi.');
      if (dkd_result_data_value) await dkd_send_push_event_value('dkd_urgent_courier_accepted', dkd_order_id_value);
      return;
    }
    if (dkd_action_value === 'approve_fee') {
      const dkd_result_data_value = await dkd_rpc_action_value('dkd_urgent_courier_customer_approve_fee_dkd', { dkd_param_order_id: dkd_order_id_value }, 'Taşıma ücreti cüzdandan çekildi; sohbet aktif.');
      if (dkd_result_data_value) await dkd_send_push_event_value('dkd_urgent_auto_message', dkd_order_id_value);
      return;
    }
    if (dkd_action_value === 'set_item_totals') {
      const dkd_item_total_values = Array.from(document.querySelectorAll(`[data-dkd-urgent-item-total-input="${dkd_order_id_value}"]`)).map((dkd_input_node_value) => ({
        dkd_item_id: dkd_input_node_value.getAttribute('data-dkd-urgent-item-id') || '',
        dkd_product_total_tl: Number(dkd_input_node_value.value || 0),
      }));
      const dkd_missing_total_value = !dkd_item_total_values.length || dkd_item_total_values.some((dkd_item_total_value) => Number(dkd_item_total_value.dkd_product_total_tl || 0) <= 0);
      if (dkd_missing_total_value) {
        dkd_show_toast_value('Her mağaza için ürün toplamını TL olarak gir.', true);
        return;
      }
      const dkd_result_data_value = await dkd_rpc_action_value('dkd_urgent_courier_set_item_totals_dkd', { dkd_param_order_id: dkd_order_id_value, dkd_param_item_totals: dkd_item_total_values }, 'Mağaza bazlı ürün toplamları müşteriye gönderildi.');
      if (dkd_result_data_value) await dkd_send_push_event_value('dkd_urgent_product_total_sent', dkd_order_id_value);
      return;
    }
    if (dkd_action_value === 'pickup_items') {
      const dkd_result_data_value = await dkd_rpc_action_value('dkd_urgent_courier_pickup_items_dkd', { dkd_param_order_id: dkd_order_id_value }, 'Ürünler teslim alındı ve müşteriye doğru yola çıkıldı.');
      if (dkd_result_data_value) await dkd_send_push_event_value('dkd_urgent_items_picked_up', dkd_order_id_value);
      return;
    }
    if (dkd_action_value === 'complete_delivery') {
      const dkd_result_data_value = await dkd_rpc_action_value('dkd_urgent_courier_complete_delivery_dkd', { dkd_param_order_id: dkd_order_id_value }, 'Sipariş teslim edildi ve tamamlandı.');
      if (dkd_result_data_value) await dkd_send_push_event_value('dkd_urgent_delivery_completed', dkd_order_id_value);
      return;
    }
    if (dkd_action_value === 'open_invoice') {
      const dkd_order_value = dkd_find_order_by_id_value(dkd_order_id_value);
      dkd_open_invoice_preview_value(dkd_order_value?.dkd_invoice_image_url || '');
      return;
    }
    if (dkd_action_value === 'approve_product_total') {
      const dkd_result_data_value = await dkd_rpc_action_value('dkd_urgent_courier_customer_approve_product_total_dkd', { dkd_param_order_id: dkd_order_id_value }, 'Ürün toplamı onaylandı. Kurye satın alma adımına geçebilir.');
      if (dkd_result_data_value) await dkd_send_push_event_value('dkd_urgent_auto_message', dkd_order_id_value);
      return;
    }
    if (dkd_action_value === 'upload_invoice') {
      await dkd_handle_invoice_upload_value(dkd_order_id_value);
      return;
    }
    if (dkd_action_value === 'send_message') {
      const dkd_input_node_value = document.querySelector(`[data-dkd-urgent-message-input="${dkd_order_id_value}"]`);
      const dkd_message_value = String(dkd_input_node_value?.value || '').trim();
      if (!dkd_message_value) return;
      const dkd_result_data_value = await dkd_rpc_action_value('dkd_urgent_courier_send_message_dkd', { dkd_param_order_id: dkd_order_id_value, dkd_param_message_text: dkd_message_value }, 'Mesaj gönderildi.');
      if (dkd_result_data_value?.dkd_message_id) await dkd_send_push_event_value('dkd_urgent_message_sent', dkd_order_id_value, dkd_result_data_value.dkd_message_id);
    }
  }

  function dkd_bind_events_value() {
    document.addEventListener('click', async (dkd_click_event_value) => {
      const dkd_urgent_category_node_value = dkd_click_event_value.target.closest('[data-dkd-category="urgent_courier"]');
      if (dkd_urgent_category_node_value) {
        dkd_click_event_value.preventDefault();
        dkd_click_event_value.stopPropagation();
        dkd_click_event_value.stopImmediatePropagation();
        await dkd_open_urgent_view_value();
        return;
      }

      const dkd_invoice_close_node_value = dkd_click_event_value.target.closest('[data-dkd-urgent-invoice-close]');
      const dkd_invoice_overlay_node_value = dkd_click_event_value.target?.id === 'dkd_market_urgent_invoice_modal';
      if (dkd_invoice_close_node_value || dkd_invoice_overlay_node_value) {
        dkd_click_event_value.preventDefault();
        dkd_close_invoice_preview_value();
        return;
      }

      const dkd_category_node_value = dkd_click_event_value.target.closest('[data-dkd-category]');
      const dkd_bottom_node_value = dkd_click_event_value.target.closest('[data-dkd-bottom-action]');
      const dkd_brand_node_value = dkd_click_event_value.target.closest('.dkd_market_brand_block');
      const dkd_nav_target_node_value = dkd_click_event_value.target.closest('[data-dkd-nav-target]');
      if ((dkd_category_node_value && dkd_category_node_value.getAttribute('data-dkd-category') !== 'urgent_courier') || dkd_bottom_node_value || dkd_brand_node_value || dkd_nav_target_node_value) {
        window.setTimeout(dkd_hide_urgent_view_value, 0);
      }

      const dkd_tab_node_value = dkd_click_event_value.target.closest('[data-dkd-urgent-tab]');
      if (dkd_tab_node_value) {
        dkd_urgent_state_value.dkd_active_tab_value = dkd_tab_node_value.getAttribute('data-dkd-urgent-tab') || 'create';
        dkd_render_panel_value();
        return;
      }

      const dkd_action_node_value = dkd_click_event_value.target.closest('[data-dkd-urgent-action]');
      if (dkd_action_node_value) {
        await dkd_handle_action_value(
          dkd_action_node_value.getAttribute('data-dkd-urgent-action') || '',
          dkd_action_node_value.getAttribute('data-dkd-urgent-order-id') || '',
        );
        return;
      }

      if (dkd_click_event_value.target?.id === 'dkd_market_urgent_refresh_button') {
        await dkd_load_snapshot_value({ dkd_force_value: true });
        dkd_show_toast_value('Acil Kurye verisi yenilendi.');
      }
    }, true);

    document.addEventListener('submit', async (dkd_submit_event_value) => {
      if (dkd_submit_event_value.target?.id !== 'dkd_market_urgent_create_form') return;
      await dkd_submit_order_value(dkd_submit_event_value);
    }, true);
  }


  function dkd_is_input_focus_inside_urgent_value() {
    const dkd_view_node_value = dkd_get_element_value('dkd_market_urgent_courier_view');
    const dkd_active_node_value = document.activeElement;
    if (!dkd_view_node_value || !dkd_active_node_value || !dkd_view_node_value.contains(dkd_active_node_value)) return false;
    return ['INPUT', 'TEXTAREA', 'SELECT'].includes(String(dkd_active_node_value.tagName || '').toUpperCase());
  }

  function dkd_should_auto_refresh_value() {
    const dkd_view_node_value = dkd_get_element_value('dkd_market_urgent_courier_view');
    if (!dkd_view_node_value || dkd_view_node_value.hidden) return false;
    if (dkd_urgent_state_value.dkd_active_tab_value === 'create') return false;
    return !dkd_is_input_focus_inside_urgent_value();
  }

  function dkd_queue_snapshot_refresh_value() {
    window.clearTimeout(dkd_urgent_state_value.dkd_realtime_debounce_timer_value);
    dkd_urgent_state_value.dkd_realtime_debounce_timer_value = window.setTimeout(() => {
      if (dkd_should_auto_refresh_value()) dkd_load_snapshot_value();
    }, 1200);
  }

  function dkd_attach_realtime_value() {
    const dkd_client_value = dkd_create_supabase_client_value();
    if (!dkd_client_value || dkd_urgent_state_value.dkd_realtime_channel_value) return;
    dkd_urgent_state_value.dkd_realtime_channel_value = dkd_client_value
      .channel('dkd_urgent_courier_live_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dkd_urgent_courier_orders' }, () => dkd_queue_snapshot_refresh_value())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dkd_urgent_courier_messages' }, () => dkd_queue_snapshot_refresh_value())
      .subscribe();
  }

  function dkd_start_polling_value() {
    window.clearInterval(dkd_urgent_state_value.dkd_refresh_timer_value);
    dkd_urgent_state_value.dkd_refresh_timer_value = window.setInterval(() => {
      const dkd_view_node_value = dkd_get_element_value('dkd_market_urgent_courier_view');
      if (dkd_view_node_value && !dkd_view_node_value.hidden && dkd_should_auto_refresh_value()) dkd_load_snapshot_value();
    }, 180000);
  }

  async function dkd_init_value() {
    dkd_install_urgent_shell_value();
    dkd_bind_events_value();
    await dkd_refresh_session_value();
    dkd_attach_realtime_value();
    dkd_start_polling_value();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', dkd_init_value);
  } else {
    dkd_init_value();
  }
})();
