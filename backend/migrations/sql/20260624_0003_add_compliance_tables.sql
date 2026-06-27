-- Revizzio compliance tables and newsletter consent
-- Alembic revision: 20260624_0003
-- PostgreSQL only

BEGIN;

ALTER TABLE users
    ADD COLUMN newsletter_consent BOOLEAN DEFAULT FALSE NOT NULL,
    ADD COLUMN newsletter_consent_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE compliance_events (
    id UUID NOT NULL,
    user_id UUID,
    event_type VARCHAR(80) NOT NULL,
    payload JSON NOT NULL,
    ip_address VARCHAR(64),
    user_agent VARCHAR(512),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT pk_compliance_events PRIMARY KEY (id),
    CONSTRAINT fk_compliance_events_user_id_users
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE SET NULL
);

CREATE INDEX ix_compliance_events_event_type
    ON compliance_events (event_type);

CREATE TABLE contact_messages (
    id UUID NOT NULL,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(320) NOT NULL,
    category VARCHAR(40) NOT NULL,
    subject VARCHAR(160) NOT NULL,
    message TEXT NOT NULL,
    ip_address VARCHAR(64),
    user_agent VARCHAR(512),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT pk_contact_messages PRIMARY KEY (id)
);

CREATE TABLE withdrawal_requests (
    id UUID NOT NULL,
    registration_number VARCHAR(48) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(320) NOT NULL,
    subscription_or_order VARCHAR(160) NOT NULL,
    order_number VARCHAR(80),
    reason TEXT,
    confirmation BOOLEAN NOT NULL,
    email_confirmation_status VARCHAR(32) DEFAULT 'queued' NOT NULL,
    ip_address VARCHAR(64),
    user_agent VARCHAR(512),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT pk_withdrawal_requests PRIMARY KEY (id)
);

CREATE UNIQUE INDEX ix_withdrawal_requests_registration_number
    ON withdrawal_requests (registration_number);

CREATE TABLE content_reports (
    id UUID NOT NULL,
    registration_number VARCHAR(48) NOT NULL,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(320) NOT NULL,
    report_type VARCHAR(60) NOT NULL,
    content_reference VARCHAR(400) NOT NULL,
    description TEXT NOT NULL,
    rights_evidence TEXT,
    declaration BOOLEAN NOT NULL,
    ip_address VARCHAR(64),
    user_agent VARCHAR(512),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT pk_content_reports PRIMARY KEY (id)
);

CREATE UNIQUE INDEX ix_content_reports_registration_number
    ON content_reports (registration_number);

CREATE TABLE subscription_cancellations (
    id UUID NOT NULL,
    user_id UUID NOT NULL,
    plan_name VARCHAR(80) NOT NULL,
    renewal_date VARCHAR(32) NOT NULL,
    price VARCHAR(40) NOT NULL,
    active_until VARCHAR(80) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT pk_subscription_cancellations PRIMARY KEY (id),
    CONSTRAINT fk_subscription_cancellations_user_id_users
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE
);

CREATE INDEX ix_subscription_cancellations_user_id
    ON subscription_cancellations (user_id);

UPDATE alembic_version
SET version_num = '20260624_0003'
WHERE version_num = '20260611_0002';

COMMIT;
