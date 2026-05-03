import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import {
  claimTodayDailyReward,
  claimDailyRewardEventTask,
  claimDailyRewardStreakMilestone,
  cycleDailyRewardEvent,
  loadDailyRewardState,
  openDailyRewardEventChest,
  redeemDailyRewardStoreItem,
  setDailyRewardAutoRotate,
  setDailyRewardEnabled,
  setDailyRewardEventPreset,
  setDailyRewardWeeklyPlan,
  recordDailyRewardAction,
} from '../services/dailyRewardService';

function cleanOpsText(value, fallback = '') {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  return raw
    .replace(/\s*•\s*\+?\d+\s*Ops/gi, '')
    .replace(/\bOps\b/gi, '')
    .replace(/\bjeton\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+•\s+$/g, '')
    .trim() || fallback;
}

function sanitizeMilestones(items = []) {
  return items.map((item) => ({
    ...item,
    rewardLabel: cleanOpsText(item?.rewardLabel, 'Ekstra ödül'),
  }));
}

function sanitizeActivity(entry) {
  if (!entry) return null;
  return {
    ...entry,
    rewardLabel: cleanOpsText(entry?.rewardLabel, ''),
    subtitle: cleanOpsText(entry?.subtitle, ''),
  };
}

function sanitizePulse(entry) {
  if (!entry) return null;
  return {
    ...entry,
    subtitle: cleanOpsText(entry?.subtitle, ''),
  };
}

function sanitizeDailyRewardState(state, pulse) {
  if (!state) return state;
  const recentActivity = Array.isArray(state?.recentActivity)
    ? state.recentActivity.map(sanitizeActivity)
    : [];
  const latestActivity = sanitizeActivity(state?.latestActivity || recentActivity[0] || null);

  return {
    ...state,
    pulse: sanitizePulse(pulse),
    rewardPreview: {
      ...(state?.rewardPreview || {}),
      label: cleanOpsText(state?.rewardPreview?.label, 'Günlük ödül'),
    },
    activeEvent: {
      ...(state?.activeEvent || {}),
      title: 'Günlük Giriş Ödülü',
      windowLabel: '7 günlük rota',
      subtitle: 'Her gün giriş yaparak seriyi koru.',
    },
    banner: {
      ...(state?.banner || {}),
      eyebrow: 'GÜNLÜK ÖDÜL',
      title: state?.claimedToday ? 'Günlük giriş tamamlandı' : 'Günlük ödül hazır',
      subtitle: state?.claimedToday
        ? `${Math.max(0, Number(state?.streak || 0))}. gün serin korunuyor.`
        : `${Number(state?.rewardPreview?.token || 0)} token • ${Number(state?.rewardPreview?.xp || 0)} XP`,
      ctaLabel: 'Günlük Ödül',
      secondaryLabel: 'Seriyi Gör',
    },
    streakMilestones: sanitizeMilestones(Array.isArray(state?.streakMilestones) ? state.streakMilestones : []),
    recentActivity,
    latestActivity,
  };
}

function buildPulse({ title, subtitle, token = 0, xp = 0, kind = 'reward' }) {
  return {
    title,
    subtitle: cleanOpsText(subtitle, subtitle),
    token: Number(token || 0),
    xp: Number(xp || 0),
    kind,
    stamp: Date.now(),
  };
}

export function useDailyRewardState({ sessionUserId, profile, setProfile, refreshProfile, taskState, weeklyTaskState }) {
  const [dailyRewardState, setDailyRewardState] = useState(null);
  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [eventClaimLoading, setEventClaimLoading] = useState(false);
  const [rewardHubLoading, setRewardHubLoading] = useState(false);
  const [adminSaving, setAdminSaving] = useState(false);
  const [pulse, setPulse] = useState(null);

  const progressSnapshot = useMemo(() => ({
    taskState,
    weeklyTaskState,
  }), [taskState, weeklyTaskState]);

  useEffect(() => {
    if (!pulse?.stamp) return undefined;
    const timer = setTimeout(() => setPulse(null), 2600);
    return () => clearTimeout(timer);
  }, [pulse?.stamp]);

  const refreshDailyReward = useCallback(async () => {
    if (!sessionUserId) {
      setDailyRewardState(null);
      setRewardModalOpen(false);
      return null;
    }

    const state = await loadDailyRewardState(sessionUserId, progressSnapshot);
    setDailyRewardState(state);
    if (state && !state.claimedToday) setRewardModalOpen(true);
    return state;
  }, [progressSnapshot, sessionUserId]);

  useEffect(() => {
    refreshDailyReward();
  }, [refreshDailyReward]);

  const openRewardModal = useCallback(async () => {
    if (dailyRewardState) {
      setRewardModalOpen(true);
      return dailyRewardState;
    }
    const state = await refreshDailyReward();
    if (state) setRewardModalOpen(true);
    return state;
  }, [dailyRewardState, refreshDailyReward]);

  const closeRewardModal = useCallback(() => setRewardModalOpen(false), []);

  const patchProfile = useCallback((profilePatch) => {
    if (!profilePatch) return;
    setProfile((prev) => prev ? {
      ...prev,
      token: Number(profilePatch?.token ?? prev.token ?? 0),
      xp: Number(profilePatch?.xp ?? prev.xp ?? 0),
      level: Math.max(1, Number(profilePatch?.level ?? prev.level ?? 1)),
      rank_key: profilePatch?.rank_key || prev.rank_key || 'rookie',
    } : prev);
  }, [setProfile]);

  const claimTodayReward = useCallback(async () => {
    if (!sessionUserId || claimLoading) return null;

    setClaimLoading(true);
    try {
      const result = await claimTodayDailyReward(sessionUserId, profile || {}, progressSnapshot);
      setDailyRewardState(result.state || null);

      if (!result.ok && result.reason === 'already_claimed') {
        Alert.alert('Günlük Ödül', 'Bugünün ödülü zaten alındı. Yarın tekrar gel.');
        setRewardModalOpen(false);
        return result;
      }

      if (!result.ok) {
        Alert.alert('Günlük Ödül', result?.error?.message || 'Ödül alınırken bir sorun oluştu.');
        return result;
      }

      patchProfile(result.profilePatch);
      setPulse(buildPulse({
        title: 'Günlük ödül alındı',
        subtitle: `+${Number(result?.reward?.token || 0)} token • +${Number(result?.reward?.xp || 0)} XP`,
        token: result?.reward?.token,
        xp: result?.reward?.xp,
        kind: 'daily',
      }));
      setRewardModalOpen(false);
      await refreshProfile?.();
      return result;
    } finally {
      setClaimLoading(false);
    }
  }, [claimLoading, patchProfile, profile, progressSnapshot, refreshProfile, sessionUserId]);

  const claimEventTask = useCallback(async (taskKey) => {
    if (!sessionUserId || !taskKey || eventClaimLoading) return null;

    setEventClaimLoading(true);
    try {
      const result = await claimDailyRewardEventTask(sessionUserId, profile || {}, taskKey, progressSnapshot);
      setDailyRewardState(result.state || null);

      if (!result.ok && result.reason === 'already_claimed') {
        Alert.alert('Günlük Görev', 'Bu görev zaten alındı.');
        return result;
      }

      if (!result.ok && result.reason === 'task_not_ready') {
        Alert.alert('Günlük Görev', 'Bu görev henüz tamamlanmadı. İlerlemeye devam et.');
        return result;
      }

      if (!result.ok && result.reason === 'event_disabled') {
        Alert.alert('Günlük Görev', 'Bu görev şu anda kapalı görünüyor.');
        return result;
      }

      if (!result.ok) {
        Alert.alert('Günlük Görev', result?.error?.message || 'Görev ödülü alınırken bir sorun oluştu.');
        return result;
      }

      patchProfile(result.profilePatch);
      setPulse(buildPulse({
        title: result?.task?.title || 'Görev ödülü',
        subtitle: `+${Number(result?.task?.reward_token || 0)} token • +${Number(result?.task?.reward_xp || 0)} XP`,
        token: result?.task?.reward_token,
        xp: result?.task?.reward_xp,
        kind: 'event',
      }));
      await refreshProfile?.();
      return result;
    } finally {
      setEventClaimLoading(false);
    }
  }, [eventClaimLoading, patchProfile, profile, progressSnapshot, refreshProfile, sessionUserId]);

  const claimStreakMilestoneReward = useCallback(async (days) => {
    if (!sessionUserId || !days || rewardHubLoading) return null;
    setRewardHubLoading(true);
    try {
      const result = await claimDailyRewardStreakMilestone(sessionUserId, profile || {}, days, progressSnapshot);
      setDailyRewardState(result.state || null);
      if (!result.ok && result.reason === 'already_claimed') {
        Alert.alert('Seri Ödülü', 'Bu seri ödülü zaten alındı.');
        return result;
      }
      if (!result.ok && result.reason === 'milestone_locked') {
        Alert.alert('Seri Ödülü', 'Bu seri ödülü için biraz daha giriş serisi gerekiyor.');
        return result;
      }
      if (!result.ok) {
        Alert.alert('Seri Ödülü', result?.error?.message || 'Seri ödülü alınırken bir sorun oluştu.');
        return result;
      }
      patchProfile(result.profilePatch);
      setPulse(buildPulse({
        title: result?.milestone?.label || 'Seri ödülü alındı',
        subtitle: cleanOpsText(result?.milestone?.rewardLabel, 'Token ve XP ödülü eklendi.'),
        token: result?.milestone?.token,
        xp: result?.milestone?.xp,
        kind: 'streak',
      }));
      await refreshProfile?.();
      return result;
    } finally {
      setRewardHubLoading(false);
    }
  }, [patchProfile, profile, progressSnapshot, refreshProfile, rewardHubLoading, sessionUserId]);

  const openEventChestReward = useCallback(async () => {
    if (!sessionUserId || rewardHubLoading) return null;
    setRewardHubLoading(true);
    try {
      const result = await openDailyRewardEventChest(sessionUserId, profile || {}, progressSnapshot);
      setDailyRewardState(result.state || null);
      if (!result.ok && result.reason === 'not_enough_ops') {
        Alert.alert('Günlük Kasa', 'Kasayı açmak için yeterli puanın yok.');
        return result;
      }
      if (!result.ok) {
        Alert.alert('Günlük Kasa', result?.error?.message || 'Kasa açılırken bir sorun oluştu.');
        return result;
      }
      patchProfile(result.profilePatch);
      setPulse(buildPulse({
        title: result?.reward?.label || 'Kasa açıldı',
        subtitle: `+${Number(result?.reward?.token || 0)} token • +${Number(result?.reward?.xp || 0)} XP`,
        token: result?.reward?.token,
        xp: result?.reward?.xp,
        kind: 'eventChest',
      }));
      await refreshProfile?.();
      return result;
    } finally {
      setRewardHubLoading(false);
    }
  }, [patchProfile, profile, progressSnapshot, refreshProfile, rewardHubLoading, sessionUserId]);

  const redeemStoreItemReward = useCallback(async (itemId) => {
    if (!sessionUserId || !itemId || rewardHubLoading) return null;
    setRewardHubLoading(true);
    try {
      const result = await redeemDailyRewardStoreItem(sessionUserId, profile || {}, itemId, progressSnapshot);
      setDailyRewardState(result.state || null);
      if (!result.ok && result.reason === 'not_enough_ops') {
        Alert.alert('Günlük Mağaza', 'Bu ürün için yeterli puanın yok.');
        return result;
      }
      if (!result.ok) {
        Alert.alert('Günlük Mağaza', result?.error?.message || 'Ürün alınırken bir sorun oluştu.');
        return result;
      }
      patchProfile(result.profilePatch);
      setPulse(buildPulse({
        title: result?.item?.title || 'Günlük mağaza',
        subtitle: cleanOpsText(result?.item?.rewardLabel, 'Ödül hesabına işlendi.'),
        token: result?.item?.token,
        xp: result?.item?.xp,
        kind: 'store',
      }));
      await refreshProfile?.();
      return result;
    } finally {
      setRewardHubLoading(false);
    }
  }, [patchProfile, profile, progressSnapshot, refreshProfile, rewardHubLoading, sessionUserId]);

  const cycleEvent = useCallback(async () => {
    if (!sessionUserId || adminSaving) return null;
    setAdminSaving(true);
    try {
      const nextState = await cycleDailyRewardEvent(sessionUserId, progressSnapshot, 1);
      setDailyRewardState(nextState);
      return nextState;
    } finally {
      setAdminSaving(false);
    }
  }, [adminSaving, progressSnapshot, sessionUserId]);

  const toggleEnabled = useCallback(async () => {
    if (!sessionUserId || adminSaving) return null;
    setAdminSaving(true);
    try {
      const nextEnabled = !(dailyRewardState?.liveOpsEnabled !== false);
      const nextState = await setDailyRewardEnabled(sessionUserId, nextEnabled, progressSnapshot);
      setDailyRewardState(nextState);
      return nextState;
    } finally {
      setAdminSaving(false);
    }
  }, [adminSaving, dailyRewardState?.liveOpsEnabled, progressSnapshot, sessionUserId]);

  const toggleAutoRotate = useCallback(async () => {
    if (!sessionUserId || adminSaving) return null;
    setAdminSaving(true);
    try {
      const nextValue = !(dailyRewardState?.autoRotate !== false);
      const nextState = await setDailyRewardAutoRotate(sessionUserId, nextValue, progressSnapshot);
      setDailyRewardState(nextState);
      return nextState;
    } finally {
      setAdminSaving(false);
    }
  }, [adminSaving, dailyRewardState?.autoRotate, progressSnapshot, sessionUserId]);

  const selectEventPreset = useCallback(async (eventId) => {
    if (!sessionUserId || !eventId || adminSaving) return null;
    setAdminSaving(true);
    try {
      const nextState = await setDailyRewardEventPreset(sessionUserId, eventId, progressSnapshot);
      setDailyRewardState(nextState);
      return nextState;
    } finally {
      setAdminSaving(false);
    }
  }, [adminSaving, progressSnapshot, sessionUserId]);

  const selectWeeklyPlan = useCallback(async (planId) => {
    if (!sessionUserId || !planId || adminSaving) return null;
    setAdminSaving(true);
    try {
      const nextState = await setDailyRewardWeeklyPlan(sessionUserId, planId, progressSnapshot);
      setDailyRewardState(nextState);
      return nextState;
    } finally {
      setAdminSaving(false);
    }
  }, [adminSaving, progressSnapshot, sessionUserId]);

  const trackDailyRewardAction = useCallback(async (actionKey, amount = 1) => {
    if (!sessionUserId || !actionKey) return null;
    try {
      const nextState = await recordDailyRewardAction(sessionUserId, actionKey, amount, progressSnapshot);
      setDailyRewardState(nextState);
      return nextState;
    } catch (error) {
      console.log('[Lootonia][dailyReward][track]', error?.message || String(error));
      return null;
    }
  }, [progressSnapshot, sessionUserId]);

  const viewState = useMemo(() => (
    sanitizeDailyRewardState(dailyRewardState, pulse)
  ), [dailyRewardState, pulse]);

  return {
    dailyRewardState: viewState,
    rewardModalOpen,
    claimLoading,
    eventClaimLoading,
    rewardHubLoading,
    adminSaving,
    refreshDailyReward,
    openRewardModal,
    closeRewardModal,
    claimTodayReward,
    claimEventTask,
    claimStreakMilestoneReward,
    openEventChestReward,
    redeemStoreItemReward,
    cycleEvent,
    toggleEnabled,
    toggleAutoRotate,
    selectEventPreset,
    selectWeeklyPlan,
    trackDailyRewardAction,
    // Geriye dönük uyumluluk alias'ları
    liveOpsState: viewState,
    refreshLiveOps: refreshDailyReward,
    trackLiveOpsAction: trackDailyRewardAction,
  };
}
