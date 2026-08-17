import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import {
  getNotificationPreferences,
  listNotifications,
  markNotificationsRead,
  registerPushDevice,
  updateNotificationPreferences,
} from '@/api/notifications';
import { AuthGate } from '@/components/auth/AuthGate';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/States';
import { useAuth } from '@/providers/AuthProvider';
import { color, space, type } from '@/theme/tokens';

const colors = color.light;

export default function NotificationsScreen() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const prefs = useQuery({
    queryKey: ['notification-prefs', userId],
    queryFn: () => getNotificationPreferences(userId!),
    enabled: Boolean(userId),
  });
  const inbox = useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => listNotifications(userId!),
    enabled: Boolean(userId),
  });

  useEffect(() => {
    if (userId) markNotificationsRead(userId).catch(() => undefined);
  }, [userId]);

  async function toggle(key: 'challenges' | 'articles' | 'rewards' | 'marketing', value: boolean) {
    if (!userId) return;
    await updateNotificationPreferences(userId, { [key]: value });
    prefs.refetch();
  }

  return (
    <AuthGate title="Sign in for notifications" message="Notification preferences and inbox require a mobile account. Push sending stays off until backend configuration is confirmed.">
    <Screen scroll>
      <Text style={styles.body}>
        Records are stored in Supabase. Push sending stays off until backend configuration is confirmed.
      </Text>
      <Button
        label="Enable device notifications"
        variant="secondary"
        onPress={() => userId && registerPushDevice(userId)}
      />
      {prefs.data ? (
        <View style={styles.list}>
          {(
            [
              ['challenges', 'Challenges'],
              ['articles', 'Articles'],
              ['rewards', 'Rewards'],
              ['marketing', 'Marketing'],
            ] as const
          ).map(([key, label]) => (
            <View key={key} style={styles.row}>
              <Text style={styles.label}>{label}</Text>
              <Switch
                accessibilityLabel={label}
                value={Boolean(prefs.data?.[key])}
                onValueChange={(value) => toggle(key, value)}
              />
            </View>
          ))}
        </View>
      ) : null}
      <Text style={styles.title}>Inbox</Text>
      {!inbox.data?.length ? <EmptyState title="No notifications" message="New items will appear here." /> : null}
      {(inbox.data || []).map((item) => (
        <Card
          key={item.id}
          onPress={() => {
            const path = item.data?.path;
            if (typeof path === 'string') router.push(path as never);
          }}>
          <Text style={styles.label}>{item.title}</Text>
          <Text style={styles.body}>{item.body}</Text>
        </Card>
      ))}
    </Screen>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  title: { ...type.title, color: colors.text },
  body: { ...type.body, color: colors.textSecondary },
  label: { ...type.bodyMedium, color: colors.text },
  list: { gap: space.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 },
});
