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
  AnalyticsSummary,
  FeedCaseStudyItem,
  FollowStats,
  LikeStats,
  MediaAsset,
  Notification,
  PortfolioBuilderConfig,
  PortfolioSettings,
  Project,
  Resume,
  ResumeImportResult,
  ResumeExtraction,
  ResumeSummary,
  ResumeTemplateInfo,
  ResumeQualityResult,
  ResumeVersionSummary,
  ResumeMatchResult,
  ResumeTimelineSelection,
  CareerProfile,
  CareerTimelineEntry,
  CareerInsights,
  CareerImportDuplicate,
  Company,
  CompanyMember,
  Job,
  JobApplication,
  JobMatchSummary,
  EmployerDashboard,
  SearchResults,
  User,
  UserProfile,
  RegisterPayload,
  TestLabProject,
  TestLabProjectDetail,
  TestLabTarget,
  TestLabRequirement,
  TestLabTestCase,
  TestLabRun,
  TestLabResult,
  TestLabDefect,
  TestLabSchedule,
  TestLabSecretMeta,
  TestLabMember,
  TestLabExecutionCapabilities,
  TestLabVerificationChallenge,
} from "../types";

const API_ROOT = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const API_BASE = `${API_ROOT}/api/v1`;
const AI_API_BASE = `${API_ROOT}/api/ai`;
/** Bump when media serving strategy changes so CDN/browser drop bad cached redirects. */
const MEDIA_CACHE_BUST = "5";

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

  adminListUsers: () =>
    request<AdminUserSummary[]>(`/admin/users?_=${Date.now()}`),

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

  getMyResume: () => request<{ resume: Resume | null }>("/resumes/me"),

  getCareerProfile: () => request<{ profile: CareerProfile }>("/career-profile"),

  updateCareerProfile: (data: Partial<CareerProfile>) =>
    request<{ profile: CareerProfile }>("/career-profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  listCareerTimeline: (includeHidden = true) =>
    request<{ entries: CareerTimelineEntry[] }>(
      `/career-timeline?include_hidden=${includeHidden ? "1" : "0"}`,
    ),

  createCareerTimelineEntry: (data: Partial<CareerTimelineEntry>) =>
    request<{ entry: CareerTimelineEntry }>("/career-timeline", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getCareerTimelineEntry: (id: number) =>
    request<{ entry: CareerTimelineEntry }>(`/career-timeline/${id}`),

  updateCareerTimelineEntry: (id: number, data: Partial<CareerTimelineEntry>) =>
    request<{ entry: CareerTimelineEntry }>(`/career-timeline/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteCareerTimelineEntry: (id: number) =>
    request<{ ok: boolean }>(`/career-timeline/${id}`, { method: "DELETE" }),

  importCareerTimelineFromResume: (resumeId: number) =>
    request<{
      resume_id: number;
      created: CareerTimelineEntry[];
      duplicates: CareerImportDuplicate[];
      created_count: number;
      duplicate_count: number;
    }>("/career-timeline/import-from-resume", {
      method: "POST",
      body: JSON.stringify({ resume_id: resumeId }),
    }),

  resolveCareerTimelineMerge: (
    decisions: Array<{
      action: "merge" | "keep_both" | "replace" | "review_later";
      candidate?: Partial<CareerTimelineEntry>;
      existing_id?: number;
    }>,
  ) =>
    request<{ results: unknown[] }>("/career-timeline/merge", {
      method: "POST",
      body: JSON.stringify({ decisions }),
    }),

  getCareerInsights: () =>
    request<{
      profile: CareerProfile;
      insights: CareerInsights;
      entries: CareerTimelineEntry[];
    }>("/career-timeline/insights"),

  getResumeTimelineSelection: (resumeId: number) =>
    request<{
      resume_id: number;
      selections: ResumeTimelineSelection[];
      available_entries: CareerTimelineEntry[];
    }>(`/resumes/${resumeId}/timeline-selection`),

  putResumeTimelineSelection: (
    resumeId: number,
    selections: Array<Partial<ResumeTimelineSelection>>,
  ) =>
    request<{
      resume_id: number;
      selections: ResumeTimelineSelection[];
      available_entries: CareerTimelineEntry[];
    }>(`/resumes/${resumeId}/timeline-selection`, {
      method: "PUT",
      body: JSON.stringify({ selections }),
    }),

  setActiveWorkspace: (active_workspace: "candidate" | "employer") =>
    request<User>("/workspace", {
      method: "PATCH",
      body: JSON.stringify({ active_workspace }),
    }),

  enableEmployerWorkspace: () =>
    request<User>("/workspace", {
      method: "PATCH",
      body: JSON.stringify({ enable_employer: true }),
    }),

  getEmployerDashboard: () => request<EmployerDashboard>("/employer/dashboard"),

  listCompanies: () =>
    request<{ companies: Company[]; dashboard: EmployerDashboard }>("/companies"),

  createCompany: (data: Partial<Company> & { terms_accepted?: boolean }) =>
    request<{ company: Company }>("/companies", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getCompany: (id: number) => request<{ company: Company }>(`/companies/${id}`),

  updateCompany: (id: number, data: Partial<Company>) =>
    request<{ company: Company }>(`/companies/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  listCompanyMembers: (companyId: number) =>
    request<{ members: CompanyMember[] }>(`/companies/${companyId}/team`),

  inviteCompanyMember: (
    companyId: number,
    data: { email: string; role?: string; assigned_job_ids?: number[] },
  ) =>
    request<{ invitation: unknown; invite_token: string }>(`/companies/${companyId}/team`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateCompanyMember: (companyId: number, memberId: number, data: Partial<CompanyMember>) =>
    request<{ member: CompanyMember }>(`/companies/${companyId}/team/${memberId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  listCompanyJobs: (companyId: number) =>
    request<{ jobs: Job[] }>(`/companies/${companyId}/jobs`),

  createCompanyJob: (companyId: number, data: Partial<Job> = {}) =>
    request<{ job: Job }>(`/companies/${companyId}/jobs`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  searchJobs: (params: Record<string, string | number | boolean | undefined> = {}) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") qs.set(k, String(v));
    }
    const q = qs.toString();
    return request<{
      jobs: Job[];
      total: number;
      page: number;
      page_size: number;
      total_pages: number;
    }>(`/jobs${q ? `?${q}` : ""}`);
  },

  getJob: (id: number) => request<{ job: Job; view: string }>(`/jobs/${id}`),

  updateJob: (id: number, data: Partial<Job>) =>
    request<{ job: Job }>(`/jobs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  jobAction: (id: number, action: string, data: Record<string, unknown> = {}) =>
    request<{ job?: Job; match?: JobMatchSummary; report?: unknown }>(`/jobs/${id}`, {
      method: "POST",
      body: JSON.stringify({ action, ...data }),
    }),

  saveJob: (id: number) => request<{ saved: unknown }>(`/jobs/${id}/save`, { method: "POST" }),

  unsaveJob: (id: number) => request<{ ok: boolean }>(`/jobs/${id}/save`, { method: "DELETE" }),

  applyToJob: (
    id: number,
    data: {
      resume_id: number;
      cover_letter?: string;
      portfolio_url?: string;
      screening_answers?: unknown[];
      consent_accepted: boolean;
    },
  ) =>
    request<{ application: JobApplication }>(`/jobs/${id}/applications`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  listMyApplications: () => request<{ applications: JobApplication[] }>("/candidate/applications"),

  listSavedJobs: () => request<{ jobs: Job[] }>("/candidate/saved-jobs"),

  getApplication: (id: number) =>
    request<{
      application: JobApplication;
      view: string;
      resume_snapshot?: unknown;
      career_profile_snapshot?: unknown;
      job?: Partial<Job> | null;
      company?: Partial<Company> | null;
      notes?: unknown[];
      history?: unknown[];
      candidate?: { id: number; name: string; title?: string; username?: string } | null;
    }>(`/applications/${id}`),

  withdrawApplication: (id: number) =>
    request<{ application: JobApplication }>(`/applications/${id}`, {
      method: "POST",
      body: JSON.stringify({ action: "withdraw" }),
    }),

  updateApplicationStage: (id: number, data: { status: string; candidate_visible_status?: string; note?: string }) =>
    request<{ application: JobApplication }>(`/applications/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  addApplicationNote: (id: number, note: string) =>
    request<{ note: unknown }>(`/applications/${id}`, {
      method: "POST",
      body: JSON.stringify({ action: "note", note }),
    }),

  listEmployerJobApplications: (jobId: number, stage?: string) =>
    request<{ applications: JobApplication[] }>(
      `/employer/jobs/${jobId}/applications${stage ? `?stage=${encodeURIComponent(stage)}` : ""}`,
    ),

  listResumes: () => request<{ resumes: ResumeSummary[] }>("/resumes"),

  getResume: (id: number) => request<{ resume: Resume }>(`/resumes/${id}`),

  createResume: (data: Partial<Resume> & { title?: string; target_role?: string } = {}) =>
    request<{ resume: Resume }>("/resumes", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateResume: (id: number, data: Partial<Resume> & { action?: string }) =>
    request<{ resume: Resume }>(`/resumes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteResume: (id: number) => request<void>(`/resumes/${id}`, { method: "DELETE" }),

  duplicateResume: (id: number, data: { title?: string } = {}) =>
    request<{ resume: Resume }>(`/resumes/${id}/duplicate`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  archiveResume: (id: number) =>
    request<{ resume: Resume }>(`/resumes/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "archive" }),
    }),

  renameResume: (id: number, title: string) =>
    request<{ resume: Resume }>(`/resumes/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "rename", title }),
    }),

  saveMyResume: (resume: Partial<Resume> & { create_blank?: boolean }) =>
    request<{ resume: Resume }>("/resumes/me", {
      method: "PUT",
      body: JSON.stringify(resume),
    }),

  createBlankResume: () =>
    request<{ resume: Resume }>("/resumes/me", {
      method: "PUT",
      body: JSON.stringify({ create_blank: true }),
    }),

  importResume: (file: File, meta: Record<string, string> = {}) => {
    const form = new FormData();
    form.append("file", file);
    Object.entries(meta).forEach(([key, value]) => {
      if (value) form.append(key, value);
    });
    return request<ResumeImportResult>("/resumes/me/import", {
      method: "POST",
      body: form,
    });
  },

  confirmResumeExtraction: (
    id: number,
    data: { resume?: Partial<Resume>; extraction?: Partial<ResumeExtraction>; action?: "skip" } = {},
  ) =>
    request<{ resume: Resume }>(`/resumes/${id}/confirm-extraction`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getResumeTemplates: () =>
    request<{ templates: ResumeTemplateInfo[]; ai: { enabled: boolean; message: string } }>(
      "/resumes/templates",
    ),

  runResumeQualityCheck: (id: number, resume?: Partial<Resume>) =>
    request<ResumeQualityResult>(`/resumes/${id}/quality-check`, {
      method: "POST",
      body: JSON.stringify(resume ? { resume } : {}),
    }),

  downloadResumePdf: async (id: number) => {
    const headers = new Headers();
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const res = await fetch(`${API_BASE}/resumes/${id}/export/pdf`, {
      method: "POST",
      headers,
    });
    if (!res.ok) {
      let detail = "PDF export failed";
      try {
        const data = await res.json();
        detail = data.detail || detail;
      } catch {
        /* ignore */
      }
      throw new ApiError(res.status, detail);
    }
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename="?([^"]+)"?/i);
    const filename = match?.[1] || `Resume_${id}.pdf`;
    return { blob, filename };
  },

  listResumeVersions: (id: number) =>
    request<{ versions: ResumeVersionSummary[] }>(`/resumes/${id}/versions`),

  createResumeVersion: (
    id: number,
    data: { label?: string; notes?: string; target_company?: string; target_role?: string } = {},
  ) =>
    request<{ resume: Resume; version: ResumeVersionSummary }>(`/resumes/${id}/versions`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  restoreResumeVersion: (id: number, versionId: string) =>
    request<{ resume: Resume }>(`/resumes/${id}/versions/${versionId}/restore`, {
      method: "POST",
      body: JSON.stringify({}),
    }),

  createTailoredResumeCopy: (
    id: number,
    data: { title?: string; target_role?: string; target_company?: string } = {},
  ) =>
    request<{ resume: Resume }>(`/resumes/${id}/tailor-copy`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  resumeAiImproveSummary: (id: number, tone = "professional") =>
    request<{ suggestion: string; notes: string; labeled: string; credits_used: number }>(
      `/resumes/${id}/ai/improve-summary`,
      { method: "POST", body: JSON.stringify({ tone }) },
    ),

  resumeAiRewriteBullet: (id: number, bullet: string, style = "achievement") =>
    request<{ suggestion: string; notes: string; labeled: string; credits_used: number }>(
      `/resumes/${id}/ai/rewrite-bullet`,
      { method: "POST", body: JSON.stringify({ bullet, style }) },
    ),

  resumeAiTailor: (
    id: number,
    data: { job_description: string; target_company?: string; target_role?: string },
  ) =>
    request<{
      suggested_summary: string;
      suggested_bullets: { original: string; suggestion: string }[];
      missing_keywords: string[];
      matched_keywords: string[];
      notes: string;
      labeled: string;
      credits_used: number;
    }>(`/resumes/${id}/ai/tailor`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  resumeMatchIndicator: (
    id: number,
    data: { job_description?: string; target_role?: string } = {},
  ) =>
    request<ResumeMatchResult>(`/resumes/${id}/ai/match`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

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

  getAnalyticsSummary: () =>
    request<AnalyticsSummary>(`/analytics/summary?_=${Date.now()}`),

  recordCaseStudyView: (caseStudyId: number, extras?: { viewer_key?: string; path?: string }) =>
    request<{ recorded: boolean; case_study_id?: number }>("/analytics/views", {
      method: "POST",
      body: JSON.stringify({
        case_study_id: caseStudyId,
        viewer_key: extras?.viewer_key,
        path: extras?.path,
      }),
    }),

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

  completePaypalCheckout: (payload: {
    orderId: string;
    planCode: string;
    billingInterval: "month" | "year";
  }) =>
    request<{
      success: boolean;
      outcome: string;
      detail?: string;
      current?: BillingUsageSummary | null;
    }>("/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ action: "complete_paypal", ...payload }),
    }),

  // —— TestLab ——
  testlabStatus: () =>
    request<{ product: string; subtitle: string; execution: TestLabExecutionCapabilities }>(
      "/testlab/status",
    ),

  listTestLabProjects: () => request<{ projects: TestLabProject[] }>("/testlab/projects"),

  createTestLabProject: (data: {
    name: string;
    description?: string;
    ownership_confirmed: boolean;
    tags?: string[];
  }) =>
    request<{ project: TestLabProject }>("/testlab/projects", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getTestLabProject: (projectId: string) =>
    request<TestLabProjectDetail>(`/testlab/projects/${projectId}`),

  updateTestLabProject: (projectId: string, data: Partial<TestLabProject>) =>
    request<{ project: TestLabProject }>(`/testlab/projects/${projectId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteTestLabProject: (projectId: string) =>
    request<{ ok: boolean }>(`/testlab/projects/${projectId}`, { method: "DELETE" }),

  addTestLabTarget: (
    projectId: string,
    data: { base_url: string; label?: string; environment?: string },
  ) =>
    request<{ target: TestLabTarget }>(`/testlab/projects/${projectId}/targets`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateTestLabTarget: (targetId: string, data: Partial<TestLabTarget>) =>
    request<{ target: TestLabTarget }>(`/testlab/targets/${targetId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  startTestLabVerification: (targetId: string, method?: string) =>
    request<{ challenge: TestLabVerificationChallenge }>(
      `/testlab/targets/${targetId}/verify/start`,
      { method: "POST", body: JSON.stringify({ method }) },
    ),

  confirmTestLabVerification: (targetId: string) =>
    request<{ target: TestLabTarget }>(`/testlab/targets/${targetId}/verify/confirm`, {
      method: "POST",
      body: JSON.stringify({}),
    }),

  listTestLabMembers: (projectId: string) =>
    request<{ members: TestLabMember[] }>(`/testlab/projects/${projectId}/members`),

  addTestLabMember: (
    projectId: string,
    data: { email?: string; user_id?: number; role: string },
  ) =>
    request<{ member: TestLabMember }>(`/testlab/projects/${projectId}/members`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  createTestLabRequirement: (projectId: string, data: Partial<TestLabRequirement>) =>
    request<{ requirement: TestLabRequirement }>(`/testlab/projects/${projectId}/requirements`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  importTestLabRequirements: (projectId: string, text: string) =>
    request<{ created: TestLabRequirement[]; count: number }>(
      `/testlab/projects/${projectId}/requirements`,
      { method: "POST", body: JSON.stringify({ text, import: true }) },
    ),

  createTestLabTest: (projectId: string, data: Partial<TestLabTestCase>) =>
    request<{ test: TestLabTestCase }>(`/testlab/projects/${projectId}/tests`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  generateTestLabTests: (
    projectId: string,
    data: { requirement_ids?: string[]; openapi?: string },
  ) =>
    request<{ tests: TestLabTestCase[]; count: number }>(`/testlab/projects/${projectId}/tests`, {
      method: "POST",
      body: JSON.stringify({ ...data, generate: true }),
    }),

  updateTestLabTest: (testId: string, data: Partial<TestLabTestCase>) =>
    request<{ test: TestLabTestCase }>(`/testlab/tests/${testId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteTestLabTest: (testId: string) =>
    request<{ ok: boolean }>(`/testlab/tests/${testId}`, { method: "DELETE" }),

  getTestLabTraceability: (projectId: string) =>
    request<{
      matrix: Array<{ requirement: TestLabRequirement; tests: TestLabTestCase[] }>;
      uncovered_requirements: TestLabRequirement[];
      orphan_tests: TestLabTestCase[];
    }>(`/testlab/projects/${projectId}/traceability`),

  createTestLabRun: (
    projectId: string,
    data: {
      target_id: string;
      test_case_ids?: string[];
      browsers?: string[];
      options?: Record<string, boolean>;
    },
  ) =>
    request<{ run: TestLabRun; execution: TestLabExecutionCapabilities }>(
      `/testlab/projects/${projectId}/runs`,
      { method: "POST", body: JSON.stringify(data) },
    ),

  getTestLabRun: (runId: string) =>
    request<{ run: TestLabRun; results: TestLabResult[] }>(`/testlab/runs/${runId}`),

  cancelTestLabRun: (runId: string) =>
    request<{ run: TestLabRun }>(`/testlab/runs/${runId}/cancel`, {
      method: "POST",
      body: JSON.stringify({}),
    }),

  upsertTestLabSecret: (projectId: string, data: { key: string; value: string }) =>
    request<{ secret: TestLabSecretMeta }>(`/testlab/projects/${projectId}/secrets`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  createTestLabDefect: (projectId: string, data: Partial<TestLabDefect>) =>
    request<{ defect: TestLabDefect }>(`/testlab/projects/${projectId}/defects`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateTestLabDefect: (defectId: string, data: Partial<TestLabDefect>) =>
    request<{ defect: TestLabDefect }>(`/testlab/defects/${defectId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  retestTestLabDefect: (defectId: string) =>
    request<{ run: TestLabRun; defect_id: string }>(`/testlab/defects/${defectId}/retest`, {
      method: "POST",
      body: JSON.stringify({}),
    }),

  createTestLabSchedule: (projectId: string, data: Partial<TestLabSchedule>) =>
    request<{ schedule: TestLabSchedule }>(`/testlab/projects/${projectId}/schedules`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateTestLabSchedule: (scheduleId: string, data: Partial<TestLabSchedule>) =>
    request<{ schedule: TestLabSchedule }>(`/testlab/schedules/${scheduleId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  getTestLabReport: (projectId: string) =>
    request<{
      executive: {
        total_runs: number;
        pass_rate: number | null;
        open_defects: number;
        coverage: number | null;
      };
      technical: {
        recent_runs: TestLabRun[];
        failing_tests: TestLabResult[];
        accessibility_hotspots: TestLabResult[];
      };
    }>(`/testlab/projects/${projectId}/report`),

  saveTestLabRecorder: (
    projectId: string,
    data: { title?: string; description?: string; steps: unknown[] },
  ) =>
    request<{ test: TestLabTestCase }>(`/testlab/projects/${projectId}/recorder`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  listTestLabBaselines: (projectId: string) =>
    request<{
      baselines: Array<{
        id: string;
        test_case_id: string;
        browser: string;
        viewport_name: string;
        fingerprint: string;
        data_url?: string;
        updated_at: string;
      }>;
    }>(`/testlab/projects/${projectId}/baselines`),

  acceptTestLabBaseline: (
    projectId: string,
    data: {
      test_case_id: string;
      data_url: string;
      browser?: string;
      viewport_name?: string;
      fingerprint?: string;
    },
  ) =>
    request<{ baseline: Record<string, unknown> }>(`/testlab/projects/${projectId}/baselines`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  triggerTestLabCi: (
    projectId: string,
    data: {
      target_id?: string;
      test_case_ids?: string[];
      browsers?: string[];
      visual?: boolean;
      responsive?: boolean;
      broken_links?: boolean;
      performance?: boolean;
      authenticated?: boolean;
      commit_sha?: string;
      branch?: string;
    } = {},
  ) =>
    request<{ run: TestLabRun; execution: TestLabExecutionCapabilities }>(
      `/testlab/projects/${projectId}/ci`,
      { method: "POST", body: JSON.stringify(data) },
    ),
};

export { ApiError };
