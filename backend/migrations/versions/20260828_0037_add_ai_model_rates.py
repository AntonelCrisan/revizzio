"""Add AI model rates (for the internal OpenAI cost ceiling).

Revision ID: 20260828_0037
Revises: 20260828_0036
Create Date: 2026-08-28
"""

import uuid
from collections.abc import Sequence
from datetime import UTC, datetime

import sqlalchemy as sa
from alembic import op

revision: str = "20260828_0037"
down_revision: str | Sequence[str] | None = "20260828_0036"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Seeded at $0 - no real pricing data is hardcoded here. The cost ceiling
# (section 15 of the subscription-limits spec) stays inert until an admin
# fills in real per-model rates via the admin UI.
SEED_MODELS = ("gpt-5.6-luna", "gpt-5.6-terra", "mistral-ocr-latest")


def upgrade() -> None:
    op.create_table(
        "ai_model_rates",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("model", sa.String(length=80), nullable=False),
        sa.Column(
            "cost_per_1k_input_tokens",
            sa.Numeric(precision=10, scale=6),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "cost_per_1k_output_tokens",
            sa.Numeric(precision=10, scale=6),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_ai_model_rates")),
        sa.UniqueConstraint("model", name=op.f("uq_ai_model_rates_model")),
    )

    ai_model_rates = sa.table(
        "ai_model_rates",
        sa.column("id", sa.Uuid()),
        sa.column("model", sa.String()),
        sa.column("cost_per_1k_input_tokens", sa.Numeric()),
        sa.column("cost_per_1k_output_tokens", sa.Numeric()),
        sa.column("updated_at", sa.DateTime(timezone=True)),
    )
    now = datetime.now(UTC)
    op.bulk_insert(
        ai_model_rates,
        [
            {
                "id": uuid.uuid4(),
                "model": model,
                "cost_per_1k_input_tokens": 0,
                "cost_per_1k_output_tokens": 0,
                "updated_at": now,
            }
            for model in SEED_MODELS
        ],
    )


def downgrade() -> None:
    op.drop_table("ai_model_rates")
