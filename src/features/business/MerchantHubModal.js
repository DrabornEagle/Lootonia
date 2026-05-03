
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SecondaryButton from '../../components/ui/SecondaryButton';
import PrimaryButton from '../../components/ui/PrimaryButton';
import { cityLootTheme } from '../../theme/cityLootTheme';
import { useMerchantPortal } from '../../hooks/useMerchantPortal';

const dkd_colors = cityLootTheme.colors;

function extractDatePart(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const match = raw.match(/(\d{4}-\d{2}-\d{2})/);
  if (match?.[1]) return match[1];
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString().slice(0, 10) : '';
}

function extractTimePart(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const match = raw.match(/(\d{2}:\d{2})/);
  if (match?.[1]) return match[1];
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString().slice(11, 16) : '';
}

function mergeDateTime(dateValue, timeValue) {
  const date = String(dateValue || '').trim();
  const time = String(timeValue || '').trim();
  if (!date) return '';
  return `${date}T${/^\d{2}:\d{2}$/.test(time) ? time : '00:00'}:00`;
}

function TabButton({ active, icon, label, onPress }) {
  return (
    <Pressable onPress={onPress} style={[dkd_styles.tabBtn, active && dkd_styles.tabBtnActive]}>
      <MaterialCommunityIcons name={icon} size={16} color={active ? dkd_colors.text : dkd_colors.textMuted} />
      <Text style={[dkd_styles.tabText, active && dkd_styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function MetricCard({ icon, label, value, tone = 'cyan' }) {
  const accent = tone === 'gold' ? dkd_colors.goldSoft : tone === 'green' ? dkd_colors.green : tone === 'purple' ? dkd_colors.purple : dkd_colors.cyanSoft;
  return (
    <View style={dkd_styles.metricCard}>
      <View style={[dkd_styles.metricIcon, { borderColor: `${accent}55` }]}>
        <MaterialCommunityIcons name={icon} size={17} color={accent} />
      </View>
      <Text style={dkd_styles.metricLabel}>{label}</Text>
      <Text style={[dkd_styles.metricValue, { color: accent }]}>{value}</Text>
    </View>
  );
}

function Chip({ active, label, sub, onPress }) {
  return (
    <Pressable onPress={onPress} style={[dkd_styles.businessChip, active && dkd_styles.businessChipActive]}>
      <Text style={[dkd_styles.businessChipLabel, active && dkd_styles.businessChipLabelActive]} numberOfLines={1}>{label}</Text>
      {!!sub ? <Text style={dkd_styles.businessChipSub} numberOfLines={1}>{sub}</Text> : null}
    </Pressable>
  );
}

function Section({ title, sub, children, right = null }) {
  return (
    <View style={dkd_styles.section}>
      <View style={dkd_styles.sectionHead}>
        <View style={{ flex: 1 }}>
          <Text style={dkd_styles.sectionTitle}>{title}</Text>
          {!!sub ? <Text style={dkd_styles.sectionSub}>{sub}</Text> : null}
        </View>
        {right}
      </View>
      <View style={dkd_styles.sectionCard}>{children}</View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  containerStyle,
  inputStyle,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
}) {
  return (
    <View style={[dkd_styles.field, containerStyle]}>
      <Text style={dkd_styles.fieldLabel}>{label}</Text>
      <TextInput
        value={String(value ?? '')}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.30)"
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={[dkd_styles.input, multiline && dkd_styles.inputMultiline, inputStyle]}
      />
    </View>
  );
}

function TimeField({ label, value, onChangeText, placeholder = '09:00' }) {
  return (
    <View style={dkd_styles.fieldHalf}>
      <Text style={dkd_styles.fieldLabel}>{label}</Text>
      <View style={dkd_styles.inlineInputWrap}>
        <MaterialCommunityIcons name="clock-time-four-outline" size={16} color={dkd_colors.cyanSoft} />
        <TextInput
          value={String(value || '')}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.30)"
          keyboardType="numbers-and-punctuation"
          style={dkd_styles.inlineInput}
        />
      </View>
    </View>
  );
}

function DateTimeField({ title, value, onChange }) {
  const dateValue = extractDatePart(value);
  const timeValue = extractTimePart(value);

  return (
    <View style={dkd_styles.scheduleCard}>
      <View style={dkd_styles.scheduleHead}>
        <Text style={dkd_styles.scheduleTitle}>{title}</Text>
        <Text style={dkd_styles.scheduleHint}>
          {dateValue ? `${dateValue}${timeValue ? ` • ${timeValue}` : ''}` : 'Tarih ve saat gir'}
        </Text>
      </View>
      <View style={dkd_styles.dualRow}>
        <Field
          label="Tarih"
          value={dateValue}
          onChangeText={(next) => onChange(mergeDateTime(next, timeValue))}
          placeholder="2026-04-10"
          containerStyle={dkd_styles.fieldHalf}
          inputStyle={dkd_styles.compactInput}
          autoCapitalize="none"
        />
        <Field
          label="Saat"
          value={timeValue}
          onChangeText={(next) => onChange(mergeDateTime(dateValue, next))}
          placeholder="19:30"
          containerStyle={dkd_styles.fieldHalf}
          inputStyle={dkd_styles.compactInput}
          keyboardType="numbers-and-punctuation"
          autoCapitalize="none"
        />
      </View>
    </View>
  );
}

function TinyBar({ label, value, max, tone = 'cyan' }) {
  const accent = tone === 'gold' ? dkd_colors.goldSoft : tone === 'green' ? dkd_colors.green : tone === 'purple' ? dkd_colors.purple : dkd_colors.cyanSoft;
  const pct = max > 0 ? Math.max(8, Math.round((value / max) * 100)) : 8;
  return (
    <View style={dkd_styles.barRow}>
      <Text style={dkd_styles.barLabel}>{label}</Text>
      <View style={dkd_styles.barTrack}><View style={[dkd_styles.barFill, { width: `${pct}%`, backgroundColor: accent }]} /></View>
      <Text style={dkd_styles.barValue}>{value}</Text>
    </View>
  );
}

function EmptyState({ icon, title, text }) {
  return (
    <View style={dkd_styles.emptyState}>
      <MaterialCommunityIcons name={icon} size={26} color={dkd_colors.cyanSoft} />
      <Text style={dkd_styles.emptyTitle}>{title}</Text>
      <Text style={dkd_styles.emptyText}>{text}</Text>
    </View>
  );
}

function ProductCard({ product, onEdit, onDelete }) {
  const active = product?.is_active !== false && Number(product?.stock || 0) > 0;
  return (
    <Pressable style={dkd_styles.productCard} onPress={() => onEdit?.(product)}>
      <View style={dkd_styles.productRow}>
        <View style={dkd_styles.productThumbWrap}>
          {String(product?.image_url || '').trim() ? (
            <Image source={{ uri: String(product.image_url).trim() }} style={dkd_styles.productThumb} resizeMode="cover" />
          ) : (
            <View style={dkd_styles.productThumbFallback}>
              <MaterialCommunityIcons name="image-outline" size={22} color="rgba(255,255,255,0.42)" />
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <View style={dkd_styles.productHeadRow}>
            <Text style={dkd_styles.productTitle} numberOfLines={1}>{product?.title || 'Ürün'}</Text>
            <View style={[dkd_styles.statePill, active ? dkd_styles.stateOn : dkd_styles.stateOff]}>
              <Text style={[dkd_styles.stateText, active ? dkd_styles.stateTextOn : dkd_styles.stateTextOff]}>{active ? 'Aktif' : 'Pasif'}</Text>
            </View>
          </View>
          <Text style={dkd_styles.productMeta} numberOfLines={1}>
            {(product?.category || 'genel')} • {Number(product?.price_token || 0)} token • ürün {product?.price_cash == null ? '-' : Number(product?.price_cash || 0)} TL • kurye {Number(product?.delivery_fee_tl || 0)} TL • stok {Number(product?.stock || 0)}
          </Text>
          {!!product?.description ? <Text style={dkd_styles.productDesc} numberOfLines={2}>{product.description}</Text> : null}
        </View>
      </View>

      <View style={dkd_styles.productFooter}>
        <Text style={dkd_styles.productFooterHint}>Düzenlemek için karta dokun.</Text>
        <SecondaryButton
          label="Sil"
          onPress={() => onDelete?.(product)}
          size="compact"
          fullWidth={false}
          icon="trash-can-outline"
        />
      </View>
    </Pressable>
  );
}

function normalizeProductDraft(prev = {}) {
  return {
    id: '',
    title: '',
    description: '',
    imageUrl: '',
    category: 'genel',
    currencyCode: 'TRY',
    priceToken: '',
    priceCash: '',
    stock: '0',
    sortOrder: '0',
    isActive: true,
    ...prev,
  };
}

export default function MerchantHubModal({ visible, onClose }) {
  const [tab, setTab] = useState('today');
  const {
    loading,
    busy,
    message,
    businesses,
    selectedBusinessId,
    setSelectedBusinessId,
    selectedBusiness,
    dashboard,
    businessProducts,
    claimCode,
    setClaimCode,
    claimCodeNow,
    redeemDraft,
    setRedeemDraft,
    redeemCouponNow,
    campaignDraft,
    setCampaignDraft,
    chooseCampaignToEdit,
    saveCampaignNow,
    deleteCampaignNow,
    productDraft,
    setProductDraft,
    chooseProductToEdit,
    saveProductNow,
    deleteProductNow,
    resetProductDraft,
    locationDraft,
    setLocationDraft,
    saveLocationNow,
    refresh,
  } = useMerchantPortal(visible);

  const today = useMemo(() => (dashboard?.today || {}), [dashboard?.today]);
  const hourly = useMemo(() => (Array.isArray(dashboard?.hourly) ? dashboard.hourly.filter((dkd_numeric_value) => Number(dkd_numeric_value?.scan_count || 0) > 0) : []), [dashboard?.hourly]);
  const daily = useMemo(() => (Array.isArray(dashboard?.daily) ? dashboard.daily.filter((dkd_numeric_value) => Number(dkd_numeric_value?.scan_count || 0) > 0) : []), [dashboard?.daily]);
  const tasks = useMemo(() => (Array.isArray(dashboard?.tasks) ? dashboard.tasks.filter((dkd_numeric_value) => Number(dkd_numeric_value?.scan_count || 0) > 0) : []), [dashboard?.tasks]);
  const campaigns = useMemo(() => (Array.isArray(dashboard?.campaigns) ? dashboard.campaigns : []), [dashboard?.campaigns]);
  const recentUses = useMemo(() => (Array.isArray(dashboard?.recentUses) ? dashboard.recentUses.slice(0, 8) : []), [dashboard?.recentUses]);
  const products = useMemo(() => (Array.isArray(businessProducts) ? businessProducts : []), [businessProducts]);

  const maxHourly = useMemo(() => hourly.reduce((dkd_max_value, dkd_numeric_value) => Math.max(dkd_max_value, Number(dkd_numeric_value?.scan_count || 0)), 0), [hourly]);
  const maxDaily = useMemo(() => daily.reduce((dkd_max_value, dkd_numeric_value) => Math.max(dkd_max_value, Number(dkd_numeric_value?.scan_count || 0)), 0), [daily]);
  const maxTask = useMemo(() => tasks.reduce((dkd_max_value, dkd_numeric_value) => Math.max(dkd_max_value, Number(dkd_numeric_value?.scan_count || 0)), 0), [tasks]);

  const hasBusinesses = Array.isArray(businesses) && businesses.length > 0;
  const roleLabel = selectedBusiness?.role_key === 'cashier' ? 'Kasa' : selectedBusiness?.role_key === 'owner' ? 'Sahip' : 'Yönetici';
  const previewUri = String(productDraft?.imageUrl || '').trim();

  const marketSummary = useMemo(() => ({
    total: products.length,
    active: products.filter((item) => item?.is_active !== false && Number(item?.stock || 0) > 0).length,
  }), [products]);

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm?.granted) {
        Alert.alert('İşletme', 'Galeri izni verilmedi.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.86,
      });
      if (res?.canceled) return;
      const asset = Array.isArray(res?.assets) ? res.assets[0] : null;
      if (!asset?.uri) return;
      setProductDraft((dkd_previous_product_draft) => ({ ...normalizeProductDraft(dkd_previous_product_draft), imageUrl: asset.uri }));
    } catch (error) {
      Alert.alert('İşletme', error?.message || 'Görsel seçilemedi.');
    }
  };

  const askDeleteProduct = (productId) => {
    if (!productId) return;
    Alert.alert('Ürün sil', 'Bu ürünü kaldırmak istiyor musun?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => deleteProductNow(productId) },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={dkd_styles.backdrop}>
        <LinearGradient colors={['#06101D', '#0A1628', '#04070D']} style={dkd_styles.shell}>
          <View style={dkd_styles.glowA} />
          <View style={dkd_styles.glowB} />

          <View style={dkd_styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={dkd_styles.kicker}>MERCHANT PORTAL</Text>
              <Text style={dkd_styles.title}>İşletme Panelim</Text>
            </View>
            <View style={dkd_styles.headerButtons}>
              <SecondaryButton label="Yenile" onPress={() => refresh(true)} size="compact" fullWidth={false} icon="refresh" />
              <SecondaryButton label="Kapat" onPress={onClose} size="compact" fullWidth={false} icon="close" />
            </View>
          </View>

          {!hasBusinesses ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={dkd_styles.scrollContent}>
              <Section title="İşletmeye bağlan" sub="Admin sana bir bağlantı kodu verir. Bu kodu burada girerek paneli açarsın.">
                <View style={dkd_styles.stepList}>
                  <View style={dkd_styles.stepRow}><Text style={dkd_styles.stepIdx}>1</Text><Text style={dkd_styles.stepText}>Admin bağlantı kodu üretir.</Text></View>
                  <View style={dkd_styles.stepRow}><Text style={dkd_styles.stepIdx}>2</Text><Text style={dkd_styles.stepText}>Kodu bu ekrana yapıştırırsın.</Text></View>
                  <View style={dkd_styles.stepRow}><Text style={dkd_styles.stepIdx}>3</Text><Text style={dkd_styles.stepText}>İşletme panelin hesabına bağlanır.</Text></View>
                </View>
                <Field
                  label="Bağlantı kodu"
                  value={claimCode}
                  onChangeText={setClaimCode}
                  placeholder="DKD-BIZ-XXXXXX"
                  autoCapitalize="characters"
                />
                <PrimaryButton label={busy ? 'Bağlanılıyor…' : 'İşletmeye Bağlan'} onPress={claimCodeNow} disabled={busy || !String(claimCode || '').trim()} />
              </Section>
              {!!message ? <View style={dkd_styles.messageBox}><Text style={dkd_styles.messageText}>{message}</Text></View> : null}
            </ScrollView>
          ) : (
            <>
              <View style={dkd_styles.businessRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {businesses.map((row) => (
                    <Chip
                      key={row.business_id}
                      active={String(row.business_id) === String(selectedBusinessId)}
                      label={row.name || 'İşletme'}
                      sub={`${row.city || '-'} • ${row.district || row.category || '-'}`}
                      onPress={() => setSelectedBusinessId(row.business_id)}
                    />
                  ))}
                </ScrollView>
              </View>

              <View style={dkd_styles.tabsRow}>
                <TabButton active={tab === 'today'} icon="view-dashboard-outline" label="Bugün" onPress={() => setTab('today')} />
                <TabButton active={tab === 'campaigns'} icon="bullhorn-outline" label="Kampanya" onPress={() => setTab('campaigns')} />
                <TabButton active={tab === 'market'} icon="storefront-outline" label="Market" onPress={() => setTab('market')} />
                <TabButton active={tab === 'cashier'} icon="ticket-confirmation-outline" label="Kasa" onPress={() => setTab('cashier')} />
                <TabButton active={tab === 'about'} icon="information-outline" label="İşletmem" onPress={() => setTab('about')} />
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={dkd_styles.scrollContent}>
                {tab === 'today' ? (
                  <>
                    <View style={dkd_styles.metricGrid}>
                      <MetricCard icon="account-group-outline" label="Bugün Oyuncu" value={String(today.uniquePlayers || 0)} tone="cyan" />
                      <MetricCard icon="qrcode-scan" label="QR Okutma" value={String(today.scanCount || 0)} tone="green" />
                      <MetricCard icon="ticket-confirmation-outline" label="Kupon Kullanım" value={String(today.couponCount || 0)} tone="gold" />
                      <MetricCard icon="chart-line" label="Dönüşüm" value={`%${Number(today.conversionRate || 0)}`} tone="purple" />
                    </View>
                    <View style={dkd_styles.metricGrid}>
                      <MetricCard icon="account-plus-outline" label="Yeni Oyuncu" value={String(today.newPlayers || 0)} tone="cyan" />
                      <MetricCard icon="account-sync-outline" label="Geri Gelen" value={String(today.returningPlayers || 0)} tone="green" />
                    </View>

                    <Section title="Saatlik yoğunluk" sub="Hangi saatlerde mağazaya daha çok oyuncu gelmiş?">
                      {hourly.length ? hourly.map((row) => <TinyBar key={row.label} label={row.label} value={Number(row.scan_count || 0)} max={maxHourly} tone="green" />) : <EmptyState icon="clock-outline" title="Henüz veri yok" text="Bugün trafik geldikçe saatlik barlar burada dolacak." />}
                    </Section>

                    <Section title="Son 7 günlük akış" sub="İşletmenin günlük nabzı">
                      {daily.length ? daily.map((row) => <TinyBar key={row.bucket_day} label={row.label} value={Number(row.scan_count || 0)} max={maxDaily} tone="cyan" />) : <EmptyState icon="calendar-week-outline" title="7 günlük veri yok" text="Henüz yeterli trafik logu oluşmadı." />}
                    </Section>

                    <Section title="Trafik getiren görevler" sub="Hangi görev gerçekten oyuncu taşıyor?">
                      {tasks.length ? tasks.map((row) => <TinyBar key={row.task_key} label={row.task_key} value={Number(row.scan_count || 0)} max={maxTask} tone="gold" />) : <EmptyState icon="map-marker-star-outline" title="Görev verisi yok" text="Oyuncu görev üzerinden geldiğinde burada görünür." />}
                    </Section>
                  </>
                ) : null}

                {tab === 'campaigns' ? (
                  <>
                    <Section title="Müşteri bu kampanyayı nasıl kazanır?" sub="Kupon akışı daha net ve kısa.">
                      <View style={dkd_styles.stepList}>
                        <View style={dkd_styles.stepRow}><Text style={dkd_styles.stepIdx}>1</Text><Text style={dkd_styles.stepText}>Aktif kampanya bağlı dropta görünür.</Text></View>
                        <View style={dkd_styles.stepRow}><Text style={dkd_styles.stepIdx}>2</Text><Text style={dkd_styles.stepText}>Oyuncu QR sandık açar veya görevden gelir.</Text></View>
                        <View style={dkd_styles.stepRow}><Text style={dkd_styles.stepIdx}>3</Text><Text style={dkd_styles.stepText}>Kupon kodu sandık ödül ekranında çıkar.</Text></View>
                        <View style={dkd_styles.stepRow}><Text style={dkd_styles.stepIdx}>4</Text><Text style={dkd_styles.stepText}>Kod Kuponlarım ekranında tekrar görünür.</Text></View>
                        <View style={dkd_styles.stepRow}><Text style={dkd_styles.stepIdx}>5</Text><Text style={dkd_styles.stepText}>Kasada doğrulanınca tekrar kullanılamaz.</Text></View>
                      </View>
                    </Section>

                    <Section title="Kampanya oluştur / düzenle" sub="Başlangıç ve bitiş tarih-saat alanları ayrıldı." right={campaignDraft?.id ? <SecondaryButton label="Sil" onPress={() => Alert.alert('Kampanyayı Sil', 'Bu kampanya silinsin mi?', [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Sil', style: 'destructive', onPress: () => deleteCampaignNow(campaignDraft.id) }])} size="compact" fullWidth={false} icon="trash-can-outline" /> : null}>
                      <Field label="Kampanya adı" value={campaignDraft.title} onChangeText={(value) => setCampaignDraft((dkd_campaign_draft) => ({ ...dkd_campaign_draft, title: value }))} placeholder="Örn: Sabah kahve kampanyası" />
                      <Field label="Sponsor adı" value={campaignDraft.sponsorName} onChangeText={(value) => setCampaignDraft((dkd_campaign_draft) => ({ ...dkd_campaign_draft, sponsorName: value }))} placeholder="Sponsor veya marka adı" />
                      <Field label="Ödül etiketi" value={campaignDraft.rewardLabel} onChangeText={(value) => setCampaignDraft((dkd_campaign_draft) => ({ ...dkd_campaign_draft, rewardLabel: value }))} placeholder="Ücretsiz küçük kahve" />
                      <View style={dkd_styles.dualRow}>
                        <Field label="Kupon ön eki" value={campaignDraft.couponPrefix} onChangeText={(value) => setCampaignDraft((dkd_campaign_draft) => ({ ...dkd_campaign_draft, couponPrefix: value }))} placeholder="DKD" containerStyle={dkd_styles.fieldHalf} autoCapitalize="characters" />
                        <Field label="Stok limiti" value={campaignDraft.stockLimit} onChangeText={(value) => setCampaignDraft((dkd_campaign_draft) => ({ ...dkd_campaign_draft, stockLimit: value }))} placeholder="50" containerStyle={dkd_styles.fieldHalf} keyboardType="numeric" />
                      </View>
                      <DateTimeField title="Kampanya başlangıç tarihi ve saati" value={campaignDraft.startsAt} onChange={(value) => setCampaignDraft((dkd_campaign_draft) => ({ ...dkd_campaign_draft, startsAt: value }))} />
                      <DateTimeField title="Kampanya bitiş tarihi ve saati" value={campaignDraft.endsAt} onChange={(value) => setCampaignDraft((dkd_campaign_draft) => ({ ...dkd_campaign_draft, endsAt: value }))} />
                      <View style={dkd_styles.scheduleCard}>
                        <View style={dkd_styles.scheduleHead}>
                          <Text style={dkd_styles.scheduleTitle}>Gün içi kupon kapanış saati</Text>
                          <Text style={dkd_styles.scheduleHint}>Opsiyonel</Text>
                        </View>
                        <TimeField label="Kapanış saati" value={extractTimePart(campaignDraft.closesAt)} onChangeText={(value) => setCampaignDraft((dkd_campaign_draft) => ({ ...dkd_campaign_draft, closesAt: value }))} placeholder="22:00" />
                      </View>
                      <PrimaryButton label={busy ? 'Kaydediliyor…' : (campaignDraft.id ? 'Kampanyayı Güncelle' : 'Kampanyayı Kaydet')} onPress={saveCampaignNow} disabled={busy || !String(campaignDraft.title || '').trim()} />
                    </Section>

                    <Section title="Açık kampanyalar" sub="Düzenlemek için karta dokun.">
                      {campaigns.length ? campaigns.map((campaign) => (
                        <Pressable key={campaign.id} style={dkd_styles.campaignCard} onPress={() => chooseCampaignToEdit(campaign)}>
                          <View style={dkd_styles.campaignTop}>
                            <View style={{ flex: 1 }}>
                              <Text style={dkd_styles.campaignTitle}>{campaign.title}</Text>
                              <Text style={dkd_styles.campaignSub}>{campaign.reward_label || 'Sponsor Ödülü'} • {campaign.sponsor_name || 'Sponsor yok'}</Text>
                            </View>
                            <View style={[dkd_styles.statePill, campaign.is_active ? dkd_styles.stateOn : dkd_styles.stateOff]}>
                              <Text style={[dkd_styles.stateText, campaign.is_active ? dkd_styles.stateTextOn : dkd_styles.stateTextOff]}>{campaign.is_active ? 'Düzenle' : 'Pasif'}</Text>
                            </View>
                          </View>
                          <View style={dkd_styles.campaignStats}>
                            <Text style={dkd_styles.campaignStat}>Stok: {Number(campaign.stock_limit || 0)}</Text>
                            <Text style={dkd_styles.campaignStat}>Kalan: {Number(campaign.stock_left || 0)}</Text>
                            <Text style={dkd_styles.campaignStat}>Kullanılan: {Number(campaign.redeemed_count || 0)}</Text>
                          </View>
                          <Text style={dkd_styles.helperText}>Kupon ön eki: {campaign.coupon_prefix || 'DKD'}</Text>
                          <View style={dkd_styles.productFooter}>
                            <Text style={dkd_styles.productFooterHint}>Karta dokunarak düzenle veya sil.</Text>
                            <SecondaryButton label="Sil" onPress={() => Alert.alert('Kampanyayı Sil', 'Bu kampanya silinsin mi?', [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Sil', style: 'destructive', onPress: () => deleteCampaignNow(campaign.id) }])} size="compact" fullWidth={false} icon="trash-can-outline" />
                          </View>
                        </Pressable>
                      )) : <EmptyState icon="bullhorn-outline" title="Kampanya yok" text="İlk kampanyanı şimdi buradan açabilirsin." />}
                    </Section>
                  </>
                ) : null}

                {tab === 'market' ? (
                  <>
                    <Section title="İşletme marketi" sub="Aynı işletme merkezinden ürün ekle, düzenle ve vitrine taşı. Tasarım eski panel çizgisinde tutuldu.">
                      <View style={dkd_styles.metricGrid}>
                        <MetricCard icon="package-variant-closed" label="Toplam Ürün" value={String(marketSummary.total || 0)} tone="cyan" />
                        <MetricCard icon="eye-outline" label="Aktif Ürün" value={String(marketSummary.active || 0)} tone="green" />
                      </View>
                    </Section>

                    <Section
                      title="Ürün ekle / düzenle"
                      sub="İşletme merkezinden ürün kataloğunu yönet."
                      right={productDraft?.id ? <SecondaryButton label="Formu temizle" onPress={resetProductDraft} size="compact" fullWidth={false} icon="broom" /> : null}
                    >
                      {previewUri ? (
                        <View style={dkd_styles.previewCard}>
                          <Image source={{ uri: previewUri }} style={dkd_styles.previewImage} resizeMode="cover" />
                        </View>
                      ) : null}
                      <View style={dkd_styles.productPickerRow}>
                        <SecondaryButton label="Cihazdan görsel seç" onPress={pickImage} size="compact" fullWidth={false} icon="image-plus" />
                      </View>
                      <Field label="Ürün adı" value={productDraft.title} onChangeText={(dkd_title_value) => setProductDraft((dkd_previous_product_draft) => ({ ...normalizeProductDraft(dkd_previous_product_draft), title: dkd_title_value }))} placeholder="Örn: Büyük Latte" />
                      <Field label="Kısa açıklama" value={productDraft.description} onChangeText={(dkd_description_value) => setProductDraft((dkd_previous_product_draft) => ({ ...normalizeProductDraft(dkd_previous_product_draft), description: dkd_description_value }))} placeholder="Örn: Çift shot, 400 ml" multiline />
                      <Field label="Görsel URL" value={productDraft.imageUrl} onChangeText={(dkd_image_url_value) => setProductDraft((dkd_previous_product_draft) => ({ ...normalizeProductDraft(dkd_previous_product_draft), imageUrl: dkd_image_url_value }))} placeholder="https://..." autoCapitalize="none" />
                      <View style={dkd_styles.dualRow}>
                        <Field label="Kategori" value={productDraft.category} onChangeText={(dkd_category_value) => setProductDraft((dkd_previous_product_draft) => ({ ...normalizeProductDraft(dkd_previous_product_draft), category: dkd_category_value }))} placeholder="kahve" containerStyle={dkd_styles.fieldHalf} autoCapitalize="none" />
                        <Field label="Token fiyatı" value={String(productDraft.priceToken || '')} onChangeText={(dkd_price_token_value) => setProductDraft((dkd_previous_product_draft) => ({ ...normalizeProductDraft(dkd_previous_product_draft), priceToken: dkd_price_token_value }))} placeholder="120" containerStyle={dkd_styles.fieldHalf} keyboardType="numeric" autoCapitalize="none" />
                      </View>
                      <View style={dkd_styles.dualRow}>
                        <Field label="Ürün fiyatı (TL)" value={String(productDraft.priceCash || '')} onChangeText={(dkd_price_cash_value) => setProductDraft((dkd_previous_product_draft) => ({ ...normalizeProductDraft(dkd_previous_product_draft), priceCash: dkd_price_cash_value }))} placeholder="150" containerStyle={dkd_styles.fieldHalf} keyboardType="decimal-pad" autoCapitalize="none" />
                        <Field label="Kurye ücreti (TL)" value={String(productDraft.deliveryFeeTl || '')} onChangeText={(dkd_delivery_fee_tl_value) => setProductDraft((dkd_previous_product_draft) => ({ ...normalizeProductDraft(dkd_previous_product_draft), deliveryFeeTl: dkd_delivery_fee_tl_value }))} placeholder="40" containerStyle={dkd_styles.fieldHalf} keyboardType="decimal-pad" autoCapitalize="none" />
                      </View>
                      <View style={dkd_styles.dualRow}>
                        <Field label="Stok" value={String(productDraft.stock || '')} onChangeText={(dkd_stock_value) => setProductDraft((dkd_previous_product_draft) => ({ ...normalizeProductDraft(dkd_previous_product_draft), stock: dkd_stock_value }))} placeholder="10" containerStyle={dkd_styles.fieldHalf} keyboardType="numeric" autoCapitalize="none" />
                        <Field label="Sıra" value={String(productDraft.sortOrder || '')} onChangeText={(dkd_sort_order_value) => setProductDraft((dkd_previous_product_draft) => ({ ...normalizeProductDraft(dkd_previous_product_draft), sortOrder: dkd_sort_order_value }))} placeholder="0" containerStyle={dkd_styles.fieldHalf} keyboardType="numeric" autoCapitalize="none" />
                      </View>
                      <View style={dkd_styles.productActions}>
                        <SecondaryButton
                          label={productDraft.isActive !== false ? 'Ürün aktif' : 'Ürün pasif'}
                          onPress={() => setProductDraft((dkd_previous_product_draft) => ({ ...normalizeProductDraft(dkd_previous_product_draft), isActive: !(dkd_previous_product_draft?.isActive !== false) }))}
                          size="compact"
                          fullWidth={false}
                          icon={productDraft.isActive !== false ? 'toggle-switch' : 'toggle-switch-off-outline'}
                        />
                      </View>
                      <PrimaryButton label={busy ? 'Kaydediliyor…' : (productDraft.id ? 'Ürünü Güncelle' : 'Ürünü Kaydet')} onPress={saveProductNow} disabled={busy || !String(productDraft.title || '').trim()} icon="content-save-outline" />
                    </Section>

                    <Section title="Aktif ürünler" sub="Kart tasarımı sade tutuldu. Düzenlemek için karta dokun, silmek için butonu kullan.">
                      {products.length ? products.map((product) => (
                        <ProductCard
                          key={String(product?.id)}
                          product={product}
                          onEdit={chooseProductToEdit}
                          onDelete={(dkd_product_row) => askDeleteProduct(dkd_product_row?.id)}
                        />
                      )) : <EmptyState icon="storefront-outline" title="Henüz ürün yok" text="İlk ürününü bu sekmeden ekleyebilirsin." />}
                    </Section>
                  </>
                ) : null}

                {tab === 'cashier' ? (
                  <>
                    <Section title="Kupon doğrula" sub="Müşteri kodu sandık ödül ekranında veya Kuponlarım bölümünde görür.">
                      <Field
                        label="Kupon kodu"
                        value={redeemDraft.couponCode}
                        onChangeText={(dkd_coupon_code_value) => setRedeemDraft((dkd_previous_redeem_draft) => ({ ...dkd_previous_redeem_draft, couponCode: dkd_coupon_code_value }))}
                        placeholder="DKD-AB12CD34"
                        autoCapitalize="characters"
                      />
                      <Field
                        label="Kasa notu"
                        value={redeemDraft.note}
                        onChangeText={(dkd_note_value) => setRedeemDraft((dkd_previous_redeem_draft) => ({ ...dkd_previous_redeem_draft, note: dkd_note_value }))}
                        placeholder="Örn: ürün teslim edildi"
                        multiline
                      />
                      <PrimaryButton label={busy ? 'Doğrulanıyor…' : 'Kuponu Doğrula'} onPress={redeemCouponNow} disabled={busy || !String(redeemDraft.couponCode || '').trim()} />
                    </Section>

                    <Section title="Son doğrulamalar" sub="Kasada kullanılan kupon akışı">
                      {recentUses.length ? recentUses.map((row) => (
                        <View key={row.id} style={dkd_styles.logRow}>
                          <View style={dkd_styles.logIcon}><MaterialCommunityIcons name="check-decagram" size={16} color={dkd_colors.green} /></View>
                          <View style={{ flex: 1 }}>
                            <Text style={dkd_styles.logTitle}>{row.coupon_code || 'Kupon'}</Text>
                            <Text style={dkd_styles.logSub}>{String(row.created_at || '').replace('T', ' ').slice(0, 16)}</Text>
                          </View>
                        </View>
                      )) : <EmptyState icon="ticket-outline" title="Kullanım yok" text="Kasa kupon doğruladıkça burada akış oluşur." />}
                    </Section>
                  </>
                ) : null}

                {tab === 'about' ? (
                  <>
                    <Section title="İşletme bilgisi" sub="Bu ekranın bağlı olduğu işletme">
                      <View style={dkd_styles.infoList}>
                        <View style={dkd_styles.infoRow}><Text style={dkd_styles.infoLabel}>İşletme</Text><Text style={dkd_styles.infoValue}>{selectedBusiness?.name || '-'}</Text></View>
                        <View style={dkd_styles.infoRow}><Text style={dkd_styles.infoLabel}>Kategori</Text><Text style={dkd_styles.infoValue}>{selectedBusiness?.category || '-'}</Text></View>
                        <View style={dkd_styles.infoRow}><Text style={dkd_styles.infoLabel}>Şehir / İlçe</Text><Text style={dkd_styles.infoValue}>{[selectedBusiness?.city, selectedBusiness?.district].filter(Boolean).join(' / ') || '-'}</Text></View>
                        <View style={dkd_styles.infoRow}><Text style={dkd_styles.infoLabel}>Adres</Text><Text style={dkd_styles.infoValue}>{selectedBusiness?.address_text || '-'}</Text></View>
                        <View style={dkd_styles.infoRow}><Text style={dkd_styles.infoLabel}>Saat</Text><Text style={dkd_styles.infoValue}>{selectedBusiness?.opens_at || '--:--'} - {selectedBusiness?.closes_at || '--:--'}</Text></View>
                        <View style={dkd_styles.infoRow}><Text style={dkd_styles.infoLabel}>Yetki</Text><Text style={dkd_styles.infoValue}>{roleLabel}</Text></View>
                      </View>
                    </Section>
                    <Section title="İşletme konumu" sub="Haritada Aç önce bu noktaya rota verir. Lat/Lng yoksa adres metniyle yönlendirme yapılır.">
                      <Field label="Adres" value={locationDraft.addressText} onChangeText={(dkd_address_text_value) => setLocationDraft((dkd_previous_location_draft) => ({ ...dkd_previous_location_draft, addressText: dkd_address_text_value }))} placeholder="Göksu AVM giriş kapısı" multiline />
                      <View style={dkd_styles.dualRow}>
                        <Field label="Lat" value={locationDraft.lat} onChangeText={(dkd_lat_value) => setLocationDraft((dkd_previous_location_draft) => ({ ...dkd_previous_location_draft, lat: dkd_lat_value }))} placeholder="39.99" containerStyle={dkd_styles.fieldHalf} keyboardType="decimal-pad" autoCapitalize="none" />
                        <Field label="Lng" value={locationDraft.lng} onChangeText={(dkd_lng_value) => setLocationDraft((dkd_previous_location_draft) => ({ ...dkd_previous_location_draft, lng: dkd_lng_value }))} placeholder="32.60" containerStyle={dkd_styles.fieldHalf} keyboardType="decimal-pad" autoCapitalize="none" />
                      </View>
                      <Field label="Teslim alma yarıçapı (m)" value={locationDraft.radiusM} onChangeText={(dkd_radius_meter_value) => setLocationDraft((dkd_previous_location_draft) => ({ ...dkd_previous_location_draft, radiusM: dkd_radius_meter_value }))} placeholder="80" keyboardType="numeric" autoCapitalize="none" />
                      <PrimaryButton label={busy ? 'Kaydediliyor…' : 'Konumu Kaydet'} onPress={saveLocationNow} disabled={busy} icon="content-save-outline" />
                    </Section>
                  </>
                ) : null}

                {!!message ? <View style={dkd_styles.messageBox}><Text style={dkd_styles.messageText}>{message}</Text></View> : null}
                {loading ? <View style={dkd_styles.messageBox}><Text style={dkd_styles.messageText}>Yükleniyor…</Text></View> : null}
              </ScrollView>
            </>
          )}
        </LinearGradient>
      </View>
    </Modal>
  );
}

const dkd_styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(2,6,12,0.84)', alignItems: 'center', justifyContent: 'center', padding: 14 },
  shell: { width: '100%', maxWidth: 760, maxHeight: '94%', borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', padding: 16, overflow: 'hidden' },
  glowA: { position: 'absolute', width: 220, height: 220, borderRadius: 999, backgroundColor: 'rgba(103,227,255,0.12)', top: -30, right: -30 },
  glowB: { position: 'absolute', width: 180, height: 180, borderRadius: 999, backgroundColor: 'rgba(246,181,78,0.10)', bottom: -20, left: -20 },
  header: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  kicker: { color: dkd_colors.green, fontWeight: '900', fontSize: 11, letterSpacing: 1.6 },
  title: { color: dkd_colors.text, fontSize: 28, fontWeight: '900', marginTop: 4 },
  headerButtons: { gap: 10 },
  businessRow: { marginTop: 14 },
  businessChip: { minWidth: 170, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  businessChipActive: { borderColor: 'rgba(103,227,255,0.60)', backgroundColor: 'rgba(103,227,255,0.14)' },
  businessChipLabel: { color: dkd_colors.text, fontSize: 15, fontWeight: '900' },
  businessChipLabelActive: { color: '#FFFFFF' },
  businessChipSub: { color: dkd_colors.textSoft, fontSize: 11, marginTop: 4 },
  tabsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.05)' },
  tabBtnActive: { borderColor: 'rgba(103,227,255,0.60)', backgroundColor: 'rgba(103,227,255,0.14)' },
  tabText: { color: dkd_colors.textMuted, fontSize: 13, fontWeight: '800' },
  tabTextActive: { color: '#FFFFFF' },
  scrollContent: { paddingTop: 14, paddingBottom: 10 },
  section: { marginTop: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  sectionTitle: { color: dkd_colors.text, fontSize: 18, fontWeight: '900' },
  sectionSub: { color: dkd_colors.textSoft, fontSize: 12, marginTop: 4, lineHeight: 18 },
  sectionCard: { marginTop: 8, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.05)', padding: 14, gap: 12 },
  field: { gap: 6 },
  fieldHalf: { flex: 1 },
  fieldLabel: { color: dkd_colors.textSoft, fontSize: 12, fontWeight: '800' },
  input: { minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)', color: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 12, fontWeight: '700' },
  inputMultiline: { minHeight: 88, textAlignVertical: 'top' },
  compactInput: { minHeight: 46 },
  dualRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  inlineInputWrap: { minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(103,227,255,0.22)', backgroundColor: 'rgba(255,255,255,0.04)', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  inlineInput: { flex: 1, color: '#FFFFFF', fontWeight: '800', minHeight: 46 },
  scheduleCard: { borderRadius: 18, borderWidth: 1, borderColor: 'rgba(103,227,255,0.12)', backgroundColor: 'rgba(8,20,31,0.55)', padding: 12, gap: 10 },
  scheduleHead: { gap: 4 },
  scheduleTitle: { color: dkd_colors.text, fontSize: 14, fontWeight: '900' },
  scheduleHint: { color: dkd_colors.textSoft, fontSize: 11, lineHeight: 16 },
  metricGrid: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 10 },
  metricCard: { flexGrow: 1, minWidth: '47%', borderRadius: 22, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.05)' },
  metricIcon: { width: 36, height: 36, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  metricLabel: { color: dkd_colors.textMuted, fontSize: 12, fontWeight: '700', marginTop: 10 },
  metricValue: { color: dkd_colors.text, fontSize: 28, fontWeight: '900', marginTop: 6 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barLabel: { width: 72, color: dkd_colors.text, fontWeight: '900', fontSize: 13 },
  barTrack: { flex: 1, height: 14, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },
  barValue: { width: 28, textAlign: 'right', color: dkd_colors.text, fontWeight: '900' },
  emptyState: { borderRadius: 22, padding: 18, alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.05)' },
  emptyTitle: { color: dkd_colors.text, fontSize: 16, fontWeight: '900' },
  emptyText: { color: dkd_colors.textSoft, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  stepList: { gap: 10 },
  stepRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  stepIdx: { width: 24, height: 24, borderRadius: 999, textAlign: 'center', lineHeight: 24, overflow: 'hidden', backgroundColor: 'rgba(103,227,255,0.14)', color: dkd_colors.cyanSoft, fontWeight: '900' },
  stepText: { flex: 1, color: dkd_colors.text, fontSize: 13, lineHeight: 19 },
  helperText: { color: dkd_colors.textSoft, fontSize: 12, lineHeight: 18 },
  campaignCard: { borderRadius: 18, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)', gap: 8 },
  campaignTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  campaignTitle: { color: dkd_colors.text, fontSize: 14, fontWeight: '900' },
  campaignSub: { color: dkd_colors.textSoft, fontSize: 11, marginTop: 4 },
  statePill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
  stateOn: { borderColor: 'rgba(103,227,255,0.30)', backgroundColor: 'rgba(103,227,255,0.10)' },
  stateOff: { borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.06)' },
  stateText: { fontSize: 11, fontWeight: '900' },
  stateTextOn: { color: dkd_colors.cyanSoft },
  stateTextOff: { color: dkd_colors.textMuted },
  campaignStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  campaignStat: { color: dkd_colors.text, fontSize: 11, fontWeight: '800' },
  logRow: { flexDirection: 'row', gap: 10, alignItems: 'center', borderRadius: 18, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)' },
  logIcon: { width: 36, height: 36, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },
  logTitle: { color: dkd_colors.text, fontSize: 14, fontWeight: '900' },
  logSub: { color: dkd_colors.textSoft, fontSize: 11, marginTop: 3 },
  infoList: { gap: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  infoLabel: { color: dkd_colors.textMuted, fontSize: 12, fontWeight: '800' },
  infoValue: { color: dkd_colors.text, fontSize: 12, fontWeight: '800', flexShrink: 1, textAlign: 'right' },
  messageBox: { marginTop: 12, borderRadius: 16, padding: 12, backgroundColor: 'rgba(103,227,255,0.10)', borderWidth: 1, borderColor: 'rgba(103,227,255,0.16)' },
  messageText: { color: '#DFF8FF', fontWeight: '800' },

  previewCard: { borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.04)' },
  previewImage: { width: '100%', height: 180 },
  productPickerRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  productActions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },

  productCard: { borderRadius: 20, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', backgroundColor: 'rgba(255,255,255,0.04)', gap: 10 },
  productRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  productThumbWrap: { width: 86, height: 86, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.05)' },
  productThumb: { width: '100%', height: '100%' },
  productThumbFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  productHeadRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  productTitle: { color: dkd_colors.text, fontSize: 15, fontWeight: '900', flex: 1 },
  productMeta: { color: dkd_colors.textSoft, fontSize: 12, marginTop: 4 },
  productDesc: { color: dkd_colors.text, fontSize: 12, lineHeight: 18, marginTop: 8, opacity: 0.88 },
  productFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  productFooterHint: { color: dkd_colors.textSoft, fontSize: 11, flex: 1 },
});
