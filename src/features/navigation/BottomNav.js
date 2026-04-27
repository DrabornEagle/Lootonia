import React, { memo } from 'react';
import { Alert, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getFeatureGate, isFeatureUnlocked } from '../../utils/unlocks';
import { tapFeedback } from '../../services/feedbackService';

const ITEMS = [
  { key: 'map', label: 'Harita', icon: 'map-marker-radius-outline' },
  { key: 'chest', label: 'Sandıklar', icon: 'treasure-chest-outline' },
  { key: 'ally', label: 'Sohbet', icon: 'message-badge-outline' },
  { key: 'courier', label: 'Kurye-Kargo', icon: 'truck-fast-outline' },
  { key: 'leader', label: 'Sıralama', icon: 'podium-gold', gateKey: 'leader' },
];

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const NAV_COMPACT = SCREEN_W <= 430 || SCREEN_H <= 900;

function getItemTone(key) {
  switch (key) {
    case 'map':
      return {
        glow: ['rgba(64,225,255,0.22)', 'rgba(64,225,255,0.08)'],
        tint: 'rgba(64,225,255,0.10)',
        border: 'rgba(64,225,255,0.24)',
        icon: '#8DEFFF',
        dot: '#63E1FF',
      };
    case 'chest':
      return {
        glow: ['rgba(175,124,255,0.24)', 'rgba(175,124,255,0.08)'],
        tint: 'rgba(175,124,255,0.10)',
        border: 'rgba(175,124,255,0.24)',
        icon: '#D8C1FF',
        dot: '#AF7CFF',
      };
    case 'ally':
      return {
        glow: ['rgba(103,227,255,0.24)', 'rgba(68,122,255,0.08)'],
        tint: 'rgba(103,227,255,0.10)',
        border: 'rgba(103,227,255,0.24)',
        icon: '#BFEFFF',
        dot: '#63E1FF',
      };
    case 'courier':
      return {
        glow: ['rgba(103,225,155,0.24)', 'rgba(35,123,77,0.08)'],
        tint: 'rgba(103,225,155,0.10)',
        border: 'rgba(103,225,155,0.24)',
        icon: '#9AF0BF',
        dot: '#67E19B',
      };
    case 'leader':
      return {
        glow: ['rgba(255,213,108,0.24)', 'rgba(142,103,27,0.08)'],
        tint: 'rgba(255,213,108,0.10)',
        border: 'rgba(255,213,108,0.24)',
        icon: '#FFE39A',
        dot: '#FFD56C',
      };
    default:
      return {
        glow: ['rgba(99,212,255,0.20)', 'rgba(99,212,255,0.08)'],
        tint: 'rgba(99,212,255,0.08)',
        border: 'rgba(99,212,255,0.20)',
        icon: '#F7F8FC',
        dot: '#63D4FF',
      };
  }
}

function runItem(item, profile, handlers) {
  if (item.gateKey && !isFeatureUnlocked(profile, item.gateKey)) {
    const gate = getFeatureGate(item.gateKey);
    Alert.alert('Kilitli', `${gate?.label || item.label} için Lvl ${gate?.level || 1} gerekir.`);
    return;
  }

  tapFeedback();

  switch (item.key) {
    case 'map':
      handlers.onChange?.('map');
      handlers.onOpenMap?.();
      break;
    case 'chest':
      handlers.onOpenDropList?.();
      break;
    case 'ally':
      handlers.onChange?.('ally');
      break;
    case 'courier':
      handlers.onOpenCourier?.();
      break;
    case 'leader':
      handlers.onOpenLeaderboard?.();
      break;
    default:
      break;
  }
}

function NavItem({ item, active, onPress }) {
  const tone = getItemTone(item.key);

  return (
    <Pressable onPress={onPress} style={styles.itemShell}>
      {active ? <LinearGradient colors={tone.glow} style={StyleSheet.absoluteFillObject} /> : null}
      {active ? <View style={[styles.itemActiveGlow, { backgroundColor: tone.tint }]} /> : null}
      <View style={[styles.iconWrap, { borderColor: tone.border, backgroundColor: tone.tint }, active && styles.iconWrapActive]}>
        <MaterialCommunityIcons name={item.icon} size={NAV_COMPACT ? 15 : 16} color={tone.icon} />
      </View>
      <Text style={[styles.itemLabel, { color: tone.icon }, active && styles.itemLabelActive]}>{item.label}</Text>
      {active ? <View style={[styles.activeDot, { backgroundColor: tone.dot }]} /> : null}
    </Pressable>
  );
}

function BottomNav({
  active,
  profile,
  onChange,
  onOpenMap,
  onOpenDropList,
  onOpenCourier,
  onOpenLeaderboard,
}) {
  const dkd_safe_insets = useSafeAreaInsets();
  const dkd_bottom_offset_value = Math.max(dkd_safe_insets.bottom + 10, 18);
  const activeKey = ITEMS.some((item) => item.key === active) ? active : 'map';
  const handlers = { onChange, onOpenMap, onOpenDropList, onOpenCourier, onOpenLeaderboard };

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: dkd_bottom_offset_value }]}>
      <LinearGradient colors={['rgba(7,11,20,0.97)', 'rgba(9,14,24,0.90)']} style={styles.shell}>
        <View pointerEvents="none" style={styles.shellGlow} />
        {ITEMS.map((item) => (
          <NavItem
            key={item.key}
            item={item}
            active={activeKey === item.key}
            onPress={() => runItem(item, profile, handlers)}
          />
        ))}
      </LinearGradient>
    </View>
  );
}

function areBottomNavPropsEqual(prev, next) {
  return prev.active === next.active
    && Number(prev?.profile?.level || 0) === Number(next?.profile?.level || 0)
    && prev.onOpenMap === next.onOpenMap
    && prev.onOpenDropList === next.onOpenDropList
    && prev.onOpenCourier === next.onOpenCourier
    && prev.onOpenLeaderboard === next.onOpenLeaderboard;
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    zIndex: 40,
  },
  shell: {
    borderRadius: NAV_COMPACT ? 18 : 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 4,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
  },
  shellGlow: {
    position: 'absolute',
    top: -14,
    alignSelf: 'center',
    width: 138,
    height: 70,
    borderRadius: 999,
    backgroundColor: 'rgba(99,212,255,0.05)',
  },
  itemShell: {
    flex: 1,
    minHeight: NAV_COMPACT ? 50 : 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  itemActiveGlow: {
    position: 'absolute',
    top: 2,
    width: NAV_COMPACT ? 34 : 36,
    height: NAV_COMPACT ? 34 : 36,
    borderRadius: 20,
  },
  iconWrap: {
    width: NAV_COMPACT ? 28 : 30,
    height: NAV_COMPACT ? 28 : 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    transform: [{ scale: 1.03 }],
  },
  itemLabel: {
    color: 'rgba(247,248,252,0.72)',
    marginTop: 5,
    fontSize: NAV_COMPACT ? 11 : 12,
    fontWeight: '900',
  },
  itemLabelActive: {
    color: '#FFFFFF',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
});

export default memo(BottomNav, areBottomNavPropsEqual);
