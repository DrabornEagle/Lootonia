import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { BOSS_QUESTIONS_V1 } from '../constants/boss';
import { fetchBossDefinitionForDrop } from '../services/bossService';
import { bossConfigFromPower, computeCollectionPower } from '../utils/collection';
import { dayKey, nextBossReturnText } from '../utils/date';
import { clamp } from '../utils/geo';
import { pickBossQuestion, pickBossQuestionIds } from '../utils/random';

function normalizeBossQuestions(items) {
  return (Array.isArray(items) ? items : []).map((dkd_query_value) => ({
    dkd_query_value: String(dkd_query_value?.dkd_query_value || ''),
    opts: Array.isArray(dkd_query_value?.opts) ? [0,1,2,3].map((dkd_option_index) => String(dkd_query_value.opts?.[dkd_option_index] || '')) : ['', '', '', ''],
    dkd_answer_index: Math.max(0, Math.min(3, Number(dkd_query_value?.dkd_answer_index || dkd_query_value?.[String.fromCharCode(97)] || 0))),
  })).filter((dkd_query_value) => dkd_query_value.dkd_query_value && dkd_query_value.opts.every(Boolean));
}

function makeDefaultBossState(dayStr, mode = 'daily', dropId = null, power = 0) {
  const seed = `${dayStr}|${mode}|${dropId || ''}`;
  const cfg = bossConfigFromPower(power);
  const qids = pickBossQuestionIds(seed, cfg.qCount);
  return {
    day: dayStr,
    mode,
    drop_id: dropId,
    qids,
    q_count: cfg.qCount,
    tier: cfg.tier,
    reward_mult: cfg.mult,
    step: 0,
    phase: 'choose',
    correct: 0,
    wrong: 0,
    boss_hp: cfg.bossHpMax,
    boss_hp_max: cfg.bossHpMax,
    player_hp: cfg.playerHpMax,
    player_hp_max: cfg.playerHpMax,
    solved: false,
    finished: false,
    victory: false,
    last_selected: null,
    last_correct: null,
    escaped: false,
    escaped_at: null,
    escaped_drop_ids: [],
    solved_drop_ids: [],
  };
}

export function useBossBattle({
  sessionUserId,
  profile,
  setProfile,
  tasksDbReady,
  collectionCards,
  userCardsRaw,
  onBossSolved,
  grantXp,
}) {
  const [bossState, setBossState] = useState(null);
  const [bossOpen, setBossOpen] = useState(false);
  const [bossIntroOpen, setBossIntroOpen] = useState(false);
  const [bossIntroPayload, setBossIntroPayload] = useState(null);
  const bossPersistRef = useRef(null);

  useEffect(() => () => {
    if (bossPersistRef.current) clearTimeout(bossPersistRef.current);
  }, []);

  const persistBossState = useCallback((next) => {
    const normalized = {
      ...(next || {}),
      escaped_drop_ids: Array.isArray(next?.escaped_drop_ids) ? next.escaped_drop_ids : [],
      solved_drop_ids: Array.isArray(next?.solved_drop_ids) ? next.solved_drop_ids : [],
    };

    setBossState(normalized);
    setProfile((prev) => (prev ? { ...prev, boss_state: normalized } : prev));
    if (!tasksDbReady || !sessionUserId) return;

    if (bossPersistRef.current) clearTimeout(bossPersistRef.current);
    bossPersistRef.current = setTimeout(async () => {
      try {
        await supabase.from('dkd_profiles').update({ boss_state: normalized }).eq('user_id', sessionUserId);
      } catch {}
    }, 600);
  }, [sessionUserId, setProfile, tasksDbReady]);

  const ensureBossState = useCallback(async () => {
    if (!sessionUserId) return;

    const today = dayKey();
    let nextBossState = bossState;
    if (!nextBossState || nextBossState.day !== today) nextBossState = profile?.boss_state;
    if (!nextBossState || nextBossState.day !== today) {
      const power = computeCollectionPower(userCardsRaw || collectionCards || []);
      nextBossState = makeDefaultBossState(today, 'daily', null, power);
    }

    if (!Array.isArray(nextBossState?.escaped_drop_ids)) {
      nextBossState = { ...(nextBossState || {}), escaped_drop_ids: [] };
    }
    if (!Array.isArray(nextBossState?.solved_drop_ids)) {
      nextBossState = { ...(nextBossState || {}), solved_drop_ids: [] };
    }

    setBossState(nextBossState);
    setProfile((prev) => (prev ? { ...prev, boss_state: nextBossState } : prev));

    if (tasksDbReady && profile?.boss_state?.day !== today) {
      try {
        await supabase.from('dkd_profiles').update({ boss_state: nextBossState }).eq('user_id', sessionUserId);
      } catch {}
    }
  }, [
    sessionUserId,
    bossState,
    profile?.boss_state,
    setProfile,
    tasksDbReady,
    userCardsRaw,
    collectionCards,
  ]);

  const startBossSession = useCallback(async (mode = 'daily', dropId = null) => {
    const today = dayKey();
    const existing = (bossState && bossState.day === today) ? bossState : null;
    const escapedDropIds = Array.isArray(existing?.escaped_drop_ids)
      ? existing.escaped_drop_ids.map((value) => String(value))
      : [];
    const solvedDropIds = Array.isArray(existing?.solved_drop_ids)
      ? existing.solved_drop_ids.map((value) => String(value))
      : [];

    if (mode === 'drop' && dropId && escapedDropIds.includes(String(dropId))) {
      Alert.alert('Boss Kaçtı', `Bu boss bugün kaçtı. Tekrar geliş: ${nextBossReturnText()}`);
      return;
    }

    if (mode === 'drop' && dropId && solvedDropIds.includes(String(dropId))) {
      Alert.alert('Boss Tamamlandı', `Bu boss bugün zaten tamamlandı. Tekrar geliş: ${nextBossReturnText()}`);
      return;
    }

    const power = computeCollectionPower(userCardsRaw || collectionCards || []);
    const next = makeDefaultBossState(today, mode, dropId ? String(dropId) : null, power);
    if (escapedDropIds.length) next.escaped_drop_ids = escapedDropIds;
    if (solvedDropIds.length) next.solved_drop_ids = solvedDropIds;

    if (mode === 'drop' && dropId) {
      const { data } = await fetchBossDefinitionForDrop(dropId);
      const ticketCost = Math.max(1, Number(data?.ticket_cost || 1));
      const currentTickets = Math.max(0, Number(profile?.boss_tickets || 0));
      if (currentTickets < ticketCost) {
        Alert.alert('Boss Bileti', `Bu boss için ${ticketCost} bilet gerekiyor. Mevcut: ${currentTickets}`);
        return;
      }
      const nextTickets = Math.max(0, currentTickets - ticketCost);
      next.ticket_cost = ticketCost;
      next.boss_name = String(data?.title || 'BOSS');
      next.boss_subtitle = String(data?.subtitle || '');
      next.boss_description = String(data?.description || '');
      next.boss_art_image_url = String(data?.art_image_url || '');
      next.reward_summary = String(data?.reward_summary || '');
      next.boss_hp_display = Math.max(1, Number(data?.boss_hp_display || 985000));
      const customQuestions = normalizeBossQuestions(data?.question_set);
      if (customQuestions.length) {
        next.question_set = customQuestions;
        next.q_count = customQuestions.length;
        next.qids = [];
        next.boss_hp = customQuestions.length;
        next.boss_hp_max = customQuestions.length;
      }
      setProfile((prev) => prev ? { ...prev, boss_tickets: nextTickets } : prev);
      try {
        await supabase.from('dkd_profiles').update({ boss_tickets: nextTickets }).eq('user_id', sessionUserId);
      } catch {}
    }

    persistBossState(next);
    setBossIntroOpen(false);
    setBossIntroPayload(null);
    setBossOpen(true);
  }, [bossState, collectionCards, profile?.boss_tickets, userCardsRaw, persistBossState, setProfile, sessionUserId]);

  const openBoss = useCallback(() => {
    const today = dayKey();
    const existing = (bossState && bossState.day === today) ? bossState : null;
    const dailySolved = !!(existing && !existing.drop_id && (existing.victory || existing.solved || existing.escaped));

    if (dailySolved) {
      Alert.alert('Boss Tamamlandı', `Günlük boss bugün kapandı. Tekrar geliş: ${nextBossReturnText()}`);
      return;
    }

    setBossIntroPayload({ mode: 'daily', dropId: null });
    setBossIntroOpen(true);
  }, [bossState]);

  const openBossForDrop = useCallback(async (dropId) => {
    const today = dayKey();
    const existing = (bossState && bossState.day === today) ? bossState : null;
    const escapedDropIds = Array.isArray(existing?.escaped_drop_ids)
      ? existing.escaped_drop_ids.map((value) => String(value))
      : [];
    const solvedDropIds = Array.isArray(existing?.solved_drop_ids)
      ? existing.solved_drop_ids.map((value) => String(value))
      : [];

    if (escapedDropIds.includes(String(dropId))) {
      Alert.alert('Boss Kaçtı', `Bu boss bugün kaçtı. Tekrar geliş: ${nextBossReturnText()}`);
      return;
    }

    if (solvedDropIds.includes(String(dropId))) {
      Alert.alert('Boss Tamamlandı', `Bu boss bugün zaten tamamlandı. Tekrar geliş: ${nextBossReturnText()}`);
      return;
    }

    const { data } = await fetchBossDefinitionForDrop(dropId);
    const tickets = Math.max(0, Number(profile?.boss_tickets || 0));
    setBossIntroPayload({
      mode: 'drop',
      dropId: String(dropId),
      title: data?.title || 'Boss Baskını',
      subtitle: data?.subtitle || '',
      description: data?.description || '',
      reward_summary: data?.reward_summary || '',
      art_image_url: data?.art_image_url || '',
      ticket_cost: Math.max(1, Number(data?.ticket_cost || 1)),
      hp: Math.max(1, Number(data?.boss_hp_display || 985000)),
      tickets,
    });
    setBossIntroOpen(true);
  }, [bossState, profile?.boss_tickets]);

  const bossTryAgain = useCallback(() => {
    const today = dayKey();
    const power = computeCollectionPower(userCardsRaw || collectionCards || []);
    const bs0 = (bossState && bossState.day === today)
      ? bossState
      : makeDefaultBossState(today, 'daily', null, power);

    if (bs0?.escaped) {
      setBossOpen(false);
      return;
    }

    const qCount = Array.isArray(bs0.qids) && bs0.qids.length ? bs0.qids.length : Number(bs0.q_count || 3);
    const maxStep = Math.max(0, qCount - 1);
    const step = clamp(Number(bs0.step || 0), 0, maxStep);

    if (bs0.phase === 'result' && !bs0.finished) {
      persistBossState({
        ...bs0,
        step: Math.min(maxStep, step + 1),
        phase: 'choose',
        last_selected: null,
        last_correct: null,
      });
      return;
    }

    if (bs0.finished && !bs0.victory) {
      const reset = makeDefaultBossState(today, bs0.mode || 'daily', bs0.drop_id || null, power);
      reset.escaped_drop_ids = Array.isArray(bs0?.escaped_drop_ids) ? bs0.escaped_drop_ids : [];
      reset.solved_drop_ids = Array.isArray(bs0?.solved_drop_ids) ? bs0.solved_drop_ids : [];
      persistBossState(reset);
      return;
    }

    persistBossState({ ...bs0, phase: 'choose', last_selected: null, last_correct: null });
  }, [bossState, collectionCards, userCardsRaw, persistBossState]);

  const bossAnswer = useCallback((selectedIdx) => {
    const today = dayKey();
    const power = computeCollectionPower(userCardsRaw || collectionCards || []);
    const bs0 = (bossState && bossState.day === today)
      ? bossState
      : makeDefaultBossState(today, 'daily', null, power);

    if (bs0.finished) return;
    if ((bs0.phase || 'choose') !== 'choose') return;

    const qids = Array.isArray(bs0.qids) ? bs0.qids : [];
    const qCount = qids.length ? qids.length : Number(bs0.q_count || 3);
    const maxStep = Math.max(0, qCount - 1);
    const step = clamp(Number(bs0.step || 0), 0, maxStep);

    const customQuestions = Array.isArray(bs0?.question_set) ? bs0.question_set : [];
    const qid = qids[step] || bs0.question_id;
    const dkd_query_value = customQuestions[step] || (BOSS_QUESTIONS_V1 || []).find((item) => item.id === qid) || pickBossQuestion(`${today}|${step}`);

    const isCorrect = Number(selectedIdx) === Number(dkd_query_value?.dkd_answer_index ?? dkd_query_value?.[String.fromCharCode(97)]);
    const correctCount = Number(bs0.correct || 0) + (isCorrect ? 1 : 0);
    const wrongCount = Number(bs0.wrong || 0) + (isCorrect ? 0 : 1);

    const bossHpMax = Number(bs0.boss_hp_max || 3);
    const playerHpMax = Number(bs0.player_hp_max || 3);
    const bossHp = Math.max(0, bossHpMax - correctCount);
    const playerHp = Math.max(0, playerHpMax - wrongCount);

    const isLast = step >= maxStep;
    const escaped = playerHp <= 0;
    const finished = bossHp <= 0 || escaped || isLast;
    const victory = finished ? (bossHp <= 0) : false;

    const escapedDropIdsBase = Array.isArray(bs0?.escaped_drop_ids)
      ? bs0.escaped_drop_ids.map((value) => String(value))
      : [];
    const solvedDropIdsBase = Array.isArray(bs0?.solved_drop_ids)
      ? bs0.solved_drop_ids.map((value) => String(value))
      : [];

    const escapedDropIdsNext = (escaped && String(bs0.mode || 'daily') === 'drop' && bs0.drop_id)
      ? Array.from(new Set([...escapedDropIdsBase, String(bs0.drop_id)]))
      : escapedDropIdsBase;

    const solvedDropIdsNext = (victory && String(bs0.mode || 'daily') === 'drop' && bs0.drop_id)
      ? Array.from(new Set([...solvedDropIdsBase, String(bs0.drop_id)]))
      : solvedDropIdsBase;

    const next = {
      ...bs0,
      qids: qids?.length ? qids : pickBossQuestionIds(`${today}|${bs0.mode || 'daily'}|${bs0.drop_id || ''}`, qCount),
      q_count: qCount,
      step,
      phase: 'result',
      correct: correctCount,
      wrong: wrongCount,
      boss_hp: bossHp,
      player_hp: playerHp,
      last_selected: Number(selectedIdx),
      last_correct: !!isCorrect,
      finished: !!finished,
      victory: !!victory,
      solved: !!victory,
      escaped: !!escaped,
      escaped_at: escaped ? new Date().toISOString() : null,
      escaped_drop_ids: escapedDropIdsNext,
      solved_drop_ids: solvedDropIdsNext,
    };

    persistBossState(next);
    if (victory) {
      const bossXp = 45 + Math.max(0, qCount - 3) * 10;
      grantXp?.(bossXp, `boss_${bs0.mode || 'daily'}`);
      if (onBossSolved) onBossSolved();
    }
  }, [bossState, collectionCards, userCardsRaw, persistBossState, onBossSolved, grantXp]);

  useEffect(() => {
    if (!sessionUserId || !(profile?.user_id || profile?.id)) return;
    ensureBossState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionUserId, profile?.user_id, tasksDbReady]);

  return {
    bossState,
    bossOpen,
    bossIntroOpen,
    bossIntroPayload,
    setBossOpen,
    setBossIntroOpen,
    setBossIntroPayload,
    ensureBossState,
    startBossSession,
    openBoss,
    openBossForDrop,
    bossTryAgain,
    bossAnswer,
  };
}
