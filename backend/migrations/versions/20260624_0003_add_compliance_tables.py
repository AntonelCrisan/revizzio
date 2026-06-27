"""Add compliance tables and newsletter consent.

Revision ID: 20260624_0003
Revises: 20260611_0002
Create Date: 2026-06-24
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260624_0003"
down_revision: str | Sequence[str] | None = "20260611_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "newsletter_consent",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )
    op.add_column(
        "users",
        sa.Column("newsletter_consent_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "compliance_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.String(length=512), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_compliance_events_user_id_users"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_compliance_events")),
    )
    op.create_index(
        op.f("ix_compliance_events_event_type"),
        "compliance_events",
        ["event_type"],
        unique=False,
    )

    op.create_table(
        "contact_messages",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("category", sa.String(length=40), nullable=False),
        sa.Column("subject", sa.String(length=160), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.String(length=512), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_contact_messages")),
    )

    op.create_table(
        "withdrawal_requests",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("registration_number", sa.String(length=48), nullable=False),
        sa.Column("full_name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("subscription_or_order", sa.String(length=160), nullable=False),
        sa.Column("order_number", sa.String(length=80), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("confirmation", sa.Boolean(), nullable=False),
        sa.Column(
            "email_confirmation_status",
            sa.String(length=32),
            server_default=sa.text("'queued'"),
            nullable=False,
        ),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.String(length=512), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_withdrawal_requests")),
    )
    op.create_index(
        op.f("ix_withdrawal_requests_registration_number"),
        "withdrawal_requests",
        ["registration_number"],
        unique=True,
    )

    op.create_table(
        "content_reports",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("registration_number", sa.String(length=48), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("report_type", sa.String(length=60), nullable=False),
        sa.Column("content_reference", sa.String(length=400), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("rights_evidence", sa.Text(), nullable=True),
        sa.Column("declaration", sa.Boolean(), nullable=False),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.String(length=512), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_content_reports")),
    )
    op.create_index(
        op.f("ix_content_reports_registration_number"),
        "content_reports",
        ["registration_number"],
        unique=True,
    )

    op.create_table(
        "subscription_cancellations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("plan_name", sa.String(length=80), nullable=False),
        sa.Column("renewal_date", sa.String(length=32), nullable=False),
        sa.Column("price", sa.String(length=40), nullable=False),
        sa.Column("active_until", sa.String(length=80), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_subscription_cancellations_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_subscription_cancellations")),
    )
    op.create_index(
        op.f("ix_subscription_cancellations_user_id"),
        "subscription_cancellations",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_subscription_cancellations_user_id"),
        table_name="subscription_cancellations",
    )
    op.drop_table("subscription_cancellations")
    op.drop_index(
        op.f("ix_content_reports_registration_number"),
        table_name="content_reports",
    )
    op.drop_table("content_reports")
    op.drop_index(
        op.f("ix_withdrawal_requests_registration_number"),
        table_name="withdrawal_requests",
    )
    op.drop_table("withdrawal_requests")
    op.drop_table("contact_messages")
    op.drop_index(
        op.f("ix_compliance_events_event_type"),
        table_name="compliance_events",
    )
    op.drop_table("compliance_events")
    op.drop_column("users", "newsletter_consent_at")
    op.drop_column("users", "newsletter_consent")
