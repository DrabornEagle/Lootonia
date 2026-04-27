import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../lib/supabase';

const dkd_cargo_package_bucket_value = 'lootonia-cargo-package-art';

function dkd_slugify_value(dkd_input_value) {
  return String(dkd_input_value || 'cargo')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'cargo';
}

function dkd_infer_mime_from_uri(dkd_uri_value) {
  const dkd_lower_value = String(dkd_uri_value || '').toLowerCase();
  if (dkd_lower_value.endsWith('.png')) return { dkd_ext_value: 'png', dkd_mime_value: 'image/png' };
  if (dkd_lower_value.endsWith('.webp')) return { dkd_ext_value: 'webp', dkd_mime_value: 'image/webp' };
  if (dkd_lower_value.endsWith('.heic')) return { dkd_ext_value: 'heic', dkd_mime_value: 'image/heic' };
  return { dkd_ext_value: 'jpg', dkd_mime_value: 'image/jpeg' };
}

function dkd_base64_to_array_buffer(dkd_base64_value) {
  const dkd_clean_value = String(dkd_base64_value || '').replace(/\s/g, '');
  const dkd_characters_value = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let dkd_buffer_length = dkd_clean_value.length * 0.75;
  if (dkd_clean_value.endsWith('==')) dkd_buffer_length -= 2;
  else if (dkd_clean_value.endsWith('=')) dkd_buffer_length -= 1;

  const dkd_array_buffer_value = new ArrayBuffer(Math.max(0, dkd_buffer_length));
  const dkd_bytes_value = new Uint8Array(dkd_array_buffer_value);

  let dkd_write_index_value = 0;
  for (let dkd_loop_index_value = 0; dkd_loop_index_value < dkd_clean_value.length; dkd_loop_index_value += 4) {
    const dkd_enc1_value = dkd_characters_value.indexOf(dkd_clean_value[dkd_loop_index_value]);
    const dkd_enc2_value = dkd_characters_value.indexOf(dkd_clean_value[dkd_loop_index_value + 1]);
    const dkd_enc3_value = dkd_clean_value[dkd_loop_index_value + 2] === '=' ? 64 : dkd_characters_value.indexOf(dkd_clean_value[dkd_loop_index_value + 2]);
    const dkd_enc4_value = dkd_clean_value[dkd_loop_index_value + 3] === '=' ? 64 : dkd_characters_value.indexOf(dkd_clean_value[dkd_loop_index_value + 3]);

    const dkd_byte1_value = (dkd_enc1_value << 2) | (dkd_enc2_value >> 4);
    dkd_bytes_value[dkd_write_index_value++] = dkd_byte1_value;

    if (dkd_enc3_value !== 64) {
      const dkd_byte2_value = ((dkd_enc2_value & 15) << 4) | (dkd_enc3_value >> 2);
      dkd_bytes_value[dkd_write_index_value++] = dkd_byte2_value;
    }

    if (dkd_enc4_value !== 64) {
      const dkd_byte3_value = ((dkd_enc3_value & 3) << 6) | dkd_enc4_value;
      dkd_bytes_value[dkd_write_index_value++] = dkd_byte3_value;
    }
  }

  return dkd_array_buffer_value;
}

async function dkd_read_base64_from_uri(dkd_uri_value) {
  const dkd_input_value = String(dkd_uri_value || '').trim();
  if (!dkd_input_value) throw new Error('cargo_art_uri_missing');

  try {
    return await FileSystem.readAsStringAsync(dkd_input_value, { encoding: FileSystem.EncodingType.Base64 });
  } catch (dkd_direct_error_value) {
    const { dkd_ext_value } = dkd_infer_mime_from_uri(dkd_input_value);
    const dkd_temp_uri_value = `${FileSystem.cacheDirectory || ''}lootonia-cargo-upload-${Date.now()}.${dkd_ext_value}`;
    if (!dkd_temp_uri_value) throw dkd_direct_error_value;
    await FileSystem.copyAsync({ from: dkd_input_value, to: dkd_temp_uri_value });
    try {
      return await FileSystem.readAsStringAsync(dkd_temp_uri_value, { encoding: FileSystem.EncodingType.Base64 });
    } finally {
      try {
        await FileSystem.deleteAsync(dkd_temp_uri_value, { idempotent: true });
      } catch (dkd_unused_error_value) {}
    }
  }
}

async function dkd_normalize_upload_uri(dkd_uri_value) {
  const dkd_input_value = String(dkd_uri_value || '').trim();
  if (!dkd_input_value) throw new Error('cargo_art_uri_missing');
  if (/^https?:\/\//.test(dkd_input_value)) return dkd_input_value;

  try {
    const dkd_output_value = await ImageManipulator.manipulateAsync(
      dkd_input_value,
      [{ resize: { width: 1280 } }],
      { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
    );
    return dkd_output_value?.uri || dkd_input_value;
  } catch (dkd_unused_error_value) {
    return dkd_input_value;
  }
}

function dkd_to_number_or_null(dkd_value) {
  const dkd_numeric_value = Number(dkd_value);
  return Number.isFinite(dkd_numeric_value) ? dkd_numeric_value : null;
}

function dkd_normalize_shipment_rows(dkd_rows_value) {
  return (Array.isArray(dkd_rows_value) ? dkd_rows_value : []).map((dkd_row_value) => ({
    id: dkd_row_value?.id,
    customer_user_id: dkd_row_value?.customer_user_id || null,
    customer_first_name: dkd_row_value?.customer_first_name || '',
    customer_last_name: dkd_row_value?.customer_last_name || '',
    customer_full_name: dkd_row_value?.customer_full_name || [dkd_row_value?.customer_first_name, dkd_row_value?.customer_last_name].filter(Boolean).join(' ').trim(),
    customer_national_id: dkd_row_value?.customer_national_id || '',
    customer_phone_text: dkd_row_value?.customer_phone_text || '',
    pickup_address_text: dkd_row_value?.pickup_address_text || '',
    delivery_address_text: dkd_row_value?.delivery_address_text || '',
    delivery_note: dkd_row_value?.delivery_note || '',
    pickup_lat: dkd_to_number_or_null(dkd_row_value?.pickup_lat),
    pickup_lng: dkd_to_number_or_null(dkd_row_value?.pickup_lng),
    dropoff_lat: dkd_to_number_or_null(dkd_row_value?.dropoff_lat),
    dropoff_lng: dkd_to_number_or_null(dkd_row_value?.dropoff_lng),
    courier_fee_tl: dkd_to_number_or_null(dkd_row_value?.courier_fee_tl) ?? dkd_to_number_or_null(dkd_row_value?.fee_tl) ?? 0,
    customer_charge_tl: dkd_to_number_or_null(dkd_row_value?.customer_charge_tl) ?? 0,
    payment_status: dkd_row_value?.payment_status || '',
    paid_at: dkd_row_value?.paid_at || null,
    package_content_text: dkd_row_value?.package_content_text || '',
    package_image_url: dkd_row_value?.package_image_url || '',
    pickup_proof_image_url: dkd_row_value?.pickup_proof_image_url || '',
    package_weight_kg: dkd_to_number_or_null(dkd_row_value?.package_weight_kg) ?? 0,
    status: dkd_row_value?.status || dkd_row_value?.package_status || 'open',
    created_at: dkd_row_value?.created_at || null,
    accepted_at: dkd_row_value?.accepted_at || null,
    picked_up_at: dkd_row_value?.picked_up_at || null,
    completed_at: dkd_row_value?.completed_at || null,
    courier_job_id: dkd_row_value?.courier_job_id ?? dkd_row_value?.job_id ?? null,
    assigned_courier_user_id: dkd_row_value?.assigned_courier_user_id || null,
    courier_display_name: dkd_row_value?.courier_display_name || '',
    courier_plate_no: dkd_row_value?.courier_plate_no || dkd_row_value?.assigned_courier_plate_no || '',
    courier_vehicle_type: dkd_row_value?.courier_vehicle_type || dkd_row_value?.assigned_courier_vehicle_type || '',
    courier_lat: dkd_to_number_or_null(dkd_row_value?.courier_lat),
    courier_lng: dkd_to_number_or_null(dkd_row_value?.courier_lng),
    courier_eta_min: dkd_to_number_or_null(dkd_row_value?.courier_eta_min),
    courier_heading_deg: dkd_to_number_or_null(dkd_row_value?.courier_heading_deg),
    courier_location_updated_at: dkd_row_value?.courier_location_updated_at || dkd_row_value?.location_updated_at || null,
  }));
}

export async function dkd_upload_cargo_package_art({ dkd_image_uri, dkd_sender_slug, dkd_content_label }) {
  const dkd_clean_uri_value = String(dkd_image_uri || '').trim();
  if (!dkd_clean_uri_value) throw new Error('cargo_art_uri_missing');
  const dkd_upload_uri_value = await dkd_normalize_upload_uri(dkd_clean_uri_value);
  const { dkd_ext_value, dkd_mime_value } = dkd_infer_mime_from_uri(dkd_upload_uri_value);
  const dkd_base64_value = await dkd_read_base64_from_uri(dkd_upload_uri_value);
  const dkd_array_buffer_value = dkd_base64_to_array_buffer(dkd_base64_value);
  const dkd_folder_value = dkd_slugify_value(dkd_sender_slug || 'sender');
  const dkd_stem_value = dkd_slugify_value(dkd_content_label || `cargo-${Date.now()}`);
  const dkd_file_name_value = `${Date.now()}-${dkd_stem_value}.${dkd_ext_value}`;
  const dkd_path_value = `cargo-packages/${dkd_folder_value}/${dkd_file_name_value}`;

  const { error: dkd_upload_error_value } = await supabase.storage
    .from(dkd_cargo_package_bucket_value)
    .upload(dkd_path_value, dkd_array_buffer_value, { contentType: dkd_mime_value, upsert: true });

  if (dkd_upload_error_value) throw dkd_upload_error_value;

  const { data: dkd_public_url_value } = supabase.storage.from(dkd_cargo_package_bucket_value).getPublicUrl(dkd_path_value);
  return {
    data: {
      path: dkd_path_value,
      publicUrl: dkd_public_url_value?.publicUrl || '',
    },
    error: null,
  };
}

export async function dkd_create_cargo_shipment(dkd_input_value) {
  const dkd_payload_value = {
    dkd_param_customer_first_name: String(dkd_input_value?.dkd_customer_first_name || '').trim(),
    dkd_param_customer_last_name: String(dkd_input_value?.dkd_customer_last_name || '').trim(),
    dkd_param_customer_national_id: String(dkd_input_value?.dkd_customer_national_id || '').replace(/\D/g, '').slice(0, 11),
    dkd_param_customer_phone_text: String(dkd_input_value?.dkd_customer_phone_text || '').trim(),
    dkd_param_pickup_address_text: String(dkd_input_value?.dkd_pickup_address_text || '').trim(),
    dkd_param_delivery_address_text: String(dkd_input_value?.dkd_delivery_address_text || '').trim(),
    dkd_param_delivery_note_text: String(dkd_input_value?.dkd_delivery_note_text || '').trim(),
    dkd_param_package_content_text: String(dkd_input_value?.dkd_package_content_text || '').trim(),
    dkd_param_package_image_url: String(dkd_input_value?.dkd_package_image_url || '').trim() || null,
    dkd_param_package_weight_kg: Math.max(0.1, Number(dkd_input_value?.dkd_package_weight_kg || 0.1) || 0.1),
    dkd_param_pickup_lat: dkd_to_number_or_null(dkd_input_value?.dkd_pickup_lat),
    dkd_param_pickup_lng: dkd_to_number_or_null(dkd_input_value?.dkd_pickup_lng),
    dkd_param_dropoff_lat: dkd_to_number_or_null(dkd_input_value?.dkd_dropoff_lat),
    dkd_param_dropoff_lng: dkd_to_number_or_null(dkd_input_value?.dkd_dropoff_lng),
    dkd_param_pickup_distance_km: dkd_to_number_or_null(dkd_input_value?.dkd_pickup_distance_km),
    dkd_param_delivery_distance_km: dkd_to_number_or_null(dkd_input_value?.dkd_delivery_distance_km),
    dkd_param_courier_fee_tl: dkd_to_number_or_null(dkd_input_value?.dkd_courier_fee_tl),
    dkd_param_customer_charge_tl: dkd_to_number_or_null(dkd_input_value?.dkd_customer_charge_tl),
  };
  return supabase.rpc('dkd_cargo_shipment_create', dkd_payload_value);
}


async function dkd_fetch_direct_my_cargo_shipments_by_user_id_value(dkd_user_id_value) {
  if (!dkd_user_id_value) {
    return { data: [], error: null };
  }

  const dkd_shipment_result_value = await supabase
    .from('dkd_cargo_shipments')
    .select('id, customer_user_id, customer_first_name, customer_last_name, customer_national_id, customer_phone_text, pickup_address_text, delivery_address_text, delivery_note, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, courier_fee_tl, customer_charge_tl, payment_status, paid_at, package_content_text, package_image_url, pickup_proof_image_url, package_weight_kg, status, created_at, accepted_at, picked_up_at, completed_at, assigned_courier_user_id, assigned_courier_plate_no, assigned_courier_vehicle_type, courier_eta_min, courier_job_id')
    .eq('customer_user_id', dkd_user_id_value)
    .order('created_at', { ascending: false })
    .limit(30);

  if (dkd_shipment_result_value?.error) {
    return { data: [], error: dkd_shipment_result_value.error };
  }

  const dkd_shipment_rows_value = Array.isArray(dkd_shipment_result_value.data) ? dkd_shipment_result_value.data : [];
  const dkd_courier_user_id_list = [...new Set(dkd_shipment_rows_value.map((dkd_row_value) => String(dkd_row_value?.assigned_courier_user_id || '')).filter(Boolean))];

  const dkd_profile_result_value = dkd_courier_user_id_list.length
    ? await supabase
        .from('dkd_profiles')
        .select('user_id, nickname, courier_vehicle_type, courier_profile_meta')
        .in('user_id', dkd_courier_user_id_list)
    : { data: [], error: null };

  const dkd_location_result_value = dkd_courier_user_id_list.length
    ? await supabase
        .from('dkd_courier_live_locations')
        .select('courier_user_id, lat, lng, eta_min, plate_no, vehicle_type, heading_deg, updated_at')
        .in('courier_user_id', dkd_courier_user_id_list)
    : { data: [], error: null };

  const dkd_profile_map_value = new Map((Array.isArray(dkd_profile_result_value?.data) ? dkd_profile_result_value.data : []).map((dkd_profile_row_value) => [String(dkd_profile_row_value.user_id), dkd_profile_row_value]));
  const dkd_location_map_value = new Map((Array.isArray(dkd_location_result_value?.data) ? dkd_location_result_value.data : []).map((dkd_location_row_value) => [String(dkd_location_row_value.courier_user_id), dkd_location_row_value]));

  const dkd_merged_rows_value = dkd_shipment_rows_value.map((dkd_shipment_row_value) => {
    const dkd_courier_key_value = String(dkd_shipment_row_value?.assigned_courier_user_id || '');
    const dkd_profile_row_value = dkd_profile_map_value.get(dkd_courier_key_value);
    const dkd_location_row_value = dkd_location_map_value.get(dkd_courier_key_value);
    return {
      ...dkd_shipment_row_value,
      courier_display_name: dkd_profile_row_value?.nickname || 'Kurye atandı',
      courier_plate_no: dkd_location_row_value?.plate_no || dkd_shipment_row_value?.assigned_courier_plate_no || dkd_profile_row_value?.courier_profile_meta?.plate_no || dkd_profile_row_value?.courier_profile_meta?.plateNo || '',
      courier_vehicle_type: dkd_location_row_value?.vehicle_type || dkd_shipment_row_value?.assigned_courier_vehicle_type || dkd_profile_row_value?.courier_vehicle_type || '',
      courier_lat: dkd_to_number_or_null(dkd_location_row_value?.lat),
      courier_lng: dkd_to_number_or_null(dkd_location_row_value?.lng),
      courier_eta_min: dkd_to_number_or_null(dkd_location_row_value?.eta_min) ?? dkd_to_number_or_null(dkd_shipment_row_value?.courier_eta_min),
      courier_heading_deg: dkd_to_number_or_null(dkd_location_row_value?.heading_deg),
      courier_location_updated_at: dkd_location_row_value?.updated_at || null,
    };
  });

  return { data: dkd_normalize_shipment_rows(dkd_merged_rows_value), error: null };
}

function dkd_rpc_cargo_rows_need_direct_enrichment_value(dkd_rows_value) {
  return (Array.isArray(dkd_rows_value) ? dkd_rows_value : []).some((dkd_row_value) => {
    const dkd_status_key_value = String(dkd_row_value?.status || 'open').toLowerCase();
    const dkd_is_active_value = ['accepted', 'picked_up'].includes(dkd_status_key_value);
    const dkd_missing_dropoff_value = !String(dkd_row_value?.delivery_address_text || '').trim() || dkd_to_number_or_null(dkd_row_value?.dropoff_lat) == null || dkd_to_number_or_null(dkd_row_value?.dropoff_lng) == null;
    const dkd_missing_pickup_value = !String(dkd_row_value?.pickup_address_text || '').trim() || dkd_to_number_or_null(dkd_row_value?.pickup_lat) == null || dkd_to_number_or_null(dkd_row_value?.pickup_lng) == null;
    const dkd_missing_live_value = dkd_is_active_value && (dkd_to_number_or_null(dkd_row_value?.courier_lat) == null || dkd_to_number_or_null(dkd_row_value?.courier_lng) == null || !dkd_row_value?.courier_location_updated_at);
    return dkd_missing_dropoff_value || dkd_missing_pickup_value || dkd_missing_live_value;
  });
}

export async function dkd_fetch_my_cargo_shipments() {
  const dkd_user_result_value = await supabase.auth.getUser();
  const dkd_user_id_value = dkd_user_result_value?.data?.user?.id || null;

  const dkd_rpc_result_value = await supabase.rpc('dkd_cargo_shipments_for_me');
  if (!dkd_rpc_result_value?.error) {
    const dkd_normalized_rpc_rows_value = dkd_normalize_shipment_rows(dkd_rpc_result_value.data);
    if (!dkd_rpc_cargo_rows_need_direct_enrichment_value(dkd_normalized_rpc_rows_value) || !dkd_user_id_value) {
      return { data: dkd_normalized_rpc_rows_value, error: null };
    }

    const dkd_direct_result_value = await dkd_fetch_direct_my_cargo_shipments_by_user_id_value(dkd_user_id_value);
    if (!dkd_direct_result_value?.error && Array.isArray(dkd_direct_result_value?.data) && dkd_direct_result_value.data.length) {
      const dkd_direct_map_value = new Map(dkd_direct_result_value.data.map((dkd_row_value) => [String(dkd_row_value?.id || ''), dkd_row_value]));
      return {
        data: dkd_normalized_rpc_rows_value.map((dkd_rpc_row_value) => ({
          ...dkd_rpc_row_value,
          ...(dkd_direct_map_value.get(String(dkd_rpc_row_value?.id || '')) || {}),
        })),
        error: null,
      };
    }

    return { data: dkd_normalized_rpc_rows_value, error: null };
  }

  if (!dkd_user_id_value) {
    return { data: [], error: null };
  }

  return dkd_fetch_direct_my_cargo_shipments_by_user_id_value(dkd_user_id_value);
}

export async function dkd_upsert_courier_live_location(dkd_input_value) {
  const dkd_payload_value = {
    dkd_param_lat: dkd_to_number_or_null(dkd_input_value?.dkd_lat),
    dkd_param_lng: dkd_to_number_or_null(dkd_input_value?.dkd_lng),
    dkd_param_eta_min: dkd_to_number_or_null(dkd_input_value?.dkd_eta_min),
    dkd_param_heading_deg: dkd_to_number_or_null(dkd_input_value?.dkd_heading_deg),
    dkd_param_plate_no: String(dkd_input_value?.dkd_plate_no || '').trim().toUpperCase() || null,
    dkd_param_vehicle_type: String(dkd_input_value?.dkd_vehicle_type || '').trim().toLowerCase() || null,
  };

  const dkd_rpc_result_value = await supabase.rpc('dkd_courier_location_ping', dkd_payload_value);
  if (!dkd_rpc_result_value?.error) return dkd_rpc_result_value;

  const dkd_user_result_value = await supabase.auth.getUser();
  const dkd_user_id_value = dkd_user_result_value?.data?.user?.id || null;
  if (!dkd_user_id_value) return dkd_rpc_result_value;

  const dkd_upsert_result_value = await supabase
    .from('dkd_courier_live_locations')
    .upsert({
      courier_user_id: dkd_user_id_value,
      lat: dkd_payload_value.dkd_param_lat,
      lng: dkd_payload_value.dkd_param_lng,
      eta_min: dkd_payload_value.dkd_param_eta_min,
      heading_deg: dkd_payload_value.dkd_param_heading_deg,
      plate_no: dkd_payload_value.dkd_param_plate_no,
      vehicle_type: dkd_payload_value.dkd_param_vehicle_type,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'courier_user_id' });

  if (dkd_upsert_result_value?.error) return dkd_rpc_result_value;
  return { data: { ok: true }, error: null };
}
