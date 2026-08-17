import { StyleSheet, Text, View } from 'react-native';

import { color, radius, space, type } from '@/theme/tokens';

const colors = color.light;

export function Badge({ label, tone = 'brand' }: { label: string; tone?: 'brand' | 'muted' | 'warning' }) {
  return (
    <View style={[styles.badge, tone === 'muted' && styles.muted, tone === 'warning' && styles.warning]} accessible>
      <Text style={[styles.text, tone === 'warning' && styles.warningText]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.brandMuted,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  muted: { backgroundColor: colors.surfaceAlt },
  warning: { backgroundColor: '#fffaeb' },
  text: { ...type.caption, color: colors.brandText, textTransform: 'uppercase', letterSpacing: 0.6 },
  warningText: { color: '#b54708' },
});
