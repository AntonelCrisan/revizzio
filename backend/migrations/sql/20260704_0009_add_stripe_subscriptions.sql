-- Revizzio Stripe subscriptions
-- Alembic revision: 20260704_0009
-- PostgreSQL only
--
-- Safe to run multiple times in pgAdmin.
-- If pgAdmin shows "current transaction is aborted", run ROLLBACK; first,
-- then run this whole script again in a fresh query window.

BEGIN;

ALTER TABLE subscription_plans
    ADD COLUMN IF NOT EXISTS stripe_product_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(120);

CREATE UNIQUE INDEX IF NOT EXISTS ix_subscription_plans_stripe_price_id
    ON subscription_plans (stripe_price_id)
    WHERE stripe_price_id IS NOT NULL;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS current_plan_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS ix_users_stripe_customer_id
    ON users (stripe_customer_id)
    WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_users_current_plan_id
    ON users (current_plan_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_users_current_plan_id_subscription_plans'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT fk_users_current_plan_id_subscription_plans
            FOREIGN KEY (current_plan_id)
            REFERENCES subscription_plans (id)
            ON DELETE SET NULL;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID NOT NULL,
    user_id UUID NOT NULL,
    plan_id UUID NOT NULL,
    stripe_customer_id VARCHAR(120) NOT NULL,
    stripe_subscription_id VARCHAR(120) NOT NULL,
    stripe_price_id VARCHAR(120) NOT NULL,
    status VARCHAR(40) NOT NULL,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE NOT NULL,
    canceled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT pk_user_subscriptions PRIMARY KEY (id),
    CONSTRAINT uq_user_subscriptions_stripe_subscription_id UNIQUE (stripe_subscription_id),
    CONSTRAINT fk_user_subscriptions_user_id_users
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_user_subscriptions_plan_id_subscription_plans
        FOREIGN KEY (plan_id)
        REFERENCES subscription_plans (id)
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS ix_user_subscriptions_user_id
    ON user_subscriptions (user_id);

CREATE INDEX IF NOT EXISTS ix_user_subscriptions_plan_id
    ON user_subscriptions (plan_id);

CREATE INDEX IF NOT EXISTS ix_user_subscriptions_stripe_customer_id
    ON user_subscriptions (stripe_customer_id);

CREATE UNIQUE INDEX IF NOT EXISTS ix_user_subscriptions_stripe_subscription_id
    ON user_subscriptions (stripe_subscription_id);

CREATE INDEX IF NOT EXISTS ix_user_subscriptions_status
    ON user_subscriptions (status);

CREATE TABLE IF NOT EXISTS stripe_events (
    id VARCHAR(120) NOT NULL,
    type VARCHAR(120) NOT NULL,
    payload JSONB NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT pk_stripe_events PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_stripe_events_type
    ON stripe_events (type);

CREATE TABLE IF NOT EXISTS alembic_version (
    version_num VARCHAR(32) NOT NULL
);

DELETE FROM alembic_version;

INSERT INTO alembic_version (version_num)
VALUES ('20260704_0009');

COMMIT;
