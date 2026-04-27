import React, { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import SafeScreen from '../../components/layout/SafeScreen';
import {
  appendCompareHistory,
  buildCompareNarrative,
  clearCompareHistory,
  comparePlayerCards,
  loadCompareHistory,
  parseSharedPlayerCardText,
} from '../../services/socialProfileService';
import { cityLootTheme as theme } from '../../theme/cityLootTheme';

function formatInt(value) {
  var dkd_iteration_value = Number(value || 0);
  if (!Number.isFinite(dkd_iteration_value)) return '0';
  try {
    return new Intl.NumberFormat('tr-TR').format(dkd_iteration_value);
  } catch (dkd_error) {
    return String(Math.trunc(dkd_iteration_value));
  }
}

function HeroStat({ icon, label, value, tone }) {
  var color = tone === 'gold' ? theme.colors.goldSoft : tone === 'purple' ? theme.colors.purple : theme.colors.cyanSoft;
  return (
    <View style={dkd_styles.heroStat}>
      <MaterialCommunityIcons name={icon} size={18} color={color} />
      <Text style={dkd_styles.heroStatLabel}>{label}</Text>
      <Text style={dkd_styles.heroStatValue}>{value}</Text>
    </View>
  );
}

function IdentityChip({ label, value, tone }) {
  var bg = tone === 'gold' ? 'rgba(255,209,102,0.12)' : tone === 'cyan' ? 'rgba(141,235,255,0.12)' : 'rgba(255,255,255,0.08)';
  return (
    <View style={[dkd_styles.identityChip, { backgroundColor: bg }]}>
      <Text style={dkd_styles.identityChipText}>{label}: {value}</Text>
    </View>
  );
}

function CompareRow({ row }) {
  var badge = row && row.winner === 'tie' ? 'Berabere' : row && row.winner === 'local' ? 'Sen önde' : 'Dost önde';
  var badgeColor = row && row.winner === 'tie' ? 'rgba(255,255,255,0.72)' : row && row.winner === 'local' ? theme.colors.green : theme.colors.goldSoft;
  return (
    <View style={dkd_styles.compareCard}>
      <View style={dkd_styles.compareHead}>
        <Text style={dkd_styles.compareTitle}>{row && row.label ? row.label : 'İstatistik'}</Text>
        <Text style={[dkd_styles.compareBadge, { color: badgeColor }]}>{badge}</Text>
      </View>
      <View style={dkd_styles.compareGrid}>
        <View style={[dkd_styles.compareCol, { backgroundColor: 'rgba(141,235,255,0.10)' }]}>
          <Text style={dkd_styles.compareColLabel}>Sen</Text>
          <Text style={[dkd_styles.compareColValue, { color: theme.colors.cyanSoft }]}>{formatInt(row && row.local)}</Text>
        </View>
        <View style={[dkd_styles.compareCol, { backgroundColor: 'rgba(255,209,102,0.10)' }]}>
          <Text style={dkd_styles.compareColLabel}>Dost</Text>
          <Text style={[dkd_styles.compareColValue, { color: theme.colors.goldSoft }]}>{formatInt(row && row.remote)}</Text>
        </View>
      </View>
    </View>
  );
}

function HistoryCard({ item, onPress }) {
  var when = item && item.comparedAt ? new Date(item.comparedAt) : null;
  var whenText = when && !Number.isNaN(when.getTime())
    ? when.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
    : 'Bugün';
  var badgeColor = item && item.overall === 'local' ? theme.colors.green : item && item.overall === 'remote' ? theme.colors.goldSoft : theme.colors.text;
  var badgeText = item && item.overall === 'local' ? 'Sen öndeydin' : item && item.overall === 'remote' ? 'Dost öndeydi' : 'Berabere';

  return (
    <Text onPress={onPress} style={dkd_styles.historyCard}>
      <Text style={dkd_styles.historyTitle}>{item && item.nick ? item.nick : 'Dost'} • {item && item.profileId ? item.profileId : 'YL-000000'}</Text>
      <Text style={[dkd_styles.historyBadge, { color: badgeColor }]}> {badgeText}</Text>
      <Text style={dkd_styles.historyMeta}>{'\dkd_iteration_value'}Lvl {formatInt(item && item.level || 1)} • {item && item.rank ? item.rank : 'ROOKIE'} • {item && item.inviteCode ? item.inviteCode : ''}</Text>
      <Text style={dkd_styles.historySub}>{'\dkd_iteration_value'}Son kıyas: {whenText} • Dokun ve tekrar aç</Text>
    </Text>
  );
}

export default function SocialCompareModal({ visible, onClose, onBack, localCard }) {
  const [input, setInput] = useState('');
  const [friendCard, setFriendCard] = useState(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const localProfileId = String(localCard && localCard.profileId ? localCard.profileId : 'guest');

  useEffect(function () {
    var active = true;
    if (!visible) return undefined;
    loadCompareHistory(localProfileId).then(function (rows) {
      if (active) setHistory(Array.isArray(rows) ? rows : []);
    });
    return function () { active = false; };
  }, [visible, localProfileId]);

  const comparison = useMemo(function () {
    if (!localCard || !friendCard) return null;
    return comparePlayerCards(localCard, friendCard);
  }, [localCard, friendCard]);

  const narrative = useMemo(function () {
    return buildCompareNarrative(localCard, friendCard, comparison);
  }, [localCard, friendCard, comparison]);

  async function handleParse() {
    const parsed = parseSharedPlayerCardText(input);
    if (!parsed) {
      setFriendCard(null);
      setError('Paylaşılan oyuncu kartı metni bulunamadı. Kart paylaşımındaki tüm metni yapıştır.');
      return;
    }
    setError('');
    setFriendCard(parsed);
    const rows = await appendCompareHistory(localProfileId, parsed, comparePlayerCards(localCard, parsed));
    setHistory(Array.isArray(rows) ? rows : []);
  }

  function handleOpenHistory(item) {
    setFriendCard(item && item.snapshot ? item.snapshot : null);
    setInput('');
    setError('');
  }

  async function handleClearHistory() {
    await clearCompareHistory(localProfileId);
    setHistory([]);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeScreen style={{ flex: 1, backgroundColor: '#050812' }}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#07101B', '#102037', '#0A1220']} style={{ flex: 1 }}>
          <View style={dkd_styles.header}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={dkd_styles.kicker}>SOCIAL • COMPARE</Text>
              <Text style={dkd_styles.title}>Karşılaştırma Merkezi</Text>
              <Text style={dkd_styles.subtitle}>Dost kartını yapıştır, güç farkını anında gör ve karşılaştırma kayıtlarını burada tut.</Text>
            </View>
            <View style={dkd_styles.headerActions}>
              {onBack ? <SecondaryButton label="Kartım" onPress={onBack} /> : null}
              <SecondaryButton label="Kapat" onPress={onClose} />
            </View>
          </View>

          <ScrollView contentContainerStyle={dkd_styles.content}>
            <LinearGradient colors={['rgba(103,227,255,0.16)', 'rgba(103,227,255,0.04)']} style={dkd_styles.hero}>
              <Text style={dkd_styles.heroKicker}>MATCHUP CORE</Text>
              <Text style={dkd_styles.heroTitle}>{localCard && localCard.nick ? localCard.nick : 'Oyuncu'} vs Dost</Text>
              <Text style={dkd_styles.heroSub}>Profil kimliği, davet kodu, koleksiyon gücü ve claim verileri tek panelde kıyaslanır.</Text>
              <View style={dkd_styles.heroStats}>
                <HeroStat icon="lightning-bolt-outline" label="Seviye" value={String(localCard && localCard.level ? localCard.level : 1)} tone="cyan" />
                <HeroStat icon="cards-outline" label="Power" value={formatInt(localCard && localCard.power ? localCard.power : 0)} tone="purple" />
                <HeroStat icon="currency-usd" label="Token" value={formatInt(localCard && localCard.token ? localCard.token : 0)} tone="gold" />
              </View>
            </LinearGradient>

            <View style={dkd_styles.panel}>
              <Text style={dkd_styles.panelTitle}>Paylaşılan kartı yapıştır</Text>
              <Text style={dkd_styles.panelSub}>Dostunun gönderdiği oyuncu kartı metnini bu alana yapıştır. Sistem kartı ayıklayıp seni onunla karşılaştırır.</Text>
              <TextInput
                multiline
                value={input}
                onChangeText={setInput}
                placeholder="Buraya paylaşılan oyuncu kartı metnini yapıştır"
                placeholderTextColor="rgba(255,255,255,0.35)"
                style={dkd_styles.input}
              />
              {error ? <Text style={dkd_styles.errorText}>{error}</Text> : null}
              <View style={{ marginTop: 14 }}>
                <PrimaryButton label="Karşılaştırmayı Hazırla" onPress={handleParse} disabled={!input.trim()} />
              </View>
            </View>

            <View style={dkd_styles.panel}>
              <View style={dkd_styles.panelHeadRow}>
                <Text style={dkd_styles.panelTitle}>Karşılaştırma Geçmişi</Text>
                <SecondaryButton label="Temizle" onPress={handleClearHistory} />
              </View>
              <Text style={dkd_styles.panelSub}>Son karşılaştırdığın dost kartları burada kalır. Dokununca tekrar açılır.</Text>
              <View style={{ marginTop: 14, gap: 10 }}>
                {history.length ? history.map(function (item, index) {
                  return <HistoryCard key={String(item && item.profileId || 'history') + '-' + index} item={item} onPress={function () { handleOpenHistory(item); }} />;
                }) : <Text style={dkd_styles.emptyText}>Henüz kayıtlı karşılaştırma yok.</Text>}
              </View>
            </View>

            {friendCard ? (
              <>
                <View style={dkd_styles.panel}>
                  <Text style={dkd_styles.panelTitle}>Karşılaştırma Özeti</Text>
                  <Text style={dkd_styles.panelSub}>{narrative}</Text>
                  <View style={dkd_styles.identityWrap}>
                    <IdentityChip label="Sen" value={localCard && localCard.nick ? localCard.nick : 'Oyuncu'} tone="cyan" />
                    <IdentityChip label="Dost" value={friendCard && friendCard.nick ? friendCard.nick : 'Dost'} tone="gold" />
                    <IdentityChip label="Profil" value={friendCard && friendCard.profileId ? friendCard.profileId : 'YL-000000'} />
                    <IdentityChip label="Davet" value={friendCard && friendCard.inviteCode ? friendCard.inviteCode : 'WING-000-000'} />
                  </View>
                </View>

                <View style={{ gap: 10 }}>
                  {(comparison && comparison.rows ? comparison.rows : []).map(function (row, index) {
                    return <CompareRow key={String(row && row.key || 'row') + '-' + index} row={row} />;
                  })}
                </View>
              </>
            ) : null}
          </ScrollView>
        </LinearGradient>
      </SafeScreen>
    </Modal>
  );
}

const dkd_styles = StyleSheet.create({
  header: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActions: { gap: 8 },
  kicker: { color: theme.colors.cyanSoft, fontSize: 11, fontWeight: '900', letterSpacing: 0.9 },
  title: { color: theme.colors.text, fontSize: 24, fontWeight: '900', marginTop: 4 },
  subtitle: { color: theme.colors.textSoft, fontSize: 13, lineHeight: 18, marginTop: 6 },
  content: { padding: 14, paddingBottom: 34 },
  hero: {
    padding: 16,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    marginBottom: 14,
  },
  heroKicker: { color: theme.colors.goldSoft, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  heroTitle: { color: theme.colors.text, fontSize: 24, fontWeight: '900', marginTop: 6 },
  heroSub: { color: theme.colors.textSoft, fontSize: 13, lineHeight: 19, marginTop: 6 },
  heroStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  heroStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  heroStatLabel: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '800' },
  heroStatValue: { color: theme.colors.text, fontSize: 12, fontWeight: '900' },
  panel: {
    padding: 16,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    marginBottom: 14,
  },
  panelHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  panelTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '900' },
  panelSub: { color: theme.colors.textSoft, marginTop: 8, lineHeight: 20 },
  input: {
    minHeight: 150,
    marginTop: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    color: '#FFFFFF',
    textAlignVertical: 'top',
  },
  errorText: { color: '#FF8A7A', marginTop: 10, fontWeight: '700' },
  emptyText: { color: 'rgba(255,255,255,0.56)' },
  identityWrap: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 14 },
  identityChip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999 },
  identityChipText: { color: theme.colors.text, fontWeight: '900' },
  compareCard: {
    padding: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  compareHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  compareTitle: { color: theme.colors.text, fontWeight: '900', fontSize: 15 },
  compareBadge: { fontWeight: '900', fontSize: 12 },
  compareGrid: { flexDirection: 'row', gap: 10, marginTop: 10 },
  compareCol: { flex: 1, padding: 12, borderRadius: 14 },
  compareColLabel: { color: 'rgba(255,255,255,0.60)', fontSize: 11, fontWeight: '800' },
  compareColValue: { fontWeight: '900', fontSize: 18, marginTop: 6 },
  historyCard: {
    padding: 14,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    color: '#FFFFFF',
  },
  historyTitle: { color: '#FFFFFF', fontWeight: '900' },
  historyBadge: { fontWeight: '900' },
  historyMeta: { color: 'rgba(255,255,255,0.72)' },
  historySub: { color: 'rgba(255,255,255,0.58)' },
});
