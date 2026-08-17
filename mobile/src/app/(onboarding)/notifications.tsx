import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { registerPushDevice } from '@/api/notifications';
import { useOnboardingDraft } from '@/features/onboarding/context';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/providers/AuthProvider';
import { color, type } from '@/theme/tokens';

const colors = color.light;

export default function NotificationPermissionScreen() {
  const { session, completeOnboarding } = useAuth();
  const { interestIds, experienceLevel } = useOnboardingDraft();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function finish(requestPush: boolean) {
    setBusy(true);
    setMessage('');
    try {
      if (requestPush && session?.user.id) {
        const result = await registerPushDevice(session.user.id);
        if (!result.sendingEnabled) {
          setMessage('Permission saved. Push sending stays off until the backend is confirmed.');
        }
      }
      await completeOnboarding({ interestIds, experienceLevel });
      router.replace('/(tabs)');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not finish onboarding.');
      setBusy(false);
    }
  }

  return (
    <Screen scroll>
      <Text style={styles.title}>Stay in the loop — when you want</Text>
      <Text style={styles.body}>
        Notifications can deep-link you to articles, challenges, and rewards. We will not send campaigns until
        configuration is confirmed. You can skip this and change it later in Settings.
      </Text>
      {message ? <Text style={styles.body}>{message}</Text> : null}
      <Button label="Allow notifications" disabled={busy} onPress={() => finish(true)} />
      <Button label="Not now" variant="secondary" disabled={busy} onPress={() => finish(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.display, color: colors.text },
  body: { ...type.body, color: colors.textSecondary },
});
