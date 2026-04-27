import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type PushMessage = {
  to: string
  sound: 'default'
  title: string
  body: string
  data?: Record<string, unknown>
  channelId?: string
}

function chunk<T>(items: T[], size = 100): T[][] {
  const out: T[][] = []
  for (let dkd_index_value = 0; dkd_index_value < items.length; dkd_index_value += size) out.push(items.slice(dkd_index_value, dkd_index_value + size))
  return out
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(JSON.stringify({ error: 'supabase_function_env_missing' }), { status: 500 })
  }

  const authHeader = req.headers.get('Authorization') || ''
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const body = await req.json().catch(() => ({})) as {
    title?: string
    body?: string
    senderName?: string
    audience?: string
    targetScreen?: string
  }

  const title = String(body?.title || '').trim()
  const message = String(body?.body || '').trim()
  const senderName = String(body?.senderName || 'DrabornEagle').trim() || 'DrabornEagle'
  const audience = String(body?.audience || 'everyone').trim().toLowerCase() || 'everyone'
  const targetScreen = String(body?.targetScreen || 'map').trim().toLowerCase() || 'map'

  if (title.length < 3 || message.length < 3) {
    return new Response(JSON.stringify({ error: 'invalid_payload' }), { status: 400 })
  }

  const { data: queuedId, error: queueError } = await client.rpc('dkd_admin_queue_broadcast', {
    dkd_param_title: title,
    dkd_param_body: message,
    dkd_param_sender_name: senderName,
    dkd_param_audience: audience,
    dkd_param_target_screen: targetScreen,
  })

  if (queueError) {
    return new Response(JSON.stringify({ error: queueError.message || 'queue_failed' }), { status: 403 })
  }

  const { data: tokenRows, error: tokenError } = await client.rpc('dkd_admin_list_active_push_tokens', {
    dkd_param_audience: audience,
  })
  if (tokenError) {
    return new Response(JSON.stringify({ error: tokenError.message || 'token_list_failed' }), { status: 403 })
  }

  const tokens = Array.from(new Set((tokenRows || []).map((row: { expo_push_token?: string }) => row?.expo_push_token).filter(Boolean))) as string[]

  if (!tokens.length) {
    await client.rpc('dkd_admin_complete_broadcast', {
      dkd_param_broadcast_id: queuedId,
      dkd_param_total_targets: 0,
      dkd_param_total_sent: 0,
      dkd_param_total_failed: 0,
      dkd_param_last_error: null,
    })

    return new Response(JSON.stringify({ ok: true, broadcastId: queuedId, targetCount: 0, sentCount: 0, failedCount: 0 }))
  }

  const messages: PushMessage[] = tokens.map((token) => ({
    to: token,
    sound: 'default',
    title: senderName,
    body: `${title} • ${message}`,
    channelId: 'lootonia-core',
    data: {
      senderName,
      title,
      body: message,
      audience,
      targetScreen,
      route: targetScreen,
      deepLink: `lootonia://${targetScreen}`,
      broadcastId: queuedId,
    },
  }))

  let sentCount = 0
  let failedCount = 0
  let lastError: string | null = null

  for (const pack of chunk(messages, 100)) {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
      },
      body: JSON.stringify(pack),
    })

    const json = await res.json().catch(() => ({})) as { data?: Array<{ status?: string; message?: string }> }
    const rows = Array.isArray(json?.data) ? json.data : []

    rows.forEach((row) => {
      if (row?.status === 'ok') sentCount += 1
      else {
        failedCount += 1
        if (row?.message) lastError = row.message
      }
    })

    if (!rows.length) {
      failedCount += pack.length
      lastError = `expo_http_${res.status}`
    }
  }

  await client.rpc('dkd_admin_complete_broadcast', {
    dkd_param_broadcast_id: queuedId,
    dkd_param_total_targets: tokens.length,
    dkd_param_total_sent: sentCount,
    dkd_param_total_failed: failedCount,
    dkd_param_last_error: lastError,
  })

  return new Response(JSON.stringify({
    ok: true,
    broadcastId: queuedId,
    targetCount: tokens.length,
    sentCount,
    failedCount,
    lastError,
    audience,
    targetScreen,
  }), { headers: { 'Content-Type': 'application/json' } })
})
