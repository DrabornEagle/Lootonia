import React, { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, Share, StatusBar, Text, View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import SafeScreen from '../../components/layout/SafeScreen';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import {
  SOCIAL_CARD_TEMPLATES,
  buildInviteCode,
  buildPlayerCardPayload,
  buildPlayerCardShareText,
  buildPlayerStyleTag,
  buildSocialCollectionSummary,
  getClaimedCount,
  getSocialTheme,
  loadSelectedSocialTemplate,
  saveSelectedSocialTemplate,
} from '../../services/socialProfileService';
import { formatInt } from '../../utils/text';
import { cityLootTheme as theme } from '../../theme/cityLootTheme';

function StatCard({ label, value, accent }) {
  return (
    <View style={{ width: '48%', minWidth: 140, padding: 12, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', marginBottom: 10 }}>
      <Text style={{ color: 'rgba(255,255,255,0.60)', fontSize: 11, fontWeight: '800', letterSpacing: 0.6 }}>{label}</Text>
      <Text style={{ color: accent, fontSize: 18, fontWeight: '900', marginTop: 6 }}>{value}</Text>
    </View>
  );
}

function TemplateChip({ item, selected, onPress }) {
  return (
    <Pressable onPress={() => onPress(item.key)} style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999, marginRight: 8, marginBottom: 8, backgroundColor: selected ? 'rgba(103,227,255,0.14)' : 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: selected ? 'rgba(103,227,255,0.30)' : 'rgba(255,255,255,0.10)' }}>
      <Text style={{ color: '#FFFFFF', fontWeight: '900' }}>{item.label}</Text>
    </Pressable>
  );
}

function RarityChip({ item, accent }) {
  return (
    <View style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', marginRight: 8, marginBottom: 8 }}>
      <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{item.label}: <Text style={{ color: accent }}>{formatInt(item.count)}</Text></Text>
    </View>
  );
}

export default function SocialPlayerCardModal({ visible, onClose, onOpenCompare, sessionUserId, profile, cards, taskState, weeklyTaskState }) {
  const [sharing, setSharing] = useState(false);
  const [templateKey, setTemplateKey] = useState('neon');

  const summary = useMemo(() => buildSocialCollectionSummary(cards || []), [cards]);
  const profileId = useMemo(() => buildPlayerCardPayload({ sessionUserId, profile, summary, taskState, weeklyTaskState }).profileId, [sessionUserId, profile, summary, taskState, weeklyTaskState]);

  useEffect(() => {
    let active = true;
    if (!visible) return undefined;
    loadSelectedSocialTemplate(profileId).then((value) => {
      if (active) setTemplateKey(value || 'neon');
    });
    return () => { active = false; };
  }, [visible, profileId]);

  const socialTheme = useMemo(() => getSocialTheme(summary, profile, templateKey), [summary, profile, templateKey]);
  const styleTag = useMemo(() => buildPlayerStyleTag(profile, summary), [profile, summary]);
  const payload = useMemo(() => buildPlayerCardPayload({ sessionUserId, profile, summary, taskState, weeklyTaskState }), [sessionUserId, profile, summary, taskState, weeklyTaskState]);
  const shareText = useMemo(() => buildPlayerCardShareText({ sessionUserId, profile, summary, taskState, weeklyTaskState, templateKey }), [sessionUserId, profile, summary, taskState, weeklyTaskState, templateKey]);

  const dailyClaim = getClaimedCount(taskState);
  const weeklyClaim = getClaimedCount(weeklyTaskState);
  const inviteCode = payload?.inviteCode || buildInviteCode(payload?.profileId);

  async function handleShare(message = shareText) {
    try {
      setSharing(true);
      await Share.share({ message });
    } catch (dkd_unused_value) {
    } finally {
      setSharing(false);
    }
  }

  async function handleTemplateChange(nextKey) {
    setTemplateKey(nextKey);
    await saveSelectedSocialTemplate(profileId, nextKey);
  }

  async function handleInviteShare() {
    await handleShare(`Lootonia'ta beni bul: ${profile?.nickname || 'Oyuncu'} • Davet Kodu ${inviteCode}`);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeScreen style={{ flex: 1, backgroundColor: '#050812' }}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={[socialTheme?.colors?.[0] || theme.colors.bgTop, socialTheme?.colors?.[1] || theme.colors.bgMid, theme.colors.bgBottom]} style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '900' }}>Oyuncu Kartı</Text>
              <Text style={{ color: theme.colors.textSoft, marginTop: 4, fontWeight: '700' }}>Profilini paylaş, dostlarını kıyasla ve loot imzanı sergile.</Text>
            </View>
            <SecondaryButton label="Kapat" onPress={onClose} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
            <View style={{ borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
              <LinearGradient colors={[socialTheme?.glow || 'rgba(103,227,255,0.20)', 'rgba(255,255,255,0.04)']} style={{ padding: 18 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 82, height: 82, borderRadius: 41, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' }}>
                    <Text style={{ fontSize: 38 }}>{profile?.avatar_emoji || '🦅'}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '900' }} numberOfLines={1}>{profile?.nickname || 'Oyuncu'}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.72)', marginTop: 4, fontWeight: '700' }}>Lvl {formatInt(profile?.level || 1)} • {String(profile?.rank_key || 'rookie').toUpperCase()}</Text>
                    <View style={{ alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.10)' }}>
                      <Text style={{ color: socialTheme?.accent || theme.colors.cyanSoft, fontWeight: '900' }}>{styleTag}</Text>
                    </View>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 18 }}>
                  <StatCard label="Profil Kimliği" value={payload.profileId} accent={socialTheme?.accent || theme.colors.cyanSoft} />
                  <StatCard label="Davet Kodu" value={inviteCode} accent={socialTheme?.accent || theme.colors.cyanSoft} />
                  <StatCard label="Koleksiyon Gücü" value={formatInt(summary?.power || 0)} accent={socialTheme?.accent || theme.colors.cyanSoft} />
                  <StatCard label="Token" value={`🪙 ${formatInt(profile?.token || 0)}`} accent={socialTheme?.accent || theme.colors.cyanSoft} />
                </View>
              </LinearGradient>
            </View>

            <View style={{ marginTop: 14, padding: 16, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' }}>
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '900' }}>Kart Şablonu</Text>
              <Text style={{ color: 'rgba(255,255,255,0.68)', marginTop: 8, lineHeight: 20 }}>Paylaşım görünümünü sabitle. Seçim kart metnine de işlenir.</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 14 }}>
                {SOCIAL_CARD_TEMPLATES.map((item) => <TemplateChip key={item.key} item={item} selected={templateKey === item.key} onPress={handleTemplateChange} />)}
              </View>
            </View>

            <View style={{ marginTop: 14, padding: 16, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' }}>
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '900' }}>Sosyal Özet</Text>
              <Text style={{ color: 'rgba(255,255,255,0.68)', marginTop: 6, fontWeight: '700' }}>Benzersiz kart: {formatInt(summary?.uniqueCards || 0)} • Toplam kart: {formatInt(summary?.totalCards || 0)} • Zirve rarity: {summary?.topRarityLabel || 'Common'}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.68)', marginTop: 8, lineHeight: 20 }}>Günlük claim: {dailyClaim} • Haftalık claim: {weeklyClaim} • Kurye teslimat: {formatInt(profile?.courier_completed_jobs || 0)}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 14 }}>
                {(summary?.rarityChips || []).length ? summary.rarityChips.map((item) => <RarityChip key={item.key} item={item} accent={socialTheme?.accent || theme.colors.cyanSoft} />) : <Text style={{ color: 'rgba(255,255,255,0.58)' }}>Koleksiyon özeti hazırlanıyor.</Text>}
              </View>
            </View>

            <View style={{ marginTop: 14, padding: 16, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' }}>
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '900' }}>Paylaşım Metni</Text>
              <Text style={{ color: 'rgba(255,255,255,0.68)', marginTop: 8, lineHeight: 22 }}>{shareText}</Text>
            </View>

            <View style={{ marginTop: 16 }}>
              <PrimaryButton label={sharing ? 'Paylaşılıyor…' : 'Kartı Paylaş'} onPress={() => handleShare()} disabled={sharing} />
              <View style={{ marginTop: 10 }}><SecondaryButton label="Davet Kodunu Paylaş" onPress={handleInviteShare} /></View>
              <View style={{ marginTop: 10 }}><SecondaryButton label="Karşılaştırma Hangarı" onPress={onOpenCompare} /></View>
              <View style={{ marginTop: 10 }}><SecondaryButton label="Kapat" onPress={onClose} /></View>
            </View>
          </ScrollView>
        </LinearGradient>
      </SafeScreen>
    </Modal>
  );
}
