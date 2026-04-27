(function dkd_market_categories_cargo_choice_bootstrap_value() {
  const dkd_choice_sheet_id_value = 'dkd_market_cargo_choice_sheet';

  function dkd_scroll_top_value() {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function dkd_text_value(dkd_node_value) {
    return String(dkd_node_value?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function dkd_is_cargo_bottom_node_value(dkd_node_value) {
    if (!dkd_node_value) return false;
    const dkd_target_node_value = dkd_node_value.closest('button, a, [role="button"], .dkd_market_bottom_item, .dkd_market_nav_item, [data-dkd-bottom-action], [data-dkd-panel]');
    if (!dkd_target_node_value) return false;
    if (dkd_target_node_value.closest('#' + dkd_choice_sheet_id_value)) return false;

    const dkd_bottom_nav_node_value = dkd_target_node_value.closest('#dkd_market_bottom_nav, .dkd_market_bottom_nav, footer');
    if (!dkd_bottom_nav_node_value) return false;

    const dkd_text_check_value = dkd_text_value(dkd_target_node_value).toLowerCase();
    const dkd_action_check_value = [
      dkd_target_node_value.getAttribute('data-dkd-bottom-action'),
      dkd_target_node_value.getAttribute('data-dkd-panel'),
      dkd_target_node_value.getAttribute('aria-label'),
      dkd_target_node_value.id,
      dkd_target_node_value.className,
    ].map((dkd_item_value) => String(dkd_item_value || '').toLowerCase()).join(' ');

    const dkd_has_cargo_label_value = dkd_text_check_value === 'kurye kargo'
      || dkd_text_check_value === 'kurye-kargo'
      || dkd_text_check_value === 'kargo oluştur'
      || dkd_text_check_value.includes('kurye kargo')
      || dkd_text_check_value.includes('kurye-kargo')
      || dkd_text_check_value.includes('kargo oluştur');

    const dkd_has_cargo_action_value = dkd_action_check_value.includes('courier_cargo')
      || dkd_action_check_value.includes('cargo')
      || dkd_action_check_value.includes('courier');

    return dkd_has_cargo_label_value || dkd_has_cargo_action_value;
  }

  function dkd_find_existing_node_value(dkd_selector_values) {
    for (const dkd_selector_value of dkd_selector_values) {
      const dkd_node_value = document.querySelector(dkd_selector_value);
      if (dkd_node_value) return dkd_node_value;
    }
    return null;
  }

  function dkd_find_bottom_cargo_button_value() {
    const dkd_candidate_values = Array.from(document.querySelectorAll('button, a, [role="button"], .dkd_market_bottom_item, .dkd_market_nav_item, [data-dkd-bottom-action], [data-dkd-panel]'));
    return dkd_candidate_values.find((dkd_candidate_value) => dkd_is_cargo_bottom_node_value(dkd_candidate_value)) || null;
  }

  function dkd_open_urgent_courier_value() {
    dkd_close_choice_sheet_value();
    const dkd_urgent_node_value = dkd_find_existing_node_value([
      '[data-dkd-category="urgent_courier"]',
      '[data-dkd-bridge-action="urgent_courier"]',
      '#dkd_market_urgent_open_button'
    ]);
    if (dkd_urgent_node_value) {
      dkd_urgent_node_value.click();
      dkd_scroll_top_value();
      window.setTimeout(dkd_scroll_top_value, 180);
      return;
    }
    if (typeof window.dkd_open_urgent_courier_market_value === 'function') {
      window.dkd_open_urgent_courier_market_value();
      dkd_scroll_top_value();
    }
  }

  function dkd_open_cargo_create_value() {
    const dkd_bottom_cargo_button_value = dkd_find_bottom_cargo_button_value();
    dkd_close_choice_sheet_value();

    if (dkd_bottom_cargo_button_value) {
      dkd_bottom_cargo_button_value.setAttribute('data-dkd-cargo-choice-bypass', 'true');
      window.setTimeout(() => {
        dkd_bottom_cargo_button_value.click();
        window.setTimeout(() => dkd_bottom_cargo_button_value.removeAttribute('data-dkd-cargo-choice-bypass'), 500);
        dkd_scroll_top_value();
        window.setTimeout(dkd_scroll_top_value, 180);
      }, 80);
      return;
    }

    const dkd_target_node_value = dkd_find_existing_node_value([
      '#dkd_market_open_courier_cargo_button',
      '[data-dkd-panel="courier_cargo"]',
      '[data-dkd-bottom-action="courier_cargo"]',
      '[data-dkd-category="courier_cargo"]'
    ]);

    if (dkd_target_node_value) {
      dkd_target_node_value.setAttribute('data-dkd-cargo-choice-bypass', 'true');
      window.setTimeout(() => {
        dkd_target_node_value.click();
        window.setTimeout(() => dkd_target_node_value.removeAttribute('data-dkd-cargo-choice-bypass'), 500);
        dkd_scroll_top_value();
        window.setTimeout(dkd_scroll_top_value, 180);
      }, 80);
    }
  }

  function dkd_close_choice_sheet_value() {
    const dkd_sheet_node_value = document.getElementById(dkd_choice_sheet_id_value);
    if (dkd_sheet_node_value) dkd_sheet_node_value.remove();
    document.body.classList.remove('dkd_market_cargo_choice_open');
  }

  function dkd_open_choice_sheet_value() {
    dkd_close_choice_sheet_value();
    document.body.classList.add('dkd_market_cargo_choice_open');
    document.body.insertAdjacentHTML('beforeend', [
      '<div class="dkd_market_cargo_choice_sheet" id="', dkd_choice_sheet_id_value, '" role="dialog" aria-modal="true" aria-label="Kurye Kargo seçenekleri">',
        '<div class="dkd_market_cargo_choice_backdrop" data-dkd-cargo-choice-close="true"></div>',
        '<div class="dkd_market_cargo_choice_panel">',
          '<div class="dkd_market_cargo_choice_handle"></div>',
          '<div class="dkd_market_cargo_choice_head">',
            '<span class="dkd_market_cargo_choice_badge">Hızlı İşlem</span>',
            '<h3>Ne oluşturmak istiyorsun?</h3>',
            '<p>Kargo gönderisi açabilir veya mağazadan hızlı alışveriş için Acil Kurye siparişi oluşturabilirsin.</p>',
          '</div>',
          '<div class="dkd_market_cargo_choice_grid">',
            '<button class="dkd_market_cargo_choice_card dkd_market_cargo_choice_card_cargo" type="button" data-dkd-cargo-choice-action="cargo_create">',
              '<span class="dkd_market_cargo_choice_icon">📦</span>',
              '<span><strong>Kargo Oluştur</strong><small>Adres, paket ve teslimat bilgisiyle kargo görevi aç</small></span>',
            '</button>',
            '<button class="dkd_market_cargo_choice_card dkd_market_cargo_choice_card_urgent" type="button" data-dkd-cargo-choice-action="urgent_create">',
              '<span class="dkd_market_cargo_choice_icon">🛵</span>',
              '<span><strong>Sipariş Oluştur</strong><small>Market, fırın, eczane veya mağaza alışverişi için Acil Kurye aç</small></span>',
            '</button>',
          '</div>',
          '<button class="dkd_market_cargo_choice_close" type="button" data-dkd-cargo-choice-close="true">Vazgeç</button>',
        '</div>',
      '</div>',
    ].join(''));
  }

  function dkd_update_visible_labels_value() {
    document.querySelectorAll('button, a, span, strong, small, div').forEach((dkd_node_value) => {
      if (!dkd_node_value || dkd_node_value.children.length) return;
      const dkd_label_value = dkd_text_value(dkd_node_value);
      if ((dkd_label_value === 'Kurye-Kargo' || dkd_label_value === 'Kurye Kargo' || dkd_label_value === 'Kargo Oluştur') && dkd_node_value.closest('#dkd_market_category_row')) {
        dkd_node_value.textContent = 'Kargo Paneli';
      }
    });
  }

  document.addEventListener('click', (dkd_click_event_value) => {
    const dkd_close_node_value = dkd_click_event_value.target.closest('[data-dkd-cargo-choice-close="true"]');
    if (dkd_close_node_value) {
      dkd_click_event_value.preventDefault();
      dkd_click_event_value.stopImmediatePropagation();
      dkd_close_choice_sheet_value();
      return;
    }

    const dkd_action_node_value = dkd_click_event_value.target.closest('[data-dkd-cargo-choice-action]');
    if (dkd_action_node_value) {
      dkd_click_event_value.preventDefault();
      dkd_click_event_value.stopImmediatePropagation();

      const dkd_action_value = dkd_action_node_value.getAttribute('data-dkd-cargo-choice-action');
      dkd_close_choice_sheet_value();

      window.setTimeout(() => {
        if (dkd_action_value === 'cargo_create') dkd_open_cargo_create_value();
        if (dkd_action_value === 'urgent_create') dkd_open_urgent_courier_value();
      }, 80);
      return;
    }

    const dkd_bottom_cargo_node_value = dkd_click_event_value.target.closest('button, a, [role="button"], .dkd_market_bottom_item, .dkd_market_nav_item, [data-dkd-bottom-action], [data-dkd-panel]');
    if (!dkd_bottom_cargo_node_value) return;
    if (dkd_bottom_cargo_node_value.getAttribute('data-dkd-cargo-choice-bypass') === 'true') return;
    if (!dkd_is_cargo_bottom_node_value(dkd_bottom_cargo_node_value)) return;

    dkd_click_event_value.preventDefault();
    dkd_click_event_value.stopImmediatePropagation();
    dkd_open_choice_sheet_value();
  }, true);

  const dkd_observer_value = new MutationObserver(() => dkd_update_visible_labels_value());

  function dkd_boot_value() {
    dkd_update_visible_labels_value();
    if (document.body) dkd_observer_value.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', dkd_boot_value, { once: true });
  else dkd_boot_value();
})();