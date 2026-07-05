-- Revizzio Stripe invoice history
-- Alembic revision: 20260704_0010
-- PostgreSQL only
--
-- Safe to run multiple times in pgAdmin.
-- If pgAdmin shows "current transaction is aborted", run ROLLBACK; first,
-- then run this whole script again in a fresh query window.

BEGIN;

CREATE TABLE IF NOT EXISTS subscription_invoices (
    id UUID NOT NULL,
    user_id UUID NOT NULL,
    plan_id UUID,
    user_subscription_id UUID,
    stripe_invoice_id VARCHAR(120) NOT NULL,
    stripe_customer_id VARCHAR(120) NOT NULL,
    stripe_subscription_id VARCHAR(120),
    hosted_invoice_url TEXT,
    invoice_pdf_url TEXT,
    number VARCHAR(120),
    status VARCHAR(40) NOT NULL,
    currency VARCHAR(12) DEFAULT 'RON' NOT NULL,
    amount_due INTEGER DEFAULT 0 NOT NULL,
    amount_paid INTEGER DEFAULT 0 NOT NULL,
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT pk_subscription_invoices PRIMARY KEY (id),
    CONSTRAINT uq_subscription_invoices_stripe_invoice_id UNIQUE (stripe_invoice_id),
    CONSTRAINT fk_subscription_invoices_user_id_users
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_subscription_invoices_plan_id_subscription_plans
        FOREIGN KEY (plan_id)
        REFERENCES subscription_plans (id)
        ON DELETE SET NULL,
    CONSTRAINT fk_subscription_invoices_user_subscription_id_user_subscriptions
        FOREIGN KEY (user_subscription_id)
        REFERENCES user_subscriptions (id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ix_subscription_invoices_user_id
    ON subscription_invoices (user_id);

CREATE INDEX IF NOT EXISTS ix_subscription_invoices_plan_id
    ON subscription_invoices (plan_id);

CREATE INDEX IF NOT EXISTS ix_subscription_invoices_user_subscription_id
    ON subscription_invoices (user_subscription_id);

CREATE UNIQUE INDEX IF NOT EXISTS ix_subscription_invoices_stripe_invoice_id
    ON subscription_invoices (stripe_invoice_id);

CREATE INDEX IF NOT EXISTS ix_subscription_invoices_stripe_customer_id
    ON subscription_invoices (stripe_customer_id);

CREATE INDEX IF NOT EXISTS ix_subscription_invoices_stripe_subscription_id
    ON subscription_invoices (stripe_subscription_id);

CREATE INDEX IF NOT EXISTS ix_subscription_invoices_status
    ON subscription_invoices (status);

CREATE TABLE IF NOT EXISTS alembic_version (
    version_num VARCHAR(32) NOT NULL
);

DELETE FROM alembic_version;

INSERT INTO alembic_version (version_num)
VALUES ('20260704_0010');

COMMIT;
