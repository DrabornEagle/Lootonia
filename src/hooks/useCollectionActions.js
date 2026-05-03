import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import {
  craftBossTicketFromShards,
  craftCardWithShards,
  exchangeShardsForReward,
  fetchUserCollection,
  recycleDuplicateCards,
  upgradeCardWithShards,
} from '../services/collectionService';
import { formatInt, trRarity } from '../utils/text';

export function useCollectionActions({
  sessionUserId,
  refreshProfile,
  loadHistory,
  onAchievementAction,
}) {
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [collectionCards, setCollectionCards] = useState([]);
  const [userCardsRaw, setUserCardsRaw] = useState([]);
  const [recycleLoading, setRecycleLoading] = useState(false);
  const [shardExchangeLoading, setShardExchangeLoading] = useState('');
  const [shardCraftLoading, setShardCraftLoading] = useState('');
  const [shardUpgradeLoading, setShardUpgradeLoading] = useState('');
  const [bossTicketLoading, setBossTicketLoading] = useState(false);
  const collectionCacheRef = useRef({ userId: '', data: [], loadedAt: 0 });
  const collectionInflightRef = useRef(null);

  const COLLECTION_LIMIT = 120;
  const COLLECTION_CACHE_TTL_MS = 90 * 1000;

  const applyCollectionState = useCallback((rows) => {
    const nextRows = rows || [];
    setCollectionCards(nextRows);
    setUserCardsRaw(nextRows);
  }, []);

  const loadCollection = useCallback(async (options = {}) => {
    if (!sessionUserId) return [];
    const opts = typeof options === 'boolean' ? { force: options } : (options || {});
    const force = !!opts.force;
    const background = !!opts.background;
    const now = Date.now();
    const cached = collectionCacheRef.current;

    if (
      !force &&
      cached.userId === sessionUserId &&
      Array.isArray(cached.data) &&
      cached.data.length &&
      (now - cached.loadedAt) < COLLECTION_CACHE_TTL_MS
    ) {
      applyCollectionState(cached.data);
      return cached.data;
    }

    if (collectionInflightRef.current) {
      return collectionInflightRef.current;
    }

    const request = (async () => {
      if (!background) setCollectionLoading(true);

      try {
        const { data, error } = await fetchUserCollection(COLLECTION_LIMIT);
        if (error) throw error;
        const rows = data || [];
        collectionCacheRef.current = {
          userId: sessionUserId,
          data: rows,
          loadedAt: Date.now(),
        };
        applyCollectionState(rows);
        return rows;
      } catch (dkd_error_value) {
        if (!background) {
          Alert.alert('Koleksiyon Hatası', dkd_error_value?.message || String(dkd_error_value));
        } else {
          console.log('[Lootonia][collection][preload]', dkd_error_value?.message || String(dkd_error_value));
        }
        return [];
      } finally {
        if (!background) setCollectionLoading(false);
      }
    })();

    collectionInflightRef.current = request;
    try {
      return await request;
    } finally {
      if (collectionInflightRef.current === request) {
        collectionInflightRef.current = null;
      }
    }
  }, [COLLECTION_CACHE_TTL_MS, COLLECTION_LIMIT, applyCollectionState, sessionUserId]);

  const recycleDuplicatesAll = useCallback(async () => {
    if (!sessionUserId) return Alert.alert('Shard Sistemi', 'Giriş yapmalısın.');
    setRecycleLoading(true);
    try {
      const { data, error } = await recycleDuplicateCards();
      if (error) throw error;

      if (data?.ok) {
        Alert.alert(
          'Shard Sistemi',
          `+${formatInt(data?.gained_shards || 0)} shard kazandın.\n${formatInt(data?.recycled_cards || 0)} fazlalık kart parçalandı.`
        );
      } else {
        Alert.alert('Shard Sistemi', data?.reason === 'duplicate_not_found' ? 'Parçalanabilir kopya kart yok.' : (data?.reason || 'Başarısız'));
      }

      const recycleCount = Math.max(1, Number(data?.recycled_cards || 1));
      await onAchievementAction?.('recycleDuplicate', recycleCount);
      await Promise.all([refreshProfile(), loadCollection({ force: true }), loadHistory()]);
    } catch (dkd_error_value) {
      const msg = String(dkd_error_value?.message || dkd_error_value);
      if (msg.toLowerCase().includes('dkd_recycle_duplicates_all')) {
        Alert.alert('Shard Sistemi', 'DB Patch V18 gerekli: shard recycle RPC bulunamadı.');
      } else {
        Alert.alert('Shard Sistemi', msg);
      }
    } finally {
      setRecycleLoading(false);
    }
  }, [loadCollection, loadHistory, onAchievementAction, refreshProfile, sessionUserId]);

  const exchangeShards = useCallback(async (kind = 'token_100') => {
    if (!sessionUserId) return Alert.alert('Shard Dükkanı', 'Giriş yapmalısın.');
    setShardExchangeLoading(kind);
    try {
      const { data, error } = await exchangeShardsForReward(kind);
      if (error) throw error;

      if (data?.ok) {
        const parts = [];
        if (Number(data?.reward_token || 0) > 0) parts.push(`+${formatInt(data.reward_token)} token`);
        if (Number(data?.reward_energy || 0) > 0) parts.push(`+${formatInt(data.reward_energy)} enerji depolandı`);
        Alert.alert('Shard Dükkanı', `${formatInt(data?.spent_shards || 0)} shard harcandı.\n${parts.join(' • ') || 'Takasa çevrildi.'}`);
      } else {
        const reason = String(data?.reason || '');
        const pretty =
          reason === 'not_enough_shards' ? 'Yeterli shard yok.' :
          reason === 'invalid_kind' ? 'Geçersiz shard paketi.' :
          (data?.reason || 'Başarısız');
        Alert.alert('Shard Dükkanı', pretty);
      }

      await Promise.all([refreshProfile(), loadHistory()]);
    } catch (dkd_error_value) {
      const msg = String(dkd_error_value?.message || dkd_error_value);
      if (msg.toLowerCase().includes('dkd_shard_exchange')) {
        Alert.alert('Shard Dükkanı', 'DB Patch V18 gerekli: shard exchange RPC bulunamadı.');
      } else {
        Alert.alert('Shard Dükkanı', msg);
      }
    } finally {
      setShardExchangeLoading('');
    }
  }, [loadHistory, refreshProfile, sessionUserId]);

  const craftShardCard = useCallback(async (rarity = 'rare') => {
    if (!sessionUserId) return Alert.alert('Shard Forge', 'Giriş yapmalısın.');
    setShardCraftLoading(rarity);
    try {
      const { data, error } = await craftCardWithShards(rarity);
      if (error) throw error;

      if (data?.ok) {
        Alert.alert(
          'Shard Forge',
          `-${formatInt(data?.spent_shards || 0)} shard\nYeni kart: ${data?.card_name || 'Bilinmeyen Kart'}\nRarity: ${trRarity(data?.rarity || rarity)}`
        );
      } else {
        const reason = String(data?.reason || '');
        const pretty =
          reason === 'not_enough_shards' ? 'Yeterli shard yok.' :
          reason === 'invalid_rarity' ? 'Bu rarity üretilemez.' :
          reason === 'card_pool_empty' ? 'Bu rarity için aktif kart havuzu boş.' :
          (data?.reason || 'Üretim başarısız');
        Alert.alert('Shard Forge', pretty);
      }

      await onAchievementAction?.('shardCraft', 1);
      await Promise.all([refreshProfile(), loadCollection({ force: true })]);
    } catch (dkd_error_value) {
      const msg = String(dkd_error_value?.message || dkd_error_value);
      if (msg.toLowerCase().includes('dkd_shard_craft')) {
        Alert.alert('Shard Forge', 'DB Patch V19 gerekli: shard craft RPC bulunamadı.');
      } else {
        Alert.alert('Shard Forge', msg);
      }
    } finally {
      setShardCraftLoading('');
    }
  }, [loadCollection, onAchievementAction, refreshProfile, sessionUserId]);

  const upgradeShardCard = useCallback(async (fromRarity = 'common') => {
    if (!sessionUserId) return Alert.alert('Upgrade Forge', 'Giriş yapmalısın.');
    setShardUpgradeLoading(fromRarity);
    try {
      const { data, error } = await upgradeCardWithShards(fromRarity);
      if (error) throw error;

      if (data?.ok) {
        Alert.alert(
          'Upgrade Forge',
          `Yakılan: ${data?.burned_card_name || trRarity(fromRarity)}\nYeni kart: ${data?.card_name || 'Bilinmeyen Kart'}\nYeni rarity: ${trRarity(data?.to_rarity || 'rare')}`
        );
      } else {
        const reason = String(data?.reason || '');
        const pretty =
          reason === 'not_enough_shards' ? 'Yeterli shard yok.' :
          reason === 'no_source_card' ? 'Yükseltmek için bu rarity’de kartın yok.' :
          reason === 'invalid_from_rarity' ? 'Bu rarity yükseltilemez.' :
          reason === 'target_pool_empty' ? 'Bir üst rarity için aktif kart havuzu boş.' :
          (data?.reason || 'Upgrade başarısız');
        Alert.alert('Upgrade Forge', pretty);
      }

      await onAchievementAction?.('shardUpgrade', 1);
      await Promise.all([refreshProfile(), loadCollection({ force: true })]);
    } catch (dkd_error_value) {
      const msg = String(dkd_error_value?.message || dkd_error_value);
      if (msg.toLowerCase().includes('dkd_shard_upgrade_random')) {
        Alert.alert('Upgrade Forge', 'DB Patch V19 gerekli: shard upgrade RPC bulunamadı.');
      } else {
        Alert.alert('Upgrade Forge', msg);
      }
    } finally {
      setShardUpgradeLoading('');
    }
  }, [loadCollection, onAchievementAction, refreshProfile, sessionUserId]);

  const craftBossTicket = useCallback(async () => {
    if (!sessionUserId) return Alert.alert('Boss Ticket', 'Giriş yapmalısın.');
    setBossTicketLoading(true);
    try {
      const { data, error } = await craftBossTicketFromShards();
      if (error) throw error;

      if (data?.ok) {
        Alert.alert(
          'Boss Ticket',
          `-${formatInt(data?.spent_shards || 0)} shard\n+${formatInt(data?.gained_tickets || 1)} boss ticket\nToplam ticket: ${formatInt(data?.boss_tickets || 0)}`
        );
      } else {
        const reason = String(data?.reason || '');
        const pretty = reason === 'not_enough_shards' ? 'Boss ticket üretmek için yeterli shard yok.' : (data?.reason || 'Üretim başarısız');
        Alert.alert('Boss Ticket', pretty);
      }

      const craftedTickets = Math.max(1, Number(data?.gained_tickets || 1));
      await onAchievementAction?.('bossTicketCraft', craftedTickets);
      await refreshProfile();
    } catch (dkd_error_value) {
      const msg = String(dkd_error_value?.message || dkd_error_value);
      if (msg.toLowerCase().includes('dkd_craft_boss_ticket')) {
        Alert.alert('Boss Ticket', 'DB Patch V20 gerekli: boss ticket craft RPC bulunamadı.');
      } else {
        Alert.alert('Boss Ticket', msg);
      }
    } finally {
      setBossTicketLoading(false);
    }
  }, [onAchievementAction, refreshProfile, sessionUserId]);

  return {
    collectionLoading,
    collectionCards,
    userCardsRaw,
    recycleLoading,
    shardExchangeLoading,
    shardCraftLoading,
    shardUpgradeLoading,
    bossTicketLoading,
    loadCollection,
    recycleDuplicatesAll,
    exchangeShards,
    craftShardCard,
    upgradeShardCard,
    craftBossTicket,
  };
}

export default useCollectionActions;
