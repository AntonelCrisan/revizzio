"""Add content report attachments.

Revision ID: 20260825_0028
Revises: 20260824_0027
Create Date: 2026-08-25
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260825_0028"
down_revision: str | Sequence[str] | None = "20260824_0027"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "content_report_attachments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("report_id", sa.Uuid(), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("content_type", sa.String(length=160), nullable=True),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("storage_path", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["report_id"],
            ["content_reports.id"],
            name=op.f("fk_content_report_attachments_report_id_content_reports"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_content_report_attachments")),
    )
    op.create_index(
        op.f("ix_content_report_attachments_report_id"),
        "content_report_attachments",
        ["report_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_content_report_attachments_report_id"),
        table_name="content_report_attachments",
    )
    op.drop_table("content_report_attachments")
