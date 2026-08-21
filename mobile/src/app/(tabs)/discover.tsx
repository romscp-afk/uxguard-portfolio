import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listArticles, listCaseStudies, listCategories, PAGE_SIZE } from '@/api/content';
import { FeedCard } from '@/components/content/FeedCard';
import { Button } from '@/components/ui/Button';
import { ChoiceChip } from '@/components/ui/ChoiceChip';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { color, radius, space, type } from '@/theme/tokens';

const colors = color.light;

export default function DiscoverScreen() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const categories = useQuery({ queryKey: ['categories'], queryFn: listCategories });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const feed = useInfiniteQuery({
    queryKey: ['discover', debouncedQuery, categoryId],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const [articles, studies] = await Promise.all([
        listArticles({ query: debouncedQuery, categoryId: categoryId || undefined, from, to }),
        listCaseStudies({ query: debouncedQuery, categoryId: categoryId || undefined, from, to }),
      ]);
      return {
        articles,
        studies,
        hasMore: articles.length === PAGE_SIZE || studies.length === PAGE_SIZE,
      };
    },
    getNextPageParam: (lastPage, _pages, lastPageParam) => (lastPage.hasMore ? lastPageParam + 1 : undefined),
  });

  const items = useMemo(() => {
    return (feed.data?.pages || []).flatMap((page) => {
      const articleCards = page.articles.map((article) => ({
        id: article.id,
        contentType: 'article' as const,
        title: article.title,
        excerpt: article.excerpt,
        coverImageUrl: article.cover_image_url,
        href: `/article/${article.slug || article.id}`,
        sponsored: article.is_sponsored,
        featured: article.featured,
        readingTimeMin: article.reading_time_min,
        publishedAt: article.published_at,
        source: article.source,
        slug: article.slug,
      }));
      const studyCards = page.studies.map((study) => ({
        id: study.id,
        contentType: 'case_study' as const,
        title: study.title,
        excerpt: study.summary,
        coverImageUrl: study.cover_image_url,
        href: `/case-study/${study.slug || study.id}`,
        sponsored: study.is_sponsored,
        featured: study.featured,
        publishedAt: study.published_at,
        source: study.source,
        slug: study.slug,
      }));
      return [...articleCards, ...studyCards];
    });
  }, [feed.data]);

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={feed.isRefetching} onRefresh={() => feed.refetch()} />}>
        <TextInput
          accessibilityLabel="Search articles and case studies"
          placeholder="Search titles, tags, methods"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          style={styles.search}
        />
        <View style={styles.shortcuts}>
          <Button label="Latest portfolios" onPress={() => router.push('/portfolios')} />
          <Button
            label="Our Projects"
            variant="secondary"
            onPress={() => router.push('/our-projects')}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <ChoiceChip label="All" selected={!categoryId} onPress={() => setCategoryId(null)} />
          {(categories.data || []).map((category) => (
            <ChoiceChip
              key={category.id}
              label={category.name}
              selected={categoryId === category.id}
              onPress={() => setCategoryId(category.id)}
            />
          ))}
        </ScrollView>
        {feed.isLoading ? <LoadingState /> : null}
        {feed.error ? <ErrorState message="Could not load content." onRetry={() => feed.refetch()} /> : null}
        {!feed.isLoading && !items.length ? (
          <EmptyState title="No matches" message="Try another topic or clear the search." />
        ) : null}
        <View style={styles.list}>
          {items.map((item) => (
            <FeedCard key={`${item.contentType}-${item.id}`} item={item} onPress={() => router.push(item.href as never)} />
          ))}
        </View>
        {feed.hasNextPage ? (
          <Button label="Load more" variant="secondary" disabled={feed.isFetchingNextPage} onPress={() => feed.fetchNextPage()} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, gap: space.md, paddingBottom: 40 },
  search: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: space.md,
    ...type.body,
    color: colors.text,
  },
  chips: { gap: space.sm, paddingVertical: space.xs },
  shortcuts: { gap: space.sm },
  list: { gap: space.md },
});
