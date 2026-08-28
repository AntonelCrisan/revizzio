-- Reviss AI model rates (used to estimate OpenAI cost for the internal ceiling)
-- Alembic revision: 20260828_0037
-- PostgreSQL only

BEGIN;

CREATE TABLE ai_model_rates (
    id UUID NOT NULL,
    model VARCHAR(80) NOT NULL,
    cost_per_1k_input_tokens NUMERIC(10, 6) NOT NULL DEFAULT 0,
    cost_per_1k_output_tokens NUMERIC(10, 6) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT pk_ai_model_rates PRIMARY KEY (id),
    CONSTRAINT uq_ai_model_rates_model UNIQUE (model)
);

INSERT INTO ai_model_rates (id, model, cost_per_1k_input_tokens, cost_per_1k_output_tokens, updated_at) VALUES
    (gen_random_uuid(), 'gpt-5.6-luna', 0, 0, NOW()),
    (gen_random_uuid(), 'gpt-5.6-terra', 0, 0, NOW()),
    (gen_random_uuid(), 'mistral-ocr-latest', 0, 0, NOW());

UPDATE alembic_version
SET version_num = '20260828_0037'
WHERE version_num = '20260828_0036';

COMMIT;
