export const neoArcadeTheme = {
  colors: {
    bg: '#040816',
    bg2: '#071226',
    bg3: '#0A1630',
    panel: 'rgba(10, 18, 34, 0.88)',
    panelStrong: 'rgba(11, 22, 42, 0.96)',
    panelSoft: 'rgba(255,255,255,0.05)',
    panelGlass: 'rgba(7, 14, 28, 0.78)',
    line: 'rgba(255,255,255,0.10)',
    lineStrong: 'rgba(255,255,255,0.18)',
    text: '#F4F8FF',
    textSoft: 'rgba(244,248,255,0.78)',
    textMute: 'rgba(244,248,255,0.56)',
    cyan: '#71E6FF',
    cyan2: '#4FA3FF',
    gold: '#FFCC73',
    gold2: '#FF9E37',
    green: '#63E2AE',
    purple: '#A08CFF',
    danger: '#FF7B97',
    success: '#63E2AE',
    shadow: '#000000',
  },
  gradients: {
    page: ['#040816', '#071226', '#091126'],
    panel: ['rgba(11, 22, 42, 0.96)', 'rgba(8, 16, 31, 0.96)'],
    card: ['rgba(14, 27, 50, 0.98)', 'rgba(9, 17, 33, 0.98)'],
    cyan: ['#71E6FF', '#4FA3FF'],
    gold: ['#FFD886', '#FF9E37'],
    purple: ['#C0AAFF', '#7C77FF'],
    success: ['#63E2AE', '#34C48D'],
    boss: ['#FFCC73', '#A08CFF'],
    navActive: ['rgba(255, 204, 115, 0.28)', 'rgba(113, 230, 255, 0.18)'],
    xp: ['#71E6FF', '#4FA3FF', '#A08CFF'],
  },
  radius: {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 30,
    pill: 999,
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 18,
    xl: 22,
    xxl: 28,
  },
};

export function formatCompact(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return '0';
  if (Math.abs(num) >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString('tr-TR');
}
