-- Reviss user language preference
-- Alembic revision: 20260820_0025
-- PostgreSQL only

BEGIN;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS language_preference VARCHAR(8) DEFAULT 'ro' NOT NULL;

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS ck_users_language_preference;

ALTER TABLE users
    ADD CONSTRAINT ck_users_language_preference
    CHECK (language_preference IN ('ro', 'en', 'fr'));

UPDATE alembic_version
SET version_num = '20260820_0025';

COMMIT;
