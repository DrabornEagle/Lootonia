import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type dkd_queue_webhook_payload = {
  type?: string
  table?: string
  schema?: string
  record?: { id?: number | null } | null
  new?: { id?: number | null } | null
}

type dkd_push_target_row = {
  dkd_queue_id?: number | null
  dkd_target_user_id?: string | null
  expo_push_token?: string | null
  dkd_title?: string | null
  dkd_body?: string | null
  dkd_route?: string | null
  dkd_target_screen?: string | null
  dkd_payload?: Record<string, unknown> | null
  dkd_event_key?: string | null
  dkd_event_kind?: string | null
}

type dkd_notification_template_row = {
  dkd_template_key?: string | null
  dkd_title?: string | null
  dkd_body?: string | null
  dkd_target_screen?: string | null
  dkd_is_enabled?: boolean | null
}

type dkd_expo_ticket_row = {
  status?: string
  message?: string
  details?: {
    error?: string
  } | null
}

type dkd_expo_message = {
  to: string
  sound: 'default'
  title: string
  body: string
  channelId: string
  data: Record<string, unknown>
}

function dkd_read_queue_id(dkd_payload_value: dkd_queue_webhook_payload): number {
  return Number(dkd_payload_value?.record?.id || dkd_payload_value?.new?.id || 0)
}

function dkd_is_device_not_registered_error(dkd_ticket_value: dkd_expo_ticket_row | null | undefined): boolean {
  return String(dkd_ticket_value?.details?.error || dkd_ticket_value?.message || '')
    .trim()
    .toLowerCase()
    .includes('device')
    && String(dkd_ticket_value?.details?.error || dkd_ticket_value?.message || '')
      .trim()
      .toLowerCase()
      .includes('notregistered')
}

function dkd_safe_trim_text_value(dkd_input_value: unknown, dkd_fallback_value = ''): string {
  const dkd_text_value = String(dkd_input_value ?? '').trim()
  return dkd_text_value || dkd_fallback_value
}

function dkd_resolve_courier_stage_value(dkd_payload_value: Record<string, unknown>): string {
  const dkd_pickup_status_value = dkd_safe_trim_text_value(dkd_payload_value?.pickup_status || dkd_payload_value?.pickupStatus, '').toLowerCase()
  const dkd_status_value = dkd_safe_trim_text_value(dkd_payload_value?.status, '').toLowerCase()

  if (dkd_pickup_status_value === 'picked_up' || dkd_status_value === 'picked_up') return 'picked_up'
  if (dkd_pickup_status_value === 'delivered' || dkd_status_value === 'completed' || dkd_status_value === 'delivered') return 'completed'
  if (['accepted', 'assigned', 'to_business'].includes(dkd_status_value)) return 'accepted'
  return ''
}

function dkd_resolve_template_key_value(dkd_row_value: dkd_push_target_row | null | undefined): string {
  const dkd_event_kind_value = dkd_safe_trim_text_value(dkd_row_value?.dkd_event_kind, '').toLowerCase()
  const dkd_payload_value = (dkd_row_value?.dkd_payload && typeof dkd_row_value.dkd_payload === 'object')
    ? dkd_row_value.dkd_payload
    : {}

  if (dkd_event_kind_value.includes('courier')) {
    const dkd_job_type_value = dkd_safe_trim_text_value(dkd_payload_value?.jobType || dkd_payload_value?.job_type, 'merchant').toLowerCase()
    const dkd_stage_value = dkd_resolve_courier_stage_value(dkd_payload_value)
    if (dkd_stage_value) {
      return `${dkd_job_type_value === 'cargo' ? 'cargo' : 'merchant'}_courier_${dkd_stage_value}`
    }
  }

  if (dkd_event_kind_value.includes('energy')) return 'energy_full'
  if (dkd_event_kind_value.includes('friend')) return 'friend_request'
  if (dkd_event_kind_value.includes('market')) return 'market_listing_sold'
  if (dkd_event_kind_value.includes('social') || dkd_event_kind_value.includes('message') || dkd_event_kind_value.includes('dm')) return 'social_message'
  return ''
}

async function dkd_fetch_notification_template_value(
  dkd_service_client_value: ReturnType<typeof createClient>,
  dkd_template_key_value: string,
): Promise<dkd_notification_template_row | null> {
  if (!dkd_template_key_value) return null
  const { data, error } = await dkd_service_client_value
    .from('dkd_notification_templates')
    .select('dkd_template_key, dkd_title, dkd_body, dkd_target_screen, dkd_is_enabled')
    .eq('dkd_template_key', dkd_template_key_value)
    .maybeSingle()

  if (error) return null
  return (data || null) as dkd_notification_template_row | null
}

function dkd_build_template_scope_value(dkd_row_value: dkd_push_target_row): Record<string, string> {
  const dkd_scope_value: Record<string, string> = {}
  const dkd_payload_value = (dkd_row_value?.dkd_payload && typeof dkd_row_value.dkd_payload === 'object')
    ? dkd_row_value.dkd_payload
    : {}

  const dkd_assign_value = (dkd_source_value: Record<string, unknown>) => {
    Object.entries(dkd_source_value || {}).forEach(([dkd_key_value, dkd_value]) => {
      if (dkd_value == null) return
      if (['string', 'number', 'boolean'].includes(typeof dkd_value)) {
        dkd_scope_value[dkd_key_value] = String(dkd_value)
      }
    })
  }

  dkd_assign_value(dkd_payload_value)
  dkd_scope_value.row_title = dkd_safe_trim_text_value(dkd_row_value?.dkd_title)
  dkd_scope_value.row_body = dkd_safe_trim_text_value(dkd_row_value?.dkd_body)
  dkd_scope_value.row_target_screen = dkd_safe_trim_text_value(dkd_row_value?.dkd_target_screen || dkd_row_value?.dkd_route)
  dkd_scope_value.sender_name = dkd_safe_trim_text_value(dkd_payload_value?.sender_name || dkd_payload_value?.senderName)
  dkd_scope_value.merchant_name = dkd_safe_trim_text_value(dkd_payload_value?.merchant_name)
  dkd_scope_value.product_title = dkd_safe_trim_text_value(dkd_payload_value?.product_title)
  dkd_scope_value.pickup = dkd_safe_trim_text_value(dkd_payload_value?.pickup)
  dkd_scope_value.dropoff = dkd_safe_trim_text_value(dkd_payload_value?.dropoff)
  dkd_scope_value.card_name = dkd_safe_trim_text_value(dkd_payload_value?.card_name || dkd_payload_value?.cardName)
  dkd_scope_value.fee_tl = dkd_safe_trim_text_value(dkd_payload_value?.fee_tl)
  return dkd_scope_value
}

function dkd_apply_template_text_value(dkd_template_text_value: string, dkd_scope_value: Record<string, string>, dkd_fallback_value: string): string {
  const dkd_source_text_value = dkd_safe_trim_text_value(dkd_template_text_value, dkd_fallback_value)
  return dkd_source_text_value.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_dkd_match_value, dkd_key_value) => {
    return dkd_safe_trim_text_value(dkd_scope_value[dkd_key_value], '')
  }).trim() || dkd_fallback_value
}

Deno.serve(async (dkd_request_value) => {
  if (dkd_request_value.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405 })
  }

  const dkd_supabase_url_value = Deno.env.get('SUPABASE_URL')
  const dkd_supabase_service_role_key_value = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const dkd_webhook_secret_value = Deno.env.get('DKD_PUSH_EVENT_WEBHOOK_SECRET')
  const dkd_request_secret_value = dkd_request_value.headers.get('x-dkd-webhook-secret') || ''

  if (!dkd_supabase_url_value || !dkd_supabase_service_role_key_value) {
    return new Response(JSON.stringify({ error: 'missing_function_env' }), { status: 500 })
  }

  if (!dkd_webhook_secret_value || dkd_request_secret_value !== dkd_webhook_secret_value) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
  }

  const dkd_payload_value = await dkd_request_value.json().catch(() => ({})) as dkd_queue_webhook_payload
  const dkd_queue_id_value = dkd_read_queue_id(dkd_payload_value)

  if (!Number.isFinite(dkd_queue_id_value) || dkd_queue_id_value <= 0) {
    return new Response(JSON.stringify({ error: 'invalid_queue_id' }), { status: 400 })
  }

  const dkd_service_client_value = createClient(dkd_supabase_url_value, dkd_supabase_service_role_key_value)
  const { data: dkd_target_rows_value, error: dkd_target_rows_error_value } = await dkd_service_client_value.rpc(
    'dkd_push_event_target_tokens',
    { dkd_param_queue_id: dkd_queue_id_value },
  )

  if (dkd_target_rows_error_value) {
    await dkd_service_client_value.rpc('dkd_push_event_mark_sent', {
      dkd_param_queue_id: dkd_queue_id_value,
      dkd_param_send_status: 'failed',
      dkd_param_send_error: dkd_target_rows_error_value.message || 'target_rows_failed',
    })
    return new Response(JSON.stringify({ error: dkd_target_rows_error_value.message || 'target_rows_failed' }), { status: 500 })
  }

  const dkd_target_rows_list_value = Array.isArray(dkd_target_rows_value)
    ? (dkd_target_rows_value as dkd_push_target_row[])
        .filter((dkd_row_value) => dkd_safe_trim_text_value(dkd_row_value?.expo_push_token))
    : []

  if (!dkd_target_rows_list_value.length) {
    await dkd_service_client_value.rpc('dkd_push_event_mark_sent', {
      dkd_param_queue_id: dkd_queue_id_value,
      dkd_param_send_status: 'failed',
      dkd_param_send_error: 'no_active_push_token',
    })
    return new Response(JSON.stringify({ ok: true, reason: 'no_active_push_token', queueId: dkd_queue_id_value }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const dkd_template_key_value = dkd_resolve_template_key_value(dkd_target_rows_list_value[0])
  const dkd_template_row_value = await dkd_fetch_notification_template_value(dkd_service_client_value, dkd_template_key_value)

  if (dkd_template_row_value && dkd_template_row_value.dkd_is_enabled === false) {
    await dkd_service_client_value.rpc('dkd_push_event_mark_sent', {
      dkd_param_queue_id: dkd_queue_id_value,
      dkd_param_send_status: 'skipped',
      dkd_param_send_error: 'template_disabled',
    })
    return new Response(JSON.stringify({ ok: true, reason: 'template_disabled', queueId: dkd_queue_id_value }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const dkd_unique_token_map_value = new Map<string, dkd_push_target_row>()
  for (const dkd_row_value of dkd_target_rows_list_value) {
    const dkd_token_value = dkd_safe_trim_text_value(dkd_row_value?.expo_push_token)
    if (!dkd_token_value || dkd_unique_token_map_value.has(dkd_token_value)) continue
    dkd_unique_token_map_value.set(dkd_token_value, dkd_row_value)
  }

  const dkd_message_rows_value: dkd_expo_message[] = Array.from(dkd_unique_token_map_value.values()).map((dkd_row_value) => {
    const dkd_scope_value = dkd_build_template_scope_value(dkd_row_value)
    const dkd_fallback_title_value = dkd_safe_trim_text_value(dkd_row_value?.dkd_title, 'Lootonia')
    const dkd_fallback_body_value = dkd_safe_trim_text_value(dkd_row_value?.dkd_body, 'Yeni bir bildirim var.')
    const dkd_template_title_value = dkd_safe_trim_text_value(dkd_template_row_value?.dkd_title, dkd_fallback_title_value)
    const dkd_template_body_value = dkd_safe_trim_text_value(dkd_template_row_value?.dkd_body, dkd_fallback_body_value)
    const dkd_route_value = dkd_safe_trim_text_value(
      dkd_template_row_value?.dkd_target_screen,
      dkd_safe_trim_text_value(dkd_row_value?.dkd_route || dkd_row_value?.dkd_target_screen, 'map'),
    )

    return {
      to: dkd_safe_trim_text_value(dkd_row_value?.expo_push_token),
      sound: 'default',
      title: dkd_apply_template_text_value(dkd_template_title_value, dkd_scope_value, dkd_fallback_title_value),
      body: dkd_apply_template_text_value(dkd_template_body_value, dkd_scope_value, dkd_fallback_body_value),
      channelId: 'lootonia-core',
      data: {
        route: dkd_route_value,
        targetScreen: dkd_route_value,
        dkd_queue_id: dkd_queue_id_value,
        dkd_event_key: dkd_row_value?.dkd_event_key || null,
        dkd_event_kind: dkd_row_value?.dkd_event_kind || null,
        dkd_template_key: dkd_template_key_value || null,
        ...(dkd_row_value?.dkd_payload || {}),
      },
    }
  })

  const dkd_expo_response_value = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
    },
    body: JSON.stringify(dkd_message_rows_value),
  })

  const dkd_expo_json_value = await dkd_expo_response_value.json().catch(() => ({})) as {
    data?: dkd_expo_ticket_row[]
  }

  const dkd_ticket_rows_value = Array.isArray(dkd_expo_json_value?.data) ? dkd_expo_json_value.data : []
  let dkd_sent_count_value = 0
  let dkd_failed_count_value = 0
  const dkd_error_list_value: string[] = []

  for (let dkd_index_value = 0; dkd_index_value < dkd_message_rows_value.length; dkd_index_value += 1) {
    const dkd_message_value = dkd_message_rows_value[dkd_index_value]
    const dkd_ticket_value = dkd_ticket_rows_value[dkd_index_value] || null
    const dkd_send_ok_value = dkd_ticket_value?.status === 'ok'

    if (dkd_send_ok_value) {
      dkd_sent_count_value += 1
      continue
    }

    dkd_failed_count_value += 1
    const dkd_error_message_value = dkd_safe_trim_text_value(
      dkd_ticket_value?.message
      || dkd_ticket_value?.details?.error
      || `expo_http_${dkd_expo_response_value.status}`,
    )

    if (dkd_error_message_value) {
      dkd_error_list_value.push(`${dkd_message_value.to}: ${dkd_error_message_value}`)
    }

    if (dkd_is_device_not_registered_error(dkd_ticket_value)) {
      await dkd_service_client_value
        .from('dkd_push_tokens')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('expo_push_token', dkd_message_value.to)
    }
  }

  await dkd_service_client_value.rpc('dkd_push_event_mark_sent', {
    dkd_param_queue_id: dkd_queue_id_value,
    dkd_param_send_status: dkd_sent_count_value > 0 ? 'sent' : 'failed',
    dkd_param_send_error: dkd_error_list_value.length ? dkd_error_list_value.slice(0, 3).join(' | ') : null,
  })

  return new Response(JSON.stringify({
    ok: dkd_sent_count_value > 0,
    queueId: dkd_queue_id_value,
    targetCount: dkd_message_rows_value.length,
    sentCount: dkd_sent_count_value,
    failedCount: dkd_failed_count_value,
    errors: dkd_error_list_value.slice(0, 5),
    dkd_template_key: dkd_template_key_value || null,
  }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

// dkd_force_bridge_redeploy_20260422_a
