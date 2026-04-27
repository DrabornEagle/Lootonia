(function dkd_market_three_filter_animation_bootstrap_value() {
  function dkd_filter_text_value(dkd_node_value) {
    return String(dkd_node_value?.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function dkd_mark_three_filter_buttons_value() {
    const dkd_filter_row_value = document.getElementById('dkd_market_category_row') || document.querySelector('.dkd_market_category_row');
    if (!dkd_filter_row_value) return;

    const dkd_button_values = Array.from(dkd_filter_row_value.querySelectorAll('button, [role="button"], .dkd_market_category_button'));

    dkd_button_values.forEach((dkd_button_value) => {
      const dkd_button_text_value = dkd_filter_text_value(dkd_button_value);
      const dkd_button_category_value = String(dkd_button_value.getAttribute('data-dkd-category') || '').toLowerCase();

      dkd_button_value.removeAttribute('data-dkd-filter-special-animation');

      if (
        dkd_button_text_value.includes('yemek çeşitleri')
        || dkd_button_text_value.includes('yemek cesitleri')
        || dkd_button_text_value === 'yemek'
        || dkd_button_category_value.includes('food')
        || dkd_button_category_value.includes('meal')
        || dkd_button_category_value.includes('restaurant')
      ) {
        dkd_button_value.setAttribute('data-dkd-filter-special-animation', 'dkd_food_variety');
        return;
      }

      if (
        dkd_button_text_value.includes('kargo paneli')
        || dkd_button_text_value.includes('kargo oluştur')
        || dkd_button_text_value.includes('kargo olustur')
        || dkd_button_text_value.includes('kurye-kargo')
        || dkd_button_text_value.includes('kurye kargo')
        || dkd_button_category_value.includes('courier_cargo')
        || dkd_button_category_value.includes('cargo')
      ) {
        dkd_button_value.setAttribute('data-dkd-filter-special-animation', 'dkd_cargo_panel');
        return;
      }

      if (
        dkd_button_text_value.includes('acil kurye')
        || dkd_button_category_value.includes('urgent_courier')
        || dkd_button_category_value.includes('urgent')
      ) {
        dkd_button_value.setAttribute('data-dkd-filter-special-animation', 'dkd_urgent_courier');
      }
    });
  }

  const dkd_filter_animation_observer_value = new MutationObserver(() => {
    window.requestAnimationFrame(dkd_mark_three_filter_buttons_value);
  });

  function dkd_filter_animation_boot_value() {
    dkd_mark_three_filter_buttons_value();
    if (document.body) {
      dkd_filter_animation_observer_value.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', dkd_filter_animation_boot_value, { once: true });
  } else {
    dkd_filter_animation_boot_value();
  }
})();
