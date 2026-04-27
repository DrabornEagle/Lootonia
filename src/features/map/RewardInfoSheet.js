import React, { memo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

function StatTile({ label, value, icon }) {
  return (
    <View style={styles.statTile}>
      <View style={styles.statIconWrap}>
        <MaterialCommunityIcons name={icon} size={15} color="#FFE29C" />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function StepRow({ icon, title, text }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepIconWrap}>
        <MaterialCommunityIcons name={icon} size={16} color="#88E4FF" />
      </View>
      <View style={styles.stepCopy}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepText}>{text}</Text>
      </View>
    </View>
  );
}

function RewardInfoSheet({ visible, reward, onClose }) {
  if (!reward) return null;

  const subtitle = [reward.business, reward.campaign].filter(Boolean).join(' • ') || 'Bu noktada aktif sponsor kampanyası var.';

  return (
    <Modal visible={!!visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheetWrap}>
          <LinearGradient colors={['#091120', '#0D1728', '#111B30']} style={styles.sheet}>
            <View style={styles.handle} />

            <View style={styles.headerRow}>
              <View style={styles.headerBadge}>
                <MaterialCommunityIcons name="gift-open-outline" size={17} color="#FFE8A6" />
                <Text style={styles.headerBadgeText}>ÖDÜL DETAYI</Text>
              </View>
              <Pressable onPress={onClose} style={styles.closeBtn}>
                <MaterialCommunityIcons name="close" size={18} color="#FFFFFF" />
              </Pressable>
            </View>

            <Text style={styles.title}>{reward.title || 'Aktif ödül'}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>

            <View style={styles.heroCard}>
              <LinearGradient colors={['rgba(255,214,109,0.18)', 'rgba(255,173,61,0.08)']} style={styles.heroInner}>
                <Text style={styles.heroKicker}>Kampanya Özeti</Text>
                <Text style={styles.heroText}>Bu hedefte sandık açtığında aktif kampanyaya bağlı kupon veya sponsor ödülü düşebilir.</Text>
              </LinearGradient>
            </View>

            <View style={styles.statsGrid}>
              <StatTile label="Kalan stok" value={reward.stockLeft || 'Sınırsız'} icon="cube-outline" />
              <StatTile label="Son kullanım" value={reward.expiresAt || 'Süre yok'} icon="clock-outline" />
              <StatTile label="Oyuncu" value={reward.playersToday || '0'} icon="account-group-outline" />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Nasıl alınır?</Text>
              <StepRow icon="map-marker-path" title="Hedefe yaklaş" text="Önce haritada bu noktaya gidip sandık açma menzilinin içine gir." />
              <StepRow icon="treasure-chest-outline" title="Sandığı aç" text="Sandık açıldığında aktif kampanya varsa ödül kuponu otomatik düşer." />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Nasıl kullanılır?</Text>
              <StepRow icon="ticket-percent-outline" title="Kupon kodunu gör" text="Kazandığın kodu Profil → Kuponlarım ekranında tekrar açabilirsin." />
              <StepRow icon="storefront-outline" title="Kasada göster" text="İşletmeye gidip kupon kodunu kasaya göstererek kampanyadan yararlanırsın." />
            </View>

            <Pressable onPress={onClose} style={styles.primaryBtnWrap}>
              <LinearGradient colors={['#45CFFF', '#1D78FF']} style={styles.primaryBtn}>
                <MaterialCommunityIcons name="check-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Tamam</Text>
              </LinearGradient>
            </Pressable>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,6,12,0.60)',
    justifyContent: 'flex-end',
  },
  sheetWrap: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  sheet: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(126,154,255,0.18)',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.32,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 18,
  },
  handle: {
    alignSelf: 'center',
    width: 56,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBadge: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,226,163,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,226,163,0.22)',
  },
  headerBadgeText: {
    color: '#FFE8A6',
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 7,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  title: {
    color: '#FFF4CC',
    fontSize: 26,
    fontWeight: '900',
    marginTop: 14,
  },
  subtitle: {
    color: 'rgba(255,245,214,0.82)',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  heroCard: {
    marginTop: 14,
  },
  heroInner: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,214,109,0.18)',
    padding: 14,
  },
  heroKicker: {
    color: '#FFE8A6',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroText: {
    color: '#FFF9E8',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    justifyContent: 'space-between',
  },
  statTile: {
    width: '31.5%',
    minHeight: 110,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 11,
  },
  statIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,226,163,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,226,163,0.18)',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 10,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
    marginTop: 6,
  },
  section: {
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 14,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
  },
  stepIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(103,227,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(103,227,255,0.18)',
    marginRight: 10,
  },
  stepCopy: { flex: 1 },
  stepTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  stepText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  primaryBtnWrap: {
    marginTop: 16,
  },
  primaryBtn: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(193,237,255,0.30)',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    marginLeft: 8,
  },
});

export default memo(RewardInfoSheet);
