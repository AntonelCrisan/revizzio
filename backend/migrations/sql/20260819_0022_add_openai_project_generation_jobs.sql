-- Reviss OpenAI project generation jobs
-- Alembic revision: 20260819_0022
-- PostgreSQL only

BEGIN;

ALTER TABLE study_projects
    DROP CONSTRAINT IF EXISTS ck_study_projects_status;

ALTER TABLE study_projects
    ADD CONSTRAINT ck_study_projects_status
    CHECK (
        status IN (
            'processing',
            'generating_study_pack',
            'awaiting_ai_json',
            'ready',
            'generating_quizzes',
            'failed'
        )
    );

CREATE TABLE IF NOT EXISTS study_project_generation_jobs (
    id UUID NOT NULL,
    project_id UUID NOT NULL,
    user_id UUID NOT NULL,
    job_type VARCHAR(40) NOT NULL,
    status VARCHAR(40) DEFAULT 'queued' NOT NULL,
    model VARCHAR(120),
    prompt_path TEXT,
    response_path TEXT,
    error_message TEXT,
    input_tokens INTEGER DEFAULT 0 NOT NULL,
    output_tokens INTEGER DEFAULT 0 NOT NULL,
    total_tokens INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT pk_study_project_generation_jobs PRIMARY KEY (id),
    CONSTRAINT ck_study_project_generation_jobs_type
        CHECK (job_type IN ('study_pack', 'quiz_pack')),
    CONSTRAINT ck_study_project_generation_jobs_status
        CHECK (status IN ('queued', 'running', 'completed', 'failed')),
    CONSTRAINT fk_study_project_generation_jobs_project_id_study_projects
        FOREIGN KEY (project_id)
        REFERENCES study_projects (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_study_project_generation_jobs_user_id_users
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_study_project_generation_jobs_project_id
    ON study_project_generation_jobs (project_id);

CREATE INDEX IF NOT EXISTS ix_study_project_generation_jobs_user_id
    ON study_project_generation_jobs (user_id);

CREATE INDEX IF NOT EXISTS ix_study_project_generation_jobs_status
    ON study_project_generation_jobs (status);

UPDATE alembic_version
SET version_num = '20260819_0022';

COMMIT;
