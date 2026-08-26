from fastapi import APIRouter

from app.api.dependencies import CurrentAdminUser, DbSession
from app.schemas.visitors import VisitorStatsResponse
from app.services.visitors import get_visitor_stats

router = APIRouter(prefix="/api/admin", tags=["admin-visitors"])


@router.get("/visitor-stats", response_model=VisitorStatsResponse)
async def get_admin_visitor_stats(
    _: CurrentAdminUser,
    session: DbSession,
) -> VisitorStatsResponse:
    return await get_visitor_stats(session)
