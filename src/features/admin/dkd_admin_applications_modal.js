import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SecondaryButton from '../../components/ui/SecondaryButton';
import { cityLootTheme } from '../../theme/cityLootTheme';
import {
  dkd_fetch_admin_applications_value,
  dkd_logistics_status_label_value,
  dkd_update_application_status_value,
} from '../../services/dkd_logistics_service';

const dkd_colors_value = cityLootTheme.colors;

function dkd_text_value(dkd_source_value, dkd_fallback_value = '-') {
  const dkd_clean_value = String(dkd_source_value ?? '').trim();
  return dkd_clean_value || dkd_fallback_value;
}

function dkd_status_label_value(dkd_status_value) {
  const dkd_key_value = String(dkd_status_value || 'pending').toLowerCase();
  if (dkd_key_value === 'approved') return 'Onaylandı';
  if (dkd_key_value === 'rejected') return 'Reddedildi';
  if (dkd_key_value === 'cancelled') return 'İptal';
  return 'İncelemede';
}

function dkd_document_rows_value(dkd_payload_value = {}) {
  const dkd_documents_value = dkd_payload_value?.dkd_documents_value || dkd_payload_value?.dkd_documents || {};
  return [
    { dkd_key_value: 'dkd_identity_front_url_value', dkd_label_value: 'Kimlik ön yüz', dkd_icon_value: 'card-account-details-outline' },
    { dkd_key_value: 'dkd_identity_back_url_value', dkd_label_value: 'Kimlik arka yüz', dkd_icon_value: 'card-account-details-star-outline' },
    { dkd_key_value: 'dkd_selfie_url_value', dkd_label_value: 'Selfie / yüz doğrulama', dkd_icon_value: 'camera-account' },
    { dkd_key_value: 'dkd_driver_license_url_value', dkd_label_value: 'Ehliyet', dkd_icon_value: 'card-text-outline' },
    { dkd_key_value: 'dkd_vehicle_license_url_value', dkd_label_value: 'Araç ruhsatı', dkd_icon_value: 'file-document-check-outline' },
    { dkd_key_value: 'dkd_insurance_url_value', dkd_label_value: 'Sigorta / poliçe', dkd_icon_value: 'shield-check-outline' },
    { dkd_key_value: 'dkd_src_certificate_url_value', dkd_label_value: 'SRC / Yetki', dkd_icon_value: 'certificate-outline' },
    { dkd_key_value: 'dkd_tax_certificate_url_value', dkd_label_value: 'Vergi levhası', dkd_icon_value: 'file-certificate-outline' },
    { dkd_key_value: 'dkd_authorization_certificate_url_value', dkd_label_value: 'Yetki / sözleşme', dkd_icon_value: 'file-sign' },
  ].map((dkd_document_value) => ({
    ...dkd_document_value,
    dkd_url_value: dkd_text_value(dkd_documents_value?.[dkd_document_value.dkd_key_value] || dkd_payload_value?.[dkd_document_value.dkd_key_value], ''),
  })).filter((dkd_document_value) => dkd_document_value.dkd_url_value);
}

function DkdDocumentOpenButton({ dkd_label_value, dkd_icon_value, dkd_on_press_value }) {
  return (
    <Pressable style={({ pressed }) => [dkd_styles.dkdDocumentButton, pressed && dkd_styles.dkdPressed]} onPress={dkd_on_press_value}>
      <MaterialCommunityIcons name={dkd_icon_value} size={16} color="#92E9FF" />
      <Text style={dkd_styles.dkdDocumentButtonText}>{dkd_label_value}</Text>
    </Pressable>
  );
}

function DkdAdminApplicationStat({ dkd_icon_value, dkd_label_value, dkd_value, dkd_accent_value }) {
  return (
    <View style={dkd_styles.dkdStatCard}>
      <MaterialCommunityIcons name={dkd_icon_value} size={18} color={dkd_accent_value} />
      <Text style={dkd_styles.dkdStatLabel}>{dkd_label_value}</Text>
      <Text style={dkd_styles.dkdStatValue}>{dkd_value}</Text>
    </View>
  );
}

function DkdAdminApplicationField({ dkd_label_value, dkd_value }) {
  return (
    <View style={dkd_styles.dkdFieldCard}>
      <Text style={dkd_styles.dkdFieldLabel}>{dkd_label_value}</Text>
      <Text style={dkd_styles.dkdFieldValue}>{dkd_text_value(dkd_value)}</Text>
    </View>
  );
}

function DkdAdminApplicationCard({ dkd_kind_value, dkd_item_value, dkd_on_select_value, dkd_on_status_value }) {
  const dkd_is_logistics_value = dkd_kind_value === 'logistics';
  const dkd_status_value = dkd_is_logistics_value
    ? dkd_item_value?.dkd_status || dkd_item_value?.status
    : dkd_item_value?.status || dkd_item_value?.courier_status;
  const dkd_name_value = dkd_is_logistics_value
    ? `${dkd_text_value(dkd_item_value?.dkd_first_name, '')} ${dkd_text_value(dkd_item_value?.dkd_last_name, '')}`.trim()
    : `${dkd_text_value(dkd_item_value?.first_name || dkd_item_value?.name, '')} ${dkd_text_value(dkd_item_value?.last_name, '')}`.trim();
  const dkd_city_value = dkd_is_logistics_value ? dkd_item_value?.dkd_city : dkd_item_value?.city;
  const dkd_zone_value = dkd_is_logistics_value ? dkd_item_value?.dkd_district : dkd_item_value?.zone || dkd_item_value?.district;
  const dkd_vehicle_value = dkd_is_logistics_value ? dkd_item_value?.dkd_vehicle_type : dkd_item_value?.vehicle_type;
  const dkd_plate_value = dkd_is_logistics_value ? dkd_item_value?.dkd_vehicle_plate : dkd_item_value?.plate_no || dkd_item_value?.plate;
  const dkd_phone_value = dkd_is_logistics_value ? dkd_item_value?.dkd_phone_text : dkd_item_value?.phone;

  return (
    <View style={dkd_styles.dkdApplicationCard}>
      <LinearGradient colors={["rgba(255,255,255,0.08)", "rgba(255,255,255,0.025)"]} style={StyleSheet.absoluteFill} />
      <View style={dkd_styles.dkdCardHeaderRow}>
        <View style={dkd_styles.dkdCardIconShell}>
          <MaterialCommunityIcons name={dkd_is_logistics_value ? 'truck-cargo-container' : 'motorbike'} size={22} color={dkd_is_logistics_value ? '#92E9FF' : '#6AF4B6'} />
        </View>
        <View style={dkd_styles.dkdCardTitleWrap}>
          <Text style={dkd_styles.dkdCardKicker}>{dkd_is_logistics_value ? 'NAKLİYE BAŞVURU FORMU' : 'KURYE BAŞVURU FORMU'}</Text>
          <Text style={dkd_styles.dkdCardTitle}>{dkd_text_value(dkd_name_value, 'İsimsiz başvuru')}</Text>
          <Text style={dkd_styles.dkdCardSub}>{dkd_text_value(dkd_city_value)} / {dkd_text_value(dkd_zone_value)} • {dkd_text_value(dkd_phone_value)}</Text>
        </View>
        <View style={dkd_styles.dkdStatusPill}>
          <Text style={dkd_styles.dkdStatusText}>{dkd_status_label_value(dkd_status_value)}</Text>
        </View>
      </View>

      <View style={dkd_styles.dkdMiniGrid}>
        <DkdAdminApplicationField dkd_label_value="Araç" dkd_value={dkd_vehicle_value} />
        <DkdAdminApplicationField dkd_label_value="Plaka" dkd_value={dkd_plate_value} />
        <DkdAdminApplicationField dkd_label_value="Kullanıcı" dkd_value={dkd_item_value?.user_id || dkd_item_value?.applicant_user_id} />
      </View>

      <View style={dkd_styles.dkdActionRow}>
        <Pressable style={({ pressed }) => [dkd_styles.dkdGhostButton, pressed && dkd_styles.dkdPressed]} onPress={() => dkd_on_select_value?.(dkd_item_value)}>
          <MaterialCommunityIcons name="text-box-search-outline" size={16} color="#EAFBFF" />
          <Text style={dkd_styles.dkdGhostButtonText}>İncele</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [dkd_styles.dkdApproveButton, pressed && dkd_styles.dkdPressed]} onPress={() => dkd_on_status_value?.(dkd_item_value, 'approved')}>
          <MaterialCommunityIcons name="check-decagram-outline" size={16} color="#06121D" />
          <Text style={dkd_styles.dkdApproveButtonText}>Onayla</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [dkd_styles.dkdRejectButton, pressed && dkd_styles.dkdPressed]} onPress={() => dkd_on_status_value?.(dkd_item_value, 'rejected')}>
          <MaterialCommunityIcons name="close-octagon-outline" size={16} color="#FFE8E8" />
          <Text style={dkd_styles.dkdRejectButtonText}>Reddet</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function DkdAdminApplicationsModal({ visible, onClose }) {
  const [dkd_tab_value, dkd_set_tab_value] = useState('courier');
  const [dkd_loading_value, dkd_set_loading_value] = useState(false);
  const [dkd_courier_rows_value, dkd_set_courier_rows_value] = useState([]);
  const [dkd_logistics_rows_value, dkd_set_logistics_rows_value] = useState([]);
  const [dkd_selected_value, dkd_set_selected_value] = useState(null);

  const dkd_active_rows_value = dkd_tab_value === 'courier' ? dkd_courier_rows_value : dkd_logistics_rows_value;
  const dkd_pending_count_value = dkd_active_rows_value.filter((dkd_row_value) => String(dkd_row_value?.dkd_status || dkd_row_value?.status || 'pending').toLowerCase() === 'pending').length;

  const dkd_load_value = useCallback(async () => {
    try {
      dkd_set_loading_value(true);
      const dkd_result_value = await dkd_fetch_admin_applications_value();
      if (dkd_result_value?.error) throw dkd_result_value.error;
      dkd_set_courier_rows_value(dkd_result_value?.data?.dkd_courier_applications_value || []);
      dkd_set_logistics_rows_value(dkd_result_value?.data?.dkd_logistics_applications_value || []);
    } catch (dkd_error_value) {
      Alert.alert('Başvurular', dkd_error_value?.message || String(dkd_error_value));
    } finally {
      dkd_set_loading_value(false);
    }
  }, []);

  useEffect(() => {
    if (visible) dkd_load_value();
  }, [visible, dkd_load_value]);

  const dkd_update_status_value = useCallback(async (dkd_item_value, dkd_status_value) => {
    try {
      const dkd_kind_value = dkd_tab_value === 'logistics' ? 'logistics' : 'courier';
      const dkd_result_value = await dkd_update_application_status_value({
        dkd_kind_value,
        dkd_application_id_value: dkd_item_value?.id,
        dkd_user_id_value: dkd_item_value?.user_id || dkd_item_value?.applicant_user_id,
        dkd_status_value,
        dkd_admin_note_value: dkd_status_value === 'approved' ? 'Admin panelinden onaylandı' : 'Admin panelinden reddedildi',
      });
      if (dkd_result_value?.error) throw dkd_result_value.error;
      Alert.alert('Başvurular', dkd_status_value === 'approved' ? 'Başvuru onaylandı.' : 'Başvuru reddedildi.');
      dkd_set_selected_value(null);
      await dkd_load_value();
    } catch (dkd_error_value) {
      Alert.alert('Başvurular', dkd_error_value?.message || String(dkd_error_value));
    }
  }, [dkd_load_value, dkd_tab_value]);

  const dkd_selected_payload_value = useMemo(() => dkd_selected_value?.dkd_payload || dkd_selected_value?.payload || {}, [dkd_selected_value]);
  const dkd_selected_status_value = dkd_selected_value?.dkd_status || dkd_selected_value?.status || 'pending';
  const dkd_selected_document_rows_value = useMemo(() => dkd_document_rows_value(dkd_selected_payload_value), [dkd_selected_payload_value]);

  const dkd_open_document_value = useCallback(async (dkd_url_value) => {
    const dkd_clean_url_value = dkd_text_value(dkd_url_value, '');
    if (!dkd_clean_url_value) {
      Alert.alert('Belge', 'Belge bağlantısı bulunamadı.');
      return;
    }
    try {
      await Linking.openURL(dkd_clean_url_value);
    } catch (dkd_error_value) {
      Alert.alert('Belge', dkd_error_value?.message || 'Belge açılamadı.');
    }
  }, []);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={dkd_styles.dkdBackdrop}>
        <LinearGradient colors={["#04101A", "#0B1426", "#090E18"]} style={dkd_styles.dkdCard}>
          <View style={dkd_styles.dkdGlowBlue} />
          <View style={dkd_styles.dkdGlowGold} />

          <View style={dkd_styles.dkdTopRow}>
            <View style={dkd_styles.dkdTitleWrap}>
              <Text style={dkd_styles.dkdKicker}>ADMIN BAŞVURU MERKEZİ</Text>
              <Text style={dkd_styles.dkdTitle}>Başvurular</Text>
              <Text style={dkd_styles.dkdSubTitle}>Kurye Başvuru formu ve Nakliye Başvuru formu buradan incelenir, onaylanır veya reddedilir.</Text>
            </View>
            <SecondaryButton label="Kapat" onPress={onClose} size="compact" fullWidth={false} />
          </View>

          <View style={dkd_styles.dkdStatsRow}>
            <DkdAdminApplicationStat dkd_icon_value="motorbike" dkd_label_value="Kurye" dkd_value={String(dkd_courier_rows_value.length)} dkd_accent_value="#6AF4B6" />
            <DkdAdminApplicationStat dkd_icon_value="truck-cargo-container" dkd_label_value="Nakliye" dkd_value={String(dkd_logistics_rows_value.length)} dkd_accent_value="#92E9FF" />
            <DkdAdminApplicationStat dkd_icon_value="timer-sand" dkd_label_value="Bekleyen" dkd_value={String(dkd_pending_count_value)} dkd_accent_value="#FFD883" />
          </View>

          <View style={dkd_styles.dkdTabRow}>
            <Pressable
              style={[dkd_styles.dkdTabButton, dkd_tab_value === 'courier' && dkd_styles.dkdTabButtonActive]}
              onPress={() => { dkd_set_tab_value('courier'); dkd_set_selected_value(null); }}
            >
              <MaterialCommunityIcons name="motorbike" size={18} color={dkd_tab_value === 'courier' ? '#06121D' : '#EAFBFF'} />
              <View style={dkd_styles.dkdTabCopyWrap}>
                <Text style={[dkd_styles.dkdTabText, dkd_tab_value === 'courier' && dkd_styles.dkdTabTextActive]}>Kurye Başvuru formu</Text>
                <Text style={[dkd_styles.dkdTabSubText, dkd_tab_value === 'courier' && dkd_styles.dkdTabSubTextActive]}>Kimlik, ehliyet, selfie, ruhsat ve bölge onayı</Text>
              </View>
              <Text style={[dkd_styles.dkdTabCountText, dkd_tab_value === 'courier' && dkd_styles.dkdTabCountTextActive]}>{dkd_courier_rows_value.length}</Text>
            </Pressable>
            <Pressable
              style={[dkd_styles.dkdTabButton, dkd_tab_value === 'logistics' && dkd_styles.dkdTabButtonActive]}
              onPress={() => { dkd_set_tab_value('logistics'); dkd_set_selected_value(null); }}
            >
              <MaterialCommunityIcons name="truck-fast-outline" size={18} color={dkd_tab_value === 'logistics' ? '#06121D' : '#EAFBFF'} />
              <View style={dkd_styles.dkdTabCopyWrap}>
                <Text style={[dkd_styles.dkdTabText, dkd_tab_value === 'logistics' && dkd_styles.dkdTabTextActive]}>Nakliye Başvuru formu</Text>
                <Text style={[dkd_styles.dkdTabSubText, dkd_tab_value === 'logistics' && dkd_styles.dkdTabSubTextActive]}>Kurye formu altında, aynı belge/onay akışıyla incelenir</Text>
              </View>
              <Text style={[dkd_styles.dkdTabCountText, dkd_tab_value === 'logistics' && dkd_styles.dkdTabCountTextActive]}>{dkd_logistics_rows_value.length}</Text>
            </Pressable>
          </View>

          {dkd_loading_value ? (
            <View style={dkd_styles.dkdLoadingCard}>
              <ActivityIndicator color={dkd_colors_value.cyanSoft} />
              <Text style={dkd_styles.dkdLoadingText}>Başvurular yükleniyor...</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={dkd_styles.dkdScrollContent}>
              {dkd_active_rows_value.length ? dkd_active_rows_value.map((dkd_item_value) => (
                <DkdAdminApplicationCard
                  key={`${dkd_tab_value}_${dkd_item_value?.id || dkd_item_value?.user_id || dkd_item_value?.applicant_user_id}`}
                  dkd_kind_value={dkd_tab_value}
                  dkd_item_value={dkd_item_value}
                  dkd_on_select_value={dkd_set_selected_value}
                  dkd_on_status_value={dkd_update_status_value}
                />
              )) : (
                <View style={dkd_styles.dkdEmptyCard}>
                  <MaterialCommunityIcons name="clipboard-search-outline" size={30} color="#92E9FF" />
                  <Text style={dkd_styles.dkdEmptyTitle}>Bu bölümde başvuru yok</Text>
                  <Text style={dkd_styles.dkdEmptySub}>Yeni başvurular geldiğinde burada listelenecek.</Text>
                </View>
              )}

              {dkd_selected_value ? (
                <View style={dkd_styles.dkdDetailCard}>
                  <Text style={dkd_styles.dkdDetailKicker}>DETAYLI İNCELEME</Text>
                  <Text style={dkd_styles.dkdDetailTitle}>{dkd_tab_value === 'logistics' ? 'Nakliye başvuru detayı' : 'Kurye başvuru detayı'}</Text>
                  <Text style={dkd_styles.dkdDetailSub}>Durum: {dkd_tab_value === 'logistics' ? dkd_logistics_status_label_value(dkd_selected_status_value) : dkd_status_label_value(dkd_selected_status_value)}</Text>
                  <View style={dkd_styles.dkdMiniGrid}>
                    {Object.entries({ ...dkd_selected_payload_value, ...dkd_selected_value }).slice(0, 18).map(([dkd_key_value, dkd_payload_value]) => (
                      <DkdAdminApplicationField key={dkd_key_value} dkd_label_value={dkd_key_value} dkd_value={typeof dkd_payload_value === 'object' ? JSON.stringify(dkd_payload_value) : dkd_payload_value} />
                    ))}
                  </View>
                  {dkd_selected_document_rows_value.length ? (
                    <View style={dkd_styles.dkdDocumentPanel}>
                      <Text style={dkd_styles.dkdDetailKicker}>YÜKLENEN BELGELER</Text>
                      <View style={dkd_styles.dkdDocumentButtonGrid}>
                        {dkd_selected_document_rows_value.map((dkd_document_value) => (
                          <DkdDocumentOpenButton
                            key={dkd_document_value.dkd_key_value}
                            dkd_label_value={dkd_document_value.dkd_label_value}
                            dkd_icon_value={dkd_document_value.dkd_icon_value}
                            dkd_on_press_value={() => dkd_open_document_value(dkd_document_value.dkd_url_value)}
                          />
                        ))}
                      </View>
                    </View>
                  ) : null}
                  <View style={dkd_styles.dkdActionRow}>
                    <Pressable style={({ pressed }) => [dkd_styles.dkdApproveButton, pressed && dkd_styles.dkdPressed]} onPress={() => dkd_update_status_value(dkd_selected_value, 'approved')}>
                      <Text style={dkd_styles.dkdApproveButtonText}>Seçili başvuruyu onayla</Text>
                    </Pressable>
                    <Pressable style={({ pressed }) => [dkd_styles.dkdRejectButton, pressed && dkd_styles.dkdPressed]} onPress={() => dkd_update_status_value(dkd_selected_value, 'rejected')}>
                      <Text style={dkd_styles.dkdRejectButtonText}>Seçili başvuruyu reddet</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </ScrollView>
          )}
        </LinearGradient>
      </View>
    </Modal>
  );
}

const dkd_styles = StyleSheet.create({
  dkdBackdrop: { flex: 1, backgroundColor: 'rgba(2,6,12,0.88)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  dkdCard: { width: '100%', maxWidth: 820, maxHeight: '94%', borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', padding: 16, overflow: 'hidden' },
  dkdGlowBlue: { position: 'absolute', width: 240, height: 240, borderRadius: 999, backgroundColor: 'rgba(103,227,255,0.13)', top: -60, right: -40 },
  dkdGlowGold: { position: 'absolute', width: 180, height: 180, borderRadius: 999, backgroundColor: 'rgba(246,181,78,0.12)', bottom: -40, left: -30 },
  dkdTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  dkdTitleWrap: { flex: 1, minWidth: 0 },
  dkdKicker: { color: dkd_colors_value.goldSoft, fontSize: 11, fontWeight: '900', letterSpacing: 1.3 },
  dkdTitle: { color: dkd_colors_value.text, fontSize: 28, fontWeight: '900', marginTop: 4 },
  dkdSubTitle: { color: dkd_colors_value.textSoft, fontSize: 13, lineHeight: 18, marginTop: 7 },
  dkdStatsRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  dkdStatCard: { flex: 1, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.05)', padding: 10 },
  dkdStatLabel: { color: dkd_colors_value.textMuted, fontSize: 10, fontWeight: '800', marginTop: 5 },
  dkdStatValue: { color: dkd_colors_value.text, fontSize: 18, fontWeight: '900', marginTop: 2 },
  dkdTabRow: { gap: 9, marginTop: 14 },
  dkdTabButton: { minHeight: 56, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.05)', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  dkdTabButtonActive: { backgroundColor: '#92E9FF', borderColor: '#92E9FF' },
  dkdTabCopyWrap: { flex: 1, minWidth: 0 },
  dkdTabText: { color: '#EAFBFF', fontSize: 13, fontWeight: '900' },
  dkdTabTextActive: { color: '#06121D' },
  dkdTabSubText: { color: dkd_colors_value.textSoft, fontSize: 10, lineHeight: 14, fontWeight: '800', marginTop: 2 },
  dkdTabSubTextActive: { color: 'rgba(6,18,29,0.72)' },
  dkdTabCountText: { color: '#EAFBFF', minWidth: 28, textAlign: 'center', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 8, paddingVertical: 5, fontSize: 11, fontWeight: '900' },
  dkdTabCountTextActive: { color: '#06121D', borderColor: 'rgba(6,18,29,0.28)' },
  dkdScrollContent: { paddingTop: 14, paddingBottom: 12, gap: 12 },
  dkdApplicationCard: { borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', overflow: 'hidden', padding: 13 },
  dkdCardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dkdCardIconShell: { width: 48, height: 48, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  dkdCardTitleWrap: { flex: 1, minWidth: 0 },
  dkdCardKicker: { color: dkd_colors_value.goldSoft, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  dkdCardTitle: { color: dkd_colors_value.text, fontSize: 16, fontWeight: '900', marginTop: 2 },
  dkdCardSub: { color: dkd_colors_value.textSoft, fontSize: 12, marginTop: 2 },
  dkdStatusPill: { borderRadius: 999, backgroundColor: 'rgba(255,216,131,0.14)', borderWidth: 1, borderColor: 'rgba(255,216,131,0.30)', paddingHorizontal: 9, paddingVertical: 6 },
  dkdStatusText: { color: '#FFD883', fontSize: 10, fontWeight: '900' },
  dkdMiniGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  dkdFieldCard: { flexGrow: 1, flexBasis: '30%', minWidth: 110, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 10 },
  dkdFieldLabel: { color: dkd_colors_value.textMuted, fontSize: 10, fontWeight: '800' },
  dkdFieldValue: { color: dkd_colors_value.text, fontSize: 12, fontWeight: '800', marginTop: 4 },
  dkdActionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  dkdGhostButton: { flexGrow: 1, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', backgroundColor: 'rgba(255,255,255,0.06)', paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  dkdGhostButtonText: { color: '#EAFBFF', fontWeight: '900', fontSize: 12 },
  dkdApproveButton: { flexGrow: 1, borderRadius: 14, backgroundColor: '#6AF4B6', paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  dkdApproveButtonText: { color: '#06121D', fontWeight: '900', fontSize: 12, textAlign: 'center' },
  dkdRejectButton: { flexGrow: 1, borderRadius: 14, backgroundColor: 'rgba(255,88,112,0.28)', borderWidth: 1, borderColor: 'rgba(255,88,112,0.46)', paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  dkdRejectButtonText: { color: '#FFE8E8', fontWeight: '900', fontSize: 12, textAlign: 'center' },
  dkdDetailCard: { borderRadius: 24, borderWidth: 1, borderColor: 'rgba(146,233,255,0.28)', backgroundColor: 'rgba(7,20,36,0.78)', padding: 13 },
  dkdDetailKicker: { color: '#92E9FF', fontSize: 10, fontWeight: '900', letterSpacing: 0.9 },
  dkdDetailTitle: { color: dkd_colors_value.text, fontSize: 18, fontWeight: '900', marginTop: 3 },
  dkdDetailSub: { color: dkd_colors_value.textSoft, fontSize: 12, marginTop: 4 },
  dkdDocumentPanel: { marginTop: 12, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(146,233,255,0.18)', backgroundColor: 'rgba(255,255,255,0.05)', padding: 11 },
  dkdDocumentButtonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 9 },
  dkdDocumentButton: { flexGrow: 1, flexBasis: '30%', minWidth: 126, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(146,233,255,0.18)', backgroundColor: 'rgba(146,233,255,0.08)', paddingVertical: 10, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  dkdDocumentButtonText: { color: '#EAFBFF', fontSize: 11, fontWeight: '900', textAlign: 'center' },
  dkdLoadingCard: { marginTop: 14, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.06)', padding: 18, alignItems: 'center', gap: 8 },
  dkdLoadingText: { color: dkd_colors_value.textSoft, fontSize: 12, fontWeight: '800' },
  dkdEmptyCard: { borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', padding: 18, alignItems: 'center', gap: 6 },
  dkdEmptyTitle: { color: dkd_colors_value.text, fontSize: 16, fontWeight: '900' },
  dkdEmptySub: { color: dkd_colors_value.textSoft, fontSize: 12, textAlign: 'center' },
  dkdPressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
});
