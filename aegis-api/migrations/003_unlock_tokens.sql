-- Agent 1: Account unlock tokens.
-- Generated when an account is locked after 5 failed logins.
-- Token is sent via email (Agent 6) and used to unlock the account.

CREATE TABLE IF NOT EXISTS unlock_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_unlock_tokens_user_id ON unlock_tokens (user_id);
