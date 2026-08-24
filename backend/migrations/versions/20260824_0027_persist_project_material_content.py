"""Persist project material content.

Revision ID: 20260824_0027
Revises: 20260822_0026
Create Date: 2026-08-24
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260824_0027"
down_revision: str | Sequence[str] | None = "20260822_0026"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "study_projects",
        sa.Column(
            "generation_language",
            sa.String(length=8),
            nullable=False,
            server_default="ro",
        ),
    )
    op.add_column(
        "study_projects",
        sa.Column("combined_markdown_content", sa.Text(), nullable=True),
    )
    op.add_column(
        "study_projects",
        sa.Column("prompt_content", sa.Text(), nullable=True),
    )
    op.add_column(
        "study_project_files",
        sa.Column("markdown_content", sa.Text(), nullable=True),
    )
    op.create_check_constraint(
        "ck_study_projects_generation_language",
        "study_projects",
        "generation_language IN ('ro', 'en', 'fr')",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_study_projects_generation_language",
        "study_projects",
        type_="check",
    )
    op.drop_column("study_project_files", "markdown_content")
    op.drop_column("study_projects", "prompt_content")
    op.drop_column("study_projects", "combined_markdown_content")
    op.drop_column("study_projects", "generation_language")
