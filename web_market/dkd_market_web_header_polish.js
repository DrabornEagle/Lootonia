(function dkd_market_web_header_polish_scope_value() {
  'use strict';

  function dkd_get_header_badges_value() {
    return document.querySelector('.dkd_market_header_badges');
  }

  function dkd_pin_quick_menu_to_right_value() {
    const dkd_header_badges_value = dkd_get_header_badges_value();
    const dkd_quick_menu_button_value = document.getElementById('dkd_market_quick_menu_button');
    if (!dkd_header_badges_value || !dkd_quick_menu_button_value) return;

    dkd_quick_menu_button_value.classList.add('dkd_market_quick_menu_button_pinned_right');
    if (dkd_quick_menu_button_value.parentElement !== dkd_header_badges_value) {
      dkd_header_badges_value.appendChild(dkd_quick_menu_button_value);
      return;
    }

    if (dkd_header_badges_value.lastElementChild !== dkd_quick_menu_button_value) {
      dkd_header_badges_value.appendChild(dkd_quick_menu_button_value);
    }
  }

  function dkd_upgrade_lootonia_logo_value() {
    const dkd_logo_tile_value = document.querySelector('.dkd_market_logo_tile');
    if (!dkd_logo_tile_value || dkd_logo_tile_value.dataset.dkdModernLogoReady === 'true') return;

    dkd_logo_tile_value.dataset.dkdModernLogoReady = 'true';
    dkd_logo_tile_value.classList.add('dkd_market_logo_tile_modern');
    dkd_logo_tile_value.innerHTML = `
      <svg class="dkd_market_logo_svg_modern" viewBox="0 0 96 96" role="img" aria-label="Lootonia Market modern logo">
        <defs>
          <linearGradient id="dkd_market_logo_gradient_core" x1="14" y1="10" x2="82" y2="88" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#9affee" />
            <stop offset="0.46" stop-color="#5aa7ff" />
            <stop offset="1" stop-color="#8d62ff" />
          </linearGradient>
          <linearGradient id="dkd_market_logo_gradient_wing" x1="12" y1="18" x2="84" y2="72" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#f5ffb8" />
            <stop offset="0.48" stop-color="#71fff0" />
            <stop offset="1" stop-color="#5f85ff" />
          </linearGradient>
          <filter id="dkd_market_logo_glow_filter" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.4" result="dkd_market_logo_blur_value" />
            <feColorMatrix in="dkd_market_logo_blur_value" type="matrix" values="0 0 0 0 0.42 0 0 0 0 0.92 0 0 0 0 1 0 0 0 0.72 0" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect x="9" y="9" width="78" height="78" rx="24" fill="rgba(10, 30, 78, 0.96)" stroke="rgba(142, 223, 255, 0.34)" stroke-width="2" />
        <path d="M48 13 L77 30 L77 64 L48 83 L19 64 L19 30 Z" fill="rgba(35, 72, 152, 0.46)" stroke="rgba(141, 226, 255, 0.34)" stroke-width="2" />
        <path class="dkd_market_logo_wing_left" d="M47 36 C35 25 23 25 14 34 C27 36 34 44 40 57 C42 50 44 43 47 36 Z" fill="url(#dkd_market_logo_gradient_wing)" opacity="0.92" />
        <path class="dkd_market_logo_wing_right" d="M49 36 C61 25 73 25 82 34 C69 36 62 44 56 57 C54 50 52 43 49 36 Z" fill="url(#dkd_market_logo_gradient_wing)" opacity="0.92" />
        <path d="M48 25 L65 45 L48 70 L31 45 Z" fill="url(#dkd_market_logo_gradient_core)" filter="url(#dkd_market_logo_glow_filter)" />
        <path d="M48 31 L58 45 L48 60 L38 45 Z" fill="rgba(255, 255, 255, 0.32)" />
        <circle cx="48" cy="45" r="5.5" fill="#ffffff" opacity="0.88" />
      </svg>
    `;
  }

  function dkd_run_header_polish_value() {
    dkd_pin_quick_menu_to_right_value();
    dkd_upgrade_lootonia_logo_value();
  }

  function dkd_install_header_polish_observer_value() {
    if (window.dkd_market_header_polish_observer_ready_value) return;
    window.dkd_market_header_polish_observer_ready_value = true;

    dkd_run_header_polish_value();
    window.setTimeout(dkd_run_header_polish_value, 80);
    window.setTimeout(dkd_run_header_polish_value, 450);
    window.setTimeout(dkd_run_header_polish_value, 1200);

    const dkd_header_polish_observer_value = new MutationObserver(function dkd_handle_header_polish_mutation_value() {
      dkd_run_header_polish_value();
    });

    dkd_header_polish_observer_value.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', dkd_install_header_polish_observer_value, { once: true });
  } else {
    dkd_install_header_polish_observer_value();
  }
})();
