-- Reviss invoice email delivery tracking
-- Alembic revision: 20260819_0021
-- PostgreSQL only
--
-- Safe to run multiple times in pgAdmin.
-- If pgAdmin shows "current transaction is aborted", run ROLLBACK; first,
-- then run this whole script again in a fresh query window.

BEGIN;

ALTER TABLE subscription_invoices
    ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS email_delivery_error TEXT;

CREATE INDEX IF NOT EXISTS ix_subscription_invoices_email_sent_at
    ON subscription_invoices (email_sent_at);

CREATE TABLE IF NOT EXISTS alembic_version (
    version_num VARCHAR(32) NOT NULL
);

DELETE FROM alembic_version;

INSERT INTO alembic_version (version_num)
VALUES ('20260819_0021');

COMMIT;
