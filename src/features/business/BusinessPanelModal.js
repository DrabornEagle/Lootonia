import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useBusinessPanelData } from '../../hooks/useBusinessPanelData';

function formatPercent(value) {
  const dkd_iteration_value = Number(value || 0);
  return `${dkd_iteration_value.toFixed(1)}%`;
}

function formatTime(value) {
  if (!value) return '—';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function StatCard({ label, value, hint }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statHint}>{hint || ' '}</Text>
    </View>
  );
}

function Section({ title, children, actionLabel, onActionPress }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {actionLabel ? (
          <TouchableOpacity onPress={onActionPress} style={styles.sectionAction}>
            <Text style={styles.sectionActionText}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export default function BusinessPanelModal({
  businessId,
  onClose,
  onCreateCampaign,
}) {
  const { loading, error, snapshot, refresh } = useBusinessPanelData(businessId, 7);

  const topHours = useMemo(() => {
    return [...(snapshot?.hours || [])]
      .sort((dkd_left_value, dkd_right_value) => Number(dkd_right_value?.qr_scan_count || 0) - Number(dkd_left_value?.qr_scan_count || 0))
      .slice(0, 5);
  }, [snapshot?.hours]);

  const topTasks = useMemo(() => {
    return [...(snapshot?.tasks || [])]
      .sort((dkd_left_value, dkd_right_value) => Number(dkd_right_value?.qr_scan_count || 0) - Number(dkd_left_value?.qr_scan_count || 0))
      .slice(0, 5);
  }, [snapshot?.tasks]);

  if (!businessId) {
    return (
      <View style={styles.centerWrap}>
        <Text style={styles.emptyTitle}>İşletme seçilmedi</Text>
        <Text style={styles.emptyBody}>Önce panelin bağlı olacağı işletmeyi seç.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View>
          <Text style={styles.kicker}>İŞLETME PANELİ</Text>
          <Text style={styles.title}>Bugünkü trafik ve kampanya merkezi</Text>
          <Text style={styles.subtitle}>Oyuncu akışı, QR yoğunluğu, kupon kullanımı ve görev kaynakları tek ekranda.</Text>
        </View>
        <View style={styles.heroActions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={refresh}>
            <Text style={styles.secondaryButtonText}>Yenile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={onCreateCampaign}>
            <Text style={styles.primaryButtonText}>Kampanya Başlat</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>İşletme verileri yükleniyor...</Text>
        </View>
      ) : null}

      {!loading ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.statsGrid}>
            <StatCard
              label="Bugün Gelen Oyuncu"
              value={Number(snapshot?.today?.today_player_count || 0)}
              hint="benzersiz oyuncu"
            />
            <StatCard
              label="QR Okutma"
              value={Number(snapshot?.today?.today_qr_scan_count || 0)}
              hint="toplam okutma"
            />
            <StatCard
              label="Kupon Kullanımı"
              value={Number(snapshot?.today?.today_coupon_use_count || 0)}
              hint="bugün kullanılan"
            />
            <StatCard
              label="Dönüşüm"
              value={formatPercent(snapshot?.today?.coupon_conversion_rate || 0)}
              hint="kupon / qr"
            />
          </View>

          <Section title="Anlık Özet">
            <View style={styles.infoCard}>
              <Text style={styles.infoLine}>Son okutma saati: {formatTime(snapshot?.today?.last_scan_at)}</Text>
              <Text style={styles.infoLine}>Bu kartın altına yarın yeni oyuncu / geri gelen oyuncu oranı da eklenmeli.</Text>
            </View>
          </Section>

          <Section title="Yoğun Saatler">
            {(topHours || []).length ? topHours.map((item, index) => (
              <View key={`${item?.local_day}-${item?.local_hour}-${index}`} style={styles.rowCard}>
                <Text style={styles.rowTitle}>{String(item?.local_hour).padStart(2, '0')}:00</Text>
                <Text style={styles.rowMeta}>{Number(item?.qr_scan_count || 0)} QR • {Number(item?.unique_player_count || 0)} oyuncu</Text>
              </View>
            )) : (
              <Text style={styles.emptyBody}>Henüz saatlik yoğunluk verisi yok.</Text>
            )}
          </Section>

          <Section title="Trafik Getiren Görevler">
            {(topTasks || []).length ? topTasks.map((item, index) => (
              <View key={`${item?.task_key}-${item?.local_day}-${index}`} style={styles.rowCard}>
                <Text style={styles.rowTitle}>{item?.task_key || 'organic'}</Text>
                <Text style={styles.rowMeta}>{Number(item?.qr_scan_count || 0)} QR • {Number(item?.unique_player_count || 0)} oyuncu • kaynak: {item?.source_kind || 'drop'}</Text>
              </View>
            )) : (
              <Text style={styles.emptyBody}>Henüz görev katkı verisi yok.</Text>
            )}
          </Section>

          <Section title="Kampanyalar" actionLabel="Yeni Kampanya" onActionPress={onCreateCampaign}>
            {(snapshot?.campaigns || []).length ? snapshot.campaigns.map((item) => (
              <View key={item?.id} style={styles.campaignCard}>
                <View style={styles.campaignHeader}>
                  <Text style={styles.campaignTitle}>{item?.title || 'Kampanya'}</Text>
                  <View style={[styles.statusPill, item?.is_active ? styles.statusActive : styles.statusPassive]}>
                    <Text style={styles.statusText}>{item?.is_active ? 'Aktif' : 'Pasif'}</Text>
                  </View>
                </View>
                {!!item?.subtitle ? <Text style={styles.campaignSubtitle}>{item.subtitle}</Text> : null}
                <Text style={styles.rowMeta}>
                  Görev: {item?.task_key || 'organic'} • Stok: {Number(item?.stock_left || 0)} / {Number(item?.stock_total || 0)}
                </Text>
              </View>
            )) : (
              <Text style={styles.emptyBody}>Aktif veya geçmiş kampanya kaydı yok.</Text>
            )}
          </Section>

          {!!error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Veri alınamadı</Text>
              <Text style={styles.errorBody}>{String(error?.message || error)}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Kapat</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07111E' },
  hero: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(122, 163, 255, 0.12)',
    gap: 12,
  },
  kicker: { color: '#78D7FF', fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: '#EAF4FF', fontSize: 24, fontWeight: '900', marginTop: 4 },
  subtitle: { color: 'rgba(234,244,255,0.76)', fontSize: 13, lineHeight: 18, marginTop: 6 },
  heroActions: { flexDirection: 'row', gap: 10 },
  primaryButton: {
    backgroundColor: '#25C6FF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  primaryButtonText: { color: '#04111A', fontWeight: '900' },
  secondaryButton: {
    borderWidth: 1,
    borderColor: 'rgba(125, 170, 255, 0.30)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  secondaryButtonText: { color: '#D7E7FF', fontWeight: '800' },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    width: '47%',
    backgroundColor: 'rgba(14, 30, 49, 0.95)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(118, 170, 255, 0.12)',
  },
  statLabel: { color: 'rgba(220,236,255,0.74)', fontSize: 12, fontWeight: '700' },
  statValue: { color: '#F5FAFF', fontSize: 28, fontWeight: '900', marginTop: 8 },
  statHint: { color: 'rgba(170,203,239,0.70)', fontSize: 11, marginTop: 8 },
  section: {
    backgroundColor: 'rgba(10, 23, 38, 0.92)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(118, 170, 255, 0.10)',
    gap: 10,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: '#EAF4FF', fontSize: 16, fontWeight: '900' },
  sectionAction: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(37,198,255,0.12)' },
  sectionActionText: { color: '#7DDFFF', fontWeight: '800', fontSize: 12 },
  infoCard: { gap: 6 },
  infoLine: { color: 'rgba(223,236,255,0.82)', fontSize: 13, lineHeight: 18 },
  rowCard: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(18, 37, 59, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(118, 170, 255, 0.10)',
    gap: 4,
  },
  rowTitle: { color: '#F6FBFF', fontWeight: '900', fontSize: 14 },
  rowMeta: { color: 'rgba(202,224,250,0.80)', fontSize: 12, lineHeight: 17 },
  campaignCard: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 31, 51, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(118, 170, 255, 0.12)',
    gap: 6,
  },
  campaignHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  campaignTitle: { color: '#F5FAFF', fontSize: 14, fontWeight: '900', flex: 1 },
  campaignSubtitle: { color: 'rgba(214,230,251,0.78)', fontSize: 12, lineHeight: 17 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusActive: { backgroundColor: 'rgba(75, 212, 138, 0.16)' },
  statusPassive: { backgroundColor: 'rgba(255, 120, 120, 0.14)' },
  statusText: { color: '#EAF4FF', fontSize: 11, fontWeight: '900' },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#07111E' },
  loadingText: { color: '#DDEBFF', marginTop: 12 },
  emptyTitle: { color: '#F5FAFF', fontSize: 18, fontWeight: '900' },
  emptyBody: { color: 'rgba(218,233,252,0.76)', fontSize: 13, lineHeight: 18 },
  errorCard: {
    backgroundColor: 'rgba(90, 14, 24, 0.44)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 120, 120, 0.22)',
  },
  errorTitle: { color: '#FFF0F0', fontWeight: '900', fontSize: 14 },
  errorBody: { color: 'rgba(255,230,230,0.84)', marginTop: 6, fontSize: 12, lineHeight: 17 },
  closeButton: {
    marginTop: 8,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(120, 155, 255, 0.14)',
  },
  closeButtonText: { color: '#EAF4FF', fontWeight: '900' },
});
