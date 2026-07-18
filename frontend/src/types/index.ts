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
  like_count?: number;
  is_liked?: boolean;
  /** Live prototype / external website URL shown in a view-only popup. */
  prototype_url?: string | null;
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

export type ResumeParseStatus = "none" | "pending" | "ready" | "failed";

export interface ResumeLink {
  label: string;
  url: string;
}

export interface ResumeBasics {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  links: ResumeLink[];
}

export interface ResumeExperience {
  id: string;
  company: string;
  role: string;
  location: string;
  start: string;
  end: string;
  current: boolean;
  bullets: string[];
}

export interface ResumeEducation {
  id: string;
  school: string;
  degree: string;
  field: string;
  start: string;
  end: string;
  details: string;
}

export interface ResumeCertification {
  id: string;
  name: string;
  issuer: string;
  year: string;
}

export interface ResumeProjectItem {
  id: string;
  name: string;
  url: string;
  summary: string;
}

export interface Resume {
  id: number;
  user_id: number;
  title: string;
  basics: ResumeBasics;
  experience: ResumeExperience[];
  education: ResumeEducation[];
  skills: string[];
  certifications: ResumeCertification[];
  projects: ResumeProjectItem[];
  source_media_id?: number | null;
  source_filename?: string | null;
  source_mime?: string | null;
  parsed_at?: string | null;
  parse_status: ResumeParseStatus;
  parse_error?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResumeImportResult {
  resume: Resume;
  credits_used?: number;
  ai_used: boolean;
  message?: string;
}

export type PortfolioTheme =
  | "evidence_lab"
  | "hiring_signal"
  | "research_journal"
  | "impact_gallery";

export interface PortfolioBuilderConfig {
  show_profile: boolean;
  show_projects: boolean;
  show_case_studies: boolean;
  show_timeline: boolean;
  show_achievements: boolean;
  show_analytics: boolean;
  case_study_order: number[];
  featured_case_study_ids: number[];
  /** Public portfolio visual layout */
  theme?: PortfolioTheme;
  /** Last applied starter/theme template id */
  applied_template_id?: string | null;
}

export type TemplateCategory = "case_study" | "theme" | "starter_kit";

export interface TemplateDefinition {
  id: string;
  category: TemplateCategory;
  name: string;
  tagline: string;
  description: string;
  badge: string;
  accent: "teal" | "ink" | "amber" | "violet";
  audience: string;
  rigorHints: string[];
  previewSections: string[];
  theme?: PortfolioTheme;
  portfolioConfig?: Partial<PortfolioBuilderConfig>;
  profile?: Partial<Pick<User, "title" | "bio">>;
  project?: Partial<Project>;
  caseStudy?: Partial<CaseStudy>;
  caseStudies?: Partial<CaseStudy>[];
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
  signup_location?: string | null;
  signup_country?: string | null;
  signup_city?: string | null;
  signup_region?: string | null;
  cv_url?: string;
  social_links?: Record<string, string>;
  role: "admin" | "professional" | "viewer" | string;
  onboarding_intent?: OnboardingIntent;
  portfolio_config?: PortfolioBuilderConfig;
  portfolio_url?: string;
}

/** Admin directory row / detail payload */
export interface AdminUserSummary extends User {
  case_study_count: number;
  project_count: number;
  media_count: number;
  created_at?: string | null;
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
  thread_id: string;
  parent_id?: number | null;
  folder: "inbox" | "sent" | "drafts" | "trash" | string;
  direction: "inbound" | "outbound" | string;
  name: string;
  email: string;
  from_name?: string;
  from_email?: string;
  to_name?: string;
  to_email?: string;
  inquiry_type: string;
  subject: string;
  message: string;
  created_at: string;
  updated_at?: string;
  read: boolean;
  starred?: boolean;
  deleted_at?: string | null;
}

export interface ContactMailboxCounts {
  inbox: number;
  inbox_unread: number;
  sent: number;
  drafts: number;
  trash: number;
  starred: number;
}

export type AssistantContextType = "general" | "case_study" | "project" | "profile" | "portfolio";

export interface AssistantChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantPageContext {
  type: AssistantContextType;
  pageLabel: string;
  entityId?: number | string;
  draft?: Record<string, unknown>;
  field?: string;
  onApply?: (updates: Record<string, unknown>) => void;
}

export interface AssistantChatResponse {
  message: string;
  field_updates?: Record<string, unknown> | null;
  suggestions?: string[];
  model?: string;
}

export interface AssistantStatus {
  enabled: boolean;
  provider: string | null;
  model: string | null;
}

export interface AssistantThreadMessage extends AssistantChatMessage {
  id: string;
  field_updates?: Record<string, unknown> | null;
  suggestions?: string[];
}

/** Phase 1 UXGuard AI tools */
export type AiAssistantType =
  | "case-study"
  | "research"
  | "documentation"
  | "portfolio-review";

export interface AiCreditsSummary {
  monthly_allowance: number;
  purchased_credits: number;
  used_credits: number;
  remaining_credits: number;
  reset_date: string;
  plan_code?: string;
  unlimited?: boolean;
  model: string | null;
  enabled: boolean;
}

export interface AiConversation {
  id: string;
  user_id: number;
  title: string;
  assistant_type: AiAssistantType | string;
  created_at: string;
  updated_at: string;
}

export interface AiMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | string;
  content: Record<string, unknown> | string;
  input_tokens?: number;
  output_tokens?: number;
  credits_used?: number;
  version_of?: string | null;
  created_at: string;
}

export interface AiGenerateResponse {
  success: boolean;
  conversationId: string;
  messageId: string;
  content: Record<string, unknown>;
  creditsUsed: number;
  remainingCredits: number;
  model?: string;
}

export interface SavedAiOutput {
  id: string;
  user_id: number;
  conversation_id?: string | null;
  title: string;
  output_type: string;
  content: Record<string, unknown> | string;
  created_at: string;
  updated_at: string;
}

export interface BillingPlan {
  code: string;
  name: string;
  description: string;
  monthly_price: number | null;
  annual_price: number | null;
  currency: string;
  ai_credits: number | null;
  storage_limit_bytes: number | null;
  portfolio_limit: number | null;
  case_study_limit: number | null;
  team_member_limit: number | null;
  custom_domain_enabled: boolean;
  private_projects_enabled: boolean;
  advanced_analytics_enabled: boolean;
  pdf_export_enabled: boolean;
  team_workspace_enabled: boolean;
  ai_tools_enabled: boolean;
  interview_prep_enabled: boolean;
  highlight?: boolean;
}

export interface BillingUsageSummary {
  plan: {
    code: string;
    name: string;
    description: string;
    monthly_price: number | null;
    annual_price: number | null;
    currency: string;
  };
  subscription: {
    id?: string;
    status: string;
    billing_interval: string;
    current_period_start?: string;
    current_period_end?: string;
    cancel_at_period_end: boolean;
    payment_provider: string;
  };
  usage: {
    portfolios_used: number;
    portfolios_limit: number | null;
    case_studies_used: number;
    case_studies_limit: number | null;
    storage_used_bytes: number;
    storage_limit_bytes: number | null;
    storage_used_label: string;
    storage_limit_label: string;
    ai_credits_used: number;
    ai_credits_limit: number | null;
    ai_credits_remaining: number | null;
    cycle_start: string;
    cycle_end: string;
  };
  features: Record<string, boolean>;
  transactions?: PaymentTransaction[];
  is_admin_comp?: boolean;
  unlimited?: boolean;
}

export interface PaymentTransaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  transaction_type: string;
  created_at: string;
  invoice_url?: string | null;
  receipt_url?: string | null;
}

export interface AnalyticsDayPoint {
  date: string;
  views: number;
}

export interface AnalyticsCaseStudyRow {
  id: number;
  title: string;
  slug: string;
  status: string;
  views: number;
  likes: number;
  comments: number;
  last_viewed_at?: string | null;
  updated_at?: string | null;
}

export interface AnalyticsSummary {
  totals: {
    views: number;
    likes: number;
    comments: number;
    published_case_studies: number;
    case_studies: number;
  };
  case_studies: AnalyticsCaseStudyRow[];
  views_last_30_days: AnalyticsDayPoint[];
}
