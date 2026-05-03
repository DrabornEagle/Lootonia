import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SafeScreen from '../../components/layout/SafeScreen';
import { cityLootTheme } from '../../theme/cityLootTheme';
import { dkd_make_native_axis_point } from '../../utils/dkdNativeAxis';
import { DkdCourierInlineApplicationForm } from '../courier/CourierBoardModal';
import { DkdApplicationForm } from '../logistics/dkd_logistics_modal';
import { dkd_fetch_my_logistics_application_value } from '../../services/dkd_logistics_service';

const dkd_colors_value = cityLootTheme.colors;

export default function dkd_applications_hub_modal_value({
  dkd_visible_value,
  dkd_on_close_value,
  dkd_profile_value,
  dkd_set_profile_value,
}) {
  const [dkd_active_application_value, dkd_set_active_application_value] = useState('');
  const [dkd_logistics_application_value, dkd_set_logistics_application_value] = useState(null);

  const dkd_load_logistics_application_value = useCallback(async () => {
    const dkd_user_id_value = String(dkd_profile_value?.user_id || dkd_profile_value?.id || '');
    if (!dkd_user_id_value) return;
    const dkd_result_value = await dkd_fetch_my_logistics_application_value({ dkd_user_id_value, dkd_profile_value });
    if (!dkd_result_value?.error) dkd_set_logistics_application_value(dkd_result_value?.data || null);
  }, [dkd_profile_value]);

  useEffect(() => {
    if (!dkd_visible_value) dkd_set_active_application_value('');
  }, [dkd_visible_value]);

  useEffect(() => {
    if (dkd_visible_value && dkd_active_application_value === 'logistics') {
      dkd_load_logistics_application_value();
    }
  }, [dkd_active_application_value, dkd_load_logistics_application_value, dkd_visible_value]);

  const dkd_show_cards_value = !dkd_active_application_value;
  const dkd_title_text_value = dkd_active_application_value === 'courier' ? 'Kurye Başvurusu' : dkd_active_application_value === 'logistics' ? 'Nakliye Başvurusu' : 'Başvurular';
  const dkd_subtitle_text_value = dkd_active_application_value === 'courier'
    ? 'Kurye formu aynı Başvurular sayfasında açıldı. Kartlar gizli, geri dönerek seçim ekranına geçebilirsin.'
    : dkd_active_application_value === 'logistics'
      ? 'Nakliye formu aynı Başvurular sayfasında açıldı. Araç, kapasite ve belge bilgilerini buradan gönder.'
      : 'Kurye ve nakliye başvurularını tek merkezden aç. Operasyon kartları burada, sipariş ve kargo akışı ayrı merkezde kalır.';

  return (
    <Modal visible={dkd_visible_value} animationType="slide" transparent={false} onRequestClose={dkd_on_close_value}>
      <StatusBar barStyle="light-content" />
      <SafeScreen style={dkd_styles_value.dkd_screen}>
        <LinearGradient colors={['#050B18', '#081527', '#120A24']} style={dkd_styles_value.dkd_screen}>
          <ScrollView contentContainerStyle={dkd_styles_value.dkd_content} showsVerticalScrollIndicator={false}>
            <View style={dkd_styles_value.dkd_header}>
              <Pressable onPress={dkd_on_close_value} hitSlop={12} style={dkd_styles_value.dkd_close_button}>
                <MaterialCommunityIcons name="close" size={22} color="#FFFFFF" />
              </Pressable>
              <View style={dkd_styles_value.dkd_header_icon_row}>
                <View style={dkd_styles_value.dkd_header_icon_shell}>
                  <MaterialCommunityIcons name="clipboard-text-search-outline" size={30} color="#07131C" />
                </View>
                <View style={dkd_styles_value.dkd_header_signal}>
                  <Text style={dkd_styles_value.dkd_header_signal_text}>DKD ONAY MERKEZİ</Text>
                </View>
              </View>
              <Text style={dkd_styles_value.dkd_title}>{dkd_title_text_value}</Text>
              <Text style={dkd_styles_value.dkd_subtitle}>{dkd_subtitle_text_value}</Text>
            </View>

            {dkd_show_cards_value ? (
            <View style={dkd_styles_value.dkd_cards_stage}>
            <View style={dkd_styles_value.dkd_grid}>
              <Pressable
                onPress={() => dkd_set_active_application_value('courier')}
                style={({ pressed: dkd_pressed_value }) => [dkd_styles_value.dkd_card_pressable, dkd_pressed_value && dkd_styles_value.dkd_card_pressable_pressed]}
              >
                <LinearGradient
                  colors={['rgba(113,232,255,0.28)', 'rgba(116,132,255,0.22)', 'rgba(188,111,255,0.18)', 'rgba(10,18,36,0.96)']}
                  start={dkd_make_native_axis_point(0, 0)}
                  end={dkd_make_native_axis_point(1, 1)}
                  style={dkd_styles_value.dkd_card}
                >
                  <View style={dkd_styles_value.dkd_card_top_row}>
                    <View style={[dkd_styles_value.dkd_icon_shell, dkd_styles_value.dkd_icon_shell_courier]}>
                      <MaterialCommunityIcons name="card-account-details-outline" size={26} color="#FFFFFF" />
                    </View>
                    <View style={dkd_styles_value.dkd_badge}><Text style={dkd_styles_value.dkd_badge_text}>Kurye</Text></View>
                  </View>
                  <Text style={dkd_styles_value.dkd_card_title}>Kurye Başvurusu</Text>
                  <Text style={dkd_styles_value.dkd_card_description}>Kimlik, ehliyet, bölge ve araç bilgilerini ekleyip kurye lisans sürecini başlat.</Text>
                  <View style={dkd_styles_value.dkd_card_footer}>
                    <Text style={dkd_styles_value.dkd_card_footer_text}>Başvuru formunu aç</Text>
                    <MaterialCommunityIcons name="arrow-right-circle" size={18} color="#FFFFFF" />
                  </View>
                </LinearGradient>
              </Pressable>

              <Pressable
                onPress={() => dkd_set_active_application_value('logistics')}
                style={({ pressed: dkd_pressed_value }) => [dkd_styles_value.dkd_card_pressable, dkd_pressed_value && dkd_styles_value.dkd_card_pressable_pressed]}
              >
                <LinearGradient
                  colors={['rgba(105,231,255,0.26)', 'rgba(82,242,161,0.20)', 'rgba(255,209,102,0.16)', 'rgba(8,29,42,0.96)']}
                  start={dkd_make_native_axis_point(0, 0)}
                  end={dkd_make_native_axis_point(1, 1)}
                  style={dkd_styles_value.dkd_card}
                >
                  <View style={dkd_styles_value.dkd_card_top_row}>
                    <View style={[dkd_styles_value.dkd_icon_shell, dkd_styles_value.dkd_icon_shell_logistics]}>
                      <MaterialCommunityIcons name="truck-delivery-outline" size={27} color="#07131C" />
                    </View>
                    <View style={dkd_styles_value.dkd_badge}><Text style={dkd_styles_value.dkd_badge_text}>Nakliye</Text></View>
                  </View>
                  <Text style={dkd_styles_value.dkd_card_title}>Nakliye Başvurusu</Text>
                  <Text style={dkd_styles_value.dkd_card_description}>Araç, kapasite, plaka ve hizmet bölgesi bilgilerini belgeyle gönder.</Text>
                  <View style={dkd_styles_value.dkd_card_footer}>
                    <Text style={dkd_styles_value.dkd_card_footer_text}>Nakliye formunu aç</Text>
                    <MaterialCommunityIcons name="arrow-right-circle" size={18} color="#FFFFFF" />
                  </View>
                </LinearGradient>
              </Pressable>
            </View>

            <View style={dkd_styles_value.dkd_info_panel}>
              <MaterialCommunityIcons name="shield-check-outline" size={20} color="#7EEBFF" />
              <Text style={dkd_styles_value.dkd_info_text}>Başvurular admin onayına düşer. Onaylandıktan sonra ilgili kurye veya nakliye paneli otomatik olarak aktifleşir.</Text>
            </View>
            </View>
            ) : (
            <View style={dkd_styles_value.dkd_form_stage}>
              <Pressable onPress={() => dkd_set_active_application_value('')} style={dkd_styles_value.dkd_inline_back_button}>
                <MaterialCommunityIcons name="arrow-left" size={18} color="#07131C" />
                <Text style={dkd_styles_value.dkd_inline_back_text}>Başvuru kartlarına dön</Text>
              </Pressable>
              {dkd_active_application_value === 'courier' ? (
                <DkdCourierInlineApplicationForm dkd_profile_value={dkd_profile_value} dkd_set_profile_value={dkd_set_profile_value} />
              ) : (
                <DkdApplicationForm dkd_profile_value={dkd_profile_value} dkd_application_value={dkd_logistics_application_value} dkd_on_refresh_value={dkd_load_logistics_application_value} />
              )}
            </View>
            )}
          </ScrollView>
        </LinearGradient>
      </SafeScreen>
    </Modal>
  );
}

const dkd_styles_value = StyleSheet.create({
  dkd_screen: { flex: 1, backgroundColor: '#050B18' },
  dkd_content: { paddingHorizontal: 18, paddingBottom: 34 },
  dkd_header: { marginTop: 12, borderRadius: 30, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
  dkd_close_button: { position: 'absolute', top: 14, right: 14, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.10)', zIndex: 2 },
  dkd_header_icon_row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 48 },
  dkd_header_icon_shell: { width: 58, height: 58, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7EEBFF', shadowColor: '#31D7FF', shadowOpacity: 0.32, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  dkd_header_signal: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: 'rgba(126,235,255,0.12)', borderWidth: 1, borderColor: 'rgba(126,235,255,0.22)' },
  dkd_header_signal_text: { color: '#CFF7FF', fontSize: 11, fontWeight: '950', letterSpacing: 0.7 },
  dkd_title: { color: dkd_colors_value.text || '#FFFFFF', fontSize: 30, fontWeight: '950', marginTop: 18 },
  dkd_subtitle: { color: dkd_colors_value.textSoft || 'rgba(231,241,255,0.76)', fontSize: 14, lineHeight: 20, fontWeight: '750', marginTop: 8 },
  dkd_cards_stage: { marginTop: 16 },
  dkd_grid: { gap: 14 },
  dkd_card_pressable: { borderRadius: 28 },
  dkd_card_pressable_pressed: { transform: [{ scale: 0.985 }], opacity: 0.92 },
  dkd_card: { borderRadius: 28, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)', overflow: 'hidden', minHeight: 178 },
  dkd_card_top_row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  dkd_icon_shell: { width: 54, height: 54, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(255,255,255,0.65)' },
  dkd_icon_shell_courier: { backgroundColor: '#7188FF', borderColor: 'rgba(255,255,255,0.25)' },
  dkd_icon_shell_logistics: { backgroundColor: '#7FFFE5', borderColor: 'rgba(255,255,255,0.45)' },
  dkd_badge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: 'rgba(255,255,255,0.13)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  dkd_badge_text: { color: '#FFFFFF', fontSize: 12, fontWeight: '950' },
  dkd_card_title: { color: '#FFFFFF', fontSize: 21, fontWeight: '950', marginTop: 16 },
  dkd_card_description: { color: 'rgba(231,241,255,0.78)', fontSize: 13.5, lineHeight: 19, fontWeight: '760', marginTop: 7 },
  dkd_card_footer: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  dkd_card_footer_text: { color: '#FFFFFF', fontSize: 13, fontWeight: '950' },
  dkd_form_stage: { marginTop: 16, gap: 14 },
  dkd_inline_back_button: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 10, backgroundColor: '#7EEBFF', borderWidth: 1, borderColor: 'rgba(255,255,255,0.42)' },
  dkd_inline_back_text: { color: '#07131C', fontSize: 12.5, fontWeight: '950' },
  dkd_info_panel: { marginTop: 16, borderRadius: 22, padding: 14, flexDirection: 'row', gap: 10, borderWidth: 1, borderColor: 'rgba(126,235,255,0.18)', backgroundColor: 'rgba(126,235,255,0.08)' },
  dkd_info_text: { flex: 1, color: 'rgba(231,241,255,0.76)', fontSize: 12.5, lineHeight: 18, fontWeight: '750' },
});
