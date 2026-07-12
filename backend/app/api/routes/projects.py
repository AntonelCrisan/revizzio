import uuid
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from app.api.dependencies import AppSettings, CurrentUser, DbSession
from app.schemas.projects import (
    StudyProjectImportResponse,
    StudyProjectPrepareResponse,
    StudyProjectQuizMistakeFlashcardCreate,
    StudyProjectResponse,
)
from app.services.projects import (
    ProjectConversionError,
    ProjectNotFoundError,
    ProjectValidationError,
    StudyProjectService,
)

router = APIRouter(prefix="/api/projects", tags=["projects"])


def _service(session: DbSession, settings: AppSettings) -> StudyProjectService:
    return StudyProjectService(session, settings)


@router.get("/", response_model=list[StudyProjectResponse])
async def list_projects(
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> list[StudyProjectResponse]:
    service = _service(session, settings)
    projects = await service.list_projects(current_user)
    return [service.to_response(project) for project in projects]


@router.post("/prepare", response_model=StudyProjectPrepareResponse)
async def prepare_project(
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
    name: Annotated[str, Form(min_length=2, max_length=160)],
    subject_name: Annotated[str, Form(min_length=2, max_length=160)],
    institution_name: Annotated[str, Form(min_length=2, max_length=220)],
    material_rights_confirmed: Annotated[bool, Form()],
    files: Annotated[list[UploadFile], File()],
) -> StudyProjectPrepareResponse:
    service = _service(session, settings)
    try:
        project = await service.prepare_project(
            user=current_user,
            name=name,
            subject_name=subject_name,
            institution_name=institution_name,
            material_rights_confirmed=material_rights_confirmed,
            uploads=files,
        )
    except ProjectValidationError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except ProjectConversionError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    project_response = service.to_response(project)
    if (
        project_response.markdown_download_url is None
        or project_response.prompt_download_url is None
    ):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Fisierele proiectului nu au putut fi pregatite.",
        )

    return StudyProjectPrepareResponse(
        project=project_response,
        markdown_download_url=project_response.markdown_download_url,
        prompt_download_url=project_response.prompt_download_url,
        next_step=(
            "Descarca markdown-ul si promptul, incarca-le in ChatGPT, apoi "
            "revino cu JSON-ul generat."
        ),
    )


@router.get("/{project_id}", response_model=StudyProjectResponse)
async def get_project(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> StudyProjectResponse:
    service = _service(session, settings)
    try:
        project = await service.get_project(current_user, project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proiectul nu a fost gasit.",
        ) from exc
    return service.to_response(project)


@router.post("/{project_id}/import-json", response_model=StudyProjectImportResponse)
async def import_project_json(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
    file: Annotated[UploadFile, File()],
) -> StudyProjectImportResponse:
    service = _service(session, settings)
    try:
        project = await service.import_ai_json(
            user=current_user,
            project_id=project_id,
            upload=file,
        )
    except ProjectNotFoundError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proiectul nu a fost gasit.",
        ) from exc
    except ProjectValidationError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return StudyProjectImportResponse(
        project=service.to_response(project),
        imported=True,
        message="JSON-ul a fost importat si proiectul este gata.",
    )


@router.post(
    "/{project_id}/quiz-mistake-flashcards",
    response_model=StudyProjectResponse,
)
async def create_quiz_mistake_flashcard(
    project_id: uuid.UUID,
    payload: StudyProjectQuizMistakeFlashcardCreate,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> StudyProjectResponse:
    service = _service(session, settings)
    try:
        project = await service.create_quiz_mistake_flashcard(
            user=current_user,
            project_id=project_id,
            question_id=payload.question_id,
        )
    except ProjectNotFoundError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Intrebarea nu a fost gasita.",
        ) from exc

    return service.to_response(project)


@router.get("/{project_id}/markdown")
async def download_project_markdown(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> FileResponse:
    service = _service(session, settings)
    try:
        project = await service.get_project(current_user, project_id)
        path = service.download_path(project, "markdown")
    except ProjectNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fisierul nu a fost gasit.",
        ) from exc

    return FileResponse(
        path,
        media_type="text/markdown; charset=utf-8",
        filename=f"{project.slug}-material.md",
    )


@router.get("/{project_id}/prompt")
async def download_project_prompt(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> FileResponse:
    service = _service(session, settings)
    try:
        project = await service.get_project(current_user, project_id)
        path = service.download_path(project, "prompt")
    except ProjectNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fisierul nu a fost gasit.",
        ) from exc

    return FileResponse(
        path,
        media_type="text/plain; charset=utf-8",
        filename=f"{project.slug}-prompt.txt",
    )
