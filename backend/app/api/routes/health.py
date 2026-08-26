from fastapi import APIRouter, HTTPException, status
from sqlalchemy import text

from app.api.dependencies import DbSession
from app.core.rate_limit import (
    RateLimitBackendUnavailableError,
    rate_limit_backend_status,
)

router = APIRouter(prefix="/api", tags=["system"])


@router.get("/health")
async def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "message": "Backend-ul FastAPI funcționează.",
    }


@router.get("/ready")
async def readiness_check(session: DbSession) -> dict[str, str]:
    try:
        await session.execute(text("SELECT 1"))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Baza de date nu este disponibilă.",
        ) from exc
    try:
        rate_limit_backend = await rate_limit_backend_status()
    except RateLimitBackendUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Redis nu este disponibil pentru rate limiting.",
        ) from exc

    return {
        "status": "ready",
        "database": "postgresql",
        "rate_limit": rate_limit_backend,
    }
