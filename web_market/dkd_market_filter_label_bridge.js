(function dkd_market_filter_label_bridge_bootstrap_value() {
  function dkd_text_value(dkd_node_value) {
    return String(dkd_node_value?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function dkd_update_filter_cargo_label_value() {
    const dkd_filter_row_value = document.getElementById('dkd_market_category_row') || document.querySelector('.dkd_market_category_row');
    if (!dkd_filter_row_value) return;

    const dkd_cargo_button_value = dkd_filter_row_value.querySelector('[data-dkd-category="courier_cargo"]')
      || Array.from(dkd_filter_row_value.querySelectorAll('button, [role="button"], .dkd_market_category_button')).find((dkd_button_value) => {
        const dkd_button_text_value = dkd_text_value(dkd_button_value);
        return dkd_button_text_value === 'Kurye-Kargo'
          || dkd_button_text_value === 'Kurye Kargo'
          || dkd_button_text_value === 'Kargo Oluştur';
      });

    if (!dkd_cargo_button_value) return;

    const dkd_leaf_values = Array.from(dkd_cargo_button_value.querySelectorAll('span, strong, small, div')).filter((dkd_leaf_value) => {
      if (dkd_leaf_value.children.length > 0) return false;
      const dkd_leaf_text_value = dkd_text_value(dkd_leaf_value);
      return dkd_leaf_text_value === 'Kurye-Kargo'
        || dkd_leaf_text_value === 'Kurye Kargo'
        || dkd_leaf_text_value === 'Kargo Oluştur';
    });

    if (dkd_leaf_values.length > 0) {
      dkd_leaf_values.forEach((dkd_leaf_value) => {
        dkd_leaf_value.textContent = 'Kargo Paneli';
      });
      return;
    }

    const dkd_direct_text_value = dkd_text_value(dkd_cargo_button_value);
    if (dkd_direct_text_value === 'Kurye-Kargo' || dkd_direct_text_value === 'Kurye Kargo' || dkd_direct_text_value === 'Kargo Oluştur') {
      dkd_cargo_button_value.textContent = 'Kargo Paneli';
    }
  }

  function dkd_mark_filter_buttons_value() {
    const dkd_filter_row_value = document.getElementById('dkd_market_category_row') || document.querySelector('.dkd_market_category_row');
    if (!dkd_filter_row_value) return;
    Array.from(dkd_filter_row_value.querySelectorAll('button, [role="button"], .dkd_market_category_button')).forEach((dkd_button_value, dkd_index_value) => {
      dkd_button_value.setAttribute('data-dkd-filter-animation-index', String(dkd_index_value + 1));
    });
  }

  function dkd_refresh_filter_bridge_value() {
    dkd_update_filter_cargo_label_value();
    dkd_mark_filter_buttons_value();
  }

  const dkd_observer_value = new MutationObserver(() => {
    window.requestAnimationFrame(dkd_refresh_filter_bridge_value);
  });

  function dkd_boot_value() {
    dkd_refresh_filter_bridge_value();
    if (document.body) dkd_observer_value.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', dkd_boot_value, { once: true });
  else dkd_boot_value();
})();
