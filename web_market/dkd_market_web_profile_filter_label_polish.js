(function dkd_market_profile_filter_label_polish_boot_value() {
  'use strict';

  const dkd_fast_food_icon_value = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4.7 10.1c.5-3.2 3.4-5.6 7.3-5.6s6.8 2.4 7.3 5.6H4.7Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M4.4 12.8h15.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M6.1 15.1h11.8l-1 4.1H7.1l-1-4.1Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 7.7h.1M12 6.8h.1M16 7.7h.1" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M18.4 4.8h2.1l-.9 4.9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function dkd_set_button_text_value(dkd_node_value, dkd_text_value) {
    const dkd_span_values = Array.from(dkd_node_value.querySelectorAll('span'));
    const dkd_text_span_value = dkd_span_values.reverse().find((dkd_span_node_value) => !String(dkd_span_node_value.className || '').includes('icon'));
    if (dkd_text_span_value) {
      dkd_text_span_value.textContent = dkd_text_value;
      return;
    }
    dkd_node_value.textContent = dkd_text_value;
  }

  function dkd_polish_filter_and_profile_value() {
    document.querySelectorAll('[data-dkd-category="business_panel"]').forEach((dkd_node_value) => {
      const dkd_filter_node_value = dkd_node_value.closest('button, a, [role="button"], .dkd_market_category_button') || dkd_node_value;
      dkd_filter_node_value.remove();
    });

    document.querySelectorAll('[data-dkd-category="business"]').forEach((dkd_node_value) => {
      dkd_node_value.classList.add('dkd_market_filter_food_variety');
      const dkd_icon_node_value = dkd_node_value.querySelector('.dkd_market_category_icon, [class*="icon"]');
      if (dkd_icon_node_value) dkd_icon_node_value.innerHTML = dkd_fast_food_icon_value;
      dkd_set_button_text_value(dkd_node_value, 'Yemek Çeşitleri');
    });

    document.querySelectorAll('button, a, [role="button"]').forEach((dkd_node_value) => {
      const dkd_text_value = String(dkd_node_value.textContent || '').replace(/\s+/g, ' ').trim();
      if (dkd_text_value === 'Yemek Siparişi Et' || dkd_text_value === 'Yemek Sipariş Et') {
        dkd_set_button_text_value(dkd_node_value, 'Yemek Çeşitleri');
      }
      if (dkd_text_value === 'İşletme Panelim' && dkd_node_value.matches('[data-dkd-category], .dkd_market_category_button, [class*="category"]')) {
        dkd_node_value.remove();
      }
      if (dkd_node_value.matches('[data-dkd-business-panel-action="open"], .dkd_market_business_owner_button')) {
        dkd_node_value.textContent = 'Panelimi Aç';
        dkd_node_value.classList.add('dkd_market_business_owner_button_panelim');
      }
    });
  }

  let dkd_scheduled_value = false;
  function dkd_schedule_polish_value() {
    if (dkd_scheduled_value) return;
    dkd_scheduled_value = true;
    window.setTimeout(() => {
      dkd_scheduled_value = false;
      dkd_polish_filter_and_profile_value();
    }, 180);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', dkd_polish_filter_and_profile_value, { once: true });
  } else {
    dkd_polish_filter_and_profile_value();
  }

  const dkd_observer_value = new MutationObserver(dkd_schedule_polish_value);
  dkd_observer_value.observe(document.documentElement, { childList: true, subtree: true });
})();
