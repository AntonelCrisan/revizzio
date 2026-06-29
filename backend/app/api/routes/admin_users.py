from datetime import UTC, datetime

from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.dependencies import CurrentAdminUser, DbSession
from app.models import AuthSession, User
from app.schemas.admin_users import AdminUserResponse, AdminUserSessionResponse

router = APIRouter(prefix="/api/admin/users", tags=["admin-users"])


def _session_status(session: AuthSession, now: datetime) -> str:
    if session.revoked_at is not None:
        return "revocată"
    if session.expires_at <= now:
        return "expirată"
    return "activă"


def _session_response(
    auth_session: AuthSession,
    now: datetime,
) -> AdminUserSessionResponse:
    return AdminUserSessionResponse(
        id=auth_session.id,
        created_at=auth_session.created_at,
        expires_at=auth_session.expires_at,
        revoked_at=auth_session.revoked_at,
        status=_session_status(auth_session, now),
        user_agent=auth_session.user_agent,
        ip_address=str(auth_session.ip_address) if auth_session.ip_address else None,
    )


def _user_response(user: User, now: datetime) -> AdminUserResponse:
    sessions = sorted(user.sessions, key=lambda item: item.created_at, reverse=True)
    session_responses = [_session_response(auth_session, now) for auth_session in sessions]
    active_sessions = sum(
        1 for auth_session in sessions if _session_status(auth_session, now) == "activă"
    )
    last_session_at = sessions[0].created_at if sessions else None
    last_seen_at = next(
        (
            auth_session.created_at
            for auth_session in sessions
            if auth_session.revoked_at is None and auth_session.expires_at > now
        ),
        last_session_at,
    )

    return AdminUserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        role=user.role.strip().lower(),
        created_at=user.created_at,
        updated_at=user.updated_at,
        terms_accepted_at=user.terms_accepted_at,
        terms_version=user.terms_version,
        newsletter_consent=user.newsletter_consent,
        newsletter_consent_at=user.newsletter_consent_at,
        theme_preference=user.theme_preference,
        total_sessions=len(sessions),
        active_sessions=active_sessions,
        last_session_at=last_session_at,
        last_seen_at=last_seen_at,
        sessions=session_responses,
    )


@router.get("/", response_model=list[AdminUserResponse])
async def get_admin_users(
    _: CurrentAdminUser,
    session: DbSession,
) -> list[AdminUserResponse]:
    users = list(
        (
            await session.scalars(
                select(User)
                .options(selectinload(User.sessions))
                .order_by(User.created_at.desc())
            )
        ).all()
    )
    now = datetime.now(UTC)
    return [_user_response(user, now) for user in users]
