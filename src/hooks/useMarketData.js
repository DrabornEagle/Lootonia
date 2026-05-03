import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import {
  buyMarketTokenPack,
  buyMarketListing,
  cancelMarketListing,
  fetchMarketShopSnapshot,
  fetchMarketSnapshot,
  listCardForSale as listCardForSaleRpc,
} from '../services/marketService';

function prettyShopReason(reason) {
  const key = String(reason || '').trim().toLowerCase();
  if (key === 'invalid_kind' || key === 'invalid_reward_kind') return 'Token market paketi veritabanında eksik görünüyor. Market FIX SQL dosyasını çalıştırıp marketi kapat/aç yaptıktan sonra tekrar dene.';
  if (key === 'not_enough_token') return 'Yeterli token yok.';
  if (key === 'energy_full') return 'Enerji zaten dolu.';
  if (key === 'invalid_resource_target') return 'Ödül hedefi geçersiz görünüyor. Market Komuta içinden ödül türünü düzelt.';
  return reason || 'Satın alma başarısız';
}

function dkd_pretty_market_error(error) {
  const dkd_error_message = String(error?.message || error || '').trim();
  const dkd_error_key = dkd_error_message.toLowerCase();
  if (dkd_error_key.includes('dkd_market_listings_user_card_id_key') || dkd_error_key.includes('duplicate key value')) {
    return 'Bu kart zaten ilanda. Market FIX SQL dosyasından sonra aynı kartta hata vermeden ilan fiyatı güncellenir.';
  }
  if (dkd_error_key.includes('card_not_owned')) return 'Bu kart sana ait görünmüyor.';
  if (dkd_error_key.includes('invalid_price')) return 'Fiyat 1+ token olmalı.';
  if (dkd_error_key.includes('auth_required')) return 'Oturum süresi yenilenmeli. Çıkış/giriş yapıp tekrar dene.';
  return dkd_error_message || 'Market işlemi tamamlanamadı.';
}

function parseShopToken(listingId) {
  const raw = String(listingId || '');
  if (!raw.startsWith('shop:')) return null;
  const [, packId = '', encodedPackKey = ''] = raw.split(':');
  return {
    packId: String(packId || '').trim(),
    packKey: decodeURIComponent(String(encodedPackKey || '').trim()),
  };
}

export function useMarketData({ sessionUserId, refreshProfile, loadCollection, onAchievementAction }) {
  const [marketLoading, setMarketLoading] = useState(false);
  const [listings, setListings] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [marketShopDefs, setMarketShopDefs] = useState([]);
  const [marketShopUi, setMarketShopUi] = useState(null);
  const marketCacheRef = useRef({ userId: '', listings: [], myListings: [], shopDefs: [], shopUi: null, loadedAt: 0 });
  const marketInflightRef = useRef(null);

  const MARKET_LISTINGS_LIMIT = 32;
  const MARKET_MY_LISTINGS_LIMIT = 16;
  const MARKET_CACHE_TTL_MS = 60 * 1000;

  const applyMarketState = useCallback((rows, mineRows, shopDefs, shopUi) => {
    setListings(rows || []);
    setMyListings(mineRows || []);
    setMarketShopDefs(Array.isArray(shopDefs) ? shopDefs : []);
    setMarketShopUi(shopUi || null);
  }, []);

  const loadMarket = useCallback(async (options = {}) => {
    if (!sessionUserId) {
      setListings([]);
      setMyListings([]);
      return { listings: [], myListings: [] };
    }

    const opts = typeof options === 'boolean' ? { force: options } : (options || {});
    const force = !!opts.force;
    const background = !!opts.background;
    const now = Date.now();
    const cached = marketCacheRef.current;

    if (
      !force &&
      cached.userId === sessionUserId &&
      Array.isArray(cached.listings) &&
      Array.isArray(cached.myListings) &&
      (now - cached.loadedAt) < MARKET_CACHE_TTL_MS
    ) {
      applyMarketState(cached.listings, cached.myListings, cached.shopDefs, cached.shopUi);
      return { listings: cached.listings, myListings: cached.myListings, shopDefs: cached.shopDefs, shopUi: cached.shopUi };
    }

    if (marketInflightRef.current) {
      return marketInflightRef.current;
    }

    const request = (async () => {
      if (!background) setMarketLoading(true);

      try {
        const [{ listingsRes, mineRes }, shopRes] = await Promise.all([
          fetchMarketSnapshot(sessionUserId, {
            listingsLimit: MARKET_LISTINGS_LIMIT,
            myListingsLimit: MARKET_MY_LISTINGS_LIMIT,
          }),
          fetchMarketShopSnapshot(),
        ]);
        const { data: l, error: le } = listingsRes;
        const { data: mine, error: me } = mineRes;
        if (le) throw le;
        if (me) throw me;
        if (shopRes?.error) throw shopRes.error;
        const nextListings = l || [];
        const nextMine = mine || [];
        const nextShopDefs = Array.isArray(shopRes?.data?.packs) ? shopRes.data.packs : [];
        const nextShopUi = shopRes?.data?.ui || null;
        marketCacheRef.current = {
          userId: sessionUserId,
          listings: nextListings,
          myListings: nextMine,
          shopDefs: nextShopDefs,
          shopUi: nextShopUi,
          loadedAt: Date.now(),
        };
        applyMarketState(nextListings, nextMine, nextShopDefs, nextShopUi);
        return { listings: nextListings, myListings: nextMine, shopDefs: nextShopDefs, shopUi: nextShopUi };
      } catch (dkd_error_value) {
        if (!background) {
          Alert.alert('Market', dkd_error_value?.message || String(dkd_error_value));
        } else {
          console.log('[Lootonia][market][preload]', dkd_error_value?.message || String(dkd_error_value));
        }
        return { listings: [], myListings: [], shopDefs: [], shopUi: null };
      } finally {
        if (!background) setMarketLoading(false);
      }
    })();

    marketInflightRef.current = request;
    try {
      return await request;
    } finally {
      if (marketInflightRef.current === request) {
        marketInflightRef.current = null;
      }
    }
  }, [MARKET_CACHE_TTL_MS, MARKET_LISTINGS_LIMIT, MARKET_MY_LISTINGS_LIMIT, applyMarketState, sessionUserId]);

  const listCardForSale = useCallback(async (dkd_user_card_source, priceToken) => {
    try {
      const dkd_payload = Number(priceToken);
      if (!Number.isFinite(dkd_payload) || dkd_payload <= 0) return Alert.alert('Market', 'Fiyat 1+ token olmalı.');
      const dkd_user_card_id = (
        dkd_user_card_source && typeof dkd_user_card_source === 'object'
          ? dkd_user_card_source?.id ?? dkd_user_card_source?.user_card_id ?? dkd_user_card_source
          : dkd_user_card_source
      );
      const dkd_existing_listing_value = (Array.isArray(myListings) ? myListings : []).find(
        (dkd_listing_value) => String(dkd_listing_value?.user_card_id || '') === String(dkd_user_card_id || ''),
      );
      const { data, error } = await listCardForSaleRpc(dkd_user_card_id, dkd_payload);
      if (error) throw error;
      Alert.alert('Market', dkd_existing_listing_value ? `İlan güncellendi (#${data})` : `İlan verildi (#${data})`);
      await onAchievementAction?.('marketList', 1);
      await Promise.all([loadMarket({ force: true }), loadCollection?.({ force: true })]);
    } catch (dkd_error_value) {
      Alert.alert('Market', dkd_pretty_market_error(dkd_error_value));
    }
  }, [loadCollection, loadMarket, myListings, onAchievementAction]);

  const cancelListing = useCallback(async (listingId) => {
    try {
      const { error } = await cancelMarketListing(listingId);
      if (error) throw error;
      Alert.alert('Market', 'İlan kaldırıldı.');
      await loadMarket({ force: true });
    } catch (dkd_error_value) {
      Alert.alert('Market', dkd_error_value?.message || String(dkd_error_value));
    }
  }, [loadMarket]);

  const buyListing = useCallback(async (listingId) => {
    try {
      const shopToken = parseShopToken(listingId);
      if (shopToken) {
        const { data, error } = await buyMarketTokenPack(shopToken);
        if (error) throw error;
        if (data?.ok) {
          const parts = [];
          if (Number(data?.reward_shards || 0) > 0) parts.push(`+${data.reward_shards} shard`);
          if (Number(data?.reward_tickets || 0) > 0) parts.push(`+${data.reward_tickets} bilet`);
          if (Number(data?.reward_energy || 0) > 0) parts.push(`+${data.reward_energy} enerji`);
          if (Number(data?.reward_token || 0) > 0) parts.push(`+${data.reward_token} token`);
          if (Number(data?.reward_xp || 0) > 0) parts.push(`+${data.reward_xp} XP`);
          const label = String(data?.reward_label || '').trim();
          Alert.alert('Token Market', `${data?.spent_token || 0} token harcandı.
${label || parts.join(' • ') || 'Paket alındı.'}`);
          await Promise.all([refreshProfile?.(), loadMarket({ force: true }), loadCollection?.({ force: true })]);
        } else {
          Alert.alert('Token Market', prettyShopReason(data?.reason));
        }
        return;
      }

      const { data, error } = await buyMarketListing(listingId);
      if (error) throw error;
      if (data?.ok) {
        Alert.alert('Market', `Satın alındı! Ücret: ${data.price} token • Komisyon: ${data.fee}`);
        await onAchievementAction?.('marketBuy', 1);
        await Promise.all([refreshProfile?.(), loadCollection?.({ force: true }), loadMarket({ force: true })]);
      } else {
        Alert.alert('Market', data?.reason || 'Satın alma başarısız');
      }
    } catch (dkd_error_value) {
      Alert.alert('Market', dkd_error_value?.message || String(dkd_error_value));
    }
  }, [refreshProfile, loadCollection, loadMarket, onAchievementAction]);

  return {
    marketLoading,
    listings,
    myListings,
    marketShopDefs,
    marketShopUi,
    loadMarket,
    listCardForSale,
    cancelListing,
    buyListing,
  };
}
