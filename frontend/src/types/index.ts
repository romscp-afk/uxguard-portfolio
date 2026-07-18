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
export type ResumeStatus = "draft" | "completed" | "archived" | "deleted";
export type ResumeExperienceLevel =
  | "entry"
  | "mid"
  | "senior"
  | "executive"
  | "career_change";
export type ResumeCreationMethod = "manual" | "upload";

export interface ResumeLink {
  label: string;
  url: string;
}

export interface ResumeBasics {
  name: string;
  title: string;
  email: string;
  phone: string;
  country?: string;
  city?: string;
  address?: string;
  postal_code?: string;
  location: string;
  linkedin_url?: string;
  portfolio_url?: string;
  website_url?: string;
  github_url?: string;
  photo_url?: string;
  summary: string;
  objective?: string;
  links: ResumeLink[];
}

export interface ResumeExperience {
  id: string;
  company: string;
  role: string;
  employment_type?: string;
  location: string;
  work_mode?: string;
  start: string;
  end: string;
  current: boolean;
  description?: string;
  bullets: string[];
  tools?: string[];
}

export interface ResumeEducation {
  id: string;
  school: string;
  degree: string;
  field: string;
  location?: string;
  start: string;
  end: string;
  current?: boolean;
  grade?: string;
  details: string;
}

export interface ResumeSkill {
  id: string;
  name: string;
  category: string;
  level?: string;
  years?: string;
}

export interface ResumeCertification {
  id: string;
  name: string;
  issuer: string;
  year: string;
  issue_date?: string;
  expiration_date?: string;
  credential_id?: string;
  credential_url?: string;
  no_expiry?: boolean;
}

export interface ResumeProjectItem {
  id: string;
  name: string;
  role?: string;
  organization?: string;
  url: string;
  start?: string;
  end?: string;
  summary: string;
  outcomes?: string[];
  tools?: string[];
}

export interface ResumeLanguage {
  id: string;
  language: string;
  proficiency: string;
}

export interface ResumeSimpleEntry {
  id: string;
  title: string;
  issuer?: string;
  date?: string;
  url?: string;
  description?: string;
}

export interface ResumeReference {
  id: string;
  name: string;
  position?: string;
  company?: string;
  email?: string;
  phone?: string;
  relationship?: string;
}

export interface ResumeCustomSectionItem {
  id: string;
  title: string;
  subtitle?: string;
  date?: string;
  description?: string;
  url?: string;
}

export interface ResumeCustomSection {
  id: string;
  title: string;
  items: ResumeCustomSectionItem[];
}

export interface Resume {
  id: number;
  user_id: number;
  title: string;
  target_role?: string;
  target_company?: string;
  target_industry?: string;
  target_country?: string;
  experience_level?: ResumeExperienceLevel;
  creation_method?: ResumeCreationMethod;
  status: ResumeStatus;
  completion_percentage: number;
  template_id?: string;
  settings?: ResumeSettings;
  versions?: ResumeVersionSummary[];
  basics: ResumeBasics;
  experience: ResumeExperience[];
  education: ResumeEducation[];
  skills: ResumeSkill[];
  certifications: ResumeCertification[];
  projects: ResumeProjectItem[];
  languages?: ResumeLanguage[];
  awards?: ResumeSimpleEntry[];
  publications?: ResumeSimpleEntry[];
  volunteering?: ResumeSimpleEntry[];
  references?: ResumeReference[];
  custom_sections?: ResumeCustomSection[];
  section_order?: string[];
  hidden_sections?: string[];
  source_media_id?: number | null;
  source_filename?: string | null;
  source_mime?: string | null;
  parsed_at?: string | null;
  parse_status: ResumeParseStatus;
  parse_error?: string | null;
  extraction?: ResumeExtraction | null;
  timeline_selections?: ResumeTimelineSelection[];
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface ResumeTimelineSelection {
  id: string;
  timeline_entry_id: number;
  is_included: boolean;
  resume_specific_content?: {
    title?: string;
    description?: string;
    achievements?: string[];
    skills?: string[];
  } | null;
  created_at?: string;
  updated_at?: string;
  entry?: CareerTimelineEntry | null;
}

export type CareerTimelineType =
  | "employment"
  | "promotion"
  | "education"
  | "project"
  | "certification"
  | "award"
  | "volunteering"
  | "career_break"
  | "milestone"
  | "custom";

export type CareerProfileVisibility =
  | "private"
  | "employers"
  | "employers_after_apply"
  | "public_link";

export type CareerEntryVisibility = "private" | "employers" | "public";

export interface CareerProfile {
  id: number;
  user_id: number;
  headline: string;
  summary: string;
  total_experience_months: number;
  visibility: CareerProfileVisibility;
  public_slug?: string | null;
  public_link_enabled: boolean;
  display_settings?: {
    sort?: "newest" | "oldest";
    group_by_year?: boolean;
    show_descriptions?: boolean;
    show_career_breaks?: boolean;
    show_only_resume_selected?: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface CareerTimelineEntry {
  id: number;
  career_profile_id: number;
  type: CareerTimelineType;
  title: string;
  organisation: string;
  location: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  description: string;
  achievements: string[];
  skills: string[];
  employment_type?: string;
  working_arrangement?: string;
  previous_title?: string;
  new_title?: string;
  field_of_study?: string;
  issuer?: string;
  expiration_date?: string;
  credential_details?: string;
  supporting_url?: string;
  break_reason?: string;
  custom_type_label?: string;
  source_type?: "manual" | "resume_import" | "system";
  source_resume_id?: number | null;
  source_section?: string | null;
  source_item_id?: string | null;
  verification_status?: string;
  visibility: CareerEntryVisibility;
  hidden: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface CareerInsights {
  total_experience_months: number;
  total_years: number;
  employer_count: number;
  role_count: number;
  average_role_months: number;
  longest_role: { id: number; months: number; title: string; organisation: string } | null;
  career_start_year: number | null;
  current_role: { id: number; title: string; organisation: string } | null;
  promotion_count: number;
  skills_by_stage: Record<string, Record<string, number>>;
  gaps: Array<{
    after_entry_id: number;
    before_entry_id: number;
    start_date: string;
    end_date: string;
    months: number;
    message: string;
  }>;
  overlaps: Array<{ a_id: number; b_id: number }>;
  inconsistent_company_names: Array<{ variants: string[] }>;
  missing_date_entry_ids: number[];
  entry_count: number;
}

export interface CareerImportDuplicate {
  candidate: CareerTimelineEntry;
  matches: Array<{
    existing_id: number;
    confidence: string;
    entry: CareerTimelineEntry;
  }>;
}

export interface ResumeSummary {
  id: number;
  title: string;
  target_role?: string;
  status: ResumeStatus;
  completion_percentage: number;
  template_id?: string;
  creation_method?: ResumeCreationMethod;
  updated_at: string;
  created_at: string;
}

export interface ResumeSettings {
  primary_color: string;
  accent_color: string;
  font_family: string;
  font_size: number;
  line_spacing: number;
  section_spacing: number;
  margins: number;
  layout: "single" | "two";
  show_photo: boolean;
  date_format: string;
  page_size: "a4" | "letter";
}

export interface ResumeVersionSummary {
  id: string;
  version_number: number;
  label: string;
  notes?: string;
  target_company?: string;
  target_role?: string;
  created_at: string;
}

export interface ResumeQualityIssue {
  severity: "critical" | "recommended" | "optional";
  code: string;
  message: string;
  section?: string | null;
  field?: string | null;
}

export interface ResumeQualityResult {
  issues: ResumeQualityIssue[];
  summary: { critical: number; recommended: number; optional: number; total: number };
  guidance: string;
}

export interface ResumeTemplateInfo {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  supports_two_column: boolean;
  ats_friendly: boolean;
  defaults: ResumeSettings;
}

export interface ResumeMatchResult {
  indicator: number;
  breakdown: Record<string, number>;
  matched_keywords: string[];
  missing_keywords: string[];
  quality_issues: { critical: number; recommended: number; optional: number };
  disclaimer: string;
}

export interface ResumeImportResult {
  resume: Resume;
  credits_used?: number;
  ai_used: boolean;
  message?: string;
  needs_review?: boolean;
}

export type ResumeExtractionFieldStatus =
  | "confirmed"
  | "needs_review"
  | "missing"
  | "not_imported";

export interface ResumeExtractionField {
  value: string | number | string[];
  confidence: number;
  status: ResumeExtractionFieldStatus;
  reviewed?: boolean;
  changed?: boolean;
  source_text?: string;
}

export interface ResumeExtraction {
  parser_version: string;
  parser: string;
  ai_used: boolean;
  status: "pending_review" | "confirmed" | "failed" | "skipped";
  raw_text: string;
  warnings: { code?: string; message: string }[];
  fields: Record<string, ResumeExtractionField>;
  needs_review_count: number;
  created_at?: string | null;
  reviewed_at?: string | null;
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
  workspaces?: { candidate: boolean; employer: boolean };
  active_workspace?: "candidate" | "employer";
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

export type CompanyVerificationStatus = "pending" | "verified" | "rejected" | "suspended";
export type JobStatus =
  | "draft"
  | "pending_review"
  | "scheduled"
  | "published"
  | "paused"
  | "closed"
  | "expired"
  | "archived"
  | "rejected"
  | "suspended";

export interface Company {
  id: number;
  owner_user_id: number;
  legal_name: string;
  display_name: string;
  slug: string;
  logo_url?: string;
  cover_image_url?: string;
  industry?: string;
  company_size?: string;
  founded_year?: number | null;
  headquarters?: string;
  website?: string;
  linkedin_url?: string;
  description?: string;
  culture?: string;
  benefits?: string[];
  locations?: unknown[];
  contact_email?: string;
  verification_email_domain?: string;
  verification_status: CompanyVerificationStatus;
  terms_accepted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyMember {
  id: number;
  company_id: number;
  user_id?: number | null;
  email: string;
  role: string;
  permissions?: Record<string, boolean>;
  status: string;
  invited_by?: number | null;
  assigned_job_ids?: number[];
}

export interface Job {
  id: number;
  company_id: number;
  created_by: number;
  title: string;
  department?: string;
  summary?: string;
  description?: string;
  responsibilities?: string[];
  required_skills?: string[];
  preferred_skills?: string[];
  employment_type?: string;
  experience_level?: string;
  workplace_type?: string;
  vacancies?: number;
  country?: string;
  city?: string;
  deadline?: string;
  expected_start_date?: string;
  location?: { country?: string; city?: string; workplace_type?: string };
  salary?: {
    visible?: boolean;
    currency?: string;
    min?: number | null;
    max?: number | null;
    period?: string;
    bonus?: string;
  };
  benefits?: string[];
  visa_sponsorship?: boolean;
  relocation_support?: boolean;
  education_requirements?: string[];
  team_info?: string;
  reporting_line?: string;
  portfolio_required?: boolean;
  resume_required?: boolean;
  cover_letter_required?: boolean;
  min_experience_years?: number | null;
  application_settings?: Record<string, unknown>;
  questions?: Array<{
    id: string;
    question: string;
    type: string;
    options?: string[];
    is_required?: boolean;
    is_knockout?: boolean;
  }>;
  wizard_step?: number;
  status: JobStatus;
  published_at?: string | null;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;
  company?: Partial<Company>;
  saved?: boolean;
  verification_status?: string;
}

export interface JobApplication {
  id: number;
  job_id: number;
  company_id: number;
  candidate_user_id?: number;
  resume_id?: number | null;
  status: string;
  candidate_visible_status?: string;
  submitted_at?: string | null;
  updated_at?: string;
  withdrawn_at?: string | null;
  cover_letter?: string;
  portfolio_url?: string;
  match_summary?: JobMatchSummary | null;
  job_title?: string;
  company_name?: string;
  company_logo?: string;
  next_action?: string | null;
  candidate_name?: string;
  headline?: string;
  latest_role?: string;
  location?: string;
  match_percent?: number | null;
  tags?: string[];
}

export interface JobMatchSummary {
  percent: number;
  disclaimer: string;
  categories: Record<string, { score: number; evidence?: string; matched?: string[]; missing?: string[] }>;
  suggested_improvements?: string[];
}

export interface EmployerDashboard {
  company: Company | null;
  stats: {
    active_jobs: number;
    draft_jobs: number;
    closed_jobs: number;
    expired_jobs: number;
    total_applications: number;
    new_applications: number;
    shortlisted: number;
    interviews: number;
    hires: number;
  } | null;
  jobs: Array<{ id: number; title: string; status: string; updated_at: string; published_at?: string | null }>;
  recent_applications: Array<{
    id: number;
    job_id: number;
    status: string;
    submitted_at?: string | null;
    candidate_user_id: number;
  }>;
}

/** UXGuard TestLab */
export type TestLabProjectRole =
  | "owner"
  | "test_manager"
  | "tester"
  | "developer"
  | "product_reviewer"
  | "viewer";

export type TestLabTargetEnvironment = "production" | "staging" | "preview" | "development";
export type TestLabVerificationStatus = "unverified" | "pending" | "verified" | "expired";
export type TestLabRunStatus =
  | "queued"
  | "running"
  | "passed"
  | "failed"
  | "cancelled"
  | "error"
  | "timed_out";

export interface TestLabProject {
  id: string;
  owner_user_id: number;
  name: string;
  description: string;
  status: "active" | "archived" | "deleted";
  ownership_confirmed: boolean;
  default_browsers: string[];
  tags: string[];
  role?: TestLabProjectRole;
  target_count?: number;
  test_count?: number;
  open_defects?: number;
  created_at: string;
  updated_at: string;
}

export interface TestLabTarget {
  id: string;
  project_id: string;
  label: string;
  base_url: string;
  environment: TestLabTargetEnvironment;
  verification_status: TestLabVerificationStatus;
  verification_method?: string | null;
  verified_at?: string | null;
  safety_settings?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TestLabRequirement {
  id: string;
  project_id: string;
  title: string;
  description: string;
  source: string;
  priority: string;
  tags: string[];
  acceptance_criteria: string[];
  created_at: string;
  updated_at: string;
}

export interface TestLabStep {
  id: string;
  order?: number;
  action: string;
  selector: string;
  value: string;
  assertion: string;
  description: string;
}

export interface TestLabTestCase {
  id: string;
  project_id: string;
  requirement_ids: string[];
  title: string;
  description: string;
  type: string;
  priority: string;
  tags: string[];
  steps: TestLabStep[];
  data_sets?: Array<Record<string, unknown>>;
  enabled: boolean;
  generated_by: string;
  created_at: string;
  updated_at: string;
}

export interface TestLabRun {
  id: string;
  project_id: string;
  target_id: string;
  test_case_ids: string[];
  status: TestLabRunStatus;
  browsers: string[];
  cancel_requested?: boolean;
  summary?: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    errors: number;
    cancelled?: number;
  };
  error_message?: string | null;
  queued_at?: string;
  started_at?: string | null;
  finished_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TestLabResult {
  id: string;
  run_id: string;
  test_case_id: string;
  browser: string;
  status: string;
  duration_ms: number;
  steps?: unknown[];
  screenshots?: Array<{ id: string; mime?: string; data_url?: string }>;
  console_errors?: string[];
  network_errors?: string[];
  accessibility?: { violations?: unknown[]; passes?: number } | null;
  performance?: Record<string, number> | null;
  broken_links?: Array<{ href: string; status: number }>;
  error_message?: string | null;
  created_at: string;
}

export interface TestLabDefect {
  id: string;
  project_id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  test_case_id?: string | null;
  run_id?: string | null;
  retest_run_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TestLabSchedule {
  id: string;
  project_id: string;
  name: string;
  cron: string;
  timezone: string;
  target_id: string;
  test_case_ids: string[];
  browsers: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface TestLabSecretMeta {
  id: string;
  project_id: string;
  key: string;
  has_value: boolean;
  created_at: string;
  updated_at: string;
}

export interface TestLabMember {
  id: string;
  project_id: string;
  user_id: number;
  email?: string | null;
  role: TestLabProjectRole;
  created_at: string;
}

export interface TestLabExecutionCapabilities {
  configured: boolean;
  browsers: string[];
  inline: boolean;
  reason: string;
}

export interface TestLabProjectDetail {
  project: TestLabProject;
  targets: TestLabTarget[];
  members: TestLabMember[];
  requirements: TestLabRequirement[];
  tests: TestLabTestCase[];
  runs: TestLabRun[];
  defects: TestLabDefect[];
  schedules: TestLabSchedule[];
  secrets: TestLabSecretMeta[];
  baselines?: Array<{
    id: string;
    test_case_id: string;
    browser: string;
    viewport_name: string;
    fingerprint: string;
    data_url?: string;
    updated_at: string;
  }>;
  execution: TestLabExecutionCapabilities;
  stats: Record<string, number>;
}

export interface TestLabVerificationChallenge {
  id: string;
  target_id: string;
  method: string;
  token: string;
  status: string;
  instructions: string;
  expires_at: string;
}
