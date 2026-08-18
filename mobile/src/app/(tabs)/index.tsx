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
import { color, palette, radius, space, type } from '@/theme/tokens';

const colors = color.light;

export default function HomeScreen() {
  const { session, profile } = useAuth();
  const feed = useQuery({ queryKey: ['home-feed'], queryFn: buildHomeFeed });
  const name = profile?.display_name || profile?.username;

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
        {session ? (
          <>
            <Text style={styles.hello} accessibilityRole="header">
              Hello{name ? `, ${name}` : ''}
            </Text>
            <Button label="My case studies" variant="secondary" onPress={() => router.push('/studio')} />
          </>
        ) : (
          <View style={styles.banner} accessibilityRole="summary">
            <Text style={styles.bannerKicker}>Studio library</Text>
            <Text style={styles.bannerTitle}>Learn UX with evidence</Text>
            <Text style={styles.bannerBody}>
              Published case studies from UXGuard Studio. Sign in to upload your own, save work, and take challenges.
            </Text>
          </View>
        )}
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
  content: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: 32, gap: space.md },
  hello: { ...type.title, color: colors.text },
  sub: { ...type.body, color: colors.textSecondary },
  banner: {
    backgroundColor: palette.ink[950],
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    gap: 6,
  },
  bannerKicker: {
    ...type.label,
    color: palette.brand[400],
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  bannerTitle: { fontFamily: 'Fraunces_700Bold', fontSize: 22, lineHeight: 26, color: palette.white },
  bannerBody: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20, color: palette.ink[200] },
  list: { gap: space.md },
});
