import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { color, type } from '@/theme/tokens';

const colors = color.light;

export default function WelcomeScreen() {
  return (
    <Screen scroll>
      <Text style={styles.kicker}>Welcome</Text>
      <Text style={styles.title}>Professional UX learning, on your phone.</Text>
      <Text style={styles.body}>
        Discover case studies, take short challenges, and unlock studio rewards with UXGuard Points. Sponsored
        content is labelled. You never earn points for viewing ads.
      </Text>
      <Button label="Continue" onPress={() => router.push('/(onboarding)/interests')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: { ...type.label, color: colors.brandText, textTransform: 'uppercase', letterSpacing: 1.4 },
  title: { ...type.display, color: colors.text },
  body: { ...type.body, color: colors.textSecondary },
});
