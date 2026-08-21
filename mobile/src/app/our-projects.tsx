import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listPublicProjects } from '@/api/content';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { color, radius, space, type } from '@/theme/tokens';

const colors = color.light;

function statusLabel(status: string) {
  const value = status.toLowerCase();
  if (value === 'planning') return 'Planning';
  if (value === 'active') return 'Active';
  if (value === 'completed') return 'Completed';
  return status;
}

export default function OurProjectsScreen() {
  const projects = useQuery({ queryKey: ['public-projects'], queryFn: listPublicProjects });

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={projects.isRefetching} onRefresh={() => projects.refetch()} />
        }>
        <Text style={styles.kicker}>UXGuard Studio</Text>
        <Text style={styles.title} accessibilityRole="header">
          Our Projects
        </Text>
        <Text style={styles.body}>
          Initiatives curated by the UXGuard team. Member portfolios focus on case studies.
        </Text>

        {projects.isLoading ? <LoadingState label="Loading projects" /> : null}
        {projects.error ? (
          <ErrorState
            message="Could not load studio projects."
            onRetry={() => projects.refetch()}
          />
        ) : null}
        {!projects.isLoading && !projects.data?.length ? (
          <EmptyState title="Coming soon" message="Studio projects will appear here shortly." />
        ) : null}

        <View style={styles.list}>
          {(projects.data || []).map((project) => (
            <Card key={project.id} accessibilityLabel={project.title}>
              {project.cover_image_url ? (
                <Image
                  source={{ uri: project.cover_image_url }}
                  style={styles.cover}
                  contentFit="cover"
                  accessibilityIgnoresInvertColors
                />
              ) : null}
              <View style={styles.row}>
                <Badge label={statusLabel(project.status)} />
                {project.client ? <Badge label={project.client} tone="muted" /> : null}
              </View>
              <Text style={styles.cardTitle}>{project.title}</Text>
              {project.role ? <Text style={styles.role}>{project.role}</Text> : null}
              {project.description ? (
                <Text style={styles.excerpt} numberOfLines={4}>
                  {project.description}
                </Text>
              ) : null}
              {project.tags.length ? (
                <View style={styles.row}>
                  {project.tags.slice(0, 4).map((tag) => (
                    <Badge key={tag} label={tag} tone="muted" />
                  ))}
                </View>
              ) : null}
              {project.outcomes.length ? (
                <View style={styles.outcomes}>
                  {project.outcomes.slice(0, 4).map((outcome) => (
                    <View key={`${outcome.label}-${outcome.value}`} style={styles.outcome}>
                      <Text style={styles.outcomeLabel}>{outcome.label}</Text>
                      <Text style={styles.outcomeValue}>{outcome.value}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </Card>
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
  list: { gap: space.md },
  cover: { width: '100%', height: 160, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  cardTitle: { ...type.subtitle, color: colors.text },
  role: { ...type.caption, color: colors.textSecondary },
  excerpt: { ...type.body, color: colors.textSecondary },
  outcomes: {
    marginTop: space.sm,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
  },
  outcome: { width: '45%', gap: 2 },
  outcomeLabel: { ...type.caption, color: colors.textMuted, textTransform: 'uppercase' },
  outcomeValue: { ...type.label, color: colors.text },
});
