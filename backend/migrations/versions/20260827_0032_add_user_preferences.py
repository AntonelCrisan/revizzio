"""Add user preferences.

Revision ID: 20260827_0032
Revises: 20260827_0031
Create Date: 2026-08-27
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260827_0032"
down_revision: str | Sequence[str] | None = "20260827_0031"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "user_preferences",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column(
            "study_pace",
            sa.String(length=16),
            server_default="balanced",
            nullable=False,
        ),
        sa.Column(
            "ai_feedback_style",
            sa.String(length=16),
            server_default="guided",
            nullable=False,
        ),
        sa.Column(
            "automation_daily_review",
            sa.Boolean(),
            server_default="true",
            nullable=False,
        ),
        sa.Column(
            "automation_quiz_after_summary",
            sa.Boolean(),
            server_default="true",
            nullable=False,
        ),
        sa.Column(
            "automation_weak_concept_alerts",
            sa.Boolean(),
            server_default="true",
            nullable=False,
        ),
        sa.Column(
            "notify_email_enabled",
            sa.Boolean(),
            server_default="true",
            nullable=False,
        ),
        sa.Column(
            "notify_alert_project_ready",
            sa.Boolean(),
            server_default="true",
            nullable=False,
        ),
        sa.Column(
            "notify_alert_billing",
            sa.Boolean(),
            server_default="true",
            nullable=False,
        ),
        sa.Column(
            "notify_frequency",
            sa.String(length=16),
            server_default="daily",
            nullable=False,
        ),
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
        sa.CheckConstraint(
            "study_pace IN ('light', 'balanced', 'exam')",
            name=op.f("ck_user_preferences_study_pace"),
        ),
        sa.CheckConstraint(
            "ai_feedback_style IN ('short', 'guided', 'exam')",
            name=op.f("ck_user_preferences_ai_feedback_style"),
        ),
        sa.CheckConstraint(
            "notify_frequency IN ('instant', 'daily')",
            name=op.f("ck_user_preferences_notify_frequency"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_user_preferences_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_user_preferences")),
    )
    op.create_index(
        op.f("ix_user_preferences_user_id"),
        "user_preferences",
        ["user_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_user_preferences_user_id"),
        table_name="user_preferences",
    )
    op.drop_table("user_preferences")
