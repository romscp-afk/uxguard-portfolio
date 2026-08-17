import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { getArticle, getCaseStudy, listBookmarks } from '@/api/content';
import { AuthGate } from '@/components/auth/AuthGate';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useAuth } from '@/providers/AuthProvider';
import { color, space, type } from '@/theme/tokens';

const colors = color.light;

export default function SavedScreen() {
  const { session } = useAuth();
  const query = useQuery({
    queryKey: ['bookmarks', session?.user.id],
    queryFn: () => listBookmarks(session!.user.id),
    enabled: Boolean(session?.user.id),
  });

  return (
    <AuthGate title="Sign in to save content" message="Bookmarks are stored on your mobile account after content is synced to Supabase.">
    <Screen scroll>
      {query.isLoading ? <LoadingState /> : null}
      {query.error ? <ErrorState message="Could not load saved content." onRetry={() => query.refetch()} /> : null}
      {!query.isLoading && !query.data?.length ? (
        <EmptyState title="Nothing saved" message="Bookmark articles and case studies while you read." />
      ) : null}
      <View style={styles.list}>
        {(query.data || []).map((row) => (
          <SavedRow key={row.id} contentType={row.content_type} contentId={row.content_id} />
        ))}
      </View>
    </Screen>
    </AuthGate>
  );
}

function SavedRow({ contentType, contentId }: { contentType: string; contentId: string }) {
  const query = useQuery({
    queryKey: ['saved-item', contentType, contentId],
    queryFn: async () => {
      if (contentType === 'article') return getArticle(contentId);
      return getCaseStudy(contentId);
    },
  });
  const title = query.data?.title || 'Saved item';
  const href = contentType === 'article' ? `/article/${contentId}` : `/case-study/${contentId}`;

  return (
    <Card onPress={() => router.push(href as never)} accessibilityLabel={title}>
      <Text style={styles.kicker}>{contentType === 'article' ? 'Article' : 'Case study'}</Text>
      <Text style={styles.title}>{title}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.md },
  kicker: { ...type.caption, color: colors.brandText, textTransform: 'uppercase' },
  title: { ...type.subtitle, color: colors.text },
});
