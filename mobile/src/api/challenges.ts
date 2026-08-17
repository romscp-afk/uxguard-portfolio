import { isSupabaseConfigured } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import type { Challenge, ChallengeQuestion } from '@/types/domain';

export async function getChallenge(id: string): Promise<Challenge | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.from('challenges').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Challenge | null;
}

export async function listChallengeQuestions(challengeId: string): Promise<ChallengeQuestion[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('challenge_questions')
    .select('id, challenge_id, sort_order, prompt, choices')
    .eq('challenge_id', challengeId)
    .order('sort_order');
  if (error) throw error;
  return (data || []).map((row) => ({
    ...row,
    choices: Array.isArray(row.choices) ? row.choices : [],
  })) as ChallengeQuestion[];
}

export async function getAttemptCount(challengeId: string, userId: string) {
  const { count, error } = await supabase
    .from('challenge_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('challenge_id', challengeId)
    .eq('user_id', userId);
  if (error) throw error;
  return count || 0;
}

export async function hasAwardedAttempt(challengeId: string, userId: string) {
  const { data } = await supabase
    .from('challenge_attempts')
    .select('id')
    .eq('challenge_id', challengeId)
    .eq('user_id', userId)
    .gt('points_awarded', 0)
    .maybeSingle();
  return Boolean(data);
}

export type ChallengeResult = {
  attempt_id: string;
  passed: boolean;
  score: number;
  points_awarded: number;
  already_awarded: boolean;
  reveal: { question_id: string; correct_choice_ids: string[] }[];
};

export async function submitChallengeAttempt(challengeId: string, answers: Record<string, string[]>) {
  const { data, error } = await supabase.rpc('complete_challenge_attempt', {
    p_challenge_id: challengeId,
    p_answers: answers,
  });
  if (error) throw error;
  return data as ChallengeResult;
}
