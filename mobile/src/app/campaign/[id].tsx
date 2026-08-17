import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';

import { recordCampaignEvent } from '@/api/campaigns';
import { listActiveCampaigns } from '@/api/content';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { openExternalUrl } from '@/lib/openUrl';
import { color, type } from '@/theme/tokens';

const colors = color.light;

export default function CampaignScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useQuery({ queryKey: ['campaigns'], queryFn: listActiveCampaigns });
  const campaign = query.data?.find((item) => item.id === id);

  useEffect(() => {
    if (id) recordCampaignEvent(id, 'open').catch(() => undefined);
  }, [id]);

  if (query.isLoading) return <LoadingState />;
  if (!campaign) return <ErrorState message="This campaign is not active." />;

  return (
    <Screen scroll>
      <Badge label="Sponsored" tone="warning" />
      <Text style={styles.title}>{campaign.title}</Text>
      <Text style={styles.body}>{campaign.summary}</Text>
      {campaign.sponsor?.name ? <Text style={styles.body}>From {campaign.sponsor.name}</Text> : null}
      <Text style={styles.body}>Opening the link does not award UXGuard Points.</Text>
      {campaign.cta_url ? (
        <Button
          label={campaign.cta_label || 'Learn more'}
          onPress={async () => {
            await recordCampaignEvent(campaign.id, 'external_click');
            await openExternalUrl(campaign.cta_url!);
          }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.display, color: colors.text },
  body: { ...type.body, color: colors.textSecondary },
});
