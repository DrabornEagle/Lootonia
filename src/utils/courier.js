export const COURIER_MIN_LEVEL = 10;

export const COURIER_STATUS_META = {
  none: {
    key: 'none',
    label: 'Basvuru Bekliyor',
    shortLabel: 'Hazir',
    toneBg: 'rgba(255,255,255,0.08)',
    toneText: '#FFFFFF',
  },
  pending: {
    key: 'pending',
    label: 'Basvuru Incelemede',
    shortLabel: 'Pending',
    toneBg: 'rgba(255,193,7,0.18)',
    toneText: '#FFE9A8',
  },
  approved: {
    key: 'approved',
    label: 'Kurye Lisansi Aktif',
    shortLabel: 'Kurye Onaylı',
    toneBg: 'rgba(33,212,253,0.18)',
    toneText: '#DFF8FF',
  },
  rejected: {
    key: 'rejected',
    label: 'Basvuru Reddedildi',
    shortLabel: 'Red',
    toneBg: 'rgba(255,99,132,0.16)',
    toneText: '#FFD7E0',
  },
  suspended: {
    key: 'suspended',
    label: 'Kurye Hesabi Askida',
    shortLabel: 'Askida',
    toneBg: 'rgba(255,99,132,0.16)',
    toneText: '#FFD7E0',
  },
};

export function getCourierMeta(profile) {
  const level = Math.max(1, Number(profile?.level || 1));
  const status = String(profile?.courier_status || 'none');
  const score = Math.max(0, Number(profile?.courier_score || 0));
  const completed = Math.max(0, Number(profile?.courier_completed_jobs || 0));

  const base = COURIER_STATUS_META[status] || COURIER_STATUS_META.none;
  const unlockedByLevel = level >= COURIER_MIN_LEVEL;

  if (!unlockedByLevel) {
    return {
      status: 'locked',
      level,
      score,
      completed,
      unlockedByLevel: false,
      label: `Lvl ${COURIER_MIN_LEVEL} ile acilir`,
      shortLabel: 'Kilitli',
      description: `Kurye lisansi icin en az Lvl ${COURIER_MIN_LEVEL} olmalisin.`,
      toneBg: 'rgba(255,255,255,0.08)',
      toneText: '#FFFFFF',
    };
  }

  let description = 'Kurye gorevleri yakinda acilacak.';
  if (status === 'pending') description = 'Basvurun admin incelemesinde.';
  if (status === 'approved') description = 'Kurye lisansin aktif. Gorev sistemi bir sonraki fazda baglanacak.';
  if (status === 'rejected') description = 'Basvuru reddedildi. Sonraki fazda yeniden basvuru akisi eklenecek.';
  if (status === 'suspended') description = 'Kurye hesabin gecici olarak askida.';
  if (status === 'none') description = 'Kurye lisansi icin uygunsun. Basvuru ekrani bir sonraki fazda gelecek.';

  return {
    status,
    level,
    score,
    completed,
    unlockedByLevel: true,
    label: base.label,
    shortLabel: base.shortLabel,
    description,
    toneBg: base.toneBg,
    toneText: base.toneText,
  };
}
