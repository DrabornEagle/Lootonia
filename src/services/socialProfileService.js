import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildShardSummary, computeCollectionPower } from '../utils/collection';
import { formatInt, trRarity } from '../utils/text';

const RARITY_ORDER = ['mythic', 'legendary', 'epic', 'rare', 'uncommon', 'common'];
const SHARE_PREFIX = 'YL-CARD:v1:';
const TEMPLATE_PREFIX = 'lootonia:social:template:';
const HISTORY_PREFIX = 'lootonia:social:compare-history:';

export const SOCIAL_CARD_TEMPLATES = [
  {
    key: 'neon',
    label: 'Parıltı',
    colors: ['#07101B', '#102037', '#0A1220'],
    accent: '#8DEBFF',
    glow: 'rgba(141,235,255,0.20)',
  },
  {
    key: 'onyx',
    label: 'Obsidyen',
    colors: ['#09090F', '#171828', '#0D0F16'],
    accent: '#E6EAF4',
    glow: 'rgba(230,234,244,0.16)',
  },
  {
    key: 'sunset',
    label: 'Günbatımı',
    colors: ['#1A0D08', '#402016', '#1A0F1C'],
    accent: '#FFB36B',
    glow: 'rgba(255,179,107,0.20)',
  },
  {
    key: 'aurora',
    label: 'Şafak',
    colors: ['#081512', '#12322C', '#09161C'],
    accent: '#7AF7C1',
    glow: 'rgba(122,247,193,0.20)',
  },
];

function encodeField(value) {
  return encodeURIComponent(String(value ?? ''));
}

function decodeField(value) {
  try {
    return decodeURIComponent(String(value ?? ''));
  } catch {
    return String(value ?? '');
  }
}

export function getClaimedCount(taskState) {
  const claims = taskState?.claims || {};
  return Object.values(claims).filter(Boolean).length;
}

export function buildSocialCollectionSummary(cards = []) {
  const rows = Array.isArray(cards) ? cards : [];
  const shard = buildShardSummary(rows);
  const counts = shard.countsByRarity || {};
  const totalCards = rows.length;
  const uniqueCards = Array.isArray(shard.entries) ? shard.entries.length : 0;
  const topRarity = RARITY_ORDER.find((key) => Number(counts[key] || 0) > 0) || 'common';
  const rarityChips = RARITY_ORDER
    .map((key) => ({
      key,
      count: Number(counts[key] || 0),
      label: trRarity(key),
    }))
    .filter((entry) => entry.count > 0);

  return {
    totalCards,
    uniqueCards,
    topRarity,
    topRarityLabel: trRarity(topRarity),
    rarityChips,
    power: computeCollectionPower(rows),
  };
}

export function buildPlayerStyleTag(profile, summary) {
  const completed = Number(profile?.courier_completed_jobs || 0);
  const token = Number(profile?.token || 0);
  const power = Number(summary?.power || 0);
  const unique = Number(summary?.uniqueCards || 0);
  if (completed >= 25) return 'Rota Ustası';
  if (power >= 120) return 'Çekirdek Ustası';
  if (unique >= 18) return 'Koleksiyon Mimarı';
  if (token >= 5000) return 'Pazar Efendisi';
  if (String(summary?.topRarity || '').toLowerCase() === 'mythic') return 'Mitik Miras';
  if (String(summary?.topRarity || '').toLowerCase() === 'legendary') return 'Efsane İzci';
  return 'Gece İzcisi';
}

export function deriveProfileId(sessionUserId, profile) {
  const raw = String(sessionUserId || profile?.id || profile?.user_id || profile?.nickname || 'LOOTONIA')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
  const tail = raw.slice(-6).padStart(6, '0');
  return `YL-${tail}`;
}

export function buildInviteCode(profileId) {
  const raw = String(profileId || 'YL-000000').replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const core = raw.slice(-6).padStart(6, '0');
  return `WING-${core.slice(0, 3)}-${core.slice(3)}`;
}

export function getTemplateByKey(key) {
  return SOCIAL_CARD_TEMPLATES.find((item) => item.key === key) || SOCIAL_CARD_TEMPLATES[0];
}

export function getSocialTheme(summary, profile, templateKey = 'neon') {
  const preset = getTemplateByKey(templateKey);
  const top = String(summary?.topRarity || '').toLowerCase();
  const rank = String(profile?.rank_key || '').toLowerCase();
  const base = { ...preset, tag: buildPlayerStyleTag(profile, summary) };

  if (preset.key !== 'neon') return base;
  if (top === 'mythic') {
    return {
      ...base,
      colors: ['#1B0A0A', '#4A1020', '#120A18'],
      accent: '#FF8A7A',
      glow: 'rgba(255,122,89,0.22)',
      tag: 'Mitik Miras',
    };
  }
  if (top === 'legendary') {
    return {
      ...base,
      colors: ['#18110A', '#4B3110', '#161117'],
      accent: '#FFD166',
      glow: 'rgba(255,209,102,0.22)',
      tag: 'Efsane İzci',
    };
  }
  if (top === 'epic') {
    return {
      ...base,
      colors: ['#100A18', '#2B1048', '#0D1120'],
      accent: '#C084FF',
      glow: 'rgba(192,132,255,0.22)',
      tag: 'Mor Ufuk',
    };
  }
  if (rank === 'elite' || rank === 'master' || rank === 'apex') {
    return {
      ...base,
      colors: ['#08131F', '#11334F', '#09121C'],
      accent: '#56C1FF',
      glow: 'rgba(86,193,255,0.22)',
      tag: 'Saha Komutanı',
    };
  }
  return base;
}

export function buildPlayerCardPayload({ sessionUserId, profile, summary, taskState, weeklyTaskState, clanState }) {
  const profileId = deriveProfileId(sessionUserId, profile);
  const inviteCode = buildInviteCode(profileId);
  const styleTag = buildPlayerStyleTag(profile, summary);
  return {
    profileId,
    inviteCode,
    nick: String(profile?.nickname || 'Oyuncu'),
    level: Number(profile?.level || 1),
    rank: String(profile?.rank_key || 'rookie').toUpperCase(),
    token: Number(profile?.token || 0),
    xp: Number(profile?.xp || 0),
    courier: Number(profile?.courier_completed_jobs || 0),
    unique: Number(summary?.uniqueCards || 0),
    total: Number(summary?.totalCards || 0),
    power: Number(summary?.power || 0),
    topRarity: String(summary?.topRarityLabel || 'Common'),
    dailyClaim: getClaimedCount(taskState),
    weeklyClaim: getClaimedCount(weeklyTaskState),
    styleTag,
    clanTag: clanState?.tag ? String(clanState.tag) : '',
    clanName: clanState?.name ? String(clanState.name) : '',
  };
}

export function buildPlayerCardShareText(args) {
  const payload = buildPlayerCardPayload(args);
  const templateKey = String(args?.templateKey || 'neon');
  const encoded = [
    ['id', payload.profileId],
    ['invite', payload.inviteCode],
    ['nick', payload.nick],
    ['level', payload.level],
    ['rank', payload.rank],
    ['token', payload.token],
    ['xp', payload.xp],
    ['courier', payload.courier],
    ['unique', payload.unique],
    ['total', payload.total],
    ['power', payload.power],
    ['rarity', payload.topRarity],
    ['daily', payload.dailyClaim],
    ['weekly', payload.weeklyClaim],
    ['tag', payload.styleTag],
    ['theme', templateKey],
    ['clanTag', payload.clanTag],
    ['clanName', payload.clanName],
  ].map(([key, value]) => `${key}=${encodeField(value)}`).join('|');

  return [
    `${payload.nick} • Lootonia Oyuncu Kartı`,
    `Profil Kimliği: ${payload.profileId}`,
    `Davet Kodu: ${payload.inviteCode}`,
    `Lvl ${payload.level} • ${payload.rank}`,
    `Token: ${formatInt(payload.token)} • XP: ${formatInt(payload.xp)}`,
    `Kurye teslimat: ${formatInt(payload.courier)} • Koleksiyon gücü: ${formatInt(payload.power)}`,
    `Benzersiz kart: ${formatInt(payload.unique)} / ${formatInt(payload.total)} • Tepe rarity: ${payload.topRarity}`,
    `Görev claim: Günlük ${payload.dailyClaim} • Haftalık ${payload.weeklyClaim}`,
    `Stil: ${payload.styleTag}`,
    ...(payload.clanTag ? [`Klan: [${payload.clanTag}] ${payload.clanName || 'Klan'}`] : []),
    `${SHARE_PREFIX}${encoded}`,
  ].join('\n');
}

export function parseSharedPlayerCardText(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  const encodedLine = raw.split(/\r?\n/).find((line) => String(line || '').startsWith(SHARE_PREFIX));
  if (!encodedLine) return null;
  const body = encodedLine.slice(SHARE_PREFIX.length);
  const pairs = body.split('|').map((part) => part.split('='));
  const map = Object.fromEntries(pairs.map(([dkd_map_key, dkd_map_value]) => [String(dkd_map_key || '').trim(), decodeField(dkd_map_value)]));
  if (!map.id || !map.nick) return null;

  return {
    profileId: String(map.id),
    inviteCode: String(map.invite || buildInviteCode(map.id)),
    nick: String(map.nick),
    level: Number(map.level || 1),
    rank: String(map.rank || 'ROOKIE'),
    token: Number(map.token || 0),
    xp: Number(map.xp || 0),
    courier: Number(map.courier || 0),
    unique: Number(map.unique || 0),
    total: Number(map.total || 0),
    power: Number(map.power || 0),
    topRarity: String(map.rarity || 'Common'),
    dailyClaim: Number(map.daily || 0),
    weeklyClaim: Number(map.weekly || 0),
    styleTag: String(map.tag || 'Lootonia Oyuncusu'),
    templateKey: String(map.theme || 'neon'),
    clanTag: String(map.clanTag || ''),
    clanName: String(map.clanName || ''),
  };
}

export function comparePlayerCards(localCard, remoteCard) {
  const pairs = [
    { key: 'level', label: 'Seviye', local: Number(localCard?.level || 0), remote: Number(remoteCard?.level || 0) },
    { key: 'token', label: 'Token', local: Number(localCard?.token || 0), remote: Number(remoteCard?.token || 0) },
    { key: 'power', label: 'Koleksiyon Gücü', local: Number(localCard?.power || 0), remote: Number(remoteCard?.power || 0) },
    { key: 'unique', label: 'Benzersiz Kart', local: Number(localCard?.unique || 0), remote: Number(remoteCard?.unique || 0) },
    { key: 'courier', label: 'Teslimat', local: Number(localCard?.courier || 0), remote: Number(remoteCard?.courier || 0) },
  ];

  const rows = pairs.map((entry) => ({
    ...entry,
    winner: entry.local === entry.remote ? 'tie' : entry.local > entry.remote ? 'local' : 'remote',
    delta: Math.abs(entry.local - entry.remote),
  }));

  const localWins = rows.filter((row) => row.winner === 'local').length;
  const remoteWins = rows.filter((row) => row.winner === 'remote').length;

  return {
    rows,
    localWins,
    remoteWins,
    overall: localWins === remoteWins ? 'tie' : localWins > remoteWins ? 'local' : 'remote',
  };
}

export function buildCompareNarrative(localCard, remoteCard, comparison) {
  if (!localCard || !remoteCard || !comparison) return 'Karşılaştırma verisi hazırlanıyor.';
  if (comparison.overall === 'tie') {
    return `${localCard.nick} ve ${remoteCard.nick} dengeli gidiyor. İkinizi ayıran fark küçük; bir sonraki büyük drop sonucu tabloyu değiştirebilir.`;
  }
  const leader = comparison.overall === 'local' ? localCard : remoteCard;
  const trailer = comparison.overall === 'local' ? remoteCard : localCard;
  const strongest = comparison.rows.find((row) => row.winner === comparison.overall) || comparison.rows[0];
  return `${leader.nick}, ${strongest.label.toLowerCase()} tarafında ${formatInt(strongest.delta)} fark açmış durumda. ${trailer.nick} birkaç güçlü hamleyle tabloyu kapatabilir.`;
}

function getTemplateStorageKey(profileId) {
  return `${TEMPLATE_PREFIX}${profileId || 'guest'}`;
}

function getHistoryStorageKey(profileId) {
  return `${HISTORY_PREFIX}${profileId || 'guest'}`;
}

export async function loadSelectedSocialTemplate(profileId) {
  try {
    const value = await AsyncStorage.getItem(getTemplateStorageKey(profileId));
    return SOCIAL_CARD_TEMPLATES.some((item) => item.key === value) ? value : 'neon';
  } catch {
    return 'neon';
  }
}

export async function saveSelectedSocialTemplate(profileId, templateKey) {
  const safe = SOCIAL_CARD_TEMPLATES.some((item) => item.key === templateKey) ? templateKey : 'neon';
  try {
    await AsyncStorage.setItem(getTemplateStorageKey(profileId), safe);
  } catch {
  }
  return safe;
}

export async function loadCompareHistory(profileId) {
  try {
    const raw = await AsyncStorage.getItem(getHistoryStorageKey(profileId));
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function clearCompareHistory(profileId) {
  try {
    await AsyncStorage.removeItem(getHistoryStorageKey(profileId));
  } catch {
  }
}

export async function appendCompareHistory(profileId, remoteCard, comparison) {
  if (!profileId || !remoteCard) return [];
  const current = await loadCompareHistory(profileId);
  const entry = {
    profileId: String(remoteCard.profileId || ''),
    inviteCode: String(remoteCard.inviteCode || ''),
    nick: String(remoteCard.nick || 'Dost'),
    rank: String(remoteCard.rank || 'ROOKIE'),
    level: Number(remoteCard.level || 1),
    topRarity: String(remoteCard.topRarity || 'Common'),
    templateKey: String(remoteCard.templateKey || 'neon'),
    overall: String(comparison?.overall || 'tie'),
    localWins: Number(comparison?.localWins || 0),
    remoteWins: Number(comparison?.remoteWins || 0),
    comparedAt: new Date().toISOString(),
    snapshot: remoteCard,
  };
  const filtered = current.filter((item) => String(item?.profileId || '') !== entry.profileId);
  const next = [entry, ...filtered].slice(0, 8);
  try {
    await AsyncStorage.setItem(getHistoryStorageKey(profileId), JSON.stringify(next));
  } catch {
  }
  return next;
}
