import { Image } from 'expo-image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getCaseStudy, isBookmarked, listRelatedCaseStudies, toggleBookmark, upsertReadingProgress } from '@/api/content';
import { FeedCard } from '@/components/content/FeedCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { HtmlContent } from '@/components/ui/HtmlContent';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { appUrl } from '@/lib/config';
import { openExternalUrl } from '@/lib/openUrl';
import { shareContent } from '@/lib/share';
import { useAuth } from '@/providers/AuthProvider';
import { color, radius, space, type } from '@/theme/tokens';

const colors = color.light;
const UUID = /^[0-9a-f-]{36}$/i;

export default function CaseStudyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const client = useQueryClient();
  const [saved, setSaved] = useState(false);
  const query = useQuery({ queryKey: ['case-study', id], queryFn: () => getCaseStudy(id), enabled: Boolean(id) });
  const related = useQuery({
    queryKey: ['related-study', query.data?.id],
    queryFn: () => listRelatedCaseStudies(query.data!.id, query.data!.methods),
    enabled: Boolean(query.data),
  });

  useEffect(() => {
    if (!session?.user.id || !query.data || !UUID.test(query.data.id)) return;
    isBookmarked('case_study', query.data.id, session.user.id).then(setSaved).catch(() => undefined);
    upsertReadingProgress(session.user.id, 'case_study', query.data.id, 10).catch(() => undefined);
  }, [query.data, session?.user.id]);

  if (query.isLoading) return <LoadingState label="Opening case study" />;
  if (!query.data) return <ErrorState message="Case study not found." onRetry={() => query.refetch()} />;

  const item = query.data;
  const shareUrl = item.author_username
    ? `${appUrl}/u/${item.author_username}/${item.slug}`
    : `${appUrl}/discover`;
  const meta = [item.client, item.role, item.duration].filter(Boolean).join(' · ');

  return (
    <Screen scroll>
      {item.cover_image_url ? (
        <Image source={{ uri: item.cover_image_url }} style={styles.cover} contentFit="cover" accessibilityIgnoresInvertColors />
      ) : null}
      {item.is_sponsored ? <Badge label="Sponsored" tone="warning" /> : null}
      <Text style={styles.title}>{item.title}</Text>
      {item.subtitle ? <Text style={styles.subtitle}>{item.subtitle}</Text> : null}
      {item.author_name ? <Text style={styles.meta}>{item.author_name}</Text> : null}
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      {item.methods.length ? (
        <View style={styles.row}>
          {item.methods.map((method) => (
            <Badge key={method} label={method} tone="muted" />
          ))}
        </View>
      ) : null}
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
            setSaved(await toggleBookmark('case_study', item.id, session.user.id));
            client.invalidateQueries({ queryKey: ['bookmarks'] });
          }}
        />
      ) : null}
      <Button label="Share" variant="secondary" onPress={() => shareContent(item.title, shareUrl, item.summary || undefined)} />
      {item.prototype_url ? (
        <Button label="Open prototype" variant="ghost" onPress={() => openExternalUrl(item.prototype_url!)} />
      ) : null}
      {item.metrics.length ? (
        <View>
          <Text style={styles.section}>Impact metrics</Text>
          <View style={styles.metrics}>
            {item.metrics.map((metric) => (
              <View key={`${metric.label}-${metric.value}`} style={styles.metric}>
                <Text style={styles.metricValue}>{metric.value}</Text>
                <Text style={styles.meta}>{metric.label}</Text>
                {metric.description ? <Text style={styles.meta}>{metric.description}</Text> : null}
              </View>
            ))}
          </View>
        </View>
      ) : null}
      {item.summary ? <HtmlContent html={item.summary} /> : null}
      {item.challenge ? (
        <View>
          <Text style={styles.section}>Challenge</Text>
          <HtmlContent html={item.challenge} />
        </View>
      ) : null}
      {item.methodology ? (
        <View>
          <Text style={styles.section}>Methodology</Text>
          <HtmlContent html={item.methodology} />
        </View>
      ) : null}
      {item.impact ? (
        <View>
          <Text style={styles.section}>Impact</Text>
          <HtmlContent html={item.impact} />
        </View>
      ) : null}
      {item.reflections ? (
        <View>
          <Text style={styles.section}>Reflections</Text>
          <HtmlContent html={item.reflections} />
        </View>
      ) : null}
      {item.content_blocks.map((block, index) => {
        const heading = String(block.data.heading || '');
        const body = String(block.data.body || block.data.text || '');
        return (
          <View key={block.id || String(index)}>
            {heading ? <Text style={styles.section}>{heading}</Text> : null}
            {body ? <HtmlContent html={body} /> : null}
            {block.type === 'quote' && block.data.attribution ? (
              <Text style={styles.meta}>{String(block.data.attribution)}</Text>
            ) : null}
          </View>
        );
      })}
      {related.data?.length ? <Text style={styles.section}>Related</Text> : null}
      {(related.data || []).map((rel) => (
        <FeedCard
          key={rel.id}
          item={{
            id: rel.id,
            contentType: 'case_study',
            title: rel.title,
            excerpt: rel.summary,
            coverImageUrl: rel.cover_image_url,
            href: `/case-study/${rel.slug || rel.id}`,
            sponsored: rel.is_sponsored,
            source: rel.source,
          }}
          onPress={() => router.push(`/case-study/${rel.slug || rel.id}`)}
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cover: { width: '100%', height: 220, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt },
  title: { ...type.display, color: colors.text },
  subtitle: { ...type.subtitle, color: colors.textSecondary },
  meta: { ...type.caption, color: colors.textSecondary },
  section: { ...type.title, color: colors.text, marginTop: space.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  metric: {
    flexGrow: 1,
    minWidth: 120,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    gap: space.xs,
  },
  metricValue: { ...type.title, color: colors.brandText },
});
