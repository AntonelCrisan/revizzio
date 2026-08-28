from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User, UserSubscription
from app.services.stripe_payments import ACTIVE_SUBSCRIPTION_STATUSES


def current_month_window(now: datetime | None = None) -> tuple[datetime, datetime]:
    current = now or datetime.now(UTC)
    month_start = current.replace(
        day=1,
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )
    if month_start.month == 12:
        next_month_start = month_start.replace(
            year=month_start.year + 1,
            month=1,
        )
    else:
        next_month_start = month_start.replace(month=month_start.month + 1)
    return month_start, next_month_start


async def current_billing_window(
    session: AsyncSession, user: User
) -> tuple[datetime, datetime]:
    """Return the window monthly usage limits are checked against.

    Paid users are anchored to their actual Stripe billing cycle (so a
    subscription started on the 17th resets on the 17th, not on the 1st).
    Users without an active paid subscription (e.g. the free "start" plan)
    fall back to the calendar month.
    """
    subscription = await session.scalar(
        select(UserSubscription)
        .where(
            UserSubscription.user_id == user.id,
            UserSubscription.status.in_(ACTIVE_SUBSCRIPTION_STATUSES),
            UserSubscription.current_period_start.is_not(None),
            UserSubscription.current_period_end.is_not(None),
        )
        .order_by(
            UserSubscription.created_at.desc(),
            UserSubscription.updated_at.desc(),
        )
        .limit(1)
    )
    if (
        subscription is not None
        and subscription.current_period_start is not None
        and subscription.current_period_end is not None
    ):
        return subscription.current_period_start, subscription.current_period_end
    return current_month_window()
