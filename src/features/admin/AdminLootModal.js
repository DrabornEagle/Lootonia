import React, { memo, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import SafeScreen from '../../components/layout/SafeScreen';
import { cityLootTheme } from '../../theme/cityLootTheme';
import FuturisticCardTile from '../collection/FuturisticCardTile';
import { formatInt, trRarity, trSeries, trTheme } from '../../utils/text';

const SERIES_PRESETS = ['GENERAL', 'SKYLINE', 'NEON', 'ORBIT', 'APEX', 'BOSS'];
const THEME_PRESETS = [
  'City Core',
  'Neon Harbor',
  'Retail Megaplex',
  'Aurora Boulevard',
  'Quantum Plaza',
  'Obsidian Core',
  'Zenith Garden',
  'Orbit Foundry',
];
const RARITY_OPTIONS = ['common', 'rare', 'epic', 'legendary', 'mythic'];

const DEFAULT_FORM = {
  id: null,
  name: '',
  series: 'GENERAL',
  rarity: 'common',
  theme: 'City Core',
  is_active: true,
  art_image_url: '',
  serial_code: '',
};

function normalizeCardId(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function sameCardId(dkd_left_value, dkd_right_value) {
  const left = normalizeCardId(dkd_left_value);
  const right = normalizeCardId(dkd_right_value);
  return !!left && !!right && left === right;
}

function Chip({ active, label, onPress, tone = 'default', compact = false }) {
  const activeStyle = tone === 'gold'
    ? styles.chipActiveGold
    : tone === 'purple'
      ? styles.chipActivePurple
      : styles.chipActive;

  return (
    <Pressable onPress={onPress} style={[styles.chip, compact && styles.chipCompact, active && activeStyle]}>
      <Text style={[styles.chipText, compact && styles.chipTextCompact, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function GlassPanel({ children, style }) {
  return (
    <View style={[styles.panel, style]}>
      <LinearGradient colors={['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.03)']} style={StyleSheet.absoluteFillObject} />
      {children}
    </View>
  );
}

function MetricCard({ icon, label, value, tone = 'cyan' }) {
  const accent = tone === 'gold'
    ? cityLootTheme.colors.goldSoft
    : tone === 'purple'
      ? cityLootTheme.colors.purple
      : cityLootTheme.colors.cyanSoft;

  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIconWrap, tone === 'gold' ? styles.metricGold : tone === 'purple' ? styles.metricPurple : null]}>
        <MaterialCommunityIcons name={icon} size={18} color={accent} />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function ArchiveRow({ item, onEdit, onToggleActive, onDeleteCard }) {
  const active = item?.is_active !== false;
  return (
    <View style={styles.archiveRow}>
      <View style={styles.archiveThumbWrap}>
        {item?.art_image_url ? (
          <Image source={{ uri: item.art_image_url }} style={styles.archiveThumb} contentFit="cover" />
        ) : (
          <View style={[styles.archiveThumb, styles.archiveThumbFallback]}>
            <MaterialCommunityIcons name="image-outline" size={22} color={cityLootTheme.colors.textMuted} />
          </View>
        )}
      </View>

      <View style={styles.archiveCopy}>
        <Text style={styles.archiveTitle} numberOfLines={1}>{item?.name || 'Kart'}</Text>
        <Text style={styles.archiveSub} numberOfLines={2}>{trSeries(item?.series)} • {trRarity(item?.rarity)} • {trTheme(item?.theme)}</Text>
        <View style={styles.archiveBadges}>
          {!!item?.serial_code && (
            <View style={styles.codePill}>
              <Text style={styles.codePillText}>{item?.serial_code}</Text>
            </View>
          )}
          <View style={[styles.statusPill, active ? styles.statusPillActive : styles.statusPillPassive]}>
            <Text style={styles.statusPillText}>{active ? 'Aktif' : 'Pasif'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.archiveActions}>
        <SecondaryButton label="Düzenle" icon="pencil-outline" onPress={() => onEdit?.(item)} size="compact" fullWidth={false} style={{ marginBottom: 8 }} />
        <SecondaryButton
          label={active ? 'Pasife Al' : 'Aktif Et'}
          icon={active ? 'eye-off-outline' : 'eye-outline'}
          onPress={() => onToggleActive?.(item)}
          size="compact"
          fullWidth={false}
          tone={active ? 'ghost' : 'blue'}
          style={{ marginBottom: 8 }}
        />
        <SecondaryButton
          label="Sil"
          icon="trash-can-outline"
          onPress={() => onDeleteCard?.(item)}
          size="compact"
          fullWidth={false}
          tone="ghost"
        />
      </View>
    </View>
  );
}

export default memo(function AdminLootModal({ visible, onClose, loading, cardDefs, cardSearch, setCardSearch, onAdd, onDelete }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [busy, setBusy] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [rarityFilter, setRarityFilter] = useState('all');

  useEffect(() => {
    if (!visible) return;
    setForm(DEFAULT_FORM);
    setStatusFilter('all');
    setRarityFilter('all');
  }, [visible]);

  const filteredCards = useMemo(() => {
    const search = String(cardSearch || '').trim().toLowerCase();
    return (Array.isArray(cardDefs) ? cardDefs : []).filter((card) => {
      const active = card?.is_active !== false;
      if (statusFilter === 'active' && !active) return false;
      if (statusFilter === 'passive' && active) return false;
      if (rarityFilter !== 'all' && String(card?.rarity || '').toLowerCase() !== rarityFilter) return false;
      if (!search) return true;
      return String(card?.name || '').toLowerCase().includes(search)
        || String(card?.series || '').toLowerCase().includes(search)
        || String(card?.theme || '').toLowerCase().includes(search)
        || String(card?.rarity || '').toLowerCase().includes(search)
        || String(card?.serial_code || '').toLowerCase().includes(search);
    }).slice(0, 120);
  }, [cardDefs, cardSearch, rarityFilter, statusFilter]);

  const metrics = useMemo(() => {
    const rows = Array.isArray(cardDefs) ? cardDefs : [];
    return {
      total: rows.length,
      active: rows.filter((item) => item?.is_active !== false).length,
      withImage: rows.filter((item) => String(item?.art_image_url || '').trim()).length,
    };
  }, [cardDefs]);

  function patchForm(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function fillForm(item) {
    setForm({
      id: item?.id || null,
      name: String(item?.name || ''),
      series: String(item?.series || 'GENERAL'),
      rarity: String(item?.rarity || 'common').toLowerCase(),
      theme: String(item?.theme || 'City Core'),
      is_active: item?.is_active !== false,
      art_image_url: String(item?.art_image_url || ''),
      serial_code: String(item?.serial_code || ''),
    });
  }

  function resetForm() {
    setForm(DEFAULT_FORM);
  }

  async function pickImage(mode = 'card') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      ...(mode === 'card' ? { aspect: [3, 4] } : {}),
      quality: 0.92,
      selectionLimit: 1,
    });

    if (result.canceled) return;
    const asset = Array.isArray(result.assets) ? result.assets[0] : null;
    if (!asset?.uri) return;
    patchForm('art_image_url', asset.uri);
  }

  async function submitForm() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await onAdd?.(form);
      if (result?.ok) {
        setForm(DEFAULT_FORM);
      }
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(item) {
    if (busy) return;
    setBusy(true);
    try {
      await onDelete?.({
        ...item,
        is_active: item?.is_active === false,
      });
      if (sameCardId(form?.id, item?.id)) {
        setForm((prev) => ({ ...prev, is_active: item?.is_active === false }));
      }
    } finally {
      setBusy(false);
    }
  }

  function requestDeleteCard(item = form) {
    const cardName = String(item?.name || 'Kart');
    if (!item?.id) return;

    Alert.alert(
      'Kartı Sil',
      `${cardName} kartı silinecek.

Bu işlem kartı sistemden tamamen siler. Loot havuzu, oyuncu envanterleri ve market kayıtları da temizlenir.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            if (busy) return;
            setBusy(true);
            try {
              const result = await onDelete?.({ ...item, action: 'delete_card' });
              if (result?.ok) {
                setForm(DEFAULT_FORM);
              }
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  }

  const formTitle = form?.id ? 'Kartı Düzenle' : 'Yeni Kart Oluştur';
  const previewImage = String(form?.art_image_url || '').trim();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeScreen style={{ flex: 1, backgroundColor: cityLootTheme.colors.bgTop }}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={[cityLootTheme.colors.bgTop, cityLootTheme.colors.bgMid, cityLootTheme.colors.bgBottom]} style={styles.screen}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <GlassPanel style={styles.heroPanel}>
              <View style={styles.heroRow}>
                <View style={styles.heroIconWrap}>
                  <MaterialCommunityIcons name="cards-outline" size={28} color={cityLootTheme.colors.goldSoft} />
                </View>
                <View style={styles.heroCopy}>
                  <Text style={styles.kicker}>ADMIN CARD FORGE</Text>
                  <Text style={styles.title}>Kart Komuta Merkezi</Text>
                  
                </View>
                <SecondaryButton label="Kapat" onPress={onClose} size="compact" fullWidth={false} style={styles.headerButton} />
              </View>

              <View style={styles.metricRow}>
                <MetricCard icon="cards-outline" label="Toplam Kart" value={formatInt(metrics.total)} />
                <MetricCard icon="eye-outline" label="Aktif Kart" value={formatInt(metrics.active)} tone="gold" />
                <MetricCard icon="image-multiple-outline" label="Görselli Kart" value={formatInt(metrics.withImage)} tone="purple" />
              </View>
            </GlassPanel>

            <GlassPanel>
              <View style={styles.sectionHeadRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>{formTitle}</Text>
                  
                </View>
                <SecondaryButton label="Formu Temizle" icon="restart" onPress={resetForm} size="compact" fullWidth={false} />
              </View>

              <Text style={styles.label}>Kart Adı</Text>
              <TextInput
                value={form.name}
                onChangeText={(value) => patchForm('name', value)}
                placeholder="Örn: Demir Elçilik"
                placeholderTextColor="rgba(232,244,255,0.35)"
                style={styles.input}
              />

              <Text style={styles.label}>Kart Seri Kodu</Text>
              <TextInput
                value={form.serial_code}
                onChangeText={(value) => patchForm('serial_code', value.toUpperCase())}
                placeholder="Örn: YL-ANK-0001"
                placeholderTextColor="rgba(232,244,255,0.35)"
                autoCapitalize="characters"
                style={styles.input}
              />

              <Text style={styles.label}>Seri Adı</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowContent}>
                {SERIES_PRESETS.map((item) => (
                  <Chip key={item} label={trSeries(item)} active={String(form.series || '').toUpperCase() === item} onPress={() => patchForm('series', item)} />
                ))}
              </ScrollView>
              <TextInput
                value={form.series}
                onChangeText={(value) => patchForm('series', value.toUpperCase())}
                placeholder="Seri adı yaz"
                placeholderTextColor="rgba(232,244,255,0.35)"
                autoCapitalize="characters"
                style={styles.input}
              />

              <Text style={styles.label}>Kart Nadirliği</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowContent}>
                {RARITY_OPTIONS.map((item) => (
                  <Chip key={item} label={trRarity(item)} active={form.rarity === item} onPress={() => patchForm('rarity', item)} tone="gold" />
                ))}
              </ScrollView>

              <Text style={styles.label}>Tema</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowContent}>
                {THEME_PRESETS.map((item) => (
                  <Chip key={item} label={trTheme(item)} active={form.theme === item} onPress={() => patchForm('theme', item)} tone="purple" compact />
                ))}
              </ScrollView>
              <TextInput
                value={form.theme}
                onChangeText={(value) => patchForm('theme', value)}
                placeholder="Tema ismini yaz"
                placeholderTextColor="rgba(232,244,255,0.35)"
                style={styles.input}
              />

              <Text style={styles.label}>Kart Durumu</Text>
              <View style={styles.inlineRow}>
                <Chip label="Aktif" active={form.is_active === true} onPress={() => patchForm('is_active', true)} />
                <Chip label="Pasif" active={form.is_active === false} onPress={() => patchForm('is_active', false)} />
              </View>

              <View style={styles.mediaPanel}>
                <View style={styles.mediaTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mediaTitle}>Kart Görseli</Text>
                    <Text style={styles.mediaSub}>Galeriden görsel seç. İstersen serbest kırp, istersen 3:4 kart oranında kırp. Network request failed hatası için upload katmanı da bu patch ile yenilenir.</Text>
                  </View>
                </View>

                <View style={styles.mediaPreviewWrap}>
                  {previewImage ? (
                    <Image source={{ uri: previewImage }} style={styles.mediaPreview} contentFit="cover" />
                  ) : (
                    <View style={[styles.mediaPreview, styles.mediaPreviewEmpty]}>
                      <MaterialCommunityIcons name="image-plus-outline" size={42} color={cityLootTheme.colors.textMuted} />
                      <Text style={styles.mediaEmptyText}>Henüz görsel seçilmedi</Text>
                    </View>
                  )}
                </View>

                <View style={styles.mediaActionsRow}>
                  <SecondaryButton label={previewImage ? 'Serbest Kırp' : 'Görsel Seç'} icon="image-edit-outline" onPress={() => pickImage('free')} size="compact" fullWidth={false} tone="blue" style={{ marginRight: 8, marginBottom: 8 }} />
                  <SecondaryButton label="Kart 3:4" icon="crop" onPress={() => pickImage('card')} size="compact" fullWidth={false} tone="ghost" style={{ marginRight: 8, marginBottom: 8 }} />
                  {previewImage ? (
                    <SecondaryButton label="Görseli Kaldır" icon="trash-can-outline" onPress={() => patchForm('art_image_url', '')} size="compact" fullWidth={false} style={{ marginBottom: 8 }} />
                  ) : null}
                </View>
              </View>

              <GlassPanel style={styles.previewPanel}>
                <Text style={styles.previewKicker}>CANLI KART ÖNİZLEME</Text>
                <Text style={styles.previewSub}>{form.serial_code || 'Seri kodu otomatik üretilecek'} • {trSeries(form.series)} • {trRarity(form.rarity)} • {trTheme(form.theme)}</Text>
                <View style={{ marginTop: 14 }}>
                  <FuturisticCardTile
                    name={form.name || 'Yeni Kart'}
                    rarity={form.rarity}
                    series={form.series}
                    theme={form.theme}
                    imageUrl={previewImage}
                    serialCode={form.serial_code}
                    dropType="admin"
                    compact={false}
                  />
                </View>
              </GlassPanel>

              <View style={styles.submitRow}>
                <PrimaryButton
                  label={busy ? 'Kaydediliyor...' : (form?.id ? 'Kartı Güncelle' : 'Kartı Oluştur')}
                  icon={form?.id ? 'content-save-edit-outline' : 'cards-heart-outline'}
                  onPress={submitForm}
                  disabled={busy}
                  style={{ flex: 1 }}
                />
                {form?.id ? (
                  <SecondaryButton
                    label="Kartı Sil"
                    icon="trash-can-outline"
                    onPress={() => requestDeleteCard(form)}
                    disabled={busy}
                    size="compact"
                    fullWidth={false}
                    tone="ghost"
                    style={styles.deleteBtn}
                  />
                ) : null}
              </View>
              {form?.id ? <Text style={styles.deleteHint}>Sil butonu kartı sistemden tamamen kaldırır. Oyuncu envanterleri ve market bağlantıları da silinir.</Text> : null}
            </GlassPanel>

            <GlassPanel style={{ marginTop: 14 }}>
              <View style={styles.sectionHeadRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Kart Arşivi</Text>
                  <Text style={styles.sectionSub}>Kartı ismine, seri adına, seri koduna, temaya ya da rarity değerine göre bul. Düzenle düğmesi formu doldurur, aktif/pasif düğmesi kartı anında değiştirir.</Text>
                </View>
                <View style={styles.resultPill}>
                  <Text style={styles.resultPillText}>{formatInt(filteredCards.length)} kart</Text>
                </View>
              </View>

              <TextInput
                value={cardSearch}
                onChangeText={setCardSearch}
                placeholder="kart adı / seri / seri kodu / tema / rarity"
                placeholderTextColor="rgba(232,244,255,0.35)"
                style={styles.input}
              />

              <Text style={styles.label}>Durum Filtresi</Text>
              <View style={styles.inlineRow}>
                <Chip label="Tümü" active={statusFilter === 'all'} onPress={() => setStatusFilter('all')} compact />
                <Chip label="Aktif" active={statusFilter === 'active'} onPress={() => setStatusFilter('active')} compact />
                <Chip label="Pasif" active={statusFilter === 'passive'} onPress={() => setStatusFilter('passive')} compact />
              </View>

              <Text style={styles.label}>Rarity Filtresi</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowContent}>
                <Chip label="Tümü" active={rarityFilter === 'all'} onPress={() => setRarityFilter('all')} compact />
                {RARITY_OPTIONS.map((item) => (
                  <Chip key={item} label={trRarity(item)} active={rarityFilter === item} onPress={() => setRarityFilter(item)} compact tone="gold" />
                ))}
              </ScrollView>

              <View style={styles.archiveList}>
                {loading ? (
                  <View style={styles.loadingWrap}>
                    <ActivityIndicator color={cityLootTheme.colors.cyanSoft} />
                    <Text style={styles.loadingText}>Kart arşivi yükleniyor...</Text>
                  </View>
                ) : filteredCards.length ? (
                  filteredCards.map((item) => (
                    <ArchiveRow key={String(item?.id)} item={item} onEdit={fillForm} onToggleActive={toggleActive} onDeleteCard={requestDeleteCard} />
                  ))
                ) : (
                  <View style={styles.emptyWrap}>
                    <MaterialCommunityIcons name="cards-outline" size={26} color={cityLootTheme.colors.textMuted} />
                    <Text style={styles.emptyTitle}>Kart bulunamadı</Text>
                    <Text style={styles.emptySub}>Arama metnini, rarity filtresini veya durum filtresini değiştir.</Text>
                  </View>
                )}
              </View>
            </GlassPanel>
          </ScrollView>
        </LinearGradient>
      </SafeScreen>
    </Modal>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    padding: 16,
    paddingBottom: 36,
  },
  panel: {
    borderRadius: 28,
    padding: 16,
    borderWidth: 1,
    borderColor: cityLootTheme.colors.panelBorder,
    backgroundColor: cityLootTheme.colors.panel,
    overflow: 'hidden',
  },
  heroPanel: {
    paddingBottom: 18,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  heroCopy: { flex: 1 },
  kicker: {
    color: cityLootTheme.colors.goldSoft,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  title: {
    color: cityLootTheme.colors.text,
    fontSize: 28,
    fontWeight: '900',
    marginTop: 6,
  },
  sub: {
    color: cityLootTheme.colors.textSoft,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  headerButton: {
    marginLeft: 'auto',
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  metricCard: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 14,
  },
  metricIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(84,220,255,0.12)',
    marginBottom: 10,
  },
  metricGold: {
    backgroundColor: 'rgba(246,205,103,0.12)',
  },
  metricPurple: {
    backgroundColor: 'rgba(170,136,255,0.12)',
  },
  metricLabel: {
    color: cityLootTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 8,
  },
  sectionHeadRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  sectionSub: {
    color: cityLootTheme.colors.textSoft,
    marginTop: 6,
    lineHeight: 20,
    fontWeight: '700',
  },
  label: {
    color: cityLootTheme.colors.textSoft,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 16,
    marginBottom: 10,
  },
  helperText: { color: cityLootTheme.colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 4, marginBottom: 10 },
  codePill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(105,231,255,0.18)',
    backgroundColor: 'rgba(105,231,255,0.10)',
    marginRight: 8,
    marginBottom: 6,
  },
  codePillText: { color: cityLootTheme.colors.cyanSoft, fontSize: 11, fontWeight: '900' },
  input: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  rowContent: {
    paddingRight: 6,
  },
  inlineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginBottom: 10,
  },
  chipCompact: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  chipActive: {
    backgroundColor: 'rgba(103,219,255,0.16)',
    borderColor: 'rgba(103,219,255,0.44)',
  },
  chipActiveGold: {
    backgroundColor: 'rgba(246,205,103,0.16)',
    borderColor: 'rgba(246,205,103,0.46)',
  },
  chipActivePurple: {
    backgroundColor: 'rgba(170,136,255,0.16)',
    borderColor: 'rgba(170,136,255,0.46)',
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  chipTextCompact: {
    fontSize: 13,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  mediaPanel: {
    marginTop: 16,
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  mediaTop: {
    flexDirection: 'row',
  },
  mediaTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  mediaSub: {
    color: cityLootTheme.colors.textSoft,
    marginTop: 6,
    lineHeight: 19,
    fontWeight: '700',
  },
  mediaPreviewWrap: {
    marginTop: 14,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(6,12,20,0.9)',
    aspectRatio: 3 / 4,
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
  },
  mediaPreviewEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  mediaEmptyText: {
    color: cityLootTheme.colors.textMuted,
    fontWeight: '800',
  },
  mediaActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  previewPanel: {
    marginTop: 16,
    padding: 14,
  },
  previewKicker: {
    color: cityLootTheme.colors.cyanSoft,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  previewSub: {
    color: cityLootTheme.colors.textSoft,
    fontWeight: '800',
    marginTop: 6,
  },
  submitRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteBtn: {
    marginLeft: 10,
  },
  deleteHint: {
    color: cityLootTheme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  resultPill: {
    minHeight: 44,
    minWidth: 92,
    paddingHorizontal: 16,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  resultPillText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  archiveList: {
    marginTop: 8,
  },
  archiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.035)',
    padding: 12,
    marginTop: 10,
  },
  archiveThumbWrap: {
    marginRight: 12,
  },
  archiveThumb: {
    width: 64,
    height: 84,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  archiveThumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  archiveCopy: {
    flex: 1,
    minWidth: 0,
  },
  archiveTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  archiveSub: {
    color: cityLootTheme.colors.textSoft,
    marginTop: 6,
    lineHeight: 19,
    fontWeight: '700',
  },
  archiveBadges: {
    flexDirection: 'row',
    marginTop: 10,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
  },
  statusPillActive: {
    backgroundColor: 'rgba(82,216,167,0.16)',
    borderColor: 'rgba(82,216,167,0.36)',
  },
  statusPillPassive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.14)',
  },
  statusPillText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
  },
  archiveActions: {
    marginLeft: 10,
    alignItems: 'flex-end',
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  loadingText: {
    color: cityLootTheme.colors.textSoft,
    marginTop: 10,
    fontWeight: '700',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginTop: 12,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 18,
    marginTop: 12,
  },
  emptySub: {
    color: cityLootTheme.colors.textSoft,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 20,
  },
});
