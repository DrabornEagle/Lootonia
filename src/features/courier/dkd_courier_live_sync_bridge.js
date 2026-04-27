import { useEffect, useMemo, useRef, useState } from 'react';
import { useThrottledLocation } from '../../hooks/useThrottledLocation';
import { AppState } from 'react-native';
import { fetchCourierJobs } from '../../services/courierService';
import { dkd_upsert_courier_live_location } from '../../services/dkd_cargo_service';

function dkd_safe_number_value(dkd_value) {
  const dkd_numeric_value = Number(dkd_value);
  return Number.isFinite(dkd_numeric_value) ? dkd_numeric_value : null;
}

function dkd_job_phase_value(dkd_task_value) {
  const dkd_status_key_value = String(dkd_task_value?.status || 'open').toLowerCase();
  const dkd_pickup_status_key_value = String(dkd_task_value?.pickup_status || 'pending').toLowerCase();
  if (dkd_status_key_value === 'completed' || dkd_pickup_status_key_value === 'delivered') return 'completed';
  if (dkd_status_key_value === 'picked_up' || dkd_status_key_value === 'to_customer' || dkd_status_key_value === 'delivering' || dkd_pickup_status_key_value === 'picked_up') return 'to_customer';
  if (dkd_status_key_value === 'accepted' || dkd_status_key_value === 'assigned' || dkd_status_key_value === 'to_business') return 'to_business';
  return 'open';
}

function dkd_haversine_km_between_value(dkd_lat_1_value, dkd_lng_1_value, dkd_lat_2_value, dkd_lng_2_value) {
  const dkd_start_lat_value = dkd_safe_number_value(dkd_lat_1_value);
  const dkd_start_lng_value = dkd_safe_number_value(dkd_lng_1_value);
  const dkd_end_lat_value = dkd_safe_number_value(dkd_lat_2_value);
  const dkd_end_lng_value = dkd_safe_number_value(dkd_lng_2_value);
  if (dkd_start_lat_value == null || dkd_start_lng_value == null || dkd_end_lat_value == null || dkd_end_lng_value == null) return null;
  const dkd_radian_value = (dkd_degree_value) => (dkd_degree_value * Math.PI) / 180;
  const dkd_delta_lat_value = dkd_radian_value(dkd_end_lat_value - dkd_start_lat_value);
  const dkd_delta_lng_value = dkd_radian_value(dkd_end_lng_value - dkd_start_lng_value);
  const dkd_a_value = Math.sin(dkd_delta_lat_value / 2) ** 2
    + Math.cos(dkd_radian_value(dkd_start_lat_value)) * Math.cos(dkd_radian_value(dkd_end_lat_value)) * Math.sin(dkd_delta_lng_value / 2) ** 2;
  const dkd_c_value = 2 * Math.atan2(Math.sqrt(dkd_a_value), Math.sqrt(1 - dkd_a_value));
  return 6371 * dkd_c_value;
}

function dkd_estimated_eta_min_value(dkd_distance_km_value, dkd_phase_value) {
  const dkd_numeric_distance_value = dkd_safe_number_value(dkd_distance_km_value);
  if (dkd_numeric_distance_value == null) return null;
  const dkd_average_speed_kmh_value = dkd_phase_value === 'to_customer' ? 30 : 26;
  const dkd_buffer_min_value = dkd_phase_value === 'to_customer' ? 3 : 4;
  return Math.max(1, Math.round((dkd_numeric_distance_value / dkd_average_speed_kmh_value) * 60) + dkd_buffer_min_value);
}

function dkd_task_list_fingerprint_value(dkd_task_list_value) {
  return (Array.isArray(dkd_task_list_value) ? dkd_task_list_value : []).map((dkd_task_value) => ([
    String(dkd_task_value?.id || ''),
    String(dkd_task_value?.status || ''),
    String(dkd_task_value?.pickup_status || ''),
    String(dkd_task_value?.assigned_user_id || ''),
    String(dkd_task_value?.updated_at || ''),
    String(dkd_task_value?.pickup_lat ?? ''),
    String(dkd_task_value?.pickup_lng ?? ''),
    String(dkd_task_value?.dropoff_lat ?? ''),
    String(dkd_task_value?.dropoff_lng ?? ''),
  ].join('|'))).join('||');
}

function dkd_target_for_task_value(dkd_task_value) {
  const dkd_phase_value = dkd_job_phase_value(dkd_task_value);
  if (dkd_phase_value === 'to_customer') {
    return {
      dkd_phase_value,
      dkd_lat_value: dkd_safe_number_value(dkd_task_value?.dropoff_lat),
      dkd_lng_value: dkd_safe_number_value(dkd_task_value?.dropoff_lng),
    };
  }
  if (dkd_phase_value === 'to_business') {
    return {
      dkd_phase_value,
      dkd_lat_value: dkd_safe_number_value(dkd_task_value?.pickup_lat),
      dkd_lng_value: dkd_safe_number_value(dkd_task_value?.pickup_lng),
    };
  }
  return {
    dkd_phase_value,
    dkd_lat_value: null,
    dkd_lng_value: null,
  };
}

export default function DkdCourierLiveSyncBridge({ dkd_profile_value, dkd_current_location_value, dkd_session_user_id_value }) {
  const [dkd_task_list_value, setDkdTaskListValue] = useState([]);
  const dkd_last_sync_fingerprint_ref_value = useRef('');
  const dkd_last_task_list_fingerprint_ref_value = useRef('');
  const dkd_app_state_ref_value = useRef(AppState.currentState || 'active');

  const dkd_throttled_location_value = useThrottledLocation(dkd_current_location_value, 2200);

  const dkd_is_courier_approved_value = useMemo(() => {
    const dkd_status_key_value = String(dkd_profile_value?.courier_status || dkd_profile_value?.status || '').toLowerCase();
    return dkd_status_key_value === 'approved';
  }, [dkd_profile_value?.courier_status, dkd_profile_value?.status]);

  const dkd_active_task_value = useMemo(() => {
    const dkd_task_row_value = (Array.isArray(dkd_task_list_value) ? dkd_task_list_value : []).find((dkd_loop_task_value) => {
      const dkd_is_active_phase_value = ['to_business', 'to_customer'].includes(dkd_job_phase_value(dkd_loop_task_value));
      if (!dkd_is_active_phase_value) return false;
      if (!dkd_session_user_id_value) return true;
      return String(dkd_loop_task_value?.assigned_user_id || '') === String(dkd_session_user_id_value);
    });
    if (!dkd_task_row_value) return null;
    const dkd_target_value = dkd_target_for_task_value(dkd_task_row_value);
    return {
      ...dkd_task_row_value,
      ...dkd_target_value,
    };
  }, [dkd_session_user_id_value, dkd_task_list_value]);

  useEffect(() => {
    if (!dkd_is_courier_approved_value) {
      dkd_last_task_list_fingerprint_ref_value.current = '';
      setDkdTaskListValue([]);
      return undefined;
    }

    let dkd_cancelled_value = false;

    async function dkd_refresh_task_list_value() {
      if (dkd_app_state_ref_value.current !== 'active') return;
      try {
        const dkd_result_value = await fetchCourierJobs({
          dkd_cache_ttl_ms: dkd_active_task_value ? 8000 : 18000,
        });
        if (dkd_cancelled_value) return;
        const dkd_next_rows_value = Array.isArray(dkd_result_value?.data) ? dkd_result_value.data : [];
        const dkd_next_fingerprint_value = dkd_task_list_fingerprint_value(dkd_next_rows_value);
        if (dkd_last_task_list_fingerprint_ref_value.current === dkd_next_fingerprint_value) return;
        dkd_last_task_list_fingerprint_ref_value.current = dkd_next_fingerprint_value;
        setDkdTaskListValue(dkd_next_rows_value);
      } catch (_dkd_unused_error_value) {}
    }

    dkd_refresh_task_list_value();
    const dkd_interval_value = setInterval(dkd_refresh_task_list_value, dkd_active_task_value ? 12000 : 30000);
    const dkd_app_state_subscription_value = AppState.addEventListener('change', (dkd_state_value) => {
      dkd_app_state_ref_value.current = dkd_state_value;
      if (dkd_state_value === 'active') {
        dkd_refresh_task_list_value();
      }
    });

    return () => {
      dkd_cancelled_value = true;
      clearInterval(dkd_interval_value);
      dkd_app_state_subscription_value?.remove?.();
    };
  }, [dkd_active_task_value, dkd_is_courier_approved_value]);

  useEffect(() => {
    if (!dkd_is_courier_approved_value) return undefined;
    const dkd_current_lat_value = dkd_safe_number_value(dkd_throttled_location_value?.lat);
    const dkd_current_lng_value = dkd_safe_number_value(dkd_throttled_location_value?.lng);
    if (dkd_current_lat_value == null || dkd_current_lng_value == null) return undefined;
    if (!dkd_active_task_value) return undefined;

    let dkd_cancelled_value = false;

    async function dkd_push_live_location_value() {
      if (dkd_app_state_ref_value.current !== 'active') return;
      try {
        const dkd_distance_km_value = dkd_haversine_km_between_value(
          dkd_current_lat_value,
          dkd_current_lng_value,
          dkd_active_task_value?.dkd_lat_value,
          dkd_active_task_value?.dkd_lng_value,
        );
        const dkd_eta_min_value = dkd_estimated_eta_min_value(dkd_distance_km_value, dkd_active_task_value?.dkd_phase_value);
        const dkd_plate_value = String(dkd_profile_value?.courier_profile_meta?.plate_no || dkd_profile_value?.courier_profile_meta?.plateNo || '').trim().toUpperCase();
        const dkd_vehicle_type_value = String(dkd_profile_value?.courier_vehicle_type || dkd_profile_value?.courier_profile_meta?.vehicle_type || 'moto').trim().toLowerCase();
        const dkd_heading_deg_value = dkd_safe_number_value(dkd_throttled_location_value?.heading);
        const dkd_sync_fingerprint_value = [
          dkd_current_lat_value.toFixed(5),
          dkd_current_lng_value.toFixed(5),
          dkd_eta_min_value == null ? 'na' : String(dkd_eta_min_value),
          dkd_heading_deg_value == null ? 'na' : String(Math.round(dkd_heading_deg_value)),
          String(dkd_active_task_value?.id || ''),
          String(dkd_active_task_value?.dkd_phase_value || ''),
        ].join('|');
        if (dkd_last_sync_fingerprint_ref_value.current === dkd_sync_fingerprint_value) return;
        await dkd_upsert_courier_live_location({
          dkd_lat: dkd_current_lat_value,
          dkd_lng: dkd_current_lng_value,
          dkd_eta_min: dkd_eta_min_value,
          dkd_heading_deg: dkd_heading_deg_value,
          dkd_plate_no: dkd_plate_value,
          dkd_vehicle_type: dkd_vehicle_type_value,
        });
        if (dkd_cancelled_value) return;
        dkd_last_sync_fingerprint_ref_value.current = dkd_sync_fingerprint_value;
      } catch (_dkd_unused_error_value) {}
    }

    dkd_push_live_location_value();
    const dkd_interval_value = setInterval(dkd_push_live_location_value, 10000);

    return () => {
      dkd_cancelled_value = true;
      clearInterval(dkd_interval_value);
    };
  }, [
    dkd_active_task_value,
    dkd_throttled_location_value?.heading,
    dkd_throttled_location_value?.lat,
    dkd_throttled_location_value?.lng,
    dkd_is_courier_approved_value,
    dkd_profile_value?.courier_profile_meta,
    dkd_profile_value?.courier_vehicle_type,
  ]);

  return null;
}
