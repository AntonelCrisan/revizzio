"""Cap how many quizzes a project may hold, per plan.

Quizzes are generated one at a time on demand, so nothing bounded how many a
single project could accumulate. This adds the per-plan ceiling the quiz
button checks before spending an AI call.

Revision ID: 20260904_0044
Revises: 20260903_0043
Create Date: 2026-09-04
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260904_0044"
down_revision: str | Sequence[str] | None = "20260903_0043"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "subscription_plans",
        sa.Column(
            "quizzes_per_project_limit",
            sa.Integer(),
            nullable=False,
            server_default="3",
        ),
    )
    # Seeded plans keep the same spread as the other limits.
    op.execute(
        "UPDATE subscription_plans SET quizzes_per_project_limit = 3 "
        "WHERE slug = 'start'"
    )
    op.execute(
        "UPDATE subscription_plans SET quizzes_per_project_limit = 10 "
        "WHERE slug = 'focus'"
    )
    op.execute(
        "UPDATE subscription_plans SET quizzes_per_project_limit = 25 "
        "WHERE slug = 'pro'"
    )


def downgrade() -> None:
    op.drop_column("subscription_plans", "quizzes_per_project_limit")
