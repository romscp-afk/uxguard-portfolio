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
  project_id?: number | null;
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
  summary?: string;
  client?: string;
  cover_image?: string;
  methods: string[];
  featured: boolean;
  status: string;
  like_count?: number;
  updated_at: string;
}

export interface AuthorSummary {
  id: number;
  username: string;
  name: string;
  title?: string;
  bio?: string;
  avatar_url?: string;
}

export interface FeedCaseStudyItem extends CaseStudyListItem {
  published_at?: string;
  author: AuthorSummary | null;
}

export interface UserPublic {
  id: number;
  username: string;
  name: string;
  title?: string;
  bio?: string;
  avatar_url?: string;
  cover_image_url?: string;
  contact_email?: string;
  location?: string;
  cv_url?: string;
  social_links: Record<string, string>;
}

export interface UserProfile extends UserPublic {
  portfolio_config?: PortfolioBuilderConfig;
  projects?: Project[];
  case_studies: CaseStudyListItem[];
  case_study_count: number;
  follower_count?: number;
  following_count?: number;
  is_following?: boolean;
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

export interface ProjectOutcome {
  label: string;
  value: string;
  description?: string;
}

export interface ProjectAttachment {
  id: number;
  title: string;
  file_url: string;
  file_type: string;
  size_bytes: number;
}

export interface Project {
  id: number;
  author_id: number;
  title: string;
  slug: string;
  client?: string | null;
  status: "planning" | "active" | "completed" | "archived";
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  tags: string[];
  role?: string | null;
  team: string[];
  outcomes: ProjectOutcome[];
  cover_image?: string | null;
  attachments: ProjectAttachment[];
  created_at: string;
  updated_at: string;
}

export interface PortfolioBuilderConfig {
  show_profile: boolean;
  show_projects: boolean;
  show_case_studies: boolean;
  show_timeline: boolean;
  show_achievements: boolean;
  show_analytics: boolean;
  case_study_order: number[];
  featured_case_study_ids: number[];
}

export interface User {
  id: number;
  email: string;
  username: string;
  name: string;
  title?: string;
  bio?: string;
  avatar_url?: string;
  cover_image_url?: string;
  contact_email?: string;
  location?: string;
  cv_url?: string;
  social_links?: Record<string, string>;
  role: "admin" | "professional" | "viewer" | string;
  onboarding_intent?: OnboardingIntent;
  portfolio_config?: PortfolioBuilderConfig;
  portfolio_url?: string;
}

export type OnboardingIntent = "build_portfolio" | "track_career" | "publish_case_studies";

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  username?: string;
  title?: string;
  role?: "professional" | "viewer";
  onboarding_intent?: OnboardingIntent;
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

export interface Comment {
  id: number;
  case_study_id: number;
  body: string;
  created_at: string;
  author: AuthorSummary | null;
}

export interface Notification {
  id: number;
  user_id: number;
  type: "new_case_study" | "comment" | "follow" | "like";
  title: string;
  message: string;
  link?: string | null;
  read_at?: string | null;
  created_at: string;
}

export interface LikeStats {
  case_study_id: number;
  like_count: number;
  is_liked: boolean;
}

export interface SearchResults {
  query: string;
  users: (AuthorSummary & { title?: string; bio?: string; portfolio_url: string })[];
  case_studies: (FeedCaseStudyItem & { url?: string | null })[];
}

export interface FollowStats {
  username?: string;
  follower_count: number;
  following_count: number;
  is_following: boolean;
}

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  inquiry_type: string;
  subject: string;
  message: string;
  created_at: string;
  read: boolean;
}
