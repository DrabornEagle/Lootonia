import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { levelFromXp, rankFromLevel } from '../utils/progression';

const STORAGE_KEY = 'lootonia:achievements:v3';

const CATEGORY_UI = {
  adventure: {
    id: 'adventure',
    label: 'Av & Boss',
    emoji: '🗺️',
    desc: 'Sandık ve boss odaklı rozetler.',
  },
  market: {
    id: 'market',
    label: 'Pazar',
    emoji: '🛒',
    desc: 'Alım satım ve ekonomi odaklı rozetler.',
  },
  forge: {
    id: 'forge',
    label: 'Forge',
    emoji: '⚒️',
    desc: 'Craft, upgrade ve geri dönüşüm rozetleri.',
  },
  missions: {
    id: 'missions',
    label: 'Görev',
    emoji: '🏃',
    desc: 'Görev ve düzenli oynanış rozetleri.',
  },
};

export const ACHIEVEMENT_DEFS = [
  {
    id: 'first-chest',
    title: 'İlk Sandık',
    desc: 'İlk sandığını aç ve av döngüsünü başlat.',
    badgeEmoji: '🧰',
    rarity: 'common',
    category: 'adventure',
    target: 1,
    track: 'chestOpen',
    rewardToken: 25,
    rewardXp: 8,
  },
  {
    id: 'chest-hunter',
    title: 'Sandık Avcısı',
    desc: 'Toplam 10 sandık aç.',
    badgeEmoji: '📦',
    rarity: 'rare',
    category: 'adventure',
    target: 10,
    track: 'chestOpen',
    rewardToken: 80,
    rewardXp: 24,
  },
  {
    id: 'boss-hunt',
    title: 'Boss Avı',
    desc: '3 boss sandığını başarıyla aç.',
    badgeEmoji: '👑',
    rarity: 'epic',
    category: 'adventure',
    target: 3,
    track: 'bossChestOpen',
    rewardToken: 130,
    rewardXp: 42,
  },
  {
    id: 'market-seller',
    title: 'Pazar Satıcısı',
    desc: 'Market’e 3 ilan ver.',
    badgeEmoji: '🏷️',
    rarity: 'rare',
    category: 'market',
    target: 3,
    track: 'marketList',
    rewardToken: 70,
    rewardXp: 18,
  },
  {
    id: 'market-buyer',
    title: 'Pazar Alıcısı',
    desc: 'Market’ten 3 kart satın al.',
    badgeEmoji: '🛒',
    rarity: 'rare',
    category: 'market',
    target: 3,
    track: 'marketBuy',
    rewardToken: 90,
    rewardXp: 24,
  },
  {
    id: 'recycle-master',
    title: 'Geri Dönüşüm Ustası',
    desc: 'Toplam 5 kopya kart recycle et.',
    badgeEmoji: '♻️',
    rarity: 'common',
    category: 'forge',
    target: 5,
    track: 'recycleDuplicate',
    rewardToken: 55,
    rewardXp: 14,
  },
  {
    id: 'forge-master',
    title: 'Forge Ustası',
    desc: 'Craft, upgrade ve bilet üretimi toplamını 4’e ulaştır.',
    badgeEmoji: '⚒️',
    rarity: 'epic',
    category: 'forge',
    target: 4,
    track: 'forgeAny',
    rewardToken: 120,
    rewardXp: 34,
  },
  {
    id: 'task-runner',
    title: 'Görev Koşucusu',
    desc: '5 görev ödülü topla.',
    badgeEmoji: '🏃',
    rarity: 'rare',
    category: 'missions',
    target: 5,
    track: 'taskClaim',
    rewardToken: 95,
    rewardXp: 28,
  },
];

const RARITY_ORDER = {
  common: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

const RARITY_UI = {
  common: {
    label: 'Common',
    glow: 'rgba(120, 216, 255, 0.16)',
    border: 'rgba(120, 216, 255, 0.30)',
    text: '#DFF8FF',
  },
  rare: {
    label: 'Rare',
    glow: 'rgba(124, 92, 255, 0.18)',
    border: 'rgba(124, 92, 255, 0.32)',
    text: '#EEE7FF',
  },
  epic: {
    label: 'Epic',
    glow: 'rgba(183, 33, 255, 0.18)',
    border: 'rgba(183, 33, 255, 0.34)',
    text: '#FFE8FF',
  },
  legendary: {
    label: 'Legend',
    glow: 'rgba(246, 208, 107, 0.20)',
    border: 'rgba(246, 208, 107, 0.36)',
    text: '#FFF4D8',
  },
};

function makeDailyRewardStorageKey(userId) {
  return `${STORAGE_KEY}:${userId}`;
}

function rewardLabel(def) {
  const parts = [];
  if (Number(def?.rewardToken || 0) > 0) parts.push(`+${Number(def.rewardToken)} token`);
  if (Number(def?.rewardXp || 0) > 0) parts.push(`+${Number(def.rewardXp)} XP`);
  return parts.join(' • ');
}

function getStat(stats = {}, key) {
  return Math.max(0, Number(stats?.[key] || 0));
}

function computeProgress(def, stats = {}) {
  switch (def.track) {
    case 'forgeAny':
      return getStat(stats, 'shardCraft') + getStat(stats, 'shardUpgrade') + getStat(stats, 'bossTicketCraft');
    default:
      return getStat(stats, def.track);
  }
}

function sortByRarityThenClaim(dkd_left_value, dkd_right_value) {
  const ra = Number(RARITY_ORDER[dkd_left_value?.rarity] || 0);
  const rb = Number(RARITY_ORDER[dkd_right_value?.rarity] || 0);
  if (rb !== ra) return rb - ra;
  const at = new Date(dkd_left_value?.claimedAt || 0).getTime();
  const bt = new Date(dkd_right_value?.claimedAt || 0).getTime();
  if (bt !== at) return bt - at;
  return String(dkd_left_value?.title || '').localeCompare(String(dkd_right_value?.title || ''));
}

function normalizeAchievement(def, raw = {}) {
  const stats = raw?.stats || {};
  const claims = raw?.claims || {};
  const progress = computeProgress(def, stats);
  const claimedAt = claims?.[def.id] || null;
  const completed = progress >= Number(def.target || 1);
  const claimed = !!claimedAt;
  const claimable = completed && !claimed;
  const pct = Math.max(0, Math.min(100, Math.round((Math.min(progress, def.target) / Math.max(1, def.target)) * 100)));
  const rarityUi = RARITY_UI[def.rarity] || RARITY_UI.common;
  const categoryMeta = CATEGORY_UI[def.category] || CATEGORY_UI.adventure;

  return {
    ...def,
    categoryId: categoryMeta.id,
    categoryLabel: categoryMeta.label,
    categoryEmoji: categoryMeta.emoji,
    categoryDesc: categoryMeta.desc,
    progress,
    progressPct: pct,
    completed,
    claimed,
    claimable,
    claimedAt,
    progressLabel: `${Math.min(progress, def.target)}/${def.target}`,
    rewardLabel: rewardLabel(def),
    rarityLabel: rarityUi.label,
    rarityGlow: rarityUi.glow,
    rarityBorder: rarityUi.border,
    rarityText: rarityUi.text,
  };
}

function uniqueIds(list = []) {
  const seen = new Set();
  return list.filter((id) => {
    const key = String(id || '');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function orderClaimedBadges(achievements = [], favoriteBadgeId = '', shelfOrderIds = []) {
  const claimed = achievements.filter((item) => item.claimed).sort(sortByRarityThenClaim);
  if (!claimed.length) return [];

  const claimedMap = new Map(claimed.map((item) => [item.id, item]));
  const orderedIds = uniqueIds(Array.isArray(shelfOrderIds) ? shelfOrderIds : []);
  const explicit = orderedIds.map((id) => claimedMap.get(id)).filter(Boolean);
  let remaining = claimed.filter((item) => !orderedIds.includes(item.id));

  if (!explicit.length && favoriteBadgeId && claimedMap.has(favoriteBadgeId)) {
    const favorite = claimedMap.get(favoriteBadgeId);
    remaining = remaining.filter((item) => item.id !== favoriteBadgeId);
    return [favorite, ...remaining];
  }

  return [...explicit, ...remaining];
}

function normalizeBadgeShelf(achievements = [], favoriteBadgeId = '', shelfOrderIds = [], maxItems = 3) {
  const orderedClaimed = orderClaimedBadges(achievements, favoriteBadgeId, shelfOrderIds);
  const fallback = achievements
    .filter((item) => !item.claimed && Number(item.progress || 0) > 0)
    .sort((dkd_left_value, dkd_right_value) => Number(dkd_right_value.progressPct || 0) - Number(dkd_left_value.progressPct || 0));

  if (orderedClaimed.length >= maxItems) return orderedClaimed.slice(0, maxItems);
  return [...orderedClaimed, ...fallback.slice(0, maxItems - orderedClaimed.length)];
}

function buildCategoryCards(achievements = []) {
  return Object.values(CATEGORY_UI).map((meta) => {
    const items = achievements.filter((item) => item.categoryId === meta.id);
    const claimed = items.filter((item) => item.claimed).length;
    const completed = items.filter((item) => item.completed).length;
    const claimable = items.filter((item) => item.claimable).length;
    const completionPct = items.length ? Math.round((claimed / items.length) * 100) : 0;
    return {
      ...meta,
      items,
      total: items.length,
      claimed,
      completed,
      claimable,
      completionPct,
    };
  });
}

function buildPlayerCardStats(achievements = [], categoryCards = []) {
  const total = achievements.length || 1;
  const claimed = achievements.filter((item) => item.claimed).length;
  const rareOrBetter = achievements.filter((item) => item.claimed && (item.rarity === 'rare' || item.rarity === 'epic' || item.rarity === 'legendary')).length;
  const epicOrBetter = achievements.filter((item) => item.claimed && (item.rarity === 'epic' || item.rarity === 'legendary')).length;
  const fullSets = categoryCards.filter((item) => item.total > 0 && item.claimed === item.total).length;
  return {
    completionPct: Math.round((claimed / total) * 100),
    rareOrBetter,
    epicOrBetter,
    fullSets,
  };
}

export function normalizeAchievementsState(raw = {}) {
  const achievements = ACHIEVEMENT_DEFS.map((def) => normalizeAchievement(def, raw));
  const favoriteBadgeId = String(raw?.favoriteBadgeId || '');
  const shelfOrderIds = uniqueIds(Array.isArray(raw?.shelfOrderIds) ? raw.shelfOrderIds : []);
  const favoriteBadge = achievements.find((item) => item.id === favoriteBadgeId && item.claimed) || null;
  const orderedClaimedBadges = orderClaimedBadges(achievements, favoriteBadgeId, shelfOrderIds);
  const badgeShelf = normalizeBadgeShelf(achievements, favoriteBadgeId, shelfOrderIds, 3);
  const badgeShelfExpanded = normalizeBadgeShelf(achievements, favoriteBadgeId, shelfOrderIds, 8);
  const rarestBadge = achievements.filter((item) => item.claimed).sort(sortByRarityThenClaim)[0] || null;
  const claimableCount = achievements.filter((item) => item.claimable).length;
  const claimedCount = achievements.filter((item) => item.claimed).length;
  const completedCount = achievements.filter((item) => item.completed).length;
  const totalCount = achievements.length;
  const categories = buildCategoryCards(achievements);
  const playerCardStats = buildPlayerCardStats(achievements, categories);
  const toast = raw?.lastToast && raw?.lastToast?.id ? raw.lastToast : null;

  return {
    raw,
    achievements,
    badgeShelf,
    badgeShelfExpanded,
    orderedClaimedBadges,
    favoriteBadge,
    rarestBadge,
    claimableCount,
    claimedCount,
    completedCount,
    totalCount,
    categories,
    playerCardStats,
    shelfOrderIds,
    stats: raw?.stats || {},
    toast,
  };
}

async function loadRawState(userId) {
  if (!userId) return {};
  try {
    const raw = await AsyncStorage.getItem(makeDailyRewardStorageKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function persistRawState(userId, state) {
  if (!userId) return;
  await AsyncStorage.setItem(makeDailyRewardStorageKey(userId), JSON.stringify(state || {}));
}

async function applyRewardToProfile(userId, profile, { tokenDelta = 0, xpDelta = 0 } = {}) {
  const currentToken = Math.max(0, Number(profile?.token || 0));
  const currentXp = Math.max(0, Number(profile?.xp || 0));
  const nextToken = currentToken + Math.max(0, Number(tokenDelta || 0));
  const nextXp = currentXp + Math.max(0, Number(xpDelta || 0));
  const nextLevel = Math.max(1, Number(levelFromXp(nextXp) || 1));
  const nextRank = rankFromLevel(nextLevel);

  const optimistic = {
    token: nextToken,
    xp: nextXp,
    level: nextLevel,
    rank_key: nextRank.key,
  };

  const { data, error } = await supabase
    .from('dkd_profiles')
    .update(optimistic)
    .eq('user_id', userId)
    .select('user_id, token, xp, level, rank_key')
    .single();

  if (error) {
    const msg = String(error?.message || error?.details || '');
    const schemaMissing = msg.includes('xp') || msg.includes('level') || msg.includes('rank_key');

    if (schemaMissing) {
      const fallback = await supabase
        .from('dkd_profiles')
        .update({ token: nextToken })
        .eq('user_id', userId)
        .select('user_id, token')
        .single();

      if (fallback?.error) return { data: optimistic, error: fallback.error, transient: false };

      return {
        data: {
          user_id: userId,
          token: Number(fallback?.data?.token ?? optimistic.token),
          xp: optimistic.xp,
          level: optimistic.level,
          rank_key: optimistic.rank_key,
        },
        error: null,
        transient: true,
      };
    }

    return { data: optimistic, error, transient: false };
  }

  return { data: data || { user_id: userId, ...optimistic }, error: null, transient: false };
}

export async function loadAchievementsState(userId) {
  if (!userId) return normalizeAchievementsState({});
  const raw = await loadRawState(userId);
  return normalizeAchievementsState(raw);
}

export async function recordAchievementAction(userId, actionKey, amount = 1) {
  if (!userId) return { state: normalizeAchievementsState({}), unlocked: [] };

  const safeAmount = Math.max(0, Number(amount || 0));
  const raw = await loadRawState(userId);
  const before = normalizeAchievementsState(raw);
  const nextRaw = {
    ...raw,
    stats: {
      ...(raw?.stats || {}),
      [actionKey]: getStat(raw?.stats || {}, actionKey) + safeAmount,
    },
  };
  const after = normalizeAchievementsState(nextRaw);
  const unlocked = after.achievements.filter((item) => item.claimable && !before.achievements.find((prev) => prev.id === item.id)?.claimable);

  if (unlocked.length) {
    const top = unlocked[0];
    nextRaw.lastToast = {
      id: `${top.id}:${Date.now()}`,
      title: `${top.badgeEmoji} ${top.title}`,
      subtitle: 'Başarım tamamlandı • ödül hazır',
      rarity: top.rarity,
      stamp: Date.now(),
      achievementId: top.id,
    };
  }

  await persistRawState(userId, nextRaw);
  return {
    state: normalizeAchievementsState(nextRaw),
    unlocked,
  };
}

export async function claimAchievementReward(userId, profile, achievementId) {
  if (!userId) return { ok: false, reason: 'user_required', state: normalizeAchievementsState({}) };

  const raw = await loadRawState(userId);
  const state = normalizeAchievementsState(raw);
  const achievement = state.achievements.find((item) => item.id === achievementId);

  if (!achievement) return { ok: false, reason: 'achievement_not_found', state };
  if (achievement.claimed) return { ok: false, reason: 'already_claimed', state };
  if (!achievement.claimable) return { ok: false, reason: 'not_ready', state };

  const reward = await applyRewardToProfile(userId, profile, {
    tokenDelta: Number(achievement.rewardToken || 0),
    xpDelta: Number(achievement.rewardXp || 0),
  });

  const nextRaw = {
    ...raw,
    claims: {
      ...(raw?.claims || {}),
      [achievementId]: new Date().toISOString(),
    },
    lastToast: {
      id: `${achievement.id}:claim:${Date.now()}`,
      title: `${achievement.badgeEmoji} ${achievement.title}`,
      subtitle: achievement.rewardLabel || 'Başarım ödülü alındı',
      rarity: achievement.rarity,
      stamp: Date.now(),
      achievementId: achievement.id,
    },
  };

  await persistRawState(userId, nextRaw);

  return {
    ok: true,
    state: normalizeAchievementsState(nextRaw),
    reward: reward?.data || null,
    transient: !!reward?.transient,
    error: reward?.error || null,
  };
}

export async function clearAchievementToast(userId) {
  if (!userId) return normalizeAchievementsState({});
  const raw = await loadRawState(userId);
  const nextRaw = { ...raw, lastToast: null };
  await persistRawState(userId, nextRaw);
  return normalizeAchievementsState(nextRaw);
}

export async function setFavoriteAchievementBadge(userId, achievementId) {
  if (!userId) return normalizeAchievementsState({});
  const raw = await loadRawState(userId);
  const state = normalizeAchievementsState(raw);
  const achievement = state.achievements.find((item) => item.id === achievementId);
  if (!achievement || !achievement.claimed) return state;

  const nextRaw = {
    ...raw,
    favoriteBadgeId: achievementId,
    lastToast: {
      id: `${achievement.id}:favorite:${Date.now()}`,
      title: `${achievement.badgeEmoji} ${achievement.title}`,
      subtitle: 'Favori rozet seçildi',
      rarity: achievement.rarity,
      stamp: Date.now(),
      achievementId: achievement.id,
    },
  };
  await persistRawState(userId, nextRaw);
  return normalizeAchievementsState(nextRaw);
}

export async function setAchievementShelfOrder(userId, orderedIds = []) {
  if (!userId) return normalizeAchievementsState({});
  const raw = await loadRawState(userId);
  const state = normalizeAchievementsState(raw);
  const claimedSet = new Set((state?.orderedClaimedBadges || []).map((item) => item.id));
  const nextIds = uniqueIds(orderedIds).filter((id) => claimedSet.has(id));
  const nextRaw = {
    ...raw,
    shelfOrderIds: nextIds,
    lastToast: {
      id: `shelf:${Date.now()}`,
      title: '🪟 Rozet Vitrini',
      subtitle: 'Vitrin sırası güncellendi',
      rarity: 'rare',
      stamp: Date.now(),
    },
  };
  await persistRawState(userId, nextRaw);
  return normalizeAchievementsState(nextRaw);
}
