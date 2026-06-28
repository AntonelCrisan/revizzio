"""Add subscription plans.

Revision ID: 20260627_0006
Revises: 20260627_0005
Create Date: 2026-06-27
"""

from collections.abc import Sequence
from datetime import UTC, datetime
from decimal import Decimal
import uuid

import sqlalchemy as sa
from alembic import op

revision: str = "20260627_0006"
down_revision: str | Sequence[str] | None = "20260627_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


DEFAULT_PLANS = [
    {
        "slug": "start",
        "name": "Start",
        "price_ron": Decimal("0.00"),
        "old_price_ron": None,
        "discount_label": None,
        "billing_interval": "lunar",
        "badge": "gratuit",
        "description": "Pentru primul curs și testarea fluxului Revizzio.",
        "material_limit": "3 materiale procesate lunar",
        "ai_level": "AI de bază",
        "storage": "Istoric limitat",
        "is_visible": True,
        "is_featured": False,
        "features": [
            "Flashcard-uri și quiz-uri de bază",
            "Rezumat generat pentru fiecare material",
            "Acces la progresul general",
        ],
    },
    {
        "slug": "focus",
        "name": "Focus",
        "price_ron": Decimal("29.00"),
        "old_price_ron": Decimal("39.00"),
        "discount_label": "25% reducere lansare",
        "billing_interval": "lunar",
        "badge": "recomandat",
        "description": "Cel mai bun raport pentru studenți activi.",
        "material_limit": "30 materiale procesate lunar",
        "ai_level": "Repetiție inteligentă și strategii AI",
        "storage": "Istoric complet pe proiecte",
        "is_visible": True,
        "is_featured": True,
        "features": [
            "Analiză de progres pe fiecare proiect",
            "Prioritate la generare",
            "Chat AI contextual pe proiect",
            "Highlight-uri și explicații AI",
        ],
    },
    {
        "slug": "pro",
        "name": "Pro",
        "price_ron": Decimal("59.00"),
        "old_price_ron": Decimal("79.00"),
        "discount_label": "20 RON economie",
        "billing_interval": "lunar",
        "badge": "examene",
        "description": "Pentru sesiuni intense și mai multe materii.",
        "material_limit": "Materiale nelimitate rezonabil",
        "ai_level": "Planuri AI pentru examene",
        "storage": "Export și arhivă extinsă",
        "is_visible": True,
        "is_featured": False,
        "features": [
            "Planuri de învățare pe data examenului",
            "Export pentru rezumate și flashcard-uri",
            "Suport prioritar",
            "Predicții avansate de pregătire",
        ],
    },
]


def upgrade() -> None:
    op.create_table(
        "subscription_plans",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("slug", sa.String(length=80), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("price_ron", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column(
            "old_price_ron",
            sa.Numeric(precision=10, scale=2),
            nullable=True,
        ),
        sa.Column("discount_label", sa.String(length=120), nullable=True),
        sa.Column("billing_interval", sa.String(length=40), nullable=False),
        sa.Column("badge", sa.String(length=80), nullable=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("material_limit", sa.Text(), nullable=False),
        sa.Column("ai_level", sa.Text(), nullable=False),
        sa.Column("storage", sa.Text(), nullable=False),
        sa.Column(
            "is_visible",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
        sa.Column(
            "is_featured",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_subscription_plans")),
        sa.UniqueConstraint("slug", name=op.f("uq_subscription_plans_slug")),
    )
    op.create_index(
        op.f("ix_subscription_plans_slug"),
        "subscription_plans",
        ["slug"],
        unique=True,
    )

    op.create_table(
        "subscription_plan_features",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("plan_id", sa.Uuid(), nullable=False),
        sa.Column("label", sa.Text(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["plan_id"],
            ["subscription_plans.id"],
            name=op.f("fk_subscription_plan_features_plan_id_subscription_plans"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_subscription_plan_features")),
    )
    op.create_index(
        op.f("ix_subscription_plan_features_plan_id"),
        "subscription_plan_features",
        ["plan_id"],
        unique=False,
    )

    subscription_plans = sa.table(
        "subscription_plans",
        sa.column("id", sa.Uuid()),
        sa.column("slug", sa.String()),
        sa.column("name", sa.String()),
        sa.column("price_ron", sa.Numeric()),
        sa.column("old_price_ron", sa.Numeric()),
        sa.column("discount_label", sa.String()),
        sa.column("billing_interval", sa.String()),
        sa.column("badge", sa.String()),
        sa.column("description", sa.Text()),
        sa.column("material_limit", sa.Text()),
        sa.column("ai_level", sa.Text()),
        sa.column("storage", sa.Text()),
        sa.column("is_visible", sa.Boolean()),
        sa.column("is_featured", sa.Boolean()),
        sa.column("sort_order", sa.Integer()),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("updated_at", sa.DateTime(timezone=True)),
    )
    subscription_plan_features = sa.table(
        "subscription_plan_features",
        sa.column("id", sa.Uuid()),
        sa.column("plan_id", sa.Uuid()),
        sa.column("label", sa.Text()),
        sa.column("sort_order", sa.Integer()),
    )

    now = datetime.now(UTC)
    for plan_index, plan_data in enumerate(DEFAULT_PLANS):
        plan_id = uuid.uuid4()
        op.bulk_insert(
            subscription_plans,
            [
                {
                    "id": plan_id,
                    "slug": plan_data["slug"],
                    "name": plan_data["name"],
                    "price_ron": plan_data["price_ron"],
                    "old_price_ron": plan_data["old_price_ron"],
                    "discount_label": plan_data["discount_label"],
                    "billing_interval": plan_data["billing_interval"],
                    "badge": plan_data["badge"],
                    "description": plan_data["description"],
                    "material_limit": plan_data["material_limit"],
                    "ai_level": plan_data["ai_level"],
                    "storage": plan_data["storage"],
                    "is_visible": plan_data["is_visible"],
                    "is_featured": plan_data["is_featured"],
                    "sort_order": plan_index,
                    "created_at": now,
                    "updated_at": now,
                }
            ],
        )
        op.bulk_insert(
            subscription_plan_features,
            [
                {
                    "id": uuid.uuid4(),
                    "plan_id": plan_id,
                    "label": feature_label,
                    "sort_order": feature_index,
                }
                for feature_index, feature_label in enumerate(plan_data["features"])
            ],
        )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_subscription_plan_features_plan_id"),
        table_name="subscription_plan_features",
    )
    op.drop_table("subscription_plan_features")
    op.drop_index(op.f("ix_subscription_plans_slug"), table_name="subscription_plans")
    op.drop_table("subscription_plans")
