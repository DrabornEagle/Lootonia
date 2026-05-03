import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { levelFromXp, rankFromLevel } from '../utils/progression';

const STORAGE_KEY = 'lootonia:liveops:v3';
const MAX_ACTIVITY_ENTRIES = 8;

const DAILY_REWARD_CYCLE = [
  { token: 25, xp: 10, label: 'Başlangıç Kasası' },
  { token: 35, xp: 12, label: 'Rota Isıtma' },
  { token: 45, xp: 14, label: 'Ankara Turu' },
  { token: 60, xp: 18, label: 'Radar Hızı' },
  { token: 80, xp: 24, label: 'Gece Avı' },
  { token: 110, xp: 30, label: 'Boss Hazırlığı' },
  { token: 150, xp: 40, label: 'Haftalık Zirve' },
];


const STREAK_MILESTONES = [
  { days: 3, token: 70, xp: 20, tokens: 1, label: '3 Gün Serisi' },
  { days: 5, token: 120, xp: 32, tokens: 2, label: '5 Gün Serisi' },
  { days: 7, token: 180, xp: 50, tokens: 3, label: '7 Gün Serisi' },
];

const EVENT_CHEST_COST = 3;
const EVENT_CHEST_POOL = [
  { id: 'ops-cache-lite', token: 55, xp: 16, tokens: 0, label: 'Ops Cache Lite' },
  { id: 'ops-cache-plus', token: 80, xp: 22, tokens: 1, label: 'Ops Cache Plus' },
  { id: 'ops-cache-xp', token: 40, xp: 34, tokens: 0, label: 'XP Pulse Cache' },
];

export const LIVEOPS_STORE_ITEMS = [
  { id: 'token-pack', title: 'Radar Nakit Paketi', cost: 2, token: 60, xp: 0, label: 'Hızlı token takviyesi' },
  { id: 'xp-boost', title: 'XP Booster', cost: 2, token: 0, xp: 32, label: 'Seviye akışını hızlandırır' },
  { id: 'ops-cache', title: 'Ops Cache', cost: 4, token: 95, xp: 38, label: 'Dengeli ödül kutusu' },
];

export const LIVEOPS_EVENTS = [
  {
    id: 'ankara-hunt-week',
    title: 'Ankara Av Haftası',
    subtitle: 'Günlük sandık ve boss akışını hızlandır, seri bonuslarını topla.',
    eyebrow: 'LIVE OPS • HAFTALIK ETKİNLİK',
    windowLabel: 'Bu haftanın rotasyonu',
    presetLabel: 'Şehir Avı',
    durationHours: 24,
    palette: ['rgba(30,64,175,0.96)', 'rgba(67,56,202,0.90)'],
    tasks: [
      { key: 'evt_daily_chest_1', title: 'Isınma Sandığı', desc: 'Bugün 1 sandık aç.', refType: 'dailyChest', target: 1, reward_token: 25, reward_xp: 6 },
      { key: 'evt_daily_chest_3', title: 'Hızlı Tur', desc: 'Bugün toplam 3 sandık aç.', refType: 'dailyChest', target: 3, reward_token: 45, reward_xp: 12 },
      { key: 'evt_daily_boss_1', title: 'Boss Turu', desc: 'Bugün bir boss oturumunu tamamla.', refType: 'dailyBoss', target: 1, reward_token: 80, reward_xp: 20 },
    ],
  },
  {
    id: 'night-route',
    title: 'Gece Rotası',
    subtitle: 'Haftalık ilerleyişe oynayan görevlerle daha ağır ama daha değerli ödül al.',
    eyebrow: 'LIVE OPS • GECE ROTASI',
    windowLabel: 'Akşam etkinlik akışı',
    presetLabel: 'Gece Mesaisi',
    durationHours: 36,
    palette: ['rgba(91,33,182,0.96)', 'rgba(15,23,42,0.92)'],
    tasks: [
      { key: 'evt_weekly_chest_5', title: 'Uzun Mesai', desc: 'Bu hafta 5 sandık aç.', refType: 'weeklyChest', target: 5, reward_token: 55, reward_xp: 14 },
      { key: 'evt_weekly_unique_3', title: 'Yeni Noktalar', desc: 'Bu hafta 3 farklı drop keşfet.', refType: 'weeklyUnique', target: 3, reward_token: 70, reward_xp: 18 },
      { key: 'evt_shard_upgrade_1', title: 'Gece Forge', desc: 'Bir kart yükseltmesi yap.', refType: 'shardUpgrade', target: 1, reward_token: 90, reward_xp: 22 },
    ],
  },
  {
    id: 'market-rush',
    title: 'Market Rush',
    subtitle: 'Ekonomi haftası açık. İlan ver, satın al ve shard üretimini hızlandır.',
    eyebrow: 'LIVE OPS • MARKET RUSH',
    windowLabel: 'Ekonomi odaklı etkinlik',
    presetLabel: 'Ekonomi Hızı',
    durationHours: 48,
    palette: ['rgba(180,83,9,0.96)', 'rgba(15,23,42,0.92)'],
    tasks: [
      { key: 'evt_market_list_1', title: 'Pazar Açılışı', desc: 'Market’e 1 ilan ver.', refType: 'marketList', target: 1, reward_token: 40, reward_xp: 10 },
      { key: 'evt_market_buy_1', title: 'Hızlı Alım', desc: 'Market’ten 1 kart satın al.', refType: 'marketBuy', target: 1, reward_token: 55, reward_xp: 14 },
      { key: 'evt_shard_craft_1', title: 'Forge Çıkışı', desc: 'Shard ile 1 kart üret.', refType: 'shardCraft', target: 1, reward_token: 75, reward_xp: 18 },
    ],
  },
  {
    id: 'forge-district',
    title: 'Forge District',
    subtitle: 'Koleksiyon fazlalıklarını erit, yükselt ve boss bileti hazırla.',
    eyebrow: 'LIVE OPS • FORGE DISTRICT',
    windowLabel: 'Koleksiyon odaklı etkinlik',
    presetLabel: 'Forge Turbine',
    durationHours: 48,
    palette: ['rgba(6,95,70,0.96)', 'rgba(15,23,42,0.92)'],
    tasks: [
      { key: 'evt_recycle_3', title: 'Parça Öğütücü', desc: 'Toplam 3 kopya kartı recycle et.', refType: 'recycleDuplicate', target: 3, reward_token: 50, reward_xp: 12 },
      { key: 'evt_shard_upgrade_2', title: 'Yükseltme Hattı', desc: '1 kart yükseltmesi yap.', refType: 'shardUpgrade', target: 1, reward_token: 85, reward_xp: 20 },
      { key: 'evt_boss_ticket_1', title: 'Boss Bileti', desc: '1 boss bileti üret.', refType: 'bossTicketCraft', target: 1, reward_token: 110, reward_xp: 26 },
    ],
  },
];

export const LIVEOPS_EVENT_PRESETS = LIVEOPS_EVENTS.map((event, index) => ({
  id: event.id,
  sortOrder: index,
  title: event.title,
  eyebrow: event.eyebrow,
  windowLabel: event.windowLabel,
  presetLabel: event.presetLabel,
  durationHours: event.durationHours,
  palette: event.palette,
}));

export const LIVEOPS_WEEKLY_PLANS = [
  {
    id: 'classic-ankara-loop',
    title: 'Klasik Ankara Döngüsü',
    subtitle: 'Haftayı şehir avıyla açıp gece ve ekonomi presetleriyle bitiren dengeli plan.',
    days: [
      { key: 'Mon', label: 'Pzt', eventId: 'ankara-hunt-week' },
      { key: 'Tue', label: 'Sal', eventId: 'ankara-hunt-week' },
      { key: 'Wed', label: 'Çar', eventId: 'night-route' },
      { key: 'Thu', label: 'Per', eventId: 'market-rush' },
      { key: 'Fri', label: 'Cum', eventId: 'forge-district' },
      { key: 'Sat', label: 'Cmt', eventId: 'market-rush' },
      { key: 'Sun', label: 'Paz', eventId: 'ankara-hunt-week' },
    ],
  },
  {
    id: 'boss-market-swing',
    title: 'Boss + Market Salınımı',
    subtitle: 'Hafta ortasında boss odaklı, hafta sonunda ekonomi ve forge hızında kalan daha sert plan.',
    days: [
      { key: 'Mon', label: 'Pzt', eventId: 'night-route' },
      { key: 'Tue', label: 'Sal', eventId: 'night-route' },
      { key: 'Wed', label: 'Çar', eventId: 'ankara-hunt-week' },
      { key: 'Thu', label: 'Per', eventId: 'market-rush' },
      { key: 'Fri', label: 'Cum', eventId: 'forge-district' },
      { key: 'Sat', label: 'Cmt', eventId: 'market-rush' },
      { key: 'Sun', label: 'Paz', eventId: 'forge-district' },
    ],
  },
];

function makeStorageKey(userId) {
  return `${STORAGE_KEY}:${userId}`;
}

function dkdPad2(value) {
  return String(value).padStart(2, '0');
}

function dayKeyFromDate(input = new Date()) {
  const date = input instanceof Date ? input : new Date(input);
  return `${date.getFullYear()}-${dkdPad2(date.getMonth() + 1)}-${dkdPad2(date.getDate())}`;
}

function weekKeyFromDate(input = new Date()) {
  const date = input instanceof Date ? new Date(input) : new Date(input);
  const localDay = date.getDay();
  const diff = localDay === 0 ? -6 : 1 - localDay;
  date.setDate(date.getDate() + diff);
  return dayKeyFromDate(date);
}

function dayDiff(prevDayKey, nextDayKey) {
  if (!prevDayKey || !nextDayKey) return null;
  const prev = new Date(`${prevDayKey}T00:00:00.000Z`).getTime();
  const next = new Date(`${nextDayKey}T00:00:00.000Z`).getTime();
  return Math.round((next - prev) / 86400000);
}

function nextRewardPreview(streak = 0) {
  const index = Math.max(0, Number(streak || 0)) % DAILY_REWARD_CYCLE.length;
  return {
    ...DAILY_REWARD_CYCLE[index],
    cycleDay: index + 1,
  };
}


function streakRunIdForState(raw = {}, todayKey = dayKeyFromDate()) {
  const lastClaimDay = String(raw?.lastClaimDay || '');
  const gap = dayDiff(lastClaimDay, todayKey);
  const keepRun = lastClaimDay === todayKey || gap === 1;
  return keepRun ? String(raw?.streakRunId || lastClaimDay || todayKey) : todayKey;
}

function buildStreakMilestones(raw = {}, streak = 0, runId = dayKeyFromDate()) {
  const claimBucket = raw?.streakMilestoneClaims?.[runId] || {};
  return STREAK_MILESTONES.map((entry) => {
    const claimedAt = claimBucket?.[entry.days] || null;
    const claimable = Number(streak || 0) >= Number(entry.days || 0) && !claimedAt;
    return {
      ...entry,
      claimedAt,
      claimable,
      locked: Number(streak || 0) < Number(entry.days || 0),
      progressLabel: `${Math.min(Number(streak || 0), Number(entry.days || 0))}/${entry.days}`,
      rewardLabel: `+${Number(entry.token || 0)} token${Number(entry.xp || 0) ? ` • +${Number(entry.xp)} XP` : ''}${Number(entry.tokens || 0) ? ` • +${Number(entry.tokens)} Ops` : ''}`,
    };
  });
}

function buildEventChestState(raw = {}) {
  const eventCurrency = Math.max(0, Number(raw?.eventCurrency || 0));
  return {
    cost: EVENT_CHEST_COST,
    affordable: eventCurrency >= EVENT_CHEST_COST,
    label: 'Etkinlik Kasası',
    subtitle: 'Ops puanlarını kasaya çevir ve ekstra token/XP topla.',
  };
}

function buildStoreItems(raw = {}) {
  const eventCurrency = Math.max(0, Number(raw?.eventCurrency || 0));
  const counts = raw?.storeRedeemCounts || {};
  return LIVEOPS_STORE_ITEMS.map((item) => ({
    ...item,
    affordable: eventCurrency >= Number(item.cost || 0),
    redeemCount: Math.max(0, Number(counts?.[item.id] || 0)),
    rewardLabel: `+${Number(item.token || 0)} token${Number(item.xp || 0) ? ` • +${Number(item.xp)} XP` : ''}`,
  }));
}

function rewardLabelParts(entry = {}) {
  const parts = [];
  if (Number(entry?.token || 0) > 0) parts.push(`+${Number(entry.token)} token`);
  if (Number(entry?.xp || 0) > 0) parts.push(`+${Number(entry.xp)} XP`);
  if (Number(entry?.tokens || 0) > 0) parts.push(`+${Number(entry.tokens)} Ops`);
  return parts;
}

function normalizedProgress(progress = {}) {
  const taskState = progress?.taskState || {};
  const weeklyState = progress?.weeklyTaskState || {};
  return {
    dailyChests: Math.max(0, Number(taskState?.chests_opened || 0)),
    dailyBoss: !!taskState?.boss_solved,
    weeklyChests: Math.max(0, Number(weeklyState?.chests_opened || 0)),
    weeklyBoss: Math.max(0, Number(weeklyState?.boss_opened || 0)),
    weeklyUnique: Math.max(0, Number(weeklyState?.unique_drops || 0)),
  };
}

function normalizeActionCounters(raw = {}, todayKey = dayKeyFromDate(), weekKey = weekKeyFromDate()) {
  const dayBucket = raw?.dayKey === todayKey ? (raw?.daily || {}) : {};
  const weekBucket = raw?.weekKey === weekKey ? (raw?.weekly || {}) : {};
  return {
    marketList: Math.max(0, Number(dayBucket?.marketList || 0)),
    marketBuy: Math.max(0, Number(dayBucket?.marketBuy || 0)),
    shardCraft: Math.max(0, Number(dayBucket?.shardCraft || 0)),
    shardUpgrade: Math.max(0, Number(dayBucket?.shardUpgrade || 0)),
    recycleDuplicate: Math.max(0, Number(weekBucket?.recycleDuplicate || 0)),
    bossTicketCraft: Math.max(0, Number(weekBucket?.bossTicketCraft || 0)),
  };
}

function actionScopeForKey(actionKey) {
  if (actionKey === 'recycleDuplicate' || actionKey === 'bossTicketCraft') return 'weekly';
  return 'daily';
}

function actionCategoryLabel(refType) {
  const map = {
    dailyChest: 'Sandık',
    dailyBoss: 'Boss',
    weeklyChest: 'Haftalık Sandık',
    weeklyBoss: 'Haftalık Boss',
    weeklyUnique: 'Farklı Drop',
    marketList: 'Market İlanı',
    marketBuy: 'Market Alımı',
    shardCraft: 'Shard Craft',
    shardUpgrade: 'Shard Upgrade',
    recycleDuplicate: 'Recycle',
    bossTicketCraft: 'Boss Ticket',
  };
  return map[refType] || 'Etkinlik';
}

function eventIndexForDayKey(dayKey) {
  const [dkdYear, dkdMonth, dkdDay] = String(dayKey || dayKeyFromDate()).split('-').map((part) => Number(part || 0));
  const stamp = Math.floor(new Date(dkdYear, Math.max(0, dkdMonth - 1), dkdDay, 0, 0, 0, 0).getTime() / 86400000);
  return Math.abs(stamp) % LIVEOPS_EVENTS.length;
}

function getEventById(eventId) {
  return LIVEOPS_EVENTS.find((event) => event.id === eventId) || LIVEOPS_EVENTS[0];
}

function getPlanById(planId) {
  return LIVEOPS_WEEKLY_PLANS.find((plan) => plan.id === planId) || LIVEOPS_WEEKLY_PLANS[0];
}

function endOfLocalDayIso(todayKey) {
  const [dkdYear, dkdMonth, dkdDay] = String(todayKey || dayKeyFromDate()).split('-').map((part) => Number(part || 0));
  return new Date(dkdYear, Math.max(0, dkdMonth - 1), dkdDay, 23, 59, 59, 999).toISOString();
}

function addHoursIso(baseIso, hours) {
  const base = new Date(baseIso || Date.now());
  return new Date(base.getTime() + Math.max(1, Number(hours || 24)) * 3600000).toISOString();
}

function utcWeekdayIndex() {
  const day = new Date().getUTCDay();
  return day === 0 ? 6 : day - 1;
}

function resolveActiveEvent(raw = {}, todayKey) {
  const enabled = raw?.liveOpsEnabled !== false;
  const autoRotate = raw?.autoRotate !== false;
  const selectedId = autoRotate
    ? LIVEOPS_EVENTS[eventIndexForDayKey(todayKey)]?.id
    : raw?.selectedEventId || LIVEOPS_EVENTS[0]?.id;
  const event = getEventById(selectedId);
  const selectedAt = raw?.selectedAt || new Date().toISOString();
  const windowEndsAt = autoRotate ? endOfLocalDayIso(todayKey) : addHoursIso(selectedAt, event?.durationHours || 24);

  return {
    liveOpsEnabled: enabled,
    autoRotate,
    selectedEventId: selectedId,
    selectedAt,
    windowEndsAt,
    activeEvent: enabled ? {
      ...event,
      windowEndsAt,
      modeLabel: autoRotate ? 'Otomatik rotasyon' : 'Admin sabitlemesi',
      presetLabel: event?.presetLabel || event?.title || 'Etkinlik',
    } : null,
  };
}

function taskProgressValue(refType, progress) {
  if (refType === 'dailyChest') return Math.max(0, Number(progress?.dailyChests || 0));
  if (refType === 'dailyBoss') return progress?.dailyBoss ? 1 : 0;
  if (refType === 'weeklyChest') return Math.max(0, Number(progress?.weeklyChests || 0));
  if (refType === 'weeklyBoss') return Math.max(0, Number(progress?.weeklyBoss || 0));
  if (refType === 'weeklyUnique') return Math.max(0, Number(progress?.weeklyUnique || 0));
  if (refType === 'marketList') return Math.max(0, Number(progress?.marketList || 0));
  if (refType === 'marketBuy') return Math.max(0, Number(progress?.marketBuy || 0));
  if (refType === 'shardCraft') return Math.max(0, Number(progress?.shardCraft || 0));
  if (refType === 'shardUpgrade') return Math.max(0, Number(progress?.shardUpgrade || 0));
  if (refType === 'recycleDuplicate') return Math.max(0, Number(progress?.recycleDuplicate || 0));
  if (refType === 'bossTicketCraft') return Math.max(0, Number(progress?.bossTicketCraft || 0));
  return 0;
}

function taskProgressLabel(task, value) {
  const target = Math.max(1, Number(task?.target || 1));
  const safe = Math.min(target, Math.max(0, Number(value || 0)));
  return `İlerleme: ${safe}/${target}`;
}

function taskAction(task, value, claimed) {
  if (claimed) return 'claimed';
  const complete = Number(value || 0) >= Math.max(1, Number(task?.target || 1));
  if (complete) return 'claim';
  if (task?.refType === 'dailyBoss') return 'boss';
  return 'progress';
}

function buildEventTasks(activeEvent, raw = {}, progress = {}) {
  if (!activeEvent) return [];

  const claims = raw?.eventClaims?.[activeEvent.id] || {};
  return (activeEvent.tasks || []).map((task) => {
    const value = taskProgressValue(task.refType, progress);
    const claimed = !!claims?.[task.key];
    const target = Math.max(1, Number(task?.target || 1));
    const complete = Number(value || 0) >= target;
    const clampedValue = Math.min(target, Math.max(0, Number(value || 0)));
    const progressPct = Math.max(0, Math.min(1, clampedValue / target));
    return {
      ...task,
      kind: 'event',
      value,
      complete,
      claimed,
      target,
      progressPct,
      progressBadge: `${clampedValue}/${target}`,
      categoryLabel: actionCategoryLabel(task.refType),
      action: taskAction(task, value, claimed),
      progressText: taskProgressLabel(task, value),
      reward_tokens: Math.max(1, Number(task?.reward_tokens || 1)),
      rewardText: `Etkinlik ödülü: +${Number(task?.reward_token || 0)} 🪙${Number(task?.reward_xp || 0) ? `  +${Number(task.reward_xp)} XP` : ''} • +${Math.max(1, Number(task?.reward_tokens || 1))} Ops`,
    };
  });
}

function bannerForState(state) {
  const event = state?.activeEvent;

  if (!state?.liveOpsEnabled) {
    return {
      eyebrow: 'LIVE OPS',
      title: 'Etkinlik beklemede',
      subtitle: 'Banner kapalı. Günlük ödül ve görevler hazır olduğunda tekrar açılabilir.',
      accent: ['rgba(55,65,81,0.96)', 'rgba(15,23,42,0.92)'],
      ctaLabel: 'Günlük Ödül',
      secondaryLabel: 'Görevlere Git',
    };
  }

  if (state.claimedToday) {
    return {
      eyebrow: event?.eyebrow || 'LIVE OPS',
      title: `${event?.title || 'Etkinlik'} aktif`,
      subtitle: `${state.streak}. gün serisi korundu • ${event?.subtitle || 'Görevlerden ekstra ödül topla.'}`,
      accent: event?.palette || ['rgba(22,101,52,0.96)', 'rgba(8,20,24,0.92)'],
      ctaLabel: 'Etkinlik Görevleri',
      secondaryLabel: 'Seriyi Gör',
    };
  }

  return {
    eyebrow: event?.eyebrow || 'LIVE OPS',
    title: 'Günlük ödül + etkinlik hazır',
    subtitle: `${state.rewardPreview.token} token • ${state.rewardPreview.xp} XP • ${event?.title || 'Canlı etkinlik'}`,
    accent: event?.palette || ['rgba(30,64,175,0.96)', 'rgba(67,56,202,0.90)'],
    ctaLabel: 'Ödülü Al',
    secondaryLabel: 'Etkinlik Görevleri',
  };
}

function formatActivityTimeLabel(iso) {
  if (!iso) return 'henüz yok';
  const stamp = new Date(iso).getTime();
  if (!Number.isFinite(stamp)) return 'henüz yok';
  const diff = Date.now() - stamp;
  if (diff < 60000) return 'az önce';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}

function appendActivity(prev = {}, entry) {
  const list = Array.isArray(prev?.activityLog) ? prev.activityLog : [];
  return [entry, ...list].slice(0, MAX_ACTIVITY_ENTRIES);
}

function buildRecentActivity(raw = {}) {
  const list = Array.isArray(raw?.activityLog) ? raw.activityLog : [];
  return list.map((entry, index) => ({
    ...entry,
    index,
    timeLabel: formatActivityTimeLabel(entry?.at),
    rewardLabel: rewardLabelParts(entry).join(' • ') || 'ödül yok',
  }));
}

function buildWeeklyPlanState(raw = {}) {
  const activePlan = getPlanById(raw?.weeklyPlanId);
  const todayIndex = utcWeekdayIndex();
  const days = (activePlan?.days || []).map((day, index) => {
    const event = getEventById(day.eventId);
    return {
      ...day,
      index,
      title: event?.title || 'Etkinlik',
      presetLabel: event?.presetLabel || event?.title || 'Preset',
      palette: event?.palette || ['rgba(33,212,253,0.16)', 'rgba(183,33,255,0.12)'],
      active: index === todayIndex,
    };
  });

  return {
    id: activePlan?.id,
    title: activePlan?.title,
    subtitle: activePlan?.subtitle,
    todayIndex,
    todayEntry: days[todayIndex] || null,
    days,
    options: LIVEOPS_WEEKLY_PLANS.map((plan) => ({ id: plan.id, title: plan.title, subtitle: plan.subtitle })),
  };
}

function normalizeLiveOpsState(raw = {}, progress = {}) {
  const todayKey = dayKeyFromDate();
  const weekKey = weekKeyFromDate();
  const lastClaimDay = String(raw?.lastClaimDay || '');
  const gap = dayDiff(lastClaimDay, todayKey);
  const claimedToday = lastClaimDay === todayKey;
  const streak = claimedToday
    ? Math.max(0, Number(raw?.streak || 0))
    : gap === 1
      ? Math.max(0, Number(raw?.streak || 0))
      : 0;

  const rewardPreview = nextRewardPreview(streak);
  const actionCounters = normalizeActionCounters(raw?.actionCounters || {}, todayKey, weekKey);
  const progressSnapshot = { ...normalizedProgress(progress), ...actionCounters };
  const eventState = resolveActiveEvent(raw, todayKey);
  const eventTasks = buildEventTasks(eventState.activeEvent, raw, progressSnapshot);
  const runId = streakRunIdForState(raw, todayKey);
  const streakMilestones = buildStreakMilestones(raw, streak, runId);
  const claimableCount = eventTasks.filter((task) => task.action === 'claim').length + streakMilestones.filter((item) => item.claimable).length;
  const recentActivity = buildRecentActivity(raw);
  const weeklyPlan = buildWeeklyPlanState(raw);
  const eventCurrency = Math.max(0, Number(raw?.eventCurrency || 0));
  const storeItems = buildStoreItems(raw);
  const eventChest = buildEventChestState(raw);

  const normalized = {
    streak,
    streakRunId: runId,
    lastClaimDay,
    lastClaimAt: raw?.lastClaimAt || null,
    claimedToday,
    rewardPreview,
    eventCurrency,
    progressSnapshot,
    actionCounters,
    ...eventState,
    eventTasks,
    streakMilestones,
    eventChest,
    storeItems,
    claimableCount,
    adminPresetOptions: LIVEOPS_EVENT_PRESETS,
    recentActivity,
    latestActivity: recentActivity[0] || null,
    weeklyPlan,
  };

  return {
    ...normalized,
    banner: bannerForState(normalized),
  };
}

async function loadRawLiveOpsState(userId) {
  if (!userId) return {};
  try {
    const { data, error } = await supabase
      .from('dkd_profiles')
      .select('daily_reward_state')
      .eq('user_id', userId)
      .maybeSingle();
    if (!error && data?.daily_reward_state && typeof data.daily_reward_state === 'object') {
      return data.daily_reward_state || {};
    }
  } catch {}

  try {
    const raw = await AsyncStorage.getItem(makeStorageKey(userId));
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.log('[Lootonia][liveops][loadRaw]', error?.message || String(error));
    return {};
  }
}

async function persistLiveOpsState(userId, state) {
  if (!userId) return;
  try {
    const { error } = await supabase
      .from('dkd_profiles')
      .update({ daily_reward_state: state || {} })
      .eq('user_id', userId);
    if (error) throw error;
  } catch {
    await AsyncStorage.setItem(makeStorageKey(userId), JSON.stringify(state));
  }
}

async function updateRawLiveOpsState(userId, updater) {
  const current = await loadRawLiveOpsState(userId);
  const next = typeof updater === 'function' ? await updater(current || {}) : updater;
  await persistLiveOpsState(userId, next || {});
  return next || {};
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

export async function loadLiveOpsState(userId, progress = {}) {
  if (!userId) return normalizeLiveOpsState({}, progress);
  const raw = await loadRawLiveOpsState(userId);
  return normalizeLiveOpsState(raw, progress);
}

export async function claimLiveOpsDailyReward(userId, profile, progress = {}) {
  if (!userId) {
    return { ok: false, reason: 'user_required', state: normalizeLiveOpsState({}, progress) };
  }

  const currentRaw = await loadRawLiveOpsState(userId);
  const currentState = normalizeLiveOpsState(currentRaw, progress);
  if (currentState.claimedToday) {
    return { ok: false, reason: 'already_claimed', state: currentState, reward: null, profilePatch: null };
  }

  const todayKey = dayKeyFromDate();
  const nextStreak = Math.max(0, Number(currentState.streak || 0)) + 1;
  const reward = nextRewardPreview(nextStreak - 1);
  const gap = dayDiff(currentState.lastClaimDay, todayKey);
  const nextRunId = gap === 1 ? String(currentRaw?.streakRunId || currentState.lastClaimDay || todayKey) : todayKey;

  const nextRawState = {
    ...currentRaw,
    streak: nextStreak,
    streakRunId: nextRunId,
    lastClaimDay: todayKey,
    lastClaimAt: new Date().toISOString(),
    eventCurrency: Math.max(0, Number(currentRaw?.eventCurrency || 0)) + 1,
    activityLog: appendActivity(currentRaw, {
      id: `daily:${todayKey}:${Date.now()}`,
      kind: 'daily',
      title: `Gün ${Math.max(1, Number(reward.cycleDay || 1))} ödülü`,
      subtitle: reward.label || 'Günlük giriş ödülü alındı.',
      token: Number(reward.token || 0),
      xp: Number(reward.xp || 0),
      tokens: 1,
      eventTitle: currentState?.activeEvent?.title || null,
      at: new Date().toISOString(),
    }),
  };

  const profileResult = await applyRewardToProfile(userId, profile, {
    tokenDelta: reward.token,
    xpDelta: reward.xp,
  });

  if (!profileResult?.error) {
    await persistLiveOpsState(userId, nextRawState);
  }

  const nextState = normalizeLiveOpsState(profileResult?.error ? currentRaw : nextRawState, progress);

  return {
    ok: !profileResult?.error,
    reason: profileResult?.error ? 'profile_update_failed' : 'claimed',
    state: nextState,
    reward,
    profilePatch: profileResult?.data || null,
    transient: !!profileResult?.transient,
    error: profileResult?.error || null,
  };
}

export async function claimLiveOpsEventTask(userId, profile, taskKey, progress = {}) {
  if (!userId) {
    return { ok: false, reason: 'user_required', state: normalizeLiveOpsState({}, progress) };
  }

  const currentRaw = await loadRawLiveOpsState(userId);
  const currentState = normalizeLiveOpsState(currentRaw, progress);
  const task = currentState?.eventTasks?.find((entry) => entry.key === taskKey);

  if (!currentState?.activeEvent) {
    return { ok: false, reason: 'event_disabled', state: currentState, task: null, profilePatch: null };
  }

  if (!task) {
    return { ok: false, reason: 'task_not_found', state: currentState, task: null, profilePatch: null };
  }

  if (task.claimed) {
    return { ok: false, reason: 'already_claimed', state: currentState, task, profilePatch: null };
  }

  if (!task.complete) {
    return { ok: false, reason: 'task_not_ready', state: currentState, task, profilePatch: null };
  }

  const tokenReward = Math.max(1, Number(task.reward_tokens || 1));
  const profileResult = await applyRewardToProfile(userId, profile, {
    tokenDelta: task.reward_token,
    xpDelta: task.reward_xp,
  });

  if (profileResult?.error) {
    return {
      ok: false,
      reason: 'profile_update_failed',
      state: currentState,
      task,
      profilePatch: profileResult?.data || null,
      transient: !!profileResult?.transient,
      error: profileResult?.error || null,
    };
  }

  const nowIso = new Date().toISOString();
  const nextRaw = await updateRawLiveOpsState(userId, (prev) => ({
    ...prev,
    eventClaims: {
      ...(prev?.eventClaims || {}),
      [currentState.activeEvent.id]: {
        ...((prev?.eventClaims || {})?.[currentState.activeEvent.id] || {}),
        [task.key]: nowIso,
      },
    },
    activityLog: appendActivity(prev, {
      id: `event:${currentState.activeEvent.id}:${task.key}:${Date.now()}`,
      kind: 'event',
      title: task.title,
      subtitle: `${currentState.activeEvent.title} • ${task.progressBadge || `${task.target}/${task.target}`}`,
      token: Number(task.reward_token || 0),
      xp: Number(task.reward_xp || 0),
      tokens: tokenReward,
      eventTitle: currentState.activeEvent.title,
      at: nowIso,
    }),
    eventCurrency: Math.max(0, Number(prev?.eventCurrency || 0)) + tokenReward,
  }));

  return {
    ok: true,
    reason: 'claimed',
    state: normalizeLiveOpsState(nextRaw, progress),
    task,
    profilePatch: profileResult?.data || null,
    transient: !!profileResult?.transient,
    error: null,
  };
}

export async function recordLiveOpsAction(userId, actionKey, amount = 1, progress = {}) {
  if (!userId || !actionKey) return normalizeLiveOpsState({}, progress);

  const safeAmount = Math.max(0, Number(amount || 0));
  if (!safeAmount) {
    const raw = await loadRawLiveOpsState(userId);
    return normalizeLiveOpsState(raw, progress);
  }

  const todayKey = dayKeyFromDate();
  const weekKey = weekKeyFromDate();
  const scope = actionScopeForKey(actionKey);

  const nextRaw = await updateRawLiveOpsState(userId, (prev) => {
    const prevCounters = prev?.actionCounters || {};
    const dayBucket = prevCounters?.dayKey === todayKey ? { ...(prevCounters?.daily || {}) } : {};
    const weekBucket = prevCounters?.weekKey === weekKey ? { ...(prevCounters?.weekly || {}) } : {};

    if (scope === 'weekly') {
      weekBucket[actionKey] = Math.max(0, Number(weekBucket[actionKey] || 0)) + safeAmount;
    } else {
      dayBucket[actionKey] = Math.max(0, Number(dayBucket[actionKey] || 0)) + safeAmount;
    }

    return {
      ...prev,
      actionCounters: {
        dayKey: todayKey,
        weekKey,
        daily: dayBucket,
        weekly: weekBucket,
      },
    };
  });

  return normalizeLiveOpsState(nextRaw, progress);
}



export async function claimLiveOpsStreakMilestone(userId, profile, days, progress = {}) {
  if (!userId || !days) {
    return { ok: false, reason: 'user_required', state: normalizeLiveOpsState({}, progress) };
  }

  const currentRaw = await loadRawLiveOpsState(userId);
  const currentState = normalizeLiveOpsState(currentRaw, progress);
  const milestone = (currentState?.streakMilestones || []).find((entry) => Number(entry.days) === Number(days));
  if (!milestone) return { ok: false, reason: 'milestone_not_found', state: currentState };
  if (milestone.claimedAt) return { ok: false, reason: 'already_claimed', state: currentState, milestone };
  if (!milestone.claimable) return { ok: false, reason: 'milestone_locked', state: currentState, milestone };

  const profileResult = await applyRewardToProfile(userId, profile, {
    tokenDelta: milestone.token,
    xpDelta: milestone.xp,
  });
  if (profileResult?.error) {
    return { ok: false, reason: 'profile_update_failed', state: currentState, milestone, profilePatch: profileResult?.data || null, transient: !!profileResult?.transient, error: profileResult?.error || null };
  }

  const nowIso = new Date().toISOString();
  const nextRaw = await updateRawLiveOpsState(userId, (prev) => ({
    ...prev,
    eventCurrency: Math.max(0, Number(prev?.eventCurrency || 0)) + Math.max(0, Number(milestone.tokens || 0)),
    streakMilestoneClaims: {
      ...(prev?.streakMilestoneClaims || {}),
      [currentState.streakRunId || dayKeyFromDate()]: {
        ...((prev?.streakMilestoneClaims || {})?.[currentState.streakRunId || dayKeyFromDate()] || {}),
        [milestone.days]: nowIso,
      },
    },
    activityLog: appendActivity(prev, {
      id: `milestone:${milestone.days}:${Date.now()}`,
      kind: 'streak',
      title: milestone.label,
      subtitle: `Seri ödülü toplandı • ${milestone.progressLabel}`,
      token: Number(milestone.token || 0),
      xp: Number(milestone.xp || 0),
      tokens: Number(milestone.tokens || 0),
      at: nowIso,
    }),
  }));

  return {
    ok: true,
    reason: 'claimed',
    state: normalizeLiveOpsState(nextRaw, progress),
    milestone,
    profilePatch: profileResult?.data || null,
    transient: !!profileResult?.transient,
    error: null,
  };
}

export async function openLiveOpsEventChest(userId, profile, progress = {}) {
  if (!userId) return { ok: false, reason: 'user_required', state: normalizeLiveOpsState({}, progress) };
  const currentRaw = await loadRawLiveOpsState(userId);
  const currentState = normalizeLiveOpsState(currentRaw, progress);
  if (Number(currentState?.eventCurrency || 0) < EVENT_CHEST_COST) {
    return { ok: false, reason: 'not_enough_ops', state: currentState };
  }
  const reward = EVENT_CHEST_POOL[Math.floor(Math.random() * EVENT_CHEST_POOL.length)] || EVENT_CHEST_POOL[0];
  const profileResult = await applyRewardToProfile(userId, profile, {
    tokenDelta: reward.token,
    xpDelta: reward.xp,
  });
  if (profileResult?.error) {
    return { ok: false, reason: 'profile_update_failed', state: currentState, reward, profilePatch: profileResult?.data || null, transient: !!profileResult?.transient, error: profileResult?.error || null };
  }
  const nowIso = new Date().toISOString();
  const nextRaw = await updateRawLiveOpsState(userId, (prev) => ({
    ...prev,
    eventCurrency: Math.max(0, Number(prev?.eventCurrency || 0) - EVENT_CHEST_COST + Math.max(0, Number(reward.tokens || 0))),
    activityLog: appendActivity(prev, {
      id: `ops-chest:${reward.id}:${Date.now()}`,
      kind: 'eventChest',
      title: reward.label || 'Etkinlik Kasası',
      subtitle: 'Ops puanı etkinlik kasasına dönüştürüldü.',
      token: Number(reward.token || 0),
      xp: Number(reward.xp || 0),
      tokens: Number(reward.tokens || 0),
      at: nowIso,
    }),
  }));
  return {
    ok: true,
    reason: 'opened',
    state: normalizeLiveOpsState(nextRaw, progress),
    reward,
    profilePatch: profileResult?.data || null,
    transient: !!profileResult?.transient,
    error: null,
  };
}

export async function redeemLiveOpsStoreItem(userId, profile, itemId, progress = {}) {
  if (!userId || !itemId) return { ok: false, reason: 'user_required', state: normalizeLiveOpsState({}, progress) };
  const currentRaw = await loadRawLiveOpsState(userId);
  const currentState = normalizeLiveOpsState(currentRaw, progress);
  const item = LIVEOPS_STORE_ITEMS.find((entry) => entry.id === itemId);
  if (!item) return { ok: false, reason: 'item_not_found', state: currentState };
  if (Number(currentState?.eventCurrency || 0) < Number(item.cost || 0)) {
    return { ok: false, reason: 'not_enough_ops', state: currentState, item };
  }
  const profileResult = await applyRewardToProfile(userId, profile, {
    tokenDelta: item.token,
    xpDelta: item.xp,
  });
  if (profileResult?.error) {
    return { ok: false, reason: 'profile_update_failed', state: currentState, item, profilePatch: profileResult?.data || null, transient: !!profileResult?.transient, error: profileResult?.error || null };
  }
  const nowIso = new Date().toISOString();
  const nextRaw = await updateRawLiveOpsState(userId, (prev) => ({
    ...prev,
    eventCurrency: Math.max(0, Number(prev?.eventCurrency || 0) - Number(item.cost || 0)),
    storeRedeemCounts: {
      ...(prev?.storeRedeemCounts || {}),
      [item.id]: Math.max(0, Number((prev?.storeRedeemCounts || {})?.[item.id] || 0)) + 1,
    },
    activityLog: appendActivity(prev, {
      id: `store:${item.id}:${Date.now()}`,
      kind: 'store',
      title: item.title,
      subtitle: `Etkinlik mağazası • ${item.label || 'Store ödülü'}`,
      token: Number(item.token || 0),
      xp: Number(item.xp || 0),
      at: nowIso,
    }),
  }));
  return {
    ok: true,
    reason: 'redeemed',
    state: normalizeLiveOpsState(nextRaw, progress),
    item,
    profilePatch: profileResult?.data || null,
    transient: !!profileResult?.transient,
    error: null,
  };
}

export async function cycleLiveOpsEvent(userId, progress = {}, direction = 1) {
  if (!userId) return normalizeLiveOpsState({}, progress);

  const raw = await loadRawLiveOpsState(userId);
  const todayKey = dayKeyFromDate();
  const current = resolveActiveEvent(raw, todayKey);
  const currentId = current?.activeEvent?.id || LIVEOPS_EVENTS[0]?.id;
  const currentIndex = Math.max(0, LIVEOPS_EVENTS.findIndex((item) => item.id === currentId));
  const nextIndex = (currentIndex + Number(direction || 1) + LIVEOPS_EVENTS.length) % LIVEOPS_EVENTS.length;
  const nextEventId = LIVEOPS_EVENTS[nextIndex]?.id || LIVEOPS_EVENTS[0]?.id;

  const nextRaw = await updateRawLiveOpsState(userId, (prev) => ({
    ...prev,
    liveOpsEnabled: true,
    autoRotate: false,
    selectedEventId: nextEventId,
    selectedAt: new Date().toISOString(),
  }));

  return normalizeLiveOpsState(nextRaw, progress);
}

export async function setLiveOpsEnabled(userId, enabled, progress = {}) {
  if (!userId) return normalizeLiveOpsState({}, progress);
  const nextRaw = await updateRawLiveOpsState(userId, (prev) => ({
    ...prev,
    liveOpsEnabled: !!enabled,
  }));
  return normalizeLiveOpsState(nextRaw, progress);
}

export async function setLiveOpsAutoRotate(userId, enabled, progress = {}) {
  if (!userId) return normalizeLiveOpsState({}, progress);
  const nextRaw = await updateRawLiveOpsState(userId, (prev) => ({
    ...prev,
    autoRotate: !!enabled,
    ...(enabled ? { selectedAt: null } : {}),
  }));
  return normalizeLiveOpsState(nextRaw, progress);
}

export async function setLiveOpsEventPreset(userId, eventId, progress = {}) {
  if (!userId) return normalizeLiveOpsState({}, progress);
  const preset = getEventById(eventId);
  const nextRaw = await updateRawLiveOpsState(userId, (prev) => ({
    ...prev,
    liveOpsEnabled: true,
    autoRotate: false,
    selectedEventId: preset.id,
    selectedAt: new Date().toISOString(),
  }));
  return normalizeLiveOpsState(nextRaw, progress);
}

export async function setLiveOpsWeeklyPlan(userId, planId, progress = {}) {
  if (!userId) return normalizeLiveOpsState({}, progress);
  const plan = getPlanById(planId);
  const nextRaw = await updateRawLiveOpsState(userId, (prev) => ({
    ...prev,
    weeklyPlanId: plan.id,
  }));
  return normalizeLiveOpsState(nextRaw, progress);
}

