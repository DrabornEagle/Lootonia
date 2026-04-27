export function rarityTone(dkd_result_value) {
  const dkd_numeric_value = String(dkd_result_value || '').toLowerCase();
  if (dkd_numeric_value === 'mythic') return 'mythic';
  if (dkd_numeric_value === 'legendary') return 'legendary';
  if (dkd_numeric_value === 'epic') return 'epic';
  if (dkd_numeric_value === 'rare') return 'rare';
  return 'common';
}

export function toneColors(tone) {
  switch (tone) {
    case 'mythic':
      return { bg: 'rgba(231,76,60,0.16)', bd: 'rgba(231,76,60,0.30)' };
    case 'legendary':
      return { bg: 'rgba(241,196,15,0.16)', bd: 'rgba(241,196,15,0.30)' };
    case 'epic':
      return { bg: 'rgba(155,89,182,0.16)', bd: 'rgba(155,89,182,0.30)' };
    case 'rare':
      return { bg: 'rgba(52,152,219,0.16)', bd: 'rgba(52,152,219,0.30)' };
    case 'cooldown':
      return { bg: 'rgba(155,89,182,0.16)', bd: 'rgba(155,89,182,0.28)' };
    case 'warn':
      return { bg: 'rgba(241,196,15,0.16)', bd: 'rgba(241,196,15,0.28)' };
    case 'good':
      return { bg: 'rgba(46,204,113,0.16)', bd: 'rgba(46,204,113,0.28)' };
    default:
      return { bg: 'rgba(255,255,255,0.10)', bd: 'rgba(255,255,255,0.14)' };
  }
}
