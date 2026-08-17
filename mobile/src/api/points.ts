import { supabase } from '@/lib/supabase';

export async function getPointBalance(userId: string) {
  const { data, error } = await supabase
    .from('point_accounts')
    .select('balance')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.balance ?? 0;
}

export async function listPointTransactions(userId: string) {
  const { data, error } = await supabase
    .from('point_transactions')
    .select('id, amount, balance_after, reason, reference_type, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data || [];
}
