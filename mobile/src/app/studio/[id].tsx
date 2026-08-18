import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import {
  CASE_STUDY_LIMIT,
  RESEARCH_METHODS,
  createCaseStudy,
  deleteCaseStudy,
  listMyCaseStudies,
  publishChecklist,
  setCaseStudyStatus,
  updateCaseStudy,
  uploadCaseStudyCover,
  type CaseStudyInput,
} from '@/api/studio';
import { AuthGate } from '@/components/auth/AuthGate';
import { Button } from '@/components/ui/Button';
import { ChoiceChip } from '@/components/ui/ChoiceChip';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/providers/AuthProvider';
import { color, radius, space, type } from '@/theme/tokens';

const schema = z.object({
  title: z.string().min(3, 'Enter a title'),
  subtitle: z.string().optional(),
  client: z.string().optional(),
  role: z.string().optional(),
  duration: z.string().optional(),
  prototype_url: z
    .string()
    .optional()
    .refine((value) => !value || /^https?:\/\//i.test(value), 'Enter a full URL starting with https://'),
  summary: z.string().optional(),
  challenge: z.string().optional(),
  methodology: z.string().optional(),
  impact: z.string().optional(),
  reflections: z.string().optional(),
});

type Form = z.infer<typeof schema>;
const colors = color.light;

export default function StudioEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const { session, profile } = useAuth();
  const client = useQueryClient();
  const [methods, setMethods] = useState<string[]>([]);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const mine = useQuery({
    queryKey: ['my-case-studies', session?.user.id],
    queryFn: () => listMyCaseStudies(session!.user.id),
    enabled: Boolean(session?.user.id),
  });
  const existing = mine.data?.find((item) => item.id === id);

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      subtitle: '',
      client: '',
      role: '',
      duration: '',
      prototype_url: '',
      summary: '',
      challenge: '',
      methodology: '',
      impact: '',
      reflections: '',
    },
  });

  useEffect(() => {
    if (!existing) return;
    form.reset({
      title: existing.title || '',
      subtitle: existing.subtitle || '',
      client: existing.client || '',
      role: existing.role || '',
      duration: existing.duration || '',
      prototype_url: existing.prototype_url || '',
      summary: existing.summary || '',
      challenge: existing.challenge || '',
      methodology: existing.methodology || '',
      impact: existing.impact || '',
      reflections: existing.reflections || '',
    });
    setMethods(existing.methods || []);
    setCoverUrl(existing.cover_image_url || null);
  }, [existing, form]);

  function values(): CaseStudyInput {
    return { ...form.getValues(), methods, cover_image_url: coverUrl };
  }

  async function refresh() {
    await client.invalidateQueries({ queryKey: ['my-case-studies'] });
    await client.invalidateQueries({ queryKey: ['home-feed'] });
    await client.invalidateQueries({ queryKey: ['case-study'] });
  }

  async function saveDraft() {
    const parsed = schema.safeParse(form.getValues());
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message || 'Check the form.');
      return;
    }
    if (!profile) return;
    setBusy(true);
    setMessage('');
    try {
      const input = values();
      if (isNew) {
        if ((mine.data?.length || 0) >= CASE_STUDY_LIMIT) {
          throw new Error(`You can keep up to ${CASE_STUDY_LIMIT} case studies.`);
        }
        const createdId = await createCaseStudy(profile, input);
        await refresh();
        router.replace(`/studio/${createdId}`);
      } else {
        await updateCaseStudy(id, input);
        await refresh();
        setMessage('Draft saved.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    const parsed = schema.safeParse(form.getValues());
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message || 'Check the form.');
      return;
    }
    if (!profile) return;
    const input = values();
    const missing = publishChecklist(input);
    if (missing.length) {
      setMessage(`To publish, add: ${missing.join(', ')}.`);
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const studyId = isNew ? await createCaseStudy(profile, input) : id;
      if (!isNew) await updateCaseStudy(id, input);
      await setCaseStudyStatus(studyId, 'published');
      await refresh();
      router.replace(`/case-study/${studyId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not publish.');
    } finally {
      setBusy(false);
    }
  }

  async function unpublish() {
    if (isNew) return;
    setBusy(true);
    try {
      await updateCaseStudy(id, values());
      await setCaseStudyStatus(id, 'draft');
      await refresh();
      setMessage('Moved back to draft.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not unpublish.');
    } finally {
      setBusy(false);
    }
  }

  async function pickCover() {
    if (!session?.user.id) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setMessage('Photo library permission is required for a cover image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [16, 9],
    });
    if (result.canceled || !result.assets[0]) return;
    setBusy(true);
    try {
      const url = await uploadCaseStudyCover(session.user.id, result.assets[0].uri, result.assets[0].mimeType);
      setCoverUrl(url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not upload the cover.');
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete() {
    if (isNew) return;
    Alert.alert('Delete this case study?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await deleteCaseStudy(id);
            await refresh();
            router.replace('/studio');
          } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Could not delete.');
            setBusy(false);
          }
        },
      },
    ]);
  }

  if (!isNew && mine.isLoading) return <LoadingState label="Opening your case study" />;
  if (!isNew && !existing) {
    return <ErrorState message="This case study is not in your studio." onRetry={() => mine.refetch()} />;
  }

  return (
    <AuthGate
      title="Sign in to upload case studies"
      message="A mobile account is required to create and publish case studies.">
      <Screen scroll>
        <Text style={styles.title}>{isNew ? 'New case study' : 'Edit case study'}</Text>
        <Text style={styles.body}>
          Draft anytime. Publishing adds it to Home and Discover. Points are never awarded for views.
        </Text>
        {existing?.status === 'published' ? <Text style={styles.status}>This study is published.</Text> : null}

        <Controller
          control={form.control}
          name="title"
          render={({ field, fieldState }) => (
            <TextField label="Title" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
          )}
        />
        <Controller
          control={form.control}
          name="subtitle"
          render={({ field }) => <TextField label="Subtitle" value={field.value} onChangeText={field.onChange} />}
        />
        <Controller
          control={form.control}
          name="client"
          render={({ field }) => <TextField label="Client or product" value={field.value} onChangeText={field.onChange} />}
        />
        <Controller
          control={form.control}
          name="role"
          render={({ field }) => <TextField label="Your role" value={field.value} onChangeText={field.onChange} />}
        />
        <Controller
          control={form.control}
          name="duration"
          render={({ field }) => <TextField label="Duration" value={field.value} onChangeText={field.onChange} />}
        />
        <Controller
          control={form.control}
          name="prototype_url"
          render={({ field, fieldState }) => (
            <TextField
              label="Prototype URL"
              autoCapitalize="none"
              keyboardType="url"
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />

        <Text style={styles.label}>Cover image</Text>
        {coverUrl ? <Image source={{ uri: coverUrl }} style={styles.cover} contentFit="cover" /> : null}
        <Button label={coverUrl ? 'Replace cover' : 'Upload cover'} variant="secondary" disabled={busy} onPress={pickCover} />

        <Text style={styles.label}>Methods</Text>
        <View style={styles.wrap}>
          {RESEARCH_METHODS.map((method) => (
            <ChoiceChip
              key={method}
              label={method}
              selected={methods.includes(method)}
              onPress={() =>
                setMethods((current) =>
                  current.includes(method) ? current.filter((item) => item !== method) : [...current, method],
                )
              }
            />
          ))}
        </View>

        <Controller
          control={form.control}
          name="summary"
          render={({ field }) => (
            <TextField label="Summary" multiline value={field.value} onChangeText={field.onChange} />
          )}
        />
        <Controller
          control={form.control}
          name="challenge"
          render={({ field }) => (
            <TextField label="Challenge" multiline value={field.value} onChangeText={field.onChange} />
          )}
        />
        <Controller
          control={form.control}
          name="methodology"
          render={({ field }) => (
            <TextField label="Methodology" multiline value={field.value} onChangeText={field.onChange} />
          )}
        />
        <Controller
          control={form.control}
          name="impact"
          render={({ field }) => (
            <TextField label="Impact" multiline value={field.value} onChangeText={field.onChange} />
          )}
        />
        <Controller
          control={form.control}
          name="reflections"
          render={({ field }) => (
            <TextField label="Reflections" multiline value={field.value} onChangeText={field.onChange} />
          )}
        />

        {message ? <Text style={styles.message}>{message}</Text> : null}
        <Button label={busy ? 'Working…' : 'Save draft'} disabled={busy} onPress={saveDraft} />
        <Button
          label={existing?.status === 'published' ? 'Update published study' : 'Publish'}
          variant="secondary"
          disabled={busy}
          onPress={publish}
        />
        {existing?.status === 'published' ? (
          <Button label="Unpublish" variant="ghost" disabled={busy} onPress={unpublish} />
        ) : null}
        {!isNew ? <Button label="Delete" variant="danger" disabled={busy} onPress={confirmDelete} /> : null}
      </Screen>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  title: { ...type.display, color: colors.text },
  body: { ...type.body, color: colors.textSecondary },
  status: { ...type.label, color: colors.brandText, textTransform: 'uppercase' },
  label: { ...type.label, color: colors.textSecondary },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  cover: { width: '100%', height: 160, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  message: { ...type.body, color: colors.danger },
});
