-- Content report attachments
-- Alembic revision: 20260825_0028
-- PostgreSQL only

BEGIN;

CREATE TABLE content_report_attachments (
    id UUID NOT NULL,
    report_id UUID NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(160),
    size_bytes INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT pk_content_report_attachments PRIMARY KEY (id),
    CONSTRAINT fk_content_report_attachments_report_id_content_reports
        FOREIGN KEY (report_id)
        REFERENCES content_reports (id)
        ON DELETE CASCADE
);

CREATE INDEX ix_content_report_attachments_report_id
    ON content_report_attachments (report_id);

UPDATE alembic_version
SET version_num = '20260825_0028'
WHERE version_num = '20260824_0027';

COMMIT;
