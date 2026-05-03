import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as DkdExpoLocation from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  dkd_configure_mapbox_access_token_value,
  dkd_fetch_mapbox_directions_route_value,
  dkd_fetch_mapbox_geocoding_place_value,
  dkd_map_view_point_list_from_mapbox_coordinates_value,
  dkd_mapbox_access_token_problem_text_value,
  dkd_mapbox_access_token_ready_value,
  dkd_mapbox_geojson_line_value,
  dkd_number_or_null_value,
  dkd_point_from_lat_lng_value,
} from '../../services/dkd_mapbox_route_service';
import { dkd_make_native_axis_point } from '../../utils/dkdNativeAxis';
import {
  dkd_fetch_urgent_courier_map_order,
  dkd_ping_urgent_courier_live_location,
} from '../../services/dkd_urgent_courier_service';

const dkd_default_center_coordinate_value = [32.85411, 39.92077];
const dkd_default_region_value = {
  latitude: 39.92077,
  longitude: 32.85411,
  latitudeDelta: 0.18,
  longitudeDelta: 0.18,
};

let dkd_mapbox_gl_value = null;
try {
  const dkd_mapbox_module_value = require('@rnmapbox/maps');
  dkd_mapbox_gl_value = dkd_mapbox_module_value?.default || dkd_mapbox_module_value;
} catch {
  dkd_mapbox_gl_value = null;
}

const dkd_native_mapbox_ready_value = Boolean(dkd_mapbox_gl_value?.MapView && dkd_configure_mapbox_access_token_value(dkd_mapbox_gl_value));

function dkd_order_customer_point_value(dkd_order_value) {
  return dkd_point_from_lat_lng_value(
    dkd_order_value?.dkd_customer_lat ?? dkd_order_value?.customer_lat ?? dkd_order_value?.delivery_lat ?? dkd_order_value?.dropoff_lat ?? dkd_order_value?.lat,
    dkd_order_value?.dkd_customer_lng ?? dkd_order_value?.customer_lng ?? dkd_order_value?.delivery_lng ?? dkd_order_value?.dropoff_lng ?? dkd_order_value?.lng,
  );
}

function dkd_order_courier_point_value(dkd_order_value) {
  return dkd_point_from_lat_lng_value(
    dkd_order_value?.dkd_courier_lat ?? dkd_order_value?.courier_lat ?? dkd_order_value?.live_lat,
    dkd_order_value?.dkd_courier_lng ?? dkd_order_value?.courier_lng ?? dkd_order_value?.live_lng,
  );
}

function dkd_coordinate_key_value(dkd_point_value) {
  if (!dkd_point_value) return '';
  return `${dkd_point_value.dkd_lng_value.toFixed(6)},${dkd_point_value.dkd_lat_value.toFixed(6)}`;
}

function dkd_format_distance_value(dkd_km_value) {
  const dkd_numeric_value = dkd_number_or_null_value(dkd_km_value);
  if (dkd_numeric_value == null || dkd_numeric_value <= 0) return '—';
  return `${dkd_numeric_value.toLocaleString('tr-TR', { minimumFractionDigits: dkd_numeric_value < 10 ? 1 : 0, maximumFractionDigits: 1 })} km`;
}

function dkd_format_eta_value(dkd_min_value) {
  const dkd_numeric_value = dkd_number_or_null_value(dkd_min_value);
  if (dkd_numeric_value == null || dkd_numeric_value <= 0) return '—';
  return `${Math.max(1, Math.round(dkd_numeric_value))} dk`;
}

function dkd_last_ping_text_value(dkd_iso_value) {
  if (!dkd_iso_value) return 'Canlı ping bekleniyor';
  const dkd_date_value = new Date(dkd_iso_value);
  if (Number.isNaN(dkd_date_value.getTime())) return 'Canlı ping bekleniyor';
  const dkd_seconds_value = Math.max(0, Math.round((Date.now() - dkd_date_value.getTime()) / 1000));
  if (dkd_seconds_value < 8) return 'Az önce güncellendi';
  if (dkd_seconds_value < 60) return `${dkd_seconds_value} sn önce güncellendi`;
  const dkd_minutes_value = Math.round(dkd_seconds_value / 60);
  if (dkd_minutes_value < 60) return `${dkd_minutes_value} dk önce güncellendi`;
  return `${Math.round(dkd_minutes_value / 60)} sa önce güncellendi`;
}

function dkd_mapbox_status_label_value(dkd_status_value) {
  const dkd_status_key_value = String(dkd_status_value || '').toLowerCase();
  if (dkd_status_key_value === 'dkd_on_the_way') return 'Müşteriye gidiliyor';
  if (dkd_status_key_value === 'dkd_invoice_uploaded') return 'Ürünler teslim alınacak';
  if (dkd_status_key_value === 'dkd_product_total_approved') return 'Satın alma onaylandı';
  if (dkd_status_key_value === 'dkd_fee_paid_shopping') return 'Kurye alışverişte';
  if (dkd_status_key_value === 'dkd_fee_offer_waiting') return 'Taşıma ücreti onayı bekleniyor';
  return 'Acil Kurye canlı takip';
}

function dkd_bounds_from_points_value(dkd_point_values) {
  const dkd_valid_point_values = dkd_point_values.filter(Boolean);
  if (!dkd_valid_point_values.length) {
    return {
      dkd_center_coordinate_value: dkd_default_center_coordinate_value,
      dkd_bounds_value: null,
    };
  }
  const dkd_lng_values = dkd_valid_point_values.map((dkd_point_value) => dkd_point_value.dkd_lng_value);
  const dkd_lat_values = dkd_valid_point_values.map((dkd_point_value) => dkd_point_value.dkd_lat_value);
  const dkd_min_lng_value = Math.min(...dkd_lng_values);
  const dkd_max_lng_value = Math.max(...dkd_lng_values);
  const dkd_min_lat_value = Math.min(...dkd_lat_values);
  const dkd_max_lat_value = Math.max(...dkd_lat_values);
  const dkd_center_coordinate_value = [
    (dkd_min_lng_value + dkd_max_lng_value) / 2,
    (dkd_min_lat_value + dkd_max_lat_value) / 2,
  ];
  if (dkd_valid_point_values.length < 2) return { dkd_center_coordinate_value, dkd_bounds_value: null };
  const dkd_lng_padding_value = Math.max(0.002, Math.abs(dkd_max_lng_value - dkd_min_lng_value) * 0.2);
  const dkd_lat_padding_value = Math.max(0.002, Math.abs(dkd_max_lat_value - dkd_min_lat_value) * 0.2);
  return {
    dkd_center_coordinate_value,
    dkd_bounds_value: {
      sw: [dkd_min_lng_value - dkd_lng_padding_value, dkd_min_lat_value - dkd_lat_padding_value],
      ne: [dkd_max_lng_value + dkd_lng_padding_value, dkd_max_lat_value + dkd_lat_padding_value],
      paddingTop: 130,
      paddingBottom: 260,
      paddingLeft: 54,
      paddingRight: 54,
    },
  };
}

function dkd_region_from_points_value(dkd_point_values) {
  const dkd_valid_point_values = dkd_point_values.filter(Boolean);
  if (!dkd_valid_point_values.length) return dkd_default_region_value;

  const dkd_lat_values = dkd_valid_point_values.map((dkd_point_value) => dkd_point_value.dkd_map_view_coordinate_value.latitude);
  const dkd_lng_values = dkd_valid_point_values.map((dkd_point_value) => dkd_point_value.dkd_map_view_coordinate_value.longitude);
  const dkd_min_lat_value = Math.min(...dkd_lat_values);
  const dkd_max_lat_value = Math.max(...dkd_lat_values);
  const dkd_min_lng_value = Math.min(...dkd_lng_values);
  const dkd_max_lng_value = Math.max(...dkd_lng_values);
  const dkd_lat_delta_value = Math.max(0.012, Math.abs(dkd_max_lat_value - dkd_min_lat_value) * 1.8);
  const dkd_lng_delta_value = Math.max(0.012, Math.abs(dkd_max_lng_value - dkd_min_lng_value) * 1.8);

  return {
    latitude: (dkd_min_lat_value + dkd_max_lat_value) / 2,
    longitude: (dkd_min_lng_value + dkd_max_lng_value) / 2,
    latitudeDelta: dkd_lat_delta_value,
    longitudeDelta: dkd_lng_delta_value,
  };
}


function dkd_close_region_from_point_value(dkd_point_value, dkd_zoom_tight_value = true) {
  if (!dkd_point_value?.dkd_map_view_coordinate_value) return dkd_default_region_value;
  const dkd_delta_value = dkd_zoom_tight_value ? 0.0048 : 0.009;
  return {
    latitude: dkd_point_value.dkd_map_view_coordinate_value.latitude,
    longitude: dkd_point_value.dkd_map_view_coordinate_value.longitude,
    latitudeDelta: dkd_delta_value,
    longitudeDelta: dkd_delta_value,
  };
}

function DkdFallbackMapMarker({ dkd_kind_value, dkd_label_value, dkd_icon_name_value }) {
  return (
    <DkdMapboxMarker
      dkd_kind_value={dkd_kind_value}
      dkd_label_value={dkd_label_value}
      dkd_icon_name_value={dkd_icon_name_value}
    />
  );
}

function DkdMapboxMarker({ dkd_kind_value, dkd_label_value, dkd_icon_name_value }) {
  const dkd_is_courier_value = dkd_kind_value === 'dkd_courier';
  return (
    <View style={dkd_styles.dkd_marker_shell} collapsable={false}>
      <LinearGradient
        colors={dkd_is_courier_value ? ['#7BFFD9', '#68E8FF', '#8B7CFF'] : ['#FFE66D', '#FF8A5B', '#FF5C93']}
        start={dkd_make_native_axis_point(0, 0)}
        end={dkd_make_native_axis_point(1, 1)}
        style={dkd_styles.dkd_marker_gradient}
      >
        <MaterialCommunityIcons name={dkd_icon_name_value} size={26} color="#07111E" />
      </LinearGradient>
      <Text style={dkd_styles.dkd_marker_label}>{dkd_label_value}</Text>
    </View>
  );
}

function dkd_render_native_mapbox_marker_value({ dkd_marker_id_value, dkd_coordinate_value, dkd_kind_value, dkd_label_value, dkd_icon_name_value }) {
  const dkd_marker_view_component_value = dkd_mapbox_gl_value?.MarkerView || null;
  const dkd_marker_child_value = (
    <DkdMapboxMarker dkd_kind_value={dkd_kind_value} dkd_label_value={dkd_label_value} dkd_icon_name_value={dkd_icon_name_value} />
  );
  if (dkd_marker_view_component_value) {
    return React.createElement(
      dkd_marker_view_component_value,
      { key: dkd_marker_id_value, id: dkd_marker_id_value, coordinate: dkd_coordinate_value, anchor: dkd_make_native_axis_point(0.5, 0.85) },
      dkd_marker_child_value,
    );
  }
  const dkd_point_annotation_component_value = dkd_mapbox_gl_value?.PointAnnotation || null;
  if (!dkd_point_annotation_component_value) return null;
  return React.createElement(
    dkd_point_annotation_component_value,
    { key: dkd_marker_id_value, id: dkd_marker_id_value, coordinate: dkd_coordinate_value },
    dkd_marker_child_value,
  );
}

function DkdMapboxMetric({ dkd_icon_name_value, dkd_label_value, dkd_value }) {
  return (
    <View style={dkd_styles.dkd_metric_card}>
      <MaterialCommunityIcons name={dkd_icon_name_value} size={16} color="#8CF2FF" />
      <Text style={dkd_styles.dkd_metric_label}>{dkd_label_value}</Text>
      <Text style={dkd_styles.dkd_metric_value}>{dkd_value}</Text>
    </View>
  );
}

export default function DkdMapboxUrgentLiveMapModal({
  dkd_visible_value,
  dkd_order_value,
  dkd_user_role_key_value = 'dkd_customer',
  dkd_on_close_value,
  dkd_on_order_refresh_value,
}) {
  const [dkd_live_order_value, setDkdLiveOrderValue] = useState(dkd_order_value || null);
  const [dkd_route_value, setDkdRouteValue] = useState(null);
  const [dkd_route_loading_value, setDkdRouteLoadingValue] = useState(false);
  const [dkd_location_permission_text_value, setDkdLocationPermissionTextValue] = useState('');
  const [dkd_local_courier_point_value, setDkdLocalCourierPointValue] = useState(null);
  const [dkd_geocoded_customer_point_value, setDkdGeocodedCustomerPointValue] = useState(null);
  const [dkd_geocode_status_text_value, setDkdGeocodeStatusTextValue] = useState('');
  const [dkd_camera_mode_value, setDkdCameraModeValue] = useState('dkd_courier');
  const dkd_location_subscription_ref_value = useRef(null);
  const dkd_refresh_busy_ref_value = useRef(false);
  const dkd_order_id_value = String(dkd_live_order_value?.dkd_order_id || dkd_order_value?.dkd_order_id || '').trim();
  const dkd_is_courier_value = dkd_user_role_key_value === 'dkd_courier';
  const dkd_raw_customer_point_value = useMemo(() => dkd_order_customer_point_value(dkd_live_order_value || dkd_order_value), [dkd_live_order_value, dkd_order_value]);
  const dkd_remote_courier_point_value = useMemo(() => dkd_order_courier_point_value(dkd_live_order_value || dkd_order_value), [dkd_live_order_value, dkd_order_value]);
  const dkd_courier_point_value = dkd_local_courier_point_value || dkd_remote_courier_point_value;
  const dkd_customer_address_text_value = String((dkd_live_order_value || dkd_order_value)?.dkd_customer_address_text || '').trim();
  const dkd_has_customer_written_address_value = dkd_customer_address_text_value.length >= 4;
  const dkd_should_resolve_customer_address_value = dkd_has_customer_written_address_value;
  const dkd_should_use_geocoded_customer_value = Boolean(dkd_should_resolve_customer_address_value && dkd_geocoded_customer_point_value);
  const dkd_customer_point_value = (dkd_should_use_geocoded_customer_value ? dkd_geocoded_customer_point_value : null) || dkd_raw_customer_point_value;
  const dkd_point_summary_value = `${dkd_coordinate_key_value(dkd_courier_point_value)}>${dkd_coordinate_key_value(dkd_customer_point_value)}`;
  const dkd_route_camera_points_value = useMemo(() => [dkd_courier_point_value, dkd_customer_point_value].filter(Boolean), [dkd_courier_point_value, dkd_customer_point_value]);
  const dkd_active_camera_points_value = useMemo(() => {
    if (dkd_camera_mode_value === 'dkd_courier' && dkd_courier_point_value) return [dkd_courier_point_value];
    if (dkd_camera_mode_value === 'dkd_customer' && dkd_customer_point_value) return [dkd_customer_point_value];
    return dkd_route_camera_points_value;
  }, [dkd_camera_mode_value, dkd_courier_point_value, dkd_customer_point_value, dkd_route_camera_points_value]);
  const dkd_map_bounds_value = useMemo(() => dkd_bounds_from_points_value(dkd_active_camera_points_value), [dkd_active_camera_points_value]);

  const dkd_refresh_order_value = useCallback(async () => {
    if (!dkd_order_id_value || dkd_refresh_busy_ref_value.current) return;
    dkd_refresh_busy_ref_value.current = true;
    try {
      const { data: dkd_data_value, error: dkd_error_value } = await dkd_fetch_urgent_courier_map_order(dkd_order_id_value);
      if (dkd_error_value) throw dkd_error_value;
      if (dkd_data_value?.dkd_order) {
        setDkdLiveOrderValue(dkd_data_value.dkd_order);
        dkd_on_order_refresh_value?.(dkd_data_value.dkd_order);
      }
    } catch (dkd_error_value) {
      setDkdLocationPermissionTextValue(dkd_error_value?.message || 'Canlı takip verisi yenilenemedi.');
    } finally {
      dkd_refresh_busy_ref_value.current = false;
    }
  }, [dkd_on_order_refresh_value, dkd_order_id_value]);

  useEffect(() => {
    if (!dkd_visible_value) return;
    setDkdLiveOrderValue(dkd_order_value || null);
  }, [dkd_order_value, dkd_visible_value]);

  useEffect(() => {
    if (!dkd_visible_value) {
      setDkdGeocodedCustomerPointValue(null);
      setDkdGeocodeStatusTextValue('');
      return undefined;
    }
    if (dkd_customer_address_text_value.length < 4) {
      setDkdGeocodedCustomerPointValue(null);
      setDkdGeocodeStatusTextValue('');
      return undefined;
    }
    let dkd_cancelled_value = false;
    async function dkd_geocode_customer_address_value() {
      setDkdGeocodeStatusTextValue('Teslimat adresi DKDmap ile netleştiriliyor...');
      const dkd_geocode_result_value = await dkd_fetch_mapbox_geocoding_place_value(dkd_customer_address_text_value, {
        dkd_use_ankara_proximity_value: true,
        dkd_use_ankara_bbox_value: true,
        dkd_use_ankara_context_value: true,
        dkd_types_value: 'poi,address,street,place,locality,neighborhood,district',
        dkd_limit_value: 10,
      });
      if (dkd_cancelled_value) return;
      if (dkd_geocode_result_value?.dkd_point_value) {
        setDkdGeocodedCustomerPointValue(dkd_geocode_result_value.dkd_point_value);
        setDkdGeocodeStatusTextValue(dkd_raw_customer_point_value ? 'Teslimat adresi DKDmap ile doğrulandı; rota müşteri adresine göre çiziliyor.' : 'Teslimat adresi DKDmap konumuna çevrildi.');
      } else {
        setDkdGeocodedCustomerPointValue(null);
        setDkdGeocodeStatusTextValue(dkd_geocode_result_value?.dkd_warning_text_value || 'Teslimat adresinden DKDmap konumu bulunamadı.');
      }
    }
    dkd_geocode_customer_address_value();
    return () => {
      dkd_cancelled_value = true;
    };
  }, [dkd_customer_address_text_value, dkd_raw_customer_point_value, dkd_visible_value]);

  useEffect(() => {
    if (!dkd_visible_value) return;
    setDkdCameraModeValue('dkd_courier');
  }, [dkd_order_id_value, dkd_visible_value]);

  useEffect(() => {
    if (!dkd_visible_value || !dkd_order_id_value) return undefined;
    dkd_refresh_order_value();
    const dkd_interval_value = setInterval(() => {
      dkd_refresh_order_value();
    }, 7000);
    return () => clearInterval(dkd_interval_value);
  }, [dkd_order_id_value, dkd_refresh_order_value, dkd_visible_value]);

  useEffect(() => {
    if (!dkd_visible_value || !dkd_is_courier_value || !dkd_order_id_value) return undefined;
    let dkd_cancelled_value = false;
    async function dkd_start_live_location_value() {
      try {
        const dkd_permission_value = await DkdExpoLocation.requestForegroundPermissionsAsync();
        if (dkd_cancelled_value) return;
        if (dkd_permission_value?.status !== 'granted') {
          setDkdLocationPermissionTextValue('Kurye canlı takibi için konum izni gerekli.');
          return;
        }
        const dkd_subscription_value = await DkdExpoLocation.watchPositionAsync(
          {
            accuracy: DkdExpoLocation.Accuracy.Balanced,
            timeInterval: 8000,
            distanceInterval: 12,
          },
          async (dkd_location_value) => {
            const dkd_lat_value = dkd_number_or_null_value(dkd_location_value?.coords?.latitude);
            const dkd_lng_value = dkd_number_or_null_value(dkd_location_value?.coords?.longitude);
            if (dkd_lat_value == null || dkd_lng_value == null) return;
            const dkd_next_point_value = dkd_point_from_lat_lng_value(dkd_lat_value, dkd_lng_value);
            setDkdLocalCourierPointValue(dkd_next_point_value);
            await dkd_ping_urgent_courier_live_location(dkd_order_id_value, {
              dkd_live_lat: dkd_lat_value,
              dkd_live_lng: dkd_lng_value,
              dkd_heading_deg: dkd_number_or_null_value(dkd_location_value?.coords?.heading),
            });
            dkd_refresh_order_value();
          },
        );
        if (dkd_cancelled_value) {
          dkd_subscription_value?.remove?.();
          return;
        }
        dkd_location_subscription_ref_value.current = dkd_subscription_value;
      } catch (dkd_error_value) {
        setDkdLocationPermissionTextValue(dkd_error_value?.message || 'Kurye konumu başlatılamadı.');
      }
    }
    dkd_start_live_location_value();
    return () => {
      dkd_cancelled_value = true;
      dkd_location_subscription_ref_value.current?.remove?.();
      dkd_location_subscription_ref_value.current = null;
    };
  }, [dkd_is_courier_value, dkd_order_id_value, dkd_refresh_order_value, dkd_visible_value]);

  useEffect(() => {
    if (!dkd_visible_value || !dkd_courier_point_value || !dkd_customer_point_value) {
      setDkdRouteValue(null);
      return undefined;
    }
    let dkd_cancelled_value = false;
    async function dkd_load_route_value() {
      setDkdRouteLoadingValue(true);
      try {
        const dkd_next_route_value = await dkd_fetch_mapbox_directions_route_value(dkd_courier_point_value, dkd_customer_point_value, {
          dkd_max_fallback_distance_km_value: 120,
        });
        if (!dkd_cancelled_value) setDkdRouteValue(dkd_next_route_value);
      } catch (dkd_error_value) {
        if (!dkd_cancelled_value) {
          setDkdRouteValue({
            dkd_coordinate_values: [dkd_courier_point_value.dkd_coordinate_value, dkd_customer_point_value.dkd_coordinate_value],
            dkd_distance_km_value: null,
            dkd_duration_min_value: null,
            dkd_warning_text_value: dkd_error_value?.message || 'Mapbox rota çizgisi alınamadı.',
          });
        }
      } finally {
        if (!dkd_cancelled_value) setDkdRouteLoadingValue(false);
      }
    }
    dkd_load_route_value();
    return () => {
      dkd_cancelled_value = true;
    };
  }, [dkd_customer_point_value, dkd_courier_point_value, dkd_point_summary_value, dkd_visible_value]);

  const dkd_route_coordinate_values = Array.isArray(dkd_route_value?.dkd_coordinate_values) && dkd_route_value.dkd_coordinate_values.length >= 2
    ? dkd_route_value.dkd_coordinate_values
    : dkd_courier_point_value && dkd_customer_point_value
      ? [dkd_courier_point_value.dkd_coordinate_value, dkd_customer_point_value.dkd_coordinate_value]
      : [];
  const dkd_route_point_values = Array.isArray(dkd_route_value?.dkd_point_list_value) && dkd_route_value.dkd_point_list_value.length >= 2
    ? dkd_route_value.dkd_point_list_value
    : dkd_map_view_point_list_from_mapbox_coordinates_value(dkd_route_coordinate_values);
  const dkd_route_shape_value = dkd_mapbox_geojson_line_value(dkd_route_coordinate_values);
  const dkd_fallback_region_value = useMemo(() => {
    if (dkd_camera_mode_value === 'dkd_courier' && dkd_courier_point_value) return dkd_close_region_from_point_value(dkd_courier_point_value, true);
    if (dkd_camera_mode_value === 'dkd_customer' && dkd_customer_point_value) return dkd_close_region_from_point_value(dkd_customer_point_value, false);
    return dkd_region_from_points_value(dkd_route_camera_points_value);
  }, [dkd_camera_mode_value, dkd_courier_point_value, dkd_customer_point_value, dkd_route_camera_points_value]);
  const dkd_should_use_native_mapbox_value = dkd_native_mapbox_ready_value && dkd_mapbox_access_token_ready_value;
  const dkd_native_mapbox_fallback_text_value = dkd_should_use_native_mapbox_value
    ? ''
    : dkd_mapbox_access_token_ready_value
      ? 'Expo Go / native Mapbox modülü hazır değilse harita Google fallback ile açılır; rota verisi yine Mapbox Directions API üzerinden alınır.'
      : dkd_mapbox_access_token_problem_text_value();
  const dkd_eta_value = dkd_route_value?.dkd_duration_min_value ?? dkd_live_order_value?.dkd_courier_eta_min;
  const dkd_distance_value = dkd_route_value?.dkd_distance_km_value;
  const dkd_last_ping_value = dkd_live_order_value?.dkd_courier_location_updated_at;
  const dkd_has_accepted_courier_value = Boolean(String(dkd_live_order_value?.dkd_courier_user_id || dkd_order_value?.dkd_courier_user_id || '').trim());

  const dkd_open_google_navigation_value = useCallback(async () => {
    if (!dkd_customer_point_value) {
      Alert.alert('Google ile Git', 'Müşteri teslimat konumu bulunamadı.');
      return;
    }
    const dkd_destination_text_value = `${dkd_customer_point_value.dkd_lat_value},${dkd_customer_point_value.dkd_lng_value}`;
    const dkd_origin_text_value = dkd_courier_point_value ? `${dkd_courier_point_value.dkd_lat_value},${dkd_courier_point_value.dkd_lng_value}` : '';
    const dkd_google_url_value = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dkd_destination_text_value)}&travelmode=driving${dkd_origin_text_value ? `&origin=${encodeURIComponent(dkd_origin_text_value)}` : ''}`;
    await Linking.openURL(dkd_google_url_value);
  }, [dkd_courier_point_value, dkd_customer_point_value]);

  const dkd_focus_courier_value = useCallback(() => {
    if (!dkd_courier_point_value) {
      Alert.alert('DKDmap', dkd_has_accepted_courier_value ? 'Kabul eden kuryenin canlı konumu henüz gelmedi.' : 'Kurye siparişi kabul edince canlı takip başlayacak.');
      return;
    }
    setDkdCameraModeValue('dkd_courier');
  }, [dkd_courier_point_value, dkd_has_accepted_courier_value]);

  const dkd_focus_customer_value = useCallback(() => {
    if (!dkd_customer_point_value) {
      Alert.alert('DKDmap', 'Müşteri teslimat konumu henüz yok.');
      return;
    }
    setDkdCameraModeValue('dkd_customer');
  }, [dkd_customer_point_value]);

  const dkd_focus_customer_live_courier_value = useCallback(async () => {
    await dkd_refresh_order_value();
    if (!dkd_has_accepted_courier_value) {
      Alert.alert('Canlı Kurye', 'Kurye siparişi kabul edince canlı takip başlayacak.');
      return;
    }
    if (!dkd_courier_point_value) {
      Alert.alert('Canlı Kurye', 'Kabul eden kuryenin canlı konumu bekleniyor. Kurye konumu geldiğinde takip otomatik güncellenir.');
      return;
    }
    setDkdCameraModeValue('dkd_courier');
  }, [dkd_courier_point_value, dkd_has_accepted_courier_value, dkd_refresh_order_value]);

  if (!dkd_visible_value) return null;

  return (
    <Modal visible={dkd_visible_value} transparent={false} animationType="slide" onRequestClose={dkd_on_close_value}>
      <View style={dkd_styles.dkd_screen}>
        {dkd_should_use_native_mapbox_value ? (
          <dkd_mapbox_gl_value.MapView style={StyleSheet.absoluteFill} styleURL={dkd_mapbox_gl_value.StyleURL?.Dark || dkd_mapbox_gl_value.StyleURL?.Street} compassEnabled logoEnabled={false} attributionEnabled={false}>
            <dkd_mapbox_gl_value.Camera
              zoomLevel={dkd_camera_mode_value === 'dkd_courier' && dkd_courier_point_value ? 16.4 : dkd_camera_mode_value === 'dkd_customer' && dkd_customer_point_value ? 16.2 : dkd_map_bounds_value.dkd_bounds_value ? undefined : 14.2}
              centerCoordinate={dkd_camera_mode_value === 'dkd_courier' && dkd_courier_point_value ? dkd_courier_point_value.dkd_coordinate_value : dkd_camera_mode_value === 'dkd_customer' && dkd_customer_point_value ? dkd_customer_point_value.dkd_coordinate_value : dkd_map_bounds_value.dkd_center_coordinate_value}
              bounds={dkd_camera_mode_value === 'dkd_courier' && dkd_courier_point_value ? undefined : dkd_camera_mode_value === 'dkd_customer' && dkd_customer_point_value ? undefined : dkd_map_bounds_value.dkd_bounds_value || undefined}
              animationMode="flyTo"
              animationDuration={700}
            />
            {dkd_route_coordinate_values.length >= 2 ? (
              <dkd_mapbox_gl_value.ShapeSource id="dkd_urgent_route_source" shape={dkd_route_shape_value}>
                <dkd_mapbox_gl_value.LineLayer
                  id="dkd_urgent_route_glow_layer"
                  style={{ lineColor: '#72E7FF', lineWidth: 9, lineOpacity: 0.24, lineCap: 'round', lineJoin: 'round' }}
                />
                <dkd_mapbox_gl_value.LineLayer
                  id="dkd_urgent_route_core_layer"
                  style={{ lineColor: '#4264FB', lineWidth: 5, lineOpacity: 0.94, lineCap: 'round', lineJoin: 'round' }}
                />
              </dkd_mapbox_gl_value.ShapeSource>
            ) : null}
            {dkd_courier_point_value ? dkd_render_native_mapbox_marker_value({
              dkd_marker_id_value: 'dkd_urgent_courier_marker',
              dkd_coordinate_value: dkd_courier_point_value.dkd_coordinate_value,
              dkd_kind_value: 'dkd_courier',
              dkd_label_value: 'Kurye',
              dkd_icon_name_value: 'motorbike',
            }) : null}
            {dkd_customer_point_value ? dkd_render_native_mapbox_marker_value({
              dkd_marker_id_value: 'dkd_urgent_customer_marker',
              dkd_coordinate_value: dkd_customer_point_value.dkd_coordinate_value,
              dkd_kind_value: 'dkd_customer',
              dkd_label_value: 'Müşteri',
              dkd_icon_name_value: 'account-circle',
            }) : null}
          </dkd_mapbox_gl_value.MapView>
        ) : (
          <MapView
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFill}
            initialRegion={dkd_fallback_region_value}
            region={dkd_fallback_region_value}
            rotateEnabled
            pitchEnabled={false}
            toolbarEnabled={false}
            showsCompass={false}
            showsTraffic
          >
            {dkd_route_point_values.length >= 2 ? (
              <Polyline
                coordinates={dkd_route_point_values}
                strokeColor="rgba(66,100,251,0.94)"
                strokeWidth={6}
                lineCap="round"
                lineJoin="round"
              />
            ) : null}
            {dkd_courier_point_value ? (
              <Marker coordinate={dkd_courier_point_value.dkd_map_view_coordinate_value} anchor={dkd_make_native_axis_point(0.5, 0.5)} tracksViewChanges>
                <DkdFallbackMapMarker dkd_kind_value="dkd_courier" dkd_label_value="Kurye" dkd_icon_name_value="motorbike" />
              </Marker>
            ) : null}
            {dkd_customer_point_value ? (
              <Marker coordinate={dkd_customer_point_value.dkd_map_view_coordinate_value} anchor={dkd_make_native_axis_point(0.5, 1)} tracksViewChanges>
                <DkdFallbackMapMarker dkd_kind_value="dkd_customer" dkd_label_value="Müşteri" dkd_icon_name_value="account-circle" />
              </Marker>
            ) : null}
          </MapView>
        )}

        <View style={dkd_styles.dkd_top_panel} pointerEvents="box-none">
          <LinearGradient colors={['rgba(6,12,22,0.96)', 'rgba(9,20,38,0.76)']} style={dkd_styles.dkd_top_card}>
            <Pressable onPress={dkd_on_close_value} style={dkd_styles.dkd_close_button}>
              <MaterialCommunityIcons name="close" size={20} color="#FFFFFF" />
            </Pressable>
            <View style={dkd_styles.dkd_top_title_row}>
              <View style={dkd_styles.dkd_top_icon_shell}>
                <MaterialCommunityIcons name="mapbox" size={21} color="#07111E" />
              </View>
              <View style={dkd_styles.dkd_top_copy}>
                <Text style={dkd_styles.dkd_top_kicker}>DKD CANLI TAKİP</Text>
                <Text style={dkd_styles.dkd_top_title}>{dkd_mapbox_status_label_value(dkd_live_order_value?.dkd_status_key)}</Text>
                <Text style={dkd_styles.dkd_top_text} numberOfLines={2}>{dkd_live_order_value?.dkd_customer_address_text || 'Teslimat adresi bekleniyor'}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>


        <View style={dkd_styles.dkd_side_control_panel} pointerEvents="box-none">
          <Pressable onPress={dkd_focus_courier_value} style={[dkd_styles.dkd_side_control_button, dkd_camera_mode_value === 'dkd_courier' && dkd_styles.dkd_side_control_button_active]}>
            <MaterialCommunityIcons name="crosshairs-gps" size={18} color={dkd_camera_mode_value === 'dkd_courier' ? '#06111A' : '#FFFFFF'} />
            <Text style={[dkd_styles.dkd_side_control_text, dkd_camera_mode_value === 'dkd_courier' && dkd_styles.dkd_side_control_text_active]}>Kurye</Text>
          </Pressable>
          <Pressable onPress={dkd_focus_customer_value} style={[dkd_styles.dkd_side_control_button, dkd_camera_mode_value === 'dkd_customer' && dkd_styles.dkd_side_control_button_active]}>
            <MaterialCommunityIcons name="account-circle-outline" size={18} color={dkd_camera_mode_value === 'dkd_customer' ? '#06111A' : '#FFFFFF'} />
            <Text style={[dkd_styles.dkd_side_control_text, dkd_camera_mode_value === 'dkd_customer' && dkd_styles.dkd_side_control_text_active]}>Müşteri</Text>
          </Pressable>
        </View>

        <View style={dkd_styles.dkd_bottom_panel}>
          <LinearGradient colors={['rgba(8,18,33,0.98)', 'rgba(11,26,48,0.94)']} style={dkd_styles.dkd_bottom_card}>
            <View style={dkd_styles.dkd_metric_row}>
              <DkdMapboxMetric dkd_icon_name_value="clock-fast" dkd_label_value="Tahmini Süre" dkd_value={dkd_format_eta_value(dkd_eta_value)} />
              <DkdMapboxMetric dkd_icon_name_value="map-marker-distance" dkd_label_value="Kalan Mesafe" dkd_value={dkd_format_distance_value(dkd_distance_value)} />
              <DkdMapboxMetric dkd_icon_name_value="radar" dkd_label_value="Ping" dkd_value={dkd_last_ping_text_value(dkd_last_ping_value)} />
            </View>

            {!dkd_customer_point_value ? (
              <View style={dkd_styles.dkd_warning_box}>
                <MaterialCommunityIcons name="map-marker-alert-outline" size={18} color="#FFE66D" />
                <Text style={dkd_styles.dkd_warning_text}>{dkd_has_customer_written_address_value ? 'Teslimat koordinatı yok; yazılan adres DKDmap ile konuma çevriliyor.' : 'Bu siparişte müşteri konumu yok. Canlı takip için sipariş oluştururken “Teslimat konumumu ekle” kullanılmalı.'}</Text>
              </View>
            ) : null}
            {!dkd_courier_point_value ? (
              <View style={dkd_styles.dkd_warning_box}>
                <MaterialCommunityIcons name="bike-fast" size={18} color="#8CF2FF" />
                <Text style={dkd_styles.dkd_warning_text}>{dkd_is_courier_value ? 'Kurye canlı konumu bekleniyor. Bu ekran açıkken konum ping’i gönderilir.' : dkd_has_accepted_courier_value ? 'Kabul eden kuryenin canlı konumu bekleniyor. Konum geldiğinde takip otomatik başlar.' : 'Kurye siparişi kabul edince canlı takip başlayacak.'}</Text>
              </View>
            ) : null}
            {dkd_geocode_status_text_value ? (
              <View style={dkd_styles.dkd_warning_box}>
                <MaterialCommunityIcons name="map-search-outline" size={18} color="#8CF2FF" />
                <Text style={dkd_styles.dkd_warning_text}>{dkd_geocode_status_text_value}</Text>
              </View>
            ) : null}
            {dkd_route_value?.dkd_warning_text_value ? (
              <View style={dkd_styles.dkd_warning_box}>
                <MaterialCommunityIcons name="routes" size={18} color="#FFB4C8" />
                <Text style={dkd_styles.dkd_warning_text}>{dkd_route_value.dkd_warning_text_value}</Text>
              </View>
            ) : null}
            {dkd_native_mapbox_fallback_text_value ? (
              <View style={dkd_styles.dkd_warning_box}>
                <MaterialCommunityIcons name="mapbox" size={18} color="#8CF2FF" />
                <Text style={dkd_styles.dkd_warning_text}>{dkd_native_mapbox_fallback_text_value}</Text>
              </View>
            ) : null}
            {dkd_location_permission_text_value ? (
              <View style={dkd_styles.dkd_warning_box}>
                <MaterialCommunityIcons name="crosshairs-question" size={18} color="#FFE66D" />
                <Text style={dkd_styles.dkd_warning_text}>{dkd_location_permission_text_value}</Text>
              </View>
            ) : null}

            <View style={dkd_styles.dkd_action_row}>
              <Pressable onPress={dkd_refresh_order_value} style={dkd_styles.dkd_secondary_button}>
                {dkd_route_loading_value ? <ActivityIndicator size="small" color="#07111E" /> : <MaterialCommunityIcons name="refresh" size={17} color="#07111E" />}
                <Text style={dkd_styles.dkd_secondary_button_text}>Yenile</Text>
              </Pressable>
              <Pressable onPress={dkd_is_courier_value ? dkd_open_google_navigation_value : dkd_focus_customer_live_courier_value} style={dkd_styles.dkd_primary_button}>
                <LinearGradient colors={['#7BFFD9', '#8CF2FF', '#FFE66D']} start={dkd_make_native_axis_point(0, 0)} end={dkd_make_native_axis_point(1, 1)} style={StyleSheet.absoluteFill} />
                <MaterialCommunityIcons name={dkd_is_courier_value ? 'navigation-variant-outline' : 'bike-fast'} size={17} color="#07111E" />
                <Text style={dkd_styles.dkd_primary_button_text}>{dkd_is_courier_value ? 'Google ile Git' : 'Kuryeyi Takip Et'}</Text>
              </Pressable>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const dkd_styles = StyleSheet.create({
  dkd_screen: {
    flex: 1,
    backgroundColor: '#050A13',
  },
  dkd_top_panel: {
    position: 'absolute',
    top: 46,
    left: 14,
    right: 14,
  },
  dkd_top_card: {
    minHeight: 104,
    borderRadius: 26,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  dkd_close_button: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    zIndex: 4,
  },
  dkd_top_title_row: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 38,
  },
  dkd_top_icon_shell: {
    width: 44,
    height: 44,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7BFFD9',
  },
  dkd_top_copy: {
    flex: 1,
    gap: 3,
  },
  dkd_top_kicker: {
    color: '#8CF2FF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.9,
  },
  dkd_top_title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  dkd_top_text: {
    color: 'rgba(231,241,255,0.72)',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  dkd_marker_shell: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dkd_marker_gradient: {
    width: 46,
    height: 46,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.82)',
  },
  dkd_marker_label: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    backgroundColor: 'rgba(5,10,19,0.78)',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  dkd_side_control_panel: {
    position: 'absolute',
    right: 14,
    top: 176,
    gap: 9,
    zIndex: 6,
  },
  dkd_side_control_button: {
    minWidth: 76,
    minHeight: 44,
    borderRadius: 18,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: 'rgba(6,12,22,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  dkd_side_control_button_active: {
    backgroundColor: '#8CF2FF',
    borderColor: 'rgba(255,255,255,0.82)',
  },
  dkd_side_control_text: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  dkd_side_control_text_active: {
    color: '#06111A',
  },
  dkd_bottom_panel: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 22,
  },
  dkd_bottom_card: {
    borderRadius: 28,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    gap: 12,
    overflow: 'hidden',
  },
  dkd_metric_row: {
    flexDirection: 'row',
    gap: 9,
  },
  dkd_metric_card: {
    flex: 1,
    minHeight: 74,
    borderRadius: 18,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    gap: 3,
  },
  dkd_metric_label: {
    color: 'rgba(231,241,255,0.62)',
    fontSize: 9,
    fontWeight: '900',
  },
  dkd_metric_value: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  dkd_warning_box: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  dkd_warning_text: {
    flex: 1,
    color: 'rgba(231,241,255,0.76)',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 16,
  },
  dkd_action_row: {
    flexDirection: 'row',
    gap: 10,
  },
  dkd_secondary_button: {
    flex: 0.72,
    minHeight: 48,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    backgroundColor: '#8CF2FF',
  },
  dkd_secondary_button_text: {
    color: '#07111E',
    fontSize: 12,
    fontWeight: '900',
  },
  dkd_primary_button: {
    flex: 1,
    minHeight: 48,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    overflow: 'hidden',
  },
  dkd_primary_button_text: {
    color: '#07111E',
    fontSize: 12,
    fontWeight: '900',
  },
  dkd_missing_token_panel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  dkd_missing_token_title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  dkd_missing_token_text: {
    color: 'rgba(231,241,255,0.72)',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 19,
  },
});
