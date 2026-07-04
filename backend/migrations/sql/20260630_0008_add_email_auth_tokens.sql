-- Revizzio email verification and password reset tokens
-- Alembic revision: 20260630_0008
-- PostgreSQL only
--
-- Safe to run multiple times in pgAdmin.
-- If pgAdmin shows "current transaction is aborted", run ROLLBACK; first,
-- then run this whole script again in a fresh query window.

BEGIN;

CREATE TABLE IF NOT EXISTS pending_registrations (
    id UUID NOT NULL,
    email VARCHAR(320) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    accepted_terms BOOLEAN NOT NULL,
    terms_version VARCHAR(32) NOT NULL,
    newsletter_consent BOOLEAN DEFAULT FALSE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT pk_pending_registrations PRIMARY KEY (id),
    CONSTRAINT uq_pending_registrations_email UNIQUE (email),
    CONSTRAINT uq_pending_registrations_token_hash UNIQUE (token_hash)
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_pending_registrations_email
    ON pending_registrations (email);

CREATE UNIQUE INDEX IF NOT EXISTS ix_pending_registrations_token_hash
    ON pending_registrations (token_hash);

CREATE INDEX IF NOT EXISTS ix_pending_registrations_expires_at
    ON pending_registrations (expires_at);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID NOT NULL,
    user_id UUID NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT pk_password_reset_tokens PRIMARY KEY (id),
    CONSTRAINT uq_password_reset_tokens_token_hash UNIQUE (token_hash),
    CONSTRAINT fk_password_reset_tokens_user_id_users
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_user_id
    ON password_reset_tokens (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS ix_password_reset_tokens_token_hash
    ON password_reset_tokens (token_hash);

CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_expires_at
    ON password_reset_tokens (expires_at);

CREATE TABLE IF NOT EXISTS alembic_version (
    version_num VARCHAR(32) NOT NULL
);

DELETE FROM alembic_version;

INSERT INTO alembic_version (version_num)
VALUES ('20260630_0008');

COMMIT;
