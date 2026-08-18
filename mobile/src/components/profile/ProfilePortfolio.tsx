import { Image } from 'expo-image';
import { router } from 'expo-router';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FeedCard } from '@/components/content/FeedCard';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/States';
import { openExternalUrl, openMailto } from '@/lib/openUrl';
import type { CaseStudy, Profile } from '@/types/domain';
import { color, palette, radius, space, type } from '@/theme/tokens';

const colors = color.light;

function Pill({ label, onPress }: { label: string; onPress?: () => void }) {
  const inner = <Text style={styles.pillText}>{label}</Text>;
  if (!onPress) return <View style={styles.pill}>{inner}</View>;
  return (
    <Pressable onPress={onPress} style={styles.pill} accessibilityRole="link" accessibilityLabel={label}>
      {inner}
    </Pressable>
  );
}

export function ProfilePortfolio({
  profile,
  studies,
  owner = false,
  footer,
}: {
  profile: Profile;
  studies: CaseStudy[];
  owner?: boolean;
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const linkedIn = profile.social_links?.linkedin;
  const initial = (profile.display_name || profile.username || 'U').charAt(0).toUpperCase();

  return (
    <View>
      <View style={[styles.hero, { paddingTop: insets.top + space.md }]}>
        {profile.cover_image_url ? (
          <Image source={{ uri: profile.cover_image_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : null}
        <View style={styles.heroScrim} />
        {owner ? (
          <View style={styles.heroActions}>
            <Pressable
              onPress={() => router.push('/profile/edit')}
              style={styles.heroButton}
              accessibilityRole="button"
              accessibilityLabel="Edit profile">
              <Text style={styles.heroButtonText}>Edit profile</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={styles.identity}>
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarLetter}>{initial}</Text>
            </View>
          )}
          <View style={styles.identityText}>
            <Text style={styles.handle}>@{profile.username}</Text>
            <Text style={styles.name}>{profile.display_name || 'Member'}</Text>
            {profile.title ? <Text style={styles.title}>{profile.title}</Text> : null}
          </View>
        </View>
      </View>

      <View style={styles.body}>
        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
        <View style={styles.pills}>
          {profile.location ? <Pill label={profile.location} /> : null}
          {profile.contact_email ? (
            <Pill label={profile.contact_email} onPress={() => openMailto(profile.contact_email!)} />
          ) : null}
          {linkedIn ? <Pill label="LinkedIn" onPress={() => openExternalUrl(linkedIn)} /> : null}
          {profile.cv_url ? <Pill label="View CV" onPress={() => openExternalUrl(profile.cv_url!)} /> : null}
        </View>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{studies.length}</Text>
            <Text style={styles.statLabel}>Case studies</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{profile.points_balance_cached ?? 0}</Text>
            <Text style={styles.statLabel}>UXGuard Points</Text>
          </View>
        </View>

        <Text style={styles.section}>Impact stories</Text>
        {studies.length ? (
          <View style={styles.list}>
            {studies.map((item) => (
              <FeedCard
                key={item.id}
                item={{
                  id: item.id,
                  contentType: 'case_study',
                  title: item.title,
                  excerpt: item.summary,
                  coverImageUrl: item.cover_image_url,
                  href: `/case-study/${item.slug || item.id}`,
                  sponsored: false,
                  source: 'supabase',
                }}
                onPress={() => router.push(`/case-study/${item.slug || item.id}`)}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            title="No published case studies yet"
            message={
              owner
                ? 'Write your first evidence-led case study. Other sections stay on the website for now.'
                : 'This member has not published a case study yet.'
            }
            actionLabel={owner ? 'Create a case study' : undefined}
            onAction={owner ? () => router.push('/studio') : undefined}
          />
        )}
        {footer}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: palette.ink[950],
    minHeight: 220,
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  heroScrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 19, 52, 0.45)',
  },
  heroActions: { alignItems: 'flex-end', marginBottom: space.md, zIndex: 1 },
  heroButton: {
    backgroundColor: palette.white,
    borderRadius: radius.md,
    minHeight: 40,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  heroButtonText: { ...type.label, color: palette.ink[950] },
  identity: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md, zIndex: 1 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 28,
    borderWidth: 4,
    borderColor: palette.white,
    backgroundColor: palette.ink[900],
  },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 28,
    borderWidth: 4,
    borderColor: palette.white,
    backgroundColor: palette.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontFamily: 'Fraunces_700Bold', fontSize: 36, color: palette.white },
  identityText: { flex: 1, paddingBottom: 4 },
  handle: { ...type.label, color: palette.brand[200] },
  name: { fontFamily: 'Fraunces_700Bold', fontSize: 28, lineHeight: 32, color: palette.white },
  title: { ...type.body, color: palette.ink[200], marginTop: 4 },
  body: { padding: space.lg, gap: space.md, paddingBottom: 40 },
  bio: { ...type.body, color: colors.text },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  pill: {
    backgroundColor: colors.brandMuted,
    borderRadius: radius.full,
    paddingHorizontal: space.md,
    paddingVertical: 8,
  },
  pillText: { ...type.caption, color: colors.brandText },
  stats: { flexDirection: 'row', gap: space.md },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
  },
  statValue: { ...type.title, color: colors.text },
  statLabel: { ...type.caption, color: colors.textSecondary, textTransform: 'uppercase' },
  section: { ...type.title, color: colors.text, marginTop: space.sm },
  list: { gap: space.md },
});
