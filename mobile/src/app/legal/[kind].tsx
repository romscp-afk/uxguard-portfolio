import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { contactEmail, privacyUrl, termsUrl } from '@/lib/config';
import { openExternalUrl, openMailto } from '@/lib/openUrl';
import { color, space, type } from '@/theme/tokens';

const colors = color.light;

const PRIVACY = [
  {
    heading: 'What this app collects',
    body: 'If you create a mobile account: name, email, interests, and experience level. Learning data includes challenge attempts, UXGuard Points, redemptions, saved items, and reading progress. If you allow notifications, a device push token can be stored. Sponsored cards may record impressions, opens, and outbound clicks. Those events never award points.',
  },
  {
    heading: 'How it is used',
    body: 'To sign you in, personalise the feed, run challenges and rewards, and operate the service. We do not sell personal data. Points are not cash and cannot be withdrawn or transferred.',
  },
  {
    heading: 'Retention and deletion',
    body: 'You can delete the mobile account in Profile → Settings. That removes mobile learning data. It does not delete a separate website portfolio until those identities are unified.',
  },
  {
    heading: 'Contact',
    body: `Privacy questions: ${contactEmail}`,
  },
];

const TERMS = [
  {
    heading: 'Using the app',
    body: 'UXGuard Studio is a professional learning app. Guest browsing shows published studio content. An account is required for challenges, points, and rewards. You are responsible for the accuracy of information you submit.',
  },
  {
    heading: 'UXGuard Points',
    body: 'Points are a promotional balance inside the app. They are not money, have no cash value, and are never awarded for viewing or clicking ads. Redemptions may stay pending until the studio team fulfils them.',
  },
  {
    heading: 'Accounts',
    body: 'Mobile accounts are separate from website accounts until identity is unified. We may suspend accounts that abuse the service or attempt to manipulate points.',
  },
  {
    heading: 'Contact',
    body: `Questions about these terms: ${contactEmail}`,
  },
];

export default function LegalScreen() {
  const { kind } = useLocalSearchParams<{ kind: string }>();
  const isPrivacy = kind === 'privacy';
  const url = isPrivacy ? privacyUrl : termsUrl;
  const sections = isPrivacy ? PRIVACY : TERMS;

  return (
    <Screen scroll>
      <Text style={styles.title}>{isPrivacy ? 'Privacy policy' : 'Terms'}</Text>
      <Text style={styles.meta}>Last updated August 2026 · Mobile app</Text>
      {sections.map((section) => (
        <View key={section.heading} style={styles.block}>
          <Text style={styles.heading}>{section.heading}</Text>
          <Text style={styles.body}>{section.body}</Text>
        </View>
      ))}
      <Button label="Email hello@uxguard.studio" variant="secondary" onPress={() => openMailto(contactEmail)} />
      <Button label="Open website version" variant="ghost" onPress={() => openExternalUrl(url)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.display, color: colors.text },
  meta: { ...type.caption, color: colors.textSecondary },
  block: { gap: space.sm },
  heading: { ...type.subtitle, color: colors.text },
  body: { ...type.body, color: colors.textSecondary },
});
