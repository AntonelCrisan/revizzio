from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from anyio import to_thread
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.security import (
    dummy_password_hash,
    generate_session_token,
    hash_password,
    hash_session_token,
    verify_password,
)
from app.models import User
from app.repositories.auth import AuthSessionRepository, UserRepository
from app.schemas.auth import LoginRequest, RegisterRequest
from app.schemas.user import ThemePreference
from app.services.audit import add_audit_log


class EmailAlreadyRegisteredError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


class InvalidSessionError(Exception):
    pass


@dataclass(frozen=True)
class AuthResult:
    user: User
    session_token: str
    expires_at: datetime
    persistent: bool


class AuthService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self._session = session
        self._settings = settings
        self._users = UserRepository(session)
        self._sessions = AuthSessionRepository(session)

    async def register(
        self,
        payload: RegisterRequest,
        *,
        user_agent: str | None,
        ip_address: str | None,
    ) -> AuthResult:
        email = payload.email.lower()
        if await self._users.get_by_email(email) is not None:
            add_audit_log(
                self._session,
                action="auth.register_failed",
                status="failure",
                actor_email=email,
                resource_type="user",
                details={"email": email, "reason": "email_already_registered"},
                ip_address=ip_address,
                user_agent=user_agent,
            )
            await self._session.commit()
            raise EmailAlreadyRegisteredError

        password_hash = await to_thread.run_sync(
            hash_password,
            payload.password,
        )

        try:
            now = datetime.now(UTC)
            user = await self._users.add(
                full_name=payload.full_name,
                email=email,
                password_hash=password_hash,
                terms_accepted_at=now,
                terms_version=self._settings.terms_version,
                newsletter_consent=payload.newsletter_consent,
                newsletter_consent_at=now if payload.newsletter_consent else None,
            )
            result = await self._create_session(
                user=user,
                persistent=False,
                user_agent=user_agent,
                ip_address=ip_address,
            )
            add_audit_log(
                self._session,
                action="auth.registered",
                actor=user,
                resource_type="user",
                resource_id=str(user.id),
                details={
                    "email": email,
                    "newsletter_consent": payload.newsletter_consent,
                    "terms_version": self._settings.terms_version,
                },
                ip_address=ip_address,
                user_agent=user_agent,
            )
            await self._session.commit()
            return result
        except IntegrityError as exc:
            await self._session.rollback()
            raise EmailAlreadyRegisteredError from exc

    async def login(
        self,
        payload: LoginRequest,
        *,
        user_agent: str | None,
        ip_address: str | None,
    ) -> AuthResult:
        user = await self._users.get_by_email(payload.email.lower())
        password_is_valid = await to_thread.run_sync(
            verify_password,
            payload.password,
            user.password_hash if user is not None else dummy_password_hash,
        )
        if user is None or not user.is_active or not password_is_valid:
            add_audit_log(
                self._session,
                action="auth.login_failed",
                status="failure",
                actor=user,
                actor_email=payload.email.lower(),
                resource_type="user",
                resource_id=str(user.id) if user is not None else None,
                details={
                    "email": payload.email.lower(),
                    "reason": "invalid_credentials_or_inactive_user",
                },
                ip_address=ip_address,
                user_agent=user_agent,
            )
            await self._session.commit()
            raise InvalidCredentialsError

        result = await self._create_session(
            user=user,
            persistent=payload.remember,
            user_agent=user_agent,
            ip_address=ip_address,
        )
        add_audit_log(
            self._session,
            action="auth.logged_in",
            actor=user,
            resource_type="user",
            resource_id=str(user.id),
            details={"remember_session": payload.remember},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await self._session.commit()
        return result

    async def get_user_by_session_token(self, token: str) -> User:
        auth_session = await self._sessions.get_active_by_token_hash(
            token_hash=self._hash_token(token),
            now=datetime.now(UTC),
        )
        if auth_session is None or not auth_session.user.is_active:
            raise InvalidSessionError
        return auth_session.user

    async def logout(
        self,
        token: str | None,
        *,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> None:
        if token is None:
            return
        auth_session = await self._sessions.revoke(
            token_hash=self._hash_token(token),
            revoked_at=datetime.now(UTC),
        )
        add_audit_log(
            self._session,
            action="auth.logged_out" if auth_session is not None else "auth.logout_failed",
            status="success" if auth_session is not None else "failure",
            actor_user_id=auth_session.user_id if auth_session is not None else None,
            resource_type="auth_session",
            resource_id=str(auth_session.id) if auth_session is not None else None,
            details={
                "reason": "session_revoked"
                if auth_session is not None
                else "session_not_found",
            },
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await self._session.commit()

    async def update_theme_preference(
        self,
        user: User,
        theme_preference: ThemePreference,
    ) -> User:
        old_theme_preference = user.theme_preference
        updated_user = await self._users.update_theme_preference(
            user,
            theme_preference,
        )
        add_audit_log(
            self._session,
            action="user.preferences.updated",
            actor=updated_user,
            resource_type="user",
            resource_id=str(updated_user.id),
            details={
                "theme_preference": theme_preference,
                "previous_theme_preference": old_theme_preference,
            },
        )
        await self._session.commit()
        return updated_user

    async def _create_session(
        self,
        *,
        user: User,
        persistent: bool,
        user_agent: str | None,
        ip_address: str | None,
    ) -> AuthResult:
        now = datetime.now(UTC)
        lifetime = (
            timedelta(days=self._settings.remember_session_ttl_days)
            if persistent
            else timedelta(hours=self._settings.session_ttl_hours)
        )
        expires_at = now + lifetime
        session_token = generate_session_token()

        await self._sessions.add(
            user_id=user.id,
            token_hash=self._hash_token(session_token),
            expires_at=expires_at,
            user_agent=user_agent,
            ip_address=ip_address,
        )
        return AuthResult(
            user=user,
            session_token=session_token,
            expires_at=expires_at,
            persistent=persistent,
        )

    def _hash_token(self, token: str) -> str:
        return hash_session_token(
            token,
            self._settings.session_secret.get_secret_value(),
        )
