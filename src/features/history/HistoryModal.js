import React, { memo, useMemo } from 'react';
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
import SafeScreen from '../../components/layout/SafeScreen';
import SecondaryButton from '../../components/ui/SecondaryButton';
import FuturisticCardTile from '../collection/FuturisticCardTile';
import { rarityTone } from '../../utils/rarity';
import { trDropType, trRarity, trSeries } from '../../utils/text';
import { cityLootTheme as theme } from '../../theme/cityLootTheme';

const CYAN = '#7BE6FF';

function SectionCard({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function Pill({ text, tone = 'default' }) {
  const map = {
    default: { bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.12)', color: '#FFFFFF' },
    rare: { bg: 'rgba(123,230,255,0.14)', border: 'rgba(123,230,255,0.28)', color: CYAN },
    epic: { bg: 'rgba(179,154,255,0.14)', border: 'rgba(179,154,255,0.28)', color: '#E8DDFF' },
    legendary: { bg: 'rgba(246,197,95,0.14)', border: 'rgba(246,197,95,0.28)', color: '#FFE7B1' },
    good: { bg: 'rgba(88,226,171,0.14)', border: 'rgba(88,226,171,0.28)', color: '#D9FFE9' },
  };
  const current = map[tone] || map.default;
  return (
    <View style={[styles.pill, { backgroundColor: current.bg, borderColor: current.border }]}>
      <Text style={[styles.pillText, { color: current.color }]}>{text}</Text>
    </View>
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

function toneForLog(item) {
  if (item?.card?.rarity) return rarityTone(item.card.rarity);
  if (Number(item?.gained_token) > 0) return 'good';
  return 'default';
}

function EmptyState() {
  return (
    <View style={styles.emptyWrap}>
      <MaterialCommunityIcons name="archive-outline" size={26} color="rgba(255,255,255,0.56)" />
      <Text style={styles.emptyTitle}>Henüz geçmiş kaydı yok</Text>
      <Text style={styles.emptySub}>Sandık açınca, token kazanınca ve kart düşünce bu ekran dolacak.</Text>
    </View>
  );
}

const HistoryRow = memo(function HistoryRow({ item, onOpenCard }) {
  const card = item?.card || null;
  const title = card ? (card.name || item?.title || 'Kart kaydı') : (item?.title || 'Kayıt');
  const stamp = item?.created_at
    ? new Date(item.created_at).toLocaleString('tr-TR')
    : 'Tarih yok';
  const topTone = toneForLog(item);

  return (
    <SectionCard style={styles.rowCardWrap}>
      <View style={styles.rowTop}>
        <View style={styles.rowCopy}>
          <Text style={styles.rowStamp}>{stamp}</Text>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.rowSub}>
            {trDropType(item?.drop_type)}
            {Number(item?.gained_token) > 0 ? ` • +${Number(item.gained_token)} token` : ''}
          </Text>
        </View>
        <Pill text={item?.badge || 'Kayıt'} tone={topTone} />
      </View>

      {card ? (
        <Pressable onPress={() => onOpenCard?.({ ...card, dropType: item?.drop_type })} style={styles.cardPreviewWrap}>
          <FuturisticCardTile
            name={card.name}
            rarity={card.rarity}
            series={card.series}
            theme={card.theme}
            dropType={item?.drop_type}
            imageUrl={card?.art_image_url || ''}
            serialCode={card?.serial_code || ''}
            compact
          />
        </Pressable>
      ) : null}

      <View style={styles.pillsRow}>
        {card?.rarity ? <Pill text={trRarity(card.rarity)} tone={rarityTone(card.rarity)} /> : null}
        {card?.series ? <Pill text={trSeries(card.series)} tone="rare" /> : null}
        {card?.theme ? <Pill text={String(card.theme)} tone="epic" /> : null}
        {Number(item?.gained_token) > 0 ? <Pill text={`+${Number(item.gained_token)} TOKEN`} tone="good" /> : null}
      </View>
    </SectionCard>
  );
});

export default function HistoryModal({ visible, onClose, logs, loading, onRefresh, onOpenCard }) {
  const safeLogs = Array.isArray(logs) ? logs : [];

  const stats = useMemo(() => {
    const total = safeLogs.length;
    const cards = safeLogs.filter((item) => item?.card).length;
    const tokens = safeLogs.reduce((sum, item) => sum + Number(item?.gained_token || 0), 0);
    return { total, cards, tokens };
  }, [safeLogs]);

  return (
    <Modal visible={!!visible} animationType="slide" onRequestClose={onClose}>
      <SafeScreen style={styles.screen}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={[theme.colors.bgTop, theme.colors.bgMid, theme.colors.bgBottom]} style={styles.wrap}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle}>Geçmiş</Text>
              <Text style={styles.headerSub}>Ne kazandın, ne düştü, ne zaman oldu: daha sade arşiv görünümü.</Text>
            </View>
            <SecondaryButton label="Kapat" onPress={onClose} />
          </View>

          <SectionCard>
            <Text style={styles.heroEyebrow}>OPERASYON GEÇMİŞİ</Text>
            <Text style={styles.heroTitle}>Son hareket kayıtları</Text>
            <Text style={styles.heroSubtitle}>Kart, token ve sandık kayıtlarını tek panelden takip et.</Text>

            <View style={styles.statsRow}>
              <StatBox label="Kayıt" value={String(stats.total)} icon="archive-outline" accent="rgba(123,230,255,0.88)" />
              <StatBox label="Kart" value={String(stats.cards)} icon="cards-outline" accent="rgba(179,154,255,0.88)" />
              <StatBox label="Token" value={String(stats.tokens)} icon="cash-multiple" accent="rgba(246,197,95,0.88)" />
            </View>

            <View style={styles.actionsRow}>
              <View style={styles.actionSlot}>
                <SecondaryButton label="Yenile" onPress={onRefresh} disabled={loading} />
              </View>
            </View>
          </SectionCard>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator />
              <Text style={styles.loadingText}>Geçmiş yükleniyor…</Text>
            </View>
          ) : (
            <FlatList
              data={safeLogs}
              keyExtractor={(item, index) => String(item?.id || index)}
              renderItem={({ item }) => <HistoryRow item={item} onOpenCard={onOpenCard} />}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={<EmptyState />}
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
  card: {
    marginHorizontal: 14,
    marginBottom: 12,
    borderRadius: 24,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  heroEyebrow: { color: CYAN, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  heroTitle: { color: '#FFFFFF', fontSize: 26, fontWeight: '900', marginTop: 4 },
  heroSubtitle: { color: theme.colors.textSoft, marginTop: 6, fontWeight: '700', lineHeight: 20 },
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
  actionsRow: { flexDirection: 'row', marginTop: 14 },
  actionSlot: { width: 130 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: theme.colors.textSoft, marginTop: 10, fontWeight: '700' },
  listContent: { paddingBottom: 36 },
  emptyWrap: {
    marginHorizontal: 14,
    marginTop: 4,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 34,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  emptyTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', marginTop: 12 },
  emptySub: { color: theme.colors.textSoft, textAlign: 'center', lineHeight: 20, marginTop: 8 },
  rowCardWrap: { marginBottom: 0 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  rowCopy: { flex: 1, paddingRight: 10 },
  rowStamp: { color: CYAN, fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
  rowTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '900', marginTop: 6 },
  rowSub: { color: theme.colors.textSoft, marginTop: 4, fontWeight: '700' },
  cardPreviewWrap: { marginTop: 14 },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  pillText: { fontSize: 11, fontWeight: '900' },
});
