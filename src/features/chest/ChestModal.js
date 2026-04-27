import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import { cityLootTheme, getLootRarityFrame } from '../../theme/cityLootTheme';
import { getChestErrorMeta } from '../../utils/chestErrors';
import { formatInt, trDropType, trRarity, trTheme } from '../../utils/text';

const PARTICLES = [
  { top: 18, left: 34, size: 6, delay: 0 },
  { top: 48, right: 42, size: 8, delay: 180 },
  { top: 96, left: 8, size: 5, delay: 320 },
  { top: 126, right: 18, size: 7, delay: 520 },
  { top: 188, left: 46, size: 4, delay: 710 },
  { top: 220, right: 56, size: 6, delay: 930 },
];

function SectionTitle({ kicker, title, sub }) {
  return (
    <View style={dkd_styles.sectionHeader}>
      <Text style={dkd_styles.kicker}>{kicker}</Text>
      <Text style={dkd_styles.title}>{title}</Text>
      {sub ? <Text style={dkd_styles.sub}>{sub}</Text> : null}
    </View>
  );
}

function StatusChip({ icon, label, tone = 'cyan' }) {
  const color = tone === 'gold'
    ? cityLootTheme.colors.goldSoft
    : tone === 'purple'
      ? cityLootTheme.colors.purple
      : cityLootTheme.colors.cyanSoft;

  return (
    <View style={dkd_styles.statusChip}>
      <MaterialCommunityIcons name={icon} size={15} color={color} />
      <Text style={dkd_styles.statusChipLabel}>{label}</Text>
    </View>
  );
}

function ParticleField() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      {PARTICLES.map((particle, index) => (
        <View
          key={`particle-${index}`}
          style={[
            dkd_styles.particle,
            {
              top: particle.top,
              left: particle.left,
              right: particle.right,
              width: particle.size,
              height: particle.size,
              opacity: 0.58,
            },
          ]}
        />
      ))}
    </View>
  );
}

function OpeningScene() {
  const pulse = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const chestLift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    const ringLoop = Animated.loop(
      Animated.timing(ring, {
        toValue: 1,
        duration: 5200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const chestLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(chestLift, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(chestLift, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();
    ringLoop.start();
    chestLoop.start();
    return () => {
      pulseLoop.stop();
      ringLoop.stop();
      chestLoop.stop();
    };
  }, [pulse, ring, chestLift]);

  const auraScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.16] });
  const auraOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.52] });
  const beamOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.4] });
  const ringSpin = ring.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const reverseSpin = ring.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
  const liftY = chestLift.interpolate({ inputRange: [0, 1], outputRange: [6, -8] });
  const scale = chestLift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });

  return (
    <View style={dkd_styles.centerWrap}>
      <SectionTitle
        kicker="VAULT UNLOCK"
        title="Sandık Açılıyor"
        sub="Kilidi çözüyoruz. Birkaç saniye içinde ödül ekranı parlayacak."
      />

      <View style={dkd_styles.openingStage}>
        <ParticleField />
        <Animated.View style={[dkd_styles.openingAura, { opacity: auraOpacity, transform: [{ scale: auraScale }] }]} />
        <Animated.View style={[dkd_styles.energyBeam, dkd_styles.energyBeamLeft, { opacity: beamOpacity }]} />
        <Animated.View style={[dkd_styles.energyBeam, dkd_styles.energyBeamRight, { opacity: beamOpacity }]} />
        <Animated.View style={[dkd_styles.ringOuter, { transform: [{ rotate: ringSpin }] }]} />
        <Animated.View style={[dkd_styles.ringInner, { transform: [{ rotate: reverseSpin }] }]} />

        <Animated.View style={[dkd_styles.vaultCore, { transform: [{ translateY: liftY }, { scale }] }]}>
          <LinearGradient colors={['#172B4D', '#0A1424', '#08111D']} style={StyleSheet.absoluteFillObject} />
          <View style={dkd_styles.vaultGlowCap} />
          <View style={dkd_styles.vaultIconShell}>
            <LinearGradient colors={['rgba(255,233,168,0.42)', 'rgba(255,170,56,0.14)']} style={StyleSheet.absoluteFillObject} />
            <MaterialCommunityIcons name="treasure-chest" size={72} color={cityLootTheme.colors.goldSoft} />
          </View>
          <View style={dkd_styles.vaultLockRow}>
            <View style={dkd_styles.vaultLockDot} />
            <View style={dkd_styles.vaultLockBar} />
            <View style={dkd_styles.vaultLockDot} />
          </View>
        </Animated.View>
      </View>

      <View style={dkd_styles.statusRow}>
        <StatusChip icon="qrcode-scan" label="Kod Doğrulandı" />
        <StatusChip icon="star-four-points" label="Loot Yükleniyor" tone="gold" />
        <StatusChip icon="cards-outline" label="Kart Hazırlanıyor" tone="purple" />
      </View>
    </View>
  );
}

function ErrorScene({ payload, onClose }) {
  const errorMeta = getChestErrorMeta(payload);
  return (
    <View style={dkd_styles.centerWrap}>
      <SectionTitle kicker="VAULT ERROR" title={errorMeta?.title || 'Sandık açılamadı'} sub={errorMeta?.message || 'Geçici bir sorun oluştu.'} />

      <View style={dkd_styles.errorIconWrap}>
        <View style={dkd_styles.errorIconHalo}>
          <MaterialCommunityIcons name="alert-circle-outline" size={60} color={cityLootTheme.colors.red} />
        </View>
      </View>

      <View style={dkd_styles.errorHelpCard}>
        <Text style={dkd_styles.errorHelpTitle}>Öneri</Text>
        <Text style={dkd_styles.errorHelpText}>Haritada biraz yaklaş, kodu yenile ve yeniden dene.</Text>
      </View>

      <PrimaryButton label="Tamam" icon="check-circle-outline" onPress={onClose} />
    </View>
  );
}

function RewardMetric({ icon, label, value, tone = 'gold' }) {
  const color = tone === 'cyan'
    ? cityLootTheme.colors.cyanSoft
    : tone === 'green'
      ? cityLootTheme.colors.green
      : cityLootTheme.colors.goldSoft;

  return (
    <View style={dkd_styles.metricCard}>
      <View style={[dkd_styles.metricIconWrap, { borderColor: `${color}40` }]}>
        <MaterialCommunityIcons name={icon} size={18} color={color} />
      </View>
      <Text style={dkd_styles.metricValue}>{value}</Text>
      <Text style={dkd_styles.metricLabel}>{label}</Text>
    </View>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={dkd_styles.infoRow}>
      <Text style={dkd_styles.infoLabel}>{label}</Text>
      <Text style={dkd_styles.infoValue}>{value}</Text>
    </View>
  );
}

function RewardCardVisual({ payload, rarity, rarityLabel, series, cardName, themeLabel }) {
  const artUri = payload?.card_art_image_url || payload?.art_image_url || payload?.card_image_url || payload?.image_url || null;
  const serialCode = payload?.card_serial_code || payload?.serial_code || payload?.card_code || payload?.code || null;

  return (
    <View style={[dkd_styles.rewardCardWrap, { borderColor: rarity.edge }] }>
      <LinearGradient colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']} style={StyleSheet.absoluteFillObject} />
      <View style={[dkd_styles.rewardCardAura, { backgroundColor: rarity.glow }]} />
      <View style={dkd_styles.rewardCardShell}>
        <LinearGradient colors={rarity.gradient} style={StyleSheet.absoluteFillObject} />
        <View style={dkd_styles.rewardTopRow}>
          <View style={dkd_styles.rewardSeriesChip}>
            <Text style={dkd_styles.rewardSeriesText}>{String(series || 'Genel').toUpperCase()}</Text>
          </View>
          <View style={[dkd_styles.rewardRarityChip, { backgroundColor: `${rarity.accent}22`, borderColor: `${rarity.accent}55` }]}>
            <Text style={dkd_styles.rewardRarityText}>{rarityLabel}</Text>
          </View>
        </View>

        <View style={dkd_styles.rewardArtFrame}>
          {artUri ? (
            <Image source={{ uri: artUri }} style={dkd_styles.rewardArt} resizeMode="cover" />
          ) : (
            <LinearGradient colors={['#193251', '#0C1420']} style={dkd_styles.rewardFallbackArt}>
              <MaterialCommunityIcons name="treasure-chest-outline" size={54} color={cityLootTheme.colors.goldSoft} />
              <Text style={dkd_styles.rewardFallbackText}>Yeni loot hazır</Text>
            </LinearGradient>
          )}
          <LinearGradient colors={['rgba(6,10,18,0.0)', 'rgba(6,10,18,0.38)', 'rgba(6,10,18,0.82)']} style={dkd_styles.rewardArtFade} />
        </View>

        <View style={dkd_styles.rewardBottomPlate}>
          <Text numberOfLines={1} style={dkd_styles.rewardCardTitle}>{cardName}</Text>
          <Text numberOfLines={1} style={dkd_styles.rewardCardMeta}>{themeLabel || 'Şehir Merkezi'}</Text>
          {serialCode ? <Text style={dkd_styles.rewardCardCode}>{serialCode}</Text> : null}
        </View>
      </View>
    </View>
  );
}

function ResultScene({ payload, rarity, onClose }) {
  const reveal = useRef(new Animated.Value(0)).current;
  const [copyNote, setCopyNote] = useState('');

  useEffect(() => {
    reveal.setValue(0);
    Animated.parallel([
      Animated.timing(reveal, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [reveal]);

  const translateY = reveal.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  const scale = reveal.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });
  const opacity = reveal.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  const tokens = Number(payload?.token || 0);
  const shards = Number(payload?.shards ?? payload?.shard ?? 0);
  const ticketText = payload?.ticket_reward ? `+${payload.ticket_reward}` : String(payload?.ticket_total ?? 0);
  const cardName = payload?.card_name || 'Yeni Kart';
  const series = payload?.card_series || 'Genel';
  const serialCode = payload?.card_serial_code || payload?.serial_code || payload?.card_code || payload?.code || '—';
  const rarityLabel = trRarity(payload?.card_rarity || 'common');
  const themeLabel = payload?.card_theme ? trTheme(payload.card_theme) : 'Tema yok';
  const couponCode = payload?.coupon_code || '';
  const couponRewardLabel = payload?.coupon_reward_label || payload?.reward_label || 'İşletme Kuponu';
  const couponBusinessName = payload?.coupon_business_name || payload?.business_name || '';
  const couponCampaignTitle = payload?.coupon_campaign_title || payload?.campaign_title || '';

  const copyCouponCode = async () => {
    if (!couponCode) return;
    try {
      await Clipboard.setStringAsync(String(couponCode));
      setCopyNote('Kupon kodu panoya kopyalandı.');
    } catch (dkd_unused_value) {
      setCopyNote('Kupon kodu kopyalanamadı.');
    }
  };

  return (
    <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={dkd_styles.resultScroll}>
      <SectionTitle
        kicker="VAULT OPEN"
        title="Kart Kazanıldı"
        sub="Yeni loot tamamlandı. Kart şimdi odakta, detaylar altta ve kazanım net görünür."
      />

      <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>
        <RewardCardVisual
          payload={payload}
          rarity={rarity}
          rarityLabel={rarityLabel}
          series={series}
          cardName={cardName}
          themeLabel={themeLabel}
        />
      </Animated.View>

      <View style={dkd_styles.infoPanel}>
        <InfoRow label="Seri" value={String(series || '—').toUpperCase()} />
        <InfoRow label="Kod" value={String(serialCode)} />
        <InfoRow label="Tema" value={themeLabel} />
        <InfoRow label="Nadirlik" value={rarityLabel} />
      </View>

      <View style={dkd_styles.summaryPanel}>
        <View style={dkd_styles.summaryTitleRow}>
          <View style={dkd_styles.summaryLine} />
          <Text style={dkd_styles.summaryTitle}>Kazanç Özeti</Text>
          <View style={dkd_styles.summaryLine} />
        </View>
        <View style={dkd_styles.summaryGrid}>
          <RewardMetric icon="brightness-5" label="Token" value={`+${formatInt(tokens)}`} tone="gold" />
          <RewardMetric icon="diamond-stone" label="Shard" value={formatInt(shards)} tone="cyan" />
          <RewardMetric icon="ticket-confirmation-outline" label="Bilet" value={ticketText} tone="green" />
        </View>
      </View>

      {couponCode ? (
        <View style={dkd_styles.couponPanel}>
          <LinearGradient colors={['rgba(28,22,10,0.94)', 'rgba(13,16,23,0.98)']} style={StyleSheet.absoluteFillObject} />
          <View style={dkd_styles.couponGlow} />
          <View style={dkd_styles.couponTitleRow}>
            <View style={dkd_styles.couponTitleLeft}>
              <View style={dkd_styles.couponIconWrap}>
                <MaterialCommunityIcons name="ticket-confirmation-outline" size={18} color={cityLootTheme.colors.goldSoft} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={dkd_styles.couponTitle}>İşletme kuponu kazandın</Text>
                <Text style={dkd_styles.couponSub}>{couponBusinessName || 'İşletme'}{couponCampaignTitle ? ` • ${couponCampaignTitle}` : ''}</Text>
              </View>
            </View>
            <Pressable style={dkd_styles.couponCopyBtn} onPress={copyCouponCode}>
              <MaterialCommunityIcons name="content-copy" size={15} color={cityLootTheme.colors.cyanSoft} />
              <Text style={dkd_styles.couponCopyText}>Kopyala</Text>
            </Pressable>
          </View>
          <View style={dkd_styles.couponCodeWrap}>
            <Text selectable style={dkd_styles.couponCode}>{couponCode}</Text>
          </View>
          <Text style={dkd_styles.couponHint}>{couponRewardLabel}. Bu kodu kasada göster. Kuponlarım ekranında tekrar görebilirsin.</Text>
          {!!copyNote ? <Text style={dkd_styles.couponCopyNote}>{copyNote}</Text> : null}
        </View>
      ) : null}

      <View style={dkd_styles.footerButtons}>
        <PrimaryButton label="Envantere Gönder" icon="tray-arrow-down" onPress={onClose} />
        <SecondaryButton label="Kapat" icon="close" tone="ghost" size="compact" fullWidth={false} onPress={onClose} style={dkd_styles.closeCompactBtn} />
      </View>
    </ScrollView>
  );
}

export default function ChestModal({ visible, stage, payload, onClose }) {
  const ok = payload?.ok === true;
  const rarity = useMemo(() => getLootRarityFrame(payload?.card_rarity), [payload?.card_rarity]);

  return (
    <Modal visible={visible} transparent animationType="fade" hardwareAccelerated statusBarTranslucent onRequestClose={onClose}>
      <View style={dkd_styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={stage === 'opening' ? undefined : onClose} />
        <LinearGradient colors={['rgba(4,8,16,0.96)', 'rgba(6,10,18,0.985)', 'rgba(4,8,14,0.995)']} style={StyleSheet.absoluteFillObject} />
        <View style={dkd_styles.auraTop} />
        <View style={dkd_styles.auraBottom} />
        <View style={dkd_styles.noiseVeil} />

        <View style={dkd_styles.shell}>
          {stage === 'opening' ? <OpeningScene /> : ok ? <ResultScene payload={payload} rarity={rarity} onClose={onClose} /> : <ErrorScene payload={payload} onClose={onClose} />}
        </View>
      </View>
    </Modal>
  );
}

const dkd_styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  auraTop: {
    position: 'absolute',
    top: -80,
    width: 280,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(89,194,255,0.18)',
  },
  auraBottom: {
    position: 'absolute',
    bottom: -90,
    width: 320,
    height: 260,
    borderRadius: 999,
    backgroundColor: 'rgba(255,178,92,0.12)',
  },
  noiseVeil: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.06,
    backgroundColor: '#FFFFFF',
  },
  shell: {
    width: '100%',
    maxWidth: 412,
    maxHeight: '92%',
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(7,11,19,0.96)',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
  },
  centerWrap: {
    paddingTop: 6,
    paddingBottom: 10,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  kicker: {
    color: cityLootTheme.colors.cyanSoft,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  title: {
    color: cityLootTheme.colors.text,
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '900',
    marginTop: 6,
  },
  sub: {
    color: cityLootTheme.colors.textSoft,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  openingStage: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  openingAura: {
    position: 'absolute',
    width: 226,
    height: 226,
    borderRadius: 999,
    backgroundColor: 'rgba(102,220,255,0.22)',
  },
  energyBeam: {
    position: 'absolute',
    width: 112,
    height: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(255,228,167,0.78)',
    top: '50%',
    marginTop: -1,
  },
  energyBeamLeft: {
    left: 34,
  },
  energyBeamRight: {
    right: 34,
  },
  ringOuter: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  ringInner: {
    position: 'absolute',
    width: 176,
    height: 176,
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,232,169,0.28)',
  },
  vaultCore: {
    width: 160,
    height: 184,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  vaultGlowCap: {
    position: 'absolute',
    left: 14,
    right: 14,
    top: 10,
    height: 34,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  vaultIconShell: {
    width: 102,
    height: 102,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,232,169,0.24)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  vaultLockRow: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vaultLockDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,232,169,0.8)',
  },
  vaultLockBar: {
    flex: 1,
    height: 2,
    marginHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  particle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginTop: 6,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 4,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statusChipLabel: {
    color: cityLootTheme.colors.text,
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 8,
  },
  errorIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 180,
  },
  errorIconHalo: {
    width: 118,
    height: 118,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,126,135,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,126,135,0.24)',
  },
  errorHelpCard: {
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    marginBottom: 14,
  },
  errorHelpTitle: {
    color: cityLootTheme.colors.text,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 6,
  },
  errorHelpText: {
    color: cityLootTheme.colors.textSoft,
    fontSize: 13,
    lineHeight: 19,
  },
  resultScroll: {
    paddingBottom: 8,
  },
  rewardCardWrap: {
    borderRadius: 28,
    padding: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  rewardCardAura: {
    position: 'absolute',
    top: -24,
    left: '22%',
    width: 210,
    height: 210,
    borderRadius: 999,
  },
  rewardCardShell: {
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0B121D',
  },
  rewardTopRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardSeriesChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(6,10,18,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  rewardSeriesText: {
    color: cityLootTheme.colors.text,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  rewardRarityChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
  },
  rewardRarityText: {
    color: cityLootTheme.colors.text,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  rewardArtFrame: {
    aspectRatio: 0.74,
    width: '100%',
    backgroundColor: '#111A27',
    overflow: 'hidden',
  },
  rewardArt: {
    width: '100%',
    height: '100%',
  },
  rewardFallbackArt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardFallbackText: {
    color: cityLootTheme.colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 10,
  },
  rewardArtFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 140,
  },
  rewardBottomPlate: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
    zIndex: 3,
  },
  rewardCardTitle: {
    color: cityLootTheme.colors.text,
    fontSize: 28,
    lineHeight: 31,
    fontWeight: '900',
  },
  rewardCardMeta: {
    color: cityLootTheme.colors.textSoft,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
  },
  rewardCardCode: {
    color: cityLootTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 8,
  },
  infoPanel: {
    marginTop: 14,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  infoLabel: {
    width: 92,
    color: cityLootTheme.colors.textSoft,
    fontSize: 14,
    fontWeight: '800',
  },
  infoValue: {
    flex: 1,
    color: cityLootTheme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  summaryPanel: {
    marginTop: 16,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  summaryTitle: {
    color: cityLootTheme.colors.text,
    fontSize: 15,
    fontWeight: '900',
    marginHorizontal: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    minHeight: 110,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  metricIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
  },
  metricValue: {
    color: cityLootTheme.colors.text,
    fontSize: 23,
    fontWeight: '900',
    marginTop: 18,
  },
  metricLabel: {
    color: cityLootTheme.colors.textSoft,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  couponPanel: {
    marginTop: 18,
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(246,197,95,0.22)',
    overflow: 'hidden',
    backgroundColor: 'rgba(14,16,23,0.96)',
  },
  couponGlow: {
    position: 'absolute',
    top: -36,
    right: -10,
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: 'rgba(246,197,95,0.10)',
  },
  couponTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  couponTitleLeft: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    flex: 1,
  },
  couponIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(246,197,95,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(246,197,95,0.20)',
  },
  couponTitle: {
    color: cityLootTheme.colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  couponSub: {
    color: cityLootTheme.colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  couponCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(103,227,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(103,227,255,0.18)',
  },
  couponCopyText: {
    color: cityLootTheme.colors.cyanSoft,
    fontSize: 12,
    fontWeight: '900',
  },
  couponCodeWrap: {
    marginTop: 12,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(246,197,95,0.18)',
  },
  couponCode: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  couponHint: {
    color: cityLootTheme.colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  couponCopyNote: {
    color: cityLootTheme.colors.green,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 8,
  },
  footerButtons: {
    marginTop: 16,
    gap: 10,
  },
  closeCompactBtn: {
    alignSelf: 'center',
  },
});
