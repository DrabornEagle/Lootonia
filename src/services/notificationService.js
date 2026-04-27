import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import { dayKey, nextLocalMidnight } from '../utils/date';

let notificationsModulePromise = null;
let deviceModulePromise = null;

const dkd_notification_open_once_storage_key = 'dkd_notification_open_once_history_v2';
const dkd_notification_open_once_max_items = 40;

function getProjectId() {
  return Constants?.easConfig?.projectId || Constants?.expoConfig?.extra?.eas?.projectId || null;
}

function isExpoGo() {
  return Constants?.appOwnership === 'expo';
}

export function canUseRemotePush() {
  return !(Platform.OS === 'android' && isExpoGo());
}

export function canUseNotificationRuntime() {
  return !(Platform.OS === 'android' && isExpoGo());
}

async function getNotificationsModule() {
  if (!canUseNotificationRuntime()) return null;
  if (!notificationsModulePromise) notificationsModulePromise = import('expo-notifications');
  return notificationsModulePromise;
}

async function getDeviceModule() {
  if (!deviceModulePromise) deviceModulePromise = import('expo-device');
  return deviceModulePromise;
}

export async function ensureNotificationChannel() {
  const Notifications = await getNotificationsModule();
  if (!Notifications || Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('lootonia-core', {
    name: 'Lootonia Core',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 180, 120, 220],
    lightColor: '#0EA5E9',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

export async function primeNotificationsRuntime() {
  if (!canUseNotificationRuntime()) {
    return { ok: false, reason: 'expo_go_android_notification_runtime_unavailable' };
  }

  try {
    const Notifications = await getNotificationsModule();
    if (!Notifications) {
      return { ok: false, reason: 'notifications_module_unavailable' };
    }
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    await ensureNotificationChannel();
    return { ok: true, mode: canUseRemotePush() ? 'push-ready' : 'local-only' };
  } catch (dkd_error_value) {
    return { ok: false, reason: dkd_error_value?.message || String(dkd_error_value) };
  }
}

export async function registerDeviceForRemotePush() {
  try {
    if (!canUseRemotePush()) {
      return { ok: false, reason: 'expo_go_android_remote_push_unavailable', mode: 'expo-go-local-only' };
    }

    await primeNotificationsRuntime();

    const Device = await getDeviceModule();
    if (!Device?.isDevice) {
      return { ok: false, reason: 'physical_device_required' };
    }

    const Notifications = await getNotificationsModule();
    if (!Notifications) {
      return { ok: false, reason: 'notifications_module_unavailable' };
    }

    const existing = await Notifications.getPermissionsAsync();
    let finalStatus = existing?.status;
    if (finalStatus !== 'granted') {
      const asked = await Notifications.requestPermissionsAsync();
      finalStatus = asked?.status;
    }
    if (finalStatus !== 'granted') {
      return { ok: false, reason: 'permission_denied' };
    }

    const projectId = getProjectId();
    if (!projectId) {
      return { ok: false, reason: 'missing_project_id' };
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    const { error } = await supabase.rpc('dkd_upsert_push_token', {
      dkd_param_token: token,
      dkd_param_platform: Platform.OS,
      dkd_param_app_mode: isExpoGo() ? 'expo-go' : 'dev-client',
      dkd_param_device_name: Device?.deviceName || null,
    });
    if (error) throw error;

    return { ok: true, token, mode: isExpoGo() ? 'expo-go' : 'dev-client' };
  } catch (dkd_error_value) {
    return { ok: false, reason: dkd_error_value?.message || String(dkd_error_value) };
  }
}

export async function disableRemotePushToken(token) {
  if (!token) return { ok: true };
  const { error } = await supabase.rpc('dkd_disable_push_token', { dkd_param_token: token });
  if (error) return { ok: false, reason: error?.message || String(error) };
  return { ok: true };
}

function getRoutePayloadFromResponse(response) {
  return response?.notification?.request?.content?.data || {};
}

function dkd_build_notification_open_once_key(dkd_response_value) {
  const dkd_identifier_value = String(dkd_response_value?.notification?.request?.identifier || '').trim();
  const dkd_payload_value = getRoutePayloadFromResponse(dkd_response_value);
  const dkd_queue_id_value = String(dkd_payload_value?.dkd_queue_id || '').trim();
  const dkd_event_key_value = String(dkd_payload_value?.dkd_event_key || '').trim();
  const dkd_job_id_value = String(
    dkd_payload_value?.jobId
    || dkd_payload_value?.job_id
    || dkd_payload_value?.targetJobId
    || '',
  ).trim();
  const dkd_route_value = String(
    dkd_payload_value?.targetScreen
    || dkd_payload_value?.route
    || dkd_payload_value?.screen
    || '',
  ).trim();

  return [
    dkd_identifier_value,
    dkd_queue_id_value,
    dkd_event_key_value,
    dkd_job_id_value,
    dkd_route_value,
  ].filter(Boolean).join('::');
}

async function dkd_read_notification_open_once_history_value() {
  try {
    const dkd_raw_value = await AsyncStorage.getItem(dkd_notification_open_once_storage_key);
    const dkd_list_value = dkd_raw_value ? JSON.parse(dkd_raw_value) : [];
    return Array.isArray(dkd_list_value)
      ? dkd_list_value.map((dkd_item_value) => String(dkd_item_value || '').trim()).filter(Boolean)
      : [];
  } catch (_dkd_error_value) {
    return [];
  }
}

async function dkd_write_notification_open_once_history_value(dkd_open_once_key_list_value) {
  const dkd_unique_key_list_value = Array.from(new Set(
    (Array.isArray(dkd_open_once_key_list_value) ? dkd_open_once_key_list_value : [])
      .map((dkd_item_value) => String(dkd_item_value || '').trim())
      .filter(Boolean),
  )).slice(-dkd_notification_open_once_max_items);

  await AsyncStorage.setItem(
    dkd_notification_open_once_storage_key,
    JSON.stringify(dkd_unique_key_list_value),
  );
}

async function dkd_should_handle_notification_once(dkd_response_value) {
  try {
    if (!dkd_response_value) return false;

    const dkd_open_once_key_value = dkd_build_notification_open_once_key(dkd_response_value);
    if (!dkd_open_once_key_value) return true;

    const dkd_open_once_key_list_value = await dkd_read_notification_open_once_history_value();
    if (dkd_open_once_key_list_value.includes(dkd_open_once_key_value)) {
      return false;
    }

    await dkd_write_notification_open_once_history_value([
      ...dkd_open_once_key_list_value,
      dkd_open_once_key_value,
    ]);

    return true;
  } catch (dkd_error_value) {
    return true;
  }
}

export async function attachNotificationRouteListener(onNavigate) {
  if (!canUseNotificationRuntime()) return () => {};

  const Notifications = await getNotificationsModule();
  if (!Notifications) return () => {};

  const listener = Notifications.addNotificationResponseReceivedListener(async (dkd_response_value) => {
    try {
      const dkd_should_open_value = await dkd_should_handle_notification_once(dkd_response_value);
      if (!dkd_should_open_value) return;

      const dkd_payload_value = getRoutePayloadFromResponse(dkd_response_value);
      onNavigate?.(dkd_payload_value);
    } catch (dkd_unused_value) {}
  });

  try {
    const dkd_last_response_value = await Notifications.getLastNotificationResponseAsync?.();
    const dkd_should_open_value = await dkd_should_handle_notification_once(dkd_last_response_value);
    if (!dkd_should_open_value) {
      return () => listener?.remove?.();
    }

    const dkd_payload_value = getRoutePayloadFromResponse(dkd_last_response_value);
    if (dkd_payload_value && Object.keys(dkd_payload_value).length) {
      onNavigate?.(dkd_payload_value);
    }
  } catch (dkd_unused_value) {}

  return () => listener?.remove?.();
}

const dkd_boss_ready_notification_storage_key = 'dkd_boss_ready_notification_identifier';

function dkd_is_daily_boss_finished_value(dkd_boss_state_value) {
  const dkd_today_value = dayKey();
  const dkd_is_today_value = String(dkd_boss_state_value?.day || '') === dkd_today_value;
  const dkd_is_drop_boss_value = !!dkd_boss_state_value?.drop_id;
  const dkd_is_finished_value = !!(dkd_boss_state_value && (dkd_boss_state_value.victory || dkd_boss_state_value.solved || dkd_boss_state_value.escaped));
  return dkd_is_today_value && !dkd_is_drop_boss_value && dkd_is_finished_value;
}

async function dkd_clear_boss_ready_notification() {
  if (!canUseNotificationRuntime()) return { ok: true, mode: 'skipped_runtime_unavailable' };
  try {
    const Notifications = await getNotificationsModule();
    if (!Notifications) return { ok: false, reason: 'notifications_module_unavailable' };
    const dkd_existing_identifier_value = await AsyncStorage.getItem(dkd_boss_ready_notification_storage_key);
    if (dkd_existing_identifier_value) {
      await Notifications.cancelScheduledNotificationAsync(dkd_existing_identifier_value).catch(() => null);
      await AsyncStorage.removeItem(dkd_boss_ready_notification_storage_key);
    }
    return { ok: true, mode: 'cleared' };
  } catch (dkd_error_value) {
    return { ok: false, reason: dkd_error_value?.message || String(dkd_error_value) };
  }
}

export async function dkd_sync_boss_ready_notification(dkd_boss_state_value) {
  if (!canUseNotificationRuntime()) {
    return { ok: false, reason: 'expo_go_android_notification_runtime_unavailable' };
  }

  if (!dkd_is_daily_boss_finished_value(dkd_boss_state_value)) {
    return dkd_clear_boss_ready_notification();
  }

  try {
    const Notifications = await getNotificationsModule();
    if (!Notifications) {
      return { ok: false, reason: 'notifications_module_unavailable' };
    }

    const dkd_existing_permission_value = await Notifications.getPermissionsAsync();
    let dkd_final_status_value = dkd_existing_permission_value?.status;
    if (dkd_final_status_value !== 'granted') {
      const dkd_requested_permission_value = await Notifications.requestPermissionsAsync();
      dkd_final_status_value = dkd_requested_permission_value?.status;
    }
    if (dkd_final_status_value !== 'granted') {
      return { ok: false, reason: 'permission_denied' };
    }

    await dkd_clear_boss_ready_notification();
    await ensureNotificationChannel();

    const dkd_trigger_date_value = nextLocalMidnight(new Date());
    const dkd_notification_identifier_value = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Boss Hazır',
        body: 'Yeni boss hazır. Radar çekirdeğini aç ve baskına başla.',
        sound: 'default',
        data: {
          route: 'map',
          targetScreen: 'map',
          dkd_notification_kind: 'boss_ready',
        },
      },
      trigger: dkd_trigger_date_value,
    });

    await AsyncStorage.setItem(dkd_boss_ready_notification_storage_key, dkd_notification_identifier_value);

    return {
      ok: true,
      mode: 'scheduled',
      notificationId: dkd_notification_identifier_value,
      triggerAt: dkd_trigger_date_value.toISOString(),
    };
  } catch (dkd_error_value) {
    return { ok: false, reason: dkd_error_value?.message || String(dkd_error_value) };
  }
}
