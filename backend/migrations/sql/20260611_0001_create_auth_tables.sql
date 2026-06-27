-- Revizzio authentication schema
-- Alembic revision: 20260611_0001
-- PostgreSQL only
--
-- Run this file only on a new, empty Revizzio database.
-- This is the SQL equivalent of:
--   python -m alembic upgrade head
--
-- Do not run both methods on the same database.

BEGIN;

CREATE TABLE alembic_version (
    version_num VARCHAR(32) NOT NULL,
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

CREATE TABLE users (
    id UUID NOT NULL,
    email VARCHAR(320) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    terms_accepted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    terms_version VARCHAR(32) NOT NULL,
    CONSTRAINT pk_users PRIMARY KEY (id)
);

CREATE UNIQUE INDEX ix_users_email
    ON users (email);

CREATE TABLE auth_sessions (
    id UUID NOT NULL,
    user_id UUID NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    user_agent VARCHAR(512),
    ip_address INET,
    CONSTRAINT pk_auth_sessions PRIMARY KEY (id),
    CONSTRAINT fk_auth_sessions_user_id_users
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE
);

CREATE INDEX ix_auth_sessions_expires_at
    ON auth_sessions (expires_at);

CREATE UNIQUE INDEX ix_auth_sessions_token_hash
    ON auth_sessions (token_hash);

CREATE INDEX ix_auth_sessions_user_id
    ON auth_sessions (user_id);

INSERT INTO alembic_version (version_num)
VALUES ('20260611_0001');

COMMIT;
