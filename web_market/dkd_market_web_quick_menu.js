(function dkd_market_web_quick_menu_scope_value() {
  'use strict';

  const dkd_quick_menu_items_value = [
    {
      dkd_key_value: 'about',
      dkd_title_value: 'Hakkımızda',
      dkd_html_value: `
        <h3>Hakkımızda</h3>
        <p><strong>Lootonia Market</strong>, DrabornEagle ekosisteminde işletme ürünleri, kurye teslimatlı siparişler ve dijital oyun deneyimini tek panelde birleştiren web market alanıdır.</p>
        <p>Amacımız kullanıcıya anlaşılır fiyat, hızlı sipariş akışı ve mobil uygulamayla senkron çalışan modern bir alışveriş deneyimi sunmaktır.</p>
      `,
    },
    {
      dkd_key_value: 'contact',
      dkd_title_value: 'İletişim',
      dkd_html_value: `
        <h3>İletişim</h3>
        <p>Destek taleplerin için web marketteki <strong>7/24 Destek</strong> alanını kullanabilir veya doğrudan e-posta gönderebilirsin.</p>
        <ul>
          <li>E-posta: <strong>draborneagle@gmail.com</strong></li>
          <li>Web: <strong>www.draborneagle.com</strong></li>
          <li>Destek konusu, sipariş bilgisi ve iletişim numarası iletilirse süreç daha hızlı ilerler.</li>
        </ul>
      `,
    },
    {
      dkd_key_value: 'refund',
      dkd_title_value: 'İade ve iptal politikası',
      dkd_html_value: `
        <h3>İade ve iptal politikası</h3>
        <p>Sipariş iptali, ürün hazırlık veya kurye teslimat süreci başlamadan önce destek kanalı üzerinden talep edilebilir.</p>
        <ul>
          <li>Hazırlanmaya başlamış yemek ve hızlı tüketim ürünlerinde iade, ürün niteliğine göre değerlendirilir.</li>
          <li>Yanlış, eksik veya hasarlı teslimatlarda kullanıcı destek talebi açabilir.</li>
          <li>Onaylanan iadeler, ödeme yöntemine uygun şekilde işleme alınır.</li>
        </ul>
      `,
    },
    {
      dkd_key_value: 'distance_sale',
      dkd_title_value: 'Mesafeli satış sözleşmesi',
      dkd_html_value: `
        <h3>Mesafeli satış sözleşmesi</h3>
        <p>Kullanıcı, web market üzerinden sipariş oluşturarak ürün bilgisi, fiyat, teslimat yöntemi ve ödeme koşullarını kabul etmiş sayılır.</p>
        <ul>
          <li>Satışa konu ürün, sipariş ekranında görünen açıklama ve TL fiyat üzerinden sunulur.</li>
          <li>Teslimat, uygun kurye veya işletme teslimat akışına göre yapılır.</li>
          <li>Uyuşmazlıklarda kayıtlı sipariş bilgileri, ödeme durumu ve teslimat kayıtları esas alınır.</li>
        </ul>
      `,
    },
    {
      dkd_key_value: 'privacy',
      dkd_title_value: 'Gizlilik politikası',
      dkd_html_value: `
        <h3>Gizlilik politikası</h3>
        <p>Ad, soyad, telefon, adres, sipariş ve destek bilgileri yalnızca siparişin tamamlanması, teslimatın yapılması ve destek süreçlerinin yürütülmesi için kullanılır.</p>
        <ul>
          <li>Kullanıcı bilgileri yetkisiz kişilerle paylaşılmaz.</li>
          <li>Teslimat için gerekli bilgiler ilgili işletme ve kurye akışında kullanılabilir.</li>
          <li>Hesap ve sipariş kayıtları güvenlik, işlem geçmişi ve kullanıcı deneyimi için saklanabilir.</li>
        </ul>
      `,
    },
    {
      dkd_key_value: 'delivery',
      dkd_title_value: 'Teslimat politikası',
      dkd_html_value: `
        <h3>Teslimat politikası</h3>
        <p>Teslimat süresi işletme yoğunluğu, kurye uygunluğu, adres mesafesi ve hava/yol şartlarına göre değişebilir.</p>
        <ul>
          <li>Kullanıcı, sipariş veya kargo oluştururken doğru adres ve telefon bilgisi girmelidir.</li>
          <li>Kurye atandığında teslimat durumu sistem üzerinden güncellenir.</li>
          <li>Teslimat sırasında alıcıya ulaşılamaması durumunda destek süreci başlatılabilir.</li>
        </ul>
      `,
    },
    {
      dkd_key_value: 'terms',
      dkd_title_value: 'Kullanım şartları',
      dkd_html_value: `
        <h3>Kullanım şartları</h3>
        <p>Lootonia Market kullanımı sırasında doğru bilgi girilmesi, siparişlerin kötüye kullanılmaması ve platform akışına zarar verecek işlemlerden kaçınılması gerekir.</p>
        <ul>
          <li>Yanlış adres, sahte sipariş veya kötüye kullanım tespit edildiğinde işlem kısıtlanabilir.</li>
          <li>Fiyatlar, kampanyalar ve teslimat koşulları güncellenebilir.</li>
          <li>Platformu kullanmaya devam eden kullanıcılar güncel şartları kabul etmiş sayılır.</li>
        </ul>
      `,
    },
  ];

  function dkd_get_item_value(dkd_key_value) {
    return dkd_quick_menu_items_value.find(function dkd_find_item_value(dkd_item_value) {
      return dkd_item_value.dkd_key_value === dkd_key_value;
    }) || dkd_quick_menu_items_value[0];
  }

  function dkd_build_menu_button_value() {
    const dkd_button_value = document.createElement('button');
    dkd_button_value.id = 'dkd_market_quick_menu_button';
    dkd_button_value.className = 'dkd_market_quick_menu_button';
    dkd_button_value.type = 'button';
    dkd_button_value.setAttribute('aria-label', 'Hızlı menü');
    dkd_button_value.setAttribute('data-dkd-quick-menu-open', 'true');
    dkd_button_value.innerHTML = `
      <span class="dkd_market_quick_menu_lines" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </span>
    `;
    return dkd_button_value;
  }

  function dkd_install_header_button_value() {
    if (document.getElementById('dkd_market_quick_menu_button')) return;
    const dkd_support_button_value = document.querySelector('[data-dkd-open-support="true"]');
    const dkd_header_badges_value = document.querySelector('.dkd_market_header_badges');
    if (!dkd_header_badges_value && !dkd_support_button_value) return;
    const dkd_button_value = dkd_build_menu_button_value();
    if (dkd_support_button_value && dkd_support_button_value.parentElement) {
      dkd_support_button_value.insertAdjacentElement('afterend', dkd_button_value);
      return;
    }
    dkd_header_badges_value.appendChild(dkd_button_value);
  }

  function dkd_build_menu_shell_value() {
    const dkd_shell_value = document.createElement('section');
    dkd_shell_value.id = 'dkd_market_quick_menu_shell';
    dkd_shell_value.className = 'dkd_market_quick_menu_shell';
    dkd_shell_value.hidden = true;
    dkd_shell_value.setAttribute('aria-hidden', 'true');
    dkd_shell_value.innerHTML = `
      <div class="dkd_market_quick_menu_backdrop" data-dkd-quick-menu-close="true"></div>
      <div class="dkd_market_quick_menu_panel" role="dialog" aria-modal="true" aria-labelledby="dkd_market_quick_menu_title">
        <div class="dkd_market_quick_menu_head">
          <div>
            <div class="dkd_market_quick_menu_kicker">Lootonia Market</div>
            <h2 class="dkd_market_quick_menu_title" id="dkd_market_quick_menu_title">Hızlı Menü</h2>
            <p class="dkd_market_quick_menu_text">Kurumsal bilgiler, politikalar ve kullanım koşullarına buradan hızlıca ulaş.</p>
          </div>
          <button class="dkd_market_quick_menu_close" type="button" data-dkd-quick-menu-close="true" aria-label="Menüyü kapat">×</button>
        </div>
        <div class="dkd_market_quick_menu_body">
          <div class="dkd_market_quick_menu_list" id="dkd_market_quick_menu_list"></div>
          <article class="dkd_market_quick_menu_content" id="dkd_market_quick_menu_content"></article>
        </div>
      </div>
    `;
    return dkd_shell_value;
  }

  function dkd_install_menu_shell_value() {
    if (document.getElementById('dkd_market_quick_menu_shell')) return;
    document.body.appendChild(dkd_build_menu_shell_value());
  }

  function dkd_render_menu_list_value(dkd_active_key_value) {
    const dkd_list_value = document.getElementById('dkd_market_quick_menu_list');
    if (!dkd_list_value) return;
    dkd_list_value.innerHTML = dkd_quick_menu_items_value.map(function dkd_map_item_value(dkd_item_value) {
      const dkd_active_class_value = dkd_item_value.dkd_key_value === dkd_active_key_value ? ' dkd_market_quick_menu_item_active' : '';
      return `
        <button class="dkd_market_quick_menu_item${dkd_active_class_value}" type="button" data-dkd-quick-menu-key="${dkd_item_value.dkd_key_value}">
          <span class="dkd_market_quick_menu_item_title">${dkd_item_value.dkd_title_value}</span>
          <span class="dkd_market_quick_menu_item_arrow" aria-hidden="true">›</span>
        </button>
      `;
    }).join('');
  }

  function dkd_render_menu_content_value(dkd_key_value) {
    const dkd_content_value = document.getElementById('dkd_market_quick_menu_content');
    const dkd_item_value = dkd_get_item_value(dkd_key_value);
    if (!dkd_content_value) return;
    dkd_render_menu_list_value(dkd_item_value.dkd_key_value);
    dkd_content_value.innerHTML = dkd_item_value.dkd_html_value;
  }

  function dkd_open_menu_value(dkd_key_value) {
    dkd_install_header_button_value();
    dkd_install_menu_shell_value();
    const dkd_shell_value = document.getElementById('dkd_market_quick_menu_shell');
    if (!dkd_shell_value) return;
    dkd_render_menu_content_value(dkd_key_value || 'about');
    dkd_shell_value.hidden = false;
    dkd_shell_value.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('dkd_market_quick_menu_is_open');
  }

  function dkd_close_menu_value() {
    const dkd_shell_value = document.getElementById('dkd_market_quick_menu_shell');
    if (!dkd_shell_value) return;
    dkd_shell_value.hidden = true;
    dkd_shell_value.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('dkd_market_quick_menu_is_open');
  }

  function dkd_handle_click_value(dkd_event_value) {
    const dkd_open_target_value = dkd_event_value.target.closest('[data-dkd-quick-menu-open="true"]');
    if (dkd_open_target_value) {
      dkd_event_value.preventDefault();
      dkd_open_menu_value('about');
      return;
    }

    const dkd_close_target_value = dkd_event_value.target.closest('[data-dkd-quick-menu-close="true"]');
    if (dkd_close_target_value) {
      dkd_event_value.preventDefault();
      dkd_close_menu_value();
      return;
    }

    const dkd_item_target_value = dkd_event_value.target.closest('[data-dkd-quick-menu-key]');
    if (dkd_item_target_value) {
      dkd_event_value.preventDefault();
      dkd_render_menu_content_value(dkd_item_target_value.getAttribute('data-dkd-quick-menu-key'));
    }
  }

  function dkd_handle_keydown_value(dkd_event_value) {
    if (dkd_event_value.key === 'Escape') {
      dkd_close_menu_value();
    }
  }

  function dkd_boot_quick_menu_value() {
    if (window.dkd_market_quick_menu_ready_value) return;
    window.dkd_market_quick_menu_ready_value = true;
    dkd_install_header_button_value();
    dkd_install_menu_shell_value();
    document.addEventListener('click', dkd_handle_click_value, true);
    document.addEventListener('keydown', dkd_handle_keydown_value, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', dkd_boot_quick_menu_value, { once: true });
  } else {
    dkd_boot_quick_menu_value();
  }
})();
