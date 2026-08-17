export const appUrl = (process.env.EXPO_PUBLIC_APP_URL || 'https://uxguard.studio').replace(/\/$/, '');
export const contentApiUrl = (
  process.env.EXPO_PUBLIC_CONTENT_API_URL || appUrl
).replace(/\/$/, '');
export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

function isLocalSupabase(url: string) {
  return url.startsWith('http://127.0.0.1') || url.startsWith('http://localhost') || url.includes('127.0.0.1:54321');
}

export const isSupabaseConfigured = Boolean(
  supabaseAnonKey.length > 20 &&
    !supabaseUrl.includes('YOUR_PROJECT') &&
    (supabaseUrl.startsWith('https://') || isLocalSupabase(supabaseUrl)),
);

export const privacyUrl = `${appUrl}/privacy`;
export const termsUrl = `${appUrl}/terms`;
export const contactEmail = 'hello@uxguard.studio';

export function absoluteMediaUrl(value?: string | null) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/')) return `${contentApiUrl}${value}`;
  return value;
}

export const EXPERIENCE_LEVELS = [
  { value: 'entry', label: 'Entry' },
  { value: 'mid', label: 'Mid-level' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
  { value: 'executive', label: 'Executive' },
  { value: 'career_change', label: 'Career change' },
] as const;

export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number]['value'];
