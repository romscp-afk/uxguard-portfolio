import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { palette, space } from '@/theme/tokens';

const shield = require('../../../assets/images/logo-icon.png');

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="UXGuard Studio">
      <Image
        source={shield}
        style={compact ? styles.iconSm : styles.icon}
        contentFit="contain"
        accessibilityIgnoresInvertColors
      />
      <View>
        <Text style={compact ? styles.wordSm : styles.word}>
          <Text style={styles.ux}>UX</Text>
          <Text style={styles.guard}>Guard</Text>
        </Text>
        <View style={compact ? styles.studioRowSm : styles.studioRow}>
          <View style={styles.rule} />
          <Text style={compact ? styles.studioSm : styles.studio}>Studio</Text>
          <View style={styles.rule} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  icon: { width: 44, height: 54 },
  iconSm: { width: 28, height: 34 },
  word: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  wordSm: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.3,
  },
  ux: { color: palette.brand[500] },
  guard: { color: palette.ink[950] },
  studioRow: { marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  studioRowSm: { marginTop: 3, flexDirection: 'row', alignItems: 'center', gap: 6 },
  studio: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    lineHeight: 12,
    color: palette.brand[600],
    textTransform: 'uppercase',
    letterSpacing: 3.2,
  },
  studioSm: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 8,
    lineHeight: 10,
    color: palette.brand[600],
    textTransform: 'uppercase',
    letterSpacing: 2.4,
  },
  rule: { height: StyleSheet.hairlineWidth, width: 12, backgroundColor: palette.brand[500], opacity: 0.4 },
});
