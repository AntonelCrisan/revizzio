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


def test_user_plan_response_keeps_cost_internals_out_of_the_browser() -> None:
    """Every logged-in browser receives this, so it carries no cost economics.

    The per-cycle OpenAI ceiling and the credit/OCR quotas are business
    parameters no user-facing screen reads; the limits the upload screens do
    read have to stay.
    """
    served = set(UserPlanResponse.model_fields)

    assert not served & {
        "max_openai_cost_usd_per_cycle",
        "monthly_ai_credits",
        "monthly_ocr_pages",
    }
    # Used by the project upload limits and the plan badges.
    assert {
        "monthly_page_limit",
        "active_project_limit",
        "monthly_material_limit",
        "files_per_project_limit",
        "file_size_limit_mb",
        "project_size_limit_mb",
        "estimated_page_limit",
        "quiz_questions_per_quiz",
        "quizzes_per_project_limit",
        "allow_scanned_documents",
        "ai_chat_enabled",
    } <= served


def test_user_plan_response_still_builds_from_the_orm_plan() -> None:
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
        quiz_questions_per_quiz=12,
        quizzes_per_project_limit=10,
        allow_scanned_documents=False,
        monthly_page_limit=1000,
        ai_chat_enabled=True,
        is_featured=True,
    )

    assert payload.ai_chat_enabled is True
    assert payload.monthly_page_limit == 1000
    assert payload.quiz_questions_per_quiz == 12
    assert payload.quizzes_per_project_limit == 10
