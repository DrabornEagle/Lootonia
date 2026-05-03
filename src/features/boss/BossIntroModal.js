import React, { memo, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import { cityLootTheme as theme } from '../../theme/cityLootTheme';
import { supabase } from '../../lib/supabase';

function BossMedia({ artUrl }) {
  return (
    <View style={dkd_styles.mediaCard}>
      {artUrl ? (
        <Image source={{ uri: artUrl }} style={StyleSheet.absoluteFillObject} contentFit="cover" contentPosition="center" />
      ) : (
        <LinearGradient colors={['#0D2134', '#09121C']} style={StyleSheet.absoluteFillObject} />
      )}
      <LinearGradient colors={['rgba(5,8,14,0.10)', 'rgba(5,8,14,0.78)']} style={StyleSheet.absoluteFillObject} />
    </View>
  );
}

function StatCard({ icon, label, value, tone = 'cyan' }) {
  const tint = tone === 'gold' ? theme.colors.goldSoft : tone === 'purple' ? theme.colors.purple : theme.colors.cyanSoft;
  return (
    <View style={dkd_styles.statCard}>
      <MaterialCommunityIcons name={icon} size={18} color={tint} />
      <Text style={dkd_styles.statLabel}>{label}</Text>
      <Text style={[dkd_styles.statValue, { color: tint }]}>{value}</Text>
    </View>
  );
}

function RewardPill({ icon, label, tone = 'cyan' }) {
  const tint = tone === 'gold' ? theme.colors.goldSoft : tone === 'purple' ? theme.colors.purple : theme.colors.cyanSoft;
  return (
    <View style={dkd_styles.rewardPill}>
      <MaterialCommunityIcons name={icon} size={16} color={tint} />
      <Text style={dkd_styles.rewardPillText}>{label}</Text>
    </View>
  );
}

function BossIntroModal({ visible, payload, onClose, onStart }) {
  const [bossMeta, setBossMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const isDrop = payload?.mode === 'drop';

  useEffect(() => {
    let alive = true;
    async function loadBossMeta() {
      if (!visible || !payload?.dropId) {
        setBossMeta(null);
        return;
      }
      setLoading(true);
      try {
        const { data } = await supabase
          .from('dkd_boss_defs')
          .select('*')
          .eq('drop_id', String(payload.dropId))
          .maybeSingle();
        if (alive) setBossMeta(data || null);
      } catch {
        if (alive) setBossMeta(null);
      } finally {
        if (alive) setLoading(false);
      }
    }
    loadBossMeta();
    return () => {
      alive = false;
    };
  }, [visible, payload?.dropId]);

  const rawBossName = String(payload?.title || bossMeta?.title || bossMeta?.boss_name || 'Boss Baskını');
  const bossSub = String(payload?.subtitle || bossMeta?.subtitle || bossMeta?.boss_subtitle || 'Şehir çekirdeği kilitlendi. Soruları çöz, savunmayı kır ve baskını tamamla.');
  const bossDesc = String(payload?.description || bossMeta?.description || bossMeta?.boss_description || 'Canlı raid sistemi açık. Doğru cevap verdikçe gerçek boss HP barı geri çekilir.');
  const artUrl = String(payload?.art_image_url || bossMeta?.art_image_url || bossMeta?.boss_art_url || '');
  const tickets = Math.max(0, Number(payload?.tickets || 0));
  const rewardSummary = String(payload?.reward_summary || bossMeta?.reward_summary || 'Token • Shard • Kart • Bilet');
  const hpValue = Math.max(1, Number(payload?.hp || bossMeta?.boss_hp_display || 985000));
  const hpText = hpValue.toLocaleString('tr-TR');
  const rewardParts = rewardSummary.split('•').map((part) => String(part || '').trim()).filter(Boolean);

  const bossName = useMemo(() => {
    const clean = rawBossName.trim().toLocaleLowerCase('tr-TR');
    if (clean === 'baskın başlat') {
      return String(bossMeta?.title || bossMeta?.boss_name || payload?.dropName || 'Boss');
    }
    return rawBossName;
  }, [rawBossName, bossMeta?.title, bossMeta?.boss_name, payload?.dropName]);

  const showSubtitle = useMemo(() => rawBossName.trim().toLocaleLowerCase('tr-TR') !== 'baskın başlat', [rawBossName]);
  const ticketText = `${tickets}`;

  return (
    <Modal visible={visible} animationType="fade" transparent hardwareAccelerated statusBarTranslucent onRequestClose={onClose}>
      <View style={dkd_styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={dkd_styles.card}>
          <LinearGradient colors={['#06101A', '#09131E', '#07111B']} style={StyleSheet.absoluteFillObject} />
          <View style={dkd_styles.topGlow} />

          <View style={dkd_styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={dkd_styles.kicker}>{isDrop ? 'DROP RAID // CANLI HP' : 'DAILY RAID // CANLI HP'}</Text>
            </View>
            <SecondaryButton label="Kapat" icon="close" tone="ghost" size="compact" fullWidth={false} onPress={onClose} />
          </View>

          <BossMedia artUrl={artUrl} />

          <View style={dkd_styles.nameBlock}>
            <Text style={dkd_styles.name}>{bossName}</Text>
            {showSubtitle ? <Text style={dkd_styles.subtitle}>{bossSub}</Text> : null}
          </View>

          <View style={dkd_styles.statRow}>
            <StatCard icon="map-marker-radius-outline" label="Mod" value={isDrop ? 'Drop' : 'Günlük'} />
            <StatCard icon="ticket-confirmation-outline" label="Bilet" value={ticketText} tone="gold" />
            <StatCard icon="heart-pulse" label="Boss HP" value={hpText} tone="purple" />
          </View>

          <View style={dkd_styles.infoCard}>
            <Text style={dkd_styles.infoTitle}>Akış açık ve net</Text>
            <Text style={dkd_styles.infoText}>{bossDesc}</Text>
          </View>

          <View style={dkd_styles.rewardRow}>
            {rewardParts.length ? rewardParts.map((label, index) => (
              <RewardPill
                key={`${label}-${index}`}
                icon={index === 0 ? 'cash-multiple' : index === 1 ? 'diamond-stone' : index === 2 ? 'cards-outline' : 'ticket-confirmation-outline'}
                label={label}
                tone={index === 0 ? 'gold' : index === 2 ? 'purple' : 'cyan'}
              />
            )) : (
              <>
                <RewardPill icon="cash-multiple" label="Token" tone="gold" />
                <RewardPill icon="diamond-stone" label="Shard" tone="cyan" />
                <RewardPill icon="cards-outline" label="Kart" tone="purple" />
              </>
            )}
          </View>

          {loading ? <ActivityIndicator color={theme.colors.cyanSoft} style={{ marginTop: 12 }} /> : null}

          <View style={dkd_styles.actionWrap}>
            <PrimaryButton label="Baskını Başlat" icon="sword-cross" onPress={onStart} />
            <View style={{ height: 10 }} />
            <SecondaryButton label="Şimdilik Vazgeç" icon="arrow-left" tone="ghost" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const dkd_styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'center', padding: 16 },
  card: { borderRadius: 30, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: '#08111B', padding: 18 },
  topGlow: { position: 'absolute', top: -18, right: -26, width: 180, height: 180, borderRadius: 999, backgroundColor: 'rgba(108,203,255,0.13)' },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  kicker: { color: theme.colors.cyanSoft, fontSize: 11, fontWeight: '900', letterSpacing: 1.15 },
  mediaCard: { height: 182, borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', marginTop: 16, backgroundColor: 'rgba(255,255,255,0.04)' },
  nameBlock: { marginTop: 14 },
  name: { color: theme.colors.text, fontSize: 28, fontWeight: '900' },
  subtitle: { color: theme.colors.textSoft, fontSize: 14, lineHeight: 20, marginTop: 8 },
  statRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 16 },
  statCard: { flexGrow: 1, flexBasis: '30%', minWidth: 96, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.05)', padding: 14 },
  statLabel: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '800', marginTop: 8 },
  statValue: { color: theme.colors.text, fontSize: 18, fontWeight: '900', marginTop: 6 },
  infoCard: { marginTop: 14, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.04)', padding: 14 },
  infoTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '900' },
  infoText: { color: theme.colors.textSoft, fontSize: 14, lineHeight: 20, marginTop: 8 },
  rewardRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 14 },
  rewardPill: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 14, paddingVertical: 12 },
  rewardPillText: { color: theme.colors.text, fontSize: 14, fontWeight: '900' },
  actionWrap: { marginTop: 16 },
});

export default memo(BossIntroModal);
