-- Revizzio quiz mistake flashcards
-- Alembic revision: 20260711_0013
-- PostgreSQL only
--
-- Safe to run in pgAdmin in a fresh query window.
-- If pgAdmin shows "current transaction is aborted", run ROLLBACK; first.

BEGIN;

ALTER TABLE study_project_flashcards
    ADD COLUMN IF NOT EXISTS source_type VARCHAR(40) DEFAULT 'generated' NOT NULL;

ALTER TABLE study_project_flashcards
    ADD COLUMN IF NOT EXISTS source_quiz_question_id UUID;

CREATE INDEX IF NOT EXISTS ix_study_project_flashcards_source_quiz_question_id
    ON study_project_flashcards (source_quiz_question_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_study_project_flashcards_source_quiz_question_id_questions'
    ) THEN
        ALTER TABLE study_project_flashcards
            ADD CONSTRAINT fk_study_project_flashcards_source_quiz_question_id_questions
            FOREIGN KEY (source_quiz_question_id)
            REFERENCES study_project_quiz_questions (id)
            ON DELETE SET NULL;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_study_project_flashcards_quiz_mistake
    ON study_project_flashcards (project_id, source_quiz_question_id)
    WHERE source_type = 'quiz_mistake'
      AND source_quiz_question_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS alembic_version (
    version_num VARCHAR(32) NOT NULL
);

DELETE FROM alembic_version;

INSERT INTO alembic_version (version_num)
VALUES ('20260711_0013');

COMMIT;
