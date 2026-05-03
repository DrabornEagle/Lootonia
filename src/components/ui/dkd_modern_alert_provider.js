import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { dkd_make_native_axis_point } from '../../utils/dkdNativeAxis';

function dkd_alert_buttons_value(dkd_buttons_value) {
  const dkd_safe_buttons_value = Array.isArray(dkd_buttons_value) && dkd_buttons_value.length
    ? dkd_buttons_value
    : [{ text: 'Tamam', style: 'default' }];
  return dkd_safe_buttons_value.map((dkd_button_value, dkd_button_index_value) => ({
    ...dkd_button_value,
    text: String(dkd_button_value?.text || (dkd_button_index_value === 0 ? 'Tamam' : 'Seç')),
    style: dkd_button_value?.style || 'default',
  }));
}

function dkd_alert_icon_name_value(dkd_alert_value) {
  const dkd_title_value = String(dkd_alert_value?.dkd_title_value || '').toLowerCase();
  const dkd_buttons_value = Array.isArray(dkd_alert_value?.dkd_buttons_value) ? dkd_alert_value.dkd_buttons_value : [];
  const dkd_has_destructive_value = dkd_buttons_value.some((dkd_button_value) => dkd_button_value?.style === 'destructive');
  if (dkd_has_destructive_value) return 'trash-can-outline';
  if (dkd_title_value.includes('hata') || dkd_title_value.includes('uyarı')) return 'alert-decagram-outline';
  if (dkd_title_value.includes('kurye')) return 'bike-fast';
  if (dkd_title_value.includes('admin')) return 'shield-crown-outline';
  if (dkd_title_value.includes('başarı') || dkd_title_value.includes('ödül')) return 'star-four-points-outline';
  return 'information-variant-circle-outline';
}

function dkd_alert_tone_value(dkd_alert_value) {
  const dkd_buttons_value = Array.isArray(dkd_alert_value?.dkd_buttons_value) ? dkd_alert_value.dkd_buttons_value : [];
  if (dkd_buttons_value.some((dkd_button_value) => dkd_button_value?.style === 'destructive')) return 'danger';
  const dkd_title_value = String(dkd_alert_value?.dkd_title_value || '').toLowerCase();
  if (dkd_title_value.includes('kurye')) return 'courier';
  if (dkd_title_value.includes('hata')) return 'warning';
  return 'info';
}

function dkd_alert_gradient_value(dkd_alert_value) {
  const dkd_tone_value = dkd_alert_tone_value(dkd_alert_value);
  if (dkd_tone_value === 'danger') return ['rgba(48,12,30,0.98)', 'rgba(95,20,54,0.97)', 'rgba(28,16,56,0.97)'];
  if (dkd_tone_value === 'warning') return ['rgba(48,33,12,0.98)', 'rgba(91,55,14,0.97)', 'rgba(42,20,64,0.97)'];
  if (dkd_tone_value === 'courier') return ['rgba(5,22,36,0.99)', 'rgba(10,76,86,0.97)', 'rgba(31,25,86,0.97)'];
  return ['rgba(6,18,34,0.99)', 'rgba(15,35,70,0.97)', 'rgba(18,10,35,0.97)'];
}

function dkd_alert_icon_gradient_value(dkd_alert_value) {
  const dkd_tone_value = dkd_alert_tone_value(dkd_alert_value);
  if (dkd_tone_value === 'danger') return ['#FF4D7D', '#FF8A3D'];
  if (dkd_tone_value === 'warning') return ['#FFD166', '#FF8A3D'];
  if (dkd_tone_value === 'courier') return ['#52F2A1', '#31D7FF', '#7C3AED'];
  return ['#31D7FF', '#7C3AED', '#52F2A1'];
}

export default function Dkd_modern_alert_provider(dkd_props_value) {
  const [dkd_alert_queue_value, setDkdAlertQueueValue] = useState([]);
  const dkd_original_alert_ref_value = useRef(null);

  const dkd_active_alert_value = dkd_alert_queue_value?.[0] || null;
  const dkd_active_buttons_value = useMemo(() => dkd_alert_buttons_value(dkd_active_alert_value?.dkd_buttons_value), [dkd_active_alert_value?.dkd_buttons_value]);

  const dkd_close_active_alert_value = useCallback(() => {
    const dkd_current_options_value = dkd_alert_queue_value?.[0]?.dkd_options_value || {};
    setDkdAlertQueueValue((dkd_previous_queue_value) => dkd_previous_queue_value.slice(1));
    if (typeof dkd_current_options_value?.onDismiss === 'function') {
      setTimeout(() => dkd_current_options_value.onDismiss(), 0);
    }
  }, [dkd_alert_queue_value]);

  const dkd_enqueue_alert_value = useCallback((dkd_title_value, dkd_message_value, dkd_buttons_value, dkd_options_value) => {
    const dkd_next_alert_value = {
      dkd_id_value: `${Date.now()}-${Math.random()}`,
      dkd_title_value: String(dkd_title_value || 'Lootonia'),
      dkd_message_value: String(dkd_message_value || ''),
      dkd_buttons_value: dkd_alert_buttons_value(dkd_buttons_value),
      dkd_options_value: dkd_options_value && typeof dkd_options_value === 'object' ? dkd_options_value : {},
    };
    setDkdAlertQueueValue((dkd_previous_queue_value) => [...dkd_previous_queue_value, dkd_next_alert_value]);
  }, []);

  useEffect(() => {
    if (!dkd_original_alert_ref_value.current) {
      dkd_original_alert_ref_value.current = Alert.alert;
    }
    Alert.alert = dkd_enqueue_alert_value;
    return () => {
      if (dkd_original_alert_ref_value.current) {
        Alert.alert = dkd_original_alert_ref_value.current;
      }
    };
  }, [dkd_enqueue_alert_value]);

  const dkd_handle_backdrop_press_value = useCallback(() => {
    if (dkd_active_alert_value?.dkd_options_value?.cancelable === true) {
      dkd_close_active_alert_value();
    }
  }, [dkd_active_alert_value?.dkd_options_value?.cancelable, dkd_close_active_alert_value]);

  return (
    <>
      {dkd_props_value.children}
      <Modal visible={!!dkd_active_alert_value} transparent animationType="fade" statusBarTranslucent onRequestClose={dkd_handle_backdrop_press_value}>
        <Pressable style={dkd_alert_styles_value.dkd_backdrop} onPress={dkd_handle_backdrop_press_value}>
          <Pressable style={dkd_alert_styles_value.dkd_shell} onPress={() => {}}>
            <LinearGradient
              colors={dkd_alert_gradient_value(dkd_active_alert_value)}
              start={dkd_make_native_axis_point(0, 0)}
              end={dkd_make_native_axis_point(1, 1)}
              style={dkd_alert_styles_value.dkd_card}
            >
              <View style={dkd_alert_styles_value.dkd_orb_top} />
              <View style={dkd_alert_styles_value.dkd_orb_bottom} />
              <View style={dkd_alert_styles_value.dkd_header_row}>
                <LinearGradient
                  colors={dkd_alert_icon_gradient_value(dkd_active_alert_value)}
                  start={dkd_make_native_axis_point(0, 0)}
                  end={dkd_make_native_axis_point(1, 1)}
                  style={dkd_alert_styles_value.dkd_icon_shell}
                >
                  <MaterialCommunityIcons name={dkd_alert_icon_name_value(dkd_active_alert_value)} size={31} color="#FFFFFF" />
                </LinearGradient>
                <View style={dkd_alert_styles_value.dkd_header_copy}>
                  <Text style={dkd_alert_styles_value.dkd_eyebrow}>LOOTONIA BİLDİRİM</Text>
                  <Text style={dkd_alert_styles_value.dkd_title}>{dkd_active_alert_value?.dkd_title_value || 'Lootonia'}</Text>
                </View>
              </View>

              {dkd_active_alert_value?.dkd_message_value ? (
                <View style={dkd_alert_styles_value.dkd_message_panel}>
                  <Text style={dkd_alert_styles_value.dkd_message}>{dkd_active_alert_value.dkd_message_value}</Text>
                </View>
              ) : null}

              <View style={dkd_alert_styles_value.dkd_button_column}>
                {dkd_active_buttons_value.map((dkd_button_value, dkd_button_index_value) => {
                  const dkd_is_cancel_value = dkd_button_value?.style === 'cancel';
                  const dkd_is_destructive_value = dkd_button_value?.style === 'destructive';
                  const dkd_is_primary_value = !dkd_is_cancel_value && !dkd_is_destructive_value && dkd_button_index_value === dkd_active_buttons_value.length - 1;
                  const dkd_button_colors_value = dkd_is_destructive_value
                    ? ['#FF4D7D', '#FF8A3D']
                    : dkd_is_primary_value
                      ? ['#52F2A1', '#31D7FF', '#7C3AED']
                      : ['rgba(255,255,255,0.12)', 'rgba(126,235,255,0.10)'];
                  return (
                    <Pressable
                      key={`${dkd_active_alert_value?.dkd_id_value || 'dkd-alert'}-${dkd_button_index_value}`}
                      hitSlop={8}
                      onPress={() => {
                        setDkdAlertQueueValue((dkd_previous_queue_value) => dkd_previous_queue_value.slice(1));
                        if (typeof dkd_button_value?.onPress === 'function') {
                          setTimeout(() => dkd_button_value.onPress(), 0);
                        }
                      }}
                      style={({ pressed }) => [dkd_alert_styles_value.dkd_button_pressable, pressed ? dkd_alert_styles_value.dkd_button_pressed : null]}
                    >
                      <LinearGradient
                        colors={dkd_button_colors_value}
                        start={dkd_make_native_axis_point(0, 0)}
                        end={dkd_make_native_axis_point(1, 1)}
                        style={[dkd_alert_styles_value.dkd_button, dkd_is_cancel_value && dkd_alert_styles_value.dkd_button_cancel]}
                      >
                        <Text style={[dkd_alert_styles_value.dkd_button_text, dkd_is_cancel_value && dkd_alert_styles_value.dkd_button_cancel_text]}>{dkd_button_value.text}</Text>
                        {!dkd_is_cancel_value ? <MaterialCommunityIcons name="chevron-right" size={20} color="#FFFFFF" /> : null}
                      </LinearGradient>
                    </Pressable>
                  );
                })}
              </View>
            </LinearGradient>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const dkd_alert_styles_value = StyleSheet.create({
  dkd_backdrop: { flex: 1, backgroundColor: 'rgba(1,6,14,0.72)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  dkd_shell: { width: '100%', maxWidth: 430, borderRadius: 32 },
  dkd_card: { borderRadius: 32, padding: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(126,235,255,0.28)', shadowColor: '#31D7FF', shadowOpacity: 0.35, shadowRadius: 28, shadowOffset: { width: 0, height: 16 }, elevation: 28 },
  dkd_orb_top: { position: 'absolute', top: -58, right: -36, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(82,242,161,0.18)' },
  dkd_orb_bottom: { position: 'absolute', bottom: -78, left: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(124,58,237,0.22)' },
  dkd_header_row: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  dkd_icon_shell: { width: 64, height: 64, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  dkd_header_copy: { flex: 1, minWidth: 0 },
  dkd_eyebrow: { color: '#7EEBFF', fontSize: 10.5, fontWeight: '950', letterSpacing: 0.9 },
  dkd_title: { color: '#FFFFFF', fontSize: 23, fontWeight: '950', marginTop: 3, lineHeight: 28 },
  dkd_message_panel: { marginTop: 16, padding: 14, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.085)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)' },
  dkd_message: { color: 'rgba(238,249,255,0.92)', fontSize: 14, fontWeight: '780', lineHeight: 20 },
  dkd_button_column: { marginTop: 16, gap: 10 },
  dkd_button_pressable: { borderRadius: 22, overflow: 'hidden' },
  dkd_button_pressed: { transform: [{ scale: 0.985 }], opacity: 0.90 },
  dkd_button: { minHeight: 55, borderRadius: 22, paddingHorizontal: 15, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  dkd_button_cancel: { borderColor: 'rgba(255,255,255,0.14)' },
  dkd_button_text: { color: '#FFFFFF', fontSize: 15.5, fontWeight: '950', letterSpacing: 0.2 },
  dkd_button_cancel_text: { color: 'rgba(238,249,255,0.84)' },
});
