import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const dkd_supabase_url = String(process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
const dkd_supabase_key = String(
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  || ''
).trim();

const dkd_placeholder_flag = [dkd_supabase_url, dkd_supabase_key].some((dkd_item_value) =>
  !dkd_item_value || dkd_item_value.includes('BURAYA_')
);

export const dkd_supabase_runtime_config = {
  dkd_url_value: dkd_supabase_url,
  dkd_key_value: dkd_supabase_key,
  dkd_is_ready: Boolean(dkd_supabase_url && dkd_supabase_key && !dkd_placeholder_flag),
  dkd_issue_text: dkd_placeholder_flag
    ? 'Supabase ayarı eksik. .env dosyasına EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_ANON_KEY yaz.'
    : '',
};

if (!dkd_supabase_runtime_config.dkd_is_ready) {
  console.warn(`[Lootonia] ${dkd_supabase_runtime_config.dkd_issue_text}`);
}

const dkd_safe_url = dkd_supabase_runtime_config.dkd_is_ready ? dkd_supabase_url : 'https://example.invalid';
const dkd_safe_key = dkd_supabase_runtime_config.dkd_is_ready ? dkd_supabase_key : 'dkd_invalid_key';

export const supabase = createClient(dkd_safe_url, dkd_safe_key, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
