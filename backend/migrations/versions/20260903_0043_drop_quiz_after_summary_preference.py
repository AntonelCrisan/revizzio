"""Drop the "quiz after summary" preference.

The post-summary quiz suggestion was removed when quiz generation moved to
one configured quiz at a time, so this column steered nothing: the toggle in
Settings wrote a value no code read.

Revision ID: 20260903_0043
Revises: 20260901_0042
Create Date: 2026-09-03
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260903_0043"
down_revision: str | Sequence[str] | None = "20260901_0042"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_column("user_preferences", "automation_quiz_after_summary")


def downgrade() -> None:
    op.add_column(
        "user_preferences",
        sa.Column(
            "automation_quiz_after_summary",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )
