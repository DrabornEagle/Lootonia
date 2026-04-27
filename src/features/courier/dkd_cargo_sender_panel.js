import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Easing,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { cityLootTheme } from '../../theme/cityLootTheme';
import DkdCargoLiveMapModal from './dkd_cargo_live_map_modal';
import {
  dkd_create_cargo_shipment,
  dkd_fetch_my_cargo_shipments,
  dkd_upload_cargo_package_art,
} from '../../services/dkd_cargo_service';

const dkd_colors = cityLootTheme.colors;
const dkd_city_keyword_list_value = [
  'adana','adiyaman','afyon','afyonkarahisar','agri','amasya','ankara','antalya','artvin','aydin','balikesir','bilecik','bingol','bitlis','bolu','burdur','bursa','canakkale','çanakkale','cankiri','çankırı','corum','çorum','denizli','diyarbakir','diyarbakır','edirne','elazig','elazığ','erzincan','erzurum','eskisehir','eskişehir','gaziantep','giresun','gumushane','gümüşhane','hakkari','hatay','isparta','mersin','istanbul','izmir','kars','kastamonu','kayseri','kirklareli','kırklareli','kirsehir','kırşehir','kocaeli','konya','kutahya','kütahya','malatya','manisa','kahramanmaras','kahramanmaraş','mardin','mugla','muğla','mus','muş','nevsehir','nevşehir','nigde','niğde','ordu','rize','sakarya','samsun','siirt','sinop','sivas','tekirdag','tekirdağ','tokat','trabzon','tunceli','sanliurfa','şanlıurfa','usak','uşak','van','yozgat','zonguldak','aksaray','bayburt','karaman','kirikkale','kırıkkale','batman','sirnak','şırnak','bartin','bartın','ardahan','igdir','ığdır','yalova','karabuk','karabük','kilis','osmaniye','duzce','düzce','turkiye','türkiye'
];

function dkd_default_form_state() {
  return {
    dkd_customer_first_name: '',
    dkd_customer_last_name: '',
    dkd_customer_national_id: '',
    dkd_customer_phone_text: '+90',
    dkd_pickup_address_text: '',
    dkd_delivery_address_text: '',
    dkd_delivery_note_text: '',
    dkd_package_content_text: '',
    dkd_package_weight_kg: '1',
    dkd_package_image_uri: '',
  };
}

function dkd_normalize_digits(dkd_value, dkd_max_value = 11) {
  return String(dkd_value || '').replace(/\D/g, '').slice(0, dkd_max_value);
}

function dkd_safe_number(dkd_value) {
  const dkd_numeric_value = Number(dkd_value);
  return Number.isFinite(dkd_numeric_value) ? dkd_numeric_value : null;
}

function dkd_format_weight(dkd_value) {
  const dkd_numeric_value = dkd_safe_number(dkd_value);
  if (dkd_numeric_value == null) return '-';
  return `${dkd_numeric_value.toLocaleString('tr-TR', { minimumFractionDigits: dkd_numeric_value % 1 === 0 ? 0 : 1, maximumFractionDigits: 1 })} kg`;
}

function dkd_format_eta(dkd_value) {
  const dkd_numeric_value = dkd_safe_number(dkd_value);
  if (dkd_numeric_value == null || dkd_numeric_value <= 0) return 'Hesaplanıyor';
  return `${Math.round(dkd_numeric_value)} dk`;
}

function dkd_courier_vehicle_label_value(dkd_value) {
  const dkd_key_value = String(dkd_value || '').trim().toLowerCase();
  if (['moto', 'motor', 'motorcycle', 'bike'].includes(dkd_key_value)) return 'Motosiklet';
  if (['car', 'otomobil', 'sedan'].includes(dkd_key_value)) return 'Otomobil';
  if (['van', 'panelvan'].includes(dkd_key_value)) return 'Panelvan';
  if (['truck', 'kamyon', 'pickup'].includes(dkd_key_value)) return 'Kamyonet';
  return dkd_key_value ? dkd_key_value.toUpperCase() : 'Bekleniyor';
}

function dkd_format_status_label(dkd_status_value) {
  const dkd_key_value = String(dkd_status_value || 'open').toLowerCase();
  if (dkd_key_value === 'accepted') return 'Kurye atandı';
  if (dkd_key_value === 'picked_up') return 'Paket alındı';
  if (dkd_key_value === 'completed') return 'Operasyon tamamlandı';
  if (dkd_key_value === 'cancelled') return 'İptal';
  return 'Kurye bekleniyor';
}

function dkd_status_tone_style(dkd_status_value) {
  const dkd_key_value = String(dkd_status_value || 'open').toLowerCase();
  if (dkd_key_value === 'completed') return dkd_styles.dkd_statusPillDone;
  if (dkd_key_value === 'accepted' || dkd_key_value === 'picked_up') return dkd_styles.dkd_statusPillActive;
  return dkd_styles.dkd_statusPillOpen;
}

function dkd_phone_digits_value(dkd_value) {
  return String(dkd_value || '').replace(/\D/g, '');
}

function dkd_normalize_turkiye_phone_input_value(dkd_value) {
  const dkd_digits_value = dkd_phone_digits_value(dkd_value);
  const dkd_local_digits_value = (dkd_digits_value.startsWith('90') ? dkd_digits_value.slice(2) : dkd_digits_value.replace(/^0+/, '')).slice(0, 10);
  return `+90${dkd_local_digits_value}`;
}

function dkd_is_valid_turkiye_phone_value(dkd_value) {
  const dkd_digits_value = dkd_phone_digits_value(dkd_value);
  const dkd_local_digits_value = dkd_digits_value.startsWith('90') ? dkd_digits_value.slice(2) : dkd_digits_value.replace(/^0+/, '');
  return dkd_local_digits_value.length === 10 && dkd_local_digits_value.startsWith('5');
}

function dkd_format_phone_display_value(dkd_value) {
  const dkd_digits_value = dkd_phone_digits_value(dkd_value);
  const dkd_local_digits_value = dkd_digits_value.startsWith('90') ? dkd_digits_value.slice(2) : dkd_digits_value.replace(/^0+/, '');
  if (!dkd_local_digits_value) return '+90';
  const dkd_trimmed_value = dkd_local_digits_value.slice(0, 10);
  if (dkd_trimmed_value.length < 10) return `+90 ${dkd_trimmed_value}`.trim();
  return `+90 ${dkd_trimmed_value.slice(0, 3)} ${dkd_trimmed_value.slice(3, 6)} ${dkd_trimmed_value.slice(6, 8)} ${dkd_trimmed_value.slice(8, 10)}`;
}

function dkd_mask_national_id_text(dkd_value) {
  const dkd_digits_value = String(dkd_value || '').replace(/\D/g, '').slice(0, 11);
  if (!dkd_digits_value) return '-';
  if (dkd_digits_value.length <= 4) return dkd_digits_value;
  return `${dkd_digits_value.slice(0, 3)}••••${dkd_digits_value.slice(-4)}`;
}

function dkd_payment_status_label(dkd_status_value) {
  const dkd_key_value = String(dkd_status_value || '').toLowerCase();
  if (dkd_key_value === 'paid') return 'Ödendi';
  if (dkd_key_value === 'refunded') return 'İade edildi';
  if (dkd_key_value === 'pending') return 'Ödeme bekliyor';
  return dkd_key_value ? dkd_key_value : 'Belirsiz';
}

function dkd_shipment_metric_theme_value(dkd_kind_value, dkd_payload_value) {
  const dkd_metric_kind_value = String(dkd_kind_value || '').toLowerCase();
  const dkd_status_key_value = String(dkd_payload_value?.dkd_status_key_value || '').toLowerCase();

  if (dkd_metric_kind_value === 'charge') {
    return {
      dkd_icon_name: 'cash-multiple',
      dkd_icon_color: '#F7FFFD',
      dkd_border_color: 'rgba(118, 231, 199, 0.26)',
      dkd_surface_colors: ['rgba(50, 162, 139, 0.94)', 'rgba(22, 71, 67, 0.98)'],
      dkd_glow_colors: ['rgba(118, 231, 199, 0.10)', 'rgba(15, 28, 34, 0.02)'],
      dkd_icon_surface_colors: ['rgba(255,255,255,0.13)', 'rgba(255,255,255,0.03)'],
      dkd_shadow_color: '#39B89A',
    };
  }

  if (dkd_metric_kind_value === 'payment') {
    if (dkd_status_key_value === 'paid') {
      return {
        dkd_icon_name: 'credit-card-check-outline',
        dkd_icon_color: '#F5F9FF',
        dkd_border_color: 'rgba(136, 176, 255, 0.26)',
        dkd_surface_colors: ['rgba(72, 118, 224, 0.95)', 'rgba(34, 57, 114, 0.98)'],
        dkd_glow_colors: ['rgba(136, 176, 255, 0.10)', 'rgba(19, 31, 58, 0.02)'],
        dkd_icon_surface_colors: ['rgba(255,255,255,0.13)', 'rgba(255,255,255,0.03)'],
        dkd_shadow_color: '#4F79D8',
      };
    }
    if (dkd_status_key_value === 'refunded') {
      return {
        dkd_icon_name: 'credit-card-refund-outline',
        dkd_icon_color: '#FFF8F1',
        dkd_border_color: 'rgba(255, 171, 107, 0.42)',
        dkd_surface_colors: ['rgba(255, 162, 89, 0.96)', 'rgba(129, 63, 22, 0.98)'],
        dkd_glow_colors: ['rgba(255, 171, 107, 0.32)', 'rgba(74, 31, 11, 0.04)'],
        dkd_icon_surface_colors: ['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.05)'],
        dkd_shadow_color: '#FF9E5C',
      };
    }
    return {
      dkd_icon_name: 'credit-card-clock-outline',
      dkd_icon_color: '#FFF9E4',
      dkd_border_color: 'rgba(255, 211, 120, 0.42)',
      dkd_surface_colors: ['rgba(255, 204, 87, 0.96)', 'rgba(120, 83, 16, 0.98)'],
      dkd_glow_colors: ['rgba(255, 211, 120, 0.32)', 'rgba(80, 53, 8, 0.04)'],
      dkd_icon_surface_colors: ['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.06)'],
      dkd_shadow_color: '#FFCB54',
    };
  }

  if (dkd_status_key_value === 'live') {
    return {
      dkd_icon_name: 'cursor-default-click-outline',
      dkd_icon_color: '#F5FFFE',
      dkd_border_color: 'rgba(130, 225, 255, 0.26)',
      dkd_surface_colors: ['rgba(45, 162, 186, 0.95)', 'rgba(26, 84, 96, 0.98)'],
      dkd_glow_colors: ['rgba(130, 225, 255, 0.10)', 'rgba(11, 39, 46, 0.02)'],
      dkd_icon_surface_colors: ['rgba(255,255,255,0.13)', 'rgba(255,255,255,0.03)'],
      dkd_shadow_color: '#46B7D3',
    };
  }

  return {
    dkd_icon_name: 'lock-outline',
    dkd_icon_color: '#F7FAFF',
    dkd_border_color: 'rgba(173, 186, 214, 0.24)',
    dkd_surface_colors: ['rgba(92, 103, 128, 0.94)', 'rgba(31, 36, 49, 0.98)'],
    dkd_glow_colors: ['rgba(173, 186, 214, 0.18)', 'rgba(27, 32, 41, 0.04)'],
    dkd_icon_surface_colors: ['rgba(255,255,255,0.20)', 'rgba(255,255,255,0.06)'],
    dkd_shadow_color: '#7E8CA8',
  };
}

function dkd_tracking_pulse_icon({ dkd_is_active_value, dkd_theme_value }) {
  const dkd_pulse_anim_value = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!dkd_is_active_value) {
      dkd_pulse_anim_value.stopAnimation();
      dkd_pulse_anim_value.setValue(1);
      return undefined;
    }

    const dkd_loop_value = Animated.loop(
      Animated.sequence([
        Animated.timing(dkd_pulse_anim_value, {
          toValue: 0,
          duration: 620,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(dkd_pulse_anim_value, {
          toValue: 1,
          duration: 620,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    dkd_loop_value.start();
    return () => dkd_loop_value.stop();
  }, [dkd_is_active_value, dkd_pulse_anim_value]);

  const dkd_scale_value = dkd_pulse_anim_value.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.04],
  });
  const dkd_opacity_value = dkd_pulse_anim_value.interpolate({
    inputRange: [0, 1],
    outputRange: [0.58, 1],
  });

  return (
    <Animated.View
      style={[
        dkd_styles.dkd_shipmentMetricPulseWrap,
        dkd_is_active_value && {
          opacity: dkd_opacity_value,
          transform: [{ scale: dkd_scale_value }],
        },
      ]}
    >
      <View
        style={[
          dkd_styles.dkd_shipmentMetricIconWrap,
          dkd_styles.dkd_shipmentMetricIconWrapTracking,
          { borderColor: dkd_theme_value.dkd_border_color },
        ]}
      >
        <LinearGradient
          colors={dkd_theme_value.dkd_icon_surface_colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <MaterialCommunityIcons
          name={dkd_is_active_value ? 'cursor-default-click-outline' : 'lock-outline'}
          size={20}
          color={dkd_theme_value.dkd_icon_color}
        />
      </View>
    </Animated.View>
  );
}

function dkd_timeline_done_value(dkd_shipment_value, dkd_step_value) {
  const dkd_status_key_value = String(dkd_shipment_value?.status || 'open').toLowerCase();
  if (dkd_step_value === 'created') return true;
  if (dkd_step_value === 'accepted') return ['accepted', 'picked_up', 'completed'].includes(dkd_status_key_value);
  if (dkd_step_value === 'picked_up') return ['picked_up', 'completed'].includes(dkd_status_key_value);
  if (dkd_step_value === 'completed') return dkd_status_key_value === 'completed';
  return false;
}

const DkdTrackingPulseIcon = dkd_tracking_pulse_icon;


function dkd_tracking_action_chip({ dkd_is_active_value, dkd_disabled_value, dkd_on_press_value }) {
  const dkd_pulse_anim_value = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!dkd_is_active_value) {
      dkd_pulse_anim_value.stopAnimation();
      dkd_pulse_anim_value.setValue(1);
      return undefined;
    }

    const dkd_loop_value = Animated.loop(
      Animated.sequence([
        Animated.timing(dkd_pulse_anim_value, {
          toValue: 0,
          duration: 720,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(dkd_pulse_anim_value, {
          toValue: 1,
          duration: 720,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    dkd_loop_value.start();
    return () => dkd_loop_value.stop();
  }, [dkd_is_active_value, dkd_pulse_anim_value]);

  const dkd_scale_value = dkd_pulse_anim_value.interpolate({
    inputRange: [0, 1],
    outputRange: [0.97, 1.02],
  });
  const dkd_opacity_value = dkd_pulse_anim_value.interpolate({
    inputRange: [0, 1],
    outputRange: [0.72, 1],
  });

  return (
    <Pressable
      onPress={dkd_on_press_value}
      disabled={dkd_disabled_value}
      style={({ pressed: dkd_pressed_value }) => [
        dkd_styles.dkd_shipmentActionChipWrap,
        dkd_disabled_value && dkd_styles.dkd_shipmentActionChipWrapDisabled,
        dkd_pressed_value && !dkd_disabled_value && dkd_styles.dkd_shipmentActionChipWrapPressed,
      ]}
    >
      <Animated.View
        style={[
          dkd_styles.dkd_shipmentActionChip,
          dkd_is_active_value && {
            opacity: dkd_opacity_value,
            transform: [{ scale: dkd_scale_value }],
          },
          dkd_disabled_value && dkd_styles.dkd_shipmentActionChipDisabled,
        ]}
      >
        {dkd_is_active_value ? (
          <LinearGradient colors={['rgba(77,255,228,0.24)', 'rgba(50,154,255,0.26)']} style={StyleSheet.absoluteFill} />
        ) : null}
        <View style={dkd_styles.dkd_shipmentActionIconWrap}>
          <MaterialCommunityIcons name={dkd_is_active_value ? 'radar' : 'clock-outline'} size={15} color="#FFFFFF" />
        </View>
        <Text style={[dkd_styles.dkd_shipmentActionChipText, dkd_is_active_value && dkd_styles.dkd_shipmentActionChipTextActive]}>{dkd_is_active_value ? 'Kurye Takip' : 'Takip Bekleniyor'}</Text>
        {dkd_is_active_value ? (
          <Animated.View
            style={[
              dkd_styles.dkd_shipmentActionPulseDot,
              {
                opacity: dkd_opacity_value,
                transform: [{ scale: dkd_scale_value }],
              },
            ]}
          />
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

const DkdTrackingActionChip = dkd_tracking_action_chip;

async function dkd_pick_package_image() {
  const dkd_permission_value = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (dkd_permission_value?.status !== 'granted') {
    throw new Error('Paket görseli seçmek için galeri izni gerekli.');
  }
  const dkd_result_value = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.82,
  });
  if (dkd_result_value?.canceled) return '';
  return dkd_result_value?.assets?.[0]?.uri || '';
}

async function dkd_reverse_geocode_pickup_address(dkd_location_value) {
  const dkd_lat_value = dkd_safe_number(dkd_location_value?.lat);
  const dkd_lng_value = dkd_safe_number(dkd_location_value?.lng);
  if (dkd_lat_value == null || dkd_lng_value == null) return '';
  try {
    const dkd_permission_value = await Location.requestForegroundPermissionsAsync();
    if (dkd_permission_value?.status !== 'granted') {
      return `${dkd_lat_value.toFixed(5)}, ${dkd_lng_value.toFixed(5)}`;
    }
    const dkd_rows_value = await Location.reverseGeocodeAsync({ latitude: dkd_lat_value, longitude: dkd_lng_value });
    const dkd_row_value = Array.isArray(dkd_rows_value) ? dkd_rows_value[0] : null;
    const dkd_address_value = [
      dkd_row_value?.district,
      dkd_row_value?.street,
      dkd_row_value?.streetNumber,
      dkd_row_value?.city,
    ].filter(Boolean).join(', ').trim();
    return dkd_address_value || `${dkd_lat_value.toFixed(5)}, ${dkd_lng_value.toFixed(5)}`;
  } catch (dkd_unused_error_value) {
    return `${dkd_lat_value.toFixed(5)}, ${dkd_lng_value.toFixed(5)}`;
  }
}


function dkd_round_money_value(dkd_value) {
  const dkd_numeric_value = Number(dkd_value || 0);
  if (!Number.isFinite(dkd_numeric_value)) return 0;
  return Math.round(dkd_numeric_value * 100) / 100;
}

function dkd_format_money_value(dkd_value) {
  return `₺${dkd_round_money_value(dkd_value).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dkd_format_km_value(dkd_value) {
  const dkd_numeric_value = dkd_safe_number(dkd_value);
  if (dkd_numeric_value == null) return '-';
  return `${dkd_numeric_value.toLocaleString('tr-TR', { minimumFractionDigits: dkd_numeric_value < 10 ? 1 : 0, maximumFractionDigits: 1 })} km`;
}

function dkd_haversine_km_between(dkd_lat_1_value, dkd_lng_1_value, dkd_lat_2_value, dkd_lng_2_value) {
  const dkd_start_lat_value = dkd_safe_number(dkd_lat_1_value);
  const dkd_start_lng_value = dkd_safe_number(dkd_lng_1_value);
  const dkd_end_lat_value = dkd_safe_number(dkd_lat_2_value);
  const dkd_end_lng_value = dkd_safe_number(dkd_lng_2_value);
  if (dkd_start_lat_value == null || dkd_start_lng_value == null || dkd_end_lat_value == null || dkd_end_lng_value == null) return null;
  const dkd_radian_value = (dkd_degree_value) => (dkd_degree_value * Math.PI) / 180;
  const dkd_delta_lat_value = dkd_radian_value(dkd_end_lat_value - dkd_start_lat_value);
  const dkd_delta_lng_value = dkd_radian_value(dkd_end_lng_value - dkd_start_lng_value);
  const dkd_a_value = Math.sin(dkd_delta_lat_value / 2) ** 2
    + Math.cos(dkd_radian_value(dkd_start_lat_value))
    * Math.cos(dkd_radian_value(dkd_end_lat_value))
    * Math.sin(dkd_delta_lng_value / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(dkd_a_value), Math.sqrt(1 - dkd_a_value));
}

function dkd_customer_charge_from_courier_fee(dkd_courier_fee_tl_value) {
  return dkd_round_money_value(Math.max(0, Number(dkd_courier_fee_tl_value || 0)));
}

function dkd_contains_explicit_city_value(dkd_address_text_value) {
  const dkd_lower_value = String(dkd_address_text_value || '').toLocaleLowerCase('tr-TR');
  return dkd_city_keyword_list_value.some((dkd_city_value) => dkd_lower_value.includes(dkd_city_value));
}

function dkd_build_address_queries(dkd_address_text_value) {
  const dkd_clean_value = String(dkd_address_text_value || '').trim();
  if (!dkd_clean_value) return [];
  const dkd_query_list_value = [dkd_clean_value];
  if (!(new RegExp('turkiye|türkiye', 'i')).test(dkd_clean_value)) {
    dkd_query_list_value.push(`${dkd_clean_value}, Türkiye`);
  }
  return [...new Set(dkd_query_list_value.filter(Boolean))];
}

function dkd_address_match_score_value(dkd_query_text_value, dkd_row_value) {
  const dkd_query_token_list_value = String(dkd_query_text_value || '')
    .toLocaleLowerCase('tr-TR')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((dkd_token_value) => dkd_token_value.length >= 3);
  const dkd_target_text_value = [
    dkd_row_value?.name,
    dkd_row_value?.street,
    dkd_row_value?.streetNumber,
    dkd_row_value?.district,
    dkd_row_value?.subregion,
    dkd_row_value?.region,
    dkd_row_value?.city,
    dkd_row_value?.postalCode,
    dkd_row_value?.country,
  ].filter(Boolean).join(' ').toLocaleLowerCase('tr-TR');
  let dkd_score_value = 0;
  dkd_query_token_list_value.forEach((dkd_token_value) => {
    if (dkd_target_text_value.includes(dkd_token_value)) dkd_score_value += Math.min(6, dkd_token_value.length);
  });
  return dkd_score_value;
}

async function dkd_geocode_text_address(dkd_address_text_value) {
  const dkd_query_list_value = dkd_build_address_queries(dkd_address_text_value);
  let dkd_best_match_value = null;
  for (const dkd_query_value of dkd_query_list_value) {
    const dkd_rows_value = await Location.geocodeAsync(dkd_query_value).catch(() => []);
    const dkd_row_list_value = Array.isArray(dkd_rows_value) ? dkd_rows_value : [];
    dkd_row_list_value.forEach((dkd_row_value) => {
      const dkd_candidate_value = {
        dkd_lat: Number(dkd_row_value.latitude),
        dkd_lng: Number(dkd_row_value.longitude),
        dkd_score: dkd_address_match_score_value(dkd_query_value, dkd_row_value),
      };
      if (!dkd_best_match_value || dkd_candidate_value.dkd_score > dkd_best_match_value.dkd_score) {
        dkd_best_match_value = dkd_candidate_value;
      }
    });
    if (dkd_best_match_value?.dkd_score >= 12) break;
  }
  return dkd_best_match_value ? { dkd_lat: dkd_best_match_value.dkd_lat, dkd_lng: dkd_best_match_value.dkd_lng } : null;
}

function dkd_hash_text_value(dkd_text_value) {
  const dkd_input_value = String(dkd_text_value || 'cargo-seed');
  let dkd_hash_value = 0;
  for (let dkd_index_value = 0; dkd_index_value < dkd_input_value.length; dkd_index_value += 1) {
    dkd_hash_value = ((dkd_hash_value << 5) - dkd_hash_value) + dkd_input_value.charCodeAt(dkd_index_value);
    dkd_hash_value |= 0;
  }
  return Math.abs(dkd_hash_value);
}

function dkd_cargo_pickup_fee_from_distance_km(dkd_distance_km_value) {
  const dkd_numeric_km_value = dkd_safe_number(dkd_distance_km_value) ?? 0;
  if (dkd_numeric_km_value <= 0.1) return 50;
  if (dkd_numeric_km_value <= 2) return 100;
  return 120;
}

function dkd_cargo_delivery_seed_value(dkd_pickup_address_text_value, dkd_delivery_address_text_value) {
  return [String(dkd_pickup_address_text_value || '').trim(), String(dkd_delivery_address_text_value || '').trim()].filter(Boolean).join('|') || 'cargo-delivery';
}

function dkd_cargo_delivery_fee_from_seed(dkd_seed_value) {
  const dkd_hash_value = dkd_hash_text_value(dkd_seed_value);
  return 40 + (dkd_hash_value % 31);
}

function dkd_cargo_delivery_fee_from_distance_km(dkd_distance_km_value, dkd_seed_value = 'cargo-delivery') {
  return dkd_cargo_delivery_fee_from_seed(dkd_seed_value);
}

function dkd_cargo_total_fee_from_distance_km(dkd_pickup_distance_km_value, dkd_delivery_distance_km_value, dkd_seed_value = 'cargo-delivery') {
  return dkd_round_money_value(
    dkd_cargo_pickup_fee_from_distance_km(dkd_pickup_distance_km_value)
    + dkd_cargo_delivery_fee_from_distance_km(dkd_delivery_distance_km_value, dkd_seed_value)
  );
}

async function dkd_build_payment_preview(dkd_form_value, dkd_current_location_value) {
  const dkd_pickup_address_text_value = String(dkd_form_value?.dkd_pickup_address_text || '').trim();
  const dkd_delivery_address_text_value = String(dkd_form_value?.dkd_delivery_address_text || '').trim();
  const dkd_pickup_geo_value = await dkd_geocode_text_address(dkd_pickup_address_text_value).catch(() => null);
  const dkd_delivery_geo_value = await dkd_geocode_text_address(dkd_delivery_address_text_value).catch(() => null);
  const dkd_pickup_lat_value = dkd_safe_number(dkd_pickup_geo_value?.dkd_lat) ?? dkd_safe_number(dkd_current_location_value?.lat);
  const dkd_pickup_lng_value = dkd_safe_number(dkd_pickup_geo_value?.dkd_lng) ?? dkd_safe_number(dkd_current_location_value?.lng);
  const dkd_dropoff_lat_value = dkd_safe_number(dkd_delivery_geo_value?.dkd_lat);
  const dkd_dropoff_lng_value = dkd_safe_number(dkd_delivery_geo_value?.dkd_lng);

  if (dkd_pickup_lat_value == null || dkd_pickup_lng_value == null) {
    throw new Error('Gönderici adresi konumu alınamadı. Adresi biraz daha açık yazar mısın?');
  }
  if (dkd_dropoff_lat_value == null || dkd_dropoff_lng_value == null) {
    throw new Error('Teslimat adresi konumu alınamadı. Adresi biraz daha açık yazar mısın?');
  }

  const dkd_pickup_distance_km_value = dkd_haversine_km_between(
    dkd_safe_number(dkd_current_location_value?.lat) ?? dkd_pickup_lat_value,
    dkd_safe_number(dkd_current_location_value?.lng) ?? dkd_pickup_lng_value,
    dkd_pickup_lat_value,
    dkd_pickup_lng_value,
  ) || 0;
  const dkd_delivery_distance_km_value = dkd_haversine_km_between(
    dkd_pickup_lat_value,
    dkd_pickup_lng_value,
    dkd_dropoff_lat_value,
    dkd_dropoff_lng_value,
  ) || 0;
  const dkd_fee_seed_value = dkd_cargo_delivery_seed_value(dkd_pickup_address_text_value, dkd_delivery_address_text_value);
  const dkd_courier_fee_tl_value = dkd_cargo_total_fee_from_distance_km(dkd_pickup_distance_km_value, dkd_delivery_distance_km_value, dkd_fee_seed_value);
  const dkd_customer_charge_tl_value = dkd_customer_charge_from_courier_fee(dkd_courier_fee_tl_value);
  const dkd_service_fee_tl_value = 0;

  return {
    dkd_pickup_lat: dkd_pickup_lat_value,
    dkd_pickup_lng: dkd_pickup_lng_value,
    dkd_dropoff_lat: dkd_dropoff_lat_value,
    dkd_dropoff_lng: dkd_dropoff_lng_value,
    dkd_pickup_distance_km: dkd_pickup_distance_km_value,
    dkd_delivery_distance_km: dkd_delivery_distance_km_value,
    dkd_courier_fee_tl: dkd_courier_fee_tl_value,
    dkd_customer_charge_tl: dkd_customer_charge_tl_value,
    dkd_service_fee_tl: dkd_service_fee_tl_value,
  };
}

function dkd_form_ready(dkd_form_value) {
  return !!(
    String(dkd_form_value?.dkd_customer_first_name || '').trim() &&
    String(dkd_form_value?.dkd_customer_last_name || '').trim() &&
    dkd_normalize_digits(dkd_form_value?.dkd_customer_national_id, 11).length === 11 &&
    dkd_is_valid_turkiye_phone_value(dkd_form_value?.dkd_customer_phone_text) &&
    String(dkd_form_value?.dkd_pickup_address_text || '').trim().length >= 10 &&
    String(dkd_form_value?.dkd_delivery_address_text || '').trim().length >= 10 &&
    String(dkd_form_value?.dkd_package_content_text || '').trim().length >= 2 &&
    (dkd_safe_number(dkd_form_value?.dkd_package_weight_kg) ?? 0) > 0
  );
}

function DkdFieldLabel({ children, dkd_required_value = false }) {
  return (
    <Text style={dkd_styles.dkd_fieldLabel}>
      {children}
      {dkd_required_value ? <Text style={dkd_styles.dkd_fieldRequired}> *</Text> : null}
    </Text>
  );
}

function DkdFieldInput({ dkd_value, dkd_on_change_value, dkd_placeholder_value, dkd_multiline_value = false, dkd_keyboard_type_value = 'default', dkd_max_length_value = 200 }) {
  return (
    <TextInput
      value={dkd_value}
      onChangeText={dkd_on_change_value}
      placeholder={dkd_placeholder_value}
      placeholderTextColor="rgba(231,241,255,0.38)"
      keyboardType={dkd_keyboard_type_value}
      multiline={dkd_multiline_value}
      maxLength={dkd_max_length_value}
      style={[dkd_styles.dkd_fieldInput, dkd_multiline_value && dkd_styles.dkd_fieldInputMultiline]}
    />
  );
}

export default function DkdCargoSenderPanel({
  dkd_visible_value,
  dkd_panel_mode_value = 'full',
  dkd_current_location_value,
  dkd_wallet_tl_value = 0,
  dkd_on_wallet_after_payment_value,
  dkd_on_created_value,
}) {
  const [dkd_form_value, setDkdFormValue] = useState(() => dkd_default_form_state());
  const [dkd_submitting_value, setDkdSubmittingValue] = useState(false);
  const [dkd_loading_value, setDkdLoadingValue] = useState(false);
  const [dkd_location_syncing_value, setDkdLocationSyncingValue] = useState(false);
  const [dkd_shipments_value, setDkdShipmentsValue] = useState([]);
  const [dkd_shipment_filter_value, setDkdShipmentFilterValue] = useState('waiting');
  const [dkd_payment_modal_visible_value, setDkdPaymentModalVisibleValue] = useState(false);
  const [dkd_payment_loading_value, setDkdPaymentLoadingValue] = useState(false);
  const [dkd_payment_preview_value, setDkdPaymentPreviewValue] = useState(null);
  const [dkd_live_map_visible_value, setDkdLiveMapVisibleValue] = useState(false);
  const [dkd_live_map_shipment_id_value, setDkdLiveMapShipmentIdValue] = useState(null);
  const dkd_initial_filter_pending_ref_value = useRef(true);

  const dkd_set_form_field = useCallback((dkd_key_value, dkd_next_value) => {
    setDkdFormValue((dkd_previous_value) => ({ ...dkd_previous_value, [dkd_key_value]: dkd_next_value }));
  }, []);

  const dkd_load_shipments = useCallback(async ({ dkd_apply_initial_filter_value = false, dkd_silent_value = false } = {}) => {
    if (!dkd_silent_value) setDkdLoadingValue(true);
    try {
      const { data: dkd_data_value, error: dkd_error_value } = await dkd_fetch_my_cargo_shipments();
      if (dkd_error_value) throw dkd_error_value;
      const dkd_next_shipments_value = Array.isArray(dkd_data_value) ? dkd_data_value : [];
      setDkdShipmentsValue(dkd_next_shipments_value);
      if (dkd_apply_initial_filter_value || dkd_initial_filter_pending_ref_value.current) {
        const dkd_has_active_value = dkd_next_shipments_value.some((dkd_shipment_value) => ['accepted', 'picked_up'].includes(String(dkd_shipment_value?.status || '').toLowerCase()));
        setDkdShipmentFilterValue(dkd_has_active_value ? 'active' : 'waiting');
        dkd_initial_filter_pending_ref_value.current = false;
      }
    } catch (dkd_error_value) {
      if (!dkd_silent_value) {
        Alert.alert('Kargo', dkd_error_value?.message || 'Kargo gönderileri yüklenemedi.');
      }
    } finally {
      if (!dkd_silent_value) setDkdLoadingValue(false);
    }
  }, []);

  useEffect(() => {
    if (!dkd_visible_value) {
      dkd_initial_filter_pending_ref_value.current = true;
      return;
    }
    dkd_load_shipments({ dkd_apply_initial_filter_value: true });
    const dkd_interval_value = setInterval(() => {
      dkd_load_shipments({ dkd_silent_value: true });
    }, 45000);
    return () => clearInterval(dkd_interval_value);
  }, [dkd_visible_value, dkd_load_shipments]);

  useEffect(() => {
    if (!dkd_visible_value) return;
    if (String(dkd_form_value?.dkd_pickup_address_text || '').trim().length >= 10) return;
    if (dkd_safe_number(dkd_current_location_value?.lat) == null || dkd_safe_number(dkd_current_location_value?.lng) == null) return;
    let dkd_ignore_value = false;
    setDkdLocationSyncingValue(true);
    dkd_reverse_geocode_pickup_address(dkd_current_location_value)
      .then((dkd_address_value) => {
        if (dkd_ignore_value || !dkd_address_value) return;
        setDkdFormValue((dkd_previous_value) => ({
          ...dkd_previous_value,
          dkd_pickup_address_text: String(dkd_previous_value?.dkd_pickup_address_text || '').trim().length >= 10
            ? dkd_previous_value.dkd_pickup_address_text
            : dkd_address_value,
        }));
      })
      .finally(() => {
        if (!dkd_ignore_value) setDkdLocationSyncingValue(false);
      });
    return () => {
      dkd_ignore_value = true;
    };
  }, [dkd_current_location_value?.lat, dkd_current_location_value?.lng, dkd_form_value?.dkd_pickup_address_text, dkd_visible_value]);

  const dkd_shipment_count_map_value = useMemo(() => ({
    waiting: dkd_shipments_value.filter((dkd_shipment_value) => String(dkd_shipment_value?.status || 'open').toLowerCase() === 'open').length,
    active: dkd_shipments_value.filter((dkd_shipment_value) => ['accepted', 'picked_up'].includes(String(dkd_shipment_value?.status || '').toLowerCase())).length,
    completed: dkd_shipments_value.filter((dkd_shipment_value) => String(dkd_shipment_value?.status || '').toLowerCase() === 'completed').length,
    all: dkd_shipments_value.length,
  }), [dkd_shipments_value]);

  const dkd_sorted_shipments_value = useMemo(() => {
    const dkd_sorted_value = [...dkd_shipments_value].sort((dkd_left_value, dkd_right_value) => {
      const dkd_left_time_value = new Date(dkd_left_value?.created_at || 0).getTime();
      const dkd_right_time_value = new Date(dkd_right_value?.created_at || 0).getTime();
      return dkd_right_time_value - dkd_left_time_value;
    });
    if (dkd_shipment_filter_value === 'waiting') return dkd_sorted_value.filter((dkd_shipment_value) => String(dkd_shipment_value?.status || 'open').toLowerCase() === 'open');
    if (dkd_shipment_filter_value === 'active') return dkd_sorted_value.filter((dkd_shipment_value) => ['accepted', 'picked_up'].includes(String(dkd_shipment_value?.status || '').toLowerCase()));
    if (dkd_shipment_filter_value === 'completed') return dkd_sorted_value.filter((dkd_shipment_value) => String(dkd_shipment_value?.status || '').toLowerCase() === 'completed');
    return dkd_sorted_value;
  }, [dkd_shipment_filter_value, dkd_shipments_value]);

  const dkd_live_map_shipment_value = useMemo(() => dkd_shipments_value.find((dkd_shipment_value) => String(dkd_shipment_value?.id || '') === String(dkd_live_map_shipment_id_value || '')) || null, [dkd_live_map_shipment_id_value, dkd_shipments_value]);

  const dkd_show_create_panel_value = dkd_panel_mode_value !== 'shipments_only';
  const dkd_show_shipments_panel_value = dkd_panel_mode_value !== 'create_only';

  useEffect(() => {
    if (!dkd_live_map_visible_value || !dkd_live_map_shipment_id_value) return;
    const dkd_interval_value = setInterval(() => {
      dkd_load_shipments({ dkd_silent_value: true });
    }, 4000);
    return () => clearInterval(dkd_interval_value);
  }, [dkd_live_map_shipment_id_value, dkd_live_map_visible_value, dkd_load_shipments]);

  const dkd_open_live_map_value = useCallback((dkd_shipment_id_value) => {
    if (!dkd_shipment_id_value) return;
    setDkdLiveMapShipmentIdValue(dkd_shipment_id_value);
    setDkdLiveMapVisibleValue(true);
  }, []);

  const dkd_close_live_map_value = useCallback(() => {
    setDkdLiveMapVisibleValue(false);
  }, []);

  const dkd_choose_image = useCallback(async () => {
    try {
      const dkd_uri_value = await dkd_pick_package_image();
      if (!dkd_uri_value) return;
      dkd_set_form_field('dkd_package_image_uri', dkd_uri_value);
    } catch (dkd_error_value) {
      Alert.alert('Kargo', dkd_error_value?.message || 'Paket görseli seçilemedi.');
    }
  }, [dkd_set_form_field]);

  const dkd_open_payment_modal = useCallback(async () => {
    if (!dkd_form_ready(dkd_form_value)) {
      Alert.alert('Kargo', 'Ad, soyad, TC, telefon, gönderici adresi, teslimat adresi, paket içeriği ve ağırlık alanlarını tamamla.');
      return;
    }

    setDkdPaymentLoadingValue(true);
    try {
      const dkd_preview_value = await dkd_build_payment_preview(dkd_form_value, dkd_current_location_value);
      setDkdPaymentPreviewValue(dkd_preview_value);
      setDkdPaymentModalVisibleValue(true);
    } catch (dkd_error_value) {
      Alert.alert('Kargo', dkd_error_value?.message || 'Ödeme özeti hazırlanamadı.');
    } finally {
      setDkdPaymentLoadingValue(false);
    }
  }, [dkd_current_location_value, dkd_form_value]);

  const dkd_submit_cargo_request = useCallback(async () => {
    const dkd_preview_value = dkd_payment_preview_value || await dkd_build_payment_preview(dkd_form_value, dkd_current_location_value);
    const dkd_wallet_before_value = dkd_round_money_value(dkd_wallet_tl_value);

    if (dkd_wallet_before_value < dkd_preview_value.dkd_customer_charge_tl) {
      Alert.alert('Kargo', 'Cüzdanında yeterli TL yok. Önce ana cüzdana bakiye eklemelisin.');
      return;
    }

    setDkdSubmittingValue(true);
    try {
      let dkd_package_image_url_value = '';
      if (String(dkd_form_value?.dkd_package_image_uri || '').trim()) {
        const { data: dkd_upload_data_value } = await dkd_upload_cargo_package_art({
          dkd_image_uri: dkd_form_value.dkd_package_image_uri,
          dkd_sender_slug: `${dkd_form_value.dkd_customer_first_name}-${dkd_form_value.dkd_customer_last_name}`,
          dkd_content_label: dkd_form_value.dkd_package_content_text,
        });
        dkd_package_image_url_value = dkd_upload_data_value?.publicUrl || '';
      }

      const dkd_payload_value = {
        dkd_customer_first_name: dkd_form_value.dkd_customer_first_name,
        dkd_customer_last_name: dkd_form_value.dkd_customer_last_name,
        dkd_customer_national_id: dkd_form_value.dkd_customer_national_id,
        dkd_customer_phone_text: dkd_form_value.dkd_customer_phone_text,
        dkd_pickup_address_text: dkd_form_value.dkd_pickup_address_text,
        dkd_delivery_address_text: dkd_form_value.dkd_delivery_address_text,
        dkd_delivery_note_text: dkd_form_value.dkd_delivery_note_text,
        dkd_package_content_text: dkd_form_value.dkd_package_content_text,
        dkd_package_image_url: dkd_package_image_url_value,
        dkd_package_weight_kg: dkd_form_value.dkd_package_weight_kg,
        dkd_pickup_lat: dkd_preview_value.dkd_pickup_lat,
        dkd_pickup_lng: dkd_preview_value.dkd_pickup_lng,
        dkd_dropoff_lat: dkd_preview_value.dkd_dropoff_lat,
        dkd_dropoff_lng: dkd_preview_value.dkd_dropoff_lng,
        dkd_pickup_distance_km: dkd_preview_value.dkd_pickup_distance_km,
        dkd_delivery_distance_km: dkd_preview_value.dkd_delivery_distance_km,
        dkd_courier_fee_tl: dkd_preview_value.dkd_courier_fee_tl,
        dkd_customer_charge_tl: dkd_preview_value.dkd_customer_charge_tl,
      };

      const { data: dkd_create_data_value, error: dkd_error_value } = await dkd_create_cargo_shipment(dkd_payload_value);
      if (dkd_error_value) throw dkd_error_value;

      const dkd_wallet_after_value = Number(dkd_create_data_value?.wallet_tl ?? (dkd_wallet_before_value - dkd_preview_value.dkd_customer_charge_tl));
      dkd_on_wallet_after_payment_value?.(dkd_wallet_after_value);
      setDkdPaymentModalVisibleValue(false);
      setDkdPaymentPreviewValue(null);
      setDkdFormValue(dkd_default_form_state());
      await dkd_load_shipments();
      dkd_on_created_value?.();
      Alert.alert('Kargo', `Ödeme alındı ve sipariş kurye havuzuna düştü. Alım tutarı ${dkd_format_money_value(dkd_preview_value.dkd_courier_fee_tl)} • toplam ${dkd_format_money_value(dkd_preview_value.dkd_customer_charge_tl)}.`);
    } catch (dkd_error_value) {
      const dkd_message_value = String(dkd_error_value?.message || '');
      if (dkd_message_value.includes('wallet_insufficient')) {
        Alert.alert('Kargo', 'Cüzdanında yeterli TL yok. Önce ana cüzdana bakiye eklemelisin.');
      } else {
        Alert.alert('Kargo', dkd_message_value || 'Kargo siparişi oluşturulamadı.');
      }
    } finally {
      setDkdSubmittingValue(false);
    }
  }, [dkd_current_location_value, dkd_form_value, dkd_load_shipments, dkd_on_created_value, dkd_on_wallet_after_payment_value, dkd_payment_preview_value, dkd_wallet_tl_value]);

  return (
    <View>
      {dkd_show_create_panel_value ? (
      <View style={dkd_styles.dkd_panelCard}>
        <LinearGradient colors={['rgba(97,216,255,0.12)', 'rgba(181,124,255,0.08)', 'rgba(82,242,161,0.06)']} style={StyleSheet.absoluteFill} />
        <View style={dkd_styles.dkd_panelHead}>
          <View style={dkd_styles.dkd_panelHeadCopy}>
            <Text style={dkd_styles.dkd_panelTitle}>Kargo Oluştur</Text>
            <Text style={dkd_styles.dkd_panelSub}>Gönderici, teslimat ve paket detaylarını gir. Teslimat adresi yazdığın gibi çözümlenir ve rota ona göre oluşturulur.</Text>
          </View>
          <View style={dkd_styles.dkd_panelBadge}>
            <MaterialCommunityIcons name="cube-send" size={16} color={dkd_colors.cyanSoft} />
            <Text numberOfLines={1} style={dkd_styles.dkd_panelBadgeText}>Yeni Sipariş</Text>
          </View>
        </View>

        <View style={dkd_styles.dkd_fieldRow}>
          <View style={dkd_styles.dkd_fieldCol}>
            <DkdFieldLabel dkd_required_value>Gönderici Adı</DkdFieldLabel>
            <DkdFieldInput dkd_value={dkd_form_value.dkd_customer_first_name} dkd_on_change_value={(dkd_next_value) => dkd_set_form_field('dkd_customer_first_name', dkd_next_value)} dkd_placeholder_value="Ad" dkd_max_length_value={32} />
          </View>
          <View style={dkd_styles.dkd_fieldCol}>
            <DkdFieldLabel dkd_required_value>Gönderici Soyadı</DkdFieldLabel>
            <DkdFieldInput dkd_value={dkd_form_value.dkd_customer_last_name} dkd_on_change_value={(dkd_next_value) => dkd_set_form_field('dkd_customer_last_name', dkd_next_value)} dkd_placeholder_value="Soyad" dkd_max_length_value={32} />
          </View>
        </View>

        <DkdFieldLabel dkd_required_value>TC Kimlik No</DkdFieldLabel>
        <DkdFieldInput dkd_value={dkd_form_value.dkd_customer_national_id} dkd_on_change_value={(dkd_next_value) => dkd_set_form_field('dkd_customer_national_id', dkd_normalize_digits(dkd_next_value, 11))} dkd_placeholder_value="11 haneli TC" dkd_keyboard_type_value="number-pad" dkd_max_length_value={11} />

        <DkdFieldLabel dkd_required_value>Telefon No</DkdFieldLabel>
        <DkdFieldInput dkd_value={dkd_form_value.dkd_customer_phone_text} dkd_on_change_value={(dkd_next_value) => dkd_set_form_field('dkd_customer_phone_text', dkd_normalize_turkiye_phone_input_value(dkd_next_value))} dkd_placeholder_value="+90 5xx xxx xx xx" dkd_keyboard_type_value="phone-pad" dkd_max_length_value={15} />

        <DkdFieldLabel dkd_required_value>Gönderici Adresi</DkdFieldLabel>
        <DkdFieldInput dkd_value={dkd_form_value.dkd_pickup_address_text} dkd_on_change_value={(dkd_next_value) => dkd_set_form_field('dkd_pickup_address_text', dkd_next_value)} dkd_placeholder_value="Mahalle, cadde, sokak, apartman ve ek açıklama" dkd_multiline_value dkd_max_length_value={220} />
        <Text style={dkd_styles.dkd_locationHintText}>
          {dkd_location_syncing_value
            ? 'Müşteri konumu otomatik okunuyor…'
            : (dkd_safe_number(dkd_current_location_value?.lat) != null && dkd_safe_number(dkd_current_location_value?.lng) != null
              ? 'Müşteri konumu otomatik alındı. Gerekirse adresi düzenleyebilirsin.'
              : 'Konum izni verilirse müşteri adresi otomatik doldurulur.')}
        </Text>

        <DkdFieldLabel dkd_required_value>Teslimat Adresi</DkdFieldLabel>
        <DkdFieldInput dkd_value={dkd_form_value.dkd_delivery_address_text} dkd_on_change_value={(dkd_next_value) => dkd_set_form_field('dkd_delivery_address_text', dkd_next_value)} dkd_placeholder_value="Teslim edilecek açık adres" dkd_multiline_value dkd_max_length_value={220} />
        <Text style={dkd_styles.dkd_locationHintText}>
          {dkd_location_syncing_value
            ? 'Teslimat adresi yazıldığı gibi çözümleniyor…'
            : (dkd_safe_number(dkd_current_location_value?.lat) != null && dkd_safe_number(dkd_current_location_value?.lng) != null
              ? 'Teslimat adresi otomatik doldurulmaz. Açık adresi tam yaz, rota ona göre kurulsun.'
              : 'Teslimat için açık adresi manuel gir. İlçe, il ve gerekiyorsa bina bilgisini ekle.')}
        </Text>

        <DkdFieldLabel>Not</DkdFieldLabel>
        <DkdFieldInput dkd_value={dkd_form_value.dkd_delivery_note_text} dkd_on_change_value={(dkd_next_value) => dkd_set_form_field('dkd_delivery_note_text', dkd_next_value)} dkd_placeholder_value="Kurye için ek teslimat notu" dkd_multiline_value dkd_max_length_value={180} />

        <DkdFieldLabel dkd_required_value>Paket İçeriği</DkdFieldLabel>
        <DkdFieldInput dkd_value={dkd_form_value.dkd_package_content_text} dkd_on_change_value={(dkd_next_value) => dkd_set_form_field('dkd_package_content_text', dkd_next_value)} dkd_placeholder_value="Örn: Evrak, kutu, elektronik aksesuar" dkd_multiline_value dkd_max_length_value={140} />

        <View style={dkd_styles.dkd_fieldRow}>
          <View style={dkd_styles.dkd_fieldCol}>
            <DkdFieldLabel dkd_required_value>Ortalama Ağırlık (kg)</DkdFieldLabel>
            <DkdFieldInput dkd_value={dkd_form_value.dkd_package_weight_kg} dkd_on_change_value={(dkd_next_value) => dkd_set_form_field('dkd_package_weight_kg', dkd_next_value.replace(/[^0-9.,]/g, '').replace(',', '.'))} dkd_placeholder_value="1.5" dkd_keyboard_type_value="decimal-pad" dkd_max_length_value={8} />
          </View>
          <View style={dkd_styles.dkd_fieldCol}>
            <DkdFieldLabel>Paket Görseli</DkdFieldLabel>
            <Pressable onPress={dkd_choose_image} style={dkd_styles.dkd_imagePickerCard}>
              {dkd_form_value.dkd_package_image_uri ? <Image source={{ uri: dkd_form_value.dkd_package_image_uri }} style={dkd_styles.dkd_imagePreview} resizeMode="cover" /> : null}
              <View style={dkd_styles.dkd_imageOverlay}>
                <MaterialCommunityIcons name={dkd_form_value.dkd_package_image_uri ? 'check-decagram' : 'camera-plus'} size={18} color={dkd_form_value.dkd_package_image_uri ? '#63F1B1' : '#DFF7FF'} />
                <Text style={dkd_styles.dkd_imageTitle}>{dkd_form_value.dkd_package_image_uri ? 'Görsel seçildi' : 'Görsel ekle'}</Text>
                <Text style={dkd_styles.dkd_imageSub}>Kurye detay ekranında görünür</Text>
              </View>
            </Pressable>
          </View>
        </View>

        <Pressable onPress={dkd_open_payment_modal} disabled={dkd_submitting_value || dkd_payment_loading_value} style={[dkd_styles.dkd_primaryAction, (dkd_submitting_value || dkd_payment_loading_value) && dkd_styles.dkd_actionDisabled]}>
          <LinearGradient colors={['#40D8FF', '#2A8DFF', '#0E1840']} style={StyleSheet.absoluteFill} />
          <Text style={dkd_styles.dkd_primaryActionText}>{dkd_payment_loading_value ? 'Ödeme özeti hazırlanıyor…' : 'Kargo Siparişi Ver'}</Text>
        </Pressable>
      </View>
      ) : null}

      {dkd_show_shipments_panel_value ? (
      <View style={dkd_styles.dkd_panelCard}>
        <View style={dkd_styles.dkd_panelHead}>
          <View>
            <Text style={dkd_styles.dkd_panelTitle}>Gönderilerim</Text>
            <Text style={dkd_styles.dkd_panelSub}>Kurye atanınca plaka, araç türü, kurye takip ve varış süresi burada görünür.</Text>
          </View>
          <Pressable onPress={dkd_load_shipments} style={dkd_styles.dkd_refreshChip}>
            <MaterialCommunityIcons name="refresh" size={16} color={dkd_colors.cyanSoft} />
            <Text style={dkd_styles.dkd_refreshChipText}>Yenile</Text>
          </Pressable>
        </View>

        <View style={dkd_styles.dkd_shipmentFilterRow}>
          <Pressable onPress={() => setDkdShipmentFilterValue('waiting')} style={[dkd_styles.dkd_shipmentFilterChip, dkd_shipment_filter_value === 'waiting' && dkd_styles.dkd_shipmentFilterChipActive]}><Text style={[dkd_styles.dkd_shipmentFilterChipText, dkd_shipment_filter_value === 'waiting' && dkd_styles.dkd_shipmentFilterChipTextActive]}>Bekleyen {dkd_shipment_count_map_value.waiting}</Text></Pressable>
          <Pressable onPress={() => setDkdShipmentFilterValue('active')} style={[dkd_styles.dkd_shipmentFilterChip, dkd_shipment_filter_value === 'active' && dkd_styles.dkd_shipmentFilterChipActive]}><Text style={[dkd_styles.dkd_shipmentFilterChipText, dkd_shipment_filter_value === 'active' && dkd_styles.dkd_shipmentFilterChipTextActive]}>Yolda {dkd_shipment_count_map_value.active}</Text></Pressable>
          <Pressable onPress={() => setDkdShipmentFilterValue('completed')} style={[dkd_styles.dkd_shipmentFilterChip, dkd_shipment_filter_value === 'completed' && dkd_styles.dkd_shipmentFilterChipActive]}><Text style={[dkd_styles.dkd_shipmentFilterChipText, dkd_shipment_filter_value === 'completed' && dkd_styles.dkd_shipmentFilterChipTextActive]}>Tamamlanan {dkd_shipment_count_map_value.completed}</Text></Pressable>
          <Pressable onPress={() => setDkdShipmentFilterValue('all')} style={[dkd_styles.dkd_shipmentFilterChip, dkd_shipment_filter_value === 'all' && dkd_styles.dkd_shipmentFilterChipActive]}><Text style={[dkd_styles.dkd_shipmentFilterChipText, dkd_shipment_filter_value === 'all' && dkd_styles.dkd_shipmentFilterChipTextActive]}>Tümü {dkd_shipment_count_map_value.all}</Text></Pressable>
        </View>

        {dkd_loading_value ? (
          <View style={dkd_styles.dkd_loaderWrap}><ActivityIndicator color="#fff" /></View>
        ) : dkd_sorted_shipments_value.length ? (
          <View style={dkd_styles.dkd_shipmentsList}>
            {dkd_sorted_shipments_value.map((dkd_shipment_value) => {
              const dkd_status_key_value = String(dkd_shipment_value?.status || 'open').toLowerCase();
              const dkd_show_live_value = ['accepted', 'picked_up', 'completed'].includes(dkd_status_key_value);
              const dkd_created_at_text_value = dkd_shipment_value?.created_at
                ? new Date(dkd_shipment_value.created_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : '-';
              const dkd_customer_name_text_value = [dkd_shipment_value?.customer_first_name, dkd_shipment_value?.customer_last_name].filter(Boolean).join(' ').trim() || 'Gönderici';
              const dkd_phone_ready_value = dkd_is_valid_turkiye_phone_value(dkd_shipment_value?.customer_phone_text);
              const dkd_phone_text_value = dkd_format_phone_display_value(dkd_shipment_value?.customer_phone_text);
              const dkd_timeline_step_list_value = [
                { dkd_key_value: 'created', dkd_label_value: 'Oluştu' },
                { dkd_key_value: 'accepted', dkd_label_value: 'Kurye Atandı' },
                { dkd_key_value: 'picked_up', dkd_label_value: 'Alındı' },
                { dkd_key_value: 'completed', dkd_label_value: 'Teslim' },
              ];
              return (
                <View key={String(dkd_shipment_value?.id)} style={dkd_styles.dkd_shipmentCard}>
                  <LinearGradient colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.03)']} style={StyleSheet.absoluteFill} />
                  <View style={dkd_styles.dkd_shipmentHead}>
                    <View style={dkd_styles.dkd_shipmentHeadLeft}>
                      <View style={dkd_styles.dkd_shipmentIconBubble}><MaterialCommunityIcons name="cube-send" size={18} color={dkd_colors.cyanSoft} /></View>
                      <View style={dkd_styles.dkd_shipmentHeadCopy}>
                        <Text style={dkd_styles.dkd_shipmentTitle}>Kargo #{String(dkd_shipment_value?.id || '-')}</Text>
                        <Text style={dkd_styles.dkd_shipmentDateText}>{dkd_created_at_text_value}</Text>
                      </View>
                    </View>
                    <View style={[dkd_styles.dkd_statusPill, dkd_status_tone_style(dkd_shipment_value?.status)]}>
                      <Text style={dkd_styles.dkd_statusPillText}>{dkd_format_status_label(dkd_shipment_value?.status)}</Text>
                    </View>
                  </View>

                  <View style={dkd_styles.dkd_shipmentTopMetrics}>
                    {[
                      {
                        dkd_metric_key_value: 'charge',
                        dkd_label_value: 'Tahsilat',
                        dkd_hide_label_value: true,
                        dkd_value_text: dkd_format_money_value(dkd_shipment_value?.customer_charge_tl || 0),
                        dkd_theme_value: dkd_shipment_metric_theme_value('charge', {}),
                      },
                      {
                        dkd_metric_key_value: 'payment',
                        dkd_label_value: 'Ödeme',
                        dkd_hide_label_value: true,
                        dkd_value_text: dkd_payment_status_label(dkd_shipment_value?.payment_status),
                        dkd_theme_value: dkd_shipment_metric_theme_value('payment', { dkd_status_key_value: dkd_shipment_value?.payment_status }),
                      },
                      {
                        dkd_metric_key_value: 'tracking',
                        dkd_label_value: 'Kurye Takip',
                        dkd_hide_label_value: true,
                        dkd_value_text: dkd_show_live_value ? 'Kurye Takip' : 'Takip Kilitli',
                        dkd_is_tracking_value: true,
                        dkd_is_pressable_value: !!dkd_show_live_value && !!dkd_shipment_value?.id,
                        dkd_press_handler_value: () => dkd_open_live_map_value(dkd_shipment_value?.id),
                        dkd_theme_value: dkd_shipment_metric_theme_value('tracking', { dkd_status_key_value: dkd_show_live_value ? 'live' : 'idle' }),
                      },
                    ].map((dkd_metric_value) => {
                      const dkd_is_pressable_metric_value = !!dkd_metric_value.dkd_is_pressable_value;
                      const dkd_is_tracking_metric_value = !!dkd_metric_value.dkd_is_tracking_value;
                      const dkd_metric_inner_node = (
                        <>
                          <LinearGradient colors={dkd_metric_value.dkd_theme_value.dkd_glow_colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={dkd_styles.dkd_shipmentMetricGlow} />
                          <LinearGradient colors={dkd_metric_value.dkd_theme_value.dkd_surface_colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={dkd_styles.dkd_shipmentMetricSurface} />
                          <View style={dkd_styles.dkd_shipmentMetricAccentOrb} />
                          <View style={dkd_styles.dkd_shipmentMetricHead}>
                            {dkd_is_tracking_metric_value ? (
                              <DkdTrackingPulseIcon
                                dkd_is_active_value={dkd_is_pressable_metric_value}
                                dkd_theme_value={dkd_metric_value.dkd_theme_value}
                              />
                            ) : (
                              <View style={[dkd_styles.dkd_shipmentMetricIconWrap, { borderColor: dkd_metric_value.dkd_theme_value.dkd_border_color }]}>
                                <LinearGradient colors={dkd_metric_value.dkd_theme_value.dkd_icon_surface_colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                                <MaterialCommunityIcons name={dkd_metric_value.dkd_theme_value.dkd_icon_name} size={18} color={dkd_metric_value.dkd_theme_value.dkd_icon_color} />
                              </View>
                            )}
                          </View>
                          {!dkd_metric_value.dkd_hide_label_value ? <Text style={dkd_styles.dkd_shipmentMetricLabel}>{dkd_metric_value.dkd_label_value}</Text> : null}
                          {dkd_metric_value.dkd_value_text ? (
                            <Text style={[dkd_styles.dkd_shipmentMetricValue, dkd_metric_value.dkd_hide_label_value && dkd_styles.dkd_shipmentMetricValueSolo]}>{dkd_metric_value.dkd_value_text}</Text>
                          ) : null}
                          {dkd_is_tracking_metric_value && dkd_is_pressable_metric_value ? (
                            <View style={dkd_styles.dkd_shipmentMetricTapCueRow}>
                              <MaterialCommunityIcons name="arrow-top-right" size={14} color="#FFFFFF" />
                            </View>
                          ) : null}
                        </>
                      );

                      if (dkd_is_pressable_metric_value) {
                        return (
                          <Pressable
                            key={dkd_metric_value.dkd_metric_key_value}
                            onPress={dkd_metric_value.dkd_press_handler_value}
                            style={({ pressed: dkd_pressed_value }) => [
                              dkd_styles.dkd_shipmentMetricBox,
                              dkd_styles.dkd_shipmentMetricBoxPressable,
                              { borderColor: dkd_metric_value.dkd_theme_value.dkd_border_color, shadowColor: dkd_metric_value.dkd_theme_value.dkd_shadow_color },
                              dkd_pressed_value && dkd_styles.dkd_shipmentMetricBoxPressed,
                            ]}
                          >
                            {dkd_metric_inner_node}
                          </Pressable>
                        );
                      }

                      return (
                        <View key={dkd_metric_value.dkd_metric_key_value} style={[dkd_styles.dkd_shipmentMetricBox, { borderColor: dkd_metric_value.dkd_theme_value.dkd_border_color, shadowColor: dkd_metric_value.dkd_theme_value.dkd_shadow_color }]}>
                          {dkd_metric_inner_node}
                        </View>
                      );
                    })}
                  </View>

                  <View style={dkd_styles.dkd_shipmentTimelineRow}>
                    {dkd_timeline_step_list_value.map((dkd_step_value, dkd_step_index_value) => {
                      const dkd_step_done_value = dkd_timeline_done_value(dkd_shipment_value, dkd_step_value.dkd_key_value);
                      return (
                        <View key={dkd_step_value.dkd_key_value} style={dkd_styles.dkd_timelineStep}>
                          <View style={dkd_styles.dkd_timelineLineWrap}>
                            <View style={[dkd_styles.dkd_timelineDot, dkd_step_done_value && dkd_styles.dkd_timelineDotDone]} />
                            {dkd_step_index_value < dkd_timeline_step_list_value.length - 1 ? <View style={[dkd_styles.dkd_timelineLine, dkd_step_done_value && dkd_styles.dkd_timelineLineDone]} /> : null}
                          </View>
                          <Text style={[dkd_styles.dkd_timelineLabel, dkd_step_done_value && dkd_styles.dkd_timelineLabelDone]}>{dkd_step_value.dkd_label_value}</Text>
                        </View>
                      );
                    })}
                  </View>

                  {!!dkd_shipment_value?.package_image_url ? <Image source={{ uri: dkd_shipment_value.package_image_url }} style={dkd_styles.dkd_shipmentImage} resizeMode="cover" /> : null}
                  {String(dkd_shipment_value?.pickup_proof_image_url || '').trim() ? (
                    <>
                      <Text style={dkd_styles.dkd_sectionMiniTitle}>Kurye Teslim Alma Fotoğrafı</Text>
                      <Image source={{ uri: dkd_shipment_value.pickup_proof_image_url }} style={dkd_styles.dkd_shipmentImage} resizeMode="cover" />
                    </>
                  ) : null}

                  <View style={dkd_styles.dkd_shipmentSectionCard}>
                    <Text style={dkd_styles.dkd_sectionMiniTitle}>Gönderici Özeti</Text>
                    <View style={dkd_styles.dkd_infoGrid}>
                      <View style={dkd_styles.dkd_infoGridCard}>
                        <Text style={dkd_styles.dkd_infoGridLabel}>Ad Soyad</Text>
                        <Text style={dkd_styles.dkd_infoGridValue}>{dkd_customer_name_text_value}</Text>
                      </View>
                      <View style={dkd_styles.dkd_infoGridCard}>
                        <Text style={dkd_styles.dkd_infoGridLabel}>Telefon</Text>
                        <Text style={dkd_styles.dkd_infoGridValue}>{dkd_phone_ready_value ? dkd_phone_text_value : 'Henüz girilmedi'}</Text>
                      </View>
                      <View style={dkd_styles.dkd_infoGridCard}>
                        <Text style={dkd_styles.dkd_infoGridLabel}>TC Kimlik</Text>
                        <Text style={dkd_styles.dkd_infoGridValue}>{dkd_mask_national_id_text(dkd_shipment_value?.customer_national_id)}</Text>
                      </View>
                      <View style={dkd_styles.dkd_infoGridCard}>
                        <Text style={dkd_styles.dkd_infoGridLabel}>Paket</Text>
                        <Text style={dkd_styles.dkd_infoGridValue}>{dkd_shipment_value?.package_content_text || '-'}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={dkd_styles.dkd_shipmentChipRow}>
                    <View style={dkd_styles.dkd_shipmentInfoChip}><MaterialCommunityIcons name="weight-kilogram" size={14} color="#7EF1B6" /><Text style={dkd_styles.dkd_shipmentInfoChipText}>{dkd_format_weight(dkd_shipment_value?.package_weight_kg)}</Text></View>
                    <View style={dkd_styles.dkd_shipmentInfoChip}><MaterialCommunityIcons name="wallet-outline" size={14} color={dkd_colors.cyanSoft} /><Text style={dkd_styles.dkd_shipmentInfoChipText}>{dkd_payment_status_label(dkd_shipment_value?.payment_status)}</Text></View>
                    <DkdTrackingActionChip
                      dkd_is_active_value={!!dkd_show_live_value && !!dkd_shipment_value?.id}
                      dkd_disabled_value={!dkd_show_live_value || !dkd_shipment_value?.id}
                      dkd_on_press_value={() => dkd_open_live_map_value(dkd_shipment_value?.id)}
                    />
                  </View>

                  <View style={dkd_styles.dkd_routeStack}>
                    <View style={dkd_styles.dkd_addressCard}>
                      <View style={dkd_styles.dkd_routeCardHead}>
                        <MaterialCommunityIcons name="map-marker-radius-outline" size={15} color={dkd_colors.cyanSoft} />
                        <Text style={dkd_styles.dkd_addressCardLabel}>Göndericiden Alım</Text>
                      </View>
                      <Text style={dkd_styles.dkd_addressCardText}>{dkd_shipment_value?.pickup_address_text || '-'}</Text>
                    </View>
                    <View style={dkd_styles.dkd_addressCard}>
                      <View style={dkd_styles.dkd_routeCardHead}>
                        <MaterialCommunityIcons name="map-marker-check-outline" size={15} color="#7EF1B6" />
                        <Text style={dkd_styles.dkd_addressCardLabel}>Teslimat Noktası</Text>
                      </View>
                      <Text style={dkd_styles.dkd_addressCardText}>{dkd_shipment_value?.delivery_address_text || '-'}</Text>
                    </View>
                    <View style={dkd_styles.dkd_addressCard}>
                      <View style={dkd_styles.dkd_routeCardHead}>
                        <MaterialCommunityIcons name="note-text-outline" size={15} color="#F4D27A" />
                        <Text style={dkd_styles.dkd_addressCardLabel}>Kurye Notu</Text>
                      </View>
                      <Text style={dkd_styles.dkd_addressCardText}>{dkd_shipment_value?.delivery_note || '-'}</Text>
                    </View>
                  </View>

                  <View style={dkd_styles.dkd_divider} />
                  <Text style={dkd_styles.dkd_sectionMiniTitle}>Atanan Kurye</Text>
                  <View style={dkd_styles.dkd_courierGrid}>
                    <View style={dkd_styles.dkd_courierMiniCard}><Text style={dkd_styles.dkd_courierMiniLabel}>Kurye</Text><Text style={dkd_styles.dkd_courierMiniValue}>{dkd_shipment_value?.courier_display_name || 'Henüz atanmadı'}</Text></View>
                    <View style={dkd_styles.dkd_courierMiniCard}><Text style={dkd_styles.dkd_courierMiniLabel}>Araç</Text><Text style={dkd_styles.dkd_courierMiniValue}>{dkd_courier_vehicle_label_value(dkd_shipment_value?.courier_vehicle_type)}</Text></View>
                    <View style={dkd_styles.dkd_courierMiniCard}><Text style={dkd_styles.dkd_courierMiniLabel}>Plaka</Text><Text style={dkd_styles.dkd_courierMiniValue}>{dkd_shipment_value?.courier_plate_no || 'Bekleniyor'}</Text></View>
                    <View style={dkd_styles.dkd_courierMiniCard}><Text style={dkd_styles.dkd_courierMiniLabel}>Tahmini Geliş</Text><Text style={dkd_styles.dkd_courierMiniValue}>{dkd_show_live_value ? dkd_format_eta(dkd_shipment_value?.courier_eta_min) : 'Kurye bekleniyor'}</Text></View>
                  </View>
                  {dkd_show_live_value ? (
                    <View style={dkd_styles.dkd_liveLocationPill}><MaterialCommunityIcons name="radar" size={15} color={dkd_colors.cyanSoft} /><Text style={dkd_styles.dkd_liveLocationPillText}>Kurye konumu ve aktif rota harita üzerinde canlı olarak izlenebilir.</Text></View>
                  ) : (
                    <View style={dkd_styles.dkd_liveLocationPill}><MaterialCommunityIcons name="clock-outline" size={15} color={dkd_colors.cyanSoft} /><Text style={dkd_styles.dkd_liveLocationPillText}>Kurye siparişi kabul ettiğinde Kurye Takip açılır.</Text></View>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={dkd_styles.dkd_emptyWrap}>
            <MaterialCommunityIcons name="package-variant-closed-remove" size={26} color={dkd_colors.cyanSoft} />
            <Text style={dkd_styles.dkd_emptyTitle}>Henüz kargo siparişi yok</Text>
            <Text style={dkd_styles.dkd_emptyText}>İlk kargo gönderimini oluşturduğunda takip kartları burada görünür.</Text>
          </View>
        )}
      </View>
      ) : null}

      <DkdCargoLiveMapModal
        dkd_visible_value={dkd_live_map_visible_value && !!dkd_live_map_shipment_value}
        dkd_shipment_value={dkd_live_map_shipment_value}
        dkd_refreshing_value={dkd_loading_value}
        dkd_on_close_value={dkd_close_live_map_value}
        dkd_on_refresh_value={dkd_load_shipments}
      />

      <Modal visible={dkd_payment_modal_visible_value} transparent animationType="fade" onRequestClose={() => setDkdPaymentModalVisibleValue(false)}>
        <View style={dkd_styles.dkd_paymentOverlay}>
          <View style={dkd_styles.dkd_paymentCard}>
            <LinearGradient colors={['rgba(97,216,255,0.18)', 'rgba(181,124,255,0.10)', 'rgba(82,242,161,0.08)']} style={StyleSheet.absoluteFill} />
            <View style={dkd_styles.dkd_paymentHeader}>
              <View style={dkd_styles.dkd_paymentHeaderIconWrap}>
                <MaterialCommunityIcons name="wallet-outline" size={22} color={dkd_colors.cyanSoft} />
              </View>
              <View style={dkd_styles.dkd_paymentHeaderCopy}>
                <Text style={dkd_styles.dkd_paymentTitle}>Ödeme Onayı</Text>
                <Text style={dkd_styles.dkd_paymentSub}>Sipariş kurye havuzuna düşmeden önce hesaplanan toplam teslimat tutarı ana cüzdandan alınır.</Text>
              </View>
            </View>

            <View style={dkd_styles.dkd_paymentRouteCard}>
              <Text style={dkd_styles.dkd_paymentRouteLine}>Gönderici • {String(dkd_form_value?.dkd_pickup_address_text || '-').trim() || '-'}</Text>
              <Text style={dkd_styles.dkd_paymentRouteLine}>Teslimat • {String(dkd_form_value?.dkd_delivery_address_text || '-').trim() || '-'}</Text>
              <Text style={dkd_styles.dkd_paymentRouteMeta}>Kurye → gönderici • {dkd_format_km_value(dkd_payment_preview_value?.dkd_pickup_distance_km)}</Text>
              <Text style={dkd_styles.dkd_paymentRouteMeta}>Gönderici → teslimat • {dkd_format_km_value(dkd_payment_preview_value?.dkd_delivery_distance_km)}</Text>
            </View>

            <View style={dkd_styles.dkd_paymentStatCard}>
              <View style={dkd_styles.dkd_paymentStatRow}>
                <Text style={dkd_styles.dkd_paymentStatLabel}>Alım Tutarı</Text>
                <Text style={dkd_styles.dkd_paymentStatValue}>{dkd_format_money_value(dkd_payment_preview_value?.dkd_courier_fee_tl || 0)}</Text>
              </View>
              <View style={dkd_styles.dkd_paymentStatRow}>
                <Text style={dkd_styles.dkd_paymentStatLabel}>Teslimat Tutarı</Text>
                <Text style={dkd_styles.dkd_paymentStatValue}>{dkd_format_money_value(dkd_payment_preview_value?.dkd_service_fee_tl || 0)}</Text>
              </View>
              <View style={[dkd_styles.dkd_paymentStatRow, dkd_styles.dkd_paymentStatRowTotal]}>
                <Text style={dkd_styles.dkd_paymentStatLabelTotal}>Toplam Tutar</Text>
                <Text style={dkd_styles.dkd_paymentStatValueTotal}>{dkd_format_money_value(dkd_payment_preview_value?.dkd_customer_charge_tl || 0)}</Text>
              </View>
            </View>

            <View style={dkd_styles.dkd_paymentWalletCard}>
              <View style={dkd_styles.dkd_paymentWalletRow}>
                <Text style={dkd_styles.dkd_paymentWalletLabel}>Cüzdan bakiyesi</Text>
                <Text style={dkd_styles.dkd_paymentWalletValue}>{dkd_format_money_value(dkd_wallet_tl_value || 0)}</Text>
              </View>
              <View style={dkd_styles.dkd_paymentWalletRow}>
                <Text style={dkd_styles.dkd_paymentWalletLabel}>Ödeme sonrası</Text>
                <Text style={dkd_styles.dkd_paymentWalletValue}>{dkd_format_money_value(dkd_round_money_value(Number(dkd_wallet_tl_value || 0) - Number(dkd_payment_preview_value?.dkd_customer_charge_tl || 0)))}</Text>
              </View>
            </View>

            <View style={dkd_styles.dkd_paymentActionRow}>
              <Pressable onPress={() => setDkdPaymentModalVisibleValue(false)} style={dkd_styles.dkd_paymentGhostButton}>
                <Text style={dkd_styles.dkd_paymentGhostButtonText}>Vazgeç</Text>
              </Pressable>
              <Pressable onPress={dkd_submit_cargo_request} disabled={dkd_submitting_value} style={[dkd_styles.dkd_paymentPrimaryButton, dkd_submitting_value && dkd_styles.dkd_actionDisabled]}>
                <LinearGradient colors={['#58E2AB', '#2AB7A1', '#0C2431']} style={StyleSheet.absoluteFill} />
                <Text style={dkd_styles.dkd_paymentPrimaryButtonText}>{dkd_submitting_value ? 'Ödeme alınıyor…' : 'Cüzdandan Öde'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const dkd_styles = StyleSheet.create({
  dkd_panelCard: {
    marginTop: 14,
    borderRadius: 24,
    padding: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(7,15,25,0.78)',
  },
  dkd_panelHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  dkd_panelHeadCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 6,
  },
  dkd_panelTitle: {
    color: '#F7FBFF',
    fontSize: 18,
    fontWeight: '900',
  },
  dkd_panelSub: {
    marginTop: 4,
    color: 'rgba(231,241,255,0.72)',
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 260,
  },
  dkd_panelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    maxWidth: 160,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(83,216,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(97,216,255,0.18)',
  },
  dkd_panelBadgeText: {
    color: '#E6FAFF',
    fontSize: 11,
    fontWeight: '800',
    flexShrink: 1,
  },
  dkd_locationHintText: {
    marginTop: -4,
    marginBottom: 12,
    color: 'rgba(126,233,255,0.76)',
    fontSize: 11,
    fontWeight: '700',
  },
  dkd_fieldLabel: {
    color: '#EAF5FF',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  dkd_fieldRequired: {
    color: '#69F1B4',
  },
  dkd_fieldInput: {
    minHeight: 50,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 12,
  },
  dkd_fieldInputMultiline: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  dkd_fieldRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dkd_fieldCol: {
    flex: 1,
  },
  dkd_imagePickerCard: {
    minHeight: 116,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dkd_imagePreview: {
    ...StyleSheet.absoluteFillObject,
  },
  dkd_imageOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: 'rgba(5,10,18,0.35)',
  },
  dkd_imageTitle: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  dkd_imageSub: {
    marginTop: 4,
    color: 'rgba(231,241,255,0.72)',
    fontSize: 11,
    textAlign: 'center',
  },
  dkd_primaryAction: {
    height: 54,
    borderRadius: 18,
    marginTop: 6,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dkd_primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  dkd_actionDisabled: {
    opacity: 0.6,
  },
  dkd_refreshChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dkd_refreshChipText: {
    color: '#EAF5FF',
    fontSize: 11,
    fontWeight: '800',
  },
  dkd_shipmentFilterRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 6,
    marginBottom: 14,
  },
  dkd_shipmentFilterChip: {
    flex: 1,
    minWidth: 0,
    minHeight: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dkd_shipmentFilterChipActive: {
    borderColor: 'rgba(103,227,255,0.28)',
    backgroundColor: 'rgba(103,227,255,0.14)',
  },
  dkd_shipmentFilterChipText: {
    color: '#D7EFFF',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 12,
  },
  dkd_shipmentFilterChipTextActive: {
    color: '#FFFFFF',
  },
  dkd_loaderWrap: {
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dkd_shipmentsList: {
    gap: 12,
  },
  dkd_shipmentCard: {
    width: '100%',
    borderRadius: 22,
    padding: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(8,16,28,0.82)',
  },
  dkd_shipmentHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  dkd_shipmentTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  dkd_statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  dkd_statusPillOpen: {
    backgroundColor: 'rgba(246,181,78,0.12)',
    borderColor: 'rgba(246,181,78,0.30)',
  },
  dkd_statusPillActive: {
    backgroundColor: 'rgba(85,216,255,0.12)',
    borderColor: 'rgba(85,216,255,0.28)',
  },
  dkd_statusPillDone: {
    backgroundColor: 'rgba(82,242,161,0.12)',
    borderColor: 'rgba(82,242,161,0.28)',
  },
  dkd_statusPillText: {
    color: '#F8FBFF',
    fontSize: 11,
    fontWeight: '900',
  },
  dkd_shipmentImage: {
    width: '100%',
    height: 132,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  dkd_shipmentMeta: {
    marginTop: 4,
    color: 'rgba(235,244,255,0.88)',
    fontSize: 11,
    lineHeight: 18,
  },
  dkd_divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 12,
  },
  dkd_sectionMiniTitle: {
    color: '#F7FBFF',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 4,
  },
  dkd_emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  dkd_emptyTitle: {
    marginTop: 12,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  dkd_emptyText: {
    marginTop: 6,
    color: 'rgba(231,241,255,0.72)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 260,
  },
  dkd_shipmentHeadLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  dkd_shipmentIconBubble: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(85,216,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(85,216,255,0.24)',
  },
  dkd_shipmentHeadCopy: {
    flex: 1,
    minWidth: 0,
  },
  dkd_shipmentDateText: {
    marginTop: 4,
    color: 'rgba(231,241,255,0.70)',
    fontSize: 11,
    fontWeight: '700',
  },
  dkd_shipmentTopMetrics: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  dkd_shipmentMetricBox: {
    flex: 1,
    minHeight: 94,
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  dkd_shipmentMetricBoxPressable: {
    transform: [{ scale: 1 }],
  },
  dkd_shipmentMetricBoxPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.97,
  },
  dkd_shipmentMetricGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  dkd_shipmentMetricSurface: {
    ...StyleSheet.absoluteFillObject,
  },
  dkd_shipmentMetricAccentOrb: {
    position: 'absolute',
    top: -14,
    right: -10,
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  dkd_shipmentMetricHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 6,
  },
  dkd_shipmentMetricPulseWrap: {
    alignSelf: 'flex-start',
  },
  dkd_shipmentMetricIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.02,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  dkd_shipmentMetricIconWrapTracking: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    shadowColor: '#9EEBFF',
    shadowOpacity: 0.08,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  dkd_shipmentMetricMiniPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  dkd_shipmentMetricMiniPillCharge: {
    backgroundColor: 'rgba(95, 244, 179, 0.12)',
    borderColor: 'rgba(95, 244, 179, 0.24)',
  },
  dkd_shipmentMetricMiniPillPaid: {
    backgroundColor: 'rgba(110, 197, 255, 0.12)',
    borderColor: 'rgba(110, 197, 255, 0.24)',
  },
  dkd_shipmentMetricMiniPillPending: {
    backgroundColor: 'rgba(255, 211, 120, 0.12)',
    borderColor: 'rgba(255, 211, 120, 0.24)',
  },
  dkd_shipmentMetricMiniPillLive: {
    backgroundColor: 'rgba(90, 238, 219, 0.12)',
    borderColor: 'rgba(90, 238, 219, 0.24)',
  },
  dkd_shipmentMetricMiniPillIdle: {
    backgroundColor: 'rgba(173, 186, 214, 0.10)',
    borderColor: 'rgba(173, 186, 214, 0.18)',
  },
  dkd_shipmentMetricMiniPillText: {
    color: '#F6FBFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  dkd_shipmentMetricLabel: {
    color: 'rgba(247,252,255,0.82)',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.55,
  },
  dkd_shipmentMetricValue: {
    marginTop: 4,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 19,
    textShadowColor: 'rgba(0,0,0,0.06)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  dkd_shipmentMetricValueSolo: {
    marginTop: 18,
    fontSize: 16,
    lineHeight: 20,
  },
  dkd_shipmentMetricTapCueRow: {
    position: 'absolute',
    right: 9,
    bottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    opacity: 0.92,
  },
  dkd_shipmentMetricTapCueText: {
    color: '#F4FCFF',
    fontSize: 10,
    fontWeight: '900',
  },
  dkd_shipmentMetricMeta: {
    display: 'none',
    marginTop: 0,
    color: 'rgba(231,241,255,0.68)',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
  },
  dkd_shipmentTimelineRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  dkd_timelineStep: {
    flex: 1,
  },
  dkd_timelineLineWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dkd_timelineDot: {
    width: 11,
    height: 11,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  dkd_timelineDotDone: {
    backgroundColor: '#63F1B1',
    borderColor: 'rgba(99,241,177,0.58)',
  },
  dkd_timelineLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dkd_timelineLineDone: {
    backgroundColor: 'rgba(99,241,177,0.42)',
  },
  dkd_timelineLabel: {
    marginTop: 8,
    color: 'rgba(231,241,255,0.62)',
    fontSize: 10,
    fontWeight: '800',
  },
  dkd_timelineLabelDone: {
    color: '#E9FFF6',
  },
  dkd_shipmentSectionCard: {
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  dkd_infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dkd_infoGridCard: {
    width: '48%',
    borderRadius: 14,
    padding: 10,
    backgroundColor: 'rgba(4,10,18,0.34)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  dkd_infoGridLabel: {
    color: 'rgba(231,241,255,0.60)',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dkd_infoGridValue: {
    marginTop: 6,
    color: '#F5FAFF',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
  },
  dkd_shipmentChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  dkd_shipmentInfoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  dkd_shipmentInfoChipText: {
    color: '#EAF5FF',
    fontSize: 11,
    fontWeight: '800',
  },
  dkd_routeStack: {
    gap: 8,
  },
  dkd_routeCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  dkd_addressCard: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  dkd_addressCardLabel: {
    color: 'rgba(231,241,255,0.70)',
    fontSize: 11,
    fontWeight: '900',
  },
  dkd_addressCardText: {
    color: '#F4FBFF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  dkd_courierGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dkd_courierMiniCard: {
    width: '48%',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  dkd_courierMiniLabel: {
    color: 'rgba(231,241,255,0.64)',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dkd_courierMiniValue: {
    marginTop: 6,
    color: '#F7FBFF',
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 18,
  },
  dkd_liveLocationPill: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(97,216,255,0.16)',
    backgroundColor: 'rgba(97,216,255,0.08)',
  },
  dkd_liveLocationPillText: {
    flex: 1,
    color: '#E6FAFF',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 17,
  },
  dkd_shipmentActionChipWrap: {
    alignSelf: 'stretch',
  },
  dkd_shipmentActionChipWrapDisabled: {
    opacity: 0.72,
  },
  dkd_shipmentActionChipWrapPressed: {
    opacity: 0.96,
  },
  dkd_shipmentActionChip: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(99,214,255,0.26)',
    backgroundColor: 'rgba(30,108,218,0.24)',
    overflow: 'hidden',
  },
  dkd_shipmentActionChipDisabled: {
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    opacity: 0.86,
  },
  dkd_shipmentActionIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  dkd_shipmentActionPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#7EF1B6',
    marginLeft: 2,
    shadowColor: '#7EF1B6',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  dkd_shipmentActionChipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  dkd_paymentOverlay: {
    flex: 1,
    padding: 18,
    backgroundColor: 'rgba(2,7,14,0.72)',
    justifyContent: 'center',
  },
  dkd_paymentCard: {
    borderRadius: 26,
    padding: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(6,14,25,0.96)',
  },
  dkd_paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dkd_paymentHeaderIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(103,227,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(103,227,255,0.20)',
  },
  dkd_paymentHeaderCopy: {
    flex: 1,
  },
  dkd_paymentTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  dkd_paymentSub: {
    marginTop: 4,
    color: 'rgba(231,241,255,0.72)',
    fontSize: 12,
    lineHeight: 18,
  },
  dkd_paymentRouteCard: {
    marginTop: 18,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    gap: 6,
  },
  dkd_paymentRouteLine: {
    color: '#F6FBFF',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  dkd_paymentRouteMeta: {
    marginTop: 4,
    color: 'rgba(126,233,255,0.76)',
    fontSize: 12,
    fontWeight: '800',
  },
  dkd_paymentStatCard: {
    marginTop: 14,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    gap: 12,
  },
  dkd_paymentStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  dkd_paymentStatRowTotal: {
    marginTop: 2,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  dkd_paymentStatLabel: {
    color: 'rgba(231,241,255,0.72)',
    fontSize: 13,
    fontWeight: '700',
  },
  dkd_paymentStatValue: {
    color: '#F4FBFF',
    fontSize: 14,
    fontWeight: '900',
  },
  dkd_paymentStatLabelTotal: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  dkd_paymentStatValueTotal: {
    color: '#63F1B1',
    fontSize: 18,
    fontWeight: '900',
  },
  dkd_paymentWalletCard: {
    marginTop: 14,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(88,226,171,0.18)',
    backgroundColor: 'rgba(88,226,171,0.08)',
    gap: 8,
  },
  dkd_paymentWalletRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  dkd_paymentWalletLabel: {
    color: 'rgba(231,241,255,0.76)',
    fontSize: 13,
    fontWeight: '700',
  },
  dkd_paymentWalletValue: {
    color: '#E9FFF6',
    fontSize: 14,
    fontWeight: '900',
  },
  dkd_paymentActionRow: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 12,
  },
  dkd_paymentGhostButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  dkd_paymentGhostButtonText: {
    color: '#EAF5FF',
    fontSize: 14,
    fontWeight: '900',
  },
  dkd_paymentPrimaryButton: {
    flex: 1.25,
    minHeight: 50,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dkd_paymentPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});
