import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { color, radius, space, type } from '@/theme/tokens';

const colors = color.light;

type Props = TextInputProps & {
  label: string;
  error?: string;
};

export function TextField({ label, error, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        textAlignVertical={rest.multiline ? 'top' : 'center'}
        style={[styles.input, rest.multiline ? styles.area : null, error ? styles.inputError : null]}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  label: { ...type.label, color: colors.textSecondary },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    ...type.body,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  area: { minHeight: 120, paddingVertical: space.md },
  inputError: { borderColor: colors.danger },
  error: { ...type.caption, color: colors.danger },
});
