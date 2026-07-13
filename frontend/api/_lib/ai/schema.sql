-- UXGuard AI Phase 1 schema (PostgreSQL reference)
-- Current production uses Vercel Blob JSON store with equivalent collections.
-- Apply these migrations when moving AI persistence to Postgres.
-- Row Level Security ensures users only access their own rows.

CREATE TABLE IF NOT EXISTS user_ai_credits (
  user_id BIGINT PRIMARY KEY,
  monthly_allowance INTEGER NOT NULL DEFAULT 100,
  purchased_credits INTEGER NOT NULL DEFAULT 0,
  used_credits INTEGER NOT NULL DEFAULT 0,
  reset_date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY,
  user_id BIGINT NOT NULL,
  title TEXT NOT NULL,
  assistant_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content JSONB NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  credits_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID PRIMARY KEY,
  user_id BIGINT NOT NULL,
  feature TEXT NOT NULL,
  model TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  credits_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saved_ai_outputs (
  id UUID PRIMARY KEY,
  user_id BIGINT NOT NULL,
  conversation_id UUID,
  title TEXT NOT NULL,
  output_type TEXT NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ai_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_ai_outputs ENABLE ROW LEVEL SECURITY;

-- Example policies (adjust auth.uid() mapping to your auth provider):
-- CREATE POLICY ai_conversations_owner ON ai_conversations
--   FOR ALL USING (user_id = current_setting('app.user_id')::bigint);
