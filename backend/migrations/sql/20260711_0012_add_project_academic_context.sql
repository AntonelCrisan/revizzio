-- Revizzio study project academic context
-- Alembic revision: 20260711_0012
-- PostgreSQL only
--
-- Run after 20260711_0011_add_study_projects.sql.

BEGIN;

ALTER TABLE study_projects
    ADD COLUMN IF NOT EXISTS subject_name VARCHAR(160);

ALTER TABLE study_projects
    ADD COLUMN IF NOT EXISTS institution_name VARCHAR(220);

UPDATE study_projects
SET
    subject_name = COALESCE(subject_name, name),
    institution_name = COALESCE(institution_name, 'Nespecificat')
WHERE subject_name IS NULL
   OR institution_name IS NULL;

ALTER TABLE study_projects
    ALTER COLUMN subject_name SET NOT NULL;

ALTER TABLE study_projects
    ALTER COLUMN institution_name SET NOT NULL;

CREATE TABLE IF NOT EXISTS alembic_version (
    version_num VARCHAR(32) NOT NULL
);

DELETE FROM alembic_version;

INSERT INTO alembic_version (version_num)
VALUES ('20260711_0012');

COMMIT;
