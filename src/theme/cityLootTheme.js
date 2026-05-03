export const cityLootTheme = {
  colors: {
    bgTop: '#06101D',
    bgMid: '#091525',
    bgBottom: '#03070D',
    panel: 'rgba(10, 18, 31, 0.96)',
    panelSoft: 'rgba(255,255,255,0.048)',
    panelStrong: 'rgba(255,255,255,0.088)',
    panelBorder: 'rgba(255,255,255,0.11)',
    text: '#F7FAFF',
    textSoft: 'rgba(247,250,255,0.76)',
    textMuted: 'rgba(247,250,255,0.52)',
    cyan: '#67DBFF',
    cyanSoft: '#C6F2FF',
    cyanDeep: '#2E8FFF',
    gold: '#F6CD67',
    goldStrong: '#FFAA38',
    goldSoft: '#FFE8A9',
    purple: '#AA88FF',
    purpleDeep: '#715CF8',
    green: '#52D8A7',
    red: '#FF8E97',
  },
  radius: {
    pill: 999,
    xl: 28,
    lg: 22,
    md: 18,
    sm: 14,
  },
  shadow: {
    glow: {
      shadowColor: '#67DBFF',
      shadowOpacity: 0.18,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 10,
    },
    gold: {
      shadowColor: '#F6CD67',
      shadowOpacity: 0.16,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 5 },
      elevation: 9,
    },
    card: {
      shadowColor: '#000000',
      shadowOpacity: 0.24,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
    },
  },
};

export function getLootRarityFrame(rarity = 'common') {
  const key = String(rarity || 'common').toLowerCase();
  switch (key) {
    case 'legendary':
      return {
        label: 'LEGENDARY',
        glow: 'rgba(246,205,103,0.22)',
        accent: '#F6CD67',
        edge: 'rgba(255,232,169,0.52)',
        gradient: ['#2D1E08', '#13100C', '#0A0E13'],
        badge: ['#F6CD67', '#FFAA38'],
      };
    case 'epic':
      return {
        label: 'EPIC',
        glow: 'rgba(170,136,255,0.22)',
        accent: '#AA88FF',
        edge: 'rgba(230,220,255,0.44)',
        gradient: ['#24193A', '#13111E', '#0A0E13'],
        badge: ['#B9A6FF', '#715CF8'],
      };
    case 'rare':
      return {
        label: 'RARE',
        glow: 'rgba(103,219,255,0.22)',
        accent: '#67DBFF',
        edge: 'rgba(198,242,255,0.46)',
        gradient: ['#103141', '#0D1621', '#0A0E13'],
        badge: ['#8ADFFF', '#2E8FFF'],
      };
    case 'mythic':
      return {
        label: 'MYTHIC',
        glow: 'rgba(255,142,151,0.22)',
        accent: '#FF8E97',
        edge: 'rgba(255,208,212,0.44)',
        gradient: ['#34161B', '#170D11', '#0A0E13'],
        badge: ['#FFB2B8', '#E14E5B'],
      };
    default:
      return {
        label: 'COMMON',
        glow: 'rgba(245,248,251,0.08)',
        accent: '#C7D2DD',
        edge: 'rgba(255,255,255,0.18)',
        gradient: ['#17212B', '#0E141B', '#0A0E13'],
        badge: ['#D5DCE4', '#8B97A5'],
      };
  }
}

export const cityMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#10202A' }] },
  { elementType: 'geometry.fill', stylers: [{ color: '#10202A' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#D6E5F2' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#10202A' }, { lightness: -10 }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#193342' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#214254' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#29536A' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#C5D8E6' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#142A35' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#B8CCDA' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#173241' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0C1921' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#A8C7DB' }] },
  { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#D2DFEA' }] },
];
