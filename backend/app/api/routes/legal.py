from datetime import UTC, datetime
from pathlib import Path
import re

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.dependencies import CurrentAdminUser, DbSession
from app.models import CompanyData, LegalDocument, LegalDocumentSection
from app.schemas.legal import (
    CompanyDataResponse,
    CompanyDataUpdate,
    LegalDocumentResponse,
    LegalDocumentSectionResponse,
    LegalDocumentSectionUpdate,
)
from app.services.legal import PLACEHOLDER_KEYS, render_company_placeholders

router = APIRouter(prefix="/api/legal", tags=["legal"])

DOCUMENT_TITLES = {
    "terms_conditions": "Termeni si conditii",
    "privacy_policy": "Politica de confidentialitate",
}

DOCUMENT_FILES = {
    "terms_conditions": "terms.html",
    "privacy_policy": "privacy.html",
}

LEGAL_CONTENT_DIR = (
    Path(__file__).resolve().parents[4] / "frontend" / "src" / "content" / "legal"
)

DEFAULT_COMPANY_DATA = {
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
}


def _strip_tags(value: str) -> str:
    return re.sub(r"<[^>]+>", "", value).strip()


def _read_seed_content(slug: str) -> str:
    title = DOCUMENT_TITLES[slug]
    file_name = DOCUMENT_FILES[slug]

    try:
        return (LEGAL_CONTENT_DIR / file_name).read_text(encoding="utf-8")
    except OSError:
        return f"<article><h1>{title}</h1><p>Document in curs de configurare.</p></article>"


def _split_seed_sections(content: str) -> list[LegalDocumentSection]:
    body = re.sub(r"</?article[^>]*>", "", content, flags=re.IGNORECASE).strip()
    parts = [part.strip() for part in re.split(r"(?=<h2\b)", body) if part.strip()]
    now = datetime.now(UTC)

    if not parts:
        parts = ["<p>Document in curs de configurare.</p>"]

    sections: list[LegalDocumentSection] = []
    for index, part in enumerate(parts):
        title_match = re.search(
            r"<h[12][^>]*>(.*?)</h[12]>",
            part,
            flags=re.IGNORECASE | re.DOTALL,
        )
        title = _strip_tags(title_match.group(1)) if title_match else "Introducere"
        sections.append(
            LegalDocumentSection(
                section_key="intro" if index == 0 else f"section_{index:02d}",
                title=title or "Sectiune",
                content=part,
                sort_order=index,
                last_date_modified=now,
            )
        )

    return sections


async def _get_company_data(session: DbSession) -> CompanyData:
    company_data = await session.scalar(
        select(CompanyData).order_by(CompanyData.last_date_modified.desc())
    )
    if company_data is not None:
        return company_data

    company_data = CompanyData(**DEFAULT_COMPANY_DATA)
    session.add(company_data)
    await session.commit()
    await session.refresh(company_data)
    return company_data


async def _get_document(session: DbSession, slug: str) -> LegalDocument:
    if slug not in DOCUMENT_TITLES:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documentul legal nu exista.",
        )

    document = await session.scalar(
        select(LegalDocument)
        .options(selectinload(LegalDocument.sections))
        .where(LegalDocument.slug == slug)
    )
    if document is not None:
        return document

    now = datetime.now(UTC)
    document = LegalDocument(
        slug=slug,
        title=DOCUMENT_TITLES[slug],
        last_date_modified=now,
    )
    document.sections = _split_seed_sections(_read_seed_content(slug))

    session.add(document)
    await session.commit()

    document = await session.scalar(
        select(LegalDocument)
        .options(selectinload(LegalDocument.sections))
        .where(LegalDocument.slug == slug)
    )
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documentul legal nu a putut fi initializat.",
        )
    return document


def _document_response(
    document: LegalDocument,
    company_data: CompanyData,
) -> LegalDocumentResponse:
    sections = sorted(document.sections, key=lambda section: section.sort_order)
    content_html = "\n".join(section.content for section in sections)
    rendered_sections = [
        LegalDocumentSectionResponse(
            id=section.id,
            section_key=section.section_key,
            title=section.title,
            content=section.content,
            rendered_content=render_company_placeholders(
                section.content,
                company_data,
                last_date_modified=document.last_date_modified,
            ),
            sort_order=section.sort_order,
            last_date_modified=section.last_date_modified,
        )
        for section in sections
    ]

    return LegalDocumentResponse(
        id=document.id,
        slug=document.slug,
        title=document.title,
        content_html=f"<article>\n{content_html}\n</article>",
        rendered_content_html=(
            "<article>\n"
            + "\n".join(section.rendered_content for section in rendered_sections)
            + "\n</article>"
        ),
        last_date_modified=document.last_date_modified,
        sections=rendered_sections,
        available_variables=[f"{{{key}}}" for key in PLACEHOLDER_KEYS],
    )


@router.get("/company-data", response_model=CompanyDataResponse)
async def get_company_data(session: DbSession) -> CompanyDataResponse:
    company_data = await _get_company_data(session)
    return CompanyDataResponse.model_validate(company_data)


@router.get("/documents/{slug}", response_model=LegalDocumentResponse)
async def get_legal_document(
    slug: str,
    session: DbSession,
) -> LegalDocumentResponse:
    document = await _get_document(session, slug)
    company_data = await _get_company_data(session)
    return _document_response(document, company_data)


@router.get("/admin/company-data", response_model=CompanyDataResponse)
async def get_admin_company_data(
    _: CurrentAdminUser,
    session: DbSession,
) -> CompanyDataResponse:
    company_data = await _get_company_data(session)
    return CompanyDataResponse.model_validate(company_data)


@router.put("/admin/company-data", response_model=CompanyDataResponse)
async def update_admin_company_data(
    payload: CompanyDataUpdate,
    _: CurrentAdminUser,
    session: DbSession,
) -> CompanyDataResponse:
    company_data = await _get_company_data(session)
    for field, value in payload.model_dump().items():
        setattr(company_data, field, str(value))
    company_data.last_date_modified = datetime.now(UTC)
    await session.commit()
    await session.refresh(company_data)
    return CompanyDataResponse.model_validate(company_data)


@router.get("/admin/documents/{slug}", response_model=LegalDocumentResponse)
async def get_admin_legal_document(
    slug: str,
    _: CurrentAdminUser,
    session: DbSession,
) -> LegalDocumentResponse:
    document = await _get_document(session, slug)
    company_data = await _get_company_data(session)
    return _document_response(document, company_data)


@router.patch(
    "/admin/documents/{slug}/sections/{section_key}",
    response_model=LegalDocumentResponse,
)
async def update_admin_legal_document_section(
    slug: str,
    section_key: str,
    payload: LegalDocumentSectionUpdate,
    _: CurrentAdminUser,
    session: DbSession,
) -> LegalDocumentResponse:
    document = await _get_document(session, slug)
    section = next(
        (
            current_section
            for current_section in document.sections
            if current_section.section_key == section_key
        ),
        None,
    )
    if section is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sectiunea legala nu exista.",
        )

    section.title = payload.title
    section.content = payload.content
    section.last_date_modified = datetime.now(UTC)
    document.last_date_modified = datetime.now(UTC)
    await session.commit()
    await session.refresh(document)

    document = await _get_document(session, slug)
    company_data = await _get_company_data(session)
    return _document_response(document, company_data)
