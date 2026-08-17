import { isSupabaseConfigured } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import type { Reward } from '@/types/domain';

export async function listRewards(): Promise<Reward[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('rewards')
    .select('id, slug, title, description, kind, points_cost, inventory, fulfilment')
    .eq('is_active', true)
    .order('points_cost');
  if (error) throw error;
  return (data || []) as Reward[];
}

export async function getReward(id: string): Promise<Reward | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.from('rewards').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Reward | null;
}

export async function listMyRedemptions(userId: string) {
  const { data, error } = await supabase
    .from('reward_redemptions')
    .select('id, reward_id, points_spent, status, created_at, fulfilled_at, rewards ( title, kind )')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function redeemReward(rewardId: string) {
  const { data, error } = await supabase.rpc('redeem_reward', { p_reward_id: rewardId });
  if (error) throw error;
  return data;
}
