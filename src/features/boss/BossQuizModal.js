import React, { memo, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import SafeScreen from '../../components/layout/SafeScreen';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import { BOSS_QUESTIONS_V1 } from '../../constants/boss';
import { dayKey, nextBossReturnText } from '../../utils/date';
import { clamp } from '../../utils/geo';
import { pickBossQuestion } from '../../utils/random';
import { cityLootTheme as theme } from '../../theme/cityLootTheme';
import { supabase } from '../../lib/supabase';

const OptionRow = memo(function OptionRow({ label, index, disabled, selected, phase, lastCorrect, onAnswer }) {
  const badge = String.fromCharCode(65 + index);
  const showState = phase === 'result' && selected;
  return (
    <Pressable
      disabled={disabled}
      onPress={() => onAnswer?.(index)}
      style={({ pressed }) => [
        dkd_styles.option,
        selected && dkd_styles.optionSelected,
        showState && lastCorrect === true && dkd_styles.optionCorrect,
        showState && lastCorrect === false && dkd_styles.optionWrong,
        pressed && !disabled ? dkd_styles.optionPressed : null,
      ]}
    >
      <View style={dkd_styles.optionBullet}><Text style={dkd_styles.optionBulletText}>{badge}</Text></View>
      <Text style={dkd_styles.optionText}>{label}</Text>
      {showState ? <Text style={dkd_styles.optionState}>{lastCorrect ? '✅' : '❌'}</Text> : <MaterialCommunityIcons name="chevron-right" size={20} color="rgba(255,255,255,0.75)" />}
    </Pressable>
  );
});

function CombatBar({ label, value, max, colors, icon, tone = 'cyan' }) {
  const ratio = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  const tint = tone === 'gold' ? theme.colors.goldSoft : tone === 'purple' ? theme.colors.purple : theme.colors.cyanSoft;
  const segments = new Array(Math.max(1, max)).fill(0);
  return (
    <View style={dkd_styles.combatBarWrap}>
      <View style={dkd_styles.combatHead}>
        <View style={dkd_styles.combatLabelRow}>
          <MaterialCommunityIcons name={icon} size={16} color={tint} />
          <Text style={dkd_styles.combatLabel}>{label}</Text>
        </View>
        <Text style={[dkd_styles.combatValue, { color: tint }]}>{value}/{max}</Text>
      </View>
      <View style={dkd_styles.combatTrack}>
        <LinearGradient colors={colors} style={[dkd_styles.combatFill, { width: `${ratio * 100}%` }]} />
        <View style={dkd_styles.combatTicks}>
          {segments.map((dkd_unused_value, index) => (
            <View key={`${label}-${index}`} style={dkd_styles.combatTick} />
          ))}
        </View>
      </View>
    </View>
  );
}

function RewardChip({ icon, label, tone = 'cyan' }) {
  const tint = tone === 'gold' ? theme.colors.goldSoft : tone === 'purple' ? theme.colors.purple : theme.colors.cyanSoft;
  return (
    <View style={dkd_styles.rewardChip}>
      <MaterialCommunityIcons name={icon} size={16} color={tint} />
      <Text style={dkd_styles.rewardChipText}>{label}</Text>
    </View>
  );
}

export default function BossQuizModal({ visible, onClose, bossState, onAnswer, onTryAgain, onOpenChest }) {
  const [bossMeta, setBossMeta] = useState(null);
  useEffect(() => {
    let alive = true;
    async function loadMeta() {
      if (!visible || !bossState?.drop_id) {
        setBossMeta(null);
        return;
      }
      try {
        const { data } = await supabase
          .from('dkd_boss_defs')
          .select('*')
          .eq('drop_id', String(bossState.drop_id))
          .maybeSingle();
        if (alive) setBossMeta(data || null);
      } catch {
        if (alive) setBossMeta(null);
      }
    }
    loadMeta();
    return () => {
      alive = false;
    };
  }, [visible, bossState?.drop_id]);

  const day = bossState?.day || dayKey();
  const qids = Array.isArray(bossState?.qids) ? bossState.qids : [];
  const qCount = qids.length ? qids.length : Number(bossState?.q_count || 3);
  const maxStep = Math.max(0, qCount - 1);
  const step = clamp(Number(bossState?.step || 0), 0, maxStep);
  const customQuestions = Array.isArray(bossState?.question_set) ? bossState.question_set : [];
  const qid = qids[step] || bossState?.question_id;
  const dkd_query_value = customQuestions[step] || (BOSS_QUESTIONS_V1 || []).find((dkd_question_item) => dkd_question_item.id === qid) || pickBossQuestion(day);
  const phase = bossState?.phase || 'choose';
  const finished = !!bossState?.finished;
  const victory = !!bossState?.victory;
  const escaped = !!bossState?.escaped;
  const correct = Number(bossState?.correct || 0);
  const wrong = Number(bossState?.wrong || 0);
  const bossHpMax = Number(bossState?.boss_hp_max != null ? bossState.boss_hp_max : 3);
  const playerHpMax = Number(bossState?.player_hp_max != null ? bossState.player_hp_max : 3);
  const bossHp = Number(bossState?.boss_hp != null ? bossState.boss_hp : Math.max(0, bossHpMax - correct));
  const playerHp = Number(bossState?.player_hp != null ? bossState.player_hp : Math.max(0, playerHpMax - wrong));
  const lastSelected = bossState?.last_selected;
  const lastCorrect = bossState?.last_correct;
  const mode = bossState?.mode || 'daily';
  const isDrop = mode === 'drop';
  const returnText = typeof nextBossReturnText === 'function' ? String(nextBossReturnText() || 'Hazır') : 'Hazır';
  const bossName = String(bossState?.boss_name || bossMeta?.title || bossMeta?.boss_name || bossState?.name || 'Boss');
  const bossSub = String(bossState?.boss_subtitle || bossMeta?.subtitle || 'Savunma çekirdeği aktif. Soruları çöz ve bossu düşür.');
  const bossArt = String(bossState?.boss_art_image_url || bossMeta?.art_image_url || bossMeta?.boss_art_url || '');
  const rewardSummary = String(bossState?.reward_summary || bossMeta?.reward_summary || 'Token • Shard • Kart');
  const optionDisabled = finished || phase !== 'choose';
  const options = useMemo(() => (dkd_query_value?.opts || []).map((label, index) => ({ label, index })), [dkd_query_value]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeScreen style={{ flex: 1, backgroundColor: '#050A11' }}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#040811', '#08111A', '#070E18']} style={{ flex: 1 }}>
          <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={dkd_styles.scrollContent}>
            <View style={dkd_styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={dkd_styles.kicker}>{isDrop ? 'RAID CORE // DROP BOSS' : 'RAID CORE // DAILY BOSS'}</Text>
                <Text style={dkd_styles.title}>Boss savaşı</Text>
                <Text style={dkd_styles.sub}>Soruları çöz, doğru cevaplarla boss canını indir ve baskını tamamla.</Text>
              </View>
              <SecondaryButton label="Kapat" icon="close" tone="ghost" size="compact" fullWidth={false} onPress={onClose} />
            </View>

            <View style={dkd_styles.heroCard}>
              <View style={dkd_styles.heroMedia}>
                {bossArt ? (
                  <Image source={{ uri: bossArt }} style={StyleSheet.absoluteFillObject} contentFit="cover" contentPosition="center" />
                ) : (
                  <LinearGradient colors={['#0A1A29', '#0A1320']} style={StyleSheet.absoluteFillObject} />
                )}
                <LinearGradient colors={['rgba(4,8,14,0.18)', 'rgba(4,8,14,0.82)']} style={StyleSheet.absoluteFillObject} />
                <View style={dkd_styles.mediaBadge}><Text style={dkd_styles.mediaBadgeText}>{isDrop ? 'DROP BOSS' : 'DAILY BOSS'}</Text></View>
              </View>

              <View style={dkd_styles.heroInfoCard}>
                <View style={dkd_styles.heroTitleRow}>
                  <View style={dkd_styles.heroAvatarWrap}>
                    {bossArt ? <Image source={{ uri: bossArt }} style={StyleSheet.absoluteFillObject} contentFit="cover" /> : <MaterialCommunityIcons name="robot-angry-outline" size={32} color={theme.colors.goldSoft} />}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={dkd_styles.heroName}>{bossName}</Text>
                    <Text style={dkd_styles.heroSub}>{bossSub}</Text>
                  </View>
                </View>

                <View style={dkd_styles.quickStats}>
                  <View style={dkd_styles.quickStatBox}><Text style={dkd_styles.quickStatLabel}>Tur</Text><Text style={dkd_styles.quickStatValue}>{step + 1}/{qCount}</Text></View>
                  <View style={dkd_styles.quickStatBox}><Text style={dkd_styles.quickStatLabel}>Doğru</Text><Text style={dkd_styles.quickStatValue}>{correct}</Text></View>
                  <View style={dkd_styles.quickStatBox}><Text style={dkd_styles.quickStatLabel}>Yanlış</Text><Text style={dkd_styles.quickStatValue}>{wrong}</Text></View>
                </View>

                <CombatBar label="Boss Can" value={bossHp} max={bossHpMax} colors={['#FFCA7A', '#FF7A1D']} icon="robot-angry-outline" tone="gold" />
                <CombatBar label="Senin Zırh" value={playerHp} max={playerHpMax} colors={['#8EF4FF', '#2F8CFF']} icon="shield-account-outline" tone="cyan" />
              </View>
            </View>

            {!finished ? (
              <>
                <View style={dkd_styles.questionCard}>
                  <View style={dkd_styles.questionHead}>
                    <Text style={dkd_styles.questionKicker}>{phase === 'choose' ? 'SIRADAKİ KİLİT' : 'SONUÇ'}</Text>
                    <Text style={dkd_styles.questionMeta}>{phase === 'choose' ? 'Bir cevap seç' : lastCorrect ? 'Darbe başarılı' : 'Savunma direniyor'}</Text>
                  </View>
                  <Text style={dkd_styles.questionText}>{dkd_query_value?.dkd_query_value}</Text>
                </View>

                <View style={dkd_styles.optionsWrap}>
                  {options.map((item) => (
                    <OptionRow
                      key={String(item.index)}
                      label={item.label}
                      index={item.index}
                      disabled={optionDisabled}
                      selected={lastSelected === item.index}
                      phase={phase}
                      lastCorrect={lastCorrect}
                      onAnswer={onAnswer}
                    />
                  ))}
                </View>

                {phase === 'result' ? (
                  <View style={dkd_styles.resultCard}>
                    <Text style={[dkd_styles.resultText, lastCorrect ? dkd_styles.resultOk : dkd_styles.resultBad]}>
                      {lastCorrect ? 'Doğru cevap. Boss hattı kırıldı, bir sonraki kilide geçebilirsin.' : 'Yanlış cevap. Kişisel zırhın hasar aldı, dikkatli ilerle.'}
                    </Text>
                    <View style={{ marginTop: 10 }}>
                      <SecondaryButton label="Devam" icon="arrow-right" tone="nav" onPress={onTryAgain} />
                    </View>
                  </View>
                ) : null}
              </>
            ) : (
              <View style={dkd_styles.finishCard}>
                <LinearGradient colors={victory ? ['#0C2C45', '#08111B'] : ['#2D1117', '#090E16']} style={StyleSheet.absoluteFillObject} />
                <Text style={dkd_styles.finishKicker}>{victory ? 'BOSS DÜŞTÜ' : escaped ? 'RAID DURDU' : 'YENİDEN BAŞLAT'}</Text>
                <Text style={dkd_styles.finishTitle}>{victory ? 'Baskın tamamlandı' : escaped ? 'Bugünlük pencere kapandı' : 'Yeniden saldırı hazırlığı'}</Text>
                <Text style={dkd_styles.finishSub}>{victory ? 'Zafer sonrası ödül çekirdeği hazır. İstersen şimdi ganimete geç.' : escaped ? `Tekrar geliş: ${returnText}` : 'Akışı sıfırlayıp aynı boss için tekrar deneyebilirsin.'}</Text>
                <View style={dkd_styles.finishRewardRow}>
                  {rewardSummary.split('•').map((item, index) => {
                    const label = String(item || '').trim();
                    if (!label) return null;
                    return <RewardChip key={`${label}-${index}`} icon={index === 0 ? 'cash-multiple' : index === 1 ? 'diamond-stone' : index === 2 ? 'cards-outline' : 'ticket-confirmation-outline'} label={label} tone={index === 0 ? 'gold' : index === 2 ? 'purple' : 'cyan'} />;
                  })}
                </View>
                <View style={{ marginTop: 14 }}>
                  {victory && isDrop ? <PrimaryButton label="Ödülü Aç" icon="treasure-chest" onPress={onOpenChest} /> : null}
                  {!victory && !escaped ? <View style={victory && isDrop ? { marginTop: 10 } : null}><SecondaryButton label="Tekrar Dene" icon="refresh" onPress={onTryAgain} /></View> : null}
                  {escaped ? <View style={{ marginTop: 10 }}><SecondaryButton label="Tamam" icon="check" tone="ghost" onPress={onClose} /></View> : null}
                </View>
              </View>
            )}
          </ScrollView>
        </LinearGradient>
      </SafeScreen>
    </Modal>
  );
}

const dkd_styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 26 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  kicker: { color: theme.colors.cyanSoft, fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: theme.colors.text, fontSize: 34, lineHeight: 40, fontWeight: '900', marginTop: 6 },
  sub: { color: theme.colors.textSoft, fontSize: 14, lineHeight: 20, marginTop: 8 },
  heroCard: { marginTop: 14 },
  heroMedia: { height: 188, borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.05)' },
  mediaBadge: { position: 'absolute', left: 16, top: 16, borderRadius: 999, backgroundColor: 'rgba(7,16,26,0.76)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 12, paddingVertical: 8 },
  mediaBadgeText: { color: theme.colors.text, fontSize: 11, fontWeight: '900', letterSpacing: 1.05 },
  heroInfoCard: { marginTop: -26, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(8,16,25,0.96)', padding: 16 },
  heroTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroAvatarWrap: { width: 78, height: 78, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  heroName: { color: theme.colors.text, fontSize: 28, fontWeight: '900' },
  heroSub: { color: theme.colors.textSoft, fontSize: 13, lineHeight: 18, marginTop: 6 },
  quickStats: { flexDirection: 'row', gap: 10, marginTop: 14 },
  quickStatBox: { flex: 1, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.04)', paddingHorizontal: 12, paddingVertical: 12 },
  quickStatLabel: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '800' },
  quickStatValue: { color: theme.colors.text, fontSize: 20, fontWeight: '900', marginTop: 6 },
  combatBarWrap: { marginTop: 12 },
  combatHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  combatLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  combatLabel: { color: theme.colors.text, fontSize: 14, fontWeight: '900' },
  combatValue: { fontSize: 14, fontWeight: '900' },
  combatTrack: { height: 20, borderRadius: 999, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.06)' },
  combatFill: { ...StyleSheet.absoluteFillObject, right: 'auto', borderRadius: 999 },
  combatTicks: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'stretch' },
  combatTick: { width: 1, backgroundColor: 'rgba(255,255,255,0.14)' },
  questionCard: { marginTop: 16, borderRadius: 26, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.04)', padding: 16 },
  questionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  questionKicker: { color: theme.colors.goldSoft, fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  questionMeta: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '800' },
  questionText: { color: theme.colors.text, fontSize: 28, lineHeight: 34, fontWeight: '900', marginTop: 12 },
  optionsWrap: { marginTop: 12, gap: 10 },
  option: { minHeight: 76, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionSelected: { borderColor: 'rgba(108,203,255,0.36)' },
  optionCorrect: { backgroundColor: 'rgba(77,235,172,0.12)', borderColor: 'rgba(77,235,172,0.32)' },
  optionWrong: { backgroundColor: 'rgba(255,113,120,0.10)', borderColor: 'rgba(255,113,120,0.30)' },
  optionPressed: { transform: [{ scale: 0.99 }] },
  optionBullet: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  optionBulletText: { color: theme.colors.text, fontSize: 18, fontWeight: '900' },
  optionText: { flex: 1, color: theme.colors.text, fontSize: 18, fontWeight: '800', lineHeight: 24 },
  optionState: { fontSize: 22 },
  resultCard: { marginTop: 12, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.04)', padding: 14 },
  resultText: { fontSize: 15, lineHeight: 22, fontWeight: '800' },
  resultOk: { color: '#8CF0AE' },
  resultBad: { color: '#FF959B' },
  finishCard: { marginTop: 16, borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.05)', padding: 18 },
  finishKicker: { color: theme.colors.cyanSoft, fontSize: 12, fontWeight: '900', letterSpacing: 1.1 },
  finishTitle: { color: theme.colors.text, fontSize: 30, lineHeight: 36, fontWeight: '900', marginTop: 8 },
  finishSub: { color: theme.colors.textSoft, fontSize: 14, lineHeight: 20, marginTop: 8 },
  finishRewardRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 16 },
  rewardChip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 14, paddingVertical: 10 },
  rewardChipText: { color: theme.colors.text, fontSize: 14, fontWeight: '900' },
});
