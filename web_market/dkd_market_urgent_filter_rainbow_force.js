(function dkd_market_urgent_filter_rainbow_force_bootstrap_value() {
  const dkd_style_id_value = 'dkd_market_urgent_filter_rainbow_force_style';

  function dkd_text_value(dkd_node_value) {
    return String(dkd_node_value?.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function dkd_inject_style_value() {
    const dkd_existing_style_value = document.getElementById(dkd_style_id_value);
    if (dkd_existing_style_value) dkd_existing_style_value.remove();

    const dkd_style_node_value = document.createElement('style');
    dkd_style_node_value.id = dkd_style_id_value;
    dkd_style_node_value.textContent = `
#dkd_market_category_row [data-dkd-urgent-rainbow-force="true"],
.dkd_market_category_row [data-dkd-urgent-rainbow-force="true"],
button[data-dkd-urgent-rainbow-force="true"],
[role="button"][data-dkd-urgent-rainbow-force="true"] {
  position: relative !important;
  isolation: isolate !important;
  overflow: hidden !important;
  color: #fffdf7 !important;
  border: 1px solid rgba(255, 255, 255, 0.34) !important;
  background:
    radial-gradient(circle at 9% 18%, rgba(255, 238, 88, 0.78), transparent 26%),
    radial-gradient(circle at 36% 7%, rgba(255, 82, 170, 0.72), transparent 30%),
    radial-gradient(circle at 78% 14%, rgba(0, 229, 255, 0.68), transparent 32%),
    radial-gradient(circle at 100% 85%, rgba(98, 255, 143, 0.52), transparent 38%),
    linear-gradient(135deg, #6d23d9 0%, #d9198f 32%, #0b74ff 68%, #10d7b1 100%) !important;
  background-size: 160% 160%, 150% 150%, 150% 150%, 150% 150%, 220% 220% !important;
  box-shadow:
    0 18px 38px rgba(0, 0, 0, 0.28),
    0 0 0 1px rgba(255, 255, 255, 0.16) inset,
    0 0 26px rgba(255, 82, 170, 0.22),
    0 0 34px rgba(0, 229, 255, 0.18) !important;
  filter: saturate(1.34) brightness(1.08) !important;
  transform: translateZ(0) !important;
  animation:
    dkd_urgent_rainbow_force_gradient_value 5.4s ease-in-out infinite,
    dkd_urgent_rainbow_force_boost_value 2.75s cubic-bezier(.22, 1.32, .36, 1) infinite !important;
}

#dkd_market_category_row [data-dkd-urgent-rainbow-force="true"] > *,
.dkd_market_category_row [data-dkd-urgent-rainbow-force="true"] > *,
button[data-dkd-urgent-rainbow-force="true"] > *,
[role="button"][data-dkd-urgent-rainbow-force="true"] > * {
  position: relative !important;
  z-index: 4 !important;
  color: #fffdf7 !important;
  text-shadow: 0 2px 10px rgba(0,0,0,0.30) !important;
}

#dkd_market_category_row [data-dkd-urgent-rainbow-force="true"] svg,
.dkd_market_category_row [data-dkd-urgent-rainbow-force="true"] svg,
button[data-dkd-urgent-rainbow-force="true"] svg {
  filter: drop-shadow(0 4px 10px rgba(0,0,0,0.26)) !important;
  animation: dkd_urgent_rainbow_force_icon_value 1.9s ease-in-out infinite !important;
}

#dkd_market_category_row [data-dkd-urgent-rainbow-force="true"]::before,
.dkd_market_category_row [data-dkd-urgent-rainbow-force="true"]::before,
button[data-dkd-urgent-rainbow-force="true"]::before,
[role="button"][data-dkd-urgent-rainbow-force="true"]::before {
  content: '' !important;
  position: absolute !important;
  z-index: 1 !important;
  inset: -50% auto -50% -70% !important;
  width: 58% !important;
  display: block !important;
  opacity: 0 !important;
  pointer-events: none !important;
  background:
    linear-gradient(90deg, transparent, rgba(255,255,255,0.54), rgba(255, 238, 88, 0.38), transparent) !important;
  transform: skewX(-18deg) translateX(-20%) !important;
  animation: dkd_urgent_rainbow_force_speed_sheen_value 2.15s ease-in-out infinite !important;
}

#dkd_market_category_row [data-dkd-urgent-rainbow-force="true"]::after,
.dkd_market_category_row [data-dkd-urgent-rainbow-force="true"]::after,
button[data-dkd-urgent-rainbow-force="true"]::after,
[role="button"][data-dkd-urgent-rainbow-force="true"]::after {
  content: '' !important;
  position: absolute !important;
  z-index: 2 !important;
  right: 12px !important;
  top: 50% !important;
  width: 10px !important;
  height: 10px !important;
  border-radius: 999px !important;
  display: block !important;
  opacity: 1 !important;
  pointer-events: none !important;
  background: #fff35c !important;
  box-shadow:
    -16px -9px 0 rgba(0, 229, 255, 0.95),
    -32px 8px 0 rgba(255, 82, 170, 0.88),
    -46px -1px 0 rgba(98, 255, 143, 0.72),
    0 0 22px rgba(255, 243, 92, 0.76) !important;
  transform: translateY(-50%) scale(0.86) !important;
  animation: dkd_urgent_rainbow_force_trails_value 1.22s ease-in-out infinite !important;
}

#dkd_market_category_row [data-dkd-urgent-rainbow-force="true"]:hover,
.dkd_market_category_row [data-dkd-urgent-rainbow-force="true"]:hover,
button[data-dkd-urgent-rainbow-force="true"]:hover,
[role="button"][data-dkd-urgent-rainbow-force="true"]:hover {
  filter: saturate(1.52) brightness(1.13) !important;
  transform: translateY(-4px) scale(1.025) !important;
}

@keyframes dkd_urgent_rainbow_force_gradient_value {
  0%, 100% { background-position: 0% 50%, 20% 20%, 80% 20%, 90% 90%, 0% 50%; }
  45% { background-position: 70% 30%, 35% 12%, 65% 35%, 80% 70%, 100% 50%; }
  70% { background-position: 35% 85%, 18% 42%, 88% 10%, 55% 88%, 62% 40%; }
}

@keyframes dkd_urgent_rainbow_force_boost_value {
  0%, 100% { transform: translateX(0) translateY(0) scale(1); }
  18% { transform: translateX(3px) translateY(-3px) scale(1.018); }
  38% { transform: translateX(-1px) translateY(1px) scale(1.006); }
  62% { transform: translateX(0) translateY(-2px) scale(1.012); }
}

@keyframes dkd_urgent_rainbow_force_speed_sheen_value {
  0%, 48% { opacity: 0; transform: skewX(-18deg) translateX(-25%); }
  62% { opacity: 1; }
  100% { opacity: 0; transform: skewX(-18deg) translateX(390%); }
}

@keyframes dkd_urgent_rainbow_force_trails_value {
  0%, 100% { opacity: .52; transform: translateY(-50%) scale(.78); }
  46% { opacity: 1; transform: translateY(-50%) scale(1.25); }
  68% { opacity: .82; transform: translateY(-50%) scale(.98); }
}

@keyframes dkd_urgent_rainbow_force_icon_value {
  0%, 100% { transform: translateX(0) rotate(0deg); }
  35% { transform: translateX(2px) rotate(-3deg); }
  70% { transform: translateX(-1px) rotate(2deg); }
}

@media (prefers-reduced-motion: reduce) {
  #dkd_market_category_row [data-dkd-urgent-rainbow-force="true"],
  .dkd_market_category_row [data-dkd-urgent-rainbow-force="true"],
  #dkd_market_category_row [data-dkd-urgent-rainbow-force="true"]::before,
  #dkd_market_category_row [data-dkd-urgent-rainbow-force="true"]::after,
  .dkd_market_category_row [data-dkd-urgent-rainbow-force="true"]::before,
  .dkd_market_category_row [data-dkd-urgent-rainbow-force="true"]::after {
    animation: none !important;
  }
}
`;
    document.head.appendChild(dkd_style_node_value);
  }

  function dkd_mark_urgent_filter_value() {
    const dkd_filter_row_value = document.getElementById('dkd_market_category_row') || document.querySelector('.dkd_market_category_row');
    if (!dkd_filter_row_value) return;

    const dkd_button_values = Array.from(dkd_filter_row_value.querySelectorAll('button, [role="button"], .dkd_market_category_button, [data-dkd-category]'));

    dkd_button_values.forEach((dkd_button_value) => {
      const dkd_text_value = String(dkd_button_value.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const dkd_category_value = String(dkd_button_value.getAttribute('data-dkd-category') || '').toLowerCase();

      if (dkd_text_value.includes('acil kurye') || dkd_category_value.includes('urgent_courier') || dkd_category_value.includes('urgent')) {
        dkd_button_value.setAttribute('data-dkd-urgent-rainbow-force', 'true');
        dkd_button_value.setAttribute('data-dkd-filter-special-animation', 'dkd_urgent_rainbow_force');
      }
    });
  }

  function dkd_refresh_value() {
    dkd_inject_style_value();
    dkd_mark_urgent_filter_value();
  }

  const dkd_observer_value = new MutationObserver(() => {
    window.requestAnimationFrame(dkd_mark_urgent_filter_value);
  });

  function dkd_boot_value() {
    dkd_refresh_value();
    if (document.body) {
      dkd_observer_value.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
    window.setTimeout(dkd_refresh_value, 500);
    window.setTimeout(dkd_refresh_value, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', dkd_boot_value, { once: true });
  } else {
    dkd_boot_value();
  }
})();
