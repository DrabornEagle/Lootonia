import React, { memo, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';


const CYCLE_LABELS = ['1', '2', '3', '4', '5', '6', '7'];

function formatRemainingText(targetIso) {
  if (!targetIso) return '—';
  const diff = new Date(targetIso).getTime() - Date.now();
  if (!Number.isFinite(diff) || diff <= 0) return '00:00:00';
  const totalSec = Math.floor(diff / 1000);
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function cleanLabel(text, fallback = '') {
  const raw = String(text || '').trim();
  if (!raw) return fallback;
  return raw
    .replace(/\s*•\s*\+?\d+\s*Ops/gi, '')
    .replace(/\bOps\b/gi, '')
    .replace(/\bjeton\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+•\s+$/g, '')
    .trim() || fallback;
}


function formatCountdown(targetIso) {
  const targetMs = new Date(targetIso || Date.now()).getTime();
  const now = Date.now();
  const diff = Math.max(0, targetMs - now);
  const total = Math.floor(diff / 1000);
  const dkd_hour_value = Math.floor(total / 3600);
  const dkd_minute_value = Math.floor((total % 3600) / 60);
  const dkd_second_value = total % 60;
  if (dkd_hour_value > 0) return `${dkd_hour_value}sa ${String(dkd_minute_value).padStart(2, '0')}dk`;
  return `${String(dkd_minute_value).padStart(2, '0')}dk ${String(dkd_second_value).padStart(2, '0')}sn`;
}

function SectionTitle({ title, subtitle }) {
  return (
    <View style={{ marginTop: 18 }}>
      <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '900' }}>{title}</Text>
      {!!subtitle ? <Text style={{ color: 'rgba(223,236,255,0.66)', fontSize: 11, fontWeight: '700', marginTop: 5, lineHeight: 18 }}>{subtitle}</Text> : null}
    </View>
  );
}

function MiniStat({ label, value, sub, accent }) {
  return (
    <View style={{ flex: 1, minWidth: 120, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: accent || 'rgba(255,255,255,0.10)' }}>
      <Text style={{ color: 'rgba(229,241,255,0.70)', fontSize: 10, fontWeight: '900' }}>{label}</Text>
      <Text style={{ color: '#FFFFFF', fontSize: 19, fontWeight: '900', marginTop: 4 }}>{value}</Text>
      {!!sub ? <Text style={{ color: 'rgba(229,241,255,0.60)', fontSize: 11, fontWeight: '700', marginTop: 4 }}>{sub}</Text> : null}
    </View>
  );
}

function RewardDayChip({ index, currentDay, claimedToday }) {
  const day = index + 1;
  const active = day === currentDay;
  const done = claimedToday ? day <= currentDay : day < currentDay;
  return (
    <View style={{ width: '13.2%', minWidth: 38, borderRadius: 14, paddingVertical: 10, alignItems: 'center', backgroundColor: active ? 'rgba(103,227,255,0.14)' : done ? 'rgba(139,255,183,0.12)' : 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: active ? 'rgba(103,227,255,0.30)' : done ? 'rgba(139,255,183,0.22)' : 'rgba(255,255,255,0.10)' }}>
      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '900' }}>{day}</Text>
      <Text style={{ color: active ? '#8DEBFF' : done ? '#8BFFB7' : 'rgba(255,255,255,0.52)', fontSize: 9, fontWeight: '900', marginTop: 3 }}>{active ? 'BUGÜN' : done ? 'OK' : '...'}</Text>
    </View>
  );
}

function StreakMilestoneCard({ item, onClaim, disabled }) {
  const ready = !!item?.claimReady || !!item?.claimable;
  return (
    <View style={{ borderRadius: 20, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: ready ? 'rgba(103,227,255,0.24)' : 'rgba(255,255,255,0.10)' }}>
      <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '900' }}>{item?.label || 'Milestone'}</Text>
      <Text style={{ color: 'rgba(229,241,255,0.70)', fontSize: 11, fontWeight: '800', marginTop: 4 }}>{cleanLabel(item?.rewardLabel, 'Ekstra ödül')}</Text>
      <Text style={{ color: item?.claimedAt ? '#8DEBFF' : ready ? '#8BFFB7' : 'rgba(255,255,255,0.56)', fontSize: 11, fontWeight: '900', marginTop: 8 }}>
        {item?.claimedAt ? 'Alındı' : ready ? 'Hazır' : item?.progressLabel || 'Seriyi devam ettir'}
      </Text>
      {!item?.claimedAt ? (
        <Pressable
          onPress={() => onClaim?.(item?.days)}
          disabled={!ready || disabled}
          style={{ marginTop: 10, minHeight: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: ready ? 'rgba(103,227,255,0.16)' : 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: ready ? 'rgba(103,227,255,0.32)' : 'rgba(255,255,255,0.10)', opacity: !ready || disabled ? 0.7 : 1 }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '900' }}>{ready ? 'Seri Ödülünü Al' : 'Seriyi Devam Ettir'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function DailyRewardModal({
  visible,
  state,
  claimLoading,
  rewardHubLoading,
  onClaim,
  onClose,
  onClaimMilestone,
}) {
  const preview = state?.rewardPreview || { token: 0, xp: 0, label: 'Günlük ödül', cycleDay: 1 };
  const milestones = Array.isArray(state?.streakMilestones) ? state.streakMilestones : [];
  const currentDay = Math.max(1, Number(preview?.cycleDay || 1));
  const streak = Math.max(0, Number(state?.streak || 0));
  const pulseSubtitle = cleanLabel(state?.pulse?.subtitle);
  const activityReward = cleanLabel(state?.latestActivity?.rewardLabel);
  const [, setRemainingText] = useState(() => formatRemainingText(state?.activeEvent?.windowEndsAt));

  useEffect(() => {
    setRemainingText(formatRemainingText(state?.activeEvent?.windowEndsAt));
    const timer = setInterval(() => setRemainingText(formatRemainingText(state?.activeEvent?.windowEndsAt)), 1000);
    return () => clearInterval(timer);
  }, [state?.activeEvent?.windowEndsAt]);
  const [countdownNow, setCountdownNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCountdownNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const nextWindowText = useMemo(() => formatCountdown(state?.activeEvent?.windowEndsAt || new Date(new Date(countdownNow).setHours(23, 59, 59, 999)).toISOString()), [state?.activeEvent?.windowEndsAt, countdownNow]);

  if (!state) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent hardwareAccelerated statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(2,6,16,0.84)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
        <LinearGradient colors={['#08111D', '#101D34', '#0B1426']} style={{ width: '100%', maxWidth: 460, maxHeight: '92%', borderRadius: 30, paddingHorizontal: 16, paddingVertical: 16, borderWidth: 1, borderColor: 'rgba(120,155,225,0.18)' }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
            <View style={{ borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(103,227,255,0.18)' }}>
              <LinearGradient colors={['#0E5A4C', '#0E2344']} style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#8DEBFF', fontSize: 11, fontWeight: '900', letterSpacing: 1 }}>GÜNLÜK ÖDÜL • GİRİŞ</Text>
                  <Pressable onPress={onClose} style={{ minWidth: 34, minHeight: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '900' }}>✕</Text>
                  </Pressable>
                </View>
                <Text style={{ color: '#FFFFFF', fontSize: 25, fontWeight: '900', marginTop: 6 }}>Günlük Giriş Ödülü</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 6, gap: 8 }}><Text style={{ color: 'rgba(229,241,255,0.62)', fontSize: 11, fontWeight: '800' }}>7 günlük rota • {currentDay}. gün</Text><View style={{ minHeight: 24, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', flexDirection: 'row', alignItems: 'center' }}><Text style={{ color: '#8DEBFF', fontSize: 10, fontWeight: '900' }}>Sonraki ödül: {nextWindowText}</Text></View></View>
                <Text style={{ color: 'rgba(229,241,255,0.78)', fontSize: 13, fontWeight: '700', lineHeight: 20, marginTop: 8 }}>
                  {state?.claimedToday
                    ? `Bugünün ödülü alındı. ${Math.max(1, streak)}. gün serisi korunuyor. Yarın tekrar gelerek günlük döngüyü devam ettir.`
                    : `Bugünün ödülü hazır. ${Number(preview?.token || 0)} token ve ${Number(preview?.xp || 0)} XP alarak ${currentDay}. günü tamamlayabilirsin.`}
                </Text>
              </LinearGradient>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 14 }}>
              <View style={{ width: '49%', marginBottom: 8 }}><MiniStat label="SERİ" value={`${streak} gün`} accent="rgba(103,227,255,0.20)" /></View>
              <View style={{ width: '49%', marginLeft: '2%', marginBottom: 8 }}><MiniStat label="DÖNGÜ" value={`${currentDay}/7`} sub="Günlük rota" accent="rgba(255,196,71,0.18)" /></View>
              <View style={{ width: '49%' }}><MiniStat label="BUGÜN" value={`${Number(preview?.token || 0)} token`} sub={`${Number(preview?.xp || 0)} XP`} accent="rgba(139,255,183,0.18)" /></View>
              <View style={{ width: '49%', marginLeft: '2%' }}><MiniStat label="DURUM" value={state?.claimedToday ? 'Alındı' : 'Hazır'} sub={cleanLabel(preview?.label, 'Günlük ödül')} accent="rgba(255,255,255,0.12)" /></View>
            </View>

            {state?.pulse ? (
              <View style={{ marginTop: 12, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' }}>
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '900' }}>{state.pulse.title}</Text>
                {!!pulseSubtitle ? <Text style={{ color: 'rgba(229,241,255,0.72)', fontSize: 11, fontWeight: '800', marginTop: 5 }}>{pulseSubtitle}</Text> : null}
              </View>
            ) : null}

            {state?.latestActivity ? (
              <View style={{ marginTop: 12, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' }}>
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '900' }}>Son Claim Özeti</Text>
                <Text style={{ color: '#8DEBFF', fontSize: 13, fontWeight: '900', marginTop: 8 }}>{state.latestActivity.title}</Text>
                <Text style={{ color: 'rgba(229,241,255,0.72)', fontSize: 11, fontWeight: '700', marginTop: 4 }}>
                  {[activityReward, state.latestActivity.timeLabel].filter(Boolean).join(' • ')}
                </Text>
              </View>
            ) : null}

            <SectionTitle title="7 Günlük Rota" subtitle="Her giriş günlük seriyi korur ve döngüyü ilerletir." />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 10 }}>
              {CYCLE_LABELS.map((_, index) => (
                <RewardDayChip key={CYCLE_LABELS[index]} index={index} currentDay={currentDay} claimedToday={!!state?.claimedToday} />
              ))}
            </View>

            {milestones.length ? (
              <>
                <SectionTitle title="Seri Milestone Ödülleri" subtitle="3 / 5 / 7 gün serilerinde ekstra token ve bonus ödül kazan." />
                <View style={{ marginTop: 10 }}>
                  {milestones.map((item, index) => (
                    <View key={`${String(item?.days || item?.id || 'ms')}-${index}`} style={{ marginBottom: 10 }}>
                      <StreakMilestoneCard item={item} onClaim={onClaimMilestone} disabled={claimLoading || rewardHubLoading} />
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            <View style={{ marginTop: 18 }}>
              <PrimaryButton label={state?.claimedToday ? 'Bugünün Ödülü Alındı' : (claimLoading ? 'Alınıyor...' : 'Günlük Ödülü Al')} onPress={onClaim} disabled={!!state?.claimedToday || !!claimLoading} />
              <View style={{ marginTop: 10 }}><SecondaryButton label="Kapat" onPress={onClose} /></View>
            </View>
          </ScrollView>
        </LinearGradient>
      </View>
    </Modal>
  );
}

export default memo(DailyRewardModal);
