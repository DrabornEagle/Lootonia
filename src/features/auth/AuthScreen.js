import React, { useMemo, useState } from 'react';
import {
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { signInWithEmail, signUpWithEmail } from '../../services/authService';

const dkd_login_poster = require('../../../assets/auth/lootonia-login-poster.jpg');
const dkd_poster_width = 1024;
const dkd_poster_height = 1536;

const dkd_poster_rects = {
  email: { dkd_axis_left: 338, dkd_axis_top: 540, dkd_axis_width: 409, dkd_axis_height: 50 },
  password: { dkd_axis_left: 338, dkd_axis_top: 613, dkd_axis_width: 409, dkd_axis_height: 47 },
  eye: { dkd_axis_left: 676, dkd_axis_top: 602, dkd_axis_width: 56, dkd_axis_height: 47 },
  login: { dkd_axis_left: 336, dkd_axis_top: 681, dkd_axis_width: 321, dkd_axis_height: 58 },
  forgot: { dkd_axis_left: 386, dkd_axis_top: 742, dkd_axis_width: 248, dkd_axis_height: 34 },
  register: { dkd_axis_left: 339, dkd_axis_top: 832, dkd_axis_width: 317, dkd_axis_height: 58 },
  facebook: { dkd_axis_left: 269, dkd_axis_top: 970, dkd_axis_width: 470, dkd_axis_height: 63 },
  google: { dkd_axis_left: 270, dkd_axis_top: 1066, dkd_axis_width: 470, dkd_axis_height: 63 },
};

function dkd_pretty_auth_error(dkd_error_value, dkd_action_name) {
  const dkd_message_text = String((dkd_error_value && dkd_error_value.message) || dkd_error_value || '');
  const dkd_message_lower = dkd_message_text.toLowerCase();

  if (dkd_message_lower.includes('supabase ayarı eksik')) return 'Supabase .env ayarı eksik. URL ve anon key alanlarını doldur.';
  if (dkd_message_lower.includes('invalid login credentials')) return 'E-posta veya şifre hatalı.';
  if (dkd_message_lower.includes('email not confirmed')) return 'E-posta doğrulaması gerekiyor olabilir.';
  if (dkd_message_lower.includes('user already registered')) return 'Bu e-posta zaten kayıtlı. Direkt giriş yapabilirsin.';
  if (dkd_message_lower.includes('password should be at least')) return 'Şifre en az 6 karakter olmalı.';
  return dkd_message_text || (dkd_action_name === 'register' ? 'Kayıt sırasında hata oluştu.' : 'Giriş sırasında hata oluştu.');
}

function dkd_map_poster_rect(dkd_rect_value, dkd_metric_value) {
  return {
    position: 'absolute',
    left: dkd_metric_value.dkd_offset_left + dkd_rect_value.dkd_axis_left * dkd_metric_value.dkd_scale,
    top: dkd_metric_value.dkd_offset_top + dkd_rect_value.dkd_axis_top * dkd_metric_value.dkd_scale,
    width: dkd_rect_value.dkd_axis_width * dkd_metric_value.dkd_scale,
    height: dkd_rect_value.dkd_axis_height * dkd_metric_value.dkd_scale,
  };
}

function dkd_build_modal_styles(dkd_scale_value) {
  const dkd_font_size = Math.max(13, Math.min(16, 13 * dkd_scale_value));
  return StyleSheet.create({
    dkd_input_text: {
      fontSize: dkd_font_size,
      lineHeight: Math.round(dkd_font_size + 2),
      paddingLeft: 56 * dkd_scale_value,
      paddingRight: 54 * dkd_scale_value,
    },
  });
}

export default function AuthScreen({ mode = 'login', setMode = () => {} }) {
  const { width: dkd_screen_width, height: dkd_screen_height } = useWindowDimensions();
  const [dkd_email_value, dkd_set_email_value] = useState('');
  const [dkd_password_value, dkd_set_password_value] = useState('');
  const [dkd_show_password_flag, dkd_set_show_password_flag] = useState(false);
  const [dkd_loading_name, dkd_set_loading_name] = useState(null);
  const [dkd_register_modal_open_flag, dkd_set_register_modal_open_flag] = useState(false);
  const [dkd_register_email_value, dkd_set_register_email_value] = useState('');
  const [dkd_register_password_value, dkd_set_register_password_value] = useState('');
  const [dkd_register_password_repeat_value, dkd_set_register_password_repeat_value] = useState('');
  const [dkd_register_show_password_flag, dkd_set_register_show_password_flag] = useState(false);

  const dkd_metric_value = useMemo(() => {
    const dkd_scale_value = Math.max(dkd_screen_width / dkd_poster_width, dkd_screen_height / dkd_poster_height);
    const dkd_render_width = dkd_poster_width * dkd_scale_value;
    const dkd_render_height = dkd_poster_height * dkd_scale_value;
    return {
      dkd_scale: dkd_scale_value,
      dkd_render_width: dkd_render_width,
      dkd_render_height: dkd_render_height,
      dkd_offset_left: (dkd_screen_width - dkd_render_width) / 2,
      dkd_offset_top: (dkd_screen_height - dkd_render_height) / 2,
    };
  }, [dkd_screen_width, dkd_screen_height]);

  const dkd_dynamic_styles = useMemo(() => dkd_build_modal_styles(dkd_metric_value.dkd_scale), [dkd_metric_value.dkd_scale]);

  function dkd_normalize_email(dkd_raw_value) {
    return String(dkd_raw_value || '').trim().toLowerCase();
  }

  async function dkd_do_login() {
    try {
      const dkd_email_clean = dkd_normalize_email(dkd_email_value);
      if (!dkd_email_clean || !dkd_password_value) {
        Alert.alert('Giriş', 'E-posta ve şifre gir.');
        return;
      }
      dkd_set_loading_name('login');
      const dkd_result_value = await signInWithEmail(dkd_email_clean, dkd_password_value);
      if (dkd_result_value?.error) throw dkd_result_value.error;
    } catch (dkd_error_value) {
      Alert.alert('Giriş Hatası', dkd_pretty_auth_error(dkd_error_value, 'login'));
    } finally {
      dkd_set_loading_name(null);
    }
  }

  async function dkd_do_register() {
    try {
      const dkd_email_clean = dkd_normalize_email(dkd_register_email_value);
      if (!dkd_email_clean || !dkd_register_password_value || !dkd_register_password_repeat_value) {
        Alert.alert('Kayıt', 'E-posta, şifre ve şifre tekrar alanlarını doldur.');
        return;
      }
      if (dkd_register_password_value !== dkd_register_password_repeat_value) {
        Alert.alert('Kayıt', 'Şifreler aynı değil.');
        return;
      }
      if (dkd_register_password_value.length < 6) {
        Alert.alert('Kayıt', 'Şifre en az 6 karakter olmalı.');
        return;
      }
      dkd_set_loading_name('register');
      const dkd_result_value = await signUpWithEmail(dkd_email_clean, dkd_register_password_value);
      if (dkd_result_value?.error) throw dkd_result_value.error;
      const dkd_mail_confirm_needed = !(dkd_result_value?.data && dkd_result_value.data.session);
      Alert.alert(
        'Kayıt başarılı',
        dkd_mail_confirm_needed
          ? 'Hesap oluşturuldu. Gerekirse e-postanı onayla.'
          : 'Hesap oluşturuldu. Şimdi giriş yapabilirsin.'
      );
      dkd_set_register_modal_open_flag(false);
      dkd_set_register_email_value('');
      dkd_set_register_password_value('');
      dkd_set_register_password_repeat_value('');
      dkd_set_register_show_password_flag(false);
      dkd_set_email_value(dkd_email_clean);
      if (typeof setMode === 'function') setMode('login');
    } catch (dkd_error_value) {
      Alert.alert('Kayıt Hatası', dkd_pretty_auth_error(dkd_error_value, 'register'));
    } finally {
      dkd_set_loading_name(null);
    }
  }

  return (
    <View style={dkd_styles.dkd_root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <ImageBackground source={dkd_login_poster} resizeMode="cover" style={dkd_styles.dkd_poster}>
        <KeyboardAvoidingView
          style={dkd_styles.dkd_fill}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <TextInput
            value={dkd_email_value}
            onChangeText={dkd_set_email_value}
            placeholder="E-posta"
            placeholderTextColor="rgba(255,255,255,0.36)"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            selectionColor="#ffffff"
            returnKeyType="next"
            style={[
              dkd_styles.dkd_poster_input,
              dkd_dynamic_styles.dkd_input_text,
              dkd_map_poster_rect(dkd_poster_rects.email, dkd_metric_value),
            ]}
          />

          <TextInput
            value={dkd_password_value}
            onChangeText={dkd_set_password_value}
            placeholder="Şifre"
            placeholderTextColor="rgba(255,255,255,0.36)"
            secureTextEntry={!dkd_show_password_flag}
            autoCapitalize="none"
            autoCorrect={false}
            selectionColor="#ffffff"
            returnKeyType="go"
            onSubmitEditing={dkd_do_login}
            style={[
              dkd_styles.dkd_poster_input,
              dkd_dynamic_styles.dkd_input_text,
              dkd_map_poster_rect(dkd_poster_rects.password, dkd_metric_value),
            ]}
          />

          <Pressable
            onPress={() => dkd_set_show_password_flag((dkd_flag_value) => !dkd_flag_value)}
            style={[dkd_map_poster_rect(dkd_poster_rects.eye, dkd_metric_value), dkd_styles.dkd_tap_layer, dkd_styles.dkd_eye_layer]}
            hitSlop={14}
          />

          <Pressable
            onPress={dkd_do_login}
            style={[dkd_map_poster_rect(dkd_poster_rects.login, dkd_metric_value), dkd_styles.dkd_tap_layer, dkd_styles.dkd_login_layer]}
            hitSlop={{ top: 18, bottom: 18, left: 18, right: 18 }}
          />

          <Pressable
            onPress={() => Alert.alert('Şifre Sıfırla', 'Şifre sıfırlama akışı sonraki fazda bağlanacak.')}
            style={[dkd_map_poster_rect(dkd_poster_rects.forgot, dkd_metric_value), dkd_styles.dkd_tap_layer, dkd_styles.dkd_action_layer]}
            hitSlop={10}
          />

          <Pressable
            onPress={() => {
              if (dkd_loading_name) return;
              dkd_set_register_email_value(dkd_email_value);
              dkd_set_register_modal_open_flag(true);
              if (typeof setMode === 'function') setMode('register');
            }}
            style={[dkd_map_poster_rect(dkd_poster_rects.register, dkd_metric_value), dkd_styles.dkd_tap_layer, dkd_styles.dkd_action_layer]}
            hitSlop={12}
          />

          <Pressable
            onPress={() => Alert.alert('Yakında', 'Facebook giriş bağlantısı henüz bağlanmadı.')}
            style={[dkd_map_poster_rect(dkd_poster_rects.facebook, dkd_metric_value), dkd_styles.dkd_tap_layer, dkd_styles.dkd_social_layer]}
            hitSlop={12}
          />

          <Pressable
            onPress={() => Alert.alert('Yakında', 'Google giriş bağlantısı henüz bağlanmadı.')}
            style={[dkd_map_poster_rect(dkd_poster_rects.google, dkd_metric_value), dkd_styles.dkd_tap_layer, dkd_styles.dkd_social_layer]}
            hitSlop={12}
          />

          {!!dkd_loading_name && (
            <View style={dkd_styles.dkd_loading_badge} pointerEvents="none">
              <Text style={dkd_styles.dkd_loading_text}>
                {dkd_loading_name === 'register' ? 'Kayıt oluşturuluyor...' : 'Giriş kontrol ediliyor...'}
              </Text>
            </View>
          )}
        </KeyboardAvoidingView>
      </ImageBackground>

      <Modal
        visible={dkd_register_modal_open_flag}
        animationType="fade"
        transparent
        onRequestClose={() => dkd_set_register_modal_open_flag(false)}
      >
        <KeyboardAvoidingView
          style={dkd_styles.dkd_modal_backdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => dkd_set_register_modal_open_flag(false)} />
          <View style={dkd_styles.dkd_modal_card}>
            <Text style={dkd_styles.dkd_modal_title}>Kayıt Ol</Text>
            <Text style={dkd_styles.dkd_modal_subtitle}>Yeni Lootonia hesabını oluştur.</Text>

            <TextInput
              value={dkd_register_email_value}
              onChangeText={dkd_set_register_email_value}
              placeholder="E-posta"
              placeholderTextColor="rgba(255,255,255,0.42)"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={dkd_styles.dkd_modal_input}
            />
            <TextInput
              value={dkd_register_password_value}
              onChangeText={dkd_set_register_password_value}
              placeholder="Şifre"
              placeholderTextColor="rgba(255,255,255,0.42)"
              secureTextEntry={!dkd_register_show_password_flag}
              autoCapitalize="none"
              autoCorrect={false}
              style={dkd_styles.dkd_modal_input}
            />
            <TextInput
              value={dkd_register_password_repeat_value}
              onChangeText={dkd_set_register_password_repeat_value}
              placeholder="Şifre tekrar"
              placeholderTextColor="rgba(255,255,255,0.42)"
              secureTextEntry={!dkd_register_show_password_flag}
              autoCapitalize="none"
              autoCorrect={false}
              style={dkd_styles.dkd_modal_input}
            />

            <Pressable onPress={() => dkd_set_register_show_password_flag((dkd_flag_value) => !dkd_flag_value)} style={dkd_styles.dkd_modal_switch_btn}>
              <Text style={dkd_styles.dkd_modal_switch_text}>{dkd_register_show_password_flag ? 'Şifreyi gizle' : 'Şifreyi göster'}</Text>
            </Pressable>

            <View style={dkd_styles.dkd_modal_action_row}>
              <Pressable onPress={() => dkd_set_register_modal_open_flag(false)} style={[dkd_styles.dkd_modal_btn, dkd_styles.dkd_modal_btn_ghost]}>
                <Text style={dkd_styles.dkd_modal_btn_text}>Vazgeç</Text>
              </Pressable>
              <Pressable onPress={dkd_do_register} style={[dkd_styles.dkd_modal_btn, dkd_styles.dkd_modal_btn_primary]}>
                <Text style={dkd_styles.dkd_modal_btn_text}>{dkd_loading_name === 'register' ? 'Oluşturuluyor...' : 'Hesap Oluştur'}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const dkd_styles = StyleSheet.create({
  dkd_root: { flex: 1, backgroundColor: '#05070B' },
  dkd_poster: { flex: 1, backgroundColor: '#05070B' },
  dkd_fill: { flex: 1 },
  dkd_poster_input: {
    position: 'absolute',
    color: '#FFFFFF',
    backgroundColor: 'transparent',
    fontWeight: '600',
    paddingTop: 0,
    paddingBottom: 0,
    paddingVertical: 0,
    margin: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
    textShadowColor: 'rgba(0,0,0,0.80)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    zIndex: 120,
    elevation: 120,
  },
  dkd_tap_layer: { backgroundColor: 'transparent', position: 'absolute' },
  dkd_eye_layer: { zIndex: 180, elevation: 180 },
  dkd_login_layer: { zIndex: 250, elevation: 250 },
  dkd_action_layer: { zIndex: 170, elevation: 170 },
  dkd_social_layer: { zIndex: 160, elevation: 160 },
  dkd_loading_badge: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 18,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(0,0,0,0.54)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    zIndex: 400,
    elevation: 400,
  },
  dkd_loading_text: { textAlign: 'center', color: '#FFFFFF', fontSize: 13, fontWeight: '800', letterSpacing: 0.2 },
  dkd_modal_backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  dkd_modal_card: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: 'rgba(8,12,20,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  dkd_modal_title: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  dkd_modal_subtitle: { color: 'rgba(255,255,255,0.70)', fontSize: 13, marginTop: 4, marginBottom: 12 },
  dkd_modal_input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 10,
  },
  dkd_modal_switch_btn: { marginTop: 12, alignSelf: 'flex-start' },
  dkd_modal_switch_text: { color: '#A9E8FF', fontWeight: '800' },
  dkd_modal_action_row: { flexDirection: 'row', gap: 10, marginTop: 16 },
  dkd_modal_btn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dkd_modal_btn_ghost: { backgroundColor: 'rgba(255,255,255,0.08)' },
  dkd_modal_btn_primary: { backgroundColor: '#4DA6FF' },
  dkd_modal_btn_text: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
});
