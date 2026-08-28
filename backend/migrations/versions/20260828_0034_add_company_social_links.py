"""Add company social links.

Revision ID: 20260828_0034
Revises: 20260827_0033
Create Date: 2026-08-28
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260828_0034"
down_revision: str | Sequence[str] | None = "20260827_0033"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SOCIAL_COLUMNS = (
    "social_facebook_url",
    "social_instagram_url",
    "social_tiktok_url",
    "social_linkedin_url",
    "social_youtube_url",
    "social_x_url",
)


def upgrade() -> None:
    for column_name in SOCIAL_COLUMNS:
        op.add_column(
            "company_data",
            sa.Column(column_name, sa.Text(), nullable=False, server_default=""),
        )


def downgrade() -> None:
    for column_name in reversed(SOCIAL_COLUMNS):
        op.drop_column("company_data", column_name)
