from fastapi import APIRouter, HTTPException, status
from sqlalchemy import text

from app.api.dependencies import DbSession

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
    return {"status": "ready", "database": "postgresql"}
