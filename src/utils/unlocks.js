import { normalizeProgression } from './progression';

export const FEATURE_GATES = {
  map: { level: 1, label: 'Harita' },
  collection: { level: 1, label: 'Koleksiyon' },
  leader: { level: 1, label: 'Liderlik' },
  tasks: { level: 1, label: 'Bolge Gorevleri' },
  market: { level: 3, label: 'Market Derinligi' },
  courier: { level: 10, label: 'Kurye Lisansi' },
  guild: { level: 12, label: 'Guild Sistemi' },
  sponsor: { level: 15, label: 'Premium Sponsor Gorevleri' },
  raid: { level: 20, label: 'Elite Boss Raid' },
};

export function getFeatureGate(key) {
  return FEATURE_GATES[String(key || '')] || null;
}

export function isFeatureUnlocked(profile, key) {
  const gate = getFeatureGate(key);
  if (!gate) return true;
  const prog = normalizeProgression(profile || {});
  return prog.level >= gate.level;
}

export function getUpcomingUnlocks(profile) {
  const prog = normalizeProgression(profile || {});
  return Object.entries(FEATURE_GATES)
    .map(([key, value]) => ({ key, ...value }))
    .filter((item) => item.level > prog.level)
    .sort((dkd_left_item, dkd_right_item) => dkd_left_item.level - dkd_right_item.level);
}
