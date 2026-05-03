import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { uploadCourierDocument } from './courierApplicationService';

const dkd_logistics_local_storage_key_value = 'dkd_lootonia_logistics_local_state_v1';

function dkd_now_iso_value() {
  return new Date().toISOString();
}

function dkd_string_value(dkd_input_value, dkd_fallback_value = '') {
  return String(dkd_input_value ?? dkd_fallback_value).trim();
}

function dkd_number_value(dkd_input_value, dkd_fallback_value = 0) {
  const dkd_numeric_value = Number(dkd_input_value);
  return Number.isFinite(dkd_numeric_value) ? dkd_numeric_value : dkd_fallback_value;
}

function dkd_parse_json_value(dkd_raw_value) {
  try {
    return JSON.parse(String(dkd_raw_value || '{}')) || {};
  } catch {
    return {};
  }
}

function dkd_is_missing_relation_error_value(dkd_error_value) {
  const dkd_message_value = String(dkd_error_value?.message || dkd_error_value || '').toLowerCase();
  return dkd_message_value.includes('relation')
    || dkd_message_value.includes('schema cache')
    || dkd_message_value.includes('column')
    || dkd_message_value.includes('does not exist')
    || dkd_message_value.includes('not found');
}

async function dkd_read_local_state_value() {
  const dkd_raw_value = await AsyncStorage.getItem(dkd_logistics_local_storage_key_value);
  const dkd_state_value = dkd_parse_json_value(dkd_raw_value);
  return {
    dkd_applications_value: Array.isArray(dkd_state_value?.dkd_applications_value) ? dkd_state_value.dkd_applications_value : [],
    dkd_jobs_value: Array.isArray(dkd_state_value?.dkd_jobs_value) ? dkd_state_value.dkd_jobs_value : [],
    dkd_offers_value: Array.isArray(dkd_state_value?.dkd_offers_value) ? dkd_state_value.dkd_offers_value : [],
    dkd_messages_value: Array.isArray(dkd_state_value?.dkd_messages_value) ? dkd_state_value.dkd_messages_value : [],
  };
}

async function dkd_write_local_state_value(dkd_state_value) {
  await AsyncStorage.setItem(dkd_logistics_local_storage_key_value, JSON.stringify({
    dkd_applications_value: Array.isArray(dkd_state_value?.dkd_applications_value) ? dkd_state_value.dkd_applications_value : [],
    dkd_jobs_value: Array.isArray(dkd_state_value?.dkd_jobs_value) ? dkd_state_value.dkd_jobs_value : [],
    dkd_offers_value: Array.isArray(dkd_state_value?.dkd_offers_value) ? dkd_state_value.dkd_offers_value : [],
    dkd_messages_value: Array.isArray(dkd_state_value?.dkd_messages_value) ? dkd_state_value.dkd_messages_value : [],
  }));
}

function dkd_local_id_value(dkd_prefix_value) {
  return `${dkd_prefix_value}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function dkd_upload_logistics_document_safe_value({ dkd_image_uri_value, dkd_user_id_value, dkd_kind_value }) {
  const dkd_clean_uri_value = dkd_string_value(dkd_image_uri_value);
  if (!dkd_clean_uri_value) return '';
  if (/^https?:\/\//.test(dkd_clean_uri_value)) return dkd_clean_uri_value;
  try {
    return await uploadCourierDocument({
      imageUri: dkd_clean_uri_value,
      userId: dkd_user_id_value,
      kind: `dkd-logistics-${dkd_kind_value}`,
    });
  } catch {
    return dkd_clean_uri_value;
  }
}

async function dkd_logistics_documents_payload_value(dkd_user_id_value, dkd_form_value) {
  return {
    dkd_identity_front_url_value: await dkd_upload_logistics_document_safe_value({ dkd_image_uri_value: dkd_form_value?.dkd_identity_front_uri_value || dkd_form_value?.dkd_identity_front_url_value, dkd_user_id_value, dkd_kind_value: 'identity-front' }),
    dkd_identity_back_url_value: await dkd_upload_logistics_document_safe_value({ dkd_image_uri_value: dkd_form_value?.dkd_identity_back_uri_value || dkd_form_value?.dkd_identity_back_url_value, dkd_user_id_value, dkd_kind_value: 'identity-back' }),
    dkd_selfie_url_value: await dkd_upload_logistics_document_safe_value({ dkd_image_uri_value: dkd_form_value?.dkd_selfie_uri_value || dkd_form_value?.dkd_selfie_url_value, dkd_user_id_value, dkd_kind_value: 'selfie' }),
    dkd_driver_license_url_value: await dkd_upload_logistics_document_safe_value({ dkd_image_uri_value: dkd_form_value?.dkd_driver_license_uri_value || dkd_form_value?.dkd_driver_license_url_value, dkd_user_id_value, dkd_kind_value: 'driver-license' }),
    dkd_vehicle_license_url_value: await dkd_upload_logistics_document_safe_value({ dkd_image_uri_value: dkd_form_value?.dkd_vehicle_license_uri_value || dkd_form_value?.dkd_vehicle_license_url_value, dkd_user_id_value, dkd_kind_value: 'vehicle-license' }),
    dkd_insurance_url_value: await dkd_upload_logistics_document_safe_value({ dkd_image_uri_value: dkd_form_value?.dkd_insurance_uri_value || dkd_form_value?.dkd_insurance_url_value, dkd_user_id_value, dkd_kind_value: 'insurance' }),
    dkd_src_certificate_url_value: await dkd_upload_logistics_document_safe_value({ dkd_image_uri_value: dkd_form_value?.dkd_src_certificate_uri_value || dkd_form_value?.dkd_src_certificate_url_value, dkd_user_id_value, dkd_kind_value: 'src-certificate' }),
    dkd_tax_certificate_url_value: await dkd_upload_logistics_document_safe_value({ dkd_image_uri_value: dkd_form_value?.dkd_tax_certificate_uri_value || dkd_form_value?.dkd_tax_certificate_url_value, dkd_user_id_value, dkd_kind_value: 'tax-certificate' }),
    dkd_authorization_certificate_url_value: await dkd_upload_logistics_document_safe_value({ dkd_image_uri_value: dkd_form_value?.dkd_authorization_certificate_uri_value || dkd_form_value?.dkd_authorization_certificate_url_value, dkd_user_id_value, dkd_kind_value: 'authorization-certificate' }),
  };
}

function dkd_application_payload_value(dkd_user_id_value, dkd_form_value) {
  return {
    user_id: dkd_user_id_value,
    dkd_application_type: 'logistics',
    dkd_status: 'pending',
    dkd_first_name: dkd_string_value(dkd_form_value?.dkd_first_name_value),
    dkd_last_name: dkd_string_value(dkd_form_value?.dkd_last_name_value),
    dkd_company_name: dkd_string_value(dkd_form_value?.dkd_company_name_value),
    dkd_national_id: dkd_string_value(dkd_form_value?.dkd_national_id_value).replace(/\D/g, '').slice(0, 11),
    dkd_tax_no: dkd_string_value(dkd_form_value?.dkd_tax_no_value),
    dkd_phone_text: dkd_string_value(dkd_form_value?.dkd_phone_text_value),
    dkd_email_text: dkd_string_value(dkd_form_value?.dkd_email_text_value),
    dkd_city: dkd_string_value(dkd_form_value?.dkd_city_value, 'Ankara'),
    dkd_district: dkd_string_value(dkd_form_value?.dkd_district_value),
    dkd_operation_radius_km: dkd_number_value(dkd_form_value?.dkd_operation_radius_km_value, 25),
    dkd_vehicle_type: dkd_string_value(dkd_form_value?.dkd_vehicle_type_value, 'panelvan'),
    dkd_vehicle_plate: dkd_string_value(dkd_form_value?.dkd_vehicle_plate_value).toUpperCase(),
    dkd_vehicle_capacity_kg: dkd_number_value(dkd_form_value?.dkd_vehicle_capacity_kg_value, 500),
    dkd_vehicle_volume_m3: dkd_number_value(dkd_form_value?.dkd_vehicle_volume_m3_value, 3),
    dkd_fleet_count: dkd_number_value(dkd_form_value?.dkd_fleet_count_value, 1),
    dkd_service_tags: dkd_string_value(dkd_form_value?.dkd_service_tags_value),
    dkd_experience_text: dkd_string_value(dkd_form_value?.dkd_experience_text_value),
    dkd_address_text: dkd_string_value(dkd_form_value?.dkd_address_text_value),
    dkd_reference_text: dkd_string_value(dkd_form_value?.dkd_reference_text_value),
    dkd_document_note: dkd_string_value(dkd_form_value?.dkd_document_note_value),
    dkd_payload: { ...(dkd_form_value || {}), dkd_documents_value: dkd_form_value?.dkd_documents_value || {} },
    dkd_created_at: dkd_now_iso_value(),
    dkd_updated_at: dkd_now_iso_value(),
  };
}

export function dkd_default_logistics_application_value(dkd_profile_value = {}) {
  const dkd_meta_value = dkd_profile_value?.dkd_logistics_profile_meta || {};
  return {
    dkd_first_name_value: dkd_string_value(dkd_meta_value?.dkd_first_name || dkd_meta_value?.first_name),
    dkd_last_name_value: dkd_string_value(dkd_meta_value?.dkd_last_name || dkd_meta_value?.last_name),
    dkd_company_name_value: dkd_string_value(dkd_meta_value?.dkd_company_name),
    dkd_national_id_value: dkd_string_value(dkd_meta_value?.dkd_national_id || dkd_meta_value?.national_id),
    dkd_tax_no_value: dkd_string_value(dkd_meta_value?.dkd_tax_no),
    dkd_phone_text_value: dkd_string_value(dkd_meta_value?.dkd_phone_text || dkd_meta_value?.phone),
    dkd_email_text_value: dkd_string_value(dkd_meta_value?.dkd_email_text || dkd_meta_value?.email),
    dkd_country_value: dkd_string_value(dkd_meta_value?.dkd_country_value || dkd_meta_value?.dkd_country || dkd_profile_value?.dkd_country || dkd_profile_value?.country, 'Türkiye'),
    dkd_city_value: dkd_string_value(dkd_meta_value?.dkd_city || dkd_profile_value?.dkd_city || dkd_profile_value?.courier_city, 'Ankara'),
    dkd_district_value: dkd_string_value(dkd_meta_value?.dkd_district || dkd_profile_value?.dkd_region || dkd_profile_value?.courier_zone),
    dkd_operation_radius_km_value: String(dkd_meta_value?.dkd_operation_radius_km || '25'),
    dkd_vehicle_type_value: dkd_string_value(dkd_meta_value?.dkd_vehicle_type, 'panelvan'),
    dkd_vehicle_plate_value: dkd_string_value(dkd_meta_value?.dkd_vehicle_plate),
    dkd_vehicle_capacity_kg_value: String(dkd_meta_value?.dkd_vehicle_capacity_kg || '500'),
    dkd_vehicle_volume_m3_value: String(dkd_meta_value?.dkd_vehicle_volume_m3 || '3'),
    dkd_fleet_count_value: String(dkd_meta_value?.dkd_fleet_count || '1'),
    dkd_service_tags_value: dkd_string_value(dkd_meta_value?.dkd_service_tags, 'Evden eve, parça yük, işletme sevkiyatı'),
    dkd_experience_text_value: dkd_string_value(dkd_meta_value?.dkd_experience_text),
    dkd_address_text_value: dkd_string_value(dkd_meta_value?.dkd_address_text),
    dkd_reference_text_value: dkd_string_value(dkd_meta_value?.dkd_reference_text),
    dkd_document_note_value: dkd_string_value(dkd_meta_value?.dkd_document_note),
    dkd_identity_front_uri_value: '',
    dkd_identity_back_uri_value: '',
    dkd_selfie_uri_value: '',
    dkd_driver_license_uri_value: '',
    dkd_vehicle_license_uri_value: '',
    dkd_insurance_uri_value: '',
    dkd_src_certificate_uri_value: '',
    dkd_tax_certificate_uri_value: '',
    dkd_authorization_certificate_uri_value: '',
    dkd_identity_front_url_value: dkd_string_value(dkd_meta_value?.dkd_documents_value?.dkd_identity_front_url_value || dkd_meta_value?.dkd_identity_front_url_value),
    dkd_identity_back_url_value: dkd_string_value(dkd_meta_value?.dkd_documents_value?.dkd_identity_back_url_value || dkd_meta_value?.dkd_identity_back_url_value),
    dkd_selfie_url_value: dkd_string_value(dkd_meta_value?.dkd_documents_value?.dkd_selfie_url_value || dkd_meta_value?.dkd_selfie_url_value),
    dkd_driver_license_url_value: dkd_string_value(dkd_meta_value?.dkd_documents_value?.dkd_driver_license_url_value || dkd_meta_value?.dkd_driver_license_url_value),
    dkd_vehicle_license_url_value: dkd_string_value(dkd_meta_value?.dkd_documents_value?.dkd_vehicle_license_url_value || dkd_meta_value?.dkd_vehicle_license_url_value),
    dkd_insurance_url_value: dkd_string_value(dkd_meta_value?.dkd_documents_value?.dkd_insurance_url_value || dkd_meta_value?.dkd_insurance_url_value),
    dkd_src_certificate_url_value: dkd_string_value(dkd_meta_value?.dkd_documents_value?.dkd_src_certificate_url_value || dkd_meta_value?.dkd_src_certificate_url_value),
    dkd_tax_certificate_url_value: dkd_string_value(dkd_meta_value?.dkd_documents_value?.dkd_tax_certificate_url_value || dkd_meta_value?.dkd_tax_certificate_url_value),
    dkd_authorization_certificate_url_value: dkd_string_value(dkd_meta_value?.dkd_documents_value?.dkd_authorization_certificate_url_value || dkd_meta_value?.dkd_authorization_certificate_url_value),
  };
}

export function dkd_logistics_application_ready_value(dkd_form_value) {
  return !!(
    dkd_string_value(dkd_form_value?.dkd_first_name_value)
    && dkd_string_value(dkd_form_value?.dkd_last_name_value)
    && dkd_string_value(dkd_form_value?.dkd_phone_text_value).length >= 10
    && dkd_string_value(dkd_form_value?.dkd_city_value)
    && dkd_string_value(dkd_form_value?.dkd_district_value)
    && dkd_string_value(dkd_form_value?.dkd_vehicle_type_value)
    && dkd_string_value(dkd_form_value?.dkd_vehicle_plate_value)
    && dkd_number_value(dkd_form_value?.dkd_vehicle_capacity_kg_value, 0) > 0
    && dkd_number_value(dkd_form_value?.dkd_operation_radius_km_value, 0) > 0
    && dkd_string_value(dkd_form_value?.dkd_identity_front_uri_value || dkd_form_value?.dkd_identity_front_url_value)
    && dkd_string_value(dkd_form_value?.dkd_vehicle_license_uri_value || dkd_form_value?.dkd_vehicle_license_url_value)
  );
}

export function dkd_logistics_status_label_value(dkd_status_value) {
  const dkd_key_value = dkd_string_value(dkd_status_value, 'none').toLowerCase();
  if (dkd_key_value === 'approved') return 'Onaylandı';
  if (dkd_key_value === 'rejected') return 'Reddedildi';
  if (dkd_key_value === 'pending') return 'İncelemede';
  return 'Başvuru Yok';
}

export function dkd_is_logistics_approved_value(dkd_profile_value, dkd_application_value) {
  return String(dkd_profile_value?.dkd_logistics_status || dkd_profile_value?.logistics_status || dkd_application_value?.dkd_status || dkd_application_value?.status || '').toLowerCase() === 'approved';
}

export async function dkd_fetch_my_logistics_application_value({ dkd_user_id_value, dkd_profile_value }) {
  if (!dkd_user_id_value) return { data: null, error: null };
  try {
    const dkd_remote_result_value = await supabase
      .from('dkd_logistics_applications')
      .select('*')
      .eq('user_id', dkd_user_id_value)
      .maybeSingle();
    if (!dkd_remote_result_value?.error) return { data: dkd_remote_result_value?.data || null, error: null };
    if (!dkd_is_missing_relation_error_value(dkd_remote_result_value.error)) throw dkd_remote_result_value.error;
  } catch (dkd_error_value) {
    if (!dkd_is_missing_relation_error_value(dkd_error_value)) return { data: null, error: dkd_error_value };
  }
  const dkd_local_state_value = await dkd_read_local_state_value();
  const dkd_local_application_value = dkd_local_state_value.dkd_applications_value.find((dkd_application_value) => String(dkd_application_value?.user_id || '') === String(dkd_user_id_value));
  if (dkd_local_application_value) return { data: dkd_local_application_value, error: null };
  if (dkd_profile_value?.dkd_logistics_status) {
    return {
      data: {
        id: `profile_${dkd_user_id_value}`,
        user_id: dkd_user_id_value,
        dkd_status: dkd_profile_value.dkd_logistics_status,
        dkd_payload: dkd_profile_value?.dkd_logistics_profile_meta || {},
      },
      error: null,
    };
  }
  return { data: null, error: null };
}

export async function dkd_submit_logistics_application_value({ dkd_user_id_value, dkd_form_value }) {
  if (!dkd_user_id_value) throw new Error('user_required');
  if (!dkd_logistics_application_ready_value(dkd_form_value)) throw new Error('application_required_fields_missing');
  const dkd_document_payload_value = await dkd_logistics_documents_payload_value(dkd_user_id_value, dkd_form_value);
  const dkd_form_with_documents_value = { ...dkd_form_value, dkd_documents_value: dkd_document_payload_value };
  const dkd_payload_value = dkd_application_payload_value(dkd_user_id_value, dkd_form_with_documents_value);

  try {
    await supabase.from('dkd_profiles').upsert({ user_id: dkd_user_id_value }, { onConflict: 'user_id' });
    const dkd_application_result_value = await supabase
      .from('dkd_logistics_applications')
      .upsert(dkd_payload_value, { onConflict: 'user_id' })
      .select('*')
      .maybeSingle();
    const dkd_profile_result_value = await supabase
      .from('dkd_profiles')
      .update({
        dkd_logistics_status: 'pending',
        dkd_logistics_profile_meta: dkd_payload_value.dkd_payload,
      })
      .eq('user_id', dkd_user_id_value);

    if (dkd_application_result_value?.error && !dkd_is_missing_relation_error_value(dkd_application_result_value.error)) throw dkd_application_result_value.error;
    if (dkd_profile_result_value?.error && !dkd_is_missing_relation_error_value(dkd_profile_result_value.error)) throw dkd_profile_result_value.error;
    if (!dkd_application_result_value?.error) return { data: dkd_application_result_value?.data || dkd_payload_value, error: null };
  } catch (dkd_error_value) {
    if (!dkd_is_missing_relation_error_value(dkd_error_value)) return { data: null, error: dkd_error_value };
  }

  const dkd_local_state_value = await dkd_read_local_state_value();
  const dkd_without_old_value = dkd_local_state_value.dkd_applications_value.filter((dkd_application_value) => String(dkd_application_value?.user_id || '') !== String(dkd_user_id_value));
  const dkd_local_application_value = {
    ...dkd_payload_value,
    id: dkd_local_id_value('dkd_logistics_application'),
    dkd_local_only: true,
  };
  await dkd_write_local_state_value({
    ...dkd_local_state_value,
    dkd_applications_value: [dkd_local_application_value, ...dkd_without_old_value],
  });
  return { data: dkd_local_application_value, error: null };
}

export function dkd_default_logistics_job_value(dkd_profile_value = {}) {
  return {
    dkd_customer_name_value: dkd_string_value(dkd_profile_value?.nickname || dkd_profile_value?.display_name, ''),
    dkd_customer_phone_value: '',
    dkd_pickup_address_value: '',
    dkd_dropoff_address_value: '',
    dkd_pickup_floor_value: '0',
    dkd_dropoff_floor_value: '0',
    dkd_has_elevator_value: 'Evet',
    dkd_cargo_type_value: 'Ev eşyası / parça yük',
    dkd_weight_kg_value: '50',
    dkd_volume_m3_value: '2',
    dkd_helper_count_value: '1',
    dkd_vehicle_need_value: 'Panelvan / kamyonet',
    dkd_budget_min_tl_value: '750',
    dkd_budget_max_tl_value: '1500',
    dkd_scheduled_at_value: 'Bugün / uygun saat',
    dkd_note_value: '',
  };
}

function dkd_job_payload_value(dkd_user_id_value, dkd_form_value) {
  return {
    customer_user_id: dkd_user_id_value,
    dkd_status: 'open',
    dkd_customer_name: dkd_string_value(dkd_form_value?.dkd_customer_name_value),
    dkd_customer_phone: dkd_string_value(dkd_form_value?.dkd_customer_phone_value),
    dkd_pickup_address: dkd_string_value(dkd_form_value?.dkd_pickup_address_value),
    dkd_dropoff_address: dkd_string_value(dkd_form_value?.dkd_dropoff_address_value),
    dkd_pickup_floor: dkd_string_value(dkd_form_value?.dkd_pickup_floor_value),
    dkd_dropoff_floor: dkd_string_value(dkd_form_value?.dkd_dropoff_floor_value),
    dkd_has_elevator: dkd_string_value(dkd_form_value?.dkd_has_elevator_value),
    dkd_cargo_type: dkd_string_value(dkd_form_value?.dkd_cargo_type_value),
    dkd_weight_kg: dkd_number_value(dkd_form_value?.dkd_weight_kg_value, 0),
    dkd_volume_m3: dkd_number_value(dkd_form_value?.dkd_volume_m3_value, 0),
    dkd_helper_count: dkd_number_value(dkd_form_value?.dkd_helper_count_value, 0),
    dkd_vehicle_need: dkd_string_value(dkd_form_value?.dkd_vehicle_need_value),
    dkd_budget_min_tl: dkd_number_value(dkd_form_value?.dkd_budget_min_tl_value, 0),
    dkd_budget_max_tl: dkd_number_value(dkd_form_value?.dkd_budget_max_tl_value, 0),
    dkd_scheduled_at: dkd_string_value(dkd_form_value?.dkd_scheduled_at_value),
    dkd_note: dkd_string_value(dkd_form_value?.dkd_note_value),
    dkd_created_at: dkd_now_iso_value(),
    dkd_updated_at: dkd_now_iso_value(),
  };
}

export function dkd_logistics_job_ready_value(dkd_form_value) {
  return !!(
    dkd_string_value(dkd_form_value?.dkd_customer_name_value)
    && dkd_string_value(dkd_form_value?.dkd_customer_phone_value).length >= 10
    && dkd_string_value(dkd_form_value?.dkd_pickup_address_value)
    && dkd_string_value(dkd_form_value?.dkd_dropoff_address_value)
    && dkd_string_value(dkd_form_value?.dkd_cargo_type_value)
  );
}

export async function dkd_create_logistics_job_value({ dkd_user_id_value, dkd_form_value }) {
  if (!dkd_user_id_value) throw new Error('user_required');
  if (!dkd_logistics_job_ready_value(dkd_form_value)) throw new Error('job_required_fields_missing');
  const dkd_payload_value = dkd_job_payload_value(dkd_user_id_value, dkd_form_value);
  try {
    const dkd_remote_result_value = await supabase
      .from('dkd_logistics_jobs')
      .insert(dkd_payload_value)
      .select('*')
      .maybeSingle();
    if (!dkd_remote_result_value?.error) return { data: dkd_remote_result_value?.data || dkd_payload_value, error: null };
    if (!dkd_is_missing_relation_error_value(dkd_remote_result_value.error)) throw dkd_remote_result_value.error;
  } catch (dkd_error_value) {
    if (!dkd_is_missing_relation_error_value(dkd_error_value)) return { data: null, error: dkd_error_value };
  }
  const dkd_local_state_value = await dkd_read_local_state_value();
  const dkd_local_job_value = {
    ...dkd_payload_value,
    id: dkd_local_id_value('dkd_logistics_job'),
    dkd_local_only: true,
  };
  await dkd_write_local_state_value({
    ...dkd_local_state_value,
    dkd_jobs_value: [dkd_local_job_value, ...dkd_local_state_value.dkd_jobs_value],
  });
  return { data: dkd_local_job_value, error: null };
}

async function dkd_fetch_remote_logistics_jobs_value() {
  const dkd_jobs_result_value = await supabase
    .from('dkd_logistics_jobs')
    .select('*')
    .order('dkd_created_at', { ascending: false })
    .limit(40);
  if (dkd_jobs_result_value?.error) throw dkd_jobs_result_value.error;
  const dkd_offers_result_value = await supabase
    .from('dkd_logistics_offers')
    .select('*')
    .order('dkd_created_at', { ascending: false })
    .limit(120);
  if (dkd_offers_result_value?.error) throw dkd_offers_result_value.error;
  const dkd_messages_result_value = await supabase
    .from('dkd_logistics_messages')
    .select('*')
    .order('dkd_created_at', { ascending: true })
    .limit(120);
  if (dkd_messages_result_value?.error) throw dkd_messages_result_value.error;
  return {
    dkd_jobs_value: Array.isArray(dkd_jobs_result_value?.data) ? dkd_jobs_result_value.data : [],
    dkd_offers_value: Array.isArray(dkd_offers_result_value?.data) ? dkd_offers_result_value.data : [],
    dkd_messages_value: Array.isArray(dkd_messages_result_value?.data) ? dkd_messages_result_value.data : [],
  };
}

export async function dkd_fetch_logistics_jobs_value() {
  try {
    const dkd_remote_value = await dkd_fetch_remote_logistics_jobs_value();
    return { data: dkd_remote_value, error: null };
  } catch (dkd_error_value) {
    if (!dkd_is_missing_relation_error_value(dkd_error_value)) return { data: null, error: dkd_error_value };
  }
  const dkd_local_state_value = await dkd_read_local_state_value();
  return {
    data: {
      dkd_jobs_value: dkd_local_state_value.dkd_jobs_value,
      dkd_offers_value: dkd_local_state_value.dkd_offers_value,
      dkd_messages_value: dkd_local_state_value.dkd_messages_value,
    },
    error: null,
  };
}

export async function dkd_submit_logistics_offer_value({ dkd_user_id_value, dkd_job_id_value, dkd_price_tl_value, dkd_note_value, dkd_profile_value }) {
  if (!dkd_user_id_value) throw new Error('user_required');
  if (!dkd_job_id_value) throw new Error('job_required');
  const dkd_offer_value = {
    dkd_job_id: dkd_job_id_value,
    transporter_user_id: dkd_user_id_value,
    dkd_transporter_name: dkd_string_value(dkd_profile_value?.nickname || dkd_profile_value?.display_name, 'Nakliyeci'),
    dkd_price_tl: dkd_number_value(dkd_price_tl_value, 0),
    dkd_note: dkd_string_value(dkd_note_value),
    dkd_status: 'sent',
    dkd_created_at: dkd_now_iso_value(),
    dkd_updated_at: dkd_now_iso_value(),
  };
  if (dkd_offer_value.dkd_price_tl <= 0) throw new Error('offer_price_required');
  try {
    const dkd_remote_result_value = await supabase
      .from('dkd_logistics_offers')
      .insert(dkd_offer_value)
      .select('*')
      .maybeSingle();
    if (!dkd_remote_result_value?.error) return { data: dkd_remote_result_value?.data || dkd_offer_value, error: null };
    if (!dkd_is_missing_relation_error_value(dkd_remote_result_value.error)) throw dkd_remote_result_value.error;
  } catch (dkd_error_value) {
    if (!dkd_is_missing_relation_error_value(dkd_error_value)) return { data: null, error: dkd_error_value };
  }
  const dkd_local_state_value = await dkd_read_local_state_value();
  const dkd_local_offer_value = { ...dkd_offer_value, id: dkd_local_id_value('dkd_logistics_offer'), dkd_local_only: true };
  await dkd_write_local_state_value({
    ...dkd_local_state_value,
    dkd_offers_value: [dkd_local_offer_value, ...dkd_local_state_value.dkd_offers_value],
  });
  return { data: dkd_local_offer_value, error: null };
}

export async function dkd_add_logistics_message_value({ dkd_user_id_value, dkd_job_id_value, dkd_message_text_value, dkd_profile_value }) {
  if (!dkd_user_id_value) throw new Error('user_required');
  if (!dkd_job_id_value) throw new Error('job_required');
  const dkd_message_value = {
    dkd_job_id: dkd_job_id_value,
    dkd_sender_user_id: dkd_user_id_value,
    dkd_sender_name: dkd_string_value(dkd_profile_value?.nickname || dkd_profile_value?.display_name, 'Lootonia'),
    dkd_message_text: dkd_string_value(dkd_message_text_value),
    dkd_created_at: dkd_now_iso_value(),
  };
  if (!dkd_message_value.dkd_message_text) throw new Error('message_required');
  try {
    const dkd_remote_result_value = await supabase
      .from('dkd_logistics_messages')
      .insert(dkd_message_value)
      .select('*')
      .maybeSingle();
    if (!dkd_remote_result_value?.error) return { data: dkd_remote_result_value?.data || dkd_message_value, error: null };
    if (!dkd_is_missing_relation_error_value(dkd_remote_result_value.error)) throw dkd_remote_result_value.error;
  } catch (dkd_error_value) {
    if (!dkd_is_missing_relation_error_value(dkd_error_value)) return { data: null, error: dkd_error_value };
  }
  const dkd_local_state_value = await dkd_read_local_state_value();
  const dkd_local_message_value = { ...dkd_message_value, id: dkd_local_id_value('dkd_logistics_message'), dkd_local_only: true };
  await dkd_write_local_state_value({
    ...dkd_local_state_value,
    dkd_messages_value: [...dkd_local_state_value.dkd_messages_value, dkd_local_message_value],
  });
  return { data: dkd_local_message_value, error: null };
}

export async function dkd_fetch_admin_applications_value() {
  let dkd_courier_applications_value = [];
  let dkd_logistics_applications_value = [];
  try {
    const dkd_courier_result_value = await supabase
      .from('dkd_courier_license_applications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(80);
    if (!dkd_courier_result_value?.error) dkd_courier_applications_value = Array.isArray(dkd_courier_result_value?.data) ? dkd_courier_result_value.data : [];
  } catch {}
  try {
    const dkd_logistics_result_value = await supabase
      .from('dkd_logistics_applications')
      .select('*')
      .order('dkd_created_at', { ascending: false })
      .limit(80);
    if (!dkd_logistics_result_value?.error) dkd_logistics_applications_value = Array.isArray(dkd_logistics_result_value?.data) ? dkd_logistics_result_value.data : [];
  } catch (dkd_error_value) {
    if (!dkd_is_missing_relation_error_value(dkd_error_value)) return { data: null, error: dkd_error_value };
  }
  if (!dkd_logistics_applications_value.length) {
    const dkd_local_state_value = await dkd_read_local_state_value();
    dkd_logistics_applications_value = dkd_local_state_value.dkd_applications_value;
  }
  return {
    data: {
      dkd_courier_applications_value,
      dkd_logistics_applications_value,
    },
    error: null,
  };
}

export async function dkd_update_application_status_value({ dkd_kind_value, dkd_application_id_value, dkd_user_id_value, dkd_status_value, dkd_admin_note_value }) {
  const dkd_kind_key_value = dkd_string_value(dkd_kind_value).toLowerCase();
  const dkd_status_key_value = dkd_string_value(dkd_status_value, 'pending').toLowerCase();
  const dkd_user_key_value = dkd_string_value(dkd_user_id_value);
  if (!dkd_application_id_value && !dkd_user_key_value) throw new Error('application_required');

  if (dkd_kind_key_value === 'courier') {
    const dkd_profile_patch_value = { courier_status: dkd_status_key_value };
    try {
      const dkd_application_query_value = supabase
        .from('dkd_courier_license_applications')
        .update({ status: dkd_status_key_value, admin_note: dkd_admin_note_value || null });
      if (dkd_application_id_value) await dkd_application_query_value.eq('id', dkd_application_id_value);
      else await dkd_application_query_value.eq('user_id', dkd_user_key_value);
      if (dkd_user_key_value) await supabase.from('dkd_profiles').update(dkd_profile_patch_value).eq('user_id', dkd_user_key_value);
      return { data: { ok: true }, error: null };
    } catch (dkd_error_value) {
      return { data: null, error: dkd_error_value };
    }
  }

  try {
    const dkd_application_query_value = supabase
      .from('dkd_logistics_applications')
      .update({ dkd_status: dkd_status_key_value, dkd_admin_note: dkd_admin_note_value || null, dkd_updated_at: dkd_now_iso_value() });
    if (dkd_application_id_value) await dkd_application_query_value.eq('id', dkd_application_id_value);
    else await dkd_application_query_value.eq('user_id', dkd_user_key_value);
    if (dkd_user_key_value) {
      await supabase
        .from('dkd_profiles')
        .update({ dkd_logistics_status: dkd_status_key_value })
        .eq('user_id', dkd_user_key_value);
    }
    return { data: { ok: true }, error: null };
  } catch (dkd_error_value) {
    if (!dkd_is_missing_relation_error_value(dkd_error_value)) return { data: null, error: dkd_error_value };
  }

  const dkd_local_state_value = await dkd_read_local_state_value();
  const dkd_next_applications_value = dkd_local_state_value.dkd_applications_value.map((dkd_application_value) => {
    const dkd_id_match_value = dkd_application_id_value && String(dkd_application_value?.id || '') === String(dkd_application_id_value);
    const dkd_user_match_value = dkd_user_key_value && String(dkd_application_value?.user_id || '') === dkd_user_key_value;
    if (!dkd_id_match_value && !dkd_user_match_value) return dkd_application_value;
    return {
      ...dkd_application_value,
      dkd_status: dkd_status_key_value,
      dkd_admin_note: dkd_admin_note_value || '',
      dkd_updated_at: dkd_now_iso_value(),
    };
  });
  await dkd_write_local_state_value({
    ...dkd_local_state_value,
    dkd_applications_value: dkd_next_applications_value,
  });
  return { data: { ok: true }, error: null };
}
