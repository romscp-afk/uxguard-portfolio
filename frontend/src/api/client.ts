import type {
  AssistantChatMessage,
  AssistantChatResponse,
  AssistantContextType,
  AssistantStatus,
  AiAssistantType,
  AiCreditsSummary,
  AiConversation,
  AiGenerateResponse,
  AiMessage,
  SavedAiOutput,
  BillingPlan,
  BillingUsageSummary,
  Attachment,
  CaseStudy,
  CaseStudyListItem,
  Comment,
  ContactMessage,
  ContactMailboxCounts,
  AdminUserSummary,
  FeedCaseStudyItem,
  FollowStats,
  LikeStats,
  MediaAsset,
  Notification,
  PortfolioBuilderConfig,
  PortfolioSettings,
  Project,
  SearchResults,
  User,
  UserProfile,
  RegisterPayload,
} from "../types";

const API_ROOT = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const API_BASE = `${API_ROOT}/api/v1`;
const AI_API_BASE = `${API_ROOT}/api/ai`;
/** Bump when media serving strategy changes so CDN/browser drop bad cached redirects. */
const MEDIA_CACHE_BUST = "4";

export function resolveAssetUrl(url: string): string {
  if (!url) return url;

  const root =
    API_ROOT ||
    (typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : "");

  const mediaMatch = String(url).match(/\/api\/v1\/media\/file\/(\d+)/);
  if (mediaMatch) {
    return `${root}/api/v1/media/file/${mediaMatch[1]}?v=${MEDIA_CACHE_BUST}`;
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      const parsed = new URL(url);
      const hostedMedia = parsed.pathname.match(/\/api\/v1\/media\/file\/(\d+)/);
      if (hostedMedia) {
        return `${root}/api/v1/media/file/${hostedMedia[1]}?v=${MEDIA_CACHE_BUST}`;
      }
    } catch {
      return url;
    }
    return url;
  }

  const path = url.startsWith("/") ? url : `/${url}`;
  return `${root}${path}`;
}

/** Store media refs as stable relative paths so images keep working across deploys. */
export function toStoredAssetUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const mediaMatch = String(url).match(/\/api\/v1\/media\/file\/(\d+)/);
  if (mediaMatch) return `/api/v1/media/file/${mediaMatch[1]}`;
  return url.trim();
}

class ApiError extends Error {
  code?: string;
  remainingCredits?: number;

  constructor(
    public status: number,
    message: string,
    extras?: { code?: string; remainingCredits?: number },
  ) {
    super(message);
    this.code = extras?.code;
    this.remainingCredits = extras?.remainingCredits;
  }
}

function getToken(): string | null {
  return localStorage.getItem("uxguard_token");
}

async function requestAt<T>(base: string, path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  // Avoid Content-Type on body-less DELETE (some proxies mishandle it).
  if (!isFormData && options.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  } else if (
    !path.includes("/auth/login") &&
    !path.includes("/auth/register") &&
    !path.includes("/auth/forgot-password") &&
    !path.includes("/auth/reset-password") &&
    (path.includes("/media/upload") || path === "/auth/me" || options.method === "PATCH")
  ) {
    throw new ApiError(401, "Not authenticated. Please sign in again.");
  }

  const res = await fetch(`${base}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail =
      body.detail ||
      (res.status === 401 ? "Not authenticated. Please sign in again." : res.statusText);
    throw new ApiError(res.status, detail, {
      code: body.code,
      remainingCredits: body.remainingCredits,
    });
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  return requestAt<T>(API_BASE, path, options);
}

async function aiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return requestAt<T>(AI_API_BASE, path, options);
}

export const api = {
  login: (email: string, password: string) =>
    request<{ access_token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  resetPassword: (token: string, newPassword: string) =>
    request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, new_password: newPassword }),
    }),

  forgotPassword: (email: string) =>
    request<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  verifyResetToken: (token: string) =>
    request<{ valid: boolean; email?: string; detail?: string }>(
      `/auth/reset-password?token=${encodeURIComponent(token)}`,
    ),

  register: (data: RegisterPayload) =>
    request<{ access_token: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  me: () => request<User>("/auth/me"),

  updateMe: (data: Partial<User>) =>
    request<User>("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  adminListUsers: () => request<AdminUserSummary[]>("/admin/users"),

  adminGetUser: (id: number) => request<AdminUserSummary>(`/admin/users/${id}`),

  adminUpdateUser: (id: number, data: Record<string, unknown>) =>
    request<AdminUserSummary>(`/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  adminDeleteUser: (id: number) =>
    request<{ ok: boolean; id: number }>(`/admin/users/${id}`, { method: "DELETE" }),

  getFeed: (limit?: number) =>
    request<FeedCaseStudyItem[]>(
      `/feed/case-studies${limit ? `?limit=${limit}` : ""}`,
    ),

  getFollowingFeed: () => request<FeedCaseStudyItem[]>("/feed/following"),

  search: (q: string) =>
    request<SearchResults>(`/search?q=${encodeURIComponent(q)}`),

  getFollowStats: (username: string) => request<FollowStats>(`/users/${username}/follow`),

  followUser: (username: string) =>
    request<FollowStats & { ok: boolean }>(`/users/${username}/follow`, { method: "POST" }),

  unfollowUser: (username: string) =>
    request<FollowStats>(`/users/${username}/follow`, { method: "DELETE" }),

  listComments: (caseStudyId: number) =>
    request<Comment[]>(`/comments?case_study_id=${caseStudyId}`),

  addComment: (caseStudyId: number, body: string) =>
    request<Comment>("/comments", {
      method: "POST",
      body: JSON.stringify({ case_study_id: caseStudyId, body }),
    }),

  deleteComment: (id: number) => request<void>(`/comments/${id}`, { method: "DELETE" }),

  getNotifications: () =>
    request<{ notifications: Notification[]; unread_count: number }>("/notifications"),

  markNotificationsRead: (ids?: number[]) =>
    request<{ ok: boolean; unread_count: number }>("/notifications", {
      method: "POST",
      body: JSON.stringify(ids ? { ids } : {}),
    }),

  getUserProfile: (username: string) => request<UserProfile>(`/users/${username}`),

  getUserCaseStudy: (username: string, slug: string) =>
    request<CaseStudy>(`/users/${username}/case-studies/${slug}`),

  getPortfolioSettings: () => request<PortfolioSettings>("/portfolio/settings"),

  updatePortfolioSettings: (data: Partial<PortfolioSettings>) =>
    request<PortfolioSettings>("/portfolio/settings", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  listCaseStudies: (params?: { status?: string; featured?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.featured !== undefined) qs.set("featured", String(params.featured));
    const query = qs.toString();
    return request<CaseStudyListItem[]>(`/case-studies${query ? `?${query}` : ""}`);
  },

  adminListCaseStudies: () => request<CaseStudyListItem[]>("/case-studies/admin/all"),

  getCaseStudy: (slug: string) => request<CaseStudy>(`/case-studies/${slug}`),

  adminGetCaseStudy: (id: number) => request<CaseStudy>(`/case-studies/admin/${id}`),

  createCaseStudy: (data: Partial<CaseStudy>) =>
    request<CaseStudy>("/case-studies", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateCaseStudy: (id: number, data: Partial<CaseStudy>) =>
    request<CaseStudy>(`/case-studies/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteCaseStudy: (id: number) => request<void>(`/case-studies/${id}`, { method: "DELETE" }),

  syncCaseStudies: (studies: CaseStudy[]) =>
    request<{ synced: number }>("/case-studies/sync", {
      method: "POST",
      body: JSON.stringify({ case_studies: studies }),
    }),

  addAttachment: (
    caseId: number,
    data: { title: string; file_url: string; file_type: string; size_bytes: number },
  ) => {
    const qs = new URLSearchParams({
      title: data.title,
      file_url: data.file_url,
      file_type: data.file_type,
      size_bytes: String(data.size_bytes),
    });
    return request<Attachment>(`/case-studies/${caseId}/attachments?${qs}`, {
      method: "POST",
    });
  },

  deleteAttachment: (id: number) =>
    request<void>(`/case-studies/attachments/${id}`, { method: "DELETE" }),

  listMedia: () => request<MediaAsset[]>("/media"),

  uploadMedia: (
    file: File,
    options?: { altText?: string; purpose?: "cover" | "media" | "avatar" | "cv" },
  ) => {
    const form = new FormData();
    form.append("file", file);
    if (options?.altText) form.append("alt_text", options.altText);
    const purpose = options?.purpose || "media";
    return request<MediaAsset>(`/media/upload?purpose=${purpose}`, {
      method: "POST",
      body: form,
    });
  },

  deleteMedia: (id: number) =>
    request<void>(`/media/${id}`, { method: "DELETE" }),

  submitContact: (payload: {
    name: string;
    email: string;
    inquiryType: string;
    subject: string;
    message: string;
    uxg_hp?: string;
    website?: string;
  }) =>
    request<{ message: string; delivered_to?: string; id?: number }>("/contact", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getContactMessages: (params?: { folder?: string; q?: string; thread_id?: string }) => {
    const qs = new URLSearchParams();
    if (params?.folder) qs.set("folder", params.folder);
    if (params?.q) qs.set("q", params.q);
    if (params?.thread_id) qs.set("thread_id", params.thread_id);
    const suffix = qs.toString() ? `?${qs}` : "";
    return request<{
      messages: ContactMessage[];
      counts?: ContactMailboxCounts;
      unread_count?: number;
      folder?: string;
      thread_id?: string;
    }>(`/contact-messages${suffix}`);
  },

  getContactMessage: (id: number) =>
    request<{ message: ContactMessage; thread: ContactMessage[] }>(`/contact-messages/${id}`),

  updateContactMessage: (id: number, patch: Partial<ContactMessage>) =>
    request<{ message: ContactMessage; counts: ContactMailboxCounts }>(`/contact-messages/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  deleteContactMessage: (id: number, permanent = false) =>
    request<{ deleted: unknown; counts: ContactMailboxCounts }>(
      `/contact-messages/${id}${permanent ? "?permanent=true" : ""}`,
      { method: "DELETE" },
    ),

  replyContactMessage: (
    id: number,
    payload: { message: string; subject?: string; draft?: boolean },
  ) =>
    request<{ message: ContactMessage; thread: ContactMessage[]; counts: ContactMailboxCounts }>(
      `/contact-messages/${id}`,
      { method: "POST", body: JSON.stringify(payload) },
    ),

  mailboxAction: (payload: Record<string, unknown>) =>
    request<{
      message?: ContactMessage;
      messages?: ContactMessage[];
      deleted?: unknown;
      counts?: ContactMailboxCounts;
      removed?: number;
    }>("/contact-messages", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getLikeStats: (caseStudyId: number) =>
    request<LikeStats>(`/case-studies/${caseStudyId}/like`),

  likeCaseStudy: (caseStudyId: number) =>
    request<LikeStats>(`/case-studies/${caseStudyId}/like`, { method: "POST" }),

  unlikeCaseStudy: (caseStudyId: number) =>
    request<LikeStats>(`/case-studies/${caseStudyId}/like`, { method: "DELETE" }),

  listProjects: () => request<Project[]>("/projects"),

  getProject: (id: number) => request<Project>(`/projects/${id}`),

  createProject: (data: Partial<Project>) =>
    request<Project>("/projects", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateProject: (id: number, data: Partial<Project>) =>
    request<Project>(`/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteProject: (id: number) => request<void>(`/projects/${id}`, { method: "DELETE" }),

  getPortfolioBuilder: () => request<PortfolioBuilderConfig>("/portfolio-builder"),

  updatePortfolioBuilder: (data: Partial<PortfolioBuilderConfig>) =>
    request<PortfolioBuilderConfig>("/portfolio-builder", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  getAssistantStatus: () => request<AssistantStatus>("/assistant/status"),

  assistantChat: (payload: {
    messages: AssistantChatMessage[];
    context?: AssistantContextType;
    field?: string;
    draft?: Record<string, unknown>;
    field_updates_requested?: boolean;
  }) =>
    request<AssistantChatResponse>("/assistant/chat", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getAiCredits: () => aiRequest<AiCreditsSummary>("/credits"),

  aiGenerate: (payload: {
    assistantType: AiAssistantType;
    action: string;
    conversationId?: string | null;
    inputs?: Record<string, unknown>;
    tone?: string;
    length?: string;
    priorContent?: Record<string, unknown> | string | null;
    versionOf?: string | null;
  }) =>
    aiRequest<AiGenerateResponse>("/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  listAiConversations: (params?: { q?: string; recent?: boolean; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.recent) qs.set("recent", "true");
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString();
    return aiRequest<{ conversations: AiConversation[] }>(
      `/conversations${query ? `?${query}` : ""}`,
    );
  },

  getAiConversation: (id: string) =>
    aiRequest<{ conversation: AiConversation; messages: AiMessage[] }>(`/conversations/${id}`),

  renameAiConversation: (id: string, title: string) =>
    aiRequest<AiConversation>(`/conversations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    }),

  deleteAiConversation: (id: string) =>
    aiRequest<void>(`/conversations/${id}`, { method: "DELETE" }),

  listSavedAiOutputs: () => aiRequest<{ outputs: SavedAiOutput[] }>("/saved"),

  saveAiOutput: (payload: {
    conversation_id?: string | null;
    title: string;
    output_type: string;
    content: Record<string, unknown> | string;
  }) =>
    aiRequest<SavedAiOutput>("/saved", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  deleteSavedAiOutput: (id: string) => aiRequest<void>(`/saved/${id}`, { method: "DELETE" }),

  listBillingPlans: () => request<{ plans: BillingPlan[]; current?: BillingUsageSummary }>("/billing/plans"),

  getBillingSubscription: () => request<BillingUsageSummary>("/billing/subscription"),

  cancelSubscription: () =>
    request<BillingUsageSummary>("/billing/subscription", {
      method: "POST",
      body: JSON.stringify({ action: "cancel" }),
    }),

  resumeSubscription: () =>
    request<BillingUsageSummary>("/billing/subscription", {
      method: "POST",
      body: JSON.stringify({ action: "resume" }),
    }),

  startCheckout: (payload: { planCode: string; billingInterval: "month" | "year"; origin?: string }) =>
    request<{
      provider: string;
      sessionId: string;
      checkoutUrl: string;
      amount: number;
      currency: string;
    }>("/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ action: "checkout", ...payload }),
    }),

  completeMockCheckout: (payload: {
    planCode: string;
    billingInterval: "month" | "year";
    outcome: "succeeded" | "failed" | "cancelled";
  }) =>
    request<{
      success: boolean;
      outcome: string;
      detail: string;
      current?: BillingUsageSummary | null;
    }>("/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ action: "complete_mock", ...payload }),
    }),
};

export { ApiError };
