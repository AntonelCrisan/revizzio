from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.schemas.auth import (
    ChangePasswordRequest,
    GoogleCallbackRequest,
    PasswordResetConfirmRequest,
    RegisterRequest,
)
from app.schemas.user import UserPlanResponse


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


def test_user_plan_response_exposes_ai_limits() -> None:
    payload = UserPlanResponse(
        id="00000000-0000-4000-8000-000000000001",
        slug="focus",
        name="Focus",
        price_ron=Decimal("29.00"),
        billing_interval="lunar",
        badge="recomandat",
        material_limit="30 materiale",
        ai_level="AI",
        storage="Istoric",
        conditions="Condiții",
        active_project_limit=10,
        monthly_material_limit=30,
        files_per_project_limit=10,
        file_size_limit_mb=50,
        project_size_limit_mb=200,
        estimated_page_limit=200,
        initial_flashcard_limit=40,
        quiz_groups_per_complexity=3,
        quiz_questions_per_quiz=12,
        allow_scanned_documents=False,
        monthly_ai_credits=60,
        monthly_ocr_pages=200,
        monthly_page_limit=1000,
        ai_chat_enabled=True,
        max_openai_cost_usd_per_cycle=Decimal("6.00"),
        is_featured=True,
    )

    assert payload.ai_chat_enabled is True
    assert payload.monthly_ai_credits == 60
    assert payload.monthly_page_limit == 1000
    assert payload.max_openai_cost_usd_per_cycle == Decimal("6.00")
