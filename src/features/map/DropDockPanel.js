import React, { memo, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { dropAccent, formatNum } from '../../theme/minimalLootUi';
import RewardInfoSheet from './RewardInfoSheet';

function safeBossText(text, fallback = 'Hazır') {
  if (typeof text === 'function') {
    try { return String(text() || fallback); } catch { return fallback; }
  }
  return String(text || fallback);
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

function ActionButton({ label, icon, onPress, primary, compact = false }) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      <LinearGradient colors={primary ? ['#FFD56C', '#FFAB3A'] : ['#1A2339', '#101726']} style={[styles.actionBtn, compact && styles.actionBtnCompact]}>
        <View style={[styles.actionIconWrap, primary ? styles.actionIconWrapPrimary : styles.actionIconWrapSecondary]}>
          <MaterialCommunityIcons name={icon} size={compact ? 16 : 18} color={primary ? '#201508' : '#FFF'} />
        </View>
        <Text style={[styles.actionText, compact && styles.actionTextCompact, primary && styles.actionTextPrimary]}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

function DropDockPanel({ visibleCount, dockPreview, dockPreviewPending, hiddenBossCountToday, nextBossReturnText, isNear, etaTextFromDistance, onOpenList, onDirections }) {
  const [collapsed, setCollapsed] = useState(true);
  const [rewardVisible, setRewardVisible] = useState(false);
  const accent = dropAccent(dockPreview || {});
  const near = dockPreview && isNear ? isNear(dockPreview) : { ok: false, distance: null };
  const eta = etaTextFromDistance ? etaTextFromDistance(near?.distance) : 'Rota hazır';
  const bossMetricLabel = Number(hiddenBossCountToday || 0) > 0 ? 'Bugün' : 'Boss';
  const bossMetricValue = Number(hiddenBossCountToday || 0) > 0
    ? `${formatNum(hiddenBossCountToday)} tamam`
    : safeBossText(nextBossReturnText, 'Hazır');
  const reward = useMemo(() => getRewardMeta(dockPreview), [dockPreview]);

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <LinearGradient colors={['rgba(9,13,23,0.98)', 'rgba(14,20,34,0.98)']} style={[styles.shell, collapsed && styles.shellCollapsed]}>
        <View style={styles.compactTopRow}>
          <Pressable style={styles.identityRow} onPress={() => setCollapsed((prev) => !prev)}>
            <View style={[styles.typeIcon, { backgroundColor: accent.bg, borderColor: accent.border }]}> 
              <MaterialCommunityIcons name={accent.icon} size={18} color={accent.color} />
            </View>
            <View style={styles.headCopy}>
              <Text style={styles.kicker}>RADAR DESTEK PANELİ</Text>
              <Text style={styles.title} numberOfLines={1}>{dockPreview?.name || (dockPreviewPending ? 'Hedef yükleniyor' : 'Hedef seçilmedi')}</Text>
              <Text style={styles.sub} numberOfLines={1}>{dockPreview ? (near?.ok ? 'Sandık açmaya hazırsın.' : eta || 'Rota hazırlanıyor') : 'Listeden hedef seç.'}</Text>
            </View>
          </Pressable>

          <View style={styles.topActions}>
            <Pressable style={styles.topActionBtn} onPress={onOpenList}>
              <MaterialCommunityIcons name="format-list-bulleted-square" size={18} color="#FFFFFF" />
            </Pressable>
            <Pressable style={styles.topActionBtn} onPress={() => setCollapsed((prev) => !prev)}>
              <MaterialCommunityIcons name={collapsed ? 'chevron-up' : 'chevron-down'} size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        <View style={styles.compactInfoRow}>
          <View style={styles.compactPill}><Text style={styles.compactPillLabel}>Görünür</Text><Text style={styles.compactPillValue}>{formatNum(visibleCount || 0)}</Text></View>
          <View style={styles.compactPill}><Text style={styles.compactPillLabel}>Mesafe</Text><Text style={styles.compactPillValue}>{near?.distance == null ? '--' : `${Math.round(near.distance)} m`}</Text></View>
          <View style={styles.compactPill}><Text style={styles.compactPillLabel}>{bossMetricLabel}</Text><Text style={styles.compactPillValue}>{bossMetricValue}</Text></View>
          {reward ? (
            <Pressable style={[styles.compactPill, styles.compactPillReward]} onPress={() => setRewardVisible(true)}>
              <MaterialCommunityIcons name="gift-outline" size={14} color="#FFE8A6" />
              <Text style={[styles.compactPillValue, styles.compactPillValueReward]}>Ödül var</Text>
            </Pressable>
          ) : null}
        </View>

        {!collapsed ? (
          <>
            <View style={styles.statusBar}>
              <MaterialCommunityIcons name={near?.ok ? 'check-decagram' : 'map-marker-path'} size={16} color={near?.ok ? '#59E6A7' : '#62D6FF'} />
              <Text style={styles.statusText}>{dockPreview ? (near?.ok ? 'Sandık açmaya hazırsın.' : eta || 'Rota hazırlanıyor') : 'Önce bir hedef seç.'}</Text>
            </View>

            {reward ? (
              <Pressable style={styles.rewardCardWrap} onPress={() => setRewardVisible(true)}>
                <LinearGradient colors={['rgba(255,214,109,0.20)', 'rgba(255,173,61,0.07)']} style={styles.rewardCard}>
                  <View style={styles.rewardCardTop}>
                    <View style={styles.rewardBadge}>
                      <MaterialCommunityIcons name="gift-outline" size={15} color="#FFE8A6" />
                      <Text style={styles.rewardBadgeText}>ÖDÜL VAR</Text>
                    </View>
                    <View style={styles.rewardArrowWrap}>
                      <MaterialCommunityIcons name="chevron-right" size={20} color="#FFE8A6" />
                    </View>
                  </View>
                  <Text style={styles.rewardTitle} numberOfLines={1}>{reward.title}</Text>
                  <Text style={styles.rewardMeta} numberOfLines={2}>{[reward.business, reward.campaign].filter(Boolean).join(' • ') || 'Detay için dokun'}</Text>
                  <View style={styles.rewardStatsRow}>
                    <View style={styles.rewardStatPill}><Text style={styles.rewardStatLabel}>Kalan</Text><Text style={styles.rewardStatValue}>{reward.stockLeft}</Text></View>
                    <View style={styles.rewardStatPill}><Text style={styles.rewardStatLabel}>Son kullanım</Text><Text style={styles.rewardStatValue}>{reward.expiresAt}</Text></View>
                    <View style={styles.rewardStatPill}><Text style={styles.rewardStatLabel}>Oyuncu</Text><Text style={styles.rewardStatValue}>{reward.playersToday}</Text></View>
                  </View>
                  <Text style={styles.rewardHint}>Dokun ve kampanya detayını aç.</Text>
                </LinearGradient>
              </Pressable>
            ) : null}

            <View style={styles.actionRow}>
              <ActionButton label="Liste" icon="format-list-bulleted-square" onPress={onOpenList} compact />
              <View style={{ width: 10 }} />
              <ActionButton label={dockPreview ? 'Konuma Git' : 'Hedef Seç'} icon="radar" onPress={() => dockPreview ? onDirections?.(dockPreview) : onOpenList?.()} primary compact />
            </View>
          </>
        ) : (
          <View style={styles.collapsedActionRow}>
            <ActionButton label="Liste" icon="format-list-bulleted-square" onPress={onOpenList} compact />
            <View style={{ width: 8 }} />
            <ActionButton label={dockPreview ? 'Konuma Git' : 'Seç'} icon="radar" onPress={() => dockPreview ? onDirections?.(dockPreview) : onOpenList?.()} primary compact />
          </View>
        )}
      </LinearGradient>

      <RewardInfoSheet visible={rewardVisible} reward={reward} onClose={() => setRewardVisible(false)} />
    </View>
  );
}

export default memo(DropDockPanel);

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 10, right: 10, bottom: 10, zIndex: 30 },
  shell: {
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(126,154,255,0.18)',
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  shellCollapsed: { paddingBottom: 10 },
  compactTopRow: { flexDirection: 'row', alignItems: 'center' },
  identityRow: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center' },
  typeIcon: { width: 46, height: 46, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headCopy: { flex: 1, minWidth: 0, marginLeft: 10 },
  kicker: { color: '#69DAFF', fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: '#FFF', fontSize: 18, fontWeight: '900', marginTop: 2 },
  sub: { color: 'rgba(255,255,255,0.70)', fontSize: 12, lineHeight: 16, marginTop: 5 },
  topActions: { flexDirection: 'row', alignItems: 'center', marginLeft: 10 },
  topActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  compactInfoRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  compactPill: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 11,
    marginRight: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  compactPillReward: {
    backgroundColor: 'rgba(255,214,109,0.12)',
    borderColor: 'rgba(255,214,109,0.18)',
  },
  compactPillLabel: { color: 'rgba(255,255,255,0.56)', fontSize: 10, fontWeight: '800', marginRight: 6 },
  compactPillValue: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  compactPillValueReward: { color: '#FFE8A6', marginLeft: 6 },
  statusBar: { minHeight: 40, borderRadius: 15, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginTop: 4, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  statusText: { color: '#E8EEFF', fontSize: 12, fontWeight: '800', marginLeft: 8, flex: 1 },
  rewardCardWrap: { marginTop: 10 },
  rewardCard: { borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,214,109,0.20)', padding: 12 },
  rewardCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rewardBadge: { alignSelf: 'flex-start', minHeight: 30, borderRadius: 999, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,226,163,0.12)', borderWidth: 1, borderColor: 'rgba(255,226,163,0.22)' },
  rewardArrowWrap: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,226,163,0.08)' },
  rewardBadgeText: { color: '#FFE8A6', fontSize: 12, fontWeight: '900', marginLeft: 6 },
  rewardTitle: { color: '#FFF4CC', fontSize: 17, fontWeight: '900', marginTop: 10 },
  rewardMeta: { color: 'rgba(255,245,214,0.82)', fontSize: 12, lineHeight: 17, marginTop: 4 },
  rewardStatsRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  rewardStatPill: { minHeight: 36, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,226,163,0.14)' },
  rewardStatLabel: { color: 'rgba(255,245,214,0.62)', fontSize: 10, fontWeight: '800' },
  rewardStatValue: { color: '#FFF4CC', fontSize: 12, fontWeight: '900', marginTop: 3 },
  rewardHint: { color: 'rgba(255,245,214,0.72)', fontSize: 11, fontWeight: '800', marginTop: 8 },
  actionRow: { flexDirection: 'row', marginTop: 12 },
  collapsedActionRow: { flexDirection: 'row', marginTop: 2 },
  actionBtn: {
    minHeight: 48,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
    paddingHorizontal: 14,
  },
  actionBtnCompact: { minHeight: 46 },
  actionIconWrap: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionIconWrapPrimary: { backgroundColor: 'rgba(32,21,8,0.14)' },
  actionIconWrapSecondary: { backgroundColor: 'rgba(255,255,255,0.08)' },
  actionText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', marginLeft: 8 },
  actionTextCompact: { fontSize: 13 },
  actionTextPrimary: { color: '#201508' },
});
