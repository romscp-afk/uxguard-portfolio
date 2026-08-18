export type ContentType = 'article' | 'case_study';

export type Category = {
  id: string;
  slug: string;
  name: string;
  kind: string;
};

export type FeedItem = {
  id: string;
  contentType: ContentType | 'challenge' | 'campaign';
  title: string;
  subtitle?: string | null;
  excerpt?: string | null;
  coverImageUrl?: string | null;
  href: string;
  sponsored: boolean;
  featured?: boolean;
  readingTimeMin?: number | null;
  points?: number | null;
  publishedAt?: string | null;
  source: 'supabase' | 'web';
  slug?: string | null;
};

export type Article = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  excerpt?: string | null;
  body_html?: string | null;
  cover_image_url?: string | null;
  author_name?: string | null;
  author_title?: string | null;
  tags: string[];
  featured: boolean;
  reading_time_min: number;
  is_sponsored: boolean;
  published_at?: string | null;
  category_id?: string | null;
  source: 'supabase' | 'web';
};

export type CaseStudy = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  summary?: string | null;
  challenge?: string | null;
  methodology?: string | null;
  impact?: string | null;
  reflections?: string | null;
  client?: string | null;
  role?: string | null;
  duration?: string | null;
  prototype_url?: string | null;
  cover_image_url?: string | null;
  author_name?: string | null;
  author_username?: string | null;
  methods: string[];
  metrics: { label: string; value: string; description?: string }[];
  content_blocks: { id?: string; type: string; data: Record<string, unknown> }[];
  featured: boolean;
  is_sponsored: boolean;
  published_at?: string | null;
  status?: 'draft' | 'published' | 'archived' | string | null;
  author_id?: string | null;
  source: 'supabase' | 'web';
};

export type Challenge = {
  id: string;
  slug: string;
  title: string;
  summary?: string | null;
  instructions?: string | null;
  completion_criteria?: string | null;
  points_award: number;
  allow_reveal_answers: boolean;
  max_attempts?: number | null;
};

export type ChallengeQuestion = {
  id: string;
  challenge_id: string;
  sort_order: number;
  prompt: string;
  choices: { id: string; label: string }[];
};

export type Reward = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  kind: 'premium_template' | 'ai_credits' | 'portfolio_review' | 'partner_discount' | string;
  points_cost: number;
  inventory?: number | null;
  fulfilment: 'instant' | 'pending_admin' | string;
};

export type Campaign = {
  id: string;
  title: string;
  summary?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  cover_image_url?: string | null;
  sponsor?: { name: string; logo_url?: string | null } | null;
};

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  title?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  cover_image_url?: string | null;
  location?: string | null;
  contact_email?: string | null;
  cv_url?: string | null;
  social_links?: Record<string, string> | null;
  experience_level?: string | null;
  onboarding_completed_at?: string | null;
  points_balance_cached: number;
};

export type UserPreferences = {
  user_id: string;
  interest_ids: string[];
  experience_level?: string | null;
  onboarding_step?: string | null;
  marketing_opt_in: boolean;
  completed_at?: string | null;
};

export type NotificationPreferences = {
  user_id: string;
  challenges: boolean;
  articles: boolean;
  rewards: boolean;
  marketing: boolean;
};
