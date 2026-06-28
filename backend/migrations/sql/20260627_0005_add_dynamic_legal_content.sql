-- Revizzio dynamic legal content and company data
-- Alembic revision: 20260627_0005
-- PostgreSQL only

BEGIN;

CREATE TABLE legal_documents (
    id UUID NOT NULL,
    slug VARCHAR(80) NOT NULL,
    title VARCHAR(160) NOT NULL,
    last_date_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT pk_legal_documents PRIMARY KEY (id),
    CONSTRAINT uq_legal_documents_slug UNIQUE (slug)
);

CREATE TABLE company_data (
    id UUID NOT NULL,
    name TEXT NOT NULL,
    social_location TEXT NOT NULL,
    cui TEXT NOT NULL,
    register_number TEXT NOT NULL,
    social_capital TEXT NOT NULL,
    email TEXT NOT NULL,
    privacy_email TEXT NOT NULL,
    phone TEXT NOT NULL,
    ai_provider TEXT NOT NULL,
    payment_provider TEXT NOT NULL,
    hosting_provider TEXT NOT NULL,
    last_date_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT pk_company_data PRIMARY KEY (id)
);

CREATE TABLE legal_document_sections (
    id UUID NOT NULL,
    document_id UUID NOT NULL,
    section_key VARCHAR(80) NOT NULL,
    title VARCHAR(180) NOT NULL,
    content TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    last_date_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT pk_legal_document_sections PRIMARY KEY (id),
    CONSTRAINT fk_legal_document_sections_document_id_legal_documents
        FOREIGN KEY (document_id)
        REFERENCES legal_documents (id)
        ON DELETE CASCADE,
    CONSTRAINT uq_legal_document_sections_document_id_section_key
        UNIQUE (document_id, section_key)
);

CREATE INDEX ix_legal_document_sections_document_id
    ON legal_document_sections (document_id);

-- Initial document seed is handled by the Alembic Python migration because it
-- reads the existing HTML documents and splits them into editable sections.

COMMIT;
