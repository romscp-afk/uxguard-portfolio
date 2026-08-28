import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { updateProfile, uploadProfileAsset } from '@/api/profile';
import { AuthGate } from '@/components/auth/AuthGate';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/providers/AuthProvider';
import { color, radius, space, type } from '@/theme/tokens';

const optionalUrl = z
  .string()
  .optional()
  .refine((value) => !value || /^https?:\/\//i.test(value), 'Enter a full URL starting with https://');

const schema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30)
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers, and hyphens'),
  display_name: z.string().min(2, 'Enter your name'),
  title: z.string().optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
  contact_email: z
    .string()
    .optional()
    .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), 'Enter a valid email'),
  linkedin: optionalUrl,
  cv_url: optionalUrl,
});

type Form = z.infer<typeof schema>;
const colors = color.light;

export default function EditProfileScreen() {
  const { session, profile, refresh } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null);
  const [coverUrl, setCoverUrl] = useState(profile?.cover_image_url || null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: profile?.username || '',
      display_name: profile?.display_name || '',
      title: profile?.title || '',
      bio: profile?.bio || '',
      location: profile?.location || '',
      contact_email: profile?.contact_email || '',
      linkedin: profile?.social_links?.linkedin || '',
      cv_url: profile?.cv_url || '',
    },
  });

  async function pickImage(kind: 'avatar' | 'cover') {
    if (!session?.user.id) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setMessage('Photo library permission is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect: kind === 'avatar' ? [1, 1] : [16, 9],
    });
    if (result.canceled || !result.assets[0]) return;
    setBusy(true);
    setMessage('');
    try {
      const url = await uploadProfileAsset(session.user.id, kind, result.assets[0].uri, result.assets[0].mimeType);
      if (kind === 'avatar') setAvatarUrl(url);
      else setCoverUrl(url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not upload the photo.');
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(values: Form) {
    if (!session?.user.id) return;
    setBusy(true);
    setMessage('');
    try {
      await updateProfile(session.user.id, {
        username: values.username.trim().toLowerCase(),
        display_name: values.display_name.trim(),
        title: values.title?.trim() || null,
        bio: values.bio?.trim() || null,
        location: values.location?.trim() || null,
        contact_email: values.contact_email?.trim() || null,
        cv_url: values.cv_url?.trim() || null,
        avatar_url: avatarUrl,
        cover_image_url: coverUrl,
        social_links: values.linkedin?.trim() ? { linkedin: values.linkedin.trim() } : {},
      });
      await refresh();
      router.back();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save your profile.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthGate title="Sign in to edit your profile" message="A mobile account is required to manage your UXGuard Studio profile.">
      <Screen scroll>
        <Text style={styles.title}>Edit profile</Text>
        <Text style={styles.body}>
          Same public profile fields as uxguard.studio. Mobile currently publishes case studies only — resume, jobs,
          and articles stay on the website.
        </Text>

        <Text style={styles.label}>Cover photo</Text>
        {coverUrl ? <Image source={{ uri: coverUrl }} style={styles.cover} contentFit="cover" /> : null}
        <Button label={coverUrl ? 'Replace cover' : 'Upload cover'} variant="secondary" disabled={busy} onPress={() => pickImage('cover')} />

        <Text style={styles.label}>Profile photo</Text>
        {avatarUrl ? <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" /> : null}
        <Button label={avatarUrl ? 'Replace photo' : 'Upload photo'} variant="secondary" disabled={busy} onPress={() => pickImage('avatar')} />

        <Controller
          control={form.control}
          name="username"
          render={({ field, fieldState }) => (
            <TextField
              label="Username"
              autoCapitalize="none"
              value={field.value}
              onChangeText={(value) => field.onChange(value.toLowerCase())}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="display_name"
          render={({ field, fieldState }) => (
            <TextField label="Display name" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
          )}
        />
        <Controller
          control={form.control}
          name="title"
          render={({ field }) => <TextField label="Title" value={field.value} onChangeText={field.onChange} />}
        />
        <Controller
          control={form.control}
          name="bio"
          render={({ field }) => <TextField label="Bio" multiline value={field.value} onChangeText={field.onChange} />}
        />
        <Controller
          control={form.control}
          name="location"
          render={({ field }) => <TextField label="Location" value={field.value} onChangeText={field.onChange} />}
        />
        <Controller
          control={form.control}
          name="contact_email"
          render={({ field, fieldState }) => (
            <TextField
              label="Public contact email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="linkedin"
          render={({ field, fieldState }) => (
            <TextField
              label="LinkedIn URL"
              autoCapitalize="none"
              keyboardType="url"
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="cv_url"
          render={({ field, fieldState }) => (
            <TextField
              label="CV / resume URL"
              autoCapitalize="none"
              keyboardType="url"
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />

        {message ? <Text style={styles.error}>{message}</Text> : null}
        <View style={styles.row}>
          <Button label={busy ? 'Saving…' : 'Save profile'} disabled={busy} onPress={form.handleSubmit(onSubmit)} />
        </View>
      </Screen>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  title: { ...type.display, color: colors.text },
  body: { ...type.body, color: colors.textSecondary },
  label: { ...type.label, color: colors.textSecondary },
  cover: { width: '100%', height: 140, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  avatar: { width: 96, height: 96, borderRadius: 28, backgroundColor: colors.surfaceAlt },
  error: { ...type.body, color: colors.danger },
  row: { gap: space.sm },
});
