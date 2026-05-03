import { supabase } from '../lib/supabase';

const dkd_profile_cache_value = { dkd_data_value: null, dkd_loaded_at_value: 0 };
const dkd_wallet_ledger_cache_value = new Map();
const dkd_job_history_cache_value = new Map();

function dkd_read_cache_bucket_value(dkd_bucket_value, dkd_ttl_ms_value = 30000) {
  const dkd_cache_age_ms_value = Date.now() - Number(dkd_bucket_value?.dkd_loaded_at_value || 0);
  if (dkd_bucket_value?.dkd_data_value == null || dkd_cache_age_ms_value > dkd_ttl_ms_value) return null;
  return dkd_bucket_value.dkd_data_value;
}

function dkd_write_cache_bucket_value(dkd_bucket_value, dkd_data_value) {
  dkd_bucket_value.dkd_data_value = dkd_data_value;
  dkd_bucket_value.dkd_loaded_at_value = Date.now();
  return dkd_data_value;
}

function dkd_read_map_cache_value(dkd_map_value, dkd_cache_key_value, dkd_ttl_ms_value = 30000) {
  const dkd_bucket_value = dkd_map_value.get(String(dkd_cache_key_value || 'default'));
  if (!dkd_bucket_value) return null;
  return dkd_read_cache_bucket_value(dkd_bucket_value, dkd_ttl_ms_value);
}

function dkd_write_map_cache_value(dkd_map_value, dkd_cache_key_value, dkd_data_value) {
  const dkd_bucket_value = { dkd_data_value, dkd_loaded_at_value: Date.now() };
  dkd_map_value.set(String(dkd_cache_key_value || 'default'), dkd_bucket_value);
  return dkd_data_value;
}

function normalizeCurrency(value) {
  const dkd_iteration_value = Number(value ?? 0);
  return Number.isFinite(dkd_iteration_value) ? dkd_iteration_value : 0;
}

function normalizeCourierProfile(payload = {}) {
  return {
    status: payload?.status || 'none',
    score: Number(payload?.score ?? 0),
    completed_jobs: Number(payload?.completed_jobs ?? 0),
    wallet_tl: normalizeCurrency(payload?.wallet_tl),
    total_earned_tl: normalizeCurrency(payload?.total_earned_tl),
    withdrawn_tl: normalizeCurrency(payload?.withdrawn_tl),
    available_tl: normalizeCurrency(payload?.available_tl ?? payload?.wallet_tl),
    today_earnings_tl: normalizeCurrency(payload?.today_earnings_tl),
    week_earnings_tl: normalizeCurrency(payload?.week_earnings_tl),
    month_earnings_tl: normalizeCurrency(payload?.month_earnings_tl),
    avg_fee_tl: normalizeCurrency(payload?.avg_fee_tl),
    active_days: Number(payload?.active_days ?? 0),
    cancelled_jobs: Number(payload?.cancelled_jobs ?? 0),
    last_completed_at: payload?.last_completed_at || null,
    fastest_eta_min: payload?.fastest_eta_min == null ? null : Number(payload.fastest_eta_min),
    rating_avg: Number(payload?.rating_avg ?? 5),
    rating_count: Number(payload?.rating_count ?? 0),
    courier_xp: Number(payload?.courier_xp ?? payload?.score ?? 0),
    courier_level: Math.max(1, Number(payload?.courier_level ?? 1)),
    vehicle_type: payload?.vehicle_type || 'moto',
    city: payload?.city || 'Ankara',
    zone: payload?.zone || '',
    badges: Array.isArray(payload?.badges) ? payload.badges : [],
    meta: payload?.meta && typeof payload.meta === 'object' ? payload.meta : {},
    open_jobs: Number(payload?.open_jobs ?? 0),
    completed_today: Number(payload?.completed_today ?? 0),
  };
}

async function fetchFallbackProfile() {
  const { data, error } = await supabase
    .from('dkd_profiles')
    .select(`
      courier_status,
      courier_score,
      courier_completed_jobs,
      courier_wallet_tl,
      courier_total_earned_tl,
      courier_withdrawn_tl,
      courier_active_days,
      courier_last_completed_at,
      courier_fastest_eta_min,
      courier_rating_avg,
      courier_rating_count,
      courier_xp,
      courier_level,
      courier_vehicle_type,
      courier_city,
      courier_zone,
      courier_badges,
      courier_profile_meta
    `)
    .single();

  if (error) throw error;

  return normalizeCourierProfile({
    status: data?.courier_status,
    score: data?.courier_score,
    completed_jobs: data?.courier_completed_jobs,
    wallet_tl: data?.courier_wallet_tl,
    total_earned_tl: data?.courier_total_earned_tl,
    withdrawn_tl: data?.courier_withdrawn_tl,
    available_tl: data?.courier_wallet_tl,
    active_days: data?.courier_active_days,
    last_completed_at: data?.courier_last_completed_at,
    fastest_eta_min: data?.courier_fastest_eta_min,
    rating_avg: data?.courier_rating_avg,
    rating_count: data?.courier_rating_count,
    courier_xp: data?.courier_xp,
    courier_level: data?.courier_level,
    vehicle_type: data?.courier_vehicle_type,
    city: data?.courier_city,
    zone: data?.courier_zone,
    badges: data?.courier_badges,
    meta: data?.courier_profile_meta,
  });
}

export async function fetchCourierProfile(dkd_options_value = {}) {
  const dkd_force_refresh_value = !!dkd_options_value?.dkd_force_refresh_value;
  if (!dkd_force_refresh_value) {
    const dkd_cached_value = dkd_read_cache_bucket_value(dkd_profile_cache_value, 45000);
    if (dkd_cached_value) return { data: dkd_cached_value, error: null };
  }
  const { data, error } = await supabase.rpc('dkd_courier_profile_me');
  if (!error) {
    return {
      data: dkd_write_cache_bucket_value(dkd_profile_cache_value, normalizeCourierProfile(data)),
      error: null,
    };
  }

  const message = String(error?.message || '').toLowerCase();
  if (message.includes('could not find the function') || message.includes('schema cache')) {
    const fallback = dkd_write_cache_bucket_value(dkd_profile_cache_value, await fetchFallbackProfile());
    return { data: fallback, error: null };
  }

  return { data: null, error };
}

export async function fetchCourierWalletLedger(limit = 50, dkd_options_value = {}) {
  const dkd_cache_key_value = Number(limit) || 50;
  const dkd_force_refresh_value = !!dkd_options_value?.dkd_force_refresh_value;
  if (!dkd_force_refresh_value) {
    const dkd_cached_value = dkd_read_map_cache_value(dkd_wallet_ledger_cache_value, dkd_cache_key_value, 45000);
    if (dkd_cached_value) return { data: dkd_cached_value, error: null };
  }
  const { data, error } = await supabase.rpc('dkd_courier_wallet_ledger_me', {
    dkd_param_limit: Number(limit) || 50,
  });

  if (!error) {
    return {
      data: dkd_write_map_cache_value(dkd_wallet_ledger_cache_value, dkd_cache_key_value, Array.isArray(data) ? data.map((row) => ({
        ...row,
        amount_tl: normalizeCurrency(row?.amount_tl),
        balance_after_tl: normalizeCurrency(row?.balance_after_tl),
      })) : []),
      error: null,
    };
  }

  const message = String(error?.message || '').toLowerCase();
  if (message.includes('could not find the function') || message.includes('schema cache')) {
    return { data: [], error: null };
  }

  return { data: null, error };
}

export async function fetchCourierJobHistory(limit = 40, dkd_options_value = {}) {
  const dkd_cache_key_value = Number(limit) || 40;
  const dkd_force_refresh_value = !!dkd_options_value?.dkd_force_refresh_value;
  if (!dkd_force_refresh_value) {
    const dkd_cached_value = dkd_read_map_cache_value(dkd_job_history_cache_value, dkd_cache_key_value, 45000);
    if (dkd_cached_value) return { data: dkd_cached_value, error: null };
  }
  const { data, error } = await supabase.rpc('dkd_courier_job_history_me', {
    dkd_param_limit: Number(limit) || 40,
  });

  if (!error) {
    return {
      data: dkd_write_map_cache_value(dkd_job_history_cache_value, dkd_cache_key_value, Array.isArray(data) ? data.map((row) => ({
        ...row,
        fee_tl: normalizeCurrency(row?.fee_tl),
      })) : []),
      error: null,
    };
  }

  const message = String(error?.message || '').toLowerCase();
  if (message.includes('could not find the function') || message.includes('schema cache')) {
    return { data: [], error: null };
  }

  return { data: null, error };
}

export async function withdrawCourierWallet(amountTl, note = '') {
  const { data, error } = await supabase.rpc('dkd_courier_wallet_withdraw', {
    dkd_param_amount_tl: Number(amountTl) || 0,
    dkd_param_note: note || null,
  });
  return { data, error };
}

export function formatTl(value) {
  const amount = normalizeCurrency(value);
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} TL`;
  }
}
