import React, { memo, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const TONE_MAP = {
  default: ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)'],
  good: ['rgba(34,197,94,0.18)', 'rgba(34,197,94,0.08)'],
  epic: ['rgba(168,85,247,0.18)', 'rgba(168,85,247,0.08)'],
  gold: ['rgba(245,158,11,0.20)', 'rgba(245,158,11,0.08)'],
};

function SmallStat({ label, value }) {
  return (
    <View style={styles.smallStat}>
      <Text style={styles.smallStatLabel}>{label}</Text>
      <Text style={styles.smallStatValue}>{value}</Text>
    </View>
  );
}

function CategoryChip({ item, active, onPress }) {
  return (
    <Pressable onPress={() => onPress(item && item.id ? item.id : 'all')} style={[styles.categoryChip, active ? styles.categoryChipActive : null]}>
      <Text style={styles.categoryTitle}>{item && item.emoji ? item.emoji : '🧩'} {item && item.label ? item.label : 'Kategori'}</Text>
      <Text style={styles.categorySub}>{item && item.desc ? item.desc : 'Set görünümü'}</Text>
      <View style={styles.categoryStatsRow}>
        <SmallStat label="Alınan" value={`${Number((item && item.claimed) || 0)}/${Number((item && item.total) || 0)}`} />
        <SmallStat label="Hazır" value={`${Number((item && item.claimable) || 0)}`} />
      </View>
    </Pressable>
  );
}

function ShelfBadge({ item, index }) {
  return (
    <LinearGradient colors={[item && item.rarityGlow ? item.rarityGlow : 'rgba(255,255,255,0.08)', 'rgba(10,18,34,0.94)']} style={styles.shelfBadge}>
      <Text style={styles.shelfBadgeOrder}>#{index + 1}</Text>
      <Text style={styles.shelfBadgeEmoji}>{item && item.badgeEmoji ? item.badgeEmoji : '🏅'}</Text>
      <Text style={styles.shelfBadgeTitle} numberOfLines={1}>{item && item.title ? item.title : 'Rozet'}</Text>
      <Text style={[styles.shelfBadgeRarity, { color: item && item.rarityText ? item.rarityText : '#D6F6FF' }]}>{item && item.rarityLabel ? item.rarityLabel : 'Common'}</Text>
    </LinearGradient>
  );
}

function ActionPill({ label, tone = 'default', onPress, disabled }) {
  return (
    <Pressable onPress={disabled ? undefined : onPress} style={{ opacity: disabled ? 0.55 : 1 }}>
      <LinearGradient colors={TONE_MAP[tone] || TONE_MAP.default} style={styles.actionPill}>
        <Text style={styles.actionPillText}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const AchievementCard = memo(function AchievementCard({ item, favoriteId, claimLoading, shelfIndex, shelfCount, onClaim, onFavorite, onMoveShelf }) {
  const progressPct = Math.max(0, Math.min(100, Number((item && item.progressPct) || 0)));
  const isFavorite = favoriteId === (item && item.id);
  const canMoveLeft = item && item.claimed && shelfIndex > 0;
  const canMoveRight = item && item.claimed && shelfIndex > -1 && shelfIndex < shelfCount - 1;
  return (
    <View style={styles.achievementWrap}>
      <LinearGradient colors={[item && item.rarityGlow ? item.rarityGlow : 'rgba(255,255,255,0.08)', 'rgba(7,13,25,0.96)']} style={styles.achievementCard}>
        <View style={styles.achievementTop}>
          <View style={styles.emojiBox}>
            <Text style={styles.emojiText}>{item && item.badgeEmoji ? item.badgeEmoji : '🏅'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.achievementTitle} numberOfLines={1}>{item && item.title ? item.title : 'Başarım'}</Text>
            <Text style={[styles.achievementRarity, { color: item && item.rarityText ? item.rarityText : '#D6F6FF' }]}>
              {(item && item.rarityLabel) || 'Common'} • {(item && item.categoryEmoji) || '🧩'} {(item && item.categoryLabel) || 'Kategori'}
            </Text>
            <Text style={styles.achievementDesc}>{(item && item.desc) || 'Açıklama bulunamadı.'}</Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <LinearGradient colors={['#22D3EE', '#A855F7']} style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>
        <View style={styles.progressMeta}>
          <Text style={styles.progressText}>{(item && item.progressLabel) || '0/0'}</Text>
          <Text style={styles.rewardText}>{(item && item.rewardLabel) || 'Ödül yok'}</Text>
        </View>

        {item && item.claimed && shelfIndex > -1 ? (
          <View style={styles.shelfControlBox}>
            <View style={{ flex: 1 }}>
              <Text style={styles.shelfControlTitle}>Vitrin sırası #{shelfIndex + 1}</Text>
              <Text style={styles.shelfControlSub}>Profilde hangi rozetin önde görüneceğini buradan ayarlarsın.</Text>
            </View>
            <View style={styles.shelfMoveRow}>
              <ActionPill label="←" disabled={!canMoveLeft} onPress={() => onMoveShelf && onMoveShelf(item.id, -1)} />
              <ActionPill label="→" disabled={!canMoveRight} onPress={() => onMoveShelf && onMoveShelf(item.id, 1)} />
            </View>
          </View>
        ) : null}

        <View style={styles.footerRow}>
          <Text style={styles.statusText}>
            {isFavorite ? 'Seçili rozet' : item && item.claimed ? 'Ödül alındı' : item && item.claimable ? 'Ödül hazır' : item && item.completed ? 'Tamamlandı' : 'Devam ediyor'}
          </Text>
          <View style={styles.actionRow}>
            {item && item.claimed ? (
              <ActionPill label={isFavorite ? 'Favori' : 'Vitrine Sabitle'} tone={isFavorite ? 'gold' : 'default'} onPress={() => onFavorite && onFavorite(item.id)} />
            ) : null}
            {item && item.claimable ? (
              <ActionPill label={claimLoading === (item && item.id) ? 'Alınıyor…' : 'Ödülü Al'} tone="epic" disabled={claimLoading === (item && item.id)} onPress={() => onClaim && onClaim(item.id)} />
            ) : null}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
});

function HeaderClose({ onClose }) {
  return (
    <View style={styles.safeTop}>
      <Pressable onPress={onClose} style={styles.closeBtn}>
        <Text style={styles.closeText}>✕</Text>
      </Pressable>
    </View>
  );
}

function HighlightCard({ title, badge, description }) {
  return (
    <LinearGradient colors={[badge && badge.rarityGlow ? badge.rarityGlow : 'rgba(255,255,255,0.08)', 'rgba(9,14,24,0.92)']} style={styles.highlightCard}>
      <Text style={[styles.highlightKicker, { color: badge && badge.rarityText ? badge.rarityText : '#D6F6FF' }]}>{title}</Text>
      <Text style={styles.highlightTitle}>{badge && badge.badgeEmoji ? badge.badgeEmoji : '🏅'} {badge && badge.title ? badge.title : 'Rozet'}</Text>
      <Text style={styles.highlightDesc}>{description || (badge && badge.desc) || 'En dikkat çeken rozetin burada görünür.'}</Text>
    </LinearGradient>
  );
}

function AchievementsModal({ visible, state, claimLoading, onClaim, onFavorite, onReorderShelf, onClose }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const shelf = useMemo(() => (state && (state.badgeShelfExpanded || state.badgeShelf)) ? (state.badgeShelfExpanded || state.badgeShelf) : [], [state]);
  const categories = useMemo(() => Array.isArray(state && state.categories) ? state.categories : [], [state]);
  const orderedClaimedBadges = useMemo(() => Array.isArray(state && state.orderedClaimedBadges) ? state.orderedClaimedBadges : [], [state]);
  const shelfIndexMap = useMemo(() => {
    const map = {};
    orderedClaimedBadges.forEach((item, index) => {
      if (item && item.id) map[item.id] = index;
    });
    return map;
  }, [orderedClaimedBadges]);
  const achievements = useMemo(() => {
    const list = Array.isArray(state && state.achievements) ? state.achievements : [];
    if (activeCategory === 'all') return list;
    return list.filter((item) => item && item.categoryId === activeCategory);
  }, [activeCategory, state]);

  const allCard = {
    id: 'all',
    label: 'Tümü',
    emoji: '🧩',
    desc: 'Tüm başarımlar birlikte görünür.',
    claimed: Number((state && state.claimedCount) || 0),
    total: Number((state && state.totalCount) || 0),
    claimable: Number((state && state.claimableCount) || 0),
  };

  const favoriteBadge = state && state.favoriteBadge ? state.favoriteBadge : null;
  const rarestBadge = state && state.rarestBadge ? state.rarestBadge : null;

  return (
    <Modal visible={!!visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <HeaderClose onClose={onClose} />
        <View style={styles.sheet}>
          <FlatList
            data={achievements}
            keyExtractor={(item, index) => String((item && item.id) || index)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
            ListHeaderComponent={(
              <View>
                <View style={styles.heroWrap}>
                  <LinearGradient colors={['rgba(15,29,54,0.98)', 'rgba(8,14,26,0.96)']} style={styles.heroCard}>
                    <Text style={styles.heroKicker}>OPERASYON ARŞİVİ</Text>
                    <Text style={styles.heroTitle}>Başarım Merkezi</Text>
                    <Text style={styles.heroSub}>Rozet setlerini takip et, favori rozetini seç ve vitrin sırasını düzenle.</Text>
                    <View style={styles.heroStats}>
                      <SmallStat label="Alınan" value={`${Number((state && state.claimedCount) || 0)}`} />
                      <SmallStat label="Hazır" value={`${Number((state && state.claimableCount) || 0)}`} />
                      <SmallStat label="Set" value={`${categories.filter((dkd_category_item) => Number((dkd_category_item && dkd_category_item.total) || 0) > 0 && Number((dkd_category_item && dkd_category_item.claimed) || 0) === Number((dkd_category_item && dkd_category_item.total) || 0)).length}`} />
                      <SmallStat label="Tamam" value={`${Number((state && state.playerCardStats && state.playerCardStats.completionPct) || 0)}%`} />
                    </View>
                    {favoriteBadge ? <HighlightCard title="SEÇİLİ VİTRİN ROZETİ" badge={favoriteBadge} description="Profilde ve oyuncu kartında gözüken imzan." /> : null}
                    {!favoriteBadge && rarestBadge ? <HighlightCard title="EN NADİR ROZET" badge={rarestBadge} description={rarestBadge && rarestBadge.desc ? rarestBadge.desc : 'Koleksiyonundaki en özel parça.'} /> : null}
                  </LinearGradient>
                </View>

                <Text style={styles.sectionTitle}>Rozet Sırası</Text>
                <FlatList
                  data={shelf}
                  horizontal
                  keyExtractor={(item, index) => String((item && item.id) || index)}
                  renderItem={({ item, index }) => <ShelfBadge item={item} index={index} />}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalList}
                  ListEmptyComponent={<Text style={styles.emptyHint}>Henüz rozet yok. İlk ödülünü alınca burası dolacak.</Text>}
                />

                <Text style={styles.sectionTitle}>Kategori Setleri</Text>
                <FlatList
                  data={[allCard].concat(categories)}
                  horizontal
                  keyExtractor={(item, index) => String((item && item.id) || index)}
                  renderItem={({ item }) => <CategoryChip item={item} active={activeCategory === (item && item.id)} onPress={setActiveCategory} />}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalList}
                />

                <Text style={styles.sectionTitle}>
                  {activeCategory === 'all' ? 'Tüm Başarım Merkezi' : `${((categories.find((dkd_category_item) => dkd_category_item && dkd_category_item.id === activeCategory) || {}).label) || 'Kategori'} Rozetleri`}
                </Text>
              </View>
            )}
            renderItem={({ item }) => (
              <AchievementCard
                item={item}
                favoriteId={state && state.favoriteBadge ? state.favoriteBadge.id : null}
                claimLoading={claimLoading}
                shelfIndex={Number.isInteger(shelfIndexMap[item && item.id]) ? shelfIndexMap[item.id] : -1}
                shelfCount={orderedClaimedBadges.length}
                onClaim={onClaim}
                onFavorite={onFavorite}
                onMoveShelf={onReorderShelf}
              />
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

export default memo(AchievementsModal);

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.48)' },
  safeTop: { paddingTop: 14, paddingHorizontal: 14, paddingBottom: 8 },
  closeBtn: { alignSelf: 'flex-end', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.10)' },
  closeText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  sheet: { flex: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', backgroundColor: '#070B14', marginTop: 6 },
  heroWrap: { paddingHorizontal: 14, paddingTop: 14 },
  heroCard: { borderRadius: 24, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  heroKicker: { color: '#8DEBFF', fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  heroTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 22, marginTop: 6 },
  heroSub: { color: 'rgba(255,255,255,0.72)', fontWeight: '700', lineHeight: 19, marginTop: 6 },
  heroStats: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  smallStat: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' },
  smallStatLabel: { color: 'rgba(255,255,255,0.60)', fontSize: 10, fontWeight: '900' },
  smallStatValue: { color: '#FFFFFF', fontWeight: '900', marginTop: 2 },
  highlightCard: { marginTop: 14, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  highlightKicker: { fontWeight: '900', fontSize: 11 },
  highlightTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 17, marginTop: 4 },
  highlightDesc: { color: 'rgba(255,255,255,0.72)', fontWeight: '700', marginTop: 4, lineHeight: 19 },
  sectionTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 14, marginTop: 18, marginBottom: 10, marginHorizontal: 14 },
  horizontalList: { gap: 10, paddingHorizontal: 14 },
  emptyHint: { color: 'rgba(255,255,255,0.58)', paddingHorizontal: 14 },
  shelfBadge: { width: 110, minHeight: 122, borderRadius: 18, paddingHorizontal: 10, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', alignItems: 'center' },
  shelfBadgeOrder: { color: '#FFFFFF', fontWeight: '900', fontSize: 10, backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  shelfBadgeEmoji: { fontSize: 24, marginTop: 8 },
  shelfBadgeTitle: { color: '#FFFFFF', fontWeight: '900', marginTop: 6, fontSize: 12 },
  shelfBadgeRarity: { fontWeight: '800', fontSize: 11, marginTop: 2 },
  categoryChip: { width: 178, padding: 12, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  categoryChipActive: { backgroundColor: 'rgba(34,211,238,0.16)', borderColor: 'rgba(34,211,238,0.34)' },
  categoryTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
  categorySub: { color: 'rgba(255,255,255,0.68)', fontWeight: '700', marginTop: 5, lineHeight: 18 },
  categoryStatsRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  achievementWrap: { marginHorizontal: 14, marginBottom: 12 },
  achievementCard: { borderRadius: 20, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  achievementTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emojiBox: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  emojiText: { fontSize: 28 },
  achievementTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 },
  achievementRarity: { fontWeight: '800', fontSize: 11, marginTop: 3 },
  achievementDesc: { color: 'rgba(255,255,255,0.72)', marginTop: 5, fontWeight: '700' },
  progressTrack: { marginTop: 12, height: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  progressMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 10 },
  progressText: { color: 'rgba(255,255,255,0.68)', fontWeight: '800' },
  rewardText: { color: '#DFF8FF', fontWeight: '800' },
  shelfControlBox: { marginTop: 12, padding: 10, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  shelfControlTitle: { color: '#FFFFFF', fontWeight: '900' },
  shelfControlSub: { color: 'rgba(255,255,255,0.62)', fontWeight: '700', marginTop: 3 },
  shelfMoveRow: { flexDirection: 'row', gap: 8 },
  footerRow: { marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  statusText: { color: '#FFFFFF', fontWeight: '900', flex: 1 },
  actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' },
  actionPill: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  actionPillText: { color: '#FFFFFF', fontWeight: '900' },
});
