import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import {
  applyClanMissionClaim,
  buildClanDerived,
  buildClanShareText,
  clearClanState,
  createClanDraft,
  loadClanState,
  removeClanMember,
  saveClanState,
  upsertClanMember,
} from '../services/clanService';

export function useClanState({ sessionUserId, profile, summary, taskState, weeklyTaskState, setProfile, grantXp }) {
  const [clanState, setClanState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const refreshClan = useCallback(async () => {
    if (!sessionUserId) {
      setClanState(null);
      return null;
    }
    setLoading(true);
    try {
      const value = await loadClanState(sessionUserId);
      setClanState(value);
      return value;
    } finally {
      setLoading(false);
    }
  }, [sessionUserId]);

  useEffect(() => {
    let active = true;
    if (!sessionUserId) {
      setClanState(null);
      return undefined;
    }
    setLoading(true);
    loadClanState(sessionUserId)
      .then((value) => {
        if (active) setClanState(value);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sessionUserId]);

  const derived = useMemo(() => buildClanDerived({ clanState, profile, summary, taskState, weeklyTaskState }), [clanState, profile, summary, taskState, weeklyTaskState]);
  const shareText = useMemo(() => buildClanShareText({ clanState, derived }), [clanState, derived]);

  const persist = useCallback(async (next) => {
    setClanState(next);
    if (!sessionUserId) return next;
    await saveClanState(sessionUserId, next);
    return next;
  }, [sessionUserId]);

  const createOrUpdateClan = useCallback(async ({ name, tag, motto, themeKey }) => {
    setSaving(true);
    try {
      const draft = {
        ...(clanState || createClanDraft({ name, tag, motto, themeKey })),
        name: String(name || '').trim().slice(0, 24) || clanState?.name || 'Neon Wing',
        tag: String(tag || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || clanState?.tag || 'NWNG',
        motto: String(motto || '').trim().slice(0, 72) || clanState?.motto || 'Haritaya hükmet, loot’u birlikte topla.',
        themeKey: String(themeKey || clanState?.themeKey || 'neon'),
        roster: Array.isArray(clanState?.roster) ? clanState.roster : [],
        missionClaims: clanState?.missionClaims || {},
        recentClaims: Array.isArray(clanState?.recentClaims) ? clanState.recentClaims : [],
        updatedAt: new Date().toISOString(),
      };
      await persist(draft);
      return draft;
    } finally {
      setSaving(false);
    }
  }, [clanState, persist]);

  const addMember = useCallback(async (alias, role) => {
    const next = upsertClanMember(clanState || createClanDraft(), { alias, role });
    if (next === clanState) return clanState;
    await persist(next);
    return next;
  }, [clanState, persist]);

  const deleteMember = useCallback(async (memberId) => {
    const next = removeClanMember(clanState || createClanDraft(), memberId);
    await persist(next);
    return next;
  }, [clanState, persist]);

  const claimClanMission = useCallback(async (missionKey) => {
    const mission = (derived?.missions || []).find((item) => item.key === missionKey);
    if (!mission) return;
    if (!mission.complete) {
      Alert.alert('Klan', 'Bu klan görevi henüz tamamlanmadı.');
      return;
    }
    if (mission.claimed) return;

    const nextState = applyClanMissionClaim(clanState || createClanDraft(), mission);
    await persist(nextState);
    setProfile?.((prev) => (prev ? { ...prev, token: Number(prev.token || 0) + Number(mission.rewardToken || 0) } : prev));
    if (Number(mission.rewardXp || 0) > 0) {
      await grantXp?.(Number(mission.rewardXp || 0), `clan_${mission.key}`);
    }
    Alert.alert('Klan', `${mission.title} ödülü alındı. +${mission.rewardToken} token • +${mission.rewardXp} XP`);
  }, [clanState, derived?.missions, grantXp, persist, setProfile]);

  const leaveClan = useCallback(async () => {
    if (!sessionUserId) return;
    await clearClanState(sessionUserId);
    setClanState(null);
  }, [sessionUserId]);

  return {
    clanState,
    clanLoading: loading,
    clanSaving: saving,
    clanDerived: derived,
    clanShareText: shareText,
    createOrUpdateClan,
    addClanMember: addMember,
    removeClanMember: deleteMember,
    claimClanMission,
    leaveClan,
    refreshClan,
  };
}

export default useClanState;
