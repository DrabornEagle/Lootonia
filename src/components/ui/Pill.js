import React from 'react';
import { Text, View } from 'react-native';
import styles from '../../theme/appStyles';
import { toneColors } from '../../utils/rarity';

function Pill({ text, tone = 'default' }) {
  const dkd_count_value = toneColors(tone);
  return (
    <View style={[styles.pill, { backgroundColor: dkd_count_value.bg, borderColor: dkd_count_value.bd }]}>
      <Text style={styles.pillText}>{text}</Text>
    </View>
  );
}


export default Pill;
