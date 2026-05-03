import { supabase } from '../lib/supabase';

export async function issueDropCode(dropId) {
  return supabase.rpc('dkd_issue_drop_code', { dkd_param_drop_id: dropId });
}

export async function openChestSecure({ dropId, qrSecret, lat, lng }) {
  return supabase.rpc('dkd_open_chest_secure', {
    dkd_param_drop_id: dropId,
    dkd_param_qr_secret: qrSecret || null,
    dkd_param_lat: lat ?? null,
    dkd_param_lng: lng ?? null,
  });
}

export async function openChestByCode(code) {
  return supabase.rpc('dkd_open_chest_by_code', { dkd_param_code: code });
}

export async function openBossChestSecure({ dropId, tier, correct, total, lat, lng }) {
  const dkd_lat_value = lat == null ? null : Number(lat);
  const dkd_lng_value = lng == null ? null : Number(lng);
  return supabase.rpc('dkd_open_boss_chest_secure', {
    dkd_param_drop_id: dropId,
    dkd_param_tier: Number(tier || 1),
    dkd_param_correct: Number(correct || 0),
    dkd_param_total: Number(total || 0),
    dkd_param_lat: Number.isFinite(dkd_lat_value) ? dkd_lat_value : null,
    dkd_param_lng: Number.isFinite(dkd_lng_value) ? dkd_lng_value : null,
  });
}

export async function fetchCardDef(cardDefId) {
  return supabase
    .from('dkd_card_defs')
    .select('id,name,series,serial_code,rarity,theme,art_image_url,art_label')
    .eq('id', cardDefId)
    .single();
}
