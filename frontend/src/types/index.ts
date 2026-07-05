export interface MetricItem {
  label: string;
  value: string;
  description?: string;
}

export interface ContentBlock {
  id: string;
  type: "text" | "quote" | "findings" | "gallery" | "image" | "file";
  data: Record<string, unknown>;
}

export interface Attachment {
  id: number;
  title: string;
  file_url: string;
  file_type: string;
  size_bytes: number;
}

export interface CaseStudy {
  id: number;
  slug: string;
  title: string;
  subtitle?: string;
  client?: string;
  project_type?: string;
  role?: string;
  duration?: string;
  summary?: string;
  challenge?: string;
  methodology?: string;
  impact?: string;
  reflections?: string;
  cover_image?: string;
  methods: string[];
  metrics: MetricItem[];
  content_blocks: ContentBlock[];
  status: "draft" | "published";
  featured: boolean;
  sort_order: number;
  author_id: number;
  created_at: string;
  updated_at: string;
  published_at?: string;
  attachments?: Attachment[];
}

export interface CaseStudyListItem {
  id: number;
  slug: string;
  title: string;
  subtitle?: string;
  client?: string;
  cover_image?: string;
  methods: string[];
  featured: boolean;
  status: string;
  updated_at: string;
}

export interface AuthorSummary {
  id: number;
  username: string;
  name: string;
  title?: string;
  avatar_url?: string;
}

export interface FeedCaseStudyItem extends CaseStudyListItem {
  published_at?: string;
  author: AuthorSummary;
}

export interface UserPublic {
  id: number;
  username: string;
  name: string;
  title?: string;
  bio?: string;
  avatar_url?: string;
  contact_email?: string;
  location?: string;
  cv_url?: string;
  social_links: Record<string, string>;
}

export interface UserProfile extends UserPublic {
  case_studies: CaseStudyListItem[];
  case_study_count: number;
}

export interface PortfolioSettings {
  site_title: string;
  tagline: string;
  hero_title: string;
  hero_subtitle: string;
  about: string;
  contact_email?: string;
  social_links: Record<string, string>;
}

export interface User {
  id: number;
  email: string;
  username: string;
  name: string;
  title?: string;
  bio?: string;
  avatar_url?: string;
  contact_email?: string;
  location?: string;
  cv_url?: string;
  social_links?: Record<string, string>;
  role: string;
  portfolio_url?: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  username?: string;
  title?: string;
}

export interface MediaAsset {
  id: number;
  filename: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  url: string;
  alt_text?: string;
  created_at: string;
}
