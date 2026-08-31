import uuid
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import UserStudyActivity

STREAK_LOOKBACK_DAYS = 400


async def record_study_activity(session: AsyncSession, user_id: uuid.UUID) -> None:
    today = datetime.now(UTC).date()
    statement = (
        pg_insert(UserStudyActivity)
        .values(user_id=user_id, activity_date=today)
        .on_conflict_do_nothing(
            index_elements=[
                UserStudyActivity.user_id,
                UserStudyActivity.activity_date,
            ],
        )
    )
    await session.execute(statement)


async def get_last_activity_date(
    session: AsyncSession, user_id: uuid.UUID
) -> date | None:
    return await session.scalar(
        select(func.max(UserStudyActivity.activity_date)).where(
            UserStudyActivity.user_id == user_id
        )
    )


async def count_active_days_since(
    session: AsyncSession, user_id: uuid.UUID, since: date
) -> int:
    count = await session.scalar(
        select(func.count(func.distinct(UserStudyActivity.activity_date))).where(
            UserStudyActivity.user_id == user_id,
            UserStudyActivity.activity_date >= since,
        )
    )
    return int(count or 0)


def _streak_length(activity_dates: list[date], *, today: date) -> int:
    """Consecutive-day streak length from dates sorted most-recent-first.

    Anchors on the most recent activity day rather than strictly "today" —
    the daily cron runs once at a fixed hour, so today's activity may not
    have happened yet when the streak is computed. The (user_id,
    activity_date) unique constraint guarantees no duplicate dates, so each
    earlier row must be exactly one day before the previous one to extend
    the streak.
    """
    if not activity_dates:
        return 0

    most_recent = activity_dates[0]
    if (today - most_recent).days > 1:
        return 0

    streak = 1
    expected = most_recent - timedelta(days=1)
    for activity_date in activity_dates[1:]:
        if activity_date != expected:
            break
        streak += 1
        expected -= timedelta(days=1)
    return streak


async def get_current_streak(
    session: AsyncSession, user_id: uuid.UUID, *, today: date
) -> int:
    cutoff = today - timedelta(days=STREAK_LOOKBACK_DAYS)
    rows = await session.scalars(
        select(UserStudyActivity.activity_date)
        .where(
            UserStudyActivity.user_id == user_id,
            UserStudyActivity.activity_date >= cutoff,
            UserStudyActivity.activity_date <= today,
        )
        .order_by(UserStudyActivity.activity_date.desc())
    )
    return _streak_length(list(rows.all()), today=today)
