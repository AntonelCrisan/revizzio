-- Reviss account deletion requests
-- Alembic revision: 20260826_0030
-- PostgreSQL only

BEGIN;

CREATE TABLE account_deletion_requests (
    id UUID NOT NULL,
    user_id UUID,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(320) NOT NULL,
    status VARCHAR(24) DEFAULT 'pending' NOT NULL,
    resolved_by_user_id UUID,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_note TEXT,
    ip_address VARCHAR(64),
    user_agent VARCHAR(512),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT pk_account_deletion_requests PRIMARY KEY (id),
    CONSTRAINT ck_account_deletion_requests_status
        CHECK (status IN ('pending', 'completed', 'cancelled')),
    CONSTRAINT fk_account_deletion_requests_user_id_users
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE SET NULL,
    CONSTRAINT fk_account_deletion_requests_resolved_by_user_id_users
        FOREIGN KEY (resolved_by_user_id)
        REFERENCES users (id)
        ON DELETE SET NULL
);

CREATE INDEX ix_account_deletion_requests_created_at
    ON account_deletion_requests (created_at);

CREATE INDEX ix_account_deletion_requests_email
    ON account_deletion_requests (email);

CREATE INDEX ix_account_deletion_requests_resolved_by_user_id
    ON account_deletion_requests (resolved_by_user_id);

CREATE INDEX ix_account_deletion_requests_status
    ON account_deletion_requests (status);

CREATE INDEX ix_account_deletion_requests_user_id
    ON account_deletion_requests (user_id);

CREATE UNIQUE INDEX uq_account_deletion_requests_pending_user_id
    ON account_deletion_requests (user_id)
    WHERE status = 'pending' AND user_id IS NOT NULL;

UPDATE alembic_version
SET version_num = '20260826_0030'
WHERE version_num = '20260826_0029';

COMMIT;
