import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status
from fastapi import Path as ApiPath
from fastapi.responses import FileResponse
from sqlalchemy import or_, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import selectinload

from app.api.dependencies import AppSettings, CurrentAdminUser, DbSession
from app.models import ContentReport, ContentReportAttachment
from app.schemas.admin_content_reports import (
    AdminContentReportResponse,
    ContentReportType,
)

router = APIRouter(
    prefix="/api/admin/content-reports",
    tags=["admin-content-reports"],
)


@router.get("/", response_model=list[AdminContentReportResponse])
async def get_admin_content_reports(
    _: CurrentAdminUser,
    session: DbSession,
    report_type: Annotated[ContentReportType | None, Query()] = None,
    search: Annotated[str | None, Query(max_length=400)] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 200,
) -> list[AdminContentReportResponse]:
    query = (
        select(ContentReport)
        .options(selectinload(ContentReport.attachments))
        .order_by(ContentReport.created_at.desc(), ContentReport.id.asc())
        .limit(limit)
    )

    if report_type:
        query = query.where(ContentReport.report_type == report_type)

    normalized_search = search.strip() if search else ""
    if normalized_search:
        search_pattern = f"%{normalized_search}%"
        query = query.where(
            or_(
                ContentReport.registration_number.ilike(search_pattern),
                ContentReport.name.ilike(search_pattern),
                ContentReport.email.ilike(search_pattern),
                ContentReport.content_reference.ilike(search_pattern),
                ContentReport.description.ilike(search_pattern),
                ContentReport.rights_evidence.ilike(search_pattern),
            )
        )

    try:
        reports = list((await session.scalars(query)).all())
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Raportările de conținut nu pot fi încărcate momentan. "
                "Baza de date trebuie actualizată pentru documentele atașate."
            ),
        ) from exc
    return [AdminContentReportResponse.model_validate(item) for item in reports]


def _safe_attachment_path(
    storage_path: str,
    settings: AppSettings,
) -> Path:
    storage_root = settings.content_report_storage_dir.resolve()
    attachment_path = Path(storage_path).resolve()
    if storage_root != attachment_path and storage_root not in attachment_path.parents:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documentul nu există.",
        )
    if not attachment_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documentul nu există.",
        )
    return attachment_path


@router.get(
    "/{report_id}/attachments/{attachment_id}/download",
    response_class=FileResponse,
)
async def download_content_report_attachment(
    _: CurrentAdminUser,
    session: DbSession,
    settings: AppSettings,
    report_id: Annotated[uuid.UUID, ApiPath()],
    attachment_id: Annotated[uuid.UUID, ApiPath()],
) -> FileResponse:
    try:
        attachment = await session.scalar(
            select(ContentReportAttachment).where(
                ContentReportAttachment.id == attachment_id,
                ContentReportAttachment.report_id == report_id,
            )
        )
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Documentul nu poate fi descărcat momentan. "
                "Baza de date trebuie actualizată pentru documentele atașate."
            ),
        ) from exc
    if attachment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documentul nu există.",
        )

    return FileResponse(
        path=_safe_attachment_path(attachment.storage_path, settings),
        media_type=attachment.content_type or "application/octet-stream",
        filename=attachment.original_filename,
    )
