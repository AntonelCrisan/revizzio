"""Add visitor visits.

Revision ID: 20260826_0029
Revises: 20260825_0028
Create Date: 2026-08-26
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260826_0029"
down_revision: str | Sequence[str] | None = "20260825_0028"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "visitor_visits",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("visitor_hash", sa.String(length=64), nullable=False),
        sa.Column("visit_date", sa.Date(), nullable=False),
        sa.Column("path", sa.String(length=300), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_visitor_visits")),
        sa.UniqueConstraint(
            "visitor_hash",
            "visit_date",
            name="uq_visitor_visits_visitor_hash_visit_date",
        ),
    )
    op.create_index(
        op.f("ix_visitor_visits_visitor_hash"),
        "visitor_visits",
        ["visitor_hash"],
        unique=False,
    )
    op.create_index(
        op.f("ix_visitor_visits_visit_date"),
        "visitor_visits",
        ["visit_date"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_visitor_visits_visit_date"), table_name="visitor_visits")
    op.drop_index(op.f("ix_visitor_visits_visitor_hash"), table_name="visitor_visits")
    op.drop_table("visitor_visits")
