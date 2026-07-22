import { get, put, list, del, head, BlobPreconditionFailedError } from "@vercel/blob";
import { defaultPortfolioConfig } from "./roles.js";
import { resolveActiveWorkspace } from "./workspace-portal.js";

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
    "For UX professionals building evidence-driven portfolios — and for employers hiring with verified company profiles and job posts.",
  about:
    "UXGuard Studio helps UX researchers, designers, and product teams build lasting professional legacies, while giving hiring teams a separate employer portal to publish jobs after admin approval.",
  contact_email: "uxguardstudio@gmail.com",
  social_links: { linkedin: "https://www.linkedin.com/company/uxguard-studio/", twitter: "https://twitter.com" },
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
    internal_message_threads: data.internal_message_threads || [],
    internal_messages: data.internal_messages || [],
    internal_call_sessions: data.internal_call_sessions || [],
    projects: data.projects || [],
    resumes: data.resumes || [],
    career_profiles: data.career_profiles || [],
    career_timeline_entries: data.career_timeline_entries || [],
    companies: data.companies || [],
    company_members: data.company_members || [],
    jobs: data.jobs || [],
    saved_jobs: data.saved_jobs || [],
    job_applications: data.job_applications || [],
    application_stage_history: data.application_stage_history || [],
    application_internal_notes: data.application_internal_notes || [],
    employer_invitations: data.employer_invitations || [],
    job_reports: data.job_reports || [],
    job_revisions: data.job_revisions || [],
    hiring_analytics_events: data.hiring_analytics_events || [],
    hiring_audit_log: data.hiring_audit_log || [],
    testlab_projects: data.testlab_projects || [],
    testlab_targets: data.testlab_targets || [],
    testlab_project_members: data.testlab_project_members || [],
    testlab_verification_challenges: data.testlab_verification_challenges || [],
    testlab_requirements: data.testlab_requirements || [],
    testlab_test_cases: data.testlab_test_cases || [],
    testlab_runs: data.testlab_runs || [],
    testlab_results: data.testlab_results || [],
    testlab_defects: data.testlab_defects || [],
    testlab_schedules: data.testlab_schedules || [],
    testlab_secrets: data.testlab_secrets || [],
    testlab_audit_events: data.testlab_audit_events || [],
    testlab_baselines: data.testlab_baselines || [],
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
    users: (data.users || []).map((user) => {
      const role = user.role === "researcher" ? "professional" : user.role;
      const canEdit = role === "admin" || role === "professional";
      const workspaces = {
        candidate:
          user.workspaces?.candidate !== undefined
            ? Boolean(user.workspaces.candidate)
            : canEdit,
        employer:
          user.workspaces?.employer !== undefined
            ? Boolean(user.workspaces.employer)
            : false,
      };
      // Legacy bug: enableEmployerWorkspace stamped account_type=employer on candidates.
      // Only keep employer account_type when candidate workspace is explicitly disabled.
      let accountType = user.account_type === "employer" ? "employer" : "candidate";
      if (accountType === "employer" && workspaces.candidate !== false && user.last_login_portal !== "employer") {
        // Dual/legacy accounts are candidates by default
        accountType = "candidate";
      }
      const normalized = {
        ...user,
        role,
        workspaces,
        account_type: accountType,
        last_login_portal:
          user.last_login_portal === "employer" || user.last_login_portal === "candidate"
            ? user.last_login_portal
            : null,
      };
      return {
        ...normalized,
        active_workspace: resolveActiveWorkspace(normalized),
        portfolio_config: {
          ...defaultPortfolioConfig(),
          ...(user.portfolio_config || {}),
        },
      };
    }),
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
    internal_message_threads: [],
    internal_messages: [],
    internal_call_sessions: [],
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
    career_profiles: [],
    career_timeline_entries: [],
    companies: [],
    company_members: [],
    jobs: [],
    saved_jobs: [],
    job_applications: [],
    application_stage_history: [],
    application_internal_notes: [],
    employer_invitations: [],
    job_reports: [],
    job_revisions: [],
    hiring_analytics_events: [],
    hiring_audit_log: [],
    testlab_projects: [],
    testlab_targets: [],
    testlab_project_members: [],
    testlab_verification_challenges: [],
    testlab_requirements: [],
    testlab_test_cases: [],
    testlab_runs: [],
    testlab_results: [],
    testlab_defects: [],
    testlab_schedules: [],
    testlab_secrets: [],
    testlab_audit_events: [],
    testlab_baselines: [],
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

/** Merge rows keyed by string ids (TestLab projects, runs, etc.). Local wins on equal timestamps. */
function mergeByStringId(remoteList = [], localList = [], deletedIds = []) {
  const deleted = new Set((deletedIds || []).map(String).filter(Boolean));
  const byId = new Map();

  function consider(item) {
    const id = String(item?.id || "").trim();
    if (!id || deleted.has(id)) return;
    const prev = byId.get(id);
    if (!prev) {
      byId.set(id, item);
      return;
    }
    const prevT = Date.parse(String(prev.updated_at || prev.created_at || 0)) || 0;
    const nextT = Date.parse(String(item.updated_at || item.created_at || 0)) || 0;
    if (nextT >= prevT) byId.set(id, item);
  }

  for (const item of remoteList || []) consider(item);
  for (const item of localList || []) consider(item);
  return [...byId.values()];
}

const TESTLAB_COLLECTIONS = [
  "testlab_projects",
  "testlab_targets",
  "testlab_project_members",
  "testlab_verification_challenges",
  "testlab_requirements",
  "testlab_test_cases",
  "testlab_runs",
  "testlab_results",
  "testlab_defects",
  "testlab_schedules",
  "testlab_secrets",
  "testlab_audit_events",
  "testlab_baselines",
];

function mergeTestlabCollections(localStore, remote, deleted = {}) {
  const out = {};
  for (const key of TESTLAB_COLLECTIONS) {
    out[key] = mergeByStringId(remote?.[key] || [], localStore?.[key] || [], deleted[key] || []);
  }
  return out;
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
    career_profiles: markers.career_profiles || [],
    career_timeline_entries: markers.career_timeline_entries || [],
    companies: markers.companies || [],
    company_members: markers.company_members || [],
    jobs: markers.jobs || [],
    saved_jobs: markers.saved_jobs || [],
    job_applications: markers.job_applications || [],
    application_stage_history: markers.application_stage_history || [],
    application_internal_notes: markers.application_internal_notes || [],
    employer_invitations: markers.employer_invitations || [],
    job_reports: markers.job_reports || [],
    mediaAssets: markers.mediaAssets || [],
    follows: markers.follows || [],
    likes: markers.likes || [],
    comments: markers.comments || [],
    notifications: markers.notifications || [],
    case_study_views: markers.case_study_views || [],
    internal_message_threads: markers.internal_message_threads || [],
    internal_messages: markers.internal_messages || [],
    internal_call_sessions: markers.internal_call_sessions || [],
    testlab_projects: markers.testlab_projects || [],
    testlab_targets: markers.testlab_targets || [],
    testlab_project_members: markers.testlab_project_members || [],
    testlab_verification_challenges: markers.testlab_verification_challenges || [],
    testlab_requirements: markers.testlab_requirements || [],
    testlab_test_cases: markers.testlab_test_cases || [],
    testlab_runs: markers.testlab_runs || [],
    testlab_results: markers.testlab_results || [],
    testlab_defects: markers.testlab_defects || [],
    testlab_schedules: markers.testlab_schedules || [],
    testlab_secrets: markers.testlab_secrets || [],
    testlab_audit_events: markers.testlab_audit_events || [],
    testlab_baselines: markers.testlab_baselines || [],
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
    career_profiles: mergeByNumericId(
      remote.career_profiles || [],
      localStore.career_profiles || [],
      deleted.career_profiles,
    ),
    career_timeline_entries: mergeByNumericId(
      remote.career_timeline_entries || [],
      localStore.career_timeline_entries || [],
      deleted.career_timeline_entries,
    ),
    companies: mergeByNumericId(remote.companies || [], localStore.companies || [], deleted.companies),
    company_members: mergeByNumericId(
      remote.company_members || [],
      localStore.company_members || [],
      deleted.company_members,
    ),
    jobs: mergeByNumericId(remote.jobs || [], localStore.jobs || [], deleted.jobs),
    saved_jobs: mergeByNumericId(remote.saved_jobs || [], localStore.saved_jobs || [], deleted.saved_jobs),
    job_applications: mergeByNumericId(
      remote.job_applications || [],
      localStore.job_applications || [],
      deleted.job_applications,
    ),
    application_stage_history: mergeByNumericId(
      remote.application_stage_history || [],
      localStore.application_stage_history || [],
      deleted.application_stage_history,
    ),
    application_internal_notes: mergeByNumericId(
      remote.application_internal_notes || [],
      localStore.application_internal_notes || [],
      deleted.application_internal_notes,
    ),
    employer_invitations: mergeByNumericId(
      remote.employer_invitations || [],
      localStore.employer_invitations || [],
      deleted.employer_invitations,
    ),
    job_reports: mergeByNumericId(
      remote.job_reports || [],
      localStore.job_reports || [],
      deleted.job_reports,
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
    internal_message_threads: mergeByStringId(
      remote.internal_message_threads || [],
      localStore.internal_message_threads || [],
      deleted.internal_message_threads,
    ),
    internal_messages: mergeByStringId(
      remote.internal_messages || [],
      localStore.internal_messages || [],
      deleted.internal_messages,
    ),
    internal_call_sessions: mergeByStringId(
      remote.internal_call_sessions || [],
      localStore.internal_call_sessions || [],
      deleted.internal_call_sessions,
    ),
    case_study_views: mergeCaseStudyViews(
      remote.case_study_views || [],
      localStore.case_study_views || [],
      deleted.case_study_views,
    ),
    ...mergeTestlabCollections(localStore, remote, deleted),
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
      internal_message_threads: mergeByStringId(
        store.internal_message_threads || [],
        [],
        deleted.internal_message_threads,
      ),
      internal_messages: mergeByStringId(
        store.internal_messages || [],
        [],
        deleted.internal_messages,
      ),
      internal_call_sessions: mergeByStringId(
        store.internal_call_sessions || [],
        [],
        deleted.internal_call_sessions,
      ),
      case_study_views: mergeCaseStudyViews(
        store.case_study_views || [],
        [],
        deleted.case_study_views,
      ),
      resumes: mergeByNumericId(store.resumes || [], [], deleted.resumes),
      career_profiles: mergeByNumericId(
        store.career_profiles || [],
        [],
        deleted.career_profiles,
      ),
      career_timeline_entries: mergeByNumericId(
        store.career_timeline_entries || [],
        [],
        deleted.career_timeline_entries,
      ),
      companies: mergeByNumericId(store.companies || [], [], deleted.companies),
      company_members: mergeByNumericId(store.company_members || [], [], deleted.company_members),
      jobs: mergeByNumericId(store.jobs || [], [], deleted.jobs),
      saved_jobs: mergeByNumericId(store.saved_jobs || [], [], deleted.saved_jobs),
      job_applications: mergeByNumericId(
        store.job_applications || [],
        [],
        deleted.job_applications,
      ),
      application_stage_history: mergeByNumericId(
        store.application_stage_history || [],
        [],
        deleted.application_stage_history,
      ),
      application_internal_notes: mergeByNumericId(
        store.application_internal_notes || [],
        [],
        deleted.application_internal_notes,
      ),
      employer_invitations: mergeByNumericId(
        store.employer_invitations || [],
        [],
        deleted.employer_invitations,
      ),
      job_reports: mergeByNumericId(store.job_reports || [], [], deleted.job_reports),
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
