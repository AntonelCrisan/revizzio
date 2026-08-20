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


def test_production_requires_https_public_urls() -> None:
    with pytest.raises(ValidationError, match="PUBLIC_APP_URL"):
        Settings(
            **BASE_SETTINGS,
            environment="production",
            session_cookie_secure=True,
            public_app_url="http://reviss.app",
        )

    with pytest.raises(ValidationError, match="EMAIL_LOGO_URL"):
        Settings(
            **BASE_SETTINGS,
            environment="production",
            session_cookie_secure=True,
            public_app_url="https://reviss.app",
            email_logo_url="http://reviss.app/assets/logos/Reviss_logo_dark.svg",
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


def test_email_sender_defaults_to_verified_domain() -> None:
    settings = Settings(**BASE_SETTINGS)

    assert settings.resend_from_email == "Reviss <noreply@reviss.app>"


def test_email_sender_rejects_resend_test_domain() -> None:
    with pytest.raises(ValidationError, match="verified sender domain"):
        Settings(
            **BASE_SETTINGS,
            resend_from_email="Reviss <onboarding@resend.dev>",
        )
