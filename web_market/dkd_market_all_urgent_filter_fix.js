(function dkd_market_all_urgent_filter_fix_bootstrap_value() {
  function dkd_filter_text_value(dkd_node_value) {
    return String(dkd_node_value?.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function dkd_mark_filter_fix_targets_value() {
    const dkd_filter_row_value = document.getElementById('dkd_market_category_row') || document.querySelector('.dkd_market_category_row');
    if (!dkd_filter_row_value) return;

    const dkd_button_values = Array.from(dkd_filter_row_value.querySelectorAll('button, [role="button"], .dkd_market_category_button'));

    dkd_button_values.forEach((dkd_button_value) => {
      const dkd_text_value = dkd_filter_text_value(dkd_button_value);
      const dkd_category_value = String(dkd_button_value.getAttribute('data-dkd-category') || '').toLowerCase();

      if (dkd_text_value === 'tümü' || dkd_text_value === 'tumu' || dkd_category_value === 'all') {
        dkd_button_value.setAttribute('data-dkd-filter-fix-target', 'dkd_all_filter');
      }

      if (dkd_text_value.includes('acil kurye') || dkd_category_value.includes('urgent_courier') || dkd_category_value.includes('urgent')) {
        dkd_button_value.setAttribute('data-dkd-filter-fix-target', 'dkd_urgent_color_v2');
        dkd_button_value.setAttribute('data-dkd-filter-special-animation', 'dkd_urgent_courier_v2');
      }
    });
  }

  const dkd_filter_fix_observer_value = new MutationObserver(() => {
    window.requestAnimationFrame(dkd_mark_filter_fix_targets_value);
  });

  function dkd_boot_value() {
    dkd_mark_filter_fix_targets_value();
    if (document.body) {
      dkd_filter_fix_observer_value.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', dkd_boot_value, { once: true });
  } else {
    dkd_boot_value();
  }
})();
