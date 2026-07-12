-- Revizzio study project pipeline
-- Alembic revision: 20260711_0011
-- PostgreSQL only
--
-- Safe to run in pgAdmin in a fresh query window.
-- If pgAdmin shows "current transaction is aborted", run ROLLBACK; first.

BEGIN;

CREATE TABLE IF NOT EXISTS study_projects (
    id UUID NOT NULL,
    user_id UUID NOT NULL,
    name VARCHAR(160) NOT NULL,
    slug VARCHAR(180) NOT NULL,
    status VARCHAR(32) DEFAULT 'processing' NOT NULL,
    material_rights_confirmed BOOLEAN DEFAULT FALSE NOT NULL,
    combined_markdown_path TEXT,
    prompt_path TEXT,
    generated_json_path TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT pk_study_projects PRIMARY KEY (id),
    CONSTRAINT ck_study_projects_status
        CHECK (status IN ('processing', 'awaiting_ai_json', 'ready', 'failed')),
    CONSTRAINT fk_study_projects_user_id_users
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_study_projects_user_id
    ON study_projects (user_id);

CREATE INDEX IF NOT EXISTS ix_study_projects_slug
    ON study_projects (slug);

CREATE INDEX IF NOT EXISTS ix_study_projects_status
    ON study_projects (status);

CREATE TABLE IF NOT EXISTS study_project_files (
    id UUID NOT NULL,
    project_id UUID NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(160),
    size_bytes INTEGER DEFAULT 0 NOT NULL,
    source_path TEXT NOT NULL,
    markdown_path TEXT,
    markdown_char_count INTEGER DEFAULT 0 NOT NULL,
    conversion_status VARCHAR(32) DEFAULT 'pending' NOT NULL,
    conversion_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT pk_study_project_files PRIMARY KEY (id),
    CONSTRAINT fk_study_project_files_project_id_study_projects
        FOREIGN KEY (project_id)
        REFERENCES study_projects (id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_study_project_files_project_id
    ON study_project_files (project_id);

CREATE TABLE IF NOT EXISTS study_project_imports (
    id UUID NOT NULL,
    project_id UUID NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    json_path TEXT NOT NULL,
    schema_version VARCHAR(40) NOT NULL,
    payload JSONB NOT NULL,
    imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT pk_study_project_imports PRIMARY KEY (id),
    CONSTRAINT fk_study_project_imports_project_id_study_projects
        FOREIGN KEY (project_id)
        REFERENCES study_projects (id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_study_project_imports_project_id
    ON study_project_imports (project_id);

CREATE TABLE IF NOT EXISTS study_project_summaries (
    id UUID NOT NULL,
    project_id UUID NOT NULL,
    content TEXT NOT NULL,
    estimated_reading_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT pk_study_project_summaries PRIMARY KEY (id),
    CONSTRAINT uq_study_project_summaries_project_id UNIQUE (project_id),
    CONSTRAINT fk_study_project_summaries_project_id_study_projects
        FOREIGN KEY (project_id)
        REFERENCES study_projects (id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_study_project_summaries_project_id
    ON study_project_summaries (project_id);

CREATE TABLE IF NOT EXISTS study_project_keywords (
    id UUID NOT NULL,
    project_id UUID NOT NULL,
    term VARCHAR(180) NOT NULL,
    explanation TEXT NOT NULL,
    anchor_text VARCHAR(240),
    sort_order INTEGER DEFAULT 0 NOT NULL,
    CONSTRAINT pk_study_project_keywords PRIMARY KEY (id),
    CONSTRAINT fk_study_project_keywords_project_id_study_projects
        FOREIGN KEY (project_id)
        REFERENCES study_projects (id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_study_project_keywords_project_id
    ON study_project_keywords (project_id);

CREATE TABLE IF NOT EXISTS study_project_flashcards (
    id UUID NOT NULL,
    project_id UUID NOT NULL,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    category VARCHAR(120),
    difficulty VARCHAR(40),
    source_type VARCHAR(40) DEFAULT 'generated' NOT NULL,
    source_quiz_question_id UUID,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    CONSTRAINT pk_study_project_flashcards PRIMARY KEY (id),
    CONSTRAINT fk_study_project_flashcards_project_id_study_projects
        FOREIGN KEY (project_id)
        REFERENCES study_projects (id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_study_project_flashcards_project_id
    ON study_project_flashcards (project_id);

CREATE INDEX IF NOT EXISTS ix_study_project_flashcards_source_quiz_question_id
    ON study_project_flashcards (source_quiz_question_id);

CREATE TABLE IF NOT EXISTS study_project_quizzes (
    id UUID NOT NULL,
    project_id UUID NOT NULL,
    title VARCHAR(180) NOT NULL,
    description TEXT,
    complexity VARCHAR(60),
    question_type VARCHAR(60),
    sort_order INTEGER DEFAULT 0 NOT NULL,
    CONSTRAINT pk_study_project_quizzes PRIMARY KEY (id),
    CONSTRAINT fk_study_project_quizzes_project_id_study_projects
        FOREIGN KEY (project_id)
        REFERENCES study_projects (id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_study_project_quizzes_project_id
    ON study_project_quizzes (project_id);

CREATE TABLE IF NOT EXISTS study_project_quiz_questions (
    id UUID NOT NULL,
    quiz_id UUID NOT NULL,
    prompt TEXT NOT NULL,
    question_type VARCHAR(60) NOT NULL,
    explanation TEXT,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    CONSTRAINT pk_study_project_quiz_questions PRIMARY KEY (id),
    CONSTRAINT fk_study_project_quiz_questions_quiz_id_study_project_quizzes
        FOREIGN KEY (quiz_id)
        REFERENCES study_project_quizzes (id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_study_project_quiz_questions_quiz_id
    ON study_project_quiz_questions (quiz_id);

CREATE TABLE IF NOT EXISTS study_project_quiz_options (
    id UUID NOT NULL,
    question_id UUID NOT NULL,
    label TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE NOT NULL,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    CONSTRAINT pk_study_project_quiz_options PRIMARY KEY (id),
    CONSTRAINT fk_study_project_quiz_options_question_id_study_project_quiz_questions
        FOREIGN KEY (question_id)
        REFERENCES study_project_quiz_questions (id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_study_project_quiz_options_question_id
    ON study_project_quiz_options (question_id);

ALTER TABLE study_project_flashcards
    ADD CONSTRAINT fk_study_project_flashcards_source_quiz_question_id_questions
    FOREIGN KEY (source_quiz_question_id)
    REFERENCES study_project_quiz_questions (id)
    ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_study_project_flashcards_quiz_mistake
    ON study_project_flashcards (project_id, source_quiz_question_id)
    WHERE source_type = 'quiz_mistake'
      AND source_quiz_question_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS study_project_strategies (
    id UUID NOT NULL,
    project_id UUID NOT NULL,
    title VARCHAR(180) NOT NULL,
    description TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    CONSTRAINT pk_study_project_strategies PRIMARY KEY (id),
    CONSTRAINT fk_study_project_strategies_project_id_study_projects
        FOREIGN KEY (project_id)
        REFERENCES study_projects (id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_study_project_strategies_project_id
    ON study_project_strategies (project_id);

CREATE TABLE IF NOT EXISTS alembic_version (
    version_num VARCHAR(32) NOT NULL
);

DELETE FROM alembic_version;

INSERT INTO alembic_version (version_num)
VALUES ('20260711_0011');

COMMIT;
