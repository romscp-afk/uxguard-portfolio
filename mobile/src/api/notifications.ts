import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { supabase } from '@/lib/supabase';
import type { NotificationPreferences } from '@/types/domain';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as NotificationPreferences | null;
}

export async function updateNotificationPreferences(
  userId: string,
  patch: Partial<NotificationPreferences>,
) {
  const { error } = await supabase
    .from('notification_preferences')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (error) throw error;
}

export async function listNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data || [];
}

export async function markNotificationsRead(userId: string) {
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
}

export async function registerPushDevice(userId: string) {
  const { data: settings } = await supabase.from('app_settings').select('value').eq('key', 'push_sending_enabled').maybeSingle();
  const sendingEnabled = settings?.value === true || settings?.value === 'true';

  const permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') {
    return { granted: false, sendingEnabled };
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync();
    await supabase.from('push_devices').upsert(
      {
        user_id: userId,
        expo_push_token: token.data,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'expo_push_token' },
    );
    return { granted: true, sendingEnabled, token: token.data };
  } catch {
    return { granted: true, sendingEnabled };
  }
}
