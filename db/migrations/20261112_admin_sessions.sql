-- Authentication hardening: database-backed, revocable admin sessions.
-- Applied to the existing SkinaoVeiculos / skinao database.
-- No existing users, passwords, vehicles or photos are modified.
CREATE TABLE IF NOT EXISTS skinao_admin_sessions (
  token_hash text PRIMARY KEY CHECK(token_hash ~ '^[a-f0-9]{64}$'),
  admin_id uuid NOT NULL REFERENCES skinao_admin_users(id) ON DELETE CASCADE,
  credential_version integer NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS skinao_admin_sessions_user_expiry
  ON skinao_admin_sessions(admin_id,expires_at);
REVOKE ALL ON skinao_admin_sessions FROM PUBLIC;

-- The web server generates a fresh 256-bit random token on login and stores
-- only SHA-256(token) in this table. The token is sent in a Secure,
-- HttpOnly, SameSite=Strict __Host- cookie with 7-day lifetime.
-- Existing staff suspension/password changes increment credential_version,
-- immediately invalidating earlier sessions without needing to delete rows.
