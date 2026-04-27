import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { cityLootTheme, cityMapStyle } from '../../theme/cityLootTheme';
import { dkd_make_native_axis_point } from '../../utils/dkdNativeAxis';

const dkd_colors = cityLootTheme.colors;
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
  const dkd_safe_lat_value = dkd_to_number_or_null(dkd_lat_value);
  const dkd_safe_lng_value = dkd_to_number_or_null(dkd_lng_value);
  if (dkd_safe_lat_value == null || dkd_safe_lng_value == null) return null;
  return {
    latitude: dkd_safe_lat_value,
    longitude: dkd_safe_lng_value,
  };
}

function dkd_heading_value(dkd_value) {
  const dkd_numeric_value = dkd_to_number_or_null(dkd_value);
  if (dkd_numeric_value == null) return 0;
  return ((dkd_numeric_value % 360) + 360) % 360;
}

function dkd_vehicle_icon_name_value(dkd_vehicle_type_value) {
  const dkd_key_value = String(dkd_vehicle_type_value || '').trim().toLowerCase();
  if (['moto', 'motor', 'motorcycle', 'bike'].includes(dkd_key_value)) return 'motorbike';
  if (['car', 'otomobil', 'sedan'].includes(dkd_key_value)) return 'car-sports';
  if (['van', 'panelvan'].includes(dkd_key_value)) return 'van-utility';
  if (['truck', 'kamyon', 'pickup'].includes(dkd_key_value)) return 'truck-delivery-outline';
  return 'car-connected';
}

function dkd_vehicle_label_value(dkd_vehicle_type_value) {
  const dkd_key_value = String(dkd_vehicle_type_value || '').trim().toLowerCase();
  if (['moto', 'motor', 'motorcycle', 'bike'].includes(dkd_key_value)) return 'Motosiklet';
  if (['car', 'otomobil', 'sedan'].includes(dkd_key_value)) return 'Otomobil';
  if (['van', 'panelvan'].includes(dkd_key_value)) return 'Panelvan';
  if (['truck', 'kamyon', 'pickup'].includes(dkd_key_value)) return 'Kamyonet';
  return dkd_key_value ? dkd_key_value.toUpperCase() : 'Kurye';
}

function dkd_status_label_value(dkd_status_value) {
  const dkd_key_value = String(dkd_status_value || 'open').toLowerCase();
  if (dkd_key_value === 'accepted') return 'Göndericiye gidiyor';
  if (dkd_key_value === 'picked_up') return 'Teslimat noktasına gidiyor';
  if (dkd_key_value === 'completed') return 'Teslim edildi';
  if (dkd_key_value === 'cancelled') return 'Teslimat iptal edildi';
  return 'Kurye bekleniyor';
}

function dkd_status_badge_value(dkd_status_value) {
  const dkd_key_value = String(dkd_status_value || 'open').toLowerCase();
  if (dkd_key_value === 'accepted') return 'ALIM';
  if (dkd_key_value === 'picked_up') return 'TESLİM EDİLECEK';
  if (dkd_key_value === 'completed') return 'TAMAM';
  if (dkd_key_value === 'cancelled') return 'İPTAL';
  return 'BEKLİYOR';
}

function dkd_status_tint_value(dkd_status_value) {
  const dkd_key_value = String(dkd_status_value || 'open').toLowerCase();
  if (dkd_key_value === 'accepted') return '#FFD87C';
  if (dkd_key_value === 'picked_up') return '#63F1B1';
  if (dkd_key_value === 'completed') return '#6BE5FF';
  if (dkd_key_value === 'cancelled') return '#FF7A7A';
  return '#9BA9BB';
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

function dkd_sum_number_list_value(...dkd_value_list_value) {
  let dkd_total_value = 0;
  let dkd_has_number_value = false;
  dkd_value_list_value.forEach((dkd_loop_value) => {
    const dkd_numeric_value = dkd_to_number_or_null(dkd_loop_value);
    if (dkd_numeric_value == null) return;
    dkd_total_value += dkd_numeric_value;
    dkd_has_number_value = true;
  });
  return dkd_has_number_value ? dkd_total_value : null;
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

function dkd_is_day_cycle_value(dkd_timestamp_value) {
  const dkd_hour_value = new Date(dkd_timestamp_value || Date.now()).getHours();
  return dkd_hour_value >= 7 && dkd_hour_value < 19;
}

function dkd_map_cycle_label_value(dkd_is_day_value) {
  return dkd_is_day_value ? 'Gündüz Haritası' : 'Gece Haritası';
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

  const dkd_candidate_url_list_value = dkd_provider_value === 'yandex' ? dkd_yandex_url_list_value : dkd_google_url_list_value;

  for (const dkd_url_value of dkd_candidate_url_list_value) {
    if (!dkd_url_value) continue;
    try {
      const dkd_can_open_value = await Linking.canOpenURL(dkd_url_value);
      if (!dkd_can_open_value && !dkd_url_value.startsWith('https://')) continue;
      await dkd_safe_open_url_value(dkd_url_value);
      return;
    } catch (_dkd_navigation_error_value) {
      // sıradaki fallback denenecek
    }
  }

  Alert.alert('Kurye', dkd_provider_value === 'yandex' ? 'Yandex Maps rotası açılamadı.' : 'Google Maps rotası açılamadı.');
}

function dkd_initial_region_value_builder(dkd_courier_point_value, dkd_pickup_point_value, dkd_dropoff_point_value) {
  if (dkd_courier_point_value) {
    return {
      latitude: dkd_courier_point_value.latitude,
      longitude: dkd_courier_point_value.longitude,
      latitudeDelta: 0.012,
      longitudeDelta: 0.012,
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

async function dkd_fetch_osrm_route_value(dkd_start_value, dkd_end_value) {
  if (!dkd_start_value || !dkd_end_value) {
    return {
      dkd_point_list_value: [],
      dkd_distance_km_value: null,
      dkd_duration_min_value: null,
      dkd_is_fallback_value: true,
    };
  }

  const dkd_fallback_value = {
    dkd_point_list_value: [dkd_start_value, dkd_end_value],
    dkd_distance_km_value: null,
    dkd_duration_min_value: null,
    dkd_is_fallback_value: true,
  };

  try {
    const dkd_url_value = `https://router.project-osrm.org/route/v1/driving/${dkd_start_value.longitude},${dkd_start_value.latitude};${dkd_end_value.longitude},${dkd_end_value.latitude}?overview=full&geometries=geojson&steps=false`;
    const dkd_response_value = await fetch(dkd_url_value);
    if (!dkd_response_value.ok) return dkd_fallback_value;
    const dkd_json_value = await dkd_response_value.json();
    const dkd_route_value = Array.isArray(dkd_json_value?.routes) ? dkd_json_value.routes[0] : null;
    const dkd_coordinate_list_value = Array.isArray(dkd_route_value?.geometry?.coordinates)
      ? dkd_route_value.geometry.coordinates
      : [];
    const dkd_point_list_value = dkd_coordinate_list_value
      .map((dkd_coordinate_value) => ({
        latitude: dkd_to_number_or_null(dkd_coordinate_value?.[1]),
        longitude: dkd_to_number_or_null(dkd_coordinate_value?.[0]),
      }))
      .filter((dkd_point_value) => dkd_point_value.latitude != null && dkd_point_value.longitude != null);

    if (!dkd_point_list_value.length) return dkd_fallback_value;

    return {
      dkd_point_list_value,
      dkd_distance_km_value: dkd_to_number_or_null(dkd_route_value?.distance) != null ? Number(dkd_route_value.distance) / 1000 : null,
      dkd_duration_min_value: dkd_to_number_or_null(dkd_route_value?.duration) != null ? Number(dkd_route_value.duration) / 60 : null,
      dkd_is_fallback_value: false,
    };
  } catch (_dkd_unused_error_value) {
    return dkd_fallback_value;
  }
}

function dkd_courier_direction_marker({ dkd_heading_deg_value = 0 }) {
  const dkd_safe_heading_value = dkd_heading_value(dkd_heading_deg_value);

  return (
    <View collapsable={false} renderToHardwareTextureAndroid style={dkd_styles.dkd_courierMarkerShell}>
      <View style={dkd_styles.dkd_courierMarkerHalo} />
      <View style={[dkd_styles.dkd_courierHeadingWrap, { transform: [{ rotate: `${dkd_safe_heading_value}deg` }] }]}> 
        <MaterialCommunityIcons name="navigation" size={26} color="#05070B" />
      </View>
    </View>
  );
}

function dkd_stop_marker({ dkd_icon_name_value, dkd_tone_value = 'cyan' }) {
  const dkd_palette_value = dkd_tone_value === 'green'
    ? ['#63F1B1', '#103628']
    : dkd_tone_value === 'gold'
      ? ['#FFD87C', '#352611']
      : ['#6BE5FF', '#13283A'];

  return (
    <View collapsable={false} renderToHardwareTextureAndroid style={dkd_styles.dkd_stopMarkerShell}>
      <View style={dkd_styles.dkd_stopMarkerGlow} />
      <LinearGradient colors={dkd_palette_value} style={dkd_styles.dkd_stopMarkerBadge}>
        <MaterialCommunityIcons name={dkd_icon_name_value} size={18} color="#08111C" />
      </LinearGradient>
      <View style={dkd_styles.dkd_stopMarkerTail} />
    </View>
  );
}

const DkdCourierDirectionMarker = dkd_courier_direction_marker;
const DkdStopMarker = dkd_stop_marker;

function dkd_cargo_live_map_modal({
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

  const dkd_effective_status_value = dkd_task_value ? dkd_job_phase_status_value(dkd_task_value) : String(dkd_shipment_value?.status || 'open').toLowerCase();
  const dkd_effective_heading_deg_value = dkd_task_value ? dkd_heading_value(dkd_current_location_value?.heading || dkd_current_location_value?.headingDeg || 0) : dkd_heading_value(dkd_shipment_value?.courier_heading_deg);
  const dkd_effective_vehicle_type_value = dkd_task_value ? (dkd_vehicle_type_value || dkd_task_value?.courier_vehicle_type || dkd_task_value?.vehicle_type || 'moto') : dkd_shipment_value?.courier_vehicle_type;
  const dkd_effective_location_updated_at_value = dkd_task_value ? (dkd_current_location_value?.updated_at || dkd_current_location_value?.timestamp || new Date().toISOString()) : dkd_shipment_value?.courier_location_updated_at;

  const dkd_courier_point_value = useMemo(() => dkd_task_value
    ? dkd_coordinate_pair_value(dkd_current_location_value?.lat, dkd_current_location_value?.lng)
    : dkd_coordinate_pair_value(dkd_shipment_value?.courier_lat, dkd_shipment_value?.courier_lng), [dkd_task_value, dkd_current_location_value?.lat, dkd_current_location_value?.lng, dkd_shipment_value?.courier_lat, dkd_shipment_value?.courier_lng]);
  const dkd_pickup_point_value = useMemo(() => dkd_task_value
    ? dkd_coordinate_pair_value(dkd_task_value?.pickup_lat, dkd_task_value?.pickup_lng)
    : dkd_coordinate_pair_value(dkd_shipment_value?.pickup_lat, dkd_shipment_value?.pickup_lng), [dkd_task_value, dkd_task_value?.pickup_lat, dkd_task_value?.pickup_lng, dkd_shipment_value?.pickup_lat, dkd_shipment_value?.pickup_lng]);
  const dkd_dropoff_point_value = useMemo(() => dkd_task_value
    ? dkd_coordinate_pair_value(dkd_task_value?.dropoff_lat, dkd_task_value?.dropoff_lng)
    : dkd_coordinate_pair_value(dkd_shipment_value?.dropoff_lat, dkd_shipment_value?.dropoff_lng), [dkd_task_value, dkd_task_value?.dropoff_lat, dkd_task_value?.dropoff_lng, dkd_shipment_value?.dropoff_lat, dkd_shipment_value?.dropoff_lng]);
  const dkd_status_key_value = dkd_effective_status_value;
  const dkd_is_waiting_assignment_value = dkd_status_key_value === 'open';
  const dkd_courier_heading_deg_value = dkd_effective_heading_deg_value;
  const dkd_active_tint_value = dkd_status_tint_value(dkd_effective_status_value);
  const dkd_is_day_map_value = useMemo(() => dkd_is_day_cycle_value(dkd_clock_tick_value), [dkd_clock_tick_value]);
  const dkd_map_style_value = dkd_is_day_map_value ? dkd_day_map_style_value : cityMapStyle;
  const dkd_bottom_map_padding_value = dkd_bottom_panel_collapsed_value ? 118 : 274;
  const dkd_bottom_fit_padding_value = dkd_bottom_panel_collapsed_value ? 138 : 290;

  const dkd_fit_route_overview_value = useCallback((dkd_is_forced_value = false) => {
    const dkd_map_instance_value = dkd_map_ref_value.current;
    if (!dkd_map_instance_value) return;
    if (!dkd_is_forced_value && (dkd_initial_camera_done_ref_value.current || dkd_user_interacted_ref_value.current)) return;

    const dkd_fit_point_map_value = new Map();
    [
      ...(Array.isArray(dkd_courier_to_pickup_route_value?.dkd_point_list_value) ? dkd_courier_to_pickup_route_value.dkd_point_list_value : []),
      ...(Array.isArray(dkd_courier_to_dropoff_route_value?.dkd_point_list_value) ? dkd_courier_to_dropoff_route_value.dkd_point_list_value : []),
      ...(Array.isArray(dkd_delivery_overview_route_value?.dkd_point_list_value) ? dkd_delivery_overview_route_value.dkd_point_list_value : []),
      dkd_courier_point_value,
      dkd_pickup_point_value,
      dkd_dropoff_point_value,
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
  ]);

  const dkd_focus_courier_value = useCallback((dkd_mark_user_interacted_value = true) => {
    if (!dkd_map_ref_value.current || !dkd_courier_point_value) return;
    if (dkd_mark_user_interacted_value) {
      dkd_user_interacted_ref_value.current = true;
    }
    dkd_map_ref_value.current.animateToRegion({
      latitude: dkd_courier_point_value.latitude,
      longitude: dkd_courier_point_value.longitude,
      latitudeDelta: 0.012,
      longitudeDelta: 0.012,
    }, 280);
    dkd_initial_camera_done_ref_value.current = true;
  }, [dkd_courier_point_value]);

  const dkd_show_route_overview_value = useCallback(() => {
    dkd_user_interacted_ref_value.current = true;
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
  }, [dkd_visible_value, dkd_shipment_value?.id]);

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
            ? dkd_fetch_osrm_route_value(dkd_courier_point_value, dkd_pickup_point_value)
            : Promise.resolve(null),
          dkd_should_fetch_dropoff_leg_value && dkd_courier_point_value && dkd_dropoff_point_value
            ? dkd_fetch_osrm_route_value(dkd_courier_point_value, dkd_dropoff_point_value)
            : Promise.resolve(null),
          dkd_pickup_point_value && dkd_dropoff_point_value
            ? dkd_fetch_osrm_route_value(dkd_pickup_point_value, dkd_dropoff_point_value)
            : Promise.resolve(null),
        ]);

        if (dkd_cancelled_value || dkd_request_serial_value != dkd_route_request_serial_ref_value.current) return;
        setDkdCourierToPickupRouteValue(dkd_next_courier_to_pickup_route_value);
        setDkdCourierToDropoffRouteValue(dkd_next_courier_to_dropoff_route_value);
        setDkdDeliveryOverviewRouteValue(dkd_next_delivery_overview_route_value);
      } finally {
        if (!dkd_cancelled_value && dkd_request_serial_value == dkd_route_request_serial_ref_value.current) {
          setDkdRouteLoadingValue(false);
        }
      }
    }

    dkd_load_route_value();
    return () => {
      dkd_cancelled_value = true;
    };
  }, [dkd_visible_value, dkd_courier_point_value, dkd_pickup_point_value, dkd_dropoff_point_value, dkd_status_key_value]);
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
  const dkd_delivery_overview_duration_value = dkd_delivery_overview_route_value?.dkd_duration_min_value
    ?? dkd_estimated_eta_min_from_distance_value(dkd_delivery_overview_distance_value, 'picked_up');
  const dkd_is_pickup_focus_value = dkd_is_pickup_focus_status_value(dkd_status_key_value);
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
  const dkd_pickup_address_text_value = dkd_task_value ? dkd_task_value?.pickup || dkd_task_value?.pickup_address_text : dkd_shipment_value?.pickup_address_text;
  const dkd_delivery_address_text_value = dkd_task_value ? dkd_task_value?.dropoff || dkd_task_value?.delivery_address_text : dkd_shipment_value?.delivery_address_text;
  const dkd_navigation_point_value = dkd_is_pickup_focus_value ? dkd_pickup_point_value : dkd_dropoff_point_value;
  const dkd_summary_title_value = dkd_is_pickup_focus_value ? 'Gönderici Takibi' : 'Teslimat Takibi';
  const dkd_primary_distance_label_value = dkd_is_pickup_focus_value ? 'Göndericiye Kalan' : 'Teslime Kalan';
  const dkd_total_route_label_value = dkd_is_pickup_focus_value ? 'Alım Rotası' : 'Toplam Rota';
  const dkd_route_focus_label_value = dkd_is_pickup_focus_value ? 'Gönderici Konumu' : 'Teslim Edilecek';
  const dkd_route_focus_address_text_value = dkd_is_pickup_focus_value ? dkd_pickup_address_text_value : dkd_delivery_address_text_value;

  return (
    <Modal visible={dkd_visible_value} transparent={false} animationType="slide" onRequestClose={dkd_on_close_value}>
      <View style={dkd_styles.dkd_screen}>
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
          {Array.isArray(dkd_delivery_overview_route_value?.dkd_point_list_value) && dkd_delivery_overview_route_value.dkd_point_list_value.length >= 2 ? (
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
              strokeColor={dkd_status_key_value === 'picked_up' ? 'rgba(99,241,177,0.98)' : 'rgba(255,216,124,0.98)'}
              strokeWidth={6}
              lineDashPattern={[10, 8]}
              lineCap="round"
              lineJoin="round"
            />
          ) : null}

          {dkd_courier_point_value ? (
            <Marker coordinate={dkd_courier_point_value} anchor={dkd_make_native_axis_point(0.5, 0.5)} tracksViewChanges>
              <DkdCourierDirectionMarker dkd_vehicle_type_value={dkd_shipment_value?.courier_vehicle_type} dkd_heading_deg_value={dkd_courier_heading_deg_value} />
            </Marker>
          ) : null}

          {dkd_pickup_point_value ? (
            <Marker coordinate={dkd_pickup_point_value} anchor={dkd_make_native_axis_point(0.5, 1)} tracksViewChanges>
              <DkdStopMarker dkd_icon_name_value="storefront-outline" dkd_tone_value="gold" />
            </Marker>
          ) : null}

          {dkd_dropoff_point_value ? (
            <Marker coordinate={dkd_dropoff_point_value} anchor={dkd_make_native_axis_point(0.5, 1)} tracksViewChanges>
              <DkdStopMarker dkd_icon_name_value="map-marker-check-outline" dkd_tone_value="green" />
            </Marker>
          ) : null}
        </MapView>

        <View style={dkd_styles.dkd_topOverlay} pointerEvents="box-none">
          <LinearGradient colors={['rgba(7,14,24,0.94)', 'rgba(7,14,24,0.74)']} style={dkd_styles.dkd_topCard}>
            <View style={dkd_styles.dkd_topRow}>
              <Pressable onPress={dkd_on_close_value} style={dkd_styles.dkd_roundButton}>
                <MaterialCommunityIcons name="arrow-left" size={22} color="#FFFFFF" />
              </Pressable>

              <View style={dkd_styles.dkd_topTitleWrap}>
                <Text style={dkd_styles.dkd_topEyebrow}>KURYE TAKİP</Text>
                <Text numberOfLines={2} style={dkd_styles.dkd_topTitle}>{dkd_status_label_value(dkd_effective_status_value)}</Text>
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
                  <Text style={dkd_styles.dkd_summaryHeroActionText}>Rota Genel</Text>
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
                    <Text style={dkd_styles.dkd_legendCompactText}>Teslim Edilecek</Text>
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
                      <Text style={dkd_styles.dkd_routeRailLabel}>Göndericiden Alım</Text>
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

            {(dkd_route_loading_value || dkd_refreshing_value) ? (
              <View style={dkd_styles.dkd_loadingRow}>
                <ActivityIndicator color={dkd_colors.cyanSoft} size="small" />
                <Text style={dkd_styles.dkd_loadingText}>Rota ve canlı km bilgisi güncelleniyor</Text>
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
    width: 8,
    height: 8,
    borderRadius: 4,
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
  dkd_navButtonYandex: {
    backgroundColor: 'rgba(59,22,28,0.82)',
    borderColor: 'rgba(255,107,123,0.24)',
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
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  dkd_courierMarkerHalo: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.24)',
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  dkd_courierHeadingWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(7,14,24,0.20)',
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
});

export default dkd_cargo_live_map_modal;
