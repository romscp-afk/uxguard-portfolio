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
    heading: 'Who we are',
    body: 'UXGuard Studio is a professional portfolio and UX learning product. Website: uxguard.studio. Support: hello@uxguard.studio.',
  },
  {
    heading: 'Account data',
    body: 'If you create a mobile account: name, email, username, profile photo/cover, title, bio, location, contact email, LinkedIn URL, CV URL, interests, and experience level. Mobile accounts are separate from website accounts until identity is unified.',
  },
  {
    heading: 'Learning and content data',
    body: 'Challenge attempts and answers, UXGuard Points and redemptions, bookmarks, reading progress, and case studies you draft or publish from the app, including uploaded media.',
  },
  {
    heading: 'Device and notifications',
    body: 'If you allow notifications, a device push token can be stored. Push sending stays off until backend credentials and legal copy are confirmed. We keep basic technical logs needed to run and secure the app.',
  },
  {
    heading: 'Sponsored content',
    body: 'Sponsored cards may record impressions, opens, and outbound clicks. Those events never award points. We do not sell personal data.',
  },
  {
    heading: 'Retention and deletion',
    body: 'Delete the mobile account in Profile → Settings → Delete account. That removes mobile learning data. It does not delete a separate website portfolio until those identities are unified.',
  },
  {
    heading: 'Contact',
    body: `Privacy questions: ${contactEmail}`,
  },
];

const TERMS = [
  {
    heading: 'Using the app',
    body: 'UXGuard Studio is a professional learning app. Guest browsing shows published studio content. An account is required for challenges, points, rewards, and authoring. You are responsible for the accuracy and legality of information you submit.',
  },
  {
    heading: 'UXGuard Points',
    body: 'Points are a promotional balance inside the app. They are not money, have no cash value, cannot be withdrawn or transferred, and are never awarded for viewing or clicking ads. Redemptions may stay pending until the studio team fulfils them.',
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
