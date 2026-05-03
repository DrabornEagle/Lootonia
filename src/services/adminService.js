import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../lib/supabase';

const dkd_card_art_bucket = 'lootonia-card-art';
const dkd_boss_art_bucket = 'lootonia-boss-art';

function nullableText(value) {
  const dkd_source_value = String(value ?? '').trim();
  return dkd_source_value === '' ? null : dkd_source_value;
}

function nullableIdText(value) {
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

function slugify(value) {
  return String(value || 'card')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'card';
}

function inferMimeFromUri(uri) {
  const lower = String(uri || '').toLowerCase();
  if (lower.endsWith('.png')) return { ext: 'png', mime: 'image/png' };
  if (lower.endsWith('.webp')) return { ext: 'webp', mime: 'image/webp' };
  if (lower.endsWith('.heic')) return { ext: 'heic', mime: 'image/heic' };
  return { ext: 'jpg', mime: 'image/jpeg' };
}

function base64ToArrayBuffer(base64) {
  const cleaned = String(base64 || '').replace(/\s/g, '');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let bufferLength = cleaned.length * 0.75;
  if (cleaned.endsWith('==')) bufferLength -= 2;
  else if (cleaned.endsWith('=')) bufferLength -= 1;
  const arraybuffer = new ArrayBuffer(Math.max(0, bufferLength));
  const bytes = new Uint8Array(arraybuffer);
  let dkd_payload = 0;
  for (let dkd_index_value = 0; dkd_index_value < cleaned.length; dkd_index_value += 4) {
    const enc1 = chars.indexOf(cleaned[dkd_index_value]);
    const enc2 = chars.indexOf(cleaned[dkd_index_value + 1]);
    const enc3 = cleaned[dkd_index_value + 2] === '=' ? 64 : chars.indexOf(cleaned[dkd_index_value + 2]);
    const enc4 = cleaned[dkd_index_value + 3] === '=' ? 64 : chars.indexOf(cleaned[dkd_index_value + 3]);
    const byte1 = (enc1 << 2) | (enc2 >> 4);
    bytes[dkd_payload++] = byte1;
    if (enc3 !== 64) {
      const byte2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      bytes[dkd_payload++] = byte2;
    }
    if (enc4 !== 64) {
      const byte3 = ((enc3 & 3) << 6) | enc4;
      bytes[dkd_payload++] = byte3;
    }
  }
  return arraybuffer;
}

async function readBase64FromUri(uri) {
  const input = String(uri || '').trim();
  if (!input) throw new Error('card_art_uri_missing');
  try {
    return await FileSystem.readAsStringAsync(input, { encoding: FileSystem.EncodingType.Base64 });
  } catch (directErr) {
    const { ext } = inferMimeFromUri(input);
    const tempUri = `${FileSystem.cacheDirectory || ''}lootonia-card-upload-${Date.now()}.${ext}`;
    if (!tempUri) throw directErr;
    await FileSystem.copyAsync({ from: input, to: tempUri });
    try {
      return await FileSystem.readAsStringAsync(tempUri, { encoding: FileSystem.EncodingType.Base64 });
    } finally {
      try {
        await FileSystem.deleteAsync(tempUri, { idempotent: true });
      } catch (_dkd_unused_value) {}
    }
  }
}

async function normalizeBossUploadUri(uri) {
  const input = String(uri || '').trim();
  if (!input) throw new Error('boss_art_uri_missing');
  if (/^https?:\/\//.test(input)) return input;
  try {
    const out = await ImageManipulator.manipulateAsync(
      input,
      [{ resize: { width: 1280 } }],
      { compress: 0.78, format: ImageManipulator.SaveFormat.JPEG },
    );
    return out?.uri || input;
  } catch (_dkd_unused_value) {
    return input;
  }
}

export async function fetchAdminLootEntries() {
  return supabase
    .from('dkd_loot_entries')
    .select('id, drop_type, rarity, weight, card:dkd_card_defs(id,name,series,serial_code,rarity,theme,art_image_url,is_active)')
    .order('drop_type', { ascending: true })
    .order('rarity', { ascending: true });
}

export async function fetchAdminCardDefs(limit = 800) {
  return supabase
    .from('dkd_card_defs')
    .select('id, name, series, serial_code, rarity, theme, is_active, art_image_url, is_hidden_admin, created_at, updated_at')
    .eq('is_hidden_admin', false)
    .order('series', { ascending: true })
    .order('rarity', { ascending: true })
    .order('name', { ascending: true })
    .limit(limit);
}

export async function uploadAdminCardArt({ imageUri, name, series, serialCode }) {
  const cleanUri = String(imageUri || '').trim();
  if (!cleanUri) throw new Error('card_art_uri_missing');
  const { ext, mime } = inferMimeFromUri(cleanUri);
  const base64 = await readBase64FromUri(cleanUri);
  const arrayBuffer = base64ToArrayBuffer(base64);
  const folder = slugify(series || 'general');
  const stem = slugify(serialCode || name || `card-${Date.now()}`);
  const fileName = `${Date.now()}-${stem}.${ext}`;
  const path = `cards/${folder}/${fileName}`;
  const { error } = await supabase.storage.from(dkd_card_art_bucket).upload(path, arrayBuffer, { contentType: mime, upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(dkd_card_art_bucket).getPublicUrl(path);
  return { data: { path, publicUrl: data?.publicUrl || '' }, error: null };
}

export async function upsertAdminCardDef({ id, name, series, serial_code = null, rarity, theme, is_active = true, art_image_url = null }) {
  return supabase.rpc('dkd_admin_card_upsert_flex', {
    dkd_param_id_text: nullableIdText(id),
    dkd_param_name: nullableText(name),
    dkd_param_series: nullableText(series),
    dkd_param_serial_code: nullableText(serial_code),
    dkd_param_rarity: nullableText(rarity),
    dkd_param_theme: nullableText(theme),
    dkd_param_is_active: typeof is_active === 'boolean' ? is_active : true,
    dkd_param_art_image_url: nullableText(art_image_url),
  });
}

export async function deleteAdminCardDef(cardId) {
  return supabase.rpc('dkd_admin_card_delete_hard', { dkd_param_card_id_text: nullableIdText(cardId) });
}

export async function addAdminLootEntry({ drop_type, rarity, weight, card_def_id }) {
  return supabase.rpc('dkd_admin_loot_add', {
    dkd_param_drop_type: String(drop_type || '').toLowerCase(),
    dkd_param_rarity: String(rarity || '').toLowerCase(),
    dkd_param_weight: Number(weight),
    dkd_param_card_def_id: card_def_id,
  });
}

export async function deleteAdminLootEntry(entryId) {
  return supabase.rpc('dkd_admin_loot_delete', { dkd_param_entry_id: Number(entryId) });
}

export async function fetchAdminProfiles(query = '', limit = 60) {
  const { data, error } = await supabase.rpc('dkd_admin_profiles_list', {
    dkd_param_query: String(query || ''),
    dkd_param_limit: Math.max(1, Math.min(200, Number(limit) || 60)),
  });
  return { data: Array.isArray(data) ? data : [], error };
}

export async function updateAdminProfile({ user_id, nickname, avatar_emoji, token, shards, boss_tickets, energy, energy_max, xp, level, rank_key, courier_status, courier_score, courier_completed_jobs, task_state, boss_state, weekly_task_state }) {
  return supabase.rpc('dkd_admin_profile_update', {
    dkd_param_user_id: user_id,
    dkd_param_nickname: nullableText(nickname),
    dkd_param_avatar_emoji: nullableText(avatar_emoji),
    dkd_param_token: nullableInt(token),
    dkd_param_shards: nullableInt(shards),
    dkd_param_boss_tickets: nullableInt(boss_tickets),
    dkd_param_energy: nullableInt(energy),
    dkd_param_energy_max: nullableInt(energy_max),
    dkd_param_xp: nullableInt(xp),
    dkd_param_level: nullableInt(level),
    dkd_param_rank_key: nullableText(rank_key),
    dkd_param_courier_status: nullableText(courier_status),
    dkd_param_courier_score: nullableInt(courier_score),
    dkd_param_courier_completed_jobs: nullableInt(courier_completed_jobs),
    dkd_param_task_state: task_state ?? null,
    dkd_param_boss_state: boss_state ?? null,
    dkd_param_weekly_task_state: weekly_task_state ?? null,
  });
}

export async function fetchAdminCourierJobs() {
  const { data, error } = await supabase.rpc('dkd_admin_courier_jobs_list');
  return { data: Array.isArray(data) ? data : [], error };
}

export async function dkd_fetch_admin_courier_applications() {
  const dkd_rpc_response_value = await supabase.rpc('dkd_admin_courier_applications_list');
  return { data: Array.isArray(dkd_rpc_response_value?.data) ? dkd_rpc_response_value.data : [], error: dkd_rpc_response_value?.error || null };
}

export async function upsertAdminCourierJob({ id, title, pickup, dropoff, reward_score, distance_km, eta_min, job_type, is_active, fee_tl }) {
  const dkd_payload_list = [
    { dkd_param_id: nullableInt(id), dkd_param_title: nullableText(title), dkd_param_pickup: nullableText(pickup), dkd_param_dropoff: nullableText(dropoff), dkd_param_reward_score: nullableInt(reward_score), dkd_param_distance_km: nullableNumeric(distance_km), dkd_param_eta_min: nullableInt(eta_min), dkd_param_job_type: nullableText(job_type), dkd_param_is_active: typeof is_active === 'boolean' ? is_active : true, dkd_param_fee_tl: nullableNumeric(fee_tl) },
    { dkd_id: nullableInt(id), dkd_title: nullableText(title), dkd_pickup: nullableText(pickup), dkd_dropoff: nullableText(dropoff), dkd_reward_score: nullableInt(reward_score), dkd_distance_km: nullableNumeric(distance_km), dkd_eta_min: nullableInt(eta_min), dkd_job_type: nullableText(job_type), dkd_is_active: typeof is_active === 'boolean' ? is_active : true, dkd_fee_tl: nullableNumeric(fee_tl) },
  ];
  let dkd_last_res = { data: null, error: null };
  for (const dkd_payload of dkd_payload_list) {
    const dkd_res = await supabase.rpc('dkd_admin_courier_job_upsert', dkd_payload);
    dkd_last_res = dkd_res;
    if (!dkd_res?.error) return dkd_res;
    const dkd_msg = String(dkd_res?.error?.message || '').toLowerCase();
    if (!dkd_msg.includes('schema cache') && !dkd_msg.includes('could not find the function')) return dkd_res;
  }
  return dkd_last_res;
}

export async function deleteAdminCourierJob(jobId) {
  const dkd_job_id_value = Number(jobId);
  const dkd_payload_list_value = [
    { dkd_param_job_id: dkd_job_id_value },
    { dkd_job_id: dkd_job_id_value },
  ];
  let dkd_last_result_value = { data: null, error: null };
  for (const dkd_payload_value of dkd_payload_list_value) {
    const dkd_result_value = await supabase.rpc('dkd_admin_courier_job_delete', dkd_payload_value);
    dkd_last_result_value = dkd_result_value;
    if (!dkd_result_value?.error) return dkd_result_value;
    const dkd_message_value = String(dkd_result_value?.error?.message || '').toLowerCase();
    const dkd_can_retry_value = dkd_message_value.includes('schema cache')
      || dkd_message_value.includes('could not find the function')
      || dkd_message_value.includes('function public.dkd_admin_courier_job_delete');
    if (!dkd_can_retry_value) return dkd_result_value;
  }
  return dkd_last_result_value;
}

export async function fetchAdminBossDefs() {
  return supabase
    .from('dkd_boss_defs')
    .select('id, drop_id, boss_key, title, subtitle, description, reward_summary, ticket_cost, boss_hp_display, art_image_url, question_set, is_active, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .order('created_at', { ascending: false });
}

export async function uploadAdminBossArt({ imageUri, bossKey, title }) {
  const cleanUri = String(imageUri || '').trim();
  if (!cleanUri) throw new Error('boss_art_uri_missing');
  const uploadUri = await normalizeBossUploadUri(cleanUri);
  const { ext, mime } = inferMimeFromUri(uploadUri);
  const base64 = await readBase64FromUri(uploadUri);
  const arrayBuffer = base64ToArrayBuffer(base64);
  const stem = slugify(bossKey || title || `lootonia-boss-${Date.now()}`);
  const fileName = `${Date.now()}-${stem}.${ext}`;
  const path = `boss/${fileName}`;
  const { error } = await supabase.storage.from(dkd_boss_art_bucket).upload(path, arrayBuffer, { contentType: mime, upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(dkd_boss_art_bucket).getPublicUrl(path);
  return { data: { path, publicUrl: data?.publicUrl || '' }, error: null };
}

export async function upsertAdminBossDef({ drop_id, boss_key, title, subtitle = null, description = null, reward_summary = null, ticket_cost = 1, boss_hp_display = 985000, art_image_url = null, question_set = [], is_active = true }) {
  return supabase.rpc('dkd_admin_boss_upsert', {
    dkd_param_drop_id: nullableText(drop_id),
    dkd_param_boss_key: nullableText(boss_key),
    dkd_param_title: nullableText(title),
    dkd_param_subtitle: nullableText(subtitle),
    dkd_param_description: nullableText(description),
    dkd_param_reward_summary: nullableText(reward_summary),
    dkd_param_ticket_cost: nullableInt(ticket_cost) ?? 1,
    dkd_param_boss_hp_display: nullableInt(boss_hp_display) ?? 985000,
    dkd_param_art_image_url: nullableText(art_image_url),
    dkd_param_question_set: Array.isArray(question_set) ? question_set : [],
    dkd_param_is_active: typeof is_active === 'boolean' ? is_active : true,
  });
}

export async function deleteAdminBossDef(dropId) {
  return supabase.rpc('dkd_admin_boss_delete', { dkd_param_drop_id: nullableText(dropId) });
}

export async function fetchBossConfigForDrop(dropId) {
  return supabase.from('dkd_boss_defs').select('id, drop_id, boss_key, title, subtitle, description, reward_summary, ticket_cost, boss_hp_display, art_image_url, question_set, is_active').eq('drop_id', dropId).eq('is_active', true).maybeSingle();
}

export async function sendAdminBroadcast({ accessToken, title, body, sender_name = 'DrabornEagle', audience = 'everyone', target_screen = 'map' }) {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) throw new Error('supabase_env_missing');
  if (!accessToken) throw new Error('session_required');
  const response = await fetch(`${supabaseUrl}/functions/v1/send-broadcast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, apikey: supabaseAnonKey },
    body: JSON.stringify({
      title: String(title || '').trim(),
      body: String(body || '').trim(),
      senderName: String(sender_name || 'DrabornEagle').trim() || 'DrabornEagle',
      audience: String(audience || 'everyone').trim() || 'everyone',
      targetScreen: String(target_screen || 'map').trim() || 'map',
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(payload?.error || `http_${response.status}`);
    err.payload = payload;
    throw err;
  }
  return { data: payload, error: null };
}

export async function fetchAdminNotificationTemplates() {
  const { data, error } = await supabase.rpc('dkd_admin_list_notification_templates');
  return { data: Array.isArray(data) ? data : [], error: error || null };
}

export async function saveAdminNotificationTemplate({ dkd_template_key, dkd_label, dkd_description, dkd_title, dkd_body, dkd_target_screen = 'map', dkd_is_enabled = true }) {
  const dkd_title_value = String(dkd_title ?? '').trim();
  const dkd_body_value = String(dkd_body ?? '').trim();

  return supabase.rpc('dkd_admin_upsert_notification_template', {
    dkd_param_template_key: nullableText(dkd_template_key),
    dkd_param_label: nullableText(dkd_label),
    dkd_param_description: nullableText(dkd_description),
    dkd_param_title: dkd_title_value,
    dkd_param_body: dkd_body_value,
    dkd_param_target_screen: nullableText(dkd_target_screen) || 'map',
    dkd_param_is_enabled: typeof dkd_is_enabled === 'boolean' ? dkd_is_enabled : true,
  });
}

function functionMissing(error) {
  const msg = String(error?.message || '').toLowerCase();
  return msg.includes('could not find the function') || msg.includes('schema cache');
}

export async function fetchAdminMarketCommandSnapshot() {
  const rpcRes = await supabase.rpc('dkd_admin_market_command_snapshot');
  if (!rpcRes?.error) {
    return { data: { ui: rpcRes?.data?.ui || null, packs: Array.isArray(rpcRes?.data?.packs) ? rpcRes.data.packs : [], rewardTypes: Array.isArray(rpcRes?.data?.reward_types) ? rpcRes.data.reward_types : [] }, error: null };
  }
  if (!functionMissing(rpcRes.error)) return { data: { ui: null, packs: [], rewardTypes: [] }, error: rpcRes.error };
  const [uiRes, packsRes, rewardTypesRes] = await Promise.all([
    supabase.from('dkd_market_ui_config').select('hero_kicker, hero_title, hero_subtitle, logic_title, logic_body, hero_icon_name, hero_icon_accent, hero_background_image_url, hero_visual_preset').eq('id', 1).maybeSingle(),
    supabase.from('dkd_market_shop_defs').select('id, pack_key, title, subtitle, description, badge_label, icon_name, accent_key, art_image_url, panel_style, background_tone, visual_preset, price_token, reward_kind, reward_amount, sort_order, is_active').order('sort_order', { ascending: true }).order('id', { ascending: true }),
    supabase.from('dkd_market_reward_types').select('id, reward_kind, title, subtitle, resource_target, icon_name, accent_key, is_active').order('title', { ascending: true }),
  ]);
  return { data: { ui: uiRes?.data || null, packs: Array.isArray(packsRes?.data) ? packsRes.data : [], rewardTypes: Array.isArray(rewardTypesRes?.data) ? rewardTypesRes.data : [] }, error: uiRes?.error || packsRes?.error || rewardTypesRes?.error || null };
}

export async function fetchAdminMarketRewardTypes() {
  const res = await supabase.from('dkd_market_reward_types').select('id, reward_kind, title, subtitle, resource_target, icon_name, accent_key, is_active').order('title', { ascending: true });
  return { data: Array.isArray(res?.data) ? res.data : [], error: res?.error || null };
}

export async function saveAdminMarketUi(input = {}) {
  const dkd_payload_list = [
    { dkd_param_hero_kicker: nullableText(input?.hero_kicker) || 'TOKEN MAĞAZASI', dkd_param_hero_title: nullableText(input?.hero_title) || 'Anında al, anında kullan', dkd_param_hero_subtitle: nullableText(input?.hero_subtitle) || 'Token cüzdanınla shard, boss bileti ve enerji satın al. Her paket ne işe yaradığını açık şekilde gösterir.', dkd_param_logic_title: nullableText(input?.logic_title) || 'Paket mantığı', dkd_param_logic_body: nullableText(input?.logic_body) || 'Shard = craft ve upgrade, Bilet = boss girişi, Enerji = daha fazla drop ve sandık akışı.' },
    { dkd_param_hero_kicker: nullableText(input?.hero_kicker) || 'TOKEN MAĞAZASI', dkd_param_hero_title: nullableText(input?.hero_title) || 'Anında al, anında kullan', dkd_param_hero_subtitle: nullableText(input?.hero_subtitle) || 'Token cüzdanınla shard, boss bileti ve enerji satın al. Her paket ne işe yaradığını açık şekilde gösterir.', dkd_param_logic_title: nullableText(input?.logic_title) || 'Paket mantığı', dkd_param_logic_body: nullableText(input?.logic_body) || 'Shard = craft ve upgrade, Bilet = boss girişi, Enerji = daha fazla drop ve sandık akışı.', dkd_param_hero_icon_name: nullableText(input?.hero_icon_name) || 'shopping-outline', dkd_param_hero_icon_accent: nullableText(input?.hero_icon_accent) || 'cyan' },
    { dkd_param_hero_kicker: nullableText(input?.hero_kicker) || 'TOKEN MAĞAZASI', dkd_param_hero_title: nullableText(input?.hero_title) || 'Anında al, anında kullan', dkd_param_hero_subtitle: nullableText(input?.hero_subtitle) || 'Token cüzdanınla shard, boss bileti ve enerji satın al. Her paket ne işe yaradığını açık şekilde gösterir.', dkd_param_logic_title: nullableText(input?.logic_title) || 'Paket mantığı', dkd_param_logic_body: nullableText(input?.logic_body) || 'Shard = craft ve upgrade, Bilet = boss girişi, Enerji = daha fazla drop ve sandık akışı.', dkd_param_hero_icon_name: nullableText(input?.hero_icon_name) || 'shopping-outline', dkd_param_hero_icon_accent: nullableText(input?.hero_icon_accent) || 'cyan', dkd_param_hero_background_image_url: nullableText(input?.hero_background_image_url), dkd_param_hero_visual_preset: nullableText(input?.hero_visual_preset) || 'aurora' },
  ];
  let dkd_last_res = { data: null, error: null };
  for (const dkd_payload of dkd_payload_list) {
    const dkd_res = await supabase.rpc('dkd_admin_market_ui_save', dkd_payload);
    dkd_last_res = dkd_res;
    if (!dkd_res?.error) return dkd_res;
    if (!functionMissing(dkd_res?.error)) return dkd_res;
  }
  return dkd_last_res;
}

export async function upsertAdminMarketPack(input = {}) {
  const dkd_payload_list = [
    { dkd_param_id: nullableInt(input?.id), dkd_param_pack_key: nullableText(input?.pack_key), dkd_param_title: nullableText(input?.title), dkd_param_subtitle: nullableText(input?.subtitle), dkd_param_description: nullableText(input?.description), dkd_param_badge_label: nullableText(input?.badge_label), dkd_param_icon_name: nullableText(input?.icon_name) || 'cube-outline', dkd_param_accent_key: nullableText(input?.accent_key) || 'cyan', dkd_param_price_token: nullableInt(input?.price_token) ?? 0, dkd_param_reward_kind: nullableText(input?.reward_kind), dkd_param_reward_amount: nullableInt(input?.reward_amount) ?? 1, dkd_param_sort_order: nullableInt(input?.sort_order) ?? 100, dkd_param_is_active: typeof input?.is_active === 'boolean' ? input.is_active : true },
    { dkd_param_id: nullableInt(input?.id), dkd_param_pack_key: nullableText(input?.pack_key), dkd_param_title: nullableText(input?.title), dkd_param_subtitle: nullableText(input?.subtitle), dkd_param_description: nullableText(input?.description), dkd_param_badge_label: nullableText(input?.badge_label), dkd_param_icon_name: nullableText(input?.icon_name) || 'cube-outline', dkd_param_accent_key: nullableText(input?.accent_key) || 'cyan', dkd_param_art_image_url: nullableText(input?.art_image_url), dkd_param_panel_style: nullableText(input?.panel_style) || 'featured', dkd_param_background_tone: nullableText(input?.background_tone) || 'auto', dkd_param_price_token: nullableInt(input?.price_token) ?? 0, dkd_param_reward_kind: nullableText(input?.reward_kind), dkd_param_reward_amount: nullableInt(input?.reward_amount) ?? 1, dkd_param_sort_order: nullableInt(input?.sort_order) ?? 100, dkd_param_is_active: typeof input?.is_active === 'boolean' ? input.is_active : true },
    { dkd_param_id: nullableInt(input?.id), dkd_param_pack_key: nullableText(input?.pack_key), dkd_param_title: nullableText(input?.title), dkd_param_subtitle: nullableText(input?.subtitle), dkd_param_description: nullableText(input?.description), dkd_param_badge_label: nullableText(input?.badge_label), dkd_param_icon_name: nullableText(input?.icon_name) || 'cube-outline', dkd_param_accent_key: nullableText(input?.accent_key) || 'cyan', dkd_param_art_image_url: nullableText(input?.art_image_url), dkd_param_panel_style: nullableText(input?.panel_style) || 'featured', dkd_param_background_tone: nullableText(input?.background_tone) || 'auto', dkd_param_visual_preset: nullableText(input?.visual_preset) || 'auto', dkd_param_price_token: nullableInt(input?.price_token) ?? 0, dkd_param_reward_kind: nullableText(input?.reward_kind), dkd_param_reward_amount: nullableInt(input?.reward_amount) ?? 1, dkd_param_sort_order: nullableInt(input?.sort_order) ?? 100, dkd_param_is_active: typeof input?.is_active === 'boolean' ? input.is_active : true },
  ];
  let dkd_last_res = { data: null, error: null };
  for (const dkd_payload of dkd_payload_list) {
    const dkd_res = await supabase.rpc('dkd_admin_market_shop_upsert', dkd_payload);
    dkd_last_res = dkd_res;
    if (!dkd_res?.error) return dkd_res;
    if (!functionMissing(dkd_res?.error)) return dkd_res;
  }
  return dkd_last_res;
}

export async function deleteAdminMarketPack(id) {
  return supabase.rpc('dkd_admin_market_shop_delete', { dkd_param_id: Number(id) });
}

export async function upsertAdminMarketRewardType(input = {}) {
  return supabase.rpc('dkd_admin_market_reward_type_upsert', {
    dkd_param_id: nullableInt(input?.id),
    dkd_param_reward_kind: nullableText(input?.reward_kind),
    dkd_param_title: nullableText(input?.title),
    dkd_param_subtitle: nullableText(input?.subtitle),
    dkd_param_resource_target: nullableText(input?.resource_target),
    dkd_param_icon_name: nullableText(input?.icon_name) || 'cube-outline',
    dkd_param_accent_key: nullableText(input?.accent_key) || 'cyan',
    dkd_param_is_active: typeof input?.is_active === 'boolean' ? input.is_active : true,
  });
}

export async function deleteAdminMarketRewardType(id) {
  return supabase.rpc('dkd_admin_market_reward_type_delete', { dkd_param_id: Number(id) });
}
