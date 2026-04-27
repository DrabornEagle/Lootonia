import React, { useMemo } from 'react';
import { ActivityIndicator, Modal, Pressable, SectionList, StatusBar, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SafeScreen from '../../components/layout/SafeScreen';
import FuturisticCardTile from './FuturisticCardTile';
import { SHARD_CRAFT_OPTIONS, SHARD_UPGRADE_OPTIONS } from '../../constants/game';
import { buildShardSummary, computeCollectionPower } from '../../utils/collection';
import { trRarity, trSeries } from '../../utils/text';
import { cityLootTheme, getLootRarityFrame } from '../../theme/cityLootTheme';
import { minimalLootUi as ui, formatNum } from '../../theme/minimalLootUi';
import useDeferredVisibility from '../../hooks/useDeferredVisibility';

function chunkRows(items, size = 2) {
  const rows = [];
  for (let index = 0; index < items.length; index += size) rows.push(items.slice(index, index + size));
  return rows;
}

function HeaderButton({ icon, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 42,
        height: 42,
        borderRadius: 14,
        backgroundColor: ui.colors.panel2,
        borderWidth: 1,
        borderColor: ui.colors.line,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <MaterialCommunityIcons name={icon} size={20} color={ui.colors.text} />
    </Pressable>
  );
}

function StatCard({ icon, label, value, accent }) {
  return (
    <View
      style={{
        flex: 1,
        minHeight: 86,
        borderRadius: 18,
        backgroundColor: ui.colors.panel2,
        borderWidth: 1,
        borderColor: ui.colors.line,
        padding: 12,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 12,
          backgroundColor: `${accent}22`,
          borderWidth: 1,
          borderColor: `${accent}35`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MaterialCommunityIcons name={icon} size={18} color={accent} />
      </View>
      <Text style={{ color: ui.colors.muted, fontSize: 10, fontWeight: '900', marginTop: 10 }}>{label}</Text>
      <Text style={{ color: ui.colors.text, fontSize: 18, fontWeight: '900', marginTop: 4 }}>{value}</Text>
    </View>
  );
}

function SectionHead({ kicker, title, sub, side }) {
  return (
    <View style={{ marginBottom: 12 }}>
      {!!kicker ? <Text style={{ color: ui.colors.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 }}>{kicker}</Text> : null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, marginTop: 4 }}>
        <Text style={{ color: ui.colors.text, fontSize: 20, fontWeight: '900', flex: 1 }}>{title}</Text>
        {!!side ? <Text style={{ color: ui.colors.soft, fontSize: 11, fontWeight: '800' }}>{side}</Text> : null}
      </View>
      {!!sub ? <Text style={{ color: ui.colors.soft, fontSize: 12, fontWeight: '700', marginTop: 5, lineHeight: 18 }}>{sub}</Text> : null}
    </View>
  );
}

function ActionTile({ icon, title, sub, meta, disabled, onPress, accent = ui.colors.cyan, buttonText }) {
  return (
    <View
      style={{
        borderRadius: 18,
        backgroundColor: ui.colors.panel2,
        borderWidth: 1,
        borderColor: disabled ? 'rgba(255,255,255,0.06)' : ui.colors.line,
        padding: 12,
        marginBottom: 10,
        opacity: disabled ? 0.58 : 1,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            backgroundColor: `${accent}20`,
            borderWidth: 1,
            borderColor: `${accent}36`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialCommunityIcons name={icon} size={19} color={accent} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ color: ui.colors.text, fontSize: 15, fontWeight: '900' }}>{title}</Text>
          <Text style={{ color: ui.colors.soft, fontSize: 12, fontWeight: '700', marginTop: 4, lineHeight: 18 }}>{sub}</Text>
          <Text style={{ color: ui.colors.muted, fontSize: 11, fontWeight: '800', marginTop: 8 }}>{meta}</Text>
        </View>
      </View>

      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={{
          marginTop: 12,
          minHeight: 44,
          borderRadius: 14,
          backgroundColor: disabled ? 'rgba(255,255,255,0.06)' : 'rgba(123,230,255,0.14)',
          borderWidth: 1,
          borderColor: disabled ? 'rgba(255,255,255,0.08)' : 'rgba(123,230,255,0.24)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: ui.colors.text, fontSize: 13, fontWeight: '900' }}>{buttonText}</Text>
      </Pressable>
    </View>
  );
}

function CardCell({ entry, onOpenCard }) {
  return (
    <Pressable
      onPress={() => onOpenCard?.(entry.card)}
      style={{ flex: 1, marginBottom: 10 }}
    >
      <FuturisticCardTile
        name={entry.card?.name}
        rarity={entry.card?.rarity || entry.rarity}
        series={entry.card?.series || entry.series}
        theme={entry.card?.theme}
        dropType={entry.card?.dropType || entry.card?.drop_type}
        imageUrl={entry.card?.art_image_url || entry.card?.image_url || ''}
        serialCode={entry.card?.serial_code || ''}
        compact
      />
      <View
        style={{
          marginTop: 8,
          borderRadius: 14,
          backgroundColor: ui.colors.panel2,
          borderWidth: 1,
          borderColor: ui.colors.line,
          paddingHorizontal: 10,
          paddingVertical: 9,
        }}
      >
        <Text style={{ color: ui.colors.text, fontSize: 13, fontWeight: '900' }} numberOfLines={1}>{entry.card?.name || 'Kart'}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <Text style={{ color: ui.colors.soft, fontSize: 11, fontWeight: '700' }}>{trRarity(entry.rarity)}</Text>
          <Text style={{ color: ui.colors.cyan, fontSize: 11, fontWeight: '900' }}>x{formatNum(entry.count)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function CollectionModal({
  visible,
  onClose,
  cards,
  loading,
  profile,
  onRecycle,
  onExchange,
  onCraft,
  onUpgrade,
  recycling,
  exchangeLoading,
  craftLoading,
  upgradeLoading,
  bossTicketLoading,
  onCraftBossTicket,
  onOpenCard,
}) {
  const safeCards = Array.isArray(cards) ? cards : [];
  const listReady = useDeferredVisibility(visible, true);
  const summary = useMemo(() => buildShardSummary(safeCards), [safeCards]);
  const wallet = Number(profile?.shards || 0);
  const tickets = Number(profile?.boss_tickets || 0);
  const totalCards = safeCards.length;
  const uniqueCount = Number(summary.entries?.length || 0);
  const collectionPower = useMemo(() => computeCollectionPower(safeCards), [safeCards]);
  const duplicateCount = Number(summary.duplicateCards || 0);
  const legendCount = Number(summary.countsByRarity?.legendary || 0) + Number(summary.countsByRarity?.mythic || 0);

  const sections = useMemo(
    () => (summary.seriesKeys || []).map((key) => ({ key, title: trSeries(key), data: chunkRows(summary.uniqueBySeries[key] || []) })),
    [summary],
  );

  const header = (
    <View>
      <View style={{ borderRadius: 24, backgroundColor: ui.colors.panel2, borderWidth: 1, borderColor: ui.colors.line, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ color: ui.colors.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 }}>KOLEKSİYON KASASI</Text>
          <Text style={{ color: ui.colors.text, fontSize: 24, fontWeight: '900', marginTop: 6, lineHeight: 30 }}>Koleksiyon merkezi</Text>
          <Text style={{ color: ui.colors.soft, fontSize: 13, fontWeight: '700', marginTop: 8, lineHeight: 20 }}>Kart gücü, shard ekonomisi ve craft hattını aynı panelde yönet.</Text>
        </View>
        <HeaderButton icon="close" onPress={onClose} />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <View style={styles.heroChip}>
          <Text style={styles.heroChipText}>{formatNum(uniqueCount)} benzersiz kart</Text>
        </View>
        <View style={styles.heroChip}>
          <Text style={styles.heroChipText}>{formatNum(wallet)} shard rezervi</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <StatCard icon="shield-star-outline" label="Koleksiyon gücü" value={formatNum(collectionPower)} accent={ui.colors.gold} />
        <StatCard icon="diamond-stone" label="Shard" value={formatNum(wallet)} accent={ui.colors.cyan} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        <StatCard icon="cards-outline" label="Toplam kart" value={formatNum(totalCards)} accent={ui.colors.purple} />
        <StatCard icon="ticket-confirmation-outline" label="Boss bileti" value={formatNum(tickets)} accent={ui.colors.green} />
      </View>

      <View style={{ borderRadius: 22, backgroundColor: ui.colors.panel, borderWidth: 1, borderColor: ui.colors.line, padding: 14, marginBottom: 16 }}>
        <SectionHead
          kicker="ÖZET"
          title="Koleksiyon durumu"
          sub="Benzersiz kart, kopya ve üst seviye stok tek bakışta."
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <View style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: ui.colors.line }}>
            <Text style={{ color: ui.colors.text, fontSize: 11, fontWeight: '900' }}>{formatNum(uniqueCount)} benzersiz</Text>
          </View>
          <View style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(123,230,255,0.12)', borderWidth: 1, borderColor: 'rgba(123,230,255,0.24)' }}>
            <Text style={{ color: ui.colors.text, fontSize: 11, fontWeight: '900' }}>{formatNum(duplicateCount)} kopya</Text>
          </View>
          <View style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(246,197,95,0.12)', borderWidth: 1, borderColor: 'rgba(246,197,95,0.24)' }}>
            <Text style={{ color: ui.colors.text, fontSize: 11, fontWeight: '900' }}>{formatNum(legendCount)} üst seviye</Text>
          </View>
        </View>
      </View>

      <View style={{ borderRadius: 22, backgroundColor: ui.colors.panel, borderWidth: 1, borderColor: ui.colors.line, padding: 14, marginBottom: 16 }}>
        <SectionHead
          kicker="HIZLI İŞLEMLER"
          title="En çok kullanılan ekonomi butonları"
          side={`${formatNum(summary.potentialShards || 0)} olası shard`}
        />

        <ActionTile
          icon="recycle"
          title="Kopyaları parçala"
          sub="Fazla kartları otomatik temizler ve shard'a çevirir."
          meta={`Tahmini kazanç: ${formatNum(summary.potentialShards || 0)} shard`}
          disabled={!duplicateCount || !!recycling}
          onPress={() => onRecycle?.()}
          buttonText={recycling ? 'Parçalanıyor…' : 'Parçala'}
        />
        <ActionTile
          icon="cash-multiple"
          title="40 shard → 100 token"
          sub="Harita ve market için hızlı token dönüşümü."
          meta="Hızlı ekonomik takviye"
          disabled={!!exchangeLoading || wallet < 40}
          onPress={() => onExchange?.('token_100')}
          accent={ui.colors.gold}
          buttonText={exchangeLoading === 'token_100' ? 'Bekle…' : 'Token al'}
        />
        <ActionTile
          icon="lightning-bolt"
          title="30 shard → +1 enerji stoku"
          sub="Enerji stoğunu sınırsız büyütmek için hızlı takviye."
          meta="Üst limite takılmadan enerji depolar"
          disabled={!!exchangeLoading || wallet < 30}
          onPress={() => onExchange?.('energy_1')}
          accent={ui.colors.green}
          buttonText={exchangeLoading === 'energy_1' ? 'Bekle…' : 'Enerji al'}
        />
        <ActionTile
          icon="sword-cross"
          title="Boss bileti üret"
          sub="Nadir ödül akışı için boss giriş bileti oluşturur."
          meta="Maliyet: 90 shard"
          disabled={!!bossTicketLoading || wallet < 90}
          onPress={() => onCraftBossTicket?.()}
          accent={ui.colors.purple}
          buttonText={bossTicketLoading ? 'Üretiliyor…' : 'Bilet üret'}
        />
      </View>

      <View style={{ borderRadius: 22, backgroundColor: ui.colors.panel, borderWidth: 1, borderColor: ui.colors.line, padding: 14, marginBottom: 16 }}>
        <SectionHead
          kicker="FORGE"
          title="Craft ve upgrade hattı"
          sub="Doğrudan kart üret ya da alt rarity kartı yukarı taşı."
        />

        {SHARD_CRAFT_OPTIONS.map((opt) => {
          const rarity = getLootRarityFrame(opt.rarity);
          const disabled = !!craftLoading || wallet < opt.cost;
          return (
            <ActionTile
              key={`craft-${opt.key}`}
              icon="creation"
              title={`${rarity.label} üret`}
              sub={opt.desc}
              meta={`Maliyet: ${formatNum(opt.cost)} shard`}
              disabled={disabled}
              onPress={() => onCraft?.(opt.rarity)}
              accent={rarity.accent}
              buttonText={craftLoading === opt.rarity ? 'Üretiliyor…' : 'Üret'}
            />
          );
        })}

        {SHARD_UPGRADE_OPTIONS.map((opt) => {
          const owned = Number(summary.countsByRarity?.[opt.from] || 0);
          const rarity = getLootRarityFrame(opt.to);
          const disabled = !!upgradeLoading || wallet < opt.cost || owned < 1;
          return (
            <ActionTile
              key={`upgrade-${opt.key}`}
              icon="arrow-up-bold-circle-outline"
              title={`${trRarity(opt.from)} → ${trRarity(opt.to)}`}
              sub={`Sende ${formatNum(owned)} adet ${trRarity(opt.from).toLowerCase()} kart var.`}
              meta={`Maliyet: ${formatNum(opt.cost)} shard`}
              disabled={disabled}
              onPress={() => onUpgrade?.(opt.from)}
              accent={rarity.accent}
              buttonText={upgradeLoading === opt.from ? 'Yükseliyor…' : 'Yükselt'}
            />
          );
        })}
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeScreen style={{ flex: 1, backgroundColor: ui.colors.bg }}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={[cityLootTheme.colors.bgTop, cityLootTheme.colors.bgMid, cityLootTheme.colors.bgBottom]} style={{ flex: 1 }}>
        {(loading && !safeCards.length) || !listReady ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' }}>
            <ActivityIndicator color={ui.colors.cyan} />
            <Text style={{ color: ui.colors.soft, fontSize: 13, fontWeight: '700', marginTop: 10 }}>Koleksiyon hazırlanıyor…</Text>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item, index) => `${index}-${item.map((entry) => entry.uid).join('-')}`}
            renderSectionHeader={({ section }) => (
              <View style={{ paddingHorizontal: 14, paddingTop: 4, paddingBottom: 10 }}>
                <Text style={{ color: ui.colors.text, fontSize: 18, fontWeight: '900' }}>{section.title}</Text>
                <Text style={{ color: ui.colors.muted, fontSize: 11, fontWeight: '800', marginTop: 2 }}>
                  {formatNum(summary.uniqueBySeries?.[section.key]?.length || 0)} benzersiz kart
                </Text>
              </View>
            )}
            renderItem={({ item }) => (
              <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 14 }}>
                {item.map((entry) => (
                  <CardCell key={entry.uid} entry={entry} onOpenCard={onOpenCard} />
                ))}
                {item.length === 1 ? <View style={{ flex: 1 }} /> : null}
              </View>
            )}
            ListHeaderComponent={header}
            ListEmptyComponent={(
              <View style={{ paddingHorizontal: 14, paddingTop: 40 }}>
                <Text style={{ color: ui.colors.text, fontSize: 18, fontWeight: '900' }}>Henüz kart yok</Text>
                <Text style={{ color: ui.colors.soft, fontSize: 13, fontWeight: '700', marginTop: 6 }}>
                  İlk kartlarını topladığında bu alan daha düzenli bir vitrine dönüşecek.
                </Text>
              </View>
            )}
            contentContainerStyle={{ paddingTop: 14, paddingBottom: 140 }}
            stickySectionHeadersEnabled={false}
            initialNumToRender={5}
            maxToRenderPerBatch={4}
            windowSize={5}
            updateCellsBatchingPeriod={32}
            removeClippedSubviews
          />
        )}
        </LinearGradient>
      </SafeScreen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  heroChip: {
    borderRadius: 999,
    backgroundColor: 'rgba(108,203,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(108,203,255,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroChipText: {
    color: cityLootTheme.colors.text,
    fontSize: 11,
    fontWeight: '800',
  },
});
