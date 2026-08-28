-- Reviss AI credits system: plan limit columns, usage log, credit rates
-- Alembic revision: 20260828_0035
-- PostgreSQL only

BEGIN;

ALTER TABLE subscription_plans
    ADD COLUMN monthly_ai_credits INTEGER NOT NULL DEFAULT 10,
    ADD COLUMN monthly_ocr_pages INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN monthly_page_limit INTEGER NOT NULL DEFAULT 40,
    ADD COLUMN ai_chat_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN max_openai_cost_usd_per_cycle NUMERIC(6, 2) NOT NULL DEFAULT 2.00;

UPDATE subscription_plans SET
    monthly_ai_credits = 60,
    monthly_ocr_pages = 200,
    monthly_page_limit = 1000,
    ai_chat_enabled = true,
    max_openai_cost_usd_per_cycle = 6.00
WHERE slug = 'focus';

UPDATE subscription_plans SET
    monthly_ai_credits = 120,
    monthly_ocr_pages = 500,
    monthly_page_limit = 2500,
    ai_chat_enabled = true,
    max_openai_cost_usd_per_cycle = 12.00
WHERE slug = 'pro';

CREATE TABLE ai_usage_logs (
    id UUID NOT NULL,
    user_id UUID NOT NULL,
    subscription_plan_slug VARCHAR(80) NOT NULL,
    feature VARCHAR(32) NOT NULL,
    size_tier VARCHAR(16),
    model VARCHAR(80),
    input_tokens INTEGER,
    output_tokens INTEGER,
    cached_tokens INTEGER,
    estimated_cost_usd NUMERIC(8, 4),
    ai_credits_charged INTEGER NOT NULL DEFAULT 0,
    ocr_pages_charged INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT pk_ai_usage_logs PRIMARY KEY (id),
    CONSTRAINT ck_ai_usage_logs_feature
        CHECK (feature IN ('chat', 'quiz', 'flashcards', 'summary', 'explanation', 'ocr')),
    CONSTRAINT ck_ai_usage_logs_size_tier
        CHECK (size_tier IS NULL OR size_tier IN ('small', 'medium', 'large')),
    CONSTRAINT fk_ai_usage_logs_user_id_users
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE
);

CREATE INDEX ix_ai_usage_logs_user_id ON ai_usage_logs (user_id);
CREATE INDEX ix_ai_usage_logs_created_at ON ai_usage_logs (created_at);

CREATE TABLE ai_credit_rates (
    id UUID NOT NULL,
    feature VARCHAR(32) NOT NULL,
    size_tier VARCHAR(16) NOT NULL,
    threshold_max INTEGER,
    credits INTEGER NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT pk_ai_credit_rates PRIMARY KEY (id),
    CONSTRAINT ck_ai_credit_rates_feature
        CHECK (feature IN ('chat', 'quiz', 'flashcards', 'summary', 'explanation')),
    CONSTRAINT ck_ai_credit_rates_size_tier
        CHECK (size_tier IN ('small', 'medium', 'large')),
    CONSTRAINT uq_ai_credit_rates_feature_size_tier UNIQUE (feature, size_tier)
);

INSERT INTO ai_credit_rates (id, feature, size_tier, threshold_max, credits, updated_at) VALUES
    (gen_random_uuid(), 'chat', 'small', 4000, 1, NOW()),
    (gen_random_uuid(), 'chat', 'large', NULL, 2, NOW()),
    (gen_random_uuid(), 'quiz', 'small', 15, 2, NOW()),
    (gen_random_uuid(), 'quiz', 'medium', 30, 3, NOW()),
    (gen_random_uuid(), 'quiz', 'large', NULL, 5, NOW()),
    (gen_random_uuid(), 'flashcards', 'small', 20, 2, NOW()),
    (gen_random_uuid(), 'flashcards', 'medium', 40, 3, NOW()),
    (gen_random_uuid(), 'flashcards', 'large', NULL, 5, NOW()),
    (gen_random_uuid(), 'summary', 'small', 20, 2, NOW()),
    (gen_random_uuid(), 'summary', 'medium', 75, 3, NOW()),
    (gen_random_uuid(), 'summary', 'large', NULL, 5, NOW()),
    (gen_random_uuid(), 'explanation', 'small', NULL, 1, NOW());

UPDATE alembic_version
SET version_num = '20260828_0035'
WHERE version_num = '20260828_0034';

COMMIT;
