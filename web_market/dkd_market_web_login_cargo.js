(function dkd_web_login_cargo_bootstrap_value() {
  const dkd_web_login_cargo_state_value = {
    dkd_config_value: window.dkd_market_web_config || {},
    dkd_supabase_client_value: null,
    dkd_session_value: null,
    dkd_guest_mode_value: false,
    dkd_active_tab_value: 'jobs',
    dkd_snapshot_value: {
      dkd_jobs_values: [],
      dkd_shipments_values: [],
      dkd_profile_value: null,
    },
    dkd_snapshot_busy_value: false,
    dkd_realtime_channel_value: null,
    dkd_poll_timer_value: null,
    dkd_has_courier_license_value: false,
    dkd_pending_cargo_payload_value: null,
    dkd_pending_cargo_quote_value: null,
    dkd_cargo_payment_busy_value: false,
  };

  const dkd_guest_storage_key_value = 'dkd_market_guest_entry_v1';
  const dkd_tab_label_map_value = Object.freeze({
    jobs: 'Siparişler',
    create: 'Kargo Oluştur',
    shipments: 'Gönderilerim',
  });

  function dkd_get_element_value(dkd_element_id_value) {
    return document.getElementById(dkd_element_id_value);
  }

  function dkd_escape_html_value(dkd_raw_value) {
    return String(dkd_raw_value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function dkd_format_money_value(dkd_number_value) {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(dkd_number_value || 0));
  }

  function dkd_round_money_number_value(dkd_number_value) {
    return Math.round(Number(dkd_number_value || 0) * 100) / 100;
  }

  function dkd_estimate_cargo_quote_value(dkd_weight_raw_value) {
    const dkd_weight_value = Math.max(Number(dkd_weight_raw_value || 1), 0.1);
    const dkd_courier_fee_value = Math.max(50, dkd_round_money_number_value(45 + (dkd_weight_value * 10)));
    const dkd_customer_charge_value = dkd_round_money_number_value(dkd_courier_fee_value * 1.22);
    const dkd_eta_min_value = Math.max(12, Math.min(55, Math.ceil(14 + (dkd_weight_value * 4))));
    return {
      dkd_weight_kg_value: dkd_weight_value,
      dkd_fee_tl_value: dkd_courier_fee_value,
      dkd_customer_charge_tl_value: dkd_customer_charge_value,
      dkd_eta_min_value,
    };
  }

  function dkd_get_profile_wallet_tl_value() {
    const dkd_profile_value = dkd_web_login_cargo_state_value.dkd_snapshot_value.dkd_profile_value || {};
    const dkd_wallet_value = Number(dkd_profile_value.wallet_tl ?? dkd_profile_value.dkd_wallet_tl ?? dkd_profile_value.courier_wallet_tl ?? 0);
    return Number.isFinite(dkd_wallet_value) ? dkd_wallet_value : 0;
  }

  function dkd_humanize_payment_status_value(dkd_payment_status_value) {
    const dkd_payment_status_key_value = String(dkd_payment_status_value || '').trim().toLowerCase();
    if (['paid', 'wallet_paid', 'wallet_tl_paid', 'completed'].includes(dkd_payment_status_key_value)) return 'Ödendi';
    if (['pending_cash', 'cash_on_delivery'].includes(dkd_payment_status_key_value)) return 'Kapıda Nakit';
    if (['pending', 'waiting'].includes(dkd_payment_status_key_value)) return 'Ödeme Bekliyor';
    return dkd_payment_status_key_value ? dkd_payment_status_key_value.replaceAll('_', ' ') : 'Ödeme Bekliyor';
  }

  function dkd_format_date_value(dkd_input_value) {
    if (!dkd_input_value) return '—';
    const dkd_date_value = new Date(dkd_input_value);
    if (Number.isNaN(dkd_date_value.getTime())) return '—';
    return dkd_date_value.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function dkd_show_toast_value(dkd_message_value, dkd_is_error_value = false) {
    const dkd_toast_node_value = dkd_get_element_value('dkd_market_toast');
    if (!dkd_toast_node_value) {
      window.alert(dkd_message_value);
      return;
    }
    dkd_toast_node_value.textContent = dkd_message_value;
    dkd_toast_node_value.hidden = false;
    dkd_toast_node_value.classList.toggle('dkd_market_toast_error', Boolean(dkd_is_error_value));
    window.clearTimeout(dkd_toast_node_value.dkd_hide_timer_value);
    dkd_toast_node_value.dkd_hide_timer_value = window.setTimeout(() => {
      dkd_toast_node_value.hidden = true;
    }, 3200);
  }

  function dkd_humanize_status_value(dkd_status_value) {
    const dkd_status_key_value = String(dkd_status_value || '').toLowerCase();
    if (dkd_status_key_value === 'open' || dkd_status_key_value === 'ready' || dkd_status_key_value === 'published') return 'Açık';
    if (dkd_status_key_value === 'accepted' || dkd_status_key_value === 'assigned_courier') return 'Kurye Aldı';
    if (dkd_status_key_value === 'picked_up' || dkd_status_key_value === 'on_the_way') return 'Yolda';
    if (dkd_status_key_value === 'completed' || dkd_status_key_value === 'delivered') return 'Teslim';
    if (dkd_status_key_value === 'cancelled' || dkd_status_key_value === 'canceled') return 'İptal';
    if (dkd_status_key_value === 'pending_cash') return 'Kapıda Nakit';
    return dkd_status_key_value ? dkd_status_key_value.replaceAll('_', ' ') : 'Bilinmiyor';
  }

  function dkd_status_is_active_license_value(dkd_status_raw_value) {
    const dkd_status_value = String(dkd_status_raw_value || '').trim().toLowerCase();
    return ['approved', 'active', 'onayli', 'onaylı', 'verified', 'enabled', 'true', '1'].includes(dkd_status_value);
  }

  function dkd_has_active_courier_license_value() {
    if (dkd_web_login_cargo_state_value.dkd_has_courier_license_value === true) return true;
    const dkd_profile_value = dkd_web_login_cargo_state_value.dkd_snapshot_value.dkd_profile_value || {};
    const dkd_meta_value = dkd_profile_value.courier_profile_meta || dkd_profile_value.dkd_courier_profile_meta || {};
    const dkd_boolean_flags_value = [
      dkd_profile_value.has_courier_license,
      dkd_profile_value.dkd_has_courier_license,
      dkd_profile_value.courier_license_active,
      dkd_profile_value.dkd_courier_license_active,
      dkd_profile_value.is_courier_active,
      dkd_meta_value.has_courier_license,
      dkd_meta_value.license_active,
    ];
    if (dkd_boolean_flags_value.some((dkd_flag_value) => dkd_flag_value === true || dkd_flag_value === 'true' || dkd_flag_value === 1 || dkd_flag_value === '1')) return true;
    const dkd_status_values = [
      dkd_profile_value.courier_status,
      dkd_profile_value.dkd_courier_status,
      dkd_profile_value.courier_application_status,
      dkd_profile_value.application_status,
      dkd_profile_value.license_status,
      dkd_profile_value.courier_license_status,
      dkd_meta_value.license_status,
      dkd_meta_value.courier_license_status,
      dkd_meta_value.application_status,
    ];
    return dkd_status_values.some(dkd_status_is_active_license_value);
  }

  function dkd_render_courier_license_required_value() {
    return [
      '<div class="dkd_market_cargo_empty dkd_market_cargo_license_empty">',
        '<strong>Kurye lisansı aktif değil.</strong><br />',
        'Açık siparişleri yalnızca kurye lisansı onaylı hesaplar görebilir. Kargo oluşturma ve gönderilerim alanı açık kalır.',
      '</div>',
    ].join('');
  }

  function dkd_create_supabase_client_value() {
    if (dkd_web_login_cargo_state_value.dkd_supabase_client_value) return dkd_web_login_cargo_state_value.dkd_supabase_client_value;
    const dkd_has_config_value = Boolean(
      dkd_web_login_cargo_state_value.dkd_config_value?.dkd_supabase_url
      && dkd_web_login_cargo_state_value.dkd_config_value?.dkd_supabase_anon_key
      && window.supabase?.createClient
    );
    if (!dkd_has_config_value) return null;
    dkd_web_login_cargo_state_value.dkd_supabase_client_value = window.supabase.createClient(
      dkd_web_login_cargo_state_value.dkd_config_value.dkd_supabase_url,
      dkd_web_login_cargo_state_value.dkd_config_value.dkd_supabase_anon_key,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      },
    );
    return dkd_web_login_cargo_state_value.dkd_supabase_client_value;
  }

  async function dkd_refresh_session_value() {
    const dkd_client_value = dkd_create_supabase_client_value();
    if (!dkd_client_value) return null;
    const dkd_session_result_value = await dkd_client_value.auth.getSession();
    if (dkd_session_result_value.error) return null;
    dkd_web_login_cargo_state_value.dkd_session_value = dkd_session_result_value.data?.session || null;
    return dkd_web_login_cargo_state_value.dkd_session_value;
  }

  function dkd_is_guest_enabled_value() {
    try {
      return window.localStorage.getItem(dkd_guest_storage_key_value) === '1';
    } catch (_dkd_error_value) {
      return false;
    }
  }

  function dkd_set_guest_enabled_value(dkd_is_enabled_value) {
    try {
      if (dkd_is_enabled_value) window.localStorage.setItem(dkd_guest_storage_key_value, '1');
      else window.localStorage.removeItem(dkd_guest_storage_key_value);
    } catch (_dkd_error_value) {
      return;
    }
  }

  function dkd_render_auth_gate_value() {
    if (dkd_get_element_value('dkd_market_auth_gate')) return;
    document.body.insertAdjacentHTML('afterbegin', `
      <section class="dkd_market_auth_gate" id="dkd_market_auth_gate" aria-label="Lootonia giriş ekranı">
        <div class="dkd_market_auth_panel dkd_market_auth_panel_single dkd_market_auth_panel_signup_ready">
          <div class="dkd_market_auth_card dkd_market_auth_card_single">
            <div class="dkd_market_auth_brand_row dkd_market_auth_brand_row_card">
              <div class="dkd_market_auth_logo">L</div>
              <div>
                <div class="dkd_market_auth_brand_name">LOOTONIA</div>
                <div class="dkd_market_auth_brand_text">Market • Kurye • Kargo</div>
              </div>
            </div>
            <div class="dkd_market_auth_card_kicker">DKD Giriş Merkezi</div>
            <h2>Giriş yap veya kayıt ol</h2>
            <p class="dkd_market_auth_card_text">Kayıt sonrası ana sayfa direkt açılır. Misafir girişinde vitrin gezilir; canlı kargo/sipariş işlemleri için hesap gerekir.</p>
            <form class="dkd_market_auth_form" id="dkd_market_auth_gate_form">
              <label class="dkd_market_auth_field">
                <span>E-posta</span>
                <input id="dkd_market_auth_gate_email" type="email" autocomplete="email" placeholder="ornek@mail.com" />
              </label>
              <label class="dkd_market_auth_field">
                <span>Şifre</span>
                <input id="dkd_market_auth_gate_password" type="password" autocomplete="current-password" placeholder="En az 6 karakter" />
              </label>
              <button class="dkd_market_auth_primary_button" id="dkd_market_auth_login_button" type="submit">Login Ol ve Ana Sayfayı Aç</button>
              <button class="dkd_market_auth_register_button" type="button" id="dkd_market_auth_register_button">Kayıt Ol ve Ana Sayfayı Aç</button>
              <button class="dkd_market_auth_guest_button" type="button" id="dkd_market_auth_guest_button">Misafir Girişi</button>
              <div class="dkd_market_auth_error" id="dkd_market_auth_error" aria-live="polite"></div>
            </form>
          </div>
        </div>
      </section>
    `);
  }

  function dkd_set_auth_error_value(dkd_message_value) {
    const dkd_error_node_value = dkd_get_element_value('dkd_market_auth_error');
    if (dkd_error_node_value) dkd_error_node_value.textContent = dkd_message_value || '';
  }

  function dkd_unlock_main_value(dkd_mode_value) {
    document.body.classList.remove('dkd_market_auth_locked');
    const dkd_shell_node_value = document.querySelector('.dkd_market_shell');
    if (dkd_shell_node_value) dkd_shell_node_value.style.display = '';
    const dkd_gate_node_value = dkd_get_element_value('dkd_market_auth_gate');
    if (dkd_gate_node_value) dkd_gate_node_value.remove();
    dkd_web_login_cargo_state_value.dkd_guest_mode_value = dkd_mode_value === 'guest';
    dkd_render_guest_badge_value();
    window.setTimeout(() => {
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); }
      catch (_dkd_error_value) { window.scrollTo(0, 0); }
    }, 40);
  }

  function dkd_render_guest_badge_value() {
    const dkd_existing_badge_node_value = dkd_get_element_value('dkd_market_guest_badge');
    if (dkd_existing_badge_node_value) dkd_existing_badge_node_value.remove();
  }

  function dkd_lock_to_auth_gate_value() {
    dkd_set_guest_enabled_value(false);
    dkd_web_login_cargo_state_value.dkd_guest_mode_value = false;
    dkd_web_login_cargo_state_value.dkd_session_value = null;
    document.body.classList.add('dkd_market_auth_locked');
    dkd_render_auth_gate_value();
    const dkd_gate_node_value = dkd_get_element_value('dkd_market_auth_gate');
    if (dkd_gate_node_value) dkd_gate_node_value.hidden = false;
  }

  async function dkd_handle_gate_login_value(dkd_submit_event_value) {
    if (dkd_submit_event_value?.preventDefault) dkd_submit_event_value.preventDefault();
    dkd_set_auth_error_value('');
    const dkd_login_button_node_value = dkd_get_element_value('dkd_market_auth_login_button');
    if (dkd_login_button_node_value) {
      dkd_login_button_node_value.disabled = true;
      dkd_login_button_node_value.textContent = 'Giriş yapılıyor...';
    }
    const dkd_client_value = dkd_create_supabase_client_value();
    if (!dkd_client_value) {
      dkd_set_auth_error_value('Supabase web config eksik. Misafir girişiyle ana sayfayı açabilirsin.');
      if (dkd_login_button_node_value) {
        dkd_login_button_node_value.disabled = false;
        dkd_login_button_node_value.textContent = 'Login Ol ve Ana Sayfayı Aç';
      }
      return;
    }
    const dkd_email_value = String(dkd_get_element_value('dkd_market_auth_gate_email')?.value || '').trim();
    const dkd_password_value = String(dkd_get_element_value('dkd_market_auth_gate_password')?.value || '');
    if (!dkd_email_value || !dkd_password_value) {
      dkd_set_auth_error_value('E-posta ve şifre gir.');
      if (dkd_login_button_node_value) {
        dkd_login_button_node_value.disabled = false;
        dkd_login_button_node_value.textContent = 'Login Ol ve Ana Sayfayı Aç';
      }
      return;
    }
    try {
      const dkd_login_result_value = await dkd_client_value.auth.signInWithPassword({
        email: dkd_email_value,
        password: dkd_password_value,
      });
      if (dkd_login_result_value.error) throw dkd_login_result_value.error;
      dkd_set_guest_enabled_value(false);
      dkd_web_login_cargo_state_value.dkd_session_value = dkd_login_result_value.data?.session || null;
      dkd_unlock_main_value('auth');
      dkd_show_toast_value('Giriş başarılı. Ana sayfa açıldı.');
      dkd_attach_realtime_value();
      dkd_load_courier_snapshot_value().catch(() => null);
    } catch (dkd_error_value) {
      dkd_set_auth_error_value(dkd_error_value?.message || 'Giriş başarısız.');
    } finally {
      if (dkd_login_button_node_value) {
        dkd_login_button_node_value.disabled = false;
        dkd_login_button_node_value.textContent = 'Login Ol ve Ana Sayfayı Aç';
      }
    }
  }


  async function dkd_handle_gate_register_value() {
    dkd_set_auth_error_value('');
    const dkd_register_button_node_value = dkd_get_element_value('dkd_market_auth_register_button');
    if (dkd_register_button_node_value) {
      dkd_register_button_node_value.disabled = true;
      dkd_register_button_node_value.textContent = 'Kayıt açılıyor...';
    }
    const dkd_client_value = dkd_create_supabase_client_value();
    if (!dkd_client_value) {
      dkd_set_auth_error_value('Supabase web config eksik. Misafir girişiyle ana sayfayı açabilirsin.');
      if (dkd_register_button_node_value) {
        dkd_register_button_node_value.disabled = false;
        dkd_register_button_node_value.textContent = 'Kayıt Ol ve Ana Sayfayı Aç';
      }
      return;
    }
    const dkd_email_value = String(dkd_get_element_value('dkd_market_auth_gate_email')?.value || '').trim();
    const dkd_password_value = String(dkd_get_element_value('dkd_market_auth_gate_password')?.value || '');
    if (!dkd_email_value || !dkd_password_value) {
      dkd_set_auth_error_value('Kayıt için e-posta ve şifre gir.');
      if (dkd_register_button_node_value) {
        dkd_register_button_node_value.disabled = false;
        dkd_register_button_node_value.textContent = 'Kayıt Ol ve Ana Sayfayı Aç';
      }
      return;
    }
    if (dkd_password_value.length < 6) {
      dkd_set_auth_error_value('Şifre en az 6 karakter olmalı.');
      if (dkd_register_button_node_value) {
        dkd_register_button_node_value.disabled = false;
        dkd_register_button_node_value.textContent = 'Kayıt Ol ve Ana Sayfayı Aç';
      }
      return;
    }
    try {
      const dkd_signup_result_value = await dkd_client_value.auth.signUp({
        email: dkd_email_value,
        password: dkd_password_value,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      if (dkd_signup_result_value.error) throw dkd_signup_result_value.error;
      let dkd_session_value = dkd_signup_result_value.data?.session || null;
      if (!dkd_session_value) {
        const dkd_login_result_value = await dkd_client_value.auth.signInWithPassword({
          email: dkd_email_value,
          password: dkd_password_value,
        });
        if (dkd_login_result_value.error) {
          dkd_set_auth_error_value('Kayıt alındı; mail aktivasyonu istememesi için Supabase Authentication > Providers > Email > Confirm email kapalı olmalı.');
          return;
        }
        dkd_session_value = dkd_login_result_value.data?.session || null;
      }
      dkd_set_guest_enabled_value(false);
      dkd_web_login_cargo_state_value.dkd_session_value = dkd_session_value;
      dkd_unlock_main_value('auth');
      dkd_show_toast_value('Kayıt başarılı. Ana sayfa açıldı.');
      dkd_attach_realtime_value();
      dkd_load_courier_snapshot_value().catch(() => null);
    } catch (dkd_error_value) {
      dkd_set_auth_error_value(dkd_error_value?.message || 'Kayıt başarısız.');
    } finally {
      if (dkd_register_button_node_value) {
        dkd_register_button_node_value.disabled = false;
        dkd_register_button_node_value.textContent = 'Kayıt Ol ve Ana Sayfayı Aç';
      }
    }
  }

  function dkd_handle_guest_login_value() {
    dkd_set_guest_enabled_value(true);
    dkd_web_login_cargo_state_value.dkd_session_value = null;
    dkd_unlock_main_value('guest');
    dkd_show_toast_value('Misafir girişi açıldı.');
  }

  function dkd_install_auth_events_value() {
    if (document.documentElement.dataset.dkdAuthGateDelegationBound === '1') return;
    document.documentElement.dataset.dkdAuthGateDelegationBound = '1';

    document.addEventListener('click', (dkd_click_event_value) => {
      const dkd_register_button_node_value = dkd_click_event_value.target?.closest?.('#dkd_market_auth_register_button');
      if (dkd_register_button_node_value) {
        dkd_click_event_value.preventDefault();
        dkd_handle_gate_register_value();
        return;
      }
      const dkd_guest_button_node_value = dkd_click_event_value.target?.closest?.('#dkd_market_auth_guest_button');
      if (!dkd_guest_button_node_value) return;
      dkd_click_event_value.preventDefault();
      dkd_handle_guest_login_value();
    }, true);

    document.addEventListener('submit', (dkd_submit_event_value) => {
      if (dkd_submit_event_value.target?.id !== 'dkd_market_auth_gate_form') return;
      dkd_handle_gate_login_value(dkd_submit_event_value);
    }, true);
  }

  function dkd_install_courier_shell_value() {
    const dkd_bottom_nav_node_value = document.querySelector('.dkd_market_bottom_nav');
    if (dkd_bottom_nav_node_value && !dkd_bottom_nav_node_value.querySelector('[data-dkd-bottom-action="courier_cargo"]')) {
      const dkd_account_button_node_value = dkd_bottom_nav_node_value.querySelector('[data-dkd-bottom-action="account"]');
      const dkd_button_html_value = [
        '<button class="dkd_market_bottom_button dkd_market_bottom_button_courier" data-dkd-bottom-action="courier_cargo" type="button">',
          '<span class="dkd_market_bottom_icon dkd_market_bottom_icon_courier dkd_market_bottom_icon_courier_vibrant" aria-hidden="true">',
            '<svg viewBox="0 0 32 32" fill="none" focusable="false">',
              '<path d="M5.4 10.2h14.2v10.1H5.4V10.2Z" fill="currentColor" opacity=".18"/>',
              '<path d="M19.6 13h4.1l3.7 4.2v3.1h-7.8V13Z" fill="currentColor" opacity=".28"/>',
              '<path d="M6 10.2h13.6v10.1H6V10.2Zm13.6 2.8h4.1l3.7 4.2v3.1h-7.8V13Z" stroke="currentColor" stroke-width="2.15" stroke-linejoin="round"/>',
              '<path d="M10.1 24a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Zm13.1 0a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" fill="currentColor"/>',
              '<path d="M9.1 7.7h7.6M4.2 14.7h6.1" stroke="currentColor" stroke-width="2.15" stroke-linecap="round"/>',
            '</svg>',
          '</span>',
          '<span class="dkd_market_bottom_label_courier"><span>Kurye</span><span>Kargo</span></span>',
        '</button>',
      ].join('');
      if (dkd_account_button_node_value) dkd_account_button_node_value.insertAdjacentHTML('beforebegin', dkd_button_html_value);
      else dkd_bottom_nav_node_value.insertAdjacentHTML('beforeend', dkd_button_html_value);
    }

    if (dkd_get_element_value('dkd_market_courier_cargo_view')) return;
    const dkd_shell_node_value = document.querySelector('.dkd_market_shell');
    const dkd_bottom_nav_insert_node_value = document.querySelector('.dkd_market_bottom_nav');
    if (!dkd_shell_node_value || !dkd_bottom_nav_insert_node_value) return;
    document.body.classList.remove('dkd_market_courier_mode');
    dkd_bottom_nav_insert_node_value.insertAdjacentHTML('beforebegin', [
      '<section class="dkd_market_courier_cargo_view" id="dkd_market_courier_cargo_view" hidden aria-hidden="true">',
        '<div class="dkd_market_cargo_shell dkd_market_cargo_shell_modern dkd_market_cargo_shell_vibrant">',
          '<div class="dkd_market_cargo_head dkd_market_cargo_head_modern dkd_market_cargo_head_vibrant">',
            '<div class="dkd_market_cargo_head_left">',
              '<div class="dkd_market_cargo_head_icon dkd_market_cargo_head_icon_vibrant" aria-hidden="true">🚚</div>',
              '<div>',
                '<div class="dkd_market_cargo_kicker">Kargo Oluştur Operasyon Merkezi</div>',
                '<h2 class="dkd_market_cargo_modern_title">Kargo Oluştur Merkezi</h2>',
                '<p class="dkd_market_cargo_modern_subtitle">Gönderi oluştur, teslimat sürecini takip et, aktif lisanslı kuryeler işleri canlı görsün.</p>',
              '</div>',
            '</div>',
            '<div class="dkd_market_cargo_summary dkd_market_cargo_summary_modern dkd_market_cargo_summary_vibrant" id="dkd_market_cargo_summary"></div>',
          '</div>',
          '<div class="dkd_market_cargo_quick_help dkd_market_cargo_quick_help_vibrant" aria-label="Kargo Oluştur kısa bilgi">',
            '<div><span aria-hidden="true">📦</span><strong>Kargo Oluştur</strong><small>Alış ve teslim adresiyle yeni gönderi aç.</small></div>',
            '<div><span aria-hidden="true">📍</span><strong>Gönderilerim</strong><small>Kendi gönderilerini durum rozetleriyle takip et.</small></div>',
            '<div class="dkd_market_cargo_quick_help_courier"><span aria-hidden="true">🛵</span><strong>Siparişler</strong><small>Yalnızca aktif kurye lisansı olan hesaplarda görünür.</small></div>',
          '</div>',
          '<div class="dkd_market_cargo_tabs dkd_market_cargo_tabs_modern dkd_market_cargo_tabs_vibrant" id="dkd_market_cargo_tabs"></div>',
          '<div class="dkd_market_cargo_panel dkd_market_cargo_panel_modern dkd_market_cargo_panel_vibrant" id="dkd_market_cargo_panel"></div>',
        '</div>',
      '</section>',
    ].join(''));
  }

  function dkd_set_courier_view_visible_value(dkd_is_visible_value) {
    const dkd_view_node_value = dkd_get_element_value('dkd_market_courier_cargo_view');
    document.body.classList.toggle('dkd_market_courier_mode', Boolean(dkd_is_visible_value));
    if (!dkd_view_node_value) return;
    dkd_view_node_value.hidden = !dkd_is_visible_value;
    dkd_view_node_value.setAttribute('aria-hidden', dkd_is_visible_value ? 'false' : 'true');
    if (dkd_is_visible_value) {
      ['dkd_market_home_view', 'dkd_market_categories_view', 'dkd_market_support_view'].forEach((dkd_element_id_value) => {
        const dkd_node_value = dkd_get_element_value(dkd_element_id_value);
        if (dkd_node_value) dkd_node_value.hidden = true;
      });
      document.querySelectorAll('[data-dkd-bottom-action]').forEach((dkd_button_node_value) => {
        dkd_button_node_value.classList.toggle('dkd_market_bottom_button_active', dkd_button_node_value.getAttribute('data-dkd-bottom-action') === 'courier_cargo');
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function dkd_render_courier_tabs_value() {
    const dkd_tabs_node_value = dkd_get_element_value('dkd_market_cargo_tabs');
    if (!dkd_tabs_node_value) return;
    const dkd_has_license_value = dkd_has_active_courier_license_value();
    if (!dkd_has_license_value && dkd_web_login_cargo_state_value.dkd_active_tab_value === 'jobs') {
      dkd_web_login_cargo_state_value.dkd_active_tab_value = 'create';
    }
    const dkd_tab_entries_value = Object.entries(dkd_tab_label_map_value)
      .filter(([dkd_tab_key_value]) => dkd_has_license_value || dkd_tab_key_value !== 'jobs');
    dkd_tabs_node_value.innerHTML = dkd_tab_entries_value.map(([dkd_tab_key_value, dkd_label_value]) => [
      '<button class="dkd_market_cargo_tab ',
      dkd_web_login_cargo_state_value.dkd_active_tab_value === dkd_tab_key_value ? 'dkd_market_cargo_tab_active' : '',
      '" type="button" data-dkd-cargo-tab="', dkd_escape_html_value(dkd_tab_key_value), '">',
      dkd_escape_html_value(dkd_label_value),
      '</button>',
    ].join('')).join('');
  }

  function dkd_render_courier_summary_value() {
    const dkd_summary_node_value = dkd_get_element_value('dkd_market_cargo_summary');
    if (!dkd_summary_node_value) return;
    const dkd_has_license_value = dkd_has_active_courier_license_value();
    const dkd_jobs_values = dkd_has_license_value ? (dkd_web_login_cargo_state_value.dkd_snapshot_value.dkd_jobs_values || []) : [];
    const dkd_shipments_values = dkd_web_login_cargo_state_value.dkd_snapshot_value.dkd_shipments_values || [];
    const dkd_open_job_count_value = dkd_jobs_values.filter((dkd_job_value) => ['open', 'ready', 'published'].includes(String(dkd_job_value.status || '').toLowerCase())).length;
    const dkd_active_shipment_count_value = dkd_shipments_values.filter((dkd_shipment_value) => !['completed', 'delivered', 'cancelled', 'canceled'].includes(String(dkd_shipment_value.status || '').toLowerCase())).length;
    const dkd_wallet_value = Number(dkd_web_login_cargo_state_value.dkd_snapshot_value.dkd_profile_value?.courier_wallet_tl || 0);
    const dkd_summary_items_value = [
      ['Kargo Oluştur', 'Açık'],
      ['Gönderilerim', String(dkd_active_shipment_count_value)],
      ['Kurye Lisansı', dkd_has_license_value ? 'Aktif' : 'Pasif'],
    ];
    if (dkd_has_license_value) {
      dkd_summary_items_value.push(['Açık İş', String(dkd_open_job_count_value)]);
      dkd_summary_items_value.push(['Kurye Kasa', dkd_format_money_value(dkd_wallet_value)]);
    }
    dkd_summary_node_value.innerHTML = dkd_summary_items_value.map(([dkd_label_value, dkd_value]) => [
      '<div class="dkd_market_cargo_summary_item"><span>',
      dkd_escape_html_value(dkd_label_value),
      '</span><strong>',
      dkd_escape_html_value(dkd_value),
      '</strong></div>',
    ].join('')).join('');
  }

  function dkd_render_login_required_value() {
    return `
      <div class="dkd_market_cargo_empty dkd_market_cargo_login_required_vibrant">
        <strong>Canlı kargo senkronu için giriş gerekiyor.</strong>
        <span>Kargo oluşturma, sipariş alma ve gönderilerim akışı Lootonia hesabıyla çalışır.</span>
        <div class="dkd_market_cargo_actions" style="justify-content:center">
          <button class="dkd_market_cargo_primary_button" type="button" id="dkd_market_cargo_login_gate_button">Login Sayfasını Aç</button>
        </div>
      </div>
    `;
  }

  function dkd_build_job_card_value(dkd_job_value) {
    const dkd_status_key_value = String(dkd_job_value.status || '').toLowerCase();
    const dkd_is_open_value = ['open', 'ready', 'published'].includes(dkd_status_key_value) && !dkd_job_value.assigned_user_id;
    const dkd_is_accepted_value = ['accepted', 'assigned_courier'].includes(dkd_status_key_value);
    const dkd_is_picked_value = ['picked_up', 'on_the_way'].includes(dkd_status_key_value);
    const dkd_job_type_value = String(dkd_job_value.job_type || '').toLowerCase() === 'cargo' ? 'Kargo Siparişi' : 'İşletme Siparişi';
    const dkd_fee_value = Number(dkd_job_value.fee_tl || dkd_job_value.customer_charge_tl || 0);
    const dkd_actions_value = [];
    if (dkd_is_open_value) {
      dkd_actions_value.push(`<button class="dkd_market_cargo_primary_button" type="button" data-dkd-cargo-job-action="accept" data-dkd-cargo-job-id="${dkd_escape_html_value(dkd_job_value.id)}">Görevi Kabul Et</button>`);
    } else if (dkd_is_accepted_value) {
      dkd_actions_value.push(`<button class="dkd_market_cargo_secondary_button" type="button" data-dkd-cargo-job-action="pickup" data-dkd-cargo-job-id="${dkd_escape_html_value(dkd_job_value.id)}">Ürünü Teslim Aldım</button>`);
    } else if (dkd_is_picked_value) {
      dkd_actions_value.push(`<button class="dkd_market_cargo_primary_button" type="button" data-dkd-cargo-job-action="complete" data-dkd-cargo-job-id="${dkd_escape_html_value(dkd_job_value.id)}">Teslim Edildi</button>`);
    }
    return `
      <article class="dkd_market_cargo_card">
        <div class="dkd_market_cargo_card_head">
          <div>
            <h3>${dkd_escape_html_value(dkd_job_value.title || dkd_job_value.product_title || dkd_job_type_value)}</h3>
            <div class="dkd_market_cargo_meta">
              <span class="dkd_market_cargo_chip">${dkd_escape_html_value(dkd_job_type_value)}</span>
              <span class="dkd_market_cargo_chip dkd_market_cargo_chip_cash">${dkd_format_money_value(dkd_fee_value)}</span>
            </div>
          </div>
          <span class="dkd_market_cargo_status">${dkd_escape_html_value(dkd_humanize_status_value(dkd_status_key_value))}</span>
        </div>
        <div class="dkd_market_cargo_route">
          <div><strong>Alış Noktası</strong>${dkd_escape_html_value(dkd_job_value.pickup || 'Adres bekleniyor')}</div>
          <div><strong>Teslim Noktası</strong>${dkd_escape_html_value(dkd_job_value.dropoff || dkd_job_value.delivery_address_text || 'Adres bekleniyor')}</div>
        </div>
        <div class="dkd_market_cargo_meta">
          <span class="dkd_market_cargo_chip">ETA ${dkd_escape_html_value(dkd_job_value.eta_min || 15)} dk</span>
          <span class="dkd_market_cargo_chip">${dkd_escape_html_value(dkd_format_date_value(dkd_job_value.created_at))}</span>
        </div>
        ${dkd_actions_value.length ? `<div class="dkd_market_cargo_actions">${dkd_actions_value.join('')}</div>` : ''}
      </article>
    `;
  }

  function dkd_build_shipment_card_value(dkd_shipment_value) {
    const dkd_status_key_value = String(dkd_shipment_value.status || '').toLowerCase();
    const dkd_charge_value = Number(dkd_shipment_value.customer_charge_tl || 0);
    const dkd_courier_text_value = dkd_shipment_value.courier_display_name
      ? `${dkd_shipment_value.courier_display_name}${dkd_shipment_value.courier_plate_no ? ` • ${dkd_shipment_value.courier_plate_no}` : ''}`
      : 'Kurye bekleniyor';
    return `
      <article class="dkd_market_cargo_card">
        <div class="dkd_market_cargo_card_head">
          <div>
            <h3>${dkd_escape_html_value(dkd_shipment_value.package_content_text || 'Kargo Gönderisi')}</h3>
            <div class="dkd_market_cargo_meta">
              <span class="dkd_market_cargo_chip dkd_market_cargo_chip_cash">${dkd_format_money_value(dkd_charge_value)}</span>
              <span class="dkd_market_cargo_chip">${dkd_escape_html_value(dkd_humanize_payment_status_value(dkd_shipment_value.payment_status))}</span>
            </div>
          </div>
          <span class="dkd_market_cargo_status">${dkd_escape_html_value(dkd_humanize_status_value(dkd_status_key_value))}</span>
        </div>
        <div class="dkd_market_cargo_route">
          <div><strong>Gönderici</strong>${dkd_escape_html_value(`${dkd_shipment_value.customer_full_name || ''} ${dkd_shipment_value.customer_phone_text || ''}`.trim() || 'Gönderici bilgisi')}</div>
          <div><strong>Alış Adresi</strong>${dkd_escape_html_value(dkd_shipment_value.pickup_address_text || 'Adres bekleniyor')}</div>
          <div><strong>Teslim Adresi</strong>${dkd_escape_html_value(dkd_shipment_value.delivery_address_text || 'Adres bekleniyor')}</div>
          <div><strong>Kurye</strong>${dkd_escape_html_value(dkd_courier_text_value)}</div>
        </div>
        <div class="dkd_market_cargo_meta">
          <span class="dkd_market_cargo_chip">Varış ${dkd_escape_html_value(dkd_shipment_value.courier_eta_min || '—')} dk</span>
          <span class="dkd_market_cargo_chip">${dkd_escape_html_value(dkd_format_date_value(dkd_shipment_value.created_at))}</span>
        </div>
      </article>
    `;
  }

  function dkd_render_jobs_panel_value() {
    if (!dkd_has_active_courier_license_value()) return dkd_render_courier_license_required_value();
    const dkd_jobs_values = dkd_web_login_cargo_state_value.dkd_snapshot_value.dkd_jobs_values || [];
    if (!dkd_jobs_values.length) {
      return '<div class="dkd_market_cargo_empty">Şu an açık kurye/kargo işi yok. Yeni kargo oluşturulunca burada canlı görünecek.</div>';
    }
    return '<div class="dkd_market_cargo_grid">' + dkd_jobs_values.map(dkd_build_job_card_value).join('') + '</div>';
  }

  function dkd_render_create_panel_value() {
    dkd_web_login_cargo_state_value.dkd_pending_cargo_payload_value = null;
    dkd_web_login_cargo_state_value.dkd_pending_cargo_quote_value = null;
    return [
      '<form class="dkd_market_cargo_form dkd_market_cargo_form_modern" id="dkd_market_cargo_create_form">',
        '<div class="dkd_market_cargo_steps dkd_market_cargo_steps_paid">',
          '<div><span>1</span><strong>Gönderici</strong><small>Ad, telefon ve alış adresi</small></div>',
          '<div><span>2</span><strong>Ücret</strong><small>TL tutarını cüzdandan öde</small></div>',
          '<div><span>3</span><strong>Kurye Havuzu</strong><small>Ödenmiş iş canlı yayına düşer</small></div>',
        '</div>',
        '<div class="dkd_market_cargo_form_grid">',
          '<label class="dkd_market_cargo_field"><span>Ad</span><input id="dkd_web_cargo_first_name" type="text" placeholder="Gönderici adı" required /></label>',
          '<label class="dkd_market_cargo_field"><span>Soyad</span><input id="dkd_web_cargo_last_name" type="text" placeholder="Gönderici soyadı" required /></label>',
        '</div>',
        '<div class="dkd_market_cargo_form_grid">',
          '<label class="dkd_market_cargo_field"><span>Telefon</span><input id="dkd_web_cargo_phone" type="tel" value="+90" placeholder="+905xxxxxxxxx" required /></label>',
          '<label class="dkd_market_cargo_field"><span>Paket Ağırlığı kg</span><input id="dkd_web_cargo_weight" type="number" min="0.1" step="0.1" value="1" required /></label>',
        '</div>',
        '<label class="dkd_market_cargo_field"><span>Gönderici Adresi</span><textarea id="dkd_web_cargo_pickup" placeholder="Paketin alınacağı adres" required></textarea></label>',
        '<label class="dkd_market_cargo_field"><span>Teslimat Adresi</span><textarea id="dkd_web_cargo_dropoff" placeholder="Paketin teslim edileceği adres" required></textarea></label>',
        '<div class="dkd_market_cargo_form_grid">',
          '<label class="dkd_market_cargo_field"><span>Paket İçeriği</span><input id="dkd_web_cargo_content" type="text" placeholder="Örn: Evrak, yemek, küçük paket" required /></label>',
          '<label class="dkd_market_cargo_field"><span>Paket Görsel URL</span><input id="dkd_web_cargo_image_url" type="url" placeholder="İsteğe bağlı görsel linki" /></label>',
        '</div>',
        '<label class="dkd_market_cargo_field"><span>Kurye Notu</span><textarea id="dkd_web_cargo_note" placeholder="Kapı kodu, teslim notu vb."></textarea></label>',
        '<div class="dkd_market_cargo_actions dkd_market_cargo_actions_sticky">',
          '<button class="dkd_market_cargo_primary_button" type="submit">Devam Et ve Ödeme Ekranına Geç</button>',
          '<button class="dkd_market_cargo_ghost_button" type="button" id="dkd_market_cargo_refresh_button">Canlı Veriyi Yenile</button>',
        '</div>',
      '</form>',
    ].join('');
  }

  function dkd_render_cargo_wallet_payment_panel_value(dkd_payload_value, dkd_quote_value) {
    const dkd_wallet_value = dkd_get_profile_wallet_tl_value();
    const dkd_charge_value = Number(dkd_quote_value?.dkd_customer_charge_tl_value || 0);
    const dkd_remaining_value = dkd_round_money_number_value(dkd_wallet_value - dkd_charge_value);
    const dkd_is_wallet_enough_value = dkd_remaining_value >= 0;
    return [
      '<div class="dkd_market_cargo_payment_shell">',
        '<div class="dkd_market_cargo_payment_hero">',
          '<div class="dkd_market_cargo_payment_icon" aria-hidden="true">₺</div>',
          '<div>',
            '<span>Cüzdanla TL Ödeme</span>',
            '<h3>Kargo ücretini öde</h3>',
            '<p>Kargo oluşturulmadan önce ücret cüzdanındaki TL bakiyesinden düşer. Ödeme başarılı olunca gönderi “Ödendi” olarak kurye havuzuna düşer.</p>',
          '</div>',
        '</div>',
        '<div class="dkd_market_cargo_payment_amount">',
          '<small>Ödenecek Kargo Ücreti</small>',
          '<strong>', dkd_format_money_value(dkd_charge_value), '</strong>',
        '</div>',
        '<div class="dkd_market_cargo_payment_grid">',
          '<div><small>Mevcut Cüzdan</small><strong>', dkd_format_money_value(dkd_wallet_value), '</strong></div>',
          '<div><small>Ödeme Sonrası</small><strong class="', dkd_is_wallet_enough_value ? 'dkd_market_cargo_payment_ok' : 'dkd_market_cargo_payment_no', '">', dkd_format_money_value(Math.max(dkd_remaining_value, 0)), '</strong></div>',
        '</div>',
        '<div class="dkd_market_cargo_payment_summary">',
          '<div><span>Paket</span><strong>', dkd_escape_html_value(dkd_payload_value.dkd_param_package_content_text || 'Kargo'), '</strong></div>',
          '<div><span>Alış</span><strong>', dkd_escape_html_value(dkd_payload_value.dkd_param_pickup_address_text || '—'), '</strong></div>',
          '<div><span>Teslim</span><strong>', dkd_escape_html_value(dkd_payload_value.dkd_param_delivery_address_text || '—'), '</strong></div>',
        '</div>',
        dkd_is_wallet_enough_value ? '' : '<div class="dkd_market_cargo_payment_warning">Cüzdan bakiyen bu kargo için yetersiz. TL bakiyesi yüklendikten sonra tekrar deneyebilirsin.</div>',
        '<div class="dkd_market_cargo_actions dkd_market_cargo_actions_sticky">',
          '<button class="dkd_market_cargo_ghost_button" type="button" id="dkd_market_cargo_payment_back_button">Forma Dön</button>',
          '<button class="dkd_market_cargo_primary_button" type="button" id="dkd_market_cargo_wallet_pay_button" ', dkd_is_wallet_enough_value ? '' : 'disabled', '>',
            dkd_web_login_cargo_state_value.dkd_cargo_payment_busy_value ? 'Ödeme Alınıyor…' : 'Cüzdandan Öde ve Kargoyu Oluştur',
          '</button>',
        '</div>',
      '</div>',
    ].join('');
  }

  function dkd_show_cargo_wallet_payment_panel_value() {
    const dkd_panel_node_value = dkd_get_element_value('dkd_market_cargo_panel');
    if (!dkd_panel_node_value) return;
    const dkd_payload_value = dkd_web_login_cargo_state_value.dkd_pending_cargo_payload_value;
    const dkd_quote_value = dkd_web_login_cargo_state_value.dkd_pending_cargo_quote_value;
    if (!dkd_payload_value || !dkd_quote_value) return;
    dkd_render_courier_tabs_value();
    dkd_render_courier_summary_value();
    dkd_panel_node_value.innerHTML = dkd_render_cargo_wallet_payment_panel_value(dkd_payload_value, dkd_quote_value);
    dkd_get_element_value('dkd_market_cargo_payment_back_button')?.addEventListener('click', () => {
      dkd_web_login_cargo_state_value.dkd_pending_cargo_payload_value = null;
      dkd_web_login_cargo_state_value.dkd_pending_cargo_quote_value = null;
      dkd_render_courier_panel_value();
    });
    dkd_get_element_value('dkd_market_cargo_wallet_pay_button')?.addEventListener('click', dkd_confirm_cargo_wallet_payment_value);
  }

  function dkd_render_shipments_panel_value() {
    const dkd_shipments_values = dkd_web_login_cargo_state_value.dkd_snapshot_value.dkd_shipments_values || [];
    if (!dkd_shipments_values.length) {
      return '<div class="dkd_market_cargo_empty">Henüz web/mobil kargo gönderin görünmüyor. Kargo oluşturunca burada takip edilecek.</div>';
    }
    return `<div class="dkd_market_cargo_grid">${dkd_shipments_values.map(dkd_build_shipment_card_value).join('')}</div>`;
  }

  function dkd_render_courier_panel_value() {
    const dkd_panel_node_value = dkd_get_element_value('dkd_market_cargo_panel');
    if (!dkd_panel_node_value) return;
    if (!dkd_has_active_courier_license_value() && dkd_web_login_cargo_state_value.dkd_active_tab_value === 'jobs') {
      dkd_web_login_cargo_state_value.dkd_active_tab_value = 'create';
    }
    dkd_render_courier_tabs_value();
    dkd_render_courier_summary_value();
    if (!dkd_web_login_cargo_state_value.dkd_session_value?.user?.id) {
      dkd_panel_node_value.innerHTML = dkd_render_login_required_value();
      return;
    }
    if (dkd_web_login_cargo_state_value.dkd_snapshot_busy_value) {
      dkd_panel_node_value.innerHTML = '<div class="dkd_market_cargo_empty">Canlı veri yükleniyor…</div>';
      return;
    }
    if (dkd_web_login_cargo_state_value.dkd_active_tab_value === 'create') {
      dkd_panel_node_value.innerHTML = dkd_render_create_panel_value();
      dkd_bind_create_form_value();
      return;
    }
    if (dkd_web_login_cargo_state_value.dkd_active_tab_value === 'shipments') {
      dkd_panel_node_value.innerHTML = dkd_render_shipments_panel_value();
      return;
    }
    dkd_panel_node_value.innerHTML = dkd_render_jobs_panel_value();
  }

  async function dkd_load_courier_snapshot_value(dkd_options_value = {}) {
    const dkd_client_value = dkd_create_supabase_client_value();
    if (!dkd_client_value || !dkd_web_login_cargo_state_value.dkd_session_value?.user?.id) {
      dkd_web_login_cargo_state_value.dkd_has_courier_license_value = false;
      dkd_render_courier_panel_value();
      return;
    }
    if (dkd_web_login_cargo_state_value.dkd_snapshot_busy_value) return;
    const dkd_force_loading_value = Boolean(dkd_options_value.dkd_force_loading_value);
    const dkd_has_cached_jobs_value = Array.isArray(dkd_web_login_cargo_state_value.dkd_snapshot_value.dkd_jobs_values) && dkd_web_login_cargo_state_value.dkd_snapshot_value.dkd_jobs_values.length > 0;
    const dkd_has_cached_shipments_value = Array.isArray(dkd_web_login_cargo_state_value.dkd_snapshot_value.dkd_shipments_values) && dkd_web_login_cargo_state_value.dkd_snapshot_value.dkd_shipments_values.length > 0;
    const dkd_has_cached_profile_value = Boolean(dkd_web_login_cargo_state_value.dkd_snapshot_value.dkd_profile_value);
    const dkd_should_show_loading_value = dkd_force_loading_value || (!dkd_has_cached_jobs_value && !dkd_has_cached_shipments_value && !dkd_has_cached_profile_value);
    dkd_web_login_cargo_state_value.dkd_snapshot_busy_value = true;
    if (dkd_should_show_loading_value) dkd_render_courier_panel_value();
    try {
      const dkd_result_value = await dkd_client_value.rpc('dkd_web_courier_operation_snapshot_dkd');
      if (dkd_result_value.error) throw dkd_result_value.error;
      const dkd_data_value = dkd_result_value.data || {};
      const dkd_profile_value = dkd_data_value.profile || null;
      dkd_web_login_cargo_state_value.dkd_snapshot_value = {
        dkd_jobs_values: Array.isArray(dkd_data_value.jobs) ? dkd_data_value.jobs : [],
        dkd_shipments_values: Array.isArray(dkd_data_value.shipments) ? dkd_data_value.shipments : [],
        dkd_profile_value,
      };
      dkd_web_login_cargo_state_value.dkd_has_courier_license_value = dkd_data_value.has_courier_license === true || dkd_data_value.dkd_has_courier_license === true || dkd_has_active_courier_license_value();
      if (!dkd_web_login_cargo_state_value.dkd_has_courier_license_value) {
        dkd_web_login_cargo_state_value.dkd_snapshot_value.dkd_jobs_values = [];
        if (dkd_web_login_cargo_state_value.dkd_active_tab_value === 'jobs') dkd_web_login_cargo_state_value.dkd_active_tab_value = 'create';
      }
      dkd_web_login_cargo_state_value.dkd_last_snapshot_at_value = Date.now();
    } catch (dkd_error_value) {
      dkd_web_login_cargo_state_value.dkd_has_courier_license_value = false;
      dkd_show_toast_value(dkd_error_value?.message || 'Kargo Oluştur verisi alınamadı.', true);
    } finally {
      dkd_web_login_cargo_state_value.dkd_snapshot_busy_value = false;
      dkd_render_courier_panel_value();
    }
  }

  async function dkd_run_courier_job_action_value(dkd_action_value, dkd_job_id_value) {
    const dkd_client_value = dkd_create_supabase_client_value();
    if (!dkd_client_value || !dkd_web_login_cargo_state_value.dkd_session_value?.user?.id) {
      dkd_show_toast_value('Bu işlem için giriş yapmalısın.', true);
      return;
    }
    if (!dkd_has_active_courier_license_value()) {
      dkd_show_toast_value('Siparişleri sadece kurye lisansı aktif hesaplar alabilir.', true);
      return;
    }
    const dkd_rpc_map_value = {
      accept: 'dkd_web_courier_job_accept_dkd',
      pickup: 'dkd_web_courier_job_picked_up_dkd',
      complete: 'dkd_web_courier_job_complete_dkd',
    };
    const dkd_rpc_name_value = dkd_rpc_map_value[dkd_action_value];
    if (!dkd_rpc_name_value) return;
    try {
      const dkd_job_key_value = String(dkd_job_id_value || '').trim();
      if (!dkd_job_key_value) {
        dkd_show_toast_value('Kurye işi bulunamadı.', true);
        return;
      }
      const dkd_result_value = await dkd_client_value.rpc(dkd_rpc_name_value, { dkd_param_job_id: dkd_job_key_value });
      if (dkd_result_value.error) throw dkd_result_value.error;
      if (dkd_result_value.data?.ok === false) throw new Error(dkd_result_value.data?.reason || 'İşlem başarısız.');
      dkd_show_toast_value('Kargo Oluştur işlemi güncellendi.');
      await dkd_load_courier_snapshot_value();
    } catch (dkd_error_value) {
      const dkd_message_value = dkd_error_value?.message === 'courier_license_required'
        ? 'Bu işlem için aktif kurye lisansı gerekiyor.'
        : (dkd_error_value?.message || 'Kurye işlemi tamamlanamadı.');
      dkd_show_toast_value(dkd_message_value, true);
    }
  }

  function dkd_get_form_value(dkd_element_id_value) {
    return String(dkd_get_element_value(dkd_element_id_value)?.value || '').trim();
  }

  async function dkd_submit_cargo_create_value(dkd_submit_event_value) {
    dkd_submit_event_value.preventDefault();
    const dkd_client_value = dkd_create_supabase_client_value();
    if (!dkd_client_value || !dkd_web_login_cargo_state_value.dkd_session_value?.user?.id) {
      dkd_show_toast_value('Kargo oluşturmak için giriş yapmalısın.', true);
      return;
    }
    const dkd_payload_value = {
      dkd_param_customer_first_name: dkd_get_form_value('dkd_web_cargo_first_name'),
      dkd_param_customer_last_name: dkd_get_form_value('dkd_web_cargo_last_name'),
      dkd_param_customer_phone_text: dkd_get_form_value('dkd_web_cargo_phone'),
      dkd_param_pickup_address_text: dkd_get_form_value('dkd_web_cargo_pickup'),
      dkd_param_delivery_address_text: dkd_get_form_value('dkd_web_cargo_dropoff'),
      dkd_param_package_content_text: dkd_get_form_value('dkd_web_cargo_content'),
      dkd_param_package_image_url: dkd_get_form_value('dkd_web_cargo_image_url'),
      dkd_param_package_weight_kg: Number(dkd_get_form_value('dkd_web_cargo_weight') || 1),
      dkd_param_delivery_note_text: dkd_get_form_value('dkd_web_cargo_note'),
    };
    let dkd_quote_value = dkd_estimate_cargo_quote_value(dkd_payload_value.dkd_param_package_weight_kg);
    try {
      const dkd_quote_result_value = await dkd_client_value.rpc('dkd_web_cargo_quote_dkd', {
        dkd_param_package_weight_kg: dkd_payload_value.dkd_param_package_weight_kg,
      });
      if (!dkd_quote_result_value.error && dkd_quote_result_value.data?.ok !== false) {
        const dkd_quote_data_value = dkd_quote_result_value.data || {};
        dkd_quote_value = {
          dkd_weight_kg_value: Number(dkd_quote_data_value.weight_kg || dkd_payload_value.dkd_param_package_weight_kg || 1),
          dkd_fee_tl_value: Number(dkd_quote_data_value.fee_tl || dkd_quote_value.dkd_fee_tl_value || 0),
          dkd_customer_charge_tl_value: Number(dkd_quote_data_value.customer_charge_tl || dkd_quote_value.dkd_customer_charge_tl_value || 0),
          dkd_eta_min_value: Number(dkd_quote_data_value.eta_min || dkd_quote_value.dkd_eta_min_value || 18),
        };
      }
    } catch (dkd_quote_error_value) {
      console.warn('DKD cargo quote fallback', dkd_quote_error_value);
    }
    dkd_web_login_cargo_state_value.dkd_pending_cargo_payload_value = dkd_payload_value;
    dkd_web_login_cargo_state_value.dkd_pending_cargo_quote_value = dkd_quote_value;
    dkd_show_cargo_wallet_payment_panel_value();
  }

  async function dkd_confirm_cargo_wallet_payment_value() {
    const dkd_client_value = dkd_create_supabase_client_value();
    const dkd_payload_value = dkd_web_login_cargo_state_value.dkd_pending_cargo_payload_value;
    if (!dkd_client_value || !dkd_web_login_cargo_state_value.dkd_session_value?.user?.id) {
      dkd_show_toast_value('Ödeme için giriş yapmalısın.', true);
      return;
    }
    if (!dkd_payload_value || dkd_web_login_cargo_state_value.dkd_cargo_payment_busy_value) return;
    dkd_web_login_cargo_state_value.dkd_cargo_payment_busy_value = true;
    dkd_show_cargo_wallet_payment_panel_value();
    try {
      const dkd_result_value = await dkd_client_value.rpc('dkd_web_cargo_create_wallet_paid_dkd', dkd_payload_value);
      if (dkd_result_value.error) throw dkd_result_value.error;
      if (dkd_result_value.data?.ok === false) {
        const dkd_reason_value = dkd_result_value.data?.reason || 'wallet_payment_failed';
        if (dkd_reason_value === 'wallet_insufficient') {
          throw new Error('Cüzdan bakiyesi yetersiz. Gerekli tutar: ' + dkd_format_money_value(dkd_result_value.data?.required_tl || dkd_result_value.data?.customer_charge_tl || 0));
        }
        throw new Error(dkd_reason_value);
      }
      dkd_show_toast_value('Ödeme alındı, kargo oluşturuldu: ' + dkd_format_money_value(dkd_result_value.data?.customer_charge_tl || 0));
      dkd_web_login_cargo_state_value.dkd_pending_cargo_payload_value = null;
      dkd_web_login_cargo_state_value.dkd_pending_cargo_quote_value = null;
      dkd_web_login_cargo_state_value.dkd_active_tab_value = 'shipments';
      await dkd_load_courier_snapshot_value({ dkd_force_loading_value: true });
    } catch (dkd_error_value) {
      dkd_show_toast_value(dkd_error_value?.message || 'Cüzdan ödemesi alınamadı.', true);
    } finally {
      dkd_web_login_cargo_state_value.dkd_cargo_payment_busy_value = false;
      if (dkd_web_login_cargo_state_value.dkd_pending_cargo_payload_value) dkd_show_cargo_wallet_payment_panel_value();
    }
  }

  function dkd_bind_create_form_value() {
    dkd_get_element_value('dkd_market_cargo_create_form')?.addEventListener('submit', dkd_submit_cargo_create_value);
    dkd_get_element_value('dkd_market_cargo_refresh_button')?.addEventListener('click', async () => {
      await dkd_load_courier_snapshot_value();
      dkd_show_toast_value('Canlı Kargo Oluştur verisi yenilendi.');
    });
  }

  function dkd_schedule_courier_snapshot_refresh_value(dkd_delay_ms_value = 12000) {
    window.clearTimeout(dkd_web_login_cargo_state_value.dkd_refresh_delay_timer_value);
    dkd_web_login_cargo_state_value.dkd_refresh_delay_timer_value = window.setTimeout(() => {
      const dkd_courier_view_node_value = dkd_get_element_value('dkd_market_courier_cargo_view');
      if (dkd_courier_view_node_value && !dkd_courier_view_node_value.hidden) {
        dkd_load_courier_snapshot_value();
      }
    }, Number(dkd_delay_ms_value || 12000));
  }

  function dkd_attach_realtime_value() {
    const dkd_client_value = dkd_create_supabase_client_value();
    if (!dkd_client_value || !dkd_web_login_cargo_state_value.dkd_session_value?.user?.id || dkd_web_login_cargo_state_value.dkd_realtime_channel_value) return;
    dkd_web_login_cargo_state_value.dkd_realtime_channel_value = dkd_client_value
      .channel('dkd_web_courier_cargo_live_dkd')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dkd_courier_jobs' }, () => dkd_schedule_courier_snapshot_refresh_value(12000))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dkd_cargo_shipments' }, () => dkd_schedule_courier_snapshot_refresh_value(12000))
      .subscribe();
  }

  function dkd_start_polling_value() {
    window.clearInterval(dkd_web_login_cargo_state_value.dkd_poll_timer_value);
    dkd_web_login_cargo_state_value.dkd_poll_timer_value = window.setInterval(() => {
      const dkd_courier_view_node_value = dkd_get_element_value('dkd_market_courier_cargo_view');
      if (dkd_courier_view_node_value && !dkd_courier_view_node_value.hidden && !dkd_web_login_cargo_state_value.dkd_snapshot_busy_value) {
        dkd_load_courier_snapshot_value();
      }
    }, 60000);
  }

  function dkd_install_courier_visibility_guard_value() {
    if (document.body.dataset.dkdCourierGuardBoundValue === '1') return;
    document.body.dataset.dkdCourierGuardBoundValue = '1';
    document.body.classList.remove('dkd_market_courier_mode');
    document.addEventListener('click', (dkd_click_event_value) => {
      const dkd_nav_button_node_value = dkd_click_event_value.target.closest('[data-dkd-bottom-action]');
      if (!dkd_nav_button_node_value) return;
      const dkd_action_value = dkd_nav_button_node_value.getAttribute('data-dkd-bottom-action') || '';
      if (dkd_action_value !== 'courier_cargo') {
        dkd_set_courier_view_visible_value(false);
        return;
      }
      window.setTimeout(async () => {
        dkd_set_courier_view_visible_value(true);
        await dkd_load_courier_snapshot_value();
      }, 0);
    }, true);
  }

  function dkd_bind_courier_events_value() {
    document.addEventListener('click', async (dkd_click_event_value) => {
      const dkd_nav_button_node_value = dkd_click_event_value.target.closest('[data-dkd-bottom-action="courier_cargo"]');
      if (dkd_nav_button_node_value) {
        dkd_set_courier_view_visible_value(true);
        await dkd_load_courier_snapshot_value();
        return;
      }

      const dkd_other_nav_button_node_value = dkd_click_event_value.target.closest('[data-dkd-bottom-action]');
      if (dkd_other_nav_button_node_value && dkd_other_nav_button_node_value.getAttribute('data-dkd-bottom-action') !== 'courier_cargo') {
        window.setTimeout(() => dkd_set_courier_view_visible_value(false), 0);
      }

      const dkd_tab_button_node_value = dkd_click_event_value.target.closest('[data-dkd-cargo-tab]');
      if (dkd_tab_button_node_value) {
        const dkd_requested_tab_value = dkd_tab_button_node_value.getAttribute('data-dkd-cargo-tab') || 'create';
        if (dkd_requested_tab_value === 'jobs' && !dkd_has_active_courier_license_value()) {
          dkd_show_toast_value('Kurye siparişleri için aktif kurye lisansı gerekiyor.', true);
          dkd_web_login_cargo_state_value.dkd_active_tab_value = 'create';
          dkd_render_courier_panel_value();
          return;
        }
        dkd_web_login_cargo_state_value.dkd_active_tab_value = dkd_requested_tab_value;
        dkd_render_courier_panel_value();
        return;
      }

      const dkd_job_action_node_value = dkd_click_event_value.target.closest('[data-dkd-cargo-job-action]');
      if (dkd_job_action_node_value) {
        await dkd_run_courier_job_action_value(
          dkd_job_action_node_value.getAttribute('data-dkd-cargo-job-action'),
          dkd_job_action_node_value.getAttribute('data-dkd-cargo-job-id'),
        );
        return;
      }

      if (dkd_click_event_value.target?.id === 'dkd_market_cargo_login_gate_button') {
        dkd_lock_to_auth_gate_value();
      }
    });
  }

  async function dkd_boot_auth_gate_value() {
    dkd_render_auth_gate_value();
    dkd_install_auth_events_value();
    await dkd_refresh_session_value();
    if (dkd_web_login_cargo_state_value.dkd_session_value?.user?.id) {
      dkd_set_guest_enabled_value(false);
      dkd_unlock_main_value('auth');
      dkd_attach_realtime_value();
      return;
    }
    if (dkd_is_guest_enabled_value()) {
      dkd_unlock_main_value('guest');
      return;
    }
    document.body.classList.add('dkd_market_auth_locked');
  }

  async function dkd_init_value() {
    dkd_install_courier_shell_value();
    dkd_install_courier_visibility_guard_value();
    dkd_bind_courier_events_value();
    await dkd_boot_auth_gate_value();
    dkd_start_polling_value();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', dkd_init_value);
  } else {
    dkd_init_value();
  }
})();
