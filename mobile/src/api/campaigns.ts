import { isSupabaseConfigured } from '@/lib/config';
import { supabase } from '@/lib/supabase';

export async function recordCampaignEvent(
  campaignId: string,
  eventType: 'impression' | 'open' | 'external_click',
) {
  if (!isSupabaseConfigured) return;
  await supabase.rpc('record_campaign_event', {
    p_campaign_id: campaignId,
    p_event_type: eventType,
    p_metadata: {},
  });
}
