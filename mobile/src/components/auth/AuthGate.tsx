import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/providers/AuthProvider';
import { color, type } from '@/theme/tokens';

const colors = color.light;

export function AuthGate({
  children,
  title = 'Sign in to continue',
  message,
}: {
  children: ReactNode;
  title?: string;
  message: string;
}) {
  const { session } = useAuth();
  if (session) return children;

  return (
    <Screen>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{message}</Text>
      <Button label="Sign in" onPress={() => router.push('/(auth)/login')} />
      <Button label="Keep browsing" variant="ghost" onPress={() => router.replace('/(tabs)')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.display, color: colors.text },
  body: { ...type.body, color: colors.textSecondary },
});
