import React, { memo, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import SafeScreen from '../../components/layout/SafeScreen';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import { canUseRemotePush } from '../../services/notificationService';
import { cityLootTheme } from '../../theme/cityLootTheme';

const SENDER_NAME = 'DrabornEagle';
const AUDIENCES = [
  { key: 'everyone', label: 'Herkes' },
  { key: 'new', label: 'Yeni' },
  { key: 'courier', label: 'Kurye' },
  { key: 'admin', label: 'Admin' },
];
const TARGETS = [
  { key: 'map', label: 'Harita' },
  { key: 'tasks', label: 'Görevler' },
  { key: 'leader', label: 'Liderlik' },
  { key: 'market', label: 'Market' },
  { key: 'collection', label: 'Koleksiyon' },
  { key: 'courier', label: 'Kurye' },
  { key: 'ally', label: 'Sohbet' },
  { key: 'admin', label: 'Admin' },
];

const dkd_template_placeholder_list = [
  '{{merchant_name}}',
  '{{product_title}}',
  '{{pickup}}',
  '{{dropoff}}',
  '{{sender_name}}',
  '{{card_name}}',
  '{{fee_tl}}',
];

const SegButton = memo(function SegButton({ active, label, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={[dkd_styles.seg, active && dkd_styles.segOn]}>
      <Text style={[dkd_styles.segText, active && dkd_styles.segTextOn]}>{label}</Text>
    </TouchableOpacity>
  );
});

function StatCard({ label, value, accent = cityLootTheme.colors.cyanSoft }) {
  return (
    <View style={dkd_styles.statCard}>
      <Text style={dkd_styles.statLabel}>{label}</Text>
      <Text style={[dkd_styles.statValue, { color: accent }]}>{value}</Text>
    </View>
  );
}

function dkd_pick_first_template_key(dkd_template_rows_value) {
  return Array.isArray(dkd_template_rows_value) && dkd_template_rows_value.length
    ? String(dkd_template_rows_value[0]?.dkd_template_key || '')
    : '';
}

export default function AdminBroadcastModal({ visible, onClose, onSend, loading, templateRows = [], templateLoading = false, onRefreshTemplates, onSaveTemplate }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState('everyone');
  const [targetScreen, setTargetScreen] = useState('map');
  const [dkd_selected_template_key_value, setDkdSelectedTemplateKeyValue] = useState('');
  const [dkd_template_title_value, setDkdTemplateTitleValue] = useState('');
  const [dkd_template_body_value, setDkdTemplateBodyValue] = useState('');
  const [dkd_template_target_screen_value, setDkdTemplateTargetScreenValue] = useState('map');
  const [dkd_template_enabled_value, setDkdTemplateEnabledValue] = useState(true);

  useEffect(() => {
    if (!visible) return;
    setTitle('');
    setBody('');
    setAudience('everyone');
    setTargetScreen('map');
    onRefreshTemplates?.(true);
  }, [visible, onRefreshTemplates]);

  useEffect(() => {
    if (!visible) return;
    if (Array.isArray(templateRows) && templateRows.length) {
      setDkdSelectedTemplateKeyValue((dkd_previous_value) => {
        const dkd_has_previous_value = templateRows.some((dkd_row_value) => String(dkd_row_value?.dkd_template_key || '') === dkd_previous_value);
        return dkd_has_previous_value ? dkd_previous_value : dkd_pick_first_template_key(templateRows);
      });
      return;
    }
    setDkdSelectedTemplateKeyValue('');
  }, [visible, templateRows]);

  const dkd_selected_template_row_value = useMemo(
    () => (Array.isArray(templateRows) ? templateRows.find((dkd_row_value) => String(dkd_row_value?.dkd_template_key || '') === dkd_selected_template_key_value) : null),
    [dkd_selected_template_key_value, templateRows],
  );

  useEffect(() => {
    if (!dkd_selected_template_row_value) return;
    const dkd_loaded_title_value = String(dkd_selected_template_row_value?.dkd_title || '');
    const dkd_loaded_body_value = String(dkd_selected_template_row_value?.dkd_body || '');
    setDkdTemplateTitleValue(dkd_loaded_title_value === '{{row_title}}' ? '' : dkd_loaded_title_value);
    setDkdTemplateBodyValue(dkd_loaded_body_value === '{{row_body}}' ? '' : dkd_loaded_body_value);
    setDkdTemplateTargetScreenValue(String(dkd_selected_template_row_value?.dkd_target_screen || 'map') || 'map');
    setDkdTemplateEnabledValue(dkd_selected_template_row_value?.dkd_is_enabled !== false);
  }, [dkd_selected_template_row_value]);

  const pushSupportedLabel = useMemo(() => (canUseRemotePush() ? 'Bu istemci push token toplayabilir.' : 'Bu istemci Expo Go / local-only modda.'), []);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeScreen style={{ flex: 1, backgroundColor: cityLootTheme.colors.bgTop }}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#050812', '#0B1425', '#090E18']} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 36 }} keyboardShouldPersistTaps="handled">
            <View style={dkd_styles.headerRow}>
              <View style={dkd_styles.headerCopy}>
                <Text style={dkd_styles.kicker}>YAYIN MERKEZİ</Text>
                <Text style={dkd_styles.title}>Admin • Segmentli Duyuru Merkezi</Text>
                <Text style={dkd_styles.sub}>Manuel yayın gönder ve otomatik giden bildirim şablonlarını aynı panelden düzenle.</Text>
              </View>
              <SecondaryButton label="Kapat" onPress={onClose} size="compact" fullWidth={false} style={dkd_styles.headerButton} />
            </View>

            <View style={dkd_styles.heroPanel}>
              <View style={dkd_styles.heroGlowBlue} />
              <View style={dkd_styles.heroGlowPurple} />
              <Text style={dkd_styles.heroTitle}>Duyuru kontrolü</Text>
              <Text style={dkd_styles.heroSub}>Segment, hedef ekran ve gönderim metnini ayarla. Alttaki şablon alanından otomatik bildirimleri de özelleştir.</Text>
              <View style={dkd_styles.statsRow}>
                <StatCard label="SENDER" value={SENDER_NAME} />
                <StatCard label="SEGMENT" value={audience.toUpperCase()} accent={cityLootTheme.colors.goldSoft} />
                <StatCard label="TARGET" value={targetScreen.toUpperCase()} accent={cityLootTheme.colors.purple} />
              </View>
            </View>

            <View style={dkd_styles.panel}>
              <Text style={dkd_styles.sectionTitle}>Canlı yayın gönder</Text>
              <Text style={dkd_styles.value}>{SENDER_NAME}</Text>
              <Text style={dkd_styles.label}>Segment</Text>
              <FlatList horizontal data={AUDIENCES} keyExtractor={(item) => item.key} renderItem={({ item }) => <SegButton label={item.label} active={audience === item.key} onPress={() => setAudience(item.key)} />} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8 }} />
              <Text style={dkd_styles.label}>Dokununca Açılacak Ekran</Text>
              <FlatList horizontal data={TARGETS} keyExtractor={(item) => item.key} renderItem={({ item }) => <SegButton label={item.label} active={targetScreen === item.key} onPress={() => setTargetScreen(item.key)} />} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8 }} />
              <Text style={dkd_styles.label}>Başlık</Text>
              <TextInput value={title} onChangeText={setTitle} placeholder="Örn: Ankara raid başladı" placeholderTextColor="rgba(232,244,255,0.35)" style={dkd_styles.input} maxLength={64} />
              <Text style={dkd_styles.label}>Mesaj</Text>
              <TextInput value={body} onChangeText={setBody} placeholder="Örn: 15 dakika için token çarpanı aktif." placeholderTextColor="rgba(232,244,255,0.35)" style={[dkd_styles.input, dkd_styles.textarea]} multiline maxLength={240} />
              <Text style={dkd_styles.helper}>Bildirime dokununca seçtiğin ekran açılır. Segmente göre hedef oyuncu kitlesi ayrılır.</Text>
              <Text style={dkd_styles.helper}>Expo Go Android içinde gerçek remote push yok. Dev client / development build içindir.</Text>
              <Text style={dkd_styles.helper}>Durum: {pushSupportedLabel}</Text>
              <View style={{ marginTop: 14 }}>{loading ? <ActivityIndicator color="#fff" /> : <PrimaryButton label="Segmentli Duyuru Gönder" onPress={() => onSend?.({ title, body, sender_name: SENDER_NAME, audience, target_screen: targetScreen })} />}</View>
            </View>

            <View style={[dkd_styles.panel, { marginTop: 12 }]}> 
              <View style={dkd_styles.templateHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={dkd_styles.sectionTitle}>Otomatik bildirim şablonları</Text>
                  <Text style={dkd_styles.helper}>Kurye durumları, enerji full, sohbet, arkadaşlık ve market satışı gibi otomatik bildirimleri burada düzenle.</Text>
                </View>
                <SecondaryButton label="Yenile" onPress={() => onRefreshTemplates?.(true)} size="compact" fullWidth={false} />
              </View>

              <FlatList horizontal data={Array.isArray(templateRows) ? templateRows : []} keyExtractor={(item) => String(item?.dkd_template_key || '')} renderItem={({ item }) => {
                const dkd_is_selected_value = String(item?.dkd_template_key || '') === dkd_selected_template_key_value;
                return (
                  <TouchableOpacity activeOpacity={0.88} onPress={() => setDkdSelectedTemplateKeyValue(String(item?.dkd_template_key || ''))} style={[dkd_styles.templateCard, dkd_is_selected_value && dkd_styles.templateCardOn]}>
                    <Text style={dkd_styles.templateCardTitle}>{String(item?.dkd_label || 'Şablon')}</Text>
                    <Text style={dkd_styles.templateCardSub} numberOfLines={2}>{String(item?.dkd_description || '')}</Text>
                    <Text style={[dkd_styles.templateStatus, item?.dkd_is_enabled === false && dkd_styles.templateStatusOff]}>{item?.dkd_is_enabled === false ? 'Pasif' : 'Aktif'}</Text>
                  </TouchableOpacity>
                );
              }} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8 }} ListEmptyComponent={<Text style={dkd_styles.helper}>{templateLoading ? 'Şablonlar yükleniyor...' : 'Şablon bulunamadı.'}</Text>} />

              {dkd_selected_template_row_value ? (
                <>
                  <Text style={dkd_styles.label}>Şablon Başlığı</Text>
                  <TextInput value={dkd_template_title_value} onChangeText={setDkdTemplateTitleValue} placeholder="Başlık yaz" placeholderTextColor="rgba(232,244,255,0.35)" style={dkd_styles.input} maxLength={80} />
                  <Text style={dkd_styles.label}>Şablon Mesajı</Text>
                  <TextInput value={dkd_template_body_value} onChangeText={setDkdTemplateBodyValue} placeholder="Mesaj yaz" placeholderTextColor="rgba(232,244,255,0.35)" style={[dkd_styles.input, dkd_styles.textarea]} multiline maxLength={320} />
                  <Text style={dkd_styles.label}>Dokununca Açılacak Ekran</Text>
                  <FlatList horizontal data={TARGETS} keyExtractor={(item) => item.key} renderItem={({ item }) => <SegButton label={item.label} active={dkd_template_target_screen_value === item.key} onPress={() => setDkdTemplateTargetScreenValue(item.key)} />} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8 }} />
                  <Text style={dkd_styles.label}>Durum</Text>
                  <View style={{ flexDirection: 'row' }}>
                    <SegButton label="Aktif" active={dkd_template_enabled_value === true} onPress={() => setDkdTemplateEnabledValue(true)} />
                    <SegButton label="Pasif" active={dkd_template_enabled_value === false} onPress={() => setDkdTemplateEnabledValue(false)} />
                  </View>
                  <Text style={dkd_styles.helper}>Kullanılabilir alanlar: {dkd_template_placeholder_list.join(' • ')}</Text>
                  <Text style={dkd_styles.helper}>Başlık ve mesajı boş bırakırsan sistem kendi hazır metnini kullanır.</Text>
                  <View style={{ marginTop: 14 }}>
                    {templateLoading ? <ActivityIndicator color="#fff" /> : (
                      <PrimaryButton
                        label="Otomatik Şablonu Kaydet"
                        onPress={() => onSaveTemplate?.({
                          dkd_template_key: dkd_selected_template_row_value?.dkd_template_key,
                          dkd_label: dkd_selected_template_row_value?.dkd_label,
                          dkd_description: dkd_selected_template_row_value?.dkd_description,
                          dkd_title: dkd_template_title_value,
                          dkd_body: dkd_template_body_value,
                          dkd_target_screen: dkd_template_target_screen_value,
                          dkd_is_enabled: dkd_template_enabled_value,
                        })}
                      />
                    )}
                  </View>
                </>
              ) : null}
            </View>
          </ScrollView>
        </LinearGradient>
      </SafeScreen>
    </Modal>
  );
}

const dkd_styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 10 },
  headerCopy: { flex: 1, minWidth: 0, paddingRight: 6 },
  headerButton: { alignSelf: 'flex-start', flexShrink: 0 },
  kicker: { color: cityLootTheme.colors.goldSoft, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: cityLootTheme.colors.text, fontSize: 26, fontWeight: '900', marginTop: 4 },
  sub: { color: cityLootTheme.colors.textSoft, fontSize: 13, lineHeight: 18, marginTop: 6 },
  heroPanel: { borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, marginBottom: 12 },
  heroGlowBlue: { position: 'absolute', width: 220, height: 220, borderRadius: 999, backgroundColor: 'rgba(103,227,255,0.12)', top: -60, right: -30 },
  heroGlowPurple: { position: 'absolute', width: 180, height: 180, borderRadius: 999, backgroundColor: 'rgba(171,133,255,0.12)', bottom: -40, left: -40 },
  heroTitle: { color: cityLootTheme.colors.text, fontSize: 22, fontWeight: '900' },
  heroSub: { color: cityLootTheme.colors.textSoft, lineHeight: 18, marginTop: 6 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  statCard: { flex: 1, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(7,12,22,0.64)', padding: 12 },
  statLabel: { color: cityLootTheme.colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  statValue: { color: cityLootTheme.colors.text, fontSize: 16, fontWeight: '900', marginTop: 6 },
  panel: { borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.05)', padding: 14 },
  sectionTitle: { color: cityLootTheme.colors.text, fontSize: 18, fontWeight: '900' },
  value: { color: cityLootTheme.colors.cyanSoft, fontWeight: '900', marginTop: 8 },
  label: { color: cityLootTheme.colors.textMuted, fontSize: 12, fontWeight: '800', marginTop: 12 },
  seg: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)', marginRight: 8, marginBottom: 4 },
  segOn: { backgroundColor: cityLootTheme.colors.cyanSoft, borderColor: cityLootTheme.colors.cyanSoft },
  segText: { color: cityLootTheme.colors.text, fontWeight: '900' },
  segTextOn: { color: '#06111A' },
  input: { borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.05)', color: cityLootTheme.colors.text, paddingHorizontal: 14, paddingVertical: 12, marginTop: 8 },
  textarea: { minHeight: 120, textAlignVertical: 'top' },
  helper: { color: cityLootTheme.colors.textSoft, fontSize: 12, lineHeight: 18, marginTop: 8 },
  templateHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  templateCard: { width: 220, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)', padding: 12, marginRight: 10 },
  templateCardOn: { borderColor: cityLootTheme.colors.cyanSoft, backgroundColor: 'rgba(103,227,255,0.10)' },
  templateCardTitle: { color: cityLootTheme.colors.text, fontWeight: '900', fontSize: 14 },
  templateCardSub: { color: cityLootTheme.colors.textSoft, fontSize: 12, lineHeight: 17, marginTop: 6, minHeight: 34 },
  templateStatus: { color: cityLootTheme.colors.cyanSoft, fontSize: 11, fontWeight: '900', marginTop: 10 },
  templateStatusOff: { color: cityLootTheme.colors.textMuted },
});
