import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { color, type } from '@/theme/tokens';

const colors = color.light;

export default function PointsExplainerScreen() {
  return (
    <Screen scroll>
      <Text style={styles.title}>UXGuard Points</Text>
      <Text style={styles.body}>
        Points are earned when you complete approved learning activities, such as challenges. They unlock templates,
        AI credits, reviews, and partner discounts.
      </Text>
      <Text style={styles.body}>
        Points are not cash. They cannot be withdrawn or sent to another person. Viewing or tapping sponsored content
        never awards points.
      </Text>
      <Button label="Continue" onPress={() => router.push('/(onboarding)/notifications')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.display, color: colors.text },
  body: { ...type.body, color: colors.textSecondary },
});
