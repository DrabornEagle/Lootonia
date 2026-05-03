(function dkd_market_web_merchant_portal_boot_value() {
  'use strict';

  const dkd_portal_state_value = {
    dkd_client_value: null,
    dkd_session_value: null,
    dkd_snapshot_value: null,
    dkd_active_tab_value: 'today',
    dkd_loading_value: false,
  };

  const dkd_tab_values = [
    { dkd_key_value: 'today', dkd_label_value: 'Bugün', dkd_icon_value: '▦' },
    { dkd_key_value: 'campaign', dkd_label_value: 'Kampanya', dkd_icon_value: '📣' },
    { dkd_key_value: 'market', dkd_label_value: 'Market', dkd_icon_value: '🏪' },
    { dkd_key_value: 'cash', dkd_label_value: 'Kasa', dkd_icon_value: '₺' },
    { dkd_key_value: 'business', dkd_label_value: 'İşletmem', dkd_icon_value: 'ⓘ' },
  ];

  function dkd_escape_html_value(dkd_raw_value) {
    return String(dkd_raw_value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function dkd_format_number_value(dkd_number_value) {
    const dkd_safe_number_value = Number(dkd_number_value || 0);
    return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(dkd_safe_number_value);
  }

  function dkd_format_money_value(dkd_number_value) {
    const dkd_safe_number_value = Number(dkd_number_value || 0);
    return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(dkd_safe_number_value);
  }

  function dkd_get_config_value() {
    return window.dkd_market_web_config || window.dkdMarketWebConfig || null;
  }

  function dkd_get_client_value() {
    if (dkd_portal_state_value.dkd_client_value) return dkd_portal_state_value.dkd_client_value;
    const dkd_config_value = dkd_get_config_value();
    if (!dkd_config_value?.dkd_supabase_url || !dkd_config_value?.dkd_supabase_anon_key || !window.supabase?.createClient) {
      return null;
    }
    dkd_portal_state_value.dkd_client_value = window.supabase.createClient(
      dkd_config_value.dkd_supabase_url,
      dkd_config_value.dkd_supabase_anon_key,
      { auth: { persistSession: true, autoRefreshToken: true } },
    );
    return dkd_portal_state_value.dkd_client_value;
  }

  async function dkd_get_session_value() {
    const dkd_client_value = dkd_get_client_value();
    if (!dkd_client_value) return null;
    const dkd_session_result_value = await dkd_client_value.auth.getSession();
    dkd_portal_state_value.dkd_session_value = dkd_session_result_value.data?.session || null;
    return dkd_portal_state_value.dkd_session_value;
  }

  function dkd_show_toast_value(dkd_message_value, dkd_is_error_value = false) {
    const dkd_toast_node_value = document.getElementById('dkd_market_toast');
    if (!dkd_toast_node_value) {
      window.alert(dkd_message_value);
      return;
    }
    dkd_toast_node_value.textContent = dkd_message_value;
    dkd_toast_node_value.hidden = false;
    dkd_toast_node_value.classList.toggle('dkd_market_toast_error', Boolean(dkd_is_error_value));
    window.clearTimeout(dkd_toast_node_value.dkdMerchantPortalTimerValue);
    dkd_toast_node_value.dkdMerchantPortalTimerValue = window.setTimeout(() => {
      dkd_toast_node_value.hidden = true;
      dkd_toast_node_value.classList.remove('dkd_market_toast_error');
    }, 3300);
  }

  function dkd_get_modal_node_value() {
    let dkd_modal_node_value = document.getElementById('dkd_web_merchant_portal_modal');
    if (dkd_modal_node_value) return dkd_modal_node_value;

    dkd_modal_node_value = document.createElement('section');
    dkd_modal_node_value.id = 'dkd_web_merchant_portal_modal';
    dkd_modal_node_value.className = 'dkd_web_merchant_portal_modal';
    dkd_modal_node_value.hidden = true;
    dkd_modal_node_value.innerHTML = `
      <div class="dkd_web_merchant_portal_backdrop" data-dkd-merchant-close="true"></div>
      <div class="dkd_web_merchant_portal_panel">
        <div id="dkd_web_merchant_portal_body" class="dkd_web_merchant_portal_body"></div>
      </div>
    `;
    document.body.appendChild(dkd_modal_node_value);
    return dkd_modal_node_value;
  }

  function dkd_open_modal_value() {
    const dkd_modal_node_value = dkd_get_modal_node_value();
    dkd_modal_node_value.hidden = false;
    document.documentElement.classList.add('dkd_web_merchant_portal_open');
    document.body.classList.add('dkd_web_merchant_portal_open');
  }

  function dkd_close_modal_value() {
    const dkd_modal_node_value = dkd_get_modal_node_value();
    dkd_modal_node_value.hidden = true;
    document.documentElement.classList.remove('dkd_web_merchant_portal_open');
    document.body.classList.remove('dkd_web_merchant_portal_open');
  }

  function dkd_get_snapshot_business_value() {
    return dkd_portal_state_value.dkd_snapshot_value?.business || {};
  }

  function dkd_get_snapshot_metrics_value() {
    return dkd_portal_state_value.dkd_snapshot_value?.metrics || {};
  }

  function dkd_normalize_array_value(dkd_input_value) {
    return Array.isArray(dkd_input_value) ? dkd_input_value : [];
  }

  function dkd_build_metric_card_value(dkd_label_value, dkd_value_value, dkd_tone_value) {
    return `
      <article class="dkd_web_merchant_metric_card dkd_web_merchant_metric_${dkd_escape_html_value(dkd_tone_value)}">
        <span class="dkd_web_merchant_metric_icon" aria-hidden="true"></span>
        <small>${dkd_escape_html_value(dkd_label_value)}</small>
        <strong>${dkd_escape_html_value(dkd_value_value)}</strong>
      </article>
    `;
  }

  function dkd_build_bar_rows_value(dkd_items_value, dkd_label_key_value, dkd_count_key_value, dkd_empty_text_value) {
    const dkd_safe_items_value = dkd_normalize_array_value(dkd_items_value).slice(0, 8);
    const dkd_max_count_value = Math.max(1, ...dkd_safe_items_value.map((dkd_item_value) => Number(dkd_item_value?.[dkd_count_key_value] || 0)));
    if (!dkd_safe_items_value.length) {
      return `<div class="dkd_web_merchant_empty_line">${dkd_escape_html_value(dkd_empty_text_value)}</div>`;
    }
    return dkd_safe_items_value.map((dkd_item_value) => {
      const dkd_count_value = Number(dkd_item_value?.[dkd_count_key_value] || 0);
      const dkd_width_value = Math.max(8, Math.round((dkd_count_value / dkd_max_count_value) * 100));
      return `
        <div class="dkd_web_merchant_bar_row">
          <span>${dkd_escape_html_value(dkd_item_value?.[dkd_label_key_value] ?? '-')}</span>
          <div class="dkd_web_merchant_bar_track"><i style="width:${dkd_width_value}%"></i></div>
          <strong>${dkd_format_number_value(dkd_count_value)}</strong>
        </div>
      `;
    }).join('');
  }

  function dkd_build_header_value() {
    const dkd_business_value = dkd_get_snapshot_business_value();
    const dkd_business_name_value = dkd_business_value.name || 'İşletme Panelim';
    const dkd_business_area_value = [dkd_business_value.city, dkd_business_value.district, dkd_business_value.category]
      .filter(Boolean)
      .join(' • ') || dkd_business_value.address_text || 'Lootonia işletme senkronu';
    return `
      <header class="dkd_web_merchant_hero">
        <div class="dkd_web_merchant_hero_copy">
          <span class="dkd_web_merchant_kicker">Merchant Portal</span>
          <h2>İşletme Panelim</h2>
          <div class="dkd_web_merchant_business_chip">
            <strong>${dkd_escape_html_value(dkd_business_name_value)}</strong>
            <small>${dkd_escape_html_value(dkd_business_area_value)}</small>
          </div>
        </div>
        <div class="dkd_web_merchant_hero_actions">
          <button type="button" class="dkd_web_merchant_icon_action" data-dkd-merchant-refresh="true">↻ Yenile</button>
          <button type="button" class="dkd_web_merchant_icon_action" data-dkd-merchant-close="true">× Kapat</button>
        </div>
      </header>
    `;
  }

  function dkd_build_tabs_value() {
    return `
      <nav class="dkd_web_merchant_tabs">
        ${dkd_tab_values.map((dkd_tab_value) => `
          <button type="button" class="dkd_web_merchant_tab ${dkd_portal_state_value.dkd_active_tab_value === dkd_tab_value.dkd_key_value ? 'dkd_web_merchant_tab_active' : ''}" data-dkd-merchant-tab="${dkd_escape_html_value(dkd_tab_value.dkd_key_value)}">
            <span>${dkd_escape_html_value(dkd_tab_value.dkd_icon_value)}</span>
            ${dkd_escape_html_value(dkd_tab_value.dkd_label_value)}
          </button>
        `).join('')}
      </nav>
    `;
  }

  function dkd_render_today_tab_value() {
    const dkd_metrics_value = dkd_get_snapshot_metrics_value();
    const dkd_hourly_values = dkd_normalize_array_value(dkd_portal_state_value.dkd_snapshot_value?.hourly).map((dkd_item_value) => ({
      hour: `${String(dkd_item_value.hour ?? '0').padStart(2, '0')}:00`,
      count: Number(dkd_item_value.count || 0),
    }));
    const dkd_daily_values = dkd_normalize_array_value(dkd_portal_state_value.dkd_snapshot_value?.daily).map((dkd_item_value) => ({
      day: String(dkd_item_value.day || '').slice(5) || dkd_item_value.day,
      count: Number(dkd_item_value.count || 0),
    }));
    const dkd_task_values = dkd_normalize_array_value(dkd_portal_state_value.dkd_snapshot_value?.tasks).map((dkd_item_value) => ({
      task: dkd_item_value.task_key || 'organik',
      count: Number(dkd_item_value.count || 0),
    }));

    return `
      <section class="dkd_web_merchant_metric_grid">
        ${dkd_build_metric_card_value('Bugün Oyuncu', dkd_format_number_value(dkd_metrics_value.today_players), 'aqua')}
        ${dkd_build_metric_card_value('QR Okutma', dkd_format_number_value(dkd_metrics_value.scan_count), 'green')}
        ${dkd_build_metric_card_value('Kupon Kullanım', dkd_format_number_value(dkd_metrics_value.coupon_count), 'gold')}
        ${dkd_build_metric_card_value('Dönüşüm', `%${dkd_format_number_value(dkd_metrics_value.conversion_rate)}`, 'purple')}
        ${dkd_build_metric_card_value('Yeni Oyuncu', dkd_format_number_value(dkd_metrics_value.new_players), 'blue')}
        ${dkd_build_metric_card_value('Geri Gelen', dkd_format_number_value(dkd_metrics_value.returning_players), 'mint')}
      </section>
      <section class="dkd_web_merchant_chart_block">
        <h3>Saatlik yoğunluk</h3>
        <p>Hangi saatlerde mağazaya daha çok oyuncu gelmiş?</p>
        ${dkd_build_bar_rows_value(dkd_hourly_values, 'hour', 'count', 'Bugün için saatlik veri yok.')}
      </section>
      <section class="dkd_web_merchant_chart_block">
        <h3>Son 7 günlük akış</h3>
        <p>İşletmenin günlük nabzı</p>
        ${dkd_build_bar_rows_value(dkd_daily_values, 'day', 'count', 'Son 7 gün için veri yok.')}
      </section>
      <section class="dkd_web_merchant_chart_block">
        <h3>Trafik getiren görevler</h3>
        <p>Hangi görev gerçekten oyuncu taşıyor?</p>
        ${dkd_build_bar_rows_value(dkd_task_values, 'task', 'count', 'Görev kaynaklı trafik henüz yok.')}
      </section>
    `;
  }

  function dkd_render_campaign_tab_value() {
    const dkd_campaign_value = dkd_normalize_array_value(dkd_portal_state_value.dkd_snapshot_value?.campaigns)[0] || {};
    return `
      <section class="dkd_web_merchant_form_card">
        <h3>Kampanya kontrolü</h3>
        <p>Buradan yaptığın kampanya değişikliği Supabase dkd_business_campaigns kaydına yazılır.</p>
        <input type="hidden" id="dkd_web_merchant_campaign_id" value="${dkd_escape_html_value(dkd_campaign_value.id || '')}" />
        <label><span>Kampanya başlığı</span><input id="dkd_web_merchant_campaign_title" value="${dkd_escape_html_value(dkd_campaign_value.title || '')}" placeholder="Örn. Lahmacun görevi" /></label>
        <label><span>Kısa açıklama</span><input id="dkd_web_merchant_campaign_subtitle" value="${dkd_escape_html_value(dkd_campaign_value.subtitle || '')}" placeholder="Oyuncuya görünen açıklama" /></label>
        <label><span>Ödül / kupon etiketi</span><input id="dkd_web_merchant_campaign_reward" value="${dkd_escape_html_value(dkd_campaign_value.coupon_reward_label || dkd_campaign_value.sponsor_name || '')}" placeholder="Örn. %10 indirim" /></label>
        <label><span>Stok / kullanım limiti</span><input id="dkd_web_merchant_campaign_stock" type="number" min="0" value="${dkd_escape_html_value(dkd_campaign_value.stock_total ?? dkd_campaign_value.stock_limit ?? 0)}" /></label>
        <label class="dkd_web_merchant_toggle_line"><span>Kampanya aktif</span><input id="dkd_web_merchant_campaign_active" type="checkbox" ${dkd_campaign_value.is_active !== false ? 'checked' : ''} /></label>
        <button type="button" class="dkd_web_merchant_save_button" data-dkd-merchant-save-campaign="true">Kampanyayı Kaydet</button>
      </section>
    `;
  }

  function dkd_render_market_tab_value() {
    const dkd_products_value = dkd_normalize_array_value(dkd_portal_state_value.dkd_snapshot_value?.products).slice(0, 8);
    const dkd_product_rows_value = dkd_products_value.map((dkd_product_value) => `
      <article class="dkd_web_merchant_product_row" data-dkd-merchant-product-id="${dkd_escape_html_value(dkd_product_value.id || '')}">
        <div class="dkd_web_merchant_product_meta">
          <strong>${dkd_escape_html_value(dkd_product_value.title || 'Ürün')}</strong>
          <small>${dkd_escape_html_value(dkd_product_value.source_table || 'dkd_business_products')}</small>
        </div>
        <input data-dkd-merchant-product-title="true" value="${dkd_escape_html_value(dkd_product_value.title || '')}" placeholder="Ürün adı" />
        <input data-dkd-merchant-product-price="true" type="number" min="0" step="0.01" value="${dkd_escape_html_value(dkd_product_value.price_cash ?? 0)}" placeholder="TL" />
        <input data-dkd-merchant-product-stock="true" type="number" min="0" value="${dkd_escape_html_value(dkd_product_value.stock ?? 0)}" placeholder="Stok" />
        <label class="dkd_web_merchant_product_switch"><input data-dkd-merchant-product-active="true" type="checkbox" ${dkd_product_value.is_active !== false ? 'checked' : ''} /> Aktif</label>
        <button type="button" data-dkd-merchant-save-product="true">Kaydet</button>
      </article>
    `).join('');

    return `
      <section class="dkd_web_merchant_form_card">
        <h3>Market ürünleri</h3>
        <p>Ürün adı, TL fiyatı, stok ve aktiflik webden güncellenir; vitrin ve uygulama aynı kaydı okur.</p>
        <div class="dkd_web_merchant_product_list">${dkd_product_rows_value || '<div class="dkd_web_merchant_empty_line">Henüz ürün yok. Aşağıdan yeni ürün ekleyebilirsin.</div>'}</div>
      </section>
      <section class="dkd_web_merchant_form_card dkd_web_merchant_new_product_card">
        <h3>Yeni ürün ekle</h3>
        <input id="dkd_web_merchant_new_product_title" placeholder="Ürün adı" />
        <input id="dkd_web_merchant_new_product_price" type="number" min="0" step="0.01" placeholder="TL fiyat" />
        <input id="dkd_web_merchant_new_product_stock" type="number" min="0" placeholder="Stok" />
        <button type="button" class="dkd_web_merchant_save_button" data-dkd-merchant-create-product="true">Ürünü Ekle</button>
      </section>
    `;
  }

  function dkd_render_cash_tab_value() {
    const dkd_cash_value = dkd_portal_state_value.dkd_snapshot_value?.cash || {};
    return `
      <section class="dkd_web_merchant_metric_grid dkd_web_merchant_cash_grid">
        ${dkd_build_metric_card_value('Toplam Sipariş', dkd_format_number_value(dkd_cash_value.order_count), 'blue')}
        ${dkd_build_metric_card_value('Aktif Sipariş', dkd_format_number_value(dkd_cash_value.active_count), 'green')}
        ${dkd_build_metric_card_value('Teslim', dkd_format_number_value(dkd_cash_value.delivered_count), 'gold')}
        ${dkd_build_metric_card_value('TL Kontrol', 'Canlı', 'purple')}
      </section>
      <section class="dkd_web_merchant_chart_block">
        <h3>Kasa kontrolü</h3>
        <p>Bu alan işletme siparişleri ve teslimatlar arttıkça canlı snapshot üzerinden güncellenir.</p>
      </section>
    `;
  }

  function dkd_render_business_tab_value() {
    const dkd_business_value = dkd_get_snapshot_business_value();
    return `
      <section class="dkd_web_merchant_form_card">
        <h3>İşletmem</h3>
        <p>İşletme adı, kategori ve adres uygulamadaki işletme kaydıyla aynı Supabase tablosuna yazılır.</p>
        <label><span>İşletme adı</span><input id="dkd_web_merchant_business_name" value="${dkd_escape_html_value(dkd_business_value.name || '')}" /></label>
        <label><span>Kategori</span><input id="dkd_web_merchant_business_category" value="${dkd_escape_html_value(dkd_business_value.category || '')}" placeholder="Örn. yemek" /></label>
        <label><span>Adres</span><textarea id="dkd_web_merchant_business_address" rows="4" placeholder="İşletme adresi">${dkd_escape_html_value(dkd_business_value.address_text || '')}</textarea></label>
        <button type="button" class="dkd_web_merchant_save_button" data-dkd-merchant-save-business="true">İşletmeyi Kaydet</button>
      </section>
    `;
  }

  function dkd_build_tab_body_value() {
    if (dkd_portal_state_value.dkd_loading_value) {
      return `<section class="dkd_web_merchant_loading">Merchant Portal canlı veri alıyor…</section>`;
    }
    if (!dkd_portal_state_value.dkd_snapshot_value?.ok) {
      return `
        <section class="dkd_web_merchant_empty_state">
          <h3>İşletme bulunamadı</h3>
          <p>Bu panel yalnızca işletme sahibi/yöneticisi hesaplarda açılır.</p>
        </section>
      `;
    }
    if (dkd_portal_state_value.dkd_active_tab_value === 'campaign') return dkd_render_campaign_tab_value();
    if (dkd_portal_state_value.dkd_active_tab_value === 'market') return dkd_render_market_tab_value();
    if (dkd_portal_state_value.dkd_active_tab_value === 'cash') return dkd_render_cash_tab_value();
    if (dkd_portal_state_value.dkd_active_tab_value === 'business') return dkd_render_business_tab_value();
    return dkd_render_today_tab_value();
  }

  function dkd_render_portal_value() {
    const dkd_body_node_value = document.getElementById('dkd_web_merchant_portal_body');
    if (!dkd_body_node_value) return;
    dkd_body_node_value.innerHTML = `
      ${dkd_build_header_value()}
      ${dkd_build_tabs_value()}
      <main class="dkd_web_merchant_content">${dkd_build_tab_body_value()}</main>
    `;
  }

  async function dkd_load_snapshot_value() {
    const dkd_session_value = await dkd_get_session_value();
    const dkd_client_value = dkd_get_client_value();
    if (!dkd_client_value || !dkd_session_value?.user?.id) {
      dkd_portal_state_value.dkd_snapshot_value = { ok: false, reason: 'auth_required' };
      dkd_render_portal_value();
      dkd_show_toast_value('İşletme Panelim için giriş yapmalısın.', true);
      return;
    }
    try {
      dkd_portal_state_value.dkd_loading_value = true;
      dkd_render_portal_value();
      const dkd_result_value = await dkd_client_value.rpc('dkd_web_merchant_portal_snapshot_dkd');
      if (dkd_result_value.error) throw dkd_result_value.error;
      dkd_portal_state_value.dkd_snapshot_value = dkd_result_value.data || { ok: false, reason: 'empty_snapshot' };
    } catch (dkd_error_value) {
      dkd_portal_state_value.dkd_snapshot_value = { ok: false, reason: dkd_error_value.message || 'snapshot_failed' };
      dkd_show_toast_value(dkd_error_value.message || 'İşletme paneli verisi alınamadı.', true);
    } finally {
      dkd_portal_state_value.dkd_loading_value = false;
      dkd_render_portal_value();
    }
  }

  async function dkd_open_merchant_portal_value() {
    dkd_open_modal_value();
    await dkd_load_snapshot_value();
  }

  async function dkd_save_campaign_value() {
    const dkd_client_value = dkd_get_client_value();
    const dkd_business_id_value = dkd_get_snapshot_business_value().id;
    if (!dkd_client_value || !dkd_business_id_value) return;
    const dkd_payload_value = {
      dkd_param_business_id: dkd_business_id_value,
      dkd_param_campaign_id: document.getElementById('dkd_web_merchant_campaign_id')?.value || null,
      dkd_param_title: document.getElementById('dkd_web_merchant_campaign_title')?.value || '',
      dkd_param_subtitle: document.getElementById('dkd_web_merchant_campaign_subtitle')?.value || '',
      dkd_param_reward_label: document.getElementById('dkd_web_merchant_campaign_reward')?.value || '',
      dkd_param_stock_total: Number(document.getElementById('dkd_web_merchant_campaign_stock')?.value || 0),
      dkd_param_is_active: Boolean(document.getElementById('dkd_web_merchant_campaign_active')?.checked),
    };
    const dkd_result_value = await dkd_client_value.rpc('dkd_web_merchant_portal_save_campaign_dkd', dkd_payload_value);
    if (dkd_result_value.error || dkd_result_value.data?.ok === false) throw new Error(dkd_result_value.error?.message || dkd_result_value.data?.reason || 'Kampanya kaydedilemedi.');
    dkd_show_toast_value('Kampanya uygulama ile senkron kaydedildi.');
    await dkd_load_snapshot_value();
  }

  async function dkd_save_product_value(dkd_row_node_value) {
    const dkd_client_value = dkd_get_client_value();
    const dkd_business_id_value = dkd_get_snapshot_business_value().id;
    if (!dkd_client_value || !dkd_business_id_value) return;
    const dkd_payload_value = {
      dkd_param_business_id: dkd_business_id_value,
      dkd_param_product_id: dkd_row_node_value?.getAttribute('data-dkd-merchant-product-id') || null,
      dkd_param_title: dkd_row_node_value?.querySelector('[data-dkd-merchant-product-title]')?.value || '',
      dkd_param_price_cash: Number(dkd_row_node_value?.querySelector('[data-dkd-merchant-product-price]')?.value || 0),
      dkd_param_stock: Number(dkd_row_node_value?.querySelector('[data-dkd-merchant-product-stock]')?.value || 0),
      dkd_param_is_active: Boolean(dkd_row_node_value?.querySelector('[data-dkd-merchant-product-active]')?.checked),
    };
    const dkd_result_value = await dkd_client_value.rpc('dkd_web_merchant_portal_save_product_dkd', dkd_payload_value);
    if (dkd_result_value.error || dkd_result_value.data?.ok === false) throw new Error(dkd_result_value.error?.message || dkd_result_value.data?.reason || 'Ürün kaydedilemedi.');
    dkd_show_toast_value('Ürün web ve uygulama vitriniyle senkron kaydedildi.');
    await dkd_load_snapshot_value();
  }

  async function dkd_create_product_value() {
    const dkd_client_value = dkd_get_client_value();
    const dkd_business_id_value = dkd_get_snapshot_business_value().id;
    if (!dkd_client_value || !dkd_business_id_value) return;
    const dkd_payload_value = {
      dkd_param_business_id: dkd_business_id_value,
      dkd_param_product_id: null,
      dkd_param_title: document.getElementById('dkd_web_merchant_new_product_title')?.value || '',
      dkd_param_price_cash: Number(document.getElementById('dkd_web_merchant_new_product_price')?.value || 0),
      dkd_param_stock: Number(document.getElementById('dkd_web_merchant_new_product_stock')?.value || 0),
      dkd_param_is_active: true,
    };
    const dkd_result_value = await dkd_client_value.rpc('dkd_web_merchant_portal_save_product_dkd', dkd_payload_value);
    if (dkd_result_value.error || dkd_result_value.data?.ok === false) throw new Error(dkd_result_value.error?.message || dkd_result_value.data?.reason || 'Ürün eklenemedi.');
    dkd_show_toast_value('Yeni ürün eklendi ve senkronlandı.');
    await dkd_load_snapshot_value();
  }

  async function dkd_save_business_value() {
    const dkd_client_value = dkd_get_client_value();
    const dkd_business_id_value = dkd_get_snapshot_business_value().id;
    if (!dkd_client_value || !dkd_business_id_value) return;
    const dkd_payload_value = {
      dkd_param_business_id: dkd_business_id_value,
      dkd_param_name: document.getElementById('dkd_web_merchant_business_name')?.value || '',
      dkd_param_category: document.getElementById('dkd_web_merchant_business_category')?.value || '',
      dkd_param_address_text: document.getElementById('dkd_web_merchant_business_address')?.value || '',
    };
    const dkd_result_value = await dkd_client_value.rpc('dkd_web_merchant_portal_save_business_dkd', dkd_payload_value);
    if (dkd_result_value.error || dkd_result_value.data?.ok === false) throw new Error(dkd_result_value.error?.message || dkd_result_value.data?.reason || 'İşletme kaydedilemedi.');
    dkd_show_toast_value('İşletme bilgisi web ve uygulamayla senkron kaydedildi.');
    await dkd_load_snapshot_value();
  }

  function dkd_relabel_filter_buttons_value() {
    document.querySelectorAll('[data-dkd-category]').forEach((dkd_button_node_value) => {
      const dkd_category_value = dkd_button_node_value.getAttribute('data-dkd-category');
      const dkd_filter_label_map_value = {
        business: 'Yemek Çeşitleri',
        courier_cargo: 'Kargo Oluştur',
      };
      const dkd_next_label_value = dkd_filter_label_map_value[dkd_category_value];
      if (!dkd_next_label_value) return;

      if (dkd_category_value === 'business') {
        dkd_button_node_value.classList.add('dkd_web_filter_yemek_cesitleri');
        if (dkd_text_node_value) dkd_text_node_value.textContent = 'Yemek Çeşitleri';
      }
      if (dkd_category_value === 'courier_cargo') {
        dkd_button_node_value.classList.add('dkd_web_filter_kargo_olustur');
      }

      const dkd_span_values = Array.from(dkd_button_node_value.querySelectorAll('span'));
      const dkd_text_node_value = dkd_span_values.find((dkd_span_node_value) => !String(dkd_span_node_value.className || '').includes('icon'))
        || dkd_span_values[dkd_span_values.length - 1]
        || dkd_button_node_value;

      if (String(dkd_text_node_value.textContent || '').trim() !== dkd_next_label_value) {
        dkd_text_node_value.textContent = dkd_next_label_value;
      }
    });
  }

  function dkd_install_filter_observer_value() {
    if (window.dkdMerchantPortalFilterObserverInstalledValue) return;
    window.dkdMerchantPortalFilterObserverInstalledValue = true;

    let dkd_filter_observer_queued_value = false;
    const dkd_schedule_filter_relabel_value = () => {
      if (dkd_filter_observer_queued_value) return;
      dkd_filter_observer_queued_value = true;
      const dkd_runner_value = () => {
        dkd_filter_observer_queued_value = false;
        try {
          dkd_relabel_filter_buttons_value();
        } catch (dkd_error_value) {
          console.warn('dkd merchant filter label guard skipped:', dkd_error_value);
        }
      };
      if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(dkd_runner_value);
      } else {
        window.setTimeout(dkd_runner_value, 120);
      }
    };

    dkd_relabel_filter_buttons_value();

    if (typeof MutationObserver !== 'function' || !document.body) return;
    const dkd_observer_value = new MutationObserver((dkd_mutation_values) => {
      const dkd_should_relabel_value = dkd_mutation_values.some((dkd_mutation_value) => Array.from(dkd_mutation_value.addedNodes || []).some((dkd_node_value) => {
        if (dkd_node_value.nodeType !== 1) return false;
        return Boolean(
          dkd_node_value.matches?.('[data-dkd-category]')
          || dkd_node_value.querySelector?.('[data-dkd-category]')
          || dkd_node_value.matches?.('.dkd_market_category_row')
          || dkd_node_value.querySelector?.('.dkd_market_category_row')
        );
      }));
      if (dkd_should_relabel_value) dkd_schedule_filter_relabel_value();
    });
    dkd_observer_value.observe(document.body, { childList: true, subtree: true });
    window.dkdMerchantPortalFilterObserverValue = dkd_observer_value;
  }

  document.addEventListener('click', async (dkd_click_event_value) => {
    const dkd_business_panel_node_value = dkd_click_event_value.target.closest('[data-dkd-business-panel-action="open"], [data-dkd-category="business_panel"], .dkd_market_business_owner_button');
    if (dkd_business_panel_node_value) {
      dkd_click_event_value.preventDefault();
      dkd_click_event_value.stopImmediatePropagation();
      await dkd_open_merchant_portal_value();
      return;
    }

    if (dkd_click_event_value.target.closest('[data-dkd-merchant-close="true"]')) {
      dkd_click_event_value.preventDefault();
      dkd_close_modal_value();
      return;
    }

    if (dkd_click_event_value.target.closest('[data-dkd-merchant-refresh="true"]')) {
      dkd_click_event_value.preventDefault();
      await dkd_load_snapshot_value();
      return;
    }

    const dkd_tab_node_value = dkd_click_event_value.target.closest('[data-dkd-merchant-tab]');
    if (dkd_tab_node_value) {
      dkd_click_event_value.preventDefault();
      dkd_portal_state_value.dkd_active_tab_value = dkd_tab_node_value.getAttribute('data-dkd-merchant-tab') || 'today';
      dkd_render_portal_value();
      return;
    }

    try {
      if (dkd_click_event_value.target.closest('[data-dkd-merchant-save-campaign="true"]')) {
        dkd_click_event_value.preventDefault();
        await dkd_save_campaign_value();
        return;
      }
      const dkd_save_product_node_value = dkd_click_event_value.target.closest('[data-dkd-merchant-save-product="true"]');
      if (dkd_save_product_node_value) {
        dkd_click_event_value.preventDefault();
        await dkd_save_product_value(dkd_save_product_node_value.closest('[data-dkd-merchant-product-id]'));
        return;
      }
      if (dkd_click_event_value.target.closest('[data-dkd-merchant-create-product="true"]')) {
        dkd_click_event_value.preventDefault();
        await dkd_create_product_value();
        return;
      }
      if (dkd_click_event_value.target.closest('[data-dkd-merchant-save-business="true"]')) {
        dkd_click_event_value.preventDefault();
        await dkd_save_business_value();
      }
    } catch (dkd_error_value) {
      dkd_show_toast_value(dkd_error_value.message || 'İşlem tamamlanamadı.', true);
    }
  }, true);

  function dkd_start_merchant_portal_dom_guard_value() {
    try {
      dkd_install_filter_observer_value();
      document.body?.classList.add('dkd_web_merchant_categories_polish');
    } catch (dkd_error_value) {
      console.warn('dkd merchant portal dom guard skipped:', dkd_error_value);
    }
  }

  document.addEventListener('DOMContentLoaded', dkd_start_merchant_portal_dom_guard_value, { once: true });

  if (document.readyState !== 'loading') {
    dkd_start_merchant_portal_dom_guard_value();
  }
})();
