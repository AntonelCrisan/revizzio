-- Revizzio archived study projects
-- Alembic revision: 20260712_0014
-- PostgreSQL only
--
-- Safe to run in pgAdmin in a fresh query window.
-- If pgAdmin shows "current transaction is aborted", run ROLLBACK; first.

BEGIN;

CREATE TABLE IF NOT EXISTS study_project_archives (
    id UUID NOT NULL,
    project_id UUID NOT NULL,
    user_id UUID NOT NULL,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT pk_study_project_archives PRIMARY KEY (id),
    CONSTRAINT uq_study_project_archives_project_id UNIQUE (project_id),
    CONSTRAINT fk_study_project_archives_project_id_study_projects
        FOREIGN KEY (project_id)
        REFERENCES study_projects (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_study_project_archives_user_id_users
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_study_project_archives_project_id
    ON study_project_archives (project_id);

CREATE INDEX IF NOT EXISTS ix_study_project_archives_user_id
    ON study_project_archives (user_id);

CREATE INDEX IF NOT EXISTS ix_study_project_archives_archived_at
    ON study_project_archives (archived_at);

CREATE TABLE IF NOT EXISTS alembic_version (
    version_num VARCHAR(32) NOT NULL
);

DELETE FROM alembic_version;

INSERT INTO alembic_version (version_num)
VALUES ('20260712_0014');

COMMIT;
