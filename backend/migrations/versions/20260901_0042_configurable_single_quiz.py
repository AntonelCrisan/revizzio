"""Support configurable single-quiz generation.

Quizzes stop being generated as one large batch per project. Each quiz is now
requested on demand with its own difficulty, question count and question types,
which needs two new answer shapes:

* matching  -- `label` holds the left item, `match_label` its pair
* ordering  -- `label` holds one word of a sentence, `sort_order` its position

Two columns lose their meaning and go away:

* `subscription_plans.quiz_groups_per_complexity` sized the old batch
* `study_project_quizzes.question_type` named the quiz's single question type,
  but a quiz can now mix types; the type lives on each question instead

Revision ID: 20260901_0042
Revises: 20260903_0041
Create Date: 2026-09-01
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260901_0042"
down_revision: str | Sequence[str] | None = "20260903_0041"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Existing single/multiple choice options simply leave this NULL, so
    # quizzes generated before this change keep working untouched.
    op.add_column(
        "study_project_quiz_options",
        sa.Column("match_label", sa.Text(), nullable=True),
    )
    op.drop_column("study_project_quizzes", "question_type")
    op.drop_column("subscription_plans", "quiz_groups_per_complexity")


def downgrade() -> None:
    op.add_column(
        "subscription_plans",
        sa.Column(
            "quiz_groups_per_complexity",
            sa.Integer(),
            nullable=False,
            server_default="1",
        ),
    )
    op.add_column(
        "study_project_quizzes",
        sa.Column("question_type", sa.String(length=60), nullable=True),
    )
    op.drop_column("study_project_quiz_options", "match_label")
