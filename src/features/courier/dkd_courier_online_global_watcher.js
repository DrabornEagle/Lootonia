import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Modal, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  acceptCourierJob,
  dkd_reject_courier_job,
  dkd_set_courier_online_status,
  fetchCourierJobs,
} from '../../services/courierService';
import { dkd_make_native_axis_point } from '../../utils/dkdNativeAxis';

const dkd_watcher_poll_ms_value = 8500;

function dkd_trim_text_value(dkd_value) {
  return String(dkd_value || '').trim();
}

function dkd_courier_is_approved_value(dkd_profile_value) {
  return dkd_trim_text_value(dkd_profile_value?.courier_status).toLowerCase() === 'approved';
}

function dkd_offer_status_value(dkd_job_value) {
  const dkd_status_value = dkd_trim_text_value(dkd_job_value?.status).toLowerCase();
  return ['dkd_auto_assigned', 'dkd_assigned_offer', 'assigned_offer', 'auto_assigned', 'courier_offer'].includes(dkd_status_value);
}

function dkd_active_status_value(dkd_job_value) {
  const dkd_status_value = dkd_trim_text_value(dkd_job_value?.status).toLowerCase();
  const dkd_pickup_status_value = dkd_trim_text_value(dkd_job_value?.pickup_status).toLowerCase();
  if (['completed', 'cancelled', 'canceled'].includes(dkd_status_value)) return false;
  if (['delivered', 'cancelled', 'canceled'].includes(dkd_pickup_status_value)) return false;
  return ['accepted', 'assigned', 'to_business', 'picked_up', 'to_customer', 'delivering'].includes(dkd_status_value)
    || dkd_pickup_status_value === 'picked_up';
}

function dkd_currency_text_value(dkd_value) {
  const dkd_number_value = Number(dkd_value || 0);
  if (!Number.isFinite(dkd_number_value) || dkd_number_value <= 0) return '';
  return `${Math.round(dkd_number_value)} TL`;
}

function dkd_cargo_meta_object_value(dkd_value) {
  if (!dkd_value) return {};
  if (typeof dkd_value === 'object') return dkd_value;
  try {
    const dkd_parsed_value = JSON.parse(String(dkd_value || '{}'));
    return dkd_parsed_value && typeof dkd_parsed_value === 'object' ? dkd_parsed_value : {};
  } catch {
    return {};
  }
}


function dkd_job_is_urgent_auto_assign_blocked_value(dkd_job_value) {
  const dkd_meta_value = dkd_cargo_meta_object_value(dkd_job_value?.cargo_meta);
  const dkd_job_type_value = dkd_trim_text_value(dkd_job_value?.job_type || dkd_meta_value?.dkd_job_type || dkd_meta_value?.job_type).toLowerCase();
  const dkd_title_value = dkd_trim_text_value(dkd_job_value?.title || '').toLowerCase();
  return ['urgent', 'urgent_courier', 'acil', 'acil_kurye', 'dkd_urgent_courier'].includes(dkd_job_type_value)
    || Boolean(dkd_meta_value?.dkd_urgent_order_id || dkd_meta_value?.urgent_order_id)
    || dkd_title_value.includes('acil kurye');
}

function dkd_positive_number_value(dkd_value) {
  const dkd_number_value = Number(dkd_value);
  return Number.isFinite(dkd_number_value) && dkd_number_value > 0 ? dkd_number_value : 0;
}

function dkd_km_chip_text_value(dkd_value) {
  const dkd_number_value = dkd_positive_number_value(dkd_value);
  if (!dkd_number_value) return '';
  return `${dkd_number_value.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} km`;
}

function dkd_offer_fee_text_value(dkd_job_value) {
  const dkd_meta_value = dkd_cargo_meta_object_value(dkd_job_value?.cargo_meta);
  return dkd_currency_text_value(
    dkd_job_value?.fee_tl
    || dkd_job_value?.courier_fee_tl
    || dkd_meta_value?.dkd_courier_fee_tl
    || dkd_meta_value?.cargo_courier_fee_tl
    || dkd_job_value?.customer_charge_tl
    || dkd_meta_value?.dkd_customer_charge_tl
  );
}

function dkd_offer_distance_text_value(dkd_job_value) {
  const dkd_meta_value = dkd_cargo_meta_object_value(dkd_job_value?.cargo_meta);
  const dkd_pickup_distance_value = dkd_positive_number_value(dkd_job_value?.cargo_pickup_distance_km || dkd_meta_value?.cargo_pickup_distance_km || dkd_meta_value?.dkd_pickup_distance_km);
  const dkd_delivery_distance_value = dkd_positive_number_value(dkd_job_value?.cargo_delivery_distance_km || dkd_meta_value?.cargo_delivery_distance_km || dkd_meta_value?.dkd_delivery_distance_km || dkd_job_value?.distance_km);
  const dkd_direct_distance_value = dkd_positive_number_value(dkd_job_value?.distance_km);
  if (dkd_pickup_distance_value && dkd_delivery_distance_value) {
    return `Alım ${dkd_km_chip_text_value(dkd_pickup_distance_value)} • Teslim ${dkd_km_chip_text_value(dkd_delivery_distance_value)}`;
  }
  if (dkd_delivery_distance_value) return dkd_km_chip_text_value(dkd_delivery_distance_value);
  if (dkd_direct_distance_value) return dkd_km_chip_text_value(dkd_direct_distance_value);
  return '';
}

function dkd_offer_title_value(dkd_job_value) {
  return dkd_trim_text_value(dkd_job_value?.title)
    || (dkd_trim_text_value(dkd_job_value?.job_type).toLowerCase() === 'cargo' ? 'Kargo Gönderisi' : 'Yeni Sipariş');
}

function dkd_pickup_text_value(dkd_job_value) {
  return dkd_trim_text_value(dkd_job_value?.pickup)
    || dkd_trim_text_value(dkd_job_value?.merchant_name)
    || 'Gönderici noktası';
}

function dkd_dropoff_text_value(dkd_job_value) {
  return dkd_trim_text_value(dkd_job_value?.dropoff)
    || dkd_trim_text_value(dkd_job_value?.delivery_address_text)
    || 'Teslimat noktası';
}

function dkd_find_offer_job_value(dkd_rows_value, dkd_profile_value, dkd_assigned_job_id_value) {
  const dkd_user_id_value = dkd_trim_text_value(dkd_profile_value?.user_id);
  const dkd_requested_id_value = dkd_trim_text_value(dkd_assigned_job_id_value || dkd_profile_value?.dkd_courier_auto_assigned_job_id);
  const dkd_safe_rows_value = (Array.isArray(dkd_rows_value) ? dkd_rows_value : []).filter((dkd_row_value) => !dkd_job_is_urgent_auto_assign_blocked_value(dkd_row_value));
  if (dkd_requested_id_value) {
    const dkd_direct_job_value = dkd_safe_rows_value.find((dkd_row_value) => dkd_trim_text_value(dkd_row_value?.id) === dkd_requested_id_value && dkd_offer_status_value(dkd_row_value));
    if (dkd_direct_job_value) return dkd_direct_job_value;
  }
  return dkd_safe_rows_value.find((dkd_row_value) => (
    dkd_offer_status_value(dkd_row_value)
    && (!dkd_user_id_value || dkd_trim_text_value(dkd_row_value?.assigned_user_id) === dkd_user_id_value)
  )) || null;
}

function dkd_has_active_job_value(dkd_rows_value, dkd_profile_value) {
  const dkd_user_id_value = dkd_trim_text_value(dkd_profile_value?.user_id);
  const dkd_safe_rows_value = Array.isArray(dkd_rows_value) ? dkd_rows_value : [];
  return dkd_safe_rows_value.some((dkd_row_value) => (
    dkd_active_status_value(dkd_row_value)
    && (!dkd_user_id_value || dkd_trim_text_value(dkd_row_value?.assigned_user_id) === dkd_user_id_value)
  ));
}

function DkdCourierSearchMiniCard({ dkd_region_label_value, dkd_delivery_mode_value = false, dkd_on_open_courier_board_value }) {
  const dkd_motion_value = useRef(new Animated.Value(0)).current;
  const dkd_drag_position_value = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const dkd_drag_base_ref_value = useRef({ x: 0, y: 0 });
  const dkd_drag_moved_ref_value = useRef(false);

  const dkd_pan_responder_value = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (dkd_event_value, dkd_gesture_value) => Math.abs(dkd_gesture_value.dx) > 8 || Math.abs(dkd_gesture_value.dy) > 8,
    onPanResponderTerminationRequest: () => true,
    onPanResponderGrant: () => {
      dkd_drag_moved_ref_value.current = false;
    },
    onPanResponderMove: (dkd_event_value, dkd_gesture_value) => {
      if (Math.abs(dkd_gesture_value.dx) > 8 || Math.abs(dkd_gesture_value.dy) > 8) {
        dkd_drag_moved_ref_value.current = true;
      }
      dkd_drag_position_value.setValue({
        x: dkd_drag_base_ref_value.current.x + dkd_gesture_value.dx,
        y: dkd_drag_base_ref_value.current.y + dkd_gesture_value.dy,
      });
    },
    onPanResponderRelease: (dkd_event_value, dkd_gesture_value) => {
      dkd_drag_base_ref_value.current = {
        x: dkd_drag_base_ref_value.current.x + dkd_gesture_value.dx,
        y: dkd_drag_base_ref_value.current.y + dkd_gesture_value.dy,
      };
      setTimeout(() => {
        dkd_drag_moved_ref_value.current = false;
      }, 150);
    },
    onPanResponderTerminate: (dkd_event_value, dkd_gesture_value) => {
      dkd_drag_base_ref_value.current = {
        x: dkd_drag_base_ref_value.current.x + dkd_gesture_value.dx,
        y: dkd_drag_base_ref_value.current.y + dkd_gesture_value.dy,
      };
      dkd_drag_moved_ref_value.current = false;
    },
  })).current;

  useEffect(() => {
    const dkd_loop_value = Animated.loop(
      Animated.timing(dkd_motion_value, {
        toValue: 1,
        duration: 1550,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    dkd_loop_value.start();
    return () => dkd_loop_value.stop();
  }, [dkd_motion_value]);

  const dkd_spin_value = dkd_motion_value.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const dkd_pulse_value = dkd_motion_value.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.94, 1.12, 0.94] });
  const dkd_opacity_value = dkd_motion_value.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0.38, 1, 0.38] });
  const dkd_region_hint_value = dkd_delivery_mode_value ? 'Teslimat bekleniyor' : dkd_region_label_value ? 'Kayıtlı bölge taranıyor' : 'Çevrimiçi arama açık';
  const dkd_mini_title_value = dkd_delivery_mode_value ? 'TESLİMATTA' : 'Sipariş Aranıyor';
  const dkd_mini_icon_value = dkd_delivery_mode_value ? 'truck-delivery-outline' : 'radar';

  return (
    <View pointerEvents="box-none" style={dkd_styles.dkd_mini_overlay_root}>
      <Animated.View
        {...dkd_pan_responder_value.panHandlers}
        style={[dkd_styles.dkd_mini_card_shell, { transform: dkd_drag_position_value.getTranslateTransform() }]}
      >
        <Pressable
          hitSlop={10}
          onPress={() => {
            if (dkd_drag_moved_ref_value.current) return;
            dkd_on_open_courier_board_value?.();
          }}
          style={dkd_styles.dkd_mini_card_pressable}
        >
          <LinearGradient colors={dkd_delivery_mode_value ? ['rgba(23,27,74,0.98)', 'rgba(14,82,95,0.97)', 'rgba(120,74,14,0.96)'] : ['rgba(4,16,30,0.98)', 'rgba(12,58,86,0.97)', 'rgba(20,130,91,0.96)']} start={dkd_make_native_axis_point(0, 0)} end={dkd_make_native_axis_point(1, 1)} style={dkd_styles.dkd_mini_card}>
            <View style={dkd_styles.dkd_mini_glow_one} />
            <View style={dkd_styles.dkd_mini_icon_area}>
              <Animated.View style={[dkd_styles.dkd_mini_scan_ring_outer, { opacity: dkd_opacity_value, transform: [{ scale: dkd_pulse_value }, { rotate: dkd_spin_value }] }]} />
              <Animated.View style={[dkd_styles.dkd_mini_scan_ring, { opacity: dkd_opacity_value, transform: [{ rotate: dkd_spin_value }] }]} />
              <View style={dkd_styles.dkd_mini_icon_core}>
                <MaterialCommunityIcons name={dkd_mini_icon_value} size={17} color="#06111A" />
              </View>
            </View>
            <View style={dkd_styles.dkd_mini_copy}>
              <Text numberOfLines={1} style={dkd_styles.dkd_mini_title}>{dkd_mini_title_value}</Text>
              <Text numberOfLines={1} style={dkd_styles.dkd_mini_sub}>{dkd_region_hint_value}</Text>
            </View>
            <View style={dkd_styles.dkd_mini_drag_hint}>
              <MaterialCommunityIcons name="drag-variant" size={17} color="rgba(232,250,255,0.88)" />
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function DkdCourierAssignedOfferModal({ dkd_offer_job_value, dkd_action_busy_value, dkd_on_accept_value, dkd_on_reject_value, dkd_on_open_courier_board_value }) {
  const dkd_fee_text_value = dkd_offer_fee_text_value(dkd_offer_job_value);
  const dkd_distance_text_value = dkd_offer_distance_text_value(dkd_offer_job_value);
  const dkd_reward_text_value = Number(dkd_offer_job_value?.reward_score || 0) > 0 ? `+${Number(dkd_offer_job_value?.reward_score || 0)} skor` : '';
  const dkd_busy_accept_value = dkd_action_busy_value === 'accept';
  const dkd_busy_reject_value = dkd_action_busy_value === 'reject';
  const dkd_action_locked_value = dkd_busy_accept_value || dkd_busy_reject_value;

  return (
    <Modal visible={!!dkd_offer_job_value} transparent animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      <View style={dkd_styles.dkd_modal_backdrop}>
        <View style={dkd_styles.dkd_offer_shell}>
          <LinearGradient colors={['rgba(6,18,34,0.99)', 'rgba(15,35,70,0.99)', 'rgba(18,10,35,0.99)']} start={dkd_make_native_axis_point(0, 0)} end={dkd_make_native_axis_point(1, 1)} style={dkd_styles.dkd_offer_card}>
            <View style={dkd_styles.dkd_offer_orb_one} />
            <View style={dkd_styles.dkd_offer_orb_two} />
            <View style={dkd_styles.dkd_offer_orb_three} />
            <View style={dkd_styles.dkd_offer_alert_strip}>
              <MaterialCommunityIcons name="motorbike" size={15} color="#06111A" />
              <Text style={dkd_styles.dkd_offer_alert_strip_text}>KURYEYE YENİ GÖREV</Text>
            </View>
            <View style={dkd_styles.dkd_offer_top_row}>
              <LinearGradient colors={['#FFB84D', '#52F2A1', '#31D7FF']} start={dkd_make_native_axis_point(0, 0)} end={dkd_make_native_axis_point(1, 1)} style={dkd_styles.dkd_offer_icon_shell}>
                <MaterialCommunityIcons name="bike-fast" size={30} color="#FFFFFF" />
              </LinearGradient>
              <View style={dkd_styles.dkd_offer_top_copy}>
                <Text style={dkd_styles.dkd_offer_eyebrow}>OTOMATİK ATAMA BULUNDU</Text>
                <Text style={dkd_styles.dkd_offer_title}>Sipariş Seni Bekliyor</Text>
                <Text style={dkd_styles.dkd_offer_subtitle}>Rotayı kontrol et, işi tek dokunuşla kabul et veya reddet.</Text>
              </View>
            </View>
            <LinearGradient colors={['rgba(82,242,161,0.16)', 'rgba(49,215,255,0.10)', 'rgba(255,184,77,0.12)']} start={dkd_make_native_axis_point(0, 0)} end={dkd_make_native_axis_point(1, 1)} style={dkd_styles.dkd_offer_name_panel}>
              <View style={dkd_styles.dkd_offer_name_top_row}>
                <View style={dkd_styles.dkd_offer_job_icon_chip}>
                  <MaterialCommunityIcons name="package-variant-closed-check" size={18} color="#06111A" />
                </View>
                <Text numberOfLines={2} style={dkd_styles.dkd_offer_job_title}>{dkd_offer_title_value(dkd_offer_job_value)}</Text>
              </View>
              <LinearGradient colors={['rgba(255,209,102,0.26)', 'rgba(82,242,161,0.20)', 'rgba(49,215,255,0.14)']} start={dkd_make_native_axis_point(0, 0)} end={dkd_make_native_axis_point(1, 1)} style={dkd_styles.dkd_offer_price_panel}>
                <View style={dkd_styles.dkd_offer_price_icon_shell}>
                  <MaterialCommunityIcons name="cash-fast" size={24} color="#06111A" />
                </View>
                <View style={dkd_styles.dkd_offer_price_copy}>
                  <Text style={dkd_styles.dkd_offer_price_label}>SİPARİŞ ÜCRETİ</Text>
                  <Text style={dkd_styles.dkd_offer_price_value}>{dkd_fee_text_value || 'TL bilgisi bekleniyor'}</Text>
                </View>
              </LinearGradient>
              <View style={dkd_styles.dkd_offer_meta_row}>
                {dkd_distance_text_value ? <View style={dkd_styles.dkd_offer_meta_chip}><MaterialCommunityIcons name="map-marker-distance" size={15} color="#7EEBFF" /><Text numberOfLines={1} style={dkd_styles.dkd_offer_meta_text}>{dkd_distance_text_value}</Text></View> : null}
                {dkd_reward_text_value ? <View style={dkd_styles.dkd_offer_meta_chip}><MaterialCommunityIcons name="star-four-points-outline" size={15} color="#FFD166" /><Text style={dkd_styles.dkd_offer_meta_text}>{dkd_reward_text_value}</Text></View> : null}
              </View>
            </LinearGradient>
            <View style={dkd_styles.dkd_route_panel}>
              <View style={dkd_styles.dkd_route_line_item}>
                <LinearGradient colors={['#52F2A1', '#31D7FF']} style={[dkd_styles.dkd_route_dot, dkd_styles.dkd_route_dot_pickup]}>
                  <MaterialCommunityIcons name="store-marker-outline" size={13} color="#06111A" />
                </LinearGradient>
                <View style={dkd_styles.dkd_route_copy}>
                  <Text style={dkd_styles.dkd_route_label}>Gönderici Noktası</Text>
                  <Text numberOfLines={2} style={dkd_styles.dkd_route_value}>{dkd_pickup_text_value(dkd_offer_job_value)}</Text>
                </View>
              </View>
              <View style={dkd_styles.dkd_route_divider} />
              <View style={dkd_styles.dkd_route_line_item}>
                <LinearGradient colors={['#FFB84D', '#FF4D7D']} style={[dkd_styles.dkd_route_dot, dkd_styles.dkd_route_dot_dropoff]}>
                  <MaterialCommunityIcons name="map-marker-check-outline" size={13} color="#06111A" />
                </LinearGradient>
                <View style={dkd_styles.dkd_route_copy}>
                  <Text style={dkd_styles.dkd_route_label}>Teslimat Noktası</Text>
                  <Text numberOfLines={2} style={dkd_styles.dkd_route_value}>{dkd_dropoff_text_value(dkd_offer_job_value)}</Text>
                </View>
              </View>
            </View>
            <View style={dkd_styles.dkd_offer_action_row}>
              <Pressable hitSlop={10} disabled={dkd_action_locked_value} onPress={dkd_on_reject_value} style={({ pressed }) => [dkd_styles.dkd_offer_action_button, dkd_styles.dkd_offer_reject_button, pressed && !dkd_action_locked_value ? dkd_styles.dkd_offer_button_pressed : null, dkd_action_locked_value && dkd_styles.dkd_disabled_button]}>
                {dkd_busy_reject_value ? <ActivityIndicator size="small" color="#FFFFFF" /> : <MaterialCommunityIcons name="close-octagon" size={22} color="#FFFFFF" />}
                <View style={dkd_styles.dkd_offer_action_copy}>
                  <Text style={dkd_styles.dkd_offer_reject_text}>Reddet</Text>
                  <Text style={dkd_styles.dkd_offer_action_sub}>Başka kuryeye aktar</Text>
                </View>
              </Pressable>
              <Pressable hitSlop={10} disabled={dkd_action_locked_value} onPress={dkd_on_accept_value} style={({ pressed }) => [dkd_styles.dkd_offer_action_button, dkd_styles.dkd_offer_accept_button, pressed && !dkd_action_locked_value ? dkd_styles.dkd_offer_button_pressed : null, dkd_action_locked_value && dkd_styles.dkd_disabled_button]}>
                <LinearGradient colors={['#52F2A1', '#31D7FF', '#7C3AED']} start={dkd_make_native_axis_point(0, 0)} end={dkd_make_native_axis_point(1, 1)} style={StyleSheet.absoluteFill} pointerEvents="none" />
                {dkd_busy_accept_value ? <ActivityIndicator size="small" color="#FFFFFF" /> : <MaterialCommunityIcons name="check-decagram" size={23} color="#FFFFFF" />}
                <View style={dkd_styles.dkd_offer_action_copy}>
                  <Text style={dkd_styles.dkd_offer_accept_text}>Kabul Et</Text>
                  <Text style={dkd_styles.dkd_offer_accept_sub}>Göreve başla</Text>
                </View>
              </Pressable>
            </View>
            <Pressable hitSlop={8} onPress={dkd_on_open_courier_board_value} style={dkd_styles.dkd_offer_open_center_button}>
              <MaterialCommunityIcons name="view-dashboard-outline" size={16} color="#BFEFFF" />
              <Text style={dkd_styles.dkd_offer_open_center_text}>Kurye-Kargo merkezini aç</Text>
            </Pressable>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

export default function DkdCourierOnlineGlobalWatcher({
  dkd_profile_value,
  dkd_set_profile_value,
  dkd_current_location_value,
  dkd_courier_board_open_value = false,
  dkd_on_open_courier_board_value,
}) {
  const [dkd_offer_job_value, setDkdOfferJobValue] = useState(null);
  const [dkd_has_active_job_state_value, setDkdHasActiveJobStateValue] = useState(false);
  const [, setDkdPollingValue] = useState(false);
  const [dkd_action_busy_value, setDkdActionBusyValue] = useState('');
  const dkd_scan_busy_ref_value = useRef(false);
  const dkd_online_ref_value = useRef(false);
  const dkd_scan_token_ref_value = useRef(0);
  const dkd_is_online_value = dkd_profile_value?.dkd_courier_online === true;
  const dkd_is_approved_value = dkd_courier_is_approved_value(dkd_profile_value);

  const dkd_region_value = useMemo(() => {
    const dkd_country_value = dkd_trim_text_value(dkd_profile_value?.dkd_country || dkd_profile_value?.dkd_courier_online_country || 'Türkiye') || 'Türkiye';
    const dkd_city_value = dkd_trim_text_value(dkd_profile_value?.dkd_city || dkd_profile_value?.courier_city || dkd_profile_value?.dkd_courier_online_city || 'Ankara') || 'Ankara';
    const dkd_zone_value = dkd_trim_text_value(dkd_profile_value?.dkd_region || dkd_profile_value?.courier_zone || dkd_profile_value?.dkd_courier_online_region || '');
    return { dkd_country_value, dkd_city_value, dkd_zone_value };
  }, [dkd_profile_value?.courier_city, dkd_profile_value?.courier_zone, dkd_profile_value?.dkd_city, dkd_profile_value?.dkd_country, dkd_profile_value?.dkd_courier_online_city, dkd_profile_value?.dkd_courier_online_country, dkd_profile_value?.dkd_courier_online_region, dkd_profile_value?.dkd_region]);

  const dkd_region_label_value = useMemo(() => [dkd_region_value.dkd_country_value, dkd_region_value.dkd_city_value, dkd_region_value.dkd_zone_value].filter(Boolean).join(' / '), [dkd_region_value]);

  useEffect(() => {
    dkd_online_ref_value.current = dkd_is_online_value;
    if (!dkd_is_online_value) {
      dkd_scan_token_ref_value.current += 1;
      setDkdOfferJobValue(null);
      setDkdHasActiveJobStateValue(false);
      setDkdActionBusyValue('');
    }
  }, [dkd_is_online_value]);

  const dkd_scan_for_offer_value = useCallback(async () => {
    if (!dkd_is_online_value || !dkd_is_approved_value) {
      setDkdOfferJobValue(null);
      setDkdHasActiveJobStateValue(false);
      return;
    }
    if (dkd_scan_busy_ref_value.current) return;
    dkd_scan_busy_ref_value.current = true;
    const dkd_scan_token_value = dkd_scan_token_ref_value.current + 1;
    dkd_scan_token_ref_value.current = dkd_scan_token_value;
    setDkdPollingValue(true);
    try {
      const dkd_existing_jobs_result_value = await fetchCourierJobs({ dkd_force_refresh: true, dkd_cache_ttl_ms: 0 });
      if (dkd_existing_jobs_result_value?.error) throw dkd_existing_jobs_result_value.error;
      if (!dkd_online_ref_value.current || dkd_scan_token_ref_value.current !== dkd_scan_token_value) return;
      const dkd_existing_rows_value = Array.isArray(dkd_existing_jobs_result_value?.data) ? dkd_existing_jobs_result_value.data : [];
      const dkd_existing_active_job_value = dkd_has_active_job_value(dkd_existing_rows_value, dkd_profile_value);
      if (dkd_existing_active_job_value) {
        setDkdHasActiveJobStateValue(true);
        setDkdOfferJobValue(null);
        dkd_set_profile_value?.((dkd_previous_profile_value) => (dkd_previous_profile_value ? {
          ...dkd_previous_profile_value,
          dkd_courier_online: true,
          dkd_courier_auto_assigned_job_id: null,
        } : dkd_previous_profile_value));
        return;
      }

      const dkd_live_lat_value = Number(dkd_current_location_value?.lat);
      const dkd_live_lng_value = Number(dkd_current_location_value?.lng);
      const dkd_online_result_value = await dkd_set_courier_online_status({
        dkd_online: true,
        dkd_country: dkd_region_value.dkd_country_value,
        dkd_city: dkd_region_value.dkd_city_value,
        dkd_region: dkd_region_value.dkd_zone_value,
        dkd_live_lat: Number.isFinite(dkd_live_lat_value) ? dkd_live_lat_value : null,
        dkd_live_lng: Number.isFinite(dkd_live_lng_value) ? dkd_live_lng_value : null,
      });
      if (dkd_online_result_value?.error) throw dkd_online_result_value.error;
      if (!dkd_online_ref_value.current || dkd_scan_token_ref_value.current !== dkd_scan_token_value) {
        try {
          await dkd_set_courier_online_status({
            dkd_online: false,
            dkd_country: dkd_region_value.dkd_country_value,
            dkd_city: dkd_region_value.dkd_city_value,
            dkd_region: dkd_region_value.dkd_zone_value,
            dkd_live_lat: null,
            dkd_live_lng: null,
          });
        } catch (dkd_stale_error_value) {
          console.warn('dkd watcher scan stale after online rpc', dkd_stale_error_value?.message || dkd_stale_error_value);
        }
        return;
      }
      const dkd_assigned_job_id_value = dkd_online_result_value?.data?.dkd_assigned_job_id || dkd_online_result_value?.data?.assigned_job_id || null;
      const dkd_jobs_result_value = await fetchCourierJobs({ dkd_force_refresh: true, dkd_cache_ttl_ms: 0 });
      if (dkd_jobs_result_value?.error) throw dkd_jobs_result_value.error;
      if (!dkd_online_ref_value.current || dkd_scan_token_ref_value.current !== dkd_scan_token_value) return;
      const dkd_rows_value = Array.isArray(dkd_jobs_result_value?.data) ? dkd_jobs_result_value.data : [];
      const dkd_next_offer_value = dkd_find_offer_job_value(dkd_rows_value, dkd_profile_value, dkd_assigned_job_id_value);
      const dkd_next_has_active_job_value = dkd_has_active_job_value(dkd_rows_value, dkd_profile_value);
      setDkdHasActiveJobStateValue(dkd_next_has_active_job_value);
      setDkdOfferJobValue(dkd_next_offer_value || null);
      dkd_set_profile_value?.((dkd_previous_profile_value) => (dkd_previous_profile_value ? {
        ...dkd_previous_profile_value,
        dkd_courier_online: true,
        dkd_courier_online_country: dkd_region_value.dkd_country_value,
        dkd_courier_online_city: dkd_region_value.dkd_city_value,
        dkd_courier_online_region: dkd_region_value.dkd_zone_value,
        dkd_courier_auto_assigned_job_id: dkd_next_offer_value?.id || null,
      } : dkd_previous_profile_value));
    } catch (dkd_error_value) {
      console.warn('dkd courier online watcher skipped', dkd_error_value?.message || dkd_error_value);
    } finally {
      dkd_scan_busy_ref_value.current = false;
      setDkdPollingValue(false);
    }
  }, [dkd_current_location_value?.lat, dkd_current_location_value?.lng, dkd_is_approved_value, dkd_is_online_value, dkd_profile_value, dkd_region_value, dkd_set_profile_value]);

  useEffect(() => {
    if (!dkd_is_online_value || !dkd_is_approved_value) {
      setDkdOfferJobValue(null);
      setDkdHasActiveJobStateValue(false);
      return undefined;
    }
    dkd_scan_for_offer_value();
    const dkd_interval_value = setInterval(dkd_scan_for_offer_value, dkd_watcher_poll_ms_value);
    return () => clearInterval(dkd_interval_value);
  }, [dkd_is_approved_value, dkd_is_online_value, dkd_scan_for_offer_value]);

  useEffect(() => {
    if (!dkd_is_online_value || !dkd_profile_value?.dkd_courier_auto_assigned_job_id) return;
    dkd_scan_for_offer_value();
  }, [dkd_is_online_value, dkd_profile_value?.dkd_courier_auto_assigned_job_id, dkd_scan_for_offer_value]);

  const dkd_accept_offer_value = useCallback(async () => {
    if (!dkd_offer_job_value?.id) return;
    setDkdActionBusyValue('accept');
    try {
      const dkd_result_value = await acceptCourierJob(dkd_offer_job_value.id, dkd_current_location_value);
      if (dkd_result_value?.error) throw dkd_result_value.error;
      setDkdOfferJobValue(null);
      setDkdHasActiveJobStateValue(true);
      dkd_set_profile_value?.((dkd_previous_profile_value) => (dkd_previous_profile_value ? { ...dkd_previous_profile_value, dkd_courier_auto_assigned_job_id: null } : dkd_previous_profile_value));
      await fetchCourierJobs({ dkd_force_refresh: true, dkd_cache_ttl_ms: 0 });
      setTimeout(() => dkd_on_open_courier_board_value?.(), 280);
    } catch (dkd_error_value) {
      console.warn('dkd courier online offer accept failed', dkd_error_value?.message || dkd_error_value);
    } finally {
      setDkdActionBusyValue('');
    }
  }, [dkd_current_location_value, dkd_offer_job_value?.id, dkd_on_open_courier_board_value, dkd_set_profile_value]);

  const dkd_reject_offer_value = useCallback(async () => {
    if (!dkd_offer_job_value?.id) return;
    setDkdActionBusyValue('reject');
    try {
      const dkd_result_value = await dkd_reject_courier_job(dkd_offer_job_value.id);
      if (dkd_result_value?.error) throw dkd_result_value.error;
      setDkdOfferJobValue(null);
      setDkdHasActiveJobStateValue(false);
      dkd_set_profile_value?.((dkd_previous_profile_value) => (dkd_previous_profile_value ? { ...dkd_previous_profile_value, dkd_courier_auto_assigned_job_id: null } : dkd_previous_profile_value));
      setTimeout(dkd_scan_for_offer_value, 1400);
    } catch (dkd_error_value) {
      console.warn('dkd courier online offer reject failed', dkd_error_value?.message || dkd_error_value);
    } finally {
      setDkdActionBusyValue('');
    }
  }, [dkd_offer_job_value?.id, dkd_scan_for_offer_value, dkd_set_profile_value]);

  if (!dkd_is_online_value || !dkd_is_approved_value) return null;

  return (
    <>
      {!dkd_offer_job_value ? (
        <DkdCourierSearchMiniCard
          dkd_region_label_value={dkd_region_label_value}
          dkd_delivery_mode_value={dkd_has_active_job_state_value}
          dkd_on_open_courier_board_value={dkd_on_open_courier_board_value}
        />
      ) : null}
      <DkdCourierAssignedOfferModal
        dkd_offer_job_value={dkd_offer_job_value}
        dkd_action_busy_value={dkd_action_busy_value}
        dkd_on_accept_value={dkd_accept_offer_value}
        dkd_on_reject_value={dkd_reject_offer_value}
        dkd_on_open_courier_board_value={dkd_on_open_courier_board_value}
      />
    </>
  );
}

const dkd_styles = StyleSheet.create({
  dkd_mini_scan_ring_outer: { position: 'absolute', width: 42, height: 42, borderRadius: 21, borderWidth: 1.2, borderColor: 'rgba(82,242,161,0.55)' },
  dkd_mini_glow_one: { position: 'absolute', top: -42, right: -28, width: 98, height: 98, borderRadius: 49, backgroundColor: 'rgba(82,242,161,0.18)' },
  dkd_mini_overlay_root: { ...StyleSheet.absoluteFillObject, zIndex: 9999, elevation: 9999 },
  dkd_mini_card_shell: { position: 'absolute', right: 12, bottom: 92, zIndex: 9999, elevation: 9999 },
  dkd_mini_card_pressable: { borderRadius: 24 },
  dkd_mini_card: { width: 198, minHeight: 64, borderRadius: 24, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(126,235,255,0.32)', shadowColor: '#31D7FF', shadowOpacity: 0.32, shadowRadius: 17, shadowOffset: { width: 0, height: 9 }, overflow: 'hidden' },
  dkd_mini_icon_area: { width: 43, height: 43, alignItems: 'center', justifyContent: 'center' },
  dkd_mini_scan_ring: { position: 'absolute', width: 34, height: 34, borderRadius: 17, borderWidth: 1.6, borderColor: 'rgba(126,235,255,0.84)', borderStyle: 'dashed' },
  dkd_mini_icon_core: { width: 27, height: 27, borderRadius: 13.5, backgroundColor: '#7EEBFF', alignItems: 'center', justifyContent: 'center' },
  dkd_mini_copy: { flex: 1, minWidth: 0, paddingLeft: 8 },
  dkd_mini_title: { color: '#FFFFFF', fontSize: 14.5, fontWeight: '950', letterSpacing: 0.1 },
  dkd_mini_sub: { color: 'rgba(213,248,255,0.78)', fontSize: 10.5, fontWeight: '850', marginTop: 2 },
  dkd_mini_drag_hint: { width: 24, height: 36, alignItems: 'center', justifyContent: 'center', opacity: 0.9 },
  dkd_modal_backdrop: { flex: 1, backgroundColor: 'rgba(1,6,14,0.74)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  dkd_offer_shell: { width: '100%', maxWidth: 440 },
  dkd_offer_card: { borderRadius: 35, padding: 17, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(126,235,255,0.26)', shadowColor: '#31D7FF', shadowOpacity: 0.28, shadowRadius: 30, shadowOffset: { width: 0, height: 18 }, elevation: 24 },
  dkd_offer_orb_one: { position: 'absolute', top: -55, right: -34, width: 165, height: 165, borderRadius: 82.5, backgroundColor: 'rgba(82,242,161,0.18)' },
  dkd_offer_orb_two: { position: 'absolute', bottom: -78, left: -38, width: 185, height: 185, borderRadius: 92.5, backgroundColor: 'rgba(124,58,237,0.20)' },
  dkd_offer_orb_three: { position: 'absolute', top: 140, right: -75, width: 135, height: 135, borderRadius: 67.5, backgroundColor: 'rgba(255,184,77,0.16)' },
  dkd_offer_alert_strip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, backgroundColor: '#FFD166', marginBottom: 13 },
  dkd_offer_alert_strip_text: { color: '#06111A', fontSize: 10.5, fontWeight: '950', letterSpacing: 0.8 },
  dkd_offer_top_row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dkd_offer_icon_shell: { width: 62, height: 62, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  dkd_offer_top_copy: { flex: 1, minWidth: 0 },
  dkd_offer_eyebrow: { color: '#7EEBFF', fontSize: 10.5, fontWeight: '950', letterSpacing: 0.8 },
  dkd_offer_title: { color: '#F7FBFF', fontSize: 25, fontWeight: '950', marginTop: 2 },
  dkd_offer_subtitle: { color: 'rgba(232,245,255,0.72)', fontSize: 12.5, fontWeight: '750', marginTop: 5, lineHeight: 17 },
  dkd_offer_name_panel: { marginTop: 15, padding: 13, borderRadius: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  dkd_offer_name_top_row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dkd_offer_job_icon_chip: { width: 34, height: 34, borderRadius: 13, backgroundColor: '#52F2A1', alignItems: 'center', justifyContent: 'center' },
  dkd_offer_job_title: { flex: 1, minWidth: 0, color: '#FFFFFF', fontSize: 18, fontWeight: '950' },
  dkd_route_panel: { marginTop: 12, padding: 14, borderRadius: 25, backgroundColor: 'rgba(3,10,22,0.50)', borderWidth: 1, borderColor: 'rgba(126,235,255,0.16)' },
  dkd_route_line_item: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dkd_route_dot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  dkd_route_dot_pickup: {},
  dkd_route_dot_dropoff: {},
  dkd_route_copy: { flex: 1, minWidth: 0 },
  dkd_route_label: { color: 'rgba(232,245,255,0.58)', fontSize: 11, fontWeight: '950', textTransform: 'uppercase' },
  dkd_route_value: { color: '#F7FBFF', fontSize: 14, fontWeight: '850', marginTop: 3, lineHeight: 19 },
  dkd_route_divider: { height: 17, width: 2, marginLeft: 12, backgroundColor: 'rgba(255,255,255,0.18)', marginVertical: 2 },
  dkd_offer_price_panel: { marginTop: 12, minHeight: 74, borderRadius: 24, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(255,209,102,0.26)', overflow: 'hidden' },
  dkd_offer_price_icon_shell: { width: 48, height: 48, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFD166', shadowColor: '#FFD166', shadowOpacity: 0.34, shadowRadius: 14, shadowOffset: { width: 0, height: 7 } },
  dkd_offer_price_copy: { flex: 1, minWidth: 0 },
  dkd_offer_price_label: { color: 'rgba(232,245,255,0.70)', fontSize: 10.5, fontWeight: '950', letterSpacing: 0.7 },
  dkd_offer_price_value: { color: '#FFFFFF', fontSize: 25, fontWeight: '950', marginTop: 2 },
  dkd_offer_meta_row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  dkd_offer_meta_chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', maxWidth: '100%' },
  dkd_offer_meta_text: { color: '#EAF8FF', fontSize: 12, fontWeight: '900' },
  dkd_offer_action_row: { flexDirection: 'row', gap: 10, marginTop: 16 },
  dkd_offer_action_button: { minHeight: 62, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9, overflow: 'hidden' },
  dkd_offer_reject_button: { flex: 0.45, backgroundColor: 'rgba(255,77,125,0.80)', borderWidth: 1, borderColor: 'rgba(255,220,226,0.30)' },
  dkd_offer_accept_button: { flex: 0.55 },
  dkd_offer_button_pressed: { transform: [{ scale: 0.98 }], opacity: 0.88 },
  dkd_offer_action_copy: { minWidth: 0 },
  dkd_offer_reject_text: { color: '#FFFFFF', fontSize: 15, fontWeight: '950' },
  dkd_offer_action_sub: { color: 'rgba(255,255,255,0.76)', fontSize: 10.5, fontWeight: '850', marginTop: 2 },
  dkd_offer_accept_text: { color: '#FFFFFF', fontSize: 16, fontWeight: '950' },
  dkd_offer_accept_sub: { color: 'rgba(255,255,255,0.80)', fontSize: 10.5, fontWeight: '850', marginTop: 2 },
  dkd_disabled_button: { opacity: 0.64 },
  dkd_offer_open_center_button: { alignSelf: 'center', marginTop: 13, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(126,235,255,0.08)' },
  dkd_offer_open_center_text: { color: '#BFEFFF', fontSize: 12, fontWeight: '900' },
});
