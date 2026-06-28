"""Add user role.

Revision ID: 20260627_0004
Revises: 20260624_0003
Create Date: 2026-06-27
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260627_0004"
down_revision: str | Sequence[str] | None = "20260624_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE users
            ADD COLUMN IF NOT EXISTS role VARCHAR(16);
        """
    )
    op.execute(
        """
        ALTER TABLE users
            ALTER COLUMN role TYPE VARCHAR(16)
            USING LOWER(TRIM(role::text))::VARCHAR(16);
        """
    )
    op.execute("UPDATE users SET role = LOWER(TRIM(role)) WHERE role IS NOT NULL;")
    op.execute(
        """
        UPDATE users
        SET role = 'user'
        WHERE role IS NULL OR role NOT IN ('admin', 'user');
        """
    )
    op.execute("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user';")
    op.execute("ALTER TABLE users ALTER COLUMN role SET NOT NULL;")
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'ck_users_role'
            ) THEN
                ALTER TABLE users
                    ADD CONSTRAINT ck_users_role
                    CHECK (role IN ('admin', 'user'));
            END IF;
        END
        $$;
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_users_role;")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS role;")
