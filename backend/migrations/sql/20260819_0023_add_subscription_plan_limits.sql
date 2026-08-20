-- Reviss subscription plan limits and conditions
-- Alembic revision: 20260819_0023
-- PostgreSQL only

BEGIN;

ALTER TABLE subscription_plans
    ADD COLUMN IF NOT EXISTS conditions TEXT DEFAULT 'Utilizare individuala, educationala. Limitele se pot ajusta pentru stabilitatea platformei.' NOT NULL;

ALTER TABLE subscription_plans
    ADD COLUMN IF NOT EXISTS active_project_limit INTEGER DEFAULT 1 NOT NULL;

ALTER TABLE subscription_plans
    ADD COLUMN IF NOT EXISTS monthly_material_limit INTEGER DEFAULT 3 NOT NULL;

ALTER TABLE subscription_plans
    ADD COLUMN IF NOT EXISTS files_per_project_limit INTEGER DEFAULT 2 NOT NULL;

ALTER TABLE subscription_plans
    ADD COLUMN IF NOT EXISTS file_size_limit_mb INTEGER DEFAULT 10 NOT NULL;

ALTER TABLE subscription_plans
    ADD COLUMN IF NOT EXISTS project_size_limit_mb INTEGER DEFAULT 20 NOT NULL;

ALTER TABLE subscription_plans
    ADD COLUMN IF NOT EXISTS estimated_page_limit INTEGER DEFAULT 25 NOT NULL;

ALTER TABLE subscription_plans
    ADD COLUMN IF NOT EXISTS initial_flashcard_limit INTEGER DEFAULT 20 NOT NULL;

ALTER TABLE subscription_plans
    ADD COLUMN IF NOT EXISTS quiz_groups_per_complexity INTEGER DEFAULT 1 NOT NULL;

ALTER TABLE subscription_plans
    ADD COLUMN IF NOT EXISTS quiz_questions_per_quiz INTEGER DEFAULT 8 NOT NULL;

UPDATE subscription_plans
SET
    conditions = 'Potrivit pentru testarea fluxului. Documentele scanate sau OCR nu sunt incluse in acest plan.',
    active_project_limit = 1,
    monthly_material_limit = 3,
    files_per_project_limit = 2,
    file_size_limit_mb = 10,
    project_size_limit_mb = 20,
    estimated_page_limit = 25,
    initial_flashcard_limit = 20,
    quiz_groups_per_complexity = 1,
    quiz_questions_per_quiz = 8
WHERE slug = 'start';

UPDATE subscription_plans
SET
    conditions = 'Pentru utilizare individuala activa. Limitele sunt lunare si se reseteaza automat.',
    active_project_limit = 10,
    monthly_material_limit = 30,
    files_per_project_limit = 10,
    file_size_limit_mb = 50,
    project_size_limit_mb = 200,
    estimated_page_limit = 200,
    initial_flashcard_limit = 40,
    quiz_groups_per_complexity = 3,
    quiz_questions_per_quiz = 12
WHERE slug = 'focus';

UPDATE subscription_plans
SET
    conditions = 'Pentru sesiuni intense si volume mari rezonabile. Utilizarea trebuie sa ramana educationala si individuala.',
    active_project_limit = 50,
    monthly_material_limit = 100,
    files_per_project_limit = 30,
    file_size_limit_mb = 150,
    project_size_limit_mb = 500,
    estimated_page_limit = 500,
    initial_flashcard_limit = 50,
    quiz_groups_per_complexity = 4,
    quiz_questions_per_quiz = 12
WHERE slug = 'pro';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_subscription_plans_project_limits'
    ) THEN
        ALTER TABLE subscription_plans
            ADD CONSTRAINT ck_subscription_plans_project_limits
            CHECK (
                active_project_limit >= 0
                AND monthly_material_limit >= 0
                AND files_per_project_limit >= 1
                AND file_size_limit_mb >= 1
                AND project_size_limit_mb >= 1
                AND project_size_limit_mb >= file_size_limit_mb
                AND estimated_page_limit >= 1
                AND initial_flashcard_limit >= 1
                AND quiz_groups_per_complexity >= 1
                AND quiz_questions_per_quiz >= 3
            );
    END IF;
END $$;

UPDATE alembic_version
SET version_num = '20260819_0023';

COMMIT;
