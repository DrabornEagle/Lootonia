(function dkd_market_categories_premium_v2_bootstrap_value() {
  const dkd_premium_v2_top_selector_value = '[data-dkd-categories-premium-v2-top="true"]';

  function dkd_categories_view_value() {
    return document.getElementById('dkd_market_categories_view')
      || document.querySelector('[data-dkd-view="categories"]')
      || document.querySelector('.dkd_market_categories_view');
  }

  function dkd_text_value(dkd_node_value) {
    return String(dkd_node_value?.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function dkd_icon_svg_value(dkd_kind_value) {
    if (dkd_kind_value === 'dkd_urgent') {
      return [
        '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">',
          '<path d="M9 42h11.4l6.4-16h14.4l8.2 10.3H56" stroke="currentColor" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/>',
          '<path d="M23.5 44.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0Zm34 0a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0Z" stroke="currentColor" stroke-width="4.4"/>',
          '<path d="M30 17h15l-4.4 8.6h9.6L37.4 43l3.2-12.5H29.2L30 17Z" fill="currentColor"/>',
          '<path d="M8 25h11M6 33h9" stroke="currentColor" stroke-width="4.4" stroke-linecap="round"/>',
        '</svg>'
      ].join('');
    }

    if (dkd_kind_value === 'dkd_cargo') {
      return [
        '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">',
          '<path d="M12 24.5 32 13l20 11.5v23L32 59 12 47.5v-23Z" stroke="currentColor" stroke-width="4.2" stroke-linejoin="round"/>',
          '<path d="M12 24.5 32 36l20-11.5M32 36v23M22 18.7 42 30.3" stroke="currentColor" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>',
          '<path d="M45 8h9v9M53 9 41 21" stroke="currentColor" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>',
          '<path d="M10 11h15M6 18h13" stroke="currentColor" stroke-width="4.2" stroke-linecap="round"/>',
        '</svg>'
      ].join('');
    }

    return [
      '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">',
        '<path d="M15 23h34l-3.2 25.8A6 6 0 0 1 39.9 54H24.1a6 6 0 0 1-5.9-5.2L15 23Z" stroke="currentColor" stroke-width="4.2" stroke-linejoin="round"/>',
        '<path d="M23 23V18a9 9 0 0 1 18 0v5" stroke="currentColor" stroke-width="4.2" stroke-linecap="round"/>',
        '<path d="M22 35h20M24 44h16" stroke="currentColor" stroke-width="4.2" stroke-linecap="round"/>',
        '<path d="M48 18c4.5 1.2 7 4.2 8 9M16 18c-4.5 1.2-7 4.2-8 9" stroke="currentColor" stroke-width="4.2" stroke-linecap="round"/>',
      '</svg>'
    ].join('');
  }

  function dkd_action_kind_value(dkd_node_value) {
    const dkd_node_text_value = dkd_text_value(dkd_node_value);
    const dkd_node_attr_value = [
      dkd_node_value.getAttribute('data-dkd-bridge-action'),
      dkd_node_value.getAttribute('data-dkd-categories-action-card'),
      dkd_node_value.getAttribute('data-dkd-category'),
      dkd_node_value.id,
      dkd_node_value.className,
    ].map((dkd_item_value) => String(dkd_item_value || '').toLowerCase()).join(' ');

    if (dkd_node_text_value.includes('acil kurye') || dkd_node_attr_value.includes('urgent')) return 'dkd_urgent';
    if (dkd_node_text_value.includes('kargo paneli') || dkd_node_text_value.includes('kargo oluştur') || dkd_node_text_value.includes('kargo olustur') || dkd_node_text_value.includes('kurye kargo') || dkd_node_attr_value.includes('cargo')) return 'dkd_cargo';
    if (dkd_node_text_value.includes('yemek menüsü') || dkd_node_text_value.includes('yemek menusu') || dkd_node_text_value.includes('yemek çeşitleri') || dkd_node_text_value.includes('yemek cesitleri') || dkd_node_text_value.includes('yemek')) return 'dkd_food';
    return '';
  }

  function dkd_insert_premium_top_value() {
    const dkd_view_node_value = dkd_categories_view_value();
    if (!dkd_view_node_value) return;

    dkd_view_node_value.querySelectorAll('[data-dkd-categories-premium-top="true"]').forEach((dkd_old_node_value) => {
      if (!dkd_old_node_value.matches(dkd_premium_v2_top_selector_value)) dkd_old_node_value.remove();
    });

    if (dkd_view_node_value.querySelector(dkd_premium_v2_top_selector_value)) return;

    const dkd_target_node_value =
      dkd_view_node_value.querySelector('.dkd_market_categories_switch')
      || dkd_view_node_value.querySelector('.dkd_market_bridge_service_grid')
      || dkd_view_node_value.firstElementChild;

    const dkd_top_html_value = [
      '<section class="dkd_market_categories_premium_v2_top" data-dkd-categories-premium-v2-top="true" data-dkd-categories-premium-top="true">',
        '<div class="dkd_market_categories_premium_v2_aurora"></div>',
        '<div class="dkd_market_categories_premium_v2_header">',
          '<div class="dkd_market_categories_premium_v2_copy">',
            '<span class="dkd_market_categories_premium_v2_badge">Lootonia Market Control</span>',
            '<h2>Kategori Merkezi</h2>',
            '<p>Yemek menüsü, kargo paneli ve acil kurye akışını tek profesyonel merkezden yönet.</p>',
          '</div>',
          '<div class="dkd_market_categories_premium_v2_radar" aria-hidden="true">',
            '<span></span><span></span><span></span>',
          '</div>',
        '</div>',
        '<div class="dkd_market_categories_premium_v2_quick">',
          '<button type="button" class="dkd_market_categories_premium_v2_quick_card dkd_market_categories_premium_v2_food" data-dkd-premium-v2-action="food">',
            '<span class="dkd_market_categories_premium_v2_icon">', dkd_icon_svg_value('dkd_food'), '</span>',
            '<span><strong>Yemek Menüsü</strong><small>Sıcak teslimat ve restoran ürünleri</small></span>',
          '</button>',
          '<button type="button" class="dkd_market_categories_premium_v2_quick_card dkd_market_categories_premium_v2_cargo" data-dkd-premium-v2-action="cargo">',
            '<span class="dkd_market_categories_premium_v2_icon">', dkd_icon_svg_value('dkd_cargo'), '</span>',
            '<span><strong>Kargo Paneli</strong><small>Paket, rota ve görev operasyonu</small></span>',
          '</button>',
          '<button type="button" class="dkd_market_categories_premium_v2_quick_card dkd_market_categories_premium_v2_urgent" data-dkd-premium-v2-action="urgent">',
            '<span class="dkd_market_categories_premium_v2_icon">', dkd_icon_svg_value('dkd_urgent'), '</span>',
            '<span><strong>Acil Kurye</strong><small>Mağazadan hızlı sipariş akışı</small></span>',
          '</button>',
        '</div>',
      '</section>'
    ].join('');

    if (dkd_target_node_value) dkd_target_node_value.insertAdjacentHTML('beforebegin', dkd_top_html_value);
    else dkd_view_node_value.insertAdjacentHTML('afterbegin', dkd_top_html_value);
  }

  function dkd_modernize_existing_action_cards_value() {
    const dkd_view_node_value = dkd_categories_view_value();
    if (!dkd_view_node_value) return;

    const dkd_card_values = Array.from(dkd_view_node_value.querySelectorAll('button, [role="button"], .dkd_market_bridge_service_card, .dkd_market_categories_switch > *'));
    dkd_card_values.forEach((dkd_card_value) => {
      if (dkd_card_value.closest(dkd_premium_v2_top_selector_value)) return;

      const dkd_kind_value = dkd_action_kind_value(dkd_card_value);
      if (!dkd_kind_value) return;

      dkd_card_value.setAttribute('data-dkd-categories-v2-action-card', dkd_kind_value);

      const dkd_existing_icon_value = dkd_card_value.querySelector('.dkd_market_categories_v2_svg_icon');
      if (dkd_existing_icon_value) return;

      const dkd_old_icon_value = dkd_card_value.querySelector('.dkd_market_bridge_service_icon, .dkd_market_category_icon');
      const dkd_icon_html_value = '<span class="dkd_market_categories_v2_svg_icon">' + dkd_icon_svg_value(dkd_kind_value) + '</span>';

      if (dkd_old_icon_value) {
        dkd_old_icon_value.outerHTML = dkd_icon_html_value;
      } else {
        dkd_card_value.insertAdjacentHTML('afterbegin', dkd_icon_html_value);
      }
    });
  }

  function dkd_click_premium_action_value(dkd_action_value) {
    const dkd_view_node_value = dkd_categories_view_value();
    if (!dkd_view_node_value) return;

    const dkd_target_kind_value = dkd_action_value === 'urgent'
      ? 'dkd_urgent'
      : dkd_action_value === 'cargo'
        ? 'dkd_cargo'
        : 'dkd_food';

    const dkd_target_node_value = Array.from(dkd_view_node_value.querySelectorAll('[data-dkd-categories-v2-action-card], [data-dkd-categories-action-card], [data-dkd-bridge-action], button')).find((dkd_node_value) => {
      if (dkd_node_value.closest(dkd_premium_v2_top_selector_value)) return false;
      return dkd_action_kind_value(dkd_node_value) === dkd_target_kind_value;
    });

    if (dkd_target_node_value) dkd_target_node_value.click();
  }

  function dkd_refresh_value() {
    dkd_insert_premium_top_value();
    dkd_modernize_existing_action_cards_value();
  }

  document.addEventListener('click', (dkd_click_event_value) => {
    const dkd_action_node_value = dkd_click_event_value.target.closest('[data-dkd-premium-v2-action]');
    if (!dkd_action_node_value) return;
    dkd_click_event_value.preventDefault();
    const dkd_action_value = dkd_action_node_value.getAttribute('data-dkd-premium-v2-action');
    dkd_click_premium_action_value(dkd_action_value);
  }, true);

  const dkd_observer_value = new MutationObserver(() => window.requestAnimationFrame(dkd_refresh_value));

  function dkd_boot_value() {
    dkd_refresh_value();
    if (document.body) dkd_observer_value.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.setTimeout(dkd_refresh_value, 500);
    window.setTimeout(dkd_refresh_value, 1500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', dkd_boot_value, { once: true });
  else dkd_boot_value();
})();
