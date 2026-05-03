(function dkd_market_web_startup_guard_boot_value() {
  'use strict';

  function dkd_show_recovery_toast_value(dkd_message_value) {
    const dkd_toast_node_value = document.getElementById('dkd_market_toast');
    if (!dkd_toast_node_value) return;
    dkd_toast_node_value.textContent = dkd_message_value;
    dkd_toast_node_value.hidden = false;
    dkd_toast_node_value.classList.add('dkd_market_toast_error');
    window.clearTimeout(dkd_toast_node_value.dkdStartupGuardTimerValue);
    dkd_toast_node_value.dkdStartupGuardTimerValue = window.setTimeout(() => {
      dkd_toast_node_value.hidden = true;
      dkd_toast_node_value.classList.remove('dkd_market_toast_error');
    }, 4200);
  }

  function dkd_unlock_visible_views_value() {
    const dkd_home_node_value = document.getElementById('dkd_market_home_view');
    const dkd_categories_node_value = document.getElementById('dkd_market_categories_view');
    const dkd_support_node_value = document.getElementById('dkd_market_support_view');
    const dkd_courier_node_value = document.getElementById('dkd_market_courier_cargo_view');
    const dkd_any_visible_value = [dkd_home_node_value, dkd_categories_node_value, dkd_support_node_value, dkd_courier_node_value]
      .filter(Boolean)
      .some((dkd_node_value) => !dkd_node_value.hidden);
    if (!dkd_any_visible_value && dkd_home_node_value) {
      dkd_home_node_value.hidden = false;
      document.querySelectorAll('.dkd_market_bottom_button').forEach((dkd_button_value) => {
        dkd_button_value.classList.toggle('dkd_market_bottom_button_active', dkd_button_value.getAttribute('data-dkd-bottom-action') === 'home');
      });
    }
  }

  window.addEventListener('error', (dkd_event_value) => {
    const dkd_message_value = String(dkd_event_value.message || '');
    if (dkd_message_value.toLowerCase().includes('merchant') || dkd_message_value.toLowerCase().includes('loading')) {
      dkd_show_recovery_toast_value('Web ekranı güvenli moda alındı. Sayfayı yenileyip tekrar deneyebilirsin.');
      dkd_unlock_visible_views_value();
    }
  });

  window.addEventListener('unhandledrejection', (dkd_event_value) => {
    const dkd_reason_value = String(dkd_event_value.reason?.message || dkd_event_value.reason || '');
    if (dkd_reason_value.toLowerCase().includes('merchant') || dkd_reason_value.toLowerCase().includes('loading')) {
      dkd_show_recovery_toast_value('Canlı panel isteği tamamlanamadı, ana sayfa açık tutuldu.');
      dkd_unlock_visible_views_value();
    }
  });

  window.setTimeout(dkd_unlock_visible_views_value, 1600);
  window.setTimeout(dkd_unlock_visible_views_value, 4200);
})();
