-- Revizzio subscription plans
-- Alembic revision: 20260627_0006
-- PostgreSQL only
--
-- Safe to run multiple times in pgAdmin.
-- If pgAdmin shows "current transaction is aborted", run ROLLBACK; first,
-- then run this whole script again in a fresh query window.

BEGIN;

CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID NOT NULL,
    slug VARCHAR(80) NOT NULL,
    name VARCHAR(120) NOT NULL,
    price_ron NUMERIC(10, 2) NOT NULL,
    old_price_ron NUMERIC(10, 2),
    discount_label VARCHAR(120),
    billing_interval VARCHAR(40) NOT NULL,
    badge VARCHAR(80),
    description TEXT NOT NULL,
    material_limit TEXT NOT NULL,
    ai_level TEXT NOT NULL,
    storage TEXT NOT NULL,
    is_visible BOOLEAN DEFAULT TRUE NOT NULL,
    is_featured BOOLEAN DEFAULT FALSE NOT NULL,
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT pk_subscription_plans PRIMARY KEY (id),
    CONSTRAINT uq_subscription_plans_slug UNIQUE (slug)
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_subscription_plans_slug
    ON subscription_plans (slug);

CREATE TABLE IF NOT EXISTS subscription_plan_features (
    id UUID NOT NULL,
    plan_id UUID NOT NULL,
    label TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    CONSTRAINT pk_subscription_plan_features PRIMARY KEY (id),
    CONSTRAINT fk_subscription_plan_features_plan_id_subscription_plans
        FOREIGN KEY (plan_id)
        REFERENCES subscription_plans (id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_subscription_plan_features_plan_id
    ON subscription_plan_features (plan_id);

INSERT INTO subscription_plans (
    id, slug, name, price_ron, old_price_ron, discount_label, billing_interval,
    badge, description, material_limit, ai_level, storage, is_visible,
    is_featured, sort_order
) VALUES
(
    '11111111-1111-4111-8111-111111111111',
    'start',
    'Start',
    0.00,
    NULL,
    NULL,
    'lunar',
    'gratuit',
    'Pentru primul curs și testarea fluxului Revizzio.',
    '3 materiale procesate lunar',
    'AI de bază',
    'Istoric limitat',
    TRUE,
    FALSE,
    0
),
(
    '22222222-2222-4222-8222-222222222222',
    'focus',
    'Focus',
    29.00,
    39.00,
    '25% reducere lansare',
    'lunar',
    'recomandat',
    'Cel mai bun raport pentru studenți activi.',
    '30 materiale procesate lunar',
    'Repetiție inteligentă și strategii AI',
    'Istoric complet pe proiecte',
    TRUE,
    TRUE,
    1
),
(
    '33333333-3333-4333-8333-333333333333',
    'pro',
    'Pro',
    59.00,
    79.00,
    '20 RON economie',
    'lunar',
    'examene',
    'Pentru sesiuni intense și mai multe materii.',
    'Materiale nelimitate rezonabil',
    'Planuri AI pentru examene',
    'Export și arhivă extinsă',
    TRUE,
    FALSE,
    2
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    price_ron = EXCLUDED.price_ron,
    old_price_ron = EXCLUDED.old_price_ron,
    discount_label = EXCLUDED.discount_label,
    billing_interval = EXCLUDED.billing_interval,
    badge = EXCLUDED.badge,
    description = EXCLUDED.description,
    material_limit = EXCLUDED.material_limit,
    ai_level = EXCLUDED.ai_level,
    storage = EXCLUDED.storage,
    is_visible = EXCLUDED.is_visible,
    is_featured = EXCLUDED.is_featured,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

DELETE FROM subscription_plan_features
WHERE plan_id IN (
    SELECT id
    FROM subscription_plans
    WHERE slug IN ('start', 'focus', 'pro')
);

INSERT INTO subscription_plan_features (id, plan_id, label, sort_order)
SELECT '11111111-1111-4111-8111-111111111101'::uuid, id, 'Flashcard-uri și quiz-uri de bază', 0
FROM subscription_plans
WHERE slug = 'start'
UNION ALL
SELECT '11111111-1111-4111-8111-111111111102'::uuid, id, 'Rezumat generat pentru fiecare material', 1
FROM subscription_plans
WHERE slug = 'start'
UNION ALL
SELECT '11111111-1111-4111-8111-111111111103'::uuid, id, 'Acces la progresul general', 2
FROM subscription_plans
WHERE slug = 'start'
UNION ALL
SELECT '22222222-2222-4222-8222-222222222201'::uuid, id, 'Analiză de progres pe fiecare proiect', 0
FROM subscription_plans
WHERE slug = 'focus'
UNION ALL
SELECT '22222222-2222-4222-8222-222222222202'::uuid, id, 'Prioritate la generare', 1
FROM subscription_plans
WHERE slug = 'focus'
UNION ALL
SELECT '22222222-2222-4222-8222-222222222203'::uuid, id, 'Chat AI contextual pe proiect', 2
FROM subscription_plans
WHERE slug = 'focus'
UNION ALL
SELECT '22222222-2222-4222-8222-222222222204'::uuid, id, 'Highlight-uri și explicații AI', 3
FROM subscription_plans
WHERE slug = 'focus'
UNION ALL
SELECT '33333333-3333-4333-8333-333333333301'::uuid, id, 'Planuri de învățare pe data examenului', 0
FROM subscription_plans
WHERE slug = 'pro'
UNION ALL
SELECT '33333333-3333-4333-8333-333333333302'::uuid, id, 'Export pentru rezumate și flashcard-uri', 1
FROM subscription_plans
WHERE slug = 'pro'
UNION ALL
SELECT '33333333-3333-4333-8333-333333333303'::uuid, id, 'Suport prioritar', 2
FROM subscription_plans
WHERE slug = 'pro'
UNION ALL
SELECT '33333333-3333-4333-8333-333333333304'::uuid, id, 'Predicții avansate de pregătire', 3
FROM subscription_plans
WHERE slug = 'pro';

CREATE TABLE IF NOT EXISTS alembic_version (
    version_num VARCHAR(32) NOT NULL
);

DELETE FROM alembic_version;

INSERT INTO alembic_version (version_num)
VALUES ('20260627_0006');

COMMIT;
