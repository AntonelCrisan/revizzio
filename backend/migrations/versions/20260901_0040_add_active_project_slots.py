"""Add active project slots and project deactivation.

Introduces a total cap on simultaneously active projects, separate from the
existing per-month creation rate (`active_project_limit`). Projects over the cap
are deactivated rather than archived: they stay visible in the project list but
cannot be studied, which keeps the loss visible after a downgrade.

Revision ID: 20260901_0040
Revises: 20260831_0039
Create Date: 2026-09-01
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260901_0040"
down_revision: str | Sequence[str] | None = "20260831_0039"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "subscription_plans",
        sa.Column(
            "active_project_slots",
            sa.Integer(),
            nullable=False,
            server_default="2",
        ),
    )
    op.create_check_constraint(
        "ck_subscription_plans_active_project_slots",
        "subscription_plans",
        "active_project_slots >= 1",
    )

    op.add_column(
        "study_projects",
        sa.Column("deactivated_at", sa.DateTime(timezone=True), nullable=True),
    )
    # Every over-cap check counts a user's active projects, so the partial index
    # only needs the rows that still occupy a slot.
    op.create_index(
        "ix_study_projects_user_active",
        "study_projects",
        ["user_id"],
        postgresql_where=sa.text("deactivated_at IS NULL"),
    )

    # Seed the agreed slot counts. Anything not listed keeps the server default.
    for slug, slots in (("start", 2), ("focus", 10), ("pro", 40)):
        op.execute(
            sa.text(
                "UPDATE subscription_plans SET active_project_slots = :slots "
                "WHERE slug = :slug"
            ).bindparams(slots=slots, slug=slug)
        )


def downgrade() -> None:
    op.drop_index("ix_study_projects_user_active", table_name="study_projects")
    op.drop_column("study_projects", "deactivated_at")
    op.drop_constraint(
        "ck_subscription_plans_active_project_slots",
        "subscription_plans",
        type_="check",
    )
    op.drop_column("subscription_plans", "active_project_slots")
