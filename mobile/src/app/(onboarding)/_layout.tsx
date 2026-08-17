import { Stack } from 'expo-router';

import { OnboardingProvider } from '@/features/onboarding/context';

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </OnboardingProvider>
  );
}
