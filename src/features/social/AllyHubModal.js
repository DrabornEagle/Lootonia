import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SafeScreen from '../../components/layout/SafeScreen';

import SecondaryButton from '../../components/ui/SecondaryButton';
import { minimalLootUi as ui, formatNum } from '../../theme/minimalLootUi';
import { useAllyHubState } from '../../hooks/useAllyHubState';

const QUICK_EMOJIS = ['🔥', '👑', '⚡', '😎', '🎯', '💎', '👏', '🫶'];

function dkd_get_quick_emoji_gradient(dkd_index_value) {
  const dkd_gradient_palette = [
    ['rgba(255,132,76,0.96)', 'rgba(255,78,120,0.92)'],
    ['rgba(255,208,87,0.96)', 'rgba(255,145,59,0.92)'],
    ['rgba(99,232,255,0.96)', 'rgba(92,129,255,0.92)'],
    ['rgba(154,120,255,0.96)', 'rgba(98,212,255,0.92)'],
    ['rgba(255,92,140,0.96)', 'rgba(163,98,255,0.92)'],
    ['rgba(103,227,255,0.96)', 'rgba(118,243,255,0.76)'],
    ['rgba(95,241,190,0.96)', 'rgba(90,193,255,0.88)'],
    ['rgba(255,120,214,0.96)', 'rgba(157,104,255,0.92)'],
  ];
  return dkd_gradient_palette[dkd_index_value % dkd_gradient_palette.length];
}

function padAllyId(value) {
  if (value == null || value === '') return '—';
  const digits = String(value).replace(/\D/g, '');
  return digits ? digits.padStart(6, '0') : '—';
}

function formatWhen(value) {
  if (!value) return 'Şimdi';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Şimdi';
  const now = new Date();
  const diff = Math.max(0, now.getTime() - date.getTime());
  if (diff < 45 * 1000) return 'Şimdi';
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
}

function formatPresence(row) {
  const date = row?.social_last_seen_at ? new Date(row.social_last_seen_at) : null;
  const valid = date && !Number.isNaN(date.getTime());
  const diff = valid ? Date.now() - date.getTime() : Number.POSITIVE_INFINITY;
  if (String(row?.social_status || '').toLowerCase() === 'online' || diff <= 3 * 60 * 1000) {
    return { label: 'Çevrimiçi', tone: 'online' };
  }
  if (diff <= 20 * 60 * 1000) {
    return { label: 'Az önce aktif', tone: 'away' };
  }
  if (diff <= 24 * 60 * 60 * 1000) {
    return { label: `${Math.max(1, Math.round(diff / (60 * 60 * 1000)))} sa önce`, tone: 'idle' };
  }
  return { label: 'Bugün görünmedi', tone: 'idle' };
}

function previewText(row) {
  const text = String(row?.last_message_text || '').trim();
  if (!text) return 'Mesaj başlat';
  return text.length > 42 ? `${text.slice(0, 42)}…` : text;
}

function TabChip({ active, label, icon, badge, onPress }) {
  return (
    <Pressable onPress={onPress} style={[dkd_styles.tabChip, active && dkd_styles.tabChipActive]}>
      <LinearGradient
        colors={active ? ['rgba(110,229,255,0.24)', 'rgba(159,88,255,0.22)'] : ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.02)']}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[dkd_styles.tabIconWrap, active && dkd_styles.tabIconWrapActive]}>
        <MaterialCommunityIcons name={icon} size={18} color={active ? '#EFFFFF' : 'rgba(225,235,248,0.78)'} />
      </View>
      <Text style={[dkd_styles.tabLabel, active && dkd_styles.tabLabelActive]}>{label}</Text>
      {Number(badge || 0) > 0 ? (
        <View style={dkd_styles.tabBadge}><Text style={dkd_styles.tabBadgeText}>{badge}</Text></View>
      ) : null}
    </Pressable>
  );
}

function StatCard({ icon, label, value, tone = 'cyan', hint }) {
  const dkd_accent = tone === 'gold'
    ? '#FFCC6A'
    : tone === 'purple'
      ? '#A87CFF'
      : tone === 'green'
        ? '#49E0AE'
        : '#67E3FF';

  return (
    <LinearGradient colors={['rgba(14,22,38,0.96)', 'rgba(11,19,34,0.90)']} style={dkd_styles.statCard}>
      <View style={[dkd_styles.statIconWrap, { backgroundColor: `${dkd_accent}18`, borderColor: `${dkd_accent}36` }] }>
        <MaterialCommunityIcons name={icon} size={18} color={dkd_accent} />
      </View>
      <Text style={dkd_styles.statValue}>{value}</Text>
      <Text style={dkd_styles.statLabel}>{label}</Text>
      {!!hint ? <Text style={dkd_styles.statHint}>{hint}</Text> : null}
    </LinearGradient>
  );
}

function PresencePill({ row }) {
  const presence = formatPresence(row);
  const dkd_tone = presence.tone === 'online'
    ? { dot: '#54E7AD', bg: 'rgba(84,231,173,0.14)', border: 'rgba(84,231,173,0.30)' }
    : presence.tone === 'away'
      ? { dot: '#FFD16C', bg: 'rgba(255,209,108,0.14)', border: 'rgba(255,209,108,0.24)' }
      : { dot: '#B6C3D6', bg: 'rgba(182,195,214,0.12)', border: 'rgba(182,195,214,0.18)' };

  return (
    <View style={[dkd_styles.presencePill, { backgroundColor: dkd_tone.bg, borderColor: dkd_tone.border }]}>
      <View style={[dkd_styles.presenceDot, { backgroundColor: dkd_tone.dot }]} />
      <Text style={dkd_styles.presenceLabel}>{presence.label}</Text>
    </View>
  );
}

function IdentityRow({ row, suffix, compact = false }) {
  return (
    <View style={dkd_styles.identityRow}>
      <LinearGradient colors={['rgba(117,243,255,0.22)', 'rgba(161,98,255,0.18)']} style={[dkd_styles.avatarShell, compact && dkd_styles.avatarShellCompact]}>
        <Text style={[dkd_styles.avatarEmoji, compact && dkd_styles.avatarEmojiCompact]}>{row?.avatar_emoji || '🦅'}</Text>
      </LinearGradient>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[dkd_styles.rowTitle, compact && dkd_styles.rowTitleCompact]} numberOfLines={1}>{row?.nickname || 'Oyuncu'}</Text>
        <Text style={dkd_styles.rowSub} numberOfLines={1}>#{padAllyId(row?.ally_id)} • Lvl {formatNum(row?.level || 1)} • {String(row?.rank_key || 'rookie').toUpperCase()}</Text>
        {!!suffix ? <Text style={dkd_styles.rowMeta} numberOfLines={2}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

function SearchRow({ row, onAdd }) {
  const dkd_relation_text = row?.is_friend
    ? 'Listende hazır'
    : row?.pending_received
      ? 'Senden onay bekliyor'
      : row?.pending_sent
        ? 'İstek gitti'
        : 'Yeni bağlantı';

  return (
    <LinearGradient colors={['rgba(18,27,45,0.98)', 'rgba(12,18,31,0.98)']} style={dkd_styles.listCard}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <IdentityRow row={row} suffix={dkd_relation_text} compact />
      </View>
      <View style={dkd_styles.rowEdge}>
        <PresencePill row={row} />
        {row?.is_friend ? (
          <View style={dkd_styles.badgePill}><Text style={dkd_styles.badgePillText}>Ekli</Text></View>
        ) : row?.pending_sent ? (
          <View style={dkd_styles.badgePill}><Text style={dkd_styles.badgePillText}>Beklemede</Text></View>
        ) : (
          <SecondaryButton
            label={row?.pending_received ? 'Kabul Et' : 'Ekle'}
            icon={row?.pending_received ? 'check-circle-outline' : 'account-plus-outline'}
            onPress={() => onAdd?.(row)}
            size="compact"
            fullWidth={false}
            tone="blue"
          />
        )}
      </View>
    </LinearGradient>
  );
}

function RequestRow({ row, mode = 'incoming', onAccept, onReject }) {
  const dkd_is_incoming = mode === 'incoming';
  return (
    <LinearGradient colors={['rgba(17,26,43,0.98)', 'rgba(11,17,30,0.98)']} style={dkd_styles.listCard}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <IdentityRow
          row={row}
          suffix={dkd_is_incoming ? 'Bağlantı isteği gönderdi. Tek dokunuşla ekibe al.' : 'Karşı tarafta onay bekliyor.'}
          compact
        />
      </View>
      <View style={dkd_styles.rowEdge}>
        <PresencePill row={row} />
        {dkd_is_incoming ? (
          <View style={dkd_styles.inlineActionStack}>
            <Pressable onPress={() => onReject?.(row)} style={dkd_styles.miniIconBtn}>
              <MaterialCommunityIcons name="close" size={18} color={ui.colors.soft} />
            </Pressable>
            <Pressable onPress={() => onAccept?.(row)} style={[dkd_styles.miniIconBtn, dkd_styles.miniIconBtnActive]}>
              <MaterialCommunityIcons name="check" size={18} color={ui.colors.text} />
            </Pressable>
          </View>
        ) : (
          <View style={dkd_styles.badgePill}><Text style={dkd_styles.badgePillText}>Beklemede</Text></View>
        )}
      </View>
    </LinearGradient>
  );
}

function ThreadRow({ row, onOpen, onRemove }) {
  const dkd_unread = Number(row?.unread_count || 0);
  return (
    <Pressable onPress={() => onOpen?.(row)} style={dkd_styles.threadCard}>
      <LinearGradient colors={['rgba(16,24,41,0.98)', 'rgba(10,16,28,0.98)']} style={StyleSheet.absoluteFillObject} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <IdentityRow row={row} suffix={previewText(row)} compact />
        <Text style={dkd_styles.inlineHint}>{formatWhen(row?.last_message_at || row?.friend_since)}</Text>
      </View>
      <View style={dkd_styles.rowEdge}>
        <PresencePill row={row} />
        {dkd_unread > 0 ? (
          <View style={[dkd_styles.badgePill, dkd_styles.badgePillUnread]}><Text style={dkd_styles.badgePillText}>{dkd_unread}</Text></View>
        ) : null}
        <Pressable
          onPress={(event) => {
            event?.stopPropagation?.();
            onRemove?.(row);
          }}
          style={dkd_styles.miniIconBtn}
        >
          <MaterialCommunityIcons name="account-remove-outline" size={18} color="#FFC96B" />
        </Pressable>
      </View>
    </Pressable>
  );
}

function EmptyState({ icon, title, sub }) {
  return (
    <View style={dkd_styles.emptyWrap}>
      <LinearGradient colors={['rgba(117,243,255,0.18)', 'rgba(171,93,255,0.18)']} style={dkd_styles.emptyOrb}>
        <MaterialCommunityIcons name={icon} size={28} color="#F1FBFF" />
      </LinearGradient>
      <Text style={dkd_styles.emptyTitle}>{title}</Text>
      <Text style={dkd_styles.emptySub}>{sub}</Text>
    </View>
  );
}

function MessageBubble({ item, mine }) {
  const dkd_text = String(item?.body || '');
  const dkd_emoji_only = dkd_text.trim().length <= 8 && !/[A-Za-z0-9ÇĞİÖŞÜçğıöşü]/.test(dkd_text);
  const dkd_time_text = `${formatWhen(item?.created_at)}${mine && item?.seen_at ? ' • Görüldü' : ''}`;

  return (
    <View style={[dkd_styles.messageRow, mine ? dkd_styles.messageRowMine : dkd_styles.messageRowOther]}>
      <LinearGradient
        colors={mine ? ['rgba(108,236,255,0.98)', 'rgba(122,143,255,0.96)', 'rgba(171,98,255,0.96)'] : ['rgba(22,33,56,0.98)', 'rgba(10,18,33,0.96)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          dkd_styles.messageBubble,
          mine ? dkd_styles.messageBubbleMine : dkd_styles.messageBubbleOther,
          dkd_emoji_only && dkd_styles.messageBubbleEmoji,
        ]}
      >
        <View style={dkd_styles.messageTopRow}>
          <Text style={[dkd_styles.messageSender, mine && dkd_styles.messageSenderMine]}>{mine ? 'Sen' : 'Ally'}</Text>
          <Text style={[dkd_styles.messageMeta, mine && dkd_styles.messageMetaMine]}>{dkd_time_text}</Text>
        </View>
        <Text style={[dkd_styles.messageBody, dkd_emoji_only && dkd_styles.messageBodyEmoji, mine && dkd_styles.messageBodyMine]}>{dkd_text}</Text>
      </LinearGradient>
    </View>
  );
}

export default function AllyHubModal({ visible, onClose, sessionUserId, profile, refreshProfile }) {
  const [tab, setTab] = useState('threads');
  const [composer, setComposer] = useState('');
  const feedRef = useRef(null);
  const {
    loading,
    dbReady,
    dbMessage,
    snapshot,
    myAllyId,
    unreadTotal,
    refreshSnapshot,
    searchText,
    setSearchText,
    searching,
    searchResults,
    runSearch,
    activeChat,
    openThread,
    messagesLoading,
    messages,
    sending,
    sendMessage,
    sendFriendRequest,
    respondFriendRequest,
    removeFriend,
  } = useAllyHubState({ sessionUserId, visible, profile, refreshProfile });

  const friends = useMemo(() => (Array.isArray(snapshot?.friends) ? snapshot.friends : []), [snapshot?.friends]);
  const incoming = useMemo(() => (Array.isArray(snapshot?.incoming) ? snapshot.incoming : []), [snapshot?.incoming]);
  const outgoing = useMemo(() => (Array.isArray(snapshot?.outgoing) ? snapshot.outgoing : []), [snapshot?.outgoing]);
  const threadRows = useMemo(
    () => friends.slice().sort((dkd_left_value, dkd_right_value) => new Date(dkd_right_value?.last_message_at || dkd_right_value?.friend_since || 0) - new Date(dkd_left_value?.last_message_at || dkd_left_value?.friend_since || 0)),
    [friends],
  );
  const dkd_spotlight_rows = useMemo(() => threadRows.slice(0, 3), [threadRows]);
  const dkd_presence_score = useMemo(() => unreadTotal + incoming.length + friends.length, [friends.length, incoming.length, unreadTotal]);

  useEffect(() => {
    if (!visible || !activeChat || !feedRef.current) return;
    const dkd_timer = setTimeout(() => feedRef.current?.scrollToEnd?.({ animated: true }), 120);
    return () => clearTimeout(dkd_timer);
  }, [activeChat, messages, visible]);

  async function handleAdd(row) {
    if (row?.pending_received && row?.request_id) {
      await respondFriendRequest(row.request_id, 'accept');
      await refreshSnapshot({ silent: true });
      return;
    }
    await sendFriendRequest(row?.user_id);
    await runSearch(searchText);
  }

  async function handleReply(action, row) {
    await respondFriendRequest(row?.request_id, action);
  }

  async function handleSendNow() {
    const dkd_ok = await sendMessage(composer);
    if (dkd_ok) setComposer('');
  }

  async function handleEmojiTap(emoji) {
    if (!activeChat) return;
    if (!composer.trim()) {
      const dkd_ok = await sendMessage(emoji);
      if (dkd_ok) setComposer('');
      return;
    }
    setComposer((prev) => `${prev}${prev.endsWith(' ') || !prev ? '' : ' '}${emoji}`);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeScreen style={{ flex: 1, backgroundColor: '#03060F' }}>
        <LinearGradient colors={['#03060F', '#07111D', '#160B20']} style={{ flex: 1 }}>
          <View style={dkd_styles.header}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={dkd_styles.kicker}>ALLY • NEXUS DM</Text>
              <Text style={[dkd_styles.title, activeChat && dkd_styles.titleCompact]}>{activeChat ? 'Mesaj Komuta Alanı' : 'Sosyal Komuta Merkezi'}</Text>

            </View>
            <SecondaryButton label="Kapat" onPress={onClose} fullWidth={false} />
          </View>

          <ScrollView contentContainerStyle={dkd_styles.content} keyboardShouldPersistTaps="handled">
            {!dbReady ? (
              <View style={dkd_styles.warningCard}>
                <MaterialCommunityIcons name="database-alert-outline" size={22} color="#FFD16C" />
                <Text style={dkd_styles.warningText}>{dbMessage}</Text>
              </View>
            ) : null}

            {activeChat ? (
              <View style={dkd_styles.chatStage}>
                <LinearGradient colors={['rgba(95,235,255,0.22)', 'rgba(119,119,255,0.18)', 'rgba(255,108,203,0.14)']} style={dkd_styles.chatHeroModern}>
                  <View style={dkd_styles.chatHeroGlowA} />
                  <View style={dkd_styles.chatHeroGlowB} />
                  <View style={dkd_styles.chatHeroGlowC} />

                  <View style={[dkd_styles.chatHeroIdentityShell, dkd_styles.chatHeroIdentityShellCompactTop]}>
                    <LinearGradient colors={['rgba(110,236,255,0.30)', 'rgba(167,99,255,0.24)']} style={dkd_styles.chatHeroAvatarShell}>
                      <Text style={dkd_styles.chatHeroAvatarEmoji}>{activeChat?.avatar_emoji || '🦅'}</Text>
                    </LinearGradient>

                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={dkd_styles.chatHeroTitle}>{activeChat?.nickname || 'Oyuncu'}</Text>
                      <Text style={dkd_styles.chatHeroSub}>Ally_ID #{padAllyId(activeChat?.ally_id)} • Lvl {formatNum(activeChat?.level || 1)} • {String(activeChat?.rank_key || 'rookie').toUpperCase()}</Text>
                      <View style={dkd_styles.chatHeroMetaRow}>
                        <PresencePill row={activeChat} />
                        <View style={dkd_styles.heroMetaPill}><Text style={dkd_styles.heroMetaPillText}>{messagesLoading ? 'senkron' : 'hazır'}</Text></View>
                      </View>
                    </View>
                  </View>
                </LinearGradient>

                <LinearGradient colors={['rgba(10,18,35,0.98)', 'rgba(15,27,49,0.98)', 'rgba(24,12,40,0.98)']} style={dkd_styles.chatFeedShell}>
                  <View style={dkd_styles.chatFeedGlowA} />
                  <View style={dkd_styles.chatFeedGlowB} />
                  <View style={dkd_styles.chatFeedHeaderRow}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={dkd_styles.chatFeedTitle}>Canlı sohbet akışı</Text>
                      <Text style={dkd_styles.chatFeedSub}>{messagesLoading ? 'Mesaj tüneli hazırlanıyor…' : 'Mesajların yeni premium akışta renkli balonlarla sıralanır.'}</Text>
                    </View>
                    <View style={dkd_styles.chatFeedBadge}>
                      <MaterialCommunityIcons name="orbit" size={18} color="#F4FBFF" />
                    </View>
                  </View>
                  <ScrollView
                    ref={feedRef}
                    style={dkd_styles.chatFeedModern}
                    contentContainerStyle={dkd_styles.chatFeedModernContent}
                    keyboardShouldPersistTaps="handled"
                    onContentSizeChange={() => feedRef.current?.scrollToEnd?.({ animated: true })}
                  >
                    {messagesLoading ? (
                      <EmptyState icon="progress-clock" title="Mesajlar hazırlanıyor" sub="Sohbet tüneli yenileniyor…" />
                    ) : messages.length ? messages.map((item) => (
                      <MessageBubble key={String(item?.id || `${item?.sender_id}-${item?.created_at}`)} item={item} mine={String(item?.sender_id) === String(sessionUserId)} />
                    )) : (
                      <EmptyState icon="message-badge-outline" title="İlk renkli mesajı sen at" sub="Bu odadaki ilk hareket, canlı sohbet alanını anında başlatır." />
                    )}
                  </ScrollView>
                </LinearGradient>

                <LinearGradient colors={['rgba(20,31,52,0.98)', 'rgba(13,20,37,0.98)']} style={dkd_styles.emojiDeck}>
                  <View style={dkd_styles.emojiDeckHead}>
                    <Text style={dkd_styles.emojiDeckTitle}>Hızlı ifade dokunuşları</Text>
                    <Text style={dkd_styles.emojiDeckSub}>Tek dokunuşla metne ekle ya da boşsa direkt gönder.</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={dkd_styles.emojiRailModern}>
                    {QUICK_EMOJIS.map((emoji, dkd_emoji_index) => {
                      const dkd_emoji_gradient = dkd_get_quick_emoji_gradient(dkd_emoji_index);
                      return (
                        <Pressable key={emoji} onPress={() => handleEmojiTap(emoji)} style={dkd_styles.emojiChipWrap}>
                          <LinearGradient colors={dkd_emoji_gradient} style={dkd_styles.emojiChipModern}>
                            <Text style={dkd_styles.emojiChipTextModern}>{emoji}</Text>
                          </LinearGradient>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </LinearGradient>

                <LinearGradient colors={['rgba(16,27,48,0.98)', 'rgba(9,15,30,0.98)', 'rgba(23,9,35,0.98)']} style={dkd_styles.composerPanel}>
                  <View style={dkd_styles.composerPanelGlowA} />
                  <View style={dkd_styles.composerPanelGlowB} />
                  <View style={dkd_styles.composerPanelHead}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={dkd_styles.composerPanelTitle}>Canlı mesaj paneli</Text>
                      <Text style={dkd_styles.composerPanelHint}>Metin, emoji ve hızlı gönderim tek merkezde. Yazarken alan renklenir.</Text>
                    </View>
                    <View style={dkd_styles.composerStatusOrb}>
                      <MaterialCommunityIcons name={composer.trim() ? 'pencil-outline' : 'flash'} size={16} color="#06111D" />
                      <Text style={dkd_styles.composerStatusOrbText}>{composer.trim() ? `${composer.trim().length} karakter` : 'Hazır'}</Text>
                    </View>
                  </View>

                  <LinearGradient colors={composer.trim() ? ['rgba(103,227,255,0.20)', 'rgba(162,98,255,0.16)'] : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.03)']} style={dkd_styles.composerInputShell}>
                    <TextInput
                      value={composer}
                      onChangeText={setComposer}
                      placeholder="Mesajını yaz…"
                      placeholderTextColor="rgba(255,255,255,0.34)"
                      multiline
                      style={dkd_styles.composerInputModern}
                    />
                  </LinearGradient>

                  <View style={dkd_styles.composerActionRow}>
                    <View style={dkd_styles.composerInfoPill}>
                      <MaterialCommunityIcons name="flash" size={14} color="#88F0FF" />
                      <Text style={dkd_styles.composerInfoPillText}>{composer.trim() ? 'Gönderime hazır canlı akış' : 'Önce yaz, sonra renkli gönder'}</Text>
                    </View>

                    <Pressable
                      onPress={handleSendNow}
                      disabled={sending || !composer.trim()}
                      style={[dkd_styles.sendFab, (sending || !composer.trim()) && dkd_styles.sendFabDisabled]}
                    >
                      <LinearGradient
                        colors={sending || !composer.trim() ? ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.08)'] : ['#67E3FF', '#7F8DFF', '#A262FF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={dkd_styles.sendFabInner}
                      >
                        <MaterialCommunityIcons name="send" size={18} color={sending || !composer.trim() ? 'rgba(255,255,255,0.62)' : '#06111D'} />
                        <Text style={[dkd_styles.sendFabText, (sending || !composer.trim()) && dkd_styles.sendFabTextDisabled]}>
                          {sending ? 'Gönderiliyor' : 'Gönder'}
                        </Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                </LinearGradient>
              </View>
            ) : (
              <>
                <LinearGradient colors={['rgba(104,230,255,0.18)', 'rgba(126,97,255,0.16)', 'rgba(255,94,163,0.10)']} style={dkd_styles.hero}>
                  <View style={dkd_styles.heroGlowA} />
                  <View style={dkd_styles.heroGlowB} />
                  <View style={dkd_styles.heroTop}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={dkd_styles.heroEyebrow}>KİMLİĞİN • PREMIUM HUB</Text>
                      <Text style={dkd_styles.heroTitle}>Ally_ID #{padAllyId(myAllyId)}</Text>
                      <Text style={dkd_styles.heroSub}>{profile?.nickname || snapshot?.myProfile?.nickname || 'Oyuncu'}</Text>
                    </View>
                    <View style={dkd_styles.heroBadge}>
                      <MaterialCommunityIcons name="atom-variant" size={18} color="#F4FBFF" />
                      <Text style={dkd_styles.heroBadgeText}>{formatNum(dkd_presence_score)} canlı temas</Text>
                    </View>
                  </View>

                  <View style={dkd_styles.statRow}>
                    <StatCard icon="message-badge-outline" label="Yeni DM" value={formatNum(unreadTotal)} />
                    <StatCard icon="account-group-outline" label="Takım" value={formatNum(friends.length)} tone="green" />
                    <StatCard icon="account-arrow-right-outline" label="Davet" value={formatNum(incoming.length + outgoing.length)} tone="purple" />
                  </View>
                </LinearGradient>

                <View style={dkd_styles.tabRow}>
                  <TabChip active={tab === 'threads'} label="Akış" icon="message-processing-outline" badge={unreadTotal} onPress={() => setTab('threads')} />
                  <TabChip active={tab === 'friends'} label="Takım" icon="account-multiple-outline" badge={friends.length} onPress={() => setTab('friends')} />
                  <TabChip active={tab === 'search'} label="Bul" icon="radar" badge={incoming.length} onPress={() => setTab('search')} />
                </View>

                {tab === 'threads' ? (
                  <>
                    <View style={dkd_styles.panel}>
                      <View style={dkd_styles.panelHeadRow}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={dkd_styles.panelTitle}>Mesaj vitrini</Text>
                          <Text style={dkd_styles.panelSub}>En sıcak DM hatları burada öne çıkar. Dokun ve doğrudan premium mesaj odasına geç.</Text>
                        </View>
                        <SecondaryButton label="Yenile" icon="refresh" onPress={() => refreshSnapshot()} size="compact" fullWidth={false} />
                      </View>

                      {dkd_spotlight_rows.length ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={dkd_styles.spotlightRow}>
                          {dkd_spotlight_rows.map((row) => (
                            <Pressable key={`spot-${row?.user_id}`} onPress={() => openThread(row)} style={dkd_styles.spotlightCard}>
                              <LinearGradient colors={['rgba(104,230,255,0.20)', 'rgba(162,98,255,0.16)', 'rgba(255,255,255,0.04)']} style={dkd_styles.spotlightInner}>
                                <IdentityRow row={row} suffix={previewText(row)} compact />
                                <View style={dkd_styles.spotlightFooter}>
                                  <PresencePill row={row} />
                                  <Text style={dkd_styles.spotlightTime}>{formatWhen(row?.last_message_at || row?.friend_since)}</Text>
                                </View>
                              </LinearGradient>
                            </Pressable>
                          ))}
                        </ScrollView>
                      ) : (
                        <EmptyState icon="forum-outline" title="Vitrin hazır bekliyor" sub="İlk bağlantını kurduğunda burası öne çıkan sohbetlerle dolacak." />
                      )}
                    </View>

                    <View style={dkd_styles.panel}>
                      <Text style={dkd_styles.panelTitle}>Mesaj koridoru</Text>
                      <Text style={dkd_styles.panelSub}>Tüm aktif sohbetlerin daha net ayrışan profesyonel kartlarla burada listelenir.</Text>
                      <View style={dkd_styles.stackGap}>
                        {threadRows.length
                          ? threadRows.map((row) => <ThreadRow key={String(row?.user_id)} row={row} onOpen={openThread} onRemove={removeFriend} />)
                          : <EmptyState icon="message-outline" title="Henüz sohbet yok" sub="Bir oyuncu eklediğinde DM koridoru burada görünmeye başlar." />}
                      </View>
                    </View>
                  </>
                ) : null}

                {tab === 'friends' ? (
                  <>
                    <View style={dkd_styles.panel}>
                      <Text style={dkd_styles.panelTitle}>Takım kadrosu</Text>
                      <Text style={dkd_styles.panelSub}>Sık temas kurduğun oyuncular tek blokta, daha okunur ve profesyonel düzende burada durur.</Text>
                      <View style={dkd_styles.stackGap}>
                        {friends.length
                          ? friends.map((row) => <ThreadRow key={String(row?.user_id)} row={row} onOpen={openThread} onRemove={removeFriend} />)
                          : <EmptyState icon="account-heart-outline" title="Takım kadron boş" sub="Ally_ID veya nickname ile oyuncu ekleyerek ağını büyütebilirsin." />}
                      </View>
                    </View>

                    <View style={dkd_styles.panel}>
                      <Text style={dkd_styles.panelTitle}>Gelen bağlantılar</Text>
                      <Text style={dkd_styles.panelSub}>Onay verdiğinde oyuncu anında takım listene eklenir ve mesaj hattı otomatik açılır.</Text>
                      <View style={dkd_styles.stackGap}>
                        {incoming.length
                          ? incoming.map((row, dkd_incoming_index) => <RequestRow key={`dkd-in-${String(row?.request_id || row?.from_user_id || row?.user_id || row?.ally_id || dkd_incoming_index)}`} row={row} mode="incoming" onAccept={() => handleReply('accept', row)} onReject={() => handleReply('reject', row)} />)
                          : <Text style={dkd_styles.inlineHint}>Şu an gelen bekleyen istek yok.</Text>}
                      </View>
                    </View>

                    <View style={dkd_styles.panel}>
                      <Text style={dkd_styles.panelTitle}>Gönderilen bağlantılar</Text>
                      <Text style={dkd_styles.panelSub}>Karşı taraf onay verdiğinde bu alan otomatik olarak canlı sohbet akışına dönüşür.</Text>
                      <View style={dkd_styles.stackGap}>
                        {outgoing.length
                          ? outgoing.map((row, dkd_outgoing_index) => <RequestRow key={`dkd-out-${String(row?.request_id || row?.to_user_id || row?.user_id || row?.ally_id || dkd_outgoing_index)}`} row={row} mode="outgoing" />)
                          : <Text style={dkd_styles.inlineHint}>Gönderdiğin bekleyen istek yok.</Text>}
                      </View>
                    </View>
                  </>
                ) : null}

                {tab === 'search' ? (
                  <View style={dkd_styles.panel}>
                    <Text style={dkd_styles.panelTitle}>Yeni bağlantı tara</Text>
                    <Text style={dkd_styles.panelSub}>Ally_ID ya da oyuncu adı yaz. Eşleşmeler güçlü kontrastlı modern oyuncu kartları olarak aşağıda görünür.</Text>
                    <LinearGradient colors={['rgba(103,227,255,0.12)', 'rgba(162,98,255,0.10)']} style={dkd_styles.searchShell}>
                      <MaterialCommunityIcons name="magnify" size={18} color={ui.colors.soft} />
                      <TextInput
                        value={searchText}
                        onChangeText={setSearchText}
                        placeholder="Örn: 482761 veya DrabornEagle"
                        placeholderTextColor="rgba(255,255,255,0.36)"
                        style={dkd_styles.searchInput}
                        autoCapitalize="none"
                        autoCorrect={false}
                        onSubmitEditing={() => runSearch(searchText)}
                      />
                      <Pressable onPress={() => runSearch(searchText)} style={dkd_styles.searchGoBtn}>
                        <MaterialCommunityIcons name={searching ? 'timer-sand' : 'arrow-right'} size={18} color={ui.colors.text} />
                      </Pressable>
                    </LinearGradient>
                    <View style={dkd_styles.searchHintRow}>
                      <Text style={dkd_styles.inlineHint}>Senin Ally_ID: #{padAllyId(myAllyId)}</Text>
                      <Text style={dkd_styles.inlineHint}>{loading ? 'Güncelleniyor…' : `${searchResults.length} sonuç`}</Text>
                    </View>
                    <View style={dkd_styles.stackGap}>
                      {searchResults.length
                        ? searchResults.map((row) => <SearchRow key={String(row?.user_id)} row={row} onAdd={handleAdd} />)
                        : <EmptyState icon="account-search" title="Tarama bekliyor" sub="En az 2 harf veya 6 rakam yazdığında sonuçlar burada görünür." />}
                    </View>
                  </View>
                ) : null}
              </>
            )}

            <View style={{ height: 28 }} />
          </ScrollView>
        </LinearGradient>
      </SafeScreen>
    </Modal>
  );
}

const dkd_styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  kicker: { color: '#94EEFF', fontSize: 11, fontWeight: '900', letterSpacing: 1.6 },
  title: { color: ui.colors.text, fontSize: 30, lineHeight: 35, fontWeight: '900', marginTop: 6 },
  titleCompact: { fontSize: 28, lineHeight: 32 },
  subtitle: { color: 'rgba(223,238,255,0.76)', fontSize: 13, lineHeight: 20, marginTop: 8, maxWidth: 305 },
  content: { paddingHorizontal: 14, paddingTop: 6, paddingBottom: 42 },
  hero: {
    borderRadius: 34,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(132,228,255,0.20)',
    backgroundColor: 'rgba(8,14,24,0.88)',
    overflow: 'hidden',
    shadowColor: '#6FE7FF',
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  heroGlowA: {
    position: 'absolute',
    right: -30,
    top: -24,
    width: 190,
    height: 190,
    borderRadius: 999,
    backgroundColor: 'rgba(92,218,255,0.15)',
  },
  heroGlowB: {
    position: 'absolute',
    left: -40,
    bottom: -46,
    width: 164,
    height: 164,
    borderRadius: 999,
    backgroundColor: 'rgba(164,97,255,0.15)',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroEyebrow: { color: '#A8F3FF', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  heroTitle: { color: '#F4FBFF', fontSize: 31, lineHeight: 37, fontWeight: '900', marginTop: 7 },
  heroSub: { color: 'rgba(231,241,255,0.82)', fontSize: 14, lineHeight: 18, marginTop: 12, maxWidth: 255, fontWeight: '800' },
  heroBadge: {
    alignSelf: 'flex-start',
    minHeight: 48,
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroBadgeText: { color: '#F5FBFF', fontWeight: '900', fontSize: 13 },
  statRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  statCard: {
    flex: 1,
    minHeight: 124,
    borderRadius: 26,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { color: '#F5FBFF', fontSize: 22, fontWeight: '900', marginTop: 14 },
  statLabel: { color: 'rgba(231,240,255,0.82)', fontSize: 12, fontWeight: '900', marginTop: 5 },
  statHint: { color: 'rgba(196,211,230,0.72)', fontSize: 11, marginTop: 7, fontWeight: '800' },
  warningCard: {
    marginTop: 14,
    borderRadius: 24,
    padding: 15,
    backgroundColor: 'rgba(255,201,95,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,209,108,0.26)',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  warningText: { flex: 1, color: ui.colors.text, fontWeight: '700', lineHeight: 19 },
  tabRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  tabChip: {
    flex: 1,
    minHeight: 78,
    borderRadius: 24,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  tabChipActive: {
    borderColor: 'rgba(132,228,255,0.28)',
    backgroundColor: 'rgba(15,28,48,0.88)',
  },
  tabIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  tabIconWrapActive: { backgroundColor: 'rgba(255,255,255,0.14)' },
  tabLabel: { color: 'rgba(224,235,248,0.80)', fontWeight: '900', fontSize: 14 },
  tabLabelActive: { color: '#F5FBFF' },
  tabBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 7,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: { color: '#F5FBFF', fontWeight: '900', fontSize: 11 },
  panel: {
    marginTop: 16,
    borderRadius: 30,
    padding: 18,
    backgroundColor: 'rgba(11,17,29,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  panelHeadRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  panelTitle: { color: '#F5FBFF', fontSize: 24, lineHeight: 28, fontWeight: '900' },
  panelSub: { color: 'rgba(227,238,255,0.72)', fontSize: 13, lineHeight: 20, marginTop: 7 },
  spotlightRow: { marginTop: 16, gap: 12, paddingRight: 4 },
  spotlightCard: { width: 286, borderRadius: 24, overflow: 'hidden' },
  spotlightInner: {
    padding: 15,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(120,237,255,0.18)',
    backgroundColor: 'rgba(10,26,44,0.92)',
    minHeight: 128,
    justifyContent: 'space-between',
  },
  spotlightFooter: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  spotlightTime: { color: 'rgba(196,211,230,0.74)', fontWeight: '800', fontSize: 12 },
  stackGap: { marginTop: 16, gap: 12 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarShell: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(132,228,255,0.22)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  avatarShellCompact: { width: 54, height: 54, borderRadius: 18 },
  avatarEmoji: { fontSize: 25 },
  avatarEmojiCompact: { fontSize: 22 },
  rowTitle: { color: '#F5FBFF', fontSize: 17, fontWeight: '900' },
  rowTitleCompact: { fontSize: 16 },
  rowSub: { color: 'rgba(226,236,250,0.78)', fontSize: 12, fontWeight: '800', marginTop: 4 },
  rowMeta: { color: 'rgba(196,211,230,0.74)', fontSize: 12, fontWeight: '700', marginTop: 4, lineHeight: 17 },
  listCard: {
    borderRadius: 24,
    padding: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    overflow: 'hidden',
  },
  threadCard: {
    borderRadius: 26,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(117,243,255,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    overflow: 'hidden',
  },
  rowEdge: { alignItems: 'flex-end', gap: 8 },
  presencePill: {
    minHeight: 32,
    borderRadius: 999,
    paddingHorizontal: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  presenceDot: { width: 8, height: 8, borderRadius: 999 },
  presenceLabel: { color: '#F5FBFF', fontWeight: '800', fontSize: 12 },
  badgePill: {
    minHeight: 34,
    minWidth: 74,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  badgePillUnread: {
    backgroundColor: 'rgba(118,243,255,0.16)',
    borderColor: 'rgba(118,243,255,0.24)',
  },
  badgePillText: { color: '#F5FBFF', fontWeight: '900' },
  inlineActionStack: { flexDirection: 'row', gap: 8 },
  miniIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniIconBtnActive: {
    backgroundColor: 'rgba(118,243,255,0.18)',
    borderColor: 'rgba(118,243,255,0.28)',
  },
  emptyWrap: { paddingVertical: 30, alignItems: 'center', justifyContent: 'center' },
  emptyOrb: {
    width: 72,
    height: 72,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(118,243,255,0.22)',
  },
  emptyTitle: { color: '#F5FBFF', fontSize: 18, fontWeight: '900', marginTop: 12 },
  emptySub: { color: 'rgba(223,238,255,0.68)', textAlign: 'center', lineHeight: 20, marginTop: 8, maxWidth: 260 },
  inlineHint: { color: 'rgba(196,211,230,0.72)', fontSize: 12, lineHeight: 18, fontWeight: '700' },
  chatStage: { marginTop: 8, gap: 14 },
  chatHero: {
    borderRadius: 30,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(132,228,255,0.20)',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    overflow: 'hidden',
  },
  chatHeroModern: {
    borderRadius: 34,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(130,231,255,0.24)',
    backgroundColor: 'rgba(10,15,26,0.92)',
    overflow: 'hidden',
    shadowColor: '#7AEAFF',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  chatHeroGlowA: {
    position: 'absolute',
    top: -26,
    right: -18,
    width: 140,
    height: 140,
    borderRadius: 999,
    backgroundColor: 'rgba(103,227,255,0.16)',
  },
  chatHeroGlowB: {
    position: 'absolute',
    left: -22,
    bottom: -30,
    width: 112,
    height: 112,
    borderRadius: 999,
    backgroundColor: 'rgba(162,98,255,0.16)',
  },
  chatHeroGlowC: {
    position: 'absolute',
    right: 42,
    bottom: -24,
    width: 130,
    height: 130,
    borderRadius: 999,
    backgroundColor: 'rgba(255,109,201,0.12)',
  },
  backBtn: {
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  chatHeroBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8,
  },
  chatSignalPill: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#8EF0FF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chatSignalPillText: { color: '#07111D', fontWeight: '900', fontSize: 12 },
  chatHeroIdentityShell: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  chatHeroIdentityShellCompactTop: {
    marginTop: 0,
  },
  chatHeroAvatarShell: {
    width: 72,
    height: 72,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  chatHeroAvatarEmoji: { fontSize: 30 },
  chatHeroTitle: { color: '#F5FBFF', fontSize: 24, lineHeight: 28, fontWeight: '900', marginTop: 6 },
  chatHeroSub: { color: 'rgba(225,236,248,0.80)', fontSize: 12, lineHeight: 18, marginTop: 6, fontWeight: '800' },
  chatHeroMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  heroMetaPill: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMetaPillText: { color: '#F5FBFF', fontSize: 12, fontWeight: '800' },
  chatHeroActions: { gap: 8 },
  heroIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatFeedCard: {
    marginTop: 14,
    borderRadius: 30,
    backgroundColor: 'rgba(8,13,24,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  chatFeedShell: {
    borderRadius: 34,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    position: 'relative',
    minHeight: 360,
  },
  chatFeedGlowA: {
    position: 'absolute',
    top: -34,
    right: -22,
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: 'rgba(94,229,255,0.12)',
  },
  chatFeedGlowB: {
    position: 'absolute',
    left: -26,
    bottom: -38,
    width: 140,
    height: 140,
    borderRadius: 999,
    backgroundColor: 'rgba(255,110,201,0.10)',
  },
  chatFeedHeaderRow: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  chatFeedTitle: { color: '#F5FBFF', fontWeight: '900', fontSize: 18 },
  chatFeedSub: { color: 'rgba(208,224,245,0.72)', fontSize: 12, lineHeight: 18, marginTop: 5 },
  chatFeedBadge: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatFeedModern: { maxHeight: 440 },
  chatFeedModernContent: { paddingHorizontal: 14, paddingBottom: 18, gap: 12 },
  feedTopRibbon: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  feedTopRibbonText: { color: '#F5FBFF', fontWeight: '900', fontSize: 14 },
  chatFeed: { maxHeight: 430 },
  chatFeedContent: { padding: 14, gap: 12 },
  messageRow: { flexDirection: 'row' },
  messageRowMine: { justifyContent: 'flex-end' },
  messageRowOther: { justifyContent: 'flex-start' },
  messageBubble: {
    maxWidth: '86%',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
  },
  messageTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 6,
  },
  messageSender: { color: 'rgba(225,240,255,0.72)', fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
  messageSenderMine: { color: 'rgba(6,17,29,0.74)' },
  messageBubbleMine: {
    borderColor: 'rgba(103,227,255,0.14)',
    borderTopRightRadius: 10,
    shadowColor: '#69E5FF',
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  messageBubbleOther: {
    borderColor: 'rgba(255,255,255,0.08)',
    borderTopLeftRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  messageBubbleEmoji: {
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  messageBody: { color: '#F5FBFF', fontSize: 14, lineHeight: 20, fontWeight: '700' },
  messageBodyMine: { color: '#06111D' },
  messageBodyEmoji: { fontSize: 30, lineHeight: 36 },
  messageMeta: { color: 'rgba(196,211,230,0.72)', fontSize: 11, fontWeight: '800' },
  messageMetaMine: { color: 'rgba(6,17,29,0.72)' },
  emojiRail: { gap: 10, paddingTop: 14, paddingBottom: 4, paddingRight: 6 },
  emojiDeck: {
    borderRadius: 30,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  emojiDeckHead: { paddingHorizontal: 16, paddingBottom: 10 },
  emojiDeckTitle: { color: '#F5FBFF', fontSize: 16, fontWeight: '900' },
  emojiDeckSub: { color: 'rgba(208,224,245,0.70)', fontSize: 12, lineHeight: 18, marginTop: 5 },
  emojiRailModern: { gap: 10, paddingHorizontal: 14, paddingRight: 20 },
  emojiChipWrap: { borderRadius: 20, overflow: 'hidden' },
  emojiChipModern: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  emojiChipTextModern: { fontSize: 24 },
  emojiChip: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiChipText: { fontSize: 20 },
  composerCard: {
    marginTop: 12,
    borderRadius: 28,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  composerPanel: {
    borderRadius: 34,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    position: 'relative',
  },
  composerPanelGlowA: {
    position: 'absolute',
    top: -30,
    right: -24,
    width: 136,
    height: 136,
    borderRadius: 999,
    backgroundColor: 'rgba(96,232,255,0.12)',
  },
  composerPanelGlowB: {
    position: 'absolute',
    left: -18,
    bottom: -34,
    width: 120,
    height: 120,
    borderRadius: 999,
    backgroundColor: 'rgba(167,98,255,0.12)',
  },
  composerPanelHead: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', justifyContent: 'space-between' },
  composerPanelTitle: { color: '#F5FBFF', fontSize: 20, fontWeight: '900' },
  composerPanelHint: { color: 'rgba(222,236,251,0.72)', fontSize: 12, lineHeight: 18, marginTop: 5 },
  composerStatusOrb: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#95F1FF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  composerStatusOrbText: { color: '#06111D', fontSize: 12, fontWeight: '900' },
  composerInputShell: {
    marginTop: 14,
    borderRadius: 28,
    padding: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  composerInputModern: {
    minHeight: 122,
    borderRadius: 27,
    backgroundColor: 'rgba(7,12,22,0.86)',
    color: '#F5FBFF',
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
    textAlignVertical: 'top',
  },
  composerActionRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  composerInfoPill: {
    flex: 1,
    minHeight: 42,
    borderRadius: 999,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  composerInfoPillText: { color: 'rgba(230,239,251,0.76)', fontSize: 12, fontWeight: '800', flex: 1 },
  sendFab: { borderRadius: 999, overflow: 'hidden' },
  sendFabDisabled: { opacity: 0.82 },
  sendFabInner: {
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sendFabText: { color: '#06111D', fontSize: 14, fontWeight: '900' },
  sendFabTextDisabled: { color: 'rgba(255,255,255,0.62)' },
  composerHeader: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', justifyContent: 'space-between' },
  composerTitle: { color: '#F5FBFF', fontSize: 18, fontWeight: '900' },
  composerHint: { color: 'rgba(222,236,251,0.68)', fontSize: 12, lineHeight: 18, marginTop: 4 },
  composerInput: {
    minHeight: 108,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    color: '#F5FBFF',
    fontSize: 14,
    lineHeight: 21,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 14,
    textAlignVertical: 'top',
  },
  composerFooter: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  composerStatusPill: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  composerStatusText: { color: '#F5FBFF', fontSize: 12, fontWeight: '800' },
  searchShell: {
    marginTop: 16,
    minHeight: 60,
    borderRadius: 22,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(120,237,255,0.14)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: { flex: 1, color: '#F5FBFF', fontSize: 14, fontWeight: '700' },
  searchGoBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchHintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 12 },
});
