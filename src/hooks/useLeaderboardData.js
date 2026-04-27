import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import {
  adminClosePreviousWeek,
  checkCourierWeeklyRewardPopup as checkCourierWeeklyRewardPopupRpc,
  claimWeeklyTopReward as claimWeeklyTopRewardRpc,
  fetchWeeklyLeaderboard,
} from '../services/leaderboardService';

const LEADERBOARD_CACHE_TTL_MS = 30 * 1000;

export function useLeaderboardData({ sessionUserId, isAdmin, refreshProfile }) {
  const [leaderMetric, setLeaderMetric] = useState('courier');
  const [leaderWeek, setLeaderWeek] = useState(null);
  const [leaderRows, setLeaderRows] = useState([]);
  const [leaderLoading, setLeaderLoading] = useState(false);
  const [leaderError, setLeaderError] = useState(null);
  const [rewardClaimLoading, setRewardClaimLoading] = useState(false);
  const [leaderWeekOffset, setLeaderWeekOffset] = useState(0);
  const [leaderClosed, setLeaderClosed] = useState(false);
  const [closeWeekLoading, setCloseWeekLoading] = useState(false);
  const leaderboardCacheRef = useRef({});
  const leaderboardInflightRef = useRef({});
  const dkd_courier_popup_guard_ref = useRef({});
  const dkd_courier_popup_loading_ref = useRef(false);

  const cacheKeyFor = useCallback((metric, weekOffset) => `${String(sessionUserId || 'anon')}::${String(metric || 'courier')}::${Number(weekOffset || 0)}`, [sessionUserId]);

  const readLeaderboardCache = useCallback((metric, weekOffset) => {
    const key = cacheKeyFor(metric, weekOffset);
    const entry = leaderboardCacheRef.current[key];
    if (!entry) return null;
    if ((Date.now() - Number(entry.loadedAt || 0)) >= LEADERBOARD_CACHE_TTL_MS) return null;
    return entry.data || null;
  }, [cacheKeyFor]);

  const writeLeaderboardCache = useCallback((metric, weekOffset, data) => {
    const key = cacheKeyFor(metric, weekOffset);
    leaderboardCacheRef.current[key] = { data, loadedAt: Date.now() };
  }, [cacheKeyFor]);

  const clearLeaderboardCache = useCallback(() => {
    leaderboardCacheRef.current = {};
    leaderboardInflightRef.current = {};
  }, []);

  const applyLeaderboardState = useCallback((metric, weekOffset, data) => {
    setLeaderMetric(metric);
    setLeaderError(null);
    setLeaderWeek(data?.week_start || null);
    setLeaderClosed(!!data?.closed);
    setLeaderWeekOffset(weekOffset);
    setLeaderRows(data?.rows || []);
  }, []);

  const fetchLeaderboardPayload = useCallback(async (metric, weekOffset) => {
    const { data, error } = await fetchWeeklyLeaderboard(metric, weekOffset, 25);
    if (error) throw error;
    writeLeaderboardCache(metric, weekOffset, data);
    return data;
  }, [writeLeaderboardCache]);

  const loadLeaderboard = useCallback(async (metric = 'courier', weekOffset = leaderWeekOffset, options = {}) => {
    const force = !!options?.force;
    const background = !!options?.background;

    const cached = !force ? readLeaderboardCache(metric, weekOffset) : null;
    if (cached) {
      applyLeaderboardState(metric, weekOffset, cached);
      return cached;
    }

    const requestKey = cacheKeyFor(metric, weekOffset);
    if (leaderboardInflightRef.current[requestKey]) {
      return leaderboardInflightRef.current[requestKey];
    }

    const request = (async () => {
      if (!background) setLeaderLoading(true);
      setLeaderMetric(metric);
      setLeaderError(null);
      try {
        const data = await fetchLeaderboardPayload(metric, weekOffset);
        applyLeaderboardState(metric, weekOffset, data);
        return data;
      } catch (dkd_error_value) {
        const raw = dkd_error_value?.message || String(dkd_error_value);
        const msg = String(raw);
        const low = msg.toLowerCase();
        if (low.includes('dkd_get_weekly_leaderboard2')) {
          setLeaderError('DB Patch gerekli: Liderlik RPC bulunamadı.');
        } else if (low.includes('week_start') && low.includes('ambiguous')) {
          setLeaderError('DB Patch gerekli: leaderboard week_start alias hotfix uygulanmamış.');
        } else {
          setLeaderError(msg);
        }
        setLeaderClosed(false);
        setLeaderRows([]);
        setLeaderWeek(null);
        return null;
      } finally {
        if (!background) setLeaderLoading(false);
      }
    })();

    leaderboardInflightRef.current[requestKey] = request;
    try {
      return await request;
    } finally {
      if (leaderboardInflightRef.current[requestKey] === request) {
        delete leaderboardInflightRef.current[requestKey];
      }
    }
  }, [leaderWeekOffset, readLeaderboardCache, applyLeaderboardState, cacheKeyFor, fetchLeaderboardPayload]);

  const preloadLeaderboard = useCallback(async (metric = 'courier', weekOffset = 0) => {
    const cached = readLeaderboardCache(metric, weekOffset);
    if (cached) return cached;
    try {
      return await fetchLeaderboardPayload(metric, weekOffset);
    } catch (dkd_error_value) {
      console.log('[Lootonia][leaderboard][preload]', dkd_error_value?.message || String(dkd_error_value));
      return null;
    }
  }, [readLeaderboardCache, fetchLeaderboardPayload]);

  const changeLeaderboardWeekOffset = useCallback((nextOffset) => {
    setLeaderWeekOffset(nextOffset);
    loadLeaderboard(leaderMetric, nextOffset);
  }, [leaderMetric, loadLeaderboard]);

  const changeLeaderboardMetric = useCallback((metric) => {
    setLeaderMetric(metric);
    loadLeaderboard(metric, leaderWeekOffset);
  }, [leaderWeekOffset, loadLeaderboard]);

  const refreshLeaderboard = useCallback((metric, weekOffset) => {
    loadLeaderboard(metric, weekOffset ?? leaderWeekOffset);
  }, [leaderWeekOffset, loadLeaderboard]);

  const closePrevWeek = useCallback(async () => {
    if (!sessionUserId) return Alert.alert('Sezon', 'Giriş yapmalısın.');
    if (!isAdmin) return Alert.alert('Sezon', 'Bu işlem sadece admin içindir.');
    setCloseWeekLoading(true);
    try {
      const { data, error } = await adminClosePreviousWeek();
      if (error) throw error;
      if (data?.ok) {
        clearLeaderboardCache();
        Alert.alert('Sezon', data?.already_closed ? 'Hafta zaten kapalıydı. Cache yenilendi.' : 'Geçen hafta kapatıldı ve cache oluşturuldu.');
        setLeaderWeekOffset(-1);
        await loadLeaderboard(leaderMetric, -1, { force: true });
      } else {
        Alert.alert('Sezon', data?.reason || 'Kapatma başarısız');
      }
    } catch (dkd_error_value) {
      const msg = dkd_error_value?.message || String(dkd_error_value);
      if (String(msg).toLowerCase().includes('dkd_admin_close_week')) {
        Alert.alert('Sezon', 'DB Patch gerekli: admin sezon kapatma RPC bulunamadı.');
      } else if (String(msg).toLowerCase().includes('not_admin')) {
        Alert.alert('Sezon', 'Admin yetkin yok.');
      } else {
        Alert.alert('Sezon', msg);
      }
    } finally {
      setCloseWeekLoading(false);
    }
  }, [sessionUserId, isAdmin, leaderMetric, loadLeaderboard, clearLeaderboardCache]);

  const claimWeeklyTopReward = useCallback(async (metric = 'token') => {
    if (!sessionUserId) return Alert.alert('Ödül', 'Giriş yapmalısın.');
    if (leaderWeekOffset !== -1) return Alert.alert('Ödül', 'Sezon ödülü sadece geçen hafta kapanan tablo için alınabilir.');
    setRewardClaimLoading(true);
    try {
      const { data, error } = await claimWeeklyTopRewardRpc(metric);
      if (error) throw error;

      if (data?.ok) {
        clearLeaderboardCache();
        const dkd_reward_token_value = Number(data?.reward_token || 0);
        const dkd_reward_energy_value = Number(data?.reward_energy || 0);
        Alert.alert('Ödül', `Tebrikler! Rank #${data?.rank}\n+${dkd_reward_token_value} token${dkd_reward_energy_value ? ` • +${dkd_reward_energy_value} enerji` : ''}`);
        await Promise.all([refreshProfile?.(), loadLeaderboard(leaderMetric, leaderWeekOffset, { force: true })]);
      } else {
        const reason = String(data?.reason || 'unknown');
        const rank = data?.rank != null ? ` (#${data.rank})` : '';
        const msg =
          reason === 'not_in_top10' ? `Top10 içinde değilsin${rank}.` :
          reason === 'already_claimed' ? 'Bu hafta ödülünü zaten aldın.' :
          reason === 'no_activity' ? 'Geçen hafta aktiviten yok.' :
          `Ödül alınamadı: ${reason}${rank}`;
        Alert.alert('Ödül', msg);
      }
    } catch (dkd_error_value) {
      const msg = dkd_error_value?.message || String(dkd_error_value);
      if (String(msg).toLowerCase().includes('dkd_claim_weekly_top_reward')) {
        Alert.alert('Ödül', 'DB Patch gerekli: sezon ödül RPC bulunamadı.');
      } else {
        Alert.alert('Ödül', msg);
      }
    } finally {
      setRewardClaimLoading(false);
    }
  }, [sessionUserId, refreshProfile, loadLeaderboard, leaderMetric, leaderWeekOffset, clearLeaderboardCache]);

  const checkCourierWeeklyRewardPopup = useCallback(async () => {
    const dkd_user_guard_key_value = String(sessionUserId || '');
    if (!dkd_user_guard_key_value) return null;
    if (dkd_courier_popup_loading_ref.current) return null;
    if (dkd_courier_popup_guard_ref.current[dkd_user_guard_key_value]) return null;

    dkd_courier_popup_loading_ref.current = true;
    try {
      const { data, error } = await checkCourierWeeklyRewardPopupRpc();
      if (error) throw error;
      dkd_courier_popup_guard_ref.current[dkd_user_guard_key_value] = true;
      if (!data?.ok || !data?.has_popup) return data || null;

      const dkd_rank_value = Number(data?.rank || 0);
      const dkd_reward_token_value = Number(data?.reward_token || 0);
      const dkd_reward_shards_value = Number(data?.reward_shards || 0);
      const dkd_reward_boss_tickets_value = Number(data?.reward_boss_tickets || 0);
      const dkd_reward_card_name_value = String(data?.reward_card_name || 'Rastgele Kart');
      const dkd_reward_card_series_value = String(data?.reward_card_series || '').trim();
      const dkd_reward_card_label_value = dkd_reward_card_series_value ? `${dkd_reward_card_name_value} • ${dkd_reward_card_series_value}` : dkd_reward_card_name_value;

      await refreshProfile?.();

      Alert.alert(
        'Kurye Haftalık Ödülü',
        `Geçen hafta kurye modunda #${dkd_rank_value} oldun.\n\nKazandıkların:\n• ${dkd_reward_card_label_value}\n• ${dkd_reward_token_value} token\n• ${dkd_reward_shards_value} shard\n• ${dkd_reward_boss_tickets_value} boss bileti`,
      );

      return data;
    } catch (dkd_error_value) {
      console.log('[Lootonia][courier_reward_popup]', dkd_error_value?.message || String(dkd_error_value));
      return null;
    } finally {
      dkd_courier_popup_loading_ref.current = false;
    }
  }, [refreshProfile, sessionUserId]);

  return {
    leaderMetric,
    leaderWeek,
    leaderRows,
    leaderLoading,
    leaderError,
    rewardClaimLoading,
    leaderWeekOffset,
    leaderClosed,
    closeWeekLoading,
    setLeaderMetric,
    setLeaderWeekOffset,
    loadLeaderboard,
    preloadLeaderboard,
    refreshLeaderboard,
    changeLeaderboardMetric,
    changeLeaderboardWeekOffset,
    closePrevWeek,
    claimWeeklyTopReward,
    checkCourierWeeklyRewardPopup,
  };
}
