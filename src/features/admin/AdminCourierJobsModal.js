import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SafeScreen from '../../components/layout/SafeScreen';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import { cityLootTheme } from '../../theme/cityLootTheme';
import { dkd_fetch_admin_courier_applications } from '../../services/adminService';

const dkd_blank_job_draft_value = Object.freeze({
  id: '',
  title: '',
  pickup: '',
  dropoff: '',
  reward_score: '12',
  fee_tl: '0',
  job_type: 'food',
  is_active: 'true',
});

const dkd_job_type_option_list_value = [
  { value: 'food', label: 'Yemek' },
  { value: 'loot', label: 'Loot' },
  { value: 'express', label: 'Ekspres' },
  { value: 'vip', label: 'VIP' },
];

const dkd_active_option_list_value = [
  { value: 'true', label: 'Aktif' },
  { value: 'false', label: 'Pasif' },
];

function dkd_to_job_draft_value(dkd_job_row_value) {
  if (!dkd_job_row_value) return { ...dkd_blank_job_draft_value };
  return {
    id: String(dkd_job_row_value.id || ''),
    title: String(dkd_job_row_value.title || ''),
    pickup: String(dkd_job_row_value.pickup || ''),
    dropoff: String(dkd_job_row_value.dropoff || ''),
    reward_score: String(dkd_job_row_value.reward_score ?? 12),
    fee_tl: String(dkd_job_row_value.fee_tl ?? 0),
    job_type: String(dkd_job_row_value.job_type || 'food'),
    is_active: String(Boolean(dkd_job_row_value.is_active)),
  };
}

function dkd_status_tone_value(dkd_status_value) {
  const dkd_status_key_value = String(dkd_status_value || '').toLowerCase();
  if (dkd_status_key_value === 'completed' || dkd_status_key_value === 'approved') return cityLootTheme.colors.green;
  if (dkd_status_key_value === 'accepted') return cityLootTheme.colors.goldSoft;
  if (dkd_status_key_value === 'rejected' || dkd_status_key_value === 'cancelled') return cityLootTheme.colors.red;
  return cityLootTheme.colors.cyanSoft;
}

function dkd_status_label_value(dkd_status_value) {
  const dkd_status_key_value = String(dkd_status_value || '').toLowerCase();
  if (dkd_status_key_value === 'pending') return 'İncelemede';
  if (dkd_status_key_value === 'approved') return 'Onaylı';
  if (dkd_status_key_value === 'rejected') return 'Reddedildi';
  if (dkd_status_key_value === 'accepted') return 'Yolda';
  if (dkd_status_key_value === 'completed') return 'Bitti';
  if (dkd_status_key_value === 'cancelled') return 'İptal';
  return dkd_status_key_value || 'Bekliyor';
}

function dkd_format_money_value(dkd_amount_value) {
  const dkd_number_value = Number(dkd_amount_value || 0);
  if (!Number.isFinite(dkd_number_value)) return '0 TL';
  return `${dkd_number_value.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL`;
}

function dkd_format_date_value(dkd_input_value) {
  if (!dkd_input_value) return '—';
  const dkd_date_value = new Date(dkd_input_value);
  if (Number.isNaN(dkd_date_value.getTime())) return '—';
  try {
    return dkd_date_value.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (dkd_error_value) {
    return dkd_date_value.toISOString();
  }
}

function dkd_safe_text_value(dkd_input_value, dkd_fallback_value = '—') {
  const dkd_clean_value = String(dkd_input_value ?? '').trim();
  return dkd_clean_value || dkd_fallback_value;
}

function dkd_full_name_value(dkd_application_row_value) {
  const dkd_first_name_value = dkd_safe_text_value(dkd_application_row_value?.first_name, '').trim();
  const dkd_last_name_value = dkd_safe_text_value(dkd_application_row_value?.last_name, '').trim();
  const dkd_joined_name_value = `${dkd_first_name_value} ${dkd_last_name_value}`.trim();
  if (dkd_joined_name_value) return dkd_joined_name_value;
  return dkd_safe_text_value(dkd_application_row_value?.profile_nickname, 'İsimsiz başvuru');
}

function dkd_application_document_list_value_builder(dkd_application_row_value) {
  const dkd_docs_payload_value = dkd_application_row_value?.payload?.docs || {};
  return [
    { key: 'identity_front_url', label: 'Kimlik Ön', icon: 'card-account-details-outline', url: dkd_application_row_value?.identity_front_url || dkd_docs_payload_value?.identity_front_url || '' },
    { key: 'identity_back_url', label: 'Kimlik Arka', icon: 'card-account-details-outline', url: dkd_application_row_value?.identity_back_url || dkd_docs_payload_value?.identity_back_url || '' },
    { key: 'selfie_url', label: 'Selfie', icon: 'camera-outline', url: dkd_application_row_value?.selfie_url || dkd_docs_payload_value?.selfie_url || '' },
    { key: 'driver_license_url', label: 'Ehliyet', icon: 'card-bulleted-outline', url: dkd_application_row_value?.driver_license_url || dkd_docs_payload_value?.driver_license_url || '' },
    { key: 'vehicle_license_url', label: 'Ruhsat', icon: 'file-document-outline', url: dkd_application_row_value?.vehicle_license_url || dkd_docs_payload_value?.vehicle_license_url || '' },
    { key: 'insurance_url', label: 'Sigorta', icon: 'shield-outline', url: dkd_application_row_value?.insurance_url || dkd_docs_payload_value?.insurance_url || '' },
  ].filter((dkd_document_row_value) => String(dkd_document_row_value.url || '').trim());
}

function DkdField({ dkd_label_value, dkd_input_value, dkd_on_change_value, dkd_keyboard_type_value = 'default' }) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={dkd_styles.dkd_label}>{dkd_label_value}</Text>
      <TextInput
        value={dkd_input_value}
        onChangeText={dkd_on_change_value}
        keyboardType={dkd_keyboard_type_value}
        placeholderTextColor="rgba(232,244,255,0.35)"
        style={dkd_styles.dkd_input}
      />
    </View>
  );
}

function DkdStatCard({ dkd_label_value, dkd_value, dkd_accent_value = cityLootTheme.colors.cyanSoft, dkd_icon_name_value = 'chart-box-outline', dkd_card_style_value }) {
  return (
    <View style={[dkd_styles.dkd_stat_card, dkd_card_style_value]}>
      <View style={dkd_styles.dkd_stat_label_row}>
        <MaterialCommunityIcons name={dkd_icon_name_value} size={14} color={dkd_accent_value} />
        <Text style={dkd_styles.dkd_stat_label} numberOfLines={1}>{dkd_label_value}</Text>
      </View>
      <Text style={[dkd_styles.dkd_stat_value, { color: dkd_accent_value }]}>{dkd_value}</Text>
    </View>
  );
}

function DkdCenterActionCard({
  dkd_title_value,
  dkd_badge_value,
  dkd_meta_value,
  dkd_colors_value,
  dkd_icon_name_value,
  dkd_on_press_value,
}) {
  return (
    <Pressable style={dkd_styles.dkd_center_action_shell} onPress={dkd_on_press_value}>
      <LinearGradient colors={dkd_colors_value} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={dkd_styles.dkd_center_action_fill}>
        <View style={dkd_styles.dkd_center_action_glow} />
        <View style={dkd_styles.dkd_center_action_icon_wrap}>
          <MaterialCommunityIcons name={dkd_icon_name_value} size={24} color="#F7FBFF" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={dkd_styles.dkd_card_kicker_row}>
            <Text style={dkd_styles.dkd_card_kicker_text}>{dkd_badge_value}</Text>
          </View>
          <Text style={dkd_styles.dkd_center_action_title}>{dkd_title_value}</Text>
          <Text style={dkd_styles.dkd_center_action_meta}>{dkd_meta_value}</Text>
        </View>
        <View style={dkd_styles.dkd_center_action_arrow_wrap}>
          <MaterialCommunityIcons name="arrow-right" size={20} color="#F7FBFF" />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function DkdInfoRow({ dkd_label_value, dkd_value }) {
  return (
    <View style={dkd_styles.dkd_info_row}>
      <Text style={dkd_styles.dkd_info_label}>{dkd_label_value}</Text>
      <Text style={dkd_styles.dkd_info_value}>{dkd_safe_text_value(dkd_value)}</Text>
    </View>
  );
}

function DkdDocumentAction({ dkd_label_value, dkd_icon_name_value, dkd_on_press_value }) {
  return (
    <Pressable style={dkd_styles.dkd_document_action_shell} onPress={dkd_on_press_value}>
      <LinearGradient colors={['rgba(103,227,255,0.18)', 'rgba(255,255,255,0.06)']} style={dkd_styles.dkd_document_action_fill}>
        <MaterialCommunityIcons name={dkd_icon_name_value} size={18} color={cityLootTheme.colors.cyanSoft} />
        <Text style={dkd_styles.dkd_document_action_text}>{dkd_label_value}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export default function AdminCourierJobsModal({ visible, onClose, loading, jobs, onRefresh, onSave, onDelete }) {
  const [dkd_job_draft_value, setDkdJobDraftValue] = useState({ ...dkd_blank_job_draft_value });
  const [dkd_job_saving_value, setDkdJobSavingValue] = useState(false);
  const [dkd_selected_job_id_value, setDkdSelectedJobIdValue] = useState('');
  const [dkd_admin_page_value, setDkdAdminPageValue] = useState('dashboard');
  const [dkd_application_loading_value, setDkdApplicationLoadingValue] = useState(false);
  const [dkd_application_rows_value, setDkdApplicationRowsValue] = useState([]);
  const [dkd_selected_application_id_value, setDkdSelectedApplicationIdValue] = useState('');
  const { width: dkd_window_width_value } = useWindowDimensions();
  const dkd_is_compact_layout_value = dkd_window_width_value < 520;

  const dkd_job_rows_value = useMemo(() => (Array.isArray(jobs) ? jobs : []), [jobs]);

  const dkd_job_stats_value = useMemo(() => ({
    total: dkd_job_rows_value.length,
    active: dkd_job_rows_value.filter((dkd_job_row_value) => !!dkd_job_row_value.is_active).length,
    accepted: dkd_job_rows_value.filter((dkd_job_row_value) => String(dkd_job_row_value.status || '').toLowerCase() === 'accepted').length,
    completed: dkd_job_rows_value.filter((dkd_job_row_value) => String(dkd_job_row_value.status || '').toLowerCase() === 'completed').length,
  }), [dkd_job_rows_value]);

  const dkd_sorted_application_rows_value = useMemo(() => {
    const dkd_rows_value = Array.isArray(dkd_application_rows_value) ? [...dkd_application_rows_value] : [];
    return dkd_rows_value.sort((dkd_left_row_value, dkd_right_row_value) => {
      const dkd_left_rank_value = String(dkd_left_row_value?.status || '').toLowerCase() === 'pending' ? 0 : 1;
      const dkd_right_rank_value = String(dkd_right_row_value?.status || '').toLowerCase() === 'pending' ? 0 : 1;
      if (dkd_left_rank_value !== dkd_right_rank_value) return dkd_left_rank_value - dkd_right_rank_value;
      const dkd_left_time_value = new Date(dkd_left_row_value?.updated_at || dkd_left_row_value?.created_at || 0).getTime();
      const dkd_right_time_value = new Date(dkd_right_row_value?.updated_at || dkd_right_row_value?.created_at || 0).getTime();
      return dkd_right_time_value - dkd_left_time_value;
    });
  }, [dkd_application_rows_value]);

  const dkd_application_stats_value = useMemo(() => ({
    total: dkd_sorted_application_rows_value.length,
    pending: dkd_sorted_application_rows_value.filter((dkd_application_row_value) => String(dkd_application_row_value?.status || '').toLowerCase() === 'pending').length,
    approved: dkd_sorted_application_rows_value.filter((dkd_application_row_value) => String(dkd_application_row_value?.status || '').toLowerCase() === 'approved').length,
    rejected: dkd_sorted_application_rows_value.filter((dkd_application_row_value) => String(dkd_application_row_value?.status || '').toLowerCase() === 'rejected').length,
  }), [dkd_sorted_application_rows_value]);

  const dkd_selected_application_row_value = useMemo(() => (
    dkd_sorted_application_rows_value.find((dkd_application_row_value) => String(dkd_application_row_value?.application_id || dkd_application_row_value?.id || '') === dkd_selected_application_id_value) || null
  ), [dkd_selected_application_id_value, dkd_sorted_application_rows_value]);

  const dkd_selected_job_row_value = useMemo(() => (
    dkd_job_rows_value.find((dkd_job_row_value) => String(dkd_job_row_value?.id || '') === dkd_selected_job_id_value) || null
  ), [dkd_job_rows_value, dkd_selected_job_id_value]);

  const dkd_refresh_application_rows_value = useCallback(async () => {
    setDkdApplicationLoadingValue(true);
    try {
      const dkd_response_value = await dkd_fetch_admin_courier_applications();
      if (dkd_response_value?.error) throw dkd_response_value.error;
      setDkdApplicationRowsValue(Array.isArray(dkd_response_value?.data) ? dkd_response_value.data : []);
    } catch (dkd_error_value) {
      const dkd_error_message_value = String(dkd_error_value?.message || '').trim();
      Alert.alert('Admin', dkd_error_message_value || 'Kurye başvuruları alınamadı.');
      setDkdApplicationRowsValue([]);
    } finally {
      setDkdApplicationLoadingValue(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    setDkdJobDraftValue({ ...dkd_blank_job_draft_value });
    setDkdSelectedJobIdValue('');
    setDkdSelectedApplicationIdValue('');
    setDkdAdminPageValue('dashboard');
    onRefresh?.();
    dkd_refresh_application_rows_value();
  }, [visible, onRefresh, dkd_refresh_application_rows_value]);

  useEffect(() => {
    if (!dkd_selected_job_id_value && dkd_job_rows_value.length > 0) {
      const dkd_first_job_row_value = dkd_job_rows_value[0];
      setDkdSelectedJobIdValue(String(dkd_first_job_row_value?.id || ''));
    }
  }, [dkd_job_rows_value, dkd_selected_job_id_value]);

  useEffect(() => {
    if (!dkd_selected_application_id_value && dkd_sorted_application_rows_value.length > 0) {
      const dkd_pending_application_row_value = dkd_sorted_application_rows_value.find((dkd_application_row_value) => String(dkd_application_row_value?.status || '').toLowerCase() === 'pending');
      const dkd_focus_application_row_value = dkd_pending_application_row_value || dkd_sorted_application_rows_value[0];
      setDkdSelectedApplicationIdValue(String(dkd_focus_application_row_value?.application_id || dkd_focus_application_row_value?.id || ''));
    }
  }, [dkd_sorted_application_rows_value, dkd_selected_application_id_value]);

  function dkd_reset_job_draft_value() {
    setDkdSelectedJobIdValue('');
    setDkdJobDraftValue({ ...dkd_blank_job_draft_value });
  }

  function dkd_pick_job_row_value(dkd_job_row_value) {
    setDkdSelectedJobIdValue(String(dkd_job_row_value?.id || ''));
    setDkdJobDraftValue(dkd_to_job_draft_value(dkd_job_row_value));
    setDkdAdminPageValue('jobs');
  }

  async function dkd_handle_job_save_value() {
    if (!String(dkd_job_draft_value.title || '').trim()) {
      Alert.alert('Admin', 'Başlık gerekli.');
      return;
    }

    setDkdJobSavingValue(true);
    try {
      await onSave?.({
        id: dkd_job_draft_value.id ? Number(dkd_job_draft_value.id) : null,
        title: String(dkd_job_draft_value.title || '').trim(),
        pickup: String(dkd_job_draft_value.pickup || '').trim(),
        dropoff: String(dkd_job_draft_value.dropoff || '').trim(),
        reward_score: Number(dkd_job_draft_value.reward_score || 12),
        distance_km: null,
        eta_min: null,
        job_type: String(dkd_job_draft_value.job_type || 'food').trim(),
        is_active: String(dkd_job_draft_value.is_active).toLowerCase() === 'true',
        fee_tl: Number(dkd_job_draft_value.fee_tl || 0),
      });
      if (String(dkd_admin_page_value) === 'create') {
        dkd_reset_job_draft_value();
        setDkdAdminPageValue('jobs');
      }
      onRefresh?.();
    } finally {
      setDkdJobSavingValue(false);
    }
  }

  function dkd_handle_job_delete_value(dkd_job_id_value) {
    Alert.alert('Görevi Sil', `#${dkd_job_id_value} numaralı kurye görevini silmek istiyor musun?`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => onDelete?.(dkd_job_id_value) },
    ]);
  }

  async function dkd_open_document_value(dkd_document_url_value) {
    const dkd_clean_url_value = String(dkd_document_url_value || '').trim();
    if (!dkd_clean_url_value) {
      Alert.alert('Belge', 'Bu belge için bağlantı bulunamadı.');
      return;
    }
    try {
      await Linking.openURL(dkd_clean_url_value);
    } catch (dkd_error_value) {
      Alert.alert('Belge', 'Belge bağlantısı açılamadı.');
    }
  }

  const dkd_header_title_value = useMemo(() => {
    if (dkd_admin_page_value === 'create') return 'Admin • Yeni Kurye Görevi';
    if (dkd_admin_page_value === 'jobs') return 'Admin • Görev Havuzu';
    if (dkd_admin_page_value === 'applications') return 'Admin • Kurye Başvuruları';
    return 'Admin • Kurye Merkezi';
  }, [dkd_admin_page_value]);

  const dkd_pending_application_row_value = useMemo(() => (
    dkd_sorted_application_rows_value.find((dkd_application_row_value) => String(dkd_application_row_value?.status || '').toLowerCase() === 'pending') || null
  ), [dkd_sorted_application_rows_value]);

  const dkd_application_document_rows_value = useMemo(() => (
    dkd_application_document_list_value_builder(dkd_selected_application_row_value)
  ), [dkd_selected_application_row_value]);

  const dkd_stat_card_style_value = useMemo(() => ({
    width: dkd_is_compact_layout_value ? '48.4%' : '23.4%',
  }), [dkd_is_compact_layout_value]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeScreen style={{ flex: 1, backgroundColor: cityLootTheme.colors.bgTop }}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#050812', '#0B1425', '#090E18']} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={dkd_styles.dkd_scroll_content} keyboardShouldPersistTaps="handled">
            <View style={dkd_styles.dkd_header_row}>
              <View style={dkd_styles.dkd_header_copy}>
                <Text style={dkd_styles.dkd_kicker}>KURYE MERKEZİ</Text>
                <Text style={dkd_styles.dkd_title}>{dkd_header_title_value}</Text>
              </View>
              <View style={dkd_styles.dkd_header_action_row}>
                {dkd_admin_page_value !== 'dashboard' ? (
                  <SecondaryButton
                    label="Merkez"
                    icon="view-dashboard-outline"
                    onPress={() => setDkdAdminPageValue('dashboard')}
                    size="compact"
                    fullWidth={false}
                    style={dkd_styles.dkd_header_button}
                  />
                ) : null}
                <SecondaryButton label="Kapat" onPress={onClose} size="compact" fullWidth={false} style={dkd_styles.dkd_header_button} />
              </View>
            </View>

            {dkd_admin_page_value === 'dashboard' ? (
              <>
                <View style={dkd_styles.dkd_hero_panel}>
                  <View style={dkd_styles.dkd_hero_glow_blue} />
                  <View style={dkd_styles.dkd_hero_glow_gold} />
                  <Text style={dkd_styles.dkd_hero_title}>Kurye akış özeti</Text>
                  <View style={dkd_styles.dkd_stat_group}>
                    <View style={dkd_styles.dkd_stats_grid}>
                      <DkdStatCard dkd_label_value="TOPLAM" dkd_value={String(dkd_job_stats_value.total)} dkd_icon_name_value="briefcase-outline" dkd_card_style_value={dkd_stat_card_style_value} />
                      <DkdStatCard dkd_label_value="AKTİF" dkd_value={String(dkd_job_stats_value.active)} dkd_accent_value={cityLootTheme.colors.goldSoft} dkd_icon_name_value="lightning-bolt-outline" dkd_card_style_value={dkd_stat_card_style_value} />
                      <DkdStatCard dkd_label_value="YOLDA" dkd_value={String(dkd_job_stats_value.accepted)} dkd_accent_value={cityLootTheme.colors.cyanSoft} dkd_icon_name_value="motorbike" dkd_card_style_value={dkd_stat_card_style_value} />
                      <DkdStatCard dkd_label_value="BİTEN" dkd_value={String(dkd_job_stats_value.completed)} dkd_accent_value={cityLootTheme.colors.green} dkd_icon_name_value="check-decagram-outline" dkd_card_style_value={dkd_stat_card_style_value} />
                    </View>
                  </View>

                  <View style={[dkd_styles.dkd_stat_group, dkd_styles.dkd_stat_group_spaced]}>
                    <View style={dkd_styles.dkd_stats_grid}>
                      <DkdStatCard dkd_label_value="BAŞVURU" dkd_value={String(dkd_application_stats_value.total)} dkd_icon_name_value="account-file-text-outline" dkd_card_style_value={dkd_stat_card_style_value} />
                      <DkdStatCard dkd_label_value="BEKLEYEN" dkd_value={String(dkd_application_stats_value.pending)} dkd_accent_value={cityLootTheme.colors.goldSoft} dkd_icon_name_value="progress-clock" dkd_card_style_value={dkd_stat_card_style_value} />
                      <DkdStatCard dkd_label_value="ONAYLI" dkd_value={String(dkd_application_stats_value.approved)} dkd_accent_value={cityLootTheme.colors.green} dkd_icon_name_value="check-circle-outline" dkd_card_style_value={dkd_stat_card_style_value} />
                      <DkdStatCard dkd_label_value="RED" dkd_value={String(dkd_application_stats_value.rejected)} dkd_accent_value={cityLootTheme.colors.red} dkd_icon_name_value="close-circle-outline" dkd_card_style_value={dkd_stat_card_style_value} />
                    </View>
                  </View>
                </View>

                <DkdCenterActionCard
                  dkd_title_value="Yeni görev üret"
                  dkd_badge_value="AYRI SAYFA"
                  dkd_meta_value="Modern görev kartı üzerinden yeni kurye işi oluştur."
                  dkd_colors_value={['#1463FF', '#2AC6FF']}
                  dkd_icon_name_value="plus-circle-outline"
                  dkd_on_press_value={() => {
                    dkd_reset_job_draft_value();
                    setDkdAdminPageValue('create');
                  }}
                />

                <DkdCenterActionCard
                  dkd_title_value="Görev havuzunu yönet"
                  dkd_badge_value={`${dkd_job_stats_value.active} AKTİF`}
                  dkd_meta_value="Açık görevleri incele, seç, düzenle ve gerekiyorsa kaldır."
                  dkd_colors_value={['#2E1F72', '#764DFF']}
                  dkd_icon_name_value="clipboard-text-clock-outline"
                  dkd_on_press_value={() => setDkdAdminPageValue('jobs')}
                />

                <DkdCenterActionCard
                  dkd_title_value="Kurye başvurularını incele"
                  dkd_badge_value={`${dkd_application_stats_value.pending} BEKLEYEN`}
                  dkd_meta_value={dkd_pending_application_row_value ? `${dkd_full_name_value(dkd_pending_application_row_value)} • ${dkd_safe_text_value(dkd_pending_application_row_value?.vehicle_type, 'Araç bilgisi yok')}` : 'Yeni gelen başvurular burada detaylı görünür.'}
                  dkd_colors_value={['#184D3F', '#1ED8A4']}
                  dkd_icon_name_value="card-account-details-star-outline"
                  dkd_on_press_value={() => setDkdAdminPageValue('applications')}
                />
              </>
            ) : null}

            {dkd_admin_page_value === 'create' ? (
              <>
                <View style={dkd_styles.dkd_page_intro_card}>
                  <LinearGradient colors={['rgba(37,124,255,0.26)', 'rgba(110,236,255,0.12)']} style={dkd_styles.dkd_page_intro_fill}>
                    <View style={dkd_styles.dkd_page_intro_icon_wrap}>
                      <MaterialCommunityIcons name="plus-circle-multiple-outline" size={28} color="#F7FBFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={dkd_styles.dkd_page_intro_title}>Yeni görev ekranı</Text>
                      <Text style={dkd_styles.dkd_page_intro_meta}>Ayrı sayfadan görev oluştur, rota alanlarını otomatik hesap akışında bırak.</Text>
                    </View>
                  </LinearGradient>
                </View>

                <View style={dkd_styles.dkd_panel}>
                  <View style={dkd_styles.dkd_section_row}>
                    <Text style={dkd_styles.dkd_section_title}>Görev formu</Text>
                    <SecondaryButton
                      label="Havuz"
                      icon="clipboard-text-outline"
                      onPress={() => setDkdAdminPageValue('jobs')}
                      size="compact"
                      fullWidth={false}
                    />
                  </View>
                  <DkdField dkd_label_value="Başlık" dkd_input_value={dkd_job_draft_value.title} dkd_on_change_value={(dkd_text_value) => setDkdJobDraftValue((dkd_prev_job_draft_value) => ({ ...dkd_prev_job_draft_value, title: dkd_text_value }))} />
                  <View style={dkd_styles.dkd_two_col}>
                    <View style={{ flex: 1 }}>
                      <DkdField dkd_label_value="Alım noktası" dkd_input_value={dkd_job_draft_value.pickup} dkd_on_change_value={(dkd_text_value) => setDkdJobDraftValue((dkd_prev_job_draft_value) => ({ ...dkd_prev_job_draft_value, pickup: dkd_text_value }))} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <DkdField dkd_label_value="Teslimat noktası" dkd_input_value={dkd_job_draft_value.dropoff} dkd_on_change_value={(dkd_text_value) => setDkdJobDraftValue((dkd_prev_job_draft_value) => ({ ...dkd_prev_job_draft_value, dropoff: dkd_text_value }))} />
                    </View>
                  </View>
                  <View style={dkd_styles.dkd_two_col}>
                    <View style={{ flex: 1 }}>
                      <DkdField dkd_label_value="Ödül skoru" dkd_input_value={dkd_job_draft_value.reward_score} dkd_on_change_value={(dkd_text_value) => setDkdJobDraftValue((dkd_prev_job_draft_value) => ({ ...dkd_prev_job_draft_value, reward_score: dkd_text_value }))} dkd_keyboard_type_value="numeric" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <DkdField dkd_label_value="Kurye ücreti (TL)" dkd_input_value={dkd_job_draft_value.fee_tl} dkd_on_change_value={(dkd_text_value) => setDkdJobDraftValue((dkd_prev_job_draft_value) => ({ ...dkd_prev_job_draft_value, fee_tl: dkd_text_value }))} dkd_keyboard_type_value="decimal-pad" />
                    </View>
                  </View>
                  <View style={dkd_styles.dkd_auto_info_box}>
                    <Text style={dkd_styles.dkd_auto_info_text}>Mesafe ve varış süresi görev kaydedildikten sonra sistem tarafından hesaplanır.</Text>
                  </View>

                  <Text style={dkd_styles.dkd_label}>Görev tipi</Text>
                  <View style={dkd_styles.dkd_option_wrap}>
                    {dkd_job_type_option_list_value.map((dkd_option_row_value) => (
                      <Pressable
                        key={dkd_option_row_value.value}
                        style={[dkd_styles.dkd_chip, dkd_job_draft_value.job_type === dkd_option_row_value.value && dkd_styles.dkd_chip_on]}
                        onPress={() => setDkdJobDraftValue((dkd_prev_job_draft_value) => ({ ...dkd_prev_job_draft_value, job_type: dkd_option_row_value.value }))}
                      >
                        <Text style={[dkd_styles.dkd_chip_text, dkd_job_draft_value.job_type === dkd_option_row_value.value && dkd_styles.dkd_chip_text_on]}>{dkd_option_row_value.label}</Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={dkd_styles.dkd_label}>Durum</Text>
                  <View style={dkd_styles.dkd_option_wrap}>
                    {dkd_active_option_list_value.map((dkd_option_row_value) => (
                      <Pressable
                        key={dkd_option_row_value.value}
                        style={[dkd_styles.dkd_chip, dkd_job_draft_value.is_active === dkd_option_row_value.value && dkd_styles.dkd_chip_on]}
                        onPress={() => setDkdJobDraftValue((dkd_prev_job_draft_value) => ({ ...dkd_prev_job_draft_value, is_active: dkd_option_row_value.value }))}
                      >
                        <Text style={[dkd_styles.dkd_chip_text, dkd_job_draft_value.is_active === dkd_option_row_value.value && dkd_styles.dkd_chip_text_on]}>{dkd_option_row_value.label}</Text>
                      </Pressable>
                    ))}
                  </View>

                  <View style={dkd_styles.dkd_button_row}>
                    <SecondaryButton label="Temizle" icon="refresh" onPress={dkd_reset_job_draft_value} fullWidth={false} />
                    <View style={{ flex: 1 }}>
                      {dkd_job_saving_value ? <ActivityIndicator color="#fff" style={{ paddingVertical: 16 }} /> : <PrimaryButton label="Görevi Kaydet" icon="content-save-outline" onPress={dkd_handle_job_save_value} />}
                    </View>
                  </View>
                </View>
              </>
            ) : null}

            {dkd_admin_page_value === 'jobs' ? (
              <>
                <View style={dkd_styles.dkd_hero_panel}>
                  <View style={dkd_styles.dkd_hero_glow_blue} />
                  <View style={dkd_styles.dkd_hero_glow_gold} />
                  <Text style={dkd_styles.dkd_hero_title}>Görev havuzu</Text>
                  <View style={dkd_styles.dkd_stats_grid}>
                    <DkdStatCard dkd_label_value="TOPLAM" dkd_value={String(dkd_job_stats_value.total)} dkd_icon_name_value="briefcase-outline" dkd_card_style_value={dkd_stat_card_style_value} />
                    <DkdStatCard dkd_label_value="AKTİF" dkd_value={String(dkd_job_stats_value.active)} dkd_accent_value={cityLootTheme.colors.goldSoft} dkd_icon_name_value="lightning-bolt-outline" dkd_card_style_value={dkd_stat_card_style_value} />
                    <DkdStatCard dkd_label_value="YOLDA" dkd_value={String(dkd_job_stats_value.accepted)} dkd_accent_value={cityLootTheme.colors.cyanSoft} dkd_icon_name_value="motorbike" dkd_card_style_value={dkd_stat_card_style_value} />
                    <DkdStatCard dkd_label_value="BİTEN" dkd_value={String(dkd_job_stats_value.completed)} dkd_accent_value={cityLootTheme.colors.green} dkd_icon_name_value="check-decagram-outline" dkd_card_style_value={dkd_stat_card_style_value} />
                  </View>
                </View>

                <View style={dkd_styles.dkd_panel}>
                  <View style={dkd_styles.dkd_section_row}>
                    <Text style={dkd_styles.dkd_section_title}>Canlı görev listesi</Text>
                    <View style={dkd_styles.dkd_inline_button_row}>
                      <SecondaryButton label="Yenile" icon="refresh" onPress={onRefresh} size="compact" fullWidth={false} />
                      <SecondaryButton
                        label="Yeni"
                        icon="plus"
                        onPress={() => {
                          dkd_reset_job_draft_value();
                          setDkdAdminPageValue('create');
                        }}
                        size="compact"
                        fullWidth={false}
                      />
                    </View>
                  </View>

                  {loading ? <ActivityIndicator color="#fff" style={{ marginVertical: 18 }} /> : null}

                  {!loading && dkd_job_rows_value.length === 0 ? (
                    <View style={dkd_styles.dkd_empty_state_box}>
                      <MaterialCommunityIcons name="clipboard-remove-outline" size={26} color={cityLootTheme.colors.textMuted} />
                      <Text style={dkd_styles.dkd_empty_state_text}>Görev havuzunda kayıt yok.</Text>
                    </View>
                  ) : null}

                  {!loading ? dkd_job_rows_value.map((dkd_job_row_value) => {
                    const dkd_is_selected_value = dkd_selected_job_id_value === String(dkd_job_row_value?.id || '');
                    const dkd_accent_value = dkd_status_tone_value(dkd_job_row_value?.status);
                    return (
                      <Pressable key={String(dkd_job_row_value?.id || Math.random())} style={[dkd_styles.dkd_job_card, dkd_is_selected_value && dkd_styles.dkd_job_card_on]} onPress={() => dkd_pick_job_row_value(dkd_job_row_value)}>
                        <LinearGradient colors={dkd_is_selected_value ? ['rgba(246,181,78,0.16)', 'rgba(255,255,255,0.04)'] : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.03)']} style={dkd_styles.dkd_job_fill}>
                          <View style={{ flex: 1 }}>
                            <Text style={dkd_styles.dkd_job_title}>{dkd_safe_text_value(dkd_job_row_value?.title, 'Başlıksız görev')}</Text>
                            <Text style={dkd_styles.dkd_job_sub}>{dkd_safe_text_value(dkd_job_row_value?.pickup)} → {dkd_safe_text_value(dkd_job_row_value?.dropoff)}</Text>
                            <Text style={dkd_styles.dkd_job_meta}>{dkd_safe_text_value(dkd_job_row_value?.job_type, 'Görev')} • skor {dkd_job_row_value?.reward_score ?? 0} • ücret {dkd_format_money_value(dkd_job_row_value?.fee_tl || 0)}</Text>
                          </View>
                          <View style={dkd_styles.dkd_job_aside}>
                            <View style={[dkd_styles.dkd_badge, { borderColor: `${dkd_accent_value}66` }]}>
                              <Text style={dkd_styles.dkd_badge_text}>{dkd_status_label_value(dkd_job_row_value?.status)}</Text>
                            </View>
                            <SecondaryButton label="Sil" icon="trash-can-outline" onPress={() => dkd_handle_job_delete_value(dkd_job_row_value?.id)} size="compact" fullWidth={false} style={dkd_styles.dkd_row_button} />
                          </View>
                        </LinearGradient>
                      </Pressable>
                    );
                  }) : null}
                </View>

                <View style={[dkd_styles.dkd_panel, { marginTop: 12 }]}>
                  <View style={dkd_styles.dkd_section_row}>
                    <Text style={dkd_styles.dkd_section_title}>{dkd_selected_job_row_value ? `Görev #${dkd_selected_job_row_value?.id}` : 'Görev düzenleme alanı'}</Text>
                    <SecondaryButton label="Temizle" icon="refresh" onPress={dkd_reset_job_draft_value} size="compact" fullWidth={false} />
                  </View>
                  <DkdField dkd_label_value="Başlık" dkd_input_value={dkd_job_draft_value.title} dkd_on_change_value={(dkd_text_value) => setDkdJobDraftValue((dkd_prev_job_draft_value) => ({ ...dkd_prev_job_draft_value, title: dkd_text_value }))} />
                  <View style={dkd_styles.dkd_two_col}>
                    <View style={{ flex: 1 }}>
                      <DkdField dkd_label_value="Alım noktası" dkd_input_value={dkd_job_draft_value.pickup} dkd_on_change_value={(dkd_text_value) => setDkdJobDraftValue((dkd_prev_job_draft_value) => ({ ...dkd_prev_job_draft_value, pickup: dkd_text_value }))} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <DkdField dkd_label_value="Teslimat noktası" dkd_input_value={dkd_job_draft_value.dropoff} dkd_on_change_value={(dkd_text_value) => setDkdJobDraftValue((dkd_prev_job_draft_value) => ({ ...dkd_prev_job_draft_value, dropoff: dkd_text_value }))} />
                    </View>
                  </View>
                  <View style={dkd_styles.dkd_two_col}>
                    <View style={{ flex: 1 }}>
                      <DkdField dkd_label_value="Ödül skoru" dkd_input_value={dkd_job_draft_value.reward_score} dkd_on_change_value={(dkd_text_value) => setDkdJobDraftValue((dkd_prev_job_draft_value) => ({ ...dkd_prev_job_draft_value, reward_score: dkd_text_value }))} dkd_keyboard_type_value="numeric" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <DkdField dkd_label_value="Kurye ücreti (TL)" dkd_input_value={dkd_job_draft_value.fee_tl} dkd_on_change_value={(dkd_text_value) => setDkdJobDraftValue((dkd_prev_job_draft_value) => ({ ...dkd_prev_job_draft_value, fee_tl: dkd_text_value }))} dkd_keyboard_type_value="decimal-pad" />
                    </View>
                  </View>
                  <Text style={dkd_styles.dkd_label}>Görev tipi</Text>
                  <View style={dkd_styles.dkd_option_wrap}>
                    {dkd_job_type_option_list_value.map((dkd_option_row_value) => (
                      <Pressable
                        key={dkd_option_row_value.value}
                        style={[dkd_styles.dkd_chip, dkd_job_draft_value.job_type === dkd_option_row_value.value && dkd_styles.dkd_chip_on]}
                        onPress={() => setDkdJobDraftValue((dkd_prev_job_draft_value) => ({ ...dkd_prev_job_draft_value, job_type: dkd_option_row_value.value }))}
                      >
                        <Text style={[dkd_styles.dkd_chip_text, dkd_job_draft_value.job_type === dkd_option_row_value.value && dkd_styles.dkd_chip_text_on]}>{dkd_option_row_value.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={dkd_styles.dkd_label}>Durum</Text>
                  <View style={dkd_styles.dkd_option_wrap}>
                    {dkd_active_option_list_value.map((dkd_option_row_value) => (
                      <Pressable
                        key={dkd_option_row_value.value}
                        style={[dkd_styles.dkd_chip, dkd_job_draft_value.is_active === dkd_option_row_value.value && dkd_styles.dkd_chip_on]}
                        onPress={() => setDkdJobDraftValue((dkd_prev_job_draft_value) => ({ ...dkd_prev_job_draft_value, is_active: dkd_option_row_value.value }))}
                      >
                        <Text style={[dkd_styles.dkd_chip_text, dkd_job_draft_value.is_active === dkd_option_row_value.value && dkd_styles.dkd_chip_text_on]}>{dkd_option_row_value.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={{ marginTop: 14 }}>
                    {dkd_job_saving_value ? <ActivityIndicator color="#fff" /> : <PrimaryButton label={dkd_selected_job_row_value ? 'Görevi Güncelle' : 'Görevi Kaydet'} icon="content-save-outline" onPress={dkd_handle_job_save_value} />}
                  </View>
                </View>
              </>
            ) : null}

            {dkd_admin_page_value === 'applications' ? (
              <>
                <View style={dkd_styles.dkd_hero_panel}>
                  <View style={dkd_styles.dkd_hero_glow_blue} />
                  <View style={dkd_styles.dkd_hero_glow_gold} />
                  <Text style={dkd_styles.dkd_hero_title}>Kurye başvuruları</Text>
                  <View style={dkd_styles.dkd_stats_grid}>
                    <DkdStatCard dkd_label_value="TOPLAM" dkd_value={String(dkd_application_stats_value.total)} dkd_icon_name_value="account-multiple-outline" dkd_card_style_value={dkd_stat_card_style_value} />
                    <DkdStatCard dkd_label_value="BEKLEYEN" dkd_value={String(dkd_application_stats_value.pending)} dkd_accent_value={cityLootTheme.colors.goldSoft} dkd_icon_name_value="progress-clock" dkd_card_style_value={dkd_stat_card_style_value} />
                    <DkdStatCard dkd_label_value="ONAYLI" dkd_value={String(dkd_application_stats_value.approved)} dkd_accent_value={cityLootTheme.colors.green} dkd_icon_name_value="check-circle-outline" dkd_card_style_value={dkd_stat_card_style_value} />
                    <DkdStatCard dkd_label_value="RED" dkd_value={String(dkd_application_stats_value.rejected)} dkd_accent_value={cityLootTheme.colors.red} dkd_icon_name_value="close-circle-outline" dkd_card_style_value={dkd_stat_card_style_value} />
                  </View>
                </View>

                <View style={dkd_styles.dkd_panel}>
                  <View style={dkd_styles.dkd_section_row}>
                    <Text style={dkd_styles.dkd_section_title}>Başvuru listesi</Text>
                    <SecondaryButton label="Yenile" icon="refresh" onPress={dkd_refresh_application_rows_value} size="compact" fullWidth={false} />
                  </View>

                  {dkd_application_loading_value ? <ActivityIndicator color="#fff" style={{ marginVertical: 18 }} /> : null}

                  {!dkd_application_loading_value && dkd_sorted_application_rows_value.length === 0 ? (
                    <View style={dkd_styles.dkd_empty_state_box}>
                      <MaterialCommunityIcons name="account-search-outline" size={26} color={cityLootTheme.colors.textMuted} />
                      <Text style={dkd_styles.dkd_empty_state_text}>Henüz kurye başvurusu gelmedi.</Text>
                    </View>
                  ) : null}

                  {!dkd_application_loading_value ? dkd_sorted_application_rows_value.map((dkd_application_row_value) => {
                    const dkd_card_id_value = String(dkd_application_row_value?.application_id || dkd_application_row_value?.id || '');
                    const dkd_is_selected_value = dkd_selected_application_id_value === dkd_card_id_value;
                    const dkd_accent_value = dkd_status_tone_value(dkd_application_row_value?.status);
                    return (
                      <Pressable key={dkd_card_id_value || `${dkd_full_name_value(dkd_application_row_value)}-${Math.random()}`} style={[dkd_styles.dkd_job_card, dkd_is_selected_value && dkd_styles.dkd_job_card_on]} onPress={() => setDkdSelectedApplicationIdValue(dkd_card_id_value)}>
                        <LinearGradient colors={dkd_is_selected_value ? ['rgba(30,216,164,0.16)', 'rgba(255,255,255,0.04)'] : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.03)']} style={dkd_styles.dkd_job_fill}>
                          <View style={{ flex: 1 }}>
                            <Text style={dkd_styles.dkd_job_title}>{dkd_full_name_value(dkd_application_row_value)}</Text>
                            <Text style={dkd_styles.dkd_job_sub}>{dkd_safe_text_value(dkd_application_row_value?.city)} • {dkd_safe_text_value(dkd_application_row_value?.zone)} • {dkd_safe_text_value(dkd_application_row_value?.vehicle_type)}</Text>
                            <Text style={dkd_styles.dkd_job_meta}>{dkd_safe_text_value(dkd_application_row_value?.plate_no, 'Plaka yok')} • {dkd_format_date_value(dkd_application_row_value?.created_at)}</Text>
                          </View>
                          <View style={dkd_styles.dkd_job_aside}>
                            <View style={[dkd_styles.dkd_badge, { borderColor: `${dkd_accent_value}66` }]}>
                              <Text style={dkd_styles.dkd_badge_text}>{dkd_status_label_value(dkd_application_row_value?.status)}</Text>
                            </View>
                          </View>
                        </LinearGradient>
                      </Pressable>
                    );
                  }) : null}
                </View>

                <View style={[dkd_styles.dkd_panel, { marginTop: 12 }]}> 
                  <View style={dkd_styles.dkd_section_row}>
                    <Text style={dkd_styles.dkd_section_title}>{dkd_selected_application_row_value ? 'Başvuru detayı' : 'Başvuru seçilmedi'}</Text>
                    {dkd_selected_application_row_value ? (
                      <View style={[dkd_styles.dkd_badge, { borderColor: `${dkd_status_tone_value(dkd_selected_application_row_value?.status)}66` }]}>
                        <Text style={dkd_styles.dkd_badge_text}>{dkd_status_label_value(dkd_selected_application_row_value?.status)}</Text>
                      </View>
                    ) : null}
                  </View>

                  {dkd_selected_application_row_value ? (
                    <>
                      <View style={dkd_styles.dkd_application_highlight_card}>
                        <View style={dkd_styles.dkd_application_avatar_shell}>
                          <MaterialCommunityIcons name="account-star-outline" size={24} color={cityLootTheme.colors.goldSoft} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={dkd_styles.dkd_application_name}>{dkd_full_name_value(dkd_selected_application_row_value)}</Text>
                          <Text style={dkd_styles.dkd_application_meta}>{dkd_safe_text_value(dkd_selected_application_row_value?.profile_nickname, 'Takma ad yok')} • {dkd_safe_text_value(dkd_selected_application_row_value?.vehicle_type)} • {dkd_safe_text_value(dkd_selected_application_row_value?.plate_no, 'Plaka yok')}</Text>
                          <Text style={dkd_styles.dkd_application_meta}>Başvuru: {dkd_format_date_value(dkd_selected_application_row_value?.created_at)} • Güncelleme: {dkd_format_date_value(dkd_selected_application_row_value?.updated_at)}</Text>
                        </View>
                      </View>

                      <View style={dkd_styles.dkd_info_grid}>
                        <View style={dkd_styles.dkd_info_panel}>
                          <Text style={dkd_styles.dkd_info_panel_title}>Kişi bilgileri</Text>
                          <DkdInfoRow dkd_label_value="Ad Soyad" dkd_value={dkd_full_name_value(dkd_selected_application_row_value)} />
                          <DkdInfoRow dkd_label_value="TC" dkd_value={dkd_selected_application_row_value?.national_id} />
                          <DkdInfoRow dkd_label_value="Şehir" dkd_value={dkd_selected_application_row_value?.city} />
                          <DkdInfoRow dkd_label_value="Bölge" dkd_value={dkd_selected_application_row_value?.zone} />
                          <DkdInfoRow dkd_label_value="Adres" dkd_value={dkd_selected_application_row_value?.address_text} />
                        </View>

                        <View style={dkd_styles.dkd_info_panel}>
                          <Text style={dkd_styles.dkd_info_panel_title}>İletişim ve kurye profili</Text>
                          <DkdInfoRow dkd_label_value="Telefon" dkd_value={dkd_selected_application_row_value?.phone} />
                          <DkdInfoRow dkd_label_value="E-posta" dkd_value={dkd_selected_application_row_value?.email} />
                          <DkdInfoRow dkd_label_value="Araç" dkd_value={dkd_selected_application_row_value?.vehicle_type} />
                          <DkdInfoRow dkd_label_value="Plaka" dkd_value={dkd_selected_application_row_value?.plate_no} />
                          <DkdInfoRow dkd_label_value="Profil durumu" dkd_value={dkd_selected_application_row_value?.profile_courier_status} />
                        </View>
                      </View>

                      <View style={[dkd_styles.dkd_info_panel, { marginTop: 12 }]}> 
                        <Text style={dkd_styles.dkd_info_panel_title}>Acil durum kişisi</Text>
                        <DkdInfoRow dkd_label_value="Yakın kişi" dkd_value={dkd_selected_application_row_value?.emergency_name} />
                        <DkdInfoRow dkd_label_value="Acil telefon" dkd_value={dkd_selected_application_row_value?.emergency_phone} />
                      </View>

                      <View style={[dkd_styles.dkd_info_panel, { marginTop: 12 }]}> 
                        <Text style={dkd_styles.dkd_info_panel_title}>Belgeler</Text>
                        <View style={dkd_styles.dkd_document_row_wrap}>
                          {dkd_application_document_rows_value.length > 0 ? dkd_application_document_rows_value.map((dkd_document_row_value) => (
                            <DkdDocumentAction
                              key={dkd_document_row_value.key}
                              dkd_label_value={dkd_document_row_value.label}
                              dkd_icon_name_value={dkd_document_row_value.icon}
                              dkd_on_press_value={() => dkd_open_document_value(dkd_document_row_value.url)}
                            />
                          )) : <Text style={dkd_styles.dkd_helper}>Yüklenmiş belge bulunamadı.</Text>}
                        </View>
                      </View>
                    </>
                  ) : (
                    <Text style={dkd_styles.dkd_helper}>Detay görmek için soldaki listeden bir başvuru seç.</Text>
                  )}
                </View>
              </>
            ) : null}
          </ScrollView>
        </LinearGradient>
      </SafeScreen>
    </Modal>
  );
}

const dkd_styles = StyleSheet.create({
  dkd_scroll_content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 36,
  },
  dkd_header_row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 10,
  },
  dkd_header_copy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 6,
  },
  dkd_header_action_row: {
    flexDirection: 'row',
    gap: 8,
    flexShrink: 0,
  },
  dkd_header_button: {
    alignSelf: 'flex-start',
  },
  dkd_row_button: {
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  dkd_inline_button_row: {
    flexDirection: 'row',
    gap: 8,
  },
  dkd_kicker: {
    color: cityLootTheme.colors.goldSoft,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  dkd_title: {
    color: cityLootTheme.colors.text,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 4,
    lineHeight: 28,
  },
  dkd_hero_panel: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    marginBottom: 12,
  },
  dkd_hero_glow_blue: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(103,227,255,0.12)',
    top: -60,
    right: -30,
  },
  dkd_hero_glow_gold: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: 'rgba(246,181,78,0.10)',
    bottom: -40,
    left: -40,
  },
  dkd_hero_title: {
    color: cityLootTheme.colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  dkd_stats_grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  dkd_stat_card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(7,12,22,0.64)',
    padding: 12,
  },
  dkd_stat_label_row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dkd_stat_label: {
    color: cityLootTheme.colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  dkd_stat_value: {
    color: cityLootTheme.colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 6,
  },
  dkd_center_action_shell: {
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    marginBottom: 12,
  },
  dkd_center_action_fill: {
    minHeight: 104,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dkd_center_action_glow: {
    position: 'absolute',
    right: -30,
    top: -20,
    width: 140,
    height: 140,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  dkd_center_action_icon_wrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  dkd_center_action_arrow_wrap: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dkd_card_kicker_row: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(5,10,20,0.24)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  dkd_card_kicker_text: {
    color: '#F7FBFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.9,
  },
  dkd_center_action_title: {
    color: '#F7FBFF',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 8,
    lineHeight: 22,
  },
  dkd_center_action_meta: {
    color: 'rgba(247,251,255,0.86)',
    lineHeight: 18,
    marginTop: 6,
    fontSize: 12,
  },
  dkd_page_intro_card: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    marginBottom: 12,
  },
  dkd_page_intro_fill: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dkd_page_intro_icon_wrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  dkd_page_intro_title: {
    color: cityLootTheme.colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  dkd_page_intro_meta: {
    color: cityLootTheme.colors.textSoft,
    lineHeight: 18,
    marginTop: 6,
  },
  dkd_panel: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 14,
  },
  dkd_section_row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  dkd_section_title: {
    color: cityLootTheme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    flex: 1,
  },
  dkd_helper: {
    color: cityLootTheme.colors.textSoft,
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
  },
  dkd_label: {
    color: cityLootTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 12,
  },
  dkd_input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: cityLootTheme.colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 8,
  },
  dkd_two_col: {
    flexDirection: 'row',
    gap: 10,
  },
  dkd_option_wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  dkd_chip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  dkd_chip_on: {
    backgroundColor: cityLootTheme.colors.cyanSoft,
    borderColor: cityLootTheme.colors.cyanSoft,
  },
  dkd_chip_text: {
    color: cityLootTheme.colors.text,
    fontWeight: '800',
  },
  dkd_chip_text_on: {
    color: '#06111A',
  },
  dkd_auto_info_box: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(103,227,255,0.14)',
    backgroundColor: 'rgba(103,227,255,0.10)',
    padding: 12,
  },
  dkd_auto_info_text: {
    color: '#DFF8FF',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
  },
  dkd_button_row: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dkd_empty_state_box: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  dkd_empty_state_text: {
    color: cityLootTheme.colors.textSoft,
    fontSize: 13,
    fontWeight: '700',
  },
  dkd_job_card: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    marginTop: 10,
  },
  dkd_job_card_on: {
    borderColor: 'rgba(246,181,78,0.30)',
  },
  dkd_job_fill: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  dkd_job_title: {
    color: cityLootTheme.colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  dkd_job_sub: {
    color: cityLootTheme.colors.textSoft,
    fontSize: 12,
    marginTop: 4,
  },
  dkd_job_meta: {
    color: cityLootTheme.colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  dkd_job_aside: {
    gap: 8,
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  dkd_badge: {
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dkd_badge_text: {
    color: cityLootTheme.colors.text,
    fontSize: 10,
    fontWeight: '900',
  },
  dkd_application_highlight_card: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 14,
    marginTop: 12,
  },
  dkd_application_avatar_shell: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(246,181,78,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(246,181,78,0.24)',
  },
  dkd_application_name: {
    color: cityLootTheme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  dkd_application_meta: {
    color: cityLootTheme.colors.textSoft,
    lineHeight: 18,
    marginTop: 4,
    fontSize: 12,
  },
  dkd_info_grid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  dkd_info_panel: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 14,
  },
  dkd_info_panel_title: {
    color: cityLootTheme.colors.text,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
  },
  dkd_info_row: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  dkd_info_label: {
    color: cityLootTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dkd_info_value: {
    color: cityLootTheme.colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
    lineHeight: 18,
  },
  dkd_document_row_wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  dkd_document_action_shell: {
    width: '48%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  dkd_document_action_fill: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
  },
  dkd_document_action_text: {
    flex: 1,
    color: cityLootTheme.colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
});
