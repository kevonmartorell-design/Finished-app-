-- Agent 1: Extend the profiles table with auth-specific columns.
-- These columns were in the old 'users' table but not in the new 'profiles' table.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_sub TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS apple_sub TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS two_fa_enabled BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS failed_login_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

-- Unique constraints for social provider subs
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_google_sub ON profiles (google_sub) WHERE google_sub IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_apple_sub ON profiles (apple_sub) WHERE apple_sub IS NOT NULL;
