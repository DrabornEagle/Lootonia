import { supabase } from '../lib/supabase';

const HISTORY_SELECT = 'id, created_at, gained_token, drop_type, drop:dkd_drops(name,type), card:dkd_card_defs(name,series,rarity,theme,art_image_url,serial_code)';

export async function fetchChestHistory(limit = 30) {
  const safeLimit = Math.max(1, Number(limit || 30));

  const primary = await supabase
    .from('dkd_chest_logs')
    .select(HISTORY_SELECT)
    .order('created_at', { ascending: false })
    .limit(safeLimit);

  if (!primary.error) return primary;

  const msg = String(primary.error?.message || primary.error?.details || '');
  const relationMissing =
    msg.includes('relation') ||
    msg.includes('does not exist') ||
    msg.includes('Could not find') ||
    msg.includes('not found');

  if (!relationMissing) return primary;

  return supabase
    .from('dkd_chest_history')
    .select(HISTORY_SELECT)
    .order('created_at', { ascending: false })
    .limit(safeLimit);
}
