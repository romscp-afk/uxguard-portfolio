import { createHash } from "node:crypto";
import { readStore, updateStore } from "./store.js";
import { likeCountsByCaseStudy } from "./like-utils.js";

const VIEW_DEDUPE_MS = 24 * 60 * 60 * 1000;

export function viewerKeyFromRequest(req, clientKey) {
  const fromClient = String(clientKey || "").trim();
  if (fromClient && fromClient.length >= 8 && fromClient.length <= 128) {
    return `c:${fromClient}`;
  }

  const headers = req?.headers || {};
  const forwarded = headers["x-forwarded-for"];
  const ip = String(
    (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim() ||
      headers["x-real-ip"] ||
      req?.socket?.remoteAddress ||
      "unknown",
  );
  const ua = String(headers["user-agent"] || "unknown");
  const digest = createHash("sha256").update(`${ip}|${ua}`).digest("hex").slice(0, 32);
  return `h:${digest}`;
}

export async function recordCaseStudyView({ caseStudyId, authorId, viewerKey, path }) {
  const csId = Number(caseStudyId);
  const aId = Number(authorId);
  const key = String(viewerKey || "").trim();
  if (!Number.isFinite(csId) || csId <= 0 || !Number.isFinite(aId) || !key) {
    return { recorded: false, reason: "invalid" };
  }

  const now = Date.now();
  let recorded = false;

  await updateStore((store) => {
    if (!Array.isArray(store.case_study_views)) store.case_study_views = [];

    const recent = store.case_study_views.find((view) => {
      if (Number(view.case_study_id) !== csId) return false;
      if (String(view.viewer_key) !== key) return false;
      const at = new Date(view.created_at).getTime();
      return Number.isFinite(at) && now - at < VIEW_DEDUPE_MS;
    });

    if (recent) {
      recorded = false;
      return store;
    }

    const id =
      store.case_study_views.reduce((max, v) => Math.max(max, Number(v.id) || 0), 0) + 1;
    store.case_study_views.push({
      id,
      case_study_id: csId,
      author_id: aId,
      viewer_key: key,
      path: path || null,
      created_at: new Date(now).toISOString(),
    });
    recorded = true;
    return store;
  }, { forceRefresh: true });

  return { recorded, case_study_id: csId };
}

function dayKey(iso) {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function buildLast30DaysSeries(views) {
  const counts = new Map();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (let i = 29; i >= 0; i--) {
    const day = new Date(today);
    day.setUTCDate(today.getUTCDate() - i);
    counts.set(day.toISOString().slice(0, 10), 0);
  }

  for (const view of views) {
    const key = dayKey(view.created_at);
    if (key && counts.has(key)) {
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }

  return [...counts.entries()].map(([date, views_count]) => ({ date, views: views_count }));
}

export async function getAnalyticsSummary(userId) {
  const uid = Number(userId);
  const store = await readStore({ forceRefresh: true });
  const studies = (store.caseStudies || []).filter((cs) => Number(cs.author_id) === uid);
  const studyIds = new Set(studies.map((cs) => Number(cs.id)));

  const views = (store.case_study_views || []).filter(
    (v) => studyIds.has(Number(v.case_study_id)) || Number(v.author_id) === uid,
  );
  const likeCounts = likeCountsByCaseStudy(store);

  const commentCounts = new Map();
  for (const comment of store.comments || []) {
    const csId = Number(comment.case_study_id);
    if (!studyIds.has(csId)) continue;
    commentCounts.set(csId, (commentCounts.get(csId) || 0) + 1);
  }

  const lastViewByStudy = new Map();
  const viewsByStudy = new Map();
  for (const view of views) {
    const csId = Number(view.case_study_id);
    if (!studyIds.has(csId)) continue;
    viewsByStudy.set(csId, (viewsByStudy.get(csId) || 0) + 1);
    const prev = lastViewByStudy.get(csId);
    if (!prev || new Date(view.created_at) > new Date(prev)) {
      lastViewByStudy.set(csId, view.created_at);
    }
  }

  let totalLikes = 0;
  let totalComments = 0;
  const caseStudies = studies
    .map((cs) => {
      const id = Number(cs.id);
      const likes = likeCounts.get(id) || 0;
      const comments = commentCounts.get(id) || 0;
      totalLikes += likes;
      totalComments += comments;
      return {
        id,
        title: cs.title || "Untitled",
        slug: cs.slug || "",
        status: cs.status || "draft",
        views: viewsByStudy.get(id) || 0,
        likes,
        comments,
        last_viewed_at: lastViewByStudy.get(id) || null,
        updated_at: cs.updated_at || null,
      };
    })
    .sort((a, b) => b.views - a.views || String(a.title).localeCompare(String(b.title)));

  const published = studies.filter((cs) => cs.status === "published").length;

  return {
    totals: {
      views: views.filter((v) => studyIds.has(Number(v.case_study_id))).length,
      likes: totalLikes,
      comments: totalComments,
      published_case_studies: published,
      case_studies: studies.length,
    },
    case_studies: caseStudies,
    views_last_30_days: buildLast30DaysSeries(
      views.filter((v) => studyIds.has(Number(v.case_study_id))),
    ),
  };
}
