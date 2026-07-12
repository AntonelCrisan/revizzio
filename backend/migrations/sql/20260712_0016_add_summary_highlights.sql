-- Revizzio summary highlights (user-selected passages within a project's summary)

CREATE TABLE IF NOT EXISTS study_project_summary_highlights (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES study_projects(id) ON DELETE CASCADE,
    paragraph_index INTEGER NOT NULL,
    text TEXT NOT NULL,
    color VARCHAR(20) NOT NULL DEFAULT 'pink',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_study_project_summary_highlights_project_id
    ON study_project_summary_highlights (project_id);
