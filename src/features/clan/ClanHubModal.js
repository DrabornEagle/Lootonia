import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import SafeScreen from '../../components/layout/SafeScreen';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import SkylineHeroCard from '../../components/ui/SkylineHeroCard';
import { CLAN_THEME_PRESETS, getClanTheme } from '../../services/clanService';
import { formatInt } from '../../utils/text';

function ThemeChip({ item, selected, onPress }) {
  return (
    <Text onPress={() => onPress(item.key)} style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999, overflow: 'hidden', backgroundColor: selected ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: selected ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.10)', color: '#FFFFFF', fontWeight: '900', marginRight: 8, marginBottom: 8 }}>{item.label}</Text>
  );
}

function MissionCard({ mission, onClaim, disabled }) {
  return (
    <View style={{ padding: 14, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', marginTop: 10 }}>
      <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '900' }}>{mission.title}</Text>
      <Text style={{ color: 'rgba(255,255,255,0.68)', marginTop: 6, lineHeight: 20 }}>{mission.desc}</Text>
      <View style={{ height: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)', marginTop: 12, overflow: 'hidden' }}>
        <View style={{ width: `${mission.progressPct}%`, height: '100%', backgroundColor: mission.claimed ? '#7AF7C1' : '#8DEBFF' }} />
      </View>
      <Text style={{ color: '#DFF8FF', marginTop: 8, fontWeight: '800' }}>{formatInt(mission.progress)} / {formatInt(mission.target)} • Ödül: {formatInt(mission.rewardToken)} token • {formatInt(mission.rewardXp)} XP</Text>
      <View style={{ marginTop: 12 }}>
        {mission.claimed ? <SecondaryButton label='Alındı' onPress={() => {}} /> : <PrimaryButton label={mission.complete ? 'Ödülü Al' : 'Devam Et'} onPress={() => onClaim?.(mission.key)} disabled={disabled && !mission.complete} />}
      </View>
    </View>
  );
}

function BoardRow({ row, index, accent }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: index === 0 ? 0 : 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
      <Text style={{ width: 28, color: accent, fontWeight: '900' }}>{index + 1}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#FFFFFF', fontWeight: '900' }}>{row.alias}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.62)', marginTop: 2 }}>{row.role} • {row.rare} • Lvl {formatInt(row.level)}</Text>
      </View>
      <Text style={{ color: '#FFFFFF', fontWeight: '900' }}>{formatInt(row.weeklyScore)}</Text>
    </View>
  );
}

function StatPill({ label, value }) {
  return (
    <View style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.07)', marginRight: 8, marginBottom: 8 }}>
      <Text style={{ color: '#FFFFFF', fontWeight: '900' }}>{label}: {value}</Text>
    </View>
  );
}

export default function ClanHubModal({ visible, onClose, clanState, clanDerived, clanSaving, clanLoading, clanShareText, createOrUpdateClan, joinClanByTag, addClanMember, removeClanMember, claimClanMission, leaveClan }) {
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [motto, setMotto] = useState('');
  const [themeKey, setThemeKey] = useState('neon');
  const [memberAlias, setMemberAlias] = useState('');
  const [memberRole, setMemberRole] = useState('Kanat');
  const [joinTag, setJoinTag] = useState('');
  const theme = useMemo(() => getClanTheme(themeKey), [themeKey]);
  const isShared = clanState?.source === 'remote';
  const canEdit = !clanState || clanState?.isLeader !== false;

  useEffect(() => {
    if (!visible) return;
    setName(String(clanState?.name || ''));
    setTag(String(clanState?.tag || ''));
    setMotto(String(clanState?.motto || ''));
    setThemeKey(String(clanState?.themeKey || 'neon'));
    setMemberAlias('');
    setMemberRole('Kanat');
    setJoinTag('');
  }, [visible, clanState?.name, clanState?.tag, clanState?.motto, clanState?.themeKey]);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Klan', 'Bir klan adı gir.');
      return;
    }
    if (!tag.trim()) {
      Alert.alert('Klan', 'Kısa bir etiket gir.');
      return;
    }
    await createOrUpdateClan?.({ name, tag, motto, themeKey });
  }

  async function handleJoin() {
    if (!joinTag.trim()) {
      Alert.alert('Klan', 'Katılmak için bir etiket gir.');
      return;
    }
    const result = await joinClanByTag?.(joinTag);
    if (result) {
      setJoinTag('');
    }
  }

  async function handleShare() {
    if (!clanState) return;
    await Share.share({ message: clanShareText || `[${clanState.tag}] ${clanState.name}` });
  }

  async function handleAddMember() {
    if (!memberAlias.trim()) return;
    await addClanMember?.(memberAlias, memberRole);
    setMemberAlias('');
    setMemberRole('Kanat');
  }

  return (
    <Modal visible={visible} animationType='slide' onRequestClose={onClose}>
      <SafeScreen style={{ flex: 1, backgroundColor: '#050812' }}>
        <LinearGradient colors={theme.colors} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
            <SkylineHeroCard
              eyebrow="LONCA HUB"
              title={clanState ? `[${clanState.tag}] ${clanState.name}` : 'Klanını kur veya katıl'}
              subtitle={clanState?.motto || 'Takım kimliğini oluştur, üyeleri diz ve ortak puan tablosunu yükselt.'}
              icon="shield-sword-outline"
              badgeText={isShared ? 'Shared lonca' : 'Yerel lonca'}
              tone="gold"
              onClose={onClose}
            >
              <View style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' }}>
                <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '900' }}>Üye {formatInt(clanDerived?.board?.length || 1)}</Text>
              </View>
              <View style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(246,205,103,0.12)', borderWidth: 1, borderColor: 'rgba(246,205,103,0.22)' }}>
                <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '900' }}>Güç {formatInt(clanDerived?.totalPower || 0)}</Text>
              </View>
            </SkylineHeroCard>

            <View style={{ height: 14 }} />
            <View style={{ borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
              <LinearGradient colors={[theme.colors?.[0] || '#0F1A2C', theme.colors?.[1] || '#152641']} style={{ padding: 16 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '900' }}>{clanState ? `[${clanState.tag}] ${clanState.name}` : 'Klanını Kur veya Katıl'}</Text>
                <Text style={{ color: theme.accent, marginTop: 6, fontWeight: '800' }}>{clanState?.motto || 'Takım kimliğini oluştur, üyeleri diz ve ortak puan tablosunu yükselt.'}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.66)', marginTop: 10 }}>{clanDerived?.summaryLine || 'Haftalık klan paneli hazırlanıyor.'}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 14 }}>
                  <StatPill label="Mod" value={isShared ? 'Shared' : 'Local'} />
                  <StatPill label="Üye Kartı" value={formatInt(clanDerived?.board?.length || 1)} />
                  <StatPill label="Haftalık" value={formatInt(clanDerived?.totalWeeklyPoints || 0)} />
                  <StatPill label="Güç" value={formatInt(clanDerived?.totalPower || 0)} />
                </View>
                {clanState ? (
                  <View style={{ marginTop: 14 }}>
                    <PrimaryButton label={clanSaving ? 'Kaydediliyor…' : canEdit ? 'Klanı Güncelle' : 'Shared Lonca'} onPress={canEdit ? handleSave : handleShare} disabled={clanSaving || clanLoading} />
                    <View style={{ marginTop: 10 }}><SecondaryButton label='Klan Kartını Paylaş' onPress={handleShare} /></View>
                    {!canEdit ? <Text style={{ color: 'rgba(255,255,255,0.62)', marginTop: 10 }}>Bu lonca shared modda. Ayarları sadece kurucu güncelleyebilir.</Text> : null}
                  </View>
                ) : null}
              </LinearGradient>
            </View>

            {!clanState ? (
              <View style={{ marginTop: 14, padding: 16, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' }}>
                <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '900' }}>Etiket ile Katıl</Text>
                <Text style={{ color: 'rgba(255,255,255,0.66)', marginTop: 8 }}>Başka bir oyuncunun açtığı shared loncaya kısa etiketle katılabilirsin.</Text>
                <TextInput value={joinTag} onChangeText={setJoinTag} placeholder='Etiket (örn. WING)' autoCapitalize='characters' placeholderTextColor='rgba(255,255,255,0.36)' style={{ marginTop: 12, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, color: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' }} />
                <View style={{ marginTop: 12 }}>
                  <PrimaryButton label={clanSaving ? 'Katılıyor…' : 'Klan Etiketi ile Katıl'} onPress={handleJoin} disabled={clanSaving || clanLoading} />
                </View>
              </View>
            ) : null}

            <View style={{ marginTop: 14, padding: 16, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' }}>
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '900' }}>Klan Ayarları</Text>
              <Text style={{ color: 'rgba(255,255,255,0.66)', marginTop: 8 }}>{isShared ? 'Shared mod açık. SQL migration uygulanırsa lonca çoklu cihazda ortak görünür.' : 'Fallback local mod aktif. Shared SQL uygulanana kadar cihaz içi lonca olarak çalışır.'}</Text>
              <TextInput editable={canEdit} value={name} onChangeText={setName} placeholder='Klan adı' placeholderTextColor='rgba(255,255,255,0.36)' style={{ marginTop: 12, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, color: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', opacity: canEdit ? 1 : 0.72 }} />
              <TextInput editable={canEdit} value={tag} onChangeText={setTag} placeholder='Etiket (örn. WING)' autoCapitalize='characters' placeholderTextColor='rgba(255,255,255,0.36)' style={{ marginTop: 10, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, color: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', opacity: canEdit ? 1 : 0.72 }} />
              <TextInput editable={canEdit} value={motto} onChangeText={setMotto} placeholder='Motto' placeholderTextColor='rgba(255,255,255,0.36)' style={{ marginTop: 10, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, color: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', opacity: canEdit ? 1 : 0.72 }} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 14 }}>
                {CLAN_THEME_PRESETS.map((item) => <ThemeChip key={item.key} item={item} selected={themeKey === item.key} onPress={canEdit ? setThemeKey : () => {}} />)}
              </View>
              {canEdit ? (
                <View style={{ marginTop: 14 }}>
                  <PrimaryButton label={clanSaving ? 'Kaydediliyor…' : clanState ? 'Klanı Kaydet' : 'Klanı Kur'} onPress={handleSave} disabled={clanSaving || clanLoading} />
                </View>
              ) : null}
            </View>

            <View style={{ marginTop: 14, padding: 16, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' }}>
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '900' }}>Klan Görevleri</Text>
              {(clanDerived?.missions || []).map((mission) => <MissionCard key={mission.key} mission={mission} onClaim={claimClanMission} disabled={clanSaving || clanLoading} />)}
            </View>

            <View style={{ marginTop: 14, padding: 16, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' }}>
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '900' }}>Ortak Puan Tablosu</Text>
              <Text style={{ color: 'rgba(255,255,255,0.66)', marginTop: 8 }}>{isShared ? 'Shared üyeler ve guest roster birlikte listelenir.' : 'Yerel klan üyeleri ve lider kartı üzerinden haftalık güç tablosu.'}</Text>
              <View style={{ marginTop: 12 }}>
                {(clanDerived?.board || []).map((row, index) => <BoardRow key={row.id || `${row.alias}-${index}`} row={row} index={index} accent={theme.accent} />)}
              </View>
            </View>

            <View style={{ marginTop: 14, padding: 16, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' }}>
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '900' }}>Mini Roster Kartı</Text>
              <Text style={{ color: 'rgba(255,255,255,0.66)', marginTop: 8 }}>{isShared ? 'Gerçek üyeler shared olarak gelir. Eklediğin ekstra üyeler guest roster olarak saklanır.' : 'Çevrimiçi üye sistemi gelmeden önce yerel roster kartı ile ekibini düzenle.'}</Text>
              <TextInput editable={canEdit} value={memberAlias} onChangeText={setMemberAlias} placeholder='Üye takma adı' placeholderTextColor='rgba(255,255,255,0.36)' style={{ marginTop: 12, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, color: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', opacity: canEdit ? 1 : 0.72 }} />
              <TextInput editable={canEdit} value={memberRole} onChangeText={setMemberRole} placeholder='Rol' placeholderTextColor='rgba(255,255,255,0.36)' style={{ marginTop: 10, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, color: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', opacity: canEdit ? 1 : 0.72 }} />
              {canEdit ? (
                <View style={{ marginTop: 12 }}>
                  <PrimaryButton label='Üye Ekle' onPress={handleAddMember} disabled={clanSaving || clanLoading} />
                </View>
              ) : null}
              <View style={{ marginTop: 12 }}>
                {(clanState?.roster || []).length ? clanState.roster.map((item) => (
                  <View key={item.id} style={{ borderRadius: 16, padding: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 8 }}>
                    <Text style={{ color: '#FFFFFF', fontWeight: '900' }}>{item.alias}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.60)', marginTop: 4 }}>{item.role}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.50)', marginTop: 4 }}>{item.source === 'guest' ? 'Guest roster üyesi' : 'Shared üye'}</Text>
                    {canEdit ? (
                      <View style={{ marginTop: 8 }}>
                        <SecondaryButton label='Çıkar' onPress={() => removeClanMember?.(item.id)} />
                      </View>
                    ) : null}
                  </View>
                )) : <Text style={{ color: 'rgba(255,255,255,0.56)' }}>Henüz eklenmiş mini roster üyesi yok.</Text>}
              </View>
            </View>

            {clanState ? (
              <View style={{ marginTop: 14 }}>
                <SecondaryButton label={clanState?.isLeader ? 'Loncayı Kapat ve Ayrıl' : 'Klandan Ayrıl'} onPress={leaveClan} />
              </View>
            ) : null}
          </ScrollView>
        </LinearGradient>
      </SafeScreen>
    </Modal>
  );
}
