import asyncio
import uuid
from datetime import UTC, datetime
from typing import Literal

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import Settings
from app.models import (
    Notification,
    StudyProject,
    StudyProjectFlashcard,
    User,
    UserPreferences,
)
from app.services.email import (
    EmailDeliveryError,
    EmailMessage,
    EmailService,
    email_logo_html,
    notification_digest_email,
)
from app.services.preferences import PreferencesService

NotificationType = Literal["project_ready", "weak_concepts", "daily_review"]

DAILY_DIGEST_CONCURRENCY = 5


class NotificationNotFoundError(Exception):
    pass


class NotificationService:
    def __init__(self, session: AsyncSession, settings: Settings | None = None) -> None:
        self._session = session
        self._settings = settings

    async def notify(
        self,
        user: User,
        *,
        type: NotificationType,
        title: str,
        body: str,
        project_id: uuid.UUID | None = None,
    ) -> Notification:
        notification = Notification(
            user_id=user.id,
            type=type,
            title=title,
            body=body,
            project_id=project_id,
        )
        self._session.add(notification)
        await self._session.commit()

        if self._settings is not None:
            await self._maybe_send_instant_email(user, notification)

        return notification

    async def list_for_user(
        self,
        user: User,
        *,
        unread_only: bool = False,
        limit: int = 20,
    ) -> list[Notification]:
        query = (
            select(Notification)
            .where(Notification.user_id == user.id)
            .options(selectinload(Notification.project))
            .order_by(Notification.created_at.desc())
            .limit(limit)
        )
        if unread_only:
            query = query.where(Notification.read_at.is_(None))

        result = await self._session.scalars(query)
        return list(result.all())

    async def unread_count(self, user: User) -> int:
        count = await self._session.scalar(
            select(func.count())
            .select_from(Notification)
            .where(
                Notification.user_id == user.id,
                Notification.read_at.is_(None),
            )
        )
        return int(count or 0)

    async def mark_read(self, user: User, notification_id: uuid.UUID) -> Notification:
        notification = await self._session.scalar(
            select(Notification)
            .where(
                Notification.id == notification_id,
                Notification.user_id == user.id,
            )
            .options(selectinload(Notification.project))
        )
        if notification is None:
            raise NotificationNotFoundError

        if notification.read_at is None:
            notification.read_at = datetime.now(UTC)
            await self._session.commit()
        return notification

    async def delete(self, user: User, notification_id: uuid.UUID) -> None:
        notification = await self._session.scalar(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user.id,
            )
        )
        if notification is None:
            raise NotificationNotFoundError

        await self._session.delete(notification)
        await self._session.commit()

    async def mark_all_read(self, user: User) -> int:
        notifications = list(
            (
                await self._session.scalars(
                    select(Notification).where(
                        Notification.user_id == user.id,
                        Notification.read_at.is_(None),
                    )
                )
            ).all()
        )
        now = datetime.now(UTC)
        for notification in notifications:
            notification.read_at = now

        await self._session.commit()
        return len(notifications)

    async def _maybe_send_instant_email(
        self,
        user: User,
        notification: Notification,
    ) -> None:
        assert self._settings is not None

        study_preferences = await PreferencesService(self._session).get(user)
        prefs = study_preferences.preferences
        if not prefs.notify_email_enabled or prefs.notify_frequency != "instant":
            return

        html, text = notification_digest_email(
            items=[(notification.title, notification.body)],
            app_url=self._settings.public_app_url,
            logo_html=email_logo_html(self._settings.email_logo_url, app_name="Reviss"),
        )
        try:
            await EmailService(self._settings).send(
                EmailMessage(
                    to=user.email,
                    subject=notification.title,
                    html=html,
                    text=text,
                )
            )
        except EmailDeliveryError:
            return

        notification.emailed_at = datetime.now(UTC)
        await self._session.commit()

    async def _maybe_create_daily_review_notification(
        self,
        user: User,
        now: datetime,
    ) -> Notification | None:
        study_preferences = await PreferencesService(self._session).get(user)
        if not study_preferences.preferences.automation_daily_review:
            return None

        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        existing = await self._session.scalar(
            select(Notification).where(
                Notification.user_id == user.id,
                Notification.type == "daily_review",
                Notification.created_at >= day_start,
            )
        )
        if existing is not None:
            return None

        review_count = await self._session.scalar(
            select(func.count())
            .select_from(StudyProjectFlashcard)
            .join(StudyProject, StudyProject.id == StudyProjectFlashcard.project_id)
            .where(
                StudyProject.user_id == user.id,
                StudyProjectFlashcard.review.is_(True),
            )
        )
        review_count = int(review_count or 0)
        if review_count == 0:
            return None

        notification = Notification(
            user_id=user.id,
            type="daily_review",
            title="Recapitulare zilnică",
            body=(
                f"Ai {review_count} flashcard-uri marcate de revizuit. "
                "E un moment bun să le recapitulezi."
            ),
        )
        self._session.add(notification)
        await self._session.flush()
        return notification

    async def run_daily_digest(self) -> int:
        if self._settings is None:
            raise ValueError(
                "NotificationService are nevoie de settings pentru digest-ul zilnic."
            )
        settings = self._settings
        now = datetime.now(UTC)

        # Outer join: a user with no preferences row yet has never had one
        # lazily created (e.g. never opened settings, no notification fired
        # for them before). The column defaults are "daily" + email enabled,
        # so such a user must still be treated as opted in, not skipped.
        users = list(
            (
                await self._session.scalars(
                    select(User)
                    .outerjoin(
                        UserPreferences, UserPreferences.user_id == User.id
                    )
                    .where(
                        or_(
                            UserPreferences.notify_frequency.is_(None),
                            UserPreferences.notify_frequency == "daily",
                        ),
                        or_(
                            UserPreferences.notify_email_enabled.is_(None),
                            UserPreferences.notify_email_enabled.is_(True),
                        ),
                        User.is_active.is_(True),
                    )
                )
            ).all()
        )

        pending_by_user: dict[uuid.UUID, list[Notification]] = {}
        for user in users:
            notifications = list(
                (
                    await self._session.scalars(
                        select(Notification)
                        .where(
                            Notification.user_id == user.id,
                            Notification.emailed_at.is_(None),
                        )
                        .order_by(Notification.created_at.asc())
                    )
                ).all()
            )

            daily_review = await self._maybe_create_daily_review_notification(
                user, now
            )
            if daily_review is not None:
                notifications.append(daily_review)

            if notifications:
                pending_by_user[user.id] = notifications

        if not pending_by_user:
            await self._session.commit()
            return 0

        users_by_id = {user.id: user for user in users}
        email_service = EmailService(settings)
        semaphore = asyncio.Semaphore(DAILY_DIGEST_CONCURRENCY)
        logo_html = email_logo_html(settings.email_logo_url, app_name="Reviss")

        async def send_for_user(user_id: uuid.UUID) -> tuple[uuid.UUID, bool]:
            async with semaphore:
                user = users_by_id[user_id]
                notifications = pending_by_user[user_id]
                items = [(item.title, item.body) for item in notifications]
                html, text = notification_digest_email(
                    items=items,
                    app_url=settings.public_app_url,
                    logo_html=logo_html,
                )
                subject = (
                    notifications[0].title
                    if len(notifications) == 1
                    else f"Rezumatul tău zilnic Reviss ({len(notifications)} noutăți)"
                )
                try:
                    await email_service.send(
                        EmailMessage(
                            to=user.email,
                            subject=subject,
                            html=html,
                            text=text,
                        )
                    )
                    return user_id, True
                except EmailDeliveryError:
                    return user_id, False

        results = await asyncio.gather(
            *(send_for_user(user_id) for user_id in pending_by_user)
        )

        sent_count = 0
        emailed_at = datetime.now(UTC)
        for user_id, success in results:
            if not success:
                continue
            sent_count += 1
            for notification in pending_by_user[user_id]:
                notification.emailed_at = emailed_at

        await self._session.commit()
        return sent_count
