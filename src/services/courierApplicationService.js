import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../lib/supabase';

function slugify(value) {
  return String(value || 'document')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'document';
}

function inferMimeFromUri(uri) {
  const lower = String(uri || '').toLowerCase();
  if (lower.endsWith('.png')) return { ext: 'png', mime: 'image/png' };
  if (lower.endsWith('.webp')) return { ext: 'webp', mime: 'image/webp' };
  if (lower.endsWith('.heic')) return { ext: 'heic', mime: 'image/heic' };
  return { ext: 'jpg', mime: 'image/jpeg' };
}

function base64ToArrayBuffer(base64) {
  const cleaned = String(base64 || '').replace(/\s/g, '');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let bufferLength = cleaned.length * 0.75;
  if (cleaned.endsWith('==')) bufferLength -= 2;
  else if (cleaned.endsWith('=')) bufferLength -= 1;

  const arraybuffer = new ArrayBuffer(Math.max(0, bufferLength));
  const bytes = new Uint8Array(arraybuffer);

  let dkd_payload = 0;
  for (let dkd_index_value = 0; dkd_index_value < cleaned.length; dkd_index_value += 4) {
    const enc1 = chars.indexOf(cleaned[dkd_index_value]);
    const enc2 = chars.indexOf(cleaned[dkd_index_value + 1]);
    const enc3 = cleaned[dkd_index_value + 2] === '=' ? 64 : chars.indexOf(cleaned[dkd_index_value + 2]);
    const enc4 = cleaned[dkd_index_value + 3] === '=' ? 64 : chars.indexOf(cleaned[dkd_index_value + 3]);

    const byte1 = (enc1 << 2) | (enc2 >> 4);
    bytes[dkd_payload++] = byte1;

    if (enc3 !== 64) {
      const byte2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      bytes[dkd_payload++] = byte2;
    }

    if (enc4 !== 64) {
      const byte3 = ((enc3 & 3) << 6) | enc4;
      bytes[dkd_payload++] = byte3;
    }
  }

  return arraybuffer;
}

async function readBase64FromUri(uri) {
  const input = String(uri || '').trim();
  if (!input) throw new Error('document_uri_missing');

  try {
    return await FileSystem.readAsStringAsync(input, { encoding: FileSystem.EncodingType.Base64 });
  } catch (directErr) {
    const { ext } = inferMimeFromUri(input);
    const tempUri = `${FileSystem.cacheDirectory || ''}lootonia-courier-doc-${Date.now()}.${ext}`;
    if (!tempUri) throw directErr;
    await FileSystem.copyAsync({ from: input, to: tempUri });
    try {
      return await FileSystem.readAsStringAsync(tempUri, { encoding: FileSystem.EncodingType.Base64 });
    } finally {
      try {
        await FileSystem.deleteAsync(tempUri, { idempotent: true });
      } catch {}
    }
  }
}

async function normalizeUploadUri(uri) {
  const input = String(uri || '').trim();
  if (!input) throw new Error('document_uri_missing');
  if (/^https?:\/\//.test(input)) return input;

  try {
    const out = await ImageManipulator.manipulateAsync(
      input,
      [{ resize: { width: 1600 } }],
      { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
    );
    return out?.uri || input;
  } catch {
    return input;
  }
}

export async function uploadCourierDocument({ imageUri, userId, kind }) {
  const cleanUri = String(imageUri || '').trim();
  if (!cleanUri) return '';

  const uploadUri = await normalizeUploadUri(cleanUri);
  const { ext, mime } = inferMimeFromUri(uploadUri);
  const base64 = await readBase64FromUri(uploadUri);
  const arrayBuffer = base64ToArrayBuffer(base64);
  const safeUser = slugify(userId || 'anonymous');
  const safeKind = slugify(kind || 'document');
  const fileName = `${Date.now()}-${safeKind}.${ext}`;
  const path = `courier-docs/${safeUser}/${fileName}`;

  const { error } = await supabase.storage
    .from('lootonia-courier-docs')
    .upload(path, arrayBuffer, { contentType: mime, upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from('lootonia-courier-docs').getPublicUrl(path);
  return data?.publicUrl || '';
}

async function uploadCourierDocumentSafe(input) {
  try {
    return await uploadCourierDocument(input);
  } catch {
    return String(input?.imageUri || '').trim();
  }
}

export async function submitCourierApplication({ userId, form }) {
  if (!userId) throw new Error('user_required');

  const payload = form && typeof form === 'object' ? form : {};
  const dkd_country_value = String(payload?.country || payload?.dkd_country || 'Türkiye').trim() || 'Türkiye';
  const city = String(payload?.city || payload?.dkd_city || 'Ankara');
  const zone = String(payload?.zone || payload?.dkd_region || '').trim();
  const vehicleType = String(payload?.vehicleType || 'moto');
  const firstName = String(payload?.firstName || '').trim();
  const lastName = String(payload?.lastName || '').trim();
  const nationalId = String(payload?.nationalId || '').replace(/\D/g, '').slice(0, 11);
  const phone = String(payload?.phone || '').trim();
  const email = String(payload?.email || '').trim();
  const plateNo = String(payload?.plateNo || '').trim().toUpperCase();
  const addressText = String(payload?.addressText || '').trim();
  const emergencyName = String(payload?.emergencyName || '').trim();
  const emergencyPhone = String(payload?.emergencyPhone || '').trim();

  const docs = {
    identity_front_url: await uploadCourierDocumentSafe({ imageUri: payload?.identityFrontUri, userId, kind: 'identity-front' }),
    identity_back_url: await uploadCourierDocumentSafe({ imageUri: payload?.identityBackUri, userId, kind: 'identity-back' }),
    selfie_url: await uploadCourierDocumentSafe({ imageUri: payload?.selfieUri, userId, kind: 'selfie' }),
    driver_license_url: await uploadCourierDocumentSafe({ imageUri: payload?.driverLicenseUri, userId, kind: 'driver-license' }),
    vehicle_license_url: await uploadCourierDocumentSafe({ imageUri: payload?.vehicleLicenseUri, userId, kind: 'vehicle-license' }),
    insurance_url: await uploadCourierDocumentSafe({ imageUri: payload?.insuranceUri, userId, kind: 'insurance' }),
  };

  await supabase.from('dkd_profiles').upsert({ user_id: userId }, { onConflict: 'user_id' });

  const profilePatch = {
    courier_status: 'pending',
    courier_city: city,
    courier_zone: zone,
    dkd_country: dkd_country_value,
    dkd_city: city,
    dkd_region: zone,
    courier_vehicle_type: vehicleType,
    courier_profile_meta: {
      application_version: '2026-04-29-dkd-region-online',
      dkd_country: dkd_country_value,
      first_name: firstName,
      last_name: lastName,
      national_id: nationalId,
      phone,
      email,
      plate_no: plateNo,
      address_text: addressText,
      emergency_name: emergencyName,
      emergency_phone: emergencyPhone,
      docs,
    },
  };

  const upsertPayload = {
    user_id: userId,
    status: 'pending',
    dkd_country: dkd_country_value,
    city,
    zone,
    vehicle_type: vehicleType,
    first_name: firstName,
    last_name: lastName,
    national_id: nationalId,
    phone,
    email,
    plate_no: plateNo,
    address_text: addressText,
    emergency_name: emergencyName,
    emergency_phone: emergencyPhone,
    identity_front_url: docs.identity_front_url,
    identity_back_url: docs.identity_back_url,
    selfie_url: docs.selfie_url,
    driver_license_url: docs.driver_license_url,
    vehicle_license_url: docs.vehicle_license_url,
    insurance_url: docs.insurance_url,
    payload: {
      dkd_country: dkd_country_value,
      city,
      zone,
      vehicleType,
      firstName,
      lastName,
      nationalId,
      phone,
      email,
      plateNo,
      addressText,
      emergencyName,
      emergencyPhone,
      docs,
    },
  };

  const appWrite = await supabase
    .from('dkd_courier_license_applications')
    .upsert(upsertPayload, { onConflict: 'user_id' })
    .select('id, status, city, zone, vehicle_type')
    .single();

  const profileWrite = await supabase
    .from('dkd_profiles')
    .update(profilePatch)
    .eq('user_id', userId)
    .select('user_id, courier_status, courier_city, courier_zone, courier_vehicle_type, courier_profile_meta')
    .single();

  if (profileWrite?.error) {
    const message = String(profileWrite.error?.message || '').toLowerCase();
    if (!message.includes('courier_city') && !message.includes('courier_zone') && !message.includes('courier_vehicle_type') && !message.includes('courier_profile_meta') && !message.includes('dkd_country') && !message.includes('dkd_city') && !message.includes('dkd_region')) {
      throw profileWrite.error;
    }

    const fallback = await supabase.rpc('dkd_apply_courier_license');
    if (fallback?.error) throw fallback.error;
    return {
      data: {
        status: 'pending',
        country: dkd_country_value,
        city,
        zone,
        vehicle_type: vehicleType,
        documents: docs,
      },
      error: null,
    };
  }

  if (appWrite?.error) {
    const message = String(appWrite.error?.message || '').toLowerCase();
    if (!message.includes('relation') && !message.includes('schema cache')) {
      throw appWrite.error;
    }
  }

  return {
    data: {
      ...(appWrite?.data || {}),
      ...(profileWrite?.data || {}),
      status: 'pending',
      country: dkd_country_value,
      city,
      zone,
      vehicle_type: vehicleType,
      documents: docs,
    },
    error: null,
  };
}
