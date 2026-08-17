import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { listCategories } from '@/api/content';
import { useOnboardingDraft } from '@/features/onboarding/context';
import { Button } from '@/components/ui/Button';
import { ChoiceChip } from '@/components/ui/ChoiceChip';
import { Screen } from '@/components/ui/Screen';
import { color, space, type } from '@/theme/tokens';

const colors = color.light;

export default function InterestsScreen() {
  const { interestIds, setInterestIds } = useOnboardingDraft();
  const categories = useQuery({ queryKey: ['categories'], queryFn: listCategories });

  function toggle(id: string) {
    setInterestIds(interestIds.includes(id) ? interestIds.filter((item) => item !== id) : [...interestIds, id]);
  }

  return (
    <Screen scroll>
      <Text style={styles.title}>What are you here to learn?</Text>
      <Text style={styles.body}>Pick the topics that should shape your feed.</Text>
      <View style={styles.wrap}>
        {(categories.data || []).map((category) => (
          <ChoiceChip
            key={category.id}
            label={category.name}
            selected={interestIds.includes(category.id)}
            onPress={() => toggle(category.id)}
          />
        ))}
      </View>
      <Button label="Continue" onPress={() => router.push('/(onboarding)/experience')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.display, color: colors.text },
  body: { ...type.body, color: colors.textSecondary },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
