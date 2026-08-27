-- Reviss user preferences (study, AI feedback style, automations, notifications)
-- Alembic revision: 20260827_0032
-- PostgreSQL only

BEGIN;

CREATE TABLE user_preferences (
    id UUID NOT NULL,
    user_id UUID NOT NULL,
    study_pace VARCHAR(16) DEFAULT 'balanced' NOT NULL,
    ai_feedback_style VARCHAR(16) DEFAULT 'guided' NOT NULL,
    automation_daily_review BOOLEAN DEFAULT TRUE NOT NULL,
    automation_quiz_after_summary BOOLEAN DEFAULT TRUE NOT NULL,
    automation_weak_concept_alerts BOOLEAN DEFAULT TRUE NOT NULL,
    notify_email_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    notify_alert_project_ready BOOLEAN DEFAULT TRUE NOT NULL,
    notify_alert_billing BOOLEAN DEFAULT TRUE NOT NULL,
    notify_frequency VARCHAR(16) DEFAULT 'daily' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT pk_user_preferences PRIMARY KEY (id),
    CONSTRAINT ck_user_preferences_study_pace
        CHECK (study_pace IN ('light', 'balanced', 'exam')),
    CONSTRAINT ck_user_preferences_ai_feedback_style
        CHECK (ai_feedback_style IN ('short', 'guided', 'exam')),
    CONSTRAINT ck_user_preferences_notify_frequency
        CHECK (notify_frequency IN ('instant', 'daily')),
    CONSTRAINT fk_user_preferences_user_id_users
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX ix_user_preferences_user_id
    ON user_preferences (user_id);

UPDATE alembic_version
SET version_num = '20260827_0032'
WHERE version_num = '20260827_0031';

COMMIT;
