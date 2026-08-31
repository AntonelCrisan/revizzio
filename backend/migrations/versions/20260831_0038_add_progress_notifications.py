"""Add progress notifications (weekly progress, inactivity, streak).

Revision ID: 20260831_0038
Revises: 20260828_0037
Create Date: 2026-08-31
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260831_0038"
down_revision: str | Sequence[str] | None = "20260828_0037"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

OLD_NOTIFICATION_TYPES = ("project_ready", "weak_concepts", "daily_review")
NEW_NOTIFICATION_TYPES = (
    *OLD_NOTIFICATION_TYPES,
    "weekly_progress",
    "inactivity_reminder",
    "streak_milestone",
)


def upgrade() -> None:
    op.create_table(
        "user_study_activity",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("activity_date", sa.Date(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_user_study_activity_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_user_study_activity")),
        sa.UniqueConstraint(
            "user_id",
            "activity_date",
            name="uq_user_study_activity_user_id_activity_date",
        ),
    )
    op.create_index(
        op.f("ix_user_study_activity_user_id"),
        "user_study_activity",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_user_study_activity_activity_date"),
        "user_study_activity",
        ["activity_date"],
        unique=False,
    )

    op.add_column(
        "user_preferences",
        sa.Column(
            "automation_weekly_progress",
            sa.Boolean(),
            nullable=False,
            server_default="true",
        ),
    )
    op.add_column(
        "user_preferences",
        sa.Column(
            "automation_inactivity_reminder",
            sa.Boolean(),
            nullable=False,
            server_default="true",
        ),
    )
    op.add_column(
        "user_preferences",
        sa.Column(
            "notify_alert_streak_milestone",
            sa.Boolean(),
            nullable=False,
            server_default="true",
        ),
    )

    op.drop_constraint(
        op.f("ck_notifications_type"), "notifications", type_="check"
    )
    op.create_check_constraint(
        op.f("ck_notifications_type"),
        "notifications",
        "type IN ("
        + ", ".join(f"'{value}'" for value in NEW_NOTIFICATION_TYPES)
        + ")",
    )


def downgrade() -> None:
    op.drop_constraint(
        op.f("ck_notifications_type"), "notifications", type_="check"
    )
    op.create_check_constraint(
        op.f("ck_notifications_type"),
        "notifications",
        "type IN ("
        + ", ".join(f"'{value}'" for value in OLD_NOTIFICATION_TYPES)
        + ")",
    )

    op.drop_column("user_preferences", "notify_alert_streak_milestone")
    op.drop_column("user_preferences", "automation_inactivity_reminder")
    op.drop_column("user_preferences", "automation_weekly_progress")

    op.drop_index(
        op.f("ix_user_study_activity_activity_date"),
        table_name="user_study_activity",
    )
    op.drop_index(
        op.f("ix_user_study_activity_user_id"), table_name="user_study_activity"
    )
    op.drop_table("user_study_activity")
