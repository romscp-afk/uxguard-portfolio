import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { color, space, type } from '@/theme/tokens';

const colors = color.light;

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? <Button label="Try again" onPress={onRetry} /> : null}
    </View>
  );
}

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.message}>{label}…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md, paddingVertical: space.xxl, alignItems: 'center' },
  title: { ...type.title, color: colors.text, textAlign: 'center' },
  message: { ...type.body, color: colors.textSecondary, textAlign: 'center' },
});
