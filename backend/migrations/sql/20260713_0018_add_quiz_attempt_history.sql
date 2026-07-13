-- Revizzio quiz attempt history (every completion is kept, not just the latest)

CREATE TABLE IF NOT EXISTS study_project_quiz_attempts (
    id UUID PRIMARY KEY,
    quiz_id UUID NOT NULL REFERENCES study_project_quizzes(id) ON DELETE CASCADE,
    score_percent INTEGER NOT NULL,
    correct_count INTEGER NOT NULL,
    answered_count INTEGER NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_study_project_quiz_attempts_quiz_id
    ON study_project_quiz_attempts (quiz_id);
