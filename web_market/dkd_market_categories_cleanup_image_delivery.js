(function dkd_market_categories_cleanup_image_delivery_bootstrap_value() {
  function dkd_categories_view_value() {
    return document.getElementById('dkd_market_categories_view')
      || document.querySelector('[data-dkd-view="categories"]')
      || document.querySelector('.dkd_market_categories_view');
  }

  function dkd_text_value(dkd_node_value) {
    return String(dkd_node_value?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function dkd_is_inside_premium_top_value(dkd_node_value) {
    return Boolean(
      dkd_node_value.closest('[data-dkd-categories-premium-v2-top="true"]')
      || dkd_node_value.closest('[data-dkd-categories-premium-top="true"]')
      || dkd_node_value.closest('.dkd_market_categories_premium_v2_top')
      || dkd_node_value.closest('.dkd_market_categories_premium_top')
    );
  }

  function dkd_mark_duplicate_action_windows_value() {
    const dkd_view_node_value = dkd_categories_view_value();
    if (!dkd_view_node_value) return;

    const dkd_candidate_values = Array.from(
      dkd_view_node_value.querySelectorAll(
        '.dkd_market_bridge_service_grid, .dkd_market_categories_switch, [data-dkd-categories-v2-action-card], [data-dkd-categories-action-card], .dkd_market_bridge_service_card'
      )
    );

    dkd_candidate_values.forEach((dkd_candidate_value) => {
      if (dkd_is_inside_premium_top_value(dkd_candidate_value)) return;

      const dkd_candidate_text_value = dkd_text_value(dkd_candidate_value).toLowerCase();
      const dkd_is_action_window_value =
        dkd_candidate_text_value.includes('acil kurye')
        || dkd_candidate_text_value.includes('kargo paneli')
        || dkd_candidate_text_value.includes('kargo oluştur')
        || dkd_candidate_text_value.includes('kargo olustur')
        || dkd_candidate_text_value.includes('yemek menüsü')
        || dkd_candidate_text_value.includes('yemek menusu');

      if (dkd_is_action_window_value) {
        dkd_candidate_value.setAttribute('data-dkd-categories-duplicate-action-hidden', 'true');
        return;
      }

      const dkd_action_card_count_value = dkd_candidate_value.querySelectorAll('[data-dkd-categories-v2-action-card], [data-dkd-categories-action-card], .dkd_market_bridge_service_card').length;
      if (dkd_action_card_count_value >= 2) {
        dkd_candidate_value.setAttribute('data-dkd-categories-duplicate-action-hidden', 'true');
      }
    });
  }

  function dkd_mark_product_images_value() {
    const dkd_view_node_value = dkd_categories_view_value();
    if (!dkd_view_node_value) return;

    const dkd_image_values = Array.from(
      dkd_view_node_value.querySelectorAll(
        '.dkd_market_product_card img, .dkd_market_store_card img, [class*="product"] img, [class*="Product"] img'
      )
    );

    dkd_image_values.forEach((dkd_image_value) => {
      if (dkd_image_value.closest('[data-dkd-categories-premium-v2-top="true"]')) return;
      dkd_image_value.setAttribute('data-dkd-categories-product-image-center', 'true');

      const dkd_image_parent_value = dkd_image_value.parentElement;
      if (dkd_image_parent_value) {
        dkd_image_parent_value.setAttribute('data-dkd-categories-product-image-wrap', 'true');
      }
    });
  }

  function dkd_hide_delivery_texts_value() {
    const dkd_view_node_value = dkd_categories_view_value();
    if (!dkd_view_node_value) return;

    const dkd_leaf_values = Array.from(dkd_view_node_value.querySelectorAll('p, span, small, div')).filter((dkd_leaf_value) => {
      if (dkd_leaf_value.children.length > 0) return false;
      const dkd_leaf_text_value = dkd_text_value(dkd_leaf_value).toLowerCase();
      return dkd_leaf_text_value === 'sıcak teslimat açık'
        || dkd_leaf_text_value === 'sicak teslimat açık'
        || dkd_leaf_text_value === 'sicak teslimat acik'
        || dkd_leaf_text_value === 'sıcak teslimat acik';
    });

    dkd_leaf_values.forEach((dkd_leaf_value) => {
      dkd_leaf_value.setAttribute('data-dkd-categories-delivery-text-hidden', 'true');
      dkd_leaf_value.setAttribute('aria-hidden', 'true');
    });
  }

  function dkd_refresh_categories_cleanup_value() {
    dkd_mark_duplicate_action_windows_value();
    dkd_mark_product_images_value();
    dkd_hide_delivery_texts_value();
  }

  const dkd_observer_value = new MutationObserver(() => {
    window.requestAnimationFrame(dkd_refresh_categories_cleanup_value);
  });

  function dkd_boot_value() {
    dkd_refresh_categories_cleanup_value();
    if (document.body) {
      dkd_observer_value.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
    window.setTimeout(dkd_refresh_categories_cleanup_value, 350);
    window.setTimeout(dkd_refresh_categories_cleanup_value, 1000);
    window.setTimeout(dkd_refresh_categories_cleanup_value, 2200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', dkd_boot_value, { once: true });
  } else {
    dkd_boot_value();
  }
})();
