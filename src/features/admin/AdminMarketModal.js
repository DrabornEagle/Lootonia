import React, { memo, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SafeScreen from '../../components/layout/SafeScreen';
import SecondaryButton from '../../components/ui/SecondaryButton';
import PrimaryButton from '../../components/ui/PrimaryButton';
import { cityLootTheme } from '../../theme/cityLootTheme';

const EMPTY_UI = {
  hero_kicker: 'TOKEN MAĞAZASI',
  hero_title: 'Anında al, anında kullan',
  hero_subtitle: 'Token cüzdanınla shard, boss bileti ve enerji satın al. Her paket ne işe yaradığını açık şekilde gösterir.',
  logic_title: 'Paket mantığı',
  logic_body: 'Shard = craft ve upgrade, Bilet = boss girişi, Enerji = daha fazla drop ve sandık akışı.',
  hero_icon_name: 'shopping-outline',
  hero_icon_accent: 'cyan',
  hero_background_image_url: '',
  hero_visual_preset: 'aurora',
};

const EMPTY_REWARD_TYPE = {
  id: '',
  reward_kind: 'shard',
  title: 'Shard',
  subtitle: 'Craft ve upgrade kaynağı',
  resource_target: 'shards',
  icon_name: 'diamond-stone',
  accent_key: 'cyan',
  is_active: true,
};

const EMPTY_PACK = {
  id: '',
  pack_key: '',
  title: '',
  subtitle: '',
  description: '',
  badge_label: '',
  icon_name: 'cube-outline',
  accent_key: 'cyan',
  art_image_url: '',
  panel_style: 'featured',
  background_tone: 'auto',
  visual_preset: 'auto',
  price_token: '0',
  reward_kind: 'shard',
  reward_amount: '1',
  sort_order: '100',
  is_active: true,
};

const RESOURCE_TARGETS = ['shards', 'boss_tickets', 'energy', 'token', 'xp'];
const ACCENT_KEYS = ['cyan', 'purple', 'gold', 'green', 'red', 'blue'];
const PANEL_STYLE_KEYS = ['featured', 'minimal', 'compact'];
const BACKGROUND_TONES = ['auto', 'midnight', 'sunset', 'emerald', 'violet'];
const HERO_VISUAL_PRESETS = ['aurora', 'neon', 'gold', 'frost'];
const PACK_VISUAL_PRESETS = ['auto', 'aurora', 'neon', 'gold', 'frost'];

function slugifyPackKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9çğıöşü\s_-]/gi, '')
    .replace(/[ç]/g, 'c')
    .replace(/[ğ]/g, 'g')
    .replace(/[ı]/g, 'i')
    .replace(/[ö]/g, 'o')
    .replace(/[ş]/g, 's')
    .replace(/[ü]/g, 'u')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');
}

function GlassPanel({ children, style }) {
  return (
    <View style={[dkd_styles.panel, style]}>
      <LinearGradient colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']} style={StyleSheet.absoluteFillObject} />
      {children}
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType = 'default', multiline = false, style }) {
  return (
    <View style={[dkd_styles.fieldBlock, style]}>
      <Text style={dkd_styles.fieldLabel}>{label}</Text>
      <TextInput
        value={String(value ?? '')}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(232,244,255,0.35)"
        keyboardType={keyboardType}
        multiline={multiline}
        style={[dkd_styles.input, multiline && dkd_styles.inputMultiline]}
      />
    </View>
  );
}

function ChoiceChip({ active, label, onPress }) {
  return (
    <Pressable onPress={onPress} style={[dkd_styles.chip, active && dkd_styles.chipActive]}>
      <Text style={[dkd_styles.chipText, active && dkd_styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function SectionHeader({ title, subtitle, actions, stacked }) {
  return (
    <View style={[dkd_styles.sectionHead, stacked && dkd_styles.sectionHeadStacked]}>
      <View style={dkd_styles.sectionCopy}>
        <Text style={dkd_styles.sectionTitle}>{title}</Text>
        {!!subtitle ? <Text style={dkd_styles.sectionSub}>{subtitle}</Text> : null}
      </View>
      {!!actions?.length ? <View style={[dkd_styles.sectionActions, stacked && dkd_styles.sectionActionsStacked]}>{actions}</View> : null}
    </View>
  );
}

function MetaPill({ text, tone = 'default' }) {
  const toneStyle = tone === 'active' ? dkd_styles.metaPillActive : tone === 'muted' ? dkd_styles.metaPillMuted : dkd_styles.metaPillDefault;
  return (
    <View style={[dkd_styles.metaPill, toneStyle]}>
      <Text style={dkd_styles.metaPillText}>{text}</Text>
    </View>
  );
}

function PackRow({ item, active, onPress, onDelete }) {
  return (
    <Pressable onPress={onPress} style={[dkd_styles.listCard, active && dkd_styles.listCardActive]}>
      <View style={dkd_styles.listCardHead}>
        <View style={dkd_styles.listCardIcon}>
          <MaterialCommunityIcons name={item?.icon_name || 'cube-outline'} size={20} color={cityLootTheme.colors.goldSoft} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={dkd_styles.listCardTitle} numberOfLines={1}>{String(item?.title || 'Paket')}</Text>
          <Text style={dkd_styles.listCardSub} numberOfLines={2}>{String(item?.subtitle || item?.description || 'Market paketi')}</Text>
        </View>
        <Pressable onPress={() => onDelete?.(item)} style={dkd_styles.deleteBtn}>
          <MaterialCommunityIcons name="trash-can-outline" size={18} color="#FFD2D2" />
        </Pressable>
      </View>
      <View style={dkd_styles.metaRow}>
        <MetaPill text={`key ${String(item?.pack_key || '-').toLowerCase()}`} />
        <MetaPill text={`${String(item?.price_token ?? 0)} token`} />
        <MetaPill text={`${String(item?.reward_amount ?? 0)} ${String(item?.reward_kind || 'reward')}`} />
        <MetaPill text={`sıra ${String(item?.sort_order ?? 0)}`} />
        <MetaPill text={item?.is_active === false ? 'pasif' : 'aktif'} tone={item?.is_active === false ? 'muted' : 'active'} />
      </View>
    </Pressable>
  );
}

function RewardTypeRow({ item, active, onPress, onDelete }) {
  return (
    <Pressable onPress={onPress} style={[dkd_styles.listCard, active && dkd_styles.listCardActive]}>
      <View style={dkd_styles.listCardHead}>
        <View style={dkd_styles.listCardIcon}>
          <MaterialCommunityIcons name={item?.icon_name || 'cube-outline'} size={20} color={cityLootTheme.colors.cyanSoft} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={dkd_styles.listCardTitle} numberOfLines={1}>{String(item?.title || item?.reward_kind || 'Ödül')}</Text>
          <Text style={dkd_styles.listCardSub} numberOfLines={2}>{String(item?.subtitle || item?.resource_target || 'Kaynak hedefi')}</Text>
        </View>
        <Pressable onPress={() => onDelete?.(item)} style={dkd_styles.deleteBtn}>
          <MaterialCommunityIcons name="trash-can-outline" size={18} color="#FFD2D2" />
        </Pressable>
      </View>
      <View style={dkd_styles.metaRow}>
        <MetaPill text={`key ${String(item?.reward_kind || '-').toLowerCase()}`} />
        <MetaPill text={`hedef ${String(item?.resource_target || '-')}`} />
        <MetaPill text={`renk ${String(item?.accent_key || '-')}`} />
        <MetaPill text={item?.is_active === false ? 'pasif' : 'aktif'} tone={item?.is_active === false ? 'muted' : 'active'} />
      </View>
    </Pressable>
  );
}

export default memo(function AdminMarketModal({
  visible,
  onClose,
  loading,
  uiConfig,
  packs,
  rewardTypes,
  onRefresh,
  onSaveUi,
  onSavePack,
  onDeletePack,
  onSaveRewardType,
  onDeleteRewardType,
}) {
  const { width } = useWindowDimensions();
  const isNarrow = width < 430;
  const [uiDraft, setUiDraft] = useState(EMPTY_UI);
  const [packDraft, setPackDraft] = useState(EMPTY_PACK);
  const [selectedPackId, setSelectedPackId] = useState('');
  const [rewardTypeDraft, setRewardTypeDraft] = useState(EMPTY_REWARD_TYPE);
  const [selectedRewardTypeId, setSelectedRewardTypeId] = useState('');

  useEffect(() => {
    if (!visible) return;
    setUiDraft({ ...EMPTY_UI, ...(uiConfig || {}) });
    const firstPack = Array.isArray(packs) && packs.length ? packs[0] : null;
    setSelectedPackId(firstPack?.id ? String(firstPack.id) : '');
    setPackDraft(firstPack ? {
      ...EMPTY_PACK,
      ...firstPack,
      id: String(firstPack?.id || ''),
      price_token: String(firstPack?.price_token ?? '0'),
      reward_amount: String(firstPack?.reward_amount ?? '1'),
      sort_order: String(firstPack?.sort_order ?? '100'),
    } : EMPTY_PACK);
    const firstRewardType = Array.isArray(rewardTypes) && rewardTypes.length ? rewardTypes[0] : null;
    setSelectedRewardTypeId(firstRewardType?.id ? String(firstRewardType.id) : '');
    setRewardTypeDraft(firstRewardType ? {
      ...EMPTY_REWARD_TYPE,
      ...firstRewardType,
      id: String(firstRewardType?.id || ''),
    } : EMPTY_REWARD_TYPE);
  }, [visible, uiConfig, packs, rewardTypes]);

  const orderedPacks = useMemo(() => (Array.isArray(packs) ? packs.slice().sort((dkd_left_value, dkd_right_value) => Number(dkd_left_value?.sort_order || 0) - Number(dkd_right_value?.sort_order || 0)) : []), [packs]);
  const orderedRewardTypes = useMemo(() => (Array.isArray(rewardTypes) ? rewardTypes.slice().sort((dkd_left_value, dkd_right_value) => String(dkd_left_value?.title || '').localeCompare(String(dkd_right_value?.title || ''), 'tr')) : []), [rewardTypes]);
  const rewardKindOptions = useMemo(() => orderedRewardTypes.map((item) => String(item?.reward_kind || '').trim()).filter(Boolean), [orderedRewardTypes]);

  function pickPack(item) {
    setSelectedPackId(String(item?.id || ''));
    setPackDraft({
      ...EMPTY_PACK,
      ...item,
      id: String(item?.id || ''),
      price_token: String(item?.price_token ?? '0'),
      reward_amount: String(item?.reward_amount ?? '1'),
      sort_order: String(item?.sort_order ?? '100'),
    });
  }

  function resetPack() {
    setSelectedPackId('');
    setPackDraft(EMPTY_PACK);
  }

  function pickRewardType(item) {
    setSelectedRewardTypeId(String(item?.id || ''));
    setRewardTypeDraft({
      ...EMPTY_REWARD_TYPE,
      ...item,
      id: String(item?.id || ''),
    });
  }

  function resetRewardType() {
    setSelectedRewardTypeId('');
    setRewardTypeDraft(EMPTY_REWARD_TYPE);
  }

  async function handleSaveUi() {
    if (!String(uiDraft.hero_title || '').trim()) return Alert.alert('Admin', 'Mağaza başlığı boş bırakılamaz.');
    await onSaveUi?.(uiDraft);
    onRefresh?.(true);
  }

  async function handleSavePack() {
    const finalTitle = String(packDraft.title || '').trim();
    const finalPackKey = slugifyPackKey(packDraft.pack_key || finalTitle);
    if (!finalTitle) return Alert.alert('Admin', 'Paket başlığı gerekli.');
    if (!finalPackKey) return Alert.alert('Admin', 'Pack key gerekli.');
    const priceToken = Number(packDraft.price_token || 0);
    const rewardAmount = Number(packDraft.reward_amount || 0);
    const sortOrder = Number(packDraft.sort_order || 0);
    if (!Number.isFinite(priceToken) || priceToken < 0) return Alert.alert('Admin', 'Fiyat 0 veya daha büyük olmalı.');
    if (!Number.isFinite(rewardAmount) || rewardAmount <= 0) return Alert.alert('Admin', 'Ödül miktarı 1 veya daha büyük olmalı.');
    if (!Number.isFinite(sortOrder)) return Alert.alert('Admin', 'Sıra sayısı geçerli değil.');

    await onSavePack?.({
      ...packDraft,
      id: packDraft.id ? Number(packDraft.id) : null,
      pack_key: finalPackKey,
      title: finalTitle,
      price_token: priceToken,
      reward_amount: rewardAmount,
      sort_order: sortOrder,
    });
    setPackDraft((prev) => ({ ...prev, pack_key: finalPackKey, title: finalTitle }));
    onRefresh?.(true);
  }

  async function handleSaveRewardType() {
    const finalRewardKind = slugifyPackKey(rewardTypeDraft.reward_kind);
    if (!finalRewardKind) return Alert.alert('Admin', 'Ödül türü key gerekli.');
    if (!String(rewardTypeDraft.title || '').trim()) return Alert.alert('Admin', 'Ödül türü başlığı gerekli.');
    await onSaveRewardType?.({
      ...rewardTypeDraft,
      id: rewardTypeDraft.id ? Number(rewardTypeDraft.id) : null,
      reward_kind: finalRewardKind,
    });
    setRewardTypeDraft((prev) => ({ ...prev, reward_kind: finalRewardKind }));
    onRefresh?.(true);
  }

  function handleDeleteRewardType(item) {
    Alert.alert('Ödül Türü Sil', 'Bu ödül türü silinecek. Devam edilsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => onDeleteRewardType?.(item?.id) },
    ]);
  }

  function handleDelete(item) {
    Alert.alert('Market Paketi Sil', 'Bu market paketi silinecek. Devam edilsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => onDeletePack?.(item?.id) },
    ]);
  }

  const sectionActionsCommon = [
    <SecondaryButton key="refresh" label="Yenile" onPress={() => onRefresh?.(true)} size="compact" fullWidth={false} />,
  ];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeScreen style={dkd_styles.screen}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#07111B', '#0D1730', '#090E18']} style={dkd_styles.gradient}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={dkd_styles.content}>
            <GlassPanel style={dkd_styles.heroCard}>
              <View style={dkd_styles.heroTop}>
                <View style={dkd_styles.heroIconWrap}>
                  <MaterialCommunityIcons name="store-cog-outline" size={26} color={cityLootTheme.colors.goldSoft} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={dkd_styles.kicker}>ADMIN MARKET CONTROL</Text>
                  <Text style={dkd_styles.title}>Market Komuta</Text>
                  <Text style={dkd_styles.sub}>Token mağazası paketlerini, ödül tiplerini, görselleri ve görünüm sırasını tek merkezden yönet.</Text>
                </View>
                <SecondaryButton label="Kapat" onPress={onClose} fullWidth={false} />
              </View>
            </GlassPanel>

            <GlassPanel>
              <SectionHeader
                title="Mağaza üst alanı"
                subtitle="Token mağazası kahraman alanı, ikon, preset ve arka plan görseli burada yönetilir."
                stacked={isNarrow}
                actions={[
                  <PrimaryButton key="save-ui" label={loading ? 'Bekle…' : 'Üst alanı kaydet'} onPress={handleSaveUi} size="compact" fullWidth={false} disabled={loading} />,
                  ...sectionActionsCommon,
                ]}
              />
              <View style={dkd_styles.rowWrap}>
                <Field label="Kicker" value={uiDraft.hero_kicker} onChangeText={(value) => setUiDraft((prev) => ({ ...prev, hero_kicker: value }))} placeholder="TOKEN MAĞAZASI" style={isNarrow ? dkd_styles.fieldFull : dkd_styles.fieldHalf} />
                <Field label="Başlık" value={uiDraft.hero_title} onChangeText={(value) => setUiDraft((prev) => ({ ...prev, hero_title: value }))} placeholder="Anında al, anında kullan" style={isNarrow ? dkd_styles.fieldFull : dkd_styles.fieldHalf} />
                <Field label="Alt Başlık" value={uiDraft.hero_subtitle} onChangeText={(value) => setUiDraft((prev) => ({ ...prev, hero_subtitle: value }))} placeholder="Açıklama" multiline style={dkd_styles.fieldFull} />
                <Field label="Mantık Başlığı" value={uiDraft.logic_title} onChangeText={(value) => setUiDraft((prev) => ({ ...prev, logic_title: value }))} placeholder="Paket mantığı" style={isNarrow ? dkd_styles.fieldFull : dkd_styles.fieldHalf} />
                <Field label="Mantık Metni" value={uiDraft.logic_body} onChangeText={(value) => setUiDraft((prev) => ({ ...prev, logic_body: value }))} placeholder="Mantık özeti" multiline style={isNarrow ? dkd_styles.fieldFull : dkd_styles.fieldHalf} />
                <Field label="Hero İkonu" value={uiDraft.hero_icon_name} onChangeText={(value) => setUiDraft((prev) => ({ ...prev, hero_icon_name: value }))} placeholder="shopping-outline" style={isNarrow ? dkd_styles.fieldFull : dkd_styles.fieldHalf} />
                <Field label="Hero Tonu" value={uiDraft.hero_icon_accent} onChangeText={(value) => setUiDraft((prev) => ({ ...prev, hero_icon_accent: value }))} placeholder="cyan" style={isNarrow ? dkd_styles.fieldFull : dkd_styles.fieldHalf} />
                <Field label="Hero Arka Plan URL" value={uiDraft.hero_background_image_url} onChangeText={(value) => setUiDraft((prev) => ({ ...prev, hero_background_image_url: value }))} placeholder="https://..." style={dkd_styles.fieldFull} />
              </View>

              <Text style={dkd_styles.fieldLabel}>Hero preset</Text>
              <View style={dkd_styles.chipRow}>
                {HERO_VISUAL_PRESETS.map((key) => (
                  <ChoiceChip key={key} label={key} active={uiDraft.hero_visual_preset === key} onPress={() => setUiDraft((prev) => ({ ...prev, hero_visual_preset: key }))} />
                ))}
              </View>
            </GlassPanel>

            <GlassPanel>
              <SectionHeader
                title="Paket havuzu"
                subtitle="Market ürünleri burada sıralanır. Pack key otomatik üretilebilir; görsel, ton, kart stili ve hazır presetler burada yönetilir."
                stacked={isNarrow}
                actions={[
                  <SecondaryButton key="new-pack" label="Yeni Paket" onPress={resetPack} size="compact" fullWidth={false} />,
                  <PrimaryButton key="save-pack" label={loading ? 'Bekle…' : 'Paketi kaydet'} onPress={handleSavePack} size="compact" fullWidth={false} disabled={loading} />,
                  ...sectionActionsCommon,
                ]}
              />
              {orderedPacks.length ? orderedPacks.map((item) => (
                <PackRow key={`pack-${String(item?.id || item?.pack_key)}`} item={item} active={selectedPackId === String(item?.id || '')} onPress={() => pickPack(item)} onDelete={handleDelete} />
              )) : <Text style={dkd_styles.emptyText}>Henüz market paketi yok.</Text>}

              <View style={dkd_styles.divider} />
              <Text style={dkd_styles.formTitle}>{selectedPackId ? 'Paket düzenle' : 'Yeni paket oluştur'}</Text>
              <View style={dkd_styles.rowWrap}>
                <Field label="Başlık" value={packDraft.title} onChangeText={(value) => setPackDraft((prev) => ({ ...prev, title: value }))} placeholder="5 Enerji" style={isNarrow ? dkd_styles.fieldFull : dkd_styles.fieldHalf} />
                <Field label="Pack Key" value={packDraft.pack_key} onChangeText={(value) => setPackDraft((prev) => ({ ...prev, pack_key: slugifyPackKey(value) }))} placeholder="energy_5" style={isNarrow ? dkd_styles.fieldFull : dkd_styles.fieldHalf} />
                <Field label="Alt Başlık" value={packDraft.subtitle} onChangeText={(value) => setPackDraft((prev) => ({ ...prev, subtitle: value }))} placeholder="Kısa özet" style={isNarrow ? dkd_styles.fieldFull : dkd_styles.fieldHalf} />
                <Field label="Rozet" value={packDraft.badge_label} onChangeText={(value) => setPackDraft((prev) => ({ ...prev, badge_label: value }))} placeholder="Hızlı" style={isNarrow ? dkd_styles.fieldFull : dkd_styles.fieldHalf} />
                <Field label="Açıklama" value={packDraft.description} onChangeText={(value) => setPackDraft((prev) => ({ ...prev, description: value }))} placeholder="Paket açıklaması" multiline style={dkd_styles.fieldFull} />
                <Field label="İkon" value={packDraft.icon_name} onChangeText={(value) => setPackDraft((prev) => ({ ...prev, icon_name: value }))} placeholder="lightning-bolt-outline" style={isNarrow ? dkd_styles.fieldFull : dkd_styles.fieldHalf} />
                <Field label="Renk" value={packDraft.accent_key} onChangeText={(value) => setPackDraft((prev) => ({ ...prev, accent_key: value }))} placeholder="gold" style={isNarrow ? dkd_styles.fieldFull : dkd_styles.fieldHalf} />
                <Field label="Görsel URL" value={packDraft.art_image_url} onChangeText={(value) => setPackDraft((prev) => ({ ...prev, art_image_url: value }))} placeholder="https://..." style={dkd_styles.fieldFull} />
              </View>

              <Text style={dkd_styles.fieldLabel}>Kart stili</Text>
              <View style={dkd_styles.chipRow}>
                {PANEL_STYLE_KEYS.map((key) => (
                  <ChoiceChip key={key} label={key} active={packDraft.panel_style === key} onPress={() => setPackDraft((prev) => ({ ...prev, panel_style: key }))} />
                ))}
              </View>

              <Text style={dkd_styles.fieldLabel}>Arka plan tonu</Text>
              <View style={dkd_styles.chipRow}>
                {BACKGROUND_TONES.map((key) => (
                  <ChoiceChip key={key} label={key} active={packDraft.background_tone === key} onPress={() => setPackDraft((prev) => ({ ...prev, background_tone: key }))} />
                ))}
              </View>

              <Text style={dkd_styles.fieldLabel}>Hazır tema preset</Text>
              <View style={dkd_styles.chipRow}>
                {PACK_VISUAL_PRESETS.map((key) => (
                  <ChoiceChip key={key} label={key} active={packDraft.visual_preset === key} onPress={() => setPackDraft((prev) => ({ ...prev, visual_preset: key }))} />
                ))}
              </View>

              <Text style={dkd_styles.fieldLabel}>Ödül türü</Text>
              <View style={dkd_styles.chipRow}>
                {(rewardKindOptions.length ? rewardKindOptions : ['shard', 'ticket', 'energy']).map((kind) => (
                  <ChoiceChip key={kind} label={kind} active={packDraft.reward_kind === kind} onPress={() => setPackDraft((prev) => ({ ...prev, reward_kind: kind }))} />
                ))}
              </View>

              <View style={dkd_styles.rowWrap}>
                <Field label="Fiyat token" value={packDraft.price_token} onChangeText={(value) => setPackDraft((prev) => ({ ...prev, price_token: value }))} keyboardType="numeric" placeholder="120" style={isNarrow ? dkd_styles.fieldFull : dkd_styles.fieldThird} />
                <Field label="Ödül miktarı" value={packDraft.reward_amount} onChangeText={(value) => setPackDraft((prev) => ({ ...prev, reward_amount: value }))} keyboardType="numeric" placeholder="5" style={isNarrow ? dkd_styles.fieldFull : dkd_styles.fieldThird} />
                <Field label="Sıra" value={packDraft.sort_order} onChangeText={(value) => setPackDraft((prev) => ({ ...prev, sort_order: value }))} keyboardType="numeric" placeholder="30" style={isNarrow ? dkd_styles.fieldFull : dkd_styles.fieldThird} />
              </View>

              <View style={dkd_styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={dkd_styles.fieldLabel}>Aktiflik</Text>
                  <Text style={dkd_styles.switchSub}>Kapalı paket markette görünmez ve satın alınamaz.</Text>
                </View>
                <Switch value={packDraft.is_active !== false} onValueChange={(value) => setPackDraft((prev) => ({ ...prev, is_active: value }))} />
              </View>
            </GlassPanel>

            <GlassPanel>
              <SectionHeader
                title="Ödül türleri"
                subtitle="Buradaki tipler paketlerde kullanılır. Hangi kaynağa yazılacağını net seçerek karışıklığı bitirir."
                stacked={isNarrow}
                actions={[
                  <SecondaryButton key="new-reward" label="Yeni Tür" onPress={resetRewardType} size="compact" fullWidth={false} />,
                  <PrimaryButton key="save-reward" label={loading ? 'Bekle…' : 'Türü kaydet'} onPress={handleSaveRewardType} size="compact" fullWidth={false} disabled={loading} />,
                  ...sectionActionsCommon,
                ]}
              />

              {orderedRewardTypes.length ? orderedRewardTypes.map((item) => (
                <RewardTypeRow key={`reward-${String(item?.id || item?.reward_kind)}`} item={item} active={selectedRewardTypeId === String(item?.id || '')} onPress={() => pickRewardType(item)} onDelete={handleDeleteRewardType} />
              )) : <Text style={dkd_styles.emptyText}>Henüz ödül türü yok.</Text>}

              <View style={dkd_styles.divider} />
              <Text style={dkd_styles.formTitle}>{selectedRewardTypeId ? 'Ödül türünü düzenle' : 'Yeni ödül türü oluştur'}</Text>
              <View style={dkd_styles.rowWrap}>
                <Field label="Tür Key" value={rewardTypeDraft.reward_kind} onChangeText={(value) => setRewardTypeDraft((prev) => ({ ...prev, reward_kind: slugifyPackKey(value) }))} placeholder="energy" style={isNarrow ? dkd_styles.fieldFull : dkd_styles.fieldHalf} />
                <Field label="Başlık" value={rewardTypeDraft.title} onChangeText={(value) => setRewardTypeDraft((prev) => ({ ...prev, title: value }))} placeholder="Enerji" style={isNarrow ? dkd_styles.fieldFull : dkd_styles.fieldHalf} />
                <Field label="Alt Başlık" value={rewardTypeDraft.subtitle} onChangeText={(value) => setRewardTypeDraft((prev) => ({ ...prev, subtitle: value }))} placeholder="Harita enerjisi" style={isNarrow ? dkd_styles.fieldFull : dkd_styles.fieldHalf} />
                <Field label="İkon" value={rewardTypeDraft.icon_name} onChangeText={(value) => setRewardTypeDraft((prev) => ({ ...prev, icon_name: value }))} placeholder="lightning-bolt-outline" style={isNarrow ? dkd_styles.fieldFull : dkd_styles.fieldHalf} />
              </View>

              <Text style={dkd_styles.fieldLabel}>Kaynak hedefi</Text>
              <View style={dkd_styles.chipRow}>
                {RESOURCE_TARGETS.map((key) => (
                  <ChoiceChip key={key} label={key} active={rewardTypeDraft.resource_target === key} onPress={() => setRewardTypeDraft((prev) => ({ ...prev, resource_target: key }))} />
                ))}
              </View>

              <Text style={dkd_styles.fieldLabel}>Renk tonu</Text>
              <View style={dkd_styles.chipRow}>
                {ACCENT_KEYS.map((key) => (
                  <ChoiceChip key={key} label={key} active={rewardTypeDraft.accent_key === key} onPress={() => setRewardTypeDraft((prev) => ({ ...prev, accent_key: key }))} />
                ))}
              </View>

              <View style={dkd_styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={dkd_styles.fieldLabel}>Aktif</Text>
                  <Text style={dkd_styles.switchSub}>Kapalı tür, yeni paketlerde görünür ama satın alma için pasif kalır.</Text>
                </View>
                <Switch value={rewardTypeDraft.is_active !== false} onValueChange={(value) => setRewardTypeDraft((prev) => ({ ...prev, is_active: value }))} />
              </View>
            </GlassPanel>
          </ScrollView>
        </LinearGradient>
      </SafeScreen>
    </Modal>
  );
});

const dkd_styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#090E18' },
  gradient: { flex: 1 },
  content: { padding: 16, paddingBottom: 120, gap: 14 },
  panel: {
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
    padding: 16,
  },
  heroCard: { paddingTop: 18 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: { color: cityLootTheme.colors.goldSoft, fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: cityLootTheme.colors.text, fontSize: 30, fontWeight: '900', marginTop: 4 },
  sub: { color: cityLootTheme.colors.textSoft, fontSize: 13, lineHeight: 19, marginTop: 6 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  sectionHeadStacked: { flexDirection: 'column' },
  sectionCopy: { flex: 1, minWidth: 0 },
  sectionActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' },
  sectionActionsStacked: { width: '100%', justifyContent: 'flex-start' },
  sectionTitle: { color: cityLootTheme.colors.text, fontSize: 18, fontWeight: '900' },
  sectionSub: { color: cityLootTheme.colors.textSoft, fontSize: 12, lineHeight: 18, marginTop: 5 },
  formTitle: { color: cityLootTheme.colors.text, fontSize: 16, fontWeight: '900', marginBottom: 8 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  fieldBlock: { paddingHorizontal: 5, marginBottom: 2 },
  fieldFull: { width: '100%' },
  fieldHalf: { width: '50%' },
  fieldThird: { width: '33.3333%' },
  fieldLabel: { color: cityLootTheme.colors.textMuted, fontSize: 11, fontWeight: '900', marginBottom: 6, marginTop: 8 },
  input: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(4,11,18,0.88)',
    color: cityLootTheme.colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontWeight: '700',
  },
  inputMultiline: { minHeight: 92, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  chipActive: { borderColor: 'rgba(108,203,255,0.42)', backgroundColor: 'rgba(108,203,255,0.10)' },
  chipText: { color: cityLootTheme.colors.textSoft, fontWeight: '800' },
  chipTextActive: { color: cityLootTheme.colors.text },
  switchRow: {
    marginTop: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  switchSub: { color: cityLootTheme.colors.textSoft, fontSize: 12, lineHeight: 18 },
  listCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12,
    marginBottom: 10,
  },
  listCardActive: { borderColor: 'rgba(108,203,255,0.36)', backgroundColor: 'rgba(108,203,255,0.08)' },
  listCardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  listCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listCardTitle: { color: cityLootTheme.colors.text, fontSize: 15, fontWeight: '900' },
  listCardSub: { color: cityLootTheme.colors.textSoft, fontSize: 12, lineHeight: 18, marginTop: 4 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  metaPill: { minHeight: 30, paddingHorizontal: 12, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  metaPillDefault: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.10)' },
  metaPillActive: { backgroundColor: 'rgba(67,221,147,0.14)', borderColor: 'rgba(67,221,147,0.28)' },
  metaPillMuted: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.10)' },
  metaPillText: { color: cityLootTheme.colors.text, fontSize: 11, fontWeight: '900' },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 8 },
  emptyText: { color: cityLootTheme.colors.textSoft, fontSize: 13, fontWeight: '700' },
});
