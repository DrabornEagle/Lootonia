import { LEVEL_CAP, RANKS, ZONE_UNLOCKS } from '../constants/progression';

function toInt(value, fallback = 0) {
  const dkd_iteration_value = Number(value);
  return Number.isFinite(dkd_iteration_value) ? Math.trunc(dkd_iteration_value) : fallback;
}

export function xpCostForLevel(level) {
  const lv = Math.max(1, toInt(level, 1));
  return 100 + (lv - 1) * 35;
}

export function xpToReachLevel(level) {
  const target = Math.max(1, toInt(level, 1));
  if (target <= 1) return 0;

  let total = 0;
  for (let lv = 1; lv < target; lv += 1) {
    total += xpCostForLevel(lv);
  }
  return total;
}

export function levelFromXp(xp) {
  const safeXp = Math.max(0, toInt(xp, 0));
  let level = 1;

  while (level < LEVEL_CAP && safeXp >= xpToReachLevel(level + 1)) {
    level += 1;
  }

  return level;
}

export function rankFromLevel(level) {
  const lv = Math.max(1, toInt(level, 1));
  let current = RANKS[0];

  for (const rank of RANKS) {
    if (lv >= rank.minLevel) current = rank;
  }

  return current;
}

export function getLevelProgress(level, xp) {
  const lv = Math.max(1, toInt(level, 1));
  const safeXp = Math.max(0, toInt(xp, 0));

  if (lv >= LEVEL_CAP) {
    return {
      currentBaseXp: xpToReachLevel(LEVEL_CAP),
      nextBaseXp: xpToReachLevel(LEVEL_CAP),
      levelXp: 0,
      levelGoal: 0,
      progressPct: 100,
      isLevelCap: true,
    };
  }

  const currentBaseXp = xpToReachLevel(lv);
  const nextBaseXp = xpToReachLevel(lv + 1);
  const levelGoal = Math.max(1, nextBaseXp - currentBaseXp);
  const levelXp = Math.max(0, safeXp - currentBaseXp);
  const progressPct = Math.max(0, Math.min(100, Math.round((levelXp / levelGoal) * 100)));

  return {
    currentBaseXp,
    nextBaseXp,
    levelXp,
    levelGoal,
    progressPct,
    isLevelCap: false,
  };
}

export function getNextZoneUnlock(level) {
  const lv = Math.max(1, toInt(level, 1));
  return ZONE_UNLOCKS.find((item) => item.level > lv) || null;
}

export function normalizeProgression(profile) {
  const rawXp = Math.max(0, toInt(profile?.xp, 0));
  const rawLevel = toInt(profile?.level, 0);
  const level = rawLevel > 0 ? rawLevel : levelFromXp(rawXp);
  const rank = rankFromLevel(level);
  const progress = getLevelProgress(level, rawXp);
  const nextUnlock = getNextZoneUnlock(level);

  return {
    xp: rawXp,
    level,
    rankKey: profile?.rank_key || rank.key,
    rankLabel: rank.label,
    nextUnlock,
    ...progress,
  };
}
