import { Image } from 'expo-image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, StyleSheet, Text } from 'react-native';

import { getArticle, isBookmarked, listRelatedArticles, toggleBookmark, upsertReadingProgress } from '@/api/content';
import { FeedCard } from '@/components/content/FeedCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { HtmlContent } from '@/components/ui/HtmlContent';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { appUrl } from '@/lib/config';
import { shareContent } from '@/lib/share';
import { useAuth } from '@/providers/AuthProvider';
import { color, radius, space, type } from '@/theme/tokens';

const colors = color.light;
const UUID = /^[0-9a-f-]{36}$/i;

export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const client = useQueryClient();
  const [saved, setSaved] = useState(false);
  const article = useQuery({ queryKey: ['article', id], queryFn: () => getArticle(id), enabled: Boolean(id) });
  const related = useQuery({
    queryKey: ['related-article', article.data?.id, article.data?.tags],
    queryFn: () => listRelatedArticles(article.data!.id, article.data!.tags),
    enabled: Boolean(article.data),
  });

  useEffect(() => {
    if (!session?.user.id || !article.data || !UUID.test(article.data.id)) return;
    isBookmarked('article', article.data.id, session.user.id).then(setSaved).catch(() => undefined);
    upsertReadingProgress(session.user.id, 'article', article.data.id, 5).catch(() => undefined);
  }, [article.data, session?.user.id]);

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (!session?.user.id || !article.data || !UUID.test(article.data.id)) return;
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const percent = ((contentOffset.y + layoutMeasurement.height) / Math.max(contentSize.height, 1)) * 100;
    upsertReadingProgress(session.user.id, 'article', article.data.id, percent).catch(() => undefined);
  }

  if (article.isLoading) return <LoadingState label="Opening article" />;
  if (!article.data) {
    return <ErrorState message="Article not found." onRetry={() => article.refetch()} />;
  }

  const item = article.data;
  const shareUrl = `${appUrl}/articles/${item.slug}`;

  return (
    <Screen scroll contentContainerStyle={styles.content} onScroll={onScroll}>
      {item.cover_image_url ? (
        <Image source={{ uri: item.cover_image_url }} style={styles.cover} contentFit="cover" accessibilityIgnoresInvertColors />
      ) : null}
      {item.is_sponsored ? <Badge label="Sponsored" tone="warning" /> : null}
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.meta}>
        {item.reading_time_min} min read{item.author_name ? ` · ${item.author_name}` : ''}
      </Text>
      {!session || UUID.test(item.id) ? (
      <Button
        label={!session ? 'Sign in to save' : saved ? 'Saved' : 'Save'}
        variant="secondary"
        onPress={async () => {
          if (!session?.user.id) {
            router.push('/(auth)/login');
            return;
          }
          if (!UUID.test(item.id)) return;
          const next = await toggleBookmark('article', item.id, session.user.id);
          setSaved(next);
          client.invalidateQueries({ queryKey: ['bookmarks'] });
        }}
      />
      ) : null}
      <Button label="Share" variant="secondary" onPress={() => shareContent(item.title, shareUrl, item.excerpt || undefined)} />
      <HtmlContent html={item.body_html || item.excerpt || ''} />
      {related.data?.length ? <Text style={styles.section}>Related</Text> : null}
      {(related.data || []).map((rel) => (
        <FeedCard
          key={rel.id}
          item={{
            id: rel.id,
            contentType: 'article',
            title: rel.title,
            excerpt: rel.excerpt,
            coverImageUrl: rel.cover_image_url,
            href: `/article/${rel.slug || rel.id}`,
            sponsored: rel.is_sponsored,
            readingTimeMin: rel.reading_time_min,
            source: rel.source,
          }}
          onPress={() => router.push(`/article/${rel.slug || rel.id}`)}
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.md, paddingBottom: 48 },
  cover: { width: '100%', height: 200, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt },
  title: { ...type.display, color: colors.text },
  meta: { ...type.caption, color: colors.textSecondary },
  section: { ...type.title, color: colors.text, marginTop: space.md },
});
