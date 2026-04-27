import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const dkd_local_avatar_key_prefix_value = 'dkd:profile-avatar-uri:v1:';
const dkd_local_avatar_dir_value = `${FileSystem.documentDirectory || ''}dkd_profile_avatar/`;

function dkd_local_avatar_key_value(dkd_user_id_value) {
  return `${dkd_local_avatar_key_prefix_value}${String(dkd_user_id_value || 'guest')}`;
}

async function dkd_ensure_local_avatar_dir_value() {
  if (!dkd_local_avatar_dir_value) return;
  try {
    const dkd_dir_info_value = await FileSystem.getInfoAsync(dkd_local_avatar_dir_value);
    if (!dkd_dir_info_value?.exists) {
      await FileSystem.makeDirectoryAsync(dkd_local_avatar_dir_value, { intermediates: true });
    }
  } catch (dkd_unused_error_value) {}
}

export async function dkd_read_local_profile_avatar_uri_value(dkd_user_id_value) {
  const dkd_key_value = dkd_local_avatar_key_value(dkd_user_id_value);
  const dkd_saved_uri_value = String((await AsyncStorage.getItem(dkd_key_value)) || '').trim();
  if (!dkd_saved_uri_value) return '';
  try {
    const dkd_file_info_value = await FileSystem.getInfoAsync(dkd_saved_uri_value);
    if (!dkd_file_info_value?.exists) {
      await AsyncStorage.removeItem(dkd_key_value);
      return '';
    }
  } catch (dkd_unused_error_value) {
    return '';
  }
  return dkd_saved_uri_value;
}

export async function dkd_save_local_profile_avatar_uri_value(dkd_user_id_value, dkd_source_uri_value) {
  const dkd_source_value = String(dkd_source_uri_value || '').trim();
  if (!dkd_source_value) return '';
  await dkd_ensure_local_avatar_dir_value();
  const dkd_target_uri_value = `${dkd_local_avatar_dir_value}${String(dkd_user_id_value || 'guest')}.jpg`;
  try {
    const dkd_existing_info_value = await FileSystem.getInfoAsync(dkd_target_uri_value);
    if (dkd_existing_info_value?.exists) {
      await FileSystem.deleteAsync(dkd_target_uri_value, { idempotent: true });
    }
  } catch (dkd_unused_error_value) {}
  await FileSystem.copyAsync({ from: dkd_source_value, to: dkd_target_uri_value });
  await AsyncStorage.setItem(dkd_local_avatar_key_value(dkd_user_id_value), dkd_target_uri_value);
  return dkd_target_uri_value;
}

export async function dkd_clear_local_profile_avatar_uri_value(dkd_user_id_value) {
  const dkd_key_value = dkd_local_avatar_key_value(dkd_user_id_value);
  const dkd_saved_uri_value = String((await AsyncStorage.getItem(dkd_key_value)) || '').trim();
  if (dkd_saved_uri_value) {
    try {
      await FileSystem.deleteAsync(dkd_saved_uri_value, { idempotent: true });
    } catch (dkd_unused_error_value) {}
  }
  await AsyncStorage.removeItem(dkd_key_value);
  return '';
}
