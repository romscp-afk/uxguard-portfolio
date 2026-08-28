import { Fraunces_700Bold, useFonts as useFraunces } from '@expo-google-fonts/fraunces';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, useFonts as useInter } from '@expo-google-fonts/inter';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { type ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/providers/AuthProvider';
import { color } from '@/theme/tokens';

const colors = color.light;
const STARTUP_TIMEOUT_MS = 5000;

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export function AppProviders({ children }: { children: ReactNode }) {
  const [interLoaded] = useInter({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold });
  const [frauncesLoaded] = useFraunces({ Fraunces_700Bold });
  const [timedOut, setTimedOut] = useState(false);
  const fontsReady = interLoaded && frauncesLoaded;
  const appReady = fontsReady || timedOut;

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), STARTUP_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (appReady) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [appReady]);

  if (!appReady) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.brand} accessibilityLabel="Loading UXGuard Studio" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandText,
  },
});
