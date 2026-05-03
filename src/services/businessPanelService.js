import { supabase } from '../lib/supabase';

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export async function fetchBusinessDashboardSnapshot(businessId, limitDays = 7) {
  if (!businessId) {
    return {
      data: null,
      error: new Error('business_id_required'),
    };
  }

  const { data, error } = await supabase.rpc('dkd_business_dashboard_snapshot', {
    dkd_param_business_id: businessId,
    dkd_param_limit_days: Math.max(1, Number(limitDays) || 7),
  });

  if (error) {
    return { data: null, error };
  }

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

export async function logBusinessQrScan({
  businessId,
  dropId = null,
  campaignId = null,
  taskKey = null,
  sourceKind = 'drop',
  sessionKey = null,
}) {
  return supabase.rpc('dkd_business_qr_scan_log', {
    dkd_param_business_id: businessId,
    dkd_param_drop_id: dropId,
    dkd_param_campaign_id: campaignId,
    dkd_param_task_key: taskKey,
    dkd_param_source_kind: sourceKind,
    dkd_param_session_key: sessionKey,
  });
}

export async function logBusinessCouponUse({
  businessId,
  campaignId = null,
  couponCode = null,
  taskKey = null,
}) {
  return supabase.rpc('dkd_business_coupon_use_log', {
    dkd_param_business_id: businessId,
    dkd_param_campaign_id: campaignId,
    dkd_param_coupon_code: couponCode,
    dkd_param_task_key: taskKey,
  });
}
