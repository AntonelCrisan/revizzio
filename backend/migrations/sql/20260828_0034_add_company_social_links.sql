-- Reviss company social media links (shown on /contact, editable by admins)
-- Alembic revision: 20260828_0034
-- PostgreSQL only

BEGIN;

ALTER TABLE company_data
    ADD COLUMN social_facebook_url TEXT NOT NULL DEFAULT '',
    ADD COLUMN social_instagram_url TEXT NOT NULL DEFAULT '',
    ADD COLUMN social_tiktok_url TEXT NOT NULL DEFAULT '',
    ADD COLUMN social_linkedin_url TEXT NOT NULL DEFAULT '',
    ADD COLUMN social_youtube_url TEXT NOT NULL DEFAULT '',
    ADD COLUMN social_x_url TEXT NOT NULL DEFAULT '';

UPDATE alembic_version
SET version_num = '20260828_0034'
WHERE version_num = '20260827_0033';

COMMIT;
