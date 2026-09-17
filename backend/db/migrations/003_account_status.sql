ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_users_is_active ON users (is_active);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key ON users (LOWER(email));