import { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { subscribeToAuthUrls } from '@/lib/authDeepLinks';
import { isSupabaseConfigured } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import type { Profile, UserPreferences } from '@/types/domain';

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  preferences: UserPreferences | null;
  refresh: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { email: string; password: string; name: string }) => Promise<void>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  completeOnboarding: (input: { interestIds: string[]; experienceLevel: string }) => Promise<void>;
  updatePreferences: (input: { interestIds: string[]; experienceLevel: string }) => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadProfile(userId: string) {
  const [{ data: profile }, { data: preferences }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle(),
  ]);
  return {
    profile: (profile as Profile | null) ?? null,
    preferences: (preferences as UserPreferences | null) ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessionLoading, setSessionLoading] = useState(true);
  const [hydratingProfile, setHydratingProfile] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const loading = sessionLoading || hydratingProfile;

  const refresh = useCallback(async () => {
    if (!session?.user.id) {
      setProfile(null);
      setPreferences(null);
      return;
    }
    const next = await loadProfile(session.user.id);
    setProfile(next.profile);
    setPreferences(next.preferences);
  }, [session?.user.id]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSessionLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      if (data.session) setHydratingProfile(true);
      setSessionLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) setHydratingProfile(true);
    });
    const unsubscribeLinks = subscribeToAuthUrls();
    return () => {
      listener.subscription.unsubscribe();
      unsubscribeLinks();
    };
  }, []);

  useEffect(() => {
    if (!session?.user.id) {
      setProfile(null);
      setPreferences(null);
      setHydratingProfile(false);
      return;
    }
    setHydratingProfile(true);
    loadProfile(session.user.id)
      .then((next) => {
        setProfile(next.profile);
        setPreferences(next.preferences);
      })
      .catch(() => undefined)
      .finally(() => setHydratingProfile(false));
  }, [session?.user.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: isSupabaseConfigured,
      loading,
      session,
      profile,
      preferences,
      refresh,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      signUp: async ({ email, password, name }) => {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name } },
        });
        if (error) throw error;
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
      requestPasswordReset: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: Linking.createURL('reset-password'),
        });
        if (error) throw error;
      },
      updatePassword: async (password) => {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      },
      completeOnboarding: async ({ interestIds, experienceLevel }) => {
        if (!session?.user.id) throw new Error('Not signed in');
        const now = new Date().toISOString();
        const { error: prefError } = await supabase.from('user_preferences').upsert({
          user_id: session.user.id,
          interest_ids: interestIds,
          experience_level: experienceLevel,
          onboarding_step: 'complete',
          completed_at: now,
          updated_at: now,
        });
        if (prefError) throw prefError;
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            experience_level: experienceLevel,
            onboarding_completed_at: now,
          })
          .eq('id', session.user.id);
        if (profileError) throw profileError;
        await refresh();
      },
      updatePreferences: async ({ interestIds, experienceLevel }) => {
        if (!session?.user.id) throw new Error('Not signed in');
        const now = new Date().toISOString();
        const { error: prefError } = await supabase.from('user_preferences').upsert({
          user_id: session.user.id,
          interest_ids: interestIds,
          experience_level: experienceLevel,
          updated_at: now,
        });
        if (prefError) throw prefError;
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ experience_level: experienceLevel })
          .eq('id', session.user.id);
        if (profileError) throw profileError;
        await refresh();
      },
      deleteAccount: async () => {
        const { error: fnError } = await supabase.functions.invoke('delete-account', { method: 'POST' });
        if (fnError) {
          const { error: rpcError } = await supabase.rpc('delete_own_account');
          if (rpcError) throw rpcError;
        }
        await supabase.auth.signOut();
      },
    }),
    [loading, session, profile, preferences, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
