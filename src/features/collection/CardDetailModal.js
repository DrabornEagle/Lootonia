import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import FuturisticCardTile from './FuturisticCardTile';
import { skylineCardDesign } from '../../utils/cards';
import { trRarity } from '../../utils/text';
import { cityLootTheme } from '../../theme/cityLootTheme';

function ActionButton({ label, onPress, alt = false, icon }) {
  const colors = alt
    ? ['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.08)']
    : ['#69E7FF', '#2B7BFF'];

  return (
    <Pressable onPress={onPress} style={styles.actionButtonWrap}>
      <LinearGradient colors={colors} style={styles.actionButtonFill}>
        {!!icon && <MaterialCommunityIcons name={icon} size={16} color={alt ? '#FFFFFF' : '#041628'} style={{ marginRight: 8 }} />}
        <Text style={[styles.actionButtonText, alt ? { color: '#FFFFFF' } : { color: '#041628' }]}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

function InfoCell({ label, value }) {
  return (
    <View style={styles.infoCell}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

export default function CardDetailModal({ visible, card, onClose, isFavorite, onToggleFavorite }) {
  const scale = useRef(new Animated.Value(0.95)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, speed: 18, bounciness: 5, useNativeDriver: true }),
      ]).start();
    } else {
      opacity.setValue(0);
      scale.setValue(0.95);
    }
  }, [visible, opacity, scale]);

  if (!card) return null;

  const name = card.name || 'Kart';
  const rarity = card.rarity || 'COMMON';
  const series = card.series || 'SKYLINE';
  const theme = card.theme || 'CITY STOCK';
  const dropType = card.dropType || card.drop_type || card.drop || '';
  const dkd_day_value = skylineCardDesign({ rarity, series, theme, dropType, seed: `${name}-${series}-${theme}-${rarity}` });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[styles.sheet, { opacity, transform: [{ scale }] }]}> 
          <View style={[styles.aura, { backgroundColor: dkd_day_value.glow }]} />
          <LinearGradient colors={[cityLootTheme.colors.bgTop, cityLootTheme.colors.bgMid, cityLootTheme.colors.bgBottom]} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.00)']} style={styles.shine} />

          <View style={styles.topRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.kicker}>KOLEKSİYON KARTI</Text>
              <Text style={styles.title} numberOfLines={1}>{name}</Text>
              <Text style={styles.sub} numberOfLines={2}>{dkd_day_value.icon} {dkd_day_value.series} • {trRarity(rarity)} • {dkd_day_value.theme}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={18} color="#FFFFFF" />
            </Pressable>
          </View>

          <View style={{ marginTop: 12 }}>
            <FuturisticCardTile
              name={name}
              rarity={rarity}
              series={series}
              theme={theme}
              dropType={dropType}
              imageUrl={card?.art_image_url || card?.image_url || ''}
              serialCode={card?.serial_code || ''}
              compact={false}
            />
          </View>

          <View style={styles.infoGrid}>
            <InfoCell label="Rarity" value={trRarity(rarity)} />
            <InfoCell label="Seri" value={dkd_day_value.series} />
            <InfoCell label="Tema" value={dkd_day_value.theme} />
            <InfoCell label="Sandık" value={dkd_day_value.dropBadge || '-'} />
          </View>

          <View style={styles.footerRow}>
            <ActionButton
              label={isFavorite ? 'Favoriden Çıkar' : 'Favoriye Al'}
              onPress={onToggleFavorite}
              alt
              icon={isFavorite ? 'star-off-outline' : 'star-outline'}
            />
            <ActionButton label="Tamam" onPress={onClose} icon="check" />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,12,0.84)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  sheet: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 18,
    backgroundColor: 'rgba(8,14,24,0.96)',
  },
  aura: {
    position: 'absolute',
    right: -20,
    top: -20,
    width: 160,
    height: 160,
    borderRadius: 160,
    opacity: 0.7,
  },
  shine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 160,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  kicker: {
    color: cityLootTheme.colors.cyanSoft,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 8,
  },
  sub: {
    color: cityLootTheme.colors.textSoft,
    marginTop: 6,
    fontWeight: '700',
    lineHeight: 20,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
    marginHorizontal: -4,
  },
  infoCell: {
    width: '50%',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  infoLabel: {
    color: cityLootTheme.colors.textMuted,
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  infoValue: {
    color: '#FFFFFF',
    fontWeight: '900',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionButtonWrap: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionButtonFill: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  actionButtonText: {
    fontWeight: '900',
  },
});
