import { supabase } from '../lib/supabase';

const CARD_DEF_SELECT_PRIMARY = 'id,name,series,rarity,theme,art_image_url,serial_code,is_active';
const CARD_DEF_SELECT_FALLBACK = 'id,name,series,rarity,theme,is_active';

async function fetchCardDefsByIds(ids = []) {
  const safeIds = Array.from(new Set((Array.isArray(ids) ? ids : []).map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)));
  if (!safeIds.length) return { data: [], error: null };

  let res = await supabase
    .from('dkd_card_defs')
    .select(CARD_DEF_SELECT_PRIMARY)
    .in('id', safeIds);

  if (res?.error && String(res.error?.message || '').toLowerCase().includes('column')) {
    res = await supabase
      .from('dkd_card_defs')
      .select(CARD_DEF_SELECT_FALLBACK)
      .in('id', safeIds);
  }

  return res;
}

export async function fetchUserCollection(limit = 140) {
  const safeLimit = Math.max(1, Math.min(400, Number(limit || 140)));

  const cardsRes = await supabase
    .from('dkd_user_cards')
    .select('id, source, created_at, card_def_id')
    .order('created_at', { ascending: false })
    .limit(safeLimit);

  if (cardsRes?.error) return cardsRes;

  const rows = Array.isArray(cardsRes?.data) ? cardsRes.data : [];
  const ids = rows.map((row) => row?.card_def_id);
  const defsRes = await fetchCardDefsByIds(ids);
  if (defsRes?.error) return defsRes;

  const defs = Array.isArray(defsRes?.data) ? defsRes.data : [];
  const defsMap = new Map(defs.map((item) => [Number(item?.id), item]));

  const merged = rows.map((row) => {
    const card = defsMap.get(Number(row?.card_def_id)) || {
      id: Number(row?.card_def_id || 0),
      name: 'Kart',
      series: 'GENERAL',
      rarity: 'common',
      theme: 'core',
      art_image_url: '',
      serial_code: '',
      is_active: true,
    };

    return {
      ...row,
      card,
    };
  });

  return { data: merged, error: null };
}

export async function recycleDuplicateCards() {
  return supabase.rpc('dkd_recycle_duplicates_all');
}

export async function exchangeShardsForReward(kind) {
  return supabase.rpc('dkd_shard_exchange', { dkd_param_kind: kind });
}

export async function craftCardWithShards(rarity) {
  return supabase.rpc('dkd_shard_craft', { dkd_param_rarity: rarity });
}

export async function upgradeCardWithShards(fromRarity) {
  return supabase.rpc('dkd_shard_upgrade_random', { dkd_param_from_rarity: fromRarity });
}

export async function craftBossTicketFromShards() {
  return supabase.rpc('dkd_craft_boss_ticket');
}
