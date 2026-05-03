import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing } from 'react-native';
import {
  fetchCardDef,
  openBossChestSecure,
  openChestByCode as openChestByCodeRpc,
  openChestSecure
} from '../services/chestService';
import { dayKey } from '../utils/date';
import { parseQr } from '../utils/qr';
import { supabase } from '../lib/supabase';
import { claimPlayerCampaignCouponByDrop, emitTrafficFromChestResult } from '../services/businessSuiteService';

function useChestAnimation(chestOpen, chestStage) {
  const chestRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!chestOpen || chestStage !== 'opening') return;
    chestRotate.setValue(0);
    const loop = Animated.loop(
      Animated.timing(chestRotate, {
        toValue: 1,
        duration: 900,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [chestOpen, chestStage, chestRotate]);

  return useMemo(() => chestRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-8deg', '8deg'],
  }), [chestRotate]);
}

async function buildRewardPayload(result, dropType, ticketReward = 0, ticketTotal = 0) {
  const base = {
    ok: true,
    token: Number(result?.token || 0),
    token_mult: result?.token_mult || null,
    drop_type: dropType,
    ticket_reward: Number(ticketReward || result?.ticket_reward || 0),
    ticket_total: Number(ticketTotal || result?.ticket_total || 0),
  };

  if (!result?.card_def_id) return base;

  const { data: card, error: cardError } = await fetchCardDef(result.card_def_id);
  if (cardError || !card) {
    return {
      ...base,
      card_def_id: result.card_def_id,
      card_name: result?.card_name || 'Kart Kazanıldı',
      card_series: result?.card_series || 'Lootonia',
      card_serial_code: result?.card_serial_code || result?.serial_code || '',
      card_rarity: result?.card_rarity || 'rare',
      card_theme: result?.card_theme || 'system',
      card_art_image_url: result?.card_art_image_url || result?.art_image_url || '',
      card_lookup_pending: true,
    };
  }

  return {
    ...base,
    card_def_id: card.id,
    card_name: card.name,
    card_series: card.series,
    card_serial_code: card.serial_code || result?.card_serial_code || result?.serial_code || '',
    card_rarity: card.rarity,
    card_theme: card.theme,
    card_art_image_url: card.art_image_url || result?.card_art_image_url || result?.art_image_url || '',
  };
}

function readNumeric(...values) {
  for (const value of values) {
    const dkd_iteration_value = Number(value);
    if (Number.isFinite(dkd_iteration_value)) return dkd_iteration_value;
  }
  return null;
}

function computeTicketReward(result, dropType) {
  const explicit = readNumeric(result?.ticket_reward, result?.boss_ticket_reward);
  if (explicit != null) return Math.max(0, explicit);
  if (String(dropType || '') === 'boss') return 2;
  const rarity = String(result?.card_rarity || result?.rarity || '').toLowerCase();
  if (['legendary', 'mythic', 'epic'].includes(rarity)) return 1;
  return 1;
}

export function useChestActions({
  drops,
  visibleDrops,
  activeDropId,
  activeDrop,
  bossState,
  loc,
  isNear,
  getCooldown,
  refreshProfile,
  refreshUserDrops,
  refreshDrops,
  loadHistory,
  setDrops,
  loadCollection,
  loadMarket,
  bumpChestsOpened,
  syncDailyProgress,
  syncWeeklyProgress,
  setActiveDropId,
  setBossOpen,
  grantXp,
  setProfile,
  sessionUserId,
  scheduleRefresh,
  onAchievementAction,
}) {
  const [chestOpen, setChestOpen] = useState(false);
  const [chestStage, setChestStage] = useState('opening');
  const [chestPayload, setChestPayload] = useState(null);
  const chestSpin = useChestAnimation(chestOpen, chestStage);
  const actionIdRef = useRef(0);
  const actionBusyRef = useRef(false);

  const runRefresh = useCallback((key, run) => {
    if (typeof run !== 'function') return Promise.resolve(null);
    if (typeof scheduleRefresh === 'function') return scheduleRefresh(key, run);
    return Promise.resolve().then(run);
  }, [scheduleRefresh]);

  const beginAction = useCallback(() => {
    actionIdRef.current += 1;
    actionBusyRef.current = true;
    return actionIdRef.current;
  }, []);

  const endAction = useCallback((actionId) => {
    if (actionIdRef.current === actionId) actionBusyRef.current = false;
  }, []);

  const revealPayload = useCallback((payload, delay = 850, actionId = actionIdRef.current) => {
    setTimeout(() => {
      if (actionId !== actionIdRef.current) return;
      setChestPayload(payload);
      setChestStage('revealed');
    }, delay);
  }, []);

  const resetChest = useCallback(() => {
    setChestPayload(null);
    setChestStage('opening');
    setChestOpen(true);
  }, []);

  const closeChest = useCallback(() => {
    actionBusyRef.current = false;
    setChestOpen(false);
    setChestStage('opening');
    setChestPayload(null);
  }, []);

  const runFollowupRefreshes = useCallback(() => {
    Promise.allSettled([
      runRefresh('profile', () => refreshProfile?.()),
      runRefresh('userDrops', () => refreshUserDrops?.()),
      runRefresh('drops', () => refreshDrops?.()),
      runRefresh('history', () => loadHistory?.()),
      runRefresh('collection', () => loadCollection?.()),
      runRefresh('market', () => loadMarket?.()),
      runRefresh('tasks:daily', () => syncDailyProgress?.()),
      runRefresh('tasks:weekly', () => syncWeeklyProgress?.()),
    ]).then(() => {});
  }, [refreshProfile, refreshUserDrops, refreshDrops, loadHistory, loadCollection, loadMarket, runRefresh, syncDailyProgress, syncWeeklyProgress]);

  const applyLocalCampaignStockDelta = useCallback((dropId, couponReward) => {
    if (typeof setDrops !== 'function') return;
    if (!dropId || !couponReward?.ok || couponReward?.already_exists) return;

    const exactStockLeft = Number(couponReward?.stock_left);
    setDrops((prev) => (Array.isArray(prev) ? prev : []).map((row) => {
      if (String(row?.id || '') !== String(dropId)) return row;
      const currentStock = Number(row?.campaign_stock_left || 0);
      const nextStock = Number.isFinite(exactStockLeft)
        ? Math.max(0, exactStockLeft)
        : Math.max(0, currentStock - 1);

      return {
        ...row,
        campaign_stock_left: nextStock,
        campaign_players_today: Math.max(0, Number(row?.campaign_players_today || 0) + 1),
        campaign_players_total: Math.max(0, Number(row?.campaign_players_total || row?.campaign_players_today || 0) + 1),
      };
    }));
  }, [setDrops]);



  const syncTicketsFromOpen = useCallback(async (result, dropType) => {
    const reward = computeTicketReward(result, dropType);
    let ticketTotal = 0;
    if (!setProfile) return { reward, ticketTotal: 0 };
    setProfile((prev) => {
      if (!prev) return prev;
      const next = Math.max(0, Number(prev.boss_tickets || 0) + reward);
      ticketTotal = next;
      return { ...prev, boss_tickets: next };
    });
    try {
      if (sessionUserId) {
        const { data } = await supabase.from('dkd_profiles').select('boss_tickets').eq('user_id', sessionUserId).maybeSingle();
        const base = Math.max(0, Number(data?.boss_tickets || 0));
        ticketTotal = base + reward;
        await supabase.from('dkd_profiles').update({ boss_tickets: ticketTotal }).eq('user_id', sessionUserId);
      }
    } catch {}
    return { reward, ticketTotal };
  }, [sessionUserId, setProfile]);

  const syncProfileFromOpen = useCallback((result, fallbackEnergyCost = 1) => {
    if (!setProfile) return;
    const nowIso = new Date().toISOString();
    const lockUntil = Date.now() + 4000;

    setProfile((prev) => {
      if (!prev) return prev;

      const nextTokenDelta = readNumeric(result?.token_delta, result?.token, 0) || 0;
      const nextTokenAbsolute = readNumeric(result?.token_after, result?.token_balance, result?.token_total);
      const nextEnergyAbsolute = readNumeric(result?.energy_after, result?.energy_balance, result?.energy_total, result?.energy);
      const energyCost = Math.max(0, readNumeric(result?.energy_spent, result?.energy_cost, fallbackEnergyCost) || 0);
      const currentEnergy = Math.max(0, Number(prev.energy || 0));
      const safeNextEnergy = nextEnergyAbsolute != null ? Math.max(0, nextEnergyAbsolute) : Math.max(0, currentEnergy - energyCost);

      return {
        ...prev,
        token: nextTokenAbsolute != null ? nextTokenAbsolute : Math.max(0, Number(prev.token || 0) + nextTokenDelta),
        energy: safeNextEnergy,
        energy_updated_at: result?.energy_updated_at || nowIso,
        _energy_lock_until: lockUntil,
      };
    });
  }, [setProfile]);

  const attachCampaignCoupon = useCallback(async ({ dropId, result, sourceType, qrText = null, codeText = null }) => {
    try {
      await emitTrafficFromChestResult({
        sessionUserId,
        drop: dropId ? { id: dropId } : null,
        result: { ...(result || {}), drop_id: dropId || result?.drop_id || null },
        sourceType,
        qrText,
        codeText,
      });
    } catch {}

    try {
      if (!dropId) return null;
      const coupon = await claimPlayerCampaignCouponByDrop({
        dropId,
        taskKey: result?.task_key || result?.mission_key || result?.source_task_key || null,
        sourceType,
        meta: {
          reward_token: Number(result?.token || 0),
          drop_type: result?.drop_type || null,
          source: 'chest_open',
        },
      });
      if (!coupon?.ok) {
        console.log('[dkd_campaign_coupon_claim_skip]', String(coupon?.reason || 'claim_not_returned'));
        return null;
      }
      return coupon;
    } catch (dkd_coupon_error) {
      console.log('[dkd_campaign_coupon_claim_error]', dkd_coupon_error?.message || String(dkd_coupon_error));
      return null;
    }
  }, [sessionUserId]);

  const bossOpenChestNow = useCallback(async () => {
    if (actionBusyRef.current) return;
    const today = dayKey();
    const bossToday = (bossState && bossState.day === today) ? bossState : null;
    if (!bossToday?.finished || !bossToday?.victory) return;
    const dropId = bossToday?.drop_id;
    if (!dropId) return;

    const drop = (drops || visibleDrops || []).find((item) => String(item.id) === String(dropId));
    if (!drop) {
      Alert.alert('Boss', 'Drop bulunamadı. Haritayı yenile.');
      return;
    }

    const actionId = beginAction();
    setBossOpen(false);
    setActiveDropId(String(dropId));

    const qTotal = Number(bossToday.q_count || 3);
    const correct = Number(bossToday.correct || 0);
    const tier = qTotal >= 6 ? 3 : qTotal >= 5 ? 2 : 1;

    resetChest();

    try {
      const { data, error } = await openBossChestSecure({
        dropId: drop.id,
        tier,
        correct,
        total: qTotal,
        lat: loc?.lat ?? null,
        lng: loc?.lng ?? null,
      });
      if (error) throw error;
      if (actionId !== actionIdRef.current) return;

      const result = data || {};
      if (!result.ok) {
        revealPayload(result, 700, actionId);
        Promise.allSettled([
          runRefresh('profile', () => refreshProfile?.()),
          runRefresh('userDrops', () => refreshUserDrops?.()),
        ]);
        setActiveDropId(null);
        return;
      }

      bumpChestsOpened?.();
      if (grantXp) await grantXp(35, 'boss_chest');
      await onAchievementAction?.('bossChestOpen', 1);
      syncProfileFromOpen(result, 1);
      const ticketSync = await syncTicketsFromOpen(result, 'boss');
      const couponReward = await attachCampaignCoupon({ dropId: drop.id, result, sourceType: 'boss' });
      applyLocalCampaignStockDelta(drop.id, couponReward);
      const payloadBase = await buildRewardPayload(result, 'boss', ticketSync.reward, ticketSync.ticketTotal);
      const payload = couponReward ? {
        ...payloadBase,
        coupon_code: couponReward.coupon_code,
        coupon_reward_label: couponReward.reward_label,
        coupon_business_name: couponReward.business_name,
        coupon_campaign_title: couponReward.campaign_title,
      } : payloadBase;
      revealPayload(payload, 850, actionId);
      runFollowupRefreshes();
    } catch (dkd_error_value) {
      if (actionId !== actionIdRef.current) return;
      const msg = dkd_error_value?.message || String(dkd_error_value);
      console.log('[boss_chest_raw_error]', msg);
      revealPayload({ ok: false, reason: msg }, 600, actionId);
    } finally {
      setActiveDropId(null);
      endAction(actionId);
    }
  }, [bossState, drops, visibleDrops, beginAction, endAction, setBossOpen, setActiveDropId, resetChest, loc?.lat, loc?.lng, refreshProfile, refreshUserDrops, bumpChestsOpened, grantXp, onAchievementAction, syncProfileFromOpen, revealPayload, runFollowupRefreshes, runRefresh, syncTicketsFromOpen, attachCampaignCoupon, applyLocalCampaignStockDelta]);

  const openChestByQr = useCallback(async (qrText) => {
    if (actionBusyRef.current) return;
    const parsed = parseQr(qrText);
    if (!parsed) {
      Alert.alert('QR Hatası', 'QR formatı yanlış. Örn: drop_id=UUID&secret=YOUR_SECRET');
      return;
    }

    const selectedDrop = activeDropId
      ? drops.find((item) => String(item.id) === String(activeDropId)) || null
      : null;
    const drop = drops.find((item) => String(item.id) === String(parsed.dropId));
    if (activeDropId && parsed.dropId !== activeDropId) {
      const scannedNear = drop ? isNear(drop) : { ok: false, distance: null };
      const selectedNear = selectedDrop ? isNear(selectedDrop) : { ok: false, distance: null };
      if (!scannedNear?.ok) {
        Alert.alert('Yanlış QR', `Bu sandık için farklı QR bekleniyor.
Beklenen: ${activeDropId}
Okunan: ${parsed.dropId}`);
        return;
      }
      if (!selectedNear?.ok) {
        setActiveDropId?.(String(parsed.dropId));
      }
    }

    if (!drop) {
      Alert.alert('Drop Bulunamadı', `drop_id=${parsed.dropId} yok.`);
      return;
    }

    const near = isNear(drop);
    if (!near.ok) {
      Alert.alert('Uzakta', `Mesafe: ${Math.round(near.distance)}m • Radius: ${drop.radius_m}m`);
      return;
    }

    const cooldown = getCooldown(drop);
    if (cooldown.isCooldown) {
      setChestPayload({ ok: false, reason: 'cooldown', next_open_at: cooldown.nextAt });
      setChestStage('revealed');
      setChestOpen(true);
      return;
    }

    const actionId = beginAction();
    resetChest();

    try {
      const { data, error } = await openChestSecure({
        dropId: drop.id,
        qrSecret: parsed.secret || null,
        lat: loc?.lat ?? null,
        lng: loc?.lng ?? null,
      });
      if (error) throw error;
      if (actionId !== actionIdRef.current) return;

      const result = data || {};
      if (!result.ok) {
        revealPayload(result, 700, actionId);
        Promise.allSettled([
          runRefresh('profile', () => refreshProfile?.()),
          runRefresh('userDrops', () => refreshUserDrops?.()),
        ]);
        return;
      }

      bumpChestsOpened?.();
      if (grantXp) await grantXp(18, 'chest_open');
      await onAchievementAction?.('chestOpen', 1);
      syncProfileFromOpen(result, 1);
      const ticketSync = await syncTicketsFromOpen(result, drop.type);
      const couponReward = await attachCampaignCoupon({ dropId: drop.id, result, sourceType: 'qr', qrText });
      applyLocalCampaignStockDelta(drop.id, couponReward);
      const payloadBase = await buildRewardPayload(result, drop.type, ticketSync.reward, ticketSync.ticketTotal);
      const payload = couponReward ? {
        ...payloadBase,
        coupon_code: couponReward.coupon_code,
        coupon_reward_label: couponReward.reward_label,
        coupon_business_name: couponReward.business_name,
        coupon_campaign_title: couponReward.campaign_title,
      } : payloadBase;
      revealPayload(payload, 850, actionId);
      runFollowupRefreshes();
    } catch (dkd_error_value) {
      if (actionId !== actionIdRef.current) return;
      revealPayload({ ok: false, reason: dkd_error_value?.message || String(dkd_error_value) }, 600, actionId);
    } finally {
      endAction(actionId);
    }
  }, [activeDropId, drops, isNear, getCooldown, beginAction, endAction, resetChest, loc?.lat, loc?.lng, refreshProfile, refreshUserDrops, bumpChestsOpened, grantXp, onAchievementAction, syncProfileFromOpen, revealPayload, runFollowupRefreshes, runRefresh, syncTicketsFromOpen, attachCampaignCoupon, setActiveDropId, applyLocalCampaignStockDelta]);

  const openChestByCode = useCallback(async (codeText) => {
    if (actionBusyRef.current) return;
    const code = String(codeText || '').trim().toUpperCase();
    if (!code) return;

    if (activeDrop) {
      const near = isNear(activeDrop);
      if (!near.ok) {
        Alert.alert('Uzakta', `Mesafe: ${Math.round(near.distance)}m • Radius: ${activeDrop.radius_m}m`);
        return;
      }
      const cooldown = getCooldown(activeDrop);
      if (cooldown.isCooldown) {
        setChestPayload({ ok: false, reason: 'cooldown', next_open_at: cooldown.nextAt });
        setChestStage('revealed');
        setChestOpen(true);
        return;
      }
    }

    const actionId = beginAction();
    resetChest();

    try {
      const { data, error } = await openChestByCodeRpc(code);
      if (error) throw error;
      if (actionId !== actionIdRef.current) return;

      const result = data || {};
      if (!result.ok) {
        revealPayload(result, 700, actionId);
        Promise.allSettled([
          runRefresh('profile', () => refreshProfile?.()),
          runRefresh('userDrops', () => refreshUserDrops?.()),
        ]);
        return;
      }

      const dropType = result.drop_type || activeDrop?.type || 'qr';
      bumpChestsOpened?.();
      if (grantXp) await grantXp(18, 'chest_code');
      await onAchievementAction?.('chestOpen', 1);
      syncProfileFromOpen(result, 1);
      const ticketSync = await syncTicketsFromOpen(result, dropType);
      const couponReward = await attachCampaignCoupon({ dropId: activeDrop?.id || result?.drop_id || null, result, sourceType: 'code', codeText: code });
      applyLocalCampaignStockDelta(activeDrop?.id || result?.drop_id || null, couponReward);
      const payloadBase = await buildRewardPayload(result, dropType, ticketSync.reward, ticketSync.ticketTotal);
      const payload = couponReward ? {
        ...payloadBase,
        coupon_code: couponReward.coupon_code,
        coupon_reward_label: couponReward.reward_label,
        coupon_business_name: couponReward.business_name,
        coupon_campaign_title: couponReward.campaign_title,
      } : payloadBase;
      revealPayload(payload, 850, actionId);
      runFollowupRefreshes();
    } catch (dkd_error_value) {
      if (actionId !== actionIdRef.current) return;
      const msg = dkd_error_value?.message || String(dkd_error_value);
      if (String(msg).includes('dkd_open_chest_by_code') && String(msg).toLowerCase().includes('exist')) {
        Alert.alert('DB Güncellemesi Gerekli', 'Manuel kod sistemi için Supabase SQL güncellemesini çalıştırmalısın (dkd_open_chest_by_code / dkd_issue_drop_code).');
      }
      revealPayload({ ok: false, reason: msg }, 600, actionId);
    } finally {
      endAction(actionId);
    }
  }, [activeDrop, isNear, getCooldown, beginAction, endAction, resetChest, revealPayload, refreshProfile, refreshUserDrops, bumpChestsOpened, grantXp, onAchievementAction, syncProfileFromOpen, runFollowupRefreshes, runRefresh, syncTicketsFromOpen, attachCampaignCoupon, applyLocalCampaignStockDelta]);

  return {
    chestOpen,
    chestStage,
    chestPayload,
    chestSpin,
    setChestOpen,
    setChestStage,
    setChestPayload,
    closeChest,
    bossOpenChestNow,
    openChestByQr,
    openChestByCode,
  };
}

export default useChestActions;
