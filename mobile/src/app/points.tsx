import { useQuery } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';

import { listPointTransactions } from '@/api/points';
import { AuthGate } from '@/components/auth/AuthGate';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useAuth } from '@/providers/AuthProvider';
import { color, space, type } from '@/theme/tokens';

const colors = color.light;

const REASONS: Record<string, string> = {
  challenge_complete: 'Challenge completed',
  reward_redeem: 'Reward redeemed',
  reversal: 'Reversal',
  expiry: 'Expiry',
  adjustment: 'Adjustment',
};

export default function PointsScreen() {
  const { session, profile } = useAuth();
  const query = useQuery({
    queryKey: ['point-transactions', session?.user.id],
    queryFn: () => listPointTransactions(session!.user.id),
    enabled: Boolean(session?.user.id),
  });

  return (
    <AuthGate title="Sign in to see points" message="UXGuard Points history is tied to your mobile account. Points are not cash and are never earned from ads.">
    <Screen scroll>
      <Text style={styles.balance}>{profile?.points_balance_cached ?? 0}</Text>
      <Text style={styles.body}>UXGuard Points balance. Not cash, not transferable, never earned from ads.</Text>
      {query.isLoading ? <LoadingState /> : null}
      {query.error ? <ErrorState message="Could not load history." onRetry={() => query.refetch()} /> : null}
      {!query.isLoading && !query.data?.length ? (
        <EmptyState title="No transactions yet" message="Complete a challenge to earn your first points." />
      ) : null}
      <View style={styles.list}>
        {(query.data || []).map((row) => (
          <Card key={row.id}>
            <Text style={styles.title}>
              {row.amount > 0 ? '+' : ''}
              {row.amount} · {REASONS[row.reason] || row.reason}
            </Text>
            <Text style={styles.body}>{new Date(row.created_at).toLocaleString()}</Text>
          </Card>
        ))}
      </View>
    </Screen>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  balance: { ...type.display, color: colors.text },
  title: { ...type.subtitle, color: colors.text },
  body: { ...type.body, color: colors.textSecondary },
  list: { gap: space.md },
});
