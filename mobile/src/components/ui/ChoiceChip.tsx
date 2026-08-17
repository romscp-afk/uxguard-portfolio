import { Pressable, StyleSheet, Text } from 'react-native';

import { color, radius, touch, type } from '@/theme/tokens';

const colors = color.light;

export function ChoiceChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={[styles.chip, selected && styles.selected]}>
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: touch.min,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  selected: {
    backgroundColor: colors.brandMuted,
    borderColor: colors.brand,
  },
  label: { ...type.bodyMedium, color: colors.text },
  labelSelected: { color: colors.brandText },
});
