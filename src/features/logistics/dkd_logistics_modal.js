import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SafeScreen from '../../components/layout/SafeScreen';
import { cityLootTheme } from '../../theme/cityLootTheme';
import {
  dkd_add_logistics_message_value,
  dkd_create_logistics_job_value,
  dkd_default_logistics_application_value,
  dkd_default_logistics_job_value,
  dkd_fetch_logistics_jobs_value,
  dkd_fetch_my_logistics_application_value,
  dkd_is_logistics_approved_value,
  dkd_logistics_application_ready_value,
  dkd_logistics_job_ready_value,
  dkd_logistics_status_label_value,
  dkd_submit_logistics_application_value,
  dkd_submit_logistics_offer_value,
} from '../../services/dkd_logistics_service';

const dkd_colors_value = cityLootTheme.colors;

const dkd_logistics_country_options_value = ['Türkiye', 'BAE'];
const dkd_logistics_city_options_value = {
  Türkiye: ['Ankara', 'İstanbul', 'İzmir', 'Bursa', 'Antalya', 'Konya'],
  BAE: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman'],
};
const dkd_logistics_district_options_value = {
  Ankara: ['Çankaya', 'Keçiören', 'Yenimahalle', 'Etimesgut', 'Sincan', 'Mamak', 'Altındağ', 'Gölbaşı'],
  İstanbul: ['Kadıköy', 'Üsküdar', 'Beşiktaş', 'Şişli', 'Bakırköy', 'Ataşehir', 'Ümraniye', 'Beylikdüzü'],
  İzmir: ['Konak', 'Karşıyaka', 'Bornova', 'Buca', 'Bayraklı', 'Gaziemir'],
  Bursa: ['Osmangazi', 'Nilüfer', 'Yıldırım', 'Mudanya', 'Gemlik'],
  Antalya: ['Muratpaşa', 'Kepez', 'Konyaaltı', 'Aksu', 'Döşemealtı'],
  Konya: ['Selçuklu', 'Meram', 'Karatay'],
  Dubai: ['Downtown', 'Business Bay', 'Deira', 'Jumeirah', 'Marina', 'Al Barsha'],
  'Abu Dhabi': ['Corniche', 'Khalifa City', 'Al Reem', 'Mussafah', 'Yas Island'],
  Sharjah: ['Al Majaz', 'Al Nahda', 'Muwaileh', 'Industrial Area'],
  Ajman: ['Al Nuaimiya', 'Al Rashidiya', 'Al Jurf'],
};
const dkd_logistics_vehicle_type_options_value = [
  { dkd_value: 'Panelvan', dkd_label: 'Panelvan' },
  { dkd_value: 'Kamyonet', dkd_label: 'Kamyonet' },
  { dkd_value: 'Kamyon', dkd_label: 'Kamyon' },
  { dkd_value: 'Tır', dkd_label: 'Tır' },
  { dkd_value: 'Minivan', dkd_label: 'Minivan' },
  { dkd_value: 'Pickup', dkd_label: 'Pickup' },
];
const dkd_logistics_capacity_options_value = [
  { dkd_value: '250', dkd_label: '250 kg' },
  { dkd_value: '500', dkd_label: '500 kg' },
  { dkd_value: '1000', dkd_label: '1 ton' },
  { dkd_value: '3000', dkd_label: '3 ton' },
  { dkd_value: '5000', dkd_label: '5 ton' },
  { dkd_value: '10000', dkd_label: '10 ton' },
];
const dkd_logistics_radius_options_value = [
  { dkd_value: '5', dkd_label: '5 km' },
  { dkd_value: '10', dkd_label: '10 km' },
  { dkd_value: '25', dkd_label: '25 km' },
  { dkd_value: '50', dkd_label: '50 km' },
  { dkd_value: '100', dkd_label: '100 km' },
  { dkd_value: '500', dkd_label: 'Şehirler arası' },
];
const dkd_logistics_volume_options_value = [
  { dkd_value: '2', dkd_label: '2 m³' },
  { dkd_value: '5', dkd_label: '5 m³' },
  { dkd_value: '10', dkd_label: '10 m³' },
  { dkd_value: '20', dkd_label: '20 m³' },
  { dkd_value: '40', dkd_label: '40 m³' },
];
const dkd_logistics_fleet_options_value = [
  { dkd_value: '1', dkd_label: '1 araç' },
  { dkd_value: '2', dkd_label: '2 araç' },
  { dkd_value: '3', dkd_label: '3 araç' },
  { dkd_value: '5', dkd_label: '5+ araç' },
  { dkd_value: '10', dkd_label: '10+ araç' },
];
const dkd_logistics_service_options_value = ['Evden eve', 'Parça yük', 'Ofis taşıma', 'Depo çıkışı', 'Beyaz eşya', 'Şehir içi', 'Şehirler arası', 'Acil nakliye'];
const dkd_logistics_job_cargo_type_options_value = ['Ev eşyası', 'Parça yük', 'Beyaz eşya', 'Ofis eşyası', 'Depo ürünü', 'Paletli yük', 'Koli / paket', 'Acil taşıma'];
const dkd_logistics_job_weight_options_value = [
  { dkd_value: '25', dkd_label: '0-25 kg' },
  { dkd_value: '50', dkd_label: '25-50 kg' },
  { dkd_value: '100', dkd_label: '50-100 kg' },
  { dkd_value: '250', dkd_label: '100-250 kg' },
  { dkd_value: '500', dkd_label: '250-500 kg' },
  { dkd_value: '1000', dkd_label: '1 ton' },
];
const dkd_logistics_job_helper_options_value = [
  { dkd_value: '0', dkd_label: 'Eleman yok' },
  { dkd_value: '1', dkd_label: '1 eleman' },
  { dkd_value: '2', dkd_label: '2 eleman' },
  { dkd_value: '3', dkd_label: '3+ eleman' },
];
const dkd_logistics_job_vehicle_need_options_value = ['Panelvan', 'Kamyonet', 'Kamyon', 'Tır', 'Minivan', 'Pickup', 'Nakliyeci önersin'];
const dkd_logistics_job_budget_min_options_value = [
  { dkd_value: '500', dkd_label: '500 TL' },
  { dkd_value: '750', dkd_label: '750 TL' },
  { dkd_value: '1000', dkd_label: '1.000 TL' },
  { dkd_value: '1500', dkd_label: '1.500 TL' },
  { dkd_value: '2500', dkd_label: '2.500 TL' },
];
const dkd_logistics_job_budget_max_options_value = [
  { dkd_value: '1000', dkd_label: '1.000 TL' },
  { dkd_value: '1500', dkd_label: '1.500 TL' },
  { dkd_value: '2500', dkd_label: '2.500 TL' },
  { dkd_value: '4000', dkd_label: '4.000 TL' },
  { dkd_value: '7500', dkd_label: '7.500 TL+' },
];
const dkd_logistics_job_schedule_options_value = ['Bugün / uygun saat', 'Bugün 18:00', 'Yarın sabah', 'Yarın öğlen', 'Hafta sonu', 'Planlama için arayın'];

function dkd_options_for_value(dkd_source_value, dkd_key_value, dkd_fallback_value = []) {
  const dkd_options_value = dkd_source_value?.[dkd_key_value];
  return Array.isArray(dkd_options_value) && dkd_options_value.length ? dkd_options_value : dkd_fallback_value;
}

function dkd_option_value_text(dkd_option_value) {
  return typeof dkd_option_value === 'string' ? dkd_option_value : String(dkd_option_value?.dkd_value || '');
}

function dkd_option_label_text(dkd_option_value) {
  return typeof dkd_option_value === 'string' ? dkd_option_value : String(dkd_option_value?.dkd_label || dkd_option_value?.dkd_value || '');
}


function dkd_price_text_value(dkd_amount_value) {
  const dkd_number_value = Number(dkd_amount_value || 0);
  if (!Number.isFinite(dkd_number_value) || dkd_number_value <= 0) return 'Teklif bekleniyor';
  return `${Math.round(dkd_number_value).toLocaleString('tr-TR')} TL`;
}

async function dkd_pick_logistics_document_image_value() {
  const dkd_permission_value = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (dkd_permission_value?.status !== 'granted') {
    throw new Error('Belge fotoğrafı seçebilmek için galeri izni gerekli.');
  }
  const dkd_picker_result_value = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.84,
  });
  if (dkd_picker_result_value?.canceled) return '';
  return dkd_picker_result_value?.assets?.[0]?.uri || '';
}

function DkdField({ dkd_label_value, dkd_value, dkd_on_change_text_value, dkd_placeholder_value, dkd_multiline_value = false, dkd_keyboard_type_value = 'default', dkd_required_value = false }) {
  return (
    <View style={dkd_styles.dkdFieldWrap}>
      <Text style={dkd_styles.dkdFieldLabel}>{dkd_label_value}{dkd_required_value ? <Text style={dkd_styles.dkdRequiredStar}> *</Text> : null}</Text>
      <TextInput
        value={dkd_value}
        onChangeText={dkd_on_change_text_value}
        placeholder={dkd_placeholder_value}
        placeholderTextColor="rgba(238,247,255,0.36)"
        keyboardType={dkd_keyboard_type_value}
        multiline={dkd_multiline_value}
        style={[dkd_styles.dkdFieldInput, dkd_multiline_value && dkd_styles.dkdFieldInputMultiline]}
      />
    </View>
  );
}


function DkdChoiceChips({ dkd_label_value, dkd_value, dkd_options_value, dkd_on_change_value, dkd_required_value = false, dkd_icon_value = 'format-list-bulleted-square' }) {
  return (
    <View style={dkd_styles.dkdChoiceWrap}>
      <View style={dkd_styles.dkdChoiceHeaderRow}>
        <MaterialCommunityIcons name={dkd_icon_value} size={17} color="#92E9FF" />
        <Text style={dkd_styles.dkdChoiceLabel}>{dkd_label_value}{dkd_required_value ? <Text style={dkd_styles.dkdRequiredStar}> *</Text> : null}</Text>
      </View>
      <View style={dkd_styles.dkdChoiceGrid}>
        {(dkd_options_value || []).map((dkd_option_value) => {
          const dkd_option_text_value = dkd_option_value_text(dkd_option_value);
          const dkd_option_label_value = dkd_option_label_text(dkd_option_value);
          const dkd_selected_value = String(dkd_value || '').toLowerCase() === String(dkd_option_text_value || '').toLowerCase();
          return (
            <Pressable
              key={`${dkd_label_value}_${dkd_option_text_value}`}
              onPress={() => dkd_on_change_value?.(dkd_option_text_value)}
              style={({ pressed }) => [dkd_styles.dkdChoiceChip, dkd_selected_value && dkd_styles.dkdChoiceChipActive, pressed && dkd_styles.dkdPressed]}
            >
              <Text style={[dkd_styles.dkdChoiceChipText, dkd_selected_value && dkd_styles.dkdChoiceChipTextActive]}>{dkd_option_label_value}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function DkdMultiChoiceChips({ dkd_label_value, dkd_value, dkd_options_value, dkd_on_change_value, dkd_icon_value = 'checkbox-multiple-marked-circle-outline' }) {
  const dkd_selected_values_value = String(dkd_value || '')
    .split(',')
    .map((dkd_part_value) => dkd_part_value.trim())
    .filter(Boolean);

  function dkd_toggle_value(dkd_next_value) {
    const dkd_exists_value = dkd_selected_values_value.some((dkd_selected_value) => dkd_selected_value.toLowerCase() === String(dkd_next_value).toLowerCase());
    const dkd_next_values_value = dkd_exists_value
      ? dkd_selected_values_value.filter((dkd_selected_value) => dkd_selected_value.toLowerCase() !== String(dkd_next_value).toLowerCase())
      : [...dkd_selected_values_value, dkd_next_value];
    dkd_on_change_value?.(dkd_next_values_value.join(', '));
  }

  return (
    <View style={dkd_styles.dkdChoiceWrap}>
      <View style={dkd_styles.dkdChoiceHeaderRow}>
        <MaterialCommunityIcons name={dkd_icon_value} size={17} color="#6AF4B6" />
        <Text style={dkd_styles.dkdChoiceLabel}>{dkd_label_value}</Text>
      </View>
      <View style={dkd_styles.dkdChoiceGrid}>
        {(dkd_options_value || []).map((dkd_option_value) => {
          const dkd_selected_value = dkd_selected_values_value.some((dkd_selected_item_value) => dkd_selected_item_value.toLowerCase() === String(dkd_option_value).toLowerCase());
          return (
            <Pressable
              key={`${dkd_label_value}_${dkd_option_value}`}
              onPress={() => dkd_toggle_value(dkd_option_value)}
              style={({ pressed }) => [dkd_styles.dkdChoiceChip, dkd_selected_value && dkd_styles.dkdChoiceChipActiveGreen, pressed && dkd_styles.dkdPressed]}
            >
              <MaterialCommunityIcons name={dkd_selected_value ? 'check-circle' : 'plus-circle-outline'} size={14} color={dkd_selected_value ? '#07111F' : '#DFF8FF'} />
              <Text style={[dkd_styles.dkdChoiceChipText, dkd_selected_value && dkd_styles.dkdChoiceChipTextActive]}>{dkd_option_value}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function DkdLogisticsActionCard({ dkd_label_value, dkd_sub_value, dkd_icon_value, dkd_tone_value, dkd_active_value, dkd_locked_value, dkd_on_press_value }) {
  const dkd_tone_colors_value = dkd_tone_value === 'gold'
    ? ['rgba(255,216,131,0.30)', 'rgba(255,153,95,0.10)']
    : dkd_tone_value === 'green'
      ? ['rgba(106,244,182,0.26)', 'rgba(88,232,255,0.08)']
      : ['rgba(88,232,255,0.28)', 'rgba(181,140,255,0.10)'];
  return (
    <Pressable onPress={dkd_on_press_value} style={({ pressed }) => [dkd_styles.dkdActionCard, dkd_active_value && dkd_styles.dkdActionCardActive, pressed && dkd_styles.dkdPressed]}>
      <LinearGradient colors={dkd_tone_colors_value} style={StyleSheet.absoluteFill} />
      <View style={dkd_styles.dkdActionIconWrap}>
        <MaterialCommunityIcons name={dkd_locked_value ? 'lock-alert-outline' : dkd_icon_value} size={24} color={dkd_locked_value ? '#FFD883' : '#FFFFFF'} />
      </View>
      <Text style={dkd_styles.dkdActionTitle}>{dkd_label_value}</Text>
      <Text style={dkd_styles.dkdActionSub}>{dkd_sub_value}</Text>
    </Pressable>
  );
}

function DkdDocumentTile({ dkd_label_value, dkd_value, dkd_optional_value = false, dkd_icon_value = 'file-image-plus-outline', dkd_on_pick_value }) {
  const dkd_has_value = !!String(dkd_value || '').trim();
  return (
    <Pressable onPress={dkd_on_pick_value} style={({ pressed }) => [dkd_styles.dkdDocumentTile, dkd_has_value && dkd_styles.dkdDocumentTileReady, pressed && dkd_styles.dkdPressed]}>
      <LinearGradient colors={dkd_has_value ? ['rgba(106,244,182,0.22)', 'rgba(88,232,255,0.10)'] : ['rgba(88,232,255,0.14)', 'rgba(181,140,255,0.10)']} style={StyleSheet.absoluteFill} />
      {dkd_has_value ? <Image source={{ uri: String(dkd_value) }} style={dkd_styles.dkdDocumentImage} resizeMode="cover" /> : null}
      <View style={dkd_styles.dkdDocumentOverlay}>
        <View style={dkd_styles.dkdDocumentIconWrap}>
          <MaterialCommunityIcons name={dkd_has_value ? 'check-decagram' : dkd_icon_value} size={20} color={dkd_has_value ? '#6AF4B6' : '#A4EFFF'} />
        </View>
        <Text style={dkd_styles.dkdDocumentTitle}>{dkd_label_value}</Text>
        <Text style={dkd_styles.dkdDocumentSub}>{dkd_has_value ? 'Belge seçildi' : dkd_optional_value ? 'İsteğe bağlı' : 'Zorunlu belge'}</Text>
      </View>
    </Pressable>
  );
}

function DkdSmallStat({ dkd_icon_value, dkd_label_value, dkd_value, dkd_accent_value }) {
  return (
    <View style={dkd_styles.dkdSmallStat}>
      <MaterialCommunityIcons name={dkd_icon_value} size={21} color={dkd_accent_value || '#92E9FF'} />
      <Text style={dkd_styles.dkdSmallStatLabel}>{dkd_label_value}</Text>
      <Text style={dkd_styles.dkdSmallStatValue}>{dkd_value}</Text>
    </View>
  );
}

export function DkdApplicationForm({ dkd_profile_value, dkd_application_value, dkd_on_refresh_value }) {
  const [dkd_form_value, dkd_set_form_value] = useState(() => dkd_default_logistics_application_value(dkd_profile_value));
  const [dkd_saving_value, dkd_set_saving_value] = useState(false);
  const dkd_ready_value = dkd_logistics_application_ready_value(dkd_form_value);
  const dkd_status_value = String(dkd_application_value?.dkd_status || dkd_application_value?.status || dkd_profile_value?.dkd_logistics_status || 'none');
  const dkd_selected_country_value = dkd_form_value.dkd_country_value || 'Türkiye';
  const dkd_city_options_value = useMemo(() => dkd_options_for_value(dkd_logistics_city_options_value, dkd_selected_country_value, dkd_logistics_city_options_value['Türkiye']), [dkd_selected_country_value]);
  const dkd_district_options_value = useMemo(() => dkd_options_for_value(dkd_logistics_district_options_value, dkd_form_value.dkd_city_value, ['Merkez', 'Sanayi Bölgesi', 'Organize Bölge']), [dkd_form_value.dkd_city_value]);

  function dkd_update_form_value(dkd_key_value, dkd_next_value) {
    dkd_set_form_value((dkd_previous_value) => ({ ...dkd_previous_value, [dkd_key_value]: dkd_next_value }));
  }

  function dkd_select_country_value(dkd_next_country_value) {
    const dkd_next_city_options_value = dkd_options_for_value(dkd_logistics_city_options_value, dkd_next_country_value, dkd_logistics_city_options_value['Türkiye']);
    const dkd_next_city_value = dkd_next_city_options_value[0] || 'Ankara';
    const dkd_next_district_options_value = dkd_options_for_value(dkd_logistics_district_options_value, dkd_next_city_value, ['Merkez']);
    dkd_set_form_value((dkd_previous_value) => ({
      ...dkd_previous_value,
      dkd_country_value: dkd_next_country_value,
      dkd_city_value: dkd_next_city_value,
      dkd_district_value: dkd_next_district_options_value[0] || '',
    }));
  }

  function dkd_select_city_value(dkd_next_city_value) {
    const dkd_next_district_options_value = dkd_options_for_value(dkd_logistics_district_options_value, dkd_next_city_value, ['Merkez']);
    dkd_set_form_value((dkd_previous_value) => ({
      ...dkd_previous_value,
      dkd_city_value: dkd_next_city_value,
      dkd_district_value: dkd_next_district_options_value[0] || '',
    }));
  }

  async function dkd_pick_document_value(dkd_key_value) {
    try {
      const dkd_uri_value = await dkd_pick_logistics_document_image_value();
      if (!dkd_uri_value) return;
      dkd_update_form_value(dkd_key_value, dkd_uri_value);
    } catch (dkd_error_value) {
      Alert.alert('Nakliye Belge Yükleme', dkd_error_value?.message || 'Belge fotoğrafı seçilemedi.');
    }
  }

  async function dkd_submit_value() {
    if (!dkd_ready_value) {
      Alert.alert('Nakliye Başvurusu', 'Ad, soyad, telefon, şehir, ilçe, araç tipi, plaka, kapasite, çalışma yarıçapı, kimlik ön yüz ve araç ruhsatı zorunlu.');
      return;
    }
    try {
      dkd_set_saving_value(true);
      const dkd_result_value = await dkd_submit_logistics_application_value({
        dkd_user_id_value: dkd_profile_value?.user_id || dkd_profile_value?.id,
        dkd_form_value,
      });
      if (dkd_result_value?.error) throw dkd_result_value.error;
      Alert.alert('Başvuru Alındı', 'Nakliye başvurun admin Başvurular paneline düştü. Belgeler oradan incelenip onaylanabilir.');
      await dkd_on_refresh_value?.();
    } catch (dkd_error_value) {
      Alert.alert('Nakliye Başvurusu', dkd_error_value?.message || String(dkd_error_value));
    } finally {
      dkd_set_saving_value(false);
    }
  }

  return (
    <View style={dkd_styles.dkdPanelCard}>
      <LinearGradient colors={["rgba(16,39,73,0.98)", "rgba(16,18,41,0.98)", "rgba(7,14,25,0.98)"]} style={StyleSheet.absoluteFill} />
      <View style={dkd_styles.dkdApplicationHeroGlow} />
      <View style={dkd_styles.dkdPanelHeaderRow}>
        <View style={dkd_styles.dkdPanelTitleWrap}>
          <Text style={dkd_styles.dkdKicker}>NAKLİYECİ LİSANS BAŞVURUSU</Text>
          <Text style={dkd_styles.dkdPanelTitle}>Kurye formu tarzında listeli başvuru</Text>
          <Text style={dkd_styles.dkdPanelSub}>Ülke, şehir, bölge, araç tipi, kapasite ve hizmet türlerini listeden seç. Kimlik/ruhsat belgelerini ekleyip admin onayına gönder.</Text>
        </View>
        <View style={dkd_styles.dkdStatusPill}>
          <MaterialCommunityIcons name="clock-check-outline" size={15} color="#FFD883" />
          <Text style={dkd_styles.dkdStatusText}>{dkd_logistics_status_label_value(dkd_status_value)}</Text>
        </View>
      </View>

      <View style={dkd_styles.dkdApplicationStepRow}>
        <View style={dkd_styles.dkdApplicationStep}><MaterialCommunityIcons name="account-tie" size={18} color="#92E9FF" /><Text style={dkd_styles.dkdApplicationStepText}>Kimlik</Text></View>
        <View style={dkd_styles.dkdApplicationStep}><MaterialCommunityIcons name="truck-check-outline" size={18} color="#6AF4B6" /><Text style={dkd_styles.dkdApplicationStepText}>Araç</Text></View>
        <View style={dkd_styles.dkdApplicationStep}><MaterialCommunityIcons name="file-document-check-outline" size={18} color="#FFD883" /><Text style={dkd_styles.dkdApplicationStepText}>Belge</Text></View>
      </View>

      <View style={dkd_styles.dkdStatGrid}>
        <DkdSmallStat dkd_icon_value="truck-cargo-container" dkd_label_value="Araç" dkd_value="Plaka + kapasite" dkd_accent_value="#92E9FF" />
        <DkdSmallStat dkd_icon_value="map-marker-distance" dkd_label_value="Bölge" dkd_value="Şehir + yarıçap" dkd_accent_value="#6AF4B6" />
        <DkdSmallStat dkd_icon_value="shield-check-outline" dkd_label_value="Kontrol" dkd_value="Admin onayı" dkd_accent_value="#FFD883" />
      </View>

      <View style={dkd_styles.dkdFormGrid}>
        <DkdField dkd_label_value="Ad" dkd_required_value dkd_value={dkd_form_value.dkd_first_name_value} dkd_on_change_text_value={(dkd_text_value) => dkd_update_form_value('dkd_first_name_value', dkd_text_value)} dkd_placeholder_value="Ad" />
        <DkdField dkd_label_value="Soyad" dkd_required_value dkd_value={dkd_form_value.dkd_last_name_value} dkd_on_change_text_value={(dkd_text_value) => dkd_update_form_value('dkd_last_name_value', dkd_text_value)} dkd_placeholder_value="Soyad" />
        <DkdField dkd_label_value="Firma / Ünvan" dkd_value={dkd_form_value.dkd_company_name_value} dkd_on_change_text_value={(dkd_text_value) => dkd_update_form_value('dkd_company_name_value', dkd_text_value)} dkd_placeholder_value="Bireysel / firma adı" />
        <DkdField dkd_label_value="TC / Kimlik No" dkd_value={dkd_form_value.dkd_national_id_value} dkd_on_change_text_value={(dkd_text_value) => dkd_update_form_value('dkd_national_id_value', dkd_text_value)} dkd_placeholder_value="11 hane" dkd_keyboard_type_value="numeric" />
        <DkdField dkd_label_value="Vergi No" dkd_value={dkd_form_value.dkd_tax_no_value} dkd_on_change_text_value={(dkd_text_value) => dkd_update_form_value('dkd_tax_no_value', dkd_text_value)} dkd_placeholder_value="Opsiyonel" />
        <DkdField dkd_label_value="Telefon" dkd_required_value dkd_value={dkd_form_value.dkd_phone_text_value} dkd_on_change_text_value={(dkd_text_value) => dkd_update_form_value('dkd_phone_text_value', dkd_text_value)} dkd_placeholder_value="05xx xxx xx xx" dkd_keyboard_type_value="phone-pad" />
        <DkdField dkd_label_value="E-posta" dkd_value={dkd_form_value.dkd_email_text_value} dkd_on_change_text_value={(dkd_text_value) => dkd_update_form_value('dkd_email_text_value', dkd_text_value)} dkd_placeholder_value="mail@ornek.com" dkd_keyboard_type_value="email-address" />
        <DkdChoiceChips dkd_label_value="Ülke" dkd_required_value dkd_icon_value="earth" dkd_value={dkd_form_value.dkd_country_value || 'Türkiye'} dkd_options_value={dkd_logistics_country_options_value} dkd_on_change_value={dkd_select_country_value} />
        <DkdChoiceChips dkd_label_value="Şehir" dkd_required_value dkd_icon_value="city-variant-outline" dkd_value={dkd_form_value.dkd_city_value} dkd_options_value={dkd_city_options_value} dkd_on_change_value={dkd_select_city_value} />
        <DkdChoiceChips dkd_label_value="İlçe / Bölge" dkd_required_value dkd_icon_value="map-marker-radius-outline" dkd_value={dkd_form_value.dkd_district_value} dkd_options_value={dkd_district_options_value} dkd_on_change_value={(dkd_next_value) => dkd_update_form_value('dkd_district_value', dkd_next_value)} />
        <DkdChoiceChips dkd_label_value="Çalışma yarıçapı" dkd_required_value dkd_icon_value="map-marker-distance" dkd_value={dkd_form_value.dkd_operation_radius_km_value} dkd_options_value={dkd_logistics_radius_options_value} dkd_on_change_value={(dkd_next_value) => dkd_update_form_value('dkd_operation_radius_km_value', dkd_next_value)} />
        <DkdChoiceChips dkd_label_value="Araç tipi" dkd_required_value dkd_icon_value="truck-outline" dkd_value={dkd_form_value.dkd_vehicle_type_value} dkd_options_value={dkd_logistics_vehicle_type_options_value} dkd_on_change_value={(dkd_next_value) => dkd_update_form_value('dkd_vehicle_type_value', dkd_next_value)} />
        <DkdField dkd_label_value="Plaka" dkd_required_value dkd_value={dkd_form_value.dkd_vehicle_plate_value} dkd_on_change_text_value={(dkd_text_value) => dkd_update_form_value('dkd_vehicle_plate_value', dkd_text_value.toUpperCase())} dkd_placeholder_value="06 ABC 123" />
        <DkdChoiceChips dkd_label_value="Kapasite" dkd_required_value dkd_icon_value="weight-kilogram" dkd_value={dkd_form_value.dkd_vehicle_capacity_kg_value} dkd_options_value={dkd_logistics_capacity_options_value} dkd_on_change_value={(dkd_next_value) => dkd_update_form_value('dkd_vehicle_capacity_kg_value', dkd_next_value)} />
        <DkdChoiceChips dkd_label_value="Hacim" dkd_icon_value="cube-outline" dkd_value={dkd_form_value.dkd_vehicle_volume_m3_value} dkd_options_value={dkd_logistics_volume_options_value} dkd_on_change_value={(dkd_next_value) => dkd_update_form_value('dkd_vehicle_volume_m3_value', dkd_next_value)} />
        <DkdChoiceChips dkd_label_value="Filo araç sayısı" dkd_icon_value="truck-plus-outline" dkd_value={dkd_form_value.dkd_fleet_count_value} dkd_options_value={dkd_logistics_fleet_options_value} dkd_on_change_value={(dkd_next_value) => dkd_update_form_value('dkd_fleet_count_value', dkd_next_value)} />
        <DkdMultiChoiceChips dkd_label_value="Verilecek hizmetler" dkd_value={dkd_form_value.dkd_service_tags_value} dkd_options_value={dkd_logistics_service_options_value} dkd_on_change_value={(dkd_next_value) => dkd_update_form_value('dkd_service_tags_value', dkd_next_value)} />
        <DkdField dkd_label_value="Operasyon adresi" dkd_value={dkd_form_value.dkd_address_text_value} dkd_on_change_text_value={(dkd_text_value) => dkd_update_form_value('dkd_address_text_value', dkd_text_value)} dkd_placeholder_value="Açık adres" dkd_multiline_value />
        <DkdField dkd_label_value="Tecrübe / uzmanlık" dkd_value={dkd_form_value.dkd_experience_text_value} dkd_on_change_text_value={(dkd_text_value) => dkd_update_form_value('dkd_experience_text_value', dkd_text_value)} dkd_placeholder_value="SRC, sigorta, ruhsat, evden eve, parça yük, şehir içi/şehir dışı deneyimi" dkd_multiline_value />
        <DkdField dkd_label_value="Referans / ek not" dkd_value={dkd_form_value.dkd_reference_text_value} dkd_on_change_text_value={(dkd_text_value) => dkd_update_form_value('dkd_reference_text_value', dkd_text_value)} dkd_placeholder_value="Varsa referans bilgisi" dkd_multiline_value />
      </View>

      <View style={dkd_styles.dkdDocumentSection}>
        <View style={dkd_styles.dkdDocumentSectionHeader}>
          <View style={dkd_styles.dkdDocumentSectionIcon}><MaterialCommunityIcons name="folder-key-outline" size={20} color="#06121D" /></View>
          <View style={dkd_styles.dkdDocumentSectionTextWrap}>
            <Text style={dkd_styles.dkdDocumentSectionTitle}>Belge Yükleme</Text>
            <Text style={dkd_styles.dkdDocumentSectionSub}>Kimlik, ruhsat, ehliyet, sigorta ve yetki belgelerini fotoğraf olarak ekle.</Text>
          </View>
        </View>
        <View style={dkd_styles.dkdDocGrid}>
          <DkdDocumentTile dkd_label_value="Kimlik ön yüz" dkd_value={dkd_form_value.dkd_identity_front_uri_value || dkd_form_value.dkd_identity_front_url_value} dkd_on_pick_value={() => dkd_pick_document_value('dkd_identity_front_uri_value')} />
          <DkdDocumentTile dkd_label_value="Kimlik arka yüz" dkd_optional_value dkd_value={dkd_form_value.dkd_identity_back_uri_value || dkd_form_value.dkd_identity_back_url_value} dkd_on_pick_value={() => dkd_pick_document_value('dkd_identity_back_uri_value')} />
          <DkdDocumentTile dkd_label_value="Selfie / yüz doğrulama" dkd_optional_value dkd_icon_value="camera-account" dkd_value={dkd_form_value.dkd_selfie_uri_value || dkd_form_value.dkd_selfie_url_value} dkd_on_pick_value={() => dkd_pick_document_value('dkd_selfie_uri_value')} />
          <DkdDocumentTile dkd_label_value="Ehliyet" dkd_optional_value dkd_value={dkd_form_value.dkd_driver_license_uri_value || dkd_form_value.dkd_driver_license_url_value} dkd_on_pick_value={() => dkd_pick_document_value('dkd_driver_license_uri_value')} />
          <DkdDocumentTile dkd_label_value="Araç ruhsatı" dkd_value={dkd_form_value.dkd_vehicle_license_uri_value || dkd_form_value.dkd_vehicle_license_url_value} dkd_on_pick_value={() => dkd_pick_document_value('dkd_vehicle_license_uri_value')} />
          <DkdDocumentTile dkd_label_value="Sigorta / poliçe" dkd_optional_value dkd_value={dkd_form_value.dkd_insurance_uri_value || dkd_form_value.dkd_insurance_url_value} dkd_on_pick_value={() => dkd_pick_document_value('dkd_insurance_uri_value')} />
          <DkdDocumentTile dkd_label_value="SRC / Yetki belgesi" dkd_optional_value dkd_value={dkd_form_value.dkd_src_certificate_uri_value || dkd_form_value.dkd_src_certificate_url_value} dkd_on_pick_value={() => dkd_pick_document_value('dkd_src_certificate_uri_value')} />
          <DkdDocumentTile dkd_label_value="Vergi levhası" dkd_optional_value dkd_value={dkd_form_value.dkd_tax_certificate_uri_value || dkd_form_value.dkd_tax_certificate_url_value} dkd_on_pick_value={() => dkd_pick_document_value('dkd_tax_certificate_uri_value')} />
          <DkdDocumentTile dkd_label_value="Yetki / sözleşme" dkd_optional_value dkd_value={dkd_form_value.dkd_authorization_certificate_uri_value || dkd_form_value.dkd_authorization_certificate_url_value} dkd_on_pick_value={() => dkd_pick_document_value('dkd_authorization_certificate_uri_value')} />
        </View>
        <DkdField dkd_label_value="Belge açıklaması" dkd_value={dkd_form_value.dkd_document_note_value} dkd_on_change_text_value={(dkd_text_value) => dkd_update_form_value('dkd_document_note_value', dkd_text_value)} dkd_placeholder_value="Belgelerle ilgili not, belge tarihi, şirket yetkilisi, eksik evrak açıklaması" dkd_multiline_value />
      </View>

      <Pressable onPress={dkd_submit_value} disabled={dkd_saving_value} style={({ pressed }) => [dkd_styles.dkdPrimaryAction, pressed && dkd_styles.dkdPressed, dkd_saving_value && dkd_styles.dkdDisabled]}>
        <LinearGradient colors={["#FFD883", "#58E8FF", "#6AF4B6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Text style={dkd_styles.dkdPrimaryText}>{dkd_saving_value ? 'Belgeler gönderiliyor…' : 'Nakliye Başvurusu Gönder'}</Text>
        <MaterialCommunityIcons name="send-check-outline" size={18} color="#07111F" />
      </Pressable>
    </View>
  );
}

function DkdCreateJobPanel({ dkd_profile_value, dkd_on_refresh_value }) {
  const [dkd_form_value, dkd_set_form_value] = useState(() => dkd_default_logistics_job_value(dkd_profile_value));
  const [dkd_saving_value, dkd_set_saving_value] = useState(false);

  function dkd_update_form_value(dkd_key_value, dkd_next_value) {
    dkd_set_form_value((dkd_previous_value) => ({ ...dkd_previous_value, [dkd_key_value]: dkd_next_value }));
  }

  async function dkd_create_value() {
    if (!dkd_logistics_job_ready_value(dkd_form_value)) {
      Alert.alert('Nakliye Oluştur', 'Müşteri adı, telefon, alım adresi, teslimat adresi ve yük tipi zorunlu.');
      return;
    }
    try {
      dkd_set_saving_value(true);
      const dkd_result_value = await dkd_create_logistics_job_value({
        dkd_user_id_value: dkd_profile_value?.user_id || dkd_profile_value?.id,
        dkd_form_value,
      });
      if (dkd_result_value?.error) throw dkd_result_value.error;
      Alert.alert('Nakliye İşi Oluşturuldu', 'Nakliyeciler fiyat teklifi verebilir. Müşteri Pazarlık Yap ile çevrimiçi görüşme açabilir.');
      dkd_set_form_value(dkd_default_logistics_job_value(dkd_profile_value));
      await dkd_on_refresh_value?.();
    } catch (dkd_error_value) {
      Alert.alert('Nakliye Oluştur', dkd_error_value?.message || String(dkd_error_value));
    } finally {
      dkd_set_saving_value(false);
    }
  }

  return (
    <View style={dkd_styles.dkdPanelCard}>
      <LinearGradient colors={["rgba(18,45,72,0.98)", "rgba(7,14,25,0.98)"]} style={StyleSheet.absoluteFill} />
      <Text style={dkd_styles.dkdKicker}>MÜŞTERİ NAKLİYE OLUŞTUR</Text>
      <Text style={dkd_styles.dkdPanelTitle}>Detaylı taşıma işi oluştur</Text>
      <Text style={dkd_styles.dkdPanelSub}>Adres, kat, asansör, yük hacmi, bütçe aralığı ve zaman bilgisiyle nakliyecilerden net fiyat teklifi al.</Text>
      <View style={dkd_styles.dkdFormGrid}>
        <DkdField dkd_label_value="Müşteri adı" dkd_value={dkd_form_value.dkd_customer_name_value} dkd_on_change_text_value={(dkd_text_value) => dkd_update_form_value('dkd_customer_name_value', dkd_text_value)} dkd_placeholder_value="Ad Soyad" />
        <DkdField dkd_label_value="Telefon" dkd_value={dkd_form_value.dkd_customer_phone_value} dkd_on_change_text_value={(dkd_text_value) => dkd_update_form_value('dkd_customer_phone_value', dkd_text_value)} dkd_placeholder_value="05xx xxx xx xx" dkd_keyboard_type_value="phone-pad" />
        <DkdField dkd_label_value="Alım adresi" dkd_value={dkd_form_value.dkd_pickup_address_value} dkd_on_change_text_value={(dkd_text_value) => dkd_update_form_value('dkd_pickup_address_value', dkd_text_value)} dkd_placeholder_value="Eşya nereden alınacak?" dkd_multiline_value />
        <DkdField dkd_label_value="Teslimat adresi" dkd_value={dkd_form_value.dkd_dropoff_address_value} dkd_on_change_text_value={(dkd_text_value) => dkd_update_form_value('dkd_dropoff_address_value', dkd_text_value)} dkd_placeholder_value="Nereye teslim edilecek?" dkd_multiline_value />
        <DkdField dkd_label_value="Alım katı" dkd_value={dkd_form_value.dkd_pickup_floor_value} dkd_on_change_text_value={(dkd_text_value) => dkd_update_form_value('dkd_pickup_floor_value', dkd_text_value)} dkd_placeholder_value="0" />
        <DkdField dkd_label_value="Teslim katı" dkd_value={dkd_form_value.dkd_dropoff_floor_value} dkd_on_change_text_value={(dkd_text_value) => dkd_update_form_value('dkd_dropoff_floor_value', dkd_text_value)} dkd_placeholder_value="0" />
        <DkdField dkd_label_value="Asansör" dkd_value={dkd_form_value.dkd_has_elevator_value} dkd_on_change_text_value={(dkd_text_value) => dkd_update_form_value('dkd_has_elevator_value', dkd_text_value)} dkd_placeholder_value="Evet / Hayır" />
        <DkdChoiceChips dkd_label_value="Yük tipi" dkd_required_value dkd_icon_value="package-variant-closed" dkd_value={dkd_form_value.dkd_cargo_type_value} dkd_options_value={dkd_logistics_job_cargo_type_options_value} dkd_on_change_value={(dkd_next_value) => dkd_update_form_value('dkd_cargo_type_value', dkd_next_value)} />
        <DkdChoiceChips dkd_label_value="Ağırlık" dkd_icon_value="weight-kilogram" dkd_value={dkd_form_value.dkd_weight_kg_value} dkd_options_value={dkd_logistics_job_weight_options_value} dkd_on_change_value={(dkd_next_value) => dkd_update_form_value('dkd_weight_kg_value', dkd_next_value)} />
        <DkdChoiceChips dkd_label_value="Hacim" dkd_icon_value="cube-outline" dkd_value={dkd_form_value.dkd_volume_m3_value} dkd_options_value={dkd_logistics_volume_options_value} dkd_on_change_value={(dkd_next_value) => dkd_update_form_value('dkd_volume_m3_value', dkd_next_value)} />
        <DkdChoiceChips dkd_label_value="Eleman sayısı" dkd_icon_value="account-hard-hat-outline" dkd_value={dkd_form_value.dkd_helper_count_value} dkd_options_value={dkd_logistics_job_helper_options_value} dkd_on_change_value={(dkd_next_value) => dkd_update_form_value('dkd_helper_count_value', dkd_next_value)} />
        <DkdChoiceChips dkd_label_value="Araç ihtiyacı" dkd_icon_value="truck-fast-outline" dkd_value={dkd_form_value.dkd_vehicle_need_value} dkd_options_value={dkd_logistics_job_vehicle_need_options_value} dkd_on_change_value={(dkd_next_value) => dkd_update_form_value('dkd_vehicle_need_value', dkd_next_value)} />
        <DkdChoiceChips dkd_label_value="Min bütçe" dkd_icon_value="cash-minus" dkd_value={dkd_form_value.dkd_budget_min_tl_value} dkd_options_value={dkd_logistics_job_budget_min_options_value} dkd_on_change_value={(dkd_next_value) => dkd_update_form_value('dkd_budget_min_tl_value', dkd_next_value)} />
        <DkdChoiceChips dkd_label_value="Max bütçe" dkd_icon_value="cash-plus" dkd_value={dkd_form_value.dkd_budget_max_tl_value} dkd_options_value={dkd_logistics_job_budget_max_options_value} dkd_on_change_value={(dkd_next_value) => dkd_update_form_value('dkd_budget_max_tl_value', dkd_next_value)} />
        <DkdChoiceChips dkd_label_value="Zaman" dkd_icon_value="calendar-clock" dkd_value={dkd_form_value.dkd_scheduled_at_value} dkd_options_value={dkd_logistics_job_schedule_options_value} dkd_on_change_value={(dkd_next_value) => dkd_update_form_value('dkd_scheduled_at_value', dkd_next_value)} />
        <DkdField dkd_label_value="Detaylı not" dkd_value={dkd_form_value.dkd_note_value} dkd_on_change_text_value={(dkd_text_value) => dkd_update_form_value('dkd_note_value', dkd_text_value)} dkd_placeholder_value="Paket sayısı, kırılacak eşya, bina girişi" dkd_multiline_value />
      </View>
      <Pressable onPress={dkd_create_value} disabled={dkd_saving_value} style={({ pressed }) => [dkd_styles.dkdPrimaryAction, pressed && dkd_styles.dkdPressed, dkd_saving_value && dkd_styles.dkdDisabled]}>
        <LinearGradient colors={["#58E8FF", "#6AF4B6"]} style={StyleSheet.absoluteFill} />
        <Text style={dkd_styles.dkdPrimaryText}>{dkd_saving_value ? 'Oluşturuluyor…' : 'Nakliye İşi Oluştur'}</Text>
        <MaterialCommunityIcons name="plus-circle-outline" size={18} color="#07111F" />
      </Pressable>
    </View>
  );
}

function DkdJobsPanel({ dkd_profile_value, dkd_jobs_value, dkd_offers_value, dkd_messages_value, dkd_on_refresh_value }) {
  const [dkd_offer_price_map_value, dkd_set_offer_price_map_value] = useState({});
  const [dkd_offer_note_map_value, dkd_set_offer_note_map_value] = useState({});
  const [dkd_chat_job_id_value, dkd_set_chat_job_id_value] = useState('');
  const [dkd_message_value, dkd_set_message_value] = useState('');
  const dkd_user_id_value = String(dkd_profile_value?.user_id || dkd_profile_value?.id || '');
  const dkd_selected_job_value = dkd_jobs_value.find((dkd_job_value) => String(dkd_job_value?.id || '') === dkd_chat_job_id_value);
  const dkd_selected_messages_value = dkd_messages_value.filter((dkd_message_row_value) => String(dkd_message_row_value?.dkd_job_id || '') === dkd_chat_job_id_value);

  async function dkd_offer_value(dkd_job_value) {
    const dkd_job_key_value = String(dkd_job_value?.id || '');
    try {
      const dkd_result_value = await dkd_submit_logistics_offer_value({
        dkd_user_id_value,
        dkd_job_id_value: dkd_job_key_value,
        dkd_price_tl_value: dkd_offer_price_map_value[dkd_job_key_value],
        dkd_note_value: dkd_offer_note_map_value[dkd_job_key_value],
        dkd_profile_value,
      });
      if (dkd_result_value?.error) throw dkd_result_value.error;
      Alert.alert('Teklif Gönderildi', 'Müşteri Pazarlık Yap ile çevrimiçi görüşme başlatabilir.');
      dkd_set_offer_price_map_value((dkd_previous_value) => ({ ...dkd_previous_value, [dkd_job_key_value]: '' }));
      dkd_set_offer_note_map_value((dkd_previous_value) => ({ ...dkd_previous_value, [dkd_job_key_value]: '' }));
      await dkd_on_refresh_value?.();
    } catch (dkd_error_value) {
      Alert.alert('Fiyat Teklifi', dkd_error_value?.message || String(dkd_error_value));
    }
  }

  async function dkd_send_message_value() {
    if (!dkd_chat_job_id_value) return;
    try {
      const dkd_result_value = await dkd_add_logistics_message_value({
        dkd_user_id_value,
        dkd_job_id_value: dkd_chat_job_id_value,
        dkd_message_text_value: dkd_message_value,
        dkd_profile_value,
      });
      if (dkd_result_value?.error) throw dkd_result_value.error;
      dkd_set_message_value('');
      await dkd_on_refresh_value?.();
    } catch (dkd_error_value) {
      Alert.alert('Çevrimiçi Görüşme', dkd_error_value?.message || String(dkd_error_value));
    }
  }

  return (
    <View style={dkd_styles.dkdPanelCard}>
      <LinearGradient colors={["rgba(9,23,39,0.98)", "rgba(7,14,25,0.98)"]} style={StyleSheet.absoluteFill} />
      <View style={dkd_styles.dkdPanelHeaderRow}>
        <View style={dkd_styles.dkdPanelTitleWrap}>
          <Text style={dkd_styles.dkdKicker}>NAKLİYE İŞLERİ</Text>
          <Text style={dkd_styles.dkdPanelTitle}>Açık taşıma işleri</Text>
          <Text style={dkd_styles.dkdPanelSub}>Nakliyeci fiyat teklifi verir, müşteri Pazarlık Yap ile çevrimiçi görüşür.</Text>
        </View>
        <Pressable onPress={dkd_on_refresh_value} style={dkd_styles.dkdIconButton}><MaterialCommunityIcons name="refresh" size={18} color="#FFFFFF" /></Pressable>
      </View>

      {!dkd_jobs_value.length ? (
        <View style={dkd_styles.dkdEmptyCard}>
          <MaterialCommunityIcons name="truck-alert-outline" size={30} color="rgba(255,255,255,0.56)" />
          <Text style={dkd_styles.dkdEmptyTitle}>Henüz nakliye işi yok</Text>
          <Text style={dkd_styles.dkdEmptySub}>Nakliye Oluştur sekmesinden ilk işi açabilirsin.</Text>
        </View>
      ) : null}

      {dkd_jobs_value.map((dkd_job_value) => {
        const dkd_job_key_value = String(dkd_job_value?.id || '');
        const dkd_job_offers_value = dkd_offers_value.filter((dkd_offer_value) => String(dkd_offer_value?.dkd_job_id || '') === dkd_job_key_value);
        const dkd_best_offer_value = dkd_job_offers_value.slice().sort((dkd_left_value, dkd_right_value) => Number(dkd_left_value?.dkd_price_tl || 0) - Number(dkd_right_value?.dkd_price_tl || 0))[0];
        const dkd_is_mine_value = String(dkd_job_value?.customer_user_id || '') === dkd_user_id_value;
        return (
          <View key={dkd_job_key_value} style={dkd_styles.dkdJobCard}>
            <View style={dkd_styles.dkdJobHeaderRow}>
              <View style={dkd_styles.dkdJobIcon}><MaterialCommunityIcons name="truck-delivery-outline" size={22} color="#92E9FF" /></View>
              <View style={dkd_styles.dkdJobTitleWrap}>
                <Text style={dkd_styles.dkdJobTitle}>{dkd_job_value?.dkd_cargo_type || 'Nakliye işi'}</Text>
                <Text style={dkd_styles.dkdJobSub}>{dkd_job_value?.dkd_scheduled_at || 'Zaman esnek'} • {dkd_price_text_value(dkd_job_value?.dkd_budget_min_tl)} - {dkd_price_text_value(dkd_job_value?.dkd_budget_max_tl)}</Text>
              </View>
              <View style={dkd_styles.dkdOfferBadge}><Text style={dkd_styles.dkdOfferBadgeText}>{dkd_job_offers_value.length} teklif</Text></View>
            </View>
            <Text style={dkd_styles.dkdRouteText}>ALIM: {dkd_job_value?.dkd_pickup_address || 'Adres yok'}</Text>
            <Text style={dkd_styles.dkdRouteText}>TESLİM: {dkd_job_value?.dkd_dropoff_address || 'Adres yok'}</Text>
            <View style={dkd_styles.dkdMetaRow}>
              <Text style={dkd_styles.dkdMetaPill}>Kat {dkd_job_value?.dkd_pickup_floor || 0} → {dkd_job_value?.dkd_dropoff_floor || 0}</Text>
              <Text style={dkd_styles.dkdMetaPill}>Asansör {dkd_job_value?.dkd_has_elevator || '—'}</Text>
              <Text style={dkd_styles.dkdMetaPill}>{dkd_job_value?.dkd_weight_kg || 0} kg</Text>
              <Text style={dkd_styles.dkdMetaPill}>{dkd_job_value?.dkd_volume_m3 || 0} m³</Text>
              <Text style={dkd_styles.dkdMetaPill}>{dkd_job_value?.dkd_vehicle_need || 'Araç belirsiz'}</Text>
            </View>
            {!!dkd_job_value?.dkd_note ? <Text style={dkd_styles.dkdJobNote}>{dkd_job_value.dkd_note}</Text> : null}
            {dkd_best_offer_value ? <Text style={dkd_styles.dkdBestOfferText}>En iyi teklif: {dkd_price_text_value(dkd_best_offer_value.dkd_price_tl)} • {dkd_best_offer_value.dkd_transporter_name || 'Nakliyeci'}</Text> : null}

            {!dkd_is_mine_value ? (
              <View style={dkd_styles.dkdOfferBox}>
                <DkdField dkd_label_value="Fiyat teklifin TL" dkd_value={dkd_offer_price_map_value[dkd_job_key_value] || ''} dkd_on_change_text_value={(dkd_text_value) => dkd_set_offer_price_map_value((dkd_previous_value) => ({ ...dkd_previous_value, [dkd_job_key_value]: dkd_text_value }))} dkd_placeholder_value="1250" dkd_keyboard_type_value="numeric" />
                <DkdField dkd_label_value="Teklif notu" dkd_value={dkd_offer_note_map_value[dkd_job_key_value] || ''} dkd_on_change_text_value={(dkd_text_value) => dkd_set_offer_note_map_value((dkd_previous_value) => ({ ...dkd_previous_value, [dkd_job_key_value]: dkd_text_value }))} dkd_placeholder_value="2 kişi + panelvan, bugün uygun" />
                <Pressable onPress={() => dkd_offer_value(dkd_job_value)} style={({ pressed }) => [dkd_styles.dkdSecondaryAction, pressed && dkd_styles.dkdPressed]}><Text style={dkd_styles.dkdSecondaryText}>Fiyat Teklifi Ver</Text></Pressable>
              </View>
            ) : null}

            <Pressable onPress={() => dkd_set_chat_job_id_value(dkd_job_key_value)} style={({ pressed }) => [dkd_styles.dkdChatOpenButton, pressed && dkd_styles.dkdPressed]}>
              <Text style={dkd_styles.dkdChatOpenText}>Pazarlık Yap • Çevrimiçi Görüşme</Text>
              <MaterialCommunityIcons name="chat-processing-outline" size={17} color="#FFFFFF" />
            </Pressable>
          </View>
        );
      })}

      {dkd_selected_job_value ? (
        <View style={dkd_styles.dkdChatPanel}>
          <View style={dkd_styles.dkdChatHeaderRow}>
            <View><Text style={dkd_styles.dkdKicker}>ÇEVRİMİÇİ GÖRÜŞME</Text><Text style={dkd_styles.dkdChatTitle}>{dkd_selected_job_value?.dkd_cargo_type || 'Nakliye işi'}</Text></View>
            <Pressable onPress={() => dkd_set_chat_job_id_value('')} style={dkd_styles.dkdIconButton}><MaterialCommunityIcons name="close" size={16} color="#FFFFFF" /></Pressable>
          </View>
          <View style={dkd_styles.dkdMessageStack}>
            {dkd_selected_messages_value.length ? dkd_selected_messages_value.map((dkd_message_row_value) => (
              <View key={String(dkd_message_row_value?.id || dkd_message_row_value?.dkd_created_at)} style={[dkd_styles.dkdMessageBubble, String(dkd_message_row_value?.dkd_sender_user_id || '') === dkd_user_id_value && dkd_styles.dkdMessageBubbleMine]}>
                <Text style={dkd_styles.dkdMessageSender}>{dkd_message_row_value?.dkd_sender_name || 'Lootonia'}</Text>
                <Text style={dkd_styles.dkdMessageText}>{dkd_message_row_value?.dkd_message_text || ''}</Text>
              </View>
            )) : <Text style={dkd_styles.dkdEmptySub}>Henüz mesaj yok. İlk pazarlık mesajını yaz.</Text>}
          </View>
          <View style={dkd_styles.dkdChatInputRow}>
            <TextInput value={dkd_message_value} onChangeText={dkd_set_message_value} placeholder="Teklif, saat, ekip ve araç detayını yaz…" placeholderTextColor="rgba(255,255,255,0.35)" style={dkd_styles.dkdChatInput} />
            <Pressable onPress={dkd_send_message_value} style={dkd_styles.dkdSendButton}><MaterialCommunityIcons name="send" size={18} color="#07111F" /></Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function DkdCarrierLockedPanel({ dkd_on_apply_press_value }) {
  return (
    <View style={dkd_styles.dkdPanelCard}>
      <LinearGradient colors={["rgba(255,216,131,0.15)", "rgba(7,14,25,0.98)"]} style={StyleSheet.absoluteFill} />
      <View style={dkd_styles.dkdLockedHeroRow}>
        <View style={dkd_styles.dkdLockedIconWrap}><MaterialCommunityIcons name="truck-alert-outline" size={30} color="#FFD883" /></View>
        <View style={dkd_styles.dkdApprovedCopy}>
          <Text style={dkd_styles.dkdApprovedTitle}>Nakliye İşleri için başvuru onayı gerekir</Text>
          <Text style={dkd_styles.dkdApprovedSub}>Müşteri olarak Nakliye Oluştur herkes için açık. Nakliyeci olarak fiyat teklifi vermek için başvuru formunu belgeyle gönder.</Text>
        </View>
      </View>
      <Pressable onPress={dkd_on_apply_press_value} style={({ pressed }) => [dkd_styles.dkdPrimaryAction, pressed && dkd_styles.dkdPressed]}>
        <LinearGradient colors={["#FFD883", "#58E8FF"]} style={StyleSheet.absoluteFill} />
        <Text style={dkd_styles.dkdPrimaryText}>Nakliye Başvuru Formunu Aç</Text>
        <MaterialCommunityIcons name="clipboard-text-search-outline" size={18} color="#07111F" />
      </Pressable>
    </View>
  );
}

export default function DkdLogisticsModal({ dkd_visible_value, dkd_on_close_value, dkd_profile_value, dkd_initial_panel_value = 'create', dkd_inline_value = false, dkd_hide_unlicensed_entry_cards_value = false }) {
  const [dkd_loading_value, dkd_set_loading_value] = useState(false);
  const [dkd_application_value, dkd_set_application_value] = useState(null);
  const [dkd_jobs_value, dkd_set_jobs_value] = useState([]);
  const [dkd_offers_value, dkd_set_offers_value] = useState([]);
  const [dkd_messages_value, dkd_set_messages_value] = useState([]);
  const [dkd_panel_value, dkd_set_panel_value] = useState(dkd_initial_panel_value || 'create');
  const dkd_user_id_value = String(dkd_profile_value?.user_id || dkd_profile_value?.id || '');
  const dkd_approved_value = useMemo(() => dkd_is_logistics_approved_value(dkd_profile_value, dkd_application_value), [dkd_application_value, dkd_profile_value]);

  const dkd_load_value = useCallback(async () => {
    if (!dkd_user_id_value) return;
    dkd_set_loading_value(true);
    try {
      const dkd_application_result_value = await dkd_fetch_my_logistics_application_value({ dkd_user_id_value, dkd_profile_value });
      if (dkd_application_result_value?.error) throw dkd_application_result_value.error;
      dkd_set_application_value(dkd_application_result_value?.data || null);
      const dkd_jobs_result_value = await dkd_fetch_logistics_jobs_value();
      if (dkd_jobs_result_value?.error) throw dkd_jobs_result_value.error;
      dkd_set_jobs_value(dkd_jobs_result_value?.data?.dkd_jobs_value || []);
      dkd_set_offers_value(dkd_jobs_result_value?.data?.dkd_offers_value || []);
      dkd_set_messages_value(dkd_jobs_result_value?.data?.dkd_messages_value || []);
    } catch (dkd_error_value) {
      Alert.alert('Nakliye/Lojistik', dkd_error_value?.message || String(dkd_error_value));
    } finally {
      dkd_set_loading_value(false);
    }
  }, [dkd_profile_value, dkd_user_id_value]);

  const dkd_application_entry_value = String(dkd_initial_panel_value || '') === 'application';
  const dkd_hide_logistics_create_and_apply_cards_value = Boolean(dkd_hide_unlicensed_entry_cards_value);
  const dkd_hide_inline_logistics_header_value = Boolean(dkd_inline_value && dkd_hide_logistics_create_and_apply_cards_value);

  useEffect(() => {
    if (!dkd_visible_value) return;
    const dkd_requested_panel_value = dkd_initial_panel_value || 'create';
    dkd_set_panel_value(dkd_approved_value && dkd_requested_panel_value === 'application' ? 'create' : dkd_requested_panel_value);
    dkd_load_value();
  }, [dkd_approved_value, dkd_initial_panel_value, dkd_load_value, dkd_visible_value]);

  useEffect(() => {
    if (dkd_approved_value && dkd_panel_value === 'application') {
      dkd_set_panel_value('create');
    }
  }, [dkd_approved_value, dkd_panel_value]);

  const dkd_logistics_body_node_value = (
    <LinearGradient colors={["#06101D", "#0A1830", "#06101D"]} style={dkd_styles.dkdGradient}>
      {!dkd_hide_inline_logistics_header_value ? (
        <View style={dkd_styles.dkdTopBar}>
          <View style={dkd_styles.dkdTopTitleWrap}>
            <Text style={dkd_styles.dkdKicker}>LOOTONIA LOJİSTİK</Text>
            <Text style={dkd_styles.dkdTopTitle}>Nakliye/Lojistik</Text>
            <Text style={dkd_styles.dkdTopSub}>Başvuru, taşıma işi oluşturma, nakliyeci fiyat teklifi ve çevrimiçi pazarlık ekranı.</Text>
          </View>
          <Pressable onPress={dkd_on_close_value} style={dkd_styles.dkdIconButton}><MaterialCommunityIcons name={dkd_inline_value ? "chevron-up" : "close"} size={20} color="#FFFFFF" /></Pressable>
        </View>
      ) : null}

      <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} contentContainerStyle={[dkd_styles.dkdScrollContent, dkd_hide_inline_logistics_header_value && dkd_styles.dkdScrollContentInlineCompact]}>
        {dkd_loading_value ? <View style={dkd_styles.dkdLoadingCard}><ActivityIndicator color="#92E9FF" /><Text style={dkd_styles.dkdLoadingText}>Nakliye verileri hazırlanıyor…</Text></View> : null}

        {!dkd_application_entry_value ? (
          <View style={dkd_styles.dkdActionGrid}>
            {!dkd_hide_logistics_create_and_apply_cards_value ? (
              <DkdLogisticsActionCard
                dkd_label_value="Nakliye Oluştur"
                dkd_sub_value="Müşteri taşıma işi açar, teklifleri ve pazarlığı takip eder."
                dkd_icon_value="package-variant-plus"
                dkd_tone_value="blue"
                dkd_active_value={dkd_panel_value === 'create'}
                dkd_on_press_value={() => dkd_set_panel_value('create')}
              />
            ) : null}
            {!dkd_hide_logistics_create_and_apply_cards_value && !dkd_approved_value ? (
              <DkdLogisticsActionCard
                dkd_label_value="Nakliye Başvuru"
                dkd_sub_value="Nakliyeci olmak için araç ve belge bilgilerini gönder."
                dkd_icon_value="clipboard-text-search-outline"
                dkd_tone_value="gold"
                dkd_active_value={dkd_panel_value === 'application'}
                dkd_on_press_value={() => dkd_set_panel_value('application')}
              />
            ) : null}
            {!dkd_hide_logistics_create_and_apply_cards_value ? (
              <DkdLogisticsActionCard
                dkd_label_value="Nakliye İşleri"
                dkd_sub_value={dkd_approved_value ? 'Açık taşıma işlerine teklif ver.' : 'Teklif vermek için başvuru onayı gerekir.'}
                dkd_icon_value="truck-fast-outline"
                dkd_tone_value="green"
                dkd_locked_value={!dkd_approved_value}
                dkd_active_value={dkd_panel_value === 'jobs'}
                dkd_on_press_value={() => dkd_set_panel_value('jobs')}
              />
            ) : null}
          </View>
        ) : null}

        {!dkd_approved_value && dkd_application_value ? (
          <View style={dkd_styles.dkdApprovedCard}>
            <LinearGradient colors={["rgba(255,216,131,0.16)", "rgba(88,232,255,0.08)"]} style={StyleSheet.absoluteFill} />
            <MaterialCommunityIcons name="timer-sand" size={28} color="#FFD883" />
            <View style={dkd_styles.dkdApprovedCopy}><Text style={dkd_styles.dkdApprovedTitle}>Nakliye başvurun incelemede</Text><Text style={dkd_styles.dkdApprovedSub}>Nakliye Oluştur aktif. Nakliye İşleri onaydan sonra teklif vermeye açılır.</Text></View>
          </View>
        ) : null}

        {dkd_panel_value === 'application' && !dkd_approved_value ? (
          <DkdApplicationForm dkd_profile_value={dkd_profile_value} dkd_application_value={dkd_application_value} dkd_on_refresh_value={dkd_load_value} />
        ) : dkd_panel_value === 'jobs' ? (
          dkd_approved_value ? (
            <DkdJobsPanel dkd_profile_value={dkd_profile_value} dkd_jobs_value={dkd_jobs_value} dkd_offers_value={dkd_offers_value} dkd_messages_value={dkd_messages_value} dkd_on_refresh_value={dkd_load_value} />
          ) : (
            <DkdCarrierLockedPanel dkd_on_apply_press_value={() => dkd_set_panel_value('application')} />
          )
        ) : (
          <DkdCreateJobPanel dkd_profile_value={dkd_profile_value} dkd_on_refresh_value={dkd_load_value} />
        )}
      </ScrollView>
    </LinearGradient>
  );

  if (dkd_inline_value) {
    if (!dkd_visible_value) return null;
    return (
      <View style={dkd_styles.dkd_inline_screen}>
        {dkd_logistics_body_node_value}
      </View>
    );
  }

  return (
    <Modal visible={!!dkd_visible_value} animationType="slide" onRequestClose={dkd_on_close_value}>
      <SafeScreen style={dkd_styles.dkdScreen}>
        <StatusBar barStyle="light-content" />
        {dkd_logistics_body_node_value}
      </SafeScreen>
    </Modal>
  );
}

const dkd_styles = StyleSheet.create({
  dkdScreen: { flex: 1, backgroundColor: '#06101D' },
  dkd_inline_screen: { minHeight: 620, maxHeight: 980, borderRadius: 28, overflow: 'hidden', backgroundColor: '#06101D' },
  dkdGradient: { flex: 1 },
  dkdTopBar: { margin: 14, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  dkdTopTitleWrap: { flex: 1, minWidth: 0 },
  dkdKicker: { color: '#92E9FF', fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  dkdTopTitle: { color: dkd_colors_value.text, fontSize: 28, lineHeight: 34, fontWeight: '900', marginTop: 5 },
  dkdTopSub: { color: dkd_colors_value.textSoft, fontSize: 13, lineHeight: 19, fontWeight: '700', marginTop: 7 },
  dkdIconButton: { width: 44, height: 44, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  dkdScrollContent: { paddingHorizontal: 14, paddingBottom: 30 },
  dkdScrollContentInlineCompact: { paddingTop: 2 },
  dkdLoadingCard: { borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.06)', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  dkdLoadingText: { color: dkd_colors_value.textSoft, fontSize: 13, fontWeight: '800' },
  dkdLogisticsHeroCard: { borderRadius: 28, borderWidth: 1, borderColor: 'rgba(146,233,255,0.18)', backgroundColor: 'rgba(255,255,255,0.05)', overflow: 'hidden', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 12 },
  dkdLogisticsHeroIconShell: { width: 62, height: 62, borderRadius: 22, backgroundColor: '#92E9FF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.36)' },
  dkdLogisticsHeroCopy: { flex: 1, minWidth: 0 },
  dkdLogisticsHeroTitle: { color: dkd_colors_value.text, fontSize: 17, lineHeight: 22, fontWeight: '900', marginTop: 4 },
  dkdLogisticsHeroPillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  dkdLogisticsHeroPill: { color: '#EAFBFF', fontSize: 10, lineHeight: 14, fontWeight: '900', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 8, paddingVertical: 5 },
  dkdActionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  dkdActionCard: { flexGrow: 1, flexBasis: '30%', minWidth: 118, minHeight: 128, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)', overflow: 'hidden', padding: 12, justifyContent: 'space-between' },
  dkdActionCardActive: { borderColor: 'rgba(255,255,255,0.36)', backgroundColor: 'rgba(255,255,255,0.06)' },
  dkdActionIconWrap: { width: 44, height: 44, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', backgroundColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center' },
  dkdActionTitle: { color: dkd_colors_value.text, fontSize: 15, lineHeight: 19, fontWeight: '900', marginTop: 10 },
  dkdActionSub: { color: dkd_colors_value.textSoft, fontSize: 11, lineHeight: 15, fontWeight: '800', marginTop: 5 },
  dkdPanelCard: { borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', overflow: 'hidden', padding: 16, marginBottom: 14 },
  dkdApplicationHeroGlow: { position: 'absolute', width: 210, height: 210, borderRadius: 999, backgroundColor: 'rgba(88,232,255,0.14)', top: -62, right: -70 },
  dkdApplicationStepRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  dkdApplicationStep: { flex: 1, minHeight: 46, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  dkdApplicationStepText: { color: '#EAFBFF', fontSize: 11, fontWeight: '900' },
  dkdPanelHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  dkdPanelTitleWrap: { flex: 1, minWidth: 0 },
  dkdPanelTitle: { color: dkd_colors_value.text, fontSize: 22, lineHeight: 28, fontWeight: '900', marginTop: 5 },
  dkdPanelSub: { color: dkd_colors_value.textSoft, fontSize: 13, lineHeight: 19, fontWeight: '700', marginTop: 7, marginBottom: 12 },
  dkdStatusPill: { borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,216,131,0.25)', backgroundColor: 'rgba(255,216,131,0.10)', paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dkdStatusText: { color: dkd_colors_value.text, fontSize: 11, fontWeight: '900' },
  dkdStatGrid: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  dkdSmallStat: { flex: 1, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, minHeight: 94 },
  dkdSmallStatLabel: { color: dkd_colors_value.textSoft, fontSize: 10, fontWeight: '900', marginTop: 7 },
  dkdSmallStatValue: { color: dkd_colors_value.text, fontSize: 11, lineHeight: 15, fontWeight: '800', marginTop: 3 },
  dkdFormGrid: { gap: 10 },
  dkdChoiceWrap: { borderRadius: 20, borderWidth: 1, borderColor: 'rgba(146,233,255,0.14)', backgroundColor: 'rgba(255,255,255,0.045)', padding: 10, gap: 9 },
  dkdChoiceHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dkdChoiceLabel: { color: dkd_colors_value.textSoft, fontSize: 11, fontWeight: '900' },
  dkdChoiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  dkdChoiceChip: { minHeight: 36, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)', backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 11, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 },
  dkdChoiceChipActive: { backgroundColor: '#92E9FF', borderColor: '#92E9FF' },
  dkdChoiceChipActiveGreen: { backgroundColor: '#6AF4B6', borderColor: '#6AF4B6' },
  dkdChoiceChipText: { color: '#EAFBFF', fontSize: 11, fontWeight: '900' },
  dkdChoiceChipTextActive: { color: '#07111F' },
  dkdFieldWrap: { borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 10 },
  dkdFieldLabel: { color: dkd_colors_value.textSoft, fontSize: 11, fontWeight: '900', marginBottom: 5 },
  dkdRequiredStar: { color: '#FFD883', fontWeight: '900' },
  dkdFieldInput: { color: dkd_colors_value.text, fontSize: 14, fontWeight: '800', minHeight: 28, padding: 0 },
  dkdFieldInputMultiline: { minHeight: 74, textAlignVertical: 'top' },
  dkdDocumentSection: { marginTop: 14, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(146,233,255,0.18)', backgroundColor: 'rgba(255,255,255,0.045)', padding: 12, gap: 10 },
  dkdDocumentSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dkdDocumentSectionIcon: { width: 42, height: 42, borderRadius: 16, backgroundColor: '#FFD883', alignItems: 'center', justifyContent: 'center' },
  dkdDocumentSectionTextWrap: { flex: 1, minWidth: 0 },
  dkdDocumentSectionTitle: { color: dkd_colors_value.text, fontSize: 17, fontWeight: '900' },
  dkdDocumentSectionSub: { color: dkd_colors_value.textSoft, fontSize: 12, lineHeight: 17, fontWeight: '700', marginTop: 3 },
  dkdDocGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  dkdDocumentTile: { flexGrow: 1, flexBasis: '47%', minWidth: 138, minHeight: 128, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)' },
  dkdDocumentTileReady: { borderColor: 'rgba(106,244,182,0.36)' },
  dkdDocumentImage: { ...StyleSheet.absoluteFillObject, opacity: 0.45 },
  dkdDocumentOverlay: { flex: 1, padding: 11, justifyContent: 'space-between' },
  dkdDocumentIconWrap: { width: 38, height: 38, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', backgroundColor: 'rgba(5,11,20,0.58)', alignItems: 'center', justifyContent: 'center' },
  dkdDocumentTitle: { color: dkd_colors_value.text, fontSize: 13, lineHeight: 17, fontWeight: '900' },
  dkdDocumentSub: { color: dkd_colors_value.textSoft, fontSize: 10, fontWeight: '800', marginTop: 3 },
  dkdPrimaryAction: { marginTop: 14, minHeight: 54, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  dkdPrimaryText: { color: '#07111F', fontSize: 15, fontWeight: '900' },
  dkdSecondaryAction: { minHeight: 46, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(146,233,255,0.28)', backgroundColor: 'rgba(146,233,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  dkdSecondaryText: { color: '#EFFFFF', fontSize: 14, fontWeight: '900' },
  dkdDisabled: { opacity: 0.58 },
  dkdPressed: { transform: [{ scale: 0.985 }], opacity: 0.88 },
  dkdApprovedCard: { borderRadius: 24, borderWidth: 1, borderColor: 'rgba(106,244,182,0.25)', overflow: 'hidden', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  dkdApprovedCopy: { flex: 1, minWidth: 0 },
  dkdApprovedTitle: { color: dkd_colors_value.text, fontSize: 17, fontWeight: '900' },
  dkdApprovedSub: { color: dkd_colors_value.textSoft, fontSize: 12, fontWeight: '700', marginTop: 3 },
  dkdLockedHeroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dkdLockedIconWrap: { width: 56, height: 56, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,216,131,0.34)', backgroundColor: 'rgba(255,216,131,0.12)', alignItems: 'center', justifyContent: 'center' },
  dkdEmptyCard: { borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', padding: 20, marginTop: 10 },
  dkdEmptyTitle: { color: dkd_colors_value.text, fontSize: 16, fontWeight: '900', marginTop: 8 },
  dkdEmptySub: { color: dkd_colors_value.textSoft, fontSize: 12, lineHeight: 17, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  dkdJobCard: { borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.05)', padding: 14, marginTop: 10 },
  dkdJobHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dkdJobIcon: { width: 48, height: 48, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(146,233,255,0.28)', backgroundColor: 'rgba(146,233,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  dkdJobTitleWrap: { flex: 1, minWidth: 0 },
  dkdJobTitle: { color: dkd_colors_value.text, fontSize: 16, fontWeight: '900' },
  dkdJobSub: { color: dkd_colors_value.textSoft, fontSize: 11, fontWeight: '800', marginTop: 3 },
  dkdOfferBadge: { borderRadius: 999, backgroundColor: 'rgba(106,244,182,0.12)', borderWidth: 1, borderColor: 'rgba(106,244,182,0.24)', paddingHorizontal: 9, paddingVertical: 6 },
  dkdOfferBadgeText: { color: '#6AF4B6', fontSize: 10, fontWeight: '900' },
  dkdRouteText: { color: dkd_colors_value.text, fontSize: 12, lineHeight: 17, fontWeight: '800', marginTop: 9 },
  dkdMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  dkdMetaPill: { color: '#DFF7FF', fontSize: 11, fontWeight: '800', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 9, paddingVertical: 6 },
  dkdJobNote: { color: dkd_colors_value.textSoft, fontSize: 12, lineHeight: 17, fontWeight: '700', marginTop: 10 },
  dkdBestOfferText: { color: '#DFFFF1', fontSize: 12, fontWeight: '900', borderRadius: 14, backgroundColor: 'rgba(106,244,182,0.10)', padding: 10, marginTop: 10 },
  dkdOfferBox: { gap: 8, marginTop: 12 },
  dkdChatOpenButton: { marginTop: 12, minHeight: 48, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,216,131,0.13)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  dkdChatOpenText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  dkdChatPanel: { borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(35,29,61,0.86)', padding: 14, marginTop: 12 },
  dkdChatHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  dkdChatTitle: { color: dkd_colors_value.text, fontSize: 17, fontWeight: '900', marginTop: 4 },
  dkdMessageStack: { gap: 8, marginTop: 12 },
  dkdMessageBubble: { borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.06)', padding: 10, alignSelf: 'flex-start', maxWidth: '92%' },
  dkdMessageBubbleMine: { alignSelf: 'flex-end', backgroundColor: 'rgba(146,233,255,0.14)', borderColor: 'rgba(146,233,255,0.28)' },
  dkdMessageSender: { color: '#92E9FF', fontSize: 10, fontWeight: '900', marginBottom: 3 },
  dkdMessageText: { color: dkd_colors_value.text, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  dkdChatInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  dkdChatInput: { flex: 1, minHeight: 46, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.06)', color: dkd_colors_value.text, paddingHorizontal: 12, fontWeight: '800' },
  dkdSendButton: { width: 46, height: 46, borderRadius: 18, backgroundColor: '#92E9FF', alignItems: 'center', justifyContent: 'center' },
});
