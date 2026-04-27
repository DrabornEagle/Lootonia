import { supabase } from '../lib/supabase';
import { fetchAllDropsForAdmin } from './dropService';

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function startOfDayIso(daysAgo = 0) {
  const dkd_day_value = new Date();
  dkd_day_value.setUTCDate(dkd_day_value.getUTCDate() - Number(daysAgo || 0));
  dkd_day_value.setUTCHours(0, 0, 0, 0);
  return dkd_day_value.toISOString();
}

function hourLabel(hour) {
  const dkd_hash_value = Number(hour || 0);
  return `${String(dkd_hash_value).padStart(2, '0')}:00`;
}

function sanitizeSlug(value, fallback = 'business') {
  const raw = String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return raw || `business-${String(Date.now()).slice(-6)}`;
}

function buildCouponCode(prefix = 'DKD') {
  return `${String(prefix || 'DKD').trim().toUpperCase()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

function toIsoOrNull(value) {
  const raw = String(value || '').trim();
  return raw ? raw : null;
}


async function enrichClaimCampaignCouponResult(dkd_claim_result) {
  if (!dkd_claim_result?.ok) return dkd_claim_result || { ok: false, reason: 'claim_failed' };
  if (dkd_claim_result?.coupon_code && dkd_claim_result?.business_name && dkd_claim_result?.campaign_title) {
    return dkd_claim_result;
  }

  const dkd_coupon_code = String(dkd_claim_result?.coupon_code || '').trim().toUpperCase();
  const dkd_coupon_id = dkd_claim_result?.coupon_id || null;

  let dkd_coupon_query = supabase
    .from('dkd_business_coupons')
    .select('id, business_id, campaign_id, coupon_code, status, issued_at, created_at, dkd_businesses(name), dkd_business_campaigns(title, reward_label, stock_limit, redeemed_count)')
    .limit(1);

  if (dkd_coupon_id) {
    dkd_coupon_query = dkd_coupon_query.eq('id', dkd_coupon_id);
  } else if (dkd_coupon_code) {
    dkd_coupon_query = dkd_coupon_query.eq('coupon_code', dkd_coupon_code);
  } else {
    return dkd_claim_result;
  }

  const { data: dkd_coupon_row, error: dkd_coupon_error } = await dkd_coupon_query.maybeSingle();
  if (dkd_coupon_error || !dkd_coupon_row) return dkd_claim_result;

  const dkd_campaign_row = dkd_coupon_row?.dkd_business_campaigns || {};
  const dkd_business_row = dkd_coupon_row?.dkd_businesses || {};
  const dkd_live_stock_left = Math.max(
    0,
    Number(dkd_campaign_row?.stock_limit || 0) - Number(dkd_campaign_row?.redeemed_count || 0)
  );

  return {
    ...dkd_claim_result,
    coupon_id: dkd_claim_result?.coupon_id || dkd_coupon_row?.id || null,
    coupon_code: dkd_claim_result?.coupon_code || dkd_coupon_row?.coupon_code || null,
    business_id: dkd_claim_result?.business_id || dkd_coupon_row?.business_id || null,
    business_name: dkd_claim_result?.business_name || dkd_business_row?.name || 'İşletme',
    campaign_id: dkd_claim_result?.campaign_id || dkd_coupon_row?.campaign_id || null,
    campaign_title: dkd_claim_result?.campaign_title || dkd_campaign_row?.title || 'Kampanya',
    reward_label: dkd_claim_result?.reward_label || dkd_campaign_row?.reward_label || 'Sponsor Ödülü',
    stock_left: dkd_claim_result?.stock_left ?? dkd_live_stock_left,
    status: dkd_claim_result?.status || dkd_coupon_row?.status || 'issued',
  };
}

export async function fetchBusinesses() {
  const { data, error } = await supabase
    .from('dkd_businesses')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return safeArray(data);
}

export async function fetchBusinessDropsLite() {
  const res = await fetchAllDropsForAdmin();
  if (res?.error) throw res.error;
  return safeArray(res?.data);
}

export async function fetchBusinessDashboard(businessId) {
  if (!businessId) {
    return {
      today: { uniquePlayers: 0, scanCount: 0, couponCount: 0, conversionRate: 0, newPlayers: 0, returningPlayers: 0 },
      hourly: [],
      tasks: [],
      daily: [],
      campaigns: [],
      linkedDrops: [],
      recentCoupons: [],
      recentUses: [],
      products: [],
    };
  }

  const min7d = startOfDayIso(6).slice(0, 10);
  const today = todayStr();

  const [todayRes, hourlyRes, tasksRes, dailyRes, campaignsRes, linksRes, couponsRes, campaignCouponCountsRes, usesRes, productsRes] = await Promise.all([
    supabase
      .from('dkd_business_today_metrics')
      .select('*')
      .eq('business_id', businessId)
      .maybeSingle(),
    supabase
      .from('dkd_business_hourly_heatmap')
      .select('*')
      .eq('business_id', businessId)
      .eq('bucket_day', today)
      .order('hour_slot', { ascending: true }),
    supabase
      .from('dkd_business_task_attribution')
      .select('*')
      .eq('business_id', businessId)
      .eq('bucket_day', today)
      .order('scan_count', { ascending: false }),
    supabase
      .from('dkd_business_daily_metrics')
      .select('*')
      .eq('business_id', businessId)
      .gte('bucket_day', min7d)
      .order('bucket_day', { ascending: true }),
    supabase
      .from('dkd_business_campaigns')
      .select('*')
      .eq('business_id', businessId)
      .order('updated_at', { ascending: false }),
    supabase
      .from('dkd_business_drop_links')
      .select('id, drop_id, is_primary, traffic_weight, dkd_drops(id, name, type, is_active)')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false }),
    supabase
      .from('dkd_business_coupons')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('dkd_business_coupons')
      .select('campaign_id,status')
      .eq('business_id', businessId),
    supabase
      .from('dkd_business_coupon_uses')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('dkd_business_market_products')
      .select('*')
      .eq('business_id', businessId)
      .order('sort_order', { ascending: true })
      .order('updated_at', { ascending: false }),
  ]);

  const errors = [todayRes, hourlyRes, tasksRes, dailyRes, campaignsRes, linksRes, couponsRes, campaignCouponCountsRes, usesRes, productsRes]
    .map((res) => res?.error)
    .filter(Boolean);
  if (errors.length) throw errors[0];

  const couponCountMap = safeArray(campaignCouponCountsRes?.data).reduce((acc, row) => {
    const campaignId = row?.campaign_id;
    if (!campaignId) return acc;
    const status = String(row?.status || '').toLowerCase();
    if (status !== 'issued' && status !== 'redeemed') return acc;
    acc.set(String(campaignId), (acc.get(String(campaignId)) || 0) + 1);
    return acc;
  }, new Map());

  const dailyRows = safeArray(dailyRes?.data).map((row) => ({
    bucket_day: row.bucket_day,
    label: String(row.bucket_day || '').slice(5),
    scan_count: Number(row.scan_count || 0),
    unique_players: Number(row.unique_players || 0),
    coupon_count: Number(row.coupon_count || 0),
  }));

  const hourlyMap = new Map(safeArray(hourlyRes?.data).map((row) => [Number(row.hour_slot || 0), Number(row.scan_count || 0)]));
  const hourly = Array.from({ length: 24 }).map((_, hour) => ({
    hour,
    label: hourLabel(hour),
    scan_count: hourlyMap.get(hour) || 0,
  }));

  return {
    today: {
      uniquePlayers: Number(todayRes?.data?.unique_players || 0),
      scanCount: Number(todayRes?.data?.scan_count || 0),
      couponCount: Number(todayRes?.data?.coupon_count || 0),
      conversionRate: Number(todayRes?.data?.conversion_rate_pct || 0),
      newPlayers: Number(todayRes?.data?.new_players || 0),
      returningPlayers: Number(todayRes?.data?.returning_players || 0),
    },
    hourly,
    tasks: safeArray(tasksRes?.data).map((row) => ({
      task_key: row.task_key || 'organik',
      scan_count: Number(row.scan_count || 0),
    })),
    daily: dailyRows,
    campaigns: safeArray(campaignsRes?.data).map((row) => {
      const liveUsed = couponCountMap.get(String(row?.id || '')) || 0;
      const redeemedCount = Math.max(Number(row?.redeemed_count || 0), liveUsed);
      return {
        ...row,
        redeemed_count: redeemedCount,
        stock_left: Math.max(0, Number(row?.stock_limit || 0) - redeemedCount),
      };
    }),
    linkedDrops: safeArray(linksRes?.data).map((row) => ({
      id: row.id,
      drop_id: row.drop_id,
      is_primary: !!row.is_primary,
      traffic_weight: Number(row.traffic_weight || 1),
      drop_name: row?.dkd_drops?.name || `Drop ${String(row.drop_id || '').slice(0, 8)}`,
      drop_type: row?.dkd_drops?.type || 'map',
      drop_active: !!row?.dkd_drops?.is_active,
    })),
    recentCoupons: safeArray(couponsRes?.data),
    recentUses: safeArray(usesRes?.data),
    products: safeArray(productsRes?.data).map((row) => ({
      ...row,
      price_amount: Number(row?.price_amount || 0),
      discounted_price_amount: row?.discounted_price_amount == null ? null : Number(row.discounted_price_amount),
      stock_quantity: Number(row?.stock_quantity || 0),
      sort_order: Number(row?.sort_order || 0),
    })),
  };
}

export async function upsertBusiness(input) {
  const id = String(input?.id || '').trim() || null;
  const row = {
    slug: sanitizeSlug(input?.slug || input?.name || 'business'),
    name: String(input?.name || '').trim() || 'Yeni İşletme',
    category: String(input?.category || 'general').trim() || 'general',
    city: String(input?.city || 'Ankara').trim() || 'Ankara',
    district: String(input?.district || '').trim() || null,
    address_text: String(input?.addressText || '').trim() || null,
    sponsor_name: String(input?.sponsorName || '').trim() || null,
    opens_at: String(input?.opensAt || '').trim() || null,
    closes_at: String(input?.closesAt || '').trim() || null,
    daily_scan_goal: Math.max(0, Number(input?.dailyScanGoal || 0) || 0),
    is_active: input?.isActive !== false,
    lat: input?.lat == null || input?.lat === '' ? null : Number(input.lat),
    lng: input?.lng == null || input?.lng === '' ? null : Number(input.lng),
    radius_m: Math.max(20, Number(input?.radiusM || input?.radius_m || 80) || 80),
    meta: input?.meta || {},
  };

  let rpc = await supabase.rpc('dkd_business_admin_upsert', {
    dkd_business_id: id,
    dkd_slug: row.slug,
    dkd_name: row.name,
    dkd_category: row.category,
    dkd_city: row.city,
    dkd_district: row.district,
    dkd_address_text: row.address_text,
    dkd_sponsor_name: row.sponsor_name,
    dkd_daily_scan_goal: row.daily_scan_goal || 40,
    dkd_is_active: row.is_active,
    dkd_opens_at: row.opens_at,
    dkd_closes_at: row.closes_at,
    dkd_lat: Number.isFinite(row.lat) ? row.lat : null,
    dkd_lng: Number.isFinite(row.lng) ? row.lng : null,
    dkd_radius_m: row.radius_m,
    dkd_meta: row.meta,
  });
  if (rpc.error && String(rpc.error?.message || '').toLowerCase().includes('schema cache')) {
    rpc = await supabase.rpc('dkd_business_admin_upsert', {
      dkd_param_business_id: id,
      dkd_param_slug: row.slug,
      dkd_param_name: row.name,
      dkd_param_category: row.category,
      dkd_param_city: row.city,
      dkd_param_district: row.district,
      dkd_param_address_text: row.address_text,
      dkd_param_sponsor_name: row.sponsor_name,
      dkd_param_daily_scan_goal: row.daily_scan_goal || 40,
      dkd_param_is_active: row.is_active,
      dkd_param_opens_at: row.opens_at,
      dkd_param_closes_at: row.closes_at,
      dkd_param_lat: Number.isFinite(row.lat) ? row.lat : null,
      dkd_param_lng: Number.isFinite(row.lng) ? row.lng : null,
      dkd_param_radius_m: row.radius_m,
      dkd_param_meta: row.meta,
    });
  }

  const { data, error } = rpc;

  if (!rpc.error) return rpc.data;

  if (id) {
    const updated = await supabase.from('dkd_businesses').update(row).eq('id', id).select('*').maybeSingle();
    if (updated.error) throw updated.error;
    return updated?.data?.id || id;
  }

  const inserted = await supabase.from('dkd_businesses').insert(row).select('*').maybeSingle();
  if (inserted.error) throw inserted.error;
  return inserted?.data?.id || null;
}

export async function linkDropToBusiness({ businessId, dropId, isPrimary = true, trafficWeight = 1 }) {
  const rpc = await supabase.rpc('dkd_business_link_drop', {
    dkd_param_business_id: businessId,
    dkd_param_drop_id: dropId,
    dkd_param_is_primary: !!isPrimary,
    dkd_param_traffic_weight: Number(trafficWeight || 1) || 1,
  });
  if (!rpc.error) return rpc.data;

  const fallback = await supabase
    .from('dkd_business_drop_links')
    .upsert({
      business_id: businessId,
      drop_id: dropId,
      is_primary: !!isPrimary,
      traffic_weight: Number(trafficWeight || 1) || 1,
    }, { onConflict: 'drop_id' })
    .select('*')
    .maybeSingle();

  if (fallback.error) throw fallback.error;
  return fallback?.data?.id || null;
}


export async function unlinkDropFromBusiness({ businessId, dropId }) {
  if (!businessId || !dropId) return null;

  const fallback = await supabase
    .from('dkd_business_drop_links')
    .delete()
    .eq('business_id', businessId)
    .eq('drop_id', dropId)
    .select('id')
    .maybeSingle();

  if (fallback.error) throw fallback.error;
  return fallback?.data?.id || true;
}

export async function upsertBusinessCampaign(input) {
  const id = String(input?.id || '').trim() || null;
  const dkd_start_value = toIsoOrNull(input?.startsAt);
  const dkd_end_value = toIsoOrNull(input?.endsAt);
  const dkd_close_value = toIsoOrNull(input?.closesAt);
  const dkd_insert_start_value = dkd_start_value || new Date().toISOString();

  const rpc = await supabase.rpc('dkd_business_campaign_upsert', {
    dkd_param_campaign_id: id,
    dkd_param_business_id: input?.businessId,
    dkd_param_title: String(input?.title || '').trim() || 'Yeni Kampanya',
    dkd_param_sponsor_name: String(input?.sponsorName || '').trim() || null,
    dkd_param_reward_label: String(input?.rewardLabel || '').trim() || 'Sponsor Ödülü',
    dkd_param_coupon_prefix: String(input?.couponPrefix || '').trim() || 'DKD',
    dkd_param_stock_limit: Math.max(0, Number(input?.stockLimit || 0) || 0),
    dkd_param_redeemed_count: Math.max(0, Number(input?.redeemedCount || 0) || 0),
    dkd_param_starts_at: id ? dkd_start_value : dkd_insert_start_value,
    dkd_param_ends_at: dkd_end_value,
    dkd_param_closes_at: dkd_close_value,
    dkd_param_is_active: input?.isActive !== false,
    dkd_param_meta: input?.meta || {},
  });
  if (!rpc.error) return rpc.data;

  const row = {
    business_id: input?.businessId,
    title: String(input?.title || '').trim() || 'Yeni Kampanya',
    sponsor_name: String(input?.sponsorName || '').trim() || null,
    reward_label: String(input?.rewardLabel || '').trim() || 'Sponsor Ödülü',
    coupon_prefix: String(input?.couponPrefix || '').trim().toUpperCase() || 'DKD',
    stock_limit: Math.max(0, Number(input?.stockLimit || 0) || 0),
    redeemed_count: Math.max(0, Number(input?.redeemedCount || 0) || 0),
    ends_at: dkd_end_value,
    closes_at: dkd_close_value,
    is_active: input?.isActive !== false,
    meta: input?.meta || {},
  };

  if (id) {
    if (dkd_start_value) row.starts_at = dkd_start_value;
    const updated = await supabase.from('dkd_business_campaigns').update(row).eq('id', id).select('*').maybeSingle();
    if (updated.error) throw updated.error;
    return updated?.data?.id || id;
  }

  row.starts_at = dkd_insert_start_value;
  const inserted = await supabase.from('dkd_business_campaigns').insert(row).select('*').maybeSingle();
  if (inserted.error) throw inserted.error;
  return inserted?.data?.id || null;
}

export async function deleteBusinessCampaign({ businessId, campaignId }) {
  const dkd_campaign_id_text = String(campaignId || '').trim();
  if (!businessId || !dkd_campaign_id_text) return null;

  const rpc = await supabase.rpc('dkd_business_delete_campaign', {
    dkd_param_business_id: businessId,
    dkd_param_campaign_id: dkd_campaign_id_text,
  });
  if (!rpc.error) return rpc.data;

  let fallback = await supabase
    .from('dkd_business_campaigns')
    .delete()
    .eq('business_id', businessId)
    .eq('id', dkd_campaign_id_text)
    .select('id');

  if (fallback.error && /^\d+$/.test(dkd_campaign_id_text)) {
    fallback = await supabase
      .from('dkd_business_campaigns')
      .delete()
      .eq('business_id', businessId)
      .eq('id', Number(dkd_campaign_id_text))
      .select('id');
  }

  if (fallback.error) throw fallback.error;
  return { ok: true, campaign_id: dkd_campaign_id_text, deleted_count: Array.isArray(fallback.data) ? fallback.data.length : 0 };
}

export async function issueBusinessCoupon(input) {
  const codeHint = String(input?.couponCode || '').trim().toUpperCase();
  const rpc = await supabase.rpc('dkd_business_issue_coupon', {
    dkd_param_business_id: input?.businessId,
    dkd_param_campaign_id: input?.campaignId || null,
    dkd_param_player_id: input?.playerId || null,
    dkd_param_task_key: String(input?.taskKey || '').trim() || null,
    dkd_param_coupon_code: codeHint || null,
    dkd_param_expires_at: toIsoOrNull(input?.expiresAt),
    dkd_param_meta: input?.meta || {},
  });
  if (!rpc.error) return rpc.data;

  const generatedCode = codeHint || buildCouponCode(input?.couponPrefix || 'DKD');
  const inserted = await supabase.from('dkd_business_coupons').insert({
    business_id: input?.businessId,
    campaign_id: input?.campaignId || null,
    player_id: input?.playerId || null,
    coupon_code: generatedCode,
    task_key: String(input?.taskKey || '').trim() || null,
    expires_at: toIsoOrNull(input?.expiresAt),
    meta: input?.meta || {},
  }).select('*').maybeSingle();

  if (inserted.error) throw inserted.error;
  return inserted?.data?.coupon_code || generatedCode;
}

export async function redeemBusinessCoupon(input) {
  const rpc = await supabase.rpc('dkd_business_redeem_coupon', {
    dkd_param_business_id: input?.businessId,
    dkd_param_coupon_code: String(input?.couponCode || '').trim().toUpperCase(),
    dkd_param_note: String(input?.note || '').trim() || null,
  });
  if (rpc.error) throw rpc.error;
  return rpc.data;
}

export async function logBusinessTraffic({
  businessId,
  playerId = null,
  dropId = null,
  sourceType = 'qr',
  taskKey = null,
  qrToken = null,
  codeValue = null,
  bossReward = false,
  meta = null,
}) {
  if (!businessId) return null;
  const rpc = await supabase.rpc('dkd_business_qr_scan_log', {
    dkd_param_business_id: businessId,
    dkd_param_player_id: playerId,
    dkd_param_drop_id: dropId,
    dkd_param_source_type: String(sourceType || 'qr'),
    dkd_param_task_key: taskKey || null,
    dkd_param_qr_token: qrToken || null,
    dkd_param_code_value: codeValue || null,
    dkd_param_boss_reward: !!bossReward,
    dkd_param_meta: meta || {},
  });
  if (rpc.error) throw rpc.error;
  return rpc.data;
}

export async function logBusinessCouponUse({
  businessId,
  playerId = null,
  couponCode = null,
  taskKey = null,
  campaignId = null,
  couponId = null,
  meta = null,
}) {
  if (!businessId) return null;
  const rpc = await supabase.rpc('dkd_business_coupon_use_log', {
    dkd_param_business_id: businessId,
    dkd_param_player_id: playerId,
    dkd_param_coupon_code: String(couponCode || '').trim().toUpperCase() || null,
    dkd_param_task_key: taskKey || null,
    dkd_param_campaign_id: campaignId || null,
    dkd_param_coupon_id: couponId || null,
    dkd_param_meta: meta || {},
  });
  if (rpc.error) throw rpc.error;
  return rpc.data;
}

export async function resolveBusinessIdForDrop(dropId) {
  if (!dropId) return null;
  const { data, error } = await supabase
    .from('dkd_business_context_by_drop')
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
  if (!dropId) return null;

  const rpc = await supabase.rpc('dkd_business_qr_scan_log_by_drop', {
    dkd_param_drop_id: dropId,
    dkd_param_player_id: sessionUserId || null,
    dkd_param_source_type: String(sourceType || 'qr'),
    dkd_param_task_key: result?.task_key || result?.mission_key || result?.source_task_key || null,
    dkd_param_qr_token: qrText || null,
    dkd_param_code_value: codeText || null,
    dkd_param_boss_reward: String(sourceType || '') === 'boss',
    dkd_param_meta: {
      reward_token: Number(result?.token || 0),
      reward_card_def_id: result?.card_def_id || null,
      drop_type: result?.drop_type || drop?.type || null,
    },
  });

  if (!rpc.error) return rpc.data;

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

export async function createBusinessAccessCode({ businessId, roleKey = 'manager', label = '' }) {
  const rpc = await supabase.rpc('dkd_business_create_access_code', {
    dkd_param_business_id: businessId,
    dkd_param_role_key: String(roleKey || 'manager').trim() || 'manager',
    dkd_param_label: String(label || '').trim() || null,
  });
  if (rpc.error) throw rpc.error;
  return String(rpc.data || '');
}


export async function updateBusinessMemberLocation({ businessId, addressText = '', lat = null, lng = null, radiusM = 80 }) {
  let res = await supabase.rpc('dkd_business_member_update_location', {
    dkd_business_id: businessId,
    dkd_address_text: String(addressText || '').trim() || null,
    dkd_lat: lat == null || lat === '' ? null : Number(lat),
    dkd_lng: lng == null || lng === '' ? null : Number(lng),
    dkd_radius_m: Math.max(20, Number(radiusM || 80) || 80),
  });
  if (res?.error && String(res.error?.message || '').toLowerCase().includes('schema cache')) {
    res = await supabase.rpc('dkd_business_member_update_location', {
      dkd_param_business_id: businessId,
      dkd_param_address_text: String(addressText || '').trim() || null,
      dkd_param_lat: lat == null || lat === '' ? null : Number(lat),
      dkd_param_lng: lng == null || lng === '' ? null : Number(lng),
      dkd_param_radius_m: Math.max(20, Number(radiusM || 80) || 80),
    });
  }
  if (res?.error) throw res.error;
  return res.data;
}

export async function claimBusinessAccessCode(code) {
  const rpc = await supabase.rpc('dkd_business_claim_access_code', {
    dkd_param_access_code: String(code || '').trim().toUpperCase(),
  });
  if (rpc.error) throw rpc.error;
  return rpc.data || { ok: false, reason: 'claim_failed' };
}

export async function fetchMyBusinessMemberships() {
  const auth = await supabase.auth.getUser();
  const userId = auth?.data?.user?.id || null;
  if (!userId) return [];

  const { data, error } = await supabase
    .from('dkd_business_memberships')
    .select('id, business_id, role_key, is_active, dkd_businesses(*)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return safeArray(data)
    .map((row) => ({
      membership_id: row.id,
      business_id: row.business_id,
      role_key: row.role_key || 'manager',
      is_active: row.is_active !== false,
      ...(row?.dkd_businesses || {}),
    }))
    .filter((row) => !!row.business_id);
}


export async function claimPlayerCampaignCouponByDrop({
  dropId,
  taskKey = null,
  sourceType = 'qr',
  meta = {},
}) {
  if (!dropId) return { ok: false, reason: 'drop_required' };
  const rpc = await supabase.rpc('dkd_player_claim_campaign_coupon_by_drop', {
    dkd_param_drop_id: dropId,
    dkd_param_task_key: taskKey || null,
    dkd_param_source_type: String(sourceType || 'qr'),
    dkd_param_meta: meta || {},
  });
  if (rpc.error) throw rpc.error;
  return enrichClaimCampaignCouponResult(rpc.data || { ok: false, reason: 'claim_failed' });
}

export async function fetchMyPlayerCoupons() {
  const rpc = await supabase.rpc('dkd_player_my_business_coupons');
  if (!rpc.error) return safeArray(rpc.data);
  const auth = await supabase.auth.getUser();
  const userId = auth?.data?.user?.id || null;
  if (!userId) return [];
  const { data, error } = await supabase
    .from('dkd_business_coupons')
    .select('id, business_id, campaign_id, player_id, coupon_code, task_key, status, issued_at, redeemed_at, expires_at, created_at, dkd_businesses(name, city, district), dkd_business_campaigns(title, reward_label, sponsor_name)')
    .eq('player_id', userId)
    .order('issued_at', { ascending: false });
  if (error) throw error;
  return safeArray(data).map((row) => ({
    id: row.id,
    business_id: row.business_id,
    campaign_id: row.campaign_id,
    coupon_code: row.coupon_code,
    task_key: row.task_key,
    status: row.status || 'issued',
    issued_at: row.issued_at || row.created_at,
    redeemed_at: row.redeemed_at || null,
    expires_at: row.expires_at || null,
    business_name: row?.dkd_businesses?.name || 'İşletme',
    city: row?.dkd_businesses?.city || null,
    district: row?.dkd_businesses?.district || null,
    campaign_title: row?.dkd_business_campaigns?.title || 'Kampanya',
    reward_label: row?.dkd_business_campaigns?.reward_label || 'Sponsor Ödülü',
    sponsor_name: row?.dkd_business_campaigns?.sponsor_name || null,
  }));
}


export async function fetchBusinessProducts(businessId) {
  if (!businessId) return [];
  const { data, error } = await supabase
    .from('dkd_business_market_products')
    .select('*')
    .eq('business_id', businessId)
    .order('sort_order', { ascending: true })
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return safeArray(data).map((row) => ({
    ...row,
    price_amount: Number(row?.price_amount || 0),
    discounted_price_amount: row?.discounted_price_amount == null ? null : Number(row.discounted_price_amount),
    stock_quantity: Number(row?.stock_quantity || 0),
    sort_order: Number(row?.sort_order || 0),
  }));
}

export async function upsertBusinessMarketProduct(input) {
  const id = String(input?.id || '').trim() || null;
  const businessId = String(input?.businessId || '').trim() || null;
  if (!businessId) throw new Error('business_id_required');

  const row = {
    business_id: businessId,
    name: String(input?.name || '').trim() || 'Yeni Ürün',
    description: String(input?.description || '').trim() || null,
    image_url: String(input?.imageUrl || '').trim() || null,
    category: String(input?.category || 'general').trim() || 'general',
    currency_code: String(input?.currencyCode || 'TRY').trim().toUpperCase() || 'TRY',
    price_amount: Math.max(0, Number(input?.priceAmount || 0) || 0),
    discounted_price_amount: input?.discountedPriceAmount === '' || input?.discountedPriceAmount == null
      ? null
      : Math.max(0, Number(input?.discountedPriceAmount || 0) || 0),
    stock_quantity: Math.max(0, Number(input?.stockQuantity || 0) || 0),
    sort_order: Number(input?.sortOrder || 0) || 0,
    is_active: input?.isActive !== false,
    meta: input?.meta || {},
  };

  const rpc = await supabase.rpc('dkd_business_market_product_upsert', {
    dkd_param_product_id: id,
    dkd_param_business_id: businessId,
    dkd_param_name: row.name,
    dkd_param_description: row.description,
    dkd_param_image_url: row.image_url,
    dkd_param_category: row.category,
    dkd_param_currency_code: row.currency_code,
    dkd_param_price_amount: row.price_amount,
    dkd_param_discounted_price_amount: row.discounted_price_amount,
    dkd_param_stock_quantity: row.stock_quantity,
    dkd_param_sort_order: row.sort_order,
    dkd_param_is_active: row.is_active,
    dkd_param_meta: row.meta,
  });
  if (!rpc.error) return rpc.data;

  if (id) {
    const updated = await supabase
      .from('dkd_business_market_products')
      .update(row)
      .eq('id', id)
      .eq('business_id', businessId)
      .select('*')
      .maybeSingle();
    if (updated.error) throw updated.error;
    return updated?.data?.id || id;
  }

  const inserted = await supabase
    .from('dkd_business_market_products')
    .insert(row)
    .select('*')
    .maybeSingle();
  if (inserted.error) throw inserted.error;
  return inserted?.data?.id || null;
}

export async function archiveBusinessMarketProduct({ productId, businessId }) {
  const id = String(productId || '').trim() || null;
  if (!id) throw new Error('product_id_required');

  const rpc = await supabase.rpc('dkd_business_market_product_archive', {
    dkd_param_product_id: id,
    dkd_param_business_id: businessId || null,
  });
  if (!rpc.error) return rpc.data;

  const updated = await supabase
    .from('dkd_business_market_products')
    .update({ is_active: false })
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (updated.error) throw updated.error;
  return updated?.data?.id || id;
}
