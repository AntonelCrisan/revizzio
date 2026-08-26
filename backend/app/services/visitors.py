import hashlib
import hmac
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import VisitorVisit
from app.schemas.visitors import VisitorStatsResponse


def _compute_visitor_hash(
    *,
    secret: str,
    ip_address: str,
    user_agent: str,
    visit_date: date,
) -> str:
    material = f"{ip_address}|{user_agent}|{visit_date.isoformat()}".encode()
    return hmac.new(secret.encode(), material, hashlib.sha256).hexdigest()


async def record_anonymous_visit(
    session: AsyncSession,
    *,
    secret: str,
    ip_address: str | None,
    user_agent: str | None,
    path: str | None,
) -> bool:
    if not ip_address:
        return False

    visit_date = datetime.now(UTC).date()
    visitor_hash = _compute_visitor_hash(
        secret=secret,
        ip_address=ip_address,
        user_agent=user_agent or "unknown",
        visit_date=visit_date,
    )

    statement = (
        pg_insert(VisitorVisit)
        .values(
            visitor_hash=visitor_hash,
            visit_date=visit_date,
            path=path[:300] if path else None,
        )
        .on_conflict_do_nothing(
            index_elements=[VisitorVisit.visitor_hash, VisitorVisit.visit_date],
        )
    )
    result = await session.execute(statement)
    await session.commit()
    return result.rowcount > 0


async def get_visitor_stats(session: AsyncSession) -> VisitorStatsResponse:
    today = datetime.now(UTC).date()
    week_start = today - timedelta(days=6)
    month_start = today - timedelta(days=29)

    count_column = func.count(func.distinct(VisitorVisit.visitor_hash))

    total = await session.scalar(select(count_column))
    visitors_today = await session.scalar(
        select(count_column).where(VisitorVisit.visit_date == today)
    )
    visitors_last_7_days = await session.scalar(
        select(count_column).where(VisitorVisit.visit_date >= week_start)
    )
    visitors_last_30_days = await session.scalar(
        select(count_column).where(VisitorVisit.visit_date >= month_start)
    )

    return VisitorStatsResponse(
        total_visitors=total or 0,
        visitors_today=visitors_today or 0,
        visitors_last_7_days=visitors_last_7_days or 0,
        visitors_last_30_days=visitors_last_30_days or 0,
    )
