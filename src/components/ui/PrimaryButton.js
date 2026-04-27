import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { tapFeedback, softImpact } from '../../services/feedbackService';
import { getFeatureTone } from '../../theme/featureTones';

export default function PrimaryButton({
  label,
  onPress,
  icon = 'rocket-launch-outline',
  disabled = false,
  style,
  textStyle,
  tone = 'gold',
}) {
  const palette = getFeatureTone(tone);
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () => Animated.spring(scale, { toValue: 0.985, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        if (disabled) return;
        softImpact();
        tapFeedback();
        onPress?.();
      }}
      onPressIn={pressIn}
      onPressOut={pressOut}
      style={style}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <LinearGradient colors={disabled ? ['#394255', '#2A3142'] : palette.button} style={[styles.shell, { borderColor: disabled ? 'rgba(255,255,255,0.10)' : palette.border }, disabled && styles.disabled]}>
          <View style={styles.innerGlow} />
          <MaterialCommunityIcons name={icon} size={18} color={disabled ? '#CBD4E7' : palette.buttonText} />
          <Text style={[styles.label, { color: disabled ? '#E6EEFF' : palette.buttonText }, textStyle]}>{label}</Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    minHeight: 56,
    borderRadius: 18,
    paddingHorizontal: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    overflow: 'hidden',
  },
  innerGlow: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: 7,
    height: '42%',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  label: {
    fontSize: 15,
    fontWeight: '900',
    marginLeft: 8,
  },
  disabled: {
    shadowOpacity: 0,
  },
});
