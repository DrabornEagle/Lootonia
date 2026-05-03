(function dkd_urgent_courier_page_fix_bootstrap_value() {
  'use strict';

  const dkd_fix_state_value = {
    dkd_ready_value: false,
    dkd_open_value: false,
    dkd_client_value: null,
    dkd_observer_value: null,
    dkd_submit_busy_value: false,
  };

  const dkd_default_store_values = [
    { dkd_key_value: 'gimsa', dkd_label_value: 'Gimsa' },
    { dkd_key_value: 'bim', dkd_label_value: 'BİM' },
    { dkd_key_value: 'a101', dkd_label_value: 'A 101' },
    { dkd_key_value: 'sok', dkd_label_value: 'Şok' },
    { dkd_key_value: 'migros', dkd_label_value: 'Migros' },
  ];

  function dkd_fix_get_element_value(dkd_element_id_value) {
    return document.getElementById(dkd_element_id_value);
  }

  function dkd_fix_escape_html_value(dkd_raw_value) {
    return String(dkd_raw_value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function dkd_fix_text_value(dkd_node_value) {
    return String(dkd_node_value?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function dkd_fix_normalize_text_value(dkd_raw_value) {
    return String(dkd_raw_value || '')
      .toLocaleLowerCase('tr-TR')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function dkd_fix_is_urgent_trigger_value(dkd_node_value) {
    if (!dkd_node_value || dkd_node_value.closest?.('#dkd_urgent_courier_stable_panel')) return false;
    const dkd_text_value = dkd_fix_normalize_text_value(dkd_fix_text_value(dkd_node_value));
    const dkd_dataset_value = dkd_node_value.dataset || {};
    return dkd_text_value.includes('acil kurye')
      || dkd_text_value.includes('hızlı teslimat')
      || String(dkd_dataset_value.dkdCategory || '').toLowerCase() === 'urgent'
      || String(dkd_dataset_value.dkdFilter || '').toLowerCase() === 'urgent'
      || String(dkd_dataset_value.dkdUrgentCourier || '').toLowerCase() === 'true';
  }

  function dkd_fix_find_home_mount_value() {
    const dkd_intro_node_value = document.querySelector('.dkd_market_intro_section');
    const dkd_home_node_value = dkd_fix_get_element_value('dkd_market_home_view') || document.querySelector('.dkd_market_home_view') || document.querySelector('.dkd_market_shell');
    const dkd_existing_portal_value = dkd_fix_get_element_value('dkd_urgent_courier_stable_portal');
    if (dkd_existing_portal_value) return dkd_existing_portal_value;

    const dkd_portal_node_value = document.createElement('section');
    dkd_portal_node_value.id = 'dkd_urgent_courier_stable_portal';
    dkd_portal_node_value.className = 'dkd_urgent_courier_stable_portal';
    dkd_portal_node_value.hidden = true;

    if (dkd_intro_node_value?.parentNode) {
      dkd_intro_node_value.parentNode.insertBefore(dkd_portal_node_value, dkd_intro_node_value);
      return dkd_portal_node_value;
    }

    if (dkd_home_node_value) {
      dkd_home_node_value.appendChild(dkd_portal_node_value);
      return dkd_portal_node_value;
    }

    document.body.appendChild(dkd_portal_node_value);
    return dkd_portal_node_value;
  }

  function dkd_fix_build_store_total_markup_value() {
    return dkd_default_store_values.map((dkd_store_value) => `
      <label class="dkd_urgent_courier_store_card" data-dkd-urgent-store-card="${dkd_fix_escape_html_value(dkd_store_value.dkd_key_value)}">
        <span class="dkd_urgent_courier_store_check_wrap">
          <input type="checkbox" class="dkd_urgent_courier_store_check" data-dkd-urgent-store-check="${dkd_fix_escape_html_value(dkd_store_value.dkd_key_value)}" />
          <span>${dkd_fix_escape_html_value(dkd_store_value.dkd_label_value)}</span>
        </span>
        <input class="dkd_urgent_courier_store_total" data-dkd-urgent-store-total="${dkd_fix_escape_html_value(dkd_store_value.dkd_key_value)}" type="number" inputmode="decimal" min="0" step="0.01" placeholder="Ürün toplamı TL" />
      </label>
    `).join('');
  }

  function dkd_fix_render_panel_value() {
    const dkd_portal_node_value = dkd_fix_find_home_mount_value();
    if (!dkd_portal_node_value || dkd_fix_get_element_value('dkd_urgent_courier_stable_panel')) return;

    dkd_portal_node_value.innerHTML = `
      <section class="dkd_urgent_courier_stable_panel" id="dkd_urgent_courier_stable_panel" aria-label="Acil Kurye Siparişi">
        <div class="dkd_urgent_courier_panel_head">
          <div class="dkd_urgent_courier_panel_icon" aria-hidden="true">⚡</div>
          <div>
            <h2>Acil Kurye Siparişi</h2>
            <p>Market, fırın, eczane veya özel mağaza isteğini tek panelden gönder. Sipariş kurye havuzuna canlı düşer.</p>
          </div>
          <button type="button" class="dkd_urgent_courier_close_button" id="dkd_urgent_courier_close_button" aria-label="Acil Kurye panelini kapat">✕</button>
        </div>

        <form class="dkd_urgent_courier_form" id="dkd_urgent_courier_form">
          <div class="dkd_urgent_courier_grid">
            <label class="dkd_urgent_courier_field">
              <span>Ad Soyad</span>
              <input id="dkd_urgent_courier_name_input" type="text" autocomplete="name" placeholder="Ad Soyad" required />
            </label>
            <label class="dkd_urgent_courier_field">
              <span>Telefon</span>
              <input id="dkd_urgent_courier_phone_input" type="tel" autocomplete="tel" value="+90" placeholder="+90" required />
            </label>
          </div>

          <label class="dkd_urgent_courier_field">
            <span>Teslimat Adresi</span>
            <textarea id="dkd_urgent_courier_address_input" rows="3" placeholder="Mahalle, sokak, bina, daire ve tarif" required></textarea>
          </label>

          <div class="dkd_urgent_courier_store_panel">
            <div class="dkd_urgent_courier_store_head">
              <div>
                <strong>Mağaza ve ürün toplamları</strong>
                <span>Her mağaza için toplamı ayrı ayrı yaz.</span>
              </div>
              <button type="button" id="dkd_urgent_courier_add_store_button" class="dkd_urgent_courier_small_button">Mağaza ekle</button>
            </div>
            <div class="dkd_urgent_courier_store_list" id="dkd_urgent_courier_store_list">
              ${dkd_fix_build_store_total_markup_value()}
            </div>
          </div>

          <label class="dkd_urgent_courier_field">
            <span>Not / Alınacak ürünler</span>
            <textarea id="dkd_urgent_courier_note_input" rows="3" placeholder="Örn: Gimsa’dan süt, ekmek; BİM’den su. Fatura görseli sonradan iletilebilir."></textarea>
          </label>

          <div class="dkd_urgent_courier_total_card" id="dkd_urgent_courier_total_card">
            <span>Ürün toplamı</span>
            <strong id="dkd_urgent_courier_total_text">0 TL</strong>
          </div>

          <div class="dkd_urgent_courier_status" id="dkd_urgent_courier_status" hidden></div>

          <button type="submit" class="dkd_urgent_courier_submit_button" id="dkd_urgent_courier_submit_button">
            Acil Kurye Siparişi Oluştur
          </button>
        </form>
      </section>
    `;
  }

  function dkd_fix_get_client_value() {
    if (dkd_fix_state_value.dkd_client_value) return dkd_fix_state_value.dkd_client_value;
    const dkd_config_value = window.dkd_market_web_config || {};
    const dkd_supabase_url_value = String(dkd_config_value.dkd_supabase_url || '').trim();
    const dkd_supabase_key_value = String(dkd_config_value.dkd_supabase_anon_key || '').trim();
    if (!window.supabase?.createClient || !dkd_supabase_url_value || !dkd_supabase_key_value) return null;
    dkd_fix_state_value.dkd_client_value = window.supabase.createClient(dkd_supabase_url_value, dkd_supabase_key_value, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return dkd_fix_state_value.dkd_client_value;
  }

  function dkd_fix_set_status_value(dkd_message_value, dkd_status_kind_value = 'info') {
    const dkd_status_node_value = dkd_fix_get_element_value('dkd_urgent_courier_status');
    if (!dkd_status_node_value) return;
    dkd_status_node_value.hidden = false;
    dkd_status_node_value.className = `dkd_urgent_courier_status dkd_urgent_courier_status_${dkd_status_kind_value}`;
    dkd_status_node_value.textContent = dkd_message_value;
  }

  function dkd_fix_format_money_value(dkd_number_value) {
    return `${Number(dkd_number_value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
  }

  function dkd_fix_collect_store_totals_value() {
    const dkd_total_input_values = Array.from(document.querySelectorAll('[data-dkd-urgent-store-total]'));
    const dkd_store_total_values = [];
    for (const dkd_total_input_value of dkd_total_input_values) {
      const dkd_store_key_value = String(dkd_total_input_value.dataset.dkdUrgentStoreTotal || '').trim();
      const dkd_card_node_value = dkd_total_input_value.closest('[data-dkd-urgent-store-card]');
      const dkd_check_node_value = dkd_card_node_value?.querySelector('[data-dkd-urgent-store-check]');
      const dkd_label_value = dkd_card_node_value ? dkd_fix_text_value(dkd_card_node_value).replace(/Ürün toplamı TL/gi, '').trim() : dkd_store_key_value;
      const dkd_total_value = Number(dkd_total_input_value.value || 0);
      const dkd_checked_value = Boolean(dkd_check_node_value?.checked) || dkd_total_value > 0;
      if (!dkd_checked_value) continue;
      dkd_store_total_values.push({
        dkd_store_key: dkd_store_key_value,
        dkd_store_name: dkd_label_value || dkd_store_key_value,
        dkd_product_total_tl: Number.isFinite(dkd_total_value) ? Math.max(0, dkd_total_value) : 0,
      });
    }
    return dkd_store_total_values;
  }

  function dkd_fix_update_total_value() {
    const dkd_store_total_values = dkd_fix_collect_store_totals_value();
    const dkd_total_value = dkd_store_total_values.reduce((dkd_sum_value, dkd_store_value) => dkd_sum_value + Number(dkd_store_value.dkd_product_total_tl || 0), 0);
    const dkd_total_node_value = dkd_fix_get_element_value('dkd_urgent_courier_total_text');
    if (dkd_total_node_value) dkd_total_node_value.textContent = dkd_fix_format_money_value(dkd_total_value);
  }

  function dkd_fix_hide_native_duplicate_sections_value() {
    const dkd_panel_node_value = dkd_fix_get_element_value('dkd_urgent_courier_stable_panel');
    const dkd_candidate_values = Array.from(document.querySelectorAll('section, article, div, form'));
    for (const dkd_candidate_value of dkd_candidate_values) {
      if (!dkd_candidate_value || dkd_candidate_value === dkd_panel_node_value || dkd_candidate_value.closest?.('#dkd_urgent_courier_stable_panel')) continue;
      const dkd_text_value = dkd_fix_normalize_text_value(dkd_fix_text_value(dkd_candidate_value));
      const dkd_is_native_urgent_form_value = dkd_text_value.includes('acil kurye siparişi')
        && (dkd_text_value.includes('teslimat adresi') || dkd_text_value.includes('ad soyad') || dkd_text_value.includes('mağaza'));
      if (!dkd_is_native_urgent_form_value) continue;
      dkd_candidate_value.setAttribute('data-dkd-urgent-native-hidden', 'true');
    }
  }

  function dkd_fix_set_open_value(dkd_next_open_value) {
    dkd_fix_state_value.dkd_open_value = Boolean(dkd_next_open_value);
    const dkd_portal_node_value = dkd_fix_find_home_mount_value();
    if (dkd_portal_node_value) dkd_portal_node_value.hidden = !dkd_fix_state_value.dkd_open_value;
    document.body.classList.toggle('dkd_urgent_courier_stable_active', dkd_fix_state_value.dkd_open_value);
    if (dkd_fix_state_value.dkd_open_value) {
      dkd_fix_hide_native_duplicate_sections_value();
      window.setTimeout(() => {
        dkd_portal_node_value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    }
  }

  function dkd_fix_add_custom_store_value() {
    const dkd_store_name_value = window.prompt('Mağaza adı yaz');
    const dkd_clean_name_value = String(dkd_store_name_value || '').trim();
    if (!dkd_clean_name_value) return;
    const dkd_store_list_node_value = dkd_fix_get_element_value('dkd_urgent_courier_store_list');
    if (!dkd_store_list_node_value) return;
    const dkd_store_key_value = `custom_${Date.now()}`;
    const dkd_store_node_value = document.createElement('label');
    dkd_store_node_value.className = 'dkd_urgent_courier_store_card';
    dkd_store_node_value.dataset.dkdUrgentStoreCard = dkd_store_key_value;
    dkd_store_node_value.innerHTML = `
      <span class="dkd_urgent_courier_store_check_wrap">
        <input type="checkbox" class="dkd_urgent_courier_store_check" data-dkd-urgent-store-check="${dkd_fix_escape_html_value(dkd_store_key_value)}" checked />
        <span>${dkd_fix_escape_html_value(dkd_clean_name_value)}</span>
      </span>
      <input class="dkd_urgent_courier_store_total" data-dkd-urgent-store-total="${dkd_fix_escape_html_value(dkd_store_key_value)}" type="number" inputmode="decimal" min="0" step="0.01" placeholder="Ürün toplamı TL" />
    `;
    dkd_store_list_node_value.appendChild(dkd_store_node_value);
    dkd_store_node_value.querySelector('input[type="number"]')?.focus();
  }

  async function dkd_fix_submit_order_value(dkd_event_value) {
    dkd_event_value.preventDefault();
    if (dkd_fix_state_value.dkd_submit_busy_value) return;

    const dkd_customer_name_value = String(dkd_fix_get_element_value('dkd_urgent_courier_name_input')?.value || '').trim();
    const dkd_phone_value = String(dkd_fix_get_element_value('dkd_urgent_courier_phone_input')?.value || '').trim();
    const dkd_address_value = String(dkd_fix_get_element_value('dkd_urgent_courier_address_input')?.value || '').trim();
    const dkd_note_value = String(dkd_fix_get_element_value('dkd_urgent_courier_note_input')?.value || '').trim();
    const dkd_store_total_values = dkd_fix_collect_store_totals_value();

    if (dkd_customer_name_value.length < 2) {
      dkd_fix_set_status_value('Ad soyad zorunlu.', 'error');
      return;
    }
    if (dkd_phone_value.replace(/\D/g, '').length < 10) {
      dkd_fix_set_status_value('Telefon numarası eksik görünüyor.', 'error');
      return;
    }
    if (dkd_address_value.length < 10) {
      dkd_fix_set_status_value('Teslimat adresini biraz daha detaylı yaz.', 'error');
      return;
    }
    if (!dkd_store_total_values.length) {
      dkd_fix_set_status_value('En az bir mağaza seç veya mağaza toplamı yaz.', 'error');
      return;
    }

    const dkd_client_value = dkd_fix_get_client_value();
    if (!dkd_client_value) {
      dkd_fix_set_status_value('Supabase web ayarı bulunamadı. dkd_market_web_config.js kontrol edilmeli.', 'error');
      return;
    }

    dkd_fix_state_value.dkd_submit_busy_value = true;
    const dkd_submit_button_value = dkd_fix_get_element_value('dkd_urgent_courier_submit_button');
    if (dkd_submit_button_value) dkd_submit_button_value.disabled = true;
    dkd_fix_set_status_value('Acil Kurye siparişi gönderiliyor...', 'info');

    try {
      const dkd_rpc_payload_value = {
        dkd_param_customer_name: dkd_customer_name_value,
        dkd_param_phone_text: dkd_phone_value,
        dkd_param_delivery_address_text: dkd_address_value,
        dkd_param_store_totals: dkd_store_total_values,
        dkd_param_note_text: dkd_note_value,
      };
      let dkd_result_value = await dkd_client_value.rpc('dkd_market_web_create_urgent_courier_order_dkd', dkd_rpc_payload_value);

      if (dkd_result_value.error) {
        const dkd_store_summary_value = dkd_store_total_values
          .map((dkd_store_value) => `${dkd_store_value.dkd_store_name}: ${dkd_fix_format_money_value(dkd_store_value.dkd_product_total_tl)}`)
          .join(' | ');
        const dkd_insert_payload_value = {
          title: 'Acil Kurye Siparişi',
          pickup: dkd_store_summary_value || 'Acil Kurye mağaza listesi',
          dropoff: dkd_address_value,
          reward_score: 18,
          distance_km: 1,
          eta_min: 15,
          job_type: 'urgent',
          is_active: true,
          status: 'open',
          delivery_address_text: dkd_address_value,
          delivery_note: dkd_note_value,
          fee_tl: 50,
          cargo_meta: {
            dkd_source: 'web_urgent_courier_stable_panel',
            dkd_customer_name: dkd_customer_name_value,
            dkd_phone_text: dkd_phone_value,
            dkd_store_totals: dkd_store_total_values,
            dkd_note_text: dkd_note_value,
          },
        };
        dkd_result_value = await dkd_client_value.from('dkd_courier_jobs').insert(dkd_insert_payload_value).select('id').single();
      }

      if (dkd_result_value.error) {
        throw dkd_result_value.error;
      }

      const dkd_order_id_value = dkd_result_value.data?.dkd_job_id || dkd_result_value.data?.id || dkd_result_value.data?.job_id || '';
      dkd_fix_set_status_value(`Acil Kurye siparişi oluşturuldu${dkd_order_id_value ? `: #${dkd_order_id_value}` : ''}. Kurye havuzuna canlı düşecek.`, 'success');
      dkd_fix_get_element_value('dkd_urgent_courier_form')?.reset();
      const dkd_phone_input_value = dkd_fix_get_element_value('dkd_urgent_courier_phone_input');
      if (dkd_phone_input_value) dkd_phone_input_value.value = '+90';
      dkd_fix_update_total_value();
      window.dispatchEvent(new CustomEvent('dkd_urgent_courier_order_created', { detail: dkd_result_value.data || {} }));
    } catch (dkd_error_value) {
      const dkd_message_value = String(dkd_error_value?.message || dkd_error_value || 'Acil Kurye siparişi gönderilemedi.');
      dkd_fix_set_status_value(dkd_message_value.replaceAll('_', ' '), 'error');
    } finally {
      dkd_fix_state_value.dkd_submit_busy_value = false;
      if (dkd_submit_button_value) dkd_submit_button_value.disabled = false;
    }
  }

  function dkd_fix_wire_panel_value() {
    dkd_fix_render_panel_value();
    const dkd_form_node_value = dkd_fix_get_element_value('dkd_urgent_courier_form');
    if (dkd_form_node_value && !dkd_form_node_value.dataset.dkdUrgentWired) {
      dkd_form_node_value.dataset.dkdUrgentWired = 'true';
      dkd_form_node_value.addEventListener('submit', dkd_fix_submit_order_value);
      dkd_form_node_value.addEventListener('input', dkd_fix_update_total_value);
      dkd_form_node_value.addEventListener('change', dkd_fix_update_total_value);
    }

    const dkd_close_button_value = dkd_fix_get_element_value('dkd_urgent_courier_close_button');
    if (dkd_close_button_value && !dkd_close_button_value.dataset.dkdUrgentWired) {
      dkd_close_button_value.dataset.dkdUrgentWired = 'true';
      dkd_close_button_value.addEventListener('click', () => dkd_fix_set_open_value(false));
    }

    const dkd_add_store_button_value = dkd_fix_get_element_value('dkd_urgent_courier_add_store_button');
    if (dkd_add_store_button_value && !dkd_add_store_button_value.dataset.dkdUrgentWired) {
      dkd_add_store_button_value.dataset.dkdUrgentWired = 'true';
      dkd_add_store_button_value.addEventListener('click', dkd_fix_add_custom_store_value);
    }
  }

  function dkd_fix_handle_click_value(dkd_event_value) {
    const dkd_click_node_value = dkd_event_value.target?.closest?.('button, a, [role="button"], [data-dkd-category], [data-dkd-filter], .dkd_market_category_button, .dkd_market_filter_button');
    if (!dkd_click_node_value) return;

    const dkd_bottom_action_value = String(dkd_click_node_value.dataset?.dkdBottomAction || '');
    if (dkd_bottom_action_value && dkd_bottom_action_value !== 'home') {
      dkd_fix_set_open_value(false);
      return;
    }

    if (!dkd_fix_is_urgent_trigger_value(dkd_click_node_value)) return;
    dkd_event_value.preventDefault();
    dkd_event_value.stopPropagation();
    dkd_fix_wire_panel_value();
    dkd_fix_set_open_value(true);
  }

  function dkd_fix_start_observer_value() {
    if (dkd_fix_state_value.dkd_observer_value) return;
    dkd_fix_state_value.dkd_observer_value = new MutationObserver(() => {
      dkd_fix_wire_panel_value();
      if (dkd_fix_state_value.dkd_open_value) dkd_fix_hide_native_duplicate_sections_value();
    });
    dkd_fix_state_value.dkd_observer_value.observe(document.body, { childList: true, subtree: true });
  }

  function dkd_fix_init_value() {
    if (dkd_fix_state_value.dkd_ready_value) return;
    dkd_fix_state_value.dkd_ready_value = true;
    dkd_fix_wire_panel_value();
    document.addEventListener('click', dkd_fix_handle_click_value, true);
    dkd_fix_start_observer_value();
    window.dkd_open_urgent_courier_panel = function dkd_open_urgent_courier_panel_value() {
      dkd_fix_wire_panel_value();
      dkd_fix_set_open_value(true);
    };
    window.dkd_close_urgent_courier_panel = function dkd_close_urgent_courier_panel_value() {
      dkd_fix_set_open_value(false);
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', dkd_fix_init_value);
  } else {
    dkd_fix_init_value();
  }
})();
