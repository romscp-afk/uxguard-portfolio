-- UXGuard billing schema (PostgreSQL reference)
-- Production currently uses Vercel Blob JSON collections with the same shapes.
-- Apply when migrating billing to Postgres + Supabase RLS.

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  monthly_price NUMERIC,
  annual_price NUMERIC,
  currency TEXT NOT NULL DEFAULT 'USD',
  ai_credits INTEGER,
  storage_limit_bytes BIGINT,
  portfolio_limit INTEGER,
  case_study_limit INTEGER,
  team_member_limit INTEGER,
  custom_domain_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  private_projects_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  advanced_analytics_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  pdf_export_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  team_workspace_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY,
  user_id BIGINT NOT NULL,
  plan_id TEXT NOT NULL REFERENCES plans(code),
  status TEXT NOT NULL,
  billing_interval TEXT NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  payment_provider TEXT,
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  promotional_plan TEXT,
  promotional_credits INTEGER,
  discount_percentage NUMERIC,
  free_access_expires_at TIMESTAMPTZ,
  founding_member BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions (user_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions (status);

-- At most one active Free subscription per user
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_one_active_free
  ON subscriptions (user_id)
  WHERE status IN ('active', 'canceling') AND plan_id = 'free';

CREATE TABLE IF NOT EXISTS user_usage (
  id UUID PRIMARY KEY,
  user_id BIGINT NOT NULL,
  cycle_start TIMESTAMPTZ NOT NULL,
  cycle_end TIMESTAMPTZ NOT NULL,
  portfolios_used INTEGER NOT NULL DEFAULT 0,
  case_studies_used INTEGER NOT NULL DEFAULT 0,
  storage_used_bytes BIGINT NOT NULL DEFAULT 0,
  ai_credits_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_usage_user_cycle_idx ON user_usage (user_id, cycle_start DESC);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY,
  user_id BIGINT NOT NULL,
  subscription_id UUID,
  payment_provider TEXT,
  provider_transaction_id TEXT,
  amount NUMERIC,
  currency TEXT,
  status TEXT,
  transaction_type TEXT,
  invoice_url TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_transactions_provider_txn_uidx
  ON payment_transactions (payment_provider, provider_transaction_id)
  WHERE provider_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payment_transactions_user_id_idx ON payment_transactions (user_id);

CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY,
  user_id BIGINT NOT NULL,
  subscription_id UUID,
  event_type TEXT NOT NULL,
  old_plan_id TEXT,
  new_plan_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS subscription_events_user_id_idx ON subscription_events (user_id);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- Plans: publicly readable; writes via service role only
CREATE POLICY plans_select_public ON plans
  FOR SELECT USING (true);

-- Owner-scoped reads (map auth.uid() / JWT claim to user_id in your auth layer)
CREATE POLICY subscriptions_select_own ON subscriptions
  FOR SELECT USING (user_id = NULLIF(current_setting('request.jwt.claims', true)::json->>'app_user_id', '')::bigint);

CREATE POLICY user_usage_select_own ON user_usage
  FOR SELECT USING (user_id = NULLIF(current_setting('request.jwt.claims', true)::json->>'app_user_id', '')::bigint);

CREATE POLICY payment_transactions_select_own ON payment_transactions
  FOR SELECT USING (user_id = NULLIF(current_setting('request.jwt.claims', true)::json->>'app_user_id', '')::bigint);

CREATE POLICY subscription_events_select_own ON subscription_events
  FOR SELECT USING (user_id = NULLIF(current_setting('request.jwt.claims', true)::json->>'app_user_id', '')::bigint);

-- No INSERT/UPDATE/DELETE policies for authenticated clients — mutations go through
-- trusted server routes / service role only.
