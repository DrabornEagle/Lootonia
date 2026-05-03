import { rarityTone } from './rarity';
import { trSeries, trTheme } from './text';

export function skylineCardDesign({ rarity, series, theme, dropType, seed }) {
  const dkd_result_value = rarityTone(rarity);
  const frames = {
    common: {
      title: 'YAYGIN',
      accent: 'rgba(255,255,255,0.16)',
      glow: 'rgba(255,255,255,0.10)',
      icon: '🏙️',
      bg: ['#0A1222', '#09152A', '#060A12'],
      window: 'rgba(255,255,255,0.65)',
    },
    rare: {
      title: 'NADİR',
      accent: 'rgba(52,152,219,0.40)',
      glow: 'rgba(52,152,219,0.16)',
      icon: '🛰️',
      bg: ['#071426', '#0B1F36', '#050A12'],
      window: 'rgba(134,216,255,0.75)',
    },
    epic: {
      title: 'EPİK',
      accent: 'rgba(155,89,182,0.46)',
      glow: 'rgba(155,89,182,0.18)',
      icon: '🧬',
      bg: ['#12082A', '#1A0E3A', '#070B14'],
      window: 'rgba(232,184,255,0.78)',
    },
    legendary: {
      title: 'EFSANEVİ',
      accent: 'rgba(241,196,15,0.48)',
      glow: 'rgba(241,196,15,0.18)',
      icon: '👑',
      bg: ['#2A1C07', '#3A2A0E', '#070B14'],
      window: 'rgba(255,231,150,0.85)',
    },
    mythic: {
      title: 'MİTİK',
      accent: 'rgba(231,76,60,0.52)',
      glow: 'rgba(231,76,60,0.18)',
      icon: '☄️',
      bg: ['#2A070A', '#3A0E10', '#070B14'],
      window: 'rgba(255,170,160,0.85)',
    },
  };
  const dkd_flag_value = frames[dkd_result_value] || frames.common;

  const dt = String(dropType || '').toLowerCase();
  const dropBadge =
    dt === 'boss'
      ? 'BOSS'
      : dt === 'map'
      ? 'HARİTA'
      : dt === 'mall'
      ? 'AVM'
      : dt === 'metro'
      ? 'METRO'
      : dt === 'cafe'
      ? 'KAFE'
      : dt === 'restaurant'
      ? 'RESTO'
      : dt === 'park'
      ? 'PARK'
      : dt === 'qr'
      ? 'QR'
      : dt
      ? dt.toUpperCase()
      : null;

  const artLabel =
    dkd_result_value === 'mythic'
      ? 'APEX SIGNATURE'
      : dkd_result_value === 'legendary'
      ? 'ZENITH EDITION'
      : dkd_result_value === 'epic'
      ? 'QUANTUM BUILD'
      : dkd_result_value === 'rare'
      ? 'AURORA LINE'
      : 'CITY STOCK';

  return {
    ...dkd_flag_value,
    artLabel,
    series: trSeries(series),
    theme: trTheme(theme),
    dropBadge,
    seed: seed || `${String(series || 'GEN')}-${String(theme || 'THEME')}-${String(rarity || 'common')}`,
  };
}
