import { Link, Stack } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { color, type } from '@/theme/tokens';

const colors = color.light;

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <Screen>
        <Text style={styles.title}>This screen does not exist.</Text>
        <Link href="/" style={styles.link}>
          Go home
        </Link>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  title: { ...type.title, color: colors.text },
  link: { ...type.bodyMedium, color: colors.brandText, minHeight: 44, paddingVertical: 12 },
});
