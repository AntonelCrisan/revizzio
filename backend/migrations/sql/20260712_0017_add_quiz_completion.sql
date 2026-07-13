-- Revizzio quiz completion tracking (a quiz can only be completed once)

ALTER TABLE study_project_quizzes
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS score_percent INTEGER,
    ADD COLUMN IF NOT EXISTS correct_count INTEGER,
    ADD COLUMN IF NOT EXISTS answered_count INTEGER;
