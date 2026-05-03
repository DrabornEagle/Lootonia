import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { cityLootTheme, cityMapStyle } from '../../theme/cityLootTheme';
import { dkd_make_native_axis_point } from '../../utils/dkdNativeAxis';
import {
  dkd_configure_mapbox_access_token_value,
  dkd_fetch_mapbox_directions_route_value,
  dkd_fetch_mapbox_geocoding_place_value,
  dkd_mapbox_access_token_problem_text_value,
  dkd_mapbox_access_token_ready_value,
  dkd_mapbox_geojson_line_value,
  dkd_point_from_lat_lng_value,
} from '../../services/dkd_mapbox_route_service';

const dkd_colors = cityLootTheme.colors;

let dkd_mapbox_gl_value = null;
try {
  const dkd_mapbox_module_value = require('@rnmapbox/maps');
  dkd_mapbox_gl_value = dkd_mapbox_module_value?.default || dkd_mapbox_module_value;
} catch {
  dkd_mapbox_gl_value = null;
}

const dkd_native_mapbox_ready_value = Boolean(dkd_mapbox_gl_value?.MapView && dkd_configure_mapbox_access_token_value(dkd_mapbox_gl_value));
const dkd_mapbox_original_day_style_url_value = 'mapbox://styles/mapbox/streets-v12';
const dkd_mapbox_original_night_style_url_value = 'mapbox://styles/mapbox/dark-v11';

const dkd_default_center_value = {
  latitude: 39.92077,
  longitude: 32.85411,
  latitudeDelta: 0.18,
  longitudeDelta: 0.18,
};

const dkd_day_map_style_value = [
  { elementType: 'geometry', stylers: [{ color: '#EEF4F9' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#314252' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#EEF4F9' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#D5E2EC' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#C7D7E3' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#B2C7D7' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#4A6074' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#DCE9F1' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#486072' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#D7E4EE' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#BEDFF4' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#38627E' }] },
  { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#476072' }] },
];

function dkd_to_number_or_null(dkd_value) {
  const dkd_numeric_value = Number(dkd_value);
  return Number.isFinite(dkd_numeric_value) ? dkd_numeric_value : null;
}

function dkd_coordinate_pair_value(dkd_lat_value, dkd_lng_value) {
  const dkd_point_value = dkd_point_from_lat_lng_value(dkd_lat_value, dkd_lng_value);
  return dkd_point_value?.dkd_map_view_coordinate_value || null;
}

function dkd_heading_value(dkd_value) {
  const dkd_numeric_value = dkd_to_number_or_null(dkd_value);
  if (dkd_numeric_value == null) return 0;
  return ((dkd_numeric_value % 360) + 360) % 360;
}

function dkd_heading_delta_deg_value(dkd_previous_value, dkd_next_value) {
  const dkd_previous_heading_value = dkd_heading_value(dkd_previous_value);
  const dkd_next_heading_value = dkd_heading_value(dkd_next_value);
  return Math.abs((((dkd_next_heading_value - dkd_previous_heading_value) + 540) % 360) - 180);
}

function dkd_vehicle_label_value(dkd_vehicle_type_value) {
  const dkd_key_value = String(dkd_vehicle_type_value || '').trim().toLowerCase();
  if (['moto', 'motor', 'motorcycle', 'bike'].includes(dkd_key_value)) return 'Motosiklet';
  if (['car', 'otomobil', 'sedan'].includes(dkd_key_value)) return 'Otomobil';
  if (['van', 'panelvan'].includes(dkd_key_value)) return 'Panelvan';
  if (['truck', 'kamyon', 'pickup'].includes(dkd_key_value)) return 'Kamyonet';
  return dkd_key_value ? dkd_key_value.toUpperCase() : 'Kurye';
}

function dkd_status_label_value(dkd_status_value, dkd_is_business_task_value = false) {
  const dkd_key_value = String(dkd_status_value || 'open').toLowerCase();
  if (dkd_key_value === 'accepted') return dkd_is_business_task_value ? 'İşletmeye gidiyor' : 'Göndericiye gidiyor';
  if (dkd_key_value === 'picked_up') return dkd_is_business_task_value ? 'Müşteriye gidiyor' : 'Teslimat noktasına gidiyor';
  if (dkd_key_value === 'completed') return 'Teslim edildi';
  if (dkd_key_value === 'cancelled') return 'Teslimat iptal edildi';
  return 'Kurye bekleniyor';
}

function dkd_last_ping_text_value(dkd_iso_value) {
  if (!dkd_iso_value) return 'Canlı ping bekleniyor';
  const dkd_ping_date_value = new Date(dkd_iso_value);
  if (Number.isNaN(dkd_ping_date_value.getTime())) return 'Canlı ping bekleniyor';
  const dkd_diff_seconds_value = Math.max(0, Math.round((Date.now() - dkd_ping_date_value.getTime()) / 1000));
  if (dkd_diff_seconds_value < 8) return 'Az önce güncellendi';
  if (dkd_diff_seconds_value < 60) return `${dkd_diff_seconds_value} sn önce güncellendi`;
  const dkd_diff_minutes_value = Math.round(dkd_diff_seconds_value / 60);
  if (dkd_diff_minutes_value < 60) return `${dkd_diff_minutes_value} dk önce güncellendi`;
  const dkd_diff_hours_value = Math.round(dkd_diff_minutes_value / 60);
  return `${dkd_diff_hours_value} sa önce güncellendi`;
}

function dkd_eta_text_value(dkd_value) {
  const dkd_numeric_value = dkd_to_number_or_null(dkd_value);
  if (dkd_numeric_value == null || dkd_numeric_value <= 0) return '—';
  return `${Math.round(dkd_numeric_value)} dk`;
}

function dkd_distance_text_value(dkd_value) {
  const dkd_numeric_value = dkd_to_number_or_null(dkd_value);
  if (dkd_numeric_value == null || dkd_numeric_value <= 0) return '—';
  return `${dkd_numeric_value.toLocaleString('tr-TR', {
    minimumFractionDigits: dkd_numeric_value < 10 ? 1 : 0,
    maximumFractionDigits: 1,
  })} km`;
}

function dkd_haversine_km_between_points_value(dkd_start_point_value, dkd_end_point_value) {
  if (!dkd_start_point_value || !dkd_end_point_value) return null;
  const dkd_earth_radius_km_value = 6371;
  const dkd_to_radian_value = (dkd_degree_value) => (Number(dkd_degree_value) * Math.PI) / 180;
  const dkd_delta_lat_value = dkd_to_radian_value(dkd_end_point_value.latitude - dkd_start_point_value.latitude);
  const dkd_delta_lng_value = dkd_to_radian_value(dkd_end_point_value.longitude - dkd_start_point_value.longitude);
  const dkd_start_lat_radian_value = dkd_to_radian_value(dkd_start_point_value.latitude);
  const dkd_end_lat_radian_value = dkd_to_radian_value(dkd_end_point_value.latitude);
  const dkd_arc_value = Math.sin(dkd_delta_lat_value / 2) ** 2
    + Math.cos(dkd_start_lat_radian_value) * Math.cos(dkd_end_lat_radian_value) * Math.sin(dkd_delta_lng_value / 2) ** 2;
  return dkd_earth_radius_km_value * (2 * Math.atan2(Math.sqrt(dkd_arc_value), Math.sqrt(1 - dkd_arc_value)));
}

function dkd_estimated_eta_min_from_distance_value(dkd_distance_km_value, dkd_status_key_value) {
  const dkd_numeric_distance_value = dkd_to_number_or_null(dkd_distance_km_value);
  if (dkd_numeric_distance_value == null) return null;
  const dkd_average_speed_kmh_value = dkd_status_key_value === 'picked_up' ? 30 : 24;
  const dkd_buffer_min_value = dkd_status_key_value === 'picked_up' ? 2 : 4;
  return Math.max(1, Math.round((dkd_numeric_distance_value / dkd_average_speed_kmh_value) * 60) + dkd_buffer_min_value);
}

function dkd_compact_address_text_value(dkd_value) {
  const dkd_text_value = String(dkd_value || '').trim();
  if (!dkd_text_value) return 'Adres yok';
  return dkd_text_value;
}

function dkd_clean_business_route_address_text_value(dkd_value) {
  const dkd_text_value = String(dkd_value || '').trim();
  if (!dkd_text_value) return '';
  const dkd_clean_value = dkd_text_value
    .replace(/\s*•\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!dkd_clean_value || /^(adres yok|işletme teslim alma noktası|teslimat adresi)$/i.test(dkd_clean_value)) return '';
  return dkd_clean_value;
}

function dkd_business_route_precise_address_like_value(dkd_value) {
  const dkd_clean_value = dkd_clean_business_route_address_text_value(dkd_value).toLocaleLowerCase('tr-TR');
  if (!dkd_clean_value) return false;
  if (/\b(avm|mall|cadde|caddesi|cd\.?|sokak|sokağı|sk\.?|mahalle|mahallesi|mh\.?|bulvar|bulvarı|no:|no\s|apartman|site|plaza|iş merkezi|hastane|okul|üniversite|metro|ankara|etimesgut|eryaman|yenimahalle|çankaya|sincan)\b/i.test(dkd_clean_value)) return true;
  return dkd_clean_value.length >= 28 && /[0-9]/.test(dkd_clean_value);
}

function dkd_pick_address_text_value(dkd_values) {
  const dkd_clean_values = (Array.isArray(dkd_values) ? dkd_values : [])
    .map((dkd_value) => dkd_clean_business_route_address_text_value(dkd_value))
    .filter(Boolean);
  const dkd_precise_value = dkd_clean_values.find((dkd_value) => dkd_business_route_precise_address_like_value(dkd_value));
  return dkd_precise_value || dkd_clean_values[0] || '';
}

function dkd_business_route_address_alias_key_value(dkd_value) {
  const dkd_clean_value = dkd_clean_business_route_address_text_value(dkd_value)
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
  if (/\bmetro\s*mall\b|\bmetromall\b|\bmetromall\s*avm\b/.test(dkd_clean_value)) return 'dkd_metromall_avm';
  if (/\banka\s*mall\b|\bankamall\b|\bankamall\s*avm\b|\bankara\s*mall\b/.test(dkd_clean_value)) return 'dkd_ankamall_avm';
  if (/\barmada\b/.test(dkd_clean_value)) return 'dkd_armada_avm';
  if (/\bcepa\b/.test(dkd_clean_value)) return 'dkd_cepa_avm';
  if (/\bkentpark\b|\bkent\s*park\b/.test(dkd_clean_value)) return 'dkd_kentpark_avm';
  return '';
}

function dkd_business_route_landmark_point_value(dkd_value) {
  const dkd_alias_key_value = dkd_business_route_address_alias_key_value(dkd_value);
  const dkd_landmark_map_value = {
    dkd_metromall_avm: { latitude: 39.977742, longitude: 32.653498, dkd_place_name_value: 'Metromall AVM, Eryaman, Etimesgut, Ankara' },
    dkd_ankamall_avm: { latitude: 39.951585, longitude: 32.831743, dkd_place_name_value: 'ANKAmall AVM, Akköprü, Ankara' },
    dkd_armada_avm: { latitude: 39.913109, longitude: 32.810739, dkd_place_name_value: 'Armada AVM, Söğütözü, Ankara' },
    dkd_cepa_avm: { latitude: 39.907122, longitude: 32.778391, dkd_place_name_value: 'Cepa AVM, Eskişehir Yolu, Ankara' },
    dkd_kentpark_avm: { latitude: 39.907923, longitude: 32.782982, dkd_place_name_value: 'Kentpark AVM, Mustafa Kemal, Ankara' },
  };
  const dkd_landmark_value = dkd_landmark_map_value[dkd_alias_key_value];
  if (!dkd_landmark_value) return null;
  return {
    dkd_point_value: {
      dkd_lat_value: dkd_landmark_value.latitude,
      dkd_lng_value: dkd_landmark_value.longitude,
      dkd_coordinate_value: [dkd_landmark_value.longitude, dkd_landmark_value.latitude],
      dkd_map_view_coordinate_value: { latitude: dkd_landmark_value.latitude, longitude: dkd_landmark_value.longitude },
      dkd_was_swapped_value: false,
    },
    dkd_place_name_value: dkd_landmark_value.dkd_place_name_value,
    dkd_is_fallback_value: false,
    dkd_warning_text_value: '',
    dkd_provider_key_value: 'dkd-landmark-lock',
    dkd_query_value: dkd_landmark_value.dkd_place_name_value,
    dkd_relevance_value: 1,
  };
}

function dkd_business_route_precise_query_text_value(dkd_value, dkd_kind_value) {
  const dkd_clean_value = dkd_clean_business_route_address_text_value(dkd_value);
  if (!dkd_clean_value) return '';
  const dkd_alias_key_value = dkd_business_route_address_alias_key_value(dkd_clean_value);
  if (dkd_alias_key_value === 'dkd_metromall_avm') return 'Metromall AVM, Eryaman, Etimesgut, Ankara, Türkiye';
  if (dkd_alias_key_value === 'dkd_ankamall_avm') return 'ANKAmall AVM, Akköprü, Yenimahalle, Ankara, Türkiye';
  if (dkd_alias_key_value === 'dkd_armada_avm') return 'Armada AVM, Söğütözü, Ankara, Türkiye';
  if (dkd_alias_key_value === 'dkd_cepa_avm') return 'Cepa AVM, Mustafa Kemal Mahallesi, Ankara, Türkiye';
  if (dkd_alias_key_value === 'dkd_kentpark_avm') return 'Kentpark AVM, Mustafa Kemal Mahallesi, Ankara, Türkiye';
  const dkd_has_ankara_value = /\b(ankara|turkiye|türkiye)\b/i.test(dkd_clean_value);
  const dkd_has_eryaman_value = /\beryaman\b/i.test(dkd_clean_value);
  const dkd_has_etimesgut_value = /\betimesgut\b/i.test(dkd_clean_value);
  const dkd_has_yenimahalle_value = /\b(yenimahalle|akköprü|akkopru)\b/i.test(dkd_clean_value);
  if (dkd_has_eryaman_value && !dkd_has_etimesgut_value) return `${dkd_clean_value}, Etimesgut, Ankara, Türkiye`;
  if (dkd_has_yenimahalle_value && !dkd_has_ankara_value) return `${dkd_clean_value}, Yenimahalle, Ankara, Türkiye`;
  if (!dkd_has_ankara_value) return `${dkd_clean_value}, Ankara, Türkiye`;
  return dkd_clean_value;
}

function dkd_point_cache_key_value(dkd_point_value) {
  if (!dkd_point_value) return '';
  const dkd_lat_value = Number(dkd_point_value.latitude);
  const dkd_lng_value = Number(dkd_point_value.longitude);
  if (!Number.isFinite(dkd_lat_value) || !Number.isFinite(dkd_lng_value)) return '';
  return `${dkd_lat_value.toFixed(4)},${dkd_lng_value.toFixed(4)}`;
}

function dkd_has_heading_number_value(dkd_value) {
  return dkd_value !== undefined && dkd_value !== null && dkd_value !== '' && Number.isFinite(Number(dkd_value));
}

function dkd_bearing_deg_between_points_value(dkd_start_point_value, dkd_end_point_value) {
  if (!dkd_start_point_value || !dkd_end_point_value) return 0;
  const dkd_start_lat_value = Number(dkd_start_point_value.latitude) * Math.PI / 180;
  const dkd_end_lat_value = Number(dkd_end_point_value.latitude) * Math.PI / 180;
  const dkd_delta_lng_value = (Number(dkd_end_point_value.longitude) - Number(dkd_start_point_value.longitude)) * Math.PI / 180;
  const dkd_y_value = Math.sin(dkd_delta_lng_value) * Math.cos(dkd_end_lat_value);
  const dkd_x_value = Math.cos(dkd_start_lat_value) * Math.sin(dkd_end_lat_value) - Math.sin(dkd_start_lat_value) * Math.cos(dkd_end_lat_value) * Math.cos(dkd_delta_lng_value);
  return dkd_heading_value((Math.atan2(dkd_y_value, dkd_x_value) * 180) / Math.PI);
}

function dkd_route_heading_deg_value(dkd_courier_point_value, dkd_route_value) {
  const dkd_route_points_value = Array.isArray(dkd_route_value?.dkd_point_list_value) ? dkd_route_value.dkd_point_list_value : [];
  const dkd_next_point_value = dkd_route_points_value.find((dkd_point_value) => {
    if (!dkd_point_value || !dkd_courier_point_value) return false;
    return dkd_haversine_km_between_points_value(dkd_courier_point_value, dkd_point_value) > 0.018;
  });
  return dkd_next_point_value ? dkd_bearing_deg_between_points_value(dkd_courier_point_value, dkd_next_point_value) : 0;
}

function dkd_is_day_cycle_value(dkd_timestamp_value) {
  const dkd_hour_value = new Date(dkd_timestamp_value || Date.now()).getHours();
  return dkd_hour_value >= 7 && dkd_hour_value < 19;
}

function dkd_is_pickup_focus_status_value(dkd_status_value) {
  const dkd_status_key_value = String(dkd_status_value || 'open').toLowerCase();
  return !['picked_up', 'completed', 'cancelled'].includes(dkd_status_key_value);
}

function dkd_job_phase_status_value(dkd_task_value) {
  const dkd_status_key_value = String(dkd_task_value?.status || '').toLowerCase();
  const dkd_pickup_status_value = String(dkd_task_value?.pickup_status || '').toLowerCase();
  if (dkd_status_key_value === 'completed' || dkd_pickup_status_value === 'delivered') return 'completed';
  if (dkd_status_key_value === 'picked_up' || dkd_status_key_value === 'to_customer' || dkd_status_key_value === 'delivering' || dkd_pickup_status_value === 'picked_up') return 'picked_up';
  if (dkd_status_key_value === 'accepted' || dkd_status_key_value === 'assigned' || dkd_status_key_value === 'to_business') return 'accepted';
  return dkd_status_key_value || 'open';
}

function dkd_read_nested_text_value(dkd_source_value, dkd_key_values) {
  if (!dkd_source_value || typeof dkd_source_value !== 'object') return '';
  for (const dkd_key_value of Array.isArray(dkd_key_values) ? dkd_key_values : []) {
    const dkd_text_value = String(dkd_source_value?.[dkd_key_value] || '').trim();
    if (dkd_text_value) return dkd_text_value;
  }
  return '';
}

function dkd_task_meta_object_value(dkd_task_value) {
  const dkd_meta_value = dkd_task_value?.cargo_meta || dkd_task_value?.meta || dkd_task_value?.snapshot || null;
  return dkd_meta_value && typeof dkd_meta_value === 'object' ? dkd_meta_value : {};
}

function dkd_business_task_address_text_value(dkd_task_value, dkd_kind_value) {
  if (!dkd_task_value) return '';
  const dkd_meta_value = dkd_task_meta_object_value(dkd_task_value);
  if (dkd_kind_value === 'pickup') {
    return dkd_compact_address_text_value(
      dkd_pick_address_text_value([
        dkd_task_value?.dkd_businesses?.address_text,
        dkd_task_value?.business?.address_text,
        dkd_task_value?.merchant?.address_text,
        dkd_read_nested_text_value(dkd_meta_value, ['dkd_business_address_text', 'business_panel_address_text', 'business_address_text', 'merchant_address_text', 'business_address', 'merchant_address', 'address_text']),
        dkd_task_value?.business_address_text,
        dkd_task_value?.merchant_address_text,
        dkd_task_value?.business_address,
        dkd_task_value?.merchant_address,
        dkd_task_value?.pickup_address_text,
        dkd_read_nested_text_value(dkd_meta_value, ['pickup_address_text', 'sender_address_text', 'store_address_text']),
        dkd_task_value?.sender_address_text,
        dkd_task_value?.pickup,
        dkd_read_nested_text_value(dkd_meta_value, ['pickup']),
      ]) || 'İşletme teslim alma noktası',
    );
  }
  return dkd_compact_address_text_value(
    dkd_pick_address_text_value([
      dkd_task_value?.business_product_order?.delivery_address_text,
      dkd_task_value?.order?.delivery_address_text,
      dkd_read_nested_text_value(dkd_meta_value, ['dkd_customer_delivery_address_text', 'customer_delivery_address_text', 'order_delivery_address_text', 'delivery_address_text', 'dropoff_address_text', 'customer_address_text', 'delivery_address']),
      dkd_task_value?.delivery_address_text,
      dkd_task_value?.dropoff_address_text,
      dkd_task_value?.delivery_address,
      dkd_task_value?.customer_address_text,
      dkd_task_value?.dropoff,
      dkd_read_nested_text_value(dkd_meta_value, ['dropoff']),
    ]) || 'Teslimat adresi',
  );
}

function dkd_first_coordinate_pair_from_candidates_value(dkd_candidate_values) {
  for (const dkd_candidate_value of Array.isArray(dkd_candidate_values) ? dkd_candidate_values : []) {
    const dkd_point_value = dkd_coordinate_pair_value(dkd_candidate_value?.dkd_lat_value, dkd_candidate_value?.dkd_lng_value);
    if (dkd_point_value) return dkd_point_value;
  }
  return null;
}

function dkd_prefer_verified_point_value(dkd_raw_point_value, dkd_geocode_value, dkd_prefer_geocode_value = false, dkd_written_address_value = '') {
  const dkd_clean_written_address_value = dkd_clean_business_route_address_text_value(dkd_written_address_value);
  const dkd_landmark_result_value = dkd_business_route_landmark_point_value(dkd_clean_written_address_value);
  const dkd_landmark_point_value = dkd_landmark_result_value?.dkd_point_value?.dkd_map_view_coordinate_value || null;
  const dkd_geocode_point_value = dkd_geocode_value?.dkd_point_value?.dkd_map_view_coordinate_value || null;
  if (dkd_prefer_geocode_value && dkd_clean_written_address_value) {
    if (dkd_landmark_point_value) return dkd_landmark_point_value;
    if (dkd_geocode_point_value) return dkd_geocode_point_value;
    return dkd_raw_point_value || null;
  }
  if (dkd_raw_point_value) return dkd_raw_point_value;
  if (dkd_landmark_point_value) return dkd_landmark_point_value;
  return dkd_geocode_point_value;
}

function dkd_business_pickup_point_from_task_value(dkd_task_value) {
  const dkd_meta_value = dkd_task_meta_object_value(dkd_task_value);
  const dkd_business_location_value = dkd_task_value?.business_location && typeof dkd_task_value.business_location === 'object' ? dkd_task_value.business_location : {};
  const dkd_meta_business_location_value = dkd_meta_value?.business_location && typeof dkd_meta_value.business_location === 'object' ? dkd_meta_value.business_location : {};
  return dkd_first_coordinate_pair_from_candidates_value([
    { dkd_lat_value: dkd_task_value?.business_lat, dkd_lng_value: dkd_task_value?.business_lng },
    { dkd_lat_value: dkd_task_value?.merchant_lat, dkd_lng_value: dkd_task_value?.merchant_lng },
    { dkd_lat_value: dkd_task_value?.store_lat, dkd_lng_value: dkd_task_value?.store_lng },
    { dkd_lat_value: dkd_business_location_value?.lat ?? dkd_business_location_value?.latitude, dkd_lng_value: dkd_business_location_value?.lng ?? dkd_business_location_value?.longitude },
    { dkd_lat_value: dkd_meta_value?.business_lat ?? dkd_meta_value?.merchant_lat, dkd_lng_value: dkd_meta_value?.business_lng ?? dkd_meta_value?.merchant_lng },
    { dkd_lat_value: dkd_meta_business_location_value?.lat ?? dkd_meta_business_location_value?.latitude, dkd_lng_value: dkd_meta_business_location_value?.lng ?? dkd_meta_business_location_value?.longitude },
    { dkd_lat_value: dkd_task_value?.pickup_lat, dkd_lng_value: dkd_task_value?.pickup_lng },
    { dkd_lat_value: dkd_meta_value?.pickup_lat, dkd_lng_value: dkd_meta_value?.pickup_lng },
  ]);
}

function dkd_business_dropoff_point_from_task_value(dkd_task_value) {
  const dkd_meta_value = dkd_task_meta_object_value(dkd_task_value);
  const dkd_delivery_location_value = dkd_task_value?.delivery_location && typeof dkd_task_value.delivery_location === 'object' ? dkd_task_value.delivery_location : {};
  const dkd_meta_delivery_location_value = dkd_meta_value?.delivery_location && typeof dkd_meta_value.delivery_location === 'object' ? dkd_meta_value.delivery_location : {};
  return dkd_first_coordinate_pair_from_candidates_value([
    { dkd_lat_value: dkd_task_value?.dropoff_lat, dkd_lng_value: dkd_task_value?.dropoff_lng },
    { dkd_lat_value: dkd_meta_value?.dropoff_lat, dkd_lng_value: dkd_meta_value?.dropoff_lng },
    { dkd_lat_value: dkd_task_value?.delivery_lat, dkd_lng_value: dkd_task_value?.delivery_lng },
    { dkd_lat_value: dkd_task_value?.customer_lat, dkd_lng_value: dkd_task_value?.customer_lng },
    { dkd_lat_value: dkd_task_value?.destination_lat, dkd_lng_value: dkd_task_value?.destination_lng },
    { dkd_lat_value: dkd_delivery_location_value?.lat ?? dkd_delivery_location_value?.latitude, dkd_lng_value: dkd_delivery_location_value?.lng ?? dkd_delivery_location_value?.longitude },
    { dkd_lat_value: dkd_meta_value?.delivery_lat ?? dkd_meta_value?.customer_lat, dkd_lng_value: dkd_meta_value?.delivery_lng ?? dkd_meta_value?.customer_lng },
    { dkd_lat_value: dkd_meta_delivery_location_value?.lat ?? dkd_meta_delivery_location_value?.latitude, dkd_lng_value: dkd_meta_delivery_location_value?.lng ?? dkd_meta_delivery_location_value?.longitude },
  ]);
}

function dkd_coord_text_value(dkd_point_value) {
  if (!dkd_point_value) return '';
  return `${Number(dkd_point_value.latitude).toFixed(6)},${Number(dkd_point_value.longitude).toFixed(6)}`;
}

function dkd_safe_open_url_value(dkd_url_value) {
  return Linking.openURL(dkd_url_value);
}

async function dkd_open_external_navigation_value({ dkd_provider_value, dkd_origin_point_value, dkd_destination_point_value, dkd_fallback_address_value }) {
  if (!dkd_destination_point_value && !String(dkd_fallback_address_value || '').trim()) {
    Alert.alert('Kurye', 'Rota için hedef konum bulunamadı.');
    return;
  }

  const dkd_origin_text_value = dkd_coord_text_value(dkd_origin_point_value);
  const dkd_destination_text_value = dkd_coord_text_value(dkd_destination_point_value);
  const dkd_destination_query_value = dkd_destination_text_value || encodeURIComponent(String(dkd_fallback_address_value || '').trim());

  const dkd_google_url_list_value = [];
  if (dkd_destination_text_value) {
    dkd_google_url_list_value.push(`comgooglemaps://?${dkd_origin_text_value ? `saddr=${encodeURIComponent(dkd_origin_text_value)}&` : ''}daddr=${encodeURIComponent(dkd_destination_text_value)}&directionsmode=driving`);
    dkd_google_url_list_value.push(`https://www.google.com/maps/dir/?api=1${dkd_origin_text_value ? `&origin=${encodeURIComponent(dkd_origin_text_value)}` : ''}&destination=${encodeURIComponent(dkd_destination_text_value)}&travelmode=driving`);
  } else {
    dkd_google_url_list_value.push(`https://www.google.com/maps/search/?api=1&query=${dkd_destination_query_value}`);
  }

  const dkd_mapbox_url_list_value = dkd_destination_point_value
    ? [
        `https://www.mapbox.com/directions?destination=${encodeURIComponent(`${dkd_destination_point_value.longitude},${dkd_destination_point_value.latitude}`)}${dkd_origin_point_value ? `&origin=${encodeURIComponent(`${dkd_origin_point_value.longitude},${dkd_origin_point_value.latitude}`)}` : ''}`,
      ]
    : [`https://www.mapbox.com/search?query=${dkd_destination_query_value}`];

  const dkd_yandex_rtext_value = dkd_origin_text_value && dkd_destination_text_value
    ? `${encodeURIComponent(dkd_origin_text_value)}~${encodeURIComponent(dkd_destination_text_value)}`
    : encodeURIComponent(dkd_destination_text_value || String(dkd_fallback_address_value || '').trim());
  const dkd_yandex_url_list_value = dkd_destination_text_value
    ? [
        `yandexmaps://maps.yandex.com/?mode=routes&rtext=${dkd_yandex_rtext_value}&rtt=auto`,
        `yandexmaps://maps.yandex.ru/?mode=routes&rtext=${dkd_yandex_rtext_value}&rtt=auto`,
        `https://yandex.com/maps/?mode=routes&rtext=${dkd_yandex_rtext_value}&rtt=auto`,
        `https://yandex.com.tr/maps/?mode=routes&rtext=${dkd_yandex_rtext_value}&rtt=auto`,
      ]
    : [
        `yandexmaps://maps.yandex.com/?text=${dkd_destination_query_value}`,
        `https://yandex.com/maps/?text=${dkd_destination_query_value}`,
        `https://yandex.com.tr/maps/?text=${dkd_destination_query_value}`,
      ];

  const dkd_candidate_url_list_value = dkd_provider_value === 'mapbox'
    ? dkd_mapbox_url_list_value
    : dkd_provider_value === 'yandex'
      ? dkd_yandex_url_list_value
      : dkd_google_url_list_value;

  for (const dkd_url_value of dkd_candidate_url_list_value) {
    if (!dkd_url_value) continue;
    try {
      const dkd_can_open_value = await Linking.canOpenURL(dkd_url_value);
      if (!dkd_can_open_value && !dkd_url_value.startsWith('https://')) continue;
      await dkd_safe_open_url_value(dkd_url_value);
      return;
    } catch (dkd_navigation_error_value) {
      if (dkd_navigation_error_value?.message) {
        // sıradaki fallback denenecek
      }
    }
  }

  Alert.alert('Kurye', dkd_provider_value === 'mapbox' ? 'İşletme rotası açılamadı.' : dkd_provider_value === 'yandex' ? 'Yandex Maps rotası açılamadı.' : 'Google Maps rotası açılamadı.');
}

function dkd_initial_region_value_builder(dkd_courier_point_value, dkd_pickup_point_value, dkd_dropoff_point_value) {
  if (dkd_courier_point_value) {
    return {
      latitude: dkd_courier_point_value.latitude,
      longitude: dkd_courier_point_value.longitude,
      latitudeDelta: 0.006,
      longitudeDelta: 0.006,
    };
  }
  if (dkd_pickup_point_value) {
    return {
      latitude: dkd_pickup_point_value.latitude,
      longitude: dkd_pickup_point_value.longitude,
      latitudeDelta: 0.022,
      longitudeDelta: 0.022,
    };
  }
  if (dkd_dropoff_point_value) {
    return {
      latitude: dkd_dropoff_point_value.latitude,
      longitude: dkd_dropoff_point_value.longitude,
      latitudeDelta: 0.022,
      longitudeDelta: 0.022,
    };
  }
  return dkd_default_center_value;
}

function dkd_mapbox_coordinate_from_map_view_point_value(dkd_point_value) {
  if (!dkd_point_value) return null;
  const dkd_lat_value = dkd_to_number_or_null(dkd_point_value.latitude);
  const dkd_lng_value = dkd_to_number_or_null(dkd_point_value.longitude);
  if (dkd_lat_value == null || dkd_lng_value == null) return null;
  return [dkd_lng_value, dkd_lat_value];
}

function dkd_mapbox_coordinate_values_from_map_view_points_value(dkd_point_values) {
  return (Array.isArray(dkd_point_values) ? dkd_point_values : [])
    .map(dkd_mapbox_coordinate_from_map_view_point_value)
    .filter(Boolean);
}

function dkd_mapbox_shape_from_map_view_points_value(dkd_point_values) {
  return dkd_mapbox_geojson_line_value(dkd_mapbox_coordinate_values_from_map_view_points_value(dkd_point_values));
}

function dkd_mapbox_bounds_from_map_view_points_value(dkd_point_values, dkd_bottom_padding_value = 240) {
  const dkd_valid_point_values = (Array.isArray(dkd_point_values) ? dkd_point_values : []).filter(Boolean);
  if (!dkd_valid_point_values.length) {
    return {
      dkd_center_coordinate_value: [dkd_default_center_value.longitude, dkd_default_center_value.latitude],
      dkd_bounds_value: null,
    };
  }

  const dkd_lng_values = dkd_valid_point_values.map((dkd_point_value) => dkd_point_value.longitude);
  const dkd_lat_values = dkd_valid_point_values.map((dkd_point_value) => dkd_point_value.latitude);
  const dkd_min_lng_value = Math.min(...dkd_lng_values);
  const dkd_max_lng_value = Math.max(...dkd_lng_values);
  const dkd_min_lat_value = Math.min(...dkd_lat_values);
  const dkd_max_lat_value = Math.max(...dkd_lat_values);
  const dkd_center_coordinate_value = [
    (dkd_min_lng_value + dkd_max_lng_value) / 2,
    (dkd_min_lat_value + dkd_max_lat_value) / 2,
  ];

  if (dkd_valid_point_values.length < 2) {
    return { dkd_center_coordinate_value, dkd_bounds_value: null };
  }

  const dkd_lng_padding_value = Math.max(0.002, Math.abs(dkd_max_lng_value - dkd_min_lng_value) * 0.22);
  const dkd_lat_padding_value = Math.max(0.002, Math.abs(dkd_max_lat_value - dkd_min_lat_value) * 0.22);

  return {
    dkd_center_coordinate_value,
    dkd_bounds_value: {
      sw: [dkd_min_lng_value - dkd_lng_padding_value, dkd_min_lat_value - dkd_lat_padding_value],
      ne: [dkd_max_lng_value + dkd_lng_padding_value, dkd_max_lat_value + dkd_lat_padding_value],
      paddingTop: 132,
      paddingBottom: dkd_bottom_padding_value,
      paddingLeft: 56,
      paddingRight: 56,
    },
  };
}

async function dkd_fetch_mapbox_route_value(dkd_start_value, dkd_end_value) {
  const dkd_fallback_distance_value = dkd_haversine_km_between_points_value(dkd_start_value, dkd_end_value);
  const dkd_fallback_point_list_value = dkd_start_value && dkd_end_value ? [dkd_start_value, dkd_end_value] : [];
  const dkd_fallback_value = {
    dkd_point_list_value: dkd_fallback_point_list_value,
    dkd_coordinate_values: dkd_mapbox_coordinate_values_from_map_view_points_value(dkd_fallback_point_list_value),
    dkd_distance_km_value: dkd_fallback_distance_value,
    dkd_duration_min_value: null,
    dkd_is_fallback_value: true,
    dkd_warning_text_value: dkd_mapbox_access_token_ready_value ? 'Mapbox rota bilgisi alınamadı, geçici düz çizgi gösteriliyor.' : dkd_mapbox_access_token_problem_text_value(),
  };

  if (!dkd_start_value || !dkd_end_value) return dkd_fallback_value;

  const dkd_route_value = await dkd_fetch_mapbox_directions_route_value(dkd_start_value, dkd_end_value);
  const dkd_point_list_value = Array.isArray(dkd_route_value?.dkd_point_list_value) ? dkd_route_value.dkd_point_list_value : [];
  if (dkd_point_list_value.length < 2) return dkd_fallback_value;

  return {
    dkd_point_list_value,
    dkd_coordinate_values: Array.isArray(dkd_route_value?.dkd_coordinate_values) ? dkd_route_value.dkd_coordinate_values : dkd_mapbox_coordinate_values_from_map_view_points_value(dkd_point_list_value),
    dkd_distance_km_value: dkd_route_value?.dkd_distance_km_value ?? dkd_fallback_distance_value,
    dkd_duration_min_value: dkd_route_value?.dkd_duration_min_value ?? null,
    dkd_is_fallback_value: dkd_route_value?.dkd_is_fallback_value === true,
    dkd_warning_text_value: dkd_route_value?.dkd_warning_text_value || '',
  };
}

function DkdCourierDirectionMarker({ dkd_heading_deg_value = 0 }) {
  const dkd_incoming_heading_value = dkd_heading_value(dkd_heading_deg_value);
  const dkd_stable_heading_ref_value = useRef(dkd_incoming_heading_value);
  const dkd_heading_delta_value = dkd_heading_delta_deg_value(dkd_stable_heading_ref_value.current, dkd_incoming_heading_value);
  if (dkd_heading_delta_value >= 7) {
    dkd_stable_heading_ref_value.current = dkd_incoming_heading_value;
  }
  const dkd_safe_heading_value = dkd_stable_heading_ref_value.current;
  const dkd_pulse_anim_value = useRef(new Animated.Value(0)).current;
  const dkd_spin_anim_value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const dkd_pulse_loop_value = Animated.loop(
      Animated.sequence([
        Animated.timing(dkd_pulse_anim_value, {
          toValue: 1,
          duration: 1800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(dkd_pulse_anim_value, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
          isInteraction: false,
        }),
      ]),
    );
    const dkd_spin_loop_value = Animated.loop(
      Animated.timing(dkd_spin_anim_value, {
        toValue: 1,
        duration: 2600,
        easing: Easing.linear,
        useNativeDriver: true,
        isInteraction: false,
      }),
    );
    dkd_pulse_loop_value.start();
    dkd_spin_loop_value.start();
    return () => {
      dkd_pulse_loop_value.stop();
      dkd_spin_loop_value.stop();
    };
  }, [dkd_pulse_anim_value, dkd_spin_anim_value]);

  const dkd_pulse_scale_value = dkd_pulse_anim_value.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.06],
  });
  const dkd_pulse_opacity_value = dkd_pulse_anim_value.interpolate({
    inputRange: [0, 1],
    outputRange: [0.42, 0.26],
  });
  const dkd_spin_rotate_value = dkd_spin_anim_value.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View collapsable={false} renderToHardwareTextureAndroid style={dkd_styles.dkd_courierMarkerShell}>
      <Animated.View style={[dkd_styles.dkd_courierMarkerAnimatedHalo, { opacity: dkd_pulse_opacity_value, transform: [{ scale: dkd_pulse_scale_value }] }]} />
      <Animated.View style={[dkd_styles.dkd_courierMarkerOrbitRing, { transform: [{ rotate: dkd_spin_rotate_value }] }]}>
        <View style={dkd_styles.dkd_courierMarkerOrbitDot} />
      </Animated.View>
      <View style={dkd_styles.dkd_courierMarkerPulseOuter} />
      <View style={dkd_styles.dkd_courierMarkerPulseMiddle} />
      <View style={dkd_styles.dkd_courierMarkerPulseInner} />
      <LinearGradient colors={['#041626', '#0D4F72', '#1C1264', '#43105F']} style={dkd_styles.dkd_courierMarkerCompassBase}>
        <View style={dkd_styles.dkd_courierMarkerGlassLayer} />
        <View style={dkd_styles.dkd_courierMarkerCoreRing} />
        <View style={dkd_styles.dkd_courierMarkerNeonRing} />
        <View style={[dkd_styles.dkd_courierHeadingWrap, { transform: [{ rotate: String(dkd_safe_heading_value) + 'deg' }] }]}>
          <LinearGradient colors={['#B8FFF3', '#24C8FF', '#7C3AED', '#FF5CAD']} style={dkd_styles.dkd_courierMarkerArrowPlate}>
            <MaterialCommunityIcons name="navigation-variant" size={28} color="#FFFFFF" />
          </LinearGradient>
        </View>
      </LinearGradient>
      <LinearGradient colors={['#00E5FF', '#2563EB', '#7C3AED', '#FF5CAD']} style={dkd_styles.dkd_courierMarkerMotorBadge}>
        <MaterialCommunityIcons name="motorbike" size={14} color="#FFFFFF" />
      </LinearGradient>
      <LinearGradient colors={['#FFF7B8', '#7DFFEB', '#FFFFFF']} style={dkd_styles.dkd_courierMarkerSignalPill}>
        <MaterialCommunityIcons name="compass" size={8} color="#07111F" />
        <Text style={dkd_styles.dkd_courierMarkerSignalText}>KURYE</Text>
      </LinearGradient>
    </View>
  );
}

function DkdStopMarker({ dkd_icon_name_value, dkd_tone_value = 'cyan', dkd_label_value = '' }) {
  const dkd_is_customer_marker_value = dkd_tone_value === 'customer';
  const dkd_is_business_marker_value = dkd_tone_value === 'business' || dkd_tone_value === 'gold';
  const dkd_palette_value = dkd_is_customer_marker_value
    ? ['#8BFFF2', '#2A8DFF', '#15335F']
    : dkd_is_business_marker_value
      ? ['#FFE49A', '#FFB547', '#3A2608']
      : dkd_tone_value === 'green'
        ? ['#63F1B1', '#103628']
        : ['#6BE5FF', '#13283A'];
  const dkd_shell_style_value = dkd_is_customer_marker_value
    ? dkd_styles.dkd_customerMarkerShell
    : dkd_is_business_marker_value
      ? dkd_styles.dkd_businessMarkerShell
      : dkd_styles.dkd_stopMarkerShell;
  const dkd_glow_style_value = dkd_is_customer_marker_value
    ? dkd_styles.dkd_customerMarkerGlow
    : dkd_is_business_marker_value
      ? dkd_styles.dkd_businessMarkerGlow
      : dkd_styles.dkd_stopMarkerGlow;
  const dkd_badge_style_value = dkd_is_customer_marker_value
    ? dkd_styles.dkd_customerMarkerBadge
    : dkd_is_business_marker_value
      ? dkd_styles.dkd_businessMarkerBadge
      : dkd_styles.dkd_stopMarkerBadge;
  const dkd_tail_style_value = dkd_is_customer_marker_value
    ? dkd_styles.dkd_customerMarkerTail
    : dkd_is_business_marker_value
      ? dkd_styles.dkd_businessMarkerTail
      : dkd_styles.dkd_stopMarkerTail;
  const dkd_label_text_value = dkd_is_customer_marker_value ? (dkd_label_value || 'MÜŞTERİ') : dkd_is_business_marker_value ? (dkd_label_value || 'İŞLETME') : '';

  return (
    <View collapsable={false} renderToHardwareTextureAndroid style={dkd_shell_style_value}>
      <View style={dkd_glow_style_value} />
      <LinearGradient colors={dkd_palette_value} style={dkd_badge_style_value}>
        <MaterialCommunityIcons name={dkd_icon_name_value} size={dkd_is_customer_marker_value || dkd_is_business_marker_value ? 22 : 18} color={dkd_is_customer_marker_value ? '#FFFFFF' : '#08111C'} />
      </LinearGradient>
      {dkd_label_text_value ? (
        <View style={dkd_is_business_marker_value ? dkd_styles.dkd_businessMarkerLabel : dkd_styles.dkd_customerMarkerLabel}>
          <Text style={dkd_is_business_marker_value ? dkd_styles.dkd_businessMarkerLabelText : dkd_styles.dkd_customerMarkerLabelText}>{dkd_label_text_value}</Text>
        </View>
      ) : null}
      <View style={dkd_tail_style_value} />
    </View>
  );
}

function DkdCargoLiveMapModal({
  dkd_visible_value,
  dkd_shipment_value,
  dkd_task_value = null,
  dkd_current_location_value = null,
  dkd_vehicle_type_value = null,
  dkd_is_courier_panel_value = false,
  dkd_refreshing_value = false,
  dkd_on_close_value,
  dkd_on_refresh_value,
}) {
  const dkd_map_ref_value = useRef(null);
  const dkd_initial_camera_done_ref_value = useRef(false);
  const dkd_user_interacted_ref_value = useRef(false);
  const dkd_route_request_serial_ref_value = useRef(0);
  const [dkd_route_loading_value, setDkdRouteLoadingValue] = useState(false);
  const [dkd_courier_to_pickup_route_value, setDkdCourierToPickupRouteValue] = useState(null);
  const [dkd_courier_to_dropoff_route_value, setDkdCourierToDropoffRouteValue] = useState(null);
  const [dkd_delivery_overview_route_value, setDkdDeliveryOverviewRouteValue] = useState(null);
  const [dkd_clock_tick_value, setDkdClockTickValue] = useState(Date.now());
  const [dkd_bottom_panel_collapsed_value, setDkdBottomPanelCollapsedValue] = useState(true);
  const [dkd_native_camera_mode_value, setDkdNativeCameraModeValue] = useState('dkd_overview');
  const [dkd_native_camera_focus_key_value, setDkdNativeCameraFocusKeyValue] = useState(0);
  const [dkd_business_pickup_geocode_value, setDkdBusinessPickupGeocodeValue] = useState(null);
  const [dkd_business_dropoff_geocode_value, setDkdBusinessDropoffGeocodeValue] = useState(null);

  const dkd_effective_status_value = dkd_task_value ? dkd_job_phase_status_value(dkd_task_value) : String(dkd_shipment_value?.status || 'open').toLowerCase();
  const dkd_heading_input_value = dkd_task_value
    ? (dkd_current_location_value?.heading ?? dkd_current_location_value?.headingDeg ?? dkd_current_location_value?.coords?.heading ?? dkd_task_value?.courier_heading_deg)
    : (dkd_shipment_value?.courier_heading_deg ?? dkd_shipment_value?.heading ?? dkd_shipment_value?.headingDeg);
  const dkd_has_live_heading_value = dkd_has_heading_number_value(dkd_heading_input_value);
  const dkd_effective_heading_deg_value = dkd_heading_value(dkd_heading_input_value);
  const dkd_effective_vehicle_type_value = dkd_task_value ? (dkd_vehicle_type_value || dkd_task_value?.courier_vehicle_type || dkd_task_value?.vehicle_type || 'moto') : dkd_shipment_value?.courier_vehicle_type;
  const dkd_effective_location_updated_at_value = dkd_task_value ? (dkd_current_location_value?.updated_at || dkd_current_location_value?.timestamp || new Date().toISOString()) : dkd_shipment_value?.courier_location_updated_at;

  const dkd_raw_status_key_value = dkd_effective_status_value;
  const dkd_is_business_task_value = Boolean(dkd_task_value) && String(dkd_task_value?.job_type || '').toLowerCase() !== 'cargo';
  const dkd_pickup_address_text_value = dkd_task_value
    ? dkd_business_task_address_text_value(dkd_task_value, 'pickup')
    : dkd_shipment_value?.pickup_address_text;
  const dkd_delivery_address_text_value = dkd_task_value
    ? dkd_business_task_address_text_value(dkd_task_value, 'dropoff')
    : dkd_shipment_value?.delivery_address_text;
  const dkd_courier_point_value = useMemo(() => dkd_task_value
    ? dkd_coordinate_pair_value(dkd_current_location_value?.lat, dkd_current_location_value?.lng)
    : dkd_coordinate_pair_value(dkd_shipment_value?.courier_lat, dkd_shipment_value?.courier_lng), [dkd_task_value, dkd_current_location_value?.lat, dkd_current_location_value?.lng, dkd_shipment_value?.courier_lat, dkd_shipment_value?.courier_lng]);
  const dkd_pickup_raw_point_value = useMemo(() => dkd_task_value
    ? (dkd_is_business_task_value ? dkd_business_pickup_point_from_task_value(dkd_task_value) : dkd_coordinate_pair_value(dkd_task_value?.pickup_lat, dkd_task_value?.pickup_lng))
    : dkd_coordinate_pair_value(dkd_shipment_value?.pickup_lat, dkd_shipment_value?.pickup_lng), [dkd_task_value, dkd_is_business_task_value, dkd_shipment_value?.pickup_lat, dkd_shipment_value?.pickup_lng]);
  const dkd_dropoff_raw_point_value = useMemo(() => dkd_task_value
    ? (dkd_is_business_task_value ? dkd_business_dropoff_point_from_task_value(dkd_task_value) : dkd_coordinate_pair_value(dkd_task_value?.dropoff_lat, dkd_task_value?.dropoff_lng))
    : dkd_coordinate_pair_value(dkd_shipment_value?.dropoff_lat, dkd_shipment_value?.dropoff_lng), [dkd_task_value, dkd_is_business_task_value, dkd_shipment_value?.dropoff_lat, dkd_shipment_value?.dropoff_lng]);
  const dkd_courier_point_key_value = dkd_point_cache_key_value(dkd_courier_point_value);
  const dkd_pickup_raw_point_key_value = dkd_point_cache_key_value(dkd_pickup_raw_point_value);
  const dkd_dropoff_raw_point_key_value = dkd_point_cache_key_value(dkd_dropoff_raw_point_value);
  const dkd_business_pickup_geocode_key_value = dkd_point_cache_key_value(dkd_business_pickup_geocode_value?.dkd_point_value?.dkd_map_view_coordinate_value);
  const dkd_business_dropoff_geocode_key_value = dkd_point_cache_key_value(dkd_business_dropoff_geocode_value?.dkd_point_value?.dkd_map_view_coordinate_value);
  const dkd_pickup_point_value = useMemo(() => (dkd_is_business_task_value
    ? dkd_prefer_verified_point_value(dkd_pickup_raw_point_value, dkd_business_pickup_geocode_value, true, dkd_pickup_address_text_value)
    : dkd_pickup_raw_point_value), [dkd_business_pickup_geocode_value, dkd_is_business_task_value, dkd_pickup_address_text_value, dkd_pickup_raw_point_value]);
  const dkd_dropoff_point_value = useMemo(() => (dkd_is_business_task_value
    ? dkd_prefer_verified_point_value(dkd_dropoff_raw_point_value, dkd_business_dropoff_geocode_value, true, dkd_delivery_address_text_value)
    : dkd_dropoff_raw_point_value), [dkd_business_dropoff_geocode_value, dkd_delivery_address_text_value, dkd_dropoff_raw_point_value, dkd_is_business_task_value]);
  const dkd_pickup_point_key_value = dkd_point_cache_key_value(dkd_pickup_point_value);
  const dkd_dropoff_point_key_value = dkd_point_cache_key_value(dkd_dropoff_point_value);
  const dkd_should_preview_open_business_route_value = dkd_is_business_task_value && dkd_raw_status_key_value === 'open' && Boolean(dkd_courier_point_value && dkd_pickup_point_value);
  const dkd_status_key_value = dkd_should_preview_open_business_route_value ? 'accepted' : dkd_raw_status_key_value;
  const dkd_is_waiting_assignment_value = dkd_status_key_value === 'open';
  const dkd_is_pickup_focus_value = dkd_is_pickup_focus_status_value(dkd_status_key_value);
  const dkd_should_show_business_pickup_marker_value = dkd_is_business_task_value ? dkd_is_pickup_focus_value : true;
  const dkd_should_show_business_dropoff_marker_value = dkd_is_business_task_value ? !dkd_is_pickup_focus_value : true;
  const dkd_is_day_map_value = useMemo(() => dkd_is_day_cycle_value(dkd_clock_tick_value), [dkd_clock_tick_value]);
  const dkd_map_style_value = dkd_is_day_map_value ? dkd_day_map_style_value : cityMapStyle;
  const dkd_bottom_map_padding_value = dkd_bottom_panel_collapsed_value ? 118 : 274;
  const dkd_bottom_fit_padding_value = dkd_bottom_panel_collapsed_value ? 138 : 290;

  const dkd_fit_route_overview_value = useCallback((dkd_is_forced_value = false) => {
    const dkd_map_instance_value = dkd_map_ref_value.current;
    if (!dkd_map_instance_value) return;
    if (!dkd_is_forced_value && (dkd_initial_camera_done_ref_value.current || dkd_user_interacted_ref_value.current)) return;

    const dkd_fit_is_pickup_focus_value = dkd_is_pickup_focus_status_value(dkd_status_key_value);
    const dkd_fit_should_include_overview_value = Array.isArray(dkd_delivery_overview_route_value?.dkd_point_list_value);
    const dkd_fit_phase_stop_point_value = dkd_is_business_task_value
      ? (dkd_fit_is_pickup_focus_value ? dkd_pickup_point_value : dkd_dropoff_point_value)
      : null;
    const dkd_fit_point_map_value = new Map();
    [
      ...(dkd_fit_is_pickup_focus_value && Array.isArray(dkd_courier_to_pickup_route_value?.dkd_point_list_value) ? dkd_courier_to_pickup_route_value.dkd_point_list_value : []),
      ...(!dkd_fit_is_pickup_focus_value && Array.isArray(dkd_courier_to_dropoff_route_value?.dkd_point_list_value) ? dkd_courier_to_dropoff_route_value.dkd_point_list_value : []),
      ...(dkd_fit_should_include_overview_value ? dkd_delivery_overview_route_value.dkd_point_list_value : []),
      dkd_courier_point_value,
      ...(dkd_is_business_task_value ? [dkd_fit_phase_stop_point_value] : [dkd_pickup_point_value, dkd_dropoff_point_value]),
    ].filter(Boolean).forEach((dkd_point_value) => {
      dkd_fit_point_map_value.set(`${dkd_point_value.latitude}:${dkd_point_value.longitude}`, dkd_point_value);
    });

    const dkd_fit_point_list_value = [...dkd_fit_point_map_value.values()];
    if (!dkd_fit_point_list_value.length) return;

    if (dkd_fit_point_list_value.length === 1) {
      dkd_map_instance_value.animateToRegion({
        latitude: dkd_fit_point_list_value[0].latitude,
        longitude: dkd_fit_point_list_value[0].longitude,
        latitudeDelta: 0.018,
        longitudeDelta: 0.018,
      }, 260);
      dkd_initial_camera_done_ref_value.current = true;
      return;
    }

    dkd_map_instance_value.fitToCoordinates(dkd_fit_point_list_value, {
      edgePadding: { top: 132, right: 56, bottom: dkd_bottom_fit_padding_value, left: 56 },
      animated: true,
    });
    dkd_initial_camera_done_ref_value.current = true;
  }, [
    dkd_courier_point_value,
    dkd_pickup_point_value,
    dkd_dropoff_point_value,
    dkd_courier_to_pickup_route_value,
    dkd_courier_to_dropoff_route_value,
    dkd_delivery_overview_route_value,
    dkd_bottom_fit_padding_value,
    dkd_is_business_task_value,
    dkd_status_key_value,
  ]);

  const dkd_focus_courier_value = useCallback((dkd_mark_user_interacted_value = true) => {
    if (!dkd_courier_point_value) return;
    if (dkd_mark_user_interacted_value) {
      dkd_user_interacted_ref_value.current = true;
    }
    if (dkd_native_mapbox_ready_value && dkd_mapbox_access_token_ready_value) {
      setDkdNativeCameraModeValue('dkd_courier');
      setDkdNativeCameraFocusKeyValue((dkd_previous_value) => dkd_previous_value + 1);
      dkd_initial_camera_done_ref_value.current = true;
      return;
    }
    if (!dkd_map_ref_value.current) return;
    dkd_map_ref_value.current.animateToRegion({
      latitude: dkd_courier_point_value.latitude,
      longitude: dkd_courier_point_value.longitude,
      latitudeDelta: 0.006,
      longitudeDelta: 0.006,
    }, 280);
    dkd_initial_camera_done_ref_value.current = true;
  }, [dkd_courier_point_value]);

  const dkd_show_route_overview_value = useCallback(() => {
    dkd_user_interacted_ref_value.current = true;
    setDkdNativeCameraModeValue('dkd_overview');
    setDkdNativeCameraFocusKeyValue((dkd_previous_value) => dkd_previous_value + 1);
    dkd_fit_route_overview_value(true);
  }, [dkd_fit_route_overview_value]);

  useEffect(() => {
    if (!dkd_visible_value) return undefined;
    setDkdClockTickValue(Date.now());
    const dkd_interval_value = setInterval(() => {
      setDkdClockTickValue(Date.now());
    }, 60000);
    return () => clearInterval(dkd_interval_value);
  }, [dkd_visible_value]);

  useEffect(() => {
    if (!dkd_visible_value) return;
    dkd_initial_camera_done_ref_value.current = false;
    dkd_user_interacted_ref_value.current = false;
    setDkdBottomPanelCollapsedValue(true);
    setDkdNativeCameraModeValue('dkd_overview');
    setDkdNativeCameraFocusKeyValue(0);
    setDkdBusinessPickupGeocodeValue(null);
    setDkdBusinessDropoffGeocodeValue(null);
  }, [dkd_visible_value, dkd_shipment_value?.id, dkd_task_value?.id]);

  useEffect(() => {
    if (!dkd_visible_value || !dkd_is_business_task_value) return undefined;
    let dkd_cancelled_value = false;

    async function dkd_load_business_address_points_value() {
      const dkd_pickup_address_value = dkd_compact_address_text_value(dkd_pickup_address_text_value);
      const dkd_dropoff_address_value = dkd_compact_address_text_value(dkd_delivery_address_text_value);
      try {
        const dkd_should_geocode_pickup_value = Boolean(dkd_clean_business_route_address_text_value(dkd_pickup_address_value));
        const dkd_should_geocode_dropoff_value = Boolean(dkd_clean_business_route_address_text_value(dkd_dropoff_address_value));
        const dkd_pickup_query_value = dkd_should_geocode_pickup_value ? dkd_business_route_precise_query_text_value(dkd_pickup_address_value, 'pickup') : '';
        const dkd_dropoff_query_value = dkd_should_geocode_dropoff_value ? dkd_business_route_precise_query_text_value(dkd_dropoff_address_value, 'dropoff') : '';
        const dkd_pickup_landmark_value = dkd_should_geocode_pickup_value ? dkd_business_route_landmark_point_value(dkd_pickup_address_value) : null;
        const dkd_dropoff_landmark_value = dkd_should_geocode_dropoff_value ? dkd_business_route_landmark_point_value(dkd_dropoff_address_value) : null;
        const dkd_pickup_result_value = dkd_pickup_landmark_value || (dkd_pickup_query_value && dkd_pickup_query_value !== 'Adres yok'
          ? await dkd_fetch_mapbox_geocoding_place_value(dkd_pickup_query_value, {
              dkd_use_ankara_context_value: true,
              dkd_use_ankara_bbox_value: true,
              dkd_use_ankara_proximity_value: true,
              dkd_expected_place_text_value: dkd_business_route_address_alias_key_value(dkd_pickup_address_value) === 'dkd_metromall_avm' ? 'metromall' : '',
              dkd_forbidden_place_text_values: [dkd_delivery_address_text_value],
              dkd_types_value: 'poi,address,place,locality,neighborhood,district',
              dkd_limit_value: 10,
            })
          : null);
        const dkd_dropoff_result_value = dkd_dropoff_landmark_value || (dkd_dropoff_query_value && dkd_dropoff_query_value !== 'Adres yok'
          ? await dkd_fetch_mapbox_geocoding_place_value(dkd_dropoff_query_value, {
              dkd_use_ankara_context_value: true,
              dkd_use_ankara_bbox_value: true,
              dkd_use_ankara_proximity_value: true,
              dkd_expected_place_text_value: dkd_business_route_address_alias_key_value(dkd_dropoff_address_value) === 'dkd_ankamall_avm' ? 'ankamall' : '',
              dkd_forbidden_place_text_values: [dkd_pickup_address_text_value],
              dkd_types_value: 'poi,address,place,locality,neighborhood,district',
              dkd_limit_value: 10,
            })
          : null);
        if (dkd_cancelled_value) return;
        setDkdBusinessPickupGeocodeValue(dkd_should_geocode_pickup_value ? (dkd_pickup_result_value || { dkd_point_value: null, dkd_warning_text_value: 'İşletme adresi için Mapbox konum sonucu bekleniyor.' }) : null);
        setDkdBusinessDropoffGeocodeValue(dkd_should_geocode_dropoff_value ? (dkd_dropoff_result_value || { dkd_point_value: null, dkd_warning_text_value: 'Müşteri teslimat adresi için Mapbox konum sonucu bekleniyor.' }) : null);
      } catch {
        if (!dkd_cancelled_value) {
          setDkdBusinessPickupGeocodeValue({ dkd_point_value: null, dkd_warning_text_value: 'İşletme adresi Mapbox ile doğrulanamadı; eski koordinat kullanılmadı. İşletme panelindeki adresi daha açık yaz.' });
          setDkdBusinessDropoffGeocodeValue({ dkd_point_value: null, dkd_warning_text_value: 'Müşteri teslimat adresi Mapbox ile doğrulanamadı; eski koordinat kullanılmadı. Teslimat adresini daha açık yaz.' });
        }
      }
    }

    dkd_load_business_address_points_value();
    return () => {
      dkd_cancelled_value = true;
    };
  }, [
    dkd_visible_value,
    dkd_is_business_task_value,
    dkd_pickup_address_text_value,
    dkd_delivery_address_text_value,
    dkd_pickup_raw_point_key_value,
    dkd_dropoff_raw_point_key_value,
  ]);

  useEffect(() => {
    if (!dkd_visible_value) return;
    let dkd_cancelled_value = false;
    const dkd_request_serial_value = dkd_route_request_serial_ref_value.current + 1;
    dkd_route_request_serial_ref_value.current = dkd_request_serial_value;

    async function dkd_load_route_value() {
      setDkdRouteLoadingValue(true);
      try {
        const dkd_should_fetch_pickup_leg_value = dkd_status_key_value === 'accepted';
        const dkd_should_fetch_dropoff_leg_value = dkd_status_key_value === 'picked_up';
        const [
          dkd_next_courier_to_pickup_route_value,
          dkd_next_courier_to_dropoff_route_value,
          dkd_next_delivery_overview_route_value,
        ] = await Promise.all([
          dkd_should_fetch_pickup_leg_value && dkd_courier_point_value && dkd_pickup_point_value
            ? dkd_fetch_mapbox_route_value(dkd_courier_point_value, dkd_pickup_point_value)
            : Promise.resolve(null),
          dkd_should_fetch_dropoff_leg_value && dkd_courier_point_value && dkd_dropoff_point_value
            ? dkd_fetch_mapbox_route_value(dkd_courier_point_value, dkd_dropoff_point_value)
            : Promise.resolve(null),
          dkd_pickup_point_value && dkd_dropoff_point_value
            ? dkd_fetch_mapbox_route_value(dkd_pickup_point_value, dkd_dropoff_point_value)
            : Promise.resolve(null),
        ]);

        if (dkd_cancelled_value || dkd_request_serial_value !== dkd_route_request_serial_ref_value.current) return;
        setDkdCourierToPickupRouteValue(dkd_next_courier_to_pickup_route_value);
        setDkdCourierToDropoffRouteValue(dkd_next_courier_to_dropoff_route_value);
        setDkdDeliveryOverviewRouteValue(dkd_next_delivery_overview_route_value);
      } finally {
        if (!dkd_cancelled_value && dkd_request_serial_value === dkd_route_request_serial_ref_value.current) {
          setDkdRouteLoadingValue(false);
        }
      }
    }

    dkd_load_route_value();
    return () => {
      dkd_cancelled_value = true;
    };
  }, [dkd_visible_value, dkd_courier_point_key_value, dkd_courier_point_value, dkd_pickup_point_key_value, dkd_pickup_point_value, dkd_dropoff_point_key_value, dkd_dropoff_point_value, dkd_status_key_value]);
  useEffect(() => {
    if (!dkd_visible_value || dkd_initial_camera_done_ref_value.current) return undefined;
    const dkd_timeout_value = setTimeout(() => {
      if (dkd_courier_point_value && !dkd_is_waiting_assignment_value) {
        dkd_focus_courier_value(false);
        return;
      }
      dkd_fit_route_overview_value(false);
    }, 220);
    return () => clearTimeout(dkd_timeout_value);
  }, [
    dkd_visible_value,
    dkd_courier_point_value,
    dkd_pickup_point_value,
    dkd_dropoff_point_value,
    dkd_courier_to_pickup_route_value,
    dkd_courier_to_dropoff_route_value,
    dkd_delivery_overview_route_value,
    dkd_fit_route_overview_value,
    dkd_focus_courier_value,
    dkd_is_waiting_assignment_value,
  ]);

  const dkd_active_route_value = dkd_status_key_value === 'picked_up'
    ? dkd_courier_to_dropoff_route_value
    : dkd_status_key_value === 'accepted'
      ? dkd_courier_to_pickup_route_value
      : null;
  const dkd_route_derived_heading_deg_value = useMemo(() => dkd_route_heading_deg_value(dkd_courier_point_value, dkd_active_route_value), [dkd_active_route_value, dkd_courier_point_value]);
  const dkd_courier_marker_heading_deg_value = dkd_has_live_heading_value ? dkd_effective_heading_deg_value : dkd_route_derived_heading_deg_value;

  const dkd_initial_region_value = useMemo(() => dkd_initial_region_value_builder(dkd_courier_point_value, dkd_pickup_point_value, dkd_dropoff_point_value), [dkd_courier_point_value, dkd_pickup_point_value, dkd_dropoff_point_value]);
  const dkd_pickup_leg_distance_value = dkd_courier_to_pickup_route_value?.dkd_distance_km_value
    ?? dkd_haversine_km_between_points_value(dkd_courier_point_value, dkd_pickup_point_value);
  const dkd_dropoff_leg_distance_value = dkd_courier_to_dropoff_route_value?.dkd_distance_km_value
    ?? dkd_haversine_km_between_points_value(dkd_courier_point_value, dkd_dropoff_point_value);
  const dkd_delivery_overview_distance_value = dkd_delivery_overview_route_value?.dkd_distance_km_value
    ?? dkd_haversine_km_between_points_value(dkd_pickup_point_value, dkd_dropoff_point_value);
  const dkd_pickup_leg_duration_value = dkd_courier_to_pickup_route_value?.dkd_duration_min_value
    ?? dkd_estimated_eta_min_from_distance_value(dkd_pickup_leg_distance_value, 'accepted');
  const dkd_dropoff_leg_duration_value = dkd_courier_to_dropoff_route_value?.dkd_duration_min_value
    ?? dkd_estimated_eta_min_from_distance_value(dkd_dropoff_leg_distance_value, 'picked_up');
  const dkd_eta_display_value = dkd_is_waiting_assignment_value
    ? null
    : dkd_is_pickup_focus_value
      ? (dkd_pickup_leg_duration_value
        ?? (dkd_status_key_value === 'accepted' ? (dkd_task_value ? dkd_task_value?.eta_min : dkd_shipment_value?.courier_eta_min) : null)
        ?? dkd_active_route_value?.dkd_duration_min_value)
      : dkd_status_key_value === 'picked_up'
        ? dkd_dropoff_leg_duration_value
        : ((dkd_task_value ? dkd_task_value?.eta_min : dkd_shipment_value?.courier_eta_min) ?? dkd_active_route_value?.dkd_duration_min_value);
  const dkd_live_text_value = dkd_is_courier_panel_value
    ? 'Az önce güncellendi'
    : dkd_last_ping_text_value(dkd_effective_location_updated_at_value);
  const dkd_total_route_distance_value = dkd_is_waiting_assignment_value
    ? null
    : dkd_is_pickup_focus_value
      ? (dkd_pickup_leg_distance_value ?? dkd_haversine_km_between_points_value(dkd_courier_point_value, dkd_pickup_point_value))
      : dkd_delivery_overview_distance_value;
  const dkd_remaining_target_distance_value = dkd_is_waiting_assignment_value
    ? null
    : dkd_is_pickup_focus_value
      ? (dkd_pickup_leg_distance_value ?? dkd_haversine_km_between_points_value(dkd_courier_point_value, dkd_pickup_point_value))
      : (dkd_status_key_value === 'picked_up'
        ? dkd_dropoff_leg_distance_value
        : (dkd_dropoff_leg_distance_value ?? dkd_delivery_overview_distance_value));
  const dkd_phase_geocode_warning_text_value = dkd_is_business_task_value
    ? (dkd_is_pickup_focus_value ? dkd_business_pickup_geocode_value?.dkd_warning_text_value : dkd_business_dropoff_geocode_value?.dkd_warning_text_value)
    : '';
  const dkd_route_warning_text_value = String(
    dkd_phase_geocode_warning_text_value
    || dkd_active_route_value?.dkd_warning_text_value
    || dkd_delivery_overview_route_value?.dkd_warning_text_value
    || dkd_courier_to_pickup_route_value?.dkd_warning_text_value
    || dkd_courier_to_dropoff_route_value?.dkd_warning_text_value
    || '',
  ).trim();
  const dkd_should_use_native_mapbox_value = dkd_native_mapbox_ready_value && dkd_mapbox_access_token_ready_value;
  const dkd_native_mapbox_fallback_text_value = dkd_should_use_native_mapbox_value
    ? ''
    : dkd_mapbox_access_token_ready_value
      ? 'Expo Go / native Mapbox modülü hazır değilse harita Google fallback ile açılır; rota, km ve ETA yine Mapbox Directions API üzerinden hesaplanır.'
      : dkd_mapbox_access_token_problem_text_value();
  const dkd_should_show_delivery_overview_line_value = true;
  const dkd_mapbox_camera_points_value = useMemo(() => {
    const dkd_phase_stop_point_value = dkd_is_business_task_value
      ? (dkd_is_pickup_focus_value ? dkd_pickup_point_value : dkd_dropoff_point_value)
      : null;
    const dkd_point_map_value = new Map();
    [
      ...(dkd_is_pickup_focus_value && Array.isArray(dkd_courier_to_pickup_route_value?.dkd_point_list_value) ? dkd_courier_to_pickup_route_value.dkd_point_list_value : []),
      ...(!dkd_is_pickup_focus_value && Array.isArray(dkd_courier_to_dropoff_route_value?.dkd_point_list_value) ? dkd_courier_to_dropoff_route_value.dkd_point_list_value : []),
      ...(dkd_should_show_delivery_overview_line_value && Array.isArray(dkd_delivery_overview_route_value?.dkd_point_list_value) ? dkd_delivery_overview_route_value.dkd_point_list_value : []),
      dkd_courier_point_value,
      ...(dkd_is_business_task_value ? [dkd_phase_stop_point_value] : [dkd_pickup_point_value, dkd_dropoff_point_value]),
    ].filter(Boolean).forEach((dkd_point_value) => {
      dkd_point_map_value.set(`${dkd_point_value.latitude}:${dkd_point_value.longitude}`, dkd_point_value);
    });
    return [...dkd_point_map_value.values()];
  }, [
    dkd_courier_point_value,
    dkd_pickup_point_value,
    dkd_dropoff_point_value,
    dkd_courier_to_pickup_route_value,
    dkd_courier_to_dropoff_route_value,
    dkd_delivery_overview_route_value,
    dkd_is_business_task_value,
    dkd_is_pickup_focus_value,
    dkd_should_show_delivery_overview_line_value,
  ]);
  const dkd_mapbox_camera_target_points_value = useMemo(() => (
    dkd_native_camera_mode_value === 'dkd_courier' && dkd_courier_point_value
      ? [dkd_courier_point_value]
      : dkd_mapbox_camera_points_value
  ), [dkd_courier_point_value, dkd_mapbox_camera_points_value, dkd_native_camera_mode_value]);
  const dkd_mapbox_bounds_value = useMemo(
    () => dkd_mapbox_bounds_from_map_view_points_value(dkd_mapbox_camera_target_points_value, dkd_bottom_fit_padding_value),
    [dkd_bottom_fit_padding_value, dkd_mapbox_camera_target_points_value],
  );
  const dkd_native_mapbox_zoom_level_value = dkd_native_camera_mode_value === 'dkd_courier'
    ? 17.2
    : dkd_mapbox_bounds_value.dkd_bounds_value
      ? undefined
      : 13;
  const dkd_native_mapbox_camera_key_value = [
    dkd_native_camera_mode_value,
    dkd_native_camera_focus_key_value,
    dkd_mapbox_bounds_value.dkd_center_coordinate_value?.[0],
    dkd_mapbox_bounds_value.dkd_center_coordinate_value?.[1],
  ].join(':');
  const dkd_delivery_overview_shape_value = useMemo(
    () => dkd_mapbox_shape_from_map_view_points_value(dkd_delivery_overview_route_value?.dkd_point_list_value || []),
    [dkd_delivery_overview_route_value],
  );
  const dkd_active_route_shape_value = useMemo(
    () => dkd_mapbox_shape_from_map_view_points_value(dkd_active_route_value?.dkd_point_list_value || []),
    [dkd_active_route_value],
  );
  const dkd_navigation_point_value = dkd_is_pickup_focus_value ? dkd_pickup_point_value : dkd_dropoff_point_value;
  const dkd_summary_title_value = dkd_is_business_task_value
    ? (dkd_is_pickup_focus_value ? 'İşletmeye Rota' : 'Müşteriye Rota')
    : dkd_is_pickup_focus_value ? 'Gönderici Takibi' : 'Teslimat Takibi';
  const dkd_primary_distance_label_value = dkd_is_business_task_value
    ? (dkd_is_pickup_focus_value ? 'İşletmeye Kalan' : 'Müşteriye Kalan')
    : dkd_is_pickup_focus_value ? 'Göndericiye Kalan' : 'Teslime Kalan';
  const dkd_total_route_label_value = dkd_is_business_task_value
    ? (dkd_is_pickup_focus_value ? 'İşletme Rotası' : 'Müşteri Rotası')
    : dkd_is_pickup_focus_value ? 'Alım Rotası' : 'Müşteri Rotası';
  const dkd_route_focus_label_value = dkd_is_business_task_value
    ? (dkd_is_pickup_focus_value ? 'İşletme Konumu' : 'Müşteri Konumu')
    : dkd_is_pickup_focus_value ? 'Gönderici Konumu' : 'Teslim Edilecek';
  const dkd_route_focus_address_text_value = dkd_is_pickup_focus_value ? dkd_pickup_address_text_value : dkd_delivery_address_text_value;

  return (
    <Modal visible={dkd_visible_value} transparent={false} animationType="slide" onRequestClose={dkd_on_close_value}>
      <View style={dkd_styles.dkd_screen}>
        {dkd_should_use_native_mapbox_value ? (
          <dkd_mapbox_gl_value.MapView
            style={StyleSheet.absoluteFill}
            styleURL={dkd_is_day_map_value ? dkd_mapbox_original_day_style_url_value : dkd_mapbox_original_night_style_url_value}
            compassEnabled
            logoEnabled
            attributionEnabled
            onTouchStart={() => { dkd_user_interacted_ref_value.current = true; }}
          >
            <dkd_mapbox_gl_value.Camera
              key={dkd_native_mapbox_camera_key_value}
              zoomLevel={dkd_native_mapbox_zoom_level_value}
              centerCoordinate={dkd_mapbox_bounds_value.dkd_center_coordinate_value}
              bounds={dkd_native_camera_mode_value === 'dkd_courier' ? undefined : (dkd_mapbox_bounds_value.dkd_bounds_value || undefined)}
              animationMode="flyTo"
              animationDuration={650}
            />

            {dkd_should_show_delivery_overview_line_value && Array.isArray(dkd_delivery_overview_route_value?.dkd_point_list_value) && dkd_delivery_overview_route_value.dkd_point_list_value.length >= 2 ? (
              <dkd_mapbox_gl_value.ShapeSource id="dkd_cargo_delivery_overview_route_source" shape={dkd_delivery_overview_shape_value}>
                <dkd_mapbox_gl_value.LineLayer
                  id="dkd_cargo_delivery_overview_route_layer"
                  style={{ lineColor: '#5EE4FF', lineWidth: 4, lineOpacity: 0.42, lineCap: 'round', lineJoin: 'round' }}
                />
              </dkd_mapbox_gl_value.ShapeSource>
            ) : null}

            {Array.isArray(dkd_active_route_value?.dkd_point_list_value) && dkd_active_route_value.dkd_point_list_value.length >= 2 ? (
              <dkd_mapbox_gl_value.ShapeSource id="dkd_cargo_active_route_source" shape={dkd_active_route_shape_value}>
                <dkd_mapbox_gl_value.LineLayer
                  id="dkd_cargo_active_route_glow_layer"
                  style={{ lineColor: dkd_status_key_value === 'picked_up' ? '#4264FB' : '#FFD87C', lineWidth: 10, lineOpacity: 0.22, lineCap: 'round', lineJoin: 'round' }}
                />
                <dkd_mapbox_gl_value.LineLayer
                  id="dkd_cargo_active_route_core_layer"
                  style={{ lineColor: dkd_status_key_value === 'picked_up' ? '#4264FB' : '#FFD87C', lineWidth: 6, lineOpacity: 0.98, lineCap: 'round', lineJoin: 'round' }}
                />
              </dkd_mapbox_gl_value.ShapeSource>
            ) : null}

            {dkd_should_show_business_pickup_marker_value && dkd_pickup_point_value ? (
              <dkd_mapbox_gl_value.PointAnnotation id="dkd_cargo_pickup_marker" coordinate={dkd_mapbox_coordinate_from_map_view_point_value(dkd_pickup_point_value)}>
                <DkdStopMarker dkd_icon_name_value={dkd_is_business_task_value ? 'storefront-plus-outline' : 'storefront-check-outline'} dkd_tone_value="business" dkd_label_value={dkd_is_business_task_value ? 'İŞLETME' : 'ALIM'} />
              </dkd_mapbox_gl_value.PointAnnotation>
            ) : null}

            {dkd_should_show_business_dropoff_marker_value && dkd_dropoff_point_value ? (
              <dkd_mapbox_gl_value.PointAnnotation id="dkd_cargo_dropoff_marker" coordinate={dkd_mapbox_coordinate_from_map_view_point_value(dkd_dropoff_point_value)}>
                <DkdStopMarker dkd_icon_name_value={dkd_is_business_task_value ? 'account-check-outline' : 'account-heart-outline'} dkd_tone_value="customer" dkd_label_value={dkd_is_business_task_value ? 'MÜŞTERİ' : 'TESLİM'} />
              </dkd_mapbox_gl_value.PointAnnotation>
            ) : null}

            {dkd_courier_point_value ? (
              dkd_mapbox_gl_value.MarkerView ? (
                <dkd_mapbox_gl_value.MarkerView
                  key="dkd_cargo_courier_marker_stable"
                  id="dkd_cargo_courier_marker"
                  coordinate={dkd_mapbox_coordinate_from_map_view_point_value(dkd_courier_point_value)}
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <DkdCourierDirectionMarker dkd_vehicle_type_value={dkd_effective_vehicle_type_value} dkd_heading_deg_value={dkd_courier_marker_heading_deg_value} />
                </dkd_mapbox_gl_value.MarkerView>
              ) : (
                <dkd_mapbox_gl_value.PointAnnotation
                  key="dkd_cargo_courier_annotation_stable"
                  id="dkd_cargo_courier_marker"
                  coordinate={dkd_mapbox_coordinate_from_map_view_point_value(dkd_courier_point_value)}
                >
                  <DkdCourierDirectionMarker dkd_vehicle_type_value={dkd_effective_vehicle_type_value} dkd_heading_deg_value={dkd_courier_marker_heading_deg_value} />
                </dkd_mapbox_gl_value.PointAnnotation>
              )
            ) : null}
          </dkd_mapbox_gl_value.MapView>
        ) : (
          <MapView
            provider={PROVIDER_GOOGLE}
            ref={dkd_map_ref_value}
            style={StyleSheet.absoluteFill}
            initialRegion={{
              latitude: dkd_initial_region_value.latitude,
              longitude: dkd_initial_region_value.longitude,
              latitudeDelta: dkd_initial_region_value.latitudeDelta || 0.04,
              longitudeDelta: dkd_initial_region_value.longitudeDelta || 0.04,
            }}
            customMapStyle={dkd_map_style_value}
            rotateEnabled
            pitchEnabled={false}
            toolbarEnabled={false}
            showsCompass={false}
            showsTraffic={false}
            onPanDrag={() => { dkd_user_interacted_ref_value.current = true; }}
            mapPadding={{ top: 118, right: 14, bottom: dkd_bottom_map_padding_value, left: 14 }}
          >
            {dkd_should_show_delivery_overview_line_value && Array.isArray(dkd_delivery_overview_route_value?.dkd_point_list_value) && dkd_delivery_overview_route_value.dkd_point_list_value.length >= 2 ? (
              <Polyline
                coordinates={dkd_delivery_overview_route_value.dkd_point_list_value}
                strokeColor="rgba(94,228,255,0.42)"
                strokeWidth={4}
                lineCap="round"
                lineJoin="round"
              />
            ) : null}

            {Array.isArray(dkd_active_route_value?.dkd_point_list_value) && dkd_active_route_value.dkd_point_list_value.length >= 2 ? (
              <Polyline
                coordinates={dkd_active_route_value.dkd_point_list_value}
                strokeColor={dkd_status_key_value === 'picked_up' ? 'rgba(66,100,251,0.98)' : 'rgba(255,216,124,0.98)'}
                strokeWidth={6}
                lineCap="round"
                lineJoin="round"
              />
            ) : null}

            {dkd_should_show_business_pickup_marker_value && dkd_pickup_point_value ? (
              <Marker coordinate={dkd_pickup_point_value} anchor={dkd_make_native_axis_point(0.5, 1)} tracksViewChanges>
                <DkdStopMarker dkd_icon_name_value={dkd_is_business_task_value ? 'storefront-plus-outline' : 'storefront-check-outline'} dkd_tone_value="business" dkd_label_value={dkd_is_business_task_value ? 'İŞLETME' : 'ALIM'} />
              </Marker>
            ) : null}

            {dkd_should_show_business_dropoff_marker_value && dkd_dropoff_point_value ? (
              <Marker coordinate={dkd_dropoff_point_value} anchor={dkd_make_native_axis_point(0.5, 1)} tracksViewChanges>
                <DkdStopMarker dkd_icon_name_value={dkd_is_business_task_value ? 'account-check-outline' : 'account-heart-outline'} dkd_tone_value="customer" dkd_label_value={dkd_is_business_task_value ? 'MÜŞTERİ' : 'TESLİM'} />
              </Marker>
            ) : null}

            {dkd_courier_point_value ? (
              <Marker coordinate={dkd_courier_point_value} anchor={dkd_make_native_axis_point(0.5, 0.5)} tracksViewChanges={false} zIndex={999}>
                <DkdCourierDirectionMarker dkd_vehicle_type_value={dkd_effective_vehicle_type_value} dkd_heading_deg_value={dkd_courier_marker_heading_deg_value} />
              </Marker>
            ) : null}
          </MapView>
        )}

        <View style={dkd_styles.dkd_topOverlay} pointerEvents="box-none">
          <LinearGradient colors={['rgba(7,14,24,0.94)', 'rgba(7,14,24,0.74)']} style={dkd_styles.dkd_topCard}>
            <View style={dkd_styles.dkd_topRow}>
              <Pressable onPress={dkd_on_close_value} style={dkd_styles.dkd_roundButton}>
                <MaterialCommunityIcons name="arrow-left" size={22} color="#FFFFFF" />
              </Pressable>

              <View style={dkd_styles.dkd_topTitleWrap}>
                <Text style={dkd_styles.dkd_topEyebrow}>{dkd_is_business_task_value ? 'DKDmap' : 'KURYE TAKİP'}</Text>
                <Text numberOfLines={2} style={dkd_styles.dkd_topTitle}>{dkd_should_preview_open_business_route_value ? 'İşletmeye rota oluşturuldu' : dkd_status_label_value(dkd_effective_status_value, dkd_is_business_task_value)}</Text>
              </View>

              <Pressable onPress={dkd_on_refresh_value} style={dkd_styles.dkd_roundButton}>
                {dkd_refreshing_value ? <ActivityIndicator color="#FFFFFF" /> : <MaterialCommunityIcons name="refresh" size={21} color="#FFFFFF" />}
              </Pressable>
            </View>

            {dkd_is_courier_panel_value ? (
              <View style={dkd_styles.dkd_navigationRow}>
                <Pressable
                  onPress={() => dkd_open_external_navigation_value({
                    dkd_provider_value: 'google',
                    dkd_origin_point_value: dkd_courier_point_value,
                    dkd_destination_point_value: dkd_navigation_point_value,
                    dkd_fallback_address_value: dkd_status_key_value === 'accepted' ? dkd_pickup_address_text_value : dkd_delivery_address_text_value,
                  })}
                  style={[dkd_styles.dkd_navButton, dkd_styles.dkd_navButtonGoogle]}
                >
                  <View style={dkd_styles.dkd_navGoogleBadge}>
                    <View style={[dkd_styles.dkd_navGoogleDot, dkd_styles.dkd_navGoogleDotBlue]} />
                    <View style={[dkd_styles.dkd_navGoogleDot, dkd_styles.dkd_navGoogleDotRed]} />
                    <View style={[dkd_styles.dkd_navGoogleDot, dkd_styles.dkd_navGoogleDotYellow]} />
                    <View style={[dkd_styles.dkd_navGoogleDot, dkd_styles.dkd_navGoogleDotGreen]} />
                  </View>
                  <View style={dkd_styles.dkd_navCopy}>
                    <Text style={dkd_styles.dkd_navTitle}>Google Maps ile Git</Text>
                    <Text style={dkd_styles.dkd_navSub}>En hızlı rota</Text>
                  </View>
                  <MaterialCommunityIcons name="arrow-top-right" size={16} color="#F4FBFF" />
                </Pressable>

                <Pressable
                  onPress={() => dkd_open_external_navigation_value({
                    dkd_provider_value: 'yandex',
                    dkd_origin_point_value: dkd_courier_point_value,
                    dkd_destination_point_value: dkd_navigation_point_value,
                    dkd_fallback_address_value: dkd_status_key_value === 'accepted' ? dkd_pickup_address_text_value : dkd_delivery_address_text_value,
                  })}
                  style={[dkd_styles.dkd_navButton, dkd_styles.dkd_navButtonYandex]}
                >
                  <View style={dkd_styles.dkd_navYandexBadge}>
                    <Text style={dkd_styles.dkd_navYandexBadgeText}>Y</Text>
                  </View>
                  <View style={dkd_styles.dkd_navCopy}>
                    <Text style={dkd_styles.dkd_navTitle}>Yandex Maps ile Git</Text>
                    <Text style={dkd_styles.dkd_navSub}>Canlı trafik rotası</Text>
                  </View>
                  <MaterialCommunityIcons name="arrow-top-right" size={16} color="#F4FBFF" />
                </Pressable>
              </View>
            ) : null}
          </LinearGradient>
        </View>

        <View style={dkd_styles.dkd_sideButtonWrap} pointerEvents="box-none">
          <Pressable onPress={() => dkd_focus_courier_value(true)} style={dkd_styles.dkd_floatingMapButton}>
            <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={dkd_styles.dkd_bottomOverlay} pointerEvents="box-none">
          <LinearGradient
            colors={['rgba(7,14,24,0.94)', 'rgba(8,16,28,0.88)']}
            style={[dkd_styles.dkd_bottomCard, dkd_bottom_panel_collapsed_value ? dkd_styles.dkd_bottomCardCollapsed : null]}
          >
            <View style={dkd_styles.dkd_summaryHeroRow}>
              <View style={dkd_styles.dkd_summaryHeroCopy}>
                <Text style={dkd_styles.dkd_summaryHeroEyebrow}>CANLI ROTA</Text>
                <Text numberOfLines={1} style={dkd_styles.dkd_summaryHeroTitle}>{dkd_summary_title_value}</Text>
                <Text numberOfLines={1} style={dkd_styles.dkd_summaryHeroSub}>{dkd_live_text_value}</Text>
              </View>

              <View style={dkd_styles.dkd_summaryHeroActionGroup}>
                <Pressable onPress={dkd_show_route_overview_value} style={dkd_styles.dkd_summaryHeroActionChip}>
                  <MaterialCommunityIcons name="map-search-outline" size={15} color="#FFFFFF" />
                  <Text style={dkd_styles.dkd_summaryHeroActionText}>{dkd_total_route_label_value}</Text>
                </Pressable>
                <Pressable
                  onPress={() => setDkdBottomPanelCollapsedValue((dkd_prev_value) => !dkd_prev_value)}
                  style={dkd_styles.dkd_summaryHeroToggleChip}
                >
                  <MaterialCommunityIcons
                    name={dkd_bottom_panel_collapsed_value ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#FFFFFF"
                  />
                </Pressable>
              </View>
            </View>

            {dkd_bottom_panel_collapsed_value ? (
              <View style={dkd_styles.dkd_miniSummaryRow}>
                <View style={dkd_styles.dkd_miniSummaryCard}>
                  <Text style={dkd_styles.dkd_miniSummaryLabel}>Varış</Text>
                  <Text numberOfLines={1} adjustsFontSizeToFit style={dkd_styles.dkd_miniSummaryValue}>{dkd_is_waiting_assignment_value ? 'Bekleniyor' : dkd_eta_text_value(dkd_eta_display_value)}</Text>
                </View>
                <View style={dkd_styles.dkd_miniSummaryCard}>
                  <Text style={dkd_styles.dkd_miniSummaryLabel}>{dkd_primary_distance_label_value}</Text>
                  <Text numberOfLines={1} adjustsFontSizeToFit style={dkd_styles.dkd_miniSummaryValue}>{dkd_is_waiting_assignment_value ? '—' : dkd_distance_text_value(dkd_remaining_target_distance_value)}</Text>
                </View>
              </View>
            ) : (
              <>
                <View style={dkd_styles.dkd_metricGrid}>
                  <View style={dkd_styles.dkd_metricCard}>
                    <Text style={dkd_styles.dkd_metricLabel}>Varış</Text>
                    <Text numberOfLines={1} adjustsFontSizeToFit style={dkd_styles.dkd_metricValue}>{dkd_is_waiting_assignment_value ? 'Bekleniyor' : dkd_eta_text_value(dkd_eta_display_value)}</Text>
                  </View>
                  <View style={dkd_styles.dkd_metricCard}>
                    <Text style={dkd_styles.dkd_metricLabel}>{dkd_total_route_label_value}</Text>
                    <Text numberOfLines={1} adjustsFontSizeToFit style={dkd_styles.dkd_metricValue}>{dkd_is_waiting_assignment_value ? '—' : dkd_distance_text_value(dkd_total_route_distance_value)}</Text>
                  </View>
                  <View style={dkd_styles.dkd_metricCard}>
                    <Text style={dkd_styles.dkd_metricLabel}>{dkd_primary_distance_label_value}</Text>
                    <Text numberOfLines={1} adjustsFontSizeToFit style={dkd_styles.dkd_metricValue}>{dkd_is_waiting_assignment_value ? '—' : dkd_distance_text_value(dkd_remaining_target_distance_value)}</Text>
                  </View>
                  <View style={dkd_styles.dkd_metricCard}>
                    <Text style={dkd_styles.dkd_metricLabel}>Araç</Text>
                    <Text numberOfLines={1} adjustsFontSizeToFit style={dkd_styles.dkd_metricValue}>{dkd_vehicle_label_value(dkd_effective_vehicle_type_value)}</Text>
                  </View>
                </View>

                <View style={dkd_styles.dkd_legendCompactRow}>
                  <View style={dkd_styles.dkd_legendCompactItem}>
                    <View style={[dkd_styles.dkd_legendCompactLine, dkd_styles.dkd_legendCompactLineGold]} />
                    <Text style={dkd_styles.dkd_legendCompactText}>Alım</Text>
                  </View>
                  <View style={dkd_styles.dkd_legendCompactItem}>
                    <View style={[dkd_styles.dkd_legendCompactLine, dkd_styles.dkd_legendCompactLineGreen]} />
                    <Text style={dkd_styles.dkd_legendCompactText}>{dkd_is_business_task_value ? 'Müşteri' : 'Teslim Edilecek'}</Text>
                  </View>
                  <View style={dkd_styles.dkd_legendCompactItem}>
                    <View style={[dkd_styles.dkd_legendCompactLine, dkd_styles.dkd_legendCompactLineBlue]} />
                    <Text style={dkd_styles.dkd_legendCompactText}>Genel</Text>
                  </View>
                </View>

                <View style={dkd_styles.dkd_routeRailCard}>
                  <View style={dkd_styles.dkd_routeRailStopRow}>
                    <View style={[dkd_styles.dkd_addressIconWrap, dkd_styles.dkd_addressIconWrapGold]}>
                      <MaterialCommunityIcons name="storefront-outline" size={15} color="#08111C" />
                    </View>
                    <View style={dkd_styles.dkd_routeRailCopy}>
                      <Text style={dkd_styles.dkd_routeRailLabel}>{dkd_is_business_task_value ? 'İşletmeden Alım' : 'Göndericiden Alım'}</Text>
                      <Text numberOfLines={1} style={dkd_styles.dkd_routeRailAddress}>{dkd_compact_address_text_value(dkd_pickup_address_text_value)}</Text>
                    </View>
                  </View>

                  {dkd_is_pickup_focus_value ? null : (
                    <>
                      <View style={dkd_styles.dkd_routeRailDividerWrap}>
                        <View style={dkd_styles.dkd_routeRailDivider} />
                      </View>

                      <View style={dkd_styles.dkd_routeRailStopRow}>
                        <View style={[dkd_styles.dkd_addressIconWrap, dkd_styles.dkd_addressIconWrapGreen]}>
                          <MaterialCommunityIcons name="map-marker-check-outline" size={15} color="#08111C" />
                        </View>
                        <View style={dkd_styles.dkd_routeRailCopy}>
                          <Text style={dkd_styles.dkd_routeRailLabel}>{dkd_route_focus_label_value}</Text>
                          <Text numberOfLines={1} style={dkd_styles.dkd_routeRailAddress}>{dkd_compact_address_text_value(dkd_route_focus_address_text_value)}</Text>
                        </View>
                      </View>
                    </>
                  )}
                </View>
              </>
            )}

            {dkd_route_warning_text_value ? (
              <View style={dkd_styles.dkd_routeWarningRow}>
                <MaterialCommunityIcons name="mapbox" size={15} color="#FFE66D" />
                <Text style={dkd_styles.dkd_routeWarningText}>{dkd_route_warning_text_value}</Text>
              </View>
            ) : null}

            {dkd_native_mapbox_fallback_text_value ? (
              <View style={dkd_styles.dkd_routeWarningRow}>
                <MaterialCommunityIcons name="mapbox" size={15} color="#8CF2FF" />
                <Text style={dkd_styles.dkd_routeWarningText}>{dkd_native_mapbox_fallback_text_value}</Text>
              </View>
            ) : null}

            {(dkd_route_loading_value || dkd_refreshing_value) ? (
              <View style={dkd_styles.dkd_loadingRow}>
                <ActivityIndicator color={dkd_colors.cyanSoft} size="small" />
                <Text style={dkd_styles.dkd_loadingText}>DKDmap rota bilgisi hazırlanıyor</Text>
              </View>
            ) : null}
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const dkd_styles = StyleSheet.create({
  dkd_screen: {
    flex: 1,
    backgroundColor: '#060D17',
  },
  dkd_topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  dkd_topCard: {
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dkd_topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dkd_roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  dkd_topTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  dkd_topEyebrow: {
    color: 'rgba(162,228,255,0.82)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  dkd_topTitle: {
    marginTop: 3,
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
  },
  dkd_topBadgeRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  dkd_topBadge: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  dkd_topBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dkd_topBadgeText: {
    color: '#EAF4FF',
    fontSize: 12,
    fontWeight: '800',
    flexShrink: 1,
  },
  dkd_mapModeRow: {
    marginTop: 8,
    flexDirection: 'row',
  },
  dkd_navigationRow: {
    marginTop: 10,
    gap: 8,
  },
  dkd_navButton: {
    minHeight: 54,
    borderRadius: 18,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
  },
  dkd_navButtonGoogle: {
    backgroundColor: 'rgba(39,58,82,0.82)',
    borderColor: 'rgba(114,194,255,0.22)',
  },
  dkd_navButtonMapbox: {
    backgroundColor: 'rgba(123,255,217,0.17)',
    borderColor: 'rgba(123,255,217,0.24)',
  },
  dkd_navButtonYandex: {
    backgroundColor: 'rgba(59,22,28,0.82)',
    borderColor: 'rgba(255,107,123,0.24)',
  },
  dkd_navMapboxBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7BFFD9',
  },
  dkd_navGoogleBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 4,
    gap: 2,
  },
  dkd_navGoogleDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  dkd_navGoogleDotBlue: { backgroundColor: '#4285F4' },
  dkd_navGoogleDotRed: { backgroundColor: '#EA4335' },
  dkd_navGoogleDotYellow: { backgroundColor: '#FBBC05' },
  dkd_navGoogleDotGreen: { backgroundColor: '#34A853' },
  dkd_navYandexBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FF4B55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dkd_navYandexBadgeText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    marginTop: -1,
  },
  dkd_navCopy: {
    flex: 1,
    minWidth: 0,
  },
  dkd_navTitle: {
    color: '#F4FBFF',
    fontSize: 13,
    fontWeight: '900',
  },
  dkd_navSub: {
    marginTop: 2,
    color: '#AFC2D6',
    fontSize: 11,
    fontWeight: '700',
  },
  dkd_sideButtonWrap: {
    position: 'absolute',
    right: 12,
    top: 174,
    gap: 10,
  },
  dkd_floatingMapButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(7,14,24,0.90)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dkd_bottomOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  dkd_bottomCard: {
    borderRadius: 26,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dkd_bottomCardCollapsed: {
    paddingBottom: 10,
  },
  dkd_summaryHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dkd_summaryHeroCopy: {
    flex: 1,
    minWidth: 0,
  },
  dkd_summaryHeroEyebrow: {
    color: 'rgba(162,228,255,0.78)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.3,
  },
  dkd_summaryHeroTitle: {
    marginTop: 4,
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
  },
  dkd_summaryHeroSub: {
    marginTop: 4,
    color: '#B9C9D8',
    fontSize: 12,
    fontWeight: '700',
  },
  dkd_summaryHeroActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dkd_summaryHeroActionChip: {
    minHeight: 38,
    borderRadius: 19,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dkd_summaryHeroToggleChip: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dkd_summaryHeroActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  dkd_miniSummaryRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  dkd_miniSummaryCard: {
    flex: 1,
    minHeight: 62,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  dkd_miniSummaryLabel: {
    color: '#9FB1C6',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  dkd_miniSummaryValue: {
    marginTop: 7,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  dkd_metricGrid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dkd_metricCard: {
    width: '48.8%',
    minHeight: 84,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  dkd_metricLabel: {
    color: '#9FB1C6',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  dkd_metricValue: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  dkd_legendCompactRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  dkd_legendCompactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dkd_legendCompactLine: {
    width: 18,
    height: 4,
    borderRadius: 999,
  },
  dkd_legendCompactLineGold: {
    backgroundColor: 'rgba(255,216,124,0.98)',
  },
  dkd_legendCompactLineGreen: {
    backgroundColor: 'rgba(99,241,177,0.98)',
  },
  dkd_legendCompactLineBlue: {
    backgroundColor: 'rgba(94,228,255,0.76)',
  },
  dkd_legendCompactText: {
    color: '#C7D4E4',
    fontSize: 12,
    fontWeight: '700',
  },
  dkd_routeRailCard: {
    marginTop: 12,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  dkd_routeRailStopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dkd_routeRailCopy: {
    flex: 1,
    minWidth: 0,
  },
  dkd_routeRailLabel: {
    color: '#AFC2D5',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  dkd_routeRailAddress: {
    marginTop: 4,
    color: '#EDF5FF',
    fontSize: 14,
    fontWeight: '700',
  },
  dkd_routeRailDividerWrap: {
    paddingVertical: 8,
    paddingLeft: 13,
  },
  dkd_routeRailDivider: {
    width: 2,
    height: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  dkd_addressIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dkd_addressIconWrapGold: {
    backgroundColor: '#FFD87C',
  },
  dkd_addressIconWrapGreen: {
    backgroundColor: '#63F1B1',
  },
  dkd_routeWarningRow: {
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,230,109,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,230,109,0.18)',
  },
  dkd_routeWarningText: {
    flex: 1,
    color: 'rgba(255,255,255,0.82)',
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: '800',
  },
  dkd_loadingRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dkd_loadingText: {
    color: '#C7D4E4',
    fontSize: 12,
    fontWeight: '700',
  },
  dkd_courierMarkerShell: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  dkd_courierMarkerAnimatedHalo: {
    position: 'absolute',
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: 'rgba(36,200,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,92,173,0.42)',
  },
  dkd_courierMarkerOrbitRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(184,255,243,0.42)',
  },
  dkd_courierMarkerOrbitDot: {
    position: 'absolute',
    top: 4,
    alignSelf: 'center',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF5CAD',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  dkd_courierMarkerPulseOuter: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(41,182,255,0.10)',
    borderWidth: 1.2,
    borderColor: 'rgba(125,255,235,0.42)',
  },
  dkd_courierMarkerPulseMiddle: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(168,85,247,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
  },
  dkd_courierMarkerPulseInner: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(20,255,196,0.16)',
    shadowColor: '#29B6FF',
    shadowOpacity: 0.32,
    shadowRadius: 11,
    shadowOffset: { width: 0, height: 5 },
    elevation: 12,
  },
  dkd_courierMarkerCompassBase: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.80)',
    overflow: 'visible',
    shadowColor: '#00E5FF',
    shadowOpacity: 0.30,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 16,
  },
  dkd_courierMarkerGlassLayer: {
    position: 'absolute',
    top: 5,
    left: 9,
    width: 15,
    height: 32,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    transform: [{ rotate: '-24deg' }],
  },
  dkd_courierMarkerCoreRing: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.6,
    borderColor: 'rgba(125,255,235,0.64)',
    backgroundColor: 'rgba(6,22,38,0.30)',
  },
  dkd_courierMarkerNeonRing: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.2,
    borderColor: 'rgba(255,247,184,0.76)',
  },
  dkd_courierHeadingWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dkd_courierMarkerArrowPlate: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.1,
    borderColor: 'rgba(255,255,255,0.82)',
  },
  dkd_courierMarkerMotorBadge: {
    position: 'absolute',
    right: 2,
    bottom: 8,
    minWidth: 25,
    height: 20,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.90)',
  },
  dkd_courierMarkerSignalPill: {
    position: 'absolute',
    left: 0,
    top: 4,
    minHeight: 18,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.70)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  dkd_courierMarkerSignalText: {
    color: '#07111F',
    fontSize: 6,
    fontWeight: '900',
    letterSpacing: 0.45,
  },
  dkd_courierMarkerOkText: {
    color: '#06111A',
    fontSize: 8,
    fontWeight: '900',
  },
  dkd_stopMarkerShell: {
    width: 42,
    height: 54,
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'visible',
  },
  dkd_stopMarkerGlow: {
    position: 'absolute',
    top: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  dkd_stopMarkerBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
  },
  dkd_stopMarkerTail: {
    marginTop: 2,
    width: 2,
    height: 13,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.78)',
  },
  dkd_businessMarkerShell: {
    width: 62,
    height: 76,
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'visible',
  },
  dkd_businessMarkerGlow: {
    position: 'absolute',
    top: 3,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,190,73,0.24)',
  },
  dkd_businessMarkerBadge: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.86)',
  },
  dkd_businessMarkerLabel: {
    marginTop: -3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(7,14,24,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,216,124,0.42)',
  },
  dkd_businessMarkerLabelText: {
    color: '#FFF3CA',
    fontSize: 8,
    fontWeight: '900',
  },
  dkd_businessMarkerTail: {
    marginTop: 2,
    width: 3,
    height: 13,
    borderRadius: 999,
    backgroundColor: 'rgba(255,216,124,0.88)',
  },
  dkd_customerMarkerShell: {
    width: 58,
    height: 72,
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'visible',
  },
  dkd_customerMarkerGlow: {
    position: 'absolute',
    top: 4,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(117,245,255,0.22)',
  },
  dkd_customerMarkerBadge: {
    width: 42,
    height: 42,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.82)',
  },
  dkd_customerMarkerLabel: {
    marginTop: -3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(7,14,24,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(126,235,255,0.36)',
  },
  dkd_customerMarkerLabelText: {
    color: '#EAFBFF',
    fontSize: 8,
    fontWeight: '900',
  },
  dkd_customerMarkerTail: {
    marginTop: 2,
    width: 3,
    height: 13,
    borderRadius: 999,
    backgroundColor: 'rgba(126,235,255,0.86)',
  },
});

export default DkdCargoLiveMapModal;
