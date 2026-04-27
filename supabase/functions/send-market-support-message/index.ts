const dkd_cors_headers_value = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

function dkd_json_response_value(dkd_body_value: Record<string, unknown>, dkd_status_value = 200) {
  return new Response(JSON.stringify(dkd_body_value), {
    status: dkd_status_value,
    headers: dkd_cors_headers_value,
  })
}

function dkd_parse_attachment_value(dkd_data_url_value: string, dkd_file_name_value: string, dkd_mime_type_value: string) {
  const dkd_match_value = String(dkd_data_url_value || '').match(/^data:(.+?);base64,(.+)$/)
  if (!dkd_match_value) return null
  return {
    filename: dkd_file_name_value || 'ekran-goruntusu.png',
    content: dkd_match_value[2],
    type: dkd_mime_type_value || dkd_match_value[1] || 'image/png',
  }
}

Deno.serve(async (dkd_request_value) => {
  if (dkd_request_value.method === 'OPTIONS') {
    return new Response('ok', { headers: dkd_cors_headers_value })
  }

  if (dkd_request_value.method !== 'POST') {
    return dkd_json_response_value({ ok: false, error: 'method_not_allowed' }, 405)
  }

  const dkd_resend_api_key_value = Deno.env.get('RESEND_API_KEY') || ''
  const dkd_support_to_value = Deno.env.get('DKD_SUPPORT_TO_EMAIL') || 'draborneagle@gmail.com'
  const dkd_support_from_value = Deno.env.get('DKD_SUPPORT_FROM_EMAIL') || 'Lootonia Support <onboarding@resend.dev>'

  if (!dkd_resend_api_key_value) {
    return dkd_json_response_value({ ok: false, error: 'support_email_secret_missing' }, 501)
  }

  const dkd_body_value = await dkd_request_value.json().catch(() => ({})) as {
    dkd_name?: string
    dkd_email?: string
    dkd_phone?: string
    dkd_subject?: string
    dkd_order_number?: string
    dkd_message?: string
    dkd_attachment_name?: string
    dkd_attachment_mime_type?: string
    dkd_attachment_data_url?: string
  }

  const dkd_name_value = String(dkd_body_value?.dkd_name || '').trim()
  const dkd_email_value = String(dkd_body_value?.dkd_email || '').trim()
  const dkd_phone_value = String(dkd_body_value?.dkd_phone || '').trim()
  const dkd_subject_value = String(dkd_body_value?.dkd_subject || '').trim()
  const dkd_order_number_value = String(dkd_body_value?.dkd_order_number || '').trim()
  const dkd_message_value = String(dkd_body_value?.dkd_message || '').trim()
  const dkd_attachment_name_value = String(dkd_body_value?.dkd_attachment_name || '').trim()
  const dkd_attachment_mime_type_value = String(dkd_body_value?.dkd_attachment_mime_type || '').trim()
  const dkd_attachment_data_url_value = String(dkd_body_value?.dkd_attachment_data_url || '').trim()

  if (dkd_name_value.length < 2 || dkd_email_value.length < 5 || dkd_subject_value.length < 3 || dkd_message_value.length < 5) {
    return dkd_json_response_value({ ok: false, error: 'invalid_payload' }, 400)
  }

  const dkd_attachment_value = dkd_attachment_data_url_value
    ? dkd_parse_attachment_value(dkd_attachment_data_url_value, dkd_attachment_name_value, dkd_attachment_mime_type_value)
    : null

  const dkd_email_payload_value: Record<string, unknown> = {
    from: dkd_support_from_value,
    to: [dkd_support_to_value],
    reply_to: dkd_email_value,
    subject: `[Lootonia Destek] ${dkd_subject_value}`,
    text: [
      `İsim Soyisim: ${dkd_name_value}`,
      `E-posta: ${dkd_email_value}`,
      `Telefon: ${dkd_phone_value || '—'}`,
      `Sipariş Numarası: ${dkd_order_number_value || '—'}`,
      `Ek Dosya: ${dkd_attachment_name_value || 'Yok'}`,
      '',
      dkd_message_value,
    ].join('\n'),
  }

  if (dkd_attachment_value) {
    dkd_email_payload_value.attachments = [dkd_attachment_value]
  }

  const dkd_resend_response_value = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${dkd_resend_api_key_value}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dkd_email_payload_value),
  })

  const dkd_resend_json_value = await dkd_resend_response_value.json().catch(() => ({})) as { id?: string; message?: string; error?: { message?: string } }

  if (!dkd_resend_response_value.ok) {
    return dkd_json_response_value({
      ok: false,
      error: dkd_resend_json_value?.error?.message || dkd_resend_json_value?.message || `resend_http_${dkd_resend_response_value.status}`,
    }, 502)
  }

  return dkd_json_response_value({
    ok: true,
    dkd_message_id: dkd_resend_json_value?.id || null,
    dkd_sent_to: dkd_support_to_value,
    dkd_attachment_sent: Boolean(dkd_attachment_value),
  })
})
