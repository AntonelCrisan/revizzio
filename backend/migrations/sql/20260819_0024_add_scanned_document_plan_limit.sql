-- Reviss scanned document plan entitlement
-- Alembic revision: 20260819_0024
-- PostgreSQL only

BEGIN;

ALTER TABLE subscription_plans
    ADD COLUMN IF NOT EXISTS allow_scanned_documents BOOLEAN DEFAULT false NOT NULL;

UPDATE subscription_plans
SET allow_scanned_documents = false
WHERE slug IN ('start', 'focus');

UPDATE subscription_plans
SET allow_scanned_documents = true
WHERE slug = 'pro';

UPDATE alembic_version
SET version_num = '20260819_0024';

COMMIT;
