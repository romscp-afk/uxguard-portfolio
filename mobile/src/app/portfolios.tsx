import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listPublicPortfolios } from '@/api/content';
import { PortfolioCard } from '@/components/content/PortfolioCard';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { color, radius, space, type } from '@/theme/tokens';

const colors = color.light;

export default function PortfoliosScreen() {
  const [query, setQuery] = useState('');
  const portfolios = useQuery({
    queryKey: ['public-portfolios'],
    queryFn: () => listPublicPortfolios(60),
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = portfolios.data || [];
    if (!q) return rows;
    return rows.filter((item) =>
      `${item.name} ${item.username} ${item.title || ''} ${item.bio || ''} ${item.latest_case_study_title || ''}`
        .toLowerCase()
        .includes(q),
    );
  }, [portfolios.data, query]);

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={portfolios.isRefetching}
            onRefresh={() => portfolios.refetch()}
          />
        }>
        <Text style={styles.kicker}>Community</Text>
        <Text style={styles.title} accessibilityRole="header">
          Latest portfolios
        </Text>
        <Text style={styles.body}>
          Members publishing case studies on UXGuard Studio. Open a profile to explore their work.
        </Text>

        <TextInput
          accessibilityLabel="Search portfolios"
          placeholder="Search names, titles, usernames"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          style={styles.search}
        />

        {portfolios.isLoading ? <LoadingState label="Loading portfolios" /> : null}
        {portfolios.error ? (
          <ErrorState
            message="Could not load portfolios."
            onRetry={() => portfolios.refetch()}
          />
        ) : null}
        {!portfolios.isLoading && !filtered.length ? (
          <EmptyState
            title="No portfolios yet"
            message="Published member portfolios will show up here."
          />
        ) : null}

        <View style={styles.list}>
          {filtered.map((portfolio) => (
            <PortfolioCard
              key={portfolio.id}
              portfolio={portfolio}
              onPress={() => router.push(`/u/${portfolio.username}` as never)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, gap: space.md, paddingBottom: 40 },
  kicker: {
    ...type.label,
    color: colors.brandText,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: { ...type.title, color: colors.text },
  body: { ...type.body, color: colors.textSecondary },
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
  list: { gap: space.md },
});
