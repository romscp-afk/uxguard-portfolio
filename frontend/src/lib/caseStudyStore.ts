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
  return Object.values(loadCache())
    .filter((study) => study.author_id === authorId)
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
      updated_at: study.updated_at,
    }))
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export function mergeCaseStudyLists(
  remote: CaseStudyListItem[],
  cached: CaseStudyListItem[],
): CaseStudyListItem[] {
  const byId = new Map<number, CaseStudyListItem>();
  for (const item of remote) byId.set(item.id, item);
  for (const item of cached) {
    const existing = byId.get(item.id);
    if (!existing || new Date(item.updated_at) > new Date(existing.updated_at)) {
      byId.set(item.id, item);
    }
  }
  return [...byId.values()].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
}

export async function loadMergedCaseStudies(userId: number): Promise<CaseStudyListItem[]> {
  try {
    await syncCachedCaseStudies(userId);
  } catch {
    // Continue with cached merge if sync fails.
  }

  try {
    const remote = await api.adminListCaseStudies();
    const cached = listCachedCaseStudies(userId);
    return mergeCaseStudyLists(remote, cached);
  } catch {
    return listCachedCaseStudies(userId);
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

export async function syncCachedCaseStudies(userId: number): Promise<void> {
  const cached = Object.values(loadCache()).filter((study) => study.author_id === userId);
  if (cached.length === 0) return;
  await api.syncCaseStudies(cached);
}
