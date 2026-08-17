import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import type { FeedItem } from '@/types/domain';
import { color, radius, space, type } from '@/theme/tokens';

const colors = color.light;

export function FeedCard({ item, onPress }: { item: FeedItem; onPress: () => void }) {
  const meta =
    item.contentType === 'challenge'
      ? `${item.points ?? 0} points`
      : item.readingTimeMin
        ? `${item.readingTimeMin} min read`
        : item.contentType === 'case_study'
          ? 'Case study'
          : 'Article';

  return (
    <Card onPress={onPress} accessibilityLabel={`${item.sponsored ? 'Sponsored. ' : ''}${item.title}`}>
      {item.coverImageUrl ? (
        <Image source={{ uri: item.coverImageUrl }} style={styles.cover} contentFit="cover" accessibilityIgnoresInvertColors />
      ) : null}
      <View style={styles.row}>
        {item.sponsored ? <Badge label="Sponsored" tone="warning" /> : null}
        {item.featured ? <Badge label="Featured" /> : null}
        <Badge label={meta} tone="muted" />
      </View>
      <Text style={styles.title}>{item.title}</Text>
      {item.excerpt ? (
        <Text style={styles.excerpt} numberOfLines={3}>
          {item.excerpt}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  cover: { width: '100%', height: 160, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  title: { ...type.subtitle, color: colors.text },
  excerpt: { ...type.body, color: colors.textSecondary },
});
