import { Fraunces_700Bold, useFonts as useFraunces } from '@expo-google-fonts/fraunces';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, useFonts as useInter } from '@expo-google-fonts/inter';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { type ReactNode, useEffect } from 'react';

import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/providers/AuthProvider';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export function AppProviders({ children }: { children: ReactNode }) {
  const [interLoaded] = useInter({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold });
  const [frauncesLoaded] = useFraunces({ Fraunces_700Bold });
  const fontsReady = interLoaded && frauncesLoaded;

  useEffect(() => {
    if (fontsReady) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsReady]);

  if (!fontsReady) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
