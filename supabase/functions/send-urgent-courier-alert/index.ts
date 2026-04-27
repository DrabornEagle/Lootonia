import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type dkd_urgent_push_request = {
  dkd_event_key?: string | null
  dkd_order_id?: string | null
  dkd_message_id?: string | null
}

type dkd_urgent_push_target_row = {
  dkd_target_user_id?: string | null
  expo_push_token?: string | null
  dkd_title?: string | null
  dkd_body?: string | null
  dkd_payload?: Record<string, unknown> | null
  dkd_dedupe_key?: string | null
}

type dkd_urgent_order_row = {
  dkd_order_id?: string | null
  dkd_customer_user_id?: string | null
  dkd_courier_user_id?: string | null
  dkd_status_key?: string | null
}

type dkd_expo_ticket_row = {
  status?: string
  message?: string
  details?: { error?: string } | null
}

type dkd_expo_message = {
  to: string
  sound: 'default'
  title: string
  body: string
  channelId: string
  data: Record<string, unknown>
}

const dkd_cors_headers_value = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function dkd_json_response_value(dkd_payload_value: Record<string, unknown>, dkd_status_value = 200): Response {
  return new Response(JSON.stringify(dkd_payload_value), {
    status: dkd_status_value,
    headers: { ...dkd_cors_headers_value, 'Content-Type': 'application/json' },
  })
}

function dkd_safe_text_value(dkd_input_value: unknown, dkd_fallback_value = ''): string {
  const dkd_text_value = String(dkd_input_value ?? '').trim()
  return dkd_text_value || dkd_fallback_value
}

function dkd_chunk_values<dkd_item_type_value>(dkd_item_values: dkd_item_type_value[], dkd_chunk_size_value: number): dkd_item_type_value[][] {
  const dkd_chunk_values: T[][] = []
  for (let dkd_index_value = 0; dkd_index_value < dkd_item_values.length; dkd_index_value += dkd_chunk_size_value) {
    dkd_chunk_values.push(dkd_item_values.slice(dkd_index_value, dkd_index_value + dkd_chunk_size_value))
  }
  return dkd_chunk_values
}

function dkd_is_device_not_registered_value(dkd_ticket_value: dkd_expo_ticket_row | null | undefined): boolean {
  const dkd_error_value = dkd_safe_text_value(dkd_ticket_value?.details?.error || dkd_ticket_value?.message).toLowerCase()
  return dkd_error_value.includes('device') && dkd_error_value.includes('notregistered')
}

function dkd_resolve_request_token_value(dkd_request_value: Request): string {
  const dkd_auth_header_value = dkd_safe_text_value(dkd_request_value.headers.get('Authorization'))
  if (!dkd_auth_header_value.toLowerCase().startsWith('bearer ')) return ''
  return dkd_auth_header_value.slice(7).trim()
}

function dkd_event_allows_user_value(
  dkd_event_key_value: string,
  dkd_order_value: dkd_urgent_order_row,
  dkd_user_id_value: string,
): boolean {
  const dkd_customer_user_id_value = dkd_safe_text_value(dkd_order_value?.dkd_customer_user_id)
  const dkd_courier_user_id_value = dkd_safe_text_value(dkd_order_value?.dkd_courier_user_id)
  if (!dkd_user_id_value) return false
  if (dkd_event_key_value === 'dkd_urgent_order_created') return dkd_user_id_value === dkd_customer_user_id_value
  if (dkd_event_key_value === 'dkd_urgent_courier_accepted') return dkd_user_id_value === dkd_courier_user_id_value
  if (dkd_event_key_value === 'dkd_urgent_order_cancelled') return dkd_user_id_value === dkd_customer_user_id_value || dkd_user_id_value === dkd_courier_user_id_value
  if (dkd_event_key_value === 'dkd_urgent_message_sent') return dkd_user_id_value === dkd_customer_user_id_value || dkd_user_id_value === dkd_courier_user_id_value
  if (dkd_event_key_value === 'dkd_urgent_auto_message') return dkd_user_id_value === dkd_customer_user_id_value || dkd_user_id_value === dkd_courier_user_id_value
  if (dkd_event_key_value === 'dkd_urgent_product_total_sent') return dkd_user_id_value === dkd_courier_user_id_value
  if (dkd_event_key_value === 'dkd_urgent_invoice_uploaded') return dkd_user_id_value === dkd_courier_user_id_value
  if (dkd_event_key_value === 'dkd_urgent_items_picked_up') return dkd_user_id_value === dkd_courier_user_id_value
  if (dkd_event_key_value === 'dkd_urgent_delivery_completed') return dkd_user_id_value === dkd_courier_user_id_value
  return false
}

Deno.serve(async (dkd_request_value) => {
  if (dkd_request_value.method === 'OPTIONS') {
    return new Response('ok', { headers: dkd_cors_headers_value })
  }
  if (dkd_request_value.method !== 'POST') {
    return dkd_json_response_value({ error: 'method_not_allowed' }, 405)
  }

  const dkd_supabase_url_value = Deno.env.get('SUPABASE_URL')
  const dkd_supabase_service_role_key_value = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!dkd_supabase_url_value || !dkd_supabase_service_role_key_value) {
    return dkd_json_response_value({ error: 'missing_function_env' }, 500)
  }

  const dkd_service_client_value = createClient(dkd_supabase_url_value, dkd_supabase_service_role_key_value)
  const dkd_token_value = dkd_resolve_request_token_value(dkd_request_value)
  if (!dkd_token_value) return dkd_json_response_value({ error: 'auth_required' }, 401)

  const { data: dkd_user_data_value, error: dkd_user_error_value } = await dkd_service_client_value.auth.getUser(dkd_token_value)
  const dkd_user_id_value = dkd_safe_text_value(dkd_user_data_value?.user?.id)
  if (dkd_user_error_value || !dkd_user_id_value) return dkd_json_response_value({ error: 'auth_required' }, 401)

  const dkd_body_value = await dkd_request_value.json().catch(() => ({})) as dkd_urgent_push_request
  const dkd_event_key_value = dkd_safe_text_value(dkd_body_value?.dkd_event_key)
  const dkd_order_id_value = dkd_safe_text_value(dkd_body_value?.dkd_order_id)
  const dkd_message_id_value = dkd_safe_text_value(dkd_body_value?.dkd_message_id)
  const dkd_allowed_events_value = new Set([
    'dkd_urgent_order_created',
    'dkd_urgent_courier_accepted',
    'dkd_urgent_order_cancelled',
    'dkd_urgent_message_sent',
    'dkd_urgent_auto_message',
    'dkd_urgent_product_total_sent',
    'dkd_urgent_invoice_uploaded',
    'dkd_urgent_items_picked_up',
    'dkd_urgent_delivery_completed',
  ])

  if (!dkd_allowed_events_value.has(dkd_event_key_value) || !dkd_order_id_value) {
    return dkd_json_response_value({ error: 'invalid_event_payload' }, 400)
  }

  const { data: dkd_order_data_value, error: dkd_order_error_value } = await dkd_service_client_value
    .from('dkd_urgent_courier_orders')
    .select('dkd_order_id, dkd_customer_user_id, dkd_courier_user_id, dkd_status_key')
    .eq('dkd_order_id', dkd_order_id_value)
    .maybeSingle()

  if (dkd_order_error_value || !dkd_order_data_value) {
    return dkd_json_response_value({ error: 'order_not_found' }, 404)
  }

  if (!dkd_event_allows_user_value(dkd_event_key_value, dkd_order_data_value as dkd_urgent_order_row, dkd_user_id_value)) {
    return dkd_json_response_value({ error: 'forbidden_event_actor' }, 403)
  }

  const { data: dkd_target_rows_value, error: dkd_targets_error_value } = await dkd_service_client_value.rpc(
    'dkd_urgent_courier_push_targets_dkd',
    {
      dkd_param_order_id: dkd_order_id_value,
      dkd_param_event_key: dkd_event_key_value,
      dkd_param_message_id: dkd_message_id_value || null,
    },
  )

  if (dkd_targets_error_value) {
    return dkd_json_response_value({ error: dkd_targets_error_value.message || 'target_rows_failed' }, 500)
  }

  const dkd_target_rows_list_value = Array.isArray(dkd_target_rows_value)
    ? (dkd_target_rows_value as dkd_urgent_push_target_row[])
        .filter((dkd_row_value) => dkd_safe_text_value(dkd_row_value?.expo_push_token) && dkd_safe_text_value(dkd_row_value?.dkd_dedupe_key))
    : []

  if (!dkd_target_rows_list_value.length) {
    return dkd_json_response_value({ ok: true, reason: 'no_active_push_target', targetCount: 0 })
  }

  const dkd_dedupe_key_values = dkd_target_rows_list_value.map((dkd_row_value) => dkd_safe_text_value(dkd_row_value?.dkd_dedupe_key))
  const { data: dkd_existing_audit_rows_value } = await dkd_service_client_value
    .from('dkd_urgent_courier_push_audit')
    .select('dkd_dedupe_key')
    .in('dkd_dedupe_key', dkd_dedupe_key_values)

  const dkd_existing_dedupe_set_value = new Set(
    (Array.isArray(dkd_existing_audit_rows_value) ? dkd_existing_audit_rows_value : [])
      .map((dkd_row_value: { dkd_dedupe_key?: string | null }) => dkd_safe_text_value(dkd_row_value?.dkd_dedupe_key)),
  )

  const dkd_pending_target_rows_value = dkd_target_rows_list_value.filter((dkd_row_value) => !dkd_existing_dedupe_set_value.has(dkd_safe_text_value(dkd_row_value?.dkd_dedupe_key)))

  if (!dkd_pending_target_rows_value.length) {
    return dkd_json_response_value({ ok: true, reason: 'already_sent', targetCount: 0 })
  }

  const dkd_audit_seed_rows_value = dkd_pending_target_rows_value.map((dkd_row_value) => ({
    dkd_dedupe_key: dkd_safe_text_value(dkd_row_value?.dkd_dedupe_key),
    dkd_event_key: dkd_event_key_value,
    dkd_order_id: dkd_order_id_value,
    dkd_message_id: dkd_message_id_value || null,
    dkd_target_user_id: dkd_row_value?.dkd_target_user_id || null,
    expo_push_token: dkd_safe_text_value(dkd_row_value?.expo_push_token),
    dkd_title: dkd_safe_text_value(dkd_row_value?.dkd_title, 'Acil Kurye'),
    dkd_body: dkd_safe_text_value(dkd_row_value?.dkd_body, 'Acil Kurye akışında yeni güncelleme var.'),
    dkd_payload: dkd_row_value?.dkd_payload || {},
    dkd_send_status: 'pending',
  }))

  await dkd_service_client_value
    .from('dkd_urgent_courier_push_audit')
    .insert(dkd_audit_seed_rows_value)

  const dkd_message_rows_value: dkd_expo_message[] = dkd_pending_target_rows_value.map((dkd_row_value) => ({
    to: dkd_safe_text_value(dkd_row_value?.expo_push_token),
    sound: 'default',
    title: dkd_safe_text_value(dkd_row_value?.dkd_title, 'Acil Kurye'),
    body: dkd_safe_text_value(dkd_row_value?.dkd_body, 'Acil Kurye akışında yeni güncelleme var.'),
    channelId: 'lootonia-core',
    data: {
      ...(dkd_row_value?.dkd_payload || {}),
      dkd_event_key: dkd_event_key_value,
      dkd_urgent_courier_order_id: dkd_order_id_value,
    },
  }))

  let dkd_sent_count_value = 0
  let dkd_failed_count_value = 0
  let dkd_last_error_value = ''

  for (const dkd_message_pack_value of dkd_chunk_values(dkd_message_rows_value, 100)) {
    const dkd_expo_response_value = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
      },
      body: JSON.stringify(dkd_message_pack_value),
    })

    const dkd_expo_json_value = await dkd_expo_response_value.json().catch(() => ({})) as { data?: dkd_expo_ticket_row[] }
    const dkd_ticket_rows_value = Array.isArray(dkd_expo_json_value?.data) ? dkd_expo_json_value.data : []

    for (let dkd_index_value = 0; dkd_index_value < dkd_message_pack_value.length; dkd_index_value += 1) {
      const dkd_ticket_value = dkd_ticket_rows_value[dkd_index_value] || null
      const dkd_message_value = dkd_message_pack_value[dkd_index_value]
      const dkd_target_value = dkd_pending_target_rows_value.find((dkd_row_value) => dkd_safe_text_value(dkd_row_value?.expo_push_token) === dkd_message_value.to)
      const dkd_dedupe_key_value = dkd_safe_text_value(dkd_target_value?.dkd_dedupe_key)
      const dkd_send_ok_value = dkd_ticket_value?.status === 'ok'
      const dkd_send_error_value = dkd_send_ok_value ? '' : dkd_safe_text_value(dkd_ticket_value?.message, `expo_http_${dkd_expo_response_value.status}`)

      if (dkd_send_ok_value) {
        dkd_sent_count_value += 1
      } else {
        dkd_failed_count_value += 1
        dkd_last_error_value = dkd_send_error_value
      }

      await dkd_service_client_value
        .from('dkd_urgent_courier_push_audit')
        .update({
          dkd_send_status: dkd_send_ok_value ? 'sent' : 'failed',
          dkd_send_error: dkd_send_ok_value ? null : dkd_send_error_value,
          dkd_sent_at: new Date().toISOString(),
        })
        .eq('dkd_dedupe_key', dkd_dedupe_key_value)

      if (!dkd_send_ok_value && dkd_is_device_not_registered_value(dkd_ticket_value)) {
        await dkd_service_client_value
          .from('dkd_push_tokens')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('expo_push_token', dkd_message_value.to)
      }
    }
  }

  return dkd_json_response_value({
    ok: true,
    eventKey: dkd_event_key_value,
    orderId: dkd_order_id_value,
    targetCount: dkd_pending_target_rows_value.length,
    sentCount: dkd_sent_count_value,
    failedCount: dkd_failed_count_value,
    lastError: dkd_last_error_value || null,
  })
})
