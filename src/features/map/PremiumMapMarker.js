import React, { memo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const MARKER_ASSETS = {
  boss: require('../../../assets/mapmarkers/boss.png'),
  qr: require('../../../assets/mapmarkers/qr.png'),
  map: require('../../../assets/mapmarkers/map.png'),
  metro: require('../../../assets/mapmarkers/metro.png'),
  cafe: require('../../../assets/mapmarkers/cafe.png'),
  park: require('../../../assets/mapmarkers/park.png'),
  mall: require('../../../assets/mapmarkers/mall.png'),
  restaurant: require('../../../assets/mapmarkers/restaurant.png'),
  default: require('../../../assets/mapmarkers/default.png'),
};

const ACTIVE_RING = require('../../../assets/mapmarkers/active_ring.png');

export function resolveMarkerKey(drop = {}) {
  const type = String(drop?.type || '').toLowerCase();
  const name = String(drop?.name || '').toLowerCase();
  if (type === 'boss') return 'boss';
  if (type === 'qr') return 'qr';
  if (type === 'map') return 'map';
  if (type === 'metro' || name.includes('metro')) return 'metro';
  if (type === 'cafe' || name.includes('kafe') || name.includes('cafe')) return 'cafe';
  if (type === 'park' || name.includes('park') || name.includes('gençlik')) return 'park';
  if (type === 'mall' || name.includes('avm') || name.includes('market') || name.includes('alışveriş')) return 'mall';
  if (type === 'restaurant' || name.includes('restaurant') || name.includes('restoran')) return 'restaurant';
  return 'default';
}

export function resolveMarkerAsset(drop = {}) {
  return MARKER_ASSETS[resolveMarkerKey(drop)] || MARKER_ASSETS.default;
}

function getRewardBadgeText(drop = {}) {
  const raw = String(drop?.reward_badge_label || drop?.reward_label || '').trim();
  if (!raw) return 'ÖDÜL';
  return raw.length > 12 ? `${raw.slice(0, 12)}…` : raw.toUpperCase();
}

function PremiumMapMarker({ drop, active = false, near = false, cooldown = false, showRewardBadge = false }) {
  return (
    <View style={styles.wrap}>
      {active ? <Image source={ACTIVE_RING} style={styles.ring} resizeMode="contain" /> : null}

      <View style={[
        styles.statusDot,
        active && styles.statusDotActive,
        near ? styles.statusDotNear : null,
        cooldown ? styles.statusDotCooldown : null,
      ]} />

      {showRewardBadge ? (
        <View style={[styles.rewardPill, active && styles.rewardPillActive]}>
          <Text style={styles.rewardPillText}>{getRewardBadgeText(drop)}</Text>
        </View>
      ) : null}

      {showRewardBadge ? (
        <View style={[styles.rewardSeal, active && styles.rewardSealActive]}>
          <MaterialCommunityIcons name="gift" size={15} color="#241606" />
        </View>
      ) : null}

      <Image
        source={resolveMarkerAsset(drop)}
        style={[styles.icon, active && styles.iconActive]}
        resizeMode="contain"
        fadeDuration={0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 92,
    height: 122,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  ring: {
    position: 'absolute',
    top: 4,
    width: 76,
    height: 76,
    opacity: 0.98,
  },
  icon: {
    width: 72,
    height: 96,
    marginTop: 8,
  },
  iconActive: {
    transform: [{ scale: 1.05 }],
  },
  statusDot: {
    position: 'absolute',
    top: 10,
    right: 16,
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: '#7BE6FF',
    borderWidth: 2,
    borderColor: '#06111D',
    zIndex: 4,
  },
  statusDotActive: {
    width: 14,
    height: 14,
  },
  statusDotNear: {
    backgroundColor: '#58E2AB',
  },
  statusDotCooldown: {
    backgroundColor: '#B39AFF',
  },
  rewardPill: {
    position: 'absolute',
    top: -4,
    minWidth: 42,
    maxWidth: 82,
    paddingHorizontal: 8,
    height: 22,
    borderRadius: 999,
    backgroundColor: '#FFCF58',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  rewardPillActive: {
    top: -6,
  },
  rewardPillText: {
    color: '#241606',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  rewardSeal: {
    position: 'absolute',
    right: 10,
    top: 34,
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFCF58',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.24)',
    zIndex: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  rewardSealActive: {
    top: 30,
    transform: [{ scale: 1.04 }],
  },
});

export default memo(PremiumMapMarker);
