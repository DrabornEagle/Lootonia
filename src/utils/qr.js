export function isUuid(dkd_value) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(String(dkd_value || ''));
}

export function parseQr(text) {
  const raw = String(text || '').trim();
  const normalized = raw.includes('?') ? raw.split('?').slice(1).join('?') : raw;
  const qs = {};
  normalized.split('&').forEach((pair) => {
    const [k, dkd_value] = pair.split('=');
    if (!k || dkd_value == null) return;
    qs[k.trim().toLowerCase()] = String(dkd_value).trim();
  });

  const dropId = qs.drop_id || qs.id || qs.drop || null;
  const secret = qs.secret || qs.qr_secret || qs.s || null;

  if (dropId && isUuid(dropId)) return { dropId, secret };
  return null;
}
