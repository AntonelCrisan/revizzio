"""Add pending email changes.

Revision ID: 20260827_0031
Revises: 20260826_0030
Create Date: 2026-08-27
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260827_0031"
down_revision: str | Sequence[str] | None = "20260826_0030"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "pending_email_changes",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("new_email", sa.String(length=320), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_pending_email_changes_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_pending_email_changes")),
    )
    op.create_index(
        op.f("ix_pending_email_changes_expires_at"),
        "pending_email_changes",
        ["expires_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_pending_email_changes_new_email"),
        "pending_email_changes",
        ["new_email"],
        unique=False,
    )
    op.create_index(
        op.f("ix_pending_email_changes_token_hash"),
        "pending_email_changes",
        ["token_hash"],
        unique=True,
    )
    op.create_index(
        op.f("ix_pending_email_changes_user_id"),
        "pending_email_changes",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_pending_email_changes_user_id"),
        table_name="pending_email_changes",
    )
    op.drop_index(
        op.f("ix_pending_email_changes_token_hash"),
        table_name="pending_email_changes",
    )
    op.drop_index(
        op.f("ix_pending_email_changes_new_email"),
        table_name="pending_email_changes",
    )
    op.drop_index(
        op.f("ix_pending_email_changes_expires_at"),
        table_name="pending_email_changes",
    )
    op.drop_table("pending_email_changes")
