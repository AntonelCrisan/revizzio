import hmac

from fastapi import APIRouter, HTTPException, Request, status

from app.api.dependencies import AppSettings, DbSession
from app.services.notifications import NotificationService

router = APIRouter(prefix="/api/internal", tags=["internal"])


@router.post("/notifications/run-daily")
async def run_daily_notification_digest(
    request: Request,
    session: DbSession,
    settings: AppSettings,
) -> dict[str, int]:
    expected_secret = (
        settings.cron_secret.get_secret_value() if settings.cron_secret else ""
    )
    if not expected_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cron-ul de notificari nu este configurat.",
        )

    provided_secret = request.headers.get("x-cron-secret", "")
    if not provided_secret:
        authorization = request.headers.get("authorization", "")
        if authorization.lower().startswith("bearer "):
            provided_secret = authorization[len("Bearer ") :]

    if not hmac.compare_digest(provided_secret, expected_secret):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Secret cron invalid.",
        )

    service = NotificationService(session, settings)
    sent_count = await service.run_daily_digest()
    return {"emails_sent": sent_count}
