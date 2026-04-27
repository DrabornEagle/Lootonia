import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  InteractionManager,
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
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SafeScreen from '../../components/layout/SafeScreen';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import { issueDropCode } from '../../services/chestService';
import { cityLootTheme } from '../../theme/cityLootTheme';
import { trDropType } from '../../utils/text';

function SkylineStrip() {
  const bars = [
    { left: 0, width: 12, height: 24 },
    { left: 16, width: 10, height: 36 },
    { left: 30, width: 18, height: 48 },
    { left: 53, width: 10, height: 28 },
    { left: 68, width: 16, height: 62 },
    { left: 89, width: 12, height: 40 },
    { left: 106, width: 20, height: 74 },
  ];
  return (
    <View pointerEvents="none" style={dkd_styles.skylineWrap}>
      <View style={dkd_styles.skylineHorizon} />
      {bars.map((bar, index) => (
        <View key={`scan-sky-${index}`} style={[dkd_styles.skylineBar, { left: bar.left, width: bar.width, height: bar.height }]} />
      ))}
    </View>
  );
}

function ModeTab({ active, icon, label, onPress }) {
  return (
    <Pressable onPress={onPress} style={[dkd_styles.modeTab, active && dkd_styles.modeTabActive]}>
      <MaterialCommunityIcons name={icon} size={17} color={active ? '#071019' : cityLootTheme.colors.cyanSoft} />
      <Text style={[dkd_styles.modeTabText, active && dkd_styles.modeTabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function InfoChip({ icon, label, value, tone = 'cyan' }) {
  const color = tone === 'green'
    ? cityLootTheme.colors.green
    : tone === 'gold'
      ? cityLootTheme.colors.goldSoft
      : cityLootTheme.colors.cyanSoft;

  return (
    <View style={dkd_styles.infoChip}>
      <MaterialCommunityIcons name={icon} size={16} color={color} />
      <Text style={dkd_styles.infoChipLabel}>{label}</Text>
      <Text style={[dkd_styles.infoChipValue, { color }]}>{value}</Text>
    </View>
  );
}


function OperationChip({ icon, label }) {
  return (
    <View style={dkd_styles.operationChip}>
      <MaterialCommunityIcons name={icon} size={15} color={cityLootTheme.colors.cyanSoft} />
      <Text style={dkd_styles.operationChipText}>{label}</Text>
    </View>
  );
}

function CameraFallback({ permission, requestPermission }) {
  if (!permission) {
    return (
      <View style={dkd_styles.placeholderWrap}>
        <ActivityIndicator color={cityLootTheme.colors.cyanSoft} />
        <Text style={dkd_styles.placeholderTitle}>Kamera hazırlanıyor</Text>
        <Text style={dkd_styles.placeholderText}>İzin durumu kontrol ediliyor.</Text>
      </View>
    );
  }

  if (permission.granted === false) {
    return (
      <View style={dkd_styles.placeholderWrap}>
        <MaterialCommunityIcons name="camera-off-outline" size={42} color={cityLootTheme.colors.goldSoft} />
        <Text style={dkd_styles.placeholderTitle}>Kamera izni kapalı</Text>
        <Text style={dkd_styles.placeholderText}>Ayarlarından kamera iznini aç ve tekrar dene.</Text>
        <View style={{ height: 12 }} />
        <PrimaryButton label="İzni Tekrar İste" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={dkd_styles.placeholderWrap}>
      <ActivityIndicator color={cityLootTheme.colors.cyanSoft} />
      <Text style={dkd_styles.placeholderTitle}>Kamera açılıyor</Text>
      <Text style={dkd_styles.placeholderText}>QR alanı birazdan hazır olacak.</Text>
    </View>
  );
}

function ScanHud() {
  return (
    <View style={dkd_styles.scanOverlay}>
      <View style={dkd_styles.scanShadeTop} />
      <View style={dkd_styles.scanMidRow}>
        <View style={dkd_styles.scanShadeSide} />
        <View style={dkd_styles.scanBox}>
          <View style={[dkd_styles.corner, dkd_styles.cornerTl]} />
          <View style={[dkd_styles.corner, dkd_styles.cornerTr]} />
          <View style={[dkd_styles.corner, dkd_styles.cornerBl]} />
          <View style={[dkd_styles.corner, dkd_styles.cornerBr]} />
          <View style={dkd_styles.scanPulseLine} />
        </View>
        <View style={dkd_styles.scanShadeSide} />
      </View>
      <View style={dkd_styles.scanShadeBottom} />
    </View>
  );
}

export default function ScannerModal({ visible, onClose, onScanned, activeDrop, near, onOpenByCode, onNavigateToDrop }) {
  const [permission, requestPermission] = useCameraPermissions();
  const lockRef = useRef(false);
  const [mode, setMode] = useState('qr');
  const [cameraReady, setCameraReady] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [opening, setOpening] = useState(false);
  const [gen, setGen] = useState({ loading: false, code: null, expires_at: null });

  useEffect(() => {
    if (!visible) {
      setCameraReady(false);
      setManualCode('');
      setOpening(false);
      setGen({ loading: false, code: null, expires_at: null });
      return undefined;
    }

    lockRef.current = false;
    setMode('qr');

    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        if (!cancelled && !permission?.granted) requestPermission();
      });
    });

    return () => {
      cancelled = true;
      task?.cancel?.();
    };
  }, [visible, permission?.granted, requestPermission]);

  useEffect(() => {
    if (!visible || mode !== 'qr' || permission?.granted !== true) {
      setCameraReady(false);
      return undefined;
    }

    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        if (!cancelled) setCameraReady(true);
      });
    });

    return () => {
      cancelled = true;
      task?.cancel?.();
    };
  }, [visible, mode, permission?.granted]);

  const distanceText = useMemo(() => {
    if (near?.distance == null) return '—';
    return `${Math.round(near.distance)}m`;
  }, [near?.distance]);

  const radiusText = useMemo(() => {
    if (activeDrop?.radius_m == null) return '—';
    return `${activeDrop.radius_m}m`;
  }, [activeDrop?.radius_m]);

  const canGenerate = !!activeDrop && activeDrop.lat != null && activeDrop.lng != null && near?.ok === true;

  const handleScan = ({ data }) => {
    if (lockRef.current) return;
    lockRef.current = true;
    onScanned?.(data);
  };

  async function handleGenerate() {
    if (!activeDrop) {
      Alert.alert('Sandık bulunamadı', 'Yakınında uygun sandık yok. En yakın sandığa yaklaşınca işlem açılır.');
      return;
    }
    if (activeDrop.lat == null || activeDrop.lng == null) {
      Alert.alert('Konum yok', 'Bu sandık için konum bilgisi eksik.');
      return;
    }
    if (!near?.ok) {
      Alert.alert('Henüz yakın değilsin', `Mesafe ${distanceText} • Radius ${radiusText}`);
      return;
    }

    setGen((prev) => ({ ...prev, loading: true }));
    try {
      const { data, error } = await issueDropCode(activeDrop.id);
      if (error) throw error;
      if (!data?.ok) throw new Error(String(data?.reason || 'code_failed'));

      const nextCode = String(data?.manual_code || data?.code || '').trim().toUpperCase();
      if (!nextCode) throw new Error('manual_code_missing');

      setGen({
        loading: false,
        code: nextCode,
        expires_at: data?.expires_at || data?.manual_code_expires_at || null,
      });
      setManualCode(nextCode);
      setMode('manual');
    } catch (dkd_error_value) {
      Alert.alert('Kod üretilemedi', dkd_error_value?.message || String(dkd_error_value));
      setGen((prev) => ({ ...prev, loading: false }));
    }
  }

  async function submitManual() {
    const code = String(manualCode || '').trim().toUpperCase();
    if (!code || opening) return;
    setOpening(true);
    try {
      await onOpenByCode?.(code);
      onClose?.();
    } finally {
      setOpening(false);
    }
  }

  const targetTitle = activeDrop?.name || 'Yakında uygun sandık yok';
  const targetType = activeDrop ? trDropType(activeDrop.type) : 'En yakın sandığa yaklaş';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeScreen style={{ flex: 1, backgroundColor: '#050912' }}>
        <StatusBar barStyle="light-content" />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <LinearGradient colors={['#040812', '#09111D', '#07101A']} style={dkd_styles.screen}>
            <View style={dkd_styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={dkd_styles.kicker}>SAHA TARAYICI // LOOT</Text>
                <Text style={dkd_styles.title}>{mode === 'qr' ? 'Saha QR tarayıcı' : 'Manuel erişim kodu'}</Text>
                <Text style={dkd_styles.sub}>Yakındaki sandık otomatik hedeflenir. Yakın değilsen en yakın sandık gösterilir; bölgeye girince doğrulayıp açabilirsin.</Text>
              </View>
              <View style={dkd_styles.closeBtnWrap}>
                <SecondaryButton
                  label="Kapat"
                  icon="close"
                  tone="ghost"
                  size="compact"
                  fullWidth={false}
                  onPress={onClose}
                  style={dkd_styles.closeButton}
                />
              </View>
            </View>

            <View style={dkd_styles.operationRow}>
              <OperationChip icon="crosshairs-gps" label="Hedefe yaklaş" />
              <OperationChip icon="qrcode-scan" label="QR doğrula" />
              <OperationChip icon="lock-open-variant-outline" label="Sandığı aç" />
            </View>

            <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={dkd_styles.scrollContent}>
              <View style={dkd_styles.targetCard}>
                <LinearGradient colors={['rgba(11,25,40,0.98)', 'rgba(7,14,22,0.96)']} style={StyleSheet.absoluteFillObject} />
                <View style={dkd_styles.targetGlow} />
                <SkylineStrip />
                <View style={dkd_styles.targetTopRow}>
                  <View style={dkd_styles.targetIconWrap}>
                    <MaterialCommunityIcons name={mode === 'qr' ? 'qrcode-scan' : 'keyboard-outline'} size={26} color={cityLootTheme.colors.goldSoft} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={dkd_styles.targetLabel}>Aktif hedef</Text>
                    <Text style={dkd_styles.targetTitle}>{targetTitle}</Text>
                    <Text style={dkd_styles.targetSub}>{targetType}</Text>
                  </View>
                  <View style={[dkd_styles.stateBadge, near?.ok ? dkd_styles.stateBadgeOn : dkd_styles.stateBadgeOff]}>
                    <Text style={dkd_styles.stateBadgeText}>{near?.ok ? 'Uygun' : 'Uzak'}</Text>
                  </View>
                </View>

                <View style={dkd_styles.chipRow}>
                  <InfoChip icon="map-marker-distance" label="Mesafe" value={distanceText} />
                  <InfoChip icon="map-marker-radius-outline" label="Radius" value={radiusText} tone="gold" />
                  <InfoChip icon="check-decagram-outline" label="Durum" value={near?.ok ? 'İçeride' : 'Dışarıda'} tone={near?.ok ? 'green' : 'cyan'} />
                </View>
              </View>

              <View style={dkd_styles.modeRow}>
                <ModeTab active={mode === 'qr'} icon="qrcode-scan" label="QR Tara" onPress={() => setMode('qr')} />
                <ModeTab active={mode === 'manual'} icon="keyboard-outline" label="Kod Gir" onPress={() => setMode('manual')} />
              </View>

              {mode === 'qr' ? (
                <View style={dkd_styles.blockCard}>
                  <Text style={dkd_styles.blockTitle}>Tarama alanı</Text>
                  <Text style={dkd_styles.blockSub}>QR kod çerçeveye girdiğinde doğrulama akışı otomatik başlar.</Text>

                  <View style={dkd_styles.cameraShell}>
                    {permission?.granted === true && cameraReady ? (
                      <View style={dkd_styles.cameraFrame}>
                        <CameraView
                          style={StyleSheet.absoluteFillObject}
                          facing="back"
                          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                          onBarcodeScanned={handleScan}
                        />
                        <ScanHud />
                      </View>
                    ) : (
                      <CameraFallback permission={permission} requestPermission={requestPermission} />
                    )}
                  </View>

                  <View style={dkd_styles.actionRow}>
                    <View style={dkd_styles.actionCol}>
                      <SecondaryButton
                        label="Rotayı Aç"
                        icon="map-marker-path"
                        tone="nav"
                        onPress={() => onNavigateToDrop?.(activeDrop)}
                      />
                    </View>
                    <View style={dkd_styles.actionCol}>
                      <PrimaryButton
                        label={gen.loading ? 'Hazırlanıyor…' : 'Saha Kodu Üret'}
                        icon="creation-outline"
                        onPress={handleGenerate}
                        disabled={!canGenerate || gen.loading}
                      />
                    </View>
                  </View>
                </View>
              ) : (
                <View style={dkd_styles.blockCard}>
                  <Text style={dkd_styles.blockTitle}>Elle giriş paneli</Text>
                  <Text style={dkd_styles.blockSub}>QR okunmazsa burada yeni saha kodu üret veya mevcut kodu elle gir.</Text>

                  <TextInput
                    style={dkd_styles.input}
                    value={manualCode}
                    onChangeText={(text) => setManualCode(String(text || '').toUpperCase())}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    placeholder="Örnek erişim kodu"
                    placeholderTextColor="rgba(255,255,255,0.34)"
                  />

                  {gen.code ? (
                    <View style={dkd_styles.generatedBox}>
                      <Text style={dkd_styles.generatedLabel}>Hazır erişim kodu</Text>
                      <Text style={dkd_styles.generatedCode}>{gen.code}</Text>
                      {gen.expires_at ? <Text style={dkd_styles.generatedSub}>Bu kod süreli çalışır, gecikmeden kullan.</Text> : null}
                    </View>
                  ) : null}

                  <View style={dkd_styles.actionRow}>
                    <View style={dkd_styles.actionCol}>
                      <SecondaryButton
                        label={gen.loading ? 'Üretiliyor…' : 'Yeni Kod Üret'}
                        icon="creation-outline"
                        tone="nav"
                        onPress={handleGenerate}
                        disabled={!canGenerate || gen.loading}
                      />
                    </View>
                    <View style={dkd_styles.actionCol}>
                      <PrimaryButton
                        label={opening ? 'Açılıyor…' : 'Doğrula ve Aç'}
                        icon="lock-open-variant-outline"
                        onPress={submitManual}
                        disabled={!manualCode || opening}
                      />
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>
          </LinearGradient>
        </KeyboardAvoidingView>
      </SafeScreen>
    </Modal>
  );
}

const dkd_styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  kicker: {
    color: cityLootTheme.colors.cyanSoft,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  title: {
    color: cityLootTheme.colors.text,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
    marginTop: 6,
  },
  sub: {
    color: cityLootTheme.colors.textSoft,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  closeBtnWrap: {
    marginLeft: 12,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
  closeButton: {
    alignSelf: 'flex-end',
  },
  operationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    marginBottom: 4,
  },
  operationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  operationChipText: {
    color: cityLootTheme.colors.textSoft,
    fontSize: 12,
    fontWeight: '800',
  },
  scrollContent: {
    paddingTop: 14,
    paddingBottom: 24,
  },
  targetCard: {
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    padding: 14,
  },
  targetGlow: {
    position: 'absolute',
    top: -24,
    right: -18,
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: 'rgba(108,203,255,0.14)',
  },
  targetTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  targetIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginRight: 12,
  },
  targetLabel: {
    color: cityLootTheme.colors.textSoft,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.9,
  },
  targetTitle: {
    color: cityLootTheme.colors.text,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
  },
  targetSub: {
    color: cityLootTheme.colors.textSoft,
    fontSize: 13,
    marginTop: 4,
  },
  stateBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  stateBadgeOn: {
    backgroundColor: 'rgba(68,221,168,0.16)',
    borderColor: 'rgba(68,221,168,0.30)',
  },
  stateBadgeOff: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.10)',
  },
  stateBadgeText: {
    color: cityLootTheme.colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    marginHorizontal: -4,
    zIndex: 2,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 4,
    marginBottom: 8,
  },
  infoChipLabel: {
    color: cityLootTheme.colors.textSoft,
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 8,
  },
  infoChipValue: {
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 8,
  },
  modeRow: {
    flexDirection: 'row',
    marginTop: 14,
    marginHorizontal: -4,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 4,
  },
  modeTabActive: {
    backgroundColor: cityLootTheme.colors.cyanSoft,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  modeTabText: {
    color: cityLootTheme.colors.text,
    fontSize: 14,
    fontWeight: '900',
    marginLeft: 8,
  },
  modeTabTextActive: {
    color: '#071019',
  },
  blockCard: {
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    marginTop: 14,
  },
  blockTitle: {
    color: cityLootTheme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  blockSub: {
    color: cityLootTheme.colors.textSoft,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 12,
  },
  cameraShell: {
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    minHeight: 300,
  },
  cameraFrame: {
    minHeight: 300,
    overflow: 'hidden',
  },
  placeholderWrap: {
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  placeholderTitle: {
    color: cityLootTheme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 12,
  },
  placeholderText: {
    color: cityLootTheme.colors.textSoft,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    textAlign: 'center',
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  scanShadeTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  scanMidRow: {
    flexDirection: 'row',
    height: 220,
  },
  scanShadeSide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  scanShadeBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  scanBox: {
    width: 220,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    overflow: 'hidden',
  },
  scanPulseLine: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: '50%',
    height: 2,
    backgroundColor: 'rgba(108,203,255,0.72)',
    shadowColor: cityLootTheme.colors.cyan,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  corner: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderColor: cityLootTheme.colors.goldSoft,
  },
  cornerTl: {
    top: 14,
    left: 14,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 14,
  },
  cornerTr: {
    top: 14,
    right: 14,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 14,
  },
  cornerBl: {
    bottom: 14,
    left: 14,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 14,
  },
  cornerBr: {
    bottom: 14,
    right: 14,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 14,
  },
  actionRow: {
    flexDirection: 'row',
    marginHorizontal: -5,
    marginTop: 16,
    alignItems: 'stretch',
  },
  actionCol: {
    flex: 1,
    marginHorizontal: 5,
  },
  input: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: cityLootTheme.colors.text,
    fontSize: 16,
    fontWeight: '900',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  generatedBox: {
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    marginTop: 12,
  },
  generatedLabel: {
    color: cityLootTheme.colors.textSoft,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.9,
  },
  generatedCode: {
    color: cityLootTheme.colors.goldSoft,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 8,
  },
  generatedSub: {
    color: cityLootTheme.colors.textSoft,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  skylineWrap: {
    position: 'absolute',
    right: 14,
    bottom: 0,
    width: 132,
    height: 82,
    opacity: 0.88,
  },
  skylineHorizon: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 12,
    height: 1,
    backgroundColor: 'rgba(108,203,255,0.18)',
  },
  skylineBar: {
    position: 'absolute',
    bottom: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
});
