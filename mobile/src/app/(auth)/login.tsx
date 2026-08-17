import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/providers/AuthProvider';
import { color, space, type } from '@/theme/tokens';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type Form = z.infer<typeof schema>;
const colors = color.light;

export default function LoginScreen() {
  const { configured, signIn } = useAuth();
  const [formError, setFormError] = useState('');
  const { control, handleSubmit, formState } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: Form) {
    setFormError('');
    try {
      await signIn(values.email.trim(), values.password);
      router.replace('/');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not sign in.');
    }
  }

  return (
    <Screen scroll>
      <Text style={styles.kicker}>UXGuard Studio</Text>
      <Text style={styles.title}>Learn UX with evidence, not ads.</Text>
      <Text style={styles.body}>
        Browse published case studies without an account. Sign in to save work, complete challenges, and redeem points.
        This mobile account is separate from the website until identity is unified.
      </Text>
      {!configured ? (
        <Text style={styles.warning}>
          Supabase is not configured yet. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to
          mobile/.env.
        </Text>
      ) : null}
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
      <Button label="Sign in" disabled={!configured || formState.isSubmitting} onPress={handleSubmit(onSubmit)} />
      <Button label="Continue without an account" variant="secondary" onPress={() => router.replace('/(tabs)')} />
      <Link href="/(auth)/forgot-password" style={styles.link}>
        Forgot password?
      </Link>
      <View style={styles.row}>
        <Text style={styles.body}>New here?</Text>
        <Link href="/(auth)/register" style={styles.link}>
          Create an account
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: { ...type.label, color: colors.brandText, textTransform: 'uppercase', letterSpacing: 1.4 },
  title: { ...type.display, color: colors.text },
  body: { ...type.body, color: colors.textSecondary },
  warning: { ...type.body, color: colors.danger },
  error: { ...type.caption, color: colors.danger },
  link: { ...type.bodyMedium, color: colors.brandText, minHeight: 44, paddingVertical: 12 },
  row: { flexDirection: 'row', gap: space.sm, alignItems: 'center', flexWrap: 'wrap' },
});
