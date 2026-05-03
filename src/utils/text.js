import { DROP_TYPE_TR, RARITY_TR, SERIES_TR } from '../constants/game';

export function trRarity(dkd_result_value) {
  return RARITY_TR[String(dkd_result_value || 'common')] || String(dkd_result_value || 'common').toUpperCase();
}

export function formatInt(dkd_iteration_value) {
  try {
    return Number(dkd_iteration_value || 0).toLocaleString('tr-TR');
  } catch {
    return String(Math.trunc(Number(dkd_iteration_value || 0)));
  }
}

export function humanizeAdminError(dkd_error_value, contextTable = '') {
  const msg = String(dkd_error_value?.message || dkd_error_value?.details || dkd_error_value || '');
  const low = msg.toLowerCase();
  const ctx = String(contextTable || '').toLowerCase();

  if ((low.includes('permission denied') || low.includes('row-level security') || low.includes('rls')) && (low.includes('dkd_drops') || ctx === 'dkd_drops')) {
    return 'Drop verisine erişim engellendi. Supabase admin yetkisi ve dkd_drops RLS politikasını kontrol et.';
  }

  if (low.includes('expo-file-system') || low.includes('copyasync') || low.includes('readasstringasync')) {
    if (ctx === 'dkd_card_defs') {
      return 'Kart görsel yükleme katmanı Expo SDK 54 ile çakıştı. Bu patch dosya işlemlerini expo-file-system/legacy üzerinden çalıştırır. Patchi kurup expo-file-system paketini tekrar eşitle.';
    }
    if (ctx === 'dkd_boss_defs') {
      return 'Boss görsel yükleme tarafında dosya sistemi hatası oluştu. Görsel seçimini tekrar dene veya boss görsel upload patchini yeniden kur.';
    }
  }

  return msg || 'Bilinmeyen hata';
}

export function trDropType(dkd_temp_value) {
  const dkd_key_value = String(dkd_temp_value || '').toLowerCase();
  return DROP_TYPE_TR[dkd_key_value] || (dkd_key_value ? `${dkd_key_value.charAt(0).toUpperCase()}${dkd_key_value.slice(1)}` : '—');
}

export function trSeries(dkd_source_value) {
  const dkd_key_value = String(dkd_source_value || '').toUpperCase();
  return SERIES_TR[dkd_key_value] || (dkd_key_value || 'GENEL');
}

export function trTheme(dkd_numeric_value) {
  const dkd_temp_value = String(dkd_numeric_value || '');
  const map = {
    'City Core': 'Şehir Merkezi',
    'Neon Latte District': 'Neon Kahve Bölgesi',
    'Retail Megaplex': 'Mega AVM Kompleksi',
    'Bio-Garden Towers': 'Bio-Bahçe Kuleleri',
    'Neon Harbor': 'Neon Liman',
    'Skybridge District': 'Skybridge Bölgesi',
    'Aurora Boulevard': 'Aurora Bulvarı',
    'Quantum Plaza': 'Kuantum Plaza',
    'Hologram Heights': 'Hologram Tepeleri',
    'RainTech Alley': 'RainTech Sokağı',
    'Solar Crown': 'Solar Taç',
    'Obsidian Core': 'Obsidyen Çekirdek',
    'Crimson Apex': 'Kızıl Apex',
    'Zenith Garden': 'Zenith Bahçesi',
    'Orbit Foundry': 'Orbit Dökümhanesi',
    'Lunar Gate': 'Ay Kapısı',
  };
  return map[dkd_temp_value] || (dkd_temp_value || '—');
}

export function formatRemain(seconds) {
  const dkd_source_value = Math.max(0, Math.floor(seconds));
  const mm = Math.floor(dkd_source_value / 60);
  const ss = dkd_source_value % 60;
  return mm <= 0 ? `${ss}s` : `${mm}m ${String(ss).padStart(2, '0')}s`;
}
