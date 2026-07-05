import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import AuthSession, User


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_email(self, email: str) -> User | None:
        return await self._session.scalar(
            select(User)
            .options(selectinload(User.current_plan))
            .where(User.email == email)
        )

    async def add(
        self,
        *,
        full_name: str,
        email: str,
        password_hash: str,
        terms_accepted_at: datetime,
        terms_version: str,
        newsletter_consent: bool,
        newsletter_consent_at: datetime | None,
    ) -> User:
        user = User(
            full_name=full_name,
            email=email,
            password_hash=password_hash,
            role="user",
            terms_accepted_at=terms_accepted_at,
            terms_version=terms_version,
            newsletter_consent=newsletter_consent,
            newsletter_consent_at=newsletter_consent_at,
        )
        self._session.add(user)
        await self._session.flush()
        return user

    async def update_theme_preference(
        self,
        user: User,
        theme_preference: str,
    ) -> User:
        user.theme_preference = theme_preference
        await self._session.flush()
        return user


class AuthSessionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(
        self,
        *,
        user_id: uuid.UUID,
        token_hash: str,
        expires_at: datetime,
        user_agent: str | None,
        ip_address: str | None,
    ) -> AuthSession:
        auth_session = AuthSession(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
            user_agent=user_agent,
            ip_address=ip_address,
        )
        self._session.add(auth_session)
        await self._session.flush()
        return auth_session

    async def get_active_by_token_hash(
        self,
        *,
        token_hash: str,
        now: datetime,
    ) -> AuthSession | None:
        return await self._session.scalar(
            select(AuthSession)
            .options(selectinload(AuthSession.user).selectinload(User.current_plan))
            .where(
                AuthSession.token_hash == token_hash,
                AuthSession.revoked_at.is_(None),
                AuthSession.expires_at > now,
            )
        )

    async def revoke(
        self,
        *,
        token_hash: str,
        revoked_at: datetime,
    ) -> AuthSession | None:
        auth_session = await self._session.scalar(
            select(AuthSession).where(AuthSession.token_hash == token_hash)
        )
        if auth_session is not None and auth_session.revoked_at is None:
            auth_session.revoked_at = revoked_at
        return auth_session

    async def revoke_all_for_user(
        self,
        *,
        user_id: uuid.UUID,
        revoked_at: datetime,
    ) -> int:
        auth_sessions = list(
            (
                await self._session.scalars(
                    select(AuthSession).where(
                        AuthSession.user_id == user_id,
                        AuthSession.revoked_at.is_(None),
                    )
                )
            ).all()
        )
        for auth_session in auth_sessions:
            auth_session.revoked_at = revoked_at
        return len(auth_sessions)
