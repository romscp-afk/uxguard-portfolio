import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getProfileByUsername } from '@/api/profile';
import { listPublishedByAuthor } from '@/api/studio';
import { ProfilePortfolio } from '@/components/profile/ProfilePortfolio';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useAuth } from '@/providers/AuthProvider';
import { color } from '@/theme/tokens';

const colors = color.light;

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { profile: mine } = useAuth();
  const profile = useQuery({
    queryKey: ['public-profile', username],
    queryFn: () => getProfileByUsername(username),
    enabled: Boolean(username),
  });
  const studies = useQuery({
    queryKey: ['profile-studies', profile.data?.id],
    queryFn: () => listPublishedByAuthor(profile.data!.id),
    enabled: Boolean(profile.data?.id),
  });

  if (profile.isLoading) return <LoadingState label="Opening profile" />;
  if (!profile.data) return <ErrorState message="This profile was not found." onRetry={() => profile.refetch()} />;

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView>
        <ProfilePortfolio
          profile={profile.data}
          studies={studies.data || []}
          owner={mine?.id === profile.data.id}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
});
