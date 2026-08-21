import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

const wordmark = require('../../../assets/images/logo.png');
const shield = require('../../../assets/images/logo-icon.png');

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Image
      source={compact ? shield : wordmark}
      style={compact ? styles.icon : styles.wordmark}
      contentFit="contain"
      accessibilityLabel="UXGuard Studio"
      accessibilityIgnoresInvertColors
    />
  );
}

const styles = StyleSheet.create({
  wordmark: { width: 200, height: 44 },
  icon: { width: 36, height: 40 },
});
