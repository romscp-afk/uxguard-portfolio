import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/providers/AuthProvider';
import { color, type } from '@/theme/tokens';

const schema = z.object({ email: z.string().email('Enter a valid email') });
type Form = z.infer<typeof schema>;
const colors = color.light;

export default function ForgotPasswordScreen() {
  const { requestPasswordReset } = useAuth();
  const [message, setMessage] = useState('');
  const { control, handleSubmit, formState } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: Form) {
    await requestPasswordReset(values.email.trim());
    setMessage('If an account exists for that email, we sent a reset link.');
  }

  return (
    <Screen scroll>
      <Text style={styles.title}>Reset password</Text>
      <Text style={styles.body}>We’ll email a link that opens this app so you can choose a new password.</Text>
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
      {message ? <Text style={styles.body}>{message}</Text> : null}
      <Button label="Send reset link" disabled={formState.isSubmitting} onPress={handleSubmit(onSubmit)} />
      <Link href="/(auth)/login" style={styles.link}>
        Back to sign in
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.display, color: colors.text },
  body: { ...type.body, color: colors.textSecondary },
  link: { ...type.bodyMedium, color: colors.brandText, minHeight: 44, paddingVertical: 12 },
});
