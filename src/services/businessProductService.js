import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../lib/supabase';

const BUSINESS_PRODUCT_BUCKET = 'lootonia-business-product-art';

function slugify(value) {
  return String(value || 'product')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'product';
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
  if (!input) throw new Error('product_art_uri_missing');

  try {
    return await FileSystem.readAsStringAsync(input, { encoding: FileSystem.EncodingType.Base64 });
  } catch (directErr) {
    const { ext } = inferMimeFromUri(input);
    const tempUri = `${FileSystem.cacheDirectory || ''}lootonia-product-upload-${Date.now()}.${ext}`;
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
  if (!input) throw new Error('product_art_uri_missing');
  if (/^https?:\/\//.test(input)) return input;

  try {
    const out = await ImageManipulator.manipulateAsync(
      input,
      [{ resize: { width: 1280 } }],
      { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
    );
    return out?.uri || input;
  } catch {
    return input;
  }
}

export function isLocalAssetUri(value) {
  const raw = String(value || '').trim();
  if (!raw) return false;
  return !/^https?:\/\//.test(raw);
}

export async function uploadBusinessProductArt({ imageUri, businessSlug, productName }) {
  const cleanUri = String(imageUri || '').trim();
  if (!cleanUri) throw new Error('product_art_uri_missing');
  const uploadUri = await normalizeUploadUri(cleanUri);
  const { ext, mime } = inferMimeFromUri(uploadUri);
  const base64 = await readBase64FromUri(uploadUri);
  const arrayBuffer = base64ToArrayBuffer(base64);
  const folder = slugify(businessSlug || 'business');
  const stem = slugify(productName || `product-${Date.now()}`);
  const fileName = `${Date.now()}-${stem}.${ext}`;
  const path = `business-products/${folder}/${fileName}`;

  const { error } = await supabase.storage
    .from(BUSINESS_PRODUCT_BUCKET)
    .upload(path, arrayBuffer, { contentType: mime, upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from(BUSINESS_PRODUCT_BUCKET).getPublicUrl(path);
  return {
    data: {
      path,
      publicUrl: data?.publicUrl || '',
    },
    error: null,
  };
}

export async function fetchMerchantBusinessProducts(businessId) {
  if (!businessId) return [];
  const { data, error } = await supabase
    .from('dkd_business_products')
    .select('*')
    .eq('business_id', businessId)
    .order('sort_order', { ascending: true })
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function upsertMerchantBusinessProduct(input) {
  const dkd_product_key = String(input?.id || '').trim() || null;
  const payload = {
    dkd_product_id: dkd_product_key,
    dkd_business_id: input?.businessId,
    dkd_title: String(input?.title || '').trim(),
    dkd_description: String(input?.description || '').trim() || null,
    dkd_category: String(input?.category || '').trim() || 'genel',
    dkd_image_url: String(input?.imageUrl || '').trim() || null,
    dkd_price_token: Math.max(0, Number(input?.priceToken || 0) || 0),
    dkd_price_cash: input?.priceCash == null || input?.priceCash === '' ? null : Number(input.priceCash),
    dkd_currency_code: String(input?.currencyCode || 'TRY').trim().toUpperCase() || 'TRY',
    dkd_stock: Math.max(0, Number(input?.stock || 0) || 0),
    dkd_sort_order: Math.max(0, Number(input?.sortOrder || 0) || 0),
    dkd_is_active: input?.isActive !== false,
    dkd_delivery_fee_tl: Math.max(0, Number(input?.deliveryFeeTl || 0) || 0),
    dkd_meta: input?.meta || {},
  };

  let { data, error } = await supabase.rpc('dkd_business_product_upsert_dkd', payload);
  if (!error) return data;

  const dkd_numeric_product_id = /^\d+$/.test(String(dkd_product_key || '')) ? Number(dkd_product_key) : null;

  ({ data, error } = await supabase.rpc('dkd_business_product_upsert', {
    dkd_param_product_id: dkd_numeric_product_id,
    dkd_param_business_id: payload.dkd_business_id,
    dkd_param_title: payload.dkd_title,
    dkd_param_description: payload.dkd_description,
    dkd_param_category: payload.dkd_category,
    dkd_param_image_url: payload.dkd_image_url,
    dkd_param_price_token: payload.dkd_price_token,
    dkd_param_price_cash: payload.dkd_price_cash,
    dkd_param_currency_code: payload.dkd_currency_code,
    dkd_param_stock: payload.dkd_stock,
    dkd_param_sort_order: payload.dkd_sort_order,
    dkd_param_is_active: payload.dkd_is_active,
    dkd_param_delivery_fee_tl: payload.dkd_delivery_fee_tl,
    dkd_param_meta: payload.dkd_meta,
  }));

  if (error) throw error;
  return data;
}

export async function deleteMerchantBusinessProduct(productId) {
  const dkd_product_key = String(productId || '').trim();

  let { data, error } = await supabase.rpc('dkd_business_product_delete_dkd', {
    dkd_param_product_key: dkd_product_key,
  });
  if (!error) return data;

  const dkd_numeric_product_id = /^\d+$/.test(dkd_product_key) ? Number(dkd_product_key) : null;
  if (dkd_numeric_product_id == null) throw error;

  ({ data, error } = await supabase.rpc('dkd_business_product_delete', {
    dkd_param_product_id: dkd_numeric_product_id,
  }));

  if (error) throw error;
  return data;
}

function dkd_normalize_catalog_rows(dkd_rows) {
  return (Array.isArray(dkd_rows) ? dkd_rows : []).map((row) => ({
    id: row?.id,
    business_id: row?.business_id,
    title: row?.title,
    description: row?.description,
    category: row?.category,
    image_url: row?.image_url,
    price_token: Number(row?.price_token || 0),
    price_cash: row?.price_cash,
    currency_code: row?.currency_code || 'TRY',
    stock: Number(row?.stock || 0),
    business_name: row?.business_name || row?.dkd_businesses?.name || 'İşletme',
    business_category: row?.business_category || row?.dkd_businesses?.category || null,
    business_address_text: row?.business_address_text || row?.dkd_businesses?.address_text || '',
    business_lat: row?.business_lat == null ? (row?.dkd_businesses?.lat == null ? null : Number(row.dkd_businesses.lat)) : Number(row.business_lat),
    business_lng: row?.business_lng == null ? (row?.dkd_businesses?.lng == null ? null : Number(row.dkd_businesses.lng)) : Number(row.business_lng),
    delivery_fee_tl: Number(row?.delivery_fee_tl || row?.fee_tl || 0),
    product_price_tl: row?.product_price_tl == null ? (row?.price_cash == null ? null : Number(row.price_cash)) : Number(row.product_price_tl),
    product_price_currency: row?.product_price_currency || row?.currency_code || 'TRY',
  }));
}

export async function fetchBusinessMarketCatalog() {
  const dkd_rpc_res = await supabase.rpc('dkd_business_market_catalog');
  if (!dkd_rpc_res?.error) {
    const dkd_rpc_rows = dkd_normalize_catalog_rows(dkd_rpc_res.data);
    if (dkd_rpc_rows.length) return { data: dkd_rpc_rows, error: null };
  }

  const { data, error } = await supabase
    .from('dkd_business_products')
    .select('id, business_id, title, description, category, image_url, price_token, price_cash, currency_code, stock, is_active, sort_order, delivery_fee_tl, dkd_businesses(name, category, address_text, lat, lng)')
    .eq('is_active', true)
    .gt('stock', 0)
    .order('sort_order', { ascending: true })
    .order('updated_at', { ascending: false });

  if (error) return { data: [], error };
  return { data: dkd_normalize_catalog_rows(data), error: null };
}

export async function buyBusinessProductWithToken(input) {
  const dkd_product_key = (typeof input === 'string' ? String(input || '').trim() : String(input?.token || input?.id || '').trim()).replace(/^merchant_product:/, '');
  const dkd_numeric_key = /^\d+$/.test(dkd_product_key) ? Number(dkd_product_key) : null;
  const dkd_address_text = String(input?.deliveryAddressText || '').trim();
  const dkd_delivery_note = String(input?.deliveryNote || '').trim();
  const dkd_delivery_lat = input?.deliveryLat == null ? null : Number(input.deliveryLat);
  const dkd_delivery_lng = input?.deliveryLng == null ? null : Number(input.deliveryLng);

  let dkd_res = await supabase.rpc('dkd_business_product_buy_with_token_dkd', {
    dkd_param_product_key: dkd_product_key || null,
    dkd_param_quantity: 1,
    dkd_param_delivery_address_text: dkd_address_text || null,
    dkd_param_delivery_note: dkd_delivery_note || null,
    dkd_param_delivery_lat: Number.isFinite(dkd_delivery_lat) ? dkd_delivery_lat : null,
    dkd_param_delivery_lng: Number.isFinite(dkd_delivery_lng) ? dkd_delivery_lng : null,
  });
  if (!dkd_res?.error) return dkd_res;

  if (dkd_numeric_key != null) {
    dkd_res = await supabase.rpc('dkd_business_product_buy_with_token', {
      dkd_product_id: dkd_numeric_key,
      dkd_qty: 1,
      dkd_delivery_address_text: dkd_address_text || null,
      dkd_delivery_note: dkd_delivery_note || null,
      dkd_delivery_lat: Number.isFinite(dkd_delivery_lat) ? dkd_delivery_lat : null,
      dkd_delivery_lng: Number.isFinite(dkd_delivery_lng) ? dkd_delivery_lng : null,
    });
    if (!dkd_res?.error) return dkd_res;

    dkd_res = await supabase.rpc('dkd_business_product_buy_with_token', {
      dkd_param_product_id: dkd_numeric_key,
      dkd_param_quantity: 1,
      dkd_param_delivery_address_text: dkd_address_text || null,
      dkd_param_delivery_note: dkd_delivery_note || null,
      dkd_param_delivery_lat: Number.isFinite(dkd_delivery_lat) ? dkd_delivery_lat : null,
      dkd_param_delivery_lng: Number.isFinite(dkd_delivery_lng) ? dkd_delivery_lng : null,
    });
  }

  return dkd_res;
}
