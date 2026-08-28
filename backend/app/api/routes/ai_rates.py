from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select

from app.api.dependencies import CurrentAdminUser, DbSession
from app.models import AiCreditRate, AiModelRate
from app.schemas.ai_rates import (
    AiCreditRateResponse,
    AiCreditRatesUpdate,
    AiModelRateResponse,
    AiModelRatesUpdate,
)
from app.services.audit import add_audit_log

router = APIRouter(prefix="/api/ai-rates", tags=["ai-rates"])


def _client_context(request: Request) -> tuple[str | None, str | None]:
    user_agent = request.headers.get("user-agent")
    ip_address = request.client.host if request.client is not None else None
    return user_agent, ip_address


@router.get("/credits", response_model=list[AiCreditRateResponse])
async def get_credit_rates(
    _: CurrentAdminUser,
    session: DbSession,
) -> list[AiCreditRateResponse]:
    rows = await session.scalars(
        select(AiCreditRate).order_by(AiCreditRate.feature, AiCreditRate.credits)
    )
    return list(rows.all())


@router.put("/credits", response_model=list[AiCreditRateResponse])
async def update_credit_rates(
    payload: AiCreditRatesUpdate,
    request: Request,
    admin_user: CurrentAdminUser,
    session: DbSession,
) -> list[AiCreditRateResponse]:
    existing = {
        (row.feature, row.size_tier): row
        for row in (await session.scalars(select(AiCreditRate))).all()
    }
    now = datetime.now(UTC)
    for item in payload.rates:
        row = existing.get((item.feature, item.size_tier))
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Combinatia feature={item.feature}/size_tier={item.size_tier} "
                    "nu exista."
                ),
            )
        row.threshold_max = item.threshold_max
        row.credits = item.credits
        row.updated_at = now

    user_agent, ip_address = _client_context(request)
    add_audit_log(
        session,
        action="admin.ai_credit_rates.updated",
        actor=admin_user,
        resource_type="ai_credit_rates",
        details={"rate_count": len(payload.rates)},
        ip_address=ip_address,
        user_agent=user_agent,
    )
    await session.commit()

    rows = await session.scalars(
        select(AiCreditRate).order_by(AiCreditRate.feature, AiCreditRate.credits)
    )
    return list(rows.all())


@router.get("/models", response_model=list[AiModelRateResponse])
async def get_model_rates(
    _: CurrentAdminUser,
    session: DbSession,
) -> list[AiModelRateResponse]:
    rows = await session.scalars(select(AiModelRate).order_by(AiModelRate.model))
    return list(rows.all())


@router.put("/models", response_model=list[AiModelRateResponse])
async def update_model_rates(
    payload: AiModelRatesUpdate,
    request: Request,
    admin_user: CurrentAdminUser,
    session: DbSession,
) -> list[AiModelRateResponse]:
    existing = {
        row.model: row
        for row in (await session.scalars(select(AiModelRate))).all()
    }
    now = datetime.now(UTC)
    for item in payload.rates:
        row = existing.get(item.model)
        if row is None:
            row = AiModelRate(model=item.model)
            session.add(row)
        row.cost_per_1k_input_tokens = item.cost_per_1k_input_tokens
        row.cost_per_1k_output_tokens = item.cost_per_1k_output_tokens
        row.updated_at = now

    user_agent, ip_address = _client_context(request)
    add_audit_log(
        session,
        action="admin.ai_model_rates.updated",
        actor=admin_user,
        resource_type="ai_model_rates",
        details={"rate_count": len(payload.rates)},
        ip_address=ip_address,
        user_agent=user_agent,
    )
    await session.commit()

    rows = await session.scalars(select(AiModelRate).order_by(AiModelRate.model))
    return list(rows.all())
