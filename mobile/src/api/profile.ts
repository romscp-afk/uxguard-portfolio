import { isSupabaseConfigured } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/domain';

export type ProfilePatch = {
  username?: string;
  display_name?: string;
  title?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  cover_image_url?: string | null;
  location?: string | null;
  contact_email?: string | null;
  cv_url?: string | null;
  social_links?: Record<string, string>;
};

function requireSupabase() {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
}

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  requireSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile | null) ?? null;
}

export async function updateProfile(userId: string, patch: ProfilePatch) {
  requireSupabase();
  const { error } = await supabase
    .from('profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}

export async function uploadProfileAsset(
  userId: string,
  kind: 'avatar' | 'cover',
  uri: string,
  mimeType?: string | null,
) {
  requireSupabase();
  const ext = mimeType?.includes('png') ? 'png' : mimeType?.includes('webp') ? 'webp' : 'jpg';
  const path = `${userId}/${kind}-${Date.now()}.${ext}`;
  const response = await fetch(uri);
  const body = await response.arrayBuffer();
  const { error } = await supabase.storage.from('profile-media').upload(path, body, {
    contentType: mimeType || 'image/jpeg',
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('profile-media').getPublicUrl(path);
  return data.publicUrl;
}
