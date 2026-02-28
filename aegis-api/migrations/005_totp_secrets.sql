-- Agent 1: TOTP 2FA secrets.
-- One secret per user (user_id is PK). Stored AES-256-CBC encrypted.
-- 'verified' is false until the user completes first TOTP verification.

CREATE TABLE IF NOT EXISTS totp_secrets (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  encrypted_secret TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
