-- Revizzio user role
-- Alembic revision: 20260627_0004
-- PostgreSQL only

BEGIN;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role VARCHAR(16);

ALTER TABLE users
    ALTER COLUMN role TYPE VARCHAR(16)
    USING LOWER(TRIM(role::text))::VARCHAR(16);

UPDATE users
SET role = LOWER(TRIM(role))
WHERE role IS NOT NULL;

UPDATE users
SET role = 'user'
WHERE role IS NULL OR role NOT IN ('admin', 'user');

ALTER TABLE users
    ALTER COLUMN role SET DEFAULT 'user',
    ALTER COLUMN role SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_users_role'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT ck_users_role
            CHECK (role IN ('admin', 'user'));
    END IF;
END
$$;

COMMIT;
