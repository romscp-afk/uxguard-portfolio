import { get, put } from "@vercel/blob";
import { defaultPortfolioConfig } from "./roles.js";

function normalizeMediaAssetUrl(url, assetId) {
  if (assetId) return `/api/v1/media/file/${assetId}`;
  const match = String(url || "").match(/\/api\/v1\/media\/file\/(\d+)/);
  if (match) return `/api/v1/media/file/${match[1]}`;
  return url;
}

const STORE_PATH = "uxguard/platform-store.json";

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
    "UXGuard Studio is your professional operating system—not another portfolio gallery. Document how you think, solve problems, and deliver measurable impact across research, design, and product work.",
  about:
    "UXGuard Studio helps UX researchers, designers, product leaders, and digital professionals build more than a portfolio. Organize your work, tell complete case study stories, and present your professional legacy with confidence.",
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
    contact_messages: data.contact_messages || [],
    projects: data.projects || [],
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

async function loadFromBlob() {
  const result = await get(STORE_PATH, {
    access: "private",
    useCache: false,
  });

  if (!result) {
    const error = new Error("Platform store not found");
    error.name = "BlobNotFoundError";
    throw error;
  }

  if (result.statusCode === 304) {
    if (memoryStore) {
      return structuredClone(memoryStore);
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
  return JSON.parse(text);
}

export async function readStore(options = {}) {
  const forceRefresh = Boolean(options.forceRefresh);
  const slot = getMemoryStore();

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    // Use in-process memory only briefly after a local write (read-your-writes).
    // Otherwise always reload from Blob so Home/Discover see publishes from other instances.
    const freshlyWritten =
      !forceRefresh &&
      slot.current &&
      typeof slot.writtenAt === "number" &&
      Date.now() - slot.writtenAt < 8000;

    if (freshlyWritten) {
      memoryStore = slot.current;
      return structuredClone(slot.current);
    }

    try {
      const data = await loadFromBlob();
      memoryStore = normalizeLoadedStore(data);
      slot.current = memoryStore;
      slot.writtenAt = 0;
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

function mergeByNumericId(remoteList = [], localList = []) {
  const byId = new Map();
  for (const item of remoteList) {
    const id = Number(item?.id);
    if (Number.isFinite(id)) byId.set(id, item);
  }
  for (const item of localList) {
    const id = Number(item?.id);
    if (Number.isFinite(id)) byId.set(id, item);
  }
  return [...byId.values()];
}

function pickProfileMedia(localValue, remoteValue) {
  // Explicit empty string = intentional clear (must win over remote).
  if (localValue === "") return null;
  const local = localValue == null ? null : localValue;
  const remote = remoteValue == null || remoteValue === "" ? null : remoteValue;
  // Prefer the local write when it set a value; otherwise keep remote so races
  // from billing/usage writes do not wipe recently uploaded avatar/cover/CV.
  return local ?? remote ?? null;
}

function mergeUsersPreservingMedia(remoteUsers = [], localUsers = []) {
  const remoteById = new Map(remoteUsers.map((u) => [Number(u.id), u]));
  const seen = new Set();
  const merged = [];

  for (const localUser of localUsers) {
    const id = Number(localUser.id);
    seen.add(id);
    const remoteUser = remoteById.get(id);
    if (!remoteUser) {
      merged.push({
        ...localUser,
        avatar_url: localUser.avatar_url === "" ? null : localUser.avatar_url,
        cover_image_url: localUser.cover_image_url === "" ? null : localUser.cover_image_url,
        cv_url: localUser.cv_url === "" ? null : localUser.cv_url,
      });
      continue;
    }
    merged.push({
      ...remoteUser,
      ...localUser,
      avatar_url: pickProfileMedia(localUser.avatar_url, remoteUser.avatar_url),
      cover_image_url: pickProfileMedia(localUser.cover_image_url, remoteUser.cover_image_url),
      cv_url: pickProfileMedia(localUser.cv_url, remoteUser.cv_url),
    });
  }

  for (const remoteUser of remoteUsers) {
    const id = Number(remoteUser.id);
    if (!seen.has(id)) merged.push(remoteUser);
  }

  return merged;
}

/**
 * Before overwriting Blob, merge collections that concurrent isolates often race on.
 * Prevents billing/usage writes from dropping newly uploaded media assets or profile media URLs.
 */
async function mergeWithRemoteBeforeWrite(localStore) {
  try {
    const remote = await loadFromBlob();
    return {
      ...localStore,
      mediaAssets: mergeByNumericId(remote.mediaAssets || [], localStore.mediaAssets || []),
      users: mergeUsersPreservingMedia(remote.users || [], localStore.users || []),
      caseStudies: mergeByNumericId(remote.caseStudies || [], localStore.caseStudies || []),
      projects: mergeByNumericId(remote.projects || [], localStore.projects || []),
    };
  } catch (error) {
    if (isMissingBlobError(error)) return localStore;
    // If remote cannot be read, still write local — better than blocking saves.
    return localStore;
  }
}

export async function writeStore(store) {
  let toWrite = store;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    toWrite = await mergeWithRemoteBeforeWrite(store);
  }

  memoryStore = toWrite;
  const slot = getMemoryStore();
  slot.current = toWrite;
  slot.writtenAt = Date.now();

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return;
  }

  await put(STORE_PATH, JSON.stringify(toWrite), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function updateStore(updater) {
  const current = await readStore();
  const draft = structuredClone(current);
  const next = updater(draft);
  const resolved = next && typeof next === "object" ? next : draft;

  // Skip no-op writes (e.g. ensureFreeSubscription when already provisioned)
  if (resolved.__uxguardSkipWrite) {
    delete resolved.__uxguardSkipWrite;
    memoryStore = resolved;
    getMemoryStore().current = resolved;
    return resolved;
  }

  await writeStore(resolved);
  return resolved;
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
