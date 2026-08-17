import * as Linking from 'expo-linking';
import { router } from 'expo-router';

import { supabase } from '@/lib/supabase';

function paramsFromUrl(url: string) {
  const normalised = url.replace('#', '?');
  try {
    const parsed = new URL(normalised);
    return parsed.searchParams;
  } catch {
    const query = normalised.split('?')[1] || '';
    return new URLSearchParams(query);
  }
}

export async function handleAuthUrl(url: string | null) {
  if (!url) return;
  const params = paramsFromUrl(url);
  const code = params.get('code');
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const type = params.get('type');

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
  } else if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
  } else {
    return;
  }

  if (type === 'recovery' || url.includes('reset-password')) {
    router.replace('/(auth)/reset-password');
  }
}

export function subscribeToAuthUrls() {
  const sub = Linking.addEventListener('url', ({ url }) => {
    handleAuthUrl(url).catch(() => undefined);
  });
  Linking.getInitialURL().then((url) => handleAuthUrl(url).catch(() => undefined));
  return () => sub.remove();
}
