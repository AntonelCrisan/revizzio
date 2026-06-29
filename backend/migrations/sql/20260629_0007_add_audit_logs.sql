-- Revizzio internal audit logs
-- Alembic revision: 20260629_0007
-- PostgreSQL only
--
-- Safe to run multiple times in pgAdmin.
-- If pgAdmin shows "current transaction is aborted", run ROLLBACK; first,
-- then run this whole script again in a fresh query window.

BEGIN;

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID NOT NULL,
    actor_user_id UUID,
    actor_email VARCHAR(320),
    actor_name VARCHAR(120),
    action VARCHAR(120) NOT NULL,
    status VARCHAR(24) NOT NULL,
    resource_type VARCHAR(80),
    resource_id VARCHAR(120),
    details JSONB DEFAULT '{}'::jsonb NOT NULL,
    ip_address VARCHAR(64),
    user_agent VARCHAR(512),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT pk_audit_logs PRIMARY KEY (id),
    CONSTRAINT fk_audit_logs_actor_user_id_users
        FOREIGN KEY (actor_user_id)
        REFERENCES users (id)
        ON DELETE SET NULL,
    CONSTRAINT ck_audit_logs_status
        CHECK (status IN ('success', 'failure'))
);

CREATE INDEX IF NOT EXISTS ix_audit_logs_actor_user_id
    ON audit_logs (actor_user_id);

CREATE INDEX IF NOT EXISTS ix_audit_logs_action
    ON audit_logs (action);

CREATE INDEX IF NOT EXISTS ix_audit_logs_status
    ON audit_logs (status);

CREATE INDEX IF NOT EXISTS ix_audit_logs_created_at
    ON audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS ix_audit_logs_resource
    ON audit_logs (resource_type, resource_id);

CREATE TABLE IF NOT EXISTS alembic_version (
    version_num VARCHAR(32) NOT NULL
);

DELETE FROM alembic_version;

INSERT INTO alembic_version (version_num)
VALUES ('20260629_0007');

COMMIT;
