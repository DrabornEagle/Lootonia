import React, { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const PALETTE = {
  common: ['rgba(33,212,253,0.94)', 'rgba(11,28,52,0.96)'],
  rare: ['rgba(124,92,255,0.96)', 'rgba(18,26,52,0.96)'],
  epic: ['rgba(183,33,255,0.96)', 'rgba(18,14,42,0.96)'],
  legendary: ['rgba(246,208,107,0.96)', 'rgba(40,22,10,0.96)'],
};

function AchievementToast({ toast, onPress, onDismiss }) {
  if (!toast?.id) return null;
  const colors = PALETTE[toast?.rarity] || PALETTE.common;

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 12, right: 12, top: 170, zIndex: 24 }}>
      <Pressable onPress={onPress} style={{ borderRadius: 18, overflow: 'hidden' }}>
        <LinearGradient colors={colors} style={{ paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: 'rgba(255,255,255,0.78)', fontWeight: '900', fontSize: 11, letterSpacing: 0.8 }}>BAŞARIM GÜNCELLENDİ</Text>
              <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 15, marginTop: 4 }} numberOfLines={1}>{toast?.title || 'Başarım'}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.84)', fontWeight: '700', marginTop: 4 }} numberOfLines={2}>{toast?.subtitle || 'Rozet vitrini güncellendi.'}</Text>
            </View>
            <Pressable onPress={onDismiss} hitSlop={10} style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' }}>
              <Text style={{ color: '#FFFFFF', fontWeight: '900' }}>✕</Text>
            </Pressable>
          </View>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

export default memo(AchievementToast);
