import logging
import uuid
from typing import Annotated
from urllib.parse import urlparse

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse, Response
from starlette.datastructures import UploadFile as StarletteUploadFile

from app.api.dependencies import AppSettings, CurrentUser, DbSession
from app.core.rate_limit import _memory_rate_limit_buckets, consume_rate_limit
from app.schemas.projects import (
    AccountWipeResponse,
    StudyProjectAiSelectionExplainRequest,
    StudyProjectAiSelectionExplainResponse,
    StudyProjectChatRequest,
    StudyProjectChatResponse,
    StudyProjectFlashcardAiSelectionExplainRequest,
    StudyProjectFlashcardReviewUpdate,
    StudyProjectImportResponse,
    StudyProjectPrepareResponse,
    StudyProjectQuizCompletionCreate,
    StudyProjectQuizMistakeFlashcardCreate,
    StudyProjectRenameRequest,
    StudyProjectResponse,
    StudyProjectSummaryHighlightColorUpdate,
    StudyProjectSummaryHighlightCreate,
    StudyProjectSummaryNoteCreate,
    StudyProjectSummaryNoteUpdate,
)
from app.services.openai_generation import OpenAIGenerationError
from app.services.plan_errors import PlanLimitError
from app.services.projects import (
    ProjectConversionError,
    ProjectNotFoundError,
    ProjectValidationError,
    StudyProjectService,
    cancel_generation_task,
    schedule_quiz_pack_generation_task,
    schedule_study_pack_generation_task,
)

logger = logging.getLogger("revizzio.projects")

AI_RATE_LIMIT_WINDOW_SECONDS = 60
AI_RATE_LIMIT_MAX_REQUESTS = 12
_ai_rate_limit_buckets = _memory_rate_limit_buckets

PROJECT_RATE_LIMIT_WINDOW_SECONDS = 60
PROJECT_RATE_LIMIT_POLICIES = {
    "prepare": 4,
    "generate-quizzes": 4,
    "import-json": 4,
    "manage": 30,
    "flashcards": 20,
    "study-actions": 80,
    "privacy-wipe": 3,
}
_project_rate_limit_buckets = _memory_rate_limit_buckets
_TRUE_FORM_VALUES = {"1", "true", "t", "yes", "y", "on"}
_FALSE_FORM_VALUES = {"0", "false", "f", "no", "n", "off"}
_GENERATION_LANGUAGE_VALUES = {"ro", "en", "fr"}


def _request_origin(request: Request) -> str | None:
    origin = request.headers.get("origin")
    if origin:
        return origin.rstrip("/")

    referer = request.headers.get("referer")
    if not referer:
        return None

    parsed_referer = urlparse(referer)
    if not parsed_referer.scheme or not parsed_referer.netloc:
        return None
    return f"{parsed_referer.scheme}://{parsed_referer.netloc}"


def _protect_state_changing_request(
    request: Request,
    settings: AppSettings,
) -> None:
    if request.method in {"GET", "HEAD", "OPTIONS"}:
        return

    origin = _request_origin(request)
    if origin is None:
        return

    if origin not in {allowed.rstrip("/") for allowed in settings.allowed_origins}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cererea nu a putut fi verificata.",
        )


router = APIRouter(
    prefix="/api/projects",
    tags=["projects"],
    dependencies=[Depends(_protect_state_changing_request)],
)


def _service(session: DbSession, settings: AppSettings) -> StudyProjectService:
    return StudyProjectService(session, settings)


async def _consume_rate_limit_bucket(
    *,
    bucket_key: str,
    max_requests: int,
    window_seconds: int,
    error_message: str,
) -> None:
    await consume_rate_limit(
        bucket_key=f"projects:{bucket_key}",
        max_requests=max_requests,
        window_seconds=window_seconds,
        error_message=error_message,
    )


async def _enforce_ai_rate_limit(current_user: CurrentUser) -> None:
    await _consume_rate_limit_bucket(
        bucket_key=f"{current_user.id}:project-ai",
        max_requests=AI_RATE_LIMIT_MAX_REQUESTS,
        window_seconds=AI_RATE_LIMIT_WINDOW_SECONDS,
        error_message="Prea multe solicitari AI. Incearca din nou peste putin timp.",
    )


async def _enforce_project_rate_limit(current_user: CurrentUser, action: str) -> None:
    await _consume_rate_limit_bucket(
        bucket_key=f"{current_user.id}:{action}",
        max_requests=PROJECT_RATE_LIMIT_POLICIES[action],
        window_seconds=PROJECT_RATE_LIMIT_WINDOW_SECONDS,
        error_message=(
            "Prea multe actiuni pe proiecte. Incearca din nou peste putin timp."
        ),
    )


def _raise_prepare_form_error(field: str, message: str) -> None:
    logger.warning("Project prepare form validation failed: %s - %s", field, message)
    raise HTTPException(
        status_code=422,
        detail=[{"loc": ["body", field], "msg": message}],
    )


def _prepare_form_text(
    form: object,
    field: str,
    *,
    min_length: int,
    max_length: int,
) -> str:
    value = form.get(field)  # type: ignore[attr-defined]
    if value is None or isinstance(value, StarletteUploadFile):
        _raise_prepare_form_error(field, "Camp obligatoriu lipsa.")

    text = str(value).strip()
    if len(text) < min_length:
        _raise_prepare_form_error(
            field,
            f"Trebuie sa contina cel putin {min_length} caractere.",
        )
    if len(text) > max_length:
        _raise_prepare_form_error(
            field,
            f"Trebuie sa contina cel mult {max_length} caractere.",
        )
    return text


def _prepare_form_bool(form: object, field: str) -> bool:
    value = form.get(field)  # type: ignore[attr-defined]
    if value is None or isinstance(value, StarletteUploadFile):
        _raise_prepare_form_error(field, "Camp obligatoriu lipsa.")

    normalized = str(value).strip().lower()
    if normalized in _TRUE_FORM_VALUES:
        return True
    if normalized in _FALSE_FORM_VALUES:
        return False

    _raise_prepare_form_error(field, "Valoare boolean invalida.")
    return False


def _prepare_form_uploads(form: object) -> list[UploadFile]:
    uploads: list[UploadFile] = []
    for field in ("files", "file", "files[]"):
        for value in form.getlist(field):  # type: ignore[attr-defined]
            if isinstance(value, StarletteUploadFile) and value.filename:
                uploads.append(value)  # type: ignore[arg-type]

    if not uploads:
        _raise_prepare_form_error("files", "Incarca cel putin un fisier.")

    return uploads


def _prepare_form_optional_generation_language(form: object) -> str | None:
    value = form.get("generation_language")  # type: ignore[attr-defined]
    if value is None:
        value = form.get("language_preference")  # type: ignore[attr-defined]
    if value is None:
        return None
    if isinstance(value, StarletteUploadFile):
        _raise_prepare_form_error("generation_language", "Valoare invalida.")

    normalized = str(value).strip().lower()
    if normalized in _GENERATION_LANGUAGE_VALUES:
        return normalized

    _raise_prepare_form_error("generation_language", "Limba selectata nu este valida.")
    return None


async def _parse_prepare_project_form(
    request: Request,
) -> tuple[str, str, str, bool, list[UploadFile], str | None]:
    try:
        form = await request.form()
    except Exception as exc:
        logger.warning(
            "Project prepare multipart parsing failed: content_type=%s error=%s",
            request.headers.get("content-type"),
            exc,
        )
        raise HTTPException(
            status_code=422,
            detail=[
                {
                    "loc": ["body", "form"],
                    "msg": "Formular multipart invalid sau incomplet.",
                }
            ],
        ) from exc

    form_keys = list(form.keys())
    upload_names = [
        value.filename
        for field in ("files", "file", "files[]")
        for value in form.getlist(field)
        if isinstance(value, StarletteUploadFile)
    ]
    logger.info(
        "Project prepare form received: content_type=%s keys=%s files=%s",
        request.headers.get("content-type"),
        form_keys,
        upload_names,
    )

    return (
        _prepare_form_text(form, "name", min_length=2, max_length=160),
        _prepare_form_text(form, "subject_name", min_length=2, max_length=160),
        _prepare_form_text(
            form,
            "institution_name",
            min_length=2,
            max_length=220,
        ),
        _prepare_form_bool(form, "material_rights_confirmed"),
        _prepare_form_uploads(form),
        _prepare_form_optional_generation_language(form),
    )


@router.get("/", response_model=list[StudyProjectResponse])
async def list_projects(
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> list[StudyProjectResponse]:
    service = _service(session, settings)
    projects = await service.list_projects(current_user)
    return [service.to_response(project) for project in projects]


@router.get("/archived", response_model=list[StudyProjectResponse])
async def list_archived_projects(
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> list[StudyProjectResponse]:
    service = _service(session, settings)
    projects = await service.list_archived_projects(current_user)
    return [service.to_response(project) for project in projects]


@router.post("/materials/delete-all", response_model=AccountWipeResponse)
async def delete_all_materials(
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> AccountWipeResponse:
    await _enforce_project_rate_limit(current_user, "privacy-wipe")
    service = _service(session, settings)
    deleted_count = await service.delete_all_materials(current_user)
    return AccountWipeResponse(
        deleted_count=deleted_count,
        message="Materialele încărcate au fost șterse din toate proiectele.",
    )


@router.post("/flashcards/delete-all", response_model=AccountWipeResponse)
async def delete_all_flashcards(
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> AccountWipeResponse:
    await _enforce_project_rate_limit(current_user, "privacy-wipe")
    service = _service(session, settings)
    deleted_count = await service.delete_all_flashcards(current_user)
    return AccountWipeResponse(
        deleted_count=deleted_count,
        message="Flashcard-urile au fost șterse din toate proiectele.",
    )


@router.post("/prepare", response_model=StudyProjectPrepareResponse)
async def prepare_project(
    request: Request,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> StudyProjectPrepareResponse:
    (
        name,
        subject_name,
        institution_name,
        material_rights_confirmed,
        files,
        generation_language,
    ) = await _parse_prepare_project_form(request)
    await _enforce_project_rate_limit(current_user, "prepare")
    service = _service(session, settings)
    try:
        project = await service.prepare_project(
            user=current_user,
            name=name,
            subject_name=subject_name,
            institution_name=institution_name,
            material_rights_confirmed=material_rights_confirmed,
            uploads=files,
            generation_language=generation_language,
        )
    except PlanLimitError as exc:
        await session.rollback()
        logger.warning("Project prepare plan limit reached: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": exc.code, "message": str(exc)},
        ) from exc
    except ProjectValidationError as exc:
        await session.rollback()
        logger.warning("Project prepare validation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except ProjectConversionError as exc:
        await session.rollback()
        logger.warning("Project prepare conversion failed: %s", exc)
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        await session.rollback()
        logger.exception("Project prepare failed with an unexpected error.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Proiectul nu a putut fi pregatit momentan.",
        ) from exc

    if await request.is_disconnected():
        await service.delete_project(user=current_user, project_id=project.id)
        raise HTTPException(
            status_code=499,
            detail="Generarea proiectului a fost anulata.",
        )

    schedule_study_pack_generation_task(
        user_id=current_user.id,
        project_id=project.id,
        settings=settings,
    )

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
        next_step="Generam automat pachetul de studiu.",
    )


@router.post("/{project_id}/generate-quizzes", response_model=StudyProjectResponse)
async def generate_project_quizzes(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> StudyProjectResponse:
    await _enforce_project_rate_limit(current_user, "generate-quizzes")
    service = _service(session, settings)
    try:
        project = await service.start_quiz_generation(
            user=current_user,
            project_id=project_id,
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

    if project.status == "generating_quizzes":
        schedule_quiz_pack_generation_task(
            user_id=current_user.id,
            project_id=project.id,
            settings=settings,
        )

    return service.to_response(project)


@router.post("/{project_id}/cancel-generation", response_model=StudyProjectResponse)
async def cancel_project_generation(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> StudyProjectResponse:
    await _enforce_project_rate_limit(current_user, "manage")
    service = _service(session, settings)
    try:
        project = await service.cancel_project_generation(
            user=current_user,
            project_id=project_id,
        )
    except ProjectNotFoundError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proiectul nu a fost gasit.",
        ) from exc

    cancel_generation_task(project_id)
    return service.to_response(project)


@router.post(
    "/{project_id}/ai/explain-selection",
    response_model=StudyProjectAiSelectionExplainResponse,
)
async def explain_project_summary_selection(
    project_id: uuid.UUID,
    payload: StudyProjectAiSelectionExplainRequest,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> StudyProjectAiSelectionExplainResponse:
    await _enforce_ai_rate_limit(current_user)
    service = _service(session, settings)
    try:
        explanation = await service.explain_summary_selection(
            user=current_user,
            project_id=project_id,
            paragraph_index=payload.paragraph_index,
            selected_text=payload.selected_text,
        )
    except PlanLimitError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": exc.code, "message": str(exc)},
        ) from exc
    except ProjectNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proiectul nu a fost gasit.",
        ) from exc
    except ProjectValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except OpenAIGenerationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Explicatia nu a putut fi generata momentan.",
        ) from exc

    return StudyProjectAiSelectionExplainResponse.model_validate(explanation)


@router.post(
    "/{project_id}/ai/chat",
    response_model=StudyProjectChatResponse,
)
async def chat_with_project_ai(
    project_id: uuid.UUID,
    payload: StudyProjectChatRequest,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> StudyProjectChatResponse:
    await _enforce_ai_rate_limit(current_user)
    service = _service(session, settings)
    try:
        answer = await service.chat_with_project_ai(
            user=current_user,
            project_id=project_id,
            message=payload.message,
            history=[
                {"role": item.role, "text": item.text} for item in payload.history
            ],
            conversation_summary=payload.conversation_summary,
        )
    except PlanLimitError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": exc.code, "message": str(exc)},
        ) from exc
    except ProjectNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proiectul nu a fost gasit.",
        ) from exc
    except ProjectValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except OpenAIGenerationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Raspunsul nu a putut fi generat momentan.",
        ) from exc

    return StudyProjectChatResponse(answer=answer)


@router.post(
    "/{project_id}/ai/explain-flashcard-selection",
    response_model=StudyProjectAiSelectionExplainResponse,
)
async def explain_project_flashcard_selection(
    project_id: uuid.UUID,
    payload: StudyProjectFlashcardAiSelectionExplainRequest,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> StudyProjectAiSelectionExplainResponse:
    await _enforce_ai_rate_limit(current_user)
    service = _service(session, settings)
    try:
        explanation = await service.explain_flashcard_selection(
            user=current_user,
            project_id=project_id,
            flashcard_id=payload.flashcard_id,
            side=payload.side,
            selected_text=payload.selected_text,
        )
    except PlanLimitError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": exc.code, "message": str(exc)},
        ) from exc
    except ProjectNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flashcardul nu a fost gasit.",
        ) from exc
    except ProjectValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except OpenAIGenerationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Explicatia nu a putut fi generata momentan.",
        ) from exc

    return StudyProjectAiSelectionExplainResponse.model_validate(explanation)


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


@router.patch("/{project_id}", response_model=StudyProjectResponse)
async def rename_project(
    project_id: uuid.UUID,
    payload: StudyProjectRenameRequest,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> StudyProjectResponse:
    await _enforce_project_rate_limit(current_user, "manage")
    service = _service(session, settings)
    try:
        project = await service.rename_project(
            user=current_user,
            project_id=project_id,
            name=payload.name,
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

    return service.to_response(project)


@router.post("/{project_id}/archive", response_model=StudyProjectResponse)
async def archive_project(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> StudyProjectResponse:
    await _enforce_project_rate_limit(current_user, "manage")
    service = _service(session, settings)
    try:
        project = await service.archive_project(
            user=current_user,
            project_id=project_id,
        )
    except ProjectNotFoundError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proiectul nu a fost gasit.",
        ) from exc

    return service.to_response(project)


@router.post("/{project_id}/restore", response_model=StudyProjectResponse)
async def restore_project(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> StudyProjectResponse:
    await _enforce_project_rate_limit(current_user, "manage")
    service = _service(session, settings)
    try:
        project = await service.restore_project(
            user=current_user,
            project_id=project_id,
        )
    except ProjectNotFoundError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proiectul arhivat nu a fost gasit.",
        ) from exc

    return service.to_response(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> None:
    await _enforce_project_rate_limit(current_user, "manage")
    service = _service(session, settings)
    try:
        await service.delete_project(
            user=current_user,
            project_id=project_id,
        )
    except ProjectNotFoundError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proiectul nu a fost gasit.",
        ) from exc


@router.post("/{project_id}/import-json", response_model=StudyProjectImportResponse)
async def import_project_json(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
    file: Annotated[UploadFile, File()],
) -> StudyProjectImportResponse:
    await _enforce_project_rate_limit(current_user, "import-json")
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
    await _enforce_project_rate_limit(current_user, "study-actions")
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


@router.post(
    "/{project_id}/quizzes/{quiz_id}/complete",
    response_model=StudyProjectResponse,
)
async def complete_quiz(
    project_id: uuid.UUID,
    quiz_id: uuid.UUID,
    payload: StudyProjectQuizCompletionCreate,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> StudyProjectResponse:
    await _enforce_project_rate_limit(current_user, "study-actions")
    service = _service(session, settings)
    try:
        project = await service.complete_quiz(
            user=current_user,
            project_id=project_id,
            quiz_id=quiz_id,
            correct_count=payload.correct_count,
            answered_count=payload.answered_count,
        )
    except ProjectNotFoundError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz-ul nu a fost gasit.",
        ) from exc
    except ProjectValidationError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return service.to_response(project)


@router.post("/{project_id}/flashcards", response_model=StudyProjectResponse)
async def create_manual_flashcard(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
    back: Annotated[str, Form(min_length=1, max_length=8000)],
    front: Annotated[str | None, Form(max_length=8000)] = None,
    category: Annotated[str | None, Form(max_length=120)] = None,
    difficulty: Annotated[str | None, Form(max_length=40)] = None,
    front_image: Annotated[UploadFile | None, File()] = None,
) -> StudyProjectResponse:
    await _enforce_project_rate_limit(current_user, "flashcards")
    service = _service(session, settings)
    try:
        project = await service.create_manual_flashcard(
            user=current_user,
            project_id=project_id,
            front=front,
            back=back,
            category=category,
            difficulty=difficulty,
            front_image=front_image,
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

    return service.to_response(project)


@router.get("/{project_id}/flashcards/{flashcard_id}/front-image")
async def download_flashcard_front_image(
    project_id: uuid.UUID,
    flashcard_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> FileResponse:
    service = _service(session, settings)
    try:
        image_path, media_type = await service.flashcard_front_image_path(
            user=current_user,
            project_id=project_id,
            flashcard_id=flashcard_id,
        )
    except ProjectNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Imaginea nu a fost gasita.",
        ) from exc

    return FileResponse(
        image_path,
        media_type=media_type,
        filename=image_path.name,
    )


@router.patch(
    "/{project_id}/flashcards/{flashcard_id}/review",
    response_model=StudyProjectResponse,
)
async def update_flashcard_review(
    project_id: uuid.UUID,
    flashcard_id: uuid.UUID,
    payload: StudyProjectFlashcardReviewUpdate,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> StudyProjectResponse:
    await _enforce_project_rate_limit(current_user, "study-actions")
    service = _service(session, settings)
    try:
        project = await service.set_flashcard_review(
            user=current_user,
            project_id=project_id,
            flashcard_id=flashcard_id,
            review=payload.review,
        )
    except ProjectNotFoundError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flashcardul nu a fost gasit.",
        ) from exc

    return service.to_response(project)


@router.post(
    "/{project_id}/summary-highlights",
    response_model=StudyProjectResponse,
)
async def create_summary_highlight(
    project_id: uuid.UUID,
    payload: StudyProjectSummaryHighlightCreate,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> StudyProjectResponse:
    await _enforce_project_rate_limit(current_user, "study-actions")
    service = _service(session, settings)
    try:
        project = await service.add_summary_highlight(
            user=current_user,
            project_id=project_id,
            paragraph_index=payload.paragraph_index,
            text=payload.text,
            color=payload.color,
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

    return service.to_response(project)


@router.patch(
    "/{project_id}/summary-highlights/{highlight_id}",
    response_model=StudyProjectResponse,
)
async def update_summary_highlight(
    project_id: uuid.UUID,
    highlight_id: uuid.UUID,
    payload: StudyProjectSummaryHighlightColorUpdate,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> StudyProjectResponse:
    await _enforce_project_rate_limit(current_user, "study-actions")
    service = _service(session, settings)
    try:
        project = await service.update_summary_highlight_color(
            user=current_user,
            project_id=project_id,
            highlight_id=highlight_id,
            color=payload.color,
        )
    except ProjectNotFoundError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Highlight-ul nu a fost gasit.",
        ) from exc

    return service.to_response(project)


@router.delete(
    "/{project_id}/summary-highlights/{highlight_id}",
    response_model=StudyProjectResponse,
)
async def delete_summary_highlight(
    project_id: uuid.UUID,
    highlight_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> StudyProjectResponse:
    await _enforce_project_rate_limit(current_user, "study-actions")
    service = _service(session, settings)
    try:
        project = await service.delete_summary_highlight(
            user=current_user,
            project_id=project_id,
            highlight_id=highlight_id,
        )
    except ProjectNotFoundError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Highlight-ul nu a fost gasit.",
        ) from exc

    return service.to_response(project)


@router.post(
    "/{project_id}/summary-notes",
    response_model=StudyProjectResponse,
)
async def create_summary_note(
    project_id: uuid.UUID,
    payload: StudyProjectSummaryNoteCreate,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> StudyProjectResponse:
    await _enforce_project_rate_limit(current_user, "study-actions")
    service = _service(session, settings)
    try:
        project = await service.add_summary_note(
            user=current_user,
            project_id=project_id,
            paragraph_index=payload.paragraph_index,
            text=payload.text,
            note=payload.note,
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

    return service.to_response(project)


@router.patch(
    "/{project_id}/summary-notes/{note_id}",
    response_model=StudyProjectResponse,
)
async def update_summary_note(
    project_id: uuid.UUID,
    note_id: uuid.UUID,
    payload: StudyProjectSummaryNoteUpdate,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> StudyProjectResponse:
    await _enforce_project_rate_limit(current_user, "study-actions")
    service = _service(session, settings)
    try:
        project = await service.update_summary_note(
            user=current_user,
            project_id=project_id,
            note_id=note_id,
            note=payload.note,
        )
    except ProjectNotFoundError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notita nu a fost gasita.",
        ) from exc
    except ProjectValidationError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return service.to_response(project)


@router.delete(
    "/{project_id}/summary-notes/{note_id}",
    response_model=StudyProjectResponse,
)
async def delete_summary_note(
    project_id: uuid.UUID,
    note_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> StudyProjectResponse:
    await _enforce_project_rate_limit(current_user, "study-actions")
    service = _service(session, settings)
    try:
        project = await service.delete_summary_note(
            user=current_user,
            project_id=project_id,
            note_id=note_id,
        )
    except ProjectNotFoundError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notita nu a fost gasita.",
        ) from exc

    return service.to_response(project)


@router.get("/{project_id}/markdown")
async def download_project_markdown(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> Response:
    service = _service(session, settings)
    try:
        project = await service.get_project(current_user, project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fisierul nu a fost gasit.",
        ) from exc

    try:
        path = service.download_path(project, "markdown")
    except ProjectNotFoundError as exc:
        try:
            content = service.download_content(project, "markdown")
        except ProjectNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Fisierul nu a fost gasit.",
            ) from exc
        return Response(
            content,
            media_type="text/markdown; charset=utf-8",
            headers={
                "Content-Disposition": (
                    f'attachment; filename="{project.slug}-material.md"'
                )
            },
        )

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
) -> Response:
    service = _service(session, settings)
    try:
        project = await service.get_project(current_user, project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fisierul nu a fost gasit.",
        ) from exc

    try:
        path = service.download_path(project, "prompt")
    except ProjectNotFoundError as exc:
        try:
            content = service.download_content(project, "prompt")
        except ProjectNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Fisierul nu a fost gasit.",
            ) from exc
        return Response(
            content,
            media_type="text/plain; charset=utf-8",
            headers={
                "Content-Disposition": (
                    f'attachment; filename="{project.slug}-prompt.txt"'
                )
            },
        )

    return FileResponse(
        path,
        media_type="text/plain; charset=utf-8",
        filename=f"{project.slug}-prompt.txt",
    )
