import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SecondaryButton from '../../components/ui/SecondaryButton';
import { cityLootTheme } from '../../theme/cityLootTheme';
import AdminBusinessModal from '../business/AdminBusinessModal';
import dkd_support_admin_queue_modal from '../support/dkd_support_admin_queue_modal';

function GlassStat({ label, value, accent = cityLootTheme.colors.cyanSoft }) {
  return (
    <View style={dkd_styles.statCard}>
      <Text style={dkd_styles.statLabel}>{label}</Text>
      <Text style={[dkd_styles.statValue, { color: accent }]}>{value}</Text>
    </View>
  );
}

function AdminAction({ icon, title, sub, onPress, tone = 'cyan' }) {
  const accent = tone === 'gold'
    ? cityLootTheme.colors.goldSoft
    : tone === 'purple'
      ? cityLootTheme.colors.purple
      : tone === 'green'
        ? cityLootTheme.colors.green
        : cityLootTheme.colors.cyanSoft;

  return (
    <Pressable style={dkd_styles.actionCard} onPress={onPress}>
      <LinearGradient colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']} style={dkd_styles.actionFill}>
        <View style={[dkd_styles.actionIconShell, { borderColor: `${accent}66` }]}>
          <MaterialCommunityIcons name={icon} size={22} color={accent} />
        </View>

        <View style={dkd_styles.actionTextWrap}>
          <Text style={dkd_styles.actionTitle}>{title}</Text>
          <Text style={dkd_styles.actionSub}>{sub}</Text>
        </View>

        <MaterialCommunityIcons name="chevron-right" size={22} color={cityLootTheme.colors.textMuted} />
      </LinearGradient>
    </Pressable>
  );
}

export default function AdminMenuModal({ visible, onClose, onLoot, onDrops, onUsers, onCourierJobs, onBroadcast, onBoss, onMarket, onApplications }) {
  const [businessOpen, setBusinessOpen] = useState(false);
  const [dkd_support_queue_open, dkd_set_support_queue_open] = useState(false);

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={dkd_styles.backdrop}>
          <LinearGradient colors={['#04101A', '#0B1426', '#090E18']} style={dkd_styles.card}>
            <View style={dkd_styles.heroGlowBlue} />
            <View style={dkd_styles.heroGlowGold} />

            <View style={dkd_styles.topBar}>
              <View style={dkd_styles.topBarTextWrap}>
                <Text style={dkd_styles.kicker}>CONTROL TOWER</Text>
                <Text style={dkd_styles.title}>Admin Komuta Güvertesi</Text>
                <Text style={dkd_styles.subTitle}>İşletme, saha, oyuncu, market ve canlı operasyon modüllerini buradan açarsın.</Text>
              </View>
              <SecondaryButton label="Kapat" onPress={onClose} size="compact" fullWidth={false} />
            </View>

            <View style={dkd_styles.statsRow}>
              <GlassStat label="MODÜL" value="10" />
              <GlassStat label="BOSS" value="HAZIR" accent={cityLootTheme.colors.goldSoft} />
              <GlassStat label="YAYIN" value="AKTİF" accent={cityLootTheme.colors.green} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={dkd_styles.scrollContent}>
              <View style={dkd_styles.grid}>
                <AdminAction
                  icon="storefront-outline"
                  title="İşletme Merkezi"
                  sub="Önce işletmeyi kur, sonra drop bağla, kampanya aç ve kasada kupon doğrula. Daha sade yeni akış."
                  onPress={() => setBusinessOpen(true)}
                  tone="green"
                />
                <AdminAction
                  icon="headset"
                  title="Destek Kuyruğu"
                  sub="Uygulamadan gelen destek taleplerini gör, yanıtla ve çözüldü olarak kapat."
                  onPress={() => dkd_set_support_queue_open(true)}
                  tone="cyan"
                />
                <AdminAction icon="cards-playing-outline" title="Kart Komuta" sub="Kart oluştur, güncelle, pasifleştir veya sistemden sil" onPress={onLoot} tone="purple" />
                <AdminAction icon="map-marker-path" title="Saha Drop" sub="Harita noktaları, boss sandıkları ve saha akışını yönet" onPress={onDrops} tone="gold" />
                <AdminAction icon="robot-angry-outline" title="Boss Komuta" sub="Boss görseli, soru seti, giriş bileti ve ödül tanımı" onPress={onBoss} tone="gold" />
                <AdminAction icon="store-cog-outline" title="Market Komuta" sub="Token mağazası paketleri, fiyatlar, içerik ve görünüm sırası" onPress={onMarket} tone="cyan" />
                <AdminAction icon="clipboard-account-outline" title="Başvurular" sub="Kurye Başvuru formu ve Nakliye Başvuru formunu incele, onayla veya reddet" onPress={onApplications} tone="green" />
                <AdminAction icon="account-group-outline" title="Oyuncu Kontrolü" sub="XP, level, token, bilet ve kurye statülerini düzenle" onPress={onUsers} />
                <AdminAction icon="truck-fast-outline" title="Kurye/Lojistik Masası" sub="Kurye, kargo, nakliye ve lojistik saha operasyonlarını yönet" onPress={onCourierJobs} tone="green" />
                <AdminAction icon="broadcast" title="Canlı Yayın" sub="Push, hedef ekran ve oyuncu segmentlerini yönet" onPress={onBroadcast} tone="purple" />
              </View>
            </ScrollView>
          </LinearGradient>
        </View>
      </Modal>

      <AdminBusinessModal visible={businessOpen} onClose={() => setBusinessOpen(false)} />
      {React.createElement(dkd_support_admin_queue_modal, {
        visible: dkd_support_queue_open,
        onClose: () => dkd_set_support_queue_open(false),
      })}
    </>
  );
}

const dkd_styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,6,12,0.86)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  card: {
    width: '100%',
    maxWidth: 760,
    maxHeight: '92%',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 18,
    overflow: 'hidden',
  },
  heroGlowBlue: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(103,227,255,0.14)',
    top: -40,
    right: -40,
  },
  heroGlowGold: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: 'rgba(246,181,78,0.12)',
    bottom: -20,
    left: -30,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  topBarTextWrap: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    paddingRight: 6,
  },
  kicker: { color: cityLootTheme.colors.goldSoft, fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: cityLootTheme.colors.text, fontSize: 28, fontWeight: '900', marginTop: 4 },
  subTitle: { color: cityLootTheme.colors.textSoft, fontSize: 13, lineHeight: 18, marginTop: 8 },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statLabel: { color: cityLootTheme.colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.7 },
  statValue: { color: cityLootTheme.colors.text, fontSize: 16, fontWeight: '900', marginTop: 6 },
  scrollContent: { paddingTop: 18, paddingBottom: 6 },
  grid: { gap: 10 },
  actionCard: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  actionFill: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  actionIconShell: {
    width: 52,
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextWrap: { flex: 1, minWidth: 0 },
  actionTitle: { color: cityLootTheme.colors.text, fontSize: 16, fontWeight: '900' },
  actionSub: { color: cityLootTheme.colors.textSoft, fontSize: 12, lineHeight: 17, marginTop: 2 },
});
