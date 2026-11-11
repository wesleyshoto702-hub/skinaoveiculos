-- Skinão Veículos: owner-managed staff access.
-- Applied to Neon project SkinaoVeiculos / main / skinao on 2026-11-11.
-- This file documents the database schema; it contains no credentials.
-- The existing administrator is promoted to owner, preserving their password.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE skinao_admin_users
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'staff';
ALTER TABLE skinao_admin_users
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

ALTER TABLE skinao_admin_users
  DROP CONSTRAINT IF EXISTS skinao_admin_users_role_check;
ALTER TABLE skinao_admin_users
  ADD CONSTRAINT skinao_admin_users_role_check
  CHECK(role IN ('owner','staff'));

-- Promote the oldest existing admin only if there is not already an owner.
UPDATE skinao_admin_users
SET role='owner'
WHERE id=(SELECT id FROM skinao_admin_users ORDER BY created_at LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM skinao_admin_users WHERE role='owner');

CREATE UNIQUE INDEX IF NOT EXISTS skinao_one_owner_idx
  ON skinao_admin_users(role) WHERE role='owner';
CREATE INDEX IF NOT EXISTS skinao_admin_users_role_status_idx
  ON skinao_admin_users(role,is_active);
REVOKE ALL ON skinao_admin_users FROM PUBLIC;

-- Existing columns password_hash (bcrypt via pgcrypto), is_active,
-- credential_version are reused for staff. There is no public signup.
-- Only owner-authenticated server functions insert or update staff accounts.
