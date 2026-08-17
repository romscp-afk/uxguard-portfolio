/**
 * One-way sync: published website content -> Supabase.
 * Does not change website auth or Blob storage.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/sync-mobile-content.mjs
 */
const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const contentApi = (process.env.EXPO_PUBLIC_CONTENT_API_URL || process.env.CONTENT_API_URL || 'https://uxguard.studio').replace(
  /\/$/,
  '',
);

if (!supabaseUrl || !serviceKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Never commit the service role key.');
  process.exit(1);
}

async function upsert(table, rows, onConflict) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    throw new Error(`${table} sync failed: ${res.status} ${await res.text()}`);
  }
}

async function loadJson(path) {
  const res = await fetch(`${contentApi}${path}`);
  if (!res.ok) throw new Error(`Fetch ${path} failed: ${res.status}`);
  return res.json();
}

function readingTime(html) {
  const words = String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

const articlesPayload = await loadJson('/api/v1/articles');
const articles = (articlesPayload.articles || []).map((article) => ({
  legacy_id: Number(article.id),
  slug: article.slug,
  title: article.title,
  subtitle: article.subtitle || null,
  excerpt: article.excerpt || null,
  body_html: article.body_html || null,
  cover_image_url: article.cover_image || null,
  author_name: article.author?.name || null,
  author_title: article.author?.title || null,
  status: 'published',
  featured: Boolean(article.featured),
  reading_time_min: Number(article.reading_time_min) || readingTime(article.body_html || article.excerpt),
  tags: article.tags || [],
  is_sponsored: false,
  published_at: article.published_at || article.updated_at || null,
  synced_at: new Date().toISOString(),
}));

const feed = await loadJson('/api/v1/feed/case-studies?limit=100');
const studies = (Array.isArray(feed) ? feed : feed.items || []).map((study) => ({
  legacy_id: Number(study.id),
  slug: study.slug,
  title: study.title,
  subtitle: study.subtitle || null,
  summary: study.summary || null,
  cover_image_url: study.cover_image || null,
  author_name: study.author?.name || null,
  author_username: study.author?.username || null,
  methods: study.methods || [],
  status: 'published',
  featured: Boolean(study.featured),
  is_sponsored: false,
  published_at: study.published_at || study.updated_at || null,
  synced_at: new Date().toISOString(),
}));

if (articles.length) await upsert('articles', articles, 'legacy_id');
if (studies.length) await upsert('case_studies', studies, 'legacy_id');

console.log(`Synced ${articles.length} articles and ${studies.length} case studies.`);
