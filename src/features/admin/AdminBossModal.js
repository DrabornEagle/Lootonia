import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchAllDropsForAdmin } from '../../services/dropService';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { dkd_make_native_axis_point, dkd_make_native_axis_value_pair, dkd_read_native_axis_horizontal, dkd_read_native_axis_vertical } from '../../utils/dkdNativeAxis';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import SafeScreen from '../../components/layout/SafeScreen';
import { cityLootTheme } from '../../theme/cityLootTheme';

const EMPTY_Q = { dkd_query_value: '', opts: ['', '', '', ''], dkd_answer_index: 0 };
const EMPTY_FORM = {
  drop_id: '',
  boss_key: '',
  title: '',
  subtitle: '',
  description: '',
  reward_summary: '',
  ticket_cost: '1',
  boss_hp_display: '985000',
  art_image_url: '',
  is_active: true,
  question_set: [{ ...EMPTY_Q }, { ...EMPTY_Q }, { ...EMPTY_Q }],
};

const VIEWPORT_W = Math.min(Dimensions.get('window').width - 56, 340);
const VIEWPORT_H = Math.round(VIEWPORT_W * 9 / 16);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeQuestionSet(items) {
  return Array.isArray(items) && items.length
    ? items.map((dkd_query_value) => ({
        dkd_query_value: String(dkd_query_value?.dkd_query_value || ''),
        opts: Array.isArray(dkd_query_value?.opts) ? [0, 1, 2, 3].map((dkd_index_value) => String(dkd_query_value.opts[dkd_index_value] || '')) : ['', '', '', ''],
        dkd_answer_index: clamp(Number(dkd_query_value?.dkd_answer_index || dkd_query_value?.[String.fromCharCode(97)] || 0), 0, 3),
      }))
    : [{ ...EMPTY_Q }, { ...EMPTY_Q }, { ...EMPTY_Q }];
}

function isBossLikeDrop(row) {
  const rawType = String(row?.type || row?.drop_type || row?.dropType || row?.kind || row?.source_type || '').trim().toLowerCase();
  const rawName = String(row?.name || row?.title || row?.drop_name || '').trim().toLowerCase();
  return rawType === 'boss'
    || rawType.includes('boss')
    || rawType.includes('raid')
    || rawType.includes('crown')
    || rawType.includes('krali')
    || rawType.includes('taht')
    || (!rawType && rawName.includes('boss'));
}

async function launchBossPicker() {
  return ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 0.9,
    selectionLimit: 1,
    exif: false,
    base64: false,
    legacy: false,
  });
}

async function prepareAutoBossImage(asset) {
  const width = Math.max(1, Number(asset?.width || 1));
  const height = Math.max(1, Number(asset?.height || 1));
  const targetRatio = 16 / 9;
  const currentRatio = width / height;
  let cropW = width;
  let cropH = height;
  if (currentRatio > targetRatio) cropW = Math.max(1, Math.round(height * targetRatio));
  else if (currentRatio < targetRatio) cropH = Math.max(1, Math.round(width / targetRatio));
  const originX = Math.max(0, Math.floor((width - cropW) / 2));
  const originY = Math.max(0, Math.floor((height - cropH) / 2));
  const result = await ImageManipulator.manipulateAsync(
    String(asset?.uri || ''),
    [
      { crop: { originX, originY, width: cropW, height: cropH } },
      { resize: { width: 1280 } },
    ],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result?.uri || String(asset?.uri || '');
}

function GlassPanel({ children, style }) {
  return (
    <View style={[dkd_styles.panel, style]}>
      <LinearGradient colors={["rgba(255,255,255,0.08)", "rgba(255,255,255,0.03)"]} style={StyleSheet.absoluteFillObject} />
      {children}
    </View>
  );
}

function MetricCard({ icon, label, value, tone = 'cyan' }) {
  const accent = tone === 'gold' ? cityLootTheme.colors.goldSoft : tone === 'purple' ? cityLootTheme.colors.purple : cityLootTheme.colors.cyanSoft;
  return (
    <View style={dkd_styles.metricCard}>
      <View style={[dkd_styles.metricIconWrap, { borderColor: `${accent}44` }]}>
        <MaterialCommunityIcons name={icon} size={18} color={accent} />
      </View>
      <Text style={dkd_styles.metricLabel}>{label}</Text>
      <Text style={dkd_styles.metricValue}>{value}</Text>
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType = 'default', multiline = false, editable = true }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={dkd_styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(232,244,255,0.35)"
        keyboardType={keyboardType}
        multiline={multiline}
        editable={editable}
        style={[dkd_styles.input, multiline && dkd_styles.inputMultiline, !editable && dkd_styles.inputReadonly]}
      />
    </View>
  );
}

function Chip({ active, label, onPress }) {
  return (
    <Pressable onPress={onPress} style={[dkd_styles.chip, active && dkd_styles.chipActive]}>
      <Text style={[dkd_styles.chipText, active && dkd_styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function BossSourceRow({ row, active, onPress }) {
  const hasDefinition = !!row?.has_definition;
  const questionCount = Array.isArray(row?.question_set) ? row.question_set.length : 0;
  const ticketCost = Math.max(1, Number(row?.ticket_cost || 1));
  const pillStyle = row?.boss_is_active === false ? dkd_styles.statusOff : dkd_styles.statusOn;
  return (
    <Pressable onPress={onPress} style={[dkd_styles.sourceRow, active && dkd_styles.sourceRowActive]}>
      <View style={dkd_styles.sourceIconWrap}>
        {row?.art_image_url ? (
          <Image source={{ uri: row.art_image_url }} style={dkd_styles.sourceThumb} contentFit="cover" />
        ) : (
          <MaterialCommunityIcons name="robot-angry-outline" size={22} color={cityLootTheme.colors.goldSoft} />
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={dkd_styles.sourceTitle} numberOfLines={1}>{row?.drop_name || row?.title || 'Boss'}</Text>
        <Text style={dkd_styles.sourceSub} numberOfLines={2}>{hasDefinition ? 'Tanım hazır' : 'Tanım yok'} • {ticketCost} bilet • {questionCount} soru</Text>
      </View>
      <View style={[dkd_styles.statusPill, pillStyle]}>
        <Text style={dkd_styles.statusText}>{row?.boss_is_active === false ? 'Pasif' : 'Aktif'}</Text>
      </View>
    </Pressable>
  );
}

function QuestionCard({ index, item, onChange, onRemove }) {
  const opts = Array.isArray(item?.opts) ? item.opts : ['', '', '', ''];
  return (
    <View style={dkd_styles.questionCard}>
      <View style={dkd_styles.questionHead}>
        <Text style={dkd_styles.questionTitle}>Soru {index + 1}</Text>
        {index >= 3 ? <SecondaryButton label="Sil" icon="trash-can-outline" tone="ghost" size="compact" fullWidth={false} onPress={onRemove} /> : null}
      </View>
      <Field label="Soru" value={String(item?.dkd_query_value || '')} onChangeText={(dkd_query_value) => onChange({ ...item, dkd_query_value })} placeholder="Boss sorusu" multiline />
      {[0, 1, 2, 3].map((optIndex) => (
        <View key={`opt-${optIndex}`} style={dkd_styles.optionRow}>
          <Pressable onPress={() => onChange({ ...item, dkd_answer_index: optIndex })} style={[dkd_styles.answerToggle, Number(item?.dkd_answer_index || item?.[String.fromCharCode(97)] || 0) === optIndex && dkd_styles.answerToggleActive]}>
            <Text style={[dkd_styles.answerToggleText, Number(item?.dkd_answer_index || item?.[String.fromCharCode(97)] || 0) === optIndex && dkd_styles.answerToggleTextActive]}>{String.fromCharCode(65 + optIndex)}</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Field
              label={`Şık ${String.fromCharCode(65 + optIndex)}`}
              value={String(opts[optIndex] || '')}
              onChangeText={(value) => {
                const next = opts.slice();
                next[optIndex] = value;
                onChange({ ...item, opts: next });
              }}
              placeholder={`Şık ${String.fromCharCode(65 + optIndex)}`}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

function CropEditorModal({ visible, asset, onClose, onApply }) {
  const [scale, setScale] = useState(1);
  const [busy, setBusy] = useState(false);
  const anim = useRef(dkd_make_native_axis_value_pair(0, 0)).current;
  const offsetRef = useRef({ dkd_axis_left: 0, dkd_axis_top: 0 });
  const startRef = useRef({ dkd_axis_left: 0, dkd_axis_top: 0 });

  const dkd_sync_anim_offset = useCallback((dkd_offset_value) => {
    anim.setValue(dkd_make_native_axis_point(dkd_offset_value?.dkd_axis_left || 0, dkd_offset_value?.dkd_axis_top || 0));
  }, [anim]);

  const meta = useMemo(() => {
    const imgW = Math.max(1, Number(asset?.width || 1));
    const imgH = Math.max(1, Number(asset?.height || 1));
    const baseScale = Math.max(VIEWPORT_W / imgW, VIEWPORT_H / imgH);
    const displayScale = baseScale * scale;
    const renderW = imgW * displayScale;
    const renderH = imgH * displayScale;
    const maxX = Math.max(0, (renderW - VIEWPORT_W) / 2);
    const maxY = Math.max(0, (renderH - VIEWPORT_H) / 2);
    return { imgW, imgH, baseScale, displayScale, renderW, renderH, maxX, maxY };
  }, [asset?.width, asset?.height, scale]);

  const clampOffsets = useCallback((dkd_offset_value) => ({
    dkd_axis_left: clamp(dkd_offset_value.dkd_axis_left, -meta.maxX, meta.maxX),
    dkd_axis_top: clamp(dkd_offset_value.dkd_axis_top, -meta.maxY, meta.maxY),
  }), [meta.maxX, meta.maxY]);

  useEffect(() => {
    if (!visible) return;
    offsetRef.current = { dkd_axis_left: 0, dkd_axis_top: 0 };
    dkd_sync_anim_offset({ dkd_axis_left: 0, dkd_axis_top: 0 });
    setScale(1);
  }, [visible, asset?.uri, dkd_sync_anim_offset]);

  useEffect(() => {
    const clamped = clampOffsets(offsetRef.current);
    offsetRef.current = clamped;
    dkd_sync_anim_offset(clamped);
  }, [clampOffsets, dkd_sync_anim_offset]);

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      startRef.current = { ...offsetRef.current };
    },
    onPanResponderMove: (dkd_unused_value, dkd_group_value) => {
      const next = clampOffsets({ dkd_axis_left: startRef.current.dkd_axis_left + dkd_group_value.dx, dkd_axis_top: startRef.current.dkd_axis_top + dkd_group_value.dy });
      dkd_sync_anim_offset(next);
    },
    onPanResponderRelease: () => {
      const next = { dkd_axis_left: dkd_read_native_axis_horizontal(anim), dkd_axis_top: dkd_read_native_axis_vertical(anim) };
      offsetRef.current = clampOffsets(next);
      dkd_sync_anim_offset(offsetRef.current);
    },
  }), [anim, clampOffsets, dkd_sync_anim_offset]);

  async function applyCrop() {
    try {
      setBusy(true);
      const { imgW, imgH, displayScale } = meta;
      const offset = clampOffsets(offsetRef.current);
      const left = (VIEWPORT_W - imgW * displayScale) / 2 + offset.dkd_axis_left;
      const top = (VIEWPORT_H - imgH * displayScale) / 2 + offset.dkd_axis_top;
      const cropX = clamp(Math.round((0 - left) / displayScale), 0, imgW - 2);
      const cropY = clamp(Math.round((0 - top) / displayScale), 0, imgH - 2);
      const cropW = clamp(Math.round(VIEWPORT_W / displayScale), 1, imgW - cropX);
      const cropH = clamp(Math.round(VIEWPORT_H / displayScale), 1, imgH - cropY);
      const result = await ImageManipulator.manipulateAsync(
        String(asset?.uri || ''),
        [
          { crop: { originX: cropX, originY: cropY, width: cropW, height: cropH } },
          { resize: { width: 1280 } },
        ],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      onApply?.(result?.uri || String(asset?.uri || ''));
    } catch {
      Alert.alert('Boss', 'Görsel serbest kırpılırken sorun oluştu. Daha küçük bir görsel deneyebilirsin.');
    } finally {
      setBusy(false);
    }
  }

  if (!asset?.uri) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={dkd_styles.cropBackdrop}>
        <View style={dkd_styles.cropCard}>
          <Text style={dkd_styles.cropTitle}>Serbest Kırp</Text>
          <Text style={dkd_styles.cropSub}>Görseli sürükle, yakınlaştır ve boss alanına tam oturt.</Text>
          <View style={dkd_styles.cropViewport}>
            <Animated.View
              {...responder.panHandlers}
              style={{
                width: meta.renderW,
                height: meta.renderH,
                transform: [{ translateX: anim.x }, { translateY: anim.y }],
              }}
            >
              <Image source={{ uri: asset.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            </Animated.View>
            <View pointerEvents="none" style={dkd_styles.cropOverlayFrame} />
          </View>
          <View style={dkd_styles.cropHudRow}>
            <SecondaryButton label="−" onPress={() => setScale((dkd_scale_value) => clamp(Number((dkd_scale_value - 0.12).toFixed(2)), 1, 3.2))} size="compact" fullWidth={false} />
            <Text style={dkd_styles.cropZoomText}>Zoom {scale.toFixed(2)}x</Text>
            <SecondaryButton label="+" onPress={() => setScale((dkd_scale_value) => clamp(Number((dkd_scale_value + 0.12).toFixed(2)), 1, 3.2))} size="compact" fullWidth={false} />
          </View>
          <View style={dkd_styles.cropHintGrid}>
            <Text style={dkd_styles.cropHint}>• Parmağınla sürükleyerek serbest konumlandır.</Text>
            <Text style={dkd_styles.cropHint}>• + / − ile görseli yakınlaştır veya uzaklaştır.</Text>
            <Text style={dkd_styles.cropHint}>• Sonuç boss kapak alanına tam sığacak şekilde hazırlanır.</Text>
          </View>
          <View style={dkd_styles.cropActionRow}>
            <SecondaryButton label="Vazgeç" onPress={onClose} tone="ghost" size="compact" fullWidth={false} />
            <PrimaryButton label={busy ? 'Hazırlanıyor...' : 'Kırp ve Uygula'} onPress={applyCrop} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default memo(function AdminBossModal({ visible, onClose, loading, bossDefs, bossDrops, onRefresh, onSave, onDelete }) {
  const [draft, setDraft] = useState(EMPTY_FORM);
  const [editingDropId, setEditingDropId] = useState('');
  const [directBossDrops, setDirectBossDrops] = useState([]);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [cropEditorOpen, setCropEditorOpen] = useState(false);
  const [cropAsset, setCropAsset] = useState(null);

  const refreshBossSources = useCallback(async (force = true) => {
    setSourceLoading(true);
    try {
      const [{ data: dropRows, error: dropErr }] = await Promise.all([
        fetchAllDropsForAdmin(),
        Promise.resolve(onRefresh?.(force)),
      ]);
      if (dropErr) throw dropErr;
      const rows = (Array.isArray(dropRows) ? dropRows : []).filter(isBossLikeDrop);
      setDirectBossDrops(rows);
      return rows;
    } catch (dkd_error_value) {
      Alert.alert('Boss', String(dkd_error_value?.message || dkd_error_value || 'Boss sandıkları yüklenemedi.'));
      return [];
    } finally {
      setSourceLoading(false);
    }
  }, [onRefresh]);

  useEffect(() => {
    if (!visible) return;
    setDraft(EMPTY_FORM);
    setEditingDropId('');
    refreshBossSources(true);
  }, [visible, refreshBossSources]);

  const defs = useMemo(() => (Array.isArray(bossDefs) ? bossDefs : []), [bossDefs]);
  const drops = useMemo(() => {
    const direct = Array.isArray(directBossDrops) ? directBossDrops.filter(isBossLikeDrop) : [];
    if (direct.length) return direct;
    return (Array.isArray(bossDrops) ? bossDrops : []).filter(isBossLikeDrop);
  }, [bossDrops, directBossDrops]);

  const mergedRows = useMemo(() => drops.map((drop) => {
    const found = defs.find((row) => String(row?.drop_id) === String(drop?.id));
    return {
      ...(found || {}),
      drop_id: String(drop?.id || found?.drop_id || ''),
      drop_name: drop?.name || found?.title || 'Boss',
      title: found?.title || drop?.name || 'Boss',
      ticket_cost: found?.ticket_cost || 1,
      question_set: Array.isArray(found?.question_set) ? found.question_set : [],
      has_definition: !!found,
      boss_is_active: found ? (found?.is_active !== false) : (drop?.is_active !== false),
      art_image_url: String(found?.art_image_url || ''),
    };
  }), [defs, drops]);

  const activeCount = useMemo(() => mergedRows.filter((row) => row?.boss_is_active !== false).length, [mergedRows]);
  const definedCount = useMemo(() => mergedRows.filter((row) => row?.has_definition).length, [mergedRows]);

  function resetDraft() {
    setDraft(EMPTY_FORM);
    setEditingDropId('');
    setCropEditorOpen(false);
    setCropAsset(null);
  }

  async function pickImageManual() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission?.granted === false) {
        Alert.alert('Boss', 'Galeri izni verilmeden görsel seçilemez.');
        return;
      }
      const result = await launchBossPicker();
      if (result?.canceled) return;
      const asset = Array.isArray(result?.assets) ? result.assets[0] : null;
      if (!asset?.uri) return;
      setCropAsset(asset);
      setCropEditorOpen(true);
    } catch {
      Alert.alert('Boss', 'Boss görseli seçilirken sorun oluştu.');
    }
  }

  async function pickImageAuto() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission?.granted === false) {
        Alert.alert('Boss', 'Galeri izni verilmeden görsel seçilemez.');
        return;
      }
      const result = await launchBossPicker();
      if (result?.canceled) return;
      const asset = Array.isArray(result?.assets) ? result.assets[0] : null;
      if (!asset?.uri) return;
      const preparedUri = await prepareAutoBossImage(asset);
      setDraft((prev) => ({ ...prev, art_image_url: preparedUri }));
      Alert.alert('Boss', 'Görsel otomatik 16:9 kapak olarak hazırlandı.');
    } catch {
      Alert.alert('Boss', 'Otomatik kapak hazırlanırken sorun oluştu.');
    }
  }

  function hydrateFromRow(row) {
    setEditingDropId(String(row?.drop_id || ''));
    setDraft({
      drop_id: String(row?.drop_id || ''),
      boss_key: String(row?.boss_key || `boss-${String(row?.drop_id || '').slice(0, 8)}`),
      title: String(row?.title || row?.drop_name || 'Boss'),
      subtitle: String(row?.subtitle || ''),
      description: String(row?.description || ''),
      reward_summary: String(row?.reward_summary || ''),
      ticket_cost: String(row?.ticket_cost ?? 1),
      boss_hp_display: String(row?.boss_hp_display ?? 985000),
      art_image_url: String(row?.art_image_url || ''),
      is_active: row?.boss_is_active !== false,
      question_set: normalizeQuestionSet(row?.question_set),
    });
  }

  function patchQuestion(index, nextQ) {
    setDraft((prev) => {
      const set = Array.isArray(prev.question_set) ? prev.question_set.slice() : [];
      set[index] = nextQ;
      return { ...prev, question_set: set };
    });
  }

  function removeQuestion(index) {
    setDraft((prev) => ({ ...prev, question_set: (prev.question_set || []).filter((dkd_unused_value, dkd_index_value) => dkd_index_value !== index) }));
  }

  function addQuestion() {
    setDraft((prev) => ({ ...prev, question_set: [...(prev.question_set || []), { ...EMPTY_Q }] }));
  }

  async function saveBoss() {
    const cleanQuestions = (draft.question_set || [])
      .map((dkd_query_value) => ({
        dkd_query_value: String(dkd_query_value?.dkd_query_value || '').trim(),
        opts: Array.isArray(dkd_query_value?.opts) ? dkd_query_value.opts.map((item) => String(item || '').trim()) : ['', '', '', ''],
        dkd_answer_index: clamp(Number(dkd_query_value?.dkd_answer_index || dkd_query_value?.[String.fromCharCode(97)] || 0), 0, 3),
      }))
      .filter((dkd_query_value) => dkd_query_value.dkd_query_value && dkd_query_value.opts.every(Boolean));

    if (!draft.drop_id) return Alert.alert('Boss', 'Önce bir boss sandığı seç.');
    if (String(draft.title || '').trim().length < 2) return Alert.alert('Boss', 'Boss adı gerekli.');
    if (cleanQuestions.length < 3) return Alert.alert('Boss', 'En az 3 tam soru gerekli.');

    const result = await onSave?.({
      ...draft,
      ticket_cost: Number(draft.ticket_cost || 1),
      boss_hp_display: Math.max(1, Number(draft.boss_hp_display || 985000)),
      question_set: cleanQuestions,
    });
    if (result?.ok) resetDraft();
  }

  const selectedSource = mergedRows.find((row) => String(row?.drop_id) === String(draft.drop_id || editingDropId));

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeScreen style={{ flex: 1, backgroundColor: cityLootTheme.colors.bgTop }}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={[cityLootTheme.colors.bgTop, cityLootTheme.colors.bgMid, cityLootTheme.colors.bgBottom]} style={dkd_styles.screen}>
          <ScrollView contentContainerStyle={dkd_styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <GlassPanel style={dkd_styles.heroPanel}>
              <View style={dkd_styles.heroRow}>
                <View style={dkd_styles.heroIconWrap}><MaterialCommunityIcons name="robot-angry-outline" size={28} color={cityLootTheme.colors.goldSoft} /></View>
                <View style={dkd_styles.heroCopy}>
                  <Text style={dkd_styles.kicker}>ADMIN BOSS CONTROL</Text>
                  <Text style={dkd_styles.title}>Boss Komuta Merkezi</Text>
                </View>
                <SecondaryButton label="Kapat" onPress={onClose} size="compact" fullWidth={false} />
              </View>
              <View style={dkd_styles.metricRow}>
                <MetricCard icon="crown-outline" label="Boss Drop" value={String(mergedRows.length)} />
                <MetricCard icon="check-decagram-outline" label="Aktif" value={String(activeCount)} tone="gold" />
                <MetricCard icon="database-outline" label="Tanımlı" value={String(definedCount)} tone="purple" />
              </View>
            </GlassPanel>

            <GlassPanel style={{ marginTop: 14 }}>
              <View style={dkd_styles.sectionHead}>
                <Text style={dkd_styles.sectionTitle}>Boss Sandıkları</Text>
                <SecondaryButton label="Yenile" icon="refresh" onPress={() => refreshBossSources(true)} size="compact" fullWidth={false} />
              </View>
              {mergedRows.map((row) => (
                <View key={String(row?.drop_id)} style={{ marginTop: 10 }}>
                  <BossSourceRow row={row} active={String(editingDropId || draft.drop_id) === String(row?.drop_id)} onPress={() => hydrateFromRow(row)} />
                </View>
              ))}
              {!loading && !mergedRows.length ? <Text style={dkd_styles.emptyText}>Henüz boss sandığı yok.</Text> : null}
              {(loading || sourceLoading) ? <ActivityIndicator color={cityLootTheme.colors.cyanSoft} style={{ marginTop: 16 }} /> : null}
            </GlassPanel>

            <GlassPanel style={{ marginTop: 14 }}>
              <View style={dkd_styles.sectionHead}>
                <Text style={dkd_styles.sectionTitle}>{draft.drop_id ? 'Boss Düzenle' : 'Boss İçeriği Oluştur'}</Text>
                <SecondaryButton label="Temizle" icon="broom" onPress={resetDraft} size="compact" fullWidth={false} />
              </View>

              <Field label="Bağlı Boss Sandığı" value={selectedSource?.drop_name || ''} onChangeText={() => {}} placeholder="Üstten boss seç" editable={false} />
              <View style={dkd_styles.grid2}>
                <Field label="Boss Adı" value={draft.title} onChangeText={(title) => setDraft((prev) => ({ ...prev, title }))} placeholder="Örn: Sincan Boss" />
                <Field label="Boss Key" value={draft.boss_key} onChangeText={(boss_key) => setDraft((prev) => ({ ...prev, boss_key }))} placeholder="boss-sincan" />
              </View>
              <Field label="Alt Başlık" value={draft.subtitle} onChangeText={(subtitle) => setDraft((prev) => ({ ...prev, subtitle }))} placeholder="Boss açıklama satırı" />
              <Field label="Açıklama" value={draft.description} onChangeText={(description) => setDraft((prev) => ({ ...prev, description }))} placeholder="Giriş ekranı açıklaması" multiline />
              <Field label="Ödül Özeti" value={draft.reward_summary} onChangeText={(reward_summary) => setDraft((prev) => ({ ...prev, reward_summary }))} placeholder="Token • Shard • Kart • Bilet" />
              <View style={dkd_styles.grid2}>
                <Field label="Giriş Bileti" value={draft.ticket_cost} onChangeText={(ticket_cost) => setDraft((prev) => ({ ...prev, ticket_cost }))} placeholder="1" keyboardType="number-pad" />
                <Field label="Boss HP" value={draft.boss_hp_display} onChangeText={(boss_hp_display) => setDraft((prev) => ({ ...prev, boss_hp_display }))} placeholder="985000" keyboardType="number-pad" />
              </View>
              <View style={{ marginTop: 12 }}>
                <Text style={dkd_styles.fieldLabel}>Durum</Text>
                <View style={dkd_styles.statusRow}>
                  <Chip label="Aktif" active={draft.is_active === true} onPress={() => setDraft((prev) => ({ ...prev, is_active: true }))} />
                  <Chip label="Pasif" active={draft.is_active === false} onPress={() => setDraft((prev) => ({ ...prev, is_active: false }))} />
                </View>
              </View>

              <Text style={dkd_styles.fieldLabel}>Boss Görseli</Text>
              <View style={dkd_styles.imageRow}>
                <Pressable onPress={pickImageManual} style={dkd_styles.imagePickerBtn}>
                  {draft.art_image_url ? <Image source={{ uri: draft.art_image_url }} style={dkd_styles.previewImage} contentFit="cover" /> : <MaterialCommunityIcons name="image-plus-outline" size={28} color={cityLootTheme.colors.cyanSoft} />}
                </Pressable>
                <View style={{ flex: 1 }}>
                  <SecondaryButton label="Serbest Kırp" icon="crop-free" onPress={pickImageManual} size="compact" fullWidth={false} />
                  <SecondaryButton label="Hızlı 16:9" icon="crop-landscape" tone="ghost" onPress={pickImageAuto} size="compact" fullWidth={false} style={{ marginTop: 10 }} />
                  {draft.art_image_url ? <SecondaryButton label="Görseli Kaldır" icon="trash-can-outline" tone="ghost" onPress={() => setDraft((prev) => ({ ...prev, art_image_url: '' }))} size="compact" fullWidth={false} style={{ marginTop: 10 }} /> : null}
                </View>
              </View>
            </GlassPanel>

            <GlassPanel style={{ marginTop: 14 }}>
              <View style={dkd_styles.sectionHead}>
                <Text style={dkd_styles.sectionTitle}>Boss Soru Seti</Text>
                <SecondaryButton label="Soru Ekle" icon="plus" onPress={addQuestion} size="compact" fullWidth={false} />
              </View>
              {(draft.question_set || []).map((item, index) => (
                <QuestionCard key={`question-${index}`} index={index} item={item} onChange={(next) => patchQuestion(index, next)} onRemove={() => removeQuestion(index)} />
              ))}
            </GlassPanel>

            <View style={dkd_styles.actionRow}>
              <PrimaryButton label={editingDropId ? 'Boss Güncelle' : 'Boss Kaydet'} icon="content-save-outline" onPress={saveBoss} style={dkd_styles.flexBtn} />
              {draft.drop_id ? <SecondaryButton label="Tanımı Sil" icon="trash-can-outline" tone="ghost" onPress={() => onDelete?.(draft.drop_id)} size="compact" fullWidth={false} style={dkd_styles.flexBtn} /> : null}
            </View>
          </ScrollView>
        </LinearGradient>
        <CropEditorModal
          visible={cropEditorOpen}
          asset={cropAsset}
          onClose={() => {
            setCropEditorOpen(false);
            setCropAsset(null);
          }}
          onApply={(uri) => {
            setDraft((prev) => ({ ...prev, art_image_url: uri }));
            setCropEditorOpen(false);
            setCropAsset(null);
            Alert.alert('Boss', 'Görsel serbest kırpma ile hazırlandı.');
          }}
        />
      </SafeScreen>
    </Modal>
  );
});

const dkd_styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 14, paddingBottom: 34 },
  panel: { borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(9,16,28,0.82)', padding: 16, overflow: 'hidden' },
  heroPanel: { paddingTop: 18 },
  heroRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  heroIconWrap: { width: 84, height: 84, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.05)' },
  heroCopy: { flex: 1, minWidth: 0, paddingTop: 4 },
  kicker: { color: cityLootTheme.colors.goldSoft, fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: cityLootTheme.colors.text, fontSize: 26, lineHeight: 32, fontWeight: '900', marginTop: 6 },
  metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  metricCard: { flexBasis: '30%', minWidth: 100, flexGrow: 1, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.04)', paddingHorizontal: 14, paddingVertical: 14 },
  metricIconWrap: { width: 38, height: 38, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  metricLabel: { color: cityLootTheme.colors.textMuted, fontSize: 11, fontWeight: '800', marginTop: 10 },
  metricValue: { color: cityLootTheme.colors.text, fontSize: 24, fontWeight: '900', marginTop: 6 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4 },
  sectionTitle: { color: cityLootTheme.colors.text, fontSize: 18, fontWeight: '900' },
  fieldLabel: { color: cityLootTheme.colors.textMuted, fontSize: 12, fontWeight: '800', marginTop: 14, marginBottom: 8 },
  input: { minHeight: 54, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.05)', color: cityLootTheme.colors.text, paddingHorizontal: 16, fontSize: 16, fontWeight: '800', marginTop: 0 },
  inputReadonly: { opacity: 0.9 },
  inputMultiline: { minHeight: 90, textAlignVertical: 'top', paddingTop: 14 },
  grid2: { flexDirection: 'row', gap: 12 },
  chip: { minHeight: 48, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: cityLootTheme.colors.cyanSoft, borderColor: cityLootTheme.colors.cyanSoft },
  chipText: { color: cityLootTheme.colors.text, fontSize: 14, fontWeight: '900' },
  chipTextActive: { color: '#04111C' },
  sourceRow: { borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(10,20,34,0.90)', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  sourceRowActive: { borderColor: 'rgba(243,199,119,0.55)', backgroundColor: 'rgba(243,199,119,0.06)' },
  sourceIconWrap: { width: 58, height: 58, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  sourceThumb: { width: '100%', height: '100%' },
  sourceTitle: { color: cityLootTheme.colors.text, fontSize: 18, fontWeight: '900' },
  sourceSub: { color: cityLootTheme.colors.textSoft, fontSize: 14, fontWeight: '700', marginTop: 4, lineHeight: 20 },
  statusPill: { minWidth: 84, minHeight: 40, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, borderWidth: 1 },
  statusOn: { backgroundColor: 'rgba(68,221,168,0.16)', borderColor: 'rgba(68,221,168,0.28)' },
  statusOff: { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.12)' },
  statusText: { color: cityLootTheme.colors.text, fontSize: 14, fontWeight: '900' },
  statusRow: { flexDirection: 'row', gap: 10 },
  imageRow: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  imagePickerBtn: { width: 112, height: 112, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  previewImage: { width: '100%', height: '100%' },
  questionCard: { marginTop: 12, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.04)', padding: 14 },
  questionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  questionTitle: { color: cityLootTheme.colors.text, fontSize: 16, fontWeight: '900' },
  optionRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 10 },
  answerToggle: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  answerToggleActive: { backgroundColor: cityLootTheme.colors.cyanSoft, borderColor: cityLootTheme.colors.cyanSoft },
  answerToggleText: { color: cityLootTheme.colors.text, fontSize: 16, fontWeight: '900' },
  answerToggleTextActive: { color: '#04111C' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14, flexWrap: 'wrap' },
  flexBtn: { flexGrow: 1, flexBasis: 0 },
  emptyText: { color: cityLootTheme.colors.textSoft, textAlign: 'center', paddingVertical: 20, fontWeight: '700' },
  cropBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.84)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  cropCard: { width: '100%', maxWidth: 390, borderRadius: 26, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: '#09111B', padding: 18 },
  cropTitle: { color: cityLootTheme.colors.text, fontSize: 22, fontWeight: '900' },
  cropSub: { color: cityLootTheme.colors.textSoft, fontSize: 13, lineHeight: 19, marginTop: 8 },
  cropViewport: { width: VIEWPORT_W, height: VIEWPORT_H, borderRadius: 22, overflow: 'hidden', alignSelf: 'center', marginTop: 16, backgroundColor: '#050A12', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', justifyContent: 'center', alignItems: 'center' },
  cropOverlayFrame: { ...StyleSheet.absoluteFillObject, borderWidth: 2, borderColor: 'rgba(255,255,255,0.88)', borderRadius: 22, shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } },
  cropHudRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 14 },
  cropZoomText: { color: cityLootTheme.colors.text, fontSize: 14, fontWeight: '900', minWidth: 96, textAlign: 'center' },
  cropHintGrid: { marginTop: 14, gap: 6 },
  cropHint: { color: cityLootTheme.colors.textSoft, fontSize: 12, lineHeight: 18 },
  cropActionRow: { flexDirection: 'row', gap: 10, marginTop: 16, alignItems: 'center' },
});
