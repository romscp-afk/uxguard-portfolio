import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useOnboardingDraft } from '@/features/onboarding/context';
import { Button } from '@/components/ui/Button';
import { ChoiceChip } from '@/components/ui/ChoiceChip';
import { Screen } from '@/components/ui/Screen';
import { EXPERIENCE_LEVELS } from '@/lib/config';
import { color, space, type } from '@/theme/tokens';

const colors = color.light;

export default function ExperienceScreen() {
  const { experienceLevel, setExperienceLevel } = useOnboardingDraft();

  return (
    <Screen scroll>
      <Text style={styles.title}>Experience level</Text>
      <Text style={styles.body}>We’ll use this to recommend challenges and reading, not to lock features.</Text>
      <View style={styles.wrap}>
        {EXPERIENCE_LEVELS.map((level) => (
          <ChoiceChip
            key={level.value}
            label={level.label}
            selected={experienceLevel === level.value}
            onPress={() => setExperienceLevel(level.value)}
          />
        ))}
      </View>
      <Button label="Continue" onPress={() => router.push('/(onboarding)/points')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.display, color: colors.text },
  body: { ...type.body, color: colors.textSecondary },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
