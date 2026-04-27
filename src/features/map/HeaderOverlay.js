import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { normalizeProgression } from '../../utils/progression';
import { minimalLootUi as ui, formatNum } from '../../theme/minimalLootUi';
import { tapFeedback } from '../../services/feedbackService';

function MetricChip({ icon, label, value, animatedStyle }) {
  const Wrap = animatedStyle ? Animated.View : View;
  return (
    <Wrap style={[{ flex: 1 }, animatedStyle || null]}>
      <View
        style={{
          minHeight: 54,
          borderRadius: 18,
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderWidth: 1,
          borderColor: ui.colors.line,
          paddingHorizontal: 10,
          paddingVertical: 9,
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: 'rgba(123,230,255,0.20)',
          }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 12,
              backgroundColor: 'rgba(255,255,255,0.08)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons name={icon} size={15} color={ui.colors.text} />
          </View>
          <View style={{ marginLeft: 8, flex: 1 }}>
            <Text style={{ color: ui.colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 }}>{label}</Text>
            <Text style={{ color: ui.colors.text, fontSize: 15, fontWeight: '900', marginTop: 1 }} numberOfLines={1}>{value}</Text>
          </View>
        </View>
      </View>
    </Wrap>
  );
}

function TaskCta({ dailyRewardState, onOpenDailyReward, onOpenTasks }) {
  const claimable = Number(dailyRewardState?.claimableCount || 0);
  const streak = Number(dailyRewardState?.streak || 0);
  const title = claimable > 0 ? 'Günlük ödül hazır' : 'Görev ve ödül merkezi';
  const sub = claimable > 0 ? 'Bugünün giriş ödülünü şimdi topla' : (streak > 0 ? `${streak} günlük seri devam ediyor` : 'Görevlere gir ve ilerleme başlat');
  const icon = claimable > 0 ? 'gift-outline' : 'clipboard-text-outline';
  const onPress = claimable > 0 ? onOpenDailyReward : onOpenTasks;
  const pressAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.spring(pressAnim, { toValue: 1, useNativeDriver: true, speed: 28, bounciness: 0 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(pressAnim, { toValue: 0, useNativeDriver: true, speed: 24, bounciness: 0 }).start();
  };

  return (
    <Pressable
      onPress={() => {
        tapFeedback();
        onPress?.();
      }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={{ marginTop: 10 }}
    >
      <Animated.View
        style={{
          borderRadius: 18,
          backgroundColor: claimable > 0 ? 'rgba(246,197,95,0.14)' : 'rgba(123,230,255,0.12)',
          borderWidth: 1,
          borderColor: claimable > 0 ? 'rgba(246,197,95,0.26)' : 'rgba(123,230,255,0.24)',
          paddingHorizontal: 12,
          paddingVertical: 11,
          transform: [
            {
              scale: pressAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.985] }),
            },
          ],
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 13,
              backgroundColor: 'rgba(255,255,255,0.10)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons name={icon} size={18} color={ui.colors.text} />
          </View>
          <View style={{ flex: 1, marginLeft: 10, paddingRight: 8 }}>
            <Text style={{ color: ui.colors.text, fontSize: 13, fontWeight: '900' }} numberOfLines={1}>{title}</Text>
            <Text style={{ color: ui.colors.soft, fontSize: 11, fontWeight: '700', marginTop: 2 }} numberOfLines={1}>{sub}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={ui.colors.text} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

function HeaderOverlay({ profile, energyUI, tokenScale, tokenText, walletText, dailyRewardState, onOpenDailyReward, onOpenTasks, compact = false }) {
  const prog = useMemo(() => normalizeProgression(profile || {}), [profile?.level, profile?.xp, profile?.rank_key]);
  const nickname = String(profile?.nickname || 'Oyuncu');
  const avatarEmoji = String(profile?.avatar_emoji || '🦅');
  const dkd_profile_avatar_image_url = String(profile?.avatar_image_url || '').trim();
  const ticketValue = formatNum(profile?.boss_tickets || 0);
  const shardText = formatNum(profile?.shards || 0);
  const ambientAnim = useRef(new Animated.Value(0)).current;
  const avatarFloatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const ambientLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(ambientAnim, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(ambientAnim, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ])
    );
    const avatarLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(avatarFloatAnim, { toValue: 1, duration: 2600, useNativeDriver: true }),
        Animated.timing(avatarFloatAnim, { toValue: 0, duration: 2600, useNativeDriver: true }),
      ])
    );
    ambientLoop.start();
    avatarLoop.start();
    return () => {
      ambientLoop.stop();
      avatarLoop.stop();
    };
  }, [ambientAnim, avatarFloatAnim]);

  const tokenAnimatedStyle = useMemo(() => ({ transform: [{ scale: tokenScale || 1 }] }), [tokenScale]);
  const levelAnimatedStyle = useMemo(() => ({
    transform: [
      {
        scale: ambientAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] }),
      },
    ],
  }), [ambientAnim]);
  const avatarPulseStyle = useMemo(() => ({
    opacity: ambientAnim.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.34] }),
    transform: [
      { scale: ambientAnim.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.14] }) },
    ],
  }), [ambientAnim]);
  const avatarFloatStyle = useMemo(() => ({
    transform: [
      { translateY: avatarFloatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) },
    ],
  }), [avatarFloatAnim]);

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 12, right: 12, top: 12, zIndex: 25 }}>
      <View
        style={{
          borderRadius: compact ? 22 : 26,
          backgroundColor: 'rgba(7,12,20,0.96)',
          borderWidth: 1,
          borderColor: ui.colors.line,
          paddingHorizontal: compact ? 12 : 14,
          paddingVertical: compact ? 12 : 14,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOpacity: 0.24,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
          elevation: 10,
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -70,
            right: -20,
            width: 170,
            height: 170,
            borderRadius: 999,
            backgroundColor: 'rgba(123,230,255,0.08)',
            opacity: ambientAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.55] }),
            transform: [{ scale: ambientAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.08] }) }],
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 18,
            right: 18,
            height: 1,
            backgroundColor: 'rgba(123,230,255,0.20)',
          }}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Animated.View style={avatarFloatStyle}>
            <View
              style={{
                width: compact ? 48 : 54,
                height: compact ? 48 : 54,
                borderRadius: 18,
                backgroundColor: ui.colors.panel2,
                borderWidth: 1,
                borderColor: ui.colors.line,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'visible',
              }}
            >
              <Animated.View
                pointerEvents="none"
                style={[
                  {
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    bottom: -4,
                    left: -4,
                    borderRadius: 22,
                    borderWidth: 1,
                    borderColor: 'rgba(123,230,255,0.32)',
                  },
                  avatarPulseStyle,
                ]}
              />
              {dkd_profile_avatar_image_url ? (
                <Image
                  source={{ uri: dkd_profile_avatar_image_url }}
                  style={{ width: compact ? 48 : 54, height: compact ? 48 : 54, borderRadius: 18 }}
                  contentFit="cover"
                  transition={120}
                />
              ) : (
                <Text style={{ fontSize: compact ? 22 : 24 }}>{avatarEmoji}</Text>
              )}
            </View>
          </Animated.View>

          <View style={{ flex: 1, marginLeft: 12, paddingRight: 10 }}>
            <Text style={{ color: ui.colors.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 }}>LOOTONIA</Text>
            <Text style={{ color: ui.colors.text, fontSize: compact ? 19 : 21, fontWeight: '900', marginTop: 2 }} numberOfLines={1}>{nickname}</Text>
            <Text style={{ color: ui.colors.soft, fontSize: 11, fontWeight: '700', marginTop: 3 }} numberOfLines={1}>
              Lvl {prog.level} • {prog.rankLabel || 'Avcı'}
            </Text>
          </View>

          <Animated.View style={levelAnimatedStyle}>
            <View
              style={{
                borderRadius: 999,
                backgroundColor: 'rgba(246,197,95,0.14)',
                borderWidth: 1,
                borderColor: 'rgba(246,197,95,0.28)',
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <Text style={{ color: ui.colors.text, fontSize: 11, fontWeight: '900' }}>LVL {prog.level}</Text>
            </View>
          </Animated.View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <MetricChip icon="wallet-outline" label="CÜZDAN" value={walletText || '0 TL'} />
          <MetricChip icon="cash-multiple" label="TOKEN" value={tokenText || '0'} animatedStyle={tokenAnimatedStyle} />
          <MetricChip icon="diamond-stone" label="SHARD" value={shardText} />
        </View>

        {!compact ? (
          <TaskCta dailyRewardState={dailyRewardState} onOpenDailyReward={onOpenDailyReward} onOpenTasks={onOpenTasks} />
        ) : null}
      </View>
    </View>
  );
}

function areHeaderOverlayPropsEqual(prev, next) {
  return prev.tokenScale === next.tokenScale
    && prev.tokenText === next.tokenText
    && prev.walletText === next.walletText
    && Number(prev?.energyUI?.energy || 0) === Number(next?.energyUI?.energy || 0)
    && Number(prev?.energyUI?.max || 0) === Number(next?.energyUI?.max || 0)
    && String(prev?.profile?.nickname || '') === String(next?.profile?.nickname || '')
    && String(prev?.profile?.avatar_emoji || '') === String(next?.profile?.avatar_emoji || '')
    && Number(prev?.profile?.level || 0) === Number(next?.profile?.level || 0)
    && Number(prev?.profile?.xp || 0) === Number(next?.profile?.xp || 0)
    && String(prev?.profile?.rank_key || '') === String(next?.profile?.rank_key || '')
    && Number(prev?.profile?.shards || 0) === Number(next?.profile?.shards || 0)
    && Number(prev?.dailyRewardState?.claimableCount || 0) === Number(next?.dailyRewardState?.claimableCount || 0)
    && Number(prev?.dailyRewardState?.streak || 0) === Number(next?.dailyRewardState?.streak || 0)
    && !!prev.compact === !!next.compact;
}

export default memo(HeaderOverlay, areHeaderOverlayPropsEqual);
