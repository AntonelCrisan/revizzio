import uuid
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient

from app.api.dependencies import get_auth_service, get_current_user
from app.core.config import get_settings
from app.main import app
from app.models import User
from app.services.auth import AuthResult


def build_user() -> User:
    return User(
        id=uuid.uuid4(),
        email="student@example.com",
        full_name="Student Test",
        password_hash="not-returned-by-api",
        is_active=True,
        role="user",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
        terms_accepted_at=datetime.now(UTC),
        terms_version="2026-06-11",
        theme_preference="system",
    )


class FakeAuthService:
    def __init__(self, *, persistent: bool = False) -> None:
        self.user = build_user()
        self.persistent = persistent

    async def register(self, *_: object, **__: object) -> AuthResult:
        return self._result()

    async def login(self, *_: object, **__: object) -> AuthResult:
        return self._result()

    async def logout(self, _: str | None) -> None:
        return None

    async def update_theme_preference(
        self,
        user: User,
        theme_preference: str,
    ) -> User:
        user.theme_preference = theme_preference
        return user

    def _result(self) -> AuthResult:
        return AuthResult(
            user=self.user,
            session_token="test-session-token",
            expires_at=datetime.now(UTC) + timedelta(days=1),
            persistent=self.persistent,
        )


def test_register_sets_http_only_session_cookie() -> None:
    service = FakeAuthService()
    settings = get_settings().model_copy(
        update={"session_cookie_name": "revizzio_session"}
    )
    app.dependency_overrides[get_auth_service] = lambda: service
    app.dependency_overrides[get_settings] = lambda: settings

    try:
        with TestClient(app) as client:
            response = client.post(
                "/api/auth/register",
                json={
                    "full_name": "Student Test",
                    "email": "student@example.com",
                    "password": "ParolaSigura123",
                    "accepted_terms": True,
                },
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 201
    assert response.json()["email"] == "student@example.com"
    set_cookie = response.headers["set-cookie"]
    assert "revizzio_session=test-session-token" in set_cookie
    assert "HttpOnly" in set_cookie
    assert "SameSite=lax" in set_cookie
    assert "Max-Age" not in set_cookie
    assert "expires=" not in set_cookie.lower()


def test_remember_me_sets_a_persistent_cookie() -> None:
    service = FakeAuthService(persistent=True)
    app.dependency_overrides[get_auth_service] = lambda: service

    try:
        with TestClient(app) as client:
            response = client.post(
                "/api/auth/login",
                json={
                    "email": "student@example.com",
                    "password": "ParolaSigura123",
                    "remember": True,
                },
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    set_cookie = response.headers["set-cookie"]
    assert "Max-Age" in set_cookie
    assert "expires=" in set_cookie.lower()


def test_me_returns_the_authenticated_user() -> None:
    user = build_user()
    app.dependency_overrides[get_current_user] = lambda: user

    try:
        with TestClient(app) as client:
            response = client.get("/api/auth/me")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["full_name"] == "Student Test"
    assert response.json()["role"] == "user"
    assert response.json()["theme_preference"] == "system"


def test_me_normalizes_role_padding_from_database() -> None:
    user = build_user()
    user.role = "admin    "
    app.dependency_overrides[get_current_user] = lambda: user

    try:
        with TestClient(app) as client:
            response = client.get("/api/auth/me")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["role"] == "admin"


def test_authenticated_user_can_update_theme_preference() -> None:
    user = build_user()
    service = FakeAuthService()
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_auth_service] = lambda: service

    try:
        with TestClient(app) as client:
            response = client.patch(
                "/api/auth/me/preferences",
                json={"theme_preference": "dark"},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["theme_preference"] == "dark"


def test_theme_preference_rejects_unknown_values() -> None:
    user = build_user()
    service = FakeAuthService()
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_auth_service] = lambda: service

    try:
        with TestClient(app) as client:
            response = client.patch(
                "/api/auth/me/preferences",
                json={"theme_preference": "sepia"},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 422
