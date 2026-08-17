import { absoluteMediaUrl, contentApiUrl, isSupabaseConfigured } from '@/lib/config';
import { estimateReadingTime } from '@/lib/html';
import { supabase } from '@/lib/supabase';
import type { Article, Campaign, CaseStudy, Category, Challenge, FeedItem } from '@/types/domain';

const FALLBACK_CATEGORIES: Category[] = [
  { id: 'ux', slug: 'ux', name: 'UX', kind: 'topic' },
  { id: 'product', slug: 'product', name: 'Product', kind: 'topic' },
  { id: 'research', slug: 'research', name: 'Research', kind: 'topic' },
  { id: 'careers', slug: 'careers', name: 'Careers', kind: 'topic' },
  { id: 'education', slug: 'education', name: 'Education', kind: 'topic' },
  { id: 'technology', slug: 'technology', name: 'Technology', kind: 'topic' },
];

function mapArticle(row: Record<string, unknown>, source: Article['source']): Article {
  return {
    id: String(row.id),
    slug: String(row.slug || ''),
    title: String(row.title || ''),
    subtitle: (row.subtitle as string) || null,
    excerpt: (row.excerpt as string) || null,
    body_html: (row.body_html as string) || null,
    cover_image_url: absoluteMediaUrl((row.cover_image_url as string) || (row.cover_image as string) || null),
    author_name: (row.author_name as string) || (row.author as { name?: string } | undefined)?.name || null,
    author_title: (row.author_title as string) || null,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    featured: Boolean(row.featured),
    reading_time_min: Number(row.reading_time_min) || estimateReadingTime(String(row.body_html || row.excerpt || '')),
    is_sponsored: Boolean(row.is_sponsored),
    published_at: (row.published_at as string) || null,
    category_id: (row.category_id as string) || null,
    source,
  };
}

function mapCaseStudy(row: Record<string, unknown>, source: CaseStudy['source']): CaseStudy {
  const author = row.author as { name?: string; username?: string } | undefined;
  return {
    id: String(row.id),
    slug: String(row.slug || ''),
    title: String(row.title || ''),
    subtitle: (row.subtitle as string) || null,
    summary: (row.summary as string) || null,
    challenge: (row.challenge as string) || null,
    methodology: (row.methodology as string) || null,
    impact: (row.impact as string) || null,
    reflections: (row.reflections as string) || null,
    client: (row.client as string) || null,
    role: (row.role as string) || null,
    duration: (row.duration as string) || null,
    prototype_url: (row.prototype_url as string) || null,
    cover_image_url: absoluteMediaUrl((row.cover_image_url as string) || (row.cover_image as string) || null),
    author_name: (row.author_name as string) || author?.name || null,
    author_username: (row.author_username as string) || author?.username || null,
    methods: Array.isArray(row.methods) ? (row.methods as string[]) : [],
    metrics: Array.isArray(row.metrics) ? (row.metrics as CaseStudy['metrics']) : [],
    content_blocks: Array.isArray(row.content_blocks) ? (row.content_blocks as CaseStudy['content_blocks']) : [],
    featured: Boolean(row.featured),
    is_sponsored: Boolean(row.is_sponsored),
    published_at: (row.published_at as string) || null,
    source,
  };
}

async function fetchWebArticles(): Promise<Article[]> {
  const urls = [`${contentApiUrl}/api/v1/feed/articles`, `${contentApiUrl}/api/v1/articles`];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const json = (await res.json()) as { articles?: Record<string, unknown>[] };
      return (json.articles || []).map((row) => mapArticle(row, 'web'));
    } catch {
      // Try the next public endpoint.
    }
  }
  return [];
}

async function fetchWebCaseStudies(): Promise<CaseStudy[]> {
  try {
    const res = await fetch(`${contentApiUrl}/api/v1/feed/case-studies?limit=40`);
    if (!res.ok) return [];
    const json = (await res.json()) as Record<string, unknown>[] | { items?: Record<string, unknown>[] };
    const rows = Array.isArray(json) ? json : json.items || [];
    return rows.map((row) => mapCaseStudy(row, 'web'));
  } catch {
    return [];
  }
}

async function fetchWebCaseStudy(idOrSlug: string): Promise<CaseStudy | null> {
  try {
    const direct = await fetch(`${contentApiUrl}/api/v1/case-studies/${encodeURIComponent(idOrSlug)}`);
    if (direct.ok) return mapCaseStudy((await direct.json()) as Record<string, unknown>, 'web');
  } catch {
    // Fall through to the public feed and resolve by id.
  }
  const list = await fetchWebCaseStudies();
  const found = list.find((item) => item.id === idOrSlug || item.slug === idOrSlug);
  if (!found?.slug || found.slug === idOrSlug) return found || null;
  try {
    const full = await fetch(`${contentApiUrl}/api/v1/case-studies/${encodeURIComponent(found.slug)}`);
    if (full.ok) return mapCaseStudy((await full.json()) as Record<string, unknown>, 'web');
  } catch {
    return found;
  }
  return found;
}

export async function listCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured) return FALLBACK_CATEGORIES;
  const { data, error } = await supabase
    .from('content_categories')
    .select('id, slug, name, kind')
    .eq('is_active', true)
    .order('sort_order');
  if (error || !data?.length) return FALLBACK_CATEGORIES;
  return data as Category[];
}

function matchesFallbackCategory(haystack: string, categoryId?: string) {
  if (!categoryId || /^[0-9a-f-]{36}$/i.test(categoryId)) return true;
  const category = FALLBACK_CATEGORIES.find((item) => item.id === categoryId);
  if (!category) return true;
  const text = haystack.toLowerCase();
  return text.includes(category.name.toLowerCase()) || text.includes(category.slug);
}

export const PAGE_SIZE = 8;

export async function listArticles(params?: {
  query?: string;
  categoryId?: string;
  from?: number;
  to?: number;
}): Promise<Article[]> {
  if (isSupabaseConfigured) {
    let request = supabase.from('articles').select('*').eq('status', 'published').order('published_at', { ascending: false });
    if (params?.categoryId) request = request.eq('category_id', params.categoryId);
    if (params?.from != null && params?.to != null && !params.query) {
      request = request.range(params.from, params.to);
    }
    const { data, error } = await request;
    if (!error && data && data.length > 0) {
      let rows = data.map((row) => mapArticle(row, 'supabase'));
      if (params?.query) {
        const q = params.query.toLowerCase();
        rows = rows.filter((item) => `${item.title} ${item.excerpt} ${item.tags.join(' ')}`.toLowerCase().includes(q));
        if (params.from != null && params.to != null) {
          rows = rows.slice(params.from, params.to + 1);
        }
      }
      return rows;
    }
  }
  let web = await fetchWebArticles();
  if (params?.query) {
    const q = params.query.toLowerCase();
    web = web.filter((item) => `${item.title} ${item.excerpt} ${item.tags.join(' ')}`.toLowerCase().includes(q));
  }
  if (params?.categoryId) {
    web = web.filter((item) => matchesFallbackCategory(`${item.title} ${item.excerpt} ${item.tags.join(' ')}`, params.categoryId));
  }
  if (params?.from != null && params?.to != null) {
    web = web.slice(params.from, params.to + 1);
  }
  return web;
}

export async function listCaseStudies(params?: {
  query?: string;
  categoryId?: string;
  from?: number;
  to?: number;
}): Promise<CaseStudy[]> {
  if (isSupabaseConfigured) {
    let request = supabase
      .from('case_studies')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false });
    if (params?.from != null && params?.to != null && !params.query) {
      request = request.range(params.from, params.to);
    }
    const { data, error } = await request;
    if (!error && data && data.length > 0) {
      let rows = data.map((row) => mapCaseStudy(row, 'supabase'));
      if (params?.query) {
        const q = params.query.toLowerCase();
        rows = rows.filter((item) => `${item.title} ${item.summary} ${item.methods.join(' ')}`.toLowerCase().includes(q));
        if (params.from != null && params.to != null) {
          rows = rows.slice(params.from, params.to + 1);
        }
      }
      return rows;
    }
  }
  let web = await fetchWebCaseStudies();
  if (params?.query) {
    const q = params.query.toLowerCase();
    web = web.filter((item) => `${item.title} ${item.summary} ${item.methods.join(' ')}`.toLowerCase().includes(q));
  }
  if (params?.categoryId) {
    web = web.filter((item) =>
      matchesFallbackCategory(`${item.title} ${item.summary} ${item.methods.join(' ')}`, params.categoryId),
    );
  }
  if (params?.from != null && params?.to != null) {
    web = web.slice(params.from, params.to + 1);
  }
  return web;
}

export async function getArticle(idOrSlug: string): Promise<Article | null> {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from('articles')
      .select('*')
      .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
      .maybeSingle();
    if (data) return mapArticle(data, 'supabase');
  }

  try {
    const bySlug = await fetch(`${contentApiUrl}/api/v1/articles/${encodeURIComponent(idOrSlug)}`);
    if (bySlug.ok) {
      const json = (await bySlug.json()) as { article?: Record<string, unknown> };
      if (json.article) return mapArticle(json.article, 'web');
    }
  } catch {
    // Use the public list as a last resort.
  }
  const list = await fetchWebArticles();
  return list.find((item) => item.id === idOrSlug || item.slug === idOrSlug) || null;
}

export async function getCaseStudy(idOrSlug: string): Promise<CaseStudy | null> {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from('case_studies')
      .select('*')
      .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
      .maybeSingle();
    if (data) return mapCaseStudy(data, 'supabase');
  }
  return fetchWebCaseStudy(idOrSlug);
}

export async function listRelatedArticles(id: string, tags: string[]) {
  const all = await listArticles();
  return all.filter((item) => item.id !== id && item.tags.some((tag) => tags.includes(tag))).slice(0, 3);
}

export async function listRelatedCaseStudies(id: string, methods: string[]) {
  const all = await listCaseStudies();
  return all.filter((item) => item.id !== id && item.methods.some((tag) => methods.includes(tag))).slice(0, 3);
}

export async function listPublishedChallenges(): Promise<Challenge[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('challenges')
    .select('id, slug, title, summary, instructions, completion_criteria, points_award, allow_reveal_answers, max_attempts')
    .eq('status', 'published')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Challenge[];
}

export async function listActiveCampaigns(): Promise<Campaign[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('sponsored_campaigns')
    .select('id, title, summary, cta_label, cta_url, cover_image_url, sponsors ( name, logo_url )')
    .eq('status', 'active');
  if (error) return [];
  return (data || []).map((row) => ({
    id: row.id,
    title: row.title,
    summary: row.summary,
    cta_label: row.cta_label,
    cta_url: row.cta_url,
    cover_image_url: absoluteMediaUrl(row.cover_image_url),
    sponsor: Array.isArray(row.sponsors) ? row.sponsors[0] : row.sponsors,
  }));
}

export async function buildHomeFeed(): Promise<FeedItem[]> {
  const [articles, caseStudies, challenges, campaigns] = await Promise.all([
    listArticles(),
    listCaseStudies(),
    listPublishedChallenges().catch(() => [] as Challenge[]),
    listActiveCampaigns().catch(() => [] as Campaign[]),
  ]);

  const items: FeedItem[] = [];

  for (const campaign of campaigns) {
    items.push({
      id: campaign.id,
      contentType: 'campaign',
      title: campaign.title,
      excerpt: campaign.summary,
      coverImageUrl: campaign.cover_image_url,
      href: `/campaign/${campaign.id}`,
      sponsored: true,
      source: 'supabase',
    });
  }

  for (const article of articles.slice(0, 8)) {
    items.push({
      id: article.id,
      contentType: 'article',
      title: article.title,
      subtitle: article.subtitle,
      excerpt: article.excerpt,
      coverImageUrl: article.cover_image_url,
      href: `/article/${article.slug || article.id}`,
      sponsored: article.is_sponsored,
      featured: article.featured,
      readingTimeMin: article.reading_time_min,
      publishedAt: article.published_at,
      source: article.source,
      slug: article.slug,
    });
  }

  for (const study of caseStudies.filter((item) => item.featured).slice(0, 4)) {
    items.push({
      id: study.id,
      contentType: 'case_study',
      title: study.title,
      subtitle: study.subtitle,
      excerpt: study.summary,
      coverImageUrl: study.cover_image_url,
      href: `/case-study/${study.slug || study.id}`,
      sponsored: study.is_sponsored,
      featured: true,
      publishedAt: study.published_at,
      source: study.source,
      slug: study.slug,
    });
  }

  for (const challenge of challenges.slice(0, 4)) {
    items.push({
      id: challenge.id,
      contentType: 'challenge',
      title: challenge.title,
      excerpt: challenge.summary,
      href: `/challenge/${challenge.id}`,
      sponsored: false,
      points: challenge.points_award,
      source: 'supabase',
      slug: challenge.slug,
    });
  }

  return items;
}

export async function toggleBookmark(contentType: 'article' | 'case_study', contentId: string, userId: string) {
  const { data: existing } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('user_id', userId)
    .eq('content_type', contentType)
    .eq('content_id', contentId)
    .maybeSingle();
  if (existing) {
    await supabase.from('bookmarks').delete().eq('id', existing.id);
    return false;
  }
  const { error } = await supabase.from('bookmarks').insert({
    user_id: userId,
    content_type: contentType,
    content_id: contentId,
  });
  if (error) throw error;
  return true;
}

export async function isBookmarked(contentType: 'article' | 'case_study', contentId: string, userId: string) {
  const { data } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('user_id', userId)
    .eq('content_type', contentType)
    .eq('content_id', contentId)
    .maybeSingle();
  return Boolean(data);
}

export async function listBookmarks(userId: string) {
  const { data, error } = await supabase
    .from('bookmarks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function upsertReadingProgress(
  userId: string,
  contentType: 'article' | 'case_study',
  contentId: string,
  percent: number,
) {
  const { error } = await supabase.from('reading_progress').upsert({
    user_id: userId,
    content_type: contentType,
    content_id: contentId,
    percent: Math.min(100, Math.max(0, Math.round(percent))),
    completed_at: percent >= 95 ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
