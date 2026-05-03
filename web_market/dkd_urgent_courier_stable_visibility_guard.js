(function dkd_urgent_courier_stable_visibility_guard_bootstrap_value() {
  'use strict';

  let dkd_guard_previous_open_value = null;
  let dkd_guard_wrapper_ready_value = false;
  let dkd_guard_observer_value = null;

  function dkd_guard_get_element_value(dkd_element_id_value) {
    return document.getElementById(dkd_element_id_value);
  }

  function dkd_guard_is_urgent_trigger_value(dkd_node_value) {
    if (!dkd_node_value?.closest) return false;
    return Boolean(dkd_node_value.closest('[data-dkd-category="urgent_courier"], [data-dkd-filter-special-animation="dkd_urgent_courier"], [data-dkd-filter-special-animation="dkd_urgent_courier_v2"], [data-dkd-urgent-courier="true"]'));
  }

  function dkd_guard_clear_stable_parent_hidden_marks_value() {
    const dkd_portal_node_value = dkd_guard_get_element_value('dkd_urgent_courier_stable_portal');
    const dkd_panel_node_value = dkd_guard_get_element_value('dkd_urgent_courier_stable_panel');
    document.querySelectorAll('[data-dkd-urgent-native-hidden="true"]').forEach((dkd_marked_node_value) => {
      const dkd_contains_portal_value = Boolean(dkd_portal_node_value && dkd_marked_node_value.contains?.(dkd_portal_node_value));
      const dkd_contains_panel_value = Boolean(dkd_panel_node_value && dkd_marked_node_value.contains?.(dkd_panel_node_value));
      if (dkd_marked_node_value === dkd_portal_node_value || dkd_marked_node_value === dkd_panel_node_value || dkd_contains_portal_value || dkd_contains_panel_value) {
        dkd_marked_node_value.removeAttribute('data-dkd-urgent-native-hidden');
      }
    });
  }

  function dkd_guard_force_visible_value() {
    const dkd_home_node_value = dkd_guard_get_element_value('dkd_market_home_view');
    const dkd_portal_node_value = dkd_guard_get_element_value('dkd_urgent_courier_stable_portal');
    const dkd_panel_node_value = dkd_guard_get_element_value('dkd_urgent_courier_stable_panel');
    if (dkd_home_node_value) dkd_home_node_value.hidden = false;
    if (dkd_portal_node_value) dkd_portal_node_value.hidden = false;
    if (dkd_panel_node_value) dkd_panel_node_value.hidden = false;
    ['dkd_market_categories_view', 'dkd_market_support_view', 'dkd_market_courier_cargo_view', 'dkd_market_urgent_courier_view'].forEach((dkd_element_id_value) => {
      const dkd_view_node_value = dkd_guard_get_element_value(dkd_element_id_value);
      if (dkd_view_node_value) dkd_view_node_value.hidden = true;
    });
    document.body.classList.add('dkd_urgent_courier_stable_active');
    document.body.classList.remove('dkd_market_urgent_mode');
    dkd_guard_clear_stable_parent_hidden_marks_value();
  }

  function dkd_guard_open_panel_value() {
    if (typeof dkd_guard_previous_open_value === 'function') {
      dkd_guard_previous_open_value();
    }
    dkd_guard_force_visible_value();
    window.setTimeout(dkd_guard_force_visible_value, 60);
    window.setTimeout(dkd_guard_force_visible_value, 180);
  }

  function dkd_guard_install_open_wrapper_value() {
    if (dkd_guard_wrapper_ready_value) return;
    if (typeof window.dkd_open_urgent_courier_panel !== 'function') return;
    dkd_guard_previous_open_value = window.dkd_open_urgent_courier_panel;
    window.dkd_open_urgent_courier_panel = function dkd_open_urgent_courier_panel_guarded_value() {
      dkd_guard_open_panel_value();
    };
    dkd_guard_wrapper_ready_value = true;
  }

  function dkd_guard_handle_click_value(dkd_click_event_value) {
    if (!dkd_guard_is_urgent_trigger_value(dkd_click_event_value.target)) return;
    dkd_click_event_value.preventDefault();
    dkd_guard_install_open_wrapper_value();
    if (typeof window.dkd_open_urgent_courier_panel === 'function') {
      window.dkd_open_urgent_courier_panel();
    } else {
      dkd_guard_force_visible_value();
    }
  }

  function dkd_guard_start_observer_value() {
    if (dkd_guard_observer_value || !document.body) return;
    dkd_guard_observer_value = new MutationObserver(() => {
      dkd_guard_install_open_wrapper_value();
      if (document.body.classList.contains('dkd_urgent_courier_stable_active')) {
        dkd_guard_clear_stable_parent_hidden_marks_value();
      }
    });
    dkd_guard_observer_value.observe(document.body, { attributes: true, childList: true, subtree: true });
  }

  function dkd_guard_init_value() {
    dkd_guard_install_open_wrapper_value();
    dkd_guard_start_observer_value();
    document.addEventListener('click', dkd_guard_handle_click_value, true);
    window.setTimeout(dkd_guard_install_open_wrapper_value, 120);
    window.setTimeout(dkd_guard_install_open_wrapper_value, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', dkd_guard_init_value, { once: true });
  } else {
    dkd_guard_init_value();
  }
})();
