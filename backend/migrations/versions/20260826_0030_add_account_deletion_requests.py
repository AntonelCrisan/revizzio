"""Add account deletion requests.

Revision ID: 20260826_0030
Revises: 20260826_0029
Create Date: 2026-08-26
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260826_0030"
down_revision: str | Sequence[str] | None = "20260826_0029"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "account_deletion_requests",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("full_name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column(
            "status",
            sa.String(length=24),
            server_default="pending",
            nullable=False,
        ),
        sa.Column("resolved_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolution_note", sa.Text(), nullable=True),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.String(length=512), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'completed', 'cancelled')",
            name=op.f("ck_account_deletion_requests_status"),
        ),
        sa.ForeignKeyConstraint(
            ["resolved_by_user_id"],
            ["users.id"],
            name=op.f("fk_account_deletion_requests_resolved_by_user_id_users"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_account_deletion_requests_user_id_users"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_account_deletion_requests")),
    )
    op.create_index(
        op.f("ix_account_deletion_requests_created_at"),
        "account_deletion_requests",
        ["created_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_account_deletion_requests_email"),
        "account_deletion_requests",
        ["email"],
        unique=False,
    )
    op.create_index(
        op.f("ix_account_deletion_requests_resolved_by_user_id"),
        "account_deletion_requests",
        ["resolved_by_user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_account_deletion_requests_status"),
        "account_deletion_requests",
        ["status"],
        unique=False,
    )
    op.create_index(
        op.f("ix_account_deletion_requests_user_id"),
        "account_deletion_requests",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "uq_account_deletion_requests_pending_user_id",
        "account_deletion_requests",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text("status = 'pending' AND user_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_account_deletion_requests_pending_user_id",
        table_name="account_deletion_requests",
    )
    op.drop_index(
        op.f("ix_account_deletion_requests_user_id"),
        table_name="account_deletion_requests",
    )
    op.drop_index(
        op.f("ix_account_deletion_requests_status"),
        table_name="account_deletion_requests",
    )
    op.drop_index(
        op.f("ix_account_deletion_requests_resolved_by_user_id"),
        table_name="account_deletion_requests",
    )
    op.drop_index(
        op.f("ix_account_deletion_requests_email"),
        table_name="account_deletion_requests",
    )
    op.drop_index(
        op.f("ix_account_deletion_requests_created_at"),
        table_name="account_deletion_requests",
    )
    op.drop_table("account_deletion_requests")
