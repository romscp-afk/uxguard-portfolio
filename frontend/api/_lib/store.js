import { get, put, list, del, head, BlobPreconditionFailedError } from "@vercel/blob";
import { defaultPortfolioConfig } from "./roles.js";

function normalizeMediaAssetUrl(url, assetId) {
  if (assetId) return `/api/v1/media/file/${assetId}`;
  const match = String(url || "").match(/\/api\/v1\/media\/file\/(\d+)/);
  if (match) return `/api/v1/media/file/${match[1]}`;
  return url;
}

const STORE_PATH = "uxguard/platform-store.json";
const REGISTRATION_PREFIX = "uxguard/registrations/";
const WRITE_MAX_ATTEMPTS = 8;

const SEED_USERS = [
  {
    id: 1,
    email: "admin@uxguard.io",
    password: "demo1234",
    username: "romal-perera",
    name: "Romal Perera",
    title: "Founder · Super Admin",
    bio: "Founder of UXGuard Studio. Building the professional experience platform for UX careers.",
    avatar_url: null,
    cover_image_url: null,
    contact_email: "admin@uxguard.io",
    location: "Singapore",
    cv_url: null,
    social_links: { linkedin: "https://www.linkedin.com/in/romalperera/" },
    role: "admin",
    onboarding_intent: "publish_case_studies",
    portfolio_config: {
      show_profile: true,
      show_projects: true,
      show_case_studies: true,
      show_timeline: false,
      show_achievements: false,
      show_analytics: false,
      case_study_order: [],
      featured_case_study_ids: [],
    },
  },
  {
    id: 2,
    email: "demo@uxguard.io",
    password: "demo1234",
    username: "alex-rivera",
    name: "Alex Rivera",
    title: "Senior UX Researcher",
    bio: "I help product teams make evidence-based decisions through mixed-methods research.",
    avatar_url: null,
    cover_image_url: null,
    contact_email: "alex@uxguard.io",
    location: "San Francisco, CA",
    cv_url: null,
    social_links: { linkedin: "https://linkedin.com/in/alexrivera" },
    role: "professional",
    onboarding_intent: "publish_case_studies",
    portfolio_config: {
      show_profile: true,
      show_projects: true,
      show_case_studies: true,
      show_timeline: false,
      show_achievements: false,
      show_analytics: false,
      case_study_order: [],
      featured_case_study_ids: [1, 2],
    },
  },
  {
    id: 3,
    email: "jordan@uxguard.io",
    password: "demo1234",
    username: "jordan-kim",
    name: "Jordan Kim",
    title: "UX Research Lead",
    bio: "Mixed-methods researcher focused on B2B SaaS onboarding and activation.",
    avatar_url: null,
    cover_image_url: null,
    contact_email: "jordan@uxguard.io",
    location: "New York, NY",
    cv_url: null,
    social_links: { linkedin: "https://linkedin.com/in/jordankim" },
    role: "professional",
    onboarding_intent: "build_portfolio",
    portfolio_config: {
      show_profile: true,
      show_projects: true,
      show_case_studies: true,
      show_timeline: false,
      show_achievements: false,
      show_analytics: false,
      case_study_order: [],
      featured_case_study_ids: [],
    },
  },
];

const SEED_CASE_STUDIES = [
  {
    id: 1,
    slug: "checkout-usability-study",
    title: "Checkout Usability Study",
    subtitle: "Reducing cart abandonment through moderated usability testing",
    client: "FinFlow",
    project_type: "B2B SaaS",
    role: "Lead UX Researcher",
    duration: "6 weeks",
    summary: "A mixed-methods study to understand why enterprise users abandoned checkout at the payment step.",
    challenge: "Cart abandonment at payment was 34% above industry benchmark.",
    methodology: "8 moderated usability sessions, 120-session analytics review, and 5 stakeholder interviews.",
    impact: "Payment-step completion improved 22%, support tickets for billing dropped 18% in 90 days.",
    reflections: "Recruiting enterprise admins took longer than expected.",
    cover_image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80",
    methods: ["Usability Testing", "Analytics Review", "Stakeholder Interviews"],
    metrics: [
      { label: "Completion lift", value: "+22%", description: "Payment step" },
      { label: "Support reduction", value: "-18%", description: "Billing tickets" },
    ],
    content_blocks: [
      {
        id: "b1",
        type: "text",
        data: { heading: "Research Goals", body: "Identify friction points in the checkout flow." },
      },
      {
        id: "b2",
        type: "quote",
        data: {
          text: "I wasn't sure if my card would be charged immediately.",
          attribution: "Participant P4",
        },
      },
    ],
    status: "published",
    featured: true,
    sort_order: 1,
    project_id: 1,
    author_id: 2,
    created_at: "2026-07-04T19:26:59.000Z",
    updated_at: "2026-07-04T19:26:59.000Z",
    published_at: "2026-07-04T19:26:59.000Z",
    attachments: [],
    prototype_url: "https://example.com",
  },
  {
    id: 2,
    slug: "onboarding-diary-study",
    title: "Onboarding Diary Study",
    subtitle: "Understanding first-week activation for new mobile users",
    client: "HealthTrack",
    project_type: "Consumer Mobile",
    role: "UX Researcher",
    duration: "4 weeks",
    summary: "A 7-day diary study with 20 new users to map onboarding confusion.",
    challenge: "Day-7 retention was 41%.",
    methodology: "Diary study with daily prompts and follow-up interviews.",
    impact: "Day-7 retention improved from 41% to 53%.",
    reflections: "Daily prompts worked well.",
    cover_image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&q=80",
    methods: ["Diary Study", "Unmoderated Testing", "Interviews"],
    metrics: [{ label: "Day-7 retention", value: "+12pts", description: "After 2 releases" }],
    content_blocks: [],
    status: "published",
    featured: true,
    sort_order: 2,
    author_id: 2,
    created_at: "2026-07-04T19:26:59.000Z",
    updated_at: "2026-07-04T19:26:59.000Z",
    published_at: "2026-07-04T19:26:59.000Z",
    attachments: [],
  },
  {
    id: 3,
    slug: "enterprise-admin-research",
    title: "Enterprise Admin Research",
    subtitle: "Mapping admin workflows for multi-tenant SaaS",
    client: "CloudOps",
    project_type: "B2B SaaS",
    role: "Lead Researcher",
    duration: "6 weeks",
    summary: "Contextual inquiry and workflow mapping with IT admins to redesign permission tooling.",
    challenge: "Admins spent 40+ minutes on routine permission changes with high error rates.",
    methodology: "Contextual inquiry, service blueprinting, and prototype validation.",
    impact: "Admin task time reduced by 58% after permission model redesign.",
    reflections: "Shadowing in production environments surfaced edge cases surveys missed.",
    cover_image: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&q=80",
    methods: ["Contextual Inquiry", "Workflow Mapping", "Prototype Testing"],
    metrics: [
      { label: "Task time", value: "-58%", description: "Permission changes" },
      { label: "Admins", value: "14", description: "Interviewed" },
    ],
    content_blocks: [],
    status: "published",
    featured: false,
    sort_order: 1,
    author_id: 3,
    created_at: "2026-07-04T19:26:59.000Z",
    updated_at: "2026-07-04T19:26:59.000Z",
    published_at: "2026-07-04T19:26:59.000Z",
    attachments: [],
  },
];

export const portfolioSettings = {
  site_title: "UXGuard Studio",
  tagline: "Build your professional identity",
  hero_title: "Measure your impact. Showcase your journey.",
  hero_subtitle:
    "The professional platform for UX researchers, designers, and product teams to document research, prove outcomes, and showcase real impact.",
  about:
    "UXGuard Studio helps UX researchers, designers, and product teams build more than a gallery—organize work, tell complete case studies, and present impact with confidence.",
  contact_email: "uxguardstudio@gmail.com",
  social_links: { linkedin: "https://linkedin.com", twitter: "https://twitter.com" },
};

let memoryStore = null;

function getMemoryStore() {
  // Share across Vite SSR module instances in the same Node process
  const g = globalThis;
  if (!g.__uxguardPlatformStore) {
    g.__uxguardPlatformStore = { current: memoryStore };
  }
  return g.__uxguardPlatformStore;
}

function normalizeLoadedStore(data) {
  const store = {
    ...data,
    follows: data.follows || [],
    comments: data.comments || [],
    notifications: data.notifications || [],
    likes: data.likes || [],
    case_study_views: data.case_study_views || [],
    contact_messages: data.contact_messages || [],
    projects: data.projects || [],
    resumes: data.resumes || [],
    ai_conversations: data.ai_conversations || [],
    ai_messages: data.ai_messages || [],
    ai_usage: data.ai_usage || [],
    user_ai_credits: data.user_ai_credits || [],
    saved_ai_outputs: data.saved_ai_outputs || [],
    subscriptions: data.subscriptions || [],
    user_usage: data.user_usage || [],
    payment_transactions: data.payment_transactions || [],
    subscription_events: data.subscription_events || [],
    mediaAssets: (data.mediaAssets || []).map((asset) => ({
      ...asset,
      url: normalizeMediaAssetUrl(asset.url, asset.id),
    })),
    users: (data.users || []).map((user) => ({
      ...user,
      role: user.role === "researcher" ? "professional" : user.role,
      portfolio_config: {
        ...defaultPortfolioConfig(),
        ...(user.portfolio_config || {}),
      },
    })),
  };
  return store;
}

function seedStore() {
  return {
    users: structuredClone(SEED_USERS),
    caseStudies: structuredClone(SEED_CASE_STUDIES),
    portfolioSettings: structuredClone(portfolioSettings),
    mediaAssets: [],
    passwordResetTokens: [],
    follows: [],
    comments: [],
    notifications: [],
    likes: [],
    case_study_views: [],
    contact_messages: [],
    projects: [
      {
        id: 1,
        author_id: 2,
        title: "FinFlow Checkout Redesign",
        slug: "finflow-checkout-redesign",
        client: "FinFlow",
        status: "completed",
        description: "End-to-end UX research and checkout optimization for enterprise billing.",
        start_date: "2025-10-01",
        end_date: "2025-11-15",
        tags: ["UX Research", "B2B SaaS", "Checkout"],
        role: "Lead UX Researcher",
        team: ["Product Manager", "Design Lead"],
        outcomes: [
          { label: "Completion lift", value: "+22%", description: "Payment step" },
          { label: "Support reduction", value: "-18%", description: "Billing tickets" },
        ],
        cover_image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80",
        attachments: [],
        created_at: "2026-07-04T19:26:59.000Z",
        updated_at: "2026-07-04T19:26:59.000Z",
      },
    ],
    resumes: [],
    ai_conversations: [],
    ai_messages: [],
    ai_usage: [],
    user_ai_credits: [],
    saved_ai_outputs: [],
    subscriptions: [],
    user_usage: [],
    payment_transactions: [],
    subscription_events: [],
  };
}

function isMissingBlobError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return (
    error?.name === "BlobNotFoundError" ||
    error?.status === 404 ||
    error?.statusCode === 404 ||
    message.includes("not found") ||
    message.includes("does not exist")
  );
}

function isPreconditionFailed(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return (
    error instanceof BlobPreconditionFailedError ||
    error?.name === "BlobPreconditionFailedError" ||
    error?.status === 412 ||
    error?.statusCode === 412 ||
    message.includes("precondition") ||
    message.includes("etag mismatch")
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readStoreEtag() {
  try {
    const meta = await head(STORE_PATH);
    return meta?.etag || null;
  } catch (error) {
    if (isMissingBlobError(error)) return null;
    throw error;
  }
}

/**
 * Load platform JSON + ETag.
 * Prefer head() for the ETag — get() can return a cached body/etag that no longer
 * matches the live blob, which makes every ifMatch put fail with 412.
 */
async function loadFromBlobWithMeta() {
  const headEtag = await readStoreEtag();

  const result = await get(STORE_PATH, {
    access: "private",
    headers: {
      "Cache-Control": "no-cache, no-store",
      Pragma: "no-cache",
    },
  });

  if (!result) {
    const error = new Error("Platform store not found");
    error.name = "BlobNotFoundError";
    throw error;
  }

  if (result.statusCode === 304) {
    if (memoryStore) {
      return { data: structuredClone(memoryStore), etag: headEtag || result.blob?.etag || null };
    }
    const error = new Error("Platform store not found");
    error.name = "BlobNotFoundError";
    throw error;
  }

  if (result.statusCode !== 200 || !result.stream) {
    const error = new Error("Platform store not found");
    error.name = "BlobNotFoundError";
    throw error;
  }

  const text = await new Response(result.stream).text();
  const getEtag = result.blob?.etag || null;

  // If head and get disagree, wait briefly and re-get once so body is closer to live etag.
  if (headEtag && getEtag && headEtag !== getEtag) {
    await sleep(75);
    const retry = await get(STORE_PATH, {
      access: "private",
      headers: {
        "Cache-Control": "no-cache, no-store",
        Pragma: "no-cache",
      },
    });
    if (retry?.statusCode === 200 && retry.stream) {
      const retryText = await new Response(retry.stream).text();
      return {
        data: JSON.parse(retryText),
        etag: headEtag,
      };
    }
  }

  return { data: JSON.parse(text), etag: headEtag || getEtag };
}

async function loadFromBlob() {
  const { data } = await loadFromBlobWithMeta();
  return data;
}

export async function readStore(options = {}) {
  const forceRefresh = Boolean(options.forceRefresh);
  const slot = getMemoryStore();

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    // Use in-process memory briefly after a local write (read-your-writes), and for a
    // short soft-cache window so like/follow badge GETs don't each re-download Blob.
    const cacheMs = forceRefresh ? 0 : 5000;
    const cacheHit =
      slot.current &&
      typeof slot.writtenAt === "number" &&
      Date.now() - slot.writtenAt < cacheMs;

    if (cacheHit) {
      memoryStore = slot.current;
      return structuredClone(slot.current);
    }

    try {
      const { data, etag } = await loadFromBlobWithMeta();
      let next = normalizeLoadedStore(data);
      // Blob reads can lag a local write. Keep recent in-memory mutations so
      // follow-up updates (versions, export, delete) still see the new rows.
      if (
        slot.current &&
        typeof slot.writtenAt === "number" &&
        Date.now() - slot.writtenAt < 10_000
      ) {
        const localClone = structuredClone(slot.current);
        const deleted = takeDeletionMarkers(localClone);
        next = mergeStoresForWrite(localClone, next, deleted);
      }
      memoryStore = next;
      slot.current = memoryStore;
      // Mark as freshly loaded so soft-cache applies (not only post-write).
      slot.writtenAt = Date.now();
      slot.etag = etag;
      return structuredClone(memoryStore);
    } catch (error) {
      if (isMissingBlobError(error)) {
        memoryStore = seedStore();
        slot.current = memoryStore;
        await writeStore(memoryStore);
        return structuredClone(memoryStore);
      }

      if (slot.current) {
        memoryStore = slot.current;
        return structuredClone(slot.current);
      }

      throw error;
    }
  }

  if (!slot.current) {
    memoryStore = seedStore();
    slot.current = memoryStore;
  }
  memoryStore = slot.current;
  return structuredClone(slot.current);
}

function asIdSet(ids) {
  return new Set((ids || []).map(Number).filter((id) => Number.isFinite(id)));
}

function mergeByNumericId(remoteList = [], localList = [], deletedIds = []) {
  const deleted = asIdSet(deletedIds);
  const byId = new Map();
  for (const item of remoteList) {
    const id = Number(item?.id);
    if (!Number.isFinite(id) || deleted.has(id)) continue;
    byId.set(id, item);
  }
  for (const item of localList) {
    const id = Number(item?.id);
    if (!Number.isFinite(id) || deleted.has(id)) continue;
    byId.set(id, item);
  }
  return [...byId.values()];
}

const PROFILE_MEDIA_FIELDS = ["avatar_url", "cover_image_url", "cv_url"];

function mediaFieldTimestamp(user, field) {
  const raw = user?.__mediaUpdatedAt?.[field];
  const parsed = Date.parse(String(raw || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Bump per-field media timestamps so clears/replacements win Blob merge races. */
export function touchMediaUpdatedAt(user, fields, at = new Date().toISOString()) {
  const prev =
    user?.__mediaUpdatedAt && typeof user.__mediaUpdatedAt === "object"
      ? user.__mediaUpdatedAt
      : {};
  const nextMap = { ...prev };
  for (const field of fields || []) {
    if (PROFILE_MEDIA_FIELDS.includes(field)) nextMap[field] = at;
  }
  return { ...user, __mediaUpdatedAt: nextMap };
}

function mergeMediaUpdatedAt(localMap = {}, remoteMap = {}) {
  const out = { ...remoteMap, ...localMap };
  for (const field of PROFILE_MEDIA_FIELDS) {
    const localTs = Date.parse(String(localMap?.[field] || ""));
    const remoteTs = Date.parse(String(remoteMap?.[field] || ""));
    const max = Math.max(
      Number.isFinite(localTs) ? localTs : 0,
      Number.isFinite(remoteTs) ? remoteTs : 0,
    );
    if (max > 0) out[field] = new Date(max).toISOString();
  }
  return out;
}

function normalizeMergedMediaValue(value) {
  if (value === "" || value == null) return null;
  return value;
}

/**
 * Choose avatar/cover/CV by per-field update timestamp.
 * Empty-string clears are intentional and beat older URLs.
 */
function pickProfileMediaField(localUser, remoteUser, field) {
  const localValue = localUser?.[field];
  const remoteValue = remoteUser?.[field];
  const localTs = mediaFieldTimestamp(localUser, field);
  const remoteTs = mediaFieldTimestamp(remoteUser, field);

  if (localTs > remoteTs) return normalizeMergedMediaValue(localValue);
  if (remoteTs > localTs) return normalizeMergedMediaValue(remoteValue);

  // Equal / unknown timestamps: explicit clear wins; otherwise prefer local
  // (the writer) so a fresh upload is not reverted to a stale remote URL.
  if (localValue === "") return null;
  if (remoteValue === "") return null;
  return normalizeMergedMediaValue(localValue || remoteValue);
}

function mergeUsersPreservingMedia(remoteUsers = [], localUsers = [], deletedIds = []) {
  const deleted = asIdSet(deletedIds);
  const remoteById = new Map(
    remoteUsers
      .filter((u) => Number.isFinite(Number(u?.id)) && !deleted.has(Number(u.id)))
      .map((u) => [Number(u.id), u]),
  );
  const seen = new Set();
  const merged = [];
  const relocated = [];

  for (const localUser of localUsers) {
    const id = Number(localUser.id);
    if (!Number.isFinite(id) || deleted.has(id)) continue;
    const remoteUser = remoteById.get(id);
    if (
      remoteUser &&
      String(remoteUser.email || "").toLowerCase() !== String(localUser.email || "").toLowerCase()
    ) {
      // Same numeric id, different person (cross-region race) — keep remote, re-home local later.
      relocated.push(localUser);
      continue;
    }
    seen.add(id);
    if (!remoteUser) {
      merged.push({
        ...localUser,
        avatar_url: normalizeMergedMediaValue(localUser.avatar_url),
        cover_image_url: normalizeMergedMediaValue(localUser.cover_image_url),
        cv_url: normalizeMergedMediaValue(localUser.cv_url),
      });
      continue;
    }
    merged.push({
      ...remoteUser,
      ...localUser,
      avatar_url: pickProfileMediaField(localUser, remoteUser, "avatar_url"),
      cover_image_url: pickProfileMediaField(localUser, remoteUser, "cover_image_url"),
      cv_url: pickProfileMediaField(localUser, remoteUser, "cv_url"),
      __mediaUpdatedAt: mergeMediaUpdatedAt(
        localUser.__mediaUpdatedAt,
        remoteUser.__mediaUpdatedAt,
      ),
    });
  }

  for (const remoteUser of remoteUsers) {
    const id = Number(remoteUser.id);
    if (!Number.isFinite(id) || deleted.has(id) || seen.has(id)) continue;
    merged.push(remoteUser);
    seen.add(id);
  }

  let nextId = merged.reduce((max, u) => Math.max(max, Number(u.id) || 0), 0) + 1;
  for (const localUser of relocated) {
    const email = String(localUser.email || "").toLowerCase();
    const existing = merged.find((u) => String(u.email || "").toLowerCase() === email);
    if (existing) continue;
    merged.push({ ...localUser, id: nextId });
    nextId += 1;
  }

  return merged;
}

function followEdgeKey(followerId, followingId) {
  return `${Number(followerId)}:${Number(followingId)}`;
}

function likeEdgeKey(userId, caseStudyId) {
  return `${Number(userId)}:${Number(caseStudyId)}`;
}

function mergeFollows(remoteList = [], localList = [], deletedKeys = []) {
  const deleted = new Set((deletedKeys || []).map(String));
  const byKey = new Map();

  for (const item of [...remoteList, ...localList]) {
    const followerId = Number(item?.follower_id);
    const followingId = Number(item?.following_id);
    if (!Number.isFinite(followerId) || !Number.isFinite(followingId)) continue;
    const key = followEdgeKey(followerId, followingId);
    if (deleted.has(key)) continue;
    byKey.set(key, {
      ...item,
      follower_id: followerId,
      following_id: followingId,
    });
  }

  return [...byKey.values()];
}

function mergeLikes(remoteList = [], localList = [], deletedKeys = []) {
  const deleted = new Set((deletedKeys || []).map(String));
  const byKey = new Map();
  let maxId = 0;

  for (const item of [...remoteList, ...localList]) {
    const userId = Number(item?.user_id);
    const caseStudyId = Number(item?.case_study_id);
    if (!Number.isFinite(userId) || !Number.isFinite(caseStudyId)) continue;
    const key = likeEdgeKey(userId, caseStudyId);
    if (deleted.has(key)) continue;
    const id = Number(item?.id);
    if (Number.isFinite(id)) maxId = Math.max(maxId, id);
    const prev = byKey.get(key);
    // Prefer the row that already has a stable numeric id.
    if (prev && Number.isFinite(Number(prev.id)) && !Number.isFinite(id)) continue;
    byKey.set(key, {
      ...item,
      user_id: userId,
      case_study_id: caseStudyId,
    });
  }

  // Ensure every merged like has a unique numeric id.
  for (const like of byKey.values()) {
    if (!Number.isFinite(Number(like.id))) {
      maxId += 1;
      like.id = maxId;
    }
  }

  return [...byKey.values()];
}

function mergeCaseStudyViews(remoteList = [], localList = [], deletedIds = []) {
  return mergeByNumericId(remoteList, localList, deletedIds);
}

function takeDeletionMarkers(store) {
  const markers = store?.__uxguardDeleted && typeof store.__uxguardDeleted === "object"
    ? store.__uxguardDeleted
    : {};
  if (store && "__uxguardDeleted" in store) {
    delete store.__uxguardDeleted;
  }
  return {
    users: markers.users || [],
    caseStudies: markers.caseStudies || [],
    projects: markers.projects || [],
    resumes: markers.resumes || [],
    mediaAssets: markers.mediaAssets || [],
    follows: markers.follows || [],
    likes: markers.likes || [],
    comments: markers.comments || [],
    notifications: markers.notifications || [],
    case_study_views: markers.case_study_views || [],
  };
}

function mergeStoresForWrite(localStore, remote, deleted) {
  return {
    ...localStore,
    mediaAssets: mergeByNumericId(
      remote.mediaAssets || [],
      localStore.mediaAssets || [],
      deleted.mediaAssets,
    ),
    users: mergeUsersPreservingMedia(
      remote.users || [],
      localStore.users || [],
      deleted.users,
    ),
    caseStudies: mergeByNumericId(
      remote.caseStudies || [],
      localStore.caseStudies || [],
      deleted.caseStudies,
    ),
    projects: mergeByNumericId(
      remote.projects || [],
      localStore.projects || [],
      deleted.projects,
    ),
    resumes: mergeByNumericId(
      remote.resumes || [],
      localStore.resumes || [],
      deleted.resumes,
    ),
    follows: mergeFollows(remote.follows || [], localStore.follows || [], deleted.follows),
    likes: mergeLikes(remote.likes || [], localStore.likes || [], deleted.likes),
    comments: mergeByNumericId(
      remote.comments || [],
      localStore.comments || [],
      deleted.comments,
    ),
    notifications: mergeByNumericId(
      remote.notifications || [],
      localStore.notifications || [],
      deleted.notifications,
    ),
    case_study_views: mergeCaseStudyViews(
      remote.case_study_views || [],
      localStore.case_study_views || [],
      deleted.case_study_views,
    ),
  };
}

async function putStore(toWrite, etag, { requireMatch = true } = {}) {
  const options = {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  };
  // Only attach ifMatch when we have a live etag and still want CAS.
  if (requireMatch && etag) options.ifMatch = etag;
  return put(STORE_PATH, JSON.stringify(toWrite), options);
}

export async function writeStore(store) {
  const deleted = takeDeletionMarkers(store);
  const slot = getMemoryStore();

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    // Apply tombstones / media clears locally (mirrors Blob merge behavior).
    const cleaned = {
      ...store,
      mediaAssets: mergeByNumericId(store.mediaAssets || [], [], deleted.mediaAssets),
      users: mergeUsersPreservingMedia(store.users || [], store.users || [], deleted.users),
      follows: mergeFollows(store.follows || [], [], deleted.follows),
      likes: mergeLikes(store.likes || [], [], deleted.likes),
      comments: mergeByNumericId(store.comments || [], [], deleted.comments),
      notifications: mergeByNumericId(store.notifications || [], [], deleted.notifications),
      case_study_views: mergeCaseStudyViews(
        store.case_study_views || [],
        [],
        deleted.case_study_views,
      ),
      resumes: mergeByNumericId(store.resumes || [], [], deleted.resumes),
    };
    memoryStore = cleaned;
    slot.current = cleaned;
    slot.writtenAt = Date.now();
    return cleaned;
  }

  let lastError = null;
  for (let attempt = 1; attempt <= WRITE_MAX_ATTEMPTS; attempt++) {
    let remote = null;
    let etag = null;
    try {
      const loaded = await loadFromBlobWithMeta();
      remote = loaded.data;
      etag = loaded.etag;
    } catch (error) {
      if (!isMissingBlobError(error)) throw error;
    }

    // Refresh etag from head immediately before put — get() alone is often stale.
    try {
      etag = (await readStoreEtag()) || etag;
    } catch {
      // keep previous etag
    }

    const toWrite = remote ? mergeStoresForWrite(store, remote, deleted) : store;
    // Last attempts: overwrite without ifMatch so admin delete/save cannot soft-lock.
    const requireMatch = Boolean(etag) && attempt < WRITE_MAX_ATTEMPTS - 1;

    try {
      const result = await putStore(toWrite, etag, { requireMatch });
      memoryStore = toWrite;
      slot.current = toWrite;
      slot.writtenAt = Date.now();
      slot.etag = result?.etag || null;
      return toWrite;
    } catch (error) {
      lastError = error;
      if (!isPreconditionFailed(error) || attempt === WRITE_MAX_ATTEMPTS) throw error;
      await sleep(40 * attempt);
    }
  }

  throw lastError || new Error("Could not persist platform store");
}

export async function updateStore(updater, options = {}) {
  // writeStore already retries CAS conflicts; avoid nested 8x8 loops.
  const current = await readStore({ ...options, forceRefresh: true });
  const draft = structuredClone(current);
  const next = updater(draft);
  const resolved = next && typeof next === "object" ? next : draft;

  if (resolved.__uxguardSkipWrite) {
    delete resolved.__uxguardSkipWrite;
    memoryStore = resolved;
    getMemoryStore().current = resolved;
    return resolved;
  }

  await writeStore(resolved);
  return getMemoryStore().current || resolved;
}

export function registrationBlobPath(userId) {
  return `${REGISTRATION_PREFIX}${Number(userId)}.json`;
}

/** Durable per-user record so signups survive main-store races across regions. */
export async function persistRegistrationRecord(user) {
  if (!process.env.BLOB_READ_WRITE_TOKEN || !user?.id) return;
  const payload = JSON.stringify(user);
  const options = {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  };
  await put(registrationBlobPath(user.id), payload, options);
  const email = String(user.email || "").trim().toLowerCase();
  if (email) {
    await put(`${REGISTRATION_PREFIX}email/${encodeURIComponent(email)}.json`, payload, options);
  }
}

export async function deleteRegistrationRecord(userId, email) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;
  try {
    await del(registrationBlobPath(userId));
  } catch {
    // Missing sidecar is fine.
  }
  const normalized = String(email || "").trim().toLowerCase();
  if (normalized) {
    try {
      await del(`${REGISTRATION_PREFIX}email/${encodeURIComponent(normalized)}.json`);
    } catch {
      // Missing email sidecar is fine.
    }
  }
}

export async function listRegistrationRecords() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return [];

  const records = [];
  const seenEmails = new Set();
  const seenIds = new Set();
  let cursor;
  do {
    const page = await list({
      prefix: REGISTRATION_PREFIX,
      cursor,
      limit: 1000,
    });
    for (const blob of page.blobs || []) {
      try {
        // Prefer downloadUrl/url from list — pathname get() can lag behind put().
        const target = blob.pathname || blob.url;
        const result = await get(target, {
          access: "private",
          headers: { "Cache-Control": "no-cache, no-store", Pragma: "no-cache" },
        });
        if (!result?.stream || result.statusCode !== 200) continue;
        const text = await new Response(result.stream).text();
        const user = JSON.parse(text);
        if (!user || typeof user !== "object" || !user.email) continue;
        const email = String(user.email).trim().toLowerCase();
        const id = Number(user.id);
        if (email && seenEmails.has(email)) continue;
        if (Number.isFinite(id) && seenIds.has(id)) continue;
        if (email) seenEmails.add(email);
        if (Number.isFinite(id)) seenIds.add(id);
        records.push(user);
      } catch (err) {
        console.error("[listRegistrationRecords]", blob.pathname, err);
      }
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  return records;
}

export function isPersistentStoreEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** Reset in-memory store for unit tests (no Blob token). */
export function resetMemoryStoreForTests() {
  if (process.env.UXGUARD_TEST !== "1") {
    throw new Error("resetMemoryStoreForTests is only available under UXGUARD_TEST=1");
  }
  memoryStore = seedStore();
  getMemoryStore().current = memoryStore;
}
