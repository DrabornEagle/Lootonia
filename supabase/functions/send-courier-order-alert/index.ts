import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type dkd_courier_job_record = {
  id?: number
  title?: string | null
  job_type?: string | null
  status?: string | null
  merchant_name?: string | null
  product_title?: string | null
  pickup?: string | null
  dropoff?: string | null
  cargo_shipment_id?: number | null
  order_id?: string | null
  assigned_user_id?: string | null
  is_active?: boolean | null
}

type dkd_webhook_payload = {
  type?: string
  table?: string
  schema?: string
  record?: dkd_courier_job_record | null
  new?: dkd_courier_job_record | null
  old_record?: dkd_courier_job_record | null
  old?: dkd_courier_job_record | null
}

type dkd_push_row = {
  user_id?: string | null
  expo_push_token?: string | null
  dkd_push_segment?: string | null
}

type dkd_expo_message = {
  to: string
  sound: 'default'
  title: string
  body: string
  channelId: string
  data: Record<string, unknown>
}

function dkd_chunk_items<T>(dkd_items_value: T[], dkd_size_value = 100): T[][] {
  const dkd_out_value: T[][] = []
  for (let dkd_index_value = 0; dkd_index_value < dkd_items_value.length; dkd_index_value += dkd_size_value) {
    dkd_out_value.push(dkd_items_value.slice(dkd_index_value, dkd_index_value + dkd_size_value))
  }
  return dkd_out_value
}

function dkd_normalize_job_record(dkd_payload_value: dkd_webhook_payload): dkd_courier_job_record {
  return dkd_payload_value?.record || dkd_payload_value?.new || {}
}

function dkd_is_job_eligible(dkd_job_value: dkd_courier_job_record): boolean {
  const dkd_status_value = String(dkd_job_value?.status || '').trim().toLowerCase()
  const dkd_job_type_value = String(dkd_job_value?.job_type || '').trim().toLowerCase()
  const dkd_is_active_value = dkd_job_value?.is_active !== false
  const dkd_is_unassigned_value = !dkd_job_value?.assigned_user_id
  return (
    Number.isFinite(Number(dkd_job_value?.id || 0))
    && dkd_is_active_value
    && dkd_is_unassigned_value
    && dkd_status_value === 'open'
    && (dkd_job_type_value === 'cargo' || dkd_job_type_value === 'merchant')
  )
}

function dkd_build_courier_message(
  dkd_job_value: dkd_courier_job_record,
  dkd_job_id_value: number,
): { title: string; body: string; data: Record<string, unknown> } {
  const dkd_job_type_value = String(dkd_job_value?.job_type || '').trim().toLowerCase()
  const dkd_merchant_name_value = String(dkd_job_value?.merchant_name || '').trim()
  const dkd_product_title_value = String(dkd_job_value?.product_title || '').trim()
  const dkd_pickup_value = String(dkd_job_value?.pickup || '').trim()
  const dkd_dropoff_value = String(dkd_job_value?.dropoff || '').trim()

  if (dkd_job_type_value === 'cargo') {
    return {
      title: 'Yeni Kargo Siparişi',
      body: [dkd_pickup_value || dkd_merchant_name_value || 'Kurye-Kargo', dkd_dropoff_value || 'Teslimat rotası hazır']
        .filter(Boolean)
        .join(' • '),
      data: {
        route: 'courier',
        targetScreen: 'courier',
        jobId: dkd_job_id_value,
        jobType: 'cargo',
        cargoShipmentId: dkd_job_value?.cargo_shipment_id || null,
        orderId: dkd_job_value?.order_id || null,
        dkd_push_segment: 'courier_licensed',
      },
    }
  }

  return {
    title: 'Yeni İşletme Siparişi',
    body: [dkd_merchant_name_value || 'İşletme', dkd_product_title_value || 'Yeni sipariş kurye havuzunda']
      .filter(Boolean)
      .join(' • '),
    data: {
      route: 'courier',
      targetScreen: 'courier',
      jobId: dkd_job_id_value,
      jobType: 'merchant',
      cargoShipmentId: dkd_job_value?.cargo_shipment_id || null,
      orderId: dkd_job_value?.order_id || null,
      dkd_push_segment: 'courier_licensed',
    },
  }
}

function dkd_build_invite_message(
  dkd_job_value: dkd_courier_job_record,
  dkd_job_id_value: number,
): { title: string; body: string; data: Record<string, unknown> } {
  return {
    title: 'Yeni Siparişler Var',
    body: 'Ücretsiz Kurye OL hemen kazanmaya başla',
    data: {
      route: 'courier',
      targetScreen: 'courier',
      jobId: dkd_job_id_value,
      jobType: String(dkd_job_value?.job_type || '').trim().toLowerCase() || null,
      cargoShipmentId: dkd_job_value?.cargo_shipment_id || null,
      orderId: dkd_job_value?.order_id || null,
      dkd_push_segment: 'courier_invite',
    },
  }
}

function dkd_build_message_for_segment(
  dkd_job_value: dkd_courier_job_record,
  dkd_job_id_value: number,
  dkd_push_segment_value: string,
): { title: string; body: string; data: Record<string, unknown> } {
  if (dkd_push_segment_value === 'courier_invite') {
    return dkd_build_invite_message(dkd_job_value, dkd_job_id_value)
  }
  return dkd_build_courier_message(dkd_job_value, dkd_job_id_value)
}

Deno.serve(async (dkd_request_value) => {
  if (dkd_request_value.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405 })
  }

  const dkd_supabase_url_value = Deno.env.get('SUPABASE_URL')
  const dkd_supabase_service_role_key_value = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const dkd_webhook_secret_value = Deno.env.get('DKD_COURIER_WEBHOOK_SECRET')
  const dkd_request_secret_value = dkd_request_value.headers.get('x-dkd-webhook-secret') || ''

  if (!dkd_supabase_url_value || !dkd_supabase_service_role_key_value) {
    return new Response(JSON.stringify({ error: 'missing_function_env' }), { status: 500 })
  }

  if (!dkd_webhook_secret_value || dkd_request_secret_value !== dkd_webhook_secret_value) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
  }

  const dkd_payload_value = await dkd_request_value.json().catch(() => ({})) as dkd_webhook_payload
  const dkd_job_value = dkd_normalize_job_record(dkd_payload_value)

  if (!dkd_is_job_eligible(dkd_job_value)) {
    return new Response(JSON.stringify({ ok: true, reason: 'noop_not_eligible' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const dkd_job_id_value = Number(dkd_job_value?.id || 0)
  const dkd_job_status_value = String(dkd_job_value?.status || 'open').trim().toLowerCase()
  const dkd_job_type_value = String(dkd_job_value?.job_type || '').trim().toLowerCase()

  const dkd_service_client_value = createClient(dkd_supabase_url_value, dkd_supabase_service_role_key_value)

  const { data: dkd_existing_audit_value } = await dkd_service_client_value
    .from('dkd_courier_push_audit')
    .select('id')
    .eq('job_id', dkd_job_id_value)
    .eq('job_status', dkd_job_status_value)
    .limit(1)

  if (Array.isArray(dkd_existing_audit_value) && dkd_existing_audit_value.length > 0) {
    return new Response(JSON.stringify({ ok: true, reason: 'noop_already_sent', jobId: dkd_job_id_value }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { data: dkd_push_rows_value, error: dkd_push_rows_error_value } = await dkd_service_client_value.rpc('dkd_courier_job_push_target_tokens')

  if (dkd_push_rows_error_value) {
    return new Response(JSON.stringify({ error: dkd_push_rows_error_value.message || 'token_list_failed' }), { status: 500 })
  }

  const dkd_unique_target_map_value = new Map<string, { user_id: string; dkd_push_segment: string }>()
  for (const dkd_row_value of (dkd_push_rows_value || []) as dkd_push_row[]) {
    const dkd_token_value = String(dkd_row_value?.expo_push_token || '').trim()
    const dkd_user_id_value = String(dkd_row_value?.user_id || '').trim()
    const dkd_push_segment_value = String(dkd_row_value?.dkd_push_segment || 'courier_licensed').trim() || 'courier_licensed'
    if (dkd_token_value) {
      dkd_unique_target_map_value.set(dkd_token_value, {
        user_id: dkd_user_id_value,
        dkd_push_segment: dkd_push_segment_value,
      })
    }
  }

  const dkd_target_entries_value = Array.from(dkd_unique_target_map_value.entries()).map(([dkd_token_value, dkd_meta_value]) => ({
    dkd_token_value,
    dkd_user_id_value: dkd_meta_value.user_id,
    dkd_push_segment_value: dkd_meta_value.dkd_push_segment,
  }))

  if (!dkd_target_entries_value.length) {
    return new Response(JSON.stringify({ ok: true, reason: 'noop_no_targets', jobId: dkd_job_id_value }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const dkd_audit_seed_rows_value = dkd_target_entries_value.map((dkd_target_value) => ({
    job_id: dkd_job_id_value,
    job_status: dkd_job_status_value,
    job_type: dkd_job_type_value,
    user_id: dkd_target_value.dkd_user_id_value || null,
    expo_push_token: dkd_target_value.dkd_token_value,
    dkd_push_segment: dkd_target_value.dkd_push_segment_value,
    send_status: 'pending',
  }))

  await dkd_service_client_value
    .from('dkd_courier_push_audit')
    .insert(dkd_audit_seed_rows_value)

  const dkd_message_rows_value: dkd_expo_message[] = dkd_target_entries_value.map((dkd_target_value) => {
    const dkd_message_value = dkd_build_message_for_segment(
      dkd_job_value,
      dkd_job_id_value,
      dkd_target_value.dkd_push_segment_value,
    )
    return {
      to: dkd_target_value.dkd_token_value,
      sound: 'default',
      title: dkd_message_value.title,
      body: dkd_message_value.body,
      channelId: 'lootonia-core',
      data: {
        ...dkd_message_value.data,
        dkd_push_segment: dkd_target_value.dkd_push_segment_value,
      },
    }
  })

  let dkd_sent_count_value = 0
  let dkd_failed_count_value = 0
  let dkd_last_error_value: string | null = null

  for (const dkd_message_pack_value of dkd_chunk_items(dkd_message_rows_value, 100)) {
    const dkd_expo_response_value = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
      },
      body: JSON.stringify(dkd_message_pack_value),
    })

    const dkd_expo_json_value = await dkd_expo_response_value.json().catch(() => ({})) as {
      data?: Array<{ status?: string; message?: string }>
    }

    const dkd_result_rows_value = Array.isArray(dkd_expo_json_value?.data) ? dkd_expo_json_value.data : []

    if (!dkd_result_rows_value.length) {
      dkd_failed_count_value += dkd_message_pack_value.length
      dkd_last_error_value = `expo_http_${dkd_expo_response_value.status}`
      continue
    }

    for (let dkd_index_value = 0; dkd_index_value < dkd_result_rows_value.length; dkd_index_value += 1) {
      const dkd_result_value = dkd_result_rows_value[dkd_index_value]
      const dkd_message_value = dkd_message_pack_value[dkd_index_value]
      const dkd_send_ok_value = dkd_result_value?.status === 'ok'
      if (dkd_send_ok_value) {
        dkd_sent_count_value += 1
      } else {
        dkd_failed_count_value += 1
        if (dkd_result_value?.message) {
          dkd_last_error_value = dkd_result_value.message
        }
      }

      await dkd_service_client_value
        .from('dkd_courier_push_audit')
        .update({
          send_status: dkd_send_ok_value ? 'sent' : 'failed',
          send_error: dkd_send_ok_value ? null : (dkd_result_value?.message || `expo_http_${dkd_expo_response_value.status}`),
          sent_at: new Date().toISOString(),
        })
        .eq('job_id', dkd_job_id_value)
        .eq('job_status', dkd_job_status_value)
        .eq('expo_push_token', dkd_message_value.to)
    }
  }

  return new Response(JSON.stringify({
    ok: true,
    jobId: dkd_job_id_value,
    targetCount: dkd_target_entries_value.length,
    sentCount: dkd_sent_count_value,
    failedCount: dkd_failed_count_value,
    lastError: dkd_last_error_value,
  }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
