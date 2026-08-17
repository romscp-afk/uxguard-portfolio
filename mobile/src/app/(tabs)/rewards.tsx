import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listRewards } from '@/api/rewards';
import { AuthGate } from '@/components/auth/AuthGate';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useAuth } from '@/providers/AuthProvider';
import { color, space, type } from '@/theme/tokens';

const colors = color.light;

export default function RewardsScreen() {
  const { session, profile } = useAuth();
  const query = useQuery({ queryKey: ['rewards'], queryFn: listRewards, enabled: Boolean(session) });

  return (
    <AuthGate
      title="Rewards need an account"
      message="Sign in to see your UXGuard Points balance and redeem rewards. Points are not cash and cannot be transferred.">
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.balance}>{profile?.points_balance_cached ?? 0} points</Text>
        <Text style={styles.sub}>Points are not cash and cannot be transferred. Redemptions that cannot be fulfilled automatically stay pending for admin review.</Text>
        {query.isLoading ? <LoadingState /> : null}
        {query.error ? <ErrorState message="Could not load rewards." onRetry={() => query.refetch()} /> : null}
        {!query.isLoading && !query.data?.length ? (
          <EmptyState title="No rewards yet" message="The catalogue will appear after migrations are applied." />
        ) : null}
        <View style={styles.list}>
          {(query.data || []).map((reward) => (
            <Card
              key={reward.id}
              accessibilityLabel={`${reward.title}, ${reward.points_cost} points`}
              onPress={() => router.push(`/reward/${reward.id}`)}>
              <Text style={styles.title}>{reward.title}</Text>
              <Text style={styles.sub}>{reward.points_cost} points · {reward.kind.replace(/_/g, ' ')}</Text>
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, gap: space.md, paddingBottom: 40 },
  balance: { ...type.display, color: colors.text },
  sub: { ...type.body, color: colors.textSecondary },
  list: { gap: space.md },
  title: { ...type.subtitle, color: colors.text },
});
