import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listPublishedChallenges } from '@/api/content';
import { AuthGate } from '@/components/auth/AuthGate';
import { FeedCard } from '@/components/content/FeedCard';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useAuth } from '@/providers/AuthProvider';
import { color, space } from '@/theme/tokens';

const colors = color.light;

export default function ChallengesScreen() {
  const { session } = useAuth();
  const query = useQuery({ queryKey: ['challenges'], queryFn: listPublishedChallenges, enabled: Boolean(session) });

  return (
    <AuthGate
      title="Challenges need an account"
      message="Sign in to take quizzes and earn UXGuard Points. Points are never awarded for ads.">
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        {query.isLoading ? <LoadingState label="Loading challenges" /> : null}
        {query.error ? (
          <ErrorState message="Could not load challenges. Confirm Supabase migrations have been applied." onRetry={() => query.refetch()} />
        ) : null}
        {!query.isLoading && !query.data?.length ? (
          <EmptyState title="No challenges yet" message="Published quizzes will appear here." />
        ) : null}
        <View style={styles.list}>
          {(query.data || []).map((challenge) => (
            <FeedCard
              key={challenge.id}
              item={{
                id: challenge.id,
                contentType: 'challenge',
                title: challenge.title,
                excerpt: challenge.summary,
                href: `/challenge/${challenge.id}`,
                sponsored: false,
                points: challenge.points_award,
                source: 'supabase',
              }}
              onPress={() => router.push(`/challenge/${challenge.id}`)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, gap: space.md, paddingBottom: 40 },
  list: { gap: space.md },
});
