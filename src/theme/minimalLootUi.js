const colors = {
  bg: '#030712',
  bgSoft: '#081122',
  panel: 'rgba(8, 15, 30, 0.97)',
  panel2: 'rgba(11, 21, 40, 0.97)',
  panel3: 'rgba(15, 28, 54, 0.97)',
  line: 'rgba(255,255,255,0.10)',
  lineStrong: 'rgba(255,255,255,0.22)',
  text: '#F7FAFF',
  soft: 'rgba(247,250,255,0.78)',
  textSoft: 'rgba(247,250,255,0.78)',
  muted: 'rgba(247,250,255,0.54)',
  textMuted: 'rgba(247,250,255,0.54)',
  cyan: '#67DBFF',
  cyanSoft: '#C6F2FF',
  cyanDeep: '#2E8FFF',
  blue: '#2E8FFF',
  gold: '#F6CD67',
  goldDeep: '#FFAA38',
  goldSoft: '#FFE8A9',
  green: '#52D8A7',
  purple: '#AA88FF',
  red: '#FF8E97',
};

export const minimalLootUi = {
  ...colors,
  colors,
  radius: {
    xl: 28,
    lg: 22,
    md: 18,
    sm: 14,
    pill: 999,
  },
};

export function formatNum(value) {
  return Number(value || 0).toLocaleString('tr-TR');
}

export function rarityAccent(rarity) {
  const key = String(rarity || 'common').toLowerCase();
  if (key === 'mythic') {
    return {
      label: 'MİTİK',
      text: '#FFD4DF',
      color: '#FF6FA7',
      bg: 'rgba(255,111,167,0.13)',
      border: 'rgba(255,111,167,0.30)',
      gradient: ['#421224', '#1B0B16'],
    };
  }
  if (key === 'legendary') {
    return {
      label: 'EFSANEVİ',
      text: '#FFF0C9',
      color: '#F6CD67',
      bg: 'rgba(246,205,103,0.16)',
      border: 'rgba(246,205,103,0.34)',
      gradient: ['#3D2908', '#1B1108'],
    };
  }
  if (key === 'epic') {
    return {
      label: 'EPİK',
      text: '#EEE6FF',
      color: '#AA88FF',
      bg: 'rgba(170,136,255,0.16)',
      border: 'rgba(170,136,255,0.30)',
      gradient: ['#2A1946', '#130D24'],
    };
  }
  if (key === 'rare') {
    return {
      label: 'NADİR',
      text: '#DCF8FF',
      color: '#67DBFF',
      bg: 'rgba(103,219,255,0.16)',
      border: 'rgba(103,219,255,0.30)',
      gradient: ['#103A4D', '#0A1524'],
    };
  }
  return {
    label: 'YAYGIN',
    text: '#EEF4FF',
    color: '#C6D5E5',
    bg: 'rgba(255,255,255,0.06)',
    border: 'rgba(255,255,255,0.12)',
    gradient: ['#182331', '#0D1420'],
  };
}

export function dropAccent(drop = {}) {
  const type = String(drop?.type || '').toLowerCase();
  const name = String(drop?.name || '').toLowerCase();

  if (type === 'boss' || type.includes('boss')) {
    return { icon: 'crown-outline', tone: 'boss', title: 'Boss', color: '#F6CD67', bg: 'rgba(246,205,103,0.16)', border: 'rgba(246,205,103,0.30)' };
  }
  if (type === 'qr') {
    return { icon: 'qrcode-scan', tone: 'qr', title: 'QR', color: '#67DBFF', bg: 'rgba(103,219,255,0.16)', border: 'rgba(103,219,255,0.30)' };
  }
  if (name.includes('metro')) {
    return { icon: 'train', tone: 'metro', title: 'Metro', color: '#8DCCFF', bg: 'rgba(141,204,255,0.14)', border: 'rgba(141,204,255,0.28)' };
  }
  if (name.includes('park')) {
    return { icon: 'tree-outline', tone: 'park', title: 'Park', color: '#52D8A7', bg: 'rgba(82,216,167,0.14)', border: 'rgba(82,216,167,0.28)' };
  }
  if (name.includes('cafe') || name.includes('kafe')) {
    return { icon: 'coffee-outline', tone: 'cafe', title: 'Cafe', color: '#F6CD67', bg: 'rgba(246,205,103,0.14)', border: 'rgba(246,205,103,0.28)' };
  }
  return { icon: 'treasure-chest-outline', tone: 'drop', title: 'Drop', color: '#AA88FF', bg: 'rgba(170,136,255,0.14)', border: 'rgba(170,136,255,0.28)' };
}

export function cardFromEntry(entry = {}) {
  if (entry?.card) {
    return {
      ...entry.card,
      art_image_url: entry?.card?.art_image_url || entry?.card_art_image_url || '',
      serial_code: entry?.card?.serial_code || entry?.card_serial_code || '',
    };
  }
  return {
    name: entry?.card_name,
    series: entry?.card_series,
    rarity: entry?.card_rarity,
    theme: entry?.card_theme,
    art_image_url: entry?.card_art_image_url,
    serial_code: entry?.card_serial_code,
  };
}

export function clampPct(value) {
  return Math.max(0, Math.min(100, Number(value || 0)));
}
