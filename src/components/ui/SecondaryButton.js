import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { tapFeedback } from '../../services/feedbackService';
import { getFeatureTone } from '../../theme/featureTones';

export default function SecondaryButton({
  label,
  onPress,
  icon = 'arrow-right',
  style,
  tone = 'ghost',
  size = 'regular',
  fullWidth = true,
  disabled = false,
}) {
  const palette = getFeatureTone(tone === 'blue' ? 'nav' : tone);
  const compact = size === 'compact';

  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        if (disabled) return;
        tapFeedback();
        onPress?.();
      }}
      style={[!fullWidth && styles.inline, style, disabled && styles.disabledWrap]}
    >
      <LinearGradient colors={palette.button} style={[
        styles.shell,
        compact && styles.shellCompact,
        { borderColor: palette.border },
        !fullWidth && styles.inlineShell,
      ]}>
        <MaterialCommunityIcons name={icon} size={compact ? 16 : 18} color={palette.buttonText} />
        <Text style={[styles.label, { color: palette.buttonText }, compact && styles.labelCompact]}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  inline: {
    alignSelf: 'flex-start',
  },
  shell: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  inlineShell: {
    minWidth: 0,
  },
  shellCompact: {
    minHeight: 42,
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '900',
    marginLeft: 8,
  },
  labelCompact: {
    fontSize: 13,
  },
  disabledWrap: {
    opacity: 0.65,
  },
});
