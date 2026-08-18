import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import type { NotificationPreferences } from '@/types/domain';

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Timed out')), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

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

  const permission = await withTimeout(Notifications.requestPermissionsAsync(), 20000);
  if (permission.status !== 'granted') {
    return { granted: false, sendingEnabled };
  }

  // iOS Simulator / Expo Go can hang forever on getExpoPushTokenAsync.
  // Permission is enough for onboarding; token storage can wait for a device build.
  if (!Device.isDevice) {
    return { granted: true, sendingEnabled };
  }

  try {
    const projectId =
      Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
    const token = await withTimeout(
      Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined),
      8000,
    );
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
