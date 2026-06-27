import pytest
from pydantic import ValidationError

from app.core.config import Settings

BASE_SETTINGS = {
    "database_url": "postgresql+asyncpg://user:password@localhost:5432/revizzio",
    "session_secret": "a-secure-session-secret-with-more-than-32-characters",
}


def test_production_requires_secure_cookies() -> None:
    with pytest.raises(ValidationError, match="SESSION_COOKIE_SECURE"):
        Settings(
            **BASE_SETTINGS,
            environment="production",
            session_cookie_secure=False,
        )


def test_samesite_none_requires_secure_cookies() -> None:
    with pytest.raises(ValidationError, match="SESSION_COOKIE_SECURE"):
        Settings(
            **BASE_SETTINGS,
            session_cookie_samesite="none",
            session_cookie_secure=False,
        )


def test_database_url_rejects_unescaped_at_in_password() -> None:
    with pytest.raises(ValidationError, match="unescaped '@'"):
        Settings(
            database_url=(
                "postgresql+asyncpg://postgres:password@@127.0.0.1:5432/revizzio"
            ),
            session_secret=BASE_SETTINGS["session_secret"],
        )
