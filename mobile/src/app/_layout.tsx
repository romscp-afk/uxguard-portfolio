import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppProviders } from '@/providers/AppProviders';
import { color } from '@/theme/tokens';

export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerTintColor: color.light.brandText,
          headerTitleStyle: { fontFamily: 'Fraunces_700Bold' },
          contentStyle: { backgroundColor: color.light.background },
        }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="article/[id]" options={{ title: 'Article' }} />
        <Stack.Screen name="case-study/[id]" options={{ title: 'Case study' }} />
        <Stack.Screen name="challenge/[id]" options={{ title: 'Challenge' }} />
        <Stack.Screen name="reward/[id]" options={{ title: 'Reward' }} />
        <Stack.Screen name="campaign/[id]" options={{ title: 'Sponsored' }} />
        <Stack.Screen name="points" options={{ title: 'UXGuard Points' }} />
        <Stack.Screen name="saved" options={{ title: 'Saved' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="preferences" options={{ title: 'Preferences' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
        <Stack.Screen name="legal/[kind]" options={{ title: 'Legal' }} />
      </Stack>
    </AppProviders>
  );
}
