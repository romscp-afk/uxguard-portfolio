import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/providers/AuthProvider';
import { color, type } from '@/theme/tokens';

const schema = z.object({
  name: z.string().min(2, 'Enter your name'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type Form = z.infer<typeof schema>;
const colors = color.light;

export default function RegisterScreen() {
  const { configured, signUp } = useAuth();
  const [formError, setFormError] = useState('');
  const [info, setInfo] = useState('');
  const { control, handleSubmit, formState } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '' },
  });

  async function onSubmit(values: Form) {
    setFormError('');
    setInfo('');
    try {
      await signUp({ email: values.email.trim(), password: values.password, name: values.name.trim() });
      setInfo('Check your email if confirmation is required, then sign in.');
      router.replace('/');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not create the account.');
    }
  }

  return (
    <Screen scroll>
      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.body}>Email registration only for this MVP. Existing website passwords are not reused yet.</Text>
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <TextField label="Name" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <TextField
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={field.value}
            onChangeText={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <TextField
            label="Password"
            secureTextEntry
            value={field.value}
            onChangeText={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      {formError ? <Text style={styles.error}>{formError}</Text> : null}
      {info ? <Text style={styles.body}>{info}</Text> : null}
      <Button label="Create account" disabled={!configured || formState.isSubmitting} onPress={handleSubmit(onSubmit)} />
      <Button label="Continue without an account" variant="secondary" onPress={() => router.replace('/(tabs)')} />
      <Link href="/(auth)/login" style={styles.link}>
        Already have an account? Sign in
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.display, color: colors.text },
  body: { ...type.body, color: colors.textSecondary },
  error: { ...type.caption, color: colors.danger },
  link: { ...type.bodyMedium, color: colors.brandText, minHeight: 44, paddingVertical: 12 },
});
