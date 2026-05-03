import React, { memo, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DAILY_TASKS_V1, WEEKLY_TASKS_V1 } from '../../constants/game';
import { dayKey, weekStartKey } from '../../utils/date';
import { minimalLootUi as ui, formatNum } from '../../theme/minimalLootUi';
import { cityLootTheme as theme } from '../../theme/cityLootTheme';
import SafeScreen from '../../components/layout/SafeScreen';
import { useDeferredVisibility } from '../../hooks/useDeferredVisibility';
import { dkd_make_native_axis_point } from '../../utils/dkdNativeAxis';

function SegButton({ active, label, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.segmentButton, active && styles.segmentButtonActive]}>
      {active ? <LinearGradient colors={['rgba(108,203,255,0.24)', 'rgba(47,141,255,0.16)']} style={StyleSheet.absoluteFill} /> : null}
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  );
}

function StatCard({ icon, label, value, accent }) {
  return (
    <View style={styles.statCard}>
      <LinearGradient colors={['rgba(16,30,48,0.96)', 'rgba(10,19,31,0.98)']} style={StyleSheet.absoluteFill} />
      <View style={[styles.statIcon, { backgroundColor: `${accent}1c`, borderColor: `${accent}3a` }]}>
        <MaterialCommunityIcons name={icon} size={18} color={accent} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function SkylineChip({ label, tone = 'cyan' }) {
  const palette = tone === 'gold'
    ? { bg: 'rgba(243,199,119,0.12)', border: 'rgba(243,199,119,0.22)' }
    : tone === 'green'
      ? { bg: 'rgba(95,208,165,0.12)', border: 'rgba(95,208,165,0.22)' }
      : { bg: 'rgba(108,203,255,0.12)', border: 'rgba(108,203,255,0.22)' };

  return (
    <View style={[styles.infoChip, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Text style={styles.infoChipText}>{label}</Text>
    </View>
  );
}

function TaskCard({ item, onClaim, onOpenBoss }) {
  const pct = Math.max(0, Math.min(100, Math.round((Number(item.progressCurrent || 0) / Math.max(1, Number(item.progressTarget || 1))) * 100)));
  const isReady = item.action === 'claim';
  const isClaimed = item.action === 'claimed';
  const accent = isClaimed ? ui.colors.green : isReady ? ui.colors.gold : ui.colors.cyan;

  return (
    <View style={styles.taskCard}>
      <LinearGradient colors={['rgba(14,27,43,0.98)', 'rgba(9,18,29,0.98)']} style={StyleSheet.absoluteFill} />
      <View style={styles.taskTopRow}>
        <View style={[styles.taskIconWrap, { backgroundColor: `${accent}1c`, borderColor: `${accent}3a` }]}>
          <MaterialCommunityIcons name={item.icon} size={20} color={accent} />
        </View>

        <View style={styles.taskCopyWrap}>
          <View style={styles.taskTitleRow}>
            <Text style={styles.taskTitle}>{item.title}</Text>
            <View style={[styles.taskBadge, { backgroundColor: `${accent}12`, borderColor: `${accent}28` }]}>
              <Text style={styles.taskBadgeText}>{item.badge}</Text>
            </View>
          </View>
          <Text style={styles.taskDesc}>{item.desc}</Text>
        </View>
      </View>

      <View style={styles.taskMetaRow}>
        <Text style={styles.taskMetaText}>{item.progressCurrent}/{item.progressTarget}</Text>
        <Text style={styles.taskMetaSoft}>{item.rewardText}</Text>
      </View>

      <View style={styles.progressTrack}>
        <LinearGradient colors={[accent, 'rgba(255,255,255,0.9)']} start={dkd_make_native_axis_point(0, 0.5)} end={dkd_make_native_axis_point(1, 0.5)} style={[styles.progressFill, { width: `${Math.max(8, pct)}%` }]} />
      </View>

      <Pressable
        onPress={() => {
          if (item.action === 'claim') onClaim?.(item.key);
          if (item.action === 'boss') onOpenBoss?.();
        }}
        disabled={item.action === 'progress' || item.action === 'claimed'}
        style={({ pressed }) => [
          styles.taskAction,
          (item.action === 'progress' || item.action === 'claimed') && styles.taskActionDisabled,
          pressed && item.action !== 'progress' && item.action !== 'claimed' && styles.taskActionPressed,
        ]}
      >
        {item.action !== 'progress' && item.action !== 'claimed' ? (
          <LinearGradient colors={['rgba(108,203,255,0.24)', 'rgba(47,141,255,0.16)']} style={StyleSheet.absoluteFill} />
        ) : null}
        <Text style={styles.taskActionText}>
          {item.action === 'claim'
            ? 'Ödülü al'
            : item.action === 'boss'
              ? 'Boss aç'
              : item.action === 'claimed'
                ? 'Alındı'
                : 'Devam ediyor'}
        </Text>
      </Pressable>
    </View>
  );
}

function progressParts(task, mode, daily, weekly, dailyClaims, weeklyClaims) {
  if (mode === 'daily') {
    const chests = Number(daily?.chests_opened || 0);
    const bossSolved = !!daily?.boss_solved;
    if (task.key === 'chest_1') return { current: Math.min(chests, 1), target: 1 };
    if (task.key === 'chest_3') return { current: Math.min(chests, 3), target: 3 };
    if (task.key === 'boss_1') return { current: bossSolved ? 1 : 0, target: 1 };
    if (task.key === 'bonus') return { current: ['chest_1', 'chest_3', 'boss_1'].filter((dkd_claim_key) => !!dailyClaims?.[dkd_claim_key]).length, target: 3 };
    return { current: 0, target: 1 };
  }

  const chests = Number(weekly?.chests_opened || 0);
  const boss = Number(weekly?.boss_opened || 0);
  const unique = Number(weekly?.unique_drops || 0);
  if (task.key === 'w_chest_10') return { current: Math.min(chests, 10), target: 10 };
  if (task.key === 'w_boss_3') return { current: Math.min(boss, 3), target: 3 };
  if (task.key === 'w_unique_5') return { current: Math.min(unique, 5), target: 5 };
  if (task.key === 'w_bonus') return { current: ['w_chest_10', 'w_boss_3', 'w_unique_5'].filter((dkd_claim_key) => !!weeklyClaims?.[dkd_claim_key]).length, target: 3 };
  return { current: 0, target: 1 };
}

function taskIcon(key) {
  if (String(key).includes('boss')) return 'sword-cross';
  if (String(key).includes('bonus')) return 'treasure-chest-outline';
  if (String(key).includes('unique')) return 'map-marker-check-outline';
  return 'map-marker-path';
}

function makeItems(defs, mode, daily, weekly, dailyClaims, weeklyClaims) {
  return defs.map((task) => {
    const parts = progressParts(task, mode, daily, weekly, dailyClaims, weeklyClaims);
    const claimed = mode === 'daily' ? !!dailyClaims?.[task.key] : !!weeklyClaims?.[task.key];
    const complete = parts.current >= parts.target;
    const action = claimed ? 'claimed' : complete ? 'claim' : (task.key.includes('boss') && !complete ? 'boss' : 'progress');
    return {
      ...task,
      icon: taskIcon(task.key),
      progressCurrent: parts.current,
      progressTarget: parts.target,
      action,
      badge: claimed ? 'ALINDI' : complete ? 'HAZIR' : 'AKTİF',
      rewardText: `+${formatNum(task.reward_token || 0)} token${Number(task.reward_energy || 0) > 0 ? ` • +${formatNum(task.reward_energy)} enerji` : ''}${Number(task.reward_xp || 0) > 0 ? ` • +${formatNum(task.reward_xp)} XP` : ''}`,
    };
  });
}

function TasksModal({
  visible,
  onClose,
  profile,
  energyDisplay,
  dailyRewardState,
  taskState,
  weeklyState,
  tasksDbReady,
  weeklyDbReady,
  onClaim,
  onOpenBoss,
}) {
  const [mode, setMode] = useState('daily');
  const taskCardsReady = useDeferredVisibility(visible, true);

  const today = dayKey();
  const week = weekStartKey();
  const ts = taskState && taskState.day === today ? taskState : (profile?.task_state?.day === today ? profile.task_state : taskState);
  const ws = weeklyState && weeklyState.week === week ? weeklyState : (profile?.weekly_task_state?.week === week ? profile.weekly_task_state : weeklyState);
  const daily = useMemo(() => (ts || { day: today, chests_opened: 0, boss_solved: false, claims: {} }), [ts, today]);
  const weekly = useMemo(() => (ws || { week, chests_opened: 0, boss_opened: 0, unique_drops: 0, claims: {} }), [ws, week]);
  const dailyClaims = useMemo(() => (daily?.claims || {}), [daily?.claims]);
  const weeklyClaims = useMemo(() => (weekly?.claims || {}), [weekly?.claims]);

  const items = useMemo(
    () => makeItems(mode === 'daily' ? DAILY_TASKS_V1 : WEEKLY_TASKS_V1, mode, daily, weekly, dailyClaims, weeklyClaims),
    [mode, daily, weekly, dailyClaims, weeklyClaims],
  );

  const readyCount = items.filter((item) => item.action === 'claim').length;
  const completedCount = items.filter((item) => item.action === 'claimed').length;
  const progressValue = mode === 'daily' ? Number(daily?.chests_opened || 0) : Number(weekly?.chests_opened || 0);
  const progressMeta = mode === 'daily' ? `${Number(daily?.chests_opened || 0)} sandık açıldı` : `${Number(weekly?.chests_opened || 0)} sandık / ${Number(weekly?.unique_drops || 0)} farklı nokta`;
  const readyDb = mode === 'daily' ? tasksDbReady : weeklyDbReady;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeScreen style={styles.screen}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={[theme.colors.bgTop, theme.colors.bgMid, theme.colors.bgBottom]} style={styles.gradient}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.topBar}>
              <View style={styles.topCopy}>
                <Text style={styles.topKicker}>GÖREV MERKEZİ</Text>
                <Text style={styles.topTitle}>Günlük ve haftalık görev akışı</Text>
                <Text style={styles.topSub}>Hazır ödülleri, enerji durumunu ve boss ilerlemesini tek panelden takip et.</Text>
              </View>
              <Pressable onPress={onClose} style={styles.topCloseBtn}>
                <MaterialCommunityIcons name="close" size={20} color="#FFFFFF" />
              </Pressable>
            </View>

            <View style={styles.topInfoRow}>
              <SkylineChip label={`${formatNum(readyCount)} hazır ödül`} tone="gold" />
              <SkylineChip label={mode === 'daily' ? 'Günlük akış' : 'Haftalık akış'} tone="cyan" />
            </View>


            <View style={styles.segmentRow}>
              <SegButton active={mode === 'daily'} label="Günlük" onPress={() => setMode('daily')} />
              <SegButton active={mode === 'weekly'} label="Haftalık" onPress={() => setMode('weekly')} />
            </View>

            <View style={styles.statsRow}>
              <StatCard icon="gift-outline" label="Hazır ödül" value={formatNum(readyCount)} accent={ui.colors.gold} />
              <StatCard icon="check-decagram" label="Tamamlanan" value={formatNum(completedCount)} accent={ui.colors.green} />
              <StatCard icon="lightning-bolt-outline" label="Enerji" value={`${Number(energyDisplay?.energy || 0)}/${Number(energyDisplay?.max || 0)}`} accent={ui.colors.cyan} />
            </View>

            <View style={styles.panelCard}>
              <LinearGradient colors={['rgba(13,27,44,0.98)', 'rgba(9,18,29,0.98)']} style={StyleSheet.absoluteFill} />
              <Text style={styles.panelTitle}>{mode === 'daily' ? 'Bugünkü ilerleme' : 'Bu haftaki ilerleme'}</Text>
              <Text style={styles.panelSub}>{progressMeta}</Text>
              <Text style={[styles.panelHint, !readyDb && styles.panelHintWarn]}>
                {readyDb ? 'Veri eşleşmesi hazır' : 'Yerel yedek modunda çalışıyor'}
              </Text>
              <View style={styles.infoChipRow}>
                <SkylineChip label={`${formatNum(progressValue)} ana ilerleme`} />
                {mode === 'daily'
                  ? <SkylineChip label={daily?.boss_solved ? 'Boss çözüldü' : 'Boss bekliyor'} tone="gold" />
                  : <SkylineChip label={`${formatNum(weekly?.unique_drops || 0)} farklı nokta`} tone="green" />}
              </View>
            </View>

            {!!dailyRewardState ? (
              <View style={styles.panelCard}>
                <LinearGradient colors={['rgba(15,31,48,0.98)', 'rgba(9,18,29,0.98)']} style={StyleSheet.absoluteFill} />
                <Text style={styles.liveEyebrow}>GÜNLÜK GİRİŞ</Text>
                <Text style={styles.panelTitle}>Günlük ödül durumu</Text>
                <Text style={styles.panelSub}>
                  {Number(dailyRewardState?.claimableCount || 0)} hazır ödül • {Number(dailyRewardState?.streak || 0)} günlük seri
                </Text>
              </View>
            ) : null}

            {taskCardsReady ? items.map((item) => (
              <TaskCard key={item.key} item={item} onClaim={onClaim} onOpenBoss={onOpenBoss} />
            )) : (
              <View style={styles.panelCard}>
                <LinearGradient colors={['rgba(14,27,43,0.98)', 'rgba(9,18,29,0.98)']} style={StyleSheet.absoluteFill} />
                <View style={styles.taskWarmupRow}>
                  <ActivityIndicator color={ui.colors.cyan} />
                  <Text style={styles.taskWarmupText}>Görev kartları yükleniyor…</Text>
                </View>
              </View>
            )}
          </ScrollView>
        </LinearGradient>
      </SafeScreen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bgBottom,
  },
  gradient: {
    flex: 1,
  },
  content: {
    padding: 14,
    paddingBottom: 140,
  },
  topBar: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(10,20,33,0.86)',
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  topCopy: {
    flex: 1,
    paddingRight: 12,
  },
  topKicker: {
    color: theme.colors.cyan,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  topTitle: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 6,
    lineHeight: 30,
  },
  topSub: {
    color: theme.colors.textSoft,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    marginTop: 8,
  },
  topCloseBtn: {
    width: 46,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(108,203,255,0.20)',
    backgroundColor: 'rgba(108,203,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topInfoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  segmentButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  segmentButtonActive: {
    borderColor: 'rgba(108,203,255,0.28)',
  },
  segmentText: {
    color: theme.colors.textSoft,
    fontSize: 13,
    fontWeight: '900',
  },
  segmentTextActive: {
    color: theme.colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minHeight: 92,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 12,
    overflow: 'hidden',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    marginTop: 10,
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  panelCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  panelTitle: {
    color: theme.colors.text,
    fontSize: 19,
    fontWeight: '900',
  },
  panelSub: {
    color: theme.colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    marginTop: 6,
  },
  panelHint: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 10,
  },
  panelHintWarn: {
    color: theme.colors.gold,
  },
  liveEyebrow: {
    color: theme.colors.cyan,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  infoChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  infoChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  infoChipText: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: '800',
  },
  taskCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 14,
    marginBottom: 10,
    overflow: 'hidden',
  },
  taskTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  taskIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCopyWrap: {
    flex: 1,
    marginLeft: 12,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  taskTitle: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  taskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  taskBadgeText: {
    color: theme.colors.text,
    fontSize: 10,
    fontWeight: '900',
  },
  taskDesc: {
    color: theme.colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 12,
  },
  taskMetaText: {
    color: theme.colors.textSoft,
    fontSize: 11,
    fontWeight: '800',
  },
  taskMetaSoft: {
    flex: 1,
    textAlign: 'right',
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  progressTrack: {
    marginTop: 8,
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  taskAction: {
    minHeight: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(108,203,255,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: 12,
    backgroundColor: 'rgba(108,203,255,0.08)',
  },
  taskActionDisabled: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.10)',
  },
  taskActionPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  taskActionText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
});

export default memo(TasksModal);
