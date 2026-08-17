import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { listCategories } from '@/api/content';
import { AuthGate } from '@/components/auth/AuthGate';
import { Button } from '@/components/ui/Button';
import { ChoiceChip } from '@/components/ui/ChoiceChip';
import { Screen } from '@/components/ui/Screen';
import { EXPERIENCE_LEVELS } from '@/lib/config';
import { useAuth } from '@/providers/AuthProvider';
import { color, space, type } from '@/theme/tokens';

const colors = color.light;

export default function PreferencesScreen() {
  const { preferences, profile, updatePreferences } = useAuth();
  const categories = useQuery({ queryKey: ['categories'], queryFn: listCategories });
  const [interestIds, setInterestIds] = useState<string[]>(preferences?.interest_ids || []);
  const [experienceLevel, setExperienceLevel] = useState(profile?.experience_level || preferences?.experience_level || 'mid');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function toggle(id: string) {
    setInterestIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function onSave() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await updatePreferences({ interestIds, experienceLevel });
      setMessage('Preferences saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save preferences.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthGate title="Sign in to save preferences" message="Interests and experience are stored on your mobile account.">
    <Screen scroll>
      <Text style={styles.title}>Interests and experience</Text>
      <Text style={styles.body}>These shape your feed. They are not used to sell advertising against your profile.</Text>
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
      <Text style={styles.section}>Experience level</Text>
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
      {message ? <Text style={styles.body}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Save" disabled={busy} onPress={onSave} />
      <Button label="Back to profile" variant="ghost" onPress={() => router.back()} />
    </Screen>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  title: { ...type.display, color: colors.text },
  section: { ...type.subtitle, color: colors.text },
  body: { ...type.body, color: colors.textSecondary },
  error: { ...type.caption, color: colors.danger },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
