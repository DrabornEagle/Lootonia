const dkd_raw_mapbox_access_token_value = String(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '').trim();
const dkd_mapbox_placeholder_pattern_value = /(SENIN|YOUR_|TOKENUN|TOKEN_HERE|MAPBOX_PUBLIC_TOKEN|BURAYA_YAZ|CHANGE_ME|EXAMPLE)/i;
const dkd_ankara_bbox_text_value = '32.35,39.55,33.25,40.15';

export const dkd_mapbox_access_token_value = dkd_raw_mapbox_access_token_value;
export const dkd_mapbox_access_token_ready_value = /^pk\.[A-Za-z0-9._-]{20,}$/.test(dkd_raw_mapbox_access_token_value)
  && !dkd_mapbox_placeholder_pattern_value.test(dkd_raw_mapbox_access_token_value);

export function dkd_mapbox_access_token_problem_text_value() {
  if (!dkd_raw_mapbox_access_token_value) return 'Mapbox public token eksik. .env içine EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN eklenmeli.';
  if (dkd_mapbox_placeholder_pattern_value.test(dkd_raw_mapbox_access_token_value)) return 'Mapbox token hâlâ örnek/placeholder görünüyor. Mapbox hesabındaki gerçek pk. public token yazılmalı.';
  if (!dkd_mapbox_access_token_ready_value) return 'Mapbox token formatı hatalı. Public token pk. ile başlamalı ve eksiksiz olmalı.';
  return '';
}

export function dkd_configure_mapbox_access_token_value(dkd_mapbox_gl_value) {
  if (!dkd_mapbox_access_token_ready_value || !dkd_mapbox_gl_value?.setAccessToken) return false;
  dkd_mapbox_gl_value.setAccessToken(dkd_raw_mapbox_access_token_value);
  return true;
}

export function dkd_number_or_null_value(dkd_raw_value) {
  const dkd_numeric_value = Number(dkd_raw_value);
  return Number.isFinite(dkd_numeric_value) ? dkd_numeric_value : null;
}

function dkd_is_valid_lat_value(dkd_lat_value) {
  return Number.isFinite(Number(dkd_lat_value)) && Math.abs(Number(dkd_lat_value)) <= 90;
}

function dkd_is_valid_lng_value(dkd_lng_value) {
  return Number.isFinite(Number(dkd_lng_value)) && Math.abs(Number(dkd_lng_value)) <= 180;
}

function dkd_round_coordinate_value(dkd_coordinate_value) {
  return Math.round(Number(dkd_coordinate_value) * 10000000) / 10000000;
}

function dkd_is_null_island_coordinate_value(dkd_lat_value, dkd_lng_value) {
  const dkd_lat_number_value = Number(dkd_lat_value);
  const dkd_lng_number_value = Number(dkd_lng_value);
  return Number.isFinite(dkd_lat_number_value)
    && Number.isFinite(dkd_lng_number_value)
    && Math.abs(dkd_lat_number_value) < 0.0001
    && Math.abs(dkd_lng_number_value) < 0.0001;
}

function dkd_is_turkiye_latitude_zone_value(dkd_lat_value) {
  const dkd_numeric_value = Number(dkd_lat_value);
  return Number.isFinite(dkd_numeric_value) && dkd_numeric_value >= 35 && dkd_numeric_value <= 43;
}

function dkd_is_turkiye_longitude_zone_value(dkd_lng_value) {
  const dkd_numeric_value = Number(dkd_lng_value);
  return Number.isFinite(dkd_numeric_value) && dkd_numeric_value >= 25 && dkd_numeric_value <= 46;
}

function dkd_should_swap_ankara_like_coordinate_value(dkd_lat_value, dkd_lng_value) {
  return dkd_is_valid_lat_value(dkd_lat_value)
    && dkd_is_valid_lng_value(dkd_lng_value)
    && !dkd_is_turkiye_latitude_zone_value(dkd_lat_value)
    && dkd_is_turkiye_longitude_zone_value(dkd_lat_value)
    && dkd_is_turkiye_latitude_zone_value(dkd_lng_value);
}

export function dkd_normalize_mapbox_lat_lng_value(dkd_lat_raw_value, dkd_lng_raw_value) {
  const dkd_lat_value = dkd_number_or_null_value(dkd_lat_raw_value);
  const dkd_lng_value = dkd_number_or_null_value(dkd_lng_raw_value);
  if (dkd_lat_value == null || dkd_lng_value == null) return null;
  if (dkd_is_null_island_coordinate_value(dkd_lat_value, dkd_lng_value)) return null;

  if (dkd_should_swap_ankara_like_coordinate_value(dkd_lat_value, dkd_lng_value)) {
    return {
      dkd_lat_value: dkd_round_coordinate_value(dkd_lng_value),
      dkd_lng_value: dkd_round_coordinate_value(dkd_lat_value),
      dkd_was_swapped_value: true,
    };
  }

  if (dkd_is_valid_lat_value(dkd_lat_value) && dkd_is_valid_lng_value(dkd_lng_value)) {
    return {
      dkd_lat_value: dkd_round_coordinate_value(dkd_lat_value),
      dkd_lng_value: dkd_round_coordinate_value(dkd_lng_value),
      dkd_was_swapped_value: false,
    };
  }

  if (dkd_is_valid_lat_value(dkd_lng_value) && dkd_is_valid_lng_value(dkd_lat_value)) {
    return {
      dkd_lat_value: dkd_round_coordinate_value(dkd_lng_value),
      dkd_lng_value: dkd_round_coordinate_value(dkd_lat_value),
      dkd_was_swapped_value: true,
    };
  }

  return null;
}

export function dkd_point_from_any_lat_lng_value(dkd_input_value) {
  if (!dkd_input_value) return null;
  if (Array.isArray(dkd_input_value) && dkd_input_value.length >= 2) {
    return dkd_point_from_lat_lng_value(dkd_input_value[1], dkd_input_value[0]);
  }
  return dkd_point_from_lat_lng_value(
    dkd_input_value.dkd_lat_value ?? dkd_input_value.latitude ?? dkd_input_value.lat,
    dkd_input_value.dkd_lng_value ?? dkd_input_value.longitude ?? dkd_input_value.lng,
  );
}

export function dkd_point_from_lat_lng_value(dkd_lat_raw_value, dkd_lng_raw_value) {
  const dkd_normalized_value = dkd_normalize_mapbox_lat_lng_value(dkd_lat_raw_value, dkd_lng_raw_value);
  if (!dkd_normalized_value) return null;
  return {
    dkd_lat_value: dkd_normalized_value.dkd_lat_value,
    dkd_lng_value: dkd_normalized_value.dkd_lng_value,
    dkd_coordinate_value: [dkd_normalized_value.dkd_lng_value, dkd_normalized_value.dkd_lat_value],
    dkd_map_view_coordinate_value: {
      latitude: dkd_normalized_value.dkd_lat_value,
      longitude: dkd_normalized_value.dkd_lng_value,
    },
    dkd_was_swapped_value: dkd_normalized_value.dkd_was_swapped_value,
  };
}

export function dkd_mapbox_geojson_line_value(dkd_coordinate_values) {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: Array.isArray(dkd_coordinate_values) ? dkd_coordinate_values : [],
    },
  };
}

export function dkd_map_view_point_list_from_mapbox_coordinates_value(dkd_coordinate_values) {
  if (!Array.isArray(dkd_coordinate_values)) return [];
  return dkd_coordinate_values
    .map((dkd_coordinate_value) => dkd_point_from_lat_lng_value(dkd_coordinate_value?.[1], dkd_coordinate_value?.[0])?.dkd_map_view_coordinate_value)
    .filter(Boolean);
}


function dkd_mapbox_safe_query_text_value(dkd_raw_value) {
  return String(dkd_raw_value || '').trim().replace(/\s+/g, ' ');
}

function dkd_mapbox_query_with_ankara_context_value(dkd_query_value, dkd_options_value = {}) {
  const dkd_safe_query_value = dkd_mapbox_safe_query_text_value(dkd_query_value);
  if (!dkd_safe_query_value || dkd_options_value?.dkd_use_ankara_context_value === false) return dkd_safe_query_value;
  if (/\b(ankara|turkiye|türkiye|tr)\b/i.test(dkd_safe_query_value)) return dkd_safe_query_value;
  return `${dkd_safe_query_value}, Ankara, Türkiye`;
}

function dkd_mapbox_context_name_text_value(dkd_context_value) {
  if (!dkd_context_value || typeof dkd_context_value !== 'object') return '';
  return Object.keys(dkd_context_value)
    .map((dkd_context_key_value) => String(dkd_context_value?.[dkd_context_key_value]?.name || '').trim())
    .filter(Boolean)
    .join(' ');
}

function dkd_mapbox_searchbox_place_text_value(dkd_feature_value) {
  const dkd_properties_value = dkd_feature_value?.properties || {};
  return [
    dkd_properties_value?.name,
    dkd_properties_value?.name_preferred,
    dkd_properties_value?.full_address,
    dkd_properties_value?.address,
    dkd_properties_value?.place_formatted,
    dkd_mapbox_context_name_text_value(dkd_properties_value?.context),
  ].map((dkd_text_value) => String(dkd_text_value || '').trim()).filter(Boolean).join(' ');
}

function dkd_mapbox_searchbox_feature_score_value(dkd_feature_value, dkd_query_value, dkd_options_value = {}) {
  const dkd_properties_value = dkd_feature_value?.properties || {};
  const dkd_place_text_value = dkd_mapbox_searchbox_place_text_value(dkd_feature_value).toLocaleLowerCase('tr-TR');
  const dkd_query_tokens_value = dkd_mapbox_safe_query_text_value(dkd_query_value)
    .toLocaleLowerCase('tr-TR')
    .split(/[^0-9a-zçğıöşü]+/i)
    .filter((dkd_token_value) => dkd_token_value.length >= 3);
  const dkd_generic_token_values = new Set(['ankara', 'turkiye', 'türkiye', 'mahallesi', 'mahalle', 'sokak', 'sokağı', 'cadde', 'caddesi', 'avm', 'mall']);
  const dkd_important_token_values = dkd_query_tokens_value.filter((dkd_token_value) => !dkd_generic_token_values.has(dkd_token_value));
  const dkd_exact_token_count_value = dkd_query_tokens_value.reduce((dkd_score_value, dkd_token_value) => dkd_score_value + (dkd_place_text_value.includes(dkd_token_value) ? 1 : 0), 0);
  const dkd_important_token_count_value = dkd_important_token_values.reduce((dkd_score_value, dkd_token_value) => dkd_score_value + (dkd_place_text_value.includes(dkd_token_value) ? 1 : 0), 0);
  const dkd_missing_token_penalty_value = Math.max(0, dkd_query_tokens_value.length - dkd_exact_token_count_value) * 18;
  const dkd_missing_important_token_penalty_value = Math.max(0, dkd_important_token_values.length - dkd_important_token_count_value) * 52;
  const dkd_poi_score_value = String(dkd_properties_value?.feature_type || '').toLowerCase() === 'poi' ? 42 : 0;
  const dkd_address_score_value = String(dkd_properties_value?.feature_type || '').toLowerCase() === 'address' ? 18 : 0;
  const dkd_ankara_score_value = /ankara|etimesgut|eryaman|çankaya|yenimahalle|mamak|keçiören|sincan|gölbaşı|akköprü|akkopru/i.test(dkd_place_text_value) ? 45 : 0;
  const dkd_expected_text_value = String(dkd_options_value?.dkd_expected_place_text_value || '').toLocaleLowerCase('tr-TR').trim();
  const dkd_expected_score_value = dkd_expected_text_value && dkd_place_text_value.includes(dkd_expected_text_value) ? 110 : 0;
  const dkd_forbidden_text_values = Array.isArray(dkd_options_value?.dkd_forbidden_place_text_values) ? dkd_options_value.dkd_forbidden_place_text_values : [];
  const dkd_forbidden_penalty_value = dkd_forbidden_text_values.some((dkd_forbidden_text_value) => {
    const dkd_forbidden_clean_value = String(dkd_forbidden_text_value || '').toLocaleLowerCase('tr-TR').trim();
    return dkd_forbidden_clean_value && dkd_place_text_value.includes(dkd_forbidden_clean_value);
  }) ? 220 : 0;
  return (dkd_exact_token_count_value * 30) + (dkd_important_token_count_value * 52) + dkd_poi_score_value + dkd_address_score_value + dkd_ankara_score_value + dkd_expected_score_value - dkd_missing_token_penalty_value - dkd_missing_important_token_penalty_value - dkd_forbidden_penalty_value;
}

function dkd_searchbox_point_from_feature_value(dkd_feature_value) {
  const dkd_routable_point_value = Array.isArray(dkd_feature_value?.properties?.coordinates?.routable_points)
    ? dkd_feature_value.properties.coordinates.routable_points[0]
    : null;
  const dkd_routable_mapbox_point_value = dkd_routable_point_value
    ? dkd_point_from_lat_lng_value(dkd_routable_point_value.latitude, dkd_routable_point_value.longitude)
    : null;
  if (dkd_routable_mapbox_point_value) return dkd_routable_mapbox_point_value;

  const dkd_properties_coordinate_value = dkd_feature_value?.properties?.coordinates;
  const dkd_properties_point_value = dkd_properties_coordinate_value
    ? dkd_point_from_lat_lng_value(dkd_properties_coordinate_value.latitude, dkd_properties_coordinate_value.longitude)
    : null;
  if (dkd_properties_point_value) return dkd_properties_point_value;

  const dkd_geometry_coordinates_value = Array.isArray(dkd_feature_value?.geometry?.coordinates) ? dkd_feature_value.geometry.coordinates : null;
  return dkd_geometry_coordinates_value ? dkd_point_from_lat_lng_value(dkd_geometry_coordinates_value[1], dkd_geometry_coordinates_value[0]) : null;
}

function dkd_searchbox_place_name_value(dkd_feature_value) {
  const dkd_properties_value = dkd_feature_value?.properties || {};
  return String(dkd_properties_value.full_address || [dkd_properties_value.name, dkd_properties_value.place_formatted].filter(Boolean).join(', ') || dkd_properties_value.name || '').trim();
}

async function dkd_fetch_mapbox_searchbox_forward_value(dkd_query_raw_value, dkd_options_value = {}) {
  const dkd_query_value = dkd_mapbox_safe_query_text_value(dkd_query_raw_value);
  if (!dkd_query_value || !dkd_mapbox_access_token_ready_value) return null;

  const dkd_search_query_value = dkd_mapbox_query_with_ankara_context_value(dkd_query_value, dkd_options_value);
  const dkd_parameter_value = new URLSearchParams({
    access_token: dkd_raw_mapbox_access_token_value,
    country: String(dkd_options_value?.dkd_country_value || 'TR'),
    language: 'tr',
    limit: String(dkd_options_value?.dkd_limit_value || '10'),
    types: String(dkd_options_value?.dkd_types_value || 'poi,address,street,neighborhood,district,place,locality'),
    auto_complete: 'true',
  });
  dkd_parameter_value.set('q', dkd_search_query_value);

  const dkd_proximity_point_value = dkd_point_from_any_lat_lng_value(dkd_options_value?.dkd_proximity_point_value);
  if (dkd_proximity_point_value) {
    dkd_parameter_value.set('proximity', `${dkd_proximity_point_value.dkd_lng_value},${dkd_proximity_point_value.dkd_lat_value}`);
  } else if (dkd_options_value?.dkd_use_ankara_proximity_value !== false) {
    dkd_parameter_value.set('proximity', '32.85411,39.92077');
  }
  if (dkd_options_value?.dkd_use_ankara_bbox_value === true) {
    dkd_parameter_value.set('bbox', dkd_ankara_bbox_text_value);
  }

  const dkd_request_url_value = `https://api.mapbox.com/search/searchbox/v1/forward?${dkd_parameter_value.toString()}`;
  try {
    const dkd_response_value = await fetch(dkd_request_url_value);
    const dkd_json_value = await dkd_response_value.json();
    const dkd_feature_values = Array.isArray(dkd_json_value?.features) ? dkd_json_value.features : [];
    const dkd_feature_value = dkd_feature_values
      .slice()
      .sort((dkd_left_feature_value, dkd_right_feature_value) => dkd_mapbox_searchbox_feature_score_value(dkd_right_feature_value, dkd_search_query_value, dkd_options_value) - dkd_mapbox_searchbox_feature_score_value(dkd_left_feature_value, dkd_search_query_value, dkd_options_value))[0] || null;
    const dkd_point_value = dkd_searchbox_point_from_feature_value(dkd_feature_value);
    if (!dkd_response_value.ok || !dkd_point_value) {
      return {
        dkd_point_value: null,
        dkd_place_name_value: '',
        dkd_is_fallback_value: true,
        dkd_warning_text_value: dkd_json_value?.message || 'Mapbox Search Box konum bulamadı.',
        dkd_query_value: dkd_search_query_value,
        dkd_provider_key_value: 'mapbox-searchbox-forward',
      };
    }
    return {
      dkd_point_value,
      dkd_place_name_value: dkd_searchbox_place_name_value(dkd_feature_value),
      dkd_is_fallback_value: false,
      dkd_warning_text_value: '',
      dkd_provider_key_value: 'mapbox-searchbox-forward',
      dkd_query_value: dkd_search_query_value,
      dkd_feature_type_value: String(dkd_feature_value?.properties?.feature_type || '').trim(),
    };
  } catch (dkd_error_value) {
    return {
      dkd_point_value: null,
      dkd_place_name_value: '',
      dkd_is_fallback_value: true,
      dkd_warning_text_value: dkd_error_value?.message || 'Mapbox Search Box isteği başarısız oldu.',
      dkd_provider_key_value: 'mapbox-searchbox-forward',
    };
  }
}

function dkd_mapbox_feature_score_value(dkd_feature_value, dkd_query_value, dkd_options_value = {}) {
  const dkd_place_text_value = String(`${dkd_feature_value?.text || ''} ${dkd_feature_value?.place_name || ''}`).toLocaleLowerCase('tr-TR');
  const dkd_query_tokens_value = dkd_mapbox_safe_query_text_value(dkd_query_value)
    .toLocaleLowerCase('tr-TR')
    .split(/[^0-9a-zçğıöşü]+/i)
    .filter((dkd_token_value) => dkd_token_value.length >= 3);
  const dkd_generic_token_values = new Set(['ankara', 'turkiye', 'türkiye', 'mahallesi', 'mahalle', 'sokak', 'sokağı', 'cadde', 'caddesi', 'avm']);
  const dkd_important_token_values = dkd_query_tokens_value.filter((dkd_token_value) => !dkd_generic_token_values.has(dkd_token_value));
  const dkd_exact_token_count_value = dkd_query_tokens_value.reduce((dkd_score_value, dkd_token_value) => dkd_score_value + (dkd_place_text_value.includes(dkd_token_value) ? 1 : 0), 0);
  const dkd_important_token_count_value = dkd_important_token_values.reduce((dkd_score_value, dkd_token_value) => dkd_score_value + (dkd_place_text_value.includes(dkd_token_value) ? 1 : 0), 0);
  const dkd_token_score_value = (dkd_exact_token_count_value * 24) + (dkd_important_token_count_value * 38);
  const dkd_missing_token_penalty_value = Math.max(0, dkd_query_tokens_value.length - dkd_exact_token_count_value) * 14;
  const dkd_missing_important_token_penalty_value = Math.max(0, dkd_important_token_values.length - dkd_important_token_count_value) * 46;
  const dkd_relevance_score_value = Number(dkd_feature_value?.relevance || 0) * 100;
  const dkd_ankara_score_value = /ankara|etimesgut|eryaman|çankaya|yenimahalle|mamak|keçiören|sincan|gölbaşı|akköprü/i.test(dkd_place_text_value) ? 32 : 0;
  const dkd_poi_score_value = String(dkd_feature_value?.place_type || '').includes('poi') ? 16 : 0;
  const dkd_expected_text_value = String(dkd_options_value?.dkd_expected_place_text_value || '').toLocaleLowerCase('tr-TR').trim();
  const dkd_expected_score_value = dkd_expected_text_value && dkd_place_text_value.includes(dkd_expected_text_value) ? 80 : 0;
  const dkd_forbidden_text_values = Array.isArray(dkd_options_value?.dkd_forbidden_place_text_values) ? dkd_options_value.dkd_forbidden_place_text_values : [];
  const dkd_forbidden_penalty_value = dkd_forbidden_text_values.some((dkd_forbidden_text_value) => {
    const dkd_forbidden_clean_value = String(dkd_forbidden_text_value || '').toLocaleLowerCase('tr-TR').trim();
    return dkd_forbidden_clean_value && dkd_place_text_value.includes(dkd_forbidden_clean_value);
  }) ? 180 : 0;
  return dkd_relevance_score_value + dkd_token_score_value + dkd_ankara_score_value + dkd_poi_score_value + dkd_expected_score_value - dkd_missing_token_penalty_value - dkd_missing_important_token_penalty_value - dkd_forbidden_penalty_value;
}

export async function dkd_fetch_mapbox_geocoding_place_value(dkd_query_raw_value, dkd_options_value = {}) {
  const dkd_query_value = dkd_mapbox_safe_query_text_value(dkd_query_raw_value);
  if (!dkd_query_value) {
    return {
      dkd_point_value: null,
      dkd_place_name_value: '',
      dkd_is_fallback_value: true,
      dkd_warning_text_value: 'Adres boş olduğu için Mapbox geocoding çalışmadı.',
    };
  }

  if (!dkd_mapbox_access_token_ready_value) {
    return {
      dkd_point_value: null,
      dkd_place_name_value: '',
      dkd_is_fallback_value: true,
      dkd_warning_text_value: dkd_mapbox_access_token_problem_text_value(),
    };
  }

  const dkd_geocoding_query_value = dkd_mapbox_query_with_ankara_context_value(dkd_query_value, dkd_options_value);
  if (dkd_options_value?.dkd_searchbox_first_value !== false) {
    const dkd_searchbox_result_value = await dkd_fetch_mapbox_searchbox_forward_value(dkd_geocoding_query_value, dkd_options_value);
    if (dkd_searchbox_result_value?.dkd_point_value) return dkd_searchbox_result_value;
  }

  const dkd_parameter_value = new URLSearchParams({
    access_token: dkd_raw_mapbox_access_token_value,
    country: String(dkd_options_value?.dkd_country_value || 'TR'),
    language: 'tr',
    limit: String(dkd_options_value?.dkd_limit_value || '5'),
    types: String(dkd_options_value?.dkd_types_value || 'address,poi,neighborhood,district,place,locality'),
    autocomplete: 'false',
    fuzzyMatch: 'true',
  });

  const dkd_proximity_point_value = dkd_point_from_any_lat_lng_value(dkd_options_value?.dkd_proximity_point_value);
  if (dkd_proximity_point_value) {
    dkd_parameter_value.set('proximity', `${dkd_proximity_point_value.dkd_lng_value},${dkd_proximity_point_value.dkd_lat_value}`);
  } else if (dkd_options_value?.dkd_use_ankara_proximity_value !== false) {
    dkd_parameter_value.set('proximity', '32.85411,39.92077');
  }
  if (dkd_options_value?.dkd_use_ankara_bbox_value !== false) {
    dkd_parameter_value.set('bbox', dkd_ankara_bbox_text_value);
  }

  const dkd_request_url_value = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(dkd_geocoding_query_value)}.json?${dkd_parameter_value.toString()}`;

  try {
    const dkd_response_value = await fetch(dkd_request_url_value);
    const dkd_json_value = await dkd_response_value.json();
    const dkd_feature_values = Array.isArray(dkd_json_value?.features) ? dkd_json_value.features : [];
    const dkd_feature_value = dkd_feature_values
      .slice()
      .sort((dkd_left_feature_value, dkd_right_feature_value) => dkd_mapbox_feature_score_value(dkd_right_feature_value, dkd_geocoding_query_value, dkd_options_value) - dkd_mapbox_feature_score_value(dkd_left_feature_value, dkd_geocoding_query_value, dkd_options_value))[0] || null;
    const dkd_center_value = Array.isArray(dkd_feature_value?.center) ? dkd_feature_value.center : null;
    const dkd_point_value = dkd_center_value ? dkd_point_from_lat_lng_value(dkd_center_value[1], dkd_center_value[0]) : null;

    if (!dkd_response_value.ok || !dkd_point_value) {
      return {
        dkd_point_value: null,
        dkd_place_name_value: '',
        dkd_is_fallback_value: true,
        dkd_warning_text_value: dkd_json_value?.message || 'Mapbox adresten konum bulamadı.',
        dkd_query_value: dkd_geocoding_query_value,
      };
    }

    return {
      dkd_point_value,
      dkd_place_name_value: String(dkd_feature_value?.place_name || dkd_feature_value?.text || '').trim(),
      dkd_is_fallback_value: false,
      dkd_warning_text_value: '',
      dkd_provider_key_value: 'mapbox-geocoding',
      dkd_query_value: dkd_geocoding_query_value,
      dkd_relevance_value: dkd_number_or_null_value(dkd_feature_value?.relevance),
    };
  } catch (dkd_error_value) {
    return {
      dkd_point_value: null,
      dkd_place_name_value: '',
      dkd_is_fallback_value: true,
      dkd_warning_text_value: dkd_error_value?.message || 'Mapbox geocoding isteği başarısız oldu.',
    };
  }
}

export async function dkd_fetch_mapbox_reverse_geocoding_label_value(dkd_point_raw_value) {
  const dkd_point_value = dkd_point_from_any_lat_lng_value(dkd_point_raw_value);
  if (!dkd_point_value || !dkd_mapbox_access_token_ready_value) return '';

  const dkd_parameter_value = new URLSearchParams({
    access_token: dkd_raw_mapbox_access_token_value,
    language: 'tr',
    limit: '1',
    types: 'address,poi,neighborhood,place,locality',
  });
  const dkd_request_url_value = `https://api.mapbox.com/geocoding/v5/mapbox.places/${dkd_point_value.dkd_lng_value},${dkd_point_value.dkd_lat_value}.json?${dkd_parameter_value.toString()}`;

  try {
    const dkd_response_value = await fetch(dkd_request_url_value);
    const dkd_json_value = await dkd_response_value.json();
    if (!dkd_response_value.ok) return '';
    const dkd_feature_value = Array.isArray(dkd_json_value?.features) ? dkd_json_value.features[0] : null;
    return String(dkd_feature_value?.place_name || dkd_feature_value?.text || '').trim();
  } catch {
    return '';
  }
}

export function dkd_haversine_km_between_mapbox_points_value(dkd_start_raw_value, dkd_end_raw_value) {
  const dkd_start_value = dkd_point_from_any_lat_lng_value(dkd_start_raw_value);
  const dkd_end_value = dkd_point_from_any_lat_lng_value(dkd_end_raw_value);
  if (!dkd_start_value || !dkd_end_value) return null;
  const dkd_earth_radius_km_value = 6371;
  const dkd_to_radian_value = (dkd_degree_value) => (Number(dkd_degree_value) * Math.PI) / 180;
  const dkd_delta_lat_value = dkd_to_radian_value(dkd_end_value.dkd_lat_value - dkd_start_value.dkd_lat_value);
  const dkd_delta_lng_value = dkd_to_radian_value(dkd_end_value.dkd_lng_value - dkd_start_value.dkd_lng_value);
  const dkd_start_lat_radian_value = dkd_to_radian_value(dkd_start_value.dkd_lat_value);
  const dkd_end_lat_radian_value = dkd_to_radian_value(dkd_end_value.dkd_lat_value);
  const dkd_arc_value = Math.sin(dkd_delta_lat_value / 2) ** 2
    + Math.cos(dkd_start_lat_radian_value) * Math.cos(dkd_end_lat_radian_value) * Math.sin(dkd_delta_lng_value / 2) ** 2;
  return dkd_earth_radius_km_value * (2 * Math.atan2(Math.sqrt(dkd_arc_value), Math.sqrt(1 - dkd_arc_value)));
}

export async function dkd_fetch_mapbox_directions_route_value(dkd_start_raw_value, dkd_end_raw_value, dkd_options_value = {}) {
  const dkd_start_point_value = dkd_point_from_any_lat_lng_value(dkd_start_raw_value);
  const dkd_end_point_value = dkd_point_from_any_lat_lng_value(dkd_end_raw_value);
  const dkd_fallback_coordinate_values = dkd_start_point_value && dkd_end_point_value
    ? [dkd_start_point_value.dkd_coordinate_value, dkd_end_point_value.dkd_coordinate_value]
    : [];
  const dkd_fallback_map_view_points_value = dkd_start_point_value && dkd_end_point_value
    ? [dkd_start_point_value.dkd_map_view_coordinate_value, dkd_end_point_value.dkd_map_view_coordinate_value]
    : [];
  const dkd_max_fallback_distance_km_value = dkd_number_or_null_value(dkd_options_value?.dkd_max_fallback_distance_km_value);
  const dkd_fallback_distance_raw_value = dkd_start_point_value && dkd_end_point_value
    ? dkd_haversine_km_between_mapbox_points_value(dkd_start_point_value, dkd_end_point_value)
    : null;
  const dkd_fallback_distance_km_value = dkd_max_fallback_distance_km_value != null
    && dkd_fallback_distance_raw_value != null
    && dkd_fallback_distance_raw_value > dkd_max_fallback_distance_km_value
      ? null
      : dkd_fallback_distance_raw_value;
  const dkd_distance_warning_suffix_value = dkd_fallback_distance_raw_value != null
    && dkd_fallback_distance_km_value == null
      ? ' Koordinatlar şehir dışı/bozuk göründüğü için mesafe gösterilmedi.'
      : '';

  if (!dkd_start_point_value || !dkd_end_point_value) {
    return {
      dkd_coordinate_values: dkd_fallback_coordinate_values,
      dkd_point_list_value: dkd_fallback_map_view_points_value,
      dkd_distance_km_value: null,
      dkd_duration_min_value: null,
      dkd_is_fallback_value: true,
      dkd_warning_text_value: 'Rota için başlangıç veya hedef koordinatı eksik.',
    };
  }

  if (!dkd_mapbox_access_token_ready_value) {
    return {
      dkd_coordinate_values: dkd_fallback_coordinate_values,
      dkd_point_list_value: dkd_fallback_map_view_points_value,
      dkd_distance_km_value: dkd_fallback_distance_km_value,
      dkd_duration_min_value: null,
      dkd_is_fallback_value: true,
      dkd_warning_text_value: dkd_mapbox_access_token_problem_text_value(),
    };
  }

  const dkd_profile_value = String(dkd_options_value?.dkd_profile_value || 'mapbox/driving-traffic').trim() || 'mapbox/driving-traffic';
  const dkd_coordinate_text_value = `${dkd_start_point_value.dkd_lng_value},${dkd_start_point_value.dkd_lat_value};${dkd_end_point_value.dkd_lng_value},${dkd_end_point_value.dkd_lat_value}`;
  const dkd_parameter_value = new URLSearchParams({
    alternatives: 'false',
    geometries: 'geojson',
    overview: 'full',
    steps: String(dkd_options_value?.dkd_steps_value === true),
    language: 'tr',
    annotations: 'distance,duration',
    radiuses: 'unlimited;unlimited',
    access_token: dkd_raw_mapbox_access_token_value,
  });
  const dkd_request_url_value = `https://api.mapbox.com/directions/v5/${dkd_profile_value}/${dkd_coordinate_text_value}?${dkd_parameter_value.toString()}`;

  try {
    const dkd_response_value = await fetch(dkd_request_url_value);
    const dkd_json_value = await dkd_response_value.json();
    const dkd_route_value = Array.isArray(dkd_json_value?.routes) ? dkd_json_value.routes[0] : null;
    const dkd_coordinate_values = Array.isArray(dkd_route_value?.geometry?.coordinates) ? dkd_route_value.geometry.coordinates : [];
    const dkd_point_list_value = dkd_map_view_point_list_from_mapbox_coordinates_value(dkd_coordinate_values);

    if (!dkd_response_value.ok || !dkd_route_value || dkd_point_list_value.length < 2) {
      return {
        dkd_coordinate_values: dkd_fallback_coordinate_values,
        dkd_point_list_value: dkd_fallback_map_view_points_value,
        dkd_distance_km_value: dkd_fallback_distance_km_value,
        dkd_duration_min_value: null,
        dkd_is_fallback_value: true,
        dkd_warning_text_value: `${dkd_json_value?.message || 'Mapbox rota bilgisi alınamadı.'}${dkd_distance_warning_suffix_value}`,
      };
    }

    return {
      dkd_coordinate_values,
      dkd_point_list_value,
      dkd_distance_km_value: dkd_number_or_null_value(dkd_route_value?.distance) != null ? Number(dkd_route_value.distance) / 1000 : null,
      dkd_duration_min_value: dkd_number_or_null_value(dkd_route_value?.duration) != null ? Number(dkd_route_value.duration) / 60 : null,
      dkd_is_fallback_value: false,
      dkd_warning_text_value: '',
      dkd_provider_key_value: 'mapbox',
      dkd_profile_value,
    };
  } catch (dkd_error_value) {
    return {
      dkd_coordinate_values: dkd_fallback_coordinate_values,
      dkd_point_list_value: dkd_fallback_map_view_points_value,
      dkd_distance_km_value: dkd_fallback_distance_km_value,
      dkd_duration_min_value: null,
      dkd_is_fallback_value: true,
      dkd_warning_text_value: `${dkd_error_value?.message || 'Mapbox rota isteği başarısız oldu.'}${dkd_distance_warning_suffix_value}`,
    };
  }
}
