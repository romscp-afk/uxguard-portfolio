import { isSupabaseConfigured } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import type { CaseStudy, Profile } from '@/types/domain';

export const CASE_STUDY_LIMIT = 8;

export const RESEARCH_METHODS = [
  'Usability Testing',
  'User Interviews',
  'Discovery Interviews',
  'Diary Study',
  'Survey',
  'Card Sorting',
  'Tree Testing',
  'A/B Testing',
  'Analytics Review',
  'Stakeholder Interviews',
  'Concept Testing',
  'Unmoderated Testing',
];

export type CaseStudyInput = {
  title: string;
  subtitle?: string;
  client?: string;
  role?: string;
  duration?: string;
  prototype_url?: string;
  summary?: string;
  challenge?: string;
  methodology?: string;
  impact?: string;
  reflections?: string;
  cover_image_url?: string | null;
  methods: string[];
};

function requireSupabase() {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
}

export function slugifyTitle(title: string) {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'case-study';
  return `${base}-${Date.now().toString(36)}`;
}

function clean(value?: string) {
  const next = value?.trim() || '';
  return next || null;
}

function payload(input: CaseStudyInput) {
  return {
    title: input.title.trim(),
    subtitle: clean(input.subtitle),
    client: clean(input.client),
    role: clean(input.role),
    duration: clean(input.duration),
    prototype_url: clean(input.prototype_url),
    summary: clean(input.summary),
    challenge: clean(input.challenge),
    methodology: clean(input.methodology),
    impact: clean(input.impact),
    reflections: clean(input.reflections),
    cover_image_url: input.cover_image_url || null,
    methods: input.methods,
  };
}

export function publishChecklist(input: CaseStudyInput) {
  const missing: string[] = [];
  if (!input.title.trim()) missing.push('title');
  if (!input.summary?.trim()) missing.push('summary');
  if (!input.cover_image_url) missing.push('cover image');
  if (!input.challenge?.trim()) missing.push('challenge');
  if (!input.methodology?.trim()) missing.push('methodology');
  if (!input.impact?.trim()) missing.push('impact');
  if (!input.methods.length) missing.push('at least one method');
  return missing;
}

export async function listMyCaseStudies(userId: string): Promise<CaseStudy[]> {
  requireSupabase();
  const { data, error } = await supabase
    .from('case_studies')
    .select('*')
    .eq('author_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => ({
      id: String(row.id),
      slug: String(row.slug || ''),
      title: String(row.title || ''),
      subtitle: row.subtitle,
      summary: row.summary,
      challenge: row.challenge,
      methodology: row.methodology,
      impact: row.impact,
      reflections: row.reflections,
      client: row.client,
      role: row.role,
      duration: row.duration,
      prototype_url: row.prototype_url,
      cover_image_url: row.cover_image_url,
      author_name: row.author_name,
      author_username: row.author_username,
      methods: Array.isArray(row.methods) ? row.methods : [],
      metrics: Array.isArray(row.metrics) ? row.metrics : [],
      content_blocks: Array.isArray(row.content_blocks) ? row.content_blocks : [],
      featured: Boolean(row.featured),
      is_sponsored: Boolean(row.is_sponsored),
      published_at: row.published_at,
      status: row.status,
      author_id: row.author_id,
      source: 'supabase' as const,
    }));
}

export async function listPublishedByAuthor(userId: string): Promise<CaseStudy[]> {
  requireSupabase();
  const { data, error } = await supabase
    .from('case_studies')
    .select('*')
    .eq('author_id', userId)
    .eq('status', 'published')
    .order('published_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => ({
    id: String(row.id),
    slug: String(row.slug || ''),
    title: String(row.title || ''),
    subtitle: row.subtitle,
    summary: row.summary,
    challenge: row.challenge,
    methodology: row.methodology,
    impact: row.impact,
    reflections: row.reflections,
    client: row.client,
    role: row.role,
    duration: row.duration,
    prototype_url: row.prototype_url,
    cover_image_url: row.cover_image_url,
    author_name: row.author_name,
    author_username: row.author_username,
    methods: Array.isArray(row.methods) ? row.methods : [],
    metrics: Array.isArray(row.metrics) ? row.metrics : [],
    content_blocks: Array.isArray(row.content_blocks) ? row.content_blocks : [],
    featured: Boolean(row.featured),
    is_sponsored: Boolean(row.is_sponsored),
    published_at: row.published_at,
    status: row.status,
    author_id: row.author_id,
    source: 'supabase' as const,
  }));
}

export async function createCaseStudy(profile: Profile, input: CaseStudyInput) {
  requireSupabase();
  const row = {
    ...payload(input),
    slug: slugifyTitle(input.title),
    status: 'draft',
    author_id: profile.id,
    author_name: profile.display_name,
    author_username: profile.username,
    author_title: profile.title || null,
    author_avatar_url: profile.avatar_url || null,
  };
  const { data, error } = await supabase.from('case_studies').insert(row).select('id').single();
  if (error) throw error;
  return String(data.id);
}

export async function updateCaseStudy(id: string, input: CaseStudyInput) {
  requireSupabase();
  const { error } = await supabase.from('case_studies').update(payload(input)).eq('id', id);
  if (error) throw error;
}

export async function setCaseStudyStatus(id: string, status: 'draft' | 'published') {
  requireSupabase();
  const { error } = await supabase
    .from('case_studies')
    .update({
      status,
      published_at: status === 'published' ? new Date().toISOString() : null,
    })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteCaseStudy(id: string) {
  requireSupabase();
  const { error } = await supabase.from('case_studies').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadCaseStudyCover(userId: string, uri: string, mimeType?: string | null) {
  requireSupabase();
  const ext = mimeType?.includes('png') ? 'png' : mimeType?.includes('webp') ? 'webp' : 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;
  const response = await fetch(uri);
  const body = await response.arrayBuffer();
  const { error } = await supabase.storage.from('case-study-media').upload(path, body, {
    contentType: mimeType || 'image/jpeg',
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('case-study-media').getPublicUrl(path);
  return data.publicUrl;
}
