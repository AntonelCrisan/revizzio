-- Revizzio summary notes (a free-text note attached to a selected passage)

CREATE TABLE IF NOT EXISTS study_project_summary_notes (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES study_projects(id) ON DELETE CASCADE,
    paragraph_index INTEGER NOT NULL,
    text TEXT NOT NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_study_project_summary_notes_project_id
    ON study_project_summary_notes (project_id);
