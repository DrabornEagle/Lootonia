import React, { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Pill from '../../components/ui/Pill';
import SecondaryButton from '../../components/ui/SecondaryButton';
import {
  etaTextFromDistance,
  getDropDistanceState,
  getDropPriority,
  getDropVisual,
  isNearbyCandidate,
} from '../../utils/geo';
import { formatRemain, trDropType } from '../../utils/text';
import SafeScreen from '../../components/layout/SafeScreen';
import { cityLootTheme as theme } from '../../theme/cityLootTheme';
import { dkd_make_native_axis_point } from '../../utils/dkdNativeAxis';
import { tapFeedback } from '../../services/feedbackService';
import RewardInfoSheet from './RewardInfoSheet';

const FILTERS = [
  { key: 'all', label: 'Tümü', icon: 'view-grid-outline' },
  { key: 'near', label: 'Yakın', icon: 'crosshairs-gps' },
  { key: 'reward', label: 'Ödüllü', icon: 'gift-outline' },
  { key: 'boss', label: 'Boss', icon: 'crown-outline' },
  { key: 'qr', label: 'QR', icon: 'qrcode-scan' },
];

function getRewardMeta(drop) {
  if (!drop?.has_active_campaign) return null;
  return {
    title: String(drop?.reward_badge_label || 'Aktif ödül'),
    business: String(drop?.business_name || ''),
    campaign: String(drop?.campaign_title || ''),
    stockLeft: safeRewardStock(drop?.campaign_stock_left),
    expiresAt: formatRewardExpiry(drop?.campaign_expires_at),
    playersToday: safeRewardTraffic(drop?.campaign_players_total ?? drop?.campaign_players_today),
  };
}


function formatRewardExpiry(value) {
  const raw = String(value || '').trim();
  if (!raw) return 'Süre yok';
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return 'Süre yok';
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = months[dt.getMonth()] || '';
  const hh = String(dt.getHours()).padStart(2, '0');
  const min = String(dt.getMinutes()).padStart(2, '0');
  return `${dd} ${mm} • ${hh}:${min}`;
}

function safeRewardStock(value) {
  const dkd_iteration_value = Number(value || 0);
  return Number.isFinite(dkd_iteration_value) && dkd_iteration_value > 0 ? String(dkd_iteration_value) : 'Sınırsız';
}

function safeRewardTraffic(value) {
  const dkd_iteration_value = Number(value || 0);
  return Number.isFinite(dkd_iteration_value) ? String(dkd_iteration_value) : '0';
}

const SummaryChip = memo(function SummaryChip({ icon, label, value, tone = 'cyan' }) {
  const color = tone === 'gold'
    ? theme.colors.goldSoft
    : tone === 'green'
      ? theme.colors.green
      : theme.colors.cyanSoft;

  return (
    <View style={dkd_styles.summaryChip}>
      <MaterialCommunityIcons name={icon} size={15} color={color} />
      <Text style={dkd_styles.summaryLabel}>{label}</Text>
      <Text style={dkd_styles.summaryValue}>{value}</Text>
    </View>
  );
});

const FilterChip = memo(function FilterChip({ item, active, count, onPress }) {
  return (
    <Pressable
      onPress={function () { onPress(item.key); }}
      style={[dkd_styles.filterChip, active && dkd_styles.filterChipActive]}
    >
      <MaterialCommunityIcons name={item.icon} size={16} color={active ? '#06101A' : theme.colors.textSoft} />
      <Text style={[dkd_styles.filterText, active && dkd_styles.filterTextActive]}>{item.label}</Text>
      <View style={[dkd_styles.filterCount, active && dkd_styles.filterCountActive]}>
        <Text style={[dkd_styles.filterCountText, active && dkd_styles.filterCountTextActive]}>{count}</Text>
      </View>
    </Pressable>
  );
});

function ActionButton({ label, onPress, primary = false, disabled = false, icon }) {
  const content = (
    <>
      <MaterialCommunityIcons name={icon || 'arrow-right'} size={16} color={primary ? '#FFFFFF' : theme.colors.text} />
      <Text style={primary ? dkd_styles.primaryBtnText : dkd_styles.ghostBtnText}>{label}</Text>
    </>
  );

  return (
    <Pressable
      onPress={function () {
        if (disabled) return;
        tapFeedback();
        onPress?.();
      }}
      disabled={disabled}
      style={({ pressed }) => [dkd_styles.actionPressable, disabled && dkd_styles.actionDisabled, pressed && !disabled && dkd_styles.actionPressed]}
    >
      {primary ? (
        <LinearGradient colors={['#45CFFF', '#1D78FF']} start={dkd_make_native_axis_point(0, 0)} end={dkd_make_native_axis_point(1, 1)} style={dkd_styles.primaryBtn}>
          {content}
        </LinearGradient>
      ) : (
        <View style={dkd_styles.ghostBtn}>{content}</View>
      )}
    </Pressable>
  );
}

function buildReadyText(drop, cooldown) {
  if (cooldown?.isCooldown) return 'Beklemede';
  if (String(drop?.type || '').toLowerCase() === 'boss') return 'Boss hazır';
  if (String(drop?.type || '').toLowerCase() === 'qr') return 'QR hazır';
  return 'Açmaya hazır';
}

const LeadCard = memo(function LeadCard({ lead, getCooldown, isNear, onNavigate, onOpen }) {
  if (!lead) return null;

  const leadNear = isNear(lead);
  const leadState = getDropDistanceState(leadNear);
  const leadCooldown = getCooldown(lead);
  const leadVisual = getDropVisual(lead);
  const canOpen = !leadCooldown.isCooldown && (leadNear.ok || (lead.lat == null && lead.lng == null));
  const distanceText = leadNear?.distance == null ? 'Mesafe yok' : Math.round(leadNear.distance) + 'm';
  const etaText = etaTextFromDistance(leadNear?.distance);
  const readyText = leadCooldown.isCooldown ? 'Bekleme ' + formatRemain(leadCooldown.remainSec) : 'Hazır';

  return (
    <View style={dkd_styles.leadWrap}>
      <LinearGradient colors={['rgba(15,24,39,0.98)', 'rgba(10,18,30,0.96)']} style={dkd_styles.leadCard}>
        <View style={dkd_styles.leadTop}>
          <View style={dkd_styles.sectionTag}>
            <Text style={dkd_styles.sectionTagText}>Sıradaki hedef</Text>
          </View>
          <Text style={dkd_styles.leadDistance}>{distanceText}</Text>
        </View>

        <View style={dkd_styles.leadBody}>
          <LinearGradient colors={leadVisual.bg || ['#133356', '#0C1523']} style={dkd_styles.leadIconWrap}>
            <Text style={[dkd_styles.leadIcon, { color: leadVisual.color }]}>{leadVisual.icon}</Text>
          </LinearGradient>

          <View style={dkd_styles.leadBodyContent}>
            <Text style={dkd_styles.leadTitle} numberOfLines={1}>{lead.name}</Text>
            <Text style={dkd_styles.leadSub} numberOfLines={1}>{trDropType(lead.type)} • {etaText}</Text>

            <View style={dkd_styles.infoRow}>
              <View style={dkd_styles.pillWrap}>
                <Pill text={readyText} tone={leadCooldown.isCooldown ? 'cooldown' : 'good'} />
              </View>
              <View style={dkd_styles.pillWrap}>
                <Pill text={leadState.label} tone={leadState.tone} />
              </View>
            </View>
          </View>
        </View>

        <Text style={dkd_styles.leadHint}>
          {canOpen ? 'Açmak için uygunsun.' : 'Önce yaklaş, sonra aç.'}
        </Text>

        <View style={dkd_styles.actionRow}>
          <View style={[dkd_styles.actionSlot, dkd_styles.actionSlotGap]}>
            <ActionButton label="Haritada Git" icon="map-marker-path" onPress={function () { onNavigate?.(lead); }} />
          </View>
          <View style={dkd_styles.actionSlot}>
            <ActionButton label="Aç" icon="lock-open-variant-outline" primary disabled={!canOpen} onPress={function () { onOpen?.(lead); }} />
          </View>
        </View>
      </LinearGradient>
    </View>
  );
});

const DropRow = memo(function DropRow({ drop, getCooldown, isNear, onNavigate, onOpen, onRewardPress }) {
  const near = isNear(drop);
  const cooldown = getCooldown(drop);
  const visual = getDropVisual(drop);
  const canOpen = !cooldown.isCooldown && (near.ok || (drop.lat == null && drop.lng == null));
  const distanceState = getDropDistanceState(near);
  const distanceText = near.distance == null ? 'Mesafe yok' : Math.round(near.distance) + 'm';
  const readyText = buildReadyText(drop, cooldown);
  const helperText = canOpen ? 'Şimdi açılabilir.' : cooldown.isCooldown ? 'Bekleme süresi bitince açılır.' : 'Bölgeye yaklaşınca açılır.';

  return (
    <View style={dkd_styles.rowCard}>
      <View style={dkd_styles.rowHeader}>
        <LinearGradient colors={visual.bg || ['#143158', '#0A1729']} style={dkd_styles.rowIconWrap}>
          <Text style={[dkd_styles.rowIcon, { color: visual.color }]}>{visual.icon}</Text>
        </LinearGradient>

        <View style={dkd_styles.rowHeaderContent}>
          <View style={dkd_styles.rowTitleLine}>
            <Text style={dkd_styles.rowTitle} numberOfLines={1}>{drop.name}</Text>
            <View style={dkd_styles.rowTypeBadge}>
              <Text style={dkd_styles.rowTypeBadgeText}>{visual.tag}</Text>
            </View>
          </View>

          <Text style={dkd_styles.rowMeta} numberOfLines={1}>
            {trDropType(drop.type)} • {etaTextFromDistance(near.distance)}
          </Text>
        </View>
      </View>

      <View style={dkd_styles.infoRow}>
        <View style={dkd_styles.pillWrap}>
          <Pill text={distanceText} tone={near.ok ? 'good' : 'default'} />
        </View>
        <View style={dkd_styles.pillWrap}>
          <Pill text={distanceState.label} tone={distanceState.tone} />
        </View>
        <View style={dkd_styles.pillWrap}>
          {cooldown.isCooldown
            ? <Pill text={'Bekleme ' + formatRemain(cooldown.remainSec)} tone="cooldown" />
            : <Pill text={readyText} tone="good" />}
        </View>
      </View>

      <Text style={dkd_styles.rowHint}>{helperText}</Text>

      {drop?.has_active_campaign ? (
        <Pressable style={dkd_styles.rewardStrip} onPress={function () { onRewardPress?.(drop); }}>
          <View style={dkd_styles.rewardStripBadge}>
            <MaterialCommunityIcons name="gift-outline" size={18} color="#FFE8A6" />
          </View>
          <View style={dkd_styles.rewardStripBody}>
            <Text style={dkd_styles.rewardStripTitle} numberOfLines={1}>{String(drop?.reward_badge_label || 'Aktif ödül')}</Text>
            <Text style={dkd_styles.rewardStripMeta} numberOfLines={1}>{[drop?.business_name, drop?.campaign_title].filter(Boolean).join(' • ') || 'Detay için dokun'}</Text>
            <View style={dkd_styles.rewardMetaRow}>
              <Text style={dkd_styles.rewardMiniMeta}>Kalan {safeRewardStock(drop?.campaign_stock_left)}</Text>
              <Text style={dkd_styles.rewardMiniMeta}>Son {formatRewardExpiry(drop?.campaign_expires_at)}</Text>
              <Text style={dkd_styles.rewardMiniMeta}>Oyuncu {safeRewardTraffic(drop?.campaign_players_total ?? drop?.campaign_players_today)}</Text>
            </View>
          </View>
        </Pressable>
      ) : null}

      <View style={dkd_styles.actionRow}>
        <View style={[dkd_styles.actionSlot, dkd_styles.actionSlotGap]}>
          <ActionButton label="Git" icon="map-marker-outline" onPress={function () { onNavigate?.(drop); }} />
        </View>
        <View style={dkd_styles.actionSlot}>
          <ActionButton label="Aç" icon="lock-open-variant-outline" primary disabled={!canOpen} onPress={function () { onOpen?.(drop); }} />
        </View>
      </View>
    </View>
  );
});

function DropListModal({ visible, onClose, drops, getCooldown, isNear, onNavigate, onOpen, onLocate }) {
  const [filter, setFilter] = useState('all');
  const [rewardTarget, setRewardTarget] = useState(null);

  const sortedBase = useMemo(function () {
    return [].concat(drops || []).sort(function (dkd_drop_left, dkd_drop_right) {
      const dkd_left_near = isNear(dkd_drop_left);
      const dkd_right_near = isNear(dkd_drop_right);
      const dkd_left_cooldown = getCooldown(dkd_drop_left);
      const dkd_right_cooldown = getCooldown(dkd_drop_right);
      const dkd_left_priority = getDropPriority(dkd_drop_left, dkd_left_near, dkd_left_cooldown);
      const dkd_right_priority = getDropPriority(dkd_drop_right, dkd_right_near, dkd_right_cooldown);

      if (dkd_right_priority !== dkd_left_priority) return dkd_right_priority - dkd_left_priority;
      return (dkd_left_near && dkd_left_near.distance != null ? dkd_left_near.distance : 999999) - (dkd_right_near && dkd_right_near.distance != null ? dkd_right_near.distance : 999999);
    });
  }, [drops, isNear, getCooldown]);

  const filterCounts = useMemo(function () {
    return {
      all: sortedBase.length,
      near: sortedBase.filter(function (dkd_drop_item) { return isNearbyCandidate(dkd_drop_item, isNear(dkd_drop_item)); }).length,
      reward: sortedBase.filter(function (dkd_drop_item) { return !!dkd_drop_item?.has_active_campaign; }).length,
      boss: sortedBase.filter(function (dkd_drop_item) { return String(dkd_drop_item?.type) === 'boss'; }).length,
      qr: sortedBase.filter(function (dkd_drop_item) { return String(dkd_drop_item?.type) === 'qr'; }).length,
    };
  }, [sortedBase, isNear]);

  const filtered = useMemo(function () {
    if (filter === 'near') return sortedBase.filter(function (dkd_drop_item) { return isNearbyCandidate(dkd_drop_item, isNear(dkd_drop_item)); });
    if (filter === 'reward') return sortedBase.filter(function (dkd_drop_item) { return !!dkd_drop_item?.has_active_campaign; });
    if (filter === 'boss') return sortedBase.filter(function (dkd_drop_item) { return String(dkd_drop_item?.type) === 'boss'; });
    if (filter === 'qr') return sortedBase.filter(function (dkd_drop_item) { return String(dkd_drop_item?.type) === 'qr'; });
    return sortedBase;
  }, [filter, isNear, sortedBase]);

  const readyCount = useMemo(function () {
    return sortedBase.filter(function (drop) { return !getCooldown(drop).isCooldown; }).length;
  }, [sortedBase, getCooldown]);

  const nearCount = filterCounts.near;
  const rewardCount = filterCounts.reward;
  const bossCount = filterCounts.boss;

  const renderRow = useCallback(function ({ item }) {
    return <DropRow drop={item} getCooldown={getCooldown} isNear={isNear} onNavigate={onNavigate} onOpen={onOpen} onRewardPress={setRewardTarget} />;
  }, [getCooldown, isNear, onNavigate, onOpen]);

  const headerBlock = useMemo(function () {
    return (
      <>
        <View style={dkd_styles.header}>
          <View style={dkd_styles.headerLeft}>
            <Text style={dkd_styles.kicker}>DROP RADARI</Text>
            <Text style={dkd_styles.title}>Yakındaki sandıklar</Text>
            <Text style={dkd_styles.subtitle}>Bir hedef seç, haritada git ve uygun olunca aç.</Text>
          </View>

          <View style={dkd_styles.headerRight}>
            <Pressable style={dkd_styles.locateBtn} onPress={onLocate}>
              <MaterialCommunityIcons name="crosshairs-gps" size={18} color={theme.colors.cyanSoft} />
            </Pressable>
            <SecondaryButton label="Kapat" icon="close" tone="ghost" size="compact" fullWidth={false} onPress={onClose} />
          </View>
        </View>

        <View style={dkd_styles.quickGuide}>
          <Text style={dkd_styles.quickGuideText}>Akış: Hedef seç → Konuma git → Aç</Text>
        </View>

        <View style={dkd_styles.summaryRow}>
          <SummaryChip icon="flash-outline" label="Hazır" value={String(readyCount)} tone="green" />
          <SummaryChip icon="map-marker-radius-outline" label="Yakın" value={String(nearCount)} />
          <SummaryChip icon="gift-outline" label="Ödüllü" value={String(rewardCount)} tone="gold" />
          <SummaryChip icon="crown-outline" label="Boss" value={String(bossCount)} tone="gold" />
        </View>

        <View style={dkd_styles.filterSection}>
          <View style={dkd_styles.filterSectionTop}>
            <Text style={dkd_styles.filterTitle}>Filtre</Text>
            <Text style={dkd_styles.filterSubtitle}>{filtered.length} hedef gösteriliyor</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={dkd_styles.filterScrollContent}
          >
            {FILTERS.map(function (item) {
              return (
                <FilterChip
                  key={item.key}
                  item={item}
                  active={filter === item.key}
                  count={filterCounts[item.key] || 0}
                  onPress={setFilter}
                />
              );
            })}
          </ScrollView>
        </View>
      </>
    );
  }, [bossCount, filter, filterCounts, filtered.length, getCooldown, isNear, nearCount, onClose, onLocate, onNavigate, onOpen, readyCount, rewardCount]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={dkd_styles.backdrop}>
        <SafeScreen style={dkd_styles.safe}>
          <LinearGradient colors={['#050914', '#0A1423', '#0B1020']} style={dkd_styles.shell}>
            <FlatList
              data={filtered}
              keyExtractor={function (item, index) { return 'drop-' + String(item?.id || item?.name || 'row') + '-' + index; }}
              renderItem={renderRow}
              ListHeaderComponent={headerBlock}
              contentContainerStyle={dkd_styles.listContent}
              ListEmptyComponent={
                <View style={dkd_styles.emptyBox}>
                  <Text style={dkd_styles.emptyTitle}>Bu filtrede hedef görünmüyor</Text>
                  <Text style={dkd_styles.emptySub}>Başka filtre seç ya da biraz hareket edip listeyi yenile.</Text>
                </View>
              }
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            />
            <RewardInfoSheet visible={!!rewardTarget} reward={rewardTarget ? getRewardMeta(rewardTarget) : null} onClose={function () { setRewardTarget(null); }} />
          </LinearGradient>
        </SafeScreen>
      </View>
    </Modal>
  );
}

const dkd_styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(2,6,12,0.88)' },
  safe: { flex: 1 },
  shell: { flex: 1, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
  listContent: { paddingBottom: 28 },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerLeft: { flex: 1, minWidth: 0, paddingRight: 10 },
  kicker: { color: theme.colors.cyanSoft, fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '900', marginTop: 4 },
  subtitle: { color: theme.colors.textSoft, fontSize: 13, lineHeight: 18, marginTop: 6 },
  headerRight: { alignItems: 'center', gap: 10 },
  locateBtn: {
    width: 44,
    height: 44,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(103,227,255,0.24)',
    backgroundColor: 'rgba(103,227,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickGuide: {
    marginHorizontal: 16,
    marginTop: 2,
    marginBottom: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(103,227,255,0.14)',
    backgroundColor: 'rgba(103,227,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  quickGuideText: { color: theme.colors.text, fontSize: 12, fontWeight: '800' },

  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    marginRight: 8,
    marginBottom: 8,
  },
  summaryLabel: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '800', marginLeft: 6 },
  summaryValue: { color: theme.colors.text, fontSize: 12, fontWeight: '900', marginLeft: 6 },

  leadWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  leadCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 14,
    overflow: 'hidden',
  },
  leadTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  sectionTagText: { color: theme.colors.cyanSoft, fontSize: 11, fontWeight: '900' },
  leadDistance: { color: theme.colors.goldSoft, fontSize: 13, fontWeight: '900' },
  leadBody: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  leadBodyContent: { flex: 1, minWidth: 0 },
  leadIconWrap: {
    width: 62,
    height: 62,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  leadIcon: { fontSize: 27 },
  leadTitle: { color: theme.colors.text, fontSize: 20, fontWeight: '900' },
  leadSub: { color: theme.colors.textSoft, fontSize: 12, marginTop: 4, fontWeight: '700' },
  leadHint: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 12 },

  filterSection: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    overflow: 'hidden',
  },
  filterSectionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  filterTitle: { color: theme.colors.text, fontSize: 13, fontWeight: '900' },
  filterSubtitle: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '800' },
  filterScrollContent: { paddingHorizontal: 14, paddingBottom: 12, paddingRight: 20 },
  filterChip: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginRight: 10,
  },
  filterChipActive: { backgroundColor: theme.colors.cyanSoft, borderColor: theme.colors.cyanSoft },
  filterText: { color: theme.colors.text, fontWeight: '800', marginLeft: 8 },
  filterTextActive: { color: '#07101A' },
  filterCount: {
    minWidth: 24,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    paddingHorizontal: 7,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  filterCountActive: { backgroundColor: 'rgba(6,16,26,0.12)' },
  filterCountText: { color: theme.colors.textSoft, fontSize: 11, fontWeight: '900' },
  filterCountTextActive: { color: '#06101A' },

  rowCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  rowHeader: { flexDirection: 'row', alignItems: 'center' },
  rowHeaderContent: { flex: 1, minWidth: 0 },
  rowIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  rowIcon: { fontSize: 23 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center' },
  rowTitle: { flex: 1, color: theme.colors.text, fontSize: 18, fontWeight: '900', paddingRight: 8 },
  rowTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  rowTypeBadgeText: { color: theme.colors.goldSoft, fontSize: 11, fontWeight: '900' },
  rowMeta: { color: theme.colors.textSoft, fontSize: 12, marginTop: 4, fontWeight: '700' },
  rowHint: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 12 },
  rewardStrip: {
    marginTop: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,214,109,0.24)',
    backgroundColor: 'transparent',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  rewardStripBadge: {
    minHeight: 32,
    borderRadius: 999,
    paddingHorizontal: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  rewardStripBadgeText: { color: '#FFE8A6', fontSize: 12, fontWeight: '900', marginLeft: 6 },
  rewardStripBody: { flex: 1, minWidth: 0, marginLeft: 10, backgroundColor: 'transparent' },
  rewardStripTitle: { color: '#FFF4CC', fontSize: 16, fontWeight: '900' },
  rewardStripMeta: { color: 'rgba(255,245,214,0.88)', fontSize: 12, lineHeight: 17, marginTop: 4, backgroundColor: 'transparent' },
  rewardMetaRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, backgroundColor: 'transparent' },
  rewardMiniMeta: { color: '#FFF4CC', fontSize: 11, fontWeight: '900', marginRight: 10, marginTop: 2 },

  infoRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  pillWrap: { marginRight: 8, marginBottom: 8 },
  actionRow: { flexDirection: 'row', marginTop: 14 },
  actionSlot: { flex: 1, minWidth: 0 },
  actionSlotGap: { marginRight: 10 },
  actionPressable: { width: '100%' },
  actionDisabled: { opacity: 0.45 },
  actionPressed: { transform: [{ scale: 0.985 }] },
  primaryBtn: {
    minHeight: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(193,237,255,0.32)',
    overflow: 'hidden',
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', marginLeft: 8 },
  ghostBtn: {
    minHeight: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  ghostBtnText: { color: theme.colors.text, fontSize: 13, fontWeight: '900', marginLeft: 8 },

  emptyBox: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 18,
    marginHorizontal: 16,
    marginTop: 2,
  },
  emptyTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '900' },
  emptySub: { color: theme.colors.textSoft, fontSize: 13, lineHeight: 18, marginTop: 6 },
});

export default memo(DropListModal);
