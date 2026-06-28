"""Add dynamic legal content tables.

Revision ID: 20260627_0005
Revises: 20260627_0004
Create Date: 2026-06-27
"""

from collections.abc import Sequence
from datetime import UTC, datetime
from pathlib import Path
import re
import uuid

import sqlalchemy as sa
from alembic import op

revision: str = "20260627_0005"
down_revision: str | Sequence[str] | None = "20260627_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


LEGAL_CONTENT_DIR = (
    Path(__file__).resolve().parents[3] / "frontend" / "src" / "content" / "legal"
)

DOCUMENTS = [
    ("terms_conditions", "Termeni si conditii", "terms.html"),
    ("privacy_policy", "Politica de confidentialitate", "privacy.html"),
]

DEFAULT_COMPANY_DATA = {
    "id": uuid.uuid4(),
    "name": "[DENUMIRE_FIRMA]",
    "social_location": "[SEDIU_SOCIAL]",
    "cui": "[CUI]",
    "register_number": "[NR_REGISTRUL_COMERTULUI]",
    "social_capital": "[CAPITAL_SOCIAL]",
    "email": "contact@example.com",
    "privacy_email": "privacy@example.com",
    "phone": "[TELEFON]",
    "ai_provider": "[FURNIZOR_AI]",
    "payment_provider": "[FURNIZOR_PLATI]",
    "hosting_provider": "[FURNIZOR_HOSTING]",
    "last_date_modified": datetime.now(UTC),
}


def _strip_tags(value: str) -> str:
    return re.sub(r"<[^>]+>", "", value).strip()


def _read_legal_file(file_name: str, title: str) -> str:
    try:
        return (LEGAL_CONTENT_DIR / file_name).read_text(encoding="utf-8")
    except OSError:
        return f"<article><h1>{title}</h1><p>Document in curs de configurare.</p></article>"


def _split_sections(content: str) -> list[tuple[str, str, str, int]]:
    body = re.sub(r"</?article[^>]*>", "", content, flags=re.IGNORECASE).strip()
    parts = [part.strip() for part in re.split(r"(?=<h2\b)", body) if part.strip()]
    sections: list[tuple[str, str, str, int]] = []

    for index, part in enumerate(parts):
        title_match = re.search(
            r"<h[12][^>]*>(.*?)</h[12]>",
            part,
            flags=re.IGNORECASE | re.DOTALL,
        )
        title = _strip_tags(title_match.group(1)) if title_match else "Introducere"
        section_key = "intro" if index == 0 else f"section_{index:02d}"
        sections.append((section_key, title or "Sectiune", part, index))

    return sections


def upgrade() -> None:
    op.create_table(
        "legal_documents",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("slug", sa.String(length=80), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column(
            "last_date_modified",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_legal_documents")),
        sa.UniqueConstraint("slug", name="uq_legal_documents_slug"),
    )

    op.create_table(
        "company_data",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("social_location", sa.Text(), nullable=False),
        sa.Column("cui", sa.Text(), nullable=False),
        sa.Column("register_number", sa.Text(), nullable=False),
        sa.Column("social_capital", sa.Text(), nullable=False),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("privacy_email", sa.Text(), nullable=False),
        sa.Column("phone", sa.Text(), nullable=False),
        sa.Column("ai_provider", sa.Text(), nullable=False),
        sa.Column("payment_provider", sa.Text(), nullable=False),
        sa.Column("hosting_provider", sa.Text(), nullable=False),
        sa.Column(
            "last_date_modified",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_company_data")),
    )

    op.create_table(
        "legal_document_sections",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("document_id", sa.Uuid(), nullable=False),
        sa.Column("section_key", sa.String(length=80), nullable=False),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column(
            "last_date_modified",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["document_id"],
            ["legal_documents.id"],
            name=op.f("fk_legal_document_sections_document_id_legal_documents"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_legal_document_sections")),
        sa.UniqueConstraint(
            "document_id",
            "section_key",
            name="uq_legal_document_sections_document_id_section_key",
        ),
    )
    op.create_index(
        op.f("ix_legal_document_sections_document_id"),
        "legal_document_sections",
        ["document_id"],
        unique=False,
    )

    legal_documents = sa.table(
        "legal_documents",
        sa.column("id", sa.Uuid()),
        sa.column("slug", sa.String()),
        sa.column("title", sa.String()),
        sa.column("last_date_modified", sa.DateTime(timezone=True)),
    )
    legal_document_sections = sa.table(
        "legal_document_sections",
        sa.column("id", sa.Uuid()),
        sa.column("document_id", sa.Uuid()),
        sa.column("section_key", sa.String()),
        sa.column("title", sa.String()),
        sa.column("content", sa.Text()),
        sa.column("sort_order", sa.Integer()),
        sa.column("last_date_modified", sa.DateTime(timezone=True)),
    )
    company_data = sa.table(
        "company_data",
        sa.column("id", sa.Uuid()),
        sa.column("name", sa.Text()),
        sa.column("social_location", sa.Text()),
        sa.column("cui", sa.Text()),
        sa.column("register_number", sa.Text()),
        sa.column("social_capital", sa.Text()),
        sa.column("email", sa.Text()),
        sa.column("privacy_email", sa.Text()),
        sa.column("phone", sa.Text()),
        sa.column("ai_provider", sa.Text()),
        sa.column("payment_provider", sa.Text()),
        sa.column("hosting_provider", sa.Text()),
        sa.column("last_date_modified", sa.DateTime(timezone=True)),
    )

    op.bulk_insert(company_data, [DEFAULT_COMPANY_DATA])

    now = datetime.now(UTC)
    for slug, title, file_name in DOCUMENTS:
        document_id = uuid.uuid4()
        op.bulk_insert(
            legal_documents,
            [
                {
                    "id": document_id,
                    "slug": slug,
                    "title": title,
                    "last_date_modified": now,
                }
            ],
        )

        content = _read_legal_file(file_name, title)
        op.bulk_insert(
            legal_document_sections,
            [
                {
                    "id": uuid.uuid4(),
                    "document_id": document_id,
                    "section_key": section_key,
                    "title": section_title,
                    "content": section_content,
                    "sort_order": sort_order,
                    "last_date_modified": now,
                }
                for section_key, section_title, section_content, sort_order in _split_sections(
                    content
                )
            ],
        )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_legal_document_sections_document_id"),
        table_name="legal_document_sections",
    )
    op.drop_table("legal_document_sections")
    op.drop_table("company_data")
    op.drop_table("legal_documents")
