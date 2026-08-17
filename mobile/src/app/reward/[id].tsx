import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { getReward, redeemReward } from '@/api/rewards';
import { AuthGate } from '@/components/auth/AuthGate';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useAuth } from '@/providers/AuthProvider';
import { color, type } from '@/theme/tokens';

const colors = color.light;

export default function RewardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, profile, refresh } = useAuth();
  const client = useQueryClient();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const query = useQuery({ queryKey: ['reward', id], queryFn: () => getReward(id), enabled: Boolean(id && session) });

  const reward = query.data;
  const balance = profile?.points_balance_cached ?? 0;
  const eligible = Boolean(reward && balance >= reward.points_cost);

  async function onRedeem() {
    if (!reward) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const redemption = await redeemReward(reward.id);
      await refresh();
      client.invalidateQueries({ queryKey: ['rewards'] });
      const status = redemption?.status || 'pending';
      setMessage(
        status === 'pending'
          ? 'Redemption recorded as pending. An admin will fulfil it.'
          : 'Reward redeemed.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not redeem.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthGate title="Sign in to redeem" message="Rewards use UXGuard Points. Points are not cash and cannot be transferred.">
      {query.isLoading ? <LoadingState /> : null}
      {!query.isLoading && !reward ? <ErrorState message="Reward not found." /> : null}
      {reward ? (
    <Screen scroll>
      <Text style={styles.title}>{reward.title}</Text>
      <Text style={styles.body}>{reward.description}</Text>
      <Text style={styles.body}>{reward.points_cost} points · your balance {balance}</Text>
      <Text style={styles.body}>
        {reward.fulfilment === 'pending_admin'
          ? 'This reward is fulfilled by the studio team after review.'
          : 'This reward can be fulfilled immediately.'}
      </Text>
      {!eligible ? <Text style={styles.error}>You do not have enough points yet.</Text> : null}
      {message ? <Text style={styles.body}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Redeem" disabled={!eligible || busy} onPress={onRedeem} />
    </Screen>
      ) : null}
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  title: { ...type.display, color: colors.text },
  body: { ...type.body, color: colors.textSecondary },
  error: { ...type.caption, color: colors.danger },
});
