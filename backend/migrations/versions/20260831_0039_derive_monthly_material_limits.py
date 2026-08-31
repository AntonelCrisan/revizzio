"""Derive monthly material limits from project file limits.

Revision ID: 20260831_0039
Revises: 20260831_0038
Create Date: 2026-08-31
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260831_0039"
down_revision: str | Sequence[str] | None = "20260831_0038"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE subscription_plans
        SET monthly_material_limit = active_project_limit * files_per_project_limit
        """
    )
    op.execute(
        """
        UPDATE subscription_plans
        SET material_limit = '2 materiale procesate lunar'
        WHERE slug = 'start'
          AND material_limit = '3 materiale procesate lunar'
        """
    )
    op.execute(
        """
        UPDATE subscription_plans
        SET material_limit = '100 materiale procesate lunar'
        WHERE slug = 'focus'
          AND material_limit = '30 materiale procesate lunar'
        """
    )
    op.execute(
        """
        UPDATE subscription_plans
        SET material_limit = '1500 materiale procesate lunar'
        WHERE slug = 'pro'
          AND material_limit = 'Materiale nelimitate rezonabil'
        """
    )


def downgrade() -> None:
    pass