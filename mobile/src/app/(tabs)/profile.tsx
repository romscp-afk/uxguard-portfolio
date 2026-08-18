import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listPublishedByAuthor } from '@/api/studio';
import { ProfilePortfolio } from '@/components/profile/ProfilePortfolio';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { Screen } from '@/components/ui/Screen';
import { EXPERIENCE_LEVELS } from '@/lib/config';
import { useAuth } from '@/providers/AuthProvider';
import { color, space, type } from '@/theme/tokens';

const colors = color.light;

export default function ProfileScreen() {
  const { session, profile, preferences, signOut } = useAuth();
  const studies = useQuery({
    queryKey: ['profile-studies', profile?.id],
    queryFn: () => listPublishedByAuthor(profile!.id),
    enabled: Boolean(profile?.id),
  });
  const level = EXPERIENCE_LEVELS.find((item) => item.value === profile?.experience_level)?.label;

  if (!session || !profile) {
    return (
      <Screen scroll>
        <Logo compact />
        <Text style={styles.name}>Guest</Text>
        <Text style={styles.meta}>
          Browse published case studies without an account. Sign in to build your UXGuard Studio profile, upload a
          photo, and publish case studies.
        </Text>
        <Button label="Sign in" onPress={() => router.push('/(auth)/login')} />
        <Button label="Create an account" variant="secondary" onPress={() => router.push('/(auth)/register')} />
        <Button label="Privacy policy" variant="ghost" onPress={() => router.push('/legal/privacy')} />
        <Button label="Terms" variant="ghost" onPress={() => router.push('/legal/terms')} />
      </Screen>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView>
        <ProfilePortfolio
          profile={profile}
          studies={studies.data || []}
          owner
          footer={
            <>
              <Button label="My case studies" onPress={() => router.push('/studio')} />
              <Text style={styles.meta}>
                {level || 'Experience not set'}
                {preferences?.interest_ids?.length
                  ? ` · ${preferences.interest_ids.length} interests`
                  : ''}
              </Text>
              <Button label="Edit profile" variant="secondary" onPress={() => router.push('/profile/edit')} />
              <Button label="Interests and experience" variant="secondary" onPress={() => router.push('/preferences')} />
              <Button label="Points history" variant="secondary" onPress={() => router.push('/points')} />
              <Button label="Saved content" variant="secondary" onPress={() => router.push('/saved')} />
              <Button label="Notifications" variant="secondary" onPress={() => router.push('/notifications')} />
              <Button label="Settings" variant="secondary" onPress={() => router.push('/settings')} />
              <Button label="Privacy policy" variant="ghost" onPress={() => router.push('/legal/privacy')} />
              <Button label="Terms" variant="ghost" onPress={() => router.push('/legal/terms')} />
              <Button
                label="Sign out"
                variant="secondary"
                onPress={() => {
                  Alert.alert('Sign out?', 'You can sign back in anytime.', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Sign out',
                      onPress: async () => {
                        await signOut();
                        router.replace('/(tabs)');
                      },
                    },
                  ]);
                }}
              />
            </>
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  name: { ...type.display, color: colors.text },
  meta: { ...type.body, color: colors.textSecondary, marginBottom: space.sm },
});
