import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SafeScreen from '../../components/layout/SafeScreen';
import { completeOnboarding } from '../../services/onboardingService';
import { tapFeedback } from '../../services/feedbackService';

const STEPS = [
  {
    icon: 'map-marker-radius',
    title: 'Yakın rotayı aç',
    body: 'Önce haritadaki yakın hedefi seç. Yakındaki sandık daha hızlı token ve XP akışı sağlar.',
    accent: ['#22D3EE', '#38BDF8'],
  },
  {
    icon: 'qrcode-scan',
    title: 'QR ya da manuel kod kullan',
    body: 'Hedefe yaklaşınca tarama ekranını aç. QR varsa okut, yoksa manuel kodla doğrula.',
    accent: ['#A78BFA', '#8B5CF6'],
  },
  {
    icon: 'treasure-chest',
    title: 'Sandığı aç ve gücü topla',
    body: 'Token, shard ve kartları topladıktan sonra koleksiyona geçip craft ve upgrade ritmini başlat.',
    accent: ['#F59E0B', '#FB923C'],
  },
  {
    icon: 'sword-cross',
    title: 'Görev ve boss akışını kur',
    body: 'Günlük görevler + boss denemesi + günlük ödül birlikte en verimli ilerleme döngüsünü verir.',
    accent: ['#F43F5E', '#EC4899'],
  },
];

function ActionButton({ label, icon, primary, onPress, disabled }) {
  const content = (
    <View style={primary ? styles.primaryBtnInner : styles.secondaryBtnInner}>
      <MaterialCommunityIcons name={icon} size={18} color={primary ? '#04101A' : '#FFFFFF'} />
      <Text style={primary ? styles.primaryBtnText : styles.secondaryBtnText}>{label}</Text>
    </View>
  );

  return (
    <Pressable onPress={disabled ? undefined : onPress} style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.985 : 1 }], opacity: disabled ? 0.55 : 1 }]}>
      {primary ? (
        <LinearGradient colors={['#F8FAFC', '#E2E8F0']} style={styles.primaryBtn}>
          {content}
        </LinearGradient>
      ) : (
        <View style={styles.secondaryBtn}>{content}</View>
      )}
    </Pressable>
  );
}

export default function OnboardingModal({ visible, profile, onClose, onSkip }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const [closing, setClosing] = useState(false);

  React.useEffect(() => {
    if (!visible) {
      setClosing(false);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, visible]);

  const orbOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.3] });
  const orbScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.05] });

  const nickname = (profile && profile.nickname) || 'Oyuncu';
  const levelText = useMemo(() => `Lvl ${(profile && profile.level) || 1} • ${(profile && profile.rank) || 'Rookie'}`, [profile]);
  const userId = (profile && (profile.user_id || profile.id)) || null;

  const dismiss = React.useCallback(async (mode) => {
    if (closing) return;
    setClosing(true);
    await tapFeedback();
    try {
      if (userId) await completeOnboarding(userId);
    } catch {}
    const cb = mode === 'skip' ? (onSkip || onClose) : (onClose || onSkip);
    try {
      if (typeof cb === 'function') await cb();
    } catch {}
    setClosing(false);
  }, [closing, onClose, onSkip, userId]);

  return (
    <Modal visible={!!visible && !closing} animationType="fade" transparent onRequestClose={() => dismiss('skip')}>
      <SafeScreen style={styles.backdrop}>
        <View style={styles.centerWrap}>
          <Animated.View style={[styles.orb, { opacity: orbOpacity, transform: [{ scale: orbScale }] }]} />

          <LinearGradient colors={['rgba(5,10,20,0.98)', 'rgba(10,18,33,0.98)', 'rgba(7,13,25,0.98)']} style={styles.card}>
            <View style={styles.heroHeader}>
              <View style={styles.heroBadge}>
                <MaterialCommunityIcons name="map-search" size={18} color="#E0F2FE" />
                <Text style={styles.heroBadgeText}>BAŞLANGIÇ AKIŞI</Text>
              </View>
              <Text style={styles.title}>Hoş geldin, {nickname}</Text>
              <Text style={styles.subTitle}>{levelText} • İlk dakikada akışı çözüp boş dolaşmadan ilerle.</Text>
            </View>

            <View style={styles.routeStrip}>
              <View style={styles.routeNode}><Text style={styles.routeNodeText}>1</Text></View>
              <View style={styles.routeLine} />
              <View style={styles.routeNode}><Text style={styles.routeNodeText}>2</Text></View>
              <View style={styles.routeLine} />
              <View style={styles.routeNode}><Text style={styles.routeNodeText}>3</Text></View>
              <View style={styles.routeLine} />
              <View style={styles.routeNode}><Text style={styles.routeNodeText}>4</Text></View>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.routeSummary}>
                <Text style={styles.routeSummaryTitle}>Önerilen rota</Text>
                <Text style={styles.routeSummaryBody}>Yakın drop → tarama → sandık açma → görev ödülü → günlük ödül. En hızlı erken seviye ivmesi bu kombinasyondan geliyor.</Text>
              </View>

              {STEPS.map((step, index) => (
                <LinearGradient key={step.title} colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.03)']} style={styles.stepCard}>
                  <LinearGradient colors={step.accent} style={styles.stepIconWrap}>
                    <MaterialCommunityIcons name={step.icon} size={20} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={styles.stepMain}>
                    <View style={styles.stepTitleRow}>
                      <Text style={styles.stepIndex}>0{index + 1}</Text>
                      <Text style={styles.stepTitle}>{step.title}</Text>
                    </View>
                    <Text style={styles.stepBody}>{step.body}</Text>
                  </View>
                </LinearGradient>
              ))}

              <View style={styles.tipCard}>
                <MaterialCommunityIcons name="lightning-bolt-circle" size={18} color="#FBBF24" />
                <Text style={styles.tipText}>Enerji düşükse uzak boss yerine yakın sandık + görev kombinasyonu daha verimli olur.</Text>
              </View>

              <View style={styles.buttonStack}>
                <ActionButton primary icon="play-circle" label={closing ? 'Açılıyor...' : 'Oyuna başla'} disabled={closing} onPress={() => dismiss('start')} />
                <ActionButton icon="skip-forward" label="Tanıtımı geç" disabled={closing} onPress={() => dismiss('skip')} />
              </View>
            </ScrollView>
          </LinearGradient>
        </View>
      </SafeScreen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(2,6,14,0.72)' },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  orb: { position: 'absolute', width: 280, height: 280, borderRadius: 999, backgroundColor: 'rgba(34,211,238,0.22)' },
  card: {
    width: '100%',
    maxWidth: 540,
    maxHeight: '94%',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  heroHeader: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 8,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heroBadgeText: { color: '#E2E8F0', fontWeight: '900', fontSize: 11, letterSpacing: 0.8 },
  title: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', marginTop: 12 },
  subTitle: { color: 'rgba(226,232,240,0.76)', marginTop: 6, lineHeight: 20, fontWeight: '700' },
  routeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 14,
    paddingTop: 6,
  },
  routeNode: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: 'rgba(34,211,238,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeNodeText: { color: '#E0F2FE', fontWeight: '900', fontSize: 13 },
  routeLine: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.12)', marginHorizontal: 8 },
  scroll: { paddingHorizontal: 18, paddingBottom: 18 },
  routeSummary: {
    borderRadius: 22,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  routeSummaryTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
  routeSummaryBody: { color: 'rgba(226,232,240,0.72)', marginTop: 6, lineHeight: 19, fontWeight: '700' },
  stepCard: {
    marginTop: 12,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  stepIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepMain: { flex: 1 },
  stepTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepIndex: { color: 'rgba(255,255,255,0.46)', fontWeight: '900', fontSize: 12, letterSpacing: 0.8 },
  stepTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 },
  stepBody: { color: 'rgba(226,232,240,0.72)', lineHeight: 19, marginTop: 4, fontWeight: '700' },
  tipCard: {
    marginTop: 14,
    borderRadius: 18,
    padding: 14,
    backgroundColor: 'rgba(251,191,36,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.22)',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  tipText: { flex: 1, color: '#F8FAFC', lineHeight: 19, fontWeight: '700' },
  buttonStack: { gap: 12, marginTop: 16 },
  primaryBtn: { minHeight: 58, borderRadius: 18, paddingHorizontal: 18, justifyContent: 'center' },
  primaryBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryBtnText: { color: '#04101A', fontWeight: '900', fontSize: 15 },
  secondaryBtn: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  secondaryBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
});
