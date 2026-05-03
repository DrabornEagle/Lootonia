import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { fetchChestHistory } from '../services/historyService';
import { rarityTone } from '../utils/rarity';
import { trDropType, trRarity } from '../utils/text';

const HISTORY_LIMIT = 36;
const HISTORY_CACHE_TTL_MS = 30 * 1000;

export function useHistoryData({ sessionUserId } = {}) {
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLogs, setHistoryLogs] = useState([]);
  const historyCacheRef = useRef({ userId: '', data: [], loadedAt: 0 });
  const historyInflightRef = useRef(null);

  const mapHistoryRows = useCallback((rows) => {
    return (rows || []).map((entry) => {
      const card = entry.card || null;
      const drop = entry.drop || null;
      const tone = card?.rarity ? rarityTone(card.rarity) : (entry.gained_token ? 'good' : 'default');
      const badge = card?.rarity ? trRarity(card.rarity) : (entry.gained_token ? `+${entry.gained_token} token` : trDropType(entry.drop_type));
      const title = card?.name ? card.name : (drop?.name || trDropType(entry.drop_type));
      return {
        id: entry.id,
        created_at: entry.created_at,
        gained_token: entry.gained_token,
        title,
        badge,
        tone,
        card: card ? {
          name: card.name,
          series: card.series,
          rarity: card.rarity,
          theme: card.theme,
          art_image_url: card.art_image_url || entry?.card_art_image_url || '',
          serial_code: card.serial_code || entry?.card_serial_code || '',
        } : null,
        drop_type: entry.drop_type,
      };
    });
  }, []);

  const applyHistoryState = useCallback((rows) => {
    setHistoryLogs(rows || []);
  }, []);

  const loadHistory = useCallback(async (options = {}) => {
    const opts = typeof options === 'boolean' ? { force: options } : (options || {});
    const force = !!opts.force;
    const background = !!opts.background;
    const cached = historyCacheRef.current;
    const now = Date.now();

    if (
      !force &&
      cached.userId === String(sessionUserId || '') &&
      Array.isArray(cached.data) &&
      cached.data.length &&
      (now - cached.loadedAt) < HISTORY_CACHE_TTL_MS
    ) {
      applyHistoryState(cached.data);
      return cached.data;
    }

    if (historyInflightRef.current) {
      return historyInflightRef.current;
    }

    const request = (async () => {
      if (!background) setHistoryLoading(true);

      try {
        const { data, error } = await fetchChestHistory(HISTORY_LIMIT);
        if (error) throw error;
        const logs = mapHistoryRows(data || []);
        historyCacheRef.current = {
          userId: String(sessionUserId || ''),
          data: logs,
          loadedAt: Date.now(),
        };
        applyHistoryState(logs);
        return logs;
      } catch (dkd_error_value) {
        if (!background) {
          Alert.alert('Geçmiş Hatası', dkd_error_value?.message || String(dkd_error_value));
        } else {
          console.log('[Lootonia][history][preload]', dkd_error_value?.message || String(dkd_error_value));
        }
        return [];
      } finally {
        if (!background) setHistoryLoading(false);
      }
    })();

    historyInflightRef.current = request;
    try {
      return await request;
    } finally {
      if (historyInflightRef.current === request) {
        historyInflightRef.current = null;
      }
    }
  }, [applyHistoryState, mapHistoryRows, sessionUserId]);

  const preloadHistory = useCallback(async () => {
    return loadHistory({ background: true });
  }, [loadHistory]);

  return {
    historyLoading,
    historyLogs,
    loadHistory,
    preloadHistory,
  };
}

export default useHistoryData;
