"""Add AI credits system (plan limits, usage log, credit rates).

Revision ID: 20260828_0035
Revises: 20260828_0034
Create Date: 2026-08-28
"""

import uuid
from collections.abc import Sequence
from datetime import UTC, datetime

import sqlalchemy as sa
from alembic import op

revision: str = "20260828_0035"
down_revision: str | Sequence[str] | None = "20260828_0034"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

DEFAULT_CREDIT_RATES = [
    ("chat", "small", 4000, 1),
    ("chat", "large", None, 2),
    ("quiz", "small", 15, 2),
    ("quiz", "medium", 30, 3),
    ("quiz", "large", None, 5),
    ("flashcards", "small", 20, 2),
    ("flashcards", "medium", 40, 3),
    ("flashcards", "large", None, 5),
    ("summary", "small", 20, 2),
    ("summary", "medium", 75, 3),
    ("summary", "large", None, 5),
    ("explanation", "small", None, 1),
]


def upgrade() -> None:
    op.add_column(
        "subscription_plans",
        sa.Column(
            "monthly_ai_credits", sa.Integer(), nullable=False, server_default="10"
        ),
    )
    op.add_column(
        "subscription_plans",
        sa.Column(
            "monthly_ocr_pages", sa.Integer(), nullable=False, server_default="0"
        ),
    )
    op.add_column(
        "subscription_plans",
        sa.Column(
            "monthly_page_limit", sa.Integer(), nullable=False, server_default="40"
        ),
    )
    op.add_column(
        "subscription_plans",
        sa.Column(
            "ai_chat_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.add_column(
        "subscription_plans",
        sa.Column(
            "max_openai_cost_usd_per_cycle",
            sa.Numeric(precision=6, scale=2),
            nullable=False,
            server_default="2.00",
        ),
    )

    op.execute(
        sa.text(
            "UPDATE subscription_plans SET "
            "monthly_ai_credits = 60, monthly_ocr_pages = 200, "
            "monthly_page_limit = 1000, ai_chat_enabled = true, "
            "max_openai_cost_usd_per_cycle = 6.00 "
            "WHERE slug = 'focus'"
        )
    )
    op.execute(
        sa.text(
            "UPDATE subscription_plans SET "
            "monthly_ai_credits = 120, monthly_ocr_pages = 500, "
            "monthly_page_limit = 2500, ai_chat_enabled = true, "
            "max_openai_cost_usd_per_cycle = 12.00 "
            "WHERE slug = 'pro'"
        )
    )

    op.create_table(
        "ai_usage_logs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("subscription_plan_slug", sa.String(length=80), nullable=False),
        sa.Column("feature", sa.String(length=32), nullable=False),
        sa.Column("size_tier", sa.String(length=16), nullable=True),
        sa.Column("model", sa.String(length=80), nullable=True),
        sa.Column("input_tokens", sa.Integer(), nullable=True),
        sa.Column("output_tokens", sa.Integer(), nullable=True),
        sa.Column("cached_tokens", sa.Integer(), nullable=True),
        sa.Column(
            "estimated_cost_usd", sa.Numeric(precision=8, scale=4), nullable=True
        ),
        sa.Column(
            "ai_credits_charged", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column(
            "ocr_pages_charged", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "feature IN ('chat', 'quiz', 'flashcards', 'summary', "
            "'explanation', 'ocr')",
            name=op.f("ck_ai_usage_logs_feature"),
        ),
        sa.CheckConstraint(
            "size_tier IS NULL OR size_tier IN ('small', 'medium', 'large')",
            name=op.f("ck_ai_usage_logs_size_tier"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_ai_usage_logs_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_ai_usage_logs")),
    )
    op.create_index(
        op.f("ix_ai_usage_logs_user_id"),
        "ai_usage_logs",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_ai_usage_logs_created_at"),
        "ai_usage_logs",
        ["created_at"],
        unique=False,
    )

    op.create_table(
        "ai_credit_rates",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("feature", sa.String(length=32), nullable=False),
        sa.Column("size_tier", sa.String(length=16), nullable=False),
        sa.Column("threshold_max", sa.Integer(), nullable=True),
        sa.Column("credits", sa.Integer(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "feature IN ('chat', 'quiz', 'flashcards', 'summary', 'explanation')",
            name=op.f("ck_ai_credit_rates_feature"),
        ),
        sa.CheckConstraint(
            "size_tier IN ('small', 'medium', 'large')",
            name=op.f("ck_ai_credit_rates_size_tier"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_ai_credit_rates")),
        sa.UniqueConstraint(
            "feature",
            "size_tier",
            name=op.f("uq_ai_credit_rates_feature_size_tier"),
        ),
    )

    ai_credit_rates = sa.table(
        "ai_credit_rates",
        sa.column("id", sa.Uuid()),
        sa.column("feature", sa.String()),
        sa.column("size_tier", sa.String()),
        sa.column("threshold_max", sa.Integer()),
        sa.column("credits", sa.Integer()),
        sa.column("updated_at", sa.DateTime(timezone=True)),
    )
    now = datetime.now(UTC)
    op.bulk_insert(
        ai_credit_rates,
        [
            {
                "id": uuid.uuid4(),
                "feature": feature,
                "size_tier": size_tier,
                "threshold_max": threshold_max,
                "credits": credits,
                "updated_at": now,
            }
            for feature, size_tier, threshold_max, credits in DEFAULT_CREDIT_RATES
        ],
    )


def downgrade() -> None:
    op.drop_table("ai_credit_rates")
    op.drop_index(op.f("ix_ai_usage_logs_created_at"), table_name="ai_usage_logs")
    op.drop_index(op.f("ix_ai_usage_logs_user_id"), table_name="ai_usage_logs")
    op.drop_table("ai_usage_logs")
    op.drop_column("subscription_plans", "max_openai_cost_usd_per_cycle")
    op.drop_column("subscription_plans", "ai_chat_enabled")
    op.drop_column("subscription_plans", "monthly_page_limit")
    op.drop_column("subscription_plans", "monthly_ocr_pages")
    op.drop_column("subscription_plans", "monthly_ai_credits")
