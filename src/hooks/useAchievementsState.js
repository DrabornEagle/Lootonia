import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import {
  ACHIEVEMENT_DEFS,
  claimAchievementReward,
  clearAchievementToast,
  loadAchievementsState,
  normalizeAchievementsState,
  recordAchievementAction,
  setAchievementShelfOrder,
  setFavoriteAchievementBadge,
} from '../services/achievementService';

const EMPTY_STATE = normalizeAchievementsState({});

export function useAchievementsState({ sessionUserId, profile, setProfile }) {
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [state, setState] = useState(EMPTY_STATE);
  const [claimLoading, setClaimLoading] = useState('');
  const toastTimerRef = useRef(null);

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  const scheduleToastClear = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(async () => {
      if (!sessionUserId) return;
      const next = await clearAchievementToast(sessionUserId);
      setState(next);
    }, 3600);
  }, [sessionUserId]);

  const refreshAchievements = useCallback(async () => {
    if (!sessionUserId) {
      setState(EMPTY_STATE);
      return EMPTY_STATE;
    }
    const next = await loadAchievementsState(sessionUserId);
    setState(next);
    if (next?.toast?.id) scheduleToastClear();
    return next;
  }, [scheduleToastClear, sessionUserId]);

  useEffect(() => {
    refreshAchievements();
  }, [refreshAchievements]);

  const trackAchievementAction = useCallback(async (actionKey, amount = 1) => {
    if (!sessionUserId) return EMPTY_STATE;
    const { state: next, unlocked } = await recordAchievementAction(sessionUserId, actionKey, amount);
    setState(next);
    if (unlocked?.length) scheduleToastClear();
    return next;
  }, [scheduleToastClear, sessionUserId]);

  const claimAchievement = useCallback(async (achievementId) => {
    if (!sessionUserId || !achievementId) return;
    setClaimLoading(achievementId);
    try {
      const result = await claimAchievementReward(sessionUserId, profile, achievementId);
      if (!result?.ok) {
        const pretty =
          result?.reason === 'already_claimed' ? 'Bu rozetin ödülü zaten alındı.' :
          result?.reason === 'not_ready' ? 'Bu rozet henüz tamamlanmadı.' :
          'Başarım ödülü alınamadı.';
        Alert.alert('Başarımlar', pretty);
        setState(result?.state || EMPTY_STATE);
        return;
      }

      setState(result.state || EMPTY_STATE);
      const reward = result?.reward || {};
      setProfile?.((prev) => (prev ? {
        ...prev,
        token: reward?.token != null ? Number(reward.token) : prev.token,
        xp: reward?.xp != null ? Number(reward.xp) : prev.xp,
        level: reward?.level != null ? Math.max(1, Number(reward.level || 1)) : prev.level,
        rank_key: reward?.rank_key || prev.rank_key,
      } : prev));

      scheduleToastClear();
      Alert.alert('Başarımlar', `${state.achievements.find((item) => item.id === achievementId)?.rewardLabel || 'Ödül alındı.'}`);
    } catch (dkd_error_value) {
      Alert.alert('Başarımlar', dkd_error_value?.message || String(dkd_error_value));
    } finally {
      setClaimLoading('');
    }
  }, [profile, scheduleToastClear, sessionUserId, setProfile, state.achievements]);

  const dismissToast = useCallback(async () => {
    if (!sessionUserId) return;
    const next = await clearAchievementToast(sessionUserId);
    setState(next);
  }, [sessionUserId]);

  const selectFavoriteAchievement = useCallback(async (achievementId) => {
    if (!sessionUserId || !achievementId) return;
    const next = await setFavoriteAchievementBadge(sessionUserId, achievementId);
    setState(next);
    scheduleToastClear();
    return next;
  }, [scheduleToastClear, sessionUserId]);

  const reorderAchievementShelf = useCallback(async (achievementId, direction) => {
    if (!sessionUserId || !achievementId) return state;
    const current = Array.isArray(state?.orderedClaimedBadges) ? state.orderedClaimedBadges.slice() : [];
    const index = current.findIndex((item) => item?.id === achievementId);
    const offset = Number(direction || 0);
    if (index < 0 || !offset) return state;
    const nextIndex = index + offset;
    if (nextIndex < 0 || nextIndex >= current.length) return state;

    const nextOrder = current.map((item) => item.id);
    [nextOrder[index], nextOrder[nextIndex]] = [nextOrder[nextIndex], nextOrder[index]];

    const next = await setAchievementShelfOrder(sessionUserId, nextOrder);
    setState(next);
    scheduleToastClear();
    return next;
  }, [scheduleToastClear, sessionUserId, state]);

  const achievementSummary = useMemo(() => ({
    total: ACHIEVEMENT_DEFS.length,
    claimed: Number(state?.claimedCount || 0),
    completed: Number(state?.completedCount || 0),
    claimable: Number(state?.claimableCount || 0),
  }), [state?.claimableCount, state?.claimedCount, state?.completedCount]);

  return {
    achievementsState: state,
    achievementsOpen,
    setAchievementsOpen,
    claimAchievementLoading: claimLoading,
    refreshAchievements,
    trackAchievementAction,
    claimAchievement,
    selectFavoriteAchievement,
    reorderAchievementShelf,
    dismissAchievementToast: dismissToast,
    achievementSummary,
  };
}
