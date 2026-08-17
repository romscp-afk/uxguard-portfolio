import { router } from 'expo-router';
import { Alert, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { AuthGate } from '@/components/auth/AuthGate';
import { useAuth } from '@/providers/AuthProvider';
import { color, type } from '@/theme/tokens';

const colors = color.light;

export default function SettingsScreen() {
  const { deleteAccount } = useAuth();

  return (
    <AuthGate title="Sign in to manage your account" message="Account settings, including deletion, require a mobile account.">
    <Screen scroll>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.body}>
        This app uses a mobile Supabase account. Deleting it removes mobile learning data. It does not delete your
        website portfolio until identity is unified.
      </Text>
      <Button label="Interests and experience" variant="secondary" onPress={() => router.push('/preferences')} />
      <Button label="Notification preferences" variant="secondary" onPress={() => router.push('/notifications')} />
      <Button label="Privacy policy" variant="secondary" onPress={() => router.push('/legal/privacy')} />
      <Button label="Terms" variant="secondary" onPress={() => router.push('/legal/terms')} />
      <Button
        label="Delete account"
        variant="danger"
        onPress={() => {
          Alert.alert(
            'Delete your mobile account?',
            'This removes your mobile profile, points, and learning history. It cannot be undone.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  await deleteAccount();
                  router.replace('/(auth)/login');
                },
              },
            ],
          );
        }}
      />
    </Screen>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  title: { ...type.display, color: colors.text },
  body: { ...type.body, color: colors.textSecondary },
});
