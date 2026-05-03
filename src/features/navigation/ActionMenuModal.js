import React, { memo, useMemo } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { minimalLootUi as ui } from '../../theme/minimalLootUi';

function SectionTitle({ title, sub }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ color: ui.colors.text, fontSize: 18, fontWeight: '900' }}>{title}</Text>
      {!!sub ? <Text style={{ color: ui.colors.soft, fontSize: 12, fontWeight: '700', marginTop: 4 }}>{sub}</Text> : null}
    </View>
  );
}

function MenuRow({ icon, label, sub, tone = 'cyan', onPress }) {
  const accent = tone === 'gold'
    ? ui.colors.gold
    : tone === 'green'
      ? ui.colors.green
      : tone === 'red'
        ? ui.colors.red
        : tone === 'purple'
          ? ui.colors.purple
          : ui.colors.cyan;

  return (
    <Pressable
      onPress={onPress}
      style={{
        minHeight: 72,
        borderRadius: 18,
        backgroundColor: ui.colors.panel2,
        borderWidth: 1,
        borderColor: ui.colors.line,
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
      }}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 14,
          backgroundColor: `${accent}20`,
          borderWidth: 1,
          borderColor: `${accent}35`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MaterialCommunityIcons name={icon} size={20} color={accent} />
      </View>
      <View style={{ flex: 1, marginLeft: 12, paddingRight: 8 }}>
        <Text style={{ color: ui.colors.text, fontSize: 15, fontWeight: '900' }}>{label}</Text>
        <Text style={{ color: ui.colors.soft, fontSize: 12, fontWeight: '700', marginTop: 3 }}>{sub}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={ui.colors.soft} />
    </Pressable>
  );
}

function ActionMenuModal({
  visible,
  onClose,
  isAdmin,
  canCourier,
  onCourier,
  onPlayerCard,
  onSocialCard,
  onClan,
  clanTag,
  onAchievements,
  onProfile,
  onAllyHub,
  onLeaderboard,
  onDailyReward,
  onHistory,
  onAdmin,
  onBusiness,
  onLogout,
}) {
  const handlePlayerCard = onPlayerCard || onSocialCard;

  const groups = useMemo(() => {
    const open = (cb) => {
      onClose?.();
      cb?.();
    };

    const base = [
      {
        title: 'Hızlı erişim',
        sub: 'En sık kullanılan ekranlar',
        items: [
          {
            key: 'profile',
            icon: 'account-circle-outline',
            label: 'Profil',
            sub: 'Oyuncu adı, seviye ve genel ayarlar',
            tone: 'cyan',
            onPress: () => open(onProfile),
          },
          onAllyHub ? {
            key: 'ally',
            icon: 'message-badge-outline',
            label: 'Sohbet Merkezi',
            sub: 'Arkadaş ekle, DM akışını yönet ve ekip sohbetini aç',
            tone: 'blue',
            onPress: () => open(onAllyHub),
          } : null,
          onLeaderboard ? {
            key: 'leaderboard',
            icon: 'podium-gold',
            label: 'Sıralama',
            sub: 'Haftalık lider tablosunu hızlı menüden aç',
            tone: 'gold',
            onPress: () => open(onLeaderboard),
          } : null,
          onDailyReward ? {
            key: 'daily_reward',
            icon: 'gift-outline',
            label: 'Günlük Ödül',
            sub: 'Giriş serisi ve günlük ödül ekranını aç',
            tone: 'red',
            onPress: () => open(onDailyReward),
          } : null,
          {
            key: 'card',
            icon: 'card-account-details-outline',
            label: 'Oyuncu kartı',
            sub: 'Sosyal vitrin ve karşılaştırma alanı',
            tone: 'purple',
            onPress: () => open(handlePlayerCard),
          },
          {
            key: 'history',
            icon: 'history',
            label: 'Geçmiş',
            sub: 'Son loot, market ve görev kayıtları',
            tone: 'gold',
            onPress: () => open(onHistory),
          },
          onAchievements ? {
            key: 'achievements',
            icon: 'trophy-outline',
            label: 'Başarımlar',
            sub: 'Rozetler, ödüller ve achievement ilerlemesi',
            tone: 'green',
            onPress: () => open(onAchievements),
          } : null,
        ].filter(Boolean).filter((item) => typeof item.onPress === 'function'),
      },
      {
        title: 'Ekstra alanlar',
        sub: 'Takım ve ek modlar',
        items: [
          onClan ? {
            key: 'clan',
            icon: 'shield-outline',
            label: clanTag ? `[${clanTag}] Lonca` : 'Lonca',
            sub: 'Takım ilerlemesi ve grup ekranı',
            tone: 'gold',
            onPress: () => open(onClan),
          } : null,
          isAdmin ? {
            key: 'admin',
            icon: 'shield-crown-outline',
            label: 'Admin',
            sub: 'Sistem ve yönetim araçları',
            tone: 'gold',
            onPress: () => open(onAdmin),
          } : null,
        ].filter(Boolean),
      },
    ];

    base.push({
      title: 'Oturum',
      sub: null,
      items: [
        {
          key: 'logout',
          icon: 'logout',
          label: 'Çıkış yap',
          sub: 'Hesaptan güvenli şekilde ayrıl',
          tone: 'red',
          onPress: () => open(onLogout),
        },
      ],
    });

    return base;
  }, [clanTag, handlePlayerCard, isAdmin, onAchievements, onAdmin, onAllyHub, onClan, onClose, onDailyReward, onHistory, onLeaderboard, onLogout, onProfile]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(2,4,10,0.78)', justifyContent: 'center', padding: 10 }}>
        <Pressable onPress={() => {}} style={{ flex: 1, borderRadius: 28, overflow: 'hidden' }}>
          <View
            style={{
              flex: 1,
              minHeight: '94%',
              backgroundColor: ui.colors.bgSoft,
              borderRadius: 28,
              borderWidth: 1,
              borderColor: ui.colors.line,
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 16,
            }}
          >
            <View style={{ alignSelf: 'center', width: 68, height: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.16)', marginBottom: 12 }} />

            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ color: ui.colors.cyan, fontSize: 11, fontWeight: '900', letterSpacing: 0.8 }}>MENÜ</Text>
              </View>
              <Pressable
                onPress={onClose}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  backgroundColor: ui.colors.panel2,
                  borderWidth: 1,
                  borderColor: ui.colors.line,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialCommunityIcons name="close" size={20} color={ui.colors.text} />
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 12 }}>
              <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(123,230,255,0.12)', borderWidth: 1, borderColor: 'rgba(123,230,255,0.24)' }}>
                <Text style={{ color: ui.colors.text, fontSize: 11, fontWeight: '900' }}>{isAdmin ? 'Admin açık' : 'Oyuncu modu'}</Text>
              </View>
              <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(88,226,171,0.12)', borderWidth: 1, borderColor: 'rgba(88,226,171,0.24)' }}>
                <Text style={{ color: ui.colors.text, fontSize: 11, fontWeight: '900' }}>{canCourier ? 'Kurye hazır' : 'Kurye kapalı'}</Text>
              </View>
              <Pressable
                onPress={() => {
                  globalThis.dkd_open_merchant_panel = true;
                  onClose?.();
                  (onBusiness || onProfile)?.();
                }}
                style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(246,181,78,0.12)', borderWidth: 1, borderColor: 'rgba(246,181,78,0.28)' }}
              >
                <Text style={{ color: ui.colors.text, fontSize: 11, fontWeight: '900' }}>İşletme açık</Text>
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 10, flexGrow: 1 }}
            >
              {groups.map((group) => (
                <View key={group.title} style={{ marginBottom: 10 }}>
                  <SectionTitle title={group.title} sub={group.sub} />
                  {group.items.map((item) => (
                    <MenuRow
                      key={item.key}
                      icon={item.icon}
                      label={item.label}
                      sub={item.sub}
                      tone={item.tone}
                      onPress={item.onPress}
                    />
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function areActionMenuModalPropsEqual(prev, next) {
  return !!prev.visible === !!next.visible
    && !!prev.isAdmin === !!next.isAdmin
    && !!prev.canCourier === !!next.canCourier
    && prev.onClose === next.onClose
    && prev.onCourier === next.onCourier
    && prev.onPlayerCard === next.onPlayerCard
    && prev.onSocialCard === next.onSocialCard
    && prev.onClan === next.onClan
    && String(prev.clanTag || '') === String(next.clanTag || '')
    && prev.onProfile === next.onProfile
    && prev.onHistory === next.onHistory
    && prev.onDailyReward === next.onDailyReward
    && prev.onLeaderboard === next.onLeaderboard
    && prev.onAdmin === next.onAdmin
    && prev.onLogout === next.onLogout;
}

export default memo(ActionMenuModal, areActionMenuModalPropsEqual);
