import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { cityLootTheme } from '../../theme/cityLootTheme';
import { dkd_make_native_axis_point } from '../../utils/dkdNativeAxis';
import {
  dkd_approve_urgent_courier_fee,
  dkd_approve_urgent_courier_product_total,
  dkd_cancel_urgent_courier_order,
  dkd_complete_urgent_courier_delivery,
  dkd_create_urgent_courier_order,
  dkd_fetch_urgent_courier_snapshot,
  dkd_offer_urgent_courier_fee,
  dkd_pickup_urgent_courier_items,
  dkd_send_urgent_courier_message,
  dkd_set_urgent_courier_item_totals,
  dkd_upload_urgent_courier_invoice,
} from '../../services/dkd_urgent_courier_service';

const dkd_colors = cityLootTheme.colors;

const dkd_urgent_store_group_values = Object.freeze([
  {
    dkd_group_key: 'market',
    dkd_group_label: 'Market',
    dkd_group_icon: 'cart-outline',
    dkd_store_values: ['Gimsa', 'BİM', 'A 101', 'Migros', 'YUNUS'],
  },
  {
    dkd_group_key: 'firin',
    dkd_group_label: 'Fırın',
    dkd_group_icon: 'bread-slice-outline',
    dkd_store_values: ['Mutlu Günler', 'Fırıncı Orhan', 'Tarihi Fırın'],
  },
]);

function dkd_default_form_value() {
  return {
    dkd_customer_full_name: '',
    dkd_customer_phone_text: '+90',
    dkd_customer_address_text: '',
    dkd_customer_note_text: '',
    dkd_selected_store_map: {},
    dkd_store_product_map: {},
    dkd_nearest_pharmacy_selected: false,
    dkd_nearest_pharmacy_products: '',
    dkd_other_store_name: '',
    dkd_other_products: '',
  };
}

function dkd_format_money_value(dkd_raw_value) {
  const dkd_numeric_value = Number(dkd_raw_value || 0);
  return `${(Number.isFinite(dkd_numeric_value) ? dkd_numeric_value : 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
}

function dkd_format_date_value(dkd_raw_value) {
  if (!dkd_raw_value) return '—';
  const dkd_date_value = new Date(dkd_raw_value);
  if (Number.isNaN(dkd_date_value.getTime())) return '—';
  return dkd_date_value.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function dkd_status_label_value(dkd_status_value) {
  const dkd_status_key_value = String(dkd_status_value || '').toLowerCase();
  const dkd_status_map_value = {
    dkd_open: 'Kurye Bekliyor',
    dkd_fee_offer_waiting: 'Taşıma Ücreti Onayı',
    dkd_fee_paid_shopping: 'Kurye Alışverişte',
    dkd_product_total_waiting: 'Ürün Tutarı Onayı',
    dkd_product_total_approved: 'Satın Alma Onaylandı',
    dkd_invoice_uploaded: 'Fatura Yüklendi',
    dkd_on_the_way: 'Kurye Yolda',
    dkd_completed: 'Tamamlandı',
    dkd_cancelled: 'İptal',
  };
  return dkd_status_map_value[dkd_status_key_value] || 'Acil Kurye';
}

function dkd_status_tone_style(dkd_status_value) {
  const dkd_status_key_value = String(dkd_status_value || '').toLowerCase();
  if (dkd_status_key_value === 'dkd_completed') return dkd_styles.dkd_status_pill_done;
  if (dkd_status_key_value === 'dkd_cancelled') return dkd_styles.dkd_status_pill_cancelled;
  if (['dkd_fee_offer_waiting', 'dkd_product_total_waiting'].includes(dkd_status_key_value)) return dkd_styles.dkd_status_pill_waiting;
  return dkd_styles.dkd_status_pill_live;
}

function dkd_phone_digits_value(dkd_raw_value) {
  return String(dkd_raw_value || '').replace(/\D/g, '');
}

function dkd_normalize_turkiye_phone_value(dkd_raw_value) {
  const dkd_digits_value = dkd_phone_digits_value(dkd_raw_value);
  const dkd_local_digits_value = (dkd_digits_value.startsWith('90') ? dkd_digits_value.slice(2) : dkd_digits_value.replace(/^0+/, '')).slice(0, 10);
  return `+90${dkd_local_digits_value}`;
}

function dkd_valid_phone_value(dkd_raw_value) {
  const dkd_digits_value = dkd_phone_digits_value(dkd_raw_value);
  const dkd_local_digits_value = dkd_digits_value.startsWith('90') ? dkd_digits_value.slice(2) : dkd_digits_value.replace(/^0+/, '');
  return dkd_local_digits_value.length === 10;
}

function dkd_phone_dial_url_value(dkd_raw_value) {
  const dkd_digits_value = dkd_phone_digits_value(dkd_raw_value);
  const dkd_local_digits_value = dkd_digits_value.startsWith('90') ? dkd_digits_value.slice(2) : dkd_digits_value.replace(/^0+/, '');
  if (dkd_local_digits_value.length < 10) return '';
  return `tel:+90${dkd_local_digits_value.slice(0, 10)}`;
}

function dkd_order_chat_enabled_value(dkd_order_value) {
  return Boolean(dkd_order_value?.dkd_chat_enabled_value) || !['dkd_open', 'dkd_cancelled', 'dkd_completed'].includes(String(dkd_order_value?.dkd_status_key || '').toLowerCase());
}

function DkdPanelField({ dkd_label_value, dkd_value, dkd_on_change_value, dkd_placeholder_value, dkd_multiline_value = false, dkd_keyboard_type_value = 'default' }) {
  return (
    <View style={dkd_styles.dkd_field_shell}>
      <Text style={dkd_styles.dkd_field_label}>{dkd_label_value}</Text>
      <TextInput
        value={dkd_value}
        onChangeText={dkd_on_change_value}
        placeholder={dkd_placeholder_value}
        placeholderTextColor="rgba(231,241,255,0.42)"
        keyboardType={dkd_keyboard_type_value}
        multiline={dkd_multiline_value}
        style={[dkd_styles.dkd_field_input, dkd_multiline_value && dkd_styles.dkd_field_input_multiline]}
      />
    </View>
  );
}

function DkdMetricTile({ dkd_icon_name_value, dkd_label_value, dkd_value, dkd_tone_value = 'cyan' }) {
  const dkd_icon_color_value = dkd_tone_value === 'green' ? '#7BFFD9' : dkd_tone_value === 'gold' ? '#FFE59A' : '#9CEBFF';
  return (
    <View style={dkd_styles.dkd_metric_tile}>
      <MaterialCommunityIcons name={dkd_icon_name_value} size={16} color={dkd_icon_color_value} />
      <Text style={dkd_styles.dkd_metric_label}>{dkd_label_value}</Text>
      <Text style={dkd_styles.dkd_metric_value}>{dkd_value}</Text>
    </View>
  );
}

function DkdUrgentTab({ dkd_tab_key_value, dkd_active_tab_value, dkd_label_value, dkd_icon_name_value, dkd_on_press_value }) {
  const dkd_is_active_value = dkd_tab_key_value === dkd_active_tab_value;
  return (
    <Pressable onPress={() => dkd_on_press_value(dkd_tab_key_value)} style={[dkd_styles.dkd_tab_chip, dkd_is_active_value && dkd_styles.dkd_tab_chip_active]}>
      <LinearGradient
        colors={dkd_is_active_value ? ['rgba(98,232,255,0.28)', 'rgba(124,132,255,0.22)', 'rgba(108,255,212,0.18)'] : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.025)']}
        start={dkd_make_native_axis_point(0, 0)}
        end={dkd_make_native_axis_point(1, 1)}
        style={StyleSheet.absoluteFill}
      />
      <MaterialCommunityIcons name={dkd_icon_name_value} size={16} color={dkd_is_active_value ? '#FFFFFF' : 'rgba(231,241,255,0.72)'} />
      <Text style={[dkd_styles.dkd_tab_text, dkd_is_active_value && dkd_styles.dkd_tab_text_active]}>{dkd_label_value}</Text>
    </Pressable>
  );
}

export default function DkdUrgentCourierPanel({
  dkd_visible_value,
  dkd_profile_value,
  dkd_courier_approved_value = false,
  dkd_on_wallet_after_payment_value,
}) {
  const [dkd_active_tab_value, setDkdActiveTabValue] = useState('create');
  const [dkd_form_value, setDkdFormValue] = useState(() => dkd_default_form_value());
  const [dkd_snapshot_value, setDkdSnapshotValue] = useState({
    dkd_customer_orders: [],
    dkd_courier_orders: [],
    dkd_profile: null,
    dkd_has_courier_license: false,
  });
  const [dkd_loading_value, setDkdLoadingValue] = useState(false);
  const [dkd_action_busy_key_value, setDkdActionBusyKeyValue] = useState('');
  const [dkd_fee_draft_map_value, setDkdFeeDraftMapValue] = useState({});
  const [dkd_product_total_draft_map_value, setDkdProductTotalDraftMapValue] = useState({});
  const [dkd_message_draft_map_value, setDkdMessageDraftMapValue] = useState({});
  const [dkd_invoice_preview_url_value, setDkdInvoicePreviewUrlValue] = useState('');

  const dkd_wallet_value = useMemo(() => {
    const dkd_snapshot_wallet_value = Number(dkd_snapshot_value?.dkd_profile?.wallet_tl ?? dkd_snapshot_value?.dkd_profile?.dkd_wallet_tl ?? 0);
    const dkd_profile_wallet_value = Number(dkd_profile_value?.wallet_tl ?? dkd_profile_value?.courier_wallet_tl ?? 0);
    if (Number.isFinite(dkd_snapshot_wallet_value) && dkd_snapshot_wallet_value > 0) return dkd_snapshot_wallet_value;
    return Number.isFinite(dkd_profile_wallet_value) ? dkd_profile_wallet_value : 0;
  }, [dkd_profile_value?.courier_wallet_tl, dkd_profile_value?.wallet_tl, dkd_snapshot_value?.dkd_profile]);

  const dkd_load_snapshot_value = useCallback(async ({ dkd_silent_value = false } = {}) => {
    if (!dkd_silent_value) setDkdLoadingValue(true);
    try {
      const { data: dkd_data_value, error: dkd_error_value } = await dkd_fetch_urgent_courier_snapshot();
      if (dkd_error_value) throw dkd_error_value;
      setDkdSnapshotValue({
        dkd_customer_orders: Array.isArray(dkd_data_value?.dkd_customer_orders) ? dkd_data_value.dkd_customer_orders : [],
        dkd_courier_orders: Array.isArray(dkd_data_value?.dkd_courier_orders) ? dkd_data_value.dkd_courier_orders : [],
        dkd_profile: dkd_data_value?.dkd_profile || null,
        dkd_has_courier_license: dkd_data_value?.dkd_has_courier_license === true,
      });
    } catch (dkd_error_value) {
      if (!dkd_silent_value) Alert.alert('Acil Kurye', dkd_error_value?.message || 'Acil Kurye verisi alınamadı.');
    } finally {
      if (!dkd_silent_value) setDkdLoadingValue(false);
    }
  }, []);

  useEffect(() => {
    if (!dkd_visible_value) return undefined;
    dkd_load_snapshot_value();
    const dkd_interval_value = setInterval(() => {
      dkd_load_snapshot_value({ dkd_silent_value: true });
    }, 42000);
    return () => clearInterval(dkd_interval_value);
  }, [dkd_load_snapshot_value, dkd_visible_value]);

  const dkd_customer_active_count_value = useMemo(() => (
    dkd_snapshot_value.dkd_customer_orders.filter((dkd_order_value) => !['dkd_completed', 'dkd_cancelled'].includes(String(dkd_order_value?.dkd_status_key || '').toLowerCase())).length
  ), [dkd_snapshot_value.dkd_customer_orders]);

  const dkd_set_form_field_value = useCallback((dkd_key_value, dkd_next_value) => {
    setDkdFormValue((dkd_previous_value) => ({ ...dkd_previous_value, [dkd_key_value]: dkd_next_value }));
  }, []);

  const dkd_store_key_value = useCallback((dkd_group_key_value, dkd_store_name_value) => `${dkd_group_key_value}__${dkd_store_name_value}`.replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase(), []);

  const dkd_toggle_store_value = useCallback((dkd_group_key_value, dkd_store_name_value) => {
    const dkd_safe_key_value = dkd_store_key_value(dkd_group_key_value, dkd_store_name_value);
    setDkdFormValue((dkd_previous_value) => ({
      ...dkd_previous_value,
      dkd_selected_store_map: {
        ...(dkd_previous_value?.dkd_selected_store_map || {}),
        [dkd_safe_key_value]: !dkd_previous_value?.dkd_selected_store_map?.[dkd_safe_key_value],
      },
    }));
  }, [dkd_store_key_value]);

  const dkd_set_store_product_value = useCallback((dkd_group_key_value, dkd_store_name_value, dkd_next_value) => {
    const dkd_safe_key_value = dkd_store_key_value(dkd_group_key_value, dkd_store_name_value);
    setDkdFormValue((dkd_previous_value) => ({
      ...dkd_previous_value,
      dkd_store_product_map: {
        ...(dkd_previous_value?.dkd_store_product_map || {}),
        [dkd_safe_key_value]: dkd_next_value,
      },
    }));
  }, [dkd_store_key_value]);

  const dkd_collect_items_value = useCallback(() => {
    const dkd_items_value = [];
    dkd_urgent_store_group_values.forEach((dkd_group_value) => {
      dkd_group_value.dkd_store_values.forEach((dkd_store_name_value) => {
        const dkd_safe_key_value = dkd_store_key_value(dkd_group_value.dkd_group_key, dkd_store_name_value);
        if (!dkd_form_value?.dkd_selected_store_map?.[dkd_safe_key_value]) return;
        dkd_items_value.push({
          dkd_store_group_key: dkd_group_value.dkd_group_key,
          dkd_store_name: dkd_store_name_value,
          dkd_product_text: String(dkd_form_value?.dkd_store_product_map?.[dkd_safe_key_value] || '').trim(),
          dkd_is_nearest_pharmacy: false,
        });
      });
    });
    if (dkd_form_value?.dkd_nearest_pharmacy_selected) {
      dkd_items_value.push({
        dkd_store_group_key: 'eczane',
        dkd_store_name: 'En Yakın Eczaneden AL',
        dkd_product_text: String(dkd_form_value?.dkd_nearest_pharmacy_products || '').trim(),
        dkd_is_nearest_pharmacy: true,
      });
    }
    const dkd_other_store_name_value = String(dkd_form_value?.dkd_other_store_name || '').trim();
    const dkd_other_products_value = String(dkd_form_value?.dkd_other_products || '').trim();
    if (dkd_other_store_name_value || dkd_other_products_value) {
      dkd_items_value.push({
        dkd_store_group_key: 'diger',
        dkd_store_name: dkd_other_store_name_value || 'Diğer Mağaza',
        dkd_product_text: dkd_other_products_value,
        dkd_is_nearest_pharmacy: false,
      });
    }
    return dkd_items_value.filter((dkd_item_value) => String(dkd_item_value.dkd_store_name || '').trim());
  }, [dkd_form_value, dkd_store_key_value]);

  const dkd_submit_order_value = useCallback(async () => {
    const dkd_items_value = dkd_collect_items_value();
    if (String(dkd_form_value?.dkd_customer_full_name || '').trim().length < 2) {
      Alert.alert('Acil Kurye', 'Ad soyad alanını doldurmalısın.');
      return;
    }
    if (!dkd_valid_phone_value(dkd_form_value?.dkd_customer_phone_text)) {
      Alert.alert('Acil Kurye', 'Geçerli bir telefon numarası yazmalısın.');
      return;
    }
    if (String(dkd_form_value?.dkd_customer_address_text || '').trim().length < 8) {
      Alert.alert('Acil Kurye', 'Teslimat adresini daha açık yazmalısın.');
      return;
    }
    if (!dkd_items_value.length || dkd_items_value.some((dkd_item_value) => !String(dkd_item_value?.dkd_product_text || '').trim())) {
      Alert.alert('Acil Kurye', 'En az bir mağaza seçip ürün listesini yazmalısın.');
      return;
    }
    setDkdActionBusyKeyValue('create');
    try {
      const { error: dkd_error_value } = await dkd_create_urgent_courier_order({
        dkd_customer_full_name: dkd_form_value.dkd_customer_full_name,
        dkd_customer_phone_text: dkd_form_value.dkd_customer_phone_text,
        dkd_customer_address_text: dkd_form_value.dkd_customer_address_text,
        dkd_customer_note_text: dkd_form_value.dkd_customer_note_text,
        dkd_items: dkd_items_value,
      });
      if (dkd_error_value) throw dkd_error_value;
      setDkdFormValue(dkd_default_form_value());
      setDkdActiveTabValue('customer');
      await dkd_load_snapshot_value({ dkd_silent_value: true });
      Alert.alert('Acil Kurye', 'Sipariş oluşturuldu. Web market ve uygulama aynı siparişi görecek.');
    } catch (dkd_error_value) {
      Alert.alert('Acil Kurye', dkd_error_value?.message || 'Sipariş oluşturulamadı.');
    } finally {
      setDkdActionBusyKeyValue('');
    }
  }, [dkd_collect_items_value, dkd_form_value, dkd_load_snapshot_value]);

  const dkd_run_action_value = useCallback(async (dkd_busy_key_value, dkd_action_callback_value, dkd_success_message_value) => {
    setDkdActionBusyKeyValue(dkd_busy_key_value);
    try {
      const dkd_result_value = await dkd_action_callback_value();
      if (dkd_result_value?.error) throw dkd_result_value.error;
      const dkd_wallet_after_value = dkd_result_value?.data?.dkd_wallet_after_tl;
      if (dkd_wallet_after_value != null) dkd_on_wallet_after_payment_value?.(dkd_wallet_after_value);
      await dkd_load_snapshot_value({ dkd_silent_value: true });
      if (dkd_success_message_value) Alert.alert('Acil Kurye', dkd_success_message_value);
    } catch (dkd_error_value) {
      Alert.alert('Acil Kurye', dkd_error_value?.message || 'İşlem tamamlanamadı.');
    } finally {
      setDkdActionBusyKeyValue('');
    }
  }, [dkd_load_snapshot_value, dkd_on_wallet_after_payment_value]);

  const dkd_open_phone_value = useCallback(async (dkd_phone_text_value) => {
    const dkd_url_value = dkd_phone_dial_url_value(dkd_phone_text_value);
    if (!dkd_url_value) return;
    try {
      const dkd_supported_value = await Linking.canOpenURL(dkd_url_value);
      if (dkd_supported_value) await Linking.openURL(dkd_url_value);
    } catch (dkd_error_value) {
      Alert.alert('Acil Kurye', dkd_error_value?.message || 'Telefon araması açılamadı.');
    }
  }, []);

  const dkd_pick_invoice_value = useCallback(async (dkd_order_id_value) => {
    const dkd_permission_value = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (dkd_permission_value?.status !== 'granted') {
      Alert.alert('Acil Kurye', 'Fatura görseli seçmek için galeri izni gerekli.');
      return;
    }
    const dkd_picker_result_value = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.72,
      base64: true,
    });
    if (dkd_picker_result_value?.canceled) return;
    const dkd_asset_value = dkd_picker_result_value?.assets?.[0];
    const dkd_base64_value = String(dkd_asset_value?.base64 || '').trim();
    if (!dkd_base64_value) {
      Alert.alert('Acil Kurye', 'Fatura görseli okunamadı.');
      return;
    }
    const dkd_mime_value = String(dkd_asset_value?.mimeType || 'image/jpeg');
    await dkd_run_action_value(
      `invoice_${dkd_order_id_value}`,
      () => dkd_upload_urgent_courier_invoice(dkd_order_id_value, `data:${dkd_mime_value};base64,${dkd_base64_value}`),
      'Fatura görseli müşterinin paneline yüklendi.',
    );
  }, [dkd_run_action_value]);

  const dkd_render_store_group_value = useCallback((dkd_group_value) => (
    <View key={dkd_group_value.dkd_group_key} style={dkd_styles.dkd_store_group_card}>
      <View style={dkd_styles.dkd_store_group_head}>
        <MaterialCommunityIcons name={dkd_group_value.dkd_group_icon} size={18} color="#8CF2FF" />
        <Text style={dkd_styles.dkd_store_group_title}>{dkd_group_value.dkd_group_label}</Text>
      </View>
      <View style={dkd_styles.dkd_store_grid}>
        {dkd_group_value.dkd_store_values.map((dkd_store_name_value) => {
          const dkd_safe_key_value = dkd_store_key_value(dkd_group_value.dkd_group_key, dkd_store_name_value);
          const dkd_selected_value = Boolean(dkd_form_value?.dkd_selected_store_map?.[dkd_safe_key_value]);
          return (
            <View key={dkd_safe_key_value} style={[dkd_styles.dkd_store_tile, dkd_selected_value && dkd_styles.dkd_store_tile_active]}>
              <Pressable onPress={() => dkd_toggle_store_value(dkd_group_value.dkd_group_key, dkd_store_name_value)} style={dkd_styles.dkd_store_check_row}>
                <MaterialCommunityIcons name={dkd_selected_value ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'} size={18} color={dkd_selected_value ? '#7BFFD9' : 'rgba(231,241,255,0.62)'} />
                <Text style={dkd_styles.dkd_store_name}>{dkd_store_name_value}</Text>
              </Pressable>
              {dkd_selected_value ? (
                <TextInput
                  value={String(dkd_form_value?.dkd_store_product_map?.[dkd_safe_key_value] || '')}
                  onChangeText={(dkd_next_text_value) => dkd_set_store_product_value(dkd_group_value.dkd_group_key, dkd_store_name_value, dkd_next_text_value)}
                  placeholder="Alınacak ürünleri yaz"
                  placeholderTextColor="rgba(231,241,255,0.38)"
                  multiline
                  style={dkd_styles.dkd_store_products_input}
                />
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  ), [dkd_form_value?.dkd_selected_store_map, dkd_form_value?.dkd_store_product_map, dkd_set_store_product_value, dkd_store_key_value, dkd_toggle_store_value]);

  const dkd_render_create_panel_value = () => (
    <View style={dkd_styles.dkd_panel_card}>
      <View style={dkd_styles.dkd_panel_head_row}>
        <View style={dkd_styles.dkd_panel_icon_shell}>
          <MaterialCommunityIcons name="flash-outline" size={20} color="#09111D" />
        </View>
        <View style={dkd_styles.dkd_panel_head_copy}>
          <Text style={dkd_styles.dkd_panel_title}>Acil Kurye Siparişi</Text>
          <Text style={dkd_styles.dkd_panel_subtitle}>Market, fırın, eczane veya özel mağaza isteğini web ile senkron oluştur.</Text>
        </View>
      </View>

      <View style={dkd_styles.dkd_form_grid}>
        <DkdPanelField
          dkd_label_value="Ad Soyad"
          dkd_value={dkd_form_value.dkd_customer_full_name}
          dkd_on_change_value={(dkd_next_value) => dkd_set_form_field_value('dkd_customer_full_name', dkd_next_value)}
          dkd_placeholder_value="Ad Soyad"
        />
        <DkdPanelField
          dkd_label_value="Telefon"
          dkd_value={dkd_form_value.dkd_customer_phone_text}
          dkd_on_change_value={(dkd_next_value) => dkd_set_form_field_value('dkd_customer_phone_text', dkd_normalize_turkiye_phone_value(dkd_next_value))}
          dkd_placeholder_value="+905xxxxxxxxx"
          dkd_keyboard_type_value="phone-pad"
        />
      </View>
      <DkdPanelField
        dkd_label_value="Teslimat Adresi"
        dkd_value={dkd_form_value.dkd_customer_address_text}
        dkd_on_change_value={(dkd_next_value) => dkd_set_form_field_value('dkd_customer_address_text', dkd_next_value)}
        dkd_placeholder_value="Mahalle, sokak, bina, daire ve tarif"
        dkd_multiline_value
      />

      {dkd_urgent_store_group_values.map((dkd_group_value) => dkd_render_store_group_value(dkd_group_value))}

      <View style={dkd_styles.dkd_store_group_card}>
        <Pressable
          onPress={() => dkd_set_form_field_value('dkd_nearest_pharmacy_selected', !dkd_form_value.dkd_nearest_pharmacy_selected)}
          style={dkd_styles.dkd_store_check_row}
        >
          <MaterialCommunityIcons name={dkd_form_value.dkd_nearest_pharmacy_selected ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'} size={18} color={dkd_form_value.dkd_nearest_pharmacy_selected ? '#FFE59A' : 'rgba(231,241,255,0.62)'} />
          <Text style={dkd_styles.dkd_store_name}>En Yakın Eczaneden AL</Text>
        </Pressable>
        {dkd_form_value.dkd_nearest_pharmacy_selected ? (
          <TextInput
            value={dkd_form_value.dkd_nearest_pharmacy_products}
            onChangeText={(dkd_next_value) => dkd_set_form_field_value('dkd_nearest_pharmacy_products', dkd_next_value)}
            placeholder="Eczaneden alınacak ürünleri veya notu yaz"
            placeholderTextColor="rgba(231,241,255,0.38)"
            multiline
            style={dkd_styles.dkd_store_products_input}
          />
        ) : null}
      </View>

      <View style={dkd_styles.dkd_form_grid}>
        <DkdPanelField
          dkd_label_value="Diğer Mağaza"
          dkd_value={dkd_form_value.dkd_other_store_name}
          dkd_on_change_value={(dkd_next_value) => dkd_set_form_field_value('dkd_other_store_name', dkd_next_value)}
          dkd_placeholder_value="Müşterinin istediği mağaza"
        />
        <DkdPanelField
          dkd_label_value="Diğer Ürünler"
          dkd_value={dkd_form_value.dkd_other_products}
          dkd_on_change_value={(dkd_next_value) => dkd_set_form_field_value('dkd_other_products', dkd_next_value)}
          dkd_placeholder_value="Alınacak ürünler"
          dkd_multiline_value
        />
      </View>
      <DkdPanelField
        dkd_label_value="Kurye Notu"
        dkd_value={dkd_form_value.dkd_customer_note_text}
        dkd_on_change_value={(dkd_next_value) => dkd_set_form_field_value('dkd_customer_note_text', dkd_next_value)}
        dkd_placeholder_value="Marka tercihi, alternatif ürün, kapı kodu vb."
        dkd_multiline_value
      />

      <Pressable onPress={dkd_submit_order_value} disabled={dkd_action_busy_key_value === 'create'} style={[dkd_styles.dkd_primary_button, dkd_action_busy_key_value === 'create' && dkd_styles.dkd_button_disabled]}>
        <LinearGradient colors={['#66E8FF', '#788BFF', '#6CFFD4']} start={dkd_make_native_axis_point(0, 0)} end={dkd_make_native_axis_point(1, 1)} style={StyleSheet.absoluteFill} />
        {dkd_action_busy_key_value === 'create' ? <ActivityIndicator color="#06111A" /> : <MaterialCommunityIcons name="rocket-launch-outline" size={18} color="#06111A" />}
        <Text style={dkd_styles.dkd_primary_button_text}>{dkd_action_busy_key_value === 'create' ? 'Oluşturuluyor…' : 'Acil Kurye Siparişi Oluştur'}</Text>
      </Pressable>
    </View>
  );

  const dkd_item_total_key_value = useCallback((dkd_order_id_value, dkd_item_id_value) => `${dkd_order_id_value}_${dkd_item_id_value}`, []);

  const dkd_read_item_total_draft_value = useCallback((dkd_order_id_value, dkd_item_value) => {
    const dkd_item_id_value = String(dkd_item_value?.dkd_item_id || '');
    const dkd_key_value = dkd_item_total_key_value(dkd_order_id_value, dkd_item_id_value);
    const dkd_draft_value = dkd_product_total_draft_map_value?.[dkd_key_value];
    if (dkd_draft_value != null) return String(dkd_draft_value);
    const dkd_existing_value = Number(dkd_item_value?.dkd_product_total_tl || 0);
    return dkd_existing_value > 0 ? String(dkd_existing_value) : '';
  }, [dkd_item_total_key_value, dkd_product_total_draft_map_value]);

  const dkd_build_item_totals_payload_value = useCallback((dkd_order_value) => {
    const dkd_order_id_value = String(dkd_order_value?.dkd_order_id || '');
    const dkd_item_values = Array.isArray(dkd_order_value?.dkd_item_values) ? dkd_order_value.dkd_item_values : [];
    return dkd_item_values.map((dkd_item_value) => {
      const dkd_item_id_value = String(dkd_item_value?.dkd_item_id || '');
      const dkd_total_value = Number(dkd_read_item_total_draft_value(dkd_order_id_value, dkd_item_value) || 0);
      return {
        dkd_item_id: dkd_item_id_value,
        dkd_product_total_tl: Number.isFinite(dkd_total_value) ? dkd_total_value : 0,
      };
    });
  }, [dkd_read_item_total_draft_value]);

  const dkd_render_items_value = (dkd_order_value) => {
    const dkd_item_values = Array.isArray(dkd_order_value?.dkd_item_values) ? dkd_order_value.dkd_item_values : [];
    if (!dkd_item_values.length) return <Text style={dkd_styles.dkd_empty_mini}>Ürün listesi bekleniyor.</Text>;
    return (
      <View style={dkd_styles.dkd_item_list}>
        {dkd_item_values.map((dkd_item_value, dkd_item_index_value) => (
          <View key={`${dkd_item_value?.dkd_store_name || 'store'}_${dkd_item_index_value}`} style={dkd_styles.dkd_item_chip}>
            <Text style={dkd_styles.dkd_item_title}>{dkd_item_value?.dkd_store_name || 'Mağaza'}</Text>
            <Text style={dkd_styles.dkd_item_text}>{dkd_item_value?.dkd_product_text || 'Ürün listesi yazılmadı'}</Text>
            {Number(dkd_item_value?.dkd_product_total_tl || 0) > 0 ? (
              <Text style={dkd_styles.dkd_item_total_text}>Mağaza toplamı: {dkd_format_money_value(dkd_item_value.dkd_product_total_tl)}</Text>
            ) : null}
          </View>
        ))}
      </View>
    );
  };

  const dkd_render_messages_value = (dkd_order_value) => {
    const dkd_message_values = Array.isArray(dkd_order_value?.dkd_message_values) ? dkd_order_value.dkd_message_values : [];
    const dkd_order_id_value = String(dkd_order_value?.dkd_order_id || '');
    const dkd_can_chat_value = dkd_order_chat_enabled_value(dkd_order_value);
    return (
      <View style={dkd_styles.dkd_chat_box}>
        <View style={dkd_styles.dkd_chat_head}>
          <MaterialCommunityIcons name="message-processing-outline" size={15} color="#9CEBFF" />
          <Text style={dkd_styles.dkd_chat_title}>Canlı mesaj</Text>
        </View>
        {dkd_message_values.slice(-4).map((dkd_message_value, dkd_message_index_value) => (
          <View key={`${dkd_message_value?.dkd_created_at || 'message'}_${dkd_message_index_value}`} style={dkd_styles.dkd_message_bubble}>
            <Text style={dkd_styles.dkd_message_sender}>{dkd_message_value?.dkd_sender_display_name || (String(dkd_message_value?.dkd_sender_role_key || '') === 'dkd_courier' ? 'Kurye' : 'Müşteri')}</Text>
            <Text style={dkd_styles.dkd_message_text}>{dkd_message_value?.dkd_message_text || ''}</Text>
          </View>
        ))}
        {dkd_can_chat_value ? (
          <View style={dkd_styles.dkd_inline_input_row}>
            <TextInput
              value={String(dkd_message_draft_map_value?.[dkd_order_id_value] || '')}
              onChangeText={(dkd_next_value) => setDkdMessageDraftMapValue((dkd_previous_value) => ({ ...dkd_previous_value, [dkd_order_id_value]: dkd_next_value }))}
              placeholder="Mesaj yaz"
              placeholderTextColor="rgba(231,241,255,0.38)"
              style={dkd_styles.dkd_inline_input}
            />
            <Pressable
              onPress={() => {
                const dkd_message_text_value = String(dkd_message_draft_map_value?.[dkd_order_id_value] || '').trim();
                if (!dkd_message_text_value) return;
                dkd_run_action_value(
                  `message_${dkd_order_id_value}`,
                  () => dkd_send_urgent_courier_message(dkd_order_id_value, dkd_message_text_value),
                  '',
                );
                setDkdMessageDraftMapValue((dkd_previous_value) => ({ ...dkd_previous_value, [dkd_order_id_value]: '' }));
              }}
              style={dkd_styles.dkd_send_button}
            >
              <MaterialCommunityIcons name="send" size={16} color="#06111A" />
            </Pressable>
          </View>
        ) : (
          <Text style={dkd_styles.dkd_chat_locked_text}>Sohbet ücret onayından sonra açılır.</Text>
        )}
      </View>
    );
  };

  const dkd_render_customer_order_value = (dkd_order_value) => {
    const dkd_order_id_value = String(dkd_order_value?.dkd_order_id || '');
    const dkd_status_key_value = String(dkd_order_value?.dkd_status_key || '').toLowerCase();
    const dkd_can_cancel_value = dkd_status_key_value === 'dkd_open' && !String(dkd_order_value?.dkd_courier_user_id || '').trim();
    const dkd_invoice_url_value = String(dkd_order_value?.dkd_invoice_image_url || '').trim();
    return (
      <View key={dkd_order_id_value} style={dkd_styles.dkd_order_card}>
        <View style={dkd_styles.dkd_order_head}>
          <View style={dkd_styles.dkd_order_title_stack}>
            <Text style={dkd_styles.dkd_order_title}>Acil Market Siparişi</Text>
            <Text style={dkd_styles.dkd_order_meta}>{dkd_format_date_value(dkd_order_value?.dkd_created_at)}</Text>
          </View>
          <View style={[dkd_styles.dkd_status_pill, dkd_status_tone_style(dkd_status_key_value)]}>
            <Text style={dkd_styles.dkd_status_text}>{dkd_status_label_value(dkd_status_key_value)}</Text>
          </View>
        </View>
        {dkd_render_items_value(dkd_order_value)}
        <View style={dkd_styles.dkd_money_grid}>
          <DkdMetricTile dkd_icon_name_value="bike-fast" dkd_label_value="Taşıma" dkd_value={Number(dkd_order_value?.dkd_courier_fee_tl || 0) > 0 ? dkd_format_money_value(dkd_order_value.dkd_courier_fee_tl) : 'Kurye bekleniyor'} />
          <DkdMetricTile dkd_icon_name_value="basket-check-outline" dkd_label_value="Ürün" dkd_value={Number(dkd_order_value?.dkd_product_total_tl || 0) > 0 ? dkd_format_money_value(dkd_order_value.dkd_product_total_tl) : 'Bekleniyor'} dkd_tone_value="green" />
        </View>
        {dkd_can_cancel_value ? (
          <Pressable
            onPress={() => dkd_run_action_value(`cancel_${dkd_order_id_value}`, () => dkd_cancel_urgent_courier_order(dkd_order_id_value), 'Sipariş iptal edildi.')}
            style={dkd_styles.dkd_danger_button}
          >
            <MaterialCommunityIcons name="close-octagon-outline" size={16} color="#FFD3D3" />
            <Text style={dkd_styles.dkd_danger_button_text}>Siparişi İptal Et</Text>
          </Pressable>
        ) : null}
        {dkd_status_key_value === 'dkd_fee_offer_waiting' ? (
          <Pressable
            onPress={() => dkd_run_action_value(`approve_fee_${dkd_order_id_value}`, () => dkd_approve_urgent_courier_fee(dkd_order_id_value), 'Taşıma ücreti onaylandı ve sohbet açıldı.')}
            style={dkd_styles.dkd_secondary_button}
          >
            <MaterialCommunityIcons name="credit-card-check-outline" size={16} color="#06111A" />
            <Text style={dkd_styles.dkd_secondary_button_text}>Taşıma Ücretini Onayla</Text>
          </Pressable>
        ) : null}
        {dkd_status_key_value === 'dkd_product_total_waiting' ? (
          <Pressable
            onPress={() => dkd_run_action_value(`approve_product_${dkd_order_id_value}`, () => dkd_approve_urgent_courier_product_total(dkd_order_id_value), 'Ürün toplamı onaylandı.')}
            style={dkd_styles.dkd_secondary_button}
          >
            <MaterialCommunityIcons name="basket-check-outline" size={16} color="#06111A" />
            <Text style={dkd_styles.dkd_secondary_button_text}>Ürün Toplamını Onayla</Text>
          </Pressable>
        ) : null}
        {dkd_invoice_url_value ? (
          <Pressable onPress={() => setDkdInvoicePreviewUrlValue(dkd_invoice_url_value)} style={dkd_styles.dkd_invoice_preview_button}>
            <Image source={{ uri: dkd_invoice_url_value }} style={dkd_styles.dkd_invoice_thumb} resizeMode="cover" />
            <Text style={dkd_styles.dkd_invoice_preview_text}>Fatura Görselini Aç</Text>
          </Pressable>
        ) : null}
        {dkd_render_messages_value(dkd_order_value)}
      </View>
    );
  };

  const dkd_render_courier_order_value = (dkd_order_value) => {
    const dkd_order_id_value = String(dkd_order_value?.dkd_order_id || '');
    const dkd_status_key_value = String(dkd_order_value?.dkd_status_key || '').toLowerCase();
    const dkd_item_values = Array.isArray(dkd_order_value?.dkd_item_values) ? dkd_order_value.dkd_item_values : [];
    const dkd_can_product_total_value = ['dkd_fee_paid_shopping', 'dkd_product_total_waiting', 'dkd_product_total_approved'].includes(dkd_status_key_value);
    const dkd_can_invoice_value = ['dkd_product_total_approved', 'dkd_invoice_uploaded'].includes(dkd_status_key_value);
    const dkd_invoice_url_value = String(dkd_order_value?.dkd_invoice_image_url || '').trim();
    const dkd_can_pickup_items_value = dkd_status_key_value === 'dkd_invoice_uploaded';
    const dkd_can_complete_delivery_value = dkd_status_key_value === 'dkd_on_the_way';
    return (
      <View key={dkd_order_id_value} style={[dkd_styles.dkd_order_card, dkd_styles.dkd_order_card_courier]}>
        <View style={dkd_styles.dkd_order_head}>
          <View style={dkd_styles.dkd_order_title_stack}>
            <Text style={dkd_styles.dkd_order_title}>{dkd_order_value?.dkd_customer_full_name || 'Acil Kurye Müşterisi'}</Text>
            <Text style={dkd_styles.dkd_order_meta}>{dkd_order_value?.dkd_customer_address_text || 'Adres bekleniyor'}</Text>
          </View>
          <View style={[dkd_styles.dkd_status_pill, dkd_status_tone_style(dkd_status_key_value)]}>
            <Text style={dkd_styles.dkd_status_text}>{dkd_status_label_value(dkd_status_key_value)}</Text>
          </View>
        </View>
        {String(dkd_order_value?.dkd_customer_phone_text || '').trim() ? (
          <Pressable onPress={() => dkd_open_phone_value(dkd_order_value.dkd_customer_phone_text)} style={dkd_styles.dkd_phone_chip}>
            <MaterialCommunityIcons name="phone-outline" size={15} color="#9CEBFF" />
            <Text style={dkd_styles.dkd_phone_text}>{dkd_order_value.dkd_customer_phone_text}</Text>
          </Pressable>
        ) : null}
        {dkd_render_items_value(dkd_order_value)}
        {dkd_status_key_value === 'dkd_open' ? (
          <View style={dkd_styles.dkd_inline_input_row}>
            <TextInput
              value={String(dkd_fee_draft_map_value?.[dkd_order_id_value] || '')}
              onChangeText={(dkd_next_value) => setDkdFeeDraftMapValue((dkd_previous_value) => ({ ...dkd_previous_value, [dkd_order_id_value]: dkd_next_value.replace(/[^0-9.]/g, '') }))}
              keyboardType="numeric"
              placeholder="Taşıma ücreti TL"
              placeholderTextColor="rgba(231,241,255,0.38)"
              style={dkd_styles.dkd_inline_input}
            />
            <Pressable
              onPress={() => {
                const dkd_fee_value = Number(dkd_fee_draft_map_value?.[dkd_order_id_value] || 0);
                if (dkd_fee_value <= 0) {
                  Alert.alert('Acil Kurye', 'Taşıma ücretini TL olarak gir.');
                  return;
                }
                dkd_run_action_value(`offer_fee_${dkd_order_id_value}`, () => dkd_offer_urgent_courier_fee(dkd_order_id_value, dkd_fee_value), 'Taşıma ücreti müşteriye gönderildi.');
              }}
              style={dkd_styles.dkd_inline_primary_button}
            >
              <Text style={dkd_styles.dkd_inline_primary_text}>Kabul Et</Text>
            </Pressable>
          </View>
        ) : null}
        {dkd_can_product_total_value ? (
          <View style={dkd_styles.dkd_store_total_box}>
            <View style={dkd_styles.dkd_store_total_head}>
              <MaterialCommunityIcons name="store-check-outline" size={16} color="#7BFFD9" />
              <Text style={dkd_styles.dkd_store_total_title}>Mağaza Bazlı Ürün Toplamları</Text>
            </View>
            {dkd_item_values.map((dkd_item_value, dkd_item_index_value) => {
              const dkd_item_id_value = String(dkd_item_value?.dkd_item_id || `item_${dkd_item_index_value}`);
              const dkd_key_value = dkd_item_total_key_value(dkd_order_id_value, dkd_item_id_value);
              return (
                <View key={dkd_key_value} style={dkd_styles.dkd_store_total_row}>
                  <View style={dkd_styles.dkd_store_total_copy}>
                    <Text style={dkd_styles.dkd_store_total_store}>{dkd_item_value?.dkd_store_name || 'Mağaza'}</Text>
                    <Text style={dkd_styles.dkd_store_total_products} numberOfLines={2}>{dkd_item_value?.dkd_product_text || 'Ürün listesi'}</Text>
                  </View>
                  <TextInput
                    value={dkd_read_item_total_draft_value(dkd_order_id_value, dkd_item_value)}
                    onChangeText={(dkd_next_value) => setDkdProductTotalDraftMapValue((dkd_previous_value) => ({
                      ...dkd_previous_value,
                      [dkd_key_value]: dkd_next_value.replace(/[^0-9.]/g, ''),
                    }))}
                    keyboardType="numeric"
                    placeholder="TL"
                    placeholderTextColor="rgba(231,241,255,0.38)"
                    style={dkd_styles.dkd_store_total_input}
                  />
                </View>
              );
            })}
            <Pressable
              onPress={() => {
                const dkd_item_total_values = dkd_build_item_totals_payload_value(dkd_order_value);
                const dkd_missing_total_value = !dkd_item_total_values.length || dkd_item_total_values.some((dkd_item_total_value) => Number(dkd_item_total_value?.dkd_product_total_tl || 0) <= 0);
                if (dkd_missing_total_value) {
                  Alert.alert('Acil Kurye', 'Seçilen her mağaza için ürün toplamını TL olarak gir.');
                  return;
                }
                dkd_run_action_value(`product_total_${dkd_order_id_value}`, () => dkd_set_urgent_courier_item_totals(dkd_order_id_value, dkd_item_total_values), 'Mağaza bazlı ürün toplamları müşteriye gönderildi.');
              }}
              style={dkd_styles.dkd_inline_primary_button}
            >
              <Text style={dkd_styles.dkd_inline_primary_text}>Toplamları Gönder</Text>
            </Pressable>
          </View>
        ) : null}
        {dkd_invoice_url_value ? (
          <Pressable onPress={() => setDkdInvoicePreviewUrlValue(dkd_invoice_url_value)} style={dkd_styles.dkd_invoice_preview_button}>
            <Image source={{ uri: dkd_invoice_url_value }} style={dkd_styles.dkd_invoice_thumb} resizeMode="cover" />
            <Text style={dkd_styles.dkd_invoice_preview_text}>Fatura Görselini Aç</Text>
          </Pressable>
        ) : null}
        {dkd_can_invoice_value ? (
          <Pressable onPress={() => dkd_pick_invoice_value(dkd_order_id_value)} style={dkd_styles.dkd_secondary_outline_button}>
            <MaterialCommunityIcons name={dkd_invoice_url_value ? 'image-edit-outline' : 'image-plus'} size={16} color="#9CEBFF" />
            <Text style={dkd_styles.dkd_secondary_outline_button_text}>{dkd_invoice_url_value ? 'Faturayı Düzenle' : 'Faturayı Yükle'}</Text>
          </Pressable>
        ) : null}
        {dkd_can_pickup_items_value ? (
          <Pressable
            onPress={() => dkd_run_action_value(`pickup_${dkd_order_id_value}`, () => dkd_pickup_urgent_courier_items(dkd_order_id_value), 'Ürünler teslim alındı ve müşteriye doğru yola çıkıldı.')}
            style={dkd_styles.dkd_secondary_button}
          >
            <MaterialCommunityIcons name="package-variant-closed-check" size={16} color="#06111A" />
            <Text style={dkd_styles.dkd_secondary_button_text}>Ürünleri Teslim Aldım • Yola Çık</Text>
          </Pressable>
        ) : null}
        {dkd_can_complete_delivery_value ? (
          <Pressable
            onPress={() => dkd_run_action_value(`complete_${dkd_order_id_value}`, () => dkd_complete_urgent_courier_delivery(dkd_order_id_value), 'Sipariş teslim edildi ve tamamlandı.')}
            style={dkd_styles.dkd_secondary_button}
          >
            <MaterialCommunityIcons name="check-decagram-outline" size={16} color="#06111A" />
            <Text style={dkd_styles.dkd_secondary_button_text}>Teslim Ettim • Siparişi Tamamla</Text>
          </Pressable>
        ) : null}
        {dkd_render_messages_value(dkd_order_value)}
      </View>
    );
  };

  const dkd_render_order_list_value = (dkd_order_values, dkd_empty_title_value, dkd_empty_text_value, dkd_renderer_value) => {
    if (dkd_loading_value) {
      return <View style={dkd_styles.dkd_loading_box}><ActivityIndicator color="#8CF2FF" /><Text style={dkd_styles.dkd_loading_text}>Acil Kurye verisi yükleniyor…</Text></View>;
    }
    if (!dkd_order_values.length) {
      return (
        <View style={dkd_styles.dkd_empty_box}>
          <MaterialCommunityIcons name="bike-fast" size={28} color="#8CF2FF" />
          <Text style={dkd_styles.dkd_empty_title}>{dkd_empty_title_value}</Text>
          <Text style={dkd_styles.dkd_empty_text}>{dkd_empty_text_value}</Text>
        </View>
      );
    }
    return <View style={dkd_styles.dkd_order_list}>{dkd_order_values.map((dkd_order_value) => dkd_renderer_value(dkd_order_value))}</View>;
  };

  if (!dkd_visible_value) return null;

  return (
    <View style={dkd_styles.dkd_shell}>
      <LinearGradient colors={['rgba(255,184,77,0.20)', 'rgba(255,77,151,0.14)', 'rgba(99,220,255,0.10)']} start={dkd_make_native_axis_point(0, 0)} end={dkd_make_native_axis_point(1, 1)} style={dkd_styles.dkd_hero_card}>
        <View style={dkd_styles.dkd_hero_top_row}>
          <View style={dkd_styles.dkd_hero_icon_shell}>
            <MaterialCommunityIcons name="flash-outline" size={24} color="#08111D" />
          </View>
          <View style={dkd_styles.dkd_hero_copy}>
            <Text style={dkd_styles.dkd_hero_kicker}>WEB + UYGULAMA SENKRON</Text>
            <Text style={dkd_styles.dkd_hero_title}>Acil Kurye</Text>
            <Text style={dkd_styles.dkd_hero_text}>Sipariş mobilde açılır, web markette görünür; webden açılan sipariş uygulamada aynı anda takip edilir.</Text>
          </View>
        </View>
        <View style={dkd_styles.dkd_metric_row}>
          <DkdMetricTile dkd_icon_name_value="wallet-outline" dkd_label_value="Cüzdan" dkd_value={dkd_format_money_value(dkd_wallet_value)} dkd_tone_value="gold" />
          <DkdMetricTile dkd_icon_name_value="receipt-text-outline" dkd_label_value="Siparişlerim" dkd_value={String(dkd_customer_active_count_value)} />
          <DkdMetricTile dkd_icon_name_value="bike-fast" dkd_label_value="Açık İş" dkd_value={String(dkd_snapshot_value.dkd_courier_orders.length)} dkd_tone_value="green" />
        </View>
      </LinearGradient>

      <View style={dkd_styles.dkd_tab_row}>
        <DkdUrgentTab dkd_tab_key_value="create" dkd_active_tab_value={dkd_active_tab_value} dkd_label_value="Oluştur" dkd_icon_name_value="plus-circle-outline" dkd_on_press_value={setDkdActiveTabValue} />
        <DkdUrgentTab dkd_tab_key_value="customer" dkd_active_tab_value={dkd_active_tab_value} dkd_label_value="Siparişlerim" dkd_icon_name_value="receipt-text-outline" dkd_on_press_value={setDkdActiveTabValue} />
        <DkdUrgentTab dkd_tab_key_value="courier" dkd_active_tab_value={dkd_active_tab_value} dkd_label_value="Kurye İşleri" dkd_icon_name_value="bike-fast" dkd_on_press_value={setDkdActiveTabValue} />
      </View>

      {dkd_active_tab_value === 'create' ? dkd_render_create_panel_value() : null}
      {dkd_active_tab_value === 'customer' ? dkd_render_order_list_value(
        dkd_snapshot_value.dkd_customer_orders,
        'Henüz Acil Kurye siparişin yok',
        'İlk siparişi oluşturunca hem uygulamada hem web markette burada görünecek.',
        dkd_render_customer_order_value,
      ) : null}
      {dkd_active_tab_value === 'courier' ? (
        dkd_courier_approved_value || dkd_snapshot_value.dkd_has_courier_license ? dkd_render_order_list_value(
          dkd_snapshot_value.dkd_courier_orders,
          'Şu an açık Acil Kurye işi yok',
          'Web veya uygulama üzerinden açılan yeni acil kurye işleri burada belirecek.',
          dkd_render_courier_order_value,
        ) : (
          <View style={dkd_styles.dkd_empty_box}>
            <MaterialCommunityIcons name="shield-lock-outline" size={28} color="#FFE59A" />
            <Text style={dkd_styles.dkd_empty_title}>Kurye lisansı gerekli</Text>
            <Text style={dkd_styles.dkd_empty_text}>Acil Kurye işlerini almak için Kurye-Kargo merkezindeki başvurunun onaylanması gerekiyor.</Text>
          </View>
        )
      ) : null}

      <Modal visible={Boolean(dkd_invoice_preview_url_value)} transparent animationType="fade" onRequestClose={() => setDkdInvoicePreviewUrlValue('')}>
        <View style={dkd_styles.dkd_invoice_modal_overlay}>
          <View style={dkd_styles.dkd_invoice_modal_card}>
            <View style={dkd_styles.dkd_invoice_modal_head}>
              <Text style={dkd_styles.dkd_invoice_modal_title}>Fatura Görseli</Text>
              <Pressable onPress={() => setDkdInvoicePreviewUrlValue('')} style={dkd_styles.dkd_invoice_modal_close}>
                <MaterialCommunityIcons name="close" size={20} color="#FFFFFF" />
              </Pressable>
            </View>
            {dkd_invoice_preview_url_value ? (
              <Image source={{ uri: dkd_invoice_preview_url_value }} style={dkd_styles.dkd_invoice_modal_image} resizeMode="contain" />
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const dkd_styles = StyleSheet.create({
  dkd_shell: {
    gap: 14,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 20,
  },
  dkd_hero_card: {
    borderRadius: 28,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  dkd_hero_top_row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  dkd_hero_icon_shell: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD65F',
    shadowColor: '#FFB13D',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  dkd_hero_copy: {
    flex: 1,
    gap: 4,
  },
  dkd_hero_kicker: {
    color: '#FFE59A',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.9,
  },
  dkd_hero_title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  dkd_hero_text: {
    color: 'rgba(231,241,255,0.78)',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  dkd_metric_row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  dkd_metric_tile: {
    flex: 1,
    minHeight: 78,
    borderRadius: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(5,12,22,0.44)',
    gap: 3,
  },
  dkd_metric_label: {
    color: 'rgba(231,241,255,0.62)',
    fontSize: 10,
    fontWeight: '800',
  },
  dkd_metric_value: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  dkd_tab_row: {
    flexDirection: 'row',
    gap: 8,
  },
  dkd_tab_chip: {
    flex: 1,
    minHeight: 44,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dkd_tab_chip_active: {
    borderColor: 'rgba(140,242,255,0.30)',
  },
  dkd_tab_text: {
    color: 'rgba(231,241,255,0.72)',
    fontSize: 11,
    fontWeight: '900',
  },
  dkd_tab_text_active: {
    color: '#FFFFFF',
  },
  dkd_panel_card: {
    borderRadius: 28,
    padding: 16,
    backgroundColor: 'rgba(8,18,32,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    gap: 12,
  },
  dkd_panel_head_row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  dkd_panel_icon_shell: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8CF2FF',
  },
  dkd_panel_head_copy: {
    flex: 1,
  },
  dkd_panel_title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  dkd_panel_subtitle: {
    color: 'rgba(231,241,255,0.70)',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  dkd_form_grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dkd_field_shell: {
    flex: 1,
    minWidth: 150,
    gap: 6,
  },
  dkd_field_label: {
    color: 'rgba(231,241,255,0.74)',
    fontSize: 11,
    fontWeight: '900',
  },
  dkd_field_input: {
    minHeight: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.055)',
    paddingHorizontal: 12,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  dkd_field_input_multiline: {
    minHeight: 86,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  dkd_store_group_card: {
    borderRadius: 22,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 10,
  },
  dkd_store_group_head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dkd_store_group_title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  dkd_store_grid: {
    gap: 9,
  },
  dkd_store_tile: {
    borderRadius: 18,
    padding: 10,
    backgroundColor: 'rgba(8,18,32,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 8,
  },
  dkd_store_tile_active: {
    borderColor: 'rgba(124,255,217,0.28)',
    backgroundColor: 'rgba(27,80,62,0.36)',
  },
  dkd_store_check_row: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dkd_store_name: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  dkd_store_products_input: {
    minHeight: 68,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 11,
    paddingTop: 10,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    textAlignVertical: 'top',
  },
  dkd_store_total_box: {
    borderRadius: 20,
    padding: 10,
    backgroundColor: 'rgba(124,255,217,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(124,255,217,0.18)',
    gap: 9,
  },
  dkd_store_total_head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  dkd_store_total_title: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  dkd_store_total_row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 16,
    padding: 9,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dkd_store_total_copy: {
    flex: 1,
    gap: 2,
  },
  dkd_store_total_store: {
    color: '#8CF2FF',
    fontSize: 12,
    fontWeight: '900',
  },
  dkd_store_total_products: {
    color: 'rgba(231,241,255,0.68)',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
  },
  dkd_store_total_input: {
    width: 92,
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.11)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  dkd_primary_button: {
    minHeight: 52,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  dkd_button_disabled: {
    opacity: 0.64,
  },
  dkd_primary_button_text: {
    color: '#06111A',
    fontSize: 14,
    fontWeight: '900',
  },
  dkd_order_list: {
    gap: 12,
  },
  dkd_order_card: {
    borderRadius: 26,
    padding: 14,
    backgroundColor: 'rgba(8,18,32,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    gap: 12,
  },
  dkd_order_card_courier: {
    borderColor: 'rgba(124,255,217,0.16)',
  },
  dkd_order_head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  dkd_order_title_stack: {
    flex: 1,
    gap: 3,
  },
  dkd_order_title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  dkd_order_meta: {
    color: 'rgba(231,241,255,0.62)',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
  },
  dkd_status_pill: {
    borderRadius: 999,
    minHeight: 28,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  dkd_status_pill_live: {
    backgroundColor: 'rgba(91,222,255,0.14)',
    borderColor: 'rgba(91,222,255,0.24)',
  },
  dkd_status_pill_waiting: {
    backgroundColor: 'rgba(255,213,101,0.16)',
    borderColor: 'rgba(255,213,101,0.28)',
  },
  dkd_status_pill_done: {
    backgroundColor: 'rgba(104,255,211,0.16)',
    borderColor: 'rgba(104,255,211,0.28)',
  },
  dkd_status_pill_cancelled: {
    backgroundColor: 'rgba(255,120,136,0.14)',
    borderColor: 'rgba(255,120,136,0.26)',
  },
  dkd_status_text: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  dkd_item_list: {
    gap: 8,
  },
  dkd_item_chip: {
    borderRadius: 17,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dkd_item_title: {
    color: '#8CF2FF',
    fontSize: 12,
    fontWeight: '900',
  },
  dkd_item_text: {
    marginTop: 3,
    color: 'rgba(231,241,255,0.82)',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  dkd_item_total_text: {
    marginTop: 6,
    color: '#7BFFD9',
    fontSize: 11,
    fontWeight: '900',
  },
  dkd_empty_mini: {
    color: 'rgba(231,241,255,0.62)',
    fontSize: 12,
    fontWeight: '700',
  },
  dkd_money_grid: {
    flexDirection: 'row',
    gap: 10,
  },
  dkd_danger_button: {
    minHeight: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,120,136,0.28)',
    backgroundColor: 'rgba(255,80,104,0.10)',
  },
  dkd_danger_button_text: {
    color: '#FFD3D3',
    fontSize: 12,
    fontWeight: '900',
  },
  dkd_secondary_button: {
    minHeight: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#8CF2FF',
  },
  dkd_secondary_button_text: {
    color: '#06111A',
    fontSize: 12,
    fontWeight: '900',
  },
  dkd_secondary_outline_button: {
    minHeight: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(140,242,255,0.24)',
    backgroundColor: 'rgba(140,242,255,0.08)',
  },
  dkd_secondary_outline_button_text: {
    color: '#BFF7FF',
    fontSize: 12,
    fontWeight: '900',
  },
  dkd_invoice_preview_button: {
    borderRadius: 18,
    minHeight: 58,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 12,
  },
  dkd_invoice_thumb: {
    width: 62,
    height: 58,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  dkd_invoice_preview_text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  dkd_chat_box: {
    borderRadius: 20,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 8,
  },
  dkd_chat_head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dkd_chat_title: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  dkd_message_bubble: {
    borderRadius: 14,
    padding: 9,
    backgroundColor: 'rgba(7,18,32,0.72)',
  },
  dkd_message_sender: {
    color: '#8CF2FF',
    fontSize: 10,
    fontWeight: '900',
  },
  dkd_message_text: {
    marginTop: 2,
    color: 'rgba(231,241,255,0.82)',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  dkd_chat_locked_text: {
    color: 'rgba(231,241,255,0.54)',
    fontSize: 11,
    fontWeight: '800',
  },
  dkd_inline_input_row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dkd_inline_input: {
    flex: 1,
    minHeight: 42,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.055)',
    paddingHorizontal: 12,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  dkd_send_button: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8CF2FF',
  },
  dkd_inline_primary_button: {
    minHeight: 42,
    borderRadius: 15,
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7BFFD9',
  },
  dkd_inline_primary_text: {
    color: '#06111A',
    fontSize: 12,
    fontWeight: '900',
  },
  dkd_phone_chip: {
    alignSelf: 'flex-start',
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(140,242,255,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(140,242,255,0.18)',
  },
  dkd_phone_text: {
    color: '#DDFBFF',
    fontSize: 11,
    fontWeight: '900',
  },
  dkd_loading_box: {
    minHeight: 148,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dkd_loading_text: {
    color: 'rgba(231,241,255,0.72)',
    fontSize: 12,
    fontWeight: '800',
  },
  dkd_invoice_modal_overlay: {
    flex: 1,
    padding: 18,
    backgroundColor: 'rgba(0,0,0,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dkd_invoice_modal_card: {
    width: '100%',
    maxHeight: '86%',
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#07111F',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  dkd_invoice_modal_head: {
    minHeight: 52,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  dkd_invoice_modal_title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  dkd_invoice_modal_close: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  dkd_invoice_modal_image: {
    width: '100%',
    height: 520,
    maxHeight: '84%',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  dkd_empty_box: {
    minHeight: 168,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dkd_empty_title: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  dkd_empty_text: {
    color: 'rgba(231,241,255,0.66)',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    textAlign: 'center',
  },
});
