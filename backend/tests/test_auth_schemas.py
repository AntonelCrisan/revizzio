import pytest
from pydantic import ValidationError

from app.schemas.auth import (
    ChangePasswordRequest,
    GoogleCallbackRequest,
    PasswordResetConfirmRequest,
    RegisterRequest,
)


def test_register_accepts_secure_password() -> None:
    payload = RegisterRequest(
        full_name="Student Test",
        email="student@example.com",
        password="ParolaSigura123",
        accepted_terms=True,
    )

    assert payload.password == "ParolaSigura123"


@pytest.mark.parametrize(
    "password",
    ["parolafarasifra", "1234567890", "password123", " ParolaSigura123"],
)
def test_register_rejects_weak_passwords(password: str) -> None:
    with pytest.raises(ValidationError):
        RegisterRequest(
            full_name="Student Test",
            email="student@example.com",
            password=password,
            accepted_terms=True,
        )


def test_password_reset_reuses_password_policy() -> None:
    with pytest.raises(ValidationError):
        PasswordResetConfirmRequest(
            token="x" * 48,
            password="parolafarasifra",
        )


def test_change_password_reuses_password_policy() -> None:
    with pytest.raises(ValidationError):
        ChangePasswordRequest(
            current_password="ParolaVeche123",
            new_password="parolafarasifra",
        )


def test_google_callback_requires_non_empty_code() -> None:
    with pytest.raises(ValidationError):
        GoogleCallbackRequest(code="")

    payload = GoogleCallbackRequest(code="valid-authorization-code")
    assert payload.code == "valid-authorization-code"


def test_change_password_rejects_same_password() -> None:
    with pytest.raises(ValidationError):
        ChangePasswordRequest(
            current_password="ParolaSigura123",
            new_password="ParolaSigura123",
        )
