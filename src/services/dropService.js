import { supabase } from '../lib/supabase';

const DROP_SELECT =
  'id,name,type,lat,lng,radius_m,cooldown_seconds,is_active,qr_secret,created_at';

function toNum(dkd_value, fallback = null) {
  if (dkd_value === null || dkd_value === undefined || dkd_value === '') return fallback;
  const dkd_iteration_value = Number(dkd_value);
  return Number.isFinite(dkd_iteration_value) ? dkd_iteration_value : fallback;
}

function normalizeDropRow(row) {
  if (!row) return row;
  return {
    ...row,
    id: row.id,
    name: String(row.name || ''),
    type: String(row.type || 'map').toLowerCase(),
    lat: toNum(row.lat, null),
    lng: toNum(row.lng, null),
    radius_m: toNum(row.radius_m, 60),
    cooldown_seconds: toNum(row.cooldown_seconds, 900),
    is_active: !!row.is_active,
    qr_secret: row.qr_secret ? String(row.qr_secret) : null,
    has_active_campaign: !!row.has_active_campaign,
    campaign_title: row.campaign_title ? String(row.campaign_title) : null,
    business_name: row.business_name ? String(row.business_name) : null,
    reward_badge_label: row.reward_badge_label ? String(row.reward_badge_label) : null,
    campaign_stock_left: toNum(row.campaign_stock_left, 0),
    campaign_expires_at: row.campaign_expires_at ? String(row.campaign_expires_at) : null,
    campaign_players_today: toNum(row.campaign_players_today, 0),
    campaign_players_total: toNum(row.campaign_players_total, toNum(row.campaign_players_today, 0)),
  };
}

function isCampaignActive(campaign) {
  if (!campaign || !campaign.is_active) return false;
  const now = Date.now();
  const startsAt = campaign.starts_at ? Date.parse(campaign.starts_at) : null;
  const endsAt = campaign.ends_at ? Date.parse(campaign.ends_at) : null;
  const closesAt = campaign.closes_at ? Date.parse(campaign.closes_at) : null;
  if (Number.isFinite(startsAt) && now < startsAt) return false;
  if (Number.isFinite(endsAt) && now > endsAt) return false;
  if (Number.isFinite(closesAt) && now > closesAt) return false;
  const stockLimit = Number(campaign.stock_limit);
  const redeemedCount = Number(campaign.redeemed_count || 0);
  if (Number.isFinite(stockLimit) && stockLimit > 0 && redeemedCount >= stockLimit) return false;
  return true;
}

function buildSizedMapFromSetMap(dkd_source_map) {
  return new Map(
    Array.from(dkd_source_map.entries()).map(([dkd_map_key, dkd_map_value]) => [dkd_map_key, dkd_map_value.size])
  );
}

function resolveCampaignPlayerTotal(dkd_campaign_counts, dkd_campaign_key, dkd_business_key) {
  return dkd_campaign_counts.byCampaign.get(dkd_campaign_key) || dkd_campaign_counts.byBusiness.get(dkd_business_key) || 0;
}

function resolveCampaignPlayerToday(dkd_rpc_row, dkd_fallback_today_total = 0) {
  return Math.max(toNum(dkd_rpc_row?.campaign_players_today, 0), toNum(dkd_fallback_today_total, 0));
}

function resolveCampaignPlayerAllTime(dkd_rpc_row, dkd_fallback_total = 0, dkd_today_total = 0) {
  return Math.max(toNum(dkd_rpc_row?.campaign_players_total, 0), toNum(dkd_fallback_total, 0), toNum(dkd_today_total, 0));
}

function resolveCampaignStockLeft({
  dkd_live_stock_left = null,
  dkd_stock_limit = 0,
  dkd_redeemed_count = 0,
  dkd_live_player_total = 0,
}) {
  const dkd_exact_live_stock = toNum(dkd_live_stock_left, null);
  if (dkd_exact_live_stock != null) return Math.max(0, dkd_exact_live_stock);

  const dkd_stock_limit_value = Math.max(0, toNum(dkd_stock_limit, 0) || 0);
  if (!dkd_stock_limit_value) return 0;
  const dkd_live_used_count = Math.max(toNum(dkd_redeemed_count, 0) || 0, toNum(dkd_live_player_total, 0) || 0);
  return Math.max(0, dkd_stock_limit_value - dkd_live_used_count);
}

async function fetchCampaignPlayerCounts() {
  try {
    const { data, error } = await supabase
      .from('dkd_business_coupons')
      .select('business_id,campaign_id,player_id,status');
    if (error) return { byCampaign: new Map(), byBusiness: new Map() };

    const byCampaign = new Map();
    const byBusiness = new Map();
    for (const row of data || []) {
      const dkd_status = String(row?.status || 'issued').toLowerCase();
      if (dkd_status && !['issued', 'redeemed'].includes(dkd_status)) continue;
      const dkd_business_key = String(row?.business_id || '');
      const dkd_campaign_key = String(row?.campaign_id || '');
      const dkd_player_key = String(row?.player_id || '');
      if (!dkd_player_key) continue;
      if (dkd_campaign_key) {
        if (!byCampaign.has(dkd_campaign_key)) byCampaign.set(dkd_campaign_key, new Set());
        byCampaign.get(dkd_campaign_key).add(dkd_player_key);
      }
      if (dkd_business_key) {
        if (!byBusiness.has(dkd_business_key)) byBusiness.set(dkd_business_key, new Set());
        byBusiness.get(dkd_business_key).add(dkd_player_key);
      }
    }

    return {
      byCampaign: buildSizedMapFromSetMap(byCampaign),
      byBusiness: buildSizedMapFromSetMap(byBusiness),
    };
  } catch (dkd_unused_error) {
    return { byCampaign: new Map(), byBusiness: new Map() };
  }
}

async function fetchCampaignPublicMetaIndex() {
  try {
    const [rpc, dkd_player_counts] = await Promise.all([supabase.rpc('dkd_drop_campaign_public_meta'), fetchCampaignPlayerCounts()]);
    if (rpc?.error) {
      return { index: new Map(), error: rpc.error };
    }

    const index = new Map();
    for (const row of rpc?.data || []) {
      const dropId = String(row?.drop_id || '');
      if (!dropId) continue;

      const dkd_campaign_key = String(row?.campaign_id || '');
      const dkd_business_key = String(row?.business_id || '');
      const dkd_player_total = resolveCampaignPlayerTotal(dkd_player_counts, dkd_campaign_key, dkd_business_key);
      const dkd_player_today = resolveCampaignPlayerToday(row);
      const candidate = {
        has_active_campaign: true,
        campaign_title: row?.campaign_title ? String(row.campaign_title) : 'Aktif kampanya',
        business_name: row?.business_name ? String(row.business_name) : '',
        reward_badge_label: row?.reward_badge_label ? String(row.reward_badge_label) : 'ÖDÜL',
        campaign_stock_left: resolveCampaignStockLeft({
          dkd_live_stock_left: row?.campaign_stock_left,
          dkd_live_player_total: dkd_player_total,
        }),
        campaign_expires_at: row?.campaign_expires_at ? String(row.campaign_expires_at) : null,
        campaign_players_today: dkd_player_today,
        campaign_players_total: resolveCampaignPlayerAllTime(row, dkd_player_total, dkd_player_today),
        _weight: Number(row?.traffic_weight || 1),
        _is_primary: !!row?.is_primary,
      };

      const previous = index.get(dropId);
      if (!previous) {
        index.set(dropId, candidate);
        continue;
      }

      const prevScore = (previous._is_primary ? 1000 : 0) + Number(previous._weight || 1);
      const nextScore = (candidate._is_primary ? 1000 : 0) + Number(candidate._weight || 1);
      if (nextScore >= prevScore) index.set(dropId, candidate);
    }

    for (const [key, value] of index.entries()) {
      const { _weight, _is_primary, ...clean } = value || {};
      index.set(key, clean);
    }

    return { index, error: null };
  } catch (error) {
    return { index: new Map(), error };
  }
}

async function fetchBusinessCampaignIndexFallback() {
  try {
    const [{ data: links, error: linkError }, { data: businesses, error: businessError }, { data: campaigns, error: campaignError }, { data: todayMetrics, error: metricsError }, dkd_player_counts] = await Promise.all([
      supabase.from('dkd_business_drop_links').select('drop_id,business_id,is_primary,traffic_weight'),
      supabase.from('dkd_businesses').select('id,name,is_active').eq('is_active', true),
      supabase.from('dkd_business_campaigns').select('id,business_id,title,reward_label,stock_limit,redeemed_count,starts_at,ends_at,closes_at,is_active').eq('is_active', true),
      supabase.from('dkd_business_today_metrics').select('business_id,unique_players'),
      fetchCampaignPlayerCounts(),
    ]);

    if (linkError || businessError || campaignError || metricsError) {
      return { index: new Map(), error: linkError || businessError || campaignError || metricsError };
    }

    const businessMap = new Map((businesses || []).map((item) => [String(item.id), item]));
    const metricsMap = new Map((todayMetrics || []).map((item) => [String(item.business_id), Number(item.unique_players || 0)]));
    const campaignMap = new Map();

    for (const campaign of campaigns || []) {
      if (!isCampaignActive(campaign)) continue;
      const key = String(campaign.business_id);
      const previous = campaignMap.get(key);
      if (!previous) {
        campaignMap.set(key, campaign);
        continue;
      }
      const prevStarts = previous?.starts_at ? Date.parse(previous.starts_at) : 0;
      const nextStarts = campaign?.starts_at ? Date.parse(campaign.starts_at) : 0;
      if (nextStarts > prevStarts) campaignMap.set(key, campaign);
    }

    const index = new Map();
    for (const link of links || []) {
      const dropId = String(link?.drop_id || '');
      const businessId = String(link?.business_id || '');
      if (!dropId || !businessId) continue;

      const business = businessMap.get(businessId);
      const campaign = campaignMap.get(businessId);
      if (!business || !campaign) continue;

      const previous = index.get(dropId);
      const dkd_campaign_key = String(campaign?.id || '');
      const dkd_player_total = resolveCampaignPlayerTotal(dkd_player_counts, dkd_campaign_key, businessId);
      const dkd_player_today = Math.max(metricsMap.get(businessId) || 0, 0);
      const expiresAt = campaign?.closes_at || campaign?.ends_at || null;

      const candidate = {
        has_active_campaign: true,
        campaign_title: String(campaign.title || 'Aktif kampanya'),
        business_name: String(business.name || ''),
        reward_badge_label: String(campaign.reward_label || 'ÖDÜL'),
        campaign_stock_left: resolveCampaignStockLeft({
          dkd_stock_limit: campaign?.stock_limit,
          dkd_redeemed_count: campaign?.redeemed_count,
          dkd_live_player_total: dkd_player_total,
        }),
        campaign_expires_at: expiresAt,
        campaign_players_today: dkd_player_today,
        campaign_players_total: Math.max(dkd_player_total, dkd_player_today),
        _weight: Number(link?.traffic_weight || 1),
        _is_primary: !!link?.is_primary,
      };

      if (!previous) {
        index.set(dropId, candidate);
        continue;
      }

      const prevScore = (previous._is_primary ? 1000 : 0) + Number(previous._weight || 1);
      const nextScore = (candidate._is_primary ? 1000 : 0) + Number(candidate._weight || 1);
      if (nextScore >= prevScore) index.set(dropId, candidate);
    }

    for (const [key, value] of index.entries()) {
      const { _weight, _is_primary, ...clean } = value || {};
      index.set(key, clean);
    }

    return { index, error: null };
  } catch (error) {
    return { index: new Map(), error };
  }
}

async function fetchBusinessCampaignIndex() {
  const rpcFirst = await fetchCampaignPublicMetaIndex();
  if (!rpcFirst.error) return rpcFirst;
  return fetchBusinessCampaignIndexFallback();
}

async function fetchDropsBase(activeOnly = true) {
  let query = supabase.from('dkd_drops').select(DROP_SELECT).order('created_at', { ascending: false });
  if (activeOnly) query = query.eq('is_active', true);
  const { data, error } = await query;
  return { data: (data || []).map(normalizeDropRow), error };
}

function attachCampaignIndex(drops, index) {
  return (drops || []).map((drop) => {
    const campaign = index.get(String(drop.id));
    return normalizeDropRow({ ...drop, ...(campaign || {}) });
  });
}

export async function fetchActiveDrops() {
  const [{ data: drops, error }, { index }] = await Promise.all([
    fetchDropsBase(true),
    fetchBusinessCampaignIndex(),
  ]);

  return {
    data: attachCampaignIndex(drops, index),
    error,
  };
}

export async function fetchUserDrops() {
  return supabase.from('dkd_user_drops').select('drop_id,last_opened_at');
}

export async function fetchAllDropsForAdmin() {
  const [{ data: drops, error }, { index }] = await Promise.all([
    fetchDropsBase(false),
    fetchBusinessCampaignIndex(),
  ]);

  return {
    data: attachCampaignIndex(drops, index),
    error,
  };
}

export async function updateDrop(dropId, payload) {
  const { data, error } = await supabase
    .from('dkd_drops')
    .update(payload)
    .eq('id', dropId)
    .select(DROP_SELECT)
    .single();

  return {
    data: data ? normalizeDropRow(data) : null,
    error,
  };
}

export async function insertDrop(payload) {
  const { data, error } = await supabase
    .from('dkd_drops')
    .insert(payload)
    .select(DROP_SELECT)
    .single();

  return {
    data: data ? normalizeDropRow(data) : null,
    error,
  };
}

export async function deleteDrop(dropId) {
  return supabase.from('dkd_drops').delete().eq('id', dropId);
}
