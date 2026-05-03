import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getCacheJson(key, fallback = null) {
  if (!key) return fallback;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (dkd_error_value) {
    console.log('[Lootonia][cache][read]', key, dkd_error_value?.message || String(dkd_error_value));
    return fallback;
  }
}

export async function setCacheJson(key, value) {
  if (!key) return false;
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (dkd_error_value) {
    console.log('[Lootonia][cache][write]', key, dkd_error_value?.message || String(dkd_error_value));
    return false;
  }
}
