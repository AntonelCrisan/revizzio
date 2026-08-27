-- Reviss pending email changes
-- Alembic revision: 20260827_0031
-- PostgreSQL only

BEGIN;

CREATE TABLE pending_email_changes (
    id UUID NOT NULL,
    user_id UUID NOT NULL,
    new_email VARCHAR(320) NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT pk_pending_email_changes PRIMARY KEY (id),
    CONSTRAINT fk_pending_email_changes_user_id_users
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE
);

CREATE INDEX ix_pending_email_changes_expires_at
    ON pending_email_changes (expires_at);

CREATE INDEX ix_pending_email_changes_new_email
    ON pending_email_changes (new_email);

CREATE UNIQUE INDEX ix_pending_email_changes_token_hash
    ON pending_email_changes (token_hash);

CREATE INDEX ix_pending_email_changes_user_id
    ON pending_email_changes (user_id);

UPDATE alembic_version
SET version_num = '20260827_0031'
WHERE version_num = '20260826_0030';

COMMIT;
