
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { DAILY_TASKS_V1, WEEKLY_TASKS_V1 } from '../constants/game';

import { bossConfigFromPower, computeCollectionPower } from '../utils/collection';
import { dayKey, weekStartKey } from '../utils/date';

const DAILY_PROGRESS_CACHE_TTL_MS = 30 * 1000;
const WEEKLY_PROGRESS_CACHE_TTL_MS = 45 * 1000;

function makeDefaultTaskState(dayStr) {
  return {
    day: dayStr,
    chests_opened: 0,
    boss_solved: false,
    claims: { chest_1: false, chest_3: false, boss_1: false, bonus: false },
  };
}

function makeDefaultWeeklyTaskState(weekStartStr) {
  return {
    week: weekStartStr,
    chests_opened: 0,
    boss_opened: 0,
    unique_drops: 0,
    claims: { w_chest_10: false, w_boss_3: false, w_unique_5: false, w_bonus: false },
  };
}


export function useTaskProgress({ sessionUserId, profile, setProfile, userCardsRaw, collectionCards, grantXp, onAchievementAction }) {
  const [tasksDbReady, setTasksDbReady] = useState(true);
  const [weeklyDbReady, setWeeklyDbReady] = useState(true);
  const [taskState, setTaskState] = useState(null);
  const [weeklyTaskState, setWeeklyTaskState] = useState(null);
  const taskPersistRef = useRef(null);
  const lastDailySyncRef = useRef(0);
  const lastWeeklySyncRef = useRef(0);

  useEffect(() => () => {
    if (taskPersistRef.current) clearTimeout(taskPersistRef.current);
  }, []);

  const setDbReadyFlags = useCallback((nextTasksDbReady, nextWeeklyDbReady) => {
    setTasksDbReady(!!nextTasksDbReady);
    setWeeklyDbReady(!!nextWeeklyDbReady);
  }, []);

  const persistTaskState = useCallback((next) => {
    setTaskState(next);
    setProfile((prev) => (prev ? { ...prev, task_state: next } : prev));
    if (!tasksDbReady || !sessionUserId) return;

    if (taskPersistRef.current) clearTimeout(taskPersistRef.current);
    taskPersistRef.current = setTimeout(async () => {
      try {
        await supabase.from('dkd_profiles').update({ task_state: next }).eq('user_id', sessionUserId);
      } catch {}
    }, 600);
  }, [sessionUserId, setProfile, tasksDbReady]);

  const persistWeeklyTaskState = useCallback((next) => {
    setWeeklyTaskState(next);
    setProfile((prev) => (prev ? { ...prev, weekly_task_state: next } : prev));
    if (!weeklyDbReady || !sessionUserId) return;

    if (taskPersistRef.current) clearTimeout(taskPersistRef.current);
    taskPersistRef.current = setTimeout(async () => {
      try {
        await supabase.from('dkd_profiles').update({ weekly_task_state: next }).eq('user_id', sessionUserId);
      } catch {}
    }, 650);
  }, [sessionUserId, setProfile, weeklyDbReady]);

  const ensureTaskStates = useCallback(async () => {
    if (!sessionUserId) return;

    const today = dayKey();
    const week = weekStartKey();

    let nextTaskState = taskState;
    if (!nextTaskState || nextTaskState.day !== today) nextTaskState = profile?.task_state;
    if (!nextTaskState || nextTaskState.day !== today) nextTaskState = makeDefaultTaskState(today);

    let nextWeeklyState = weeklyTaskState;
    if (!nextWeeklyState || nextWeeklyState.week !== week) nextWeeklyState = profile?.weekly_task_state;
    if (!nextWeeklyState || nextWeeklyState.week !== week) nextWeeklyState = makeDefaultWeeklyTaskState(week);

    setTaskState(nextTaskState);
    setWeeklyTaskState(nextWeeklyState);
    setProfile((prev) => (prev
      ? { ...prev, task_state: nextTaskState, weekly_task_state: nextWeeklyState }
      : prev));

    const needPersistDaily = tasksDbReady && (profile?.task_state?.day !== today);
    const needPersistWeekly = weeklyDbReady && (profile?.weekly_task_state?.week !== week);

    if (needPersistDaily || needPersistWeekly) {
      try {
        const payload = {};
        if (needPersistDaily) payload.task_state = nextTaskState;
        if (needPersistWeekly) payload.weekly_task_state = nextWeeklyState;
        await supabase.from('dkd_profiles').update(payload).eq('user_id', sessionUserId);
      } catch {}
    }

    return { nextTaskState, nextWeeklyState };
  }, [
    sessionUserId,
    taskState,
    weeklyTaskState,
    profile?.task_state,
    profile?.weekly_task_state,
    setProfile,
    tasksDbReady,
    weeklyDbReady,
  ]);

  const isTaskComplete = useCallback((key, state) => {
    const dkd_key_value = String(key || '');
    const st = state || {};
    const claims = st?.claims || {};

    if (dkd_key_value.startsWith('w_')) {
      const ch = Number(st?.chests_opened || 0);
      const boss = Number(st?.boss_opened || 0);
      const uni = Number(st?.unique_drops || 0);
      if (dkd_key_value === 'w_chest_10') return ch >= 10;
      if (dkd_key_value === 'w_boss_3') return boss >= 3;
      if (dkd_key_value === 'w_unique_5') return uni >= 5;
      if (dkd_key_value === 'w_bonus') return ['w_chest_10', 'w_boss_3', 'w_unique_5'].every((dkd_claim_key) => !!claims?.[dkd_claim_key]);
      return false;
    }

    const ch = Number(st?.chests_opened || 0);
    const bossSolved = !!st?.boss_solved;
    if (dkd_key_value === 'chest_1') return ch >= 1;
    if (dkd_key_value === 'chest_3') return ch >= 3;
    if (dkd_key_value === 'boss_1') return bossSolved;
    if (dkd_key_value === 'bonus') return ['chest_1', 'chest_3', 'boss_1'].every((dkd_claim_key) => !!claims?.[dkd_claim_key]);
    return false;
  }, []);

  const applyReward = useCallback(async (tokenDelta, energyDelta) => {
    if (!sessionUserId) return;

    const nextToken = Number(profile?.token || 0) + Number(tokenDelta || 0);
    const maxEnergy = Number(profile?.energy_max || 0);
    const nextEnergy = Math.min(maxEnergy || 0, Number(profile?.energy || 0) + Number(energyDelta || 0));
    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from('dkd_profiles')
      .update({ token: nextToken, energy: nextEnergy, energy_updated_at: nowIso })
      .eq('user_id', sessionUserId);

    if (error) throw error;
    setProfile((prev) => (prev
      ? { ...prev, token: nextToken, energy: nextEnergy, energy_updated_at: nowIso }
      : prev));
  }, [sessionUserId, profile?.token, profile?.energy, profile?.energy_max, setProfile]);

  const syncDailyProgress = useCallback(async (options = {}) => {
    const force = !!options?.force;
    if (!sessionUserId) return null;

    if (!force && lastDailySyncRef.current && (Date.now() - lastDailySyncRef.current) < DAILY_PROGRESS_CACHE_TTL_MS) {
      return taskState || profile?.task_state || null;
    }
    const today = dayKey();

    const base0 = (taskState && taskState.day === today)
      ? taskState
      : (profile?.task_state?.day === today ? profile.task_state : makeDefaultTaskState(today));
    const baseTaskState = base0 || makeDefaultTaskState(today);
    const claims = baseTaskState?.claims || {};

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const startIso = start.toISOString();

    try {
      const { count: chestCount } = await supabase
        .from('dkd_chest_history')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', sessionUserId)
        .gte('created_at', startIso);

      const { count: bossCount } = await supabase
        .from('dkd_chest_history')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', sessionUserId)
        .eq('drop_type', 'boss')
        .gte('created_at', startIso);

      const next = {
        day: today,
        chests_opened: Number(chestCount || 0),
        boss_solved: Number(bossCount || 0) >= 1 ? true : !!baseTaskState?.boss_solved,
        claims: {
          chest_1: !!claims?.chest_1,
          chest_3: !!claims?.chest_3,
          boss_1: !!claims?.boss_1,
          bonus: !!claims?.bonus,
        },
      };

      persistTaskState(next);
      lastDailySyncRef.current = Date.now();
      return next;
    } catch {
      return baseTaskState;
    }
  }, [sessionUserId, taskState, profile?.task_state, persistTaskState]);

  const syncWeeklyProgress = useCallback(async (options = {}) => {
    const force = !!options?.force;
    if (!sessionUserId) return null;

    if (!force && lastWeeklySyncRef.current && (Date.now() - lastWeeklySyncRef.current) < WEEKLY_PROGRESS_CACHE_TTL_MS) {
      return weeklyTaskState || profile?.weekly_task_state || null;
    }
    const week = weekStartKey();

    const base0 = (weeklyTaskState && weeklyTaskState.week === week)
      ? weeklyTaskState
      : (profile?.weekly_task_state?.week === week ? profile.weekly_task_state : makeDefaultWeeklyTaskState(week));
    const baseWeeklyState = base0 || makeDefaultWeeklyTaskState(week);
    const claims = baseWeeklyState?.claims || {};

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const day = start.getDay();
    const diff = (day + 6) % 7;
    start.setDate(start.getDate() - diff);
    const startIso = start.toISOString();

    try {
      const { count: chestCount } = await supabase
        .from('dkd_chest_history')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', sessionUserId)
        .gte('created_at', startIso);

      const { count: bossCount } = await supabase
        .from('dkd_chest_history')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', sessionUserId)
        .eq('drop_type', 'boss')
        .gte('created_at', startIso);

      const { data: dropsData } = await supabase
        .from('dkd_chest_history')
        .select('drop_id')
        .eq('user_id', sessionUserId)
        .gte('created_at', startIso)
        .limit(1000);

      const unique = new Set((dropsData || []).map((item) => item.drop_id).filter(Boolean)).size;

      const next = {
        week,
        chests_opened: Number(chestCount || 0),
        boss_opened: Number(bossCount || 0),
        unique_drops: Number(unique || 0),
        claims: {
          w_chest_10: !!claims?.w_chest_10,
          w_boss_3: !!claims?.w_boss_3,
          w_unique_5: !!claims?.w_unique_5,
          w_bonus: !!claims?.w_bonus,
        },
      };

      persistWeeklyTaskState(next);
      lastWeeklySyncRef.current = Date.now();
      return next;
    } catch {
      return baseWeeklyState;
    }
  }, [sessionUserId, weeklyTaskState, profile?.weekly_task_state, persistWeeklyTaskState]);

  const prewarmTaskProgress = useCallback(async (options = {}) => {
    if (!sessionUserId) return;
    await ensureTaskStates();
    await Promise.allSettled([
      syncDailyProgress(options),
      syncWeeklyProgress(options),
    ]);
  }, [sessionUserId, ensureTaskStates, syncDailyProgress, syncWeeklyProgress]);

  const claimTask = useCallback(async (key) => {
    if (!sessionUserId) return;

    const dkd_key_value = String(key || '');
    const isWeekly = dkd_key_value.startsWith('w_');
    const weeklyDef = WEEKLY_TASKS_V1.find((item) => item.key === dkd_key_value);
    const dailyDef = DAILY_TASKS_V1.find((item) => item.key === dkd_key_value);

    if (isWeekly) {
      const week = weekStartKey();
      const ws0 = (weeklyTaskState && weeklyTaskState.week === week)
        ? weeklyTaskState
        : (profile?.weekly_task_state?.week === week ? profile.weekly_task_state : makeDefaultWeeklyTaskState(week));
      const ws = ws0 || makeDefaultWeeklyTaskState(week);

      if (!!ws?.claims?.[dkd_key_value]) return;
      if (!isTaskComplete(dkd_key_value, ws)) {
        Alert.alert('Görev', 'Bu haftalık görev henüz tamamlanmadı.');
        return;
      }

      try {
        const mult = (dkd_key_value === 'w_boss_3')
          ? bossConfigFromPower(computeCollectionPower(userCardsRaw || collectionCards || [])).mult
          : 1;

        let rpcArgs = { dkd_param_task_key: dkd_key_value };
        if (mult && mult !== 1) rpcArgs.dkd_param_mult = mult;

        let { data, error } = await supabase.rpc('dkd_weekly_task_claim', rpcArgs);
        if (error && rpcArgs.dkd_param_mult != null) {
          ({ data, error } = await supabase.rpc('dkd_weekly_task_claim', { dkd_param_task_key: dkd_key_value }));
        }
        if (error) throw error;

        if (!data?.ok) {
          Alert.alert('Görev', `Alınamadı: ${String(data?.reason || data?.error || 'claim_failed')}`);
          return;
        }

        const nextWeeklyState = data.weekly_task_state || ws;
        setWeeklyTaskState(nextWeeklyState);
        setProfile((prev) => (prev ? {
          ...prev,
          token: data.token != null ? data.token : prev.token,
          energy: data.energy != null ? data.energy : prev.energy,
          energy_max: data.energy_max != null ? data.energy_max : prev.energy_max,
          weekly_task_state: nextWeeklyState,
        } : prev));
        if (Number(weeklyDef?.reward_xp || 0) > 0) {
          await grantXp?.(Number(weeklyDef.reward_xp), `task_${dkd_key_value}`);
        }
        await onAchievementAction?.('taskClaim', 1);
        return;
      } catch (error) {
        const msg = String(error?.message || error || '');
        const looksMissing = msg.toLowerCase().includes('function') && msg.toLowerCase().includes('dkd_weekly_task_claim');
        if (!looksMissing) {
          // fall through to local fallback
        }
      }

      if (!weeklyDef) return;

      try {
        await applyReward(weeklyDef.reward_token || 0, weeklyDef.reward_energy || 0);
        if (Number(weeklyDef.reward_xp || 0) > 0) {
          await grantXp?.(Number(weeklyDef.reward_xp), `task_${dkd_key_value}`);
        }
        await onAchievementAction?.('taskClaim', 1);
        persistWeeklyTaskState({ ...ws, claims: { ...(ws.claims || {}), [dkd_key_value]: true } });
      } catch (error) {
        Alert.alert('Hata', error?.message || String(error));
      }
      return;
    }

    const today = dayKey();
    const ts0 = (taskState && taskState.day === today)
      ? taskState
      : (profile?.task_state?.day === today ? profile.task_state : makeDefaultTaskState(today));
    const ts = ts0 || makeDefaultTaskState(today);

    if (!!ts?.claims?.[dkd_key_value]) return;
    if (!isTaskComplete(dkd_key_value, ts)) {
      Alert.alert('Görev', 'Bu görev henüz tamamlanmadı.');
      return;
    }

    try {
      const mult = (dkd_key_value === 'boss_1')
        ? bossConfigFromPower(computeCollectionPower(userCardsRaw || collectionCards || [])).mult
        : 1;

      let rpcArgs = { dkd_param_task_key: dkd_key_value };
      if (mult && mult !== 1) rpcArgs.dkd_param_mult = mult;

      let { data, error } = await supabase.rpc('dkd_task_claim', rpcArgs);
      if (error && rpcArgs.dkd_param_mult != null) {
        ({ data, error } = await supabase.rpc('dkd_task_claim', { dkd_param_task_key: dkd_key_value }));
      }
      if (error) throw error;

      if (!data?.ok) {
        if (dkd_key_value === 'boss_1' && !!ts?.boss_solved) {
          throw new Error('fallback_local');
        }
        Alert.alert('Görev', `Alınamadı: ${String(data?.reason || data?.error || 'claim_failed')}`);
        return;
      }

      const nextTaskState = data.task_state || ts;
      setTaskState(nextTaskState);
      setProfile((prev) => (prev ? {
        ...prev,
        token: data.token != null ? data.token : prev.token,
        energy: data.energy != null ? data.energy : prev.energy,
        energy_max: data.energy_max != null ? data.energy_max : prev.energy_max,
        task_state: nextTaskState,
      } : prev));
      if (Number(dailyDef?.reward_xp || 0) > 0) {
        await grantXp?.(Number(dailyDef.reward_xp), `task_${dkd_key_value}`);
      }
      await onAchievementAction?.('taskClaim', 1);
      return;
    } catch (error) {
      const msg = String(error?.message || error || '');
      const looksMissing = msg.toLowerCase().includes('function') && msg.toLowerCase().includes('dkd_task_claim');
      if (!looksMissing && msg !== 'fallback_local') {
        // fall through to local fallback
      }
    }

    if (!dailyDef) return;

    try {
      await applyReward(dailyDef.reward_token || 0, dailyDef.reward_energy || 0);
      if (Number(dailyDef.reward_xp || 0) > 0) {
        await grantXp?.(Number(dailyDef.reward_xp), `task_${dkd_key_value}`);
      }
      await onAchievementAction?.('taskClaim', 1);
      persistTaskState({ ...ts, claims: { ...(ts.claims || {}), [dkd_key_value]: true } });
    } catch (error) {
      Alert.alert('Hata', error?.message || String(error));
    }
  }, [
    sessionUserId,
    weeklyTaskState,
    taskState,
    profile?.weekly_task_state,
    profile?.task_state,
    setProfile,
    applyReward,
    isTaskComplete,
    userCardsRaw,
    collectionCards,
    persistTaskState,
    persistWeeklyTaskState,
    grantXp,
    onAchievementAction,
  ]);

  const bumpChestsOpened = useCallback(() => {
    const today = dayKey();
    const base = (taskState && taskState.day === today) ? taskState : makeDefaultTaskState(today);
    persistTaskState({ ...base, chests_opened: Number(base.chests_opened || 0) + 1 });
  }, [taskState, persistTaskState]);

  const markBossSolved = useCallback(() => {
    const today = dayKey();
    const base = (taskState && taskState.day === today) ? taskState : makeDefaultTaskState(today);
    if (base?.boss_solved) return;
    persistTaskState({ ...base, boss_solved: true });
  }, [taskState, persistTaskState]);

  useEffect(() => {
    if (!sessionUserId || !(profile?.user_id || profile?.id)) return;
    ensureTaskStates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionUserId, profile?.user_id, tasksDbReady, weeklyDbReady]);

  return {
    tasksDbReady,
    weeklyDbReady,
    taskState,
    weeklyTaskState,
    setDbReadyFlags,
    ensureTaskStates,
    syncDailyProgress,
    syncWeeklyProgress,
    prewarmTaskProgress,
    claimTask,
    bumpChestsOpened,
    markBossSolved,
  };
}
