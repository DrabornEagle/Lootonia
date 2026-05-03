import { NEARBY_FILTER_METERS } from '../constants/game';

export const clamp = (dkd_iteration_value, min, max) => Math.max(min, Math.min(max, dkd_iteration_value));

export function toRad(dkd_numeric_value) {
  return (dkd_numeric_value * Math.PI) / 180;
}

export function haversineMeters(lat1, lon1, lat2, lon2) {
  const dkd_earth_radius = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const dkd_left_value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return dkd_earth_radius * (2 * Math.atan2(Math.sqrt(dkd_left_value), Math.sqrt(1 - dkd_left_value)));
}

export function getDropVisual(drop = {}) {
  const type = String(drop?.type || '').toLowerCase();
  const name = String(drop?.name || '').toLowerCase();

  if (type === 'boss') return { icon: '👑', tag: 'BOSS', color: '#F7C948', bg: ['#7C2D12', '#F59E0B'], ring: 'rgba(245,158,11,0.40)' };
  if (type === 'qr') return { icon: '⌘', tag: 'QR', color: '#67E8F9', bg: ['#0F766E', '#22D3EE'], ring: 'rgba(34,211,238,0.34)' };
  if (name.includes('metro')) return { icon: '🚇', tag: 'METRO', color: '#7DD3FC', bg: ['#1D4ED8', '#38BDF8'], ring: 'rgba(56,189,248,0.34)' };
  if (name.includes('kafe') || name.includes('cafe')) return { icon: '☕', tag: 'KAFE', color: '#FDBA74', bg: ['#9A3412', '#FB923C'], ring: 'rgba(251,146,60,0.34)' };
  if (name.includes('park')) return { icon: '🌳', tag: 'PARK', color: '#86EFAC', bg: ['#166534', '#4ADE80'], ring: 'rgba(74,222,128,0.32)' };
  if (name.includes('avm') || name.includes('market') || name.includes('alışveriş')) return { icon: '🛍️', tag: 'AVM', color: '#C4B5FD', bg: ['#6D28D9', '#A78BFA'], ring: 'rgba(167,139,250,0.32)' };
  if (name.includes('hastane')) return { icon: '🏥', tag: 'HASTANE', color: '#FDA4AF', bg: ['#BE123C', '#FB7185'], ring: 'rgba(251,113,133,0.32)' };
  if (name.includes('restaurant') || name.includes('restoran')) return { icon: '🍽️', tag: 'RESTO', color: '#FDBA74', bg: ['#C2410C', '#FB923C'], ring: 'rgba(251,146,60,0.32)' };
  return { icon: type === 'map' ? '✦' : '⬢', tag: type === 'map' ? 'HARİTA' : 'DROP', color: '#E2E8F0', bg: ['#1F2937', '#94A3B8'], ring: 'rgba(148,163,184,0.30)' };
}

export function getDropDistanceState(near) {
  const dist = near?.distance;
  if (near?.ok) return { label: 'Ulaştın', tone: 'good' };
  if (dist == null) return { label: 'Mesafe yok', tone: 'default' };
  if (dist <= 140) return { label: 'Çok yakın', tone: 'good' };
  if (dist <= 350) return { label: 'Yaklaşıyorsun', tone: 'warn' };
  return { label: 'Uzak', tone: 'default' };
}

export function isNearbyCandidate(drop, near) {
  const dist = Number(near?.distance ?? Number.MAX_SAFE_INTEGER);
  const radius = Number(drop?.radius_m || 0);
  if (near?.ok) return true;
  if (!Number.isFinite(dist)) return false;
  return dist <= Math.max(NEARBY_FILTER_METERS, radius * 4);
}

export function etaTextFromDistance(distance) {
  if (distance == null || !Number.isFinite(Number(distance))) return 'Varış —';

  // Şehir içi araç varsayımı:
  // ortalama 32 km/s -> yaklaşık 533 metre / dakika.
  const mins = Math.max(1, Math.round(Number(distance) / 533));
  return mins >= 60
    ? `Varış ${Math.floor(mins / 60)}s ${mins % 60}d`
    : `Varış ${mins} dk`;
}

export function getDropPriority(drop, near, cooldown) {
  const dist = near?.distance ?? 999999;
  const type = String(drop?.type || '').toLowerCase();
  let score = 0;

  if (near?.ok) score += 150;
  if (dist <= 80) score += 60;
  else if (dist <= 160) score += 42;
  else if (dist <= 320) score += 24;
  else score += Math.max(0, 18 - Math.round(dist / 250));

  if (!cooldown?.isCooldown) score += 36;
  if (type === 'boss') score += 22;
  if (type === 'qr') score += 12;
  if (String(drop?.status || '').toLowerCase() === 'active') score += 8;

  return score;
}
