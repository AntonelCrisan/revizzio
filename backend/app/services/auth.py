from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID

from anyio import to_thread
from sqlalchemy import select
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
from app.models import PasswordResetToken, PendingRegistration, User
from app.repositories.auth import AuthSessionRepository, UserRepository
from app.schemas.auth import LoginRequest, PasswordResetRequest, RegisterRequest
from app.schemas.user import ThemePreference
from app.services.audit import add_audit_log
from app.services.email import (
    EmailDeliveryError,
    EmailMessage,
    EmailService,
    email_logo_html,
    password_reset_email,
    verification_email,
)


class EmailAlreadyRegisteredError(Exception):
    pass


class EmailDeliveryUnavailableError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


class InvalidEmailTokenError(Exception):
    pass


class PendingEmailConfirmationError(Exception):
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
        self._email = EmailService(settings)

    async def register(
        self,
        payload: RegisterRequest,
        *,
        user_agent: str | None,
        ip_address: str | None,
    ) -> None:
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

        password_hash = await to_thread.run_sync(hash_password, payload.password)
        token = generate_session_token()
        token_hash = self._hash_token(token)
        now = datetime.now(UTC)
        expires_at = now + timedelta(
            minutes=self._settings.email_verification_ttl_minutes
        )

        pending = await self._session.scalar(
            select(PendingRegistration).where(PendingRegistration.email == email)
        )
        if pending is None:
            pending = PendingRegistration(email=email)
            self._session.add(pending)

        pending.full_name = payload.full_name
        pending.password_hash = password_hash
        pending.token_hash = token_hash
        pending.accepted_terms = payload.accepted_terms
        pending.terms_version = self._settings.terms_version
        pending.newsletter_consent = payload.newsletter_consent
        pending.expires_at = expires_at
        pending.used_at = None
        pending.updated_at = now

        add_audit_log(
            self._session,
            action="auth.registration_verification_requested",
            actor_email=email,
            resource_type="pending_registration",
            details={
                "email": email,
                "newsletter_consent": payload.newsletter_consent,
                "expires_at": expires_at,
            },
            ip_address=ip_address,
            user_agent=user_agent,
        )

        await self._session.flush()

        html, text = verification_email(
            verification_url=self._verification_url(token),
            logo_html=self._email_logo_html(),
        )
        try:
            await self._email.send(
                EmailMessage(
                    to=email,
                    subject="Confirmă contul Revizzio",
                    html=html,
                    text=text,
                )
            )
            await self._session.commit()
        except EmailDeliveryError as exc:
            await self._session.rollback()
            await self._audit_email_failure(
                action="auth.registration_email_failed",
                email=email,
                details={"reason": str(exc)},
                ip_address=ip_address,
                user_agent=user_agent,
            )
            raise EmailDeliveryUnavailableError from exc

    async def verify_email(
        self,
        token: str,
        *,
        user_agent: str | None,
        ip_address: str | None,
    ) -> AuthResult:
        now = datetime.now(UTC)
        pending = await self._session.scalar(
            select(PendingRegistration).where(
                PendingRegistration.token_hash == self._hash_token(token),
                PendingRegistration.used_at.is_(None),
                PendingRegistration.expires_at > now,
            )
        )
        if pending is None:
            raise InvalidEmailTokenError

        if await self._users.get_by_email(pending.email) is not None:
            pending.used_at = now
            await self._session.commit()
            raise EmailAlreadyRegisteredError

        try:
            user = await self._users.add(
                full_name=pending.full_name,
                email=pending.email,
                password_hash=pending.password_hash,
                terms_accepted_at=now,
                terms_version=pending.terms_version,
                newsletter_consent=pending.newsletter_consent,
                newsletter_consent_at=now if pending.newsletter_consent else None,
            )
            pending.used_at = now
            result = await self._create_session(
                user=user,
                persistent=False,
                user_agent=user_agent,
                ip_address=ip_address,
            )
            add_audit_log(
                self._session,
                action="auth.email_verified_and_registered",
                actor=user,
                resource_type="user",
                resource_id=str(user.id),
                details={
                    "email": user.email,
                    "newsletter_consent": user.newsletter_consent,
                    "terms_version": user.terms_version,
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
        email = payload.email.lower()
        user = await self._users.get_by_email(email)
        password_is_valid = await to_thread.run_sync(
            verify_password,
            payload.password,
            user.password_hash if user is not None else dummy_password_hash,
        )
        if user is None:
            await self._raise_pending_confirmation_if_credentials_match(
                email=email,
                password=payload.password,
                ip_address=ip_address,
                user_agent=user_agent,
            )

        if user is None or not user.is_active or not password_is_valid:
            add_audit_log(
                self._session,
                action="auth.login_failed",
                status="failure",
                actor=user,
                actor_email=email,
                resource_type="user",
                resource_id=str(user.id) if user is not None else None,
                details={
                    "email": email,
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

    async def request_password_reset(
        self,
        payload: PasswordResetRequest,
        *,
        user_agent: str | None,
        ip_address: str | None,
    ) -> None:
        email = payload.email.lower()
        user = await self._users.get_by_email(email)
        if user is None or not user.is_active:
            add_audit_log(
                self._session,
                action="auth.password_reset_requested_ignored",
                actor_email=email,
                resource_type="user",
                details={"email": email, "reason": "user_not_found_or_inactive"},
                ip_address=ip_address,
                user_agent=user_agent,
            )
            await self._session.commit()
            return

        now = datetime.now(UTC)
        active_reset_token = await self._session.scalar(
            select(PasswordResetToken)
            .where(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.used_at.is_(None),
                PasswordResetToken.expires_at > now,
            )
            .order_by(PasswordResetToken.created_at.desc())
        )
        if active_reset_token is not None:
            add_audit_log(
                self._session,
                action="auth.password_reset_request_ignored_active_token",
                actor=user,
                resource_type="password_reset_token",
                resource_id=str(active_reset_token.id),
                details={
                    "email": email,
                    "expires_at": active_reset_token.expires_at,
                },
                ip_address=ip_address,
                user_agent=user_agent,
            )
            await self._session.commit()
            return

        token = generate_session_token()
        reset_token = PasswordResetToken(
            user_id=user.id,
            token_hash=self._hash_token(token),
            expires_at=now + timedelta(minutes=self._settings.password_reset_ttl_minutes),
        )
        self._session.add(reset_token)
        actor_user_id = user.id
        actor_email = user.email
        actor_name = user.full_name
        add_audit_log(
            self._session,
            action="auth.password_reset_requested",
            actor=user,
            resource_type="user",
            resource_id=str(user.id),
            details={"email": email, "expires_at": reset_token.expires_at},
            ip_address=ip_address,
            user_agent=user_agent,
        )

        await self._session.flush()

        html, text = password_reset_email(
            reset_url=self._password_reset_url(token),
            logo_html=self._email_logo_html(),
        )
        try:
            await self._email.send(
                EmailMessage(
                    to=email,
                    subject="Resetare parolă Revizzio",
                    html=html,
                    text=text,
                )
            )
            await self._session.commit()
        except EmailDeliveryError as exc:
            await self._session.rollback()
            await self._audit_email_failure(
                action="auth.password_reset_email_failed",
                actor_user_id=actor_user_id,
                email=email,
                actor_name=actor_name,
                actor_email=actor_email,
                details={"reason": str(exc)},
                ip_address=ip_address,
                user_agent=user_agent,
            )
            return

    async def reset_password(
        self,
        *,
        token: str,
        password: str,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> None:
        now = datetime.now(UTC)
        token_hash = self._hash_token(token)
        reset_token = await self._session.scalar(
            select(PasswordResetToken).where(
                PasswordResetToken.token_hash == token_hash,
                PasswordResetToken.used_at.is_(None),
                PasswordResetToken.expires_at > now,
            )
        )
        if reset_token is None:
            raise InvalidEmailTokenError

        user = await self._session.get(User, reset_token.user_id)
        if user is None or not user.is_active:
            raise InvalidEmailTokenError

        user.password_hash = await to_thread.run_sync(hash_password, password)
        user.updated_at = now
        reset_token.used_at = now
        revoked_sessions = await self._sessions.revoke_all_for_user(
            user_id=user.id,
            revoked_at=now,
        )
        add_audit_log(
            self._session,
            action="auth.password_reset_completed",
            actor=user,
            resource_type="user",
            resource_id=str(user.id),
            details={"revoked_sessions": revoked_sessions},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await self._session.commit()

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

    async def _raise_pending_confirmation_if_credentials_match(
        self,
        *,
        email: str,
        password: str,
        ip_address: str | None,
        user_agent: str | None,
    ) -> None:
        now = datetime.now(UTC)
        pending = await self._session.scalar(
            select(PendingRegistration).where(
                PendingRegistration.email == email,
                PendingRegistration.used_at.is_(None),
                PendingRegistration.expires_at > now,
            )
        )
        if pending is None:
            return

        password_matches_pending = await to_thread.run_sync(
            verify_password,
            password,
            pending.password_hash,
        )
        if not password_matches_pending:
            return

        add_audit_log(
            self._session,
            action="auth.login_blocked_pending_email_confirmation",
            status="failure",
            actor_email=email,
            resource_type="pending_registration",
            resource_id=str(pending.id),
            details={"email": email, "expires_at": pending.expires_at},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await self._session.commit()
        raise PendingEmailConfirmationError

    async def _audit_email_failure(
        self,
        *,
        action: str,
        email: str,
        details: dict[str, object],
        actor_user_id: UUID | None = None,
        actor_email: str | None = None,
        actor_name: str | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> None:
        add_audit_log(
            self._session,
            action=action,
            status="failure",
            actor_user_id=actor_user_id,
            actor_email=actor_email or email,
            actor_name=actor_name,
            resource_type="email",
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await self._session.commit()

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

    def _verification_url(self, token: str) -> str:
        return f"{self._settings.public_app_url}/verify-email?token={token}"

    def _password_reset_url(self, token: str) -> str:
        return f"{self._settings.public_app_url}/reset-password?token={token}"

    def _email_logo_html(self) -> str:
        return email_logo_html(self._settings.email_logo_url, app_name="Revizzio")

    def _hash_token(self, token: str) -> str:
        return hash_session_token(
            token,
            self._settings.session_secret.get_secret_value(),
        )
