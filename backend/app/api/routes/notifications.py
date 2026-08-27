import uuid
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException, Query, Request, status

from app.api.dependencies import AppSettings, CurrentUser, DbSession
from app.core.rate_limit import _memory_rate_limit_buckets, consume_rate_limit
from app.schemas.notifications import NotificationListResponse, NotificationResponse
from app.services.notifications import NotificationNotFoundError, NotificationService

router = APIRouter(prefix="/api/auth/me/notifications", tags=["notifications"])

NOTIFICATIONS_RATE_LIMIT_WINDOW_SECONDS = 300
NOTIFICATIONS_RATE_LIMIT_MAX_REQUESTS = 60
_notifications_rate_limit_buckets = _memory_rate_limit_buckets


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


def _protect_origin(request: Request, settings: AppSettings) -> None:
    origin = _request_origin(request)
    if origin is None:
        return

    if origin not in {allowed.rstrip("/") for allowed in settings.allowed_origins}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cererea nu a putut fi verificata.",
        )


async def _enforce_rate_limit(current_user: CurrentUser) -> None:
    await consume_rate_limit(
        bucket_key=f"notifications:{current_user.id}",
        max_requests=NOTIFICATIONS_RATE_LIMIT_MAX_REQUESTS,
        window_seconds=NOTIFICATIONS_RATE_LIMIT_WINDOW_SECONDS,
        error_message="Prea multe cereri. Incearca din nou peste putin timp.",
    )


def _notification_response(notification) -> NotificationResponse:
    response = NotificationResponse.model_validate(notification)
    if notification.project is not None:
        response = response.model_copy(
            update={"project_name": notification.project.name}
        )
    return response


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    current_user: CurrentUser,
    session: DbSession,
    unread_only: bool = Query(default=False),
    limit: int = Query(default=20, ge=1, le=100),
) -> NotificationListResponse:
    service = NotificationService(session)
    items = await service.list_for_user(
        current_user,
        unread_only=unread_only,
        limit=limit,
    )
    unread_count = await service.unread_count(current_user)
    return NotificationListResponse(
        items=[_notification_response(item) for item in items],
        unread_count=unread_count,
    )


@router.post("/read-all", response_model=NotificationListResponse)
async def mark_all_notifications_read(
    request: Request,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> NotificationListResponse:
    _protect_origin(request, settings)
    await _enforce_rate_limit(current_user)
    service = NotificationService(session)
    await service.mark_all_read(current_user)
    items = await service.list_for_user(current_user, limit=20)
    return NotificationListResponse(
        items=[_notification_response(item) for item in items],
        unread_count=0,
    )


@router.post("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: uuid.UUID,
    request: Request,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> NotificationResponse:
    _protect_origin(request, settings)
    await _enforce_rate_limit(current_user)
    service = NotificationService(session)
    try:
        notification = await service.mark_read(current_user, notification_id)
    except NotificationNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notificarea nu a fost gasita.",
        ) from exc

    return _notification_response(notification)


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: uuid.UUID,
    request: Request,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> None:
    _protect_origin(request, settings)
    await _enforce_rate_limit(current_user)
    service = NotificationService(session)
    try:
        await service.delete(current_user, notification_id)
    except NotificationNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notificarea nu a fost gasita.",
        ) from exc
