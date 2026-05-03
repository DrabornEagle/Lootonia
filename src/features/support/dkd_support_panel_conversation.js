import React, {
  useCallback as dkd_use_callback,
  useEffect as dkd_use_effect,
  useMemo as dkd_use_memo,
  useRef as dkd_use_ref,
  useState as dkd_use_state
} from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase, dkd_supabase_runtime_config } from '../../lib/supabase';
import { dkd_make_native_axis_point } from '../../utils/dkdNativeAxis';

const dkd_support_storage_key = 'dkd_lootonia_support_drafts_v2';

const dkd_support_topic_list = Object.freeze([
  {
    dkd_key: 'dkd_courier_cargo',
    dkd_title: 'Kurye / Kargo',
    dkd_text: 'Kurye takibi, kargo gönderisi, acil kurye ve teslimat sorunları.',
    dkd_icon: 'truck-fast-outline',
    dkd_tone: ['#32D7FF', '#4874FF'],
  },
  {
    dkd_key: 'dkd_market_order',
    dkd_title: 'Market Siparişi',
    dkd_text: 'İşletme ürünü, sipariş geçmişi, teslimat ve ürün sorunları.',
    dkd_icon: 'storefront-outline',
    dkd_tone: ['#FFB84D', '#FF6B7A'],
  },
  {
    dkd_key: 'dkd_account_wallet',
    dkd_title: 'Hesap / Bakiye',
    dkd_text: 'Profil, giriş, bakiye, ödeme ve hesap erişimiyle ilgili destek.',
    dkd_icon: 'account-heart-outline',
    dkd_tone: ['#A782FF', '#FF72D2'],
  },
  {
    dkd_key: 'dkd_technical_problem',
    dkd_title: 'Teknik Hata',
    dkd_text: 'Beyaz ekran, yavaş çalışma, buton çalışmaması ve uygulama hataları.',
    dkd_icon: 'bug-check-outline',
    dkd_tone: ['#6EE7B7', '#22C55E'],
  },
]);

const dkd_support_priority_list = Object.freeze([
  {
    dkd_key: 'dkd_normal',
    dkd_title: 'Normal',
    dkd_icon: 'clock-outline',
    dkd_color: '#93C5FD',
  },
  {
    dkd_key: 'dkd_important',
    dkd_title: 'Önemli',
    dkd_icon: 'alert-circle-outline',
    dkd_color: '#FDE68A',
  },
  {
    dkd_key: 'dkd_urgent',
    dkd_title: 'Acil',
    dkd_icon: 'fire-alert',
    dkd_color: '#FDA4AF',
  },
]);

const dkd_support_filter_list = Object.freeze([
  { dkd_key: 'dkd_all', dkd_title: 'Tümü', dkd_icon: 'view-dashboard-outline' },
  { dkd_key: 'dkd_open', dkd_title: 'Açık', dkd_icon: 'bell-alert-outline' },
  { dkd_key: 'dkd_answered', dkd_title: 'Yanıtlandı', dkd_icon: 'message-reply-text' },
  { dkd_key: 'dkd_closed', dkd_title: 'Çözüldü', dkd_icon: 'check-decagram-outline' },
]);

function dkd_get_support_topic(dkd_topic_key) {
  return (
    dkd_support_topic_list.find(
      (dkd_support_topic_item) => dkd_support_topic_item.dkd_key === dkd_topic_key,
    ) || dkd_support_topic_list[0]
  );
}

function dkd_get_support_priority(dkd_priority_key) {
  return (
    dkd_support_priority_list.find(
      (dkd_support_priority_item) => dkd_support_priority_item.dkd_key === dkd_priority_key,
    ) || dkd_support_priority_list[0]
  );
}


function dkd_format_ticket_code(dkd_ticket_code_text) {
  const dkd_clean_ticket_code_text = String(dkd_ticket_code_text || '').trim();
  const dkd_ticket_parts = dkd_clean_ticket_code_text.split('-').filter(Boolean);
  const dkd_ticket_last_part = dkd_ticket_parts[dkd_ticket_parts.length - 1] || '';

  if (/^\d{3,6}$/.test(dkd_ticket_last_part)) {
    return 'DKD-' + dkd_ticket_last_part;
  }

  if (dkd_clean_ticket_code_text.startsWith('DKD-') && dkd_clean_ticket_code_text.length > 12) {
    return dkd_clean_ticket_code_text.slice(0, 8) + '…';
  }

  return dkd_clean_ticket_code_text || 'DKD';
}

function dkd_get_ai_issue_title(dkd_ai_issue_text) {
  const dkd_clean_ai_issue_text = String(dkd_ai_issue_text || '').trim();
  if (!dkd_clean_ai_issue_text) return '';
  if (dkd_clean_ai_issue_text === 'dkd_gemini_answered' || dkd_clean_ai_issue_text === 'dkd_ai_answered') return 'DKDai Yanıtladı';
  if (dkd_clean_ai_issue_text.includes('dkd_playbook_fallback')) return 'DKDai yedek destek yanıtı verdi';
  if (dkd_clean_ai_issue_text === 'dkd_admin_needed') return 'Admin yanıtı bekliyor';
  if (dkd_clean_ai_issue_text === 'dkd_ai_error') return 'DKDai hata aldı';
  if (dkd_clean_ai_issue_text === 'dkd_ai_limit_reached') return 'DKDai limit doldu';
  return dkd_clean_ai_issue_text.replace(/^dkd_/, 'DKD ').replace(/_/g, ' ');
}

async function dkd_notify_admins_for_customer_message({
  dkd_thread_id,
  dkd_message_id,
  dkd_ticket_code,
  dkd_topic_title,
  dkd_priority_title,
  dkd_message_text,
}) {
  try {
    const dkd_push_result = await supabase.functions.invoke('dkd-support-customer-message-push', {
      body: {
        dkd_thread_id,
        dkd_message_id,
        dkd_ticket_code,
        dkd_topic_title,
        dkd_priority_title,
        dkd_message_text,
      },
    });

    if (dkd_push_result.error) {
      console.warn('DKD_SUPPORT_CUSTOMER_MESSAGE_PUSH_FUNCTION_ERROR', dkd_push_result.error);
    }

    return dkd_push_result.data || { dkd_ok: false, dkd_reason_key: 'dkd_customer_push_no_data' };
  } catch (dkd_customer_push_error) {
    console.warn('DKD_SUPPORT_CUSTOMER_MESSAGE_PUSH_ERROR', dkd_customer_push_error);
    return {
      dkd_ok: false,
      dkd_reason_key: 'dkd_customer_push_runtime_error',
      dkd_issue_text: dkd_customer_push_error?.message || 'Admin bildirimi gönderilemedi.',
    };
  }
}
function dkd_make_ticket_code() {
  const dkd_ticket_date_text = new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, '')
    .slice(0, 12);
  const dkd_ticket_random_text = String(Math.floor(1000 + Math.random() * 9000));
  return `DKD-${dkd_ticket_date_text}-${dkd_ticket_random_text}`;
}

function dkd_clean_message_text(dkd_message_text) {
  return String(dkd_message_text || '').replace(/\s+/g, ' ').trim();
}

function dkd_format_datetime(dkd_input_value) {
  if (!dkd_input_value) return '-';

  try {
    return new Date(dkd_input_value).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}

function dkd_get_status_title(dkd_status_key, dkd_status_title) {
  if (dkd_status_title) {
    const dkd_clean_status_title = String(dkd_status_title || '').trim();
    if (
      dkd_clean_status_title === 'Gemini yanıtladı'
      || dkd_clean_status_title === 'DKDai yanıt verdi'
      || dkd_clean_status_title === 'dkd_gemini_answered'
      || dkd_clean_status_title === 'dkd_ai_answered'
    ) {
      return 'DKDai Yanıtladı';
    }
    return dkd_clean_status_title;
  }
  if (dkd_status_key === 'dkd_answered') return 'Destek yanıtladı';
  if (dkd_status_key === 'dkd_closed') return 'Çözüldü';
  if (dkd_status_key === 'dkd_local_only') return 'Cihazda kayıtlı';
  if (dkd_status_key === 'dkd_waiting_login') return 'Giriş bekliyor';
  return 'Destek kuyruğunda';
}


function dkd_get_priority_title(dkd_priority_key) {
  return dkd_get_support_priority(dkd_priority_key).dkd_title;
}

function dkd_get_priority_color(dkd_priority_key) {
  return dkd_get_support_priority(dkd_priority_key).dkd_color;
}

async function dkd_check_support_admin_status() {
  if (!dkd_supabase_runtime_config.dkd_is_ready) {
    return false;
  }

  try {
    const dkd_admin_result = await supabase.rpc('dkd_is_admin');
    return Boolean(dkd_admin_result?.data) && !dkd_admin_result?.error;
  } catch (dkd_admin_error) {
    console.warn('DKD_SUPPORT_ADMIN_CHECK_ERROR', dkd_admin_error);
    return false;
  }
}

async function dkd_create_remote_support_request({ dkd_ticket_item }) {
  if (!dkd_supabase_runtime_config.dkd_is_ready) {
    return {
      dkd_remote_ok: false,
      dkd_remote_status_key: 'dkd_local_only',
      dkd_remote_status_title: 'Cihazda kayıtlı',
      dkd_remote_message: dkd_supabase_runtime_config.dkd_issue_text || 'Supabase ayarı hazır değil.',
    };
  }

  const dkd_auth_result = await supabase.auth.getUser();
  const dkd_auth_user_id = dkd_auth_result?.data?.user?.id || null;

  if (dkd_auth_result?.error || !dkd_auth_user_id) {
    return {
      dkd_remote_ok: false,
      dkd_remote_status_key: 'dkd_waiting_login',
      dkd_remote_status_title: 'Giriş bekliyor',
      dkd_remote_message: 'Supabase destek kuyruğuna göndermek için kullanıcı girişi gerekli.',
    };
  }

  const dkd_rpc_result = await supabase.rpc('dkd_create_support_thread_with_message', {
    dkd_param_ticket_code: dkd_ticket_item.dkd_ticket_code,
    dkd_param_topic_key: dkd_ticket_item.dkd_topic_key,
    dkd_param_topic_title: dkd_ticket_item.dkd_topic_title,
    dkd_param_priority_key: dkd_ticket_item.dkd_priority_key,
    dkd_param_contact_note: dkd_ticket_item.dkd_contact_note,
    dkd_param_message_text: dkd_ticket_item.dkd_message_text,
    dkd_param_source_key: 'dkd_mobile_app',
  });

  if (dkd_rpc_result.error) {
    throw dkd_rpc_result.error;
  }

  const dkd_response_payload = dkd_rpc_result.data || {};

  return {
    dkd_remote_ok: Boolean(dkd_response_payload.dkd_ok),
    dkd_remote_thread_id: dkd_response_payload.dkd_thread_id || null,
    dkd_remote_message_id: dkd_response_payload.dkd_message_id || null,
    dkd_remote_status_key: dkd_response_payload.dkd_status_key || 'dkd_open',
    dkd_remote_status_title: dkd_response_payload.dkd_status_title || 'Destek kuyruğunda',
    dkd_remote_message: 'Talep Supabase destek kuyruğuna gönderildi.',
  };
}

async function dkd_request_gemini_support_auto_reply({ dkd_thread_id, dkd_message_id, dkd_ticket_code, dkd_message_text }) {
  if (!dkd_supabase_runtime_config.dkd_is_ready || !dkd_thread_id) {
    return {
      dkd_ai_ok: false,
      dkd_ai_answered: false,
      dkd_admin_needed: true,
      dkd_reason_key: 'dkd_supabase_not_ready',
    };
  }

  try {
    const dkd_function_result = await supabase.functions.invoke('dkd-support-gemini-auto-reply', {
      body: {
        dkd_thread_id,
        dkd_message_id: dkd_message_id || null,
        dkd_ticket_code: dkd_ticket_code || null,
        dkd_message_text: dkd_message_text || null,
      },
    });

    if (dkd_function_result.error) {
      console.warn('DKD_GEMINI_SUPPORT_FUNCTION_ERROR', dkd_function_result.error);
      return {
        dkd_ai_ok: false,
        dkd_ai_answered: false,
        dkd_admin_needed: true,
        dkd_reason_key: 'dkd_function_error',
        dkd_issue_text: dkd_function_result.error?.message || 'Gemini Edge Function hatası.',
      };
    }

    const dkd_function_payload = dkd_function_result.data || {};

    return {
      dkd_ai_ok: Boolean(dkd_function_payload.dkd_ok),
      dkd_ai_answered: Boolean(dkd_function_payload.dkd_ai_answered),
      dkd_admin_needed: Boolean(dkd_function_payload.dkd_admin_needed),
      dkd_reason_key: dkd_function_payload.dkd_reason_key || '',
      dkd_issue_text: dkd_function_payload.dkd_issue_text || '',
    };
  } catch (dkd_function_error) {
    console.warn('DKD_GEMINI_SUPPORT_AUTO_REPLY_ERROR', dkd_function_error);
    return {
      dkd_ai_ok: false,
      dkd_ai_answered: false,
      dkd_admin_needed: true,
      dkd_reason_key: 'dkd_function_runtime_error',
      dkd_issue_text: dkd_function_error?.message || 'Gemini otomatik yanıt başlatılamadı.',
    };
  }
}

function dkd_support_topic_card({
  dkd_support_topic_item,
  dkd_selected_topic_key,
  dkd_on_select_topic,
}) {
  const dkd_is_selected = dkd_selected_topic_key === dkd_support_topic_item.dkd_key;
  return (
    <Pressable
      key={dkd_support_topic_item.dkd_key}
      onPress={() => dkd_on_select_topic(dkd_support_topic_item.dkd_key)}
      style={dkd_styles.dkd_topic_pressable}
    >
      <LinearGradient
        colors={
          dkd_is_selected
            ? ['rgba(103,232,249,0.24)', 'rgba(167,139,250,0.16)']
            : ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.04)']
        }
        start={dkd_make_native_axis_point(0, 0)}
        end={dkd_make_native_axis_point(1, 1)}
        style={[
          dkd_styles.dkd_topic_card,
          dkd_is_selected && dkd_styles.dkd_topic_card_selected,
        ]}
      >
        <LinearGradient
          colors={dkd_support_topic_item.dkd_tone}
          start={dkd_make_native_axis_point(0, 0)}
          end={dkd_make_native_axis_point(1, 1)}
          style={dkd_styles.dkd_topic_icon_shell}
        >
          <MaterialCommunityIcons
            name={dkd_support_topic_item.dkd_icon}
            size={19}
            color="#08111F"
          />
        </LinearGradient>
        <View style={dkd_styles.dkd_topic_body}>
          <Text style={dkd_styles.dkd_topic_title}>{dkd_support_topic_item.dkd_title}</Text>
          <Text style={dkd_styles.dkd_topic_text}>{dkd_support_topic_item.dkd_text}</Text>
        </View>
        <MaterialCommunityIcons
          name={dkd_is_selected ? 'check-circle' : 'chevron-right'}
          size={20}
          color={dkd_is_selected ? '#67E8F9' : 'rgba(255,255,255,0.70)'}
        />
      </LinearGradient>
    </Pressable>
  );
}

function dkd_support_priority_chip({
  dkd_support_priority_item,
  dkd_selected_priority_key,
  dkd_on_select_priority,
}) {
  const dkd_is_selected = dkd_selected_priority_key === dkd_support_priority_item.dkd_key;
  return (
    <Pressable
      key={dkd_support_priority_item.dkd_key}
      onPress={() => dkd_on_select_priority(dkd_support_priority_item.dkd_key)}
      style={[
        dkd_styles.dkd_priority_chip,
        dkd_is_selected && {
          borderColor: dkd_support_priority_item.dkd_color,
          backgroundColor: 'rgba(255,255,255,0.11)',
        },
      ]}
    >
      <MaterialCommunityIcons
        name={dkd_support_priority_item.dkd_icon}
        size={15}
        color={dkd_support_priority_item.dkd_color}
      />
      <Text style={dkd_styles.dkd_priority_chip_text}>{dkd_support_priority_item.dkd_title}</Text>
    </Pressable>
  );
}

function dkd_support_panel_conversation_component({ dkd_visible, dkd_on_close }) {
  const [dkd_selected_topic_key, dkd_set_selected_topic_key] = dkd_use_state('dkd_courier_cargo');
  const [dkd_selected_priority_key, dkd_set_selected_priority_key] = dkd_use_state('dkd_normal');
  const [dkd_message_text, dkd_set_message_text] = dkd_use_state('');
  const [dkd_contact_note, dkd_set_contact_note] = dkd_use_state('');
  const [dkd_reply_text, dkd_set_reply_text] = dkd_use_state('');
  const [dkd_support_history, dkd_set_support_history] = dkd_use_state([]);
  const [dkd_remote_threads, dkd_set_remote_threads] = dkd_use_state([]);
  const [dkd_selected_thread, dkd_set_selected_thread] = dkd_use_state(null);
  const [dkd_thread_messages, dkd_set_thread_messages] = dkd_use_state([]);
  const [dkd_active_filter_key, dkd_set_active_filter_key] = dkd_use_state('dkd_all');
  const [dkd_is_admin_user, dkd_set_is_admin_user] = dkd_use_state(false);
  const [dkd_is_saving, dkd_set_is_saving] = dkd_use_state(false);
  const [dkd_is_loading_threads, dkd_set_is_loading_threads] = dkd_use_state(false);
  const [dkd_is_loading_messages, dkd_set_is_loading_messages] = dkd_use_state(false);
  const [dkd_is_sending_reply, dkd_set_is_sending_reply] = dkd_use_state(false);
  const [dkd_error_text, dkd_set_error_text] = dkd_use_state('');
  const [dkd_visible_thread_count, dkd_set_visible_thread_count] = dkd_use_state(2);
  const [dkd_device_history_open, dkd_set_device_history_open] = dkd_use_state(false);
  const dkd_selected_thread_ref = dkd_use_ref(null);

  const dkd_selected_topic = dkd_use_memo(
    () => dkd_get_support_topic(dkd_selected_topic_key),
    [dkd_selected_topic_key],
  );

  const dkd_filtered_threads = dkd_use_memo(() => {
    if (dkd_active_filter_key === 'dkd_all') return dkd_remote_threads;
    if (dkd_active_filter_key === 'dkd_admin_needed') {
      return dkd_remote_threads.filter(
        (dkd_thread_item) => Boolean(dkd_thread_item?.dkd_admin_needed)
          || dkd_thread_item?.dkd_ai_status_key === 'dkd_admin_needed'
          || dkd_thread_item?.dkd_ai_status_key === 'dkd_ai_error'
          || dkd_thread_item?.dkd_ai_status_key === 'dkd_ai_limit_reached',
      );
    }
    return dkd_remote_threads.filter(
      (dkd_thread_item) => dkd_thread_item?.dkd_status_key === dkd_active_filter_key,
    );
  }, [dkd_active_filter_key, dkd_remote_threads]);


  const dkd_visible_filtered_threads = dkd_use_memo(
    () => dkd_filtered_threads.slice(0, dkd_visible_thread_count),
    [dkd_filtered_threads, dkd_visible_thread_count],
  );

  const dkd_has_more_filtered_threads = dkd_filtered_threads.length > dkd_visible_thread_count;

  dkd_use_effect(() => {
    dkd_selected_thread_ref.current = dkd_selected_thread;
  }, [dkd_selected_thread]);

  dkd_use_effect(() => {
    dkd_set_visible_thread_count(2);
    if (dkd_active_filter_key === 'dkd_admin_needed') {
      dkd_set_active_filter_key('dkd_all');
    }
  }, [dkd_active_filter_key]);
  const dkd_load_support_history = dkd_use_callback(async () => {
    try {
      const dkd_saved_text = await AsyncStorage.getItem(dkd_support_storage_key);
      const dkd_saved_list = dkd_saved_text ? JSON.parse(dkd_saved_text) : [];
      dkd_set_support_history(Array.isArray(dkd_saved_list) ? dkd_saved_list : []);
    } catch (dkd_history_error) {
      console.warn('DKD_SUPPORT_HISTORY_LOAD_ERROR', dkd_history_error);
      dkd_set_support_history([]);
    }
  }, []);

  const dkd_load_thread_messages = dkd_use_callback(async (dkd_thread_id) => {
    if (!dkd_thread_id || !dkd_supabase_runtime_config.dkd_is_ready) {
      dkd_set_is_loading_messages(false);
      dkd_set_thread_messages([]);
      return;
    }

    dkd_set_is_loading_messages(true);
    dkd_set_error_text('');

    try {
      const dkd_message_result = await supabase
        .from('dkd_support_messages')
        .select('dkd_id, dkd_thread_id, dkd_user_id, dkd_sender_key, dkd_sender_title, dkd_message_text, dkd_created_at')
        .eq('dkd_thread_id', dkd_thread_id)
        .order('dkd_created_at', { ascending: true });

      if (dkd_message_result.error) {
        dkd_set_error_text(dkd_message_result.error.message || 'Destek mesajları yüklenemedi.');
        dkd_set_thread_messages([]);
        return;
      }

      dkd_set_thread_messages(Array.isArray(dkd_message_result.data) ? dkd_message_result.data : []);
    } catch (dkd_message_load_error) {
      console.warn('DKD_SUPPORT_MESSAGE_LOAD_ERROR', dkd_message_load_error);
      dkd_set_error_text(dkd_message_load_error?.message || 'Destek mesajları yüklenemedi.');
      dkd_set_thread_messages([]);
    } finally {
      dkd_set_is_loading_messages(false);
    }
  }, []);

  const dkd_load_support_threads = dkd_use_callback(async () => {
    if (!dkd_supabase_runtime_config.dkd_is_ready) {
      dkd_set_error_text(dkd_supabase_runtime_config.dkd_issue_text || 'Supabase ayarı eksik.');
      dkd_set_remote_threads([]);
      dkd_set_selected_thread(null);
      dkd_set_thread_messages([]);
      dkd_set_is_loading_messages(false);
      dkd_set_is_loading_threads(false);
      return;
    }

    dkd_set_is_loading_threads(true);
    dkd_set_error_text('');

    const dkd_thread_result = await supabase
      .from('dkd_support_threads')
      .select('dkd_id, dkd_user_id, dkd_ticket_code, dkd_topic_key, dkd_topic_title, dkd_priority_key, dkd_status_key, dkd_status_title, dkd_contact_note, dkd_source_key, dkd_last_message_text, dkd_ai_status_key, dkd_ai_last_issue_text, dkd_admin_needed, dkd_created_at, dkd_updated_at')
      .order('dkd_updated_at', { ascending: false })
      .limit(60);

    if (dkd_thread_result.error) {
      dkd_set_error_text(dkd_thread_result.error.message || 'Destek konuşmaları yüklenemedi.');
      dkd_set_remote_threads([]);
      dkd_set_selected_thread(null);
      dkd_set_thread_messages([]);
    } else {
      const dkd_safe_threads = Array.isArray(dkd_thread_result.data) ? dkd_thread_result.data : [];
      dkd_set_remote_threads(dkd_safe_threads);

      const dkd_current_selected_thread = dkd_selected_thread_ref.current;
      const dkd_selected_thread_still_exists = dkd_safe_threads.find(
        (dkd_thread_item) => dkd_thread_item.dkd_id === dkd_current_selected_thread?.dkd_id,
      );
      const dkd_next_selected_thread = dkd_selected_thread_still_exists
        ? { ...dkd_current_selected_thread, ...dkd_selected_thread_still_exists }
        : dkd_safe_threads[0] || null;
      dkd_selected_thread_ref.current = dkd_next_selected_thread;
      dkd_set_selected_thread(dkd_next_selected_thread);

      if (dkd_next_selected_thread?.dkd_id) {
        await dkd_load_thread_messages(dkd_next_selected_thread.dkd_id);
      } else {
        dkd_set_thread_messages([]);
        dkd_set_is_loading_messages(false);
      }
    }

    dkd_set_is_loading_threads(false);
  }, [dkd_load_thread_messages, dkd_selected_thread]);

  const dkd_refresh_support_panel = dkd_use_callback(async () => {
    dkd_load_support_history();
    const dkd_admin_status = await dkd_check_support_admin_status();
    dkd_set_is_admin_user(dkd_admin_status);
    dkd_load_support_threads();
  }, [dkd_load_support_history, dkd_load_support_threads]);

  dkd_use_effect(() => {
    if (dkd_visible) {
      dkd_refresh_support_panel();
    }
  }, [dkd_refresh_support_panel, dkd_visible]);

  const dkd_select_thread = dkd_use_callback((dkd_thread_item) => {
    dkd_selected_thread_ref.current = dkd_thread_item;
    dkd_set_selected_thread(dkd_thread_item);
    dkd_set_reply_text('');
    dkd_load_thread_messages(dkd_thread_item?.dkd_id);
  }, [dkd_load_thread_messages]);

  const dkd_submit_support_request = dkd_use_callback(async () => {
    const dkd_clean_text = dkd_clean_message_text(dkd_message_text);
    const dkd_clean_contact_note = dkd_clean_message_text(dkd_contact_note);
    const dkd_selected_priority = dkd_get_support_priority(dkd_selected_priority_key);

    if (dkd_clean_text.length < 12) {
      Alert.alert('Eksik bilgi', 'Destek talebini daha anlaşılır yazmak için en az 12 karakter gir.');
      return;
    }

    dkd_set_is_saving(true);
    try {
      const dkd_ticket_item_base = {
        dkd_ticket_code: dkd_make_ticket_code(),
        dkd_topic_key: dkd_selected_topic_key,
        dkd_topic_title: dkd_selected_topic.dkd_title,
        dkd_priority_key: dkd_selected_priority_key,
        dkd_priority_title: dkd_selected_priority.dkd_title,
        dkd_message_text: dkd_clean_text,
        dkd_contact_note: dkd_clean_contact_note,
        dkd_status_key: 'dkd_local_pending',
        dkd_status_title: 'Gönderiliyor',
        dkd_remote_thread_id: null,
        dkd_remote_message_id: null,
        dkd_sync_issue_text: '',
        dkd_created_at: new Date().toISOString(),
      };

      let dkd_ticket_item = dkd_ticket_item_base;
      let dkd_alert_title = 'Talep cihazda kayıtlı';
      let dkd_alert_message = 'Talep cihaz içinde kaydedildi. Supabase bağlantısı uygun olunca tekrar gönderebiliriz.';

      try {
        const dkd_remote_result = await dkd_create_remote_support_request({ dkd_ticket_item: dkd_ticket_item_base });
        dkd_ticket_item = {
          ...dkd_ticket_item_base,
          dkd_status_key: dkd_remote_result.dkd_remote_status_key,
          dkd_status_title: dkd_remote_result.dkd_remote_status_title,
          dkd_remote_thread_id: dkd_remote_result.dkd_remote_thread_id || null,
          dkd_remote_message_id: dkd_remote_result.dkd_remote_message_id || null,
          dkd_sync_issue_text: dkd_remote_result.dkd_remote_ok ? '' : dkd_remote_result.dkd_remote_message,
        };

        if (dkd_remote_result.dkd_remote_ok) {
          dkd_alert_title = 'Destek talebi gönderildi';
          dkd_alert_message = 'Talep destek konuşmaları listesine eklendi. Gemini otomatik yanıt hazırlanıyor.';


          await dkd_notify_admins_for_customer_message({
            dkd_thread_id: dkd_remote_result.dkd_remote_thread_id,
            dkd_message_id: dkd_remote_result.dkd_remote_message_id,
            dkd_ticket_code: dkd_ticket_item_base.dkd_ticket_code,
            dkd_topic_title: dkd_ticket_item_base.dkd_topic_title,
            dkd_priority_title: dkd_ticket_item_base.dkd_priority_title,
            dkd_message_text: dkd_clean_text,
          });
          const dkd_ai_result = await dkd_request_gemini_support_auto_reply({
            dkd_thread_id: dkd_remote_result.dkd_remote_thread_id,
            dkd_message_id: dkd_remote_result.dkd_remote_message_id,
            dkd_ticket_code: dkd_ticket_item_base.dkd_ticket_code,
            dkd_message_text: dkd_clean_text,
          });

          if (dkd_ai_result.dkd_ai_answered) {
            dkd_alert_message = 'Talep oluşturuldu. DKDai otomatik destek cevabını konuşmaya ekledi. Konuşmalar listesinden cevabı görebilirsin.';
          } else if (dkd_ai_result.dkd_admin_needed) {
            const dkd_ai_issue_suffix = dkd_ai_result.dkd_issue_text
              ? ` Sebep: ${dkd_ai_result.dkd_issue_text}`
              : '';
            dkd_alert_message = `Talep oluşturuldu. Gemini otomatik cevap veremedi; admin ekibi aynı konuşmadan yanıtlayacak.${dkd_ai_issue_suffix}`;
          }
        } else {
          dkd_alert_message = dkd_remote_result.dkd_remote_message || dkd_alert_message;
        }
      } catch (dkd_remote_error) {
        console.warn('DKD_SUPPORT_REMOTE_SUBMIT_ERROR', dkd_remote_error);
        dkd_ticket_item = {
          ...dkd_ticket_item_base,
          dkd_status_key: 'dkd_local_only',
          dkd_status_title: 'Cihazda kayıtlı',
          dkd_sync_issue_text: dkd_remote_error?.message || 'Supabase gönderimi başarısız oldu.',
        };
        dkd_alert_message = 'Supabase gönderimi başarısız oldu; talep cihaz içinde yedek olarak saklandı.';
      }

      const dkd_next_history = [dkd_ticket_item, ...dkd_support_history].slice(0, 8);
      await AsyncStorage.setItem(dkd_support_storage_key, JSON.stringify(dkd_next_history));
      dkd_set_support_history(dkd_next_history);
      dkd_set_message_text('');
      dkd_set_contact_note('');
      Alert.alert(dkd_alert_title, dkd_alert_message);
      dkd_load_support_threads();
    } catch (dkd_submit_error) {
      console.warn('DKD_SUPPORT_SUBMIT_ERROR', dkd_submit_error);
      Alert.alert('Kayıt başarısız', 'Destek talebi cihazda kaydedilemedi. Uygulamayı kapatıp tekrar dene.');
    } finally {
      dkd_set_is_saving(false);
    }
  }, [
    dkd_contact_note,
    dkd_load_support_threads,
    dkd_message_text,
    dkd_selected_priority_key,
    dkd_selected_topic,
    dkd_selected_topic_key,
    dkd_support_history,
  ]);

  const dkd_send_thread_reply = dkd_use_callback(async () => {
    const dkd_clean_reply_text = dkd_clean_message_text(dkd_reply_text);

    if (!dkd_selected_thread?.dkd_id) {
      dkd_set_error_text('Cevap yazmak için bir destek konuşması seç.');
      return;
    }

    if (dkd_clean_reply_text.length < 2) {
      dkd_set_error_text('Göndermek için mesaj alanını doldur.');
      return;
    }

    if (!dkd_supabase_runtime_config.dkd_is_ready) {
      dkd_set_error_text(dkd_supabase_runtime_config.dkd_issue_text || 'Supabase ayarı eksik.');
      return;
    }

    dkd_set_is_sending_reply(true);
    dkd_set_error_text('');

    const dkd_reply_result = await supabase.rpc('dkd_send_support_thread_message', {
      dkd_param_thread_id: dkd_selected_thread.dkd_id,
      dkd_param_message_text: dkd_clean_reply_text,
    });

    if (dkd_reply_result.error) {
      dkd_set_error_text(dkd_reply_result.error.message || 'Destek cevabı gönderilemedi.');
      dkd_set_is_sending_reply(false);
      return;
    }

    dkd_set_reply_text('');

    if (!dkd_is_admin_user && dkd_reply_result.data?.dkd_message_id) {
      await dkd_request_gemini_support_auto_reply({
        dkd_thread_id: dkd_selected_thread.dkd_id,
        dkd_message_id: dkd_reply_result.data.dkd_message_id,
        dkd_ticket_code: dkd_selected_thread.dkd_ticket_code,
        dkd_message_text: dkd_clean_reply_text,
      });
      await dkd_notify_admins_for_customer_message({
        dkd_thread_id: dkd_selected_thread.dkd_id,
        dkd_message_id: dkd_reply_result.data.dkd_message_id,
        dkd_ticket_code: dkd_selected_thread.dkd_ticket_code,
        dkd_topic_title: dkd_selected_thread.dkd_topic_title,
        dkd_priority_title: dkd_get_priority_title(dkd_selected_thread.dkd_priority_key),
        dkd_message_text: dkd_clean_reply_text,
      });

    }

    if (dkd_is_admin_user && dkd_reply_result.data?.dkd_message_id) {
      try {
        await supabase.functions.invoke('dkd-support-admin-reply-push', {
          body: {
            dkd_thread_id: dkd_selected_thread.dkd_id,
            dkd_message_id: dkd_reply_result.data.dkd_message_id,
            dkd_ticket_code: dkd_selected_thread.dkd_ticket_code,
            dkd_message_text: dkd_clean_reply_text,
          },
        });
      } catch (dkd_admin_push_error) {
        console.warn('DKD_SUPPORT_ADMIN_REPLY_PUSH_ERROR', dkd_admin_push_error);
      }
    }

    await dkd_load_thread_messages(dkd_selected_thread.dkd_id);
    await dkd_load_support_threads();
    dkd_set_is_sending_reply(false);
  }, [dkd_is_admin_user, dkd_load_support_threads, dkd_load_thread_messages, dkd_reply_text, dkd_selected_thread]);

  const dkd_close_selected_thread = dkd_use_callback(async () => {
    if (!dkd_selected_thread?.dkd_id || !dkd_is_admin_user) return;

    dkd_set_is_sending_reply(true);
    dkd_set_error_text('');

    const dkd_close_result = await supabase
      .from('dkd_support_threads')
      .update({
        dkd_status_key: 'dkd_closed',
        dkd_status_title: 'Çözüldü',
      })
      .eq('dkd_id', dkd_selected_thread.dkd_id);

    if (dkd_close_result.error) {
      dkd_set_error_text(dkd_close_result.error.message || 'Destek talebi kapatılamadı.');
    } else {
      await dkd_load_support_threads();
    }

    dkd_set_is_sending_reply(false);
  }, [dkd_is_admin_user, dkd_load_support_threads, dkd_selected_thread]);


  const dkd_delete_support_message = dkd_use_callback((dkd_message_item) => {
    if (!dkd_is_admin_user || !dkd_message_item?.dkd_id || !dkd_selected_thread?.dkd_id) return;

    Alert.alert('Mesaj silinsin mi?', 'Bu destek mesajı konuşmadan kaldırılacak.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          dkd_set_is_sending_reply(true);
          dkd_set_error_text('');
          try {
            const dkd_delete_result = await supabase.rpc('dkd_delete_support_message_as_admin', {
              dkd_param_message_id: dkd_message_item.dkd_id,
            });

            if (dkd_delete_result.error) {
              dkd_set_error_text(dkd_delete_result.error.message || 'Destek mesajı silinemedi.');
            } else {
              await dkd_load_thread_messages(dkd_selected_thread.dkd_id);
              await dkd_load_support_threads();
            }
          } catch (dkd_delete_error) {
            console.warn('DKD_SUPPORT_MESSAGE_DELETE_ERROR', dkd_delete_error);
            dkd_set_error_text(dkd_delete_error?.message || 'Destek mesajı silinemedi.');
          } finally {
            dkd_set_is_sending_reply(false);
          }
        },
      },
    ]);
  }, [dkd_is_admin_user, dkd_load_support_threads, dkd_load_thread_messages, dkd_selected_thread]);

  const dkd_delete_selected_support_thread = dkd_use_callback(() => {
    if (!dkd_is_admin_user || !dkd_selected_thread?.dkd_id) return;

    Alert.alert('Konuşma silinsin mi?', 'Bu destek konuşması ve içindeki mesajlar silinecek.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          dkd_set_is_sending_reply(true);
          dkd_set_error_text('');
          try {
            const dkd_delete_result = await supabase.rpc('dkd_delete_support_thread_as_admin', {
              dkd_param_thread_id: dkd_selected_thread.dkd_id,
            });

            if (dkd_delete_result.error) {
              dkd_set_error_text(dkd_delete_result.error.message || 'Destek konuşması silinemedi.');
            } else {
              dkd_selected_thread_ref.current = null;
              dkd_set_selected_thread(null);
              dkd_set_thread_messages([]);
              await dkd_load_support_threads();
            }
          } catch (dkd_delete_error) {
            console.warn('DKD_SUPPORT_THREAD_DELETE_ERROR', dkd_delete_error);
            dkd_set_error_text(dkd_delete_error?.message || 'Destek konuşması silinemedi.');
          } finally {
            dkd_set_is_sending_reply(false);
          }
        },
      },
    ]);
  }, [dkd_is_admin_user, dkd_load_support_threads, dkd_selected_thread]);

  const dkd_recent_history = dkd_support_history.slice(0, 3);

  return (
    <Modal visible={!!dkd_visible} transparent animationType="fade" onRequestClose={dkd_on_close}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={dkd_styles.dkd_backdrop}
      >
        <View style={dkd_styles.dkd_sheet_shell}>
          <LinearGradient
            colors={['#07111F', '#111A35', '#070B15']}
            start={dkd_make_native_axis_point(0, 0)}
            end={dkd_make_native_axis_point(1, 1)}
            style={dkd_styles.dkd_sheet}
          >
            <View style={dkd_styles.dkd_glow_blue} />
            <View style={dkd_styles.dkd_glow_pink} />

            <View style={dkd_styles.dkd_header_row}>
              <LinearGradient
                colors={['#67E8F9', '#A78BFA', '#F472B6']}
                start={dkd_make_native_axis_point(0, 0)}
                end={dkd_make_native_axis_point(1, 1)}
                style={dkd_styles.dkd_header_icon}
              >
                <MaterialCommunityIcons name="face-agent" size={24} color="#07101F" />
              </LinearGradient>
              <View style={dkd_styles.dkd_header_text_block}>
                <Text style={dkd_styles.dkd_kicker}>{dkd_is_admin_user ? 'DKD ADMIN SUPPORT' : 'LOOTONIA DESTEK'}</Text>
                <Text style={dkd_styles.dkd_title}>Destek Paneli</Text>
                <Text style={dkd_styles.dkd_subtitle}>
                  {dkd_is_admin_user
                    ? 'Admin olarak Gemini’nin aktardığı talepleri buradan yanıtla.'
                    : 'Talebini oluştur; Gemini uygunsa otomatik cevaplar, emin değilse admin ekibine aktarır.'}
                </Text>
              </View>
              <Pressable onPress={dkd_on_close} style={dkd_styles.dkd_close_button}>
                <MaterialCommunityIcons name="close" size={20} color="#FFFFFF" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={dkd_styles.dkd_scroll_content}>
              {dkd_error_text ? (
                <View style={dkd_styles.dkd_error_box}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#FDE68A" />
                  <Text style={dkd_styles.dkd_error_text}>{dkd_error_text}</Text>
                </View>
              ) : null}

              <Text style={dkd_styles.dkd_section_title}>Yeni destek talebi oluştur</Text>
              {dkd_support_topic_list.map((dkd_support_topic_item) =>
                dkd_support_topic_card({
                  dkd_support_topic_item,
                  dkd_selected_topic_key,
                  dkd_on_select_topic: dkd_set_selected_topic_key,
                }),
              )}

              <View style={dkd_styles.dkd_priority_row}>
                {dkd_support_priority_list.map((dkd_support_priority_item) =>
                  dkd_support_priority_chip({
                    dkd_support_priority_item,
                    dkd_selected_priority_key,
                    dkd_on_select_priority: dkd_set_selected_priority_key,
                  }),
                )}
              </View>

              <View style={dkd_styles.dkd_input_shell}>
                <Text style={dkd_styles.dkd_input_label}>{dkd_selected_topic.dkd_title}</Text>
                <TextInput
                  value={dkd_message_text}
                  onChangeText={dkd_set_message_text}
                  placeholder="Örn: Kargo takip ekranında destek cevabını göremiyorum..."
                  placeholderTextColor="rgba(255,255,255,0.38)"
                  multiline
                  textAlignVertical="top"
                  style={dkd_styles.dkd_message_input}
                />
              </View>

              <View style={dkd_styles.dkd_input_shell}>
                <Text style={dkd_styles.dkd_input_label}>İletişim notu / sipariş kodu opsiyonel</Text>
                <TextInput
                  value={dkd_contact_note}
                  onChangeText={dkd_set_contact_note}
                  placeholder="Örn: Sipariş kodu, ekran adı veya geri dönüş notu"
                  placeholderTextColor="rgba(255,255,255,0.38)"
                  style={dkd_styles.dkd_contact_input}
                />
              </View>

              <Pressable
                onPress={dkd_submit_support_request}
                disabled={dkd_is_saving}
                style={[dkd_styles.dkd_submit_button, dkd_is_saving && dkd_styles.dkd_submit_button_disabled]}
              >
                <LinearGradient
                  colors={['#67E8F9', '#A78BFA', '#F472B6']}
                  start={dkd_make_native_axis_point(0, 0)}
                  end={dkd_make_native_axis_point(1, 1)}
                  style={dkd_styles.dkd_submit_gradient}
                >
                  <MaterialCommunityIcons name="send-check-outline" size={20} color="#08111F" />
                  <Text style={dkd_styles.dkd_submit_text}>
                    {dkd_is_saving ? 'Gönderiliyor...' : 'Destek Talebi Oluştur'}
                  </Text>
                </LinearGradient>
              </Pressable>

              <View style={dkd_styles.dkd_conversation_panel}>
                <View style={dkd_styles.dkd_conversation_header_row}>
                  <View style={dkd_styles.dkd_conversation_title_wrap}>
                    <Text style={dkd_styles.dkd_history_title}>
                      {dkd_is_admin_user ? 'Tüm destek konuşmaları' : 'Destek konuşmalarım'}
                    </Text>
                    <Text style={dkd_styles.dkd_conversation_subtitle}>
                      {dkd_is_admin_user ? 'Admin cevapları buradan gönderilir.' : 'Admin cevapları burada görünür.'}
                    </Text>
                  </View>
                  <Pressable
                    style={dkd_styles.dkd_refresh_button}
                    onPress={dkd_refresh_support_panel}
                    disabled={dkd_is_loading_threads}
                  >
                    {dkd_is_loading_threads ? (
                      <ActivityIndicator color="#67E8F9" size="small" />
                    ) : (
                      <MaterialCommunityIcons name="refresh" size={18} color="#67E8F9" />
                    )}
                  </Pressable>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={dkd_styles.dkd_filter_row}
                >
                  {dkd_support_filter_list.filter((dkd_filter_item) => dkd_filter_item.dkd_key !== 'dkd_admin_needed').map((dkd_filter_item) => {
                    const dkd_filter_active = dkd_active_filter_key === dkd_filter_item.dkd_key;
                    return (
                      <Pressable
                        key={dkd_filter_item.dkd_key}
                        onPress={() => dkd_set_active_filter_key(dkd_filter_item.dkd_key)}
                        style={[dkd_styles.dkd_filter_chip, dkd_filter_active && dkd_styles.dkd_filter_chip_active]}
                      >
                        <MaterialCommunityIcons
                          name={dkd_filter_item.dkd_icon}
                          size={14}
                          color={dkd_filter_active ? '#07101F' : 'rgba(255,255,255,0.72)'}
                        />
                        <Text style={[dkd_styles.dkd_filter_text, dkd_filter_active && dkd_styles.dkd_filter_text_active]}>
                          {dkd_filter_item.dkd_title}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {dkd_filtered_threads.length ? (
                  <>
                  {dkd_visible_filtered_threads.map((dkd_thread_item) => {
                    const dkd_is_thread_selected = dkd_selected_thread?.dkd_id === dkd_thread_item.dkd_id;
                    return (
                      <Pressable
                        key={dkd_thread_item.dkd_id}
                        onPress={() => dkd_select_thread(dkd_thread_item)}
                        style={[dkd_styles.dkd_thread_card, dkd_is_thread_selected && dkd_styles.dkd_thread_card_selected]}
                      >
                        <View style={dkd_styles.dkd_thread_top_row}>
                          <Text style={dkd_styles.dkd_history_code}>{dkd_format_ticket_code(dkd_thread_item.dkd_ticket_code)}</Text>
                          <View style={[dkd_styles.dkd_priority_pill, { borderColor: dkd_get_priority_color(dkd_thread_item.dkd_priority_key) }]}>
                            <Text style={[dkd_styles.dkd_priority_pill_text, { color: dkd_get_priority_color(dkd_thread_item.dkd_priority_key) }]}>
                              {dkd_get_priority_title(dkd_thread_item.dkd_priority_key)}
                            </Text>
                          </View>
                        </View>
                        <Text style={dkd_styles.dkd_history_topic}>{dkd_thread_item.dkd_topic_title}</Text>
                        <Text style={dkd_styles.dkd_history_message} numberOfLines={2}>
                          {dkd_thread_item.dkd_last_message_text || 'Mesaj özeti yok.'}
                        </Text>
                        <View style={dkd_styles.dkd_thread_meta_row}>
                          <Text style={dkd_styles.dkd_history_status}>
                            {dkd_get_status_title(dkd_thread_item.dkd_status_key, dkd_thread_item.dkd_status_title)}
                          </Text>
                          {dkd_thread_item.dkd_admin_needed ? (
                            <Text style={dkd_styles.dkd_admin_needed_chip}>Admin bekliyor</Text>
                          ) : null}
                          <Text style={dkd_styles.dkd_history_time}>{dkd_format_datetime(dkd_thread_item.dkd_updated_at)}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                  {dkd_has_more_filtered_threads ? (
                    <Pressable
                      style={dkd_styles.dkd_load_more_threads_button}
                      onPress={() => dkd_set_visible_thread_count((dkd_previous_count) => dkd_previous_count + 2)}
                    >
                      <MaterialCommunityIcons name="chevron-down-circle-outline" size={18} color="#67E8F9" />
                      <Text style={dkd_styles.dkd_load_more_threads_text}>Daha fazla destek konuşması göster</Text>
                      <Text style={dkd_styles.dkd_load_more_threads_count}>
                        {dkd_visible_filtered_threads.length}/{dkd_filtered_threads.length}
                      </Text>
                    </Pressable>
                  ) : null}
                  </>
                ) : (
                  <Text style={dkd_styles.dkd_empty_history_text}>
                    {dkd_is_loading_threads ? 'Destek konuşmaları yükleniyor...' : 'Henüz Supabase destek konuşması yok.'}
                  </Text>
                )}

                {dkd_selected_thread ? (
                  <View style={dkd_styles.dkd_thread_detail_card}>
                    <View style={dkd_styles.dkd_thread_detail_header}>
                      <View style={dkd_styles.dkd_thread_detail_text_wrap}>
                        <Text style={dkd_styles.dkd_detail_code}>{dkd_format_ticket_code(dkd_selected_thread.dkd_ticket_code)}</Text>
                        <Text style={dkd_styles.dkd_detail_title}>{dkd_selected_thread.dkd_topic_title}</Text>
                      </View>
                      {dkd_is_admin_user ? (
                        <View style={dkd_styles.dkd_thread_admin_actions}>
                          <Pressable
                            style={dkd_styles.dkd_close_thread_button}
                            onPress={dkd_close_selected_thread}
                            disabled={dkd_is_sending_reply}
                          >
                            <Text style={dkd_styles.dkd_close_thread_text}>Çözüldü</Text>
                          </Pressable>
                          <Pressable
                            style={dkd_styles.dkd_delete_thread_button}
                            onPress={dkd_delete_selected_support_thread}
                            disabled={dkd_is_sending_reply}
                          >
                            <MaterialCommunityIcons name="trash-can-outline" size={14} color="#FECACA" />
                            <Text style={dkd_styles.dkd_delete_thread_text}>Sil</Text>
                          </Pressable>
                        </View>
                      ) : null}
                    </View>

                    {dkd_is_loading_messages && dkd_thread_messages.length === 0 ? (
                      <View style={dkd_styles.dkd_loading_messages_box}>
                        <ActivityIndicator color="#67E8F9" size="small" />
                        <Text style={dkd_styles.dkd_loading_messages_text}>Konuşma yükleniyor...</Text>
                      </View>
                    ) : null}

                    {dkd_thread_messages.map((dkd_message_item) => {
                      const dkd_admin_message = dkd_message_item.dkd_sender_key === 'dkd_admin';
                      const dkd_ai_message = dkd_message_item.dkd_sender_key === 'dkd_ai';
                      const dkd_support_side_message = dkd_admin_message || dkd_ai_message;
                      return (
                        <View
                          key={dkd_message_item.dkd_id}
                          style={[
                            dkd_styles.dkd_message_bubble,
                            dkd_support_side_message ? dkd_styles.dkd_message_bubble_admin : dkd_styles.dkd_message_bubble_customer,
                            dkd_ai_message && dkd_styles.dkd_message_bubble_ai,
                          ]}
                        >
                          <Text style={dkd_styles.dkd_message_sender}>
                            {dkd_message_item.dkd_sender_title || (dkd_ai_message ? 'Lootonia AI Destek' : dkd_admin_message ? 'Destek Ekibi' : 'Müşteri')}
                          </Text>
                          <Text style={dkd_styles.dkd_message_text}>{dkd_message_item.dkd_message_text}</Text>
                          {dkd_is_admin_user ? (
                            <Pressable
                              style={dkd_styles.dkd_delete_message_button}
                              onPress={() => dkd_delete_support_message(dkd_message_item)}
                              disabled={dkd_is_sending_reply}
                            >
                              <MaterialCommunityIcons name="trash-can-outline" size={13} color="#FCA5A5" />
                              <Text style={dkd_styles.dkd_delete_message_text}>Mesajı sil</Text>
                            </Pressable>
                          ) : null}
                          <Text style={dkd_styles.dkd_message_time}>{dkd_format_datetime(dkd_message_item.dkd_created_at)}</Text>
                        </View>
                      );
                    })}

                    {dkd_get_ai_issue_title(dkd_selected_thread.dkd_ai_last_issue_text) ? (
                      <View style={dkd_styles.dkd_ai_issue_box}>
                        <MaterialCommunityIcons name="robot-confused-outline" size={17} color="#FDE68A" />
                        <Text style={dkd_styles.dkd_ai_issue_text}>{dkd_get_ai_issue_title(dkd_selected_thread.dkd_ai_last_issue_text)}</Text>
                      </View>
                    ) : null}

                    <View style={dkd_styles.dkd_reply_box}>
                      <Text style={dkd_styles.dkd_input_label}>
                        {dkd_is_admin_user ? 'Ana sayfa admin cevabı' : 'Ek mesaj yaz'}
                      </Text>
                      <TextInput
                        value={dkd_reply_text}
                        onChangeText={dkd_set_reply_text}
                        placeholder={dkd_is_admin_user ? 'Müşteriye cevap yaz...' : 'Destek ekibine ek mesaj yaz...'}
                        placeholderTextColor="rgba(255,255,255,0.38)"
                        multiline
                        textAlignVertical="top"
                        style={dkd_styles.dkd_reply_input}
                      />
                      <Pressable
                        onPress={dkd_send_thread_reply}
                        disabled={dkd_is_sending_reply}
                        style={[dkd_styles.dkd_reply_button, dkd_is_sending_reply && dkd_styles.dkd_submit_button_disabled]}
                      >
                        <Text style={dkd_styles.dkd_reply_button_text}>
                          {dkd_is_sending_reply
                            ? 'Gönderiliyor...'
                            : dkd_is_admin_user
                              ? 'Admin Cevabı Gönder'
                              : 'Mesajı Gönder'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
              {dkd_recent_history.length ? (
                <View style={dkd_styles.dkd_history_card}>
                  <Pressable
                    style={dkd_styles.dkd_history_toggle_button}
                    onPress={() => dkd_set_device_history_open((dkd_previous_value) => !dkd_previous_value)}
                  >
                    <View style={dkd_styles.dkd_history_header_row_compact}>
                      <MaterialCommunityIcons name="cellphone-message" size={18} color="#C4B5FD" />
                      <Text style={dkd_styles.dkd_history_title}>Cihaz yedek kayıtları</Text>
                    </View>
                    <MaterialCommunityIcons
                      name={dkd_device_history_open ? 'chevron-up-circle-outline' : 'chevron-down-circle-outline'}
                      size={20}
                      color="#A8ECFF"
                    />
                  </Pressable>
                  {dkd_device_history_open ? (
                    <View style={dkd_styles.dkd_history_collapsible_body}>
                      {dkd_recent_history.map((dkd_ticket_item) => (
                        <View key={dkd_ticket_item.dkd_ticket_code} style={dkd_styles.dkd_local_history_item}>
                          <View style={dkd_styles.dkd_thread_top_row}>
                            <Text style={dkd_styles.dkd_history_code}>{dkd_format_ticket_code(dkd_ticket_item.dkd_ticket_code)}</Text>
                            <Text style={dkd_styles.dkd_history_status}>{dkd_ticket_item.dkd_status_title}</Text>
                          </View>
                          <Text style={dkd_styles.dkd_history_topic}>{dkd_ticket_item.dkd_topic_title}</Text>
                          <Text style={dkd_styles.dkd_history_message} numberOfLines={2}>
                            {dkd_ticket_item.dkd_message_text}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : null}
            </ScrollView>
          </LinearGradient>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function dkd_render_support_panel_modal({ dkd_visible, dkd_on_close }) {
  return React.createElement(dkd_support_panel_conversation_component, { dkd_visible, dkd_on_close });
}

const dkd_styles = StyleSheet.create({
  dkd_backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.76)',
    justifyContent: 'center',
    padding: 12,
  },
  dkd_sheet_shell: {
    maxHeight: '94%',
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(15,23,42,0.96)',
  },
  dkd_sheet: {
    minHeight: 520,
    padding: 15,
    overflow: 'hidden',
  },
  dkd_glow_blue: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(103,232,249,0.16)',
    top: -60,
    right: -40,
  },
  dkd_glow_pink: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(244,114,182,0.12)',
    bottom: -80,
    left: -70,
  },
  dkd_header_row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  dkd_header_icon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dkd_header_text_block: {
    flex: 1,
  },
  dkd_kicker: {
    color: '#67E8F9',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  dkd_title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  dkd_subtitle: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  dkd_close_button: {
    width: 38,
    height: 38,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  dkd_scroll_content: {
    paddingBottom: 20,
  },
  dkd_status_card: {
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(103,232,249,0.20)',
    marginBottom: 12,
  },
  dkd_status_top_row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  dkd_status_title: {
    color: '#E0F7FF',
    fontSize: 14,
    fontWeight: '900',
  },
  dkd_status_text: {
    color: 'rgba(255,255,255,0.70)',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  dkd_error_box: {
    borderRadius: 18,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(253,230,138,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(253,230,138,0.18)',
    marginBottom: 12,
  },
  dkd_error_text: {
    flex: 1,
    color: '#FDE68A',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 16,
  },
  dkd_section_title: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 4,
    marginBottom: 8,
  },
  dkd_topic_pressable: {
    marginBottom: 8,
  },
  dkd_topic_card: {
    borderRadius: 20,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  dkd_topic_card_selected: {
    borderColor: 'rgba(103,232,249,0.62)',
  },
  dkd_topic_icon_shell: {
    width: 40,
    height: 40,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  dkd_topic_body: {
    flex: 1,
  },
  dkd_topic_title: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  dkd_topic_text: {
    color: 'rgba(255,255,255,0.64)',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
    marginTop: 2,
  },
  dkd_priority_row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  dkd_priority_chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  dkd_priority_chip_text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  dkd_input_shell: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(2,6,23,0.34)',
    padding: 12,
    marginBottom: 10,
  },
  dkd_input_label: {
    color: '#BFDBFE',
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 8,
  },
  dkd_message_input: {
    minHeight: 96,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  dkd_contact_input: {
    minHeight: 42,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  dkd_submit_button: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 14,
  },
  dkd_submit_button_disabled: {
    opacity: 0.62,
  },
  dkd_submit_gradient: {
    minHeight: 52,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dkd_submit_text: {
    color: '#08111F',
    fontSize: 14,
    fontWeight: '900',
  },
  dkd_conversation_panel: {
    borderRadius: 24,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(103,232,249,0.18)',
    backgroundColor: 'rgba(255,255,255,0.055)',
    marginBottom: 12,
  },
  dkd_conversation_header_row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  dkd_conversation_title_wrap: {
    flex: 1,
  },
  dkd_conversation_subtitle: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  dkd_refresh_button: {
    width: 38,
    height: 38,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(103,232,249,0.28)',
    backgroundColor: 'rgba(103,232,249,0.08)',
  },
  dkd_filter_row: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 6,
    marginBottom: 10,
    paddingRight: 8,
  },
  dkd_filter_chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  dkd_filter_chip_active: {
    backgroundColor: '#67E8F9',
    borderColor: 'rgba(103,232,249,0.88)',
  },
  dkd_filter_text: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10,
    fontWeight: '900',
  },
  dkd_filter_text_active: {
    color: '#07101F',
  },
  dkd_thread_card: {
    borderRadius: 18,
    padding: 11,
    backgroundColor: 'rgba(2,6,23,0.32)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    marginBottom: 8,
  },
  dkd_thread_card_selected: {
    borderColor: 'rgba(103,232,249,0.66)',
    backgroundColor: 'rgba(103,232,249,0.10)',
  },
  dkd_thread_top_row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dkd_priority_pill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  dkd_priority_pill_text: {
    fontSize: 10,
    fontWeight: '900',
  },
  dkd_thread_meta_row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
  },

  dkd_load_more_threads_button: {
    minHeight: 46,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(103,232,249,0.34)',
    backgroundColor: 'rgba(103,232,249,0.10)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 2,
    marginBottom: 10,
  },
  dkd_load_more_threads_text: {
    color: '#E0F7FF',
    fontSize: 12,
    fontWeight: '900',
  },
  dkd_load_more_threads_count: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 10,
    fontWeight: '900',
  },
  dkd_thread_detail_card: {
    borderRadius: 22,
    padding: 12,
    backgroundColor: 'rgba(2,6,23,0.34)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginTop: 8,
  },
  dkd_thread_detail_header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  dkd_thread_detail_text_wrap: {
    flex: 1,
  },
  dkd_detail_code: {
    color: '#A8ECFF',
    fontSize: 11,
    fontWeight: '900',
  },
  dkd_detail_title: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 4,
  },

  dkd_thread_admin_actions: {
    alignItems: 'flex-end',
    gap: 7,
  },
  dkd_delete_thread_button: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.28)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dkd_delete_thread_text: {
    color: '#FECACA',
    fontSize: 10,
    fontWeight: '900',
  },
  dkd_close_thread_button: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#FDE68A',
  },
  dkd_close_thread_text: {
    color: '#111827',
    fontSize: 10,
    fontWeight: '900',
  },
  dkd_loading_messages_box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dkd_loading_messages_text: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 11,
    fontWeight: '800',
  },
  dkd_message_bubble: {
    borderRadius: 18,
    padding: 11,
    marginBottom: 8,
    borderWidth: 1,
  },
  dkd_message_bubble_admin: {
    backgroundColor: 'rgba(103,232,249,0.14)',
    borderColor: 'rgba(103,232,249,0.28)',
    marginLeft: 18,
  },
  dkd_message_bubble_customer: {
    backgroundColor: 'rgba(167,139,250,0.11)',
    borderColor: 'rgba(167,139,250,0.24)',
    marginRight: 18,
  },
  dkd_message_bubble_ai: {
    backgroundColor: 'rgba(34,211,238,0.16)',
    borderColor: 'rgba(34,211,238,0.34)',
  },
  dkd_admin_needed_chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(251,191,36,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.26)',
    color: '#FDE68A',
    fontSize: 10,
    fontWeight: '900',
  },
  dkd_ai_issue_box: {
    marginTop: 12,
    marginBottom: 2,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.24)',
    backgroundColor: 'rgba(251,191,36,0.10)',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  dkd_ai_issue_text: {
    flex: 1,
    color: '#FDE68A',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '800',
  },
  dkd_message_sender: {
    color: '#BFDBFE',
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 4,
  },
  dkd_message_text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },

  dkd_delete_message_button: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.24)',
    backgroundColor: 'rgba(239,68,68,0.10)',
  },
  dkd_delete_message_text: {
    color: '#FCA5A5',
    fontSize: 10,
    fontWeight: '900',
  },
  dkd_message_time: {
    color: 'rgba(255,255,255,0.46)',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 6,
  },
  dkd_reply_box: {
    borderRadius: 18,
    padding: 11,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    marginTop: 4,
  },
  dkd_reply_input: {
    minHeight: 72,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  dkd_reply_button: {
    marginTop: 9,
    minHeight: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#67E8F9',
  },
  dkd_reply_button_text: {
    color: '#07101F',
    fontSize: 13,
    fontWeight: '900',
  },
  dkd_history_card: {
    borderRadius: 22,
    padding: 13,
    borderWidth: 1,
    borderColor: 'rgba(196,181,253,0.20)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  dkd_history_toggle_button: {
    minHeight: 48,
    borderRadius: 18,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dkd_history_header_row_compact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dkd_history_collapsible_body: {
    marginTop: 10,
  },
  dkd_history_header_row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  dkd_history_title: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  dkd_local_history_item: {
    borderRadius: 17,
    padding: 11,
    backgroundColor: 'rgba(2,6,23,0.34)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    marginBottom: 8,
  },
  dkd_history_code: {
    color: '#A8ECFF',
    fontSize: 11,
    fontWeight: '900',
    flex: 1,
  },
  dkd_history_status: {
    color: '#FDE68A',
    fontSize: 10,
    fontWeight: '900',
    flex: 1,
  },
  dkd_history_time: {
    color: 'rgba(255,255,255,0.46)',
    fontSize: 10,
    fontWeight: '800',
  },
  dkd_history_topic: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 5,
  },
  dkd_history_message: {
    color: 'rgba(255,255,255,0.64)',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
    lineHeight: 16,
  },
  dkd_empty_history_text: {
    color: 'rgba(255,255,255,0.56)',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    padding: 10,
  },
});
