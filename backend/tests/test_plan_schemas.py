from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.schemas.plans import (
    SubscriptionPlanPublicResponse,
    SubscriptionPlansUpdate,
    SubscriptionPlanUpdate,
)


def _plan(slug: str, stripe_price_id: str | None) -> SubscriptionPlanUpdate:
    return SubscriptionPlanUpdate(
        slug=slug,
        name=slug.title(),
        price_ron=Decimal("10.00"),
        billing_interval="lunar",
        description="Plan test",
        material_limit="10 materiale",
        ai_level="AI test",
        storage="Istoric test",
        conditions="Conditii test",
        active_project_limit=1,
        monthly_material_limit=2,
        files_per_project_limit=2,
        file_size_limit_mb=10,
        project_size_limit_mb=20,
        estimated_page_limit=25,
        initial_flashcard_limit=20,
        quiz_groups_per_complexity=1,
        quiz_questions_per_quiz=8,
        allow_scanned_documents=False,
        monthly_ai_credits=10,
        monthly_ocr_pages=0,
        monthly_page_limit=40,
        ai_chat_enabled=False,
        max_openai_cost_usd_per_cycle=Decimal("2.00"),
        stripe_product_id=None,
        stripe_price_id=stripe_price_id,
        is_visible=True,
        is_featured=False,
        sort_order=0,
        features=[],
    )


def test_subscription_plans_reject_duplicate_stripe_price_ids() -> None:
    with pytest.raises(ValidationError, match="Stripe Price ID"):
        SubscriptionPlansUpdate(
            plans=[
                _plan("start", "price_duplicate"),
                _plan("focus", "price_duplicate"),
            ]
        )


def test_subscription_plans_allow_blank_stripe_price_ids() -> None:
    payload = SubscriptionPlansUpdate(
        plans=[
            _plan("start", None),
            _plan("focus", None),
        ]
    )

    assert [plan.stripe_price_id for plan in payload.plans] == [None, None]


def test_subscription_plan_derives_monthly_material_limit() -> None:
    payload = SubscriptionPlanUpdate(
        slug="team",
        name="Team",
        price_ron=Decimal("99.00"),
        billing_interval="lunar",
        description="Plan test",
        material_limit="64 materiale",
        ai_level="AI test",
        storage="Istoric test",
        conditions="Conditii test",
        active_project_limit=8,
        monthly_material_limit=30,
        files_per_project_limit=8,
        file_size_limit_mb=10,
        project_size_limit_mb=80,
        estimated_page_limit=25,
        initial_flashcard_limit=20,
        quiz_groups_per_complexity=1,
        quiz_questions_per_quiz=8,
        allow_scanned_documents=False,
        monthly_ai_credits=10,
        monthly_ocr_pages=0,
        monthly_page_limit=40,
        ai_chat_enabled=False,
        max_openai_cost_usd_per_cycle=Decimal("2.00"),
        stripe_product_id=None,
        stripe_price_id=None,
        is_visible=True,
        is_featured=False,
        sort_order=0,
        features=[],
    )

    assert payload.monthly_material_limit == 64


SENSITIVE_PLAN_FIELDS = (
    # Our cost per cycle -- exposing it exposes the margin on every plan.
    "max_openai_cost_usd_per_cycle",
    # Payment infrastructure identifiers.
    "stripe_product_id",
    "stripe_price_id",
    # Internal accounting units that mean nothing to a visitor.
    "monthly_ai_credits",
    "monthly_ocr_pages",
    "monthly_page_limit",
    "project_size_limit_mb",
    "quiz_groups_per_complexity",
    # Row bookkeeping.
    "id",
    "created_at",
    "updated_at",
)


def test_public_plan_response_excludes_sensitive_fields() -> None:
    """The unauthenticated /api/plans/ payload must stay free of internals."""
    exposed = set(SubscriptionPlanPublicResponse.model_fields)

    assert exposed.isdisjoint(SENSITIVE_PLAN_FIELDS), (
        "public plan schema leaks: "
        f"{sorted(exposed.intersection(SENSITIVE_PLAN_FIELDS))}"
    )


def test_public_plan_response_reports_purchasability_without_price_id() -> None:
    """Clients need to know checkout is wired up, not what the price id is."""
    assert "is_purchasable" in SubscriptionPlanPublicResponse.model_fields
    assert "stripe_price_id" not in SubscriptionPlanPublicResponse.model_fields
