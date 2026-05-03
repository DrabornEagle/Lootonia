import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import {
  awardProfileXp,
  checkIsAdmin,
  ensureProfile,
  fetchProfile,
  setProfileNickname,
  updateProfileNicknameDirect
} from '../services/profileService';
import { levelFromXp, rankFromLevel } from '../utils/progression';

function normalizeFallbackProfile(userId, row = {}) {
  return {
    user_id: userId,
    id: userId,
    ally_id: row?.ally_id == null ? null : Number(row?.ally_id),
    social_last_seen_at: row?.social_last_seen_at || null,
    nickname: row?.nickname || 'DrabornEagle',
    avatar_emoji: row?.avatar_emoji || '🦅',
    avatar_image_url: row?.avatar_image_url ? String(row.avatar_image_url) : '',
    token: Number(row?.token ?? 0),
    shards: Number(row?.shards ?? 0),
    boss_tickets: Number(row?.boss_tickets ?? 0),
    energy: Number(row?.energy ?? 20),
    energy_max: Number(row?.energy_max ?? 20),
    energy_updated_at: row?.energy_updated_at || new Date().toISOString(),
    task_state: row?.task_state || {},
    boss_state: row?.boss_state || {},
    weekly_task_state: row?.weekly_task_state || {},
    xp: Number(row?.xp ?? 0),
    level: Math.max(1, Number(row?.level ?? 1)),
    rank_key: row?.rank_key || 'rookie',
    wallet_tl: Number(row?.wallet_tl ?? row?.courier_wallet_tl ?? 0),
    courier_status: row?.courier_status || 'none',
    courier_score: Number(row?.courier_score ?? 0),
    courier_completed_jobs: Number(row?.courier_completed_jobs ?? 0),
    courier_wallet_tl: Number(row?.courier_wallet_tl ?? 0),
    courier_total_earned_tl: Number(row?.courier_total_earned_tl ?? 0),
    courier_withdrawn_tl: Number(row?.courier_withdrawn_tl ?? 0),
    courier_active_days: Number(row?.courier_active_days ?? 0),
    courier_last_completed_at: row?.courier_last_completed_at || null,
    courier_fastest_eta_min: row?.courier_fastest_eta_min == null ? null : Number(row?.courier_fastest_eta_min),
    courier_city: row?.courier_city || 'Ankara',
    courier_zone: row?.courier_zone || '',
    courier_vehicle_type: row?.courier_vehicle_type || 'moto',
    courier_profile_meta: row?.courier_profile_meta && typeof row.courier_profile_meta === 'object' ? row.courier_profile_meta : {},
  };
}


export function useProfileData({ sessionUserId, setProfile, setDbReadyFlags }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const profileRef = useRef(null);

  const checkAdmin = useCallback(async () => {
    try {
      const { data, error } = await checkIsAdmin();
      if (error) throw error;
      setIsAdmin(!!data);
      return !!data;
    } catch {
      setIsAdmin(false);
      return false;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!sessionUserId) return null;

    let data = null;
    let nextTasksDbReady = true;
    let nextWeeklyDbReady = true;

    try {
      const result = await fetchProfile(sessionUserId);
      data = result?.data || null;
      nextTasksDbReady = !!result?.tasksDbReady;
      nextWeeklyDbReady = !!result?.weeklyDbReady;
    } catch (dkd_error_value) {
      console.log('[Lootonia][refreshProfile][fetchProfile]', dkd_error_value?.message || String(dkd_error_value));

      const direct = await supabase
        .from('dkd_profiles')
        .select('user_id, ally_id, social_last_seen_at, nickname, avatar_emoji, avatar_image_url, token, shards, boss_tickets, energy, energy_max, energy_updated_at, task_state, boss_state, weekly_task_state, xp, level, rank_key, wallet_tl, courier_status, courier_score, courier_completed_jobs, courier_wallet_tl, courier_total_earned_tl, courier_withdrawn_tl, courier_active_days, courier_last_completed_at, courier_fastest_eta_min, courier_city, courier_zone, courier_vehicle_type, courier_profile_meta')
        .eq('user_id', sessionUserId)
        .maybeSingle();

      if (direct?.error) {
        console.log('[Lootonia][refreshProfile][direct]', direct.error?.message || String(direct.error));
      }

      data = normalizeFallbackProfile(sessionUserId, direct?.data || {});
      nextTasksDbReady = false;
      nextWeeklyDbReady = false;
    }

    if (!data) {
      data = normalizeFallbackProfile(sessionUserId, {});
      nextTasksDbReady = false;
      nextWeeklyDbReady = false;
    }

    setDbReadyFlags(nextTasksDbReady, nextWeeklyDbReady);

    setProfile((prev) => {
      const lockUntil = Number(prev?._energy_lock_until || 0);
      const lockActive = lockUntil > Date.now();
      const serverEnergy = Number(data?.energy ?? 0);
      const prevEnergy = Number(prev?.energy ?? 0);
      const preserveLockedEnergy = lockActive && prev && serverEnergy > prevEnergy;

      const merged = {
        ...(prev || {}),
        id: data.user_id,
        ...data,
        shards: Number(data?.shards || 0),
        xp: Math.max(Number(prev?.xp || 0), Number(data?.xp || 0)),
        level: Math.max(1, Number(prev?.level || 1), Number(data?.level || 1)),
        rank_key: data?.rank_key || prev?.rank_key || 'rookie',
        _energy_lock_until: preserveLockedEnergy ? lockUntil : 0,
      };

      if (preserveLockedEnergy) {
        merged.energy = prevEnergy;
        merged.energy_updated_at = prev?.energy_updated_at || data?.energy_updated_at;
      }

      profileRef.current = merged;
      return merged;
    });

    return data;
  }, [sessionUserId, setDbReadyFlags, setProfile]);

  const bootstrapProfile = useCallback(async () => {
    if (!sessionUserId) return null;

    try {
      const ensured = await ensureProfile(sessionUserId);
      if (ensured?.error) {
        console.log('[Lootonia][ensureProfile]', ensured.error?.message || String(ensured.error));
      }
    } catch (dkd_error_value) {
      console.log('[Lootonia][ensureProfile][throw]', dkd_error_value?.message || String(dkd_error_value));
    }

    const [profileResult, adminResult] = await Promise.allSettled([
      refreshProfile(),
      checkAdmin(),
    ]);

    if (profileResult.status === 'rejected') {
      console.log('[Lootonia][bootstrapProfile][refreshProfile]', profileResult.reason?.message || String(profileResult.reason));
    }
    if (adminResult.status === 'rejected') {
      console.log('[Lootonia][bootstrapProfile][checkAdmin]', adminResult.reason?.message || String(adminResult.reason));
    }

    return profileResult.status === 'fulfilled' ? profileResult.value : null;
  }, [sessionUserId, refreshProfile, checkAdmin]);

  const saveProfileNick = useCallback(async (nicknameRaw, avatarRaw, dkd_avatar_image_url_raw = undefined) => {
    if (!sessionUserId) return;

    const nickname = String(nicknameRaw || '').trim();
    const avatar = String(avatarRaw || '🦅');
    const dkd_avatar_image_url = dkd_avatar_image_url_raw === undefined
      ? undefined
      : (String(dkd_avatar_image_url_raw || '').trim() || null);
    if (nickname.length < 3 || nickname.length > 18) {
      Alert.alert('Profil', 'Nickname 3–18 karakter olmalı.');
      return;
    }

    setProfile((dkd_previous_profile_value) => {
      const dkd_profile_next_value = dkd_previous_profile_value ? {
        ...dkd_previous_profile_value,
        nickname,
        avatar_emoji: avatar,
        avatar_image_url: dkd_avatar_image_url == null ? '' : String(dkd_avatar_image_url || ''),
      } : dkd_previous_profile_value;
      profileRef.current = dkd_profile_next_value;
      return dkd_profile_next_value;
    });

    try {
      const { error } = await setProfileNickname(nickname, avatar, dkd_avatar_image_url);

      if (error) {
        const msg = String(error?.message || '');
        if (msg.toLowerCase().includes('function') || msg.toLowerCase().includes('dkd_set_profile')) {
          let { error: directError } = await updateProfileNicknameDirect(sessionUserId, nickname, avatar, dkd_avatar_image_url);
          if (directError) {
            const dkd_direct_message = String(directError?.message || directError?.details || '');
            if (dkd_direct_message.includes('avatar_image_url')) {
              const dkd_retry_result = await updateProfileNicknameDirect(sessionUserId, nickname, avatar);
              directError = dkd_retry_result?.error || null;
            }
          }
          if (directError) throw directError;
        } else {
          throw error;
        }
      }

      await refreshProfile();
    } catch (dkd_error_value) {
      Alert.alert('Profil', dkd_error_value?.message || String(dkd_error_value));
      throw dkd_error_value;
    }
  }, [sessionUserId, refreshProfile, setProfile]);

  const grantXp = useCallback(async (amount, reason = 'progress') => {
    if (!sessionUserId) return null;

    const xpAmount = Math.max(0, Number(amount || 0));
    if (!xpAmount) return null;

    const base = profileRef.current || {};
    const prevXp = Math.max(0, Number(base?.xp || 0));
    const nextXp = prevXp + xpAmount;
    const nextLevel = levelFromXp(nextXp);
    const nextRank = rankFromLevel(nextLevel);

    const optimistic = {
      xp: nextXp,
      level: nextLevel,
      rank_key: nextRank.key,
    };

    setProfile((prev) => {
      const merged = prev ? {
        ...prev,
        ...optimistic,
      } : prev;
      profileRef.current = merged;
      return merged;
    });

    try {
      const { data, error } = await awardProfileXp(sessionUserId, base, xpAmount);
      if (error) throw error;

      if (data) {
        setProfile((prev) => {
          const merged = prev ? {
            ...prev,
            xp: Number(data?.xp || optimistic.xp),
            level: Math.max(1, Number(data?.level || optimistic.level)),
            rank_key: data?.rank_key || optimistic.rank_key || prev.rank_key || 'rookie',
          } : prev;
          profileRef.current = merged;
          return merged;
        });
      }

      return { data, reason };
    } catch (dkd_error_value) {
      console.log('[Lootonia][grantXp]', reason, dkd_error_value?.message || String(dkd_error_value));
      return { data: optimistic, reason, localOnly: true };
    }
  }, [sessionUserId, setProfile]);

  return {
    isAdmin,
    setIsAdmin,
    checkAdmin,
    refreshProfile,
    bootstrapProfile,
    saveProfileNick,
    grantXp,
  };
}
