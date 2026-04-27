import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cityLootTheme } from '../../theme/cityLootTheme';

export default function SafeScreen({ style, children }) {
  const dkd_safe_background = cityLootTheme.colors.bgTop;
  return (
    <SafeAreaView edges={['top']} style={[{ flex: 1, backgroundColor: dkd_safe_background }, style]}>
      <StatusBar barStyle="light-content" backgroundColor={dkd_safe_background} translucent={false} />
      {children}
    </SafeAreaView>
  );
}
