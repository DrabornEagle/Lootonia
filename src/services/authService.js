import { dkd_supabase_runtime_config, supabase } from '../lib/supabase';

function dkd_normalize_email(dkd_email_value) {
  return String(dkd_email_value || '').trim().toLowerCase();
}

function dkd_make_config_error_result() {
  return { error: new Error(dkd_supabase_runtime_config.dkd_issue_text || 'Supabase ayarı eksik.') };
}

export async function signInWithEmail(dkd_email_value, dkd_password_value) {
  if (!dkd_supabase_runtime_config.dkd_is_ready) return dkd_make_config_error_result();
  return supabase.auth.signInWithPassword({
    email: dkd_normalize_email(dkd_email_value),
    password: String(dkd_password_value || ''),
  });
}

export async function signUpWithEmail(dkd_email_value, dkd_password_value, dkd_profile_location_value = {}) {
  if (!dkd_supabase_runtime_config.dkd_is_ready) return dkd_make_config_error_result();
  const dkd_country_value = String(dkd_profile_location_value?.dkd_country || dkd_profile_location_value?.country || 'Türkiye').trim() || 'Türkiye';
  const dkd_city_value = String(dkd_profile_location_value?.dkd_city || dkd_profile_location_value?.city || 'Ankara').trim() || 'Ankara';
  const dkd_region_value = String(dkd_profile_location_value?.dkd_region || dkd_profile_location_value?.region || '').trim();
  return supabase.auth.signUp({
    email: dkd_normalize_email(dkd_email_value),
    password: String(dkd_password_value || ''),
    options: {
      data: {
        dkd_country: dkd_country_value,
        dkd_city: dkd_city_value,
        dkd_region: dkd_region_value,
      },
    },
  });
}

export async function signOutSession() {
  if (!dkd_supabase_runtime_config.dkd_is_ready) return dkd_make_config_error_result();
  return supabase.auth.signOut();
}

export async function getCurrentSession() {
  if (!dkd_supabase_runtime_config.dkd_is_ready) return { data: { session: null }, error: null };
  return supabase.auth.getSession();
}

export function onSessionChange(dkd_callback_value) {
  if (!dkd_supabase_runtime_config.dkd_is_ready) {
    return { data: { subscription: { unsubscribe() {} } } };
  }
  return supabase.auth.onAuthStateChange((dkd_event_name, dkd_next_session_value) => dkd_callback_value?.(dkd_next_session_value, dkd_event_name));
}
