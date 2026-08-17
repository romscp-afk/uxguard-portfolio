import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getChallenge, getAttemptCount, hasAwardedAttempt, listChallengeQuestions, submitChallengeAttempt, type ChallengeResult } from '@/api/challenges';
import { AuthGate } from '@/components/auth/AuthGate';
import { Button } from '@/components/ui/Button';
import { ChoiceChip } from '@/components/ui/ChoiceChip';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useAuth } from '@/providers/AuthProvider';
import { color, space, type } from '@/theme/tokens';

const colors = color.light;

export default function ChallengeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, refresh } = useAuth();
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<ChallengeResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const challenge = useQuery({ queryKey: ['challenge', id], queryFn: () => getChallenge(id), enabled: Boolean(id && session) });
  const questions = useQuery({
    queryKey: ['challenge-questions', id],
    queryFn: () => listChallengeQuestions(id),
    enabled: Boolean(id && session),
  });
  const attempts = useQuery({
    queryKey: ['challenge-attempts', id, session?.user.id],
    queryFn: () => getAttemptCount(id, session!.user.id),
    enabled: Boolean(id && session?.user.id),
  });
  const awarded = useQuery({
    queryKey: ['challenge-awarded', id, session?.user.id],
    queryFn: () => hasAwardedAttempt(id, session!.user.id),
    enabled: Boolean(id && session?.user.id),
  });

  const remaining = useMemo(() => {
    if (!challenge.data?.max_attempts) return null;
    return Math.max(0, challenge.data.max_attempts - (attempts.data || 0));
  }, [challenge.data, attempts.data]);

  async function onSubmit() {
    if (!challenge.data) return;
    setBusy(true);
    setError('');
    try {
      const next = await submitChallengeAttempt(challenge.data.id, answers);
      setResult(next);
      await Promise.all([attempts.refetch(), awarded.refetch(), refresh()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit.');
    } finally {
      setBusy(false);
    }
  }

  const item = challenge.data;

  return (
    <AuthGate
      title="Sign in to take this challenge"
      message="Quizzes award UXGuard Points once per challenge if you pass. Points are never awarded for ads.">
      {challenge.isLoading || questions.isLoading ? <LoadingState /> : null}
      {!challenge.isLoading && !questions.isLoading && !item ? <ErrorState message="Challenge not found." /> : null}
      {item ? (
    <Screen scroll>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.body}>{item.summary}</Text>
      <Text style={styles.section}>Instructions</Text>
      <Text style={styles.body}>{item.instructions}</Text>
      <Text style={styles.section}>Completion</Text>
      <Text style={styles.body}>{item.completion_criteria}</Text>
      <Text style={styles.body}>{item.points_award} points · awarded once if you pass</Text>
      {remaining != null ? <Text style={styles.body}>{remaining} attempts remaining</Text> : null}
      {awarded.data ? <Text style={styles.body}>You have already earned points for this challenge.</Text> : null}

      {(questions.data || []).map((question) => {
        const selected = answers[question.id] || [];
        const revealed = result?.reveal?.find((row) => row.question_id === question.id);
        return (
          <View key={question.id} style={styles.block}>
            <Text style={styles.section}>{question.prompt}</Text>
            <View style={styles.chips}>
              {question.choices.map((choice) => (
                <ChoiceChip
                  key={choice.id}
                  label={choice.label}
                  selected={selected.includes(choice.id)}
                  onPress={() => setAnswers((current) => ({ ...current, [question.id]: [choice.id] }))}
                />
              ))}
            </View>
            {revealed ? (
              <Text style={styles.body}>Correct: {revealed.correct_choice_ids.join(', ')}</Text>
            ) : null}
          </View>
        );
      })}

      {result ? (
        <Text style={styles.body}>
          {result.passed ? 'Passed' : 'Not passed'} · score {result.score}
          {result.already_awarded
            ? ' · points were already awarded earlier'
            : ` · ${result.points_awarded} points awarded`}
        </Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Submit answers" disabled={busy || remaining === 0} onPress={onSubmit} />
    </Screen>
      ) : null}
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  title: { ...type.display, color: colors.text },
  section: { ...type.subtitle, color: colors.text },
  body: { ...type.body, color: colors.textSecondary },
  error: { ...type.caption, color: colors.danger },
  block: { gap: space.sm },
  chips: { gap: space.sm },
});
