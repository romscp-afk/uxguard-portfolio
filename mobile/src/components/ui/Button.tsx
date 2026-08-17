import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { color, radius, touch, type } from '@/theme/tokens';

const colors = color.light;

type Props = PressableProps & {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
};

export function Button({ label, variant = 'primary', disabled, ...rest }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      {...rest}>
      <Text style={[styles.label, variant === 'primary' && styles.labelOnBrand, variant === 'danger' && styles.labelOnDanger]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touch.min,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primary: { backgroundColor: colors.brand },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  danger: { backgroundColor: colors.danger },
  ghost: { backgroundColor: 'transparent' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  label: { ...type.bodyMedium, color: colors.text },
  labelOnBrand: { color: '#ffffff' },
  labelOnDanger: { color: '#ffffff' },
});
