import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const CLAN_PREFIX = 'lootonia:clan:v2:';

export const CLAN_THEME_PRESETS = [
  { key: 'neon', label: 'Neon', colors: ['#08111D', '#12263C', '#0A1521'], accent: '#8DEBFF' },
  { key: 'onyx', label: 'Onyx', colors: ['#0B0C12', '#1A1B26', '#0E1018'], accent: '#E8EDF6' },
  { key: 'sunset', label: 'Sunset', colors: ['#1A0E0A', '#472515', '#170E1B'], accent: '#FFB36B' },
  { key: 'aurora', label: 'Aurora', colors: ['#081612', '#12342C', '#09151C'], accent: '#7AF7C1' },
];

function storageKey(sessionUserId) {
  return `${CLAN_PREFIX}${String(sessionUserId || 'guest')}`;
}

function normalizeTag(tag) {
  return String(tag || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4);
}

function normalizeName(name) {
  return String(name || '').trim().slice(0, 24);
}

function normalizeMotto(motto) {
  return String(motto || '').trim().slice(0, 72);
}

function normalizeTheme(themeKey) {
  const found = CLAN_THEME_PRESETS.find((item) => item.key === String(themeKey || ''));
  return found?.key || 'neon';
}

function makeId() {
  return `cl_${Date.now().toString(36)}dkd_unused_value${Math.random().toString(36).slice(2, 7)}`;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function getErrorText(error) {
  return String(error?.message || error?.details || error?.hint || '');
}

function isSchemaMissingError(error) {
  const text = getErrorText(error).toLowerCase();
  return (
    text.includes('dkd_clans') ||
    text.includes('dkd_clan_members') ||
    text.includes('guest_roster') ||
    text.includes('mission_claims') ||
    text.includes('recent_claims')
  );
}

function isNoRowsError(error) {
  const text = getErrorText(error).toLowerCase();
  return text.includes('0 rows') || text.includes('no rows');
}

export function getClanTheme(themeKey = 'neon') {
  return CLAN_THEME_PRESETS.find((item) => item.key === themeKey) || CLAN_THEME_PRESETS[0];
}

export function createClanDraft({ name, tag, motto, themeKey = 'neon' } = {}) {
  const safeName = normalizeName(name);
  const safeTag = normalizeTag(tag || safeName.slice(0, 4));
  return {
    id: makeId(),
    name: safeName || 'Neon Wing',
    tag: safeTag || 'NWNG',
    motto: normalizeMotto(motto) || 'Haritaya hükmet, loot’u birlikte topla.',
    themeKey: normalizeTheme(themeKey),
    roster: [],
    guestRoster: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    missionClaims: {},
    recentClaims: [],
    source: 'local',
    selfMember: null,
    isLeader: true,
    ownerUserId: null,
  };
}

async function loadLocalClanState(sessionUserId) {
  try {
    const raw = await AsyncStorage.getItem(storageKey(sessionUserId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      ...parsed,
      roster: safeArray(parsed.roster),
      guestRoster: safeArray(parsed.guestRoster || parsed.roster),
      missionClaims: safeObject(parsed.missionClaims),
      recentClaims: safeArray(parsed.recentClaims),
      source: parsed.source || 'local',
      isLeader: parsed.isLeader !== false,
      ownerUserId: parsed.ownerUserId || null,
      selfMember: parsed.selfMember || null,
    };
  } catch {
    return null;
  }
}

async function saveLocalClanState(sessionUserId, state) {
  await AsyncStorage.setItem(storageKey(sessionUserId), JSON.stringify(state || null));
  return state;
}

async function clearLocalClanState(sessionUserId) {
  await AsyncStorage.removeItem(storageKey(sessionUserId));
}

function claimedCount(taskState) {
  const claims = taskState?.claims || {};
  return Object.values(claims).filter(Boolean).length;
}

function rarityTop(summary) {
  return String(summary?.topRarityLabel || 'Common');
}

function buildStatsFromProfile({ profile, summary, taskState, weeklyTaskState } = {}) {
  const dailyClaims = claimedCount(taskState);
  const weeklyClaims = claimedCount(weeklyTaskState);
  const totalPower = Number(summary?.power || 0);
  const delivery = Number(profile?.courier_completed_jobs || 0);
  const level = Number(profile?.level || 1);
  const unique = Number(summary?.uniqueCards || 0);
  const weeklyScore = (level * 12) + (unique * 8) + (dailyClaims * 20) + (weeklyClaims * 45) + (delivery * 15) + Math.floor(totalPower / 10);

  return {
    power: totalPower,
    weeklyScore,
    level,
    rare: rarityTop(summary),
  };
}

function normalizeRemoteMember(member, index = 0, leaderScore = 0) {
  const alias = String(member?.alias || `Kanat ${index + 1}`).trim() || `Kanat ${index + 1}`;
  const seed = alias.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) + index * 17;
  const weeklyScore = Number(member?.weeklyScore ?? member?.weekly_score ?? Math.max(40, Math.round((leaderScore * 0.38) + (seed % 95))));
  return {
    id: String(member?.id || member?.user_id || makeId()),
    userId: member?.user_id ? String(member.user_id) : undefined,
    alias,
    role: String(member?.role || 'Kanat'),
    power: Number(member?.power ?? Math.max(20, Math.round(weeklyScore * 0.65))),
    weeklyScore,
    level: Number(member?.level ?? Math.max(2, Math.round(weeklyScore / 35))),
    rare: String(member?.rare || ['Common', 'Rare', 'Epic'][seed % 3]),
    source: String(member?.source || 'member'),
  };
}

function buildSelfMember(sessionUserId, clanState, profile, summary, taskState, weeklyTaskState) {
  const stats = buildStatsFromProfile({ profile, summary, taskState, weeklyTaskState });
  const alias =
    String(clanState?.selfMember?.alias || '').trim() ||
    String(profile?.nickname || '').trim() ||
    'Oyuncu';
  const isLeader = !!clanState?.isLeader || String(clanState?.ownerUserId || '') === String(sessionUserId || '');
  return {
    id: String(sessionUserId || 'self'),
    userId: String(sessionUserId || ''),
    alias,
    role: isLeader ? 'Kurucu' : String(clanState?.selfMember?.role || 'Üye'),
    power: stats.power,
    weeklyScore: stats.weeklyScore,
    level: stats.level,
    rare: stats.rare,
    source: 'self',
  };
}

async function fetchRemoteMembership(sessionUserId) {
  const { data, error } = await supabase
    .from('dkd_clan_members')
    .select('clan_id, user_id, alias, role, power, weekly_score, level, rare, created_at, updated_at')
    .eq('user_id', sessionUserId)
    .limit(1);

  if (error) throw error;
  return Array.isArray(data) ? (data[0] || null) : null;
}

async function fetchRemoteClan(clanId) {
  const { data, error } = await supabase
    .from('dkd_clans')
    .select('id, name, tag, motto, theme_key, leader_user_id, guest_roster, mission_claims, recent_claims, created_at, updated_at')
    .eq('id', clanId)
    .limit(1);

  if (error) throw error;
  return Array.isArray(data) ? (data[0] || null) : null;
}

async function fetchRemoteMembers(clanId) {
  const { data, error } = await supabase
    .from('dkd_clan_members')
    .select('clan_id, user_id, alias, role, power, weekly_score, level, rare, created_at, updated_at')
    .eq('clan_id', clanId);

  if (error) throw error;
  return safeArray(data);
}

function buildRemoteClanState(sessionUserId, clanRow, selfMember, members = []) {
  const normalizedMembers = safeArray(members).map((item, index) => normalizeRemoteMember(item, index, Number(selfMember?.weekly_score || 0)));
  const guestRoster = safeArray(clanRow?.guest_roster).map((item, index) => normalizeRemoteMember({ ...item, source: 'guest', id: item?.id || `guest_${index}` }, index, Number(selfMember?.weekly_score || 0)));
  const roster = normalizedMembers
    .filter((item) => String(item.userId || item.id) !== String(sessionUserId || ''))
    .concat(guestRoster);

  return {
    id: String(clanRow?.id || ''),
    name: normalizeName(clanRow?.name) || 'Neon Wing',
    tag: normalizeTag(clanRow?.tag) || 'NWNG',
    motto: normalizeMotto(clanRow?.motto) || 'Haritaya hükmet, loot’u birlikte topla.',
    themeKey: normalizeTheme(clanRow?.theme_key),
    roster,
    guestRoster,
    missionClaims: safeObject(clanRow?.mission_claims),
    recentClaims: safeArray(clanRow?.recent_claims),
    createdAt: clanRow?.created_at || new Date().toISOString(),
    updatedAt: clanRow?.updated_at || new Date().toISOString(),
    source: 'remote',
    ownerUserId: clanRow?.leader_user_id ? String(clanRow.leader_user_id) : null,
    isLeader: String(clanRow?.leader_user_id || '') === String(sessionUserId || ''),
    selfMember: selfMember
      ? {
          id: String(selfMember.user_id || sessionUserId || 'self'),
          userId: String(selfMember.user_id || sessionUserId || ''),
          alias: String(selfMember.alias || ''),
          role: String(selfMember.role || 'Üye'),
          power: Number(selfMember.power || 0),
          weeklyScore: Number(selfMember.weekly_score || 0),
          level: Number(selfMember.level || 1),
          rare: String(selfMember.rare || 'Common'),
        }
      : null,
  };
}

function buildGuestRosterFromState(state) {
  const base = safeArray(state?.guestRoster || state?.roster);
  return base
    .filter((item) => String(item?.source || '').toLowerCase() === 'guest' || String(item?.id || '').startsWith('guest_') || !item?.userId)
    .map((item, index) => ({
      id: String(item?.id || `guest_${Date.now().toString(36)}dkd_unused_value${index}`),
      alias: String(item?.alias || `Kanat ${index + 1}`).trim().slice(0, 18),
      role: String(item?.role || 'Kanat').trim().slice(0, 18) || 'Kanat',
      power: Number(item?.power || 0),
      weeklyScore: Number(item?.weeklyScore || 0),
      level: Number(item?.level || 1),
      rare: String(item?.rare || 'Common'),
      source: 'guest',
    }))
    .slice(0, 8);
}

function buildGuestMemberDraft(draft = {}, index = 0) {
  const alias = String(draft.alias || '').trim().slice(0, 18);
  if (!alias) return null;
  const role = String(draft.role || 'Kanat').trim().slice(0, 18) || 'Kanat';
  return {
    id: String(draft.id || `guest_${Date.now().toString(36)}dkd_unused_value${index}`),
    alias,
    role,
    power: Number(draft.power || 0),
    weeklyScore: Number(draft.weeklyScore || 0),
    level: Number(draft.level || 1),
    rare: String(draft.rare || 'Common'),
    source: 'guest',
  };
}

async function loadRemoteClanState(sessionUserId) {
  const selfMember = await fetchRemoteMembership(sessionUserId);
  if (!selfMember?.clan_id) return null;
  const clanRow = await fetchRemoteClan(selfMember.clan_id);
  if (!clanRow) return null;
  const members = await fetchRemoteMembers(selfMember.clan_id);
  return buildRemoteClanState(sessionUserId, clanRow, selfMember, members);
}

export async function loadClanState(sessionUserId) {
  const localState = await loadLocalClanState(sessionUserId);

  if (!sessionUserId) {
    return localState;
  }

  try {
    const remoteState = await loadRemoteClanState(sessionUserId);
    if (remoteState) {
      return remoteState;
    }
    return localState;
  } catch (error) {
    if (isSchemaMissingError(error) || isNoRowsError(error)) {
      return localState;
    }
    throw error;
  }
}

export async function saveClanState(sessionUserId, state, context = {}) {
  if (!sessionUserId) {
    return saveLocalClanState(sessionUserId, state);
  }

  const nextLocal = {
    ...(state || createClanDraft()),
    name: normalizeName(state?.name) || 'Neon Wing',
    tag: normalizeTag(state?.tag) || 'NWNG',
    motto: normalizeMotto(state?.motto) || 'Haritaya hükmet, loot’u birlikte topla.',
    themeKey: normalizeTheme(state?.themeKey),
    guestRoster: buildGuestRosterFromState(state),
    roster: safeArray(state?.roster),
    missionClaims: safeObject(state?.missionClaims),
    recentClaims: safeArray(state?.recentClaims).slice(0, 8),
    updatedAt: new Date().toISOString(),
  };

  try {
    const current = await loadRemoteClanState(sessionUserId);

    if (!current) {
      const insertPayload = {
        name: nextLocal.name,
        tag: nextLocal.tag,
        motto: nextLocal.motto,
        theme_key: nextLocal.themeKey,
        leader_user_id: sessionUserId,
        guest_roster: nextLocal.guestRoster,
        mission_claims: nextLocal.missionClaims,
        recent_claims: nextLocal.recentClaims,
      };

      const { data, error } = await supabase
        .from('dkd_clans')
        .insert(insertPayload)
        .select('id, name, tag, motto, theme_key, leader_user_id, guest_roster, mission_claims, recent_claims, created_at, updated_at')
        .single();

      if (error) throw error;

      const selfStats = buildStatsFromProfile(context);
      const selfAlias =
        String(context?.profile?.nickname || '').trim() ||
        String(nextLocal?.selfMember?.alias || '').trim() ||
        'Kurucu';

      const { error: memberError } = await supabase
        .from('dkd_clan_members')
        .upsert({
          clan_id: data.id,
          user_id: sessionUserId,
          alias: selfAlias,
          role: 'Kurucu',
          power: Number(selfStats.power || 0),
          weekly_score: Number(selfStats.weeklyScore || 0),
          level: Number(selfStats.level || 1),
          rare: String(selfStats.rare || 'Common'),
        }, { onConflict: 'clan_id,user_id' });

      if (memberError) throw memberError;
    } else {
      if (!current.isLeader) {
        throw new Error('only_leader_can_edit_clan');
      }

      const { error } = await supabase
        .from('dkd_clans')
        .update({
          name: nextLocal.name,
          tag: nextLocal.tag,
          motto: nextLocal.motto,
          theme_key: nextLocal.themeKey,
          guest_roster: nextLocal.guestRoster,
          mission_claims: nextLocal.missionClaims,
          recent_claims: nextLocal.recentClaims,
        })
        .eq('id', current.id)
        .eq('leader_user_id', sessionUserId);

      if (error) throw error;

      const selfStats = buildStatsFromProfile(context);
      const selfAlias =
        String(context?.profile?.nickname || '').trim() ||
        String(current?.selfMember?.alias || '').trim() ||
        'Kurucu';

      const { error: memberError } = await supabase
        .from('dkd_clan_members')
        .upsert({
          clan_id: current.id,
          user_id: sessionUserId,
          alias: selfAlias,
          role: 'Kurucu',
          power: Number(selfStats.power || 0),
          weekly_score: Number(selfStats.weeklyScore || 0),
          level: Number(selfStats.level || 1),
          rare: String(selfStats.rare || 'Common'),
        }, { onConflict: 'clan_id,user_id' });

      if (memberError) throw memberError;
    }

    const remoteState = await loadRemoteClanState(sessionUserId);
    if (remoteState) {
      await clearLocalClanState(sessionUserId);
      return remoteState;
    }
  } catch (error) {
    if (!isSchemaMissingError(error) && getErrorText(error) !== 'only_leader_can_edit_clan') {
      throw error;
    }
  }

  const localState = {
    ...nextLocal,
    source: 'local',
    ownerUserId: sessionUserId,
    isLeader: true,
  };
  await saveLocalClanState(sessionUserId, localState);
  return localState;
}

export async function syncClanSelfMember(sessionUserId, clanState, context = {}) {
  if (!sessionUserId || clanState?.source !== 'remote' || !clanState?.id) return null;

  try {
    const stats = buildStatsFromProfile(context);
    const alias =
      String(context?.profile?.nickname || '').trim() ||
      String(clanState?.selfMember?.alias || '').trim() ||
      'Oyuncu';
    const role = clanState?.isLeader ? 'Kurucu' : String(clanState?.selfMember?.role || 'Üye');

    const { error } = await supabase
      .from('dkd_clan_members')
      .upsert({
        clan_id: clanState.id,
        user_id: sessionUserId,
        alias,
        role,
        power: Number(stats.power || 0),
        weekly_score: Number(stats.weeklyScore || 0),
        level: Number(stats.level || 1),
        rare: String(stats.rare || 'Common'),
      }, { onConflict: 'clan_id,user_id' });

    if (error) throw error;
    return true;
  } catch (error) {
    if (isSchemaMissingError(error)) return null;
    throw error;
  }
}

export async function joinClanByTag(sessionUserId, tag, context = {}) {
  if (!sessionUserId) return { ok: false, reason: 'user_required' };
  const safeTag = normalizeTag(tag);
  if (!safeTag) return { ok: false, reason: 'tag_required' };

  try {
    const existing = await loadRemoteClanState(sessionUserId);
    if (existing?.id) {
      return { ok: false, reason: 'already_in_clan', state: existing };
    }

    const { data, error } = await supabase
      .from('dkd_clans')
      .select('id, name, tag, motto, theme_key, leader_user_id, guest_roster, mission_claims, recent_claims, created_at, updated_at')
      .eq('tag', safeTag)
      .limit(1);

    if (error) throw error;

    const clanRow = Array.isArray(data) ? (data[0] || null) : null;
    if (!clanRow?.id) {
      return { ok: false, reason: 'not_found' };
    }

    const stats = buildStatsFromProfile(context);
    const alias =
      String(context?.profile?.nickname || '').trim() ||
      `Oyuncu ${safeTag}`;

    const { error: joinError } = await supabase
      .from('dkd_clan_members')
      .upsert({
        clan_id: clanRow.id,
        user_id: sessionUserId,
        alias,
        role: 'Üye',
        power: Number(stats.power || 0),
        weekly_score: Number(stats.weeklyScore || 0),
        level: Number(stats.level || 1),
        rare: String(stats.rare || 'Common'),
      }, { onConflict: 'clan_id,user_id' });

    if (joinError) throw joinError;

    const state = await loadRemoteClanState(sessionUserId);
    if (state) {
      await clearLocalClanState(sessionUserId);
      return { ok: true, state };
    }
    return { ok: false, reason: 'join_failed' };
  } catch (error) {
    if (isSchemaMissingError(error)) {
      return { ok: false, reason: 'schema_missing' };
    }
    throw error;
  }
}

export async function addClanMember(sessionUserId, clanState, draft = {}) {
  const member = buildGuestMemberDraft(draft);
  if (!member) return clanState;

  if (clanState?.source === 'remote' && clanState?.id) {
    if (!clanState?.isLeader) {
      throw new Error('only_leader_can_edit_clan');
    }
    const nextGuestRoster = [...buildGuestRosterFromState(clanState), member].slice(0, 8);
    const { error } = await supabase
      .from('dkd_clans')
      .update({ guest_roster: nextGuestRoster })
      .eq('id', clanState.id)
      .eq('leader_user_id', sessionUserId);

    if (error) {
      if (isSchemaMissingError(error)) {
        const localFallback = {
          ...(clanState || createClanDraft()),
          guestRoster: nextGuestRoster,
          roster: nextGuestRoster,
          updatedAt: new Date().toISOString(),
          source: 'local',
        };
        await saveLocalClanState(sessionUserId, localFallback);
        return localFallback;
      }
      throw error;
    }

    return loadRemoteClanState(sessionUserId);
  }

  const nextRoster = [...buildGuestRosterFromState(clanState), member].slice(0, 8);
  const next = {
    ...(clanState || createClanDraft()),
    guestRoster: nextRoster,
    roster: nextRoster,
    updatedAt: new Date().toISOString(),
    source: 'local',
  };
  await saveLocalClanState(sessionUserId, next);
  return next;
}

export async function removeClanMember(sessionUserId, clanState, memberId) {
  if (!memberId) return clanState;

  if (clanState?.source === 'remote' && clanState?.id) {
    if (!clanState?.isLeader) {
      throw new Error('only_leader_can_edit_clan');
    }

    const targetId = String(memberId);
    const guestRoster = buildGuestRosterFromState(clanState);
    const isGuest = guestRoster.some((item) => String(item.id) === targetId);

    if (isGuest) {
      const nextGuestRoster = guestRoster.filter((item) => String(item.id) !== targetId);
      const { error } = await supabase
        .from('dkd_clans')
        .update({ guest_roster: nextGuestRoster })
        .eq('id', clanState.id)
        .eq('leader_user_id', sessionUserId);

      if (error) throw error;
      return loadRemoteClanState(sessionUserId);
    }

    const { error } = await supabase
      .from('dkd_clan_members')
      .delete()
      .eq('clan_id', clanState.id)
      .eq('user_id', targetId);

    if (error) throw error;
    return loadRemoteClanState(sessionUserId);
  }

  const nextRoster = buildGuestRosterFromState(clanState).filter((item) => String(item.id) !== String(memberId));
  const next = {
    ...(clanState || createClanDraft()),
    guestRoster: nextRoster,
    roster: nextRoster,
    updatedAt: new Date().toISOString(),
    source: 'local',
  };
  await saveLocalClanState(sessionUserId, next);
  return next;
}

export async function claimClanMission(sessionUserId, clanState, mission) {
  const claims = { ...safeObject(clanState?.missionClaims) };
  claims[mission.key] = true;

  const recentClaims = [
    {
      key: mission.key,
      title: mission.title,
      rewardToken: Number(mission.rewardToken || 0),
      rewardXp: Number(mission.rewardXp || 0),
      rewardClan: Number(mission.rewardClan || 0),
      stamp: Date.now(),
    },
    ...safeArray(clanState?.recentClaims),
  ].slice(0, 8);

  if (clanState?.source === 'remote' && clanState?.id) {
    const { error } = await supabase
      .from('dkd_clans')
      .update({
        mission_claims: claims,
        recent_claims: recentClaims,
      })
      .eq('id', clanState.id);

    if (error) {
      if (isSchemaMissingError(error)) {
        const localFallback = {
          ...(clanState || createClanDraft()),
          missionClaims: claims,
          recentClaims,
          updatedAt: new Date().toISOString(),
          source: 'local',
        };
        await saveLocalClanState(sessionUserId, localFallback);
        return localFallback;
      }
      throw error;
    }

    return loadRemoteClanState(sessionUserId);
  }

  const next = {
    ...(clanState || createClanDraft()),
    missionClaims: claims,
    recentClaims,
    updatedAt: new Date().toISOString(),
    source: 'local',
  };
  await saveLocalClanState(sessionUserId, next);
  return next;
}

export async function clearClanState(sessionUserId, clanState) {
  if (!sessionUserId) {
    await clearLocalClanState(sessionUserId);
    return;
  }

  if (clanState?.source === 'remote' && clanState?.id) {
    try {
      if (clanState?.isLeader) {
        const { error } = await supabase
          .from('dkd_clans')
          .delete()
          .eq('id', clanState.id)
          .eq('leader_user_id', sessionUserId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('dkd_clan_members')
          .delete()
          .eq('clan_id', clanState.id)
          .eq('user_id', sessionUserId);

        if (error) throw error;
      }
    } catch (error) {
      if (!isSchemaMissingError(error)) {
        throw error;
      }
    }
  }

  await clearLocalClanState(sessionUserId);
}

export function buildClanDerived({ sessionUserId, clanState, profile, summary, taskState, weeklyTaskState } = {}) {
  const selfRow = buildSelfMember(sessionUserId, clanState, profile || {}, summary || {}, taskState, weeklyTaskState);
  const roster = safeArray(clanState?.roster)
    .filter((item) => String(item?.userId || item?.id || '') !== String(sessionUserId || ''))
    .map((item, index) => normalizeRemoteMember(item, index, selfRow.weeklyScore));

  const board = [selfRow, ...roster].sort((dkd_left_item, dkd_right_item) => Number(dkd_right_item.weeklyScore || 0) - Number(dkd_left_item.weeklyScore || 0));
  const totalWeeklyPoints = board.reduce((sum, row) => sum + Number(row.weeklyScore || 0), 0);
  const totalPower = board.reduce((sum, row) => sum + Number(row.power || 0), 0);
  const missionClaims = safeObject(clanState?.missionClaims);
  const missions = [
    {
      key: 'task-banner',
      title: 'Görev Sancağı',
      desc: 'Günlük ve haftalık claim sayısını yükselt.',
      progress: claimedCount(taskState) + claimedCount(weeklyTaskState),
      target: 4,
      rewardToken: 180,
      rewardXp: 60,
      rewardClan: 110,
    },
    {
      key: 'collection-drive',
      title: 'Set Baskısı',
      desc: 'Benzersiz kart sayısını artır.',
      progress: Number(summary?.uniqueCards || 0),
      target: 12,
      rewardToken: 260,
      rewardXp: 80,
      rewardClan: 150,
    },
    {
      key: 'courier-lane',
      title: 'Kurye Rotası',
      desc: 'Teslimat sayınla klan puanını taşı.',
      progress: Number(profile?.courier_completed_jobs || 0),
      target: 5,
      rewardToken: 220,
      rewardXp: 70,
      rewardClan: 130,
    },
  ].map((entry) => ({
    ...entry,
    progressPct: Math.max(0, Math.min(100, Math.round((Number(entry.progress || 0) / Number(entry.target || 1)) * 100))),
    claimed: !!missionClaims[entry.key],
    complete: Number(entry.progress || 0) >= Number(entry.target || 0),
  }));

  return {
    leader: board[0] || selfRow,
    board,
    missions,
    totalWeeklyPoints,
    totalPower,
    rosterCount: Math.max(0, board.length - 1),
    summaryLine: `${board.length} üye kartı • Haftalık ${totalWeeklyPoints} puan • Güç ${totalPower}`,
  };
}

export function buildClanShareText({ clanState, derived } = {}) {
  if (!clanState) return '';
  const top = safeArray(derived?.board).slice(0, 4);
  const theme = getClanTheme(clanState.themeKey);
  const modeLabel = clanState?.source === 'remote' ? 'Shared Clan' : 'Local Clan';

  return [
    `[${clanState.tag}] ${clanState.name}`,
    `${clanState.motto || 'Birlikte loot, birlikte güç.'}`,
    `Tema: ${theme.label}`,
    `Mod: ${modeLabel}`,
    `Haftalık Puan: ${Number(derived?.totalWeeklyPoints || 0)}`,
    `Toplam Güç: ${Number(derived?.totalPower || 0)}`,
    `Mini Roster:`,
    ...top.map((row, index) => `${index + 1}. ${row.alias} • ${row.role} • ${row.weeklyScore} puan`),
  ].join('\n');
}
