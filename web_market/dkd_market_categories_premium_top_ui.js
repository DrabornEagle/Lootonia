(function dkd_market_categories_premium_top_ui_bootstrap_value(){
  function dkd_categories_view_value(){
    return document.getElementById('dkd_market_categories_view') || document.querySelector('[data-dkd-view="categories"]') || document.querySelector('.dkd_market_categories_view');
  }
  function dkd_text_value(dkd_node_value){
    return String(dkd_node_value?.textContent || '').replace(/\s+/g,' ').trim().toLowerCase();
  }
  function dkd_insert_premium_top_value(){
    const dkd_view_node_value = dkd_categories_view_value();
    if(!dkd_view_node_value) return;
    if(dkd_view_node_value.querySelector('[data-dkd-categories-premium-top="true"]')) return;
    const dkd_target_node_value = dkd_view_node_value.querySelector('.dkd_market_categories_switch')
      || dkd_view_node_value.querySelector('.dkd_market_bridge_service_grid')
      || dkd_view_node_value.firstElementChild;
    const dkd_html_value = [
      '<section class="dkd_market_categories_premium_top" data-dkd-categories-premium-top="true">',
        '<div class="dkd_market_categories_premium_glow dkd_market_categories_premium_glow_one"></div>',
        '<div class="dkd_market_categories_premium_glow dkd_market_categories_premium_glow_two"></div>',
        '<div class="dkd_market_categories_premium_head">',
          '<div>',
            '<span class="dkd_market_categories_premium_badge">Lootonia Market</span>',
            '<h2>Kategori Merkezi</h2>',
            '<p>Yemek, acil kurye ve kargo işlemlerini tek profesyonel panelden hızlıca yönet.</p>',
          '</div>',
          '<div class="dkd_market_categories_premium_meter" aria-hidden="true"><span></span><span></span><span></span></div>',
        '</div>',
        '<div class="dkd_market_categories_premium_stats">',
          '<span><strong>3</strong><small>Hızlı İşlem</small></span>',
          '<span><strong>7/24</strong><small>Canlı Market</small></span>',
          '<span><strong>Premium</strong><small>Kategori Akışı</small></span>',
        '</div>',
      '</section>'
    ].join('');
    if(dkd_target_node_value) dkd_target_node_value.insertAdjacentHTML('beforebegin', dkd_html_value);
    else dkd_view_node_value.insertAdjacentHTML('afterbegin', dkd_html_value);
  }
  function dkd_mark_category_buttons_value(){
    const dkd_view_node_value = dkd_categories_view_value();
    if(!dkd_view_node_value) return;
    const dkd_button_values = Array.from(dkd_view_node_value.querySelectorAll('button,[role="button"],.dkd_market_bridge_service_card,.dkd_market_categories_switch > *'));
    dkd_button_values.forEach((dkd_button_value)=>{
      const dkd_button_text_value = dkd_text_value(dkd_button_value);
      if(dkd_button_text_value.includes('acil kurye')){
        dkd_button_value.setAttribute('data-dkd-categories-action-card','dkd_urgent');
        return;
      }
      if(dkd_button_text_value.includes('kargo paneli') || dkd_button_text_value.includes('kargo oluştur') || dkd_button_text_value.includes('kargo olustur') || dkd_button_text_value.includes('kurye kargo') || dkd_button_text_value.includes('kurye-kargo')){
        dkd_button_value.setAttribute('data-dkd-categories-action-card','dkd_cargo');
        return;
      }
      if(dkd_button_text_value.includes('yemek menüsü') || dkd_button_text_value.includes('yemek menusu') || dkd_button_text_value.includes('yemek çeşitleri') || dkd_button_text_value.includes('yemek cesitleri')){
        dkd_button_value.setAttribute('data-dkd-categories-action-card','dkd_food');
      }
    });
  }
  function dkd_refresh_value(){
    dkd_insert_premium_top_value();
    dkd_mark_category_buttons_value();
  }
  const dkd_observer_value = new MutationObserver(()=>window.requestAnimationFrame(dkd_refresh_value));
  function dkd_boot_value(){
    dkd_refresh_value();
    if(document.body) dkd_observer_value.observe(document.body,{childList:true,subtree:true,characterData:true});
    window.setTimeout(dkd_refresh_value,450);
    window.setTimeout(dkd_refresh_value,1400);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', dkd_boot_value, {once:true});
  else dkd_boot_value();
})();