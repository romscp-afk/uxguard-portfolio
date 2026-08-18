import { router } from 'expo-router';
import { Alert, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { Screen } from '@/components/ui/Screen';
import { EXPERIENCE_LEVELS } from '@/lib/config';
import { useAuth } from '@/providers/AuthProvider';
import { color, type } from '@/theme/tokens';

const colors = color.light;

export default function ProfileScreen() {
  const { session, profile, preferences, signOut } = useAuth();
  const level = EXPERIENCE_LEVELS.find((item) => item.value === profile?.experience_level)?.label;

  if (!session) {
    return (
      <Screen scroll>
        <Logo compact />
        <Text style={styles.name}>Guest</Text>
        <Text style={styles.meta}>
          Browse published case studies without an account. Sign in to save content, complete challenges, and redeem
          UXGuard Points.
        </Text>
        <Button label="Sign in" onPress={() => router.push('/(auth)/login')} />
        <Button label="Create an account" variant="secondary" onPress={() => router.push('/(auth)/register')} />
        <Button label="Privacy policy" variant="ghost" onPress={() => router.push('/legal/privacy')} />
        <Button label="Terms" variant="ghost" onPress={() => router.push('/legal/terms')} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text style={styles.name}>{profile?.display_name || 'Member'}</Text>
      <Text style={styles.meta}>@{profile?.username}</Text>
      <Text style={styles.meta}>{level || 'Experience not set'}</Text>
      <Text style={styles.meta}>{profile?.points_balance_cached ?? 0} UXGuard Points</Text>
      <Text style={styles.meta}>{preferences?.interest_ids?.length || 0} interests selected</Text>
      <Button label="Interests and experience" variant="secondary" onPress={() => router.push('/preferences')} />
      <Button label="Points history" variant="secondary" onPress={() => router.push('/points')} />
      <Button label="Saved content" variant="secondary" onPress={() => router.push('/saved')} />
      <Button label="Notifications" variant="secondary" onPress={() => router.push('/notifications')} />
      <Button label="Settings" variant="secondary" onPress={() => router.push('/settings')} />
      <Button label="Privacy policy" variant="ghost" onPress={() => router.push('/legal/privacy')} />
      <Button label="Terms" variant="ghost" onPress={() => router.push('/legal/terms')} />
      <Button
        label="Sign out"
        variant="secondary"
        onPress={() => {
          Alert.alert('Sign out?', 'You can sign back in anytime.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Sign out',
              onPress: async () => {
                await signOut();
                router.replace('/(tabs)');
              },
            },
          ]);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { ...type.display, color: colors.text },
  meta: { ...type.body, color: colors.textSecondary },
});
