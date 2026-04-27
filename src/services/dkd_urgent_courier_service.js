import { supabase } from '../lib/supabase';

function dkd_normalize_rpc_response_value(dkd_result_value) {
  if (dkd_result_value?.error) return dkd_result_value;
  const dkd_payload_value = dkd_result_value?.data;
  if (dkd_payload_value?.dkd_ok === false || dkd_payload_value?.ok === false) {
    return {
      data: dkd_payload_value,
      error: new Error(dkd_payload_value?.dkd_reason || dkd_payload_value?.reason || 'urgent_courier_action_failed'),
    };
  }
  return dkd_result_value;
}

async function dkd_emit_urgent_courier_push_event(dkd_event_key_value, dkd_order_id_value, dkd_message_id_value = null) {
  const dkd_safe_order_id_value = String(dkd_order_id_value || '').trim();
  if (!dkd_safe_order_id_value) return { ok: false, reason: 'missing_order_id' };
  try {
    const dkd_payload_value = {
      dkd_event_key: String(dkd_event_key_value || '').trim(),
      dkd_order_id: dkd_safe_order_id_value,
    };
    if (dkd_message_id_value) dkd_payload_value.dkd_message_id = String(dkd_message_id_value).trim();
    const { data: dkd_data_value, error: dkd_error_value } = await supabase.functions.invoke('send-urgent-courier-alert', {
      body: dkd_payload_value,
    });
    if (dkd_error_value) return { ok: false, reason: dkd_error_value?.message || 'urgent_push_failed' };
    return { ok: true, data: dkd_data_value || null };
  } catch (dkd_error_value) {
    return { ok: false, reason: dkd_error_value?.message || 'urgent_push_failed' };
  }
}

function dkd_rpc_result_order_id_value(dkd_result_value, dkd_fallback_order_id_value = '') {
  return String(dkd_result_value?.data?.dkd_order_id || dkd_fallback_order_id_value || '').trim();
}

export async function dkd_fetch_urgent_courier_snapshot() {
  return supabase.rpc('dkd_urgent_courier_snapshot_dkd');
}

export async function dkd_create_urgent_courier_order(dkd_input_value = {}) {
  const dkd_result_value = await supabase.rpc('dkd_urgent_courier_create_order_dkd', {
    dkd_param_customer_full_name: String(dkd_input_value?.dkd_customer_full_name || '').trim(),
    dkd_param_customer_phone_text: String(dkd_input_value?.dkd_customer_phone_text || '').trim(),
    dkd_param_customer_address_text: String(dkd_input_value?.dkd_customer_address_text || '').trim(),
    dkd_param_customer_note_text: String(dkd_input_value?.dkd_customer_note_text || '').trim(),
    dkd_param_items: Array.isArray(dkd_input_value?.dkd_items) ? dkd_input_value.dkd_items : [],
  });
  const dkd_normalized_result_value = dkd_normalize_rpc_response_value(dkd_result_value);
  if (!dkd_normalized_result_value?.error) {
    await dkd_emit_urgent_courier_push_event('dkd_urgent_order_created', dkd_rpc_result_order_id_value(dkd_normalized_result_value));
  }
  return dkd_normalized_result_value;
}

export async function dkd_cancel_urgent_courier_order(dkd_order_id_value) {
  const dkd_result_value = await supabase.rpc('dkd_urgent_courier_customer_cancel_order_dkd', {
    dkd_param_order_id: dkd_order_id_value,
  });
  const dkd_normalized_result_value = dkd_normalize_rpc_response_value(dkd_result_value);
  if (!dkd_normalized_result_value?.error) {
    await dkd_emit_urgent_courier_push_event('dkd_urgent_order_cancelled', dkd_rpc_result_order_id_value(dkd_normalized_result_value, dkd_order_id_value));
  }
  return dkd_normalized_result_value;
}

export async function dkd_offer_urgent_courier_fee(dkd_order_id_value, dkd_courier_fee_tl_value) {
  const dkd_result_value = await supabase.rpc('dkd_urgent_courier_offer_fee_dkd', {
    dkd_param_order_id: dkd_order_id_value,
    dkd_param_courier_fee_tl: Number(dkd_courier_fee_tl_value || 0),
  });
  const dkd_normalized_result_value = dkd_normalize_rpc_response_value(dkd_result_value);
  if (!dkd_normalized_result_value?.error) {
    await dkd_emit_urgent_courier_push_event('dkd_urgent_courier_accepted', dkd_rpc_result_order_id_value(dkd_normalized_result_value, dkd_order_id_value));
  }
  return dkd_normalized_result_value;
}

export async function dkd_approve_urgent_courier_fee(dkd_order_id_value) {
  const dkd_result_value = await supabase.rpc('dkd_urgent_courier_customer_approve_fee_dkd', {
    dkd_param_order_id: dkd_order_id_value,
  });
  const dkd_normalized_result_value = dkd_normalize_rpc_response_value(dkd_result_value);
  if (!dkd_normalized_result_value?.error) {
    await dkd_emit_urgent_courier_push_event('dkd_urgent_auto_message', dkd_rpc_result_order_id_value(dkd_normalized_result_value, dkd_order_id_value));
  }
  return dkd_normalized_result_value;
}

export async function dkd_set_urgent_courier_product_total(dkd_order_id_value, dkd_product_total_tl_value) {
  const dkd_result_value = await supabase.rpc('dkd_urgent_courier_set_product_total_dkd', {
    dkd_param_order_id: dkd_order_id_value,
    dkd_param_product_total_tl: Number(dkd_product_total_tl_value || 0),
  });
  const dkd_normalized_result_value = dkd_normalize_rpc_response_value(dkd_result_value);
  if (!dkd_normalized_result_value?.error) {
    await dkd_emit_urgent_courier_push_event('dkd_urgent_product_total_sent', dkd_rpc_result_order_id_value(dkd_normalized_result_value, dkd_order_id_value));
  }
  return dkd_normalized_result_value;
}

export async function dkd_set_urgent_courier_item_totals(dkd_order_id_value, dkd_item_total_values) {
  const dkd_result_value = await supabase.rpc('dkd_urgent_courier_set_item_totals_dkd', {
    dkd_param_order_id: dkd_order_id_value,
    dkd_param_item_totals: Array.isArray(dkd_item_total_values) ? dkd_item_total_values : [],
  });
  const dkd_normalized_result_value = dkd_normalize_rpc_response_value(dkd_result_value);
  if (!dkd_normalized_result_value?.error) {
    await dkd_emit_urgent_courier_push_event('dkd_urgent_product_total_sent', dkd_rpc_result_order_id_value(dkd_normalized_result_value, dkd_order_id_value));
  }
  return dkd_normalized_result_value;
}

export async function dkd_approve_urgent_courier_product_total(dkd_order_id_value) {
  const dkd_result_value = await supabase.rpc('dkd_urgent_courier_customer_approve_product_total_dkd', {
    dkd_param_order_id: dkd_order_id_value,
  });
  const dkd_normalized_result_value = dkd_normalize_rpc_response_value(dkd_result_value);
  if (!dkd_normalized_result_value?.error) {
    await dkd_emit_urgent_courier_push_event('dkd_urgent_auto_message', dkd_rpc_result_order_id_value(dkd_normalized_result_value, dkd_order_id_value));
  }
  return dkd_normalized_result_value;
}

export async function dkd_upload_urgent_courier_invoice(dkd_order_id_value, dkd_invoice_image_url_value) {
  const dkd_result_value = await supabase.rpc('dkd_urgent_courier_upload_invoice_dkd', {
    dkd_param_order_id: dkd_order_id_value,
    dkd_param_invoice_image_url: String(dkd_invoice_image_url_value || '').trim(),
  });
  const dkd_normalized_result_value = dkd_normalize_rpc_response_value(dkd_result_value);
  if (!dkd_normalized_result_value?.error) {
    await dkd_emit_urgent_courier_push_event('dkd_urgent_invoice_uploaded', dkd_rpc_result_order_id_value(dkd_normalized_result_value, dkd_order_id_value));
  }
  return dkd_normalized_result_value;
}

export async function dkd_pickup_urgent_courier_items(dkd_order_id_value) {
  const dkd_result_value = await supabase.rpc('dkd_urgent_courier_pickup_items_dkd', {
    dkd_param_order_id: dkd_order_id_value,
  });
  const dkd_normalized_result_value = dkd_normalize_rpc_response_value(dkd_result_value);
  if (!dkd_normalized_result_value?.error) {
    await dkd_emit_urgent_courier_push_event('dkd_urgent_items_picked_up', dkd_rpc_result_order_id_value(dkd_normalized_result_value, dkd_order_id_value));
  }
  return dkd_normalized_result_value;
}

export async function dkd_complete_urgent_courier_delivery(dkd_order_id_value) {
  const dkd_result_value = await supabase.rpc('dkd_urgent_courier_complete_delivery_dkd', {
    dkd_param_order_id: dkd_order_id_value,
  });
  const dkd_normalized_result_value = dkd_normalize_rpc_response_value(dkd_result_value);
  if (!dkd_normalized_result_value?.error) {
    await dkd_emit_urgent_courier_push_event('dkd_urgent_delivery_completed', dkd_rpc_result_order_id_value(dkd_normalized_result_value, dkd_order_id_value));
  }
  return dkd_normalized_result_value;
}

export async function dkd_send_urgent_courier_message(dkd_order_id_value, dkd_message_text_value) {
  const dkd_result_value = await supabase.rpc('dkd_urgent_courier_send_message_dkd', {
    dkd_param_order_id: dkd_order_id_value,
    dkd_param_message_text: String(dkd_message_text_value || '').trim(),
  });
  const dkd_normalized_result_value = dkd_normalize_rpc_response_value(dkd_result_value);
  if (!dkd_normalized_result_value?.error) {
    await dkd_emit_urgent_courier_push_event(
      'dkd_urgent_message_sent',
      dkd_rpc_result_order_id_value(dkd_normalized_result_value, dkd_order_id_value),
      dkd_normalized_result_value?.data?.dkd_message_id || null,
    );
  }
  return dkd_normalized_result_value;
}
