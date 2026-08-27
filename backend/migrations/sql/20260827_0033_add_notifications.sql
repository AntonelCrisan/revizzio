-- Reviss in-app notifications
-- Alembic revision: 20260827_0033
-- PostgreSQL only

BEGIN;

CREATE TABLE notifications (
    id UUID NOT NULL,
    user_id UUID NOT NULL,
    type VARCHAR(32) NOT NULL,
    title VARCHAR(160) NOT NULL,
    body TEXT NOT NULL,
    project_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    emailed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT pk_notifications PRIMARY KEY (id),
    CONSTRAINT ck_notifications_type
        CHECK (type IN ('project_ready', 'weak_concepts', 'daily_review')),
    CONSTRAINT fk_notifications_project_id_study_projects
        FOREIGN KEY (project_id)
        REFERENCES study_projects (id)
        ON DELETE SET NULL,
    CONSTRAINT fk_notifications_user_id_users
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE
);

CREATE INDEX ix_notifications_created_at
    ON notifications (created_at);

CREATE INDEX ix_notifications_user_id
    ON notifications (user_id);

UPDATE alembic_version
SET version_num = '20260827_0033'
WHERE version_num = '20260827_0032';

COMMIT;
