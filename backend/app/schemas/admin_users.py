import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr

from app.schemas.user import ThemePreference, UserRole

SessionStatus = Literal["activă", "expirată", "revocată"]


class AdminUserSessionResponse(BaseModel):
    id: uuid.UUID
    created_at: datetime
    expires_at: datetime
    revoked_at: datetime | None
    status: SessionStatus
    user_agent: str | None
    ip_address: str | None


class AdminUserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str
    is_active: bool
    role: UserRole
    created_at: datetime
    updated_at: datetime
    terms_accepted_at: datetime
    terms_version: str
    newsletter_consent: bool
    newsletter_consent_at: datetime | None
    theme_preference: ThemePreference
    total_sessions: int
    active_sessions: int
    last_session_at: datetime | None
    last_seen_at: datetime | None
    sessions: list[AdminUserSessionResponse]
