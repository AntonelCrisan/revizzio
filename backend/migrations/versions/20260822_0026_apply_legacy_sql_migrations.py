"""Apply SQL-only migrations.

Revision ID: 20260822_0026
Revises: 20260627_0006
Create Date: 2026-08-22
"""

from collections.abc import Sequence
from pathlib import Path

from alembic import op

revision: str = "20260822_0026"
down_revision: str | Sequence[str] | None = "20260627_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SQL_MIGRATIONS = [
    "20260629_0007_add_audit_logs.sql",
    "20260630_0008_add_email_auth_tokens.sql",
    "20260704_0009_add_stripe_subscriptions.sql",
    "20260704_0010_add_subscription_invoices.sql",
    "20260711_0011_add_study_projects.sql",
    "20260711_0012_add_project_academic_context.sql",
    "20260711_0013_add_quiz_mistake_flashcards.sql",
    "20260712_0014_add_study_project_archives.sql",
    "20260712_0015_add_manual_flashcard_images.sql",
    "20260712_0016_add_summary_highlights.sql",
    "20260712_0017_add_quiz_completion.sql",
    "20260713_0018_add_quiz_attempt_history.sql",
    "20260713_0019_add_flashcard_review.sql",
    "20260713_0020_add_summary_notes.sql",
    "20260819_0021_add_invoice_email_tracking.sql",
    "20260819_0022_add_openai_project_generation_jobs.sql",
    "20260819_0023_add_subscription_plan_limits.sql",
    "20260819_0024_add_scanned_document_plan_limit.sql",
    "20260820_0025_add_user_language_preference.sql",
]


def _strip_line_comments(sql: str) -> str:
    return "\n".join(
        line for line in sql.splitlines() if not line.lstrip().startswith("--")
    )


def _match_dollar_quote(sql: str, index: int) -> str | None:
    if sql[index] != "$":
        return None

    end = sql.find("$", index + 1)
    if end == -1:
        return None

    tag = sql[index : end + 1]
    if tag == "$$" or tag[1:-1].replace("_", "").isalnum():
        return tag
    return None


def _split_sql_statements(sql: str) -> list[str]:
    statements: list[str] = []
    current: list[str] = []
    index = 0
    quote: str | None = None
    dollar_quote: str | None = None

    while index < len(sql):
        char = sql[index]

        if dollar_quote is not None:
            if sql.startswith(dollar_quote, index):
                current.append(dollar_quote)
                index += len(dollar_quote)
                dollar_quote = None
                continue
            current.append(char)
            index += 1
            continue

        if quote is not None:
            current.append(char)
            if char == quote:
                next_char = sql[index + 1] if index + 1 < len(sql) else ""
                if next_char == quote:
                    current.append(next_char)
                    index += 2
                    continue
                quote = None
            index += 1
            continue

        if char in {"'", '"'}:
            quote = char
            current.append(char)
            index += 1
            continue

        if char == "$":
            tag = _match_dollar_quote(sql, index)
            if tag is not None:
                dollar_quote = tag
                current.append(tag)
                index += len(tag)
                continue

        if char == ";":
            statement = "".join(current).strip()
            if statement:
                statements.append(statement)
            current = []
            index += 1
            continue

        current.append(char)
        index += 1

    statement = "".join(current).strip()
    if statement:
        statements.append(statement)
    return statements


def _should_skip_statement(statement: str) -> bool:
    normalized = " ".join(statement.upper().split())
    return normalized in {"BEGIN", "COMMIT"} or "ALEMBIC_VERSION" in normalized


def upgrade() -> None:
    connection = op.get_bind()
    sql_dir = Path(__file__).resolve().parents[1] / "sql"

    for migration_name in SQL_MIGRATIONS:
        migration_sql = (sql_dir / migration_name).read_text(encoding="utf-8")
        for statement in _split_sql_statements(_strip_line_comments(migration_sql)):
            if not _should_skip_statement(statement):
                connection.exec_driver_sql(statement)


def downgrade() -> None:
    raise NotImplementedError("SQL-only migrations cannot be downgraded safely.")
