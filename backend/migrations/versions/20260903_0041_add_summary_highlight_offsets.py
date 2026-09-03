"""Add exact offsets for summary highlights.

Revision ID: 20260903_0041
Revises: 20260901_0040
Create Date: 2026-09-03
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260903_0041"
down_revision: str | Sequence[str] | None = "20260901_0040"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "study_project_summary_highlights",
        sa.Column("start_offset", sa.Integer(), nullable=True),
    )
    op.add_column(
        "study_project_summary_highlights",
        sa.Column("end_offset", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("study_project_summary_highlights", "end_offset")
    op.drop_column("study_project_summary_highlights", "start_offset")
