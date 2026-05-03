import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getFeatureTone } from '../../theme/featureTones';

function HeroAction({ icon, onPress, tone }) {
  if (typeof onPress !== 'function') return null;
  return (
    <Pressable onPress={onPress} style={[styles.actionBtn, { borderColor: tone.badgeBorder, backgroundColor: tone.badgeBg }]}>
      <MaterialCommunityIcons name={icon} size={18} color={tone.accentSoft} />
    </Pressable>
  );
}

export default function SkylineHeroCard({
  eyebrow,
  title,
  subtitle,
  right,
  children,
  icon,
  badgeText,
  onClose,
  onRefresh,
  tone = 'cyan',
  titleStyle,
  subtitleStyle,
  eyebrowStyle,
}) {
  const palette = getFeatureTone(tone);

  return (
    <LinearGradient colors={palette.card} style={[styles.card, { borderColor: palette.panelBorder }]}>
      <View style={[styles.glowOrb, { backgroundColor: palette.glow }]} />
      <View style={styles.topRow}>
        <View style={styles.leftGroup}>
          {icon ? (
            <View style={[styles.iconWrap, { borderColor: palette.badgeBorder, backgroundColor: palette.badgeBg }]}>
              <MaterialCommunityIcons name={icon} size={18} color={palette.accentSoft} />
            </View>
          ) : null}
          <View style={styles.copy}>
            {!!eyebrow && <Text style={[styles.eyebrow, { color: palette.accentSoft }, eyebrowStyle]}>{eyebrow}</Text>}
            <Text style={[styles.title, titleStyle]}>{title}</Text>
            {!!subtitle && <Text style={[styles.subtitle, subtitleStyle]}>{subtitle}</Text>}
          </View>
        </View>

        <View style={styles.actionGroup}>
          {right}
          <HeroAction icon="refresh" onPress={onRefresh} tone={palette} />
          <HeroAction icon="close" onPress={onClose} tone={palette} />
        </View>
      </View>

      {badgeText ? (
        <View style={[styles.badge, { borderColor: palette.badgeBorder, backgroundColor: palette.badgeBg }]}>
          <Text style={[styles.badgeText, { color: palette.accentSoft }]}>{badgeText}</Text>
        </View>
      ) : null}

      {children ? <View style={styles.childrenWrap}>{children}</View> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 18,
    overflow: 'hidden',
  },
  glowOrb: {
    position: 'absolute',
    right: -20,
    top: -18,
    width: 140,
    height: 140,
    borderRadius: 999,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  leftGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 6,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  actionGroup: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
  childrenWrap: {
    marginTop: 12,
  },
});
