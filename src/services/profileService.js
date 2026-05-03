import { supabase } from '../lib/supabase';
import { levelFromXp, rankFromLevel } from '../utils/progression';

export async function ensureProfile(userId) {
  return supabase.from('dkd_profiles').upsert({ user_id: userId }, { onConflict: 'user_id' });
}

export async function checkIsAdmin() {
  return supabase.rpc('dkd_is_admin');
}

export async function fetchProfile(userId) {
  const selV27 = 'user_id, ally_id, social_last_seen_at, nickname, avatar_emoji, avatar_image_url, token, shards, boss_tickets, energy, energy_max, energy_updated_at, task_state, boss_state, weekly_task_state, xp, level, rank_key, wallet_tl, courier_status, courier_score, courier_completed_jobs, courier_wallet_tl, courier_total_earned_tl, courier_withdrawn_tl, courier_active_days, courier_last_completed_at, courier_fastest_eta_min, courier_city, courier_zone, courier_vehicle_type, courier_profile_meta, dkd_country, dkd_city, dkd_region, dkd_courier_online, dkd_courier_online_country, dkd_courier_online_city, dkd_courier_online_region, dkd_courier_last_online_at, dkd_courier_auto_assigned_job_id';
  const selV26 = 'user_id, ally_id, social_last_seen_at, nickname, avatar_emoji, avatar_image_url, token, shards, boss_tickets, energy, energy_max, energy_updated_at, task_state, boss_state, weekly_task_state, xp, level, rank_key, wallet_tl, courier_status, courier_score, courier_completed_jobs, courier_wallet_tl, courier_total_earned_tl, courier_withdrawn_tl, courier_active_days, courier_last_completed_at, courier_fastest_eta_min, courier_city, courier_zone, courier_vehicle_type, courier_profile_meta';
  const selV25 = 'user_id, ally_id, social_last_seen_at, nickname, avatar_emoji, token, shards, boss_tickets, energy, energy_max, energy_updated_at, task_state, boss_state, weekly_task_state, xp, level, rank_key, wallet_tl, courier_status, courier_score, courier_completed_jobs, courier_wallet_tl, courier_total_earned_tl, courier_withdrawn_tl, courier_active_days, courier_last_completed_at, courier_fastest_eta_min, courier_city, courier_zone, courier_vehicle_type, courier_profile_meta';
  const selV24 = 'user_id, ally_id, social_last_seen_at, nickname, avatar_emoji, token, shards, boss_tickets, energy, energy_max, energy_updated_at, task_state, boss_state, weekly_task_state, xp, level, rank_key, courier_status, courier_score, courier_completed_jobs, courier_wallet_tl, courier_total_earned_tl, courier_withdrawn_tl, courier_active_days, courier_last_completed_at, courier_fastest_eta_min';
  const selV23 = 'user_id, ally_id, social_last_seen_at, nickname, avatar_emoji, token, shards, boss_tickets, energy, energy_max, energy_updated_at, task_state, boss_state, weekly_task_state, xp, level, rank_key, courier_status, courier_score, courier_completed_jobs';
  const selV22 = 'user_id, nickname, avatar_emoji, token, shards, boss_tickets, energy, energy_max, energy_updated_at, task_state, boss_state, weekly_task_state, xp, level, rank_key, courier_status, courier_score, courier_completed_jobs';
  const selV21 = 'user_id, nickname, avatar_emoji, token, shards, boss_tickets, energy, energy_max, energy_updated_at, task_state, boss_state, weekly_task_state, xp, level, rank_key';
  const selV20 = 'user_id, nickname, avatar_emoji, token, shards, boss_tickets, energy, energy_max, energy_updated_at, task_state, boss_state, weekly_task_state';
  const selV18 = 'user_id, nickname, avatar_emoji, token, shards, energy, energy_max, energy_updated_at, task_state, boss_state, weekly_task_state';
  const selV17 = 'user_id, nickname, avatar_emoji, token, energy, energy_max, energy_updated_at, task_state, boss_state, weekly_task_state';
  const selV16 = 'user_id, token, energy, energy_max, energy_updated_at, task_state, boss_state, weekly_task_state';
  const selNew = 'user_id, token, energy, energy_max, energy_updated_at, task_state, boss_state';
  const selOld = 'user_id, token, energy, energy_max, energy_updated_at';

  let tasksDbReady = true;
  let weeklyDbReady = true;

  let resp = await supabase
    .from('dkd_profiles')
    .select(selV27)
    .eq('user_id', userId)
    .single();

  let { data, error } = resp;

  if (error) {
    let msg = String(error?.message || error?.details || '');

    if (msg.includes('dkd_country') || msg.includes('dkd_city') || msg.includes('dkd_region') || msg.includes('dkd_courier_online') || msg.includes('dkd_courier_online_country') || msg.includes('dkd_courier_auto_assigned_job_id')) {
      resp = await supabase
        .from('dkd_profiles')
        .select(selV26)
        .eq('user_id', userId)
        .single();
      data = resp.data;
      error = resp.error;
    }

    msg = String(error?.message || error?.details || '');
    if (msg.includes('avatar_image_url')) {
      resp = await supabase
        .from('dkd_profiles')
        .select(selV25)
        .eq('user_id', userId)
        .single();
      data = resp.data;
      error = resp.error;
    }

    msg = String(error?.message || error?.details || '');
    if (msg.includes('wallet_tl') || msg.includes('courier_city') || msg.includes('courier_zone') || msg.includes('courier_vehicle_type') || msg.includes('courier_profile_meta')) {
      resp = await supabase
        .from('dkd_profiles')
        .select(selV24)
        .eq('user_id', userId)
        .single();
      data = resp.data;
      error = resp.error;
    }

    if (msg.includes('ally_id') || msg.includes('social_last_seen_at')) {
      resp = await supabase
        .from('dkd_profiles')
        .select(selV22)
        .eq('user_id', userId)
        .single();
      data = resp.data;
      error = resp.error;
    }

    msg = String(error?.message || error?.details || '');
    if (msg.includes('courier_wallet_tl') || msg.includes('courier_total_earned_tl') || msg.includes('courier_withdrawn_tl') || msg.includes('courier_active_days') || msg.includes('courier_last_completed_at') || msg.includes('courier_fastest_eta_min')) {
      resp = await supabase
        .from('dkd_profiles')
        .select(selV23)
        .eq('user_id', userId)
        .single();
      data = resp.data;
      error = resp.error;
    }

    msg = String(error?.message || error?.details || '');
    if (msg.includes('courier_status') || msg.includes('courier_score') || msg.includes('courier_completed_jobs')) {
      resp = await supabase
        .from('dkd_profiles')
        .select(selV21)
        .eq('user_id', userId)
        .single();
      data = resp.data;
      error = resp.error;
    }

    msg = String(error?.message || error?.details || '');
    if (msg.includes('xp') || msg.includes('level') || msg.includes('rank_key')) {
      resp = await supabase
        .from('dkd_profiles')
        .select(selV20)
        .eq('user_id', userId)
        .single();
      data = resp.data;
      error = resp.error;
    }

    msg = String(error?.message || error?.details || '');
    if (msg.includes('boss_tickets')) {
      resp = await supabase
        .from('dkd_profiles')
        .select(selV18)
        .eq('user_id', userId)
        .single();
      data = resp.data;
      error = resp.error;
    }

    msg = String(error?.message || error?.details || '');
    if (msg.includes('shards')) {
      resp = await supabase
        .from('dkd_profiles')
        .select(selV17)
        .eq('user_id', userId)
        .single();
      data = resp.data;
      error = resp.error;
    }

    msg = String(error?.message || error?.details || '');
    if (msg.includes('nickname') || msg.includes('avatar_emoji')) {
      resp = await supabase
        .from('dkd_profiles')
        .select(selV16)
        .eq('user_id', userId)
        .single();
      data = resp.data;
      error = resp.error;
    }

    msg = String(error?.message || error?.details || '');
    if (msg.includes('weekly_task_state')) {
      weeklyDbReady = false;
      resp = await supabase
        .from('dkd_profiles')
        .select(selNew)
        .eq('user_id', userId)
        .single();
      data = resp.data;
      error = resp.error;
      if (!resp.error) tasksDbReady = true;
    }

    msg = String(error?.message || error?.details || '');
    if (msg.includes('task_state') || msg.includes('boss_state')) {
      tasksDbReady = false;
      weeklyDbReady = false;
      resp = await supabase
        .from('dkd_profiles')
        .select(selOld)
        .eq('user_id', userId)
        .single();
      data = resp.data;
      error = resp.error;
    }
  }

  if (error) throw error;

  const normalized = {
    ...data,
    ally_id: data?.ally_id == null ? null : Number(data.ally_id),
    social_last_seen_at: data?.social_last_seen_at || null,
    avatar_image_url: data?.avatar_image_url ? String(data.avatar_image_url) : '',
    xp: Number(data?.xp ?? 0),
    level: Math.max(1, Number(data?.level ?? 1)),
    rank_key: data?.rank_key || 'rookie',
    wallet_tl: Number(data?.wallet_tl ?? data?.courier_wallet_tl ?? 0),
    courier_status: data?.courier_status || 'none',
    courier_score: Number(data?.courier_score ?? 0),
    courier_completed_jobs: Number(data?.courier_completed_jobs ?? 0),
    courier_wallet_tl: Number(data?.courier_wallet_tl ?? 0),
    courier_total_earned_tl: Number(data?.courier_total_earned_tl ?? 0),
    courier_withdrawn_tl: Number(data?.courier_withdrawn_tl ?? 0),
    courier_active_days: Number(data?.courier_active_days ?? 0),
    courier_last_completed_at: data?.courier_last_completed_at || null,
    courier_fastest_eta_min: data?.courier_fastest_eta_min == null ? null : Number(data?.courier_fastest_eta_min),
    courier_city: data?.courier_city || data?.dkd_city || 'Ankara',
    courier_zone: data?.courier_zone || data?.dkd_region || '',
    courier_vehicle_type: data?.courier_vehicle_type || 'moto',
    courier_profile_meta: data?.courier_profile_meta && typeof data.courier_profile_meta === 'object' ? data.courier_profile_meta : {},
    dkd_country: data?.dkd_country || 'Türkiye',
    dkd_city: data?.dkd_city || data?.courier_city || 'Ankara',
    dkd_region: data?.dkd_region || data?.courier_zone || '',
    dkd_courier_online: data?.dkd_courier_online === true,
    dkd_courier_online_country: data?.dkd_courier_online_country || data?.dkd_country || 'Türkiye',
    dkd_courier_online_city: data?.dkd_courier_online_city || data?.dkd_city || data?.courier_city || 'Ankara',
    dkd_courier_online_region: data?.dkd_courier_online_region || data?.dkd_region || data?.courier_zone || '',
    dkd_courier_last_online_at: data?.dkd_courier_last_online_at || null,
    dkd_courier_auto_assigned_job_id: data?.dkd_courier_auto_assigned_job_id || null,
  };

  return {
    data: normalized,
    tasksDbReady,
    weeklyDbReady,
  };
}

export async function setProfileNickname(nickname, avatar, dkd_avatar_image_url_value = undefined) {
  const dkd_clean_avatar_image_url = dkd_avatar_image_url_value === undefined
    ? undefined
    : (String(dkd_avatar_image_url_value || '').trim() || null);

  if (dkd_clean_avatar_image_url !== undefined) {
    const dkd_identity_result = await supabase.rpc('dkd_set_profile_identity', {
      dkd_param_nickname: nickname,
      dkd_param_avatar_emoji: avatar,
      dkd_param_avatar_image_url: dkd_clean_avatar_image_url,
    });

    if (!dkd_identity_result?.error) return dkd_identity_result;

    const dkd_identity_message = String(dkd_identity_result?.error?.message || dkd_identity_result?.error?.details || '').toLowerCase();
    if (!dkd_identity_message.includes('function') && !dkd_identity_message.includes('schema cache') && !dkd_identity_message.includes('could not find')) {
      return dkd_identity_result;
    }
  }

  return supabase.rpc('dkd_set_profile', {
    dkd_param_nickname: nickname,
    dkd_param_avatar_emoji: avatar,
  });
}

export async function updateProfileNicknameDirect(userId, nickname, avatar, dkd_avatar_image_url_value = undefined) {
  const dkd_profile_patch = { nickname, avatar_emoji: avatar };
  if (dkd_avatar_image_url_value !== undefined) {
    dkd_profile_patch.avatar_image_url = String(dkd_avatar_image_url_value || '').trim() || null;
  }
  return supabase.from('dkd_profiles').update(dkd_profile_patch).eq('user_id', userId);
}

export async function applyCourierLicenseRequest() {
  const rpcResult = await supabase.rpc('dkd_apply_courier_license');
  if (!rpcResult?.error) return rpcResult;

  const message = String(rpcResult?.error?.message || '').toLowerCase();
  if (!message.includes('could not find the function') && !message.includes('schema cache')) {
    return rpcResult;
  }

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) return rpcResult;

  const direct = await supabase
    .from('dkd_profiles')
    .update({ courier_status: 'pending' })
    .eq('user_id', userId)
    .select('courier_status')
    .single();

  if (direct?.error) return { data: null, error: direct.error };
  return { data: direct?.data?.courier_status || 'pending', error: null };
}

export async function awardProfileXp(userId, profile, xpDelta) {
  if (!userId) return { data: null, error: null, transient: false };

  const delta = Math.max(0, Number(xpDelta || 0));
  const prevXp = Math.max(0, Number(profile?.xp || 0));
  const currentLevel = Math.max(1, Number(profile?.level || levelFromXp(prevXp) || 1));
  const nextXp = prevXp + delta;
  const derivedLevel = levelFromXp(nextXp);
  const nextLevel = Math.max(currentLevel, derivedLevel);
  const nextRank = rankFromLevel(nextLevel);

  const patch = {
    xp: nextXp,
    level: nextLevel,
    rank_key: nextRank.key,
  };

  if (delta <= 0) {
    return {
      data: { user_id: userId, ...patch },
      error: null,
      transient: false,
    };
  }

  const { data, error } = await supabase
    .from('dkd_profiles')
    .update(patch)
    .eq('user_id', userId)
    .select('user_id, xp, level, rank_key')
    .single();

  if (error) {
    const msg = String(error?.message || error?.details || '');
    const schemaMissing =
      msg.includes('xp') ||
      msg.includes('level') ||
      msg.includes('rank_key');

    if (schemaMissing) {
      return {
        data: { user_id: userId, ...patch },
        error: null,
        transient: true,
      };
    }

    return { data: null, error, transient: false };
  }

  return {
    data: data || { user_id: userId, ...patch },
    error: null,
    transient: false,
  };
}


export async function recordCourierJobProgress(userId, { scoreDelta = 10, completedDelta = 1 } = {}) {
  if (!userId) {
    return { data: null, error: new Error('user_required') };
  }

  const { data: current, error: readError } = await supabase
    .from('dkd_profiles')
    .select('courier_status, courier_score, courier_completed_jobs')
    .eq('user_id', userId)
    .single();

  if (readError) return { data: null, error: readError };

  const nextScore = Math.max(0, Number(current?.courier_score || 0) + Number(scoreDelta || 0));
  const nextCompleted = Math.max(0, Number(current?.courier_completed_jobs || 0) + Number(completedDelta || 0));

  const { data, error } = await supabase
    .from('dkd_profiles')
    .update({
      courier_score: nextScore,
      courier_completed_jobs: nextCompleted,
    })
    .eq('user_id', userId)
    .select('courier_status, courier_score, courier_completed_jobs')
    .single();

  return { data, error };
}
