import type {
  Attachment,
  CaseStudy,
  CaseStudyListItem,
  FeedCaseStudyItem,
  MediaAsset,
  PortfolioSettings,
  User,
  UserProfile,
  RegisterPayload,
} from "../types";

const API_ROOT = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const API_BASE = `${API_ROOT}/api/v1`;

export function resolveAssetUrl(url: string): string {
  if (!url || url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_ROOT}${url}`;
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function getToken(): string | null {
  return localStorage.getItem("uxguard_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.detail || res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  login: (email: string, password: string) =>
    request<{ access_token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

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

  getFeed: () => request<FeedCaseStudyItem[]>("/feed/case-studies"),

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

  uploadMedia: (file: File, altText?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (altText) form.append("alt_text", altText);
    return request<MediaAsset>("/media/upload", {
      method: "POST",
      body: form,
    });
  },

  deleteMedia: (id: number) =>
    request<void>(`/media/${id}`, { method: "DELETE" }),
};

export { ApiError };
