import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import type { PublicPortfolio } from '@/types/domain';
import { color, radius, space, type } from '@/theme/tokens';

const colors = color.light;

export function PortfolioCard({
  portfolio,
  onPress,
}: {
  portfolio: PublicPortfolio;
  onPress: () => void;
}) {
  const initial = (portfolio.name || portfolio.username || 'U').charAt(0).toUpperCase();
  const countLabel =
    portfolio.case_study_count === 1
      ? '1 case study'
      : `${portfolio.case_study_count} case studies`;

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${portfolio.name} portfolio. ${countLabel}`}>
      {portfolio.cover_image_url ? (
        <Image
          source={{ uri: portfolio.cover_image_url }}
          style={styles.cover}
          contentFit="cover"
          accessibilityIgnoresInvertColors
        />
      ) : null}
      <View style={styles.identity}>
        {portfolio.avatar_url ? (
          <Image
            source={{ uri: portfolio.avatar_url }}
            style={styles.avatar}
            contentFit="cover"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarLetter}>{initial}</Text>
          </View>
        )}
        <View style={styles.meta}>
          <Text style={styles.handle}>@{portfolio.username}</Text>
          <Text style={styles.name}>{portfolio.name}</Text>
          {portfolio.title ? (
            <Text style={styles.title} numberOfLines={1}>
              {portfolio.title}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.row}>
        <Badge label={countLabel} tone="muted" />
        {portfolio.location ? <Badge label={portfolio.location} tone="muted" /> : null}
      </View>
      {portfolio.latest_case_study_title ? (
        <Text style={styles.latest} numberOfLines={2}>
          Latest: {portfolio.latest_case_study_title}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  cover: { width: '100%', height: 120, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  identity: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.brandMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { ...type.subtitle, color: colors.brandText },
  meta: { flex: 1, gap: 2 },
  handle: { ...type.caption, color: colors.brandText },
  name: { ...type.subtitle, color: colors.text },
  title: { ...type.caption, color: colors.textSecondary },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  latest: { ...type.body, color: colors.textSecondary },
});
