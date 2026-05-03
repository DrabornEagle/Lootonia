import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import { trDropType, formatInt } from '../../utils/text';
import SafeScreen from '../../components/layout/SafeScreen';
import { cityLootTheme } from '../../theme/cityLootTheme';

const DROP_TYPES = ['qr', 'map', 'boss', 'cafe', 'restaurant', 'metro', 'park', 'mall'];
const EMPTY = {
  id: null,
  name: '',
  type: 'qr',
  is_active: true,
  lat: '',
  lng: '',
  radius_m: '60',
  cooldown_seconds: '900',
  qr_secret: '',
};

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
    : tone === 'green'
      ? cityLootTheme.colors.green
      : cityLootTheme.colors.cyanSoft;

  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIconWrap, { borderColor: `${accent}44` }]}> 
        <MaterialCommunityIcons name={icon} size={18} color={accent} />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function Chip({ active, label, icon, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      {!!icon && <MaterialCommunityIcons name={icon} size={16} color={active ? '#04111C' : cityLootTheme.colors.cyanSoft} />}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType = 'default', multiline = false }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(232,244,255,0.35)"
        keyboardType={keyboardType}
        multiline={multiline}
        style={[styles.input, multiline && styles.inputMultiline]}
      />
    </View>
  );
}

function DropRow({ item, onEdit, onDelete }) {
  const active = item?.is_active !== false;
  return (
    <View style={styles.dropRow}>
      <View style={styles.dropIconWrap}>
        <MaterialCommunityIcons
          name={String(item?.type || '') === 'boss' ? 'crown-outline' : String(item?.type || '') === 'qr' ? 'qrcode' : 'map-marker-outline'}
          size={22}
          color={cityLootTheme.colors.cyanSoft}
        />
      </View>

      <View style={styles.dropCopy}>
        <View style={styles.dropTitleRow}>
          <Text style={styles.dropTitle} numberOfLines={1}>{item?.name || 'Drop'}</Text>
          <View style={[styles.statePill, active ? styles.statePillOn : styles.statePillOff]}>
            <Text style={styles.statePillText}>{active ? 'Aktif' : 'Pasif'}</Text>
          </View>
        </View>
        <Text style={styles.dropMeta} numberOfLines={2}>{trDropType(item?.type)} • Radius {Number(item?.radius_m || 0)}m • Cooldown {Number(item?.cooldown_seconds || 0)}s</Text>
        <Text style={styles.dropCoords} numberOfLines={1}>{item?.lat}, {item?.lng}</Text>
        {!!item?.qr_secret ? <Text style={styles.dropSecret} numberOfLines={1}>Secret: {item.qr_secret}</Text> : null}
      </View>

      <View style={styles.dropActions}>
        <Pressable onPress={() => onEdit?.(item)} style={styles.actionBtn}><MaterialCommunityIcons name="pencil-outline" size={18} color="#FFF" /></Pressable>
        <Pressable onPress={() => onDelete?.(item?.id)} style={[styles.actionBtn, styles.deleteBtn]}><MaterialCommunityIcons name="trash-can-outline" size={18} color="#FFF" /></Pressable>
      </View>
    </View>
  );
}

export default function AdminDropsModal({ visible, onClose, loading, drops, onRefresh, onUpsert, onDelete, currentLoc }) {
  const [draft, setDraft] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (!visible) return;
    setDraft(EMPTY);
    setEditingId(null);
    onRefresh?.(true);
  }, [visible, onRefresh]);

  const rows = useMemo(() => (Array.isArray(drops) ? drops : []), [drops]);
  const activeCount = useMemo(() => rows.filter((row) => row?.is_active !== false).length, [rows]);
  const qrCount = useMemo(() => rows.filter((row) => String(row?.type || '') === 'qr').length, [rows]);
  const bossCount = useMemo(() => rows.filter((row) => String(row?.type || '') === 'boss').length, [rows]);

  function normalizeDecimal(dkd_value) {
    return String(dkd_value == null ? '' : dkd_value).trim().replace(',', '.');
  }

  function resetDraft() {
    setDraft(EMPTY);
    setEditingId(null);
  }

  function genSecret(dkd_iteration_value = 28) {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz';
    let out = '';
    for (let dkd_index_value = 0; dkd_index_value < dkd_iteration_value; dkd_index_value += 1) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  function pickDrop(item) {
    setEditingId(String(item?.id || ''));
    setDraft({
      id: item?.id,
      name: String(item?.name || ''),
      type: String(item?.type || 'qr'),
      is_active: item?.is_active !== false,
      lat: item?.lat == null ? '' : String(item.lat),
      lng: item?.lng == null ? '' : String(item.lng),
      radius_m: item?.radius_m == null ? '60' : String(item.radius_m),
      cooldown_seconds: item?.cooldown_seconds == null ? '900' : String(item.cooldown_seconds),
      qr_secret: String(item?.qr_secret || ''),
    });
  }

  function useMyLocation() {
    if (!currentLoc || currentLoc.lat == null || currentLoc.lng == null) {
      Alert.alert('Konum', 'Önce canlı haritada konum alınmalı.');
      return;
    }
    setDraft((dkd_previous_drop_draft) => ({ ...dkd_previous_drop_draft, lat: String(currentLoc.lat), lng: String(currentLoc.lng) }));
  }

  async function save() {
    const payload = {
      id: draft.id,
      name: String(draft.name || '').trim(),
      type: String(draft.type || 'qr').toLowerCase(),
      is_active: !!draft.is_active,
      lat: Number(normalizeDecimal(draft.lat)),
      lng: Number(normalizeDecimal(draft.lng)),
      radius_m: Number(normalizeDecimal(draft.radius_m)),
      cooldown_seconds: Number(normalizeDecimal(draft.cooldown_seconds)),
      qr_secret: String(draft.qr_secret || '').trim() || null,
    };

    if (!payload.name) return Alert.alert('Eksik', 'Drop adı gerekli.');
    if (!DROP_TYPES.includes(payload.type)) return Alert.alert('Hata', 'Geçersiz drop türü.');
    if (!Number.isFinite(payload.lat) || payload.lat < -90 || payload.lat > 90) return Alert.alert('Hata', 'Lat geçerli olmalı.');
    if (!Number.isFinite(payload.lng) || payload.lng < -180 || payload.lng > 180) return Alert.alert('Hata', 'Lng geçerli olmalı.');
    if (!Number.isFinite(payload.radius_m) || payload.radius_m <= 0) return Alert.alert('Hata', 'Radius 1m+ olmalı.');
    if (!Number.isFinite(payload.cooldown_seconds) || payload.cooldown_seconds < 0) return Alert.alert('Hata', 'Cooldown 0+ olmalı.');
    if (payload.type === 'qr' && !payload.qr_secret) return Alert.alert('Eksik', 'QR Sandığı için secret zorunlu.');

    const res = await onUpsert?.(payload);
    if (res?.ok) resetDraft();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeScreen style={{ flex: 1, backgroundColor: cityLootTheme.colors.bgTop }}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={[cityLootTheme.colors.bgTop, cityLootTheme.colors.bgMid, cityLootTheme.colors.bgBottom]} style={styles.screen}>
          <FlatList
            data={loading ? [] : rows}
            keyExtractor={(item, index) => `${String(item?.id || 'drop')}-${index}`}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={(
              <View>
                <GlassPanel style={styles.heroPanel}>
                  <View style={styles.heroRow}>
                    <View style={styles.heroIconWrap}>
                      <MaterialCommunityIcons name="map-marker-path" size={26} color={cityLootTheme.colors.goldSoft} />
                    </View>
                    <View style={styles.heroCopy}>
                      <Text style={styles.kicker}>ADMIN DROP CONTROL</Text>
                      <Text style={styles.title}>Saha Drop Kontrolü</Text>
                    </View>
                    <SecondaryButton label="Kapat" onPress={onClose} size="compact" fullWidth={false} style={styles.headerButton} />
                  </View>

                  <View style={styles.metricRow}>
                    <MetricCard icon="layers-triple-outline" label="Toplam Drop" value={formatInt(rows.length)} />
                    <MetricCard icon="check-decagram-outline" label="Aktif" value={formatInt(activeCount)} tone="green" />
                    <MetricCard icon="crown-outline" label="Boss" value={formatInt(bossCount)} tone="gold" />
                    <MetricCard icon="qrcode" label="QR" value={formatInt(qrCount)} tone="gold" />
                  </View>
                </GlassPanel>

                <GlassPanel style={{ marginTop: 14 }}>
                  <View style={styles.sectionHead}>
                    <Text style={styles.sectionTitle}>{editingId ? 'Drop Düzenle' : 'Yeni Saha Noktası'}</Text>
                    <SecondaryButton label="Yeni" onPress={resetDraft} size="compact" fullWidth={false} style={styles.rowButton} />
                  </View>

                  <Field label="Drop Adı" value={draft.name} onChangeText={(dkd_drop_name_value) => setDraft((dkd_previous_drop_draft) => ({ ...dkd_previous_drop_draft, name: dkd_drop_name_value }))} placeholder="Örn: Eryaman Prime Metro Çıkışı" />

                  <Text style={styles.fieldLabel}>Drop Türü</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRowContent}>
                    {DROP_TYPES.map((item) => (
                      <Chip
                        key={item}
                        active={draft.type === item}
                        label={trDropType(item)}
                        icon={item === 'boss' ? 'crown' : item === 'qr' ? 'qrcode' : 'map-marker'}
                        onPress={() => setDraft((dkd_previous_drop_draft) => ({ ...dkd_previous_drop_draft, type: item }))}
                      />
                    ))}
                  </ScrollView>

                  <View style={styles.toggleRow}>
                    <View style={{ flex: 1, paddingRight: 14 }}>
                      <Text style={styles.toggleTitle}>Aktif Durum</Text>
                    </View>
                    <Switch
                      value={!!draft.is_active}
                      onValueChange={(dkd_switch_value) => setDraft((dkd_previous_drop_draft) => ({ ...dkd_previous_drop_draft, is_active: !!dkd_switch_value }))}
                      thumbColor={draft.is_active ? cityLootTheme.colors.cyanSoft : '#B0B8C3'}
                      trackColor={{ false: 'rgba(255,255,255,0.14)', true: 'rgba(103,227,255,0.36)' }}
                    />
                  </View>

                  <View style={styles.grid2}>
                    <Field label="Lat" value={draft.lat} onChangeText={(dkd_lat_value) => setDraft((dkd_previous_drop_draft) => ({ ...dkd_previous_drop_draft, lat: dkd_lat_value }))} placeholder="39.92077" keyboardType="decimal-pad" />
                    <Field label="Lng" value={draft.lng} onChangeText={(dkd_lng_value) => setDraft((dkd_previous_drop_draft) => ({ ...dkd_previous_drop_draft, lng: dkd_lng_value }))} placeholder="32.85411" keyboardType="decimal-pad" />
                  </View>

                  <View style={styles.grid2}>
                    <Field label="Radius (m)" value={draft.radius_m} onChangeText={(dkd_radius_meter_value) => setDraft((dkd_previous_drop_draft) => ({ ...dkd_previous_drop_draft, radius_m: dkd_radius_meter_value }))} placeholder="60" keyboardType="number-pad" />
                    <Field label="Cooldown (sn)" value={draft.cooldown_seconds} onChangeText={(dkd_cooldown_second_value) => setDraft((dkd_previous_drop_draft) => ({ ...dkd_previous_drop_draft, cooldown_seconds: dkd_cooldown_second_value }))} placeholder="900" keyboardType="number-pad" />
                  </View>

                  {draft.type === 'qr' ? (
                    <Field label="QR Secret" value={draft.qr_secret} onChangeText={(dkd_qr_secret_value) => setDraft((dkd_previous_drop_draft) => ({ ...dkd_previous_drop_draft, qr_secret: dkd_qr_secret_value }))} placeholder="QR secret" />
                  ) : null}

                  <View style={styles.actionRow}>
                    <SecondaryButton label="Konumumu Al" icon="crosshairs-gps" onPress={useMyLocation} size="compact" fullWidth={false} style={styles.flexBtn} />
                    {draft.type === 'qr' ? (
                      <SecondaryButton label="Secret Üret" icon="refresh" onPress={() => setDraft((dkd_previous_drop_draft) => ({ ...dkd_previous_drop_draft, qr_secret: genSecret() }))} size="compact" fullWidth={false} style={styles.flexBtn} />
                    ) : null}
                  </View>

                  <View style={styles.actionRow}>
                    <PrimaryButton label={editingId ? 'Güncelle' : 'Kaydet'} icon="content-save-outline" onPress={save} style={styles.flexBtn} />
                    {!!editingId ? <SecondaryButton label="Temizle" icon="broom" tone="ghost" onPress={resetDraft} size="compact" fullWidth={false} style={styles.flexBtn} /> : null}
                  </View>
                </GlassPanel>

                <View style={styles.listHead}>
                  <Text style={styles.sectionTitle}>Kayıtlı Drop Listesi</Text>
                  <SecondaryButton label="Yenile" onPress={() => onRefresh?.(true)} size="compact" fullWidth={false} style={styles.rowButton} />
                </View>
              </View>
            )}
            renderItem={({ item }) => <DropRow item={item} onEdit={pickDrop} onDelete={onDelete} />}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            ListEmptyComponent={loading ? <ActivityIndicator color={cityLootTheme.colors.cyanSoft} style={{ marginTop: 24 }} /> : <Text style={styles.emptyText}>Kayıtlı drop yok.</Text>}
          />
        </LinearGradient>
      </SafeScreen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 14, paddingBottom: 34 },
  panel: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(9,16,28,0.82)',
    padding: 16,
    overflow: 'hidden',
  },
  heroPanel: { paddingTop: 18 },
  heroRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  heroIconWrap: {
    width: 84, height: 84, borderRadius: 26, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.05)',
  },
  heroCopy: { flex: 1, minWidth: 0, paddingTop: 4 },
  kicker: { color: cityLootTheme.colors.goldSoft, fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: cityLootTheme.colors.text, fontSize: 26, lineHeight: 32, fontWeight: '900', marginTop: 6 },
  headerButton: { marginTop: 2 },
  metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  metricCard: {
    flexBasis: '23%', minWidth: 96, flexGrow: 1,
    borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)', paddingHorizontal: 14, paddingVertical: 14,
  },
  metricIconWrap: { width: 38, height: 38, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  metricLabel: { color: cityLootTheme.colors.textMuted, fontSize: 11, fontWeight: '800', marginTop: 10 },
  metricValue: { color: cityLootTheme.colors.text, fontSize: 24, fontWeight: '900', marginTop: 6 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  listHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 10 },
  sectionTitle: { color: cityLootTheme.colors.text, fontSize: 18, fontWeight: '900' },
  rowButton: { minWidth: 96 },
  fieldWrap: { flex: 1 },
  fieldLabel: { color: cityLootTheme.colors.textMuted, fontSize: 12, fontWeight: '800', marginTop: 14, marginBottom: 8 },
  input: {
    minHeight: 54, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.05)', color: cityLootTheme.colors.text,
    paddingHorizontal: 16, fontSize: 16, fontWeight: '800',
  },
  inputMultiline: { minHeight: 90, textAlignVertical: 'top', paddingTop: 14 },
  chipRowContent: { paddingTop: 6, paddingBottom: 2, gap: 10 },
  chip: {
    minHeight: 48, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.05)',
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  chipActive: { backgroundColor: cityLootTheme.colors.cyanSoft, borderColor: cityLootTheme.colors.cyanSoft },
  chipText: { color: cityLootTheme.colors.text, fontSize: 15, fontWeight: '900' },
  chipTextActive: { color: '#04111C' },
  toggleRow: {
    marginTop: 16, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 16, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  toggleTitle: { color: cityLootTheme.colors.text, fontSize: 16, fontWeight: '900' },
  toggleSub: { color: cityLootTheme.colors.textSoft, fontSize: 13, lineHeight: 19, marginTop: 4 },
  grid2: { flexDirection: 'row', gap: 12 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14, flexWrap: 'wrap' },
  flexBtn: { flexGrow: 1, flexBasis: 0 },
  dropRow: {
    borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(10,20,34,0.90)',
    padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12,
  },
  dropIconWrap: { width: 56, height: 56, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  dropCopy: { flex: 1, minWidth: 0 },
  dropTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dropTitle: { flex: 1, color: cityLootTheme.colors.text, fontSize: 18, fontWeight: '900' },
  statePill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1 },
  statePillOn: { backgroundColor: 'rgba(82,216,167,0.16)', borderColor: 'rgba(82,216,167,0.36)' },
  statePillOff: { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.14)' },
  statePillText: { color: cityLootTheme.colors.text, fontSize: 12, fontWeight: '900' },
  dropMeta: { color: cityLootTheme.colors.cyanSoft, fontSize: 14, fontWeight: '800', marginTop: 6 },
  dropCoords: { color: cityLootTheme.colors.textSoft, fontSize: 13, fontWeight: '700', marginTop: 6 },
  dropSecret: { color: cityLootTheme.colors.goldSoft, fontSize: 13, fontWeight: '700', marginTop: 6 },
  dropActions: { gap: 10 },
  actionBtn: { width: 46, height: 46, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { backgroundColor: 'rgba(255,94,120,0.14)', borderColor: 'rgba(255,94,120,0.28)' },
  emptyText: { color: cityLootTheme.colors.textSoft, textAlign: 'center', paddingVertical: 32, fontWeight: '700' },
});
