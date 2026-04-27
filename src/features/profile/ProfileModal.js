import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SafeScreen from '../../components/layout/SafeScreen';
import { normalizeProgression } from '../../utils/progression';
import { getUpcomingUnlocks } from '../../utils/unlocks';
import { getCourierMeta } from '../../utils/courier';
import { cityLootTheme as theme } from '../../theme/cityLootTheme';
import { fetchMyBusinessMemberships } from '../../services/businessSuiteService';
import MerchantHubModal from '../business/MerchantHubModal';
import MyCouponsModal from '../business/MyCouponsModal';

const EMOJIS = ['🦅', '🐉', '⚡', '👑', '🔥', '💎', '🗺️', '🏆', '🦂', '🌙'];
const CYAN = '#7BE6FF';
const BLUE = '#2F8DFF';
const GOLD = '#F6C55F';
const GREEN = '#58E2AB';
const RED = '#FF8B8B';

async function dkd_build_profile_avatar_data_url(dkd_source_asset_value) {
  const dkd_source_uri_value = typeof dkd_source_asset_value === 'string'
    ? dkd_source_asset_value
    : String(dkd_source_asset_value?.uri || '').trim();

  if (!dkd_source_uri_value) {
    return '';
  }

  const dkd_width_value = Number(dkd_source_asset_value?.width || 0);
  const dkd_height_value = Number(dkd_source_asset_value?.height || 0);
  const dkd_size_value = dkd_width_value > 0 && dkd_height_value > 0
    ? Math.min(dkd_width_value, dkd_height_value)
    : 0;
  const dkd_crop_origin_x_value = dkd_size_value > 0 ? Math.max(0, Math.floor((dkd_width_value - dkd_size_value) / 2)) : 0;
  const dkd_crop_origin_y_value = dkd_size_value > 0 ? Math.max(0, Math.floor((dkd_height_value - dkd_size_value) / 2)) : 0;
  const dkd_actions_value = [];

  if (dkd_size_value > 0) {
    dkd_actions_value.push({
      crop: {
        originX: dkd_crop_origin_x_value,
        originY: dkd_crop_origin_y_value,
        width: dkd_size_value,
        height: dkd_size_value,
      },
    });
  }

  dkd_actions_value.push({ resize: { width: 320, height: 320 } });

  const dkd_manipulated_asset_value = await ImageManipulator.manipulateAsync(
    dkd_source_uri_value,
    dkd_actions_value,
    { compress: 0.78, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );

  if (dkd_manipulated_asset_value?.base64) {
    return `data:image/jpeg;base64,${dkd_manipulated_asset_value.base64}`;
  }

  const dkd_base64_value = await FileSystem.readAsStringAsync(
    dkd_manipulated_asset_value?.uri || dkd_source_uri_value,
    { encoding: FileSystem.EncodingType.Base64 },
  );
  return dkd_base64_value ? `data:image/jpeg;base64,${dkd_base64_value}` : '';
}

function SectionCard({ children, style, tone = 'cyan' }) {
  const palette = tone === 'gold'
    ? ['rgba(28,21,10,0.98)', 'rgba(15,14,12,0.98)', 'rgba(8,11,16,0.98)']
    : tone === 'green'
      ? ['rgba(9,28,23,0.98)', 'rgba(9,18,16,0.98)', 'rgba(5,9,12,0.98)']
      : ['rgba(12,27,44,0.98)', 'rgba(9,18,29,0.98)', 'rgba(5,11,18,0.98)'];

  return (
    <View style={[styles.card, style]}>
      <LinearGradient colors={palette} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.cardGlowCyan} />
      <View pointerEvents="none" style={styles.cardGlowGold} />
      {children}
    </View>
  );
}

function ActionButton({ label, icon, onPress, disabled, secondary = false }) {
  const colors = secondary
    ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.05)']
    : [CYAN, BLUE];
  const textColor = secondary ? '#FFFFFF' : '#06121D';

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionWrap,
        disabled && styles.actionDisabled,
        pressed && !disabled && styles.actionPressed,
      ]}
    >
      <LinearGradient colors={colors} style={styles.actionFill}>
        {icon ? <MaterialCommunityIcons name={icon} size={16} color={textColor} style={styles.actionIcon} /> : null}
        <Text style={[styles.actionText, { color: textColor }]}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

function StatBox({ label, value, icon, accent }) {
  return (
    <View style={styles.statBox}>
      <View style={[styles.statIcon, { backgroundColor: accent }]}>
        <MaterialCommunityIcons name={icon} size={16} color="#FFFFFF" />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function ToneBadge({ text, tone = 'cyan' }) {
  const map = {
    cyan: { bg: 'rgba(123,230,255,0.14)', border: 'rgba(123,230,255,0.26)', color: CYAN },
    gold: { bg: 'rgba(246,197,95,0.14)', border: 'rgba(246,197,95,0.26)', color: GOLD },
    green: { bg: 'rgba(88,226,171,0.14)', border: 'rgba(88,226,171,0.26)', color: GREEN },
    red: { bg: 'rgba(255,139,139,0.14)', border: 'rgba(255,139,139,0.26)', color: '#FFD6D6' },
  };
  const current = map[tone] || map.cyan;

  return (
    <View style={[styles.badge, { backgroundColor: current.bg, borderColor: current.border }]}>
      <Text style={[styles.badgeText, { color: current.color }]}>{text}</Text>
    </View>
  );
}

const EmojiOption = memo(function EmojiOption({ emoji, selected, onPress }) {
  return (
    <Pressable
      onPress={() => onPress(emoji)}
      style={({ pressed }) => [
        styles.emojiOption,
        selected && styles.emojiOptionActive,
        pressed && !selected && styles.actionPressed,
      ]}
    >
      <Text style={styles.emojiText}>{emoji}</Text>
    </Pressable>
  );
});

function UnlockItem({ item }) {
  return (
    <View style={styles.unlockRow}>
      <View style={styles.unlockIconWrap}>
        <MaterialCommunityIcons name="lock-open-variant-outline" size={18} color={CYAN} />
      </View>
      <View style={styles.unlockCopy}>
        <Text style={styles.unlockTitle}>{item.label}</Text>
        <Text style={styles.unlockMeta}>Lvl {item.level}</Text>
      </View>
    </View>
  );
}

function ProfileModal({ visible, onClose, profile, onSave, onOpenPlayerCard }) {
  const [nick, setNick] = useState('');
  const [avatar, setAvatar] = useState('🦅');
  const [saving, setSaving] = useState(false);
  const [dkd_avatar_image_url, setDkdAvatarImageUrl] = useState('');
  const [dkd_avatar_image_loading, setDkdAvatarImageLoading] = useState(false);
  const [merchantOpen, setMerchantOpen] = useState(false);
  const [myCouponsOpen, setMyCouponsOpen] = useState(false);
  const [merchantMemberships, setMerchantMemberships] = useState([]);

  useEffect(() => {
    if (!visible) return;
    setNick(String(profile?.nickname || ''));
    setAvatar(String(profile?.avatar_emoji || '🦅'));
    setDkdAvatarImageUrl(String(profile?.avatar_image_url || ''));
  }, [
    visible,
    profile?.nickname,
    profile?.avatar_emoji,
    profile?.avatar_image_url,
    profile?.courier_status,
    profile?.courier_score,
    profile?.courier_completed_jobs,
  ]);

  useEffect(() => {
    if (!visible) return;
    if (globalThis.dkd_open_merchant_panel === true) {
      globalThis.dkd_open_merchant_panel = false;
      const dkd_open_timer_value = setTimeout(() => {
        setMerchantOpen(true);
      }, 30);
      return () => clearTimeout(dkd_open_timer_value);
    }
    return undefined;
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    fetchMyBusinessMemberships()
      .then((rows) => {
        if (!cancelled) setMerchantMemberships(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setMerchantMemberships([]);
      });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const canSave = nick.trim().length >= 3 && nick.trim().length <= 18;
  const dkd_profile_nickname_value = String(profile?.nickname || '').trim();
  const dkd_profile_avatar_emoji_value = String(profile?.avatar_emoji || '🦅');
  const dkd_profile_avatar_image_saved_url = String(profile?.avatar_image_url || '').trim();
  const dkd_has_profile_changes = dkd_profile_nickname_value !== nick.trim()
    || dkd_profile_avatar_emoji_value !== String(avatar || '🦅')
    || dkd_profile_avatar_image_saved_url !== String(dkd_avatar_image_url || '').trim();
  const profileView = useMemo(() => ({ ...profile }), [profile]);
  const prog = normalizeProgression(profileView);
  const courier = getCourierMeta(profileView);
  const upcomingUnlocks = getUpcomingUnlocks(profileView).slice(0, 3);
  const courierShortLabel = courier.shortLabel === 'Onayli' ? 'Kurye Onaylı' : courier.shortLabel;
  const merchantRole = String(merchantMemberships?.[0]?.role_key || profileView?.merchant_role || profileView?.business_role || '').toLowerCase();
  const isBusinessLinked = Boolean(merchantMemberships?.length || profileView?.merchant_linked_business_id || profileView?.business_id || profileView?.business_owner);
  const businessBadgeText = merchantRole === 'owner' ? 'İşletme Sahibi' : 'İşletme Onaylı';
  const progressWidth = `${Math.max(6, Number(prog.progressPct || 0))}%`;
  const courierTone = courier.status === 'approved'
    ? 'green'
    : courier.status === 'pending'
      ? 'gold'
      : courier.status === 'rejected'
        ? 'red'
        : 'cyan';
  const dkd_resolved_avatar_image_url = String(dkd_avatar_image_url || profile?.avatar_image_url || '').trim();
  const dkd_identity_subtitle_text = `${prog.rankLabel} Boss Raid • Lvl ${prog.level}`;

  const handlePickAvatarImage = useCallback(async () => {
    try {
      const dkd_permission_value = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const dkd_is_permission_granted = Boolean(dkd_permission_value?.granted || dkd_permission_value?.accessPrivileges === 'limited');
      if (!dkd_is_permission_granted) {
        Alert.alert('Profil', 'Profil görseli için galeri izni gerekli.');
        return;
      }

      const dkd_picker_result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.86,
      });

      if (dkd_picker_result?.canceled) return;
      const dkd_asset_value = dkd_picker_result?.assets?.[0];
      if (!dkd_asset_value?.uri) {
        Alert.alert('Profil', 'Seçilen görsel okunamadı.');
        return;
      }

      setDkdAvatarImageLoading(true);
      const dkd_next_avatar_data_url = await dkd_build_profile_avatar_data_url(dkd_asset_value);
      if (!dkd_next_avatar_data_url) {
        throw new Error('Profil görseli hazırlanamadı.');
      }
      setDkdAvatarImageUrl(dkd_next_avatar_data_url);
    } catch (dkd_error_value) {
      Alert.alert('Profil', dkd_error_value?.message || 'Profil görseli seçilemedi.');
    } finally {
      setDkdAvatarImageLoading(false);
    }
  }, []);

  const handleClearAvatarImage = useCallback(() => {
    setDkdAvatarImageUrl('');
  }, []);

  const handleSave = useCallback(async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await onSave?.(nick.trim(), avatar, dkd_resolved_avatar_image_url);
      Alert.alert('Profil', 'Profil güncellendi.');
    } catch (dkd_unused_value) {
    } finally {
      setSaving(false);
    }
  }, [avatar, canSave, dkd_resolved_avatar_image_url, nick, onSave, saving]);


  return (
    <Modal visible={!!visible} animationType="slide" onRequestClose={onClose}>
      <SafeScreen style={styles.screen}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={[theme.colors.bgTop, theme.colors.bgMid, theme.colors.bgBottom]} style={styles.wrap}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle}>Oyuncu Kimliği</Text>
              <Text style={styles.headerSub}>Profilini, kurye lisansını ve açılan modülleri buradan yönet.</Text>
            </View>
            <Pressable onPress={onClose} style={({ pressed }) => [styles.headerCloseButton, pressed && styles.actionPressed]}>
              <MaterialCommunityIcons name="arrow-right" size={24} color="#FFFFFF" />
              <Text style={styles.headerCloseButtonText}>Kapat</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <SectionCard style={styles.heroCard}>
              <View pointerEvents="none" style={styles.heroCardOrbLarge} />
              <View pointerEvents="none" style={styles.heroCardOrbSmall} />

              <View style={styles.heroTop}>
                <View style={styles.avatarShell}>
                  <LinearGradient colors={['rgba(123,230,255,0.34)', 'rgba(47,141,255,0.14)']} style={styles.avatarGlow} />
                  <View style={styles.avatarCircle}>
                    {dkd_resolved_avatar_image_url ? (
                      <Image source={{ uri: dkd_resolved_avatar_image_url }} style={styles.avatarImage} contentFit="cover" transition={120} />
                    ) : (
                      <Text style={styles.avatarText}>{avatar}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.heroCopy}>
                  <Text style={styles.heroEyebrow}>OYUNCU KİMLİĞİ</Text>
                  <Text style={styles.heroTitle} numberOfLines={1}>{nick.trim() || 'Nickname'}</Text>
                  <Text style={styles.heroSubtitle}>{dkd_identity_subtitle_text}</Text>
                </View>
              </View>

              <View style={styles.heroPillRow}>
                <ToneBadge text={courier.status === 'approved' ? 'Kurye Lisansı Aktif' : courierShortLabel} tone={courierTone} />
                {isBusinessLinked ? <ToneBadge text={businessBadgeText} tone="gold" /> : null}
              </View>

              <View style={styles.progressTrack}>
                <LinearGradient colors={['#61CCFF', '#4B9DFF', '#55B7FF']} style={[styles.progressFill, { width: progressWidth }]} />
              </View>
              <View style={styles.progressMetaRow}>
                <Text style={styles.progressMetaText}>İlerleme</Text>
                <Text style={styles.progressMetaValue}>{prog.isLevelCap ? 'MAX' : `${prog.levelXp}/${prog.levelGoal} XP`}</Text>
              </View>


              <View style={styles.statsRow}>
                <StatBox label="SEVİYE" value={`Lvl ${prog.level}`} icon="shield-star-outline" accent="rgba(47,141,255,0.92)" />
                <StatBox label="RÜTBE" value={prog.rankLabel} icon="crown-outline" accent="rgba(246,197,95,0.90)" />
                <StatBox label="İLERLEME" value={`${Number(prog.progressPct || 0)}%`} icon="trending-up" accent="rgba(88,226,171,0.90)" />
              </View>

              <View style={styles.heroActions}>
                <ActionButton
                  label="Kuponlarım"
                  icon="ticket-confirmation-outline"
                  onPress={() => setMyCouponsOpen(true)}
                  secondary
                />
                <ActionButton
                  label="İşletme Panelim"
                  icon="storefront-outline"
                  onPress={() => setMerchantOpen(true)}
                />
              </View>
            </SectionCard>

            <SectionCard tone="gold" style={styles.dkdIdentityCard}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Kimlik ayarı</Text>
                  <Text style={styles.sectionSub}>Takma adını ve profil görselini burada düzenle.</Text>
                </View>
                <ToneBadge text={`${nick.trim().length}/18`} tone={canSave ? 'gold' : 'red'} />
              </View>

              <LinearGradient colors={['rgba(255,214,112,0.18)', 'rgba(123,230,255,0.12)', 'rgba(159,111,255,0.16)']} style={styles.dkdIdentityHeroBand}>
                <View style={styles.dkdIdentityMediaRow}>
                  <View style={styles.dkdIdentityPreviewShell}>
                    <LinearGradient colors={['rgba(255,214,112,0.24)', 'rgba(123,230,255,0.18)', 'rgba(92,48,255,0.20)']} style={styles.dkdIdentityPreviewGlow} />
                    <View style={styles.dkdIdentityPreviewCircle}>
                      {dkd_resolved_avatar_image_url ? (
                        <Image source={{ uri: dkd_resolved_avatar_image_url }} style={styles.dkdIdentityPreviewImage} contentFit="cover" transition={140} />
                      ) : (
                        <Text style={styles.dkdIdentityPreviewEmoji}>{avatar}</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.dkdIdentityMediaCopy}>
                    <Text style={styles.dkdIdentityMediaEyebrow}>PROFİL GÖRSELİ</Text>
                    <Text style={styles.dkdIdentityMediaTitle}>{dkd_resolved_avatar_image_url ? 'Cihaz görseli seçildi' : 'Emoji avatar aktif'}</Text>
                    <Text style={styles.dkdIdentityMediaSub}>Görseli seç, takma adını düzenle ve kaydet.</Text>
                  </View>
                </View>

                <View style={styles.dkdIdentityActionRow}>
                  <ActionButton
                    label={dkd_avatar_image_loading ? 'Hazırlanıyor…' : 'Cihazdan Görsel Seç'}
                    icon="image-plus"
                    onPress={handlePickAvatarImage}
                    disabled={dkd_avatar_image_loading}
                    secondary
                  />
                  <ActionButton
                    label="Görseli Kaldır"
                    icon="trash-can-outline"
                    onPress={handleClearAvatarImage}
                    disabled={!dkd_resolved_avatar_image_url || dkd_avatar_image_loading}
                    secondary
                  />
                </View>
              </LinearGradient>

              <TextInput
                value={nick}
                onChangeText={setNick}
                placeholder="oyuncu-adin"
                placeholderTextColor="rgba(255,255,255,0.34)"
                style={[styles.input, styles.dkdIdentityInput]}
                maxLength={18}
                autoCapitalize="none"
              />

              <View style={styles.singleActionRow}>
                <ActionButton
                  label={saving ? 'Kaydediliyor…' : dkd_has_profile_changes ? 'Kaydet' : 'Kaydedildi'}
                  icon={saving ? 'content-save-alert-outline' : 'content-save-outline'}
                  onPress={handleSave}
                  disabled={!canSave || !dkd_has_profile_changes || saving || dkd_avatar_image_loading}
                />
              </View>

              <View style={styles.dkdEmojiHeadRow}>
                <Text style={styles.dkdEmojiHeadTitle}>Emoji avatar yedeği</Text>
                <Text style={styles.dkdEmojiHeadSub}>Görsel kaldırılırsa bu avatar kullanılır.</Text>
              </View>

              <View style={styles.emojiGrid}>
                {EMOJIS.map((emoji) => (
                  <EmojiOption key={emoji} emoji={emoji} selected={avatar === emoji} onPress={setAvatar} />
                ))}
              </View>
            </SectionCard>

            <SectionCard>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Açılacak modüller</Text>
                  <Text style={styles.sectionSub}>Bir sonraki seviyelerde açılacak en önemli çekirdek modüller.</Text>
                </View>
                <ToneBadge text={upcomingUnlocks.length ? `${upcomingUnlocks.length} hedef` : 'Tamam'} tone={upcomingUnlocks.length ? 'cyan' : 'green'} />
              </View>

              {upcomingUnlocks.length ? (
                <View style={styles.unlockList}>
                  {upcomingUnlocks.map((item) => <UnlockItem key={item.key} item={item} />)}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="check-decagram" size={22} color={GREEN} />
                  <Text style={styles.emptyText}>Tüm çekirdek açılımlar aktif.</Text>
                </View>
              )}
            </SectionCard>
          </ScrollView>
        </LinearGradient>
      </SafeScreen>
      <MerchantHubModal visible={merchantOpen} onClose={() => setMerchantOpen(false)} />
      <MyCouponsModal visible={myCouponsOpen} onClose={() => setMyCouponsOpen(false)} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050812' },
  wrap: { flex: 1 },
  header: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headerCopy: { flex: 1, paddingRight: 12 },
  headerTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', letterSpacing: -0.8 },
  headerSub: { color: theme.colors.textSoft, marginTop: 10, fontWeight: '700', fontSize: 15, lineHeight: 21, maxWidth: 220 },
  headerCloseButton: {
    minHeight: 74,
    minWidth: 112,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(10,18,32,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  headerCloseButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  content: { paddingBottom: 28, paddingTop: 4 },
  card: {
    marginHorizontal: 14,
    marginBottom: 8,
    borderRadius: 20,
    padding: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  cardGlowCyan: {
    position: 'absolute',
    top: -26,
    right: -12,
    width: 132,
    height: 132,
    borderRadius: 999,
    backgroundColor: 'rgba(108,203,255,0.08)',
  },
  cardGlowGold: {
    position: 'absolute',
    bottom: -30,
    left: -16,
    width: 116,
    height: 116,
    borderRadius: 999,
    backgroundColor: 'rgba(243,199,119,0.06)',
  },
  heroCard: { paddingTop: 18, paddingBottom: 16, borderColor: 'rgba(123,230,255,0.16)' },
  heroCardOrbLarge: { position: 'absolute', top: -18, right: -8, width: 168, height: 168, borderRadius: 999, backgroundColor: 'rgba(91,183,255,0.12)' },
  heroCardOrbSmall: { position: 'absolute', bottom: -38, left: -28, width: 148, height: 148, borderRadius: 999, backgroundColor: 'rgba(246,197,95,0.07)' },
  heroPillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 14 },
  heroTop: { flexDirection: 'row', alignItems: 'center' },
  avatarShell: { width: 92, height: 92, alignItems: 'center', justifyContent: 'center' },
  avatarGlow: { position: 'absolute', width: 92, height: 92, borderRadius: 46 },
  avatarCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 39 },
  avatarText: { fontSize: 34 },
  heroCopy: { flex: 1, marginLeft: 12 },
  heroEyebrow: { color: CYAN, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  heroTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', marginTop: 4, letterSpacing: -0.9 },
  heroSubtitle: { color: 'rgba(255,255,255,0.82)', marginTop: 6, fontWeight: '700', lineHeight: 20, fontSize: 15 },
  progressTrack: {
    height: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginTop: 16,
  },
  progressFill: { height: '100%', borderRadius: 999 },
  progressMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, alignItems: 'center' },
  progressMetaText: { color: theme.colors.textSoft, fontWeight: '700', fontSize: 14 },
  progressMetaValue: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 },
  statsRow: { flexDirection: 'row', marginTop: 14, justifyContent: 'space-between' },
  statBox: {
    width: '31.5%',
    borderRadius: 20,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statLabel: { color: 'rgba(255,255,255,0.54)', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  statValue: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', marginTop: 4 },
  heroActions: { flexDirection: 'row', marginTop: 14 },
  actionWrap: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginRight: 10,
  },
  actionFill: {
    minHeight: 44,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  actionIcon: { marginRight: 8 },
  actionText: { fontWeight: '900', fontSize: 13 },
  actionPressed: { transform: [{ scale: 0.985 }] },
  actionDisabled: { opacity: 0.58 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  dkdIdentityCard: {
    marginTop: -2,
    borderColor: 'rgba(123,230,255,0.18)',
    shadowColor: '#7BE6FF',
    shadowOpacity: 0.12,
    shadowRadius: 20,
  },
  dkdIdentityHeroBand: {
    marginTop: 12,
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  dkdIdentityMediaRow: { flexDirection: 'row', alignItems: 'center' },
  dkdIdentityPreviewShell: { width: 74, height: 74, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  dkdIdentityPreviewGlow: { position: 'absolute', width: 74, height: 74, borderRadius: 37 },
  dkdIdentityPreviewCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  dkdIdentityPreviewImage: { width: '100%', height: '100%' },
  dkdIdentityPreviewEmoji: { fontSize: 36 },
  dkdIdentityMediaCopy: { flex: 1 },
  dkdIdentityMediaEyebrow: { color: GOLD, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  dkdIdentityMediaTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', marginTop: 4 },
  dkdIdentityMediaSub: { color: theme.colors.textSoft, marginTop: 4, fontWeight: '700', lineHeight: 18, fontSize: 13 },
  dkdIdentityActionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  dkdIdentityInput: {
    marginTop: 12,
    backgroundColor: 'rgba(5,10,18,0.42)',
    borderColor: 'rgba(255,214,112,0.18)',
  },
  dkdEmojiHeadRow: { marginTop: 12, marginBottom: 2 },
  dkdEmojiHeadTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  dkdEmojiHeadSub: { color: theme.colors.textSoft, fontWeight: '700', marginTop: 4 },
  sectionTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  sectionSub: { color: theme.colors.textSoft, marginTop: 4, fontWeight: '700', lineHeight: 18, fontSize: 13, maxWidth: 220 },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: '900' },
  input: {
    marginTop: 12,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    fontWeight: '700',
  },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14 },
  emojiOption: {
    width: '18%',
    aspectRatio: 1,
    marginRight: '2%',
    marginBottom: 8,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  emojiOptionActive: {
    backgroundColor: 'rgba(123,230,255,0.14)',
    borderColor: 'rgba(123,230,255,0.28)',
  },
  emojiText: { fontSize: 22 },
  singleActionRow: { marginTop: 16 },
  unlockList: { marginTop: 14 },
  unlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  unlockIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(123,230,255,0.10)',
    marginRight: 12,
  },
  unlockCopy: { flex: 1 },
  unlockTitle: { color: '#FFFFFF', fontWeight: '900' },
  unlockMeta: { color: theme.colors.textSoft, marginTop: 4, fontWeight: '700' },
  emptyState: {
    marginTop: 12,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(88,226,171,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(88,226,171,0.18)',
  },
  emptyText: { color: '#FFFFFF', fontWeight: '800', marginTop: 8 },
});

export default memo(ProfileModal);
