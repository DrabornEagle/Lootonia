import { supabase } from '../lib/supabase';
import { buyBusinessProductWithToken, fetchBusinessMarketCatalog } from './businessProductService';

const MARKET_VIEW_SELECT = 'id, seller_id, user_card_id, price_token, status, created_at, card_def_id, card_name, card_series, card_serial_code, card_rarity, card_theme, card_art_image_url';
const CARD_DEF_SELECT_PRIMARY = 'id,name,series,serial_code,rarity,theme,art_image_url,is_active';
const CARD_DEF_SELECT_FALLBACK = 'id,name,series,serial_code,rarity,theme,is_active';
const SHOP_UI_SELECT = 'hero_kicker, hero_title, hero_subtitle, logic_title, logic_body, hero_icon_name, hero_icon_accent, hero_background_image_url, hero_visual_preset';
const SHOP_PACK_SELECT = 'id, pack_key, title, subtitle, description, badge_label, icon_name, accent_key, art_image_url, panel_style, background_tone, visual_preset, price_token, reward_kind, reward_amount, sort_order, is_active';

function functionMissing(error) {
  const msg = String(error?.message || '').toLowerCase();
  return msg.includes('could not find the function') || msg.includes('schema cache');
}

async function fetchCardDefsByIds(ids = []) {
  const safeIds = Array.from(new Set((Array.isArray(ids) ? ids : []).map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)));
  if (!safeIds.length) return { data: [], error: null };

  let res = await supabase
    .from('dkd_card_defs')
    .select(CARD_DEF_SELECT_PRIMARY)
    .in('id', safeIds);

  if (res?.error && String(res.error?.message || '').toLowerCase().includes('column')) {
    res = await supabase
      .from('dkd_card_defs')
      .select(CARD_DEF_SELECT_FALLBACK)
      .in('id', safeIds);
  }

  return res;
}

function hydrateRowsWithLiveCardDefs(rows = [], defs = []) {
  const defsMap = new Map((Array.isArray(defs) ? defs : []).map((item) => [Number(item?.id), item]));
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const liveCard = defsMap.get(Number(row?.card_def_id));
    if (!liveCard) return row;
    return {
      ...row,
      card_name: liveCard?.name || row?.card_name,
      card_series: liveCard?.series || row?.card_series,
      card_serial_code: liveCard?.serial_code || row?.card_serial_code,
      card_rarity: liveCard?.rarity || row?.card_rarity,
      card_theme: liveCard?.theme || row?.card_theme,
      card_art_image_url: liveCard?.art_image_url || row?.card_art_image_url || '',
    };
  });
}

function mapBusinessProductToShopPack(row) {
  return {
    id: `merchant-${row?.id}`,
    pack_key: `merchant_product:${row?.id}`,
    title: row?.title || 'İşletme Ürünü',
    subtitle: `${row?.business_name || 'İşletme'} • ${row?.category || row?.business_category || 'genel'}`,
    description: row?.description || 'İşletme marketinden token ile satın alınabilir ürün.',
    badge_label: row?.category || row?.business_category || 'işletme',
    icon_name: 'storefront-outline',
    accent_key: 'gold',
    art_image_url: row?.image_url || '',
    panel_style: 'featured',
    background_tone: 'auto',
    visual_preset: 'gold',
    price_token: Number(row?.price_token || 0),
    reward_kind: 'merchant_product',
    reward_amount: 1,
    sort_order: 1000 + Number(row?.sort_order || 0),
    is_active: row?.is_active !== false,
  };
}

export async function fetchMarketSnapshot(userId, options = {}) {
  const listingsLimit = Number.isFinite(Number(options?.listingsLimit)) ? Number(options.listingsLimit) : 48;
  const myListingsLimit = Number.isFinite(Number(options?.myListingsLimit)) ? Number(options.myListingsLimit) : 24;

  const [allRes, mineRes] = await Promise.all([
    supabase
      .from('dkd_market_listings_view')
      .select(MARKET_VIEW_SELECT)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(listingsLimit),
    supabase
      .from('dkd_market_listings_view')
      .select(MARKET_VIEW_SELECT)
      .eq('status', 'active')
      .eq('seller_id', userId)
      .order('created_at', { ascending: false })
      .limit(myListingsLimit),
  ]);

  if (allRes?.error || mineRes?.error) {
    return {
      listingsRes: allRes,
      mineRes,
    };
  }

  const joinedIds = [
    ...((allRes?.data || []).map((item) => item?.card_def_id)),
    ...((mineRes?.data || []).map((item) => item?.card_def_id)),
  ];
  const defsRes = await fetchCardDefsByIds(joinedIds);
  const liveDefs = Array.isArray(defsRes?.data) ? defsRes.data : [];

  return {
    listingsRes: {
      ...allRes,
      data: hydrateRowsWithLiveCardDefs(allRes?.data || [], liveDefs),
    },
    mineRes: {
      ...mineRes,
      data: hydrateRowsWithLiveCardDefs(mineRes?.data || [], liveDefs),
    },
  };
}

export async function listCardForSale(userCardId, priceToken) {
  const dkd_user_card_id_value = Number(userCardId);
  const dkd_price_token_value = Number(priceToken);
  if (!Number.isFinite(dkd_user_card_id_value) || dkd_user_card_id_value <= 0) {
    throw new Error('invalid_user_card_id');
  }
  return supabase.rpc('dkd_market_list_card', {
    dkd_param_user_card_id: dkd_user_card_id_value,
    dkd_param_price_token: Number.isFinite(dkd_price_token_value) ? dkd_price_token_value : 0,
  });
}

export async function cancelMarketListing(listingId) {
  return supabase.rpc('dkd_market_cancel', { dkd_param_listing_id: Number(listingId) });
}

export async function buyMarketListing(listingId) {
  return supabase.rpc('dkd_market_buy', { dkd_param_listing_id: Number(listingId) });
}

export async function buyMarketTokenPack(input) {
  const packKey = typeof input === 'string' ? String(input || '').trim() : String(input?.packKey || '').trim();
  const packId = typeof input === 'object' && input ? String(input?.packId || '').trim() : '';
  const token = packKey || packId;

  if (token.startsWith('merchant_product:')) {
    return buyBusinessProductWithToken(token);
  }

  return supabase.rpc('dkd_market_token_shop_buy', { dkd_param_kind: token });
}

export async function fetchMarketShopSnapshot() {
  let baseUi = null;
  let basePacks = [];

  const rpcRes = await supabase.rpc('dkd_market_shop_snapshot');
  if (!rpcRes?.error) {
    baseUi = rpcRes?.data?.ui || null;
    basePacks = Array.isArray(rpcRes?.data?.packs) ? rpcRes.data.packs : [];
  } else if (!functionMissing(rpcRes.error)) {
    return {
      data: { ui: null, packs: [] },
      error: rpcRes.error,
    };
  } else {
    const [uiRes, packsRes] = await Promise.all([
      supabase.from('dkd_market_ui_config').select(SHOP_UI_SELECT).eq('id', 1).maybeSingle(),
      supabase.from('dkd_market_shop_defs').select(SHOP_PACK_SELECT).eq('is_active', true).order('sort_order', { ascending: true }).order('id', { ascending: true }),
    ]);
    if (uiRes?.error || packsRes?.error) {
      return {
        data: { ui: null, packs: [] },
        error: uiRes?.error || packsRes?.error || null,
      };
    }
    baseUi = uiRes?.data || null;
    basePacks = Array.isArray(packsRes?.data) ? packsRes.data : [];
  }

  let merchantPacks = [];
  try {
    const catalogRes = await fetchBusinessMarketCatalog();
    if (!catalogRes?.error) {
      merchantPacks = (Array.isArray(catalogRes?.data) ? catalogRes.data : []).map(mapBusinessProductToShopPack);
    }
  } catch (dkd_error_value) {
    console.log('[Lootonia][merchant-market]', dkd_error_value?.message || String(dkd_error_value));
  }

  return {
    data: {
      ui: baseUi,
      packs: [...basePacks, ...merchantPacks],
    },
    error: null,
  };
}
