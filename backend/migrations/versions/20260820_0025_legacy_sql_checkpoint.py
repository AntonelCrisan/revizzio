"""Legacy SQL checkpoint.

Revision ID: 20260820_0025
Revises: 20260627_0006
Create Date: 2026-08-20
"""

from collections.abc import Sequence

revision: str = "20260820_0025"
down_revision: str | Sequence[str] | None = "20260627_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Checkpoint for databases migrated by the legacy SQL files."""


def downgrade() -> None:
    raise NotImplementedError("Legacy SQL checkpoint cannot be downgraded safely.")
