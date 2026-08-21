import type { CaseStudy, CaseStudyListItem, UserProfile } from "../types";
import { api } from "../api/client";

const KEY = "uxguard_case_study_cache";

function loadCache(): Record<string, CaseStudy> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveCaseStudyToCache(study: CaseStudy) {
  const cache = loadCache();
  cache[String(study.id)] = study;
  localStorage.setItem(KEY, JSON.stringify(cache));
}

export function getCaseStudyFromCache(id: number): CaseStudy | null {
  return loadCache()[String(id)] ?? null;
}

export function removeCaseStudyFromCache(id: number) {
  const cache = loadCache();
  delete cache[String(id)];
  localStorage.setItem(KEY, JSON.stringify(cache));
}

export function listCachedCaseStudies(authorId: number): CaseStudyListItem[] {
  const uid = Number(authorId);
  return Object.values(loadCache())
    .filter((study) => Number(study.author_id) === uid)
    .map((study) => ({
      id: study.id,
      slug: study.slug,
      title: study.title,
      subtitle: study.subtitle,
      summary: study.summary,
      client: study.client,
      cover_image: study.cover_image,
      methods: study.methods || [],
      featured: study.featured,
      status: study.status,
      like_count: Number((study as CaseStudyListItem).like_count) || 0,
      updated_at: study.updated_at,
      published_at: study.published_at || null,
    }))
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export function mergeCaseStudyLists(
  remote: CaseStudyListItem[],
  cached: CaseStudyListItem[],
): CaseStudyListItem[] {
  const byId = new Map<number, CaseStudyListItem>();
  for (const item of remote) byId.set(Number(item.id), item);
  for (const item of cached) {
    const id = Number(item.id);
    const existing = byId.get(id);
    if (!existing) {
      byId.set(id, item);
      continue;
    }
    // Prefer newer content fields from cache, but never wipe live engagement counts.
    if (new Date(item.updated_at) > new Date(existing.updated_at)) {
      byId.set(id, {
        ...item,
        like_count: Math.max(Number(existing.like_count) || 0, Number(item.like_count) || 0),
      });
    } else {
      byId.set(id, {
        ...existing,
        like_count: Math.max(Number(existing.like_count) || 0, Number(item.like_count) || 0),
      });
    }
  }
  return [...byId.values()].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
}

export async function syncCachedCaseStudies(
  userId: number,
  options?: { claimAll?: boolean },
): Promise<void> {
  const uid = Number(userId);
  const cache = loadCache();
  const owned = Object.values(cache).filter((study) => {
    if (options?.claimAll) return true;
    const aid = Number(study.author_id);
    return !Number.isFinite(aid) || aid === uid;
  });
  if (owned.length === 0) return;

  const payload = owned.map((study) => ({
    ...study,
    author_id: uid,
    status: study.status || "draft",
  }));

  await api.syncCaseStudies(payload);

  // After sync, refresh cache from server to prevent stale entries from
  // overwriting published studies on the next sync.
  try {
    const remote = await api.adminListCaseStudies();
    const next = { ...cache };
    for (const item of remote) {
      const existing = next[String(item.id)] as CaseStudy | undefined;
      // Always accept server's published status; only keep cache if newer for drafts.
      if (
        existing &&
        String(existing.status) !== "published" &&
        String(item.status) === "published"
      ) {
        next[String(item.id)] = { ...existing, ...item, status: "published" } as CaseStudy;
      } else if (!existing) {
        next[String(item.id)] = item as unknown as CaseStudy;
      }
    }
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Best-effort cache refresh; old cache is still fine.
    const next = { ...cache };
    for (const study of payload) {
      next[String(study.id)] = study as CaseStudy;
    }
    localStorage.setItem(KEY, JSON.stringify(next));
  }
}

export async function loadMergedCaseStudies(
  userId: number,
  options?: { claimAll?: boolean },
): Promise<{
  studies: CaseStudyListItem[];
  syncError: string | null;
}> {
  let syncError: string | null = null;
  try {
    await syncCachedCaseStudies(userId, options);
  } catch (err) {
    syncError = err instanceof Error ? err.message : "Could not sync offline case studies";
  }

  try {
    const remote = await api.adminListCaseStudies();
    const cached = listCachedCaseStudies(userId);
    return { studies: mergeCaseStudyLists(remote, cached), syncError };
  } catch {
    return {
      studies: listCachedCaseStudies(userId),
      syncError: syncError || "Could not load from server",
    };
  }
}

export function listPublishedCachedCaseStudies(authorId: number): CaseStudyListItem[] {
  return listCachedCaseStudies(authorId).filter((study) => study.status === "published");
}

export function mergePublishedIntoProfile(profile: UserProfile, authorId: number): UserProfile {
  const published = listPublishedCachedCaseStudies(authorId);
  const merged = mergeCaseStudyLists(profile.case_studies, published);
  return { ...profile, case_studies: merged, case_study_count: merged.length };
}
