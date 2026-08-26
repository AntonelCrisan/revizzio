from fastapi import APIRouter, Query

from app.api.dependencies import CurrentAdminUser, DbSession
from app.schemas.visitors import VisitorStatsResponse, VisitorVisitResponse
from app.services.visitors import get_visitor_stats, list_visitor_visits

router = APIRouter(prefix="/api/admin", tags=["admin-visitors"])


@router.get("/visitor-stats", response_model=VisitorStatsResponse)
async def get_admin_visitor_stats(
    _: CurrentAdminUser,
    session: DbSession,
) -> VisitorStatsResponse:
    return await get_visitor_stats(session)


@router.get("/visitor-visits", response_model=list[VisitorVisitResponse])
async def get_admin_visitor_visits(
    _: CurrentAdminUser,
    session: DbSession,
    limit: int = Query(default=200, ge=1, le=500),
) -> list[VisitorVisitResponse]:
    visits = await list_visitor_visits(session, limit=limit)
    return [VisitorVisitResponse.model_validate(visit) for visit in visits]
