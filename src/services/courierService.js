import { supabase } from '../lib/supabase';

const dkd_courier_select_base_value = 'id, title, pickup, dropoff, reward_score, distance_km, eta_min, status, job_type, assigned_user_id, created_at, updated_at, accepted_at, completed_at, pickup_status, picked_up_at, merchant_name, product_title, delivery_note, delivery_address_text, order_id, business_id, product_id, customer_user_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, fee_tl, is_active';
const dkd_courier_select_with_cargo_value = `${dkd_courier_select_base_value}, cargo_shipment_id`;

const dkd_courier_jobs_cache_ttl_ms_value = 12000;
let dkd_courier_jobs_cache_entry_value = {
  dkd_saved_at_value: 0,
  dkd_rows_value: [],
};
let dkd_courier_jobs_request_promise_value = null;

function dkd_clone_job_rows_value(dkd_rows_value) {
  return dkd_safe_array_value(dkd_rows_value).map((dkd_row_value) => ({ ...(dkd_row_value || {}) }));
}

function dkd_read_cached_job_rows_value(dkd_cache_ttl_ms_value) {
  const dkd_ttl_value = Number.isFinite(Number(dkd_cache_ttl_ms_value)) ? Number(dkd_cache_ttl_ms_value) : dkd_courier_jobs_cache_ttl_ms_value;
  if (!dkd_courier_jobs_cache_entry_value?.dkd_saved_at_value) return null;
  if ((Date.now() - Number(dkd_courier_jobs_cache_entry_value.dkd_saved_at_value || 0)) > dkd_ttl_value) return null;
  return dkd_clone_job_rows_value(dkd_courier_jobs_cache_entry_value.dkd_rows_value);
}

function dkd_write_cached_job_rows_value(dkd_rows_value) {
  dkd_courier_jobs_cache_entry_value = {
    dkd_saved_at_value: Date.now(),
    dkd_rows_value: dkd_clone_job_rows_value(dkd_rows_value),
  };
}

export function dkd_peek_cached_courier_jobs_value() {
  return dkd_read_cached_job_rows_value(dkd_courier_jobs_cache_ttl_ms_value);
}

function dkd_is_missing_function_error(dkd_error_value) {
  const dkd_message_value = String(dkd_error_value?.message || '').toLowerCase();
  return dkd_message_value.includes('could not find the function') || dkd_message_value.includes('schema cache');
}

function dkd_is_missing_relation_error(dkd_error_value) {
  const dkd_message_value = String(dkd_error_value?.message || '').toLowerCase();
  return dkd_message_value.includes('relation "public.dkd_courier_jobs" does not exist') || dkd_message_value.includes('relation "dkd_courier_jobs" does not exist');
}

function dkd_is_missing_cargo_column_error(dkd_error_value) {
  const dkd_message_value = String(dkd_error_value?.message || '').toLowerCase();
  return dkd_message_value.includes('cargo_shipment_id');
}

async function dkd_run_rpc_with_fallback(dkd_function_name_value, dkd_payload_candidates_value = []) {
  let dkd_last_result_value = null;
  for (const dkd_payload_value of dkd_payload_candidates_value) {
    const dkd_result_value = await supabase.rpc(dkd_function_name_value, dkd_payload_value || {});
    if (!dkd_result_value?.error) return dkd_result_value;
    dkd_last_result_value = dkd_result_value;
    if (!dkd_is_missing_function_error(dkd_result_value.error)) return dkd_result_value;
  }
  return dkd_last_result_value || { data: null, error: null };
}

function dkd_safe_array_value(dkd_value) {
  return Array.isArray(dkd_value) ? dkd_value : [];
}

async function dkd_select_job_rows_by_ids(dkd_id_list_value) {
  const dkd_numeric_id_list_value = dkd_safe_array_value(dkd_id_list_value).filter((dkd_value) => dkd_value != null);
  if (!dkd_numeric_id_list_value.length) return { data: [], error: null };

  let dkd_result_value = await supabase
    .from('dkd_courier_jobs')
    .select(dkd_courier_select_with_cargo_value)
    .in('id', dkd_numeric_id_list_value);

  if (dkd_result_value?.error && dkd_is_missing_cargo_column_error(dkd_result_value.error)) {
    dkd_result_value = await supabase
      .from('dkd_courier_jobs')
      .select(dkd_courier_select_base_value)
      .in('id', dkd_numeric_id_list_value);
  }

  return dkd_result_value;
}

async function dkd_select_active_job_rows() {
  let dkd_result_value = await supabase
    .from('dkd_courier_jobs')
    .select(dkd_courier_select_with_cargo_value)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(30);

  if (dkd_result_value?.error && dkd_is_missing_cargo_column_error(dkd_result_value.error)) {
    dkd_result_value = await supabase
      .from('dkd_courier_jobs')
      .select(dkd_courier_select_base_value)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(30);
  }

  return dkd_result_value;
}

async function dkd_enrich_jobs_with_order_rows(dkd_rows_value) {
  const dkd_order_id_list_value = dkd_safe_array_value(dkd_rows_value)
    .filter((dkd_row_value) => dkd_row_value?.order_id != null)
    .map((dkd_row_value) => String(dkd_row_value.order_id))
    .filter(Boolean);
  if (!dkd_order_id_list_value.length) return dkd_rows_value;

  let dkd_order_result_value = await supabase
    .from('dkd_business_product_orders')
    .select('id, delivery_address_text, delivery_note, delivery_lat, delivery_lng, snapshot')
    .in('id', dkd_order_id_list_value);

  if ((dkd_order_result_value?.error || !(Array.isArray(dkd_order_result_value?.data) && dkd_order_result_value.data.length)) && dkd_order_id_list_value.every((dkd_value) => /^\d+$/.test(dkd_value))) {
    dkd_order_result_value = await supabase
      .from('dkd_business_product_orders')
      .select('id, delivery_address_text, delivery_note, delivery_lat, delivery_lng, snapshot')
      .in('id', dkd_order_id_list_value.map((dkd_value) => Number(dkd_value)));
  }

  if (dkd_order_result_value?.error) return dkd_rows_value;
  const dkd_order_map_value = new Map((dkd_order_result_value.data || []).map((dkd_row_value) => [String(dkd_row_value.id), dkd_row_value]));
  return dkd_rows_value.map((dkd_row_value) => {
    const dkd_order_row_value = dkd_order_map_value.get(String(dkd_row_value?.order_id || ''));
    if (!dkd_order_row_value) return dkd_row_value;
    const dkd_snapshot_value = dkd_order_row_value?.snapshot && typeof dkd_order_row_value.snapshot === 'object' ? dkd_order_row_value.snapshot : {};
    const dkd_snapshot_location_value = (dkd_snapshot_value?.delivery_location && typeof dkd_snapshot_value.delivery_location === 'object')
      ? dkd_snapshot_value.delivery_location
      : ((dkd_snapshot_value?.customer_location && typeof dkd_snapshot_value.customer_location === 'object')
        ? dkd_snapshot_value.customer_location
        : ((dkd_snapshot_value?.location && typeof dkd_snapshot_value.location === 'object') ? dkd_snapshot_value.location : {}));
    const dkd_delivery_address_text_value = dkd_order_row_value?.delivery_address_text || dkd_snapshot_value?.delivery_address_text || dkd_snapshot_value?.address_text || dkd_snapshot_value?.delivery_address || dkd_row_value?.delivery_address_text || dkd_row_value?.dropoff;
    const dkd_delivery_note_value = dkd_order_row_value?.delivery_note || dkd_snapshot_value?.delivery_note || dkd_snapshot_value?.note || dkd_row_value?.delivery_note || null;
    const dkd_delivery_lat_value = dkd_order_row_value?.delivery_lat == null
      ? (dkd_snapshot_location_value?.lat ?? dkd_snapshot_location_value?.latitude ?? dkd_snapshot_value?.delivery_lat ?? dkd_snapshot_value?.lat ?? dkd_row_value?.dropoff_lat)
      : dkd_order_row_value?.delivery_lat;
    const dkd_delivery_lng_value = dkd_order_row_value?.delivery_lng == null
      ? (dkd_snapshot_location_value?.lng ?? dkd_snapshot_location_value?.longitude ?? dkd_snapshot_value?.delivery_lng ?? dkd_snapshot_value?.lng ?? dkd_row_value?.dropoff_lng)
      : dkd_order_row_value?.delivery_lng;
    return {
      ...dkd_row_value,
      dropoff: dkd_delivery_address_text_value || dkd_row_value?.dropoff,
      delivery_address_text: dkd_delivery_address_text_value,
      delivery_note: dkd_delivery_note_value,
      dropoff_lat: dkd_delivery_lat_value,
      dropoff_lng: dkd_delivery_lng_value,
    };
  });
}

async function dkd_enrich_jobs_with_business_rows(dkd_rows_value) {
  const dkd_business_id_list_value = dkd_safe_array_value(dkd_rows_value)
    .filter((dkd_row_value) => dkd_row_value?.business_id && (dkd_row_value?.pickup_lat == null || dkd_row_value?.pickup_lng == null || !dkd_row_value?.pickup))
    .map((dkd_row_value) => String(dkd_row_value.business_id))
    .filter(Boolean);
  if (!dkd_business_id_list_value.length) return dkd_rows_value;

  const dkd_business_result_value = await supabase
    .from('dkd_businesses')
    .select('id, name, address_text, lat, lng')
    .in('id', dkd_business_id_list_value);
  if (dkd_business_result_value?.error) return dkd_rows_value;

  const dkd_business_map_value = new Map((dkd_business_result_value.data || []).map((dkd_row_value) => [String(dkd_row_value.id), dkd_row_value]));
  return dkd_rows_value.map((dkd_row_value) => {
    const dkd_business_row_value = dkd_business_map_value.get(String(dkd_row_value?.business_id || ''));
    if (!dkd_business_row_value) return dkd_row_value;
    return {
      ...dkd_row_value,
      pickup: dkd_row_value?.pickup || dkd_business_row_value?.address_text || dkd_business_row_value?.name || dkd_row_value?.merchant_name,
      merchant_name: dkd_row_value?.merchant_name || dkd_business_row_value?.name,
      pickup_lat: dkd_row_value?.pickup_lat == null ? dkd_business_row_value?.lat : dkd_row_value?.pickup_lat,
      pickup_lng: dkd_row_value?.pickup_lng == null ? dkd_business_row_value?.lng : dkd_row_value?.pickup_lng,
    };
  });
}

async function dkd_enrich_jobs_with_cargo_rows(dkd_rows_value) {
  const dkd_shipment_id_list_value = dkd_safe_array_value(dkd_rows_value)
    .filter((dkd_row_value) => dkd_row_value?.cargo_shipment_id != null)
    .map((dkd_row_value) => Number(dkd_row_value.cargo_shipment_id))
    .filter((dkd_value) => Number.isFinite(dkd_value));

  if (!dkd_shipment_id_list_value.length) return dkd_rows_value;

  const dkd_shipment_result_value = await supabase
    .from('dkd_cargo_shipments')
    .select('id, customer_first_name, customer_last_name, customer_phone_text, pickup_address_text, package_content_text, package_image_url, pickup_proof_image_url, package_weight_kg, status')
    .in('id', dkd_shipment_id_list_value);

  if (dkd_shipment_result_value?.error) return dkd_rows_value;

  const dkd_shipment_map_value = new Map((dkd_shipment_result_value.data || []).map((dkd_row_value) => [String(dkd_row_value.id), dkd_row_value]));
  return dkd_rows_value.map((dkd_row_value) => {
    const dkd_shipment_row_value = dkd_shipment_map_value.get(String(dkd_row_value?.cargo_shipment_id || ''));
    if (!dkd_shipment_row_value) return dkd_row_value;
    const dkd_customer_full_name_value = [dkd_shipment_row_value?.customer_first_name, dkd_shipment_row_value?.customer_last_name].filter(Boolean).join(' ').trim();
    return {
      ...dkd_row_value,
      job_type: 'cargo',
      title: dkd_row_value?.title || 'Kargo Gönderisi',
      merchant_name: dkd_row_value?.merchant_name || 'Kargo Operasyon Merkezi',
      pickup: dkd_shipment_row_value?.pickup_address_text || dkd_row_value?.pickup,
      product_title: dkd_row_value?.product_title || dkd_shipment_row_value?.package_content_text || 'Paket',
      delivery_note: String(dkd_row_value?.delivery_note || '').trim() || 'Teşekkür Ederim',
      customer_full_name: dkd_customer_full_name_value,
      package_weight_kg: Number(dkd_shipment_row_value?.package_weight_kg || 0),
      customer_phone_text: dkd_shipment_row_value?.customer_phone_text || '',
      package_image_url: dkd_shipment_row_value?.package_image_url || '',
      pickup_proof_image_url: dkd_shipment_row_value?.pickup_proof_image_url || '',
      cargo_status: dkd_shipment_row_value?.status || 'open',
    };
  });
}

async function dkd_enrich_jobs(dkd_rows_value) {
  const dkd_rows_after_business_value = await dkd_enrich_jobs_with_business_rows(dkd_safe_array_value(dkd_rows_value));
  const dkd_rows_after_order_value = await dkd_enrich_jobs_with_order_rows(dkd_rows_after_business_value);
  return dkd_enrich_jobs_with_cargo_rows(dkd_rows_after_order_value);
}

async function dkd_fetch_courier_jobs_remote_value() {
  const dkd_rpc_result_value = await supabase.rpc('dkd_courier_jobs_for_me');
  if (!dkd_rpc_result_value?.error) {
    const dkd_rows_value = Array.isArray(dkd_rpc_result_value.data) ? dkd_rpc_result_value.data : [];
    const dkd_needs_extra_value = dkd_rows_value.some((dkd_row_value) => dkd_row_value?.fee_tl == null || dkd_row_value?.pickup_status == null || dkd_row_value?.merchant_name == null || dkd_row_value?.product_title == null || dkd_row_value?.cargo_shipment_id != null);
    if (!dkd_needs_extra_value || !dkd_rows_value.length) return { data: await dkd_enrich_jobs(dkd_rows_value), error: null };

    const dkd_id_list_value = dkd_rows_value.map((dkd_row_value) => dkd_row_value?.id).filter((dkd_value) => dkd_value != null);
    const dkd_extra_result_value = await dkd_select_job_rows_by_ids(dkd_id_list_value);
    if (dkd_extra_result_value?.error) return { data: await dkd_enrich_jobs(dkd_rows_value), error: null };
    const dkd_extra_map_value = new Map((dkd_extra_result_value.data || []).map((dkd_row_value) => [String(dkd_row_value?.id || ''), dkd_row_value]));
    return {
      data: await dkd_enrich_jobs(dkd_rows_value.map((dkd_row_value) => ({
        ...dkd_row_value,
        ...(dkd_extra_map_value.get(String(dkd_row_value?.id || '')) || {}),
      }))),
      error: null,
    };
  }

  if (dkd_is_missing_function_error(dkd_rpc_result_value.error)) {
    const dkd_fallback_result_value = await dkd_select_active_job_rows();
    if (!dkd_fallback_result_value?.error) return { data: await dkd_enrich_jobs(dkd_fallback_result_value.data), error: null };
    if (dkd_is_missing_relation_error(dkd_fallback_result_value.error)) return { data: [], error: null };
    return dkd_fallback_result_value;
  }

  if (dkd_is_missing_relation_error(dkd_rpc_result_value.error)) return { data: [], error: null };
  return dkd_rpc_result_value;
}

export async function fetchCourierJobs(dkd_options_value = {}) {
  const dkd_force_refresh_value = dkd_options_value?.dkd_force_refresh === true;
  const dkd_cache_ttl_ms_value = Number.isFinite(Number(dkd_options_value?.dkd_cache_ttl_ms))
    ? Number(dkd_options_value?.dkd_cache_ttl_ms)
    : dkd_courier_jobs_cache_ttl_ms_value;

  if (!dkd_force_refresh_value) {
    const dkd_cached_rows_value = dkd_read_cached_job_rows_value(dkd_cache_ttl_ms_value);
    if (dkd_cached_rows_value) {
      return { data: dkd_cached_rows_value, error: null, dkd_from_cache: true };
    }
    if (dkd_courier_jobs_request_promise_value) {
      return dkd_courier_jobs_request_promise_value;
    }
  }

  dkd_courier_jobs_request_promise_value = (async () => {
    const dkd_result_value = await dkd_fetch_courier_jobs_remote_value();
    if (!dkd_result_value?.error) {
      dkd_write_cached_job_rows_value(dkd_result_value?.data || []);
      return { data: dkd_clone_job_rows_value(dkd_result_value?.data || []), error: null, dkd_from_cache: false };
    }
    return dkd_result_value;
  })();

  try {
    return await dkd_courier_jobs_request_promise_value;
  } finally {
    dkd_courier_jobs_request_promise_value = null;
  }
}

export async function acceptCourierJob(dkd_job_id_value, dkd_current_location_value = null) {
  const dkd_numeric_job_id_value = Number(dkd_job_id_value);
  const dkd_live_lat_value = Number(dkd_current_location_value?.lat);
  const dkd_live_lng_value = Number(dkd_current_location_value?.lng);
  const dkd_has_live_coords_value = Number.isFinite(dkd_live_lat_value) && Number.isFinite(dkd_live_lng_value);
  return dkd_run_rpc_with_fallback('dkd_courier_job_accept', [
    dkd_has_live_coords_value ? {
      dkd_param_job_id: dkd_numeric_job_id_value,
      dkd_param_live_lat: dkd_live_lat_value,
      dkd_param_live_lng: dkd_live_lng_value,
    } : null,
    dkd_has_live_coords_value ? {
      dkd_job_id: dkd_numeric_job_id_value,
      dkd_live_lat: dkd_live_lat_value,
      dkd_live_lng: dkd_live_lng_value,
    } : null,
    { dkd_job_id: dkd_numeric_job_id_value },
    { dkd_param_job_id: dkd_numeric_job_id_value },
  ].filter(Boolean));
}

export async function markCourierJobPickedUp(dkd_job_id_value, dkd_input_value = {}) {
  const dkd_numeric_job_id_value = Number(dkd_job_id_value);
  const dkd_pickup_proof_image_url_value = String(dkd_input_value?.dkd_pickup_proof_image_url || '').trim();
  return dkd_run_rpc_with_fallback('dkd_courier_job_mark_picked_up', [
    dkd_pickup_proof_image_url_value ? {
      dkd_param_job_id: dkd_numeric_job_id_value,
      dkd_param_pickup_proof_image_url: dkd_pickup_proof_image_url_value,
    } : null,
    { dkd_param_job_id: dkd_numeric_job_id_value },
    { dkd_job_id: dkd_numeric_job_id_value },
  ].filter(Boolean));
}

export async function completeCourierJob(dkd_job_id_value) {
  const dkd_numeric_job_id_value = Number(dkd_job_id_value);
  return dkd_run_rpc_with_fallback('dkd_courier_job_complete', [
    { dkd_job_id: dkd_numeric_job_id_value },
    { dkd_param_job_id: dkd_numeric_job_id_value },
  ]);
}
