import { supabase } from '../lib/supabase';

function startOfTodayIso() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

function hourLabel(hour) {
  const dkd_hash_value = Number(hour || 0);
  return `${String(dkd_hash_value).padStart(2, '0')}:00`;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

async function fallbackDashboard(businessId) {
  const todayIso = startOfTodayIso();

  const [{ data: scans, error: scanError }, { data: coupons, error: couponError }, { data: campaigns }] = await Promise.all([
    supabase
      .from('dkd_business_qr_scans')
      .select('id, player_id, task_key, source_type, created_at')
      .eq('business_id', businessId)
      .gte('created_at', todayIso)
      .order('created_at', { ascending: true }),
    supabase
      .from('dkd_business_coupon_uses')
      .select('id, player_id, coupon_code, task_key, created_at')
      .eq('business_id', businessId)
      .gte('created_at', todayIso)
      .order('created_at', { ascending: true }),
    supabase
      .from('dkd_business_campaigns')
      .select('*')
      .eq('business_id', businessId)
      .order('updated_at', { ascending: false }),
  ]);

  if (scanError) throw scanError;
  if (couponError) throw couponError;

  const scanRows = safeArray(scans);
  const couponRows = safeArray(coupons);
  const uniquePlayers = new Set(scanRows.map((row) => String(row.player_id || '')).filter(Boolean)).size;

  const hourlyMap = new Map();
  scanRows.forEach((row) => {
    const hour = new Date(row.created_at).getHours();
    hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
  });

  const taskMap = new Map();
  scanRows.forEach((row) => {
    const key = String(row.task_key || 'organik').trim() || 'organik';
    taskMap.set(key, (taskMap.get(key) || 0) + 1);
  });

  return {
    today: {
      uniquePlayers,
      scanCount: scanRows.length,
      couponCount: couponRows.length,
      conversionRate: scanRows.length > 0 ? Math.round((couponRows.length / scanRows.length) * 1000) / 10 : 0,
    },
    hourly: Array.from({ length: 24 }).map((_, hour) => ({
      hour,
      label: hourLabel(hour),
      scan_count: hourlyMap.get(hour) || 0,
    })),
    tasks: Array.from(taskMap.entries())
      .map(([task_key, scan_count]) => ({ task_key, scan_count }))
      .sort((dkd_left_item, dkd_right_item) => dkd_right_item.scan_count - dkd_left_item.scan_count)
      .slice(0, 8),
    campaigns: safeArray(campaigns),
  };
}

export async function fetchAdminBusinesses() {
  const { data, error } = await supabase
    .from('dkd_businesses')
    .select('id, name, category, city, is_active')
    .order('name', { ascending: true });

  if (error) throw error;
  return safeArray(data);
}

export async function fetchBusinessDashboard(businessId) {
  if (!businessId) {
    return {
      today: { uniquePlayers: 0, scanCount: 0, couponCount: 0, conversionRate: 0 },
      hourly: [],
      tasks: [],
      campaigns: [],
    };
  }

  const todayIso = startOfTodayIso();
  const [metricsRes, hourlyRes, tasksRes, campaignsRes] = await Promise.all([
    supabase
      .from('dkd_business_today_metrics')
      .select('*')
      .eq('business_id', businessId)
      .eq('bucket_day', todayIso.slice(0, 10))
      .maybeSingle(),
    supabase
      .from('dkd_business_hourly_heatmap')
      .select('*')
      .eq('business_id', businessId)
      .eq('bucket_day', todayIso.slice(0, 10))
      .order('hour_slot', { ascending: true }),
    supabase
      .from('dkd_business_task_attribution')
      .select('*')
      .eq('business_id', businessId)
      .eq('bucket_day', todayIso.slice(0, 10))
      .order('scan_count', { ascending: false }),
    supabase
      .from('dkd_business_campaigns')
      .select('*')
      .eq('business_id', businessId)
      .order('updated_at', { ascending: false }),
  ]);

  const rawWorks =
    !metricsRes.error &&
    !hourlyRes.error &&
    !tasksRes.error &&
    !campaignsRes.error;

  if (!rawWorks) {
    return fallbackDashboard(businessId);
  }

  return {
    today: {
      uniquePlayers: Number(metricsRes.data?.unique_players || 0),
      scanCount: Number(metricsRes.data?.scan_count || 0),
      couponCount: Number(metricsRes.data?.coupon_count || 0),
      conversionRate: Number(metricsRes.data?.conversion_rate_pct || 0),
    },
    hourly: safeArray(hourlyRes.data).map((row) => ({
      hour: Number(row.hour_slot || 0),
      label: hourLabel(row.hour_slot),
      scan_count: Number(row.scan_count || 0),
    })),
    tasks: safeArray(tasksRes.data).map((row) => ({
      task_key: row.task_key || 'organik',
      scan_count: Number(row.scan_count || 0),
    })),
    campaigns: safeArray(campaignsRes.data),
  };
}

export async function upsertBusinessCampaign(input) {
  const payload = {
    dkd_param_business_id: input.businessId,
    dkd_param_title: String(input.title || '').trim(),
    dkd_param_sponsor_name: String(input.sponsorName || '').trim() || null,
    dkd_param_stock_limit: Number(input.stockLimit || 0) || 0,
    dkd_param_closes_at: input.closesAt || null,
    dkd_param_starts_at: input.startsAt || null,
    dkd_param_ends_at: input.endsAt || null,
    dkd_param_is_active: input.isActive !== false,
  };

  const rpc = await supabase.rpc('dkd_business_upsert_campaign', payload);
  if (!rpc.error) return rpc.data;

  const fallback = await supabase.from('dkd_business_campaigns').insert({
    business_id: input.businessId,
    title: payload.dkd_param_title,
    sponsor_name: payload.dkd_param_sponsor_name,
    stock_limit: payload.dkd_param_stock_limit,
    closes_at: payload.dkd_param_closes_at,
    starts_at: payload.dkd_param_starts_at,
    ends_at: payload.dkd_param_ends_at,
    is_active: payload.dkd_param_is_active,
  }).select().maybeSingle();

  if (fallback.error) throw fallback.error;
  return fallback.data;
}

export async function logBusinessTraffic({
  businessId,
  playerId,
  dropId,
  sourceType = 'qr',
  taskKey = null,
  qrToken = null,
  codeValue = null,
  bossReward = false,
  meta = null,
}) {
  if (!businessId) return null;

  const payload = {
    dkd_param_business_id: businessId,
    dkd_param_player_id: playerId || null,
    dkd_param_drop_id: dropId || null,
    dkd_param_source_type: String(sourceType || 'qr'),
    dkd_param_task_key: taskKey || null,
    dkd_param_qr_token: qrToken || null,
    dkd_param_code_value: codeValue || null,
    dkd_param_boss_reward: !!bossReward,
    dkd_param_meta: meta || null,
  };

  const rpc = await supabase.rpc('dkd_business_qr_scan_log', payload);
  if (!rpc.error) return rpc.data;

  const insert = await supabase.from('dkd_business_qr_scans').insert({
    business_id: businessId,
    player_id: playerId || null,
    drop_id: dropId || null,
    source_type: String(sourceType || 'qr'),
    task_key: taskKey || null,
    qr_token: qrToken || null,
    code_value: codeValue || null,
    boss_reward: !!bossReward,
    meta: meta || null,
  }).select().maybeSingle();

  if (insert.error) throw insert.error;
  return insert.data;
}

export async function logBusinessCouponUse({
  businessId,
  playerId,
  couponCode,
  taskKey = null,
  campaignId = null,
  meta = null,
}) {
  if (!businessId) return null;

  const payload = {
    dkd_param_business_id: businessId,
    dkd_param_player_id: playerId || null,
    dkd_param_coupon_code: String(couponCode || '').trim() || null,
    dkd_param_task_key: taskKey || null,
    dkd_param_campaign_id: campaignId || null,
    dkd_param_meta: meta || null,
  };

  const rpc = await supabase.rpc('dkd_business_coupon_use_log', payload);
  if (!rpc.error) return rpc.data;

  const insert = await supabase.from('dkd_business_coupon_uses').insert({
    business_id: businessId,
    player_id: playerId || null,
    coupon_code: payload.dkd_param_coupon_code,
    task_key: taskKey || null,
    campaign_id: campaignId || null,
    meta: meta || null,
  }).select().maybeSingle();

  if (insert.error) throw insert.error;
  return insert.data;
}

export async function resolveBusinessIdForDrop(dropId) {
  if (!dropId) return null;
  const { data, error } = await supabase
    .from('dkd_business_drop_links')
    .select('business_id')
    .eq('drop_id', dropId)
    .maybeSingle();

  if (error) return null;
  return data?.business_id || null;
}

export async function emitTrafficFromChestResult({
  sessionUserId,
  drop,
  result,
  sourceType,
  qrText,
  codeText,
}) {
  const dropId = drop?.id || result?.drop_id || null;
  const businessId = result?.business_id || await resolveBusinessIdForDrop(dropId);
  if (!businessId) return null;

  return logBusinessTraffic({
    businessId,
    playerId: sessionUserId || null,
    dropId,
    sourceType: String(sourceType || 'qr'),
    taskKey: result?.task_key || result?.mission_key || result?.source_task_key || null,
    qrToken: qrText || null,
    codeValue: codeText || null,
    bossReward: String(sourceType || '') === 'boss',
    meta: {
      reward_token: Number(result?.token || 0),
      reward_card_def_id: result?.card_def_id || null,
      drop_type: result?.drop_type || drop?.type || null,
    },
  });
}
