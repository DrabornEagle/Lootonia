import { supabase } from '../lib/supabase';

function normalizeRpcError(error) {
  const raw = String(error?.message || error?.details || error?.hint || error || '').trim();
  const lower = raw.toLowerCase();

  if (!raw) return 'İşlem şu anda tamamlanamadı.';
  if (lower.includes('dkd_social_') || lower.includes('function') || lower.includes('does not exist')) {
    return 'Sohbet ve Ally altyapısı veritabanında hazır görünmüyor. Yeni SQL patch dosyasını Supabase üzerinde çalıştırman gerekiyor.';
  }
  if (lower.includes('friend_exists')) return 'Bu oyuncu zaten arkadaş listende.';
  if (lower.includes('request_exists')) return 'Bu oyuncuya zaten bekleyen istek gönderdin.';
  if (lower.includes('cannot_friend_self')) return 'Kendine arkadaş isteği gönderemezsin.';
  if (lower.includes('thread_forbidden')) return 'Bu sohbet odasına erişim iznin yok.';
  if (lower.includes('message_empty')) return 'Mesaj boş olamaz.';
  if (lower.includes('friendship_not_found')) return 'Bu oyuncuyla aktif bir arkadaşlık bulunamadı.';
  if (lower.includes('target_not_found')) return 'Aradığın oyuncu bulunamadı.';
  if (lower.includes('not_request_target')) return 'Bu arkadaşlık isteği üzerinde işlem yetkin yok.';
  if (lower.includes('ally_id')) return '6 haneli rastgele Ally_ID altyapısı için SQL patch uygulanmalı.';
  return raw;
}

export function getAllyFriendlyError(error) {
  return normalizeRpcError(error);
}

export async function touchAllyPresence() {
  return supabase.rpc('dkd_social_touch_presence');
}

export async function fetchAllySnapshot() {
  const res = await supabase.rpc('dkd_social_snapshot');
  if (res?.error) return res;
  return {
    ...res,
    data: {
      myProfile: res?.data?.myProfile || null,
      friends: Array.isArray(res?.data?.friends) ? res.data.friends : [],
      incoming: Array.isArray(res?.data?.incoming) ? res.data.incoming : [],
      outgoing: Array.isArray(res?.data?.outgoing) ? res.data.outgoing : [],
    },
  };
}

export async function searchAllyProfiles(query, limit = 12) {
  return supabase.rpc('dkd_social_search_profiles', {
    dkd_param_query: String(query || '').trim(),
    dkd_param_limit: Math.max(1, Math.min(20, Number(limit || 12))),
  });
}

export async function sendFriendRequest(targetUserId) {
  return supabase.rpc('dkd_social_send_friend_request', {
    dkd_param_target_user_id: targetUserId,
  });
}

export async function respondFriendRequest(requestId, action) {
  return supabase.rpc('dkd_social_respond_friend_request', {
    dkd_param_request_id: Number(requestId),
    dkd_param_action: String(action || 'accept').trim().toLowerCase(),
  });
}

export async function removeFriend(friendUserId) {
  return supabase.rpc('dkd_social_remove_friend', {
    dkd_param_friend_user_id: friendUserId,
  });
}

export async function getOrCreateDirectThread(friendUserId) {
  return supabase.rpc('dkd_social_get_or_create_thread', {
    dkd_param_friend_user_id: friendUserId,
  });
}

export async function fetchThreadMessages(threadId, limit = 80) {
  return supabase.rpc('dkd_social_thread_messages', {
    dkd_param_thread_id: threadId,
    dkd_param_limit: Math.max(10, Math.min(150, Number(limit || 80))),
  });
}

export async function sendThreadMessage(threadId, body) {
  return supabase.rpc('dkd_social_send_message', {
    dkd_param_thread_id: threadId,
    dkd_param_body: String(body || '').trim(),
  });
}

export async function markThreadSeen(threadId) {
  return supabase.rpc('dkd_social_mark_thread_seen', {
    dkd_param_thread_id: threadId,
  });
}
