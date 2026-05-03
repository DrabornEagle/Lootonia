import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { signInWithEmail, signUpWithEmail } from '../../services/authService';
import { dkd_make_native_axis_point } from '../../utils/dkdNativeAxis';

const dkd_region_presets_value = {
  Türkiye: {
    Ankara: ['Çankaya', 'Etimesgut', 'Eryaman', 'Yenimahalle', 'Keçiören', 'Sincan', 'Mamak', 'Gölbaşı', 'Pursaklar', 'Altındağ'],
    İstanbul: ['Kadıköy', 'Beşiktaş', 'Şişli', 'Üsküdar', 'Bakırköy', 'Ataşehir', 'Maltepe', 'Beylikdüzü'],
    İzmir: ['Konak', 'Karşıyaka', 'Bornova', 'Buca', 'Balçova', 'Gaziemir'],
  },
  USA: {
    'New York': ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'],
    'Los Angeles': ['Hollywood', 'Downtown LA', 'Santa Monica', 'Beverly Hills', 'Pasadena'],
    Miami: ['Downtown Miami', 'Miami Beach', 'Brickell', 'Wynwood', 'Doral'],
    Chicago: ['The Loop', 'River North', 'Lincoln Park', 'Hyde Park'],
    Houston: ['Downtown Houston', 'Midtown', 'Uptown', 'Westchase'],
  },
  BAE: {
    Dubai: ['Downtown', 'Business Bay', 'Dubai Marina', 'Jumeirah', 'Deira', 'Al Barsha'],
    AbuDhabi: ['Corniche', 'Yas Island', 'Khalifa City', 'Al Reem'],
  },
};

const dkd_country_options_value = Object.keys(dkd_region_presets_value);

function dkd_country_city_options_value(dkd_country_value) {
  return Object.keys(dkd_region_presets_value?.[dkd_country_value] || dkd_region_presets_value['Türkiye']);
}

function dkd_region_options_value(dkd_country_value, dkd_city_value) {
  return dkd_region_presets_value?.[dkd_country_value]?.[dkd_city_value] || [];
}

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

function dkd_normalize_email(dkd_raw_value) {
  return String(dkd_raw_value || '').trim().toLowerCase();
}

function DkdAuthPill({ dkd_icon_name, dkd_text }) {
  return (
    <View style={dkd_styles.dkd_pill_shell}>
      <MaterialCommunityIcons name={dkd_icon_name} size={14} color="#9AF8FF" />
      <Text style={dkd_styles.dkd_pill_text}>{dkd_text}</Text>
    </View>
  );
}

function DkdRegisterChoiceRow({ dkd_options, dkd_value, dkd_on_change, dkd_icon_name }) {
  return (
    <View style={dkd_styles.dkd_choice_wrap}>
      {dkd_options.map((dkd_option_value) => {
        const dkd_active_value = String(dkd_value || '') === String(dkd_option_value || '');
        return (
          <Pressable
            key={dkd_option_value}
            onPress={() => dkd_on_change?.(dkd_option_value)}
            style={[dkd_styles.dkd_choice_chip, dkd_active_value && dkd_styles.dkd_choice_chip_active]}
          >
            {dkd_active_value ? <LinearGradient colors={['#8CF2FF', '#82FFCB', '#FFD36E']} style={StyleSheet.absoluteFill} /> : null}
            <MaterialCommunityIcons name={dkd_icon_name} size={13} color={dkd_active_value ? '#07111C' : 'rgba(231,241,255,0.78)'} />
            <Text style={[dkd_styles.dkd_choice_text, dkd_active_value && dkd_styles.dkd_choice_text_active]}>{dkd_option_value}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function AuthScreen({ mode = 'login', setMode = () => {} }) {
  const [dkd_email_value, dkd_set_email_value] = useState('');
  const [dkd_password_value, dkd_set_password_value] = useState('');
  const [dkd_show_password_flag, dkd_set_show_password_flag] = useState(false);
  const [dkd_loading_name, dkd_set_loading_name] = useState(null);
  const [dkd_register_modal_open_flag, dkd_set_register_modal_open_flag] = useState(mode === 'register');
  const [dkd_register_email_value, dkd_set_register_email_value] = useState('');
  const [dkd_register_password_value, dkd_set_register_password_value] = useState('');
  const [dkd_register_password_repeat_value, dkd_set_register_password_repeat_value] = useState('');
  const [dkd_register_show_password_flag, dkd_set_register_show_password_flag] = useState(false);
  const [dkd_register_country_value, dkd_set_register_country_value] = useState('Türkiye');
  const [dkd_register_city_value, dkd_set_register_city_value] = useState('Ankara');
  const [dkd_register_region_value, dkd_set_register_region_value] = useState('Çankaya');
  const dkd_glow_motion_value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const dkd_loop_value = Animated.loop(
      Animated.sequence([
        Animated.timing(dkd_glow_motion_value, { toValue: 1, duration: 2600, useNativeDriver: true }),
        Animated.timing(dkd_glow_motion_value, { toValue: 0, duration: 2600, useNativeDriver: true }),
      ])
    );
    dkd_loop_value.start();
    return () => dkd_loop_value.stop();
  }, [dkd_glow_motion_value]);

  useEffect(() => {
    if (mode === 'register') dkd_set_register_modal_open_flag(true);
  }, [mode]);

  const dkd_available_city_options_value = useMemo(() => dkd_country_city_options_value(dkd_register_country_value), [dkd_register_country_value]);
  const dkd_available_region_options_value = useMemo(() => dkd_region_options_value(dkd_register_country_value, dkd_register_city_value), [dkd_register_country_value, dkd_register_city_value]);

  const dkd_hero_glow_opacity_value = dkd_glow_motion_value.interpolate({
    inputRange: [0, 1],
    outputRange: [0.38, 0.82],
  });
  const dkd_hero_glow_scale_value = dkd_glow_motion_value.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.08],
  });

  function dkd_open_register_modal() {
    if (dkd_loading_name) return;
    dkd_set_register_email_value(dkd_email_value);
    dkd_set_register_modal_open_flag(true);
    if (typeof setMode === 'function') setMode('register');
  }

  function dkd_close_register_modal() {
    dkd_set_register_modal_open_flag(false);
    if (typeof setMode === 'function') setMode('login');
  }

  function dkd_change_register_country(dkd_country_value) {
    const dkd_next_city_value = dkd_country_city_options_value(dkd_country_value)?.[0] || '';
    const dkd_next_region_value = dkd_region_options_value(dkd_country_value, dkd_next_city_value)?.[0] || '';
    dkd_set_register_country_value(dkd_country_value);
    dkd_set_register_city_value(dkd_next_city_value);
    dkd_set_register_region_value(dkd_next_region_value);
  }

  function dkd_change_register_city(dkd_city_value) {
    const dkd_next_region_value = dkd_region_options_value(dkd_register_country_value, dkd_city_value)?.[0] || '';
    dkd_set_register_city_value(dkd_city_value);
    dkd_set_register_region_value(dkd_next_region_value);
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
      const dkd_country_clean = String(dkd_register_country_value || '').trim();
      const dkd_city_clean = String(dkd_register_city_value || '').trim();
      const dkd_region_clean = String(dkd_register_region_value || '').trim();
      if (!dkd_email_clean || !dkd_register_password_value || !dkd_register_password_repeat_value) {
        Alert.alert('Kayıt', 'E-posta, şifre ve şifre tekrar alanlarını doldur.');
        return;
      }
      if (!dkd_country_clean || !dkd_city_clean || !dkd_region_clean) {
        Alert.alert('Kayıt', 'Ülke, şehir ve bölge seç.');
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
      const dkd_result_value = await signUpWithEmail(dkd_email_clean, dkd_register_password_value, {
        dkd_country: dkd_country_clean,
        dkd_city: dkd_city_clean,
        dkd_region: dkd_region_clean,
      });
      if (dkd_result_value?.error) throw dkd_result_value.error;
      const dkd_mail_confirm_needed = !(dkd_result_value?.data && dkd_result_value.data.session);
      Alert.alert(
        'Kayıt başarılı',
        dkd_mail_confirm_needed
          ? 'Hesap oluşturuldu. Gerekirse e-postanı onayla. Bölge bilgisi profiline işlendi.'
          : 'Hesap oluşturuldu. Bölge bilgisi profiline işlendi ve giriş hazır.'
      );
      dkd_close_register_modal();
      dkd_set_register_email_value('');
      dkd_set_register_password_value('');
      dkd_set_register_password_repeat_value('');
      dkd_set_register_show_password_flag(false);
      dkd_set_email_value(dkd_email_clean);
    } catch (dkd_error_value) {
      Alert.alert('Kayıt Hatası', dkd_pretty_auth_error(dkd_error_value, 'register'));
    } finally {
      dkd_set_loading_name(null);
    }
  }

  return (
    <View style={dkd_styles.dkd_root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <LinearGradient colors={['#030713', '#071B2B', '#160A2E', '#040711']} style={dkd_styles.dkd_root}>
        <View style={dkd_styles.dkd_orb_blue} />
        <View style={dkd_styles.dkd_orb_purple} />
        <Animated.View style={[dkd_styles.dkd_hero_glow, { opacity: dkd_hero_glow_opacity_value, transform: [{ scale: dkd_hero_glow_scale_value }] }]} />
        <KeyboardAvoidingView style={dkd_styles.dkd_keyboard_shell} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={dkd_styles.dkd_scroll_shell} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={dkd_styles.dkd_brand_shell}>
              <LinearGradient colors={['rgba(103,232,249,0.95)', 'rgba(129,140,248,0.94)', 'rgba(244,114,182,0.92)']} style={dkd_styles.dkd_logo_shell}>
                <MaterialCommunityIcons name="map-marker-star" size={34} color="#FFFFFF" />
              </LinearGradient>
              <View style={dkd_styles.dkd_brand_copy}>
                <Text style={dkd_styles.dkd_brand_overline}>LOOTONIA OPERASYON AĞI</Text>
                <Text style={dkd_styles.dkd_brand_title}>Şehrin ganimeti, rotan ve marketin tek merkezde.</Text>
                <Text style={dkd_styles.dkd_brand_subtitle}>Kurye, Kargo, Yemek, Market ve benzeri bütün ihtiyaçlarınız tek bir platform üzerinden yönet. Sandık topla ödül kazan ve Kart koleksiyonu yap.</Text>
              </View>
            </View>

            <View style={dkd_styles.dkd_pill_row}>
              <DkdAuthPill dkd_icon_name="truck-fast-outline" dkd_text="Kurye-Kargo" />
              <DkdAuthPill dkd_icon_name="food-fork-drink" dkd_text="Yemek-Market" />
              <DkdAuthPill dkd_icon_name="treasure-chest" dkd_text="Ödüller" />
            </View>

            <View style={dkd_styles.dkd_auth_card}>
              <LinearGradient colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0.08)']} style={StyleSheet.absoluteFill} />
              <View style={dkd_styles.dkd_card_top_line} />
              <Text style={dkd_styles.dkd_card_title}>Lootonia’ya Giriş</Text>
              <Text style={dkd_styles.dkd_card_subtitle}>Hesabınla devam et, aktif operasyonlarını ve bakiye akışını aç.</Text>

              <View style={dkd_styles.dkd_input_shell}>
                <MaterialCommunityIcons name="email-outline" size={20} color="#9AF8FF" />
                <TextInput
                  value={dkd_email_value}
                  onChangeText={dkd_set_email_value}
                  placeholder="E-posta"
                  placeholderTextColor="rgba(231,241,255,0.42)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  selectionColor="#9AF8FF"
                  style={dkd_styles.dkd_input_text}
                />
              </View>

              <View style={dkd_styles.dkd_input_shell}>
                <MaterialCommunityIcons name="lock-outline" size={20} color="#B7A6FF" />
                <TextInput
                  value={dkd_password_value}
                  onChangeText={dkd_set_password_value}
                  placeholder="Şifre"
                  placeholderTextColor="rgba(231,241,255,0.42)"
                  secureTextEntry={!dkd_show_password_flag}
                  autoCapitalize="none"
                  autoCorrect={false}
                  selectionColor="#B7A6FF"
                  returnKeyType="go"
                  onSubmitEditing={dkd_do_login}
                  style={dkd_styles.dkd_input_text}
                />
                <Pressable onPress={() => dkd_set_show_password_flag((dkd_flag_value) => !dkd_flag_value)} hitSlop={10}>
                  <MaterialCommunityIcons name={dkd_show_password_flag ? 'eye-off-outline' : 'eye-outline'} size={21} color="rgba(231,241,255,0.76)" />
                </Pressable>
              </View>

              <Pressable onPress={dkd_do_login} disabled={dkd_loading_name === 'login'} style={[dkd_styles.dkd_primary_button, dkd_loading_name === 'login' && dkd_styles.dkd_disabled_button]}>
                <LinearGradient colors={['#62E6FF', '#708FFF', '#C46BFF']} start={dkd_make_native_axis_point(0, 0)} end={dkd_make_native_axis_point(1, 1)} style={StyleSheet.absoluteFill} />
                <MaterialCommunityIcons name="rocket-launch-outline" size={19} color="#FFFFFF" />
                <Text style={dkd_styles.dkd_primary_button_text}>{dkd_loading_name === 'login' ? 'Giriş yapılıyor...' : 'Kazanmaya Başla'}</Text>
              </Pressable>

              <View style={dkd_styles.dkd_auth_action_row}>
                <Pressable onPress={() => Alert.alert('Şifre Sıfırla', 'Şifre sıfırlama akışı sonraki fazda bağlanacak.')} style={dkd_styles.dkd_link_button}>
                  <Text style={dkd_styles.dkd_link_text}>Şifremi unuttum</Text>
                </Pressable>
                <Pressable onPress={dkd_open_register_modal} style={dkd_styles.dkd_register_button}>
                  <MaterialCommunityIcons name="account-plus-outline" size={16} color="#07111C" />
                  <Text style={dkd_styles.dkd_register_button_text}>Kayıt ol</Text>
                </Pressable>
              </View>
            </View>

            <View style={dkd_styles.dkd_bottom_note_card}>
              <MaterialCommunityIcons name="crosshairs-gps" size={18} color="#63F1B1" />
              <Text style={dkd_styles.dkd_bottom_note_text}>Yeni kayıt sırasında seçtiğin ülke, şehir ve bölge kurye sipariş eşleşmesinde kullanılacak.</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>

      <Modal visible={dkd_register_modal_open_flag} animationType="slide" onRequestClose={dkd_close_register_modal}>
        <KeyboardAvoidingView style={dkd_styles.dkd_modal_backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <LinearGradient colors={['#040A19', '#082A3E', '#25104A', '#070915']} style={StyleSheet.absoluteFill} />
          <View style={dkd_styles.dkd_modal_orb_cyan} />
          <View style={dkd_styles.dkd_modal_orb_gold} />
          <View style={dkd_styles.dkd_modal_card}>
            <View style={dkd_styles.dkd_modal_header_row}>
              <View style={dkd_styles.dkd_modal_header_title_row}>
                <LinearGradient colors={['#62E6FF', '#72FFBF', '#FFE074']} style={dkd_styles.dkd_modal_logo}>
                  <MaterialCommunityIcons name="account-star-outline" size={24} color="#061427" />
                </LinearGradient>
                <View style={dkd_styles.dkd_modal_header_copy}>
                  <Text style={dkd_styles.dkd_modal_title}>Kayıt Ol</Text>
                  <Text style={dkd_styles.dkd_modal_subtitle}>Hesap, lokasyon ve kazanç bölgesi tek adımda hazır.</Text>
                </View>
              </View>
              <Pressable onPress={dkd_close_register_modal} style={dkd_styles.dkd_modal_close_button}>
                <MaterialCommunityIcons name="close" size={20} color="#FFFFFF" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={dkd_styles.dkd_modal_scroll_content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={dkd_styles.dkd_register_hero_card}>
                <LinearGradient colors={['rgba(98,230,255,0.24)', 'rgba(114,255,191,0.14)', 'rgba(255,224,116,0.12)']} style={StyleSheet.absoluteFill} />
                <View style={dkd_styles.dkd_register_hero_icon}>
                  <MaterialCommunityIcons name="treasure-chest" size={26} color="#FFE074" />
                </View>
                <View style={dkd_styles.dkd_register_hero_copy}>
                  <Text style={dkd_styles.dkd_register_hero_title}>Lootonia hesabını kur</Text>
                  <Text style={dkd_styles.dkd_register_hero_text}>Bölgeni seç, kurye-kargo ve market akışlarında doğru sipariş eşleşmesine hazır ol.</Text>
                </View>
              </View>

              <View style={dkd_styles.dkd_register_badge_row}>
                <View style={dkd_styles.dkd_register_badge_chip}>
                  <MaterialCommunityIcons name="shield-check-outline" size={14} color="#9AF8FF" />
                  <Text style={dkd_styles.dkd_register_badge_text}>Güvenli hesap</Text>
                </View>
                <View style={dkd_styles.dkd_register_badge_chip}>
                  <MaterialCommunityIcons name="map-marker-path" size={14} color="#72FFBF" />
                  <Text style={dkd_styles.dkd_register_badge_text}>Bölge eşleşmesi</Text>
                </View>
              </View>

              <View style={dkd_styles.dkd_modal_section_card}>
                <View style={dkd_styles.dkd_modal_section_header}>
                  <View style={dkd_styles.dkd_modal_section_icon}>
                    <MaterialCommunityIcons name="account-key-outline" size={18} color="#061427" />
                  </View>
                  <View>
                    <Text style={dkd_styles.dkd_modal_section_kicker}>1. ADIM</Text>
                    <Text style={dkd_styles.dkd_modal_section_heading}>Hesap bilgileri</Text>
                  </View>
                </View>

                <View style={dkd_styles.dkd_modal_input_shell}>
                  <MaterialCommunityIcons name="email-outline" size={18} color="#9AF8FF" />
                  <TextInput
                    value={dkd_register_email_value}
                    onChangeText={dkd_set_register_email_value}
                    placeholder="E-posta"
                    placeholderTextColor="rgba(231,241,255,0.42)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={dkd_styles.dkd_modal_input}
                  />
                </View>

                <View style={dkd_styles.dkd_modal_input_shell}>
                  <MaterialCommunityIcons name="lock-outline" size={18} color="#B7A6FF" />
                  <TextInput
                    value={dkd_register_password_value}
                    onChangeText={dkd_set_register_password_value}
                    placeholder="Şifre"
                    placeholderTextColor="rgba(231,241,255,0.42)"
                    secureTextEntry={!dkd_register_show_password_flag}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={dkd_styles.dkd_modal_input}
                  />
                </View>

                <View style={dkd_styles.dkd_modal_input_shell}>
                  <MaterialCommunityIcons name="lock-check-outline" size={18} color="#63F1B1" />
                  <TextInput
                    value={dkd_register_password_repeat_value}
                    onChangeText={dkd_set_register_password_repeat_value}
                    placeholder="Şifre tekrar"
                    placeholderTextColor="rgba(231,241,255,0.42)"
                    secureTextEntry={!dkd_register_show_password_flag}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={dkd_styles.dkd_modal_input}
                  />
                </View>

                <Pressable onPress={() => dkd_set_register_show_password_flag((dkd_flag_value) => !dkd_flag_value)} style={dkd_styles.dkd_modal_switch_btn}>
                  <MaterialCommunityIcons name={dkd_register_show_password_flag ? 'eye-off-outline' : 'eye-outline'} size={16} color="#A9E8FF" />
                  <Text style={dkd_styles.dkd_modal_switch_text}>{dkd_register_show_password_flag ? 'Şifreyi gizle' : 'Şifreyi göster'}</Text>
                </Pressable>
              </View>

              <View style={dkd_styles.dkd_modal_section_card}>
                <View style={dkd_styles.dkd_modal_section_header}>
                  <View style={dkd_styles.dkd_modal_section_icon}>
                    <MaterialCommunityIcons name="map-marker-star-outline" size={18} color="#061427" />
                  </View>
                  <View>
                    <Text style={dkd_styles.dkd_modal_section_kicker}>2. ADIM</Text>
                    <Text style={dkd_styles.dkd_modal_section_heading}>Operasyon bölgesi</Text>
                  </View>
                </View>

                <Text style={dkd_styles.dkd_modal_section_title}>Ülke</Text>
                <DkdRegisterChoiceRow dkd_options={dkd_country_options_value} dkd_value={dkd_register_country_value} dkd_on_change={dkd_change_register_country} dkd_icon_name="flag-outline" />

                <Text style={dkd_styles.dkd_modal_section_title}>Şehir</Text>
                <DkdRegisterChoiceRow dkd_options={dkd_available_city_options_value} dkd_value={dkd_register_city_value} dkd_on_change={dkd_change_register_city} dkd_icon_name="city-variant-outline" />

                <Text style={dkd_styles.dkd_modal_section_title}>Bölge</Text>
                <DkdRegisterChoiceRow dkd_options={dkd_available_region_options_value} dkd_value={dkd_register_region_value} dkd_on_change={dkd_set_register_region_value} dkd_icon_name="map-marker-radius-outline" />
              </View>

              <View style={dkd_styles.dkd_modal_action_row}>
                <Pressable onPress={dkd_close_register_modal} style={[dkd_styles.dkd_modal_btn, dkd_styles.dkd_modal_btn_ghost]}>
                  <Text style={dkd_styles.dkd_modal_btn_text}>Vazgeç</Text>
                </Pressable>
                <Pressable onPress={dkd_do_register} disabled={dkd_loading_name === 'register'} style={[dkd_styles.dkd_modal_btn, dkd_styles.dkd_modal_btn_primary, dkd_loading_name === 'register' && dkd_styles.dkd_disabled_button]}>
                  <LinearGradient colors={['#62E6FF', '#72FFBF', '#FFE074']} style={StyleSheet.absoluteFill} />
                  <MaterialCommunityIcons name="account-check-outline" size={18} color="#061427" />
                  <Text style={dkd_styles.dkd_modal_btn_primary_text}>{dkd_loading_name === 'register' ? 'Oluşturuluyor...' : 'Hesap Oluştur'}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const dkd_styles = StyleSheet.create({
  dkd_root: { flex: 1, backgroundColor: '#030713' },
  dkd_keyboard_shell: { flex: 1 },
  dkd_scroll_shell: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 74, paddingBottom: 26, justifyContent: 'center' },
  dkd_orb_blue: { position: 'absolute', width: 280, height: 280, borderRadius: 999, backgroundColor: 'rgba(56,189,248,0.24)', top: -84, right: -96 },
  dkd_orb_purple: { position: 'absolute', width: 300, height: 300, borderRadius: 999, backgroundColor: 'rgba(168,85,247,0.20)', bottom: -96, left: -110 },
  dkd_hero_glow: { position: 'absolute', width: 260, height: 260, borderRadius: 999, backgroundColor: 'rgba(52,211,153,0.18)', top: 160, alignSelf: 'center' },
  dkd_brand_shell: { alignItems: 'center' },
  dkd_logo_shell: { width: 74, height: 74, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.42)', shadowColor: '#67E8F9', shadowOpacity: 0.34, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
  dkd_brand_copy: { marginTop: 18, alignItems: 'center', paddingHorizontal: 4 },
  dkd_brand_overline: { color: '#9AF8FF', fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
  dkd_brand_title: { color: '#FFFFFF', fontSize: 32, lineHeight: 37, textAlign: 'center', marginTop: 8, fontWeight: '900', letterSpacing: -0.7 },
  dkd_brand_subtitle: { color: 'rgba(231,241,255,0.76)', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 10, fontWeight: '600' },
  dkd_pill_row: { flexDirection: 'row', flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 18 },
  dkd_pill_shell: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  dkd_pill_text: { color: 'rgba(231,241,255,0.88)', fontSize: 11, fontWeight: '800' },
  dkd_auth_card: { marginTop: 24, borderRadius: 30, padding: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', backgroundColor: 'rgba(5,11,22,0.74)', shadowColor: '#000', shadowOpacity: 0.34, shadowRadius: 24, shadowOffset: { width: 0, height: 14 }, elevation: 12 },
  dkd_card_top_line: { position: 'absolute', left: 24, right: 24, top: 0, height: 2, borderRadius: 99, backgroundColor: 'rgba(154,248,255,0.74)' },
  dkd_card_title: { color: '#FFFFFF', fontSize: 23, fontWeight: '900' },
  dkd_card_subtitle: { color: 'rgba(231,241,255,0.66)', fontSize: 13, lineHeight: 19, marginTop: 5, marginBottom: 14, fontWeight: '600' },
  dkd_input_shell: { minHeight: 56, borderRadius: 19, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.07)', flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14, marginTop: 10 },
  dkd_input_text: { flex: 1, color: '#FFFFFF', fontSize: 15, fontWeight: '700', paddingVertical: 0 },
  dkd_primary_button: { marginTop: 16, minHeight: 56, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9, shadowColor: '#67E8F9', shadowOpacity: 0.25, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 9 },
  dkd_primary_button_text: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 0.2 },
  dkd_disabled_button: { opacity: 0.58 },
  dkd_auth_action_row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 14 },
  dkd_link_button: { paddingVertical: 10, paddingHorizontal: 4 },
  dkd_link_text: { color: '#A9E8FF', fontSize: 13, fontWeight: '800' },
  dkd_register_button: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#8CF2FF' },
  dkd_register_button_text: { color: '#07111C', fontSize: 13, fontWeight: '900' },
  dkd_bottom_note_card: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, borderRadius: 20, padding: 13, backgroundColor: 'rgba(99,241,177,0.10)', borderWidth: 1, borderColor: 'rgba(99,241,177,0.18)' },
  dkd_bottom_note_text: { flex: 1, color: 'rgba(231,241,255,0.76)', fontSize: 12, lineHeight: 17, fontWeight: '700' },
  dkd_modal_backdrop: { flex: 1, backgroundColor: '#040A19', justifyContent: 'stretch' },
  dkd_modal_card: { flex: 1, borderRadius: 0, paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 48 : 62, paddingBottom: 14, overflow: 'hidden', backgroundColor: 'transparent', borderWidth: 0 },
  dkd_modal_orb_cyan: { position: 'absolute', width: 260, height: 260, borderRadius: 999, backgroundColor: 'rgba(98,230,255,0.20)', top: -70, right: -96 },
  dkd_modal_orb_gold: { position: 'absolute', width: 250, height: 250, borderRadius: 999, backgroundColor: 'rgba(255,224,116,0.15)', bottom: -88, left: -88 },
  dkd_modal_scroll_content: { paddingBottom: 18 },
  dkd_modal_header_title_row: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11 },
  dkd_modal_logo: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.34)' },
  dkd_modal_header_copy: { flex: 1 },
  dkd_register_hero_card: { minHeight: 112, borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', backgroundColor: 'rgba(255,255,255,0.08)', flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15, marginBottom: 10 },
  dkd_register_hero_icon: { width: 54, height: 54, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(5,11,22,0.48)', borderWidth: 1, borderColor: 'rgba(255,224,116,0.28)' },
  dkd_register_hero_copy: { flex: 1 },
  dkd_register_hero_title: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: -0.2 },
  dkd_register_hero_text: { color: 'rgba(231,241,255,0.74)', fontSize: 12, lineHeight: 17, marginTop: 5, fontWeight: '700' },
  dkd_register_badge_row: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  dkd_register_badge_chip: { flex: 1, minHeight: 38, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)', backgroundColor: 'rgba(255,255,255,0.075)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 8 },
  dkd_register_badge_text: { color: 'rgba(231,241,255,0.84)', fontSize: 11, fontWeight: '900' },
  dkd_modal_section_card: { borderRadius: 26, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)', backgroundColor: 'rgba(5,11,22,0.52)', marginTop: 10, overflow: 'hidden' },
  dkd_modal_section_header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  dkd_modal_section_icon: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#9AF8FF' },
  dkd_modal_section_kicker: { color: '#72FFBF', fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  dkd_modal_section_heading: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', marginTop: 1 },
  dkd_modal_header_row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 },
  dkd_modal_title: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', letterSpacing: -0.4 },
  dkd_modal_subtitle: { color: 'rgba(231,241,255,0.70)', fontSize: 12, marginTop: 3, fontWeight: '700', lineHeight: 16 },
  dkd_modal_close_button: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  dkd_modal_input_shell: { minHeight: 54, borderRadius: 19, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', backgroundColor: 'rgba(255,255,255,0.075)', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, marginTop: 10 },
  dkd_modal_input: { flex: 1, color: '#FFFFFF', fontSize: 14, fontWeight: '700', paddingVertical: 0 },
  dkd_modal_switch_btn: { marginTop: 12, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 4, paddingVertical: 6 },
  dkd_modal_switch_text: { color: '#A9E8FF', fontWeight: '900', fontSize: 12 },
  dkd_modal_section_title: { color: '#DFFBFF', fontSize: 12, fontWeight: '900', marginTop: 14, marginBottom: 9, letterSpacing: 0.4 },
  dkd_choice_wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dkd_choice_chip: { minHeight: 38, borderRadius: 999, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.06)' },
  dkd_choice_chip_active: { borderColor: 'rgba(255,255,255,0.34)' },
  dkd_choice_text: { color: 'rgba(231,241,255,0.82)', fontSize: 12, fontWeight: '800' },
  dkd_choice_text_active: { color: '#07111C', fontWeight: '900' },
  dkd_modal_action_row: { flexDirection: 'row', gap: 10, marginTop: 14, paddingBottom: 10 },
  dkd_modal_btn: { flex: 1, minHeight: 52, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  dkd_modal_btn_ghost: { backgroundColor: 'rgba(255,255,255,0.09)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  dkd_modal_btn_primary: { backgroundColor: '#62E6FF' },
  dkd_modal_btn_text: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  dkd_modal_btn_primary_text: { color: '#07111C', fontWeight: '900', fontSize: 14 },
});
