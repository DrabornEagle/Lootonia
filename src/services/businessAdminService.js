import { supabase } from '../lib/supabase';

function nullableText(value) {
  const dkd_source_value = String(value ?? '').trim();
  return dkd_source_value === '' ? null : dkd_source_value;
}

function nullableInt(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const dkd_iteration_value = Number(value);
  return Number.isFinite(dkd_iteration_value) ? Math.trunc(dkd_iteration_value) : null;
}

function nullableNumeric(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const dkd_iteration_value = Number(value);
  return Number.isFinite(dkd_iteration_value) ? dkd_iteration_value : null;
}

function nullableBool(value, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeRow(data) {
  if (Array.isArray(data)) return data[0] || null;
  return data && typeof data === 'object' ? data : null;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function slugify(value) {
  return String(value || 'business')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'business';
}

function buildCampaignKey(payload) {
  const businessKey = String(payload?.business_key || payload?.businessId || 'biz').trim().toLowerCase() || 'biz';
  const title = slugify(payload?.title || payload?.campaign_key || 'campaign');
  const suffix = String(Date.now()).slice(-6);
  return `${businessKey}-${title}-${suffix}`;
}

export async function fetchAdminBusinesses(limit = 120) {
  return supabase
    .from('dkd_businesses')
    .select('id,business_key,name,slug,category,address_text,lat,lng,radius_m,is_active,sponsor_enabled,opens_at,closes_at,stock_alert_threshold,updated_at,created_at')
    .order('updated_at', { ascending: false })
    .limit(Math.max(1, Math.min(300, Number(limit) || 120)));
}

export async function upsertAdminBusiness(payload) {
  const { data, error } = await supabase.rpc('dkd_business_admin_upsert', {
    dkd_param_id: payload?.id || null,
    dkd_param_business_key: nullableText(payload?.business_key || payload?.businessKey),
    dkd_param_name: nullableText(payload?.name),
    dkd_param_slug: nullableText(payload?.slug || payload?.name),
    dkd_param_category: nullableText(payload?.category),
    dkd_param_address_text: nullableText(payload?.address_text || payload?.addressText),
    dkd_param_lat: nullableNumeric(payload?.lat),
    dkd_param_lng: nullableNumeric(payload?.lng),
    dkd_param_radius_m: nullableInt(payload?.radius_m ?? payload?.radiusM) ?? 80,
    dkd_param_is_active: nullableBool(payload?.is_active, true),
    dkd_param_sponsor_enabled: nullableBool(payload?.sponsor_enabled, false),
    dkd_param_opens_at: nullableText(payload?.opens_at || payload?.opensAt),
    dkd_param_closes_at: nullableText(payload?.closes_at || payload?.closesAt),
    dkd_param_stock_alert_threshold: nullableInt(payload?.stock_alert_threshold ?? payload?.stockAlertThreshold) ?? 10,
  });

  return {
    data: normalizeRow(data),
    error,
  };
}

export async function fetchBusinessDashboardSnapshot(businessId, limitDays = 7) {
  if (!businessId) {
    return { data: null, error: new Error('business_id_required') };
  }

  const { data, error } = await supabase.rpc('dkd_business_dashboard_snapshot', {
    dkd_param_business_id: businessId,
    dkd_param_limit_days: Math.max(1, Math.min(30, Number(limitDays) || 7)),
  });

  if (error) return { data: null, error };
  const snapshot = normalizeObject(data);
  return {
    data: {
      today: normalizeObject(snapshot.today),
      hours: normalizeArray(snapshot.hours),
      tasks: normalizeArray(snapshot.tasks),
      campaigns: normalizeArray(snapshot.campaigns),
    },
    error: null,
  };
}

export async function upsertAdminBusinessCampaign(payload) {
  const stockTotal = nullableInt(payload?.stock_total ?? payload?.stockTotal) ?? 0;
  const stockLeft = nullableInt(payload?.stock_left ?? payload?.stockLeft);
  const campaignKey = nullableText(payload?.campaign_key || payload?.campaignKey) || buildCampaignKey(payload);

  const { data, error } = await supabase.rpc('dkd_business_campaign_upsert', {
    dkd_param_id: payload?.id ? Number(payload.id) : null,
    dkd_param_business_id: payload?.business_id || payload?.businessId || null,
    dkd_param_campaign_key: campaignKey,
    dkd_param_title: nullableText(payload?.title),
    dkd_param_subtitle: nullableText(payload?.subtitle),
    dkd_param_task_key: nullableText(payload?.task_key || payload?.taskKey),
    dkd_param_source_kind: nullableText(payload?.source_kind || payload?.sourceKind) || 'sponsor',
    dkd_param_starts_at: nullableText(payload?.starts_at || payload?.startsAt) || new Date().toISOString(),
    dkd_param_ends_at: nullableText(payload?.ends_at || payload?.endsAt),
    dkd_param_closes_at: nullableText(payload?.closes_at || payload?.closesAt),
    dkd_param_stock_total: stockTotal,
    dkd_param_stock_left: stockLeft == null ? stockTotal : stockLeft,
    dkd_param_coupon_reward_label: nullableText(payload?.coupon_reward_label || payload?.couponRewardLabel),
    dkd_param_coupon_code_prefix: nullableText(payload?.coupon_code_prefix || payload?.couponCodePrefix),
    dkd_param_is_active: nullableBool(payload?.is_active, true),
    dkd_param_auto_close_on_stock_zero: nullableBool(payload?.auto_close_on_stock_zero, true),
  });

  return {
    data: normalizeRow(data),
    error,
  };
}

export async function logAdminBusinessQrScan(payload) {
  return supabase.rpc('dkd_business_qr_scan_log', {
    dkd_param_business_id: payload?.business_id || payload?.businessId,
    dkd_param_drop_id: payload?.drop_id || payload?.dropId || null,
    dkd_param_campaign_id: payload?.campaign_id ? Number(payload.campaign_id) : payload?.campaignId ? Number(payload.campaignId) : null,
    dkd_param_task_key: nullableText(payload?.task_key || payload?.taskKey),
    dkd_param_source_kind: nullableText(payload?.source_kind || payload?.sourceKind) || 'drop',
    dkd_param_session_key: nullableText(payload?.session_key || payload?.sessionKey),
  });
}

export async function logAdminBusinessCouponUse(payload) {
  return supabase.rpc('dkd_business_coupon_use_log', {
    dkd_param_business_id: payload?.business_id || payload?.businessId,
    dkd_param_campaign_id: payload?.campaign_id ? Number(payload.campaign_id) : payload?.campaignId ? Number(payload.campaignId) : null,
    dkd_param_coupon_code: nullableText(payload?.coupon_code || payload?.couponCode),
    dkd_param_task_key: nullableText(payload?.task_key || payload?.taskKey),
  });
}
