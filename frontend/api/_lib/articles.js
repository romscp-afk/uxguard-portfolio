/**
 * Medium-style long-form articles.
 * Create/edit: any professional/admin (canEditPlatform). Public read of published articles.
 */
import { readStore, updateStore } from "./store.js";
import { assertCanEdit, isAdmin } from "./roles.js";

export { assertCanEdit };

function nextId(items) {
  return (items || []).reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function sameId(a, b) {
  return Number(a) === Number(b);
}

function normalizeTags(raw) {
  if (Array.isArray(raw)) {
    return raw.map((t) => String(t || "").trim()).filter(Boolean).slice(0, 20);
  }
  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 20);
  }
  return [];
}

export function normalizeArticle(raw, likes = []) {
  const id = Number(raw?.id) || 0;
  const status = raw?.status === "published" ? "published" : "draft";
  const articleLikes = (likes || []).filter((l) => sameId(l.article_id, id));
  return {
    id,
    slug: String(raw?.slug || "").trim() || `article-${id || "draft"}`,
    title: String(raw?.title || "").trim(),
    subtitle: String(raw?.subtitle || "").trim(),
    excerpt: String(raw?.excerpt || "").trim(),
    body_html: String(raw?.body_html || ""),
    cover_image: raw?.cover_image || null,
    tags: normalizeTags(raw?.tags),
    status,
    featured: Boolean(raw?.featured),
    author_id: Number(raw?.author_id) || 0,
    reading_time_min:
      Number(raw?.reading_time_min) > 0
        ? Math.round(Number(raw.reading_time_min))
        : estimateReadingTime(raw?.body_html || raw?.excerpt || ""),
    created_at: raw?.created_at || new Date().toISOString(),
    updated_at: raw?.updated_at || raw?.created_at || new Date().toISOString(),
    published_at: status === "published" ? raw?.published_at || raw?.updated_at || null : null,
    like_count: articleLikes.length,
  };
}

export function estimateReadingTime(htmlOrText) {
  const text = String(htmlOrText || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = text ? text.split(" ").length : 0;
  return Math.max(1, Math.ceil(words / 220));
}

export function toArticleListItem(article) {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    subtitle: article.subtitle,
    excerpt: article.excerpt,
    cover_image: article.cover_image,
    tags: article.tags || [],
    status: article.status,
    featured: Boolean(article.featured),
    reading_time_min: article.reading_time_min,
    author_id: article.author_id,
    published_at: article.published_at,
    updated_at: article.updated_at,
    like_count: article.like_count || 0,
  };
}

async function uniqueSlug(title, excludeId = null) {
  const store = await readStore({ forceRefresh: true });
  const base = slugify(title) || `article-${Date.now()}`;
  let candidate = base;
  let counter = 2;
  while (
    (store.articles || []).some(
      (a) => a.slug === candidate && (excludeId == null || !sameId(a.id, excludeId)),
    )
  ) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }
  return candidate;
}

export function assertCanManageArticles(user) {
  assertCanEdit(user);
}

export function canAccessArticleAsAuthor(user, article) {
  if (!user || !article) return false;
  if (isAdmin(user)) return true;
  return Number(article.author_id) === Number(user.id);
}

function authorSummary(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    title: user.title || "",
    bio: user.bio || "",
    avatar_url: user.avatar_url || null,
  };
}

export async function listPublishedArticles({ featured, limit } = {}) {
  const store = await readStore();
  const likes = store.article_likes || [];
  const users = store.users || [];
  let list = (Array.isArray(store.articles) ? store.articles : [])
    .filter((a) => a && a.status === "published")
    .map((a) => {
      const id = Number(a.id) || 0;
      const likeCount = likes.filter((l) => sameId(l.article_id, id)).length;
      return {
        id,
        slug: String(a.slug || "").trim() || `article-${id || "draft"}`,
        title: String(a.title || "").trim(),
        subtitle: String(a.subtitle || "").trim(),
        excerpt: String(a.excerpt || "").trim(),
        cover_image: a.cover_image || null,
        tags: normalizeTags(a.tags),
        status: "published",
        featured: Boolean(a.featured),
        reading_time_min:
          Number(a.reading_time_min) > 0
            ? Math.round(Number(a.reading_time_min))
            : estimateReadingTime(a.excerpt || ""),
        author_id: Number(a.author_id) || 0,
        published_at: a.published_at || a.updated_at || null,
        updated_at: a.updated_at || a.published_at || null,
        like_count: likeCount,
        author: authorSummary(users.find((u) => sameId(u.id, a.author_id))),
      };
    });
  if (featured !== undefined) {
    list = list.filter((a) => a.featured === featured);
  }
  list.sort((a, b) =>
    String(b.published_at || b.updated_at).localeCompare(String(a.published_at || a.updated_at)),
  );
  if (limit && Number(limit) > 0) list = list.slice(0, Number(limit));
  return list;
}

export async function listArticlesForUser(userId, { includeAll = false } = {}) {
  const store = await readStore({ forceRefresh: true });
  const uid = Number(userId);
  return (store.articles || [])
    .map((a) => normalizeArticle(a, store.article_likes || []))
    .filter((a) => (includeAll ? true : Number(a.author_id) === uid))
    .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
    .map(toArticleListItem);
}

/** @deprecated use listArticlesForUser */
export async function listArticlesForAdmin() {
  return listArticlesForUser(0, { includeAll: true });
}

export async function getArticleById(id) {
  const store = await readStore({ forceRefresh: true });
  const article = (store.articles || []).find((a) => sameId(a.id, id));
  if (!article) return null;
  return normalizeArticle(article, store.article_likes || []);
}

export async function getPublishedArticleBySlug(slug, viewerId = null) {
  const store = await readStore();
  const needle = String(slug || "").trim().toLowerCase();
  const article = (store.articles || []).find(
    (a) => String(a.slug).toLowerCase() === needle && a.status === "published",
  );
  if (!article) return null;
  const normalized = normalizeArticle(article, store.article_likes || []);
  const author = authorSummary(
    (store.users || []).find((u) => sameId(u.id, normalized.author_id)),
  );
  const likes = (store.article_likes || []).filter((l) => sameId(l.article_id, normalized.id));
  return {
    article: {
      ...normalized,
      author,
      is_liked:
        viewerId != null ? likes.some((l) => sameId(l.user_id, viewerId)) : false,
    },
  };
}

export async function createArticle(authorId, payload = {}) {
  const title = String(payload.title || "").trim();
  if (!title) {
    const err = new Error("Title is required");
    err.status = 400;
    throw err;
  }
  const status = payload.status === "published" ? "published" : "draft";
  if (status === "published" && !String(payload.body_html || "").trim()) {
    const err = new Error("Body is required to publish");
    err.status = 400;
    throw err;
  }

  const slug = payload.slug
    ? await uniqueSlug(payload.slug)
    : await uniqueSlug(title);
  const now = new Date().toISOString();
  let created = null;

  await updateStore(
    (store) => {
      if (!store.articles) store.articles = [];
      const id = nextId(store.articles);
      created = normalizeArticle(
        {
          id,
          author_id: Number(authorId),
          title,
          subtitle: payload.subtitle || "",
          excerpt: payload.excerpt || "",
          body_html: payload.body_html || "",
          cover_image: payload.cover_image || null,
          tags: payload.tags || [],
          status,
          featured: Boolean(payload.featured),
          slug,
          reading_time_min: payload.reading_time_min,
          created_at: now,
          updated_at: now,
          published_at: status === "published" ? now : null,
        },
        [],
      );
      store.articles.push(created);
      return store;
    },
    { forceRefresh: true },
  );

  return created;
}

export async function updateArticle(id, authorId, payload = {}, { adminBypass = false } = {}) {
  const articleId = Number(id);
  let saved = null;

  await updateStore(
    (store) => {
      if (!store.articles) store.articles = [];
      const idx = store.articles.findIndex((a) => sameId(a.id, articleId));
      if (idx < 0) {
        const err = new Error("Article not found");
        err.status = 404;
        throw err;
      }
      const current = store.articles[idx];
      if (!adminBypass && !sameId(current.author_id, authorId)) {
        const err = new Error("Not allowed");
        err.status = 403;
        throw err;
      }

      const nextStatus =
        payload.status === "published" || payload.status === "draft"
          ? payload.status
          : current.status || "draft";
      const title =
        payload.title !== undefined ? String(payload.title || "").trim() : current.title;
      if (!title) {
        const err = new Error("Title is required");
        err.status = 400;
        throw err;
      }
      const bodyHtml =
        payload.body_html !== undefined ? payload.body_html : current.body_html || "";
      if (nextStatus === "published" && !String(bodyHtml).trim()) {
        const err = new Error("Body is required to publish");
        err.status = 400;
        throw err;
      }

      let slug = current.slug;
      if (payload.slug) slug = slugify(payload.slug) || slug;
      else if (payload.title && payload.title !== current.title && !payload.keep_slug) {
        // Keep existing public slug stable unless explicitly changed.
      }

      const now = new Date().toISOString();
      const next = normalizeArticle(
        {
          ...current,
          title,
          subtitle: payload.subtitle !== undefined ? payload.subtitle : current.subtitle,
          excerpt: payload.excerpt !== undefined ? payload.excerpt : current.excerpt,
          body_html: bodyHtml,
          cover_image:
            payload.cover_image !== undefined ? payload.cover_image : current.cover_image,
          tags: payload.tags !== undefined ? payload.tags : current.tags,
          status: nextStatus,
          featured:
            payload.featured !== undefined ? Boolean(payload.featured) : current.featured,
          slug,
          reading_time_min:
            payload.reading_time_min !== undefined
              ? payload.reading_time_min
              : current.reading_time_min,
          updated_at: now,
          published_at:
            nextStatus === "published"
              ? current.published_at || now
              : current.published_at || null,
        },
        store.article_likes || [],
      );
      store.articles[idx] = next;
      saved = next;
      return store;
    },
    { forceRefresh: true },
  );

  // Resolve unique slug collisions outside of the atomic update edge cases
  if (payload.slug) {
    const desired = slugify(payload.slug);
    const uniq = await uniqueSlug(desired, articleId);
    if (uniq !== saved.slug) {
      await updateStore(
        (store) => {
          const idx = store.articles.findIndex((a) => sameId(a.id, articleId));
          if (idx >= 0) {
            store.articles[idx] = { ...store.articles[idx], slug: uniq };
            saved = normalizeArticle(store.articles[idx], store.article_likes || []);
          }
          return store;
        },
        { forceRefresh: true },
      );
    }
  }

  return saved;
}

export async function deleteArticle(id, authorId, { adminBypass = false } = {}) {
  const articleId = Number(id);
  await updateStore(
    (store) => {
      if (!store.articles) store.articles = [];
      const current = store.articles.find((a) => sameId(a.id, articleId));
      if (!current) {
        const err = new Error("Article not found");
        err.status = 404;
        throw err;
      }
      if (!adminBypass && !sameId(current.author_id, authorId)) {
        const err = new Error("Not allowed");
        err.status = 403;
        throw err;
      }
      store.articles = store.articles.filter((a) => !sameId(a.id, articleId));
      store.article_likes = (store.article_likes || []).filter(
        (l) => !sameId(l.article_id, articleId),
      );
      store.__uxguardDeleted = {
        ...(store.__uxguardDeleted || {}),
        articles: [...new Set([...(store.__uxguardDeleted?.articles || []), articleId])],
        article_likes: store.__uxguardDeleted?.article_likes || [],
      };
      return store;
    },
    { forceRefresh: true },
  );
  return { ok: true };
}

export async function getArticleLikeStats(articleId, viewerId = null) {
  const store = await readStore({ forceRefresh: true });
  const id = Number(articleId);
  const likes = (store.article_likes || []).filter((l) => sameId(l.article_id, id));
  return {
    article_id: id,
    like_count: likes.length,
    is_liked:
      viewerId != null ? likes.some((l) => sameId(l.user_id, viewerId)) : false,
  };
}

export async function likeArticle(userId, articleId) {
  const id = Number(articleId);
  const uid = Number(userId);
  if (!Number.isFinite(id) || !Number.isFinite(uid)) {
    return { error: "Invalid like request", status: 400 };
  }
  const store = await readStore({ forceRefresh: true });
  const article = (store.articles || []).find(
    (a) => sameId(a.id, id) && a.status === "published",
  );
  if (!article) return { error: "Article not found", status: 404 };

  let created = false;
  await updateStore(
    (s) => {
      if (!s.article_likes) s.article_likes = [];
      const exists = s.article_likes.some(
        (l) => sameId(l.user_id, uid) && sameId(l.article_id, id),
      );
      if (!exists) {
        s.article_likes.push({
          id: nextId(s.article_likes),
          user_id: uid,
          article_id: id,
          created_at: new Date().toISOString(),
        });
        const key = `${uid}:${id}`;
        const prev = s.__uxguardDeleted?.article_likes || [];
        s.__uxguardDeleted = {
          ...(s.__uxguardDeleted || {}),
          article_likes: prev.filter((k) => String(k) !== key),
        };
        created = true;
      }
      return s;
    },
    { forceRefresh: true },
  );

  if (created && !sameId(article.author_id, uid)) {
    try {
      const { createNotification } = await import("./community.js");
      const latest = await readStore({ forceRefresh: true });
      const liker = (latest.users || []).find((u) => sameId(u.id, uid));
      await createNotification({
        userId: article.author_id,
        type: "like",
        title: "Someone liked your article",
        message: `${liker?.name || "Someone"} liked "${article.title}"`,
        link: `/articles/${article.slug}`,
      });
    } catch {
      // best-effort
    }
  }

  return getArticleLikeStats(id, uid);
}

export async function unlikeArticle(userId, articleId) {
  const id = Number(articleId);
  const uid = Number(userId);
  const key = `${uid}:${id}`;
  await updateStore(
    (store) => {
      store.article_likes = (store.article_likes || []).filter(
        (l) => !(sameId(l.user_id, uid) && sameId(l.article_id, id)),
      );
      store.__uxguardDeleted = {
        ...(store.__uxguardDeleted || {}),
        article_likes: [
          ...new Set([...(store.__uxguardDeleted?.article_likes || []), key]),
        ],
      };
      return store;
    },
    { forceRefresh: true },
  );
  return getArticleLikeStats(id, uid);
}
