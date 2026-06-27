-- Revizzio user theme preference
-- Alembic revision: 20260611_0002
-- PostgreSQL only
--
-- Prefer running:
--   python -m alembic upgrade head
--
-- Use this file manually only when revision 20260611_0001 is already applied.

BEGIN;

ALTER TABLE users
    ADD COLUMN theme_preference VARCHAR(16) DEFAULT 'system' NOT NULL;

ALTER TABLE users
    ADD CONSTRAINT ck_users_theme_preference
    CHECK (theme_preference IN ('light', 'dark', 'system'));

UPDATE alembic_version
SET version_num = '20260611_0002'
WHERE version_num = '20260611_0001';

COMMIT;
