from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.exc import SQLAlchemyError

from app.api.dependencies import CurrentAdminUser, DbSession
from app.models import WithdrawalRequest
from app.schemas.admin_withdrawal_requests import AdminWithdrawalRequestResponse

router = APIRouter(
    prefix="/api/admin/withdrawal-requests",
    tags=["admin-withdrawal-requests"],
)


@router.get("/", response_model=list[AdminWithdrawalRequestResponse])
async def get_admin_withdrawal_requests(
    _: CurrentAdminUser,
    session: DbSession,
    email_status: Annotated[str | None, Query(max_length=32)] = None,
    search: Annotated[str | None, Query(max_length=320)] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 200,
) -> list[AdminWithdrawalRequestResponse]:
    query = (
        select(WithdrawalRequest)
        .order_by(WithdrawalRequest.created_at.desc(), WithdrawalRequest.id.asc())
        .limit(limit)
    )

    normalized_status = email_status.strip() if email_status else ""
    if normalized_status:
        query = query.where(
            WithdrawalRequest.email_confirmation_status == normalized_status,
        )

    normalized_search = search.strip() if search else ""
    if normalized_search:
        search_pattern = f"%{normalized_search}%"
        query = query.where(
            or_(
                WithdrawalRequest.registration_number.ilike(search_pattern),
                WithdrawalRequest.full_name.ilike(search_pattern),
                WithdrawalRequest.email.ilike(search_pattern),
                WithdrawalRequest.subscription_or_order.ilike(search_pattern),
                WithdrawalRequest.order_number.ilike(search_pattern),
                WithdrawalRequest.reason.ilike(search_pattern),
                WithdrawalRequest.ip_address.ilike(search_pattern),
            )
        )

    try:
        requests = list((await session.scalars(query)).all())
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cererile de retragere nu pot fi încărcate momentan.",
        ) from exc
    return [AdminWithdrawalRequestResponse.model_validate(item) for item in requests]
