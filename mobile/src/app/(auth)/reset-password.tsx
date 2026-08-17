import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/providers/AuthProvider';
import { color, type } from '@/theme/tokens';

const schema = z.object({ password: z.string().min(8, 'Password must be at least 8 characters') });
type Form = z.infer<typeof schema>;
const colors = color.light;

export default function ResetPasswordScreen() {
  const { updatePassword } = useAuth();
  const [error, setError] = useState('');
  const { control, handleSubmit, formState } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { password: '' },
  });

  async function onSubmit(values: Form) {
    setError('');
    try {
      await updatePassword(values.password);
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password.');
    }
  }

  return (
    <Screen scroll>
      <Text style={styles.title}>Choose a new password</Text>
      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <TextField
            label="New password"
            secureTextEntry
            value={field.value}
            onChangeText={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Update password" disabled={formState.isSubmitting} onPress={handleSubmit(onSubmit)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.display, color: colors.text },
  error: { ...type.caption, color: colors.danger },
});
