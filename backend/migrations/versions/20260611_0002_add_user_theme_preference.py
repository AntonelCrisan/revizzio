"""Add user theme preference.

Revision ID: 20260611_0002
Revises: 20260611_0001
Create Date: 2026-06-11
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260611_0002"
down_revision: str | Sequence[str] | None = "20260611_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "theme_preference",
            sa.String(length=16),
            server_default=sa.text("'system'"),
            nullable=False,
        ),
    )
    op.create_check_constraint(
        "ck_users_theme_preference",
        "users",
        "theme_preference IN ('light', 'dark', 'system')",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_users_theme_preference",
        "users",
        type_="check",
    )
    op.drop_column("users", "theme_preference")
