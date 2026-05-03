import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SecondaryButton from '../../components/ui/SecondaryButton';
import SkylineHeroCard from '../../components/ui/SkylineHeroCard';
import SafeScreen from '../../components/layout/SafeScreen';
import { cityLootTheme as theme } from '../../theme/cityLootTheme';

const CYAN = '#7BE6FF';
const BLUE = '#2F8DFF';
const GOLD = '#F6C55F';

function dkd_get_metric_meta(metric) {
  const dkd_metric_key_value = String(metric || 'courier').toLowerCase();
  if (dkd_metric_key_value === 'courier') {
    return {
      label: 'Kurye',
      unitLabel: 'sipariş',
      icon: 'motorbike',
      modeLabel: 'Kurye modu',
      emptyText: 'Teslim edilen siparişler geldikçe tablo dolacak.',
      rowSubText: 'Teslim edilen sipariş',
      heroBadgeText: 'teslimat',
      seasonLeadText: 'Kurye lideri',
      sectionRewardTitle: 'Kurye haftalık ödülü',
      sectionRewardSub: 'Her hafta sonunda ilk 3 kurye otomatik ödül alır. Kullanıcı giriş yaptığında bu ödül tek seferlik ekran içi popup ile gösterilir.',
      podiumMetaTop: 'Haftanın kuryesi',
      podiumMetaSide: 'Ödül sırası',
    };
  }
  if (dkd_metric_key_value === 'boss') {
    return {
      label: 'Raid',
      unitLabel: 'raid',
      icon: 'sword-cross',
      modeLabel: 'Raid modu',
      emptyText: 'Boss ilerledikçe tablo dolacak.',
      rowSubText: 'Haftalık raid gücü',
      heroBadgeText: 'raid',
      seasonLeadText: 'Sezon lideri',
      sectionRewardTitle: 'Sezon ödülü',
      sectionRewardSub: 'Ödül sadece geçen hafta kapanan sezon için alınır. Bu yüzden buton yalnızca “Geçen hafta” görünümünde aktif olur.',
      podiumMetaTop: 'Sezon lideri',
      podiumMetaSide: 'Üst sıra',
    };
  }
  return {
    label: 'Token',
    unitLabel: 'token',
    icon: 'cash-multiple',
    modeLabel: 'Token modu',
    emptyText: 'Token akışı geldikçe tablo dolacak.',
    rowSubText: 'Haftalık token toplamı',
    heroBadgeText: 'token',
    seasonLeadText: 'Sezon lideri',
    sectionRewardTitle: 'Sezon ödülü',
    sectionRewardSub: 'Ödül sadece geçen hafta kapanan sezon için alınır. Bu yüzden buton yalnızca “Geçen hafta” görünümünde aktif olur.',
    podiumMetaTop: 'Sezon lideri',
    podiumMetaSide: 'Üst sıra',
  };
}

function SectionCard({ children, style, tone = 'cyan' }) {
  const palette = tone === 'gold'
    ? ['rgba(28,21,10,0.98)', 'rgba(15,14,12,0.98)', 'rgba(8,11,16,0.98)']
    : tone === 'purple'
      ? ['rgba(20,15,33,0.98)', 'rgba(12,11,22,0.98)', 'rgba(7,9,14,0.98)']
      : ['rgba(12,27,44,0.98)', 'rgba(9,18,29,0.98)', 'rgba(5,11,18,0.98)'];

  return (
    <View style={[styles.card, style]}>
      <LinearGradient colors={palette} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.cardGlowCyan} />
      <View pointerEvents="none" style={styles.cardGlowGold} />
      {children}
    </View>
  );
}

function ActionButton({ label, icon, onPress, disabled, secondary = false }) {
  const colors = secondary
    ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.05)']
    : [CYAN, BLUE];
  const textColor = secondary ? '#FFFFFF' : '#06121D';

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionWrap,
        disabled && styles.actionDisabled,
        pressed && !disabled && styles.actionPressed,
      ]}
    >
      <LinearGradient colors={colors} style={styles.actionFill}>
        {icon ? <MaterialCommunityIcons name={icon} size={16} color={textColor} style={styles.actionIcon} /> : null}
        <Text style={[styles.actionText, { color: textColor }]}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

function Toggle({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.toggle, active && styles.toggleActive]}>
      <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{label}</Text>
    </Pressable>
  );
}

function StatBox({ label, value, icon, accent }) {
  return (
    <View style={styles.statBox}>
      <View style={[styles.statIcon, { backgroundColor: accent }]}>
        <MaterialCommunityIcons name={icon} size={16} color="#FFFFFF" />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function RankPill({ rank }) {
  const safeRank = Number(rank || 0);
  const map = safeRank === 1
    ? { bg: 'rgba(246,197,95,0.14)', border: 'rgba(246,197,95,0.28)', color: GOLD, icon: 'crown' }
    : safeRank === 2
      ? { bg: 'rgba(220,230,255,0.12)', border: 'rgba(220,230,255,0.22)', color: '#D8E6FF', icon: 'medal' }
      : safeRank === 3
        ? { bg: 'rgba(255,173,113,0.12)', border: 'rgba(255,173,113,0.22)', color: '#FFB67C', icon: 'medal-outline' }
        : { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.10)', color: '#FFFFFF', icon: 'numeric' };

  return (
    <View style={[styles.rankPill, { backgroundColor: map.bg, borderColor: map.border }]}>
      <MaterialCommunityIcons name={map.icon} size={14} color={map.color} />
      <Text style={[styles.rankPillText, { color: map.color }]}>#{safeRank || '-'}</Text>
    </View>
  );
}

function PodiumCard({ row, fallbackRank, metric }) {
  const rank = Number(row?.rank ?? fallbackRank);
  const label = row?.nickname || row?.label || (row?.user_id ? String(row.user_id).slice(0, 8) : 'Bekleniyor');
  const value = Number(row?.value || 0);
  const isTop = rank === 1;
  const dkd_metric_meta_value = dkd_get_metric_meta(metric);

  return (
    <View style={[styles.podiumCard, isTop && styles.podiumCardTop]}>
      <RankPill rank={rank} />
      <Text style={styles.podiumName} numberOfLines={1}>{label}</Text>
      <Text style={styles.podiumValue}>{value}</Text>
      <Text style={styles.podiumMeta}>{rank === 1 ? dkd_metric_meta_value.seasonLeadText : dkd_metric_meta_value.podiumMetaSide}</Text>
    </View>
  );
}

function LeaderboardRow({ row, index, meUserId, myBadge, metric }) {
  const rank = row?.rank ?? (index + 1);
  const label = row?.nickname || row?.label || (row?.user_id ? String(row.user_id).slice(0, 8) : 'Oyuncu');
  const value = Number(row?.value || 0);
  const isMe = meUserId && String(row?.user_id) === String(meUserId);
  const dkd_metric_meta_value = dkd_get_metric_meta(metric);

  return (
    <View style={[styles.row, isMe && styles.rowMe]}>
      <RankPill rank={rank} />
      <View style={styles.rowBody}>
        <View style={styles.rowTitleLine}>
          <Text style={styles.rowName} numberOfLines={1}>{label}</Text>
          {isMe && myBadge?.id ? (
            <View
              style={[
                styles.badgeChip,
                {
                  backgroundColor: myBadge.rarityGlow || 'rgba(255,255,255,0.08)',
                  borderColor: myBadge.rarityBorder || 'rgba(255,255,255,0.10)',
                },
              ]}
            >
              <Text style={[styles.badgeChipText, { color: myBadge.rarityText || '#FFFFFF' }]}>
                {myBadge.badgeEmoji} {myBadge.title}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.rowSub}>{isMe ? `Senin ${dkd_metric_meta_value.modeLabel.toLowerCase()} sıran` : dkd_metric_meta_value.rowSubText}</Text>
      </View>
      <View style={styles.rowValueWrap}>
        <Text style={styles.rowValue}>{value}</Text>
        <Text style={styles.rowValueUnit}>{dkd_metric_meta_value.unitLabel}</Text>
      </View>
    </View>
  );
}

function EmptyState({ metric }) {
  const dkd_metric_meta_value = dkd_get_metric_meta(metric);

  return (
    <View style={styles.emptyWrap}>
      <MaterialCommunityIcons name="trophy-broken" size={24} color="rgba(255,255,255,0.56)" />
      <Text style={styles.emptyTitle}>Bu sezonda veri yok.</Text>
      <Text style={styles.emptySub}>{dkd_metric_meta_value.emptyText}</Text>
    </View>
  );
}

function ToneChip({ label, tone = 'cyan' }) {
  const palette = tone === 'gold'
    ? { bg: 'rgba(243,199,119,0.12)', border: 'rgba(243,199,119,0.24)', text: GOLD }
    : tone === 'purple'
      ? { bg: 'rgba(158,140,255,0.12)', border: 'rgba(158,140,255,0.24)', text: '#D9D0FF' }
      : { bg: 'rgba(108,203,255,0.12)', border: 'rgba(108,203,255,0.24)', text: CYAN };

  return (
    <View style={[styles.heroChip, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Text style={[styles.heroChipText, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

function LeaderboardModal({
  visible,
  onClose,
  metric,
  weekOffset,
  closed,
  week,
  rows,
  loading,
  onMetricChange,
  onWeekOffsetChange,
  onRefresh,
  meUserId,
  myBadge,
  onClaimReward,
  claimingReward,
  isAdmin,
  onCloseWeek,
  closeWeekLoading,
  error,
}) {
  const refreshRef = useRef(onRefresh);

  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (visible) refreshRef.current?.(metric, weekOffset);
  }, [visible, metric, weekOffset]);

  const safeRows = useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);
  const top3 = useMemo(() => safeRows.slice(0, 3), [safeRows]);
  const myRow = useMemo(() => {
    if (!meUserId) return null;
    return safeRows.find((row) => String(row?.user_id) === String(meUserId)) || null;
  }, [meUserId, safeRows]);

  const weekStart = useMemo(() => {
    if (!week) return null;
    const parsed = new Date(week);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [week]);

  const weekText = useMemo(() => {
    if (!weekStart) return '';
    return weekStart.toLocaleDateString('tr-TR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }, [weekStart]);

  const weekEnd = useMemo(() => {
    if (!weekStart) return null;
    return new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  }, [weekStart]);

  const leftText = useMemo(() => {
    if (!weekEnd) return 'Aktif';
    const diff = weekEnd.getTime() - Date.now();
    if (diff <= 0) return 'Bitti';
    const totalSeconds = Math.max(0, Math.floor(diff / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (days > 0) return `${days}g ${hours}s`;
    if (hours > 0) return `${hours}s ${minutes}d`;
    return `${minutes}d`;
  }, [weekEnd]);

  const dkd_metric_meta_value = useMemo(() => dkd_get_metric_meta(metric), [metric]);
  const metricLabel = dkd_metric_meta_value.label;
  const metricIcon = dkd_metric_meta_value.icon;
  const weekLabel = weekOffset === -1 ? 'Geçen hafta' : 'Bu hafta';
  const statusText = weekOffset === -1 ? (closed ? 'Kapanmış sezon' : 'Açık sezon') : `Bitime ${leftText}`;
  const topValue = Number(top3?.[0]?.value || 0);
  const myRank = myRow?.rank ?? '-';
  const myValue = Number(myRow?.value || 0);

  const renderRow = useCallback(
    ({ item, index }) => <LeaderboardRow row={item} index={index} meUserId={meUserId} myBadge={myBadge} metric={metric} />,
    [meUserId, metric, myBadge],
  );

  const headerComponent = useMemo(() => (
    <>
      <View style={styles.heroShell}>
        <SkylineHeroCard
          eyebrow="SEZON SIRALAMASI"
          title="Sıralama Merkezi"
          subtitle={`${weekLabel} • ${weekText || 'Tarih bekleniyor'} • ${statusText}`}
          icon={metricIcon}
          tone="leaderboard"
          onRefresh={() => onRefresh?.(metric, weekOffset)}
          onClose={onClose}
          badgeText={`#${myRank || '-'} • ${myValue} ${dkd_metric_meta_value.heroBadgeText}`}
        >
          <View style={styles.heroBadgeRow}>
            <ToneChip label={dkd_metric_meta_value.modeLabel} tone="gold" />
            <ToneChip label={closed ? 'Sezon kapalı' : 'Sezon açık'} tone={closed ? 'purple' : 'cyan'} />
          </View>
        </SkylineHeroCard>
      </View>

      <SectionCard>
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>SEZON TAKİBİ</Text>
            <Text style={styles.heroTitle}>Sıralama özeti</Text>
            <Text style={styles.heroSubtitle}>{weekLabel} • {weekText || 'Tarih bekleniyor'} • {statusText}</Text>
          </View>
          <View style={styles.heroIconWrap}>
            <MaterialCommunityIcons name={metricIcon} size={24} color={GOLD} />
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatBox label="Lider" value={String(topValue)} icon="trophy-outline" accent="rgba(246,197,95,0.88)" />
          <StatBox label="Sıram" value={String(myRank)} icon="account-star-outline" accent="rgba(123,230,255,0.88)" />
          <StatBox label={dkd_metric_meta_value.unitLabel} value={String(myValue)} icon={metricIcon} accent="rgba(88,226,171,0.88)" />
        </View>
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>Filtreler</Text>
        <Text style={styles.sectionSub}>Sadece gereken iki seçim: hafta ve skor türü.</Text>

        <View style={styles.toggleRow}>
          <Toggle label="Bu hafta" active={weekOffset === 0} onPress={() => onWeekOffsetChange?.(0)} />
          <Toggle label="Geçen hafta" active={weekOffset === -1} onPress={() => onWeekOffsetChange?.(-1)} />
        </View>

        <View style={styles.toggleRow}>
          <Toggle label="Token" active={metric === 'token'} onPress={() => onMetricChange?.('token')} />
          <Toggle label="Kurye" active={metric === 'courier'} onPress={() => onMetricChange?.('courier')} />
        </View>

        <View style={styles.actionsRow}>
          {isAdmin && weekOffset === -1 && !closed ? (
            <ActionButton
              label={closeWeekLoading ? 'Kapatılıyor…' : 'Haftayı kapat'}
              icon="calendar-remove-outline"
              onPress={() => onCloseWeek?.()}
              disabled={!!closeWeekLoading}
              secondary
            />
          ) : null}
          <ActionButton label="Yenile" icon="refresh" onPress={() => onRefresh?.(metric, weekOffset)} secondary />
        </View>
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>İlk 3 oyuncu</Text>
        <Text style={styles.sectionSub}>En görünür oyuncular burada. Geri kalanı aşağıdaki listede.</Text>
        <View style={styles.podiumRow}>
          <PodiumCard row={top3[1]} fallbackRank={2} metric={metric} />
          <PodiumCard row={top3[0]} fallbackRank={1} metric={metric} />
          <PodiumCard row={top3[2]} fallbackRank={3} metric={metric} />
        </View>
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>{dkd_metric_meta_value.sectionRewardTitle}</Text>
        <Text style={styles.sectionSub}>{dkd_metric_meta_value.sectionRewardSub}</Text>
        {metric === 'courier' ? (
          <View style={styles.rewardInfoBox}>
            <Text style={styles.rewardInfoLine}>#1-#3 sırası kapanan haftada otomatik ödül alır.</Text>
            <Text style={styles.rewardInfoLine}>Ödül paketi: rastgele kart, 10-100 token, 5-40 shard, 3 boss bileti.</Text>
          </View>
        ) : (
          <View style={styles.singleActionRow}>
            <ActionButton
              label={
                claimingReward
                  ? 'Bekleniyor…'
                  : weekOffset === -1
                    ? `${metricLabel} ödülünü al`
                    : 'Önce geçen haftayı aç'
              }
              icon="gift-outline"
              onPress={() => onClaimReward?.(metric)}
              disabled={!!claimingReward || weekOffset !== -1}
            />
          </View>
        )}
      </SectionCard>

      {error ? (
        <SectionCard>
          <View style={styles.errorRow}>
            <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#FFD6D6" />
            <Text style={styles.errorTitle}>Sıralama hatası</Text>
          </View>
          <Text style={styles.errorText}>{String(error)}</Text>
        </SectionCard>
      ) : null}
    </>
  ), [
    claimingReward,
    closeWeekLoading,
    closed,
    error,
    isAdmin,
    metric,
    metricIcon,
    metricLabel,
    dkd_metric_meta_value,
    myRank,
    myValue,
    onClaimReward,
    onClose,
    onCloseWeek,
    onMetricChange,
    onRefresh,
    onWeekOffsetChange,
    statusText,
    top3,
    topValue,
    weekLabel,
    weekOffset,
    weekText,
  ]);

  const footerComponent = useMemo(() => (
    myRow ? (
      <SectionCard>
        <Text style={styles.sectionTitle}>Senin sıran</Text>
        <Text style={styles.sectionSub}>Kendi pozisyonun altta sabit kalır; aramak zorunda kalmazsın.</Text>
        <View style={styles.myRowWrap}>
          <LeaderboardRow row={myRow} index={0} meUserId={meUserId} myBadge={myBadge} metric={metric} />
        </View>
      </SectionCard>
    ) : <View style={{ height: 30 }} />
  ), [meUserId, metric, myBadge, myRow]);

  return (
    <Modal visible={!!visible} animationType="slide" onRequestClose={onClose}>
      <SafeScreen style={styles.screen}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={[theme.colors.bgTop, theme.colors.bgMid, theme.colors.bgBottom]} style={styles.wrap}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle}>Liderlik</Text>
              <Text style={styles.headerSub}>Kim önde, sen neredesin, ödül var mı: hepsi daha net.</Text>
            </View>
            <SecondaryButton label="Kapat" onPress={onClose} />
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator />
              <Text style={styles.loadingText}>Sıralama yükleniyor…</Text>
            </View>
          ) : (
            <FlatList
              data={safeRows}
              keyExtractor={(item, index) => `${item?.rank ?? index}-${item?.user_id ?? index}`}
              renderItem={renderRow}
              ListHeaderComponent={headerComponent}
              ListFooterComponent={footerComponent}
              ListEmptyComponent={<EmptyState metric={metric} />}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={12}
              maxToRenderPerBatch={12}
              updateCellsBatchingPeriod={50}
              windowSize={7}
              removeClippedSubviews
            />
          )}
        </LinearGradient>
      </SafeScreen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050812' },
  wrap: { flex: 1 },
  header: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerCopy: { flex: 1, paddingRight: 12 },
  headerTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '900' },
  headerSub: { color: theme.colors.textSoft, marginTop: 4, fontWeight: '700' },
  listContent: { paddingBottom: 38, paddingTop: 10 },
  heroShell: { paddingHorizontal: 14, marginBottom: 12 },
  heroBadgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' },
  card: {
    marginHorizontal: 14,
    marginBottom: 12,
    borderRadius: 24,
    padding: 16,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  cardGlowCyan: {
    position: 'absolute',
    top: -26,
    right: -12,
    width: 132,
    height: 132,
    borderRadius: 999,
    backgroundColor: 'rgba(108,203,255,0.08)',
  },
  cardGlowGold: {
    position: 'absolute',
    bottom: -30,
    left: -16,
    width: 116,
    height: 116,
    borderRadius: 999,
    backgroundColor: 'rgba(243,199,119,0.06)',
  },
  heroTop: { flexDirection: 'row', alignItems: 'center' },
  heroCopy: { flex: 1, paddingRight: 10 },
  heroEyebrow: { color: GOLD, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  heroTitle: { color: '#FFFFFF', fontSize: 26, fontWeight: '900', marginTop: 4 },
  heroSubtitle: { color: theme.colors.textSoft, marginTop: 6, fontWeight: '700', lineHeight: 20 },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(246,197,95,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(246,197,95,0.22)',
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  statBox: {
    width: '31.5%',
    borderRadius: 18,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statLabel: { color: 'rgba(255,255,255,0.54)', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  statValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', marginTop: 4 },
  sectionTitle: { color: '#FFFFFF', fontSize: 19, fontWeight: '900' },
  sectionSub: { color: theme.colors.textSoft, marginTop: 6, fontWeight: '700', lineHeight: 20 },
  toggleRow: { flexDirection: 'row', marginTop: 14 },
  toggle: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    marginRight: 10,
  },
  toggleActive: {
    backgroundColor: 'rgba(123,230,255,0.14)',
    borderColor: 'rgba(123,230,255,0.28)',
  },
  toggleText: { color: theme.colors.textSoft, fontWeight: '900' },
  toggleTextActive: { color: '#FFFFFF' },
  actionsRow: { flexDirection: 'row', marginTop: 14 },
  actionWrap: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginRight: 10,
  },
  actionFill: {
    minHeight: 48,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  actionIcon: { marginRight: 8 },
  actionText: { fontWeight: '900', fontSize: 14 },
  actionPressed: { transform: [{ scale: 0.985 }] },
  actionDisabled: { opacity: 0.58 },
  singleActionRow: { marginTop: 14 },
  podiumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 16 },
  podiumCard: {
    width: '31%',
    minHeight: 126,
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  podiumCardTop: {
    minHeight: 144,
    backgroundColor: 'rgba(246,197,95,0.10)',
    borderColor: 'rgba(246,197,95,0.24)',
  },
  podiumName: { color: '#FFFFFF', fontWeight: '900', marginTop: 12, fontSize: 14 },
  podiumValue: { color: GOLD, fontWeight: '900', marginTop: 8, fontSize: 18 },
  podiumMeta: { color: theme.colors.textSoft, fontWeight: '700', marginTop: 6, textAlign: 'center' },
  rankPill: {
    minWidth: 52,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    paddingHorizontal: 10,
  },
  rankPillText: { fontWeight: '900', marginLeft: 6, fontSize: 12 },
  heroChip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  heroChipText: { fontSize: 11, fontWeight: '900' },
  errorRow: { flexDirection: 'row', alignItems: 'center' },
  errorTitle: { color: '#FFD6D6', fontSize: 18, fontWeight: '900', marginLeft: 8 },
  errorText: { color: theme.colors.textSoft, marginTop: 10, lineHeight: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  rowMe: {
    backgroundColor: 'rgba(123,230,255,0.08)',
    borderColor: 'rgba(123,230,255,0.22)',
  },
  rowBody: { flex: 1, paddingHorizontal: 12 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  rowName: { color: '#FFFFFF', fontWeight: '900', fontSize: 15, maxWidth: '72%' },
  rowSub: { color: theme.colors.textSoft, marginTop: 4, fontWeight: '700' },
  rowValueWrap: { alignItems: 'flex-end', minWidth: 54 },
  rowValue: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 },
  rowValueUnit: { color: theme.colors.textSoft, marginTop: 3, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  badgeChip: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeChipText: { fontSize: 10, fontWeight: '900' },
  myRowWrap: { marginTop: 14 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: theme.colors.textSoft, marginTop: 10, fontWeight: '700' },
  emptyWrap: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 34 },
  emptyTitle: { color: '#FFFFFF', fontWeight: '900', marginTop: 10, fontSize: 17 },
  emptySub: { color: theme.colors.textSoft, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  rewardInfoBox: { marginTop: 14, borderRadius: 18, padding: 14, backgroundColor: 'rgba(123,230,255,0.08)', borderWidth: 1, borderColor: 'rgba(123,230,255,0.18)' },
  rewardInfoLine: { color: '#FFFFFF', fontWeight: '800', lineHeight: 20 },
});

export default LeaderboardModal;
