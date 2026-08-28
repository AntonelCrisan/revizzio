-- Reviss Google OAuth support
-- Alembic revision: 20260828_0036
-- PostgreSQL only

BEGIN;

ALTER TABLE users
    ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE users
    ADD COLUMN google_sub VARCHAR(64);

CREATE UNIQUE INDEX ix_users_google_sub
    ON users (google_sub);

UPDATE alembic_version
SET version_num = '20260828_0036'
WHERE version_num = '20260828_0035';

COMMIT;
