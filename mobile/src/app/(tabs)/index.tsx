import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { recordCampaignEvent } from '@/api/campaigns';
import { buildHomeFeed } from '@/api/content';
import { FeedCard } from '@/components/content/FeedCard';
import { Button } from '@/components/ui/Button';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useAuth } from '@/providers/AuthProvider';
import { color, space, type } from '@/theme/tokens';

const colors = color.light;

export default function HomeScreen() {
  const { session, profile } = useAuth();
  const feed = useQuery({ queryKey: ['home-feed'], queryFn: buildHomeFeed });

  const onRefresh = useCallback(() => {
    feed.refetch();
  }, [feed]);

  useEffect(() => {
    for (const item of feed.data || []) {
      if (item.contentType === 'campaign') {
        recordCampaignEvent(item.id, 'impression').catch(() => undefined);
      }
    }
  }, [feed.data]);

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={feed.isRefetching} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}>
        <Text style={styles.hello}>Hello{profile?.display_name ? `, ${profile.display_name}` : ''}</Text>
        <Text style={styles.sub}>
          {session
            ? 'Articles, featured case studies, challenges, and clearly labelled sponsored cards.'
            : 'Published case studies from UXGuard Studio. Sign in to save, earn points, and take challenges.'}
        </Text>
        {!session ? (
          <Button label="Sign in" variant="secondary" onPress={() => router.push('/(auth)/login')} />
        ) : null}
        {feed.isLoading ? <LoadingState label="Loading your feed" /> : null}
        {feed.error ? (
          <ErrorState
            message={feed.error instanceof Error ? feed.error.message : 'Could not load the feed.'}
            onRetry={() => feed.refetch()}
          />
        ) : null}
        {!feed.isLoading && !feed.data?.length ? (
          <Text style={styles.sub}>Nothing to show yet. Pull to refresh after content sync is connected.</Text>
        ) : null}
        <View style={styles.list}>
          {(feed.data || []).map((item) => (
            <FeedCard
              key={`${item.contentType}-${item.id}`}
              item={item}
              onPress={() => {
                if (item.contentType === 'campaign') {
                  recordCampaignEvent(item.id, 'open').catch(() => undefined);
                }
                router.push(item.href as never);
              }}
            />
          ))}
        </View>
        <Button label="Browse all content" variant="secondary" onPress={() => router.push('/(tabs)/discover')} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, gap: space.lg, paddingBottom: 40 },
  hello: { ...type.display, color: colors.text },
  sub: { ...type.body, color: colors.textSecondary },
  list: { gap: space.md },
});
