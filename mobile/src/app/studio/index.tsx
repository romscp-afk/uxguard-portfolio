import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { CASE_STUDY_LIMIT, listMyCaseStudies } from '@/api/studio';
import { AuthGate } from '@/components/auth/AuthGate';
import { FeedCard } from '@/components/content/FeedCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useAuth } from '@/providers/AuthProvider';
import { color, space, type } from '@/theme/tokens';

const colors = color.light;

export default function StudioListScreen() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const query = useQuery({
    queryKey: ['my-case-studies', userId],
    queryFn: () => listMyCaseStudies(userId!),
    enabled: Boolean(userId),
  });

  return (
    <AuthGate
      title="Sign in to upload case studies"
      message="Create a mobile account to draft, publish, and manage your own case studies. Studio library content stays separate.">
      <Screen scroll>
        <Text style={styles.title}>My case studies</Text>
        <Text style={styles.body}>
          Write evidence-led case studies and publish them to the app feed. You can keep up to {CASE_STUDY_LIMIT}{' '}
          studies on this mobile account.
        </Text>
        <Button
          label="New case study"
          disabled={(query.data?.length || 0) >= CASE_STUDY_LIMIT}
          onPress={() => router.push('/studio/new')}
        />
        {query.isLoading ? <LoadingState label="Loading your case studies" /> : null}
        {query.error ? (
          <ErrorState
            message={query.error instanceof Error ? query.error.message : 'Could not load your case studies.'}
            onRetry={() => query.refetch()}
          />
        ) : null}
        {!query.isLoading && !query.data?.length ? (
          <EmptyState title="No case studies yet" message="Start a draft. You can publish when the story is ready." />
        ) : null}
        <View style={styles.list}>
          {(query.data || []).map((item) => (
            <View key={item.id} style={styles.item}>
              <Badge label={item.status === 'published' ? 'Published' : 'Draft'} tone={item.status === 'published' ? 'brand' : 'muted'} />
              <FeedCard item={{
                id: item.id,
                contentType: 'case_study',
                title: item.title,
                excerpt: item.summary,
                coverImageUrl: item.cover_image_url,
                href: `/studio/${item.id}`,
                sponsored: false,
                source: 'supabase',
              }} onPress={() => router.push(`/studio/${item.id}`)} />
            </View>
          ))}
        </View>
      </Screen>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  title: { ...type.display, color: colors.text },
  body: { ...type.body, color: colors.textSecondary },
  list: { gap: space.md },
  item: { gap: space.sm },
});
