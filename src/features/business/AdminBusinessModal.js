import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import { cityLootTheme } from '../../theme/cityLootTheme';
import { useBusinessAdminData } from '../../hooks/useBusinessAdminData';
import {
  deleteMerchantBusinessProduct,
  fetchMerchantBusinessProducts,
  isLocalAssetUri,
  uploadBusinessProductArt,
  upsertMerchantBusinessProduct,
} from '../../services/businessProductService';

const dkd_colors = cityLootTheme.colors;


const EMPTY_PRODUCT_DRAFT = {
  id: '',
  title: '',
  description: '',
  imageUrl: '',
  category: 'genel',
  currencyCode: 'TRY',
  priceToken: '',
  priceCash: '',
  deliveryFeeTl: '0',
  stock: '0',
  sortOrder: '0',
  isActive: true,
};

function ProductStatePill({ active }) {
  return (
    <View style={[dkd_styles.productStatePill, active ? dkd_styles.productStatePillOn : dkd_styles.productStatePillOff]}>
      <Text style={[dkd_styles.productStateText, active ? dkd_styles.productStateTextOn : dkd_styles.productStateTextOff]}>{active ? 'Aktif' : 'Pasif'}</Text>
    </View>
  );
}

function AdminProductCard({ item, onEdit, onDelete }) {
  const active = item?.is_active !== false && Number(item?.stock || 0) > 0;
  return (
    <Pressable style={dkd_styles.productCard} onPress={() => onEdit?.(item)}>
      {String(item?.image_url || '').trim() ? (
        <Image source={{ uri: String(item.image_url).trim() }} style={dkd_styles.productImage} resizeMode="cover" />
      ) : (
        <View style={dkd_styles.productImageFallback}>
          <MaterialCommunityIcons name="image-outline" size={22} color="rgba(255,255,255,0.42)" />
        </View>
      )}
      <View style={dkd_styles.productBody}>
        <View style={dkd_styles.productHead}>
          <Text style={dkd_styles.productTitle} numberOfLines={1}>{item?.title || 'Ürün'}</Text>
          <ProductStatePill active={active} />
        </View>
        <Text style={dkd_styles.productMeta} numberOfLines={1}>{item?.category || 'genel'} • {Number(item?.price_token || 0)} token • ürün {item?.price_cash == null ? '-' : Number(item?.price_cash || 0)} TL • kurye {Number(item?.delivery_fee_tl || 0)} TL • stok {Number(item?.stock || 0)}</Text>
        {!!item?.description ? <Text style={dkd_styles.productDesc} numberOfLines={2}>{item.description}</Text> : null}
        <View style={dkd_styles.productActions}>
          <Text style={dkd_styles.productHint}>Düzenlemek için karta dokun.</Text>
          <Pressable onPress={() => onDelete?.(item)} style={dkd_styles.productDeleteBtn}>
            <MaterialCommunityIcons name="trash-can-outline" size={16} color="#FFD7D7" />
            <Text style={dkd_styles.productDeleteText}>Sil</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}


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

function Tab({ active, label, icon, onPress }) {
  return (
    <Pressable onPress={onPress} style={[dkd_styles.tab, active && dkd_styles.tabActive]}>
      <MaterialCommunityIcons name={icon} size={16} color={active ? dkd_colors.text : dkd_colors.textMuted} />
      <Text style={[dkd_styles.tabText, active && dkd_styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Section({ title, sub, children }) {
  return (
    <View style={dkd_styles.section}>
      <Text style={dkd_styles.sectionTitle}>{title}</Text>
      {!!sub ? <Text style={dkd_styles.sectionSub}>{sub}</Text> : null}
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
  keyboardType = 'default',
  containerStyle,
  inputStyle,
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

function Chip({ active, label, sub, onPress }) {
  return (
    <Pressable onPress={onPress} style={[dkd_styles.chip, active && dkd_styles.chipActive]}>
      <Text style={[dkd_styles.chipLabel, active && dkd_styles.chipLabelActive]} numberOfLines={1}>{label}</Text>
      {!!sub ? <Text style={dkd_styles.chipSub} numberOfLines={1}>{sub}</Text> : null}
    </Pressable>
  );
}

function Metric({ icon, label, value, tone = 'cyan' }) {
  const accent = tone === 'gold' ? dkd_colors.goldSoft : tone === 'green' ? dkd_colors.green : tone === 'purple' ? dkd_colors.purple : dkd_colors.cyanSoft;
  return (
    <View style={dkd_styles.metricCard}>
      <View style={[dkd_styles.metricIcon, { borderColor: `${accent}55` }]}>
        <MaterialCommunityIcons name={icon} size={16} color={accent} />
      </View>
      <Text style={dkd_styles.metricLabel}>{label}</Text>
      <Text style={[dkd_styles.metricValue, { color: accent }]}>{value}</Text>
    </View>
  );
}

function TinyBar({ label, value, max, tone = 'cyan' }) {
  const accent = tone === 'gold' ? dkd_colors.goldSoft : tone === 'green' ? dkd_colors.green : dkd_colors.cyanSoft;
  const pct = max > 0 ? Math.max(8, Math.round((value / max) * 100)) : 8;
  return (
    <View style={dkd_styles.barRow}>
      <Text style={dkd_styles.barLabel}>{label}</Text>
      <View style={dkd_styles.barTrack}><View style={[dkd_styles.barFill, { width: `${pct}%`, backgroundColor: accent }]} /></View>
      <Text style={dkd_styles.barValue}>{value}</Text>
    </View>
  );
}

function Empty({ icon, text }) {
  return (
    <View style={dkd_styles.empty}>
      <MaterialCommunityIcons name={icon} size={22} color={dkd_colors.cyanSoft} />
      <Text style={dkd_styles.emptyText}>{text}</Text>
    </View>
  );
}

export default function AdminBusinessModal({ visible, onClose }) {
  const [tab, setTab] = useState('setup');
  const {
    loading,
    saving,
    message,
    setMessage,
    businesses,
    selectedBusinessId,
    setSelectedBusinessId,
    startNewBusiness,
    isCreatingBusiness,
    selectedBusiness,
    adminDrops,
    dashboard,
    businessDraft,
    setBusinessDraft,
    saveBusiness,
    campaignDraft,
    setCampaignDraft,
    saveCampaign,
    deleteCampaign,
    chooseCampaignToEdit,
    couponRedeemDraft,
    setCouponRedeemDraft,
    redeemCoupon,
    attachDrop,
    removeLinkedDrop,
    refreshAll,
    accessDraft,
    setAccessDraft,
    createAccessCode,
    lastAccessCode,
  } = useBusinessAdminData(visible);

  const linkedDrops = Array.isArray(dashboard?.linkedDrops) ? dashboard.linkedDrops : [];
  const campaigns = Array.isArray(dashboard?.campaigns) ? dashboard.campaigns : [];
  const hourly = Array.isArray(dashboard?.hourly) ? dashboard.hourly.filter((dkd_numeric_value) => Number(dkd_numeric_value?.scan_count || 0) > 0) : [];
  const tasks = Array.isArray(dashboard?.tasks) ? dashboard.tasks.filter((dkd_numeric_value) => Number(dkd_numeric_value?.scan_count || 0) > 0) : [];
  const today = dashboard?.today || {};

  const availableDrops = useMemo(() => {
    const taken = new Set(linkedDrops.map((row) => String(row?.drop_id)));
    return (adminDrops || []).filter((row) => !taken.has(String(row?.id)));
  }, [adminDrops, linkedDrops]);

  const maxHourly = useMemo(() => hourly.reduce((dkd_max_value, dkd_numeric_value) => Math.max(dkd_max_value, Number(dkd_numeric_value?.scan_count || 0)), 0), [hourly]);
  const maxTask = useMemo(() => tasks.reduce((dkd_max_value, dkd_numeric_value) => Math.max(dkd_max_value, Number(dkd_numeric_value?.scan_count || 0)), 0), [tasks]);

  const [productLoading, setProductLoading] = useState(false);
  const [productDraft, setProductDraft] = useState(EMPTY_PRODUCT_DRAFT);
  const [businessProducts, setBusinessProducts] = useState([]);

  const loadProducts = useCallback(async (businessId = selectedBusinessId) => {
    if (!businessId) {
      setBusinessProducts([]);
      return [];
    }
    setProductLoading(true);
    try {
      const rows = await fetchMerchantBusinessProducts(businessId);
      setBusinessProducts(Array.isArray(rows) ? rows : []);
      return Array.isArray(rows) ? rows : [];
    } catch (error) {
      setMessage(error?.message || String(error));
      setBusinessProducts([]);
      return [];
    } finally {
      setProductLoading(false);
    }
  }, [selectedBusinessId]);

  useEffect(() => {
    if (!visible || !selectedBusinessId || isCreatingBusiness) {
      setBusinessProducts([]);
      return;
    }
    loadProducts(selectedBusinessId);
  }, [visible, selectedBusinessId, isCreatingBusiness, loadProducts]);

  const resetProductDraft = useCallback(() => {
    setProductDraft(EMPTY_PRODUCT_DRAFT);
  }, []);

  const chooseProductToEdit = useCallback((product) => {
    if (!product) return;
    setProductDraft({
      id: product.id || '',
      title: product.title || '',
      description: product.description || '',
      imageUrl: product.image_url || '',
      category: product.category || 'genel',
      currencyCode: product.currency_code || 'TRY',
      priceToken: String(product.price_token || 0),
      priceCash: product.price_cash == null ? '' : String(product.price_cash),
      deliveryFeeTl: String(product.delivery_fee_tl || 0),
      stock: String(product.stock || 0),
      sortOrder: String(product.sort_order || 0),
      isActive: product.is_active !== false,
    });
    setTab('market');
  }, []);

  const pickProductImage = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm?.granted) {
        Alert.alert('İşletme Admin', 'Görsel seçmek için galeri izni gerekiyor.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.88,
        base64: false,
      });
      if (result?.canceled) return;
      const asset = result?.assets?.[0];
      if (!asset?.uri) return;
      setProductDraft((dkd_previous_product_draft) => ({ ...dkd_previous_product_draft, imageUrl: asset.uri }));
    } catch (error) {
      Alert.alert('İşletme Admin', error?.message || String(error));
    }
  }, []);

  const saveProductNow = useCallback(async () => {
    if (!selectedBusinessId) {
      setMessage('Önce işletme seç.');
      return null;
    }
    const title = String(productDraft?.title || '').trim();
    if (!title) {
      setMessage('Ürün adı gerekli.');
      return null;
    }

    setMessage('');
    try {
      let imageUrl = String(productDraft?.imageUrl || '').trim();
      if (imageUrl && isLocalAssetUri(imageUrl)) {
        const uploaded = await uploadBusinessProductArt({
          imageUri: imageUrl,
          businessSlug: selectedBusiness?.slug || selectedBusiness?.name || 'business',
          productName: title,
        });
        imageUrl = uploaded?.data?.publicUrl || imageUrl;
      }

      await upsertMerchantBusinessProduct({
        id: productDraft?.id || null,
        businessId: selectedBusinessId,
        title,
        description: productDraft?.description || '',
        imageUrl,
        category: productDraft?.category || 'genel',
        currencyCode: productDraft?.currencyCode || 'TRY',
        priceToken: Number(productDraft?.priceToken || 0),
        priceCash: productDraft?.priceCash === '' ? null : Number(productDraft?.priceCash || 0),
        deliveryFeeTl: Number(productDraft?.deliveryFeeTl || 0),
        stock: Number(productDraft?.stock || 0),
        sortOrder: Number(productDraft?.sortOrder || 0),
        isActive: productDraft?.isActive !== false,
      });

      resetProductDraft();
      await loadProducts(selectedBusinessId);
      setMessage('İşletme market ürünü kaydedildi.');
      return true;
    } catch (error) {
      setMessage(error?.message || String(error));
      return null;
    }
  }, [selectedBusiness, selectedBusinessId, productDraft, loadProducts, resetProductDraft]);

  const deleteProductNow = useCallback((product) => {
    if (!product?.id) return;
    Alert.alert('Ürünü Sil', 'Bu ürün market listesinden kaldırılacak. Devam edilsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMerchantBusinessProduct(product.id);
            if (String(productDraft?.id || '') === String(product.id)) resetProductDraft();
            await loadProducts(selectedBusinessId);
            setMessage('Ürün silindi.');
          } catch (error) {
            setMessage(error?.message || String(error));
          }
        },
      },
    ]);
  }, [loadProducts, productDraft?.id, resetProductDraft, selectedBusinessId]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={dkd_styles.backdrop}>
        <LinearGradient colors={['#06101D', '#091525', '#03070D']} style={dkd_styles.shell}>
          <View style={dkd_styles.glowA} />
          <View style={dkd_styles.glowB} />

          <View style={dkd_styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={dkd_styles.kicker}>LOOTONIA BUSINESS ADMIN</Text>
              <Text style={dkd_styles.title}>İşletme Merkezi</Text>
            </View>
            <View style={dkd_styles.headerButtons}>
              <SecondaryButton label="Yenile" onPress={() => refreshAll(true)} size="compact" fullWidth={false} icon="refresh" />
              <SecondaryButton label="Kapat" onPress={onClose} size="compact" fullWidth={false} icon="close" />
            </View>
          </View>

          <View style={dkd_styles.businessRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {businesses.map((row) => (
                <Chip
                  key={row.id}
                  active={!isCreatingBusiness && String(row.id) === String(selectedBusinessId)}
                  label={row.name || 'İşletme'}
                  sub={`${row.city || '-'} • ${row.district || row.category || '-'}`}
                  onPress={() => {
                    setSelectedBusinessId(row.id);
                    setTab('setup');
                  }}
                />
              ))}
              <Chip
                active={isCreatingBusiness}
                label="Yeni işletme"
                sub="Boş kurulum kartı"
                onPress={() => {
                  startNewBusiness();
                  setTab('setup');
                }}
              />
            </ScrollView>
          </View>

          <View style={dkd_styles.tabsRow}>
            <Tab active={tab === 'setup'} icon="cog-outline" label="Kurulum" onPress={() => setTab('setup')} />
            <Tab active={tab === 'live'} icon="view-dashboard-outline" label="Canlı Durum" onPress={() => setTab('live')} />
            <Tab active={tab === 'campaign'} icon="bullhorn-outline" label="Kampanya" onPress={() => setTab('campaign')} />
            <Tab active={tab === 'market'} icon="storefront-outline" label="Market" onPress={() => setTab('market')} />
            <Tab active={tab === 'cashier'} icon="ticket-confirmation-outline" label="Kasa" onPress={() => setTab('cashier')} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={dkd_styles.scrollContent}>
            {tab === 'setup' ? (
              <>
                <Section title="1) İşletme kartı" sub="Yeni işletme için alanlar boş gelir. Mevcut işletmeyi seçersen bilgileri burada düzenlersin.">
                  <Field label="İşletme adı" value={businessDraft.name} onChangeText={(value) => setBusinessDraft((dkd_business_draft) => ({ ...dkd_business_draft, name: value }))} placeholder="Lootonia Cafe" />
                  <Field label="Slug" value={businessDraft.slug} onChangeText={(value) => setBusinessDraft((dkd_business_draft) => ({ ...dkd_business_draft, slug: value }))} placeholder="lootonia-cafe" autoCapitalize="none" />
                  <Field label="Kategori" value={businessDraft.category} onChangeText={(value) => setBusinessDraft((dkd_business_draft) => ({ ...dkd_business_draft, category: value }))} placeholder="cafe" autoCapitalize="none" />
                  <View style={dkd_styles.dualRow}>
                    <Field label="Şehir" value={businessDraft.city} onChangeText={(value) => setBusinessDraft((dkd_business_draft) => ({ ...dkd_business_draft, city: value }))} placeholder="Ankara" containerStyle={dkd_styles.fieldHalf} />
                    <Field label="İlçe" value={businessDraft.district} onChangeText={(value) => setBusinessDraft((dkd_business_draft) => ({ ...dkd_business_draft, district: value }))} placeholder="Eryaman" containerStyle={dkd_styles.fieldHalf} />
                  </View>
                  <Field label="Adres" value={businessDraft.addressText} onChangeText={(value) => setBusinessDraft((dkd_business_draft) => ({ ...dkd_business_draft, addressText: value }))} placeholder="Adres" multiline />
                  <View style={dkd_styles.dualRow}>
                    <Field label="Lat" value={businessDraft.lat} onChangeText={(value) => setBusinessDraft((dkd_business_draft) => ({ ...dkd_business_draft, lat: value }))} placeholder="39.99" containerStyle={dkd_styles.fieldHalf} keyboardType="decimal-pad" autoCapitalize="none" />
                    <Field label="Lng" value={businessDraft.lng} onChangeText={(value) => setBusinessDraft((dkd_business_draft) => ({ ...dkd_business_draft, lng: value }))} placeholder="32.60" containerStyle={dkd_styles.fieldHalf} keyboardType="decimal-pad" autoCapitalize="none" />
                  </View>
                  <Field label="Teslim alma yarıçapı (m)" value={businessDraft.radiusM} onChangeText={(dkd_radius_meter_value) => setBusinessDraft((dkd_business_draft) => ({ ...dkd_business_draft, radiusM: dkd_radius_meter_value }))} placeholder="80" keyboardType="numeric" autoCapitalize="none" />
                  <Field label="Sponsor adı" value={businessDraft.sponsorName} onChangeText={(value) => setBusinessDraft((dkd_business_draft) => ({ ...dkd_business_draft, sponsorName: value }))} placeholder="Sponsor" />
                  <View style={dkd_styles.scheduleCard}>
                    <View style={dkd_styles.scheduleHead}>
                      <Text style={dkd_styles.scheduleTitle}>Çalışma saatleri</Text>
                      <Text style={dkd_styles.scheduleHint}>Oyuncunun işletmenin açık olduğu saati net görmesi için</Text>
                    </View>
                    <View style={dkd_styles.dualRow}>
                      <TimeField label="Açılış saati" value={businessDraft.opensAt} onChangeText={(value) => setBusinessDraft((dkd_business_draft) => ({ ...dkd_business_draft, opensAt: value }))} />
                      <TimeField label="Kapanış saati" value={businessDraft.closesAt} onChangeText={(value) => setBusinessDraft((dkd_business_draft) => ({ ...dkd_business_draft, closesAt: value }))} placeholder="23:00" />
                    </View>
                  </View>
                  <Field label="Günlük hedef QR" value={businessDraft.dailyScanGoal} onChangeText={(value) => setBusinessDraft((dkd_business_draft) => ({ ...dkd_business_draft, dailyScanGoal: value }))} placeholder="40" keyboardType="numeric" />
                  <PrimaryButton label={saving ? 'Kaydediliyor…' : 'İşletmeyi Kaydet'} onPress={saveBusiness} disabled={saving} />
                </Section>

                <Section title="2) Bağlı drop noktaları" sub="İşletmeye bağlı noktaları istersen buradan kaldırabilirsin.">
                  {linkedDrops.length ? linkedDrops.map((row) => (
                    <View key={row.id} style={dkd_styles.listRow}>
                      <View style={dkd_styles.listRowIcon}><MaterialCommunityIcons name="map-marker-check-outline" size={16} color={dkd_colors.green} /></View>
                      <View style={{ flex: 1 }}>
                        <Text style={dkd_styles.listRowTitle}>{row.drop_name}</Text>
                        <Text style={dkd_styles.listRowSub}>{row.drop_type} • ağırlık {row.traffic_weight}</Text>
                      </View>
                      <Pressable style={dkd_styles.rowActionBtn} onPress={() => removeLinkedDrop(row.drop_id)}>
                        <Text style={dkd_styles.rowActionBtnText}>Kaldır</Text>
                      </Pressable>
                    </View>
                  )) : <Empty icon="map-marker-off-outline" text="Henüz bağlı drop yok." />}
                </Section>

                <Section title="3) Yeni drop bağla" sub="Oyuncu hangi fiziksel noktadan geliyorsa o drop burada işletmeye bağlanır.">
                  {availableDrops.length ? availableDrops.map((drop) => (
                    <Pressable key={drop.id} style={dkd_styles.listRow} onPress={() => attachDrop(drop.id)}>
                      <View style={dkd_styles.listRowIcon}><MaterialCommunityIcons name="map-marker-radius-outline" size={16} color={dkd_colors.cyanSoft} /></View>
                      <View style={{ flex: 1 }}>
                        <Text style={dkd_styles.listRowTitle}>{drop.name || 'Drop'}</Text>
                        <Text style={dkd_styles.listRowSub}>{drop.type || 'map'}</Text>
                      </View>
                      <Text style={dkd_styles.listRowAction}>Bağla</Text>
                    </Pressable>
                  )) : <Empty icon="map-search-outline" text="Bağlanacak uygun drop bulunamadı." />}
                </Section>

                <Section title="4) İşletme sahibini bağla" sub="Admin bu kodu işletme sahibine veya kasa görevlisine verir.">
                  <View style={dkd_styles.roleRow}>
                    {['owner', 'manager', 'cashier'].map((role) => (
                      <Chip
                        key={role}
                        active={accessDraft.roleKey === role}
                        label={role === 'owner' ? 'Sahip' : role === 'cashier' ? 'Kasa' : 'Yönetici'}
                        sub={role === 'cashier' ? 'Sadece kasa ve panel' : 'Tam işletme görünümü'}
                        onPress={() => setAccessDraft((dkd_access_draft) => ({ ...dkd_access_draft, roleKey: role }))}
                      />
                    ))}
                  </View>
                  <Field label="Kod etiketi" value={accessDraft.label} onChangeText={(value) => setAccessDraft((dkd_access_draft) => ({ ...dkd_access_draft, label: value }))} placeholder="Örn: Kavaklıdere müdür telefonu" />
                  <PrimaryButton label={saving ? 'Kod üretiliyor…' : 'Bağlantı Kodu Üret'} onPress={createAccessCode} disabled={saving || !selectedBusinessId} />
                  {!!lastAccessCode ? (
                    <View style={dkd_styles.codeBox}>
                      <Text style={dkd_styles.codeLabel}>Üretilen kod</Text>
                      <Text style={dkd_styles.codeValue}>{lastAccessCode}</Text>
                      <Text style={dkd_styles.codeHint}>Bu kodu işletme sahibine ver. Profil → İşletme Panelim bölümünden kodu girerek bağlanır.</Text>
                    </View>
                  ) : null}
                </Section>
              </>
            ) : null}

            {tab === 'live' ? (
              <>
                <View style={dkd_styles.metricGrid}>
                  <Metric icon="account-group-outline" label="Bugün Oyuncu" value={String(today.uniquePlayers || 0)} tone="cyan" />
                  <Metric icon="qrcode-scan" label="QR Okutma" value={String(today.scanCount || 0)} tone="green" />
                  <Metric icon="ticket-confirmation-outline" label="Kupon" value={String(today.couponCount || 0)} tone="gold" />
                  <Metric icon="chart-line" label="Dönüşüm" value={`%${Number(today.conversionRate || 0)}`} tone="purple" />
                </View>
                <Section title="Saatlik yoğunluk" sub="Canlı trafik akışı burada görünür.">
                  {hourly.length ? hourly.map((row) => <TinyBar key={row.label} label={row.label} value={Number(row.scan_count || 0)} max={maxHourly} tone="green" />) : <Empty icon="clock-outline" text="Henüz saatlik trafik verisi yok." />}
                </Section>
                <Section title="Trafik getiren görevler" sub="Hangi görev gerçekten oyuncu getirmiş?">
                  {tasks.length ? tasks.map((row) => <TinyBar key={row.task_key} label={row.task_key} value={Number(row.scan_count || 0)} max={maxTask} tone="gold" />) : <Empty icon="map-marker-star-outline" text="Görev katkı verisi yok." />}
                </Section>
                <Section title="Bağlı drop noktaları" sub="Gerekirse canlı durumdan da bağlantıyı kaldırabilirsin.">
                  {linkedDrops.length ? linkedDrops.map((row) => (
                    <View key={row.id} style={dkd_styles.listRow}>
                      <View style={dkd_styles.listRowIcon}><MaterialCommunityIcons name="map-marker-check-outline" size={16} color={dkd_colors.green} /></View>
                      <View style={{ flex: 1 }}>
                        <Text style={dkd_styles.listRowTitle}>{row.drop_name}</Text>
                        <Text style={dkd_styles.listRowSub}>{row.drop_type} • ağırlık {row.traffic_weight}</Text>
                      </View>
                      <Pressable style={dkd_styles.rowActionBtn} onPress={() => removeLinkedDrop(row.drop_id)}>
                        <Text style={dkd_styles.rowActionBtnText}>Kaldır</Text>
                      </Pressable>
                    </View>
                  )) : <Empty icon="map-marker-off-outline" text="Henüz bağlı drop yok." />}
                </Section>
              </>
            ) : null}

            {tab === 'campaign' ? (
              <>
                <Section title="Kampanya oluştur / düzenle" sub="Tarih ve saat alanları daha kolay okunacak şekilde ayrıldı.">
                  <Field label="Kampanya adı" value={campaignDraft.title} onChangeText={(value) => setCampaignDraft((dkd_campaign_draft) => ({ ...dkd_campaign_draft, title: value }))} placeholder="Akşam fırsatı" />
                  <Field label="Sponsor" value={campaignDraft.sponsorName} onChangeText={(value) => setCampaignDraft((dkd_campaign_draft) => ({ ...dkd_campaign_draft, sponsorName: value }))} placeholder="Sponsor" />
                  <Field label="Ödül etiketi" value={campaignDraft.rewardLabel} onChangeText={(value) => setCampaignDraft((dkd_campaign_draft) => ({ ...dkd_campaign_draft, rewardLabel: value }))} placeholder="Ücretsiz kahve" />
                  <View style={dkd_styles.dualRow}>
                    <Field label="Kupon ön eki" value={campaignDraft.couponPrefix} onChangeText={(value) => setCampaignDraft((dkd_campaign_draft) => ({ ...dkd_campaign_draft, couponPrefix: value }))} placeholder="DKD" containerStyle={dkd_styles.fieldHalf} autoCapitalize="characters" />
                    <Field label="Stok limiti" value={campaignDraft.stockLimit} onChangeText={(value) => setCampaignDraft((dkd_campaign_draft) => ({ ...dkd_campaign_draft, stockLimit: value }))} placeholder="50" keyboardType="numeric" containerStyle={dkd_styles.fieldHalf} />
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
                  <PrimaryButton label={saving ? 'Kampanya kaydediliyor…' : (campaignDraft.id ? 'Kampanyayı Güncelle' : 'Kampanyayı Kaydet')} onPress={saveCampaign} disabled={saving || !selectedBusinessId} />
                  {campaignDraft?.id ? <SecondaryButton label="Kampanyayı Sil" onPress={() => Alert.alert('Kampanyayı Sil', 'Bu kampanya silinsin mi?', [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Sil', style: 'destructive', onPress: () => deleteCampaign(campaignDraft.id) }])} size="compact" fullWidth={false} icon="trash-can-outline" /> : null}
                </Section>
                <Section title="Mevcut kampanyalar" sub="Kartın üstüne dokunursan düzenleme formuna yüklenir.">
                  {campaigns.length ? campaigns.map((row) => (
                    <Pressable key={row.id} style={dkd_styles.listRow} onPress={() => chooseCampaignToEdit(row)}>
                      <View style={dkd_styles.listRowIcon}><MaterialCommunityIcons name="bullhorn-outline" size={16} color={dkd_colors.goldSoft} /></View>
                      <View style={{ flex: 1 }}>
                        <Text style={dkd_styles.listRowTitle}>{row.title}</Text>
                        <Text style={dkd_styles.listRowSub}>stok {Number(row.stock_limit || 0)} • kalan {Number(row.stock_left || 0)} • kullanılan {Number(row.redeemed_count || 0)}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 8 }}>
                        <Text style={dkd_styles.listRowAction}>{row.is_active ? 'Düzenle' : 'Pasif'}</Text>
                        <SecondaryButton label="Sil" onPress={() => Alert.alert('Kampanyayı Sil', 'Bu kampanya silinsin mi?', [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Sil', style: 'destructive', onPress: () => deleteCampaign(row.id) }])} size="compact" fullWidth={false} icon="trash-can-outline" />
                      </View>
                    </Pressable>
                  )) : <Empty icon="bullhorn-outline" text="Henüz kampanya yok." />}
                </Section>
              </>
            ) : null}


            {tab === 'market' ? (
              <>
                <Section title="İşletme market ayarları" sub="İşletme panelindeki ürün ayarlarını buradan da yönet. Ürünler ana markette işletme adına göre gruplanır ve token ile satılır.">
                  <Field label="Ürün adı" value={productDraft.title} onChangeText={(value) => setProductDraft((dkd_product_draft) => ({ ...dkd_product_draft, title: value }))} placeholder="Örn: Tavuk burger menü" />
                  <Field label="Açıklama" value={productDraft.description} onChangeText={(value) => setProductDraft((dkd_product_draft) => ({ ...dkd_product_draft, description: value }))} placeholder="Kısa vitrin açıklaması" multiline />
                  <View style={dkd_styles.dualRow}>
                    <Field label="Kategori" value={productDraft.category} onChangeText={(value) => setProductDraft((dkd_product_draft) => ({ ...dkd_product_draft, category: value }))} placeholder="burger" containerStyle={dkd_styles.fieldHalf} autoCapitalize="none" />
                    <Field label="Para birimi" value={productDraft.currencyCode} onChangeText={(value) => setProductDraft((dkd_product_draft) => ({ ...dkd_product_draft, currencyCode: value }))} placeholder="TRY" containerStyle={dkd_styles.fieldHalf} autoCapitalize="characters" />
                  </View>
                  <View style={dkd_styles.dualRow}>
                    <Field label="Token fiyatı" value={productDraft.priceToken} onChangeText={(value) => setProductDraft((dkd_product_draft) => ({ ...dkd_product_draft, priceToken: value }))} placeholder="120" containerStyle={dkd_styles.fieldHalf} keyboardType="numeric" />
                    <Field label="Ürün fiyatı (TL)" value={productDraft.priceCash} onChangeText={(value) => setProductDraft((dkd_product_draft) => ({ ...dkd_product_draft, priceCash: value }))} placeholder="249.90" containerStyle={dkd_styles.fieldHalf} keyboardType="decimal-pad" />
                  </View>
                  <View style={dkd_styles.dualRow}>
                    <Field label="Stok" value={productDraft.stock} onChangeText={(value) => setProductDraft((dkd_product_draft) => ({ ...dkd_product_draft, stock: value }))} placeholder="50" containerStyle={dkd_styles.fieldHalf} keyboardType="numeric" />
                    <Field label="Sıra" value={productDraft.sortOrder} onChangeText={(value) => setProductDraft((dkd_product_draft) => ({ ...dkd_product_draft, sortOrder: value }))} placeholder="10" containerStyle={dkd_styles.fieldHalf} keyboardType="numeric" />
                  </View>
                  <View style={dkd_styles.dualRow}>
                    <Field label="Kurye ücreti (TL)" value={productDraft.deliveryFeeTl} onChangeText={(value) => setProductDraft((dkd_product_draft) => ({ ...dkd_product_draft, deliveryFeeTl: value }))} placeholder="40" containerStyle={dkd_styles.fieldHalf} keyboardType="decimal-pad" />
                  </View>

                  <View style={dkd_styles.imageActionRow}>
                    <Pressable onPress={pickProductImage} style={dkd_styles.imagePickBtn}>
                      <MaterialCommunityIcons name="image-plus-outline" size={18} color={dkd_colors.cyanSoft} />
                      <Text style={dkd_styles.imagePickText}>Cihazdan görsel seç</Text>
                    </Pressable>
                    <Pressable onPress={resetProductDraft} style={dkd_styles.imageResetBtn}>
                      <MaterialCommunityIcons name="refresh" size={16} color={dkd_colors.textSoft} />
                      <Text style={dkd_styles.imageResetText}>Formu temizle</Text>
                    </Pressable>
                  </View>

                  <View style={dkd_styles.previewCard}>
                    {!!String(productDraft.imageUrl || '').trim() ? (
                      <Image source={{ uri: String(productDraft.imageUrl || '').trim() }} style={dkd_styles.previewImage} resizeMode="cover" />
                    ) : (
                      <View style={dkd_styles.previewFallback}>
                        <MaterialCommunityIcons name="image-outline" size={26} color="rgba(255,255,255,0.40)" />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={dkd_styles.previewTitle}>{productDraft.title || 'Önizleme kartı'}</Text>
                      <Text style={dkd_styles.previewSub}>{productDraft.category || 'genel'} • {Number(productDraft.priceToken || 0)} token • ürün {productDraft.priceCash === '' ? '-' : Number(productDraft.priceCash || 0)} TL • kurye {Number(productDraft.deliveryFeeTl || 0)} TL</Text>
                      <Text style={dkd_styles.previewHint} numberOfLines={2}>{productDraft.description || 'Seçtiğin görsel ve metin burada hızlı önizleme olarak görünür.'}</Text>
                    </View>
                  </View>

                  <PrimaryButton label={saving || productLoading ? 'Kaydediliyor…' : (productDraft.id ? 'Ürünü Güncelle' : 'Ürünü Kaydet')} onPress={saveProductNow} disabled={saving || productLoading || !selectedBusinessId || !String(productDraft.title || '').trim()} />
                </Section>

                <Section title="Aktif market ürünleri" sub="Seçili işletmenin ürünleri burada. Düzenlemek için karta dokun, silmek için sağdaki butonu kullan.">
                  {productLoading ? (
                    <Empty icon="storefront-outline" text="İşletme ürünleri yükleniyor…" />
                  ) : businessProducts.length ? (
                    businessProducts.map((item) => (
                      <AdminProductCard key={String(item?.id)} item={item} onEdit={chooseProductToEdit} onDelete={deleteProductNow} />
                    ))
                  ) : (
                    <Empty icon="storefront-outline" text="Bu işletme için henüz market ürünü yok." />
                  )}
                </Section>
              </>
            ) : null}

            {tab === 'cashier' ? (
              <Section title="Kasada kupon doğrula" sub="Oyuncu kupon kodunu söyler, burada doğrulanır.">
                <Field label="Kupon kodu" value={couponRedeemDraft.couponCode} onChangeText={(value) => setCouponRedeemDraft((dkd_coupon_redeem_draft) => ({ ...dkd_coupon_redeem_draft, couponCode: value }))} placeholder="DKD-AB12CD34" autoCapitalize="characters" />
                <Field label="Not" value={couponRedeemDraft.note} onChangeText={(value) => setCouponRedeemDraft((dkd_coupon_redeem_draft) => ({ ...dkd_coupon_redeem_draft, note: value }))} placeholder="Teslim edildi" multiline />
                <PrimaryButton label={saving ? 'Doğrulanıyor…' : 'Kuponu Doğrula'} onPress={redeemCoupon} disabled={saving || !selectedBusinessId || !couponRedeemDraft.couponCode.trim()} />
              </Section>
            ) : null}

            {!!message ? <View style={dkd_styles.messageBox}><Text style={dkd_styles.messageText}>{message}</Text></View> : null}
            {loading ? <View style={dkd_styles.messageBox}><Text style={dkd_styles.messageText}>Yükleniyor…</Text></View> : null}
          </ScrollView>
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
  chip: { minWidth: 170, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  chipActive: { borderColor: 'rgba(103,227,255,0.60)', backgroundColor: 'rgba(103,227,255,0.14)' },
  chipLabel: { color: dkd_colors.text, fontSize: 15, fontWeight: '900' },
  chipLabelActive: { color: '#FFFFFF' },
  chipSub: { color: dkd_colors.textSoft, fontSize: 11, marginTop: 4 },
  tabsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.05)' },
  tabActive: { borderColor: 'rgba(103,227,255,0.60)', backgroundColor: 'rgba(103,227,255,0.14)' },
  tabText: { color: dkd_colors.textMuted, fontSize: 13, fontWeight: '800' },
  tabTextActive: { color: '#FFFFFF' },
  scrollContent: { paddingTop: 14, paddingBottom: 10 },
  section: { marginTop: 12 },
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
  listRow: { flexDirection: 'row', gap: 10, alignItems: 'center', borderRadius: 18, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)' },
  listRowIcon: { width: 36, height: 36, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },
  listRowTitle: { color: dkd_colors.text, fontSize: 14, fontWeight: '900' },
  listRowSub: { color: dkd_colors.textSoft, fontSize: 11, marginTop: 3 },
  listRowAction: { color: dkd_colors.cyanSoft, fontSize: 12, fontWeight: '900' },
  rowActionBtn: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,139,139,0.28)', backgroundColor: 'rgba(255,139,139,0.10)' },
  rowActionBtnText: { color: '#FFD7D7', fontSize: 12, fontWeight: '900' },

  imageActionRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  imagePickBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(103,227,255,0.24)', backgroundColor: 'rgba(103,227,255,0.10)', paddingHorizontal: 14, paddingVertical: 12 },
  imagePickText: { color: dkd_colors.text, fontSize: 12, fontWeight: '900' },
  imageResetBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.04)', paddingHorizontal: 14, paddingVertical: 12 },
  imageResetText: { color: dkd_colors.textSoft, fontSize: 12, fontWeight: '800' },
  previewCard: { borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(8,20,31,0.55)', padding: 12, gap: 12, flexDirection: 'row', alignItems: 'center' },
  previewImage: { width: 84, height: 84, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)' },
  previewFallback: { width: 84, height: 84, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  previewTitle: { color: dkd_colors.text, fontSize: 15, fontWeight: '900' },
  previewSub: { color: dkd_colors.cyanSoft, fontSize: 12, fontWeight: '800', marginTop: 4 },
  previewHint: { color: dkd_colors.textSoft, fontSize: 12, lineHeight: 18, marginTop: 6 },
  productCard: { flexDirection: 'row', gap: 12, alignItems: 'center', borderRadius: 20, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)' },
  productImage: { width: 78, height: 78, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.04)' },
  productImageFallback: { width: 78, height: 78, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  productBody: { flex: 1, minWidth: 0 },
  productHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  productTitle: { color: dkd_colors.text, fontSize: 15, fontWeight: '900', flex: 1 },
  productMeta: { color: dkd_colors.cyanSoft, fontSize: 11, fontWeight: '800', marginTop: 4 },
  productDesc: { color: dkd_colors.textSoft, fontSize: 12, lineHeight: 18, marginTop: 6 },
  productActions: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  productHint: { color: dkd_colors.textMuted, fontSize: 11, fontWeight: '700', flex: 1 },
  productDeleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,139,139,0.28)', backgroundColor: 'rgba(255,139,139,0.10)' },
  productDeleteText: { color: '#FFD7D7', fontSize: 12, fontWeight: '900' },
  productStatePill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  productStatePillOn: { borderColor: 'rgba(96,226,170,0.28)', backgroundColor: 'rgba(96,226,170,0.12)' },
  productStatePillOff: { borderColor: 'rgba(255,184,130,0.24)', backgroundColor: 'rgba(255,184,130,0.10)' },
  productStateText: { fontSize: 10, fontWeight: '900' },
  productStateTextOn: { color: '#BFF5DA' },
  productStateTextOff: { color: '#FFD8B2' },
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
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 8 },
  emptyText: { color: dkd_colors.textSoft, textAlign: 'center', lineHeight: 18 },
  roleRow: { gap: 8 },
  codeBox: { borderRadius: 18, borderWidth: 1, borderColor: 'rgba(88,226,171,0.35)', backgroundColor: 'rgba(88,226,171,0.10)', padding: 12, gap: 6 },
  codeLabel: { color: dkd_colors.textSoft, fontSize: 11, fontWeight: '800' },
  codeValue: { color: dkd_colors.green, fontSize: 24, fontWeight: '900' },
  codeHint: { color: dkd_colors.text, fontSize: 12, lineHeight: 18 },
  messageBox: { marginTop: 12, borderRadius: 16, padding: 12, backgroundColor: 'rgba(103,227,255,0.10)', borderWidth: 1, borderColor: 'rgba(103,227,255,0.16)' },
  messageText: { color: '#DFF8FF', fontWeight: '800' },
});
