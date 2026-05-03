import React, { useCallback as dkd_use_callback, useEffect as dkd_use_effect, useMemo as dkd_use_memo, useState as dkd_use_state } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase, dkd_supabase_runtime_config } from '../../lib/supabase';
import { cityLootTheme } from '../../theme/cityLootTheme';

const dkd_support_filter_options = Object.freeze([
  { dkd_key: 'dkd_all', dkd_title: 'Tümü', dkd_icon: 'view-dashboard-outline' },
  { dkd_key: 'dkd_open', dkd_title: 'Yeni', dkd_icon: 'bell-alert-outline' },
  { dkd_key: 'dkd_answered', dkd_title: 'Yanıtlandı', dkd_icon: 'reply-check-outline' },
  { dkd_key: 'dkd_closed', dkd_title: 'Çözüldü', dkd_icon: 'check-decagram-outline' },
]);

const dkd_support_status_map = Object.freeze({
  dkd_open: 'Destek kuyruğunda',
  dkd_answered: 'Destek yanıtladı',
  dkd_closed: 'Çözüldü',
});

const dkd_priority_title_map = Object.freeze({
  dkd_low: 'Düşük',
  dkd_normal: 'Normal',
  dkd_high: 'Önemli',
  dkd_urgent: 'Acil',
});

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

function dkd_get_priority_title(dkd_priority_key) {
  return dkd_priority_title_map[dkd_priority_key] || 'Normal';
}

function dkd_get_status_title(dkd_status_key, dkd_status_title) {
  return dkd_status_title || dkd_support_status_map[dkd_status_key] || 'Destek kuyruğunda';
}

function dkd_get_priority_accent(dkd_priority_key) {
  if (dkd_priority_key === 'dkd_urgent') return '#ff6b8f';
  if (dkd_priority_key === 'dkd_high') return '#ffd166';
  if (dkd_priority_key === 'dkd_low') return '#8ee5ff';
  return '#65f7b0';
}

export default function dkd_support_admin_queue_modal(dkd_props) {
  const dkd_visible = Boolean(dkd_props?.visible);
  const dkd_on_close = dkd_props?.onClose;
  const [dkd_threads, dkd_set_threads] = dkd_use_state([]);
  const [dkd_selected_thread, dkd_set_selected_thread] = dkd_use_state(null);
  const [dkd_messages, dkd_set_messages] = dkd_use_state([]);
  const [dkd_active_filter, dkd_set_active_filter] = dkd_use_state('dkd_open');
  const [dkd_loading_threads, dkd_set_loading_threads] = dkd_use_state(false);
  const [dkd_loading_messages, dkd_set_loading_messages] = dkd_use_state(false);
  const [dkd_action_loading, dkd_set_action_loading] = dkd_use_state(false);
  const [dkd_error_text, dkd_set_error_text] = dkd_use_state('');
  const [dkd_reply_text, dkd_set_reply_text] = dkd_use_state('');

  const dkd_thread_stats = dkd_use_memo(() => {
    const dkd_stats_value = {
      dkd_total: dkd_threads.length,
      dkd_open: 0,
      dkd_answered: 0,
      dkd_closed: 0,
      dkd_urgent: 0,
    };

    dkd_threads.forEach((dkd_thread_item) => {
      if (dkd_thread_item?.dkd_status_key === 'dkd_answered') dkd_stats_value.dkd_answered += 1;
      else if (dkd_thread_item?.dkd_status_key === 'dkd_closed') dkd_stats_value.dkd_closed += 1;
      else dkd_stats_value.dkd_open += 1;

      if (dkd_thread_item?.dkd_priority_key === 'dkd_urgent') dkd_stats_value.dkd_urgent += 1;
    });

    return dkd_stats_value;
  }, [dkd_threads]);

  const dkd_filtered_threads = dkd_use_memo(() => {
    if (dkd_active_filter === 'dkd_all') return dkd_threads;
    return dkd_threads.filter((dkd_thread_item) => dkd_thread_item?.dkd_status_key === dkd_active_filter);
  }, [dkd_active_filter, dkd_threads]);

  const dkd_load_thread_messages = dkd_use_callback(async (dkd_thread_id) => {
    if (!dkd_thread_id || !dkd_supabase_runtime_config.dkd_is_ready) return;

    dkd_set_loading_messages(true);
    dkd_set_error_text('');

    const { data: dkd_message_rows, error: dkd_message_error } = await supabase
      .from('dkd_support_messages')
      .select('dkd_id, dkd_thread_id, dkd_user_id, dkd_sender_key, dkd_sender_title, dkd_message_text, dkd_created_at')
      .eq('dkd_thread_id', dkd_thread_id)
      .order('dkd_created_at', { ascending: true });

    if (dkd_message_error) {
      dkd_set_error_text(dkd_message_error.message || 'Destek mesajları yüklenemedi.');
      dkd_set_messages([]);
    } else {
      dkd_set_messages(Array.isArray(dkd_message_rows) ? dkd_message_rows : []);
    }

    dkd_set_loading_messages(false);
  }, []);

  const dkd_load_support_threads = dkd_use_callback(async () => {
    if (!dkd_supabase_runtime_config.dkd_is_ready) {
      dkd_set_error_text(dkd_supabase_runtime_config.dkd_issue_text || 'Supabase ayarı eksik.');
      return;
    }

    dkd_set_loading_threads(true);
    dkd_set_error_text('');

    const { data: dkd_thread_rows, error: dkd_thread_error } = await supabase
      .from('dkd_support_threads')
      .select('dkd_id, dkd_user_id, dkd_ticket_code, dkd_topic_key, dkd_topic_title, dkd_priority_key, dkd_status_key, dkd_status_title, dkd_contact_note, dkd_source_key, dkd_last_message_text, dkd_created_at, dkd_updated_at')
      .order('dkd_updated_at', { ascending: false })
      .limit(80);

    if (dkd_thread_error) {
      dkd_set_error_text(dkd_thread_error.message || 'Destek kuyruğu yüklenemedi.');
      dkd_set_threads([]);
      dkd_set_selected_thread(null);
      dkd_set_messages([]);
    } else {
      const dkd_safe_rows = Array.isArray(dkd_thread_rows) ? dkd_thread_rows : [];
      dkd_set_threads(dkd_safe_rows);

      if (!dkd_selected_thread && dkd_safe_rows.length > 0) {
        dkd_set_selected_thread(dkd_safe_rows[0]);
        dkd_load_thread_messages(dkd_safe_rows[0].dkd_id);
      }
    }

    dkd_set_loading_threads(false);
  }, [dkd_load_thread_messages, dkd_selected_thread]);

  dkd_use_effect(() => {
    if (dkd_visible) {
      dkd_load_support_threads();
    }
  }, [dkd_load_support_threads, dkd_visible]);

  const dkd_select_thread = dkd_use_callback((dkd_thread_item) => {
    dkd_set_selected_thread(dkd_thread_item);
    dkd_set_reply_text('');
    dkd_load_thread_messages(dkd_thread_item?.dkd_id);
  }, [dkd_load_thread_messages]);

  const dkd_update_selected_thread_status = dkd_use_callback(async (dkd_status_key) => {
    if (!dkd_selected_thread?.dkd_id) return;

    dkd_set_action_loading(true);
    dkd_set_error_text('');

    const dkd_status_title = dkd_get_status_title(dkd_status_key);
    const { error: dkd_status_error } = await supabase
      .from('dkd_support_threads')
      .update({
        dkd_status_key,
        dkd_status_title,
      })
      .eq('dkd_id', dkd_selected_thread.dkd_id);

    if (dkd_status_error) {
      dkd_set_error_text(dkd_status_error.message || 'Destek durumu güncellenemedi.');
    } else {
      const dkd_next_thread = {
        ...dkd_selected_thread,
        dkd_status_key,
        dkd_status_title,
      };
      dkd_set_selected_thread(dkd_next_thread);
      dkd_set_threads((dkd_previous_threads) => dkd_previous_threads.map((dkd_thread_item) => (
        dkd_thread_item.dkd_id === dkd_next_thread.dkd_id ? dkd_next_thread : dkd_thread_item
      )));
    }

    dkd_set_action_loading(false);
  }, [dkd_selected_thread]);

  const dkd_send_admin_reply = dkd_use_callback(async () => {
    const dkd_clean_reply_text = dkd_reply_text.trim();
    if (!dkd_selected_thread?.dkd_id || !dkd_selected_thread?.dkd_user_id || dkd_clean_reply_text.length < 2) {
      dkd_set_error_text('Yanıt yazmak için bir destek talebi seç ve mesaj alanını doldur.');
      return;
    }

    dkd_set_action_loading(true);
    dkd_set_error_text('');

    const { error: dkd_insert_error } = await supabase
      .from('dkd_support_messages')
      .insert({
        dkd_thread_id: dkd_selected_thread.dkd_id,
        dkd_user_id: dkd_selected_thread.dkd_user_id,
        dkd_sender_key: 'dkd_admin',
        dkd_sender_title: 'Destek Ekibi',
        dkd_message_text: dkd_clean_reply_text,
      });

    if (dkd_insert_error) {
      dkd_set_error_text(dkd_insert_error.message || 'Destek yanıtı gönderilemedi.');
      dkd_set_action_loading(false);
      return;
    }

    const { error: dkd_update_error } = await supabase
      .from('dkd_support_threads')
      .update({
        dkd_status_key: 'dkd_answered',
        dkd_status_title: 'Destek yanıtladı',
        dkd_last_message_text: dkd_clean_reply_text.slice(0, 240),
      })
      .eq('dkd_id', dkd_selected_thread.dkd_id);

    if (dkd_update_error) {
      dkd_set_error_text(dkd_update_error.message || 'Yanıt gönderildi ama talep durumu güncellenemedi.');
    } else {
      dkd_set_reply_text('');
      const dkd_next_thread = {
        ...dkd_selected_thread,
        dkd_status_key: 'dkd_answered',
        dkd_status_title: 'Destek yanıtladı',
        dkd_last_message_text: dkd_clean_reply_text.slice(0, 240),
      };
      dkd_set_selected_thread(dkd_next_thread);
      dkd_set_threads((dkd_previous_threads) => dkd_previous_threads.map((dkd_thread_item) => (
        dkd_thread_item.dkd_id === dkd_next_thread.dkd_id ? dkd_next_thread : dkd_thread_item
      )));
      dkd_load_thread_messages(dkd_selected_thread.dkd_id);
    }

    dkd_set_action_loading(false);
  }, [dkd_load_thread_messages, dkd_reply_text, dkd_selected_thread]);

  const dkd_close_modal = dkd_use_callback(() => {
    if (typeof dkd_on_close === 'function') dkd_on_close();
  }, [dkd_on_close]);

  return (
    <Modal visible={dkd_visible} transparent animationType="slide" onRequestClose={dkd_close_modal}>
      <View style={dkd_styles.dkd_backdrop}>
        <LinearGradient colors={['#04101A', '#10182B', '#080B13']} style={dkd_styles.dkd_shell}>
          <View style={dkd_styles.dkd_glow_cyan} />
          <View style={dkd_styles.dkd_glow_pink} />

          <View style={dkd_styles.dkd_header_row}>
            <View style={dkd_styles.dkd_header_text_wrap}>
              <Text style={dkd_styles.dkd_kicker}>DKD SUPPORT COMMAND</Text>
              <Text style={dkd_styles.dkd_title}>Destek Kuyruğu</Text>
              <Text style={dkd_styles.dkd_subtitle}>Uygulamadan gelen destek taleplerini yönet, yanıtla ve kapat.</Text>
            </View>
            <Pressable style={dkd_styles.dkd_close_button} onPress={dkd_close_modal}>
              <MaterialCommunityIcons name="close" size={22} color="#fff" />
            </Pressable>
          </View>

          <View style={dkd_styles.dkd_stats_row}>
            <View style={dkd_styles.dkd_stat_card}>
              <Text style={dkd_styles.dkd_stat_label}>AÇIK</Text>
              <Text style={dkd_styles.dkd_stat_value}>{dkd_thread_stats.dkd_open}</Text>
            </View>
            <View style={dkd_styles.dkd_stat_card}>
              <Text style={dkd_styles.dkd_stat_label}>ACİL</Text>
              <Text style={[dkd_styles.dkd_stat_value, { color: '#ff6b8f' }]}>{dkd_thread_stats.dkd_urgent}</Text>
            </View>
            <View style={dkd_styles.dkd_stat_card}>
              <Text style={dkd_styles.dkd_stat_label}>YANIT</Text>
              <Text style={[dkd_styles.dkd_stat_value, { color: '#65f7b0' }]}>{dkd_thread_stats.dkd_answered}</Text>
            </View>
          </View>

          {dkd_error_text ? (
            <View style={dkd_styles.dkd_error_box}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#ffd166" />
              <Text style={dkd_styles.dkd_error_text}>{dkd_error_text}</Text>
            </View>
          ) : null}

          <View style={dkd_styles.dkd_filter_row}>
            {dkd_support_filter_options.map((dkd_filter_item) => {
              const dkd_filter_active = dkd_active_filter === dkd_filter_item.dkd_key;
              return (
                <Pressable
                  key={dkd_filter_item.dkd_key}
                  style={[dkd_styles.dkd_filter_chip, dkd_filter_active ? dkd_styles.dkd_filter_chip_active : null]}
                  onPress={() => dkd_set_active_filter(dkd_filter_item.dkd_key)}
                >
                  <MaterialCommunityIcons
                    name={dkd_filter_item.dkd_icon}
                    size={15}
                    color={dkd_filter_active ? '#061018' : cityLootTheme.colors.textMuted}
                  />
                  <Text style={[dkd_styles.dkd_filter_text, dkd_filter_active ? dkd_styles.dkd_filter_text_active : null]}>
                    {dkd_filter_item.dkd_title}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={dkd_styles.dkd_body_grid}>
            <View style={dkd_styles.dkd_thread_column}>
              <View style={dkd_styles.dkd_column_header}>
                <Text style={dkd_styles.dkd_column_title}>Talep Listesi</Text>
                <Pressable style={dkd_styles.dkd_refresh_button} onPress={dkd_load_support_threads} disabled={dkd_loading_threads}>
                  {dkd_loading_threads ? (
                    <ActivityIndicator size="small" color="#8ee5ff" />
                  ) : (
                    <MaterialCommunityIcons name="refresh" size={18} color="#8ee5ff" />
                  )}
                </Pressable>
              </View>

              <ScrollView style={dkd_styles.dkd_thread_scroll} showsVerticalScrollIndicator={false}>
                {dkd_filtered_threads.length === 0 ? (
                  <View style={dkd_styles.dkd_empty_card}>
                    <MaterialCommunityIcons name="inbox-outline" size={24} color={cityLootTheme.colors.textMuted} />
                    <Text style={dkd_styles.dkd_empty_title}>Bu filtrede talep yok</Text>
                    <Text style={dkd_styles.dkd_empty_text}>Yeni destek talepleri geldiğinde burada görünecek.</Text>
                  </View>
                ) : null}

                {dkd_filtered_threads.map((dkd_thread_item) => {
                  const dkd_thread_active = dkd_selected_thread?.dkd_id === dkd_thread_item.dkd_id;
                  const dkd_priority_accent = dkd_get_priority_accent(dkd_thread_item.dkd_priority_key);
                  return (
                    <Pressable
                      key={dkd_thread_item.dkd_id}
                      style={[dkd_styles.dkd_thread_card, dkd_thread_active ? dkd_styles.dkd_thread_card_active : null]}
                      onPress={() => dkd_select_thread(dkd_thread_item)}
                    >
                      <View style={dkd_styles.dkd_thread_top_row}>
                        <Text style={dkd_styles.dkd_ticket_code}>{dkd_thread_item.dkd_ticket_code}</Text>
                        <View style={[dkd_styles.dkd_priority_pill, { borderColor: `${dkd_priority_accent}88` }]}>
                          <Text style={[dkd_styles.dkd_priority_text, { color: dkd_priority_accent }]}>
                            {dkd_get_priority_title(dkd_thread_item.dkd_priority_key)}
                          </Text>
                        </View>
                      </View>
                      <Text style={dkd_styles.dkd_thread_topic}>{dkd_thread_item.dkd_topic_title}</Text>
                      <Text style={dkd_styles.dkd_thread_preview} numberOfLines={2}>
                        {dkd_thread_item.dkd_last_message_text || 'Mesaj özeti yok.'}
                      </Text>
                      <View style={dkd_styles.dkd_thread_meta_row}>
                        <Text style={dkd_styles.dkd_thread_status}>{dkd_get_status_title(dkd_thread_item.dkd_status_key, dkd_thread_item.dkd_status_title)}</Text>
                        <Text style={dkd_styles.dkd_thread_time}>{dkd_format_datetime(dkd_thread_item.dkd_updated_at)}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={dkd_styles.dkd_detail_column}>
              {dkd_selected_thread ? (
                <>
                  <View style={dkd_styles.dkd_detail_header_card}>
                    <View style={dkd_styles.dkd_detail_header_row}>
                      <View style={dkd_styles.dkd_detail_title_wrap}>
                        <Text style={dkd_styles.dkd_detail_code}>{dkd_selected_thread.dkd_ticket_code}</Text>
                        <Text style={dkd_styles.dkd_detail_title}>{dkd_selected_thread.dkd_topic_title}</Text>
                        <Text style={dkd_styles.dkd_detail_meta}>{dkd_format_datetime(dkd_selected_thread.dkd_created_at)} · {dkd_get_status_title(dkd_selected_thread.dkd_status_key, dkd_selected_thread.dkd_status_title)}</Text>
                      </View>
                      <View style={[dkd_styles.dkd_priority_badge_big, { borderColor: `${dkd_get_priority_accent(dkd_selected_thread.dkd_priority_key)}88` }]}>
                        <Text style={[dkd_styles.dkd_priority_badge_text, { color: dkd_get_priority_accent(dkd_selected_thread.dkd_priority_key) }]}>
                          {dkd_get_priority_title(dkd_selected_thread.dkd_priority_key)}
                        </Text>
                      </View>
                    </View>
                    {dkd_selected_thread.dkd_contact_note ? (
                      <Text style={dkd_styles.dkd_contact_note}>Not: {dkd_selected_thread.dkd_contact_note}</Text>
                    ) : null}
                  </View>

                  <ScrollView style={dkd_styles.dkd_message_scroll} showsVerticalScrollIndicator={false}>
                    {dkd_loading_messages ? (
                      <View style={dkd_styles.dkd_loading_box}>
                        <ActivityIndicator color="#8ee5ff" />
                        <Text style={dkd_styles.dkd_loading_text}>Mesajlar yükleniyor...</Text>
                      </View>
                    ) : null}

                    {dkd_messages.map((dkd_message_item) => {
                      const dkd_admin_message = dkd_message_item.dkd_sender_key === 'dkd_admin';
                      return (
                        <View
                          key={dkd_message_item.dkd_id}
                          style={[dkd_styles.dkd_message_bubble, dkd_admin_message ? dkd_styles.dkd_message_bubble_admin : dkd_styles.dkd_message_bubble_customer]}
                        >
                          <Text style={dkd_styles.dkd_message_sender}>{dkd_message_item.dkd_sender_title || (dkd_admin_message ? 'Destek Ekibi' : 'Müşteri')}</Text>
                          <Text style={dkd_styles.dkd_message_text}>{dkd_message_item.dkd_message_text}</Text>
                          <Text style={dkd_styles.dkd_message_time}>{dkd_format_datetime(dkd_message_item.dkd_created_at)}</Text>
                        </View>
                      );
                    })}
                  </ScrollView>

                  <View style={dkd_styles.dkd_reply_box}>
                    <Text style={dkd_styles.dkd_reply_label}>Destek yanıtı</Text>
                    <TextInput
                      value={dkd_reply_text}
                      onChangeText={dkd_set_reply_text}
                      placeholder="Müşteriye yazılacak cevabı buraya gir..."
                      placeholderTextColor="rgba(232,241,255,0.42)"
                      multiline
                      style={dkd_styles.dkd_reply_input}
                    />
                    <View style={dkd_styles.dkd_action_row}>
                      <Pressable style={[dkd_styles.dkd_action_button, dkd_styles.dkd_action_button_soft]} onPress={() => dkd_update_selected_thread_status('dkd_open')} disabled={dkd_action_loading}>
                        <Text style={dkd_styles.dkd_action_button_text}>Yeniye Al</Text>
                      </Pressable>
                      <Pressable style={[dkd_styles.dkd_action_button, dkd_styles.dkd_action_button_green]} onPress={dkd_send_admin_reply} disabled={dkd_action_loading}>
                        <Text style={dkd_styles.dkd_action_button_text_dark}>Yanıtla</Text>
                      </Pressable>
                      <Pressable style={[dkd_styles.dkd_action_button, dkd_styles.dkd_action_button_gold]} onPress={() => dkd_update_selected_thread_status('dkd_closed')} disabled={dkd_action_loading}>
                        <Text style={dkd_styles.dkd_action_button_text_dark}>Çözüldü</Text>
                      </Pressable>
                    </View>
                  </View>
                </>
              ) : (
                <View style={dkd_styles.dkd_empty_detail}>
                  <MaterialCommunityIcons name="headset" size={36} color="#8ee5ff" />
                  <Text style={dkd_styles.dkd_empty_title}>Destek talebi seç</Text>
                  <Text style={dkd_styles.dkd_empty_text}>Soldaki listeden bir talep seçince konuşma ve yanıt alanı burada açılacak.</Text>
                </View>
              )}
            </View>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const dkd_styles = StyleSheet.create({
  dkd_backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,6,12,0.90)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  dkd_shell: {
    width: '100%',
    maxWidth: 940,
    maxHeight: '96%',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 14,
    overflow: 'hidden',
  },
  dkd_glow_cyan: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(103,227,255,0.14)',
    top: -70,
    right: -40,
  },
  dkd_glow_pink: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 999,
    backgroundColor: 'rgba(255,107,143,0.12)',
    bottom: -80,
    left: -40,
  },
  dkd_header_row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  dkd_header_text_wrap: { flex: 1, minWidth: 0 },
  dkd_kicker: { color: '#ffd166', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  dkd_title: { color: '#ffffff', fontSize: 26, fontWeight: '900', marginTop: 4 },
  dkd_subtitle: { color: 'rgba(232,241,255,0.72)', fontSize: 12, lineHeight: 17, marginTop: 6 },
  dkd_close_button: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  dkd_stats_row: { flexDirection: 'row', gap: 8, marginTop: 14 },
  dkd_stat_card: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  dkd_stat_label: { color: 'rgba(232,241,255,0.58)', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  dkd_stat_value: { color: '#8ee5ff', fontSize: 18, fontWeight: '900', marginTop: 4 },
  dkd_error_box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,209,102,0.26)',
    backgroundColor: 'rgba(255,209,102,0.08)',
    padding: 10,
    marginTop: 12,
  },
  dkd_error_text: { color: '#ffe7a6', flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  dkd_filter_row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  dkd_filter_chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dkd_filter_chip_active: { backgroundColor: '#8ee5ff', borderColor: 'rgba(142,229,255,0.9)' },
  dkd_filter_text: { color: 'rgba(232,241,255,0.70)', fontSize: 11, fontWeight: '900' },
  dkd_filter_text_active: { color: '#061018' },
  dkd_body_grid: { flexDirection: 'row', gap: 10, marginTop: 12, minHeight: 460 },
  dkd_thread_column: { flex: 0.95, minWidth: 0 },
  dkd_detail_column: { flex: 1.25, minWidth: 0 },
  dkd_column_header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  dkd_column_title: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  dkd_refresh_button: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(142,229,255,0.30)',
    backgroundColor: 'rgba(142,229,255,0.08)',
  },
  dkd_thread_scroll: { maxHeight: 520 },
  dkd_thread_card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    marginBottom: 8,
  },
  dkd_thread_card_active: { borderColor: 'rgba(142,229,255,0.55)', backgroundColor: 'rgba(142,229,255,0.10)' },
  dkd_thread_top_row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  dkd_ticket_code: { color: '#8ee5ff', fontSize: 11, fontWeight: '900' },
  dkd_priority_pill: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: 'rgba(255,255,255,0.04)' },
  dkd_priority_text: { fontSize: 10, fontWeight: '900' },
  dkd_thread_topic: { color: '#ffffff', fontSize: 14, fontWeight: '900', marginTop: 8 },
  dkd_thread_preview: { color: 'rgba(232,241,255,0.68)', fontSize: 12, lineHeight: 17, marginTop: 5 },
  dkd_thread_meta_row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 9 },
  dkd_thread_status: { color: '#65f7b0', fontSize: 10, fontWeight: '900', flex: 1 },
  dkd_thread_time: { color: 'rgba(232,241,255,0.48)', fontSize: 10, fontWeight: '800' },
  dkd_empty_card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    padding: 18,
  },
  dkd_empty_detail: {
    flex: 1,
    minHeight: 420,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  dkd_empty_title: { color: '#ffffff', fontSize: 14, fontWeight: '900', marginTop: 8, textAlign: 'center' },
  dkd_empty_text: { color: 'rgba(232,241,255,0.62)', fontSize: 12, lineHeight: 17, marginTop: 5, textAlign: 'center' },
  dkd_detail_header_card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 12,
  },
  dkd_detail_header_row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  dkd_detail_title_wrap: { flex: 1, minWidth: 0 },
  dkd_detail_code: { color: '#8ee5ff', fontSize: 11, fontWeight: '900' },
  dkd_detail_title: { color: '#ffffff', fontSize: 17, fontWeight: '900', marginTop: 4 },
  dkd_detail_meta: { color: 'rgba(232,241,255,0.56)', fontSize: 11, fontWeight: '800', marginTop: 4 },
  dkd_priority_badge_big: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.04)' },
  dkd_priority_badge_text: { fontSize: 11, fontWeight: '900' },
  dkd_contact_note: { color: 'rgba(232,241,255,0.70)', fontSize: 12, lineHeight: 17, marginTop: 10 },
  dkd_message_scroll: { maxHeight: 270, marginTop: 10 },
  dkd_loading_box: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  dkd_loading_text: { color: 'rgba(232,241,255,0.68)', fontSize: 12, fontWeight: '800' },
  dkd_message_bubble: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 11,
    marginBottom: 8,
  },
  dkd_message_bubble_customer: { borderColor: 'rgba(142,229,255,0.24)', backgroundColor: 'rgba(142,229,255,0.07)', marginRight: 26 },
  dkd_message_bubble_admin: { borderColor: 'rgba(101,247,176,0.24)', backgroundColor: 'rgba(101,247,176,0.08)', marginLeft: 26 },
  dkd_message_sender: { color: '#ffffff', fontSize: 11, fontWeight: '900' },
  dkd_message_text: { color: 'rgba(232,241,255,0.82)', fontSize: 13, lineHeight: 19, marginTop: 5 },
  dkd_message_time: { color: 'rgba(232,241,255,0.45)', fontSize: 10, fontWeight: '800', marginTop: 8, textAlign: 'right' },
  dkd_reply_box: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.055)',
    padding: 12,
    marginTop: 10,
  },
  dkd_reply_label: { color: '#ffffff', fontSize: 12, fontWeight: '900', marginBottom: 8 },
  dkd_reply_input: {
    minHeight: 86,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(0,0,0,0.22)',
    color: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
    fontSize: 13,
    lineHeight: 18,
  },
  dkd_action_row: { flexDirection: 'row', gap: 8, marginTop: 10 },
  dkd_action_button: { flex: 1, borderRadius: 16, paddingVertical: 11, alignItems: 'center', justifyContent: 'center' },
  dkd_action_button_soft: { borderWidth: 1, borderColor: 'rgba(142,229,255,0.34)', backgroundColor: 'rgba(142,229,255,0.08)' },
  dkd_action_button_green: { backgroundColor: '#65f7b0' },
  dkd_action_button_gold: { backgroundColor: '#ffd166' },
  dkd_action_button_text: { color: '#dff7ff', fontSize: 12, fontWeight: '900' },
  dkd_action_button_text_dark: { color: '#061018', fontSize: 12, fontWeight: '900' },
});
