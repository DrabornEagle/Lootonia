import { supabase } from '../lib/supabase';

export async function fetchBossDefinitionForDrop(dropId) {
  return supabase
    .from('dkd_boss_defs')
    .select('id, drop_id, boss_key, title, subtitle, description, reward_summary, ticket_cost, boss_hp_display, art_image_url, question_set, is_active')
    .eq('drop_id', dropId)
    .eq('is_active', true)
    .maybeSingle();
}
