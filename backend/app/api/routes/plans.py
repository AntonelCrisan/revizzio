from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Request
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.dependencies import CurrentAdminUser, DbSession
from app.models import SubscriptionPlan, SubscriptionPlanFeature
from app.schemas.plans import (
    SubscriptionPlanResponse,
    SubscriptionPlansUpdate,
)
from app.services.audit import add_audit_log

router = APIRouter(prefix="/api/plans", tags=["plans"])

DEFAULT_PLANS = [
    {
        "slug": "start",
        "name": "Start",
        "price_ron": Decimal("0.00"),
        "old_price_ron": None,
        "discount_label": None,
        "billing_interval": "lunar",
        "badge": "gratuit",
        "description": "Pentru primul curs și testarea fluxului Revizzio.",
        "material_limit": "3 materiale procesate lunar",
        "ai_level": "AI de bază",
        "storage": "Istoric limitat",
        "is_visible": True,
        "is_featured": False,
        "features": [
            "Flashcard-uri și quiz-uri de bază",
            "Rezumat generat pentru fiecare material",
            "Acces la progresul general",
        ],
    },
    {
        "slug": "focus",
        "name": "Focus",
        "price_ron": Decimal("29.00"),
        "old_price_ron": Decimal("39.00"),
        "discount_label": "25% reducere lansare",
        "billing_interval": "lunar",
        "badge": "recomandat",
        "description": "Cel mai bun raport pentru studenți activi.",
        "material_limit": "30 materiale procesate lunar",
        "ai_level": "Repetiție inteligentă și strategii AI",
        "storage": "Istoric complet pe proiecte",
        "is_visible": True,
        "is_featured": True,
        "features": [
            "Analiză de progres pe fiecare proiect",
            "Prioritate la generare",
            "Chat AI contextual pe proiect",
            "Highlight-uri și explicații AI",
        ],
    },
    {
        "slug": "pro",
        "name": "Pro",
        "price_ron": Decimal("59.00"),
        "old_price_ron": Decimal("79.00"),
        "discount_label": "20 RON economie",
        "billing_interval": "lunar",
        "badge": "examene",
        "description": "Pentru sesiuni intense și mai multe materii.",
        "material_limit": "Materiale nelimitate rezonabil",
        "ai_level": "Planuri AI pentru examene",
        "storage": "Export și arhivă extinsă",
        "is_visible": True,
        "is_featured": False,
        "features": [
            "Planuri de învățare pe data examenului",
            "Export pentru rezumate și flashcard-uri",
            "Suport prioritar",
            "Predicții avansate de pregătire",
        ],
    },
]


def _client_context(request: Request) -> tuple[str | None, str | None]:
    user_agent = request.headers.get("user-agent")
    ip_address = request.client.host if request.client is not None else None
    return user_agent, ip_address


async def _ensure_default_plans(session: DbSession) -> None:
    existing_plan = await session.scalar(select(SubscriptionPlan.id).limit(1))
    if existing_plan is not None:
        return

    now = datetime.now(UTC)
    for index, plan_data in enumerate(DEFAULT_PLANS):
        feature_labels = plan_data["features"]
        plan = SubscriptionPlan(
            slug=str(plan_data["slug"]),
            name=str(plan_data["name"]),
            price_ron=plan_data["price_ron"],
            old_price_ron=plan_data["old_price_ron"],
            discount_label=plan_data["discount_label"],
            billing_interval=str(plan_data["billing_interval"]),
            badge=plan_data["badge"],
            description=str(plan_data["description"]),
            material_limit=str(plan_data["material_limit"]),
            ai_level=str(plan_data["ai_level"]),
            storage=str(plan_data["storage"]),
            is_visible=bool(plan_data["is_visible"]),
            is_featured=bool(plan_data["is_featured"]),
            sort_order=index,
            created_at=now,
            updated_at=now,
            features=[
                SubscriptionPlanFeature(label=str(label), sort_order=feature_index)
                for feature_index, label in enumerate(feature_labels)
            ],
        )
        session.add(plan)

    await session.commit()


async def _get_plans(
    session: DbSession,
    *,
    include_hidden: bool,
) -> list[SubscriptionPlan]:
    await _ensure_default_plans(session)

    query = (
        select(SubscriptionPlan)
        .options(selectinload(SubscriptionPlan.features))
        .order_by(SubscriptionPlan.sort_order, SubscriptionPlan.created_at)
    )
    if not include_hidden:
        query = query.where(SubscriptionPlan.is_visible.is_(True))

    plans = list((await session.scalars(query)).all())
    for plan in plans:
        plan.features.sort(key=lambda feature: feature.sort_order)
    return plans


def _plan_response(plan: SubscriptionPlan) -> SubscriptionPlanResponse:
    return SubscriptionPlanResponse.model_validate(plan)


@router.get("/", response_model=list[SubscriptionPlanResponse])
async def get_public_plans(session: DbSession) -> list[SubscriptionPlanResponse]:
    plans = await _get_plans(session, include_hidden=False)
    return [_plan_response(plan) for plan in plans]


@router.get("/admin", response_model=list[SubscriptionPlanResponse])
async def get_admin_plans(
    _: CurrentAdminUser,
    session: DbSession,
) -> list[SubscriptionPlanResponse]:
    plans = await _get_plans(session, include_hidden=True)
    return [_plan_response(plan) for plan in plans]


@router.put("/admin", response_model=list[SubscriptionPlanResponse])
async def update_admin_plans(
    payload: SubscriptionPlansUpdate,
    request: Request,
    admin_user: CurrentAdminUser,
    session: DbSession,
) -> list[SubscriptionPlanResponse]:
    await _ensure_default_plans(session)

    existing_plans = list(
        (
            await session.scalars(
                select(SubscriptionPlan).options(selectinload(SubscriptionPlan.features))
            )
        ).all()
    )
    existing_by_id: dict[UUID, SubscriptionPlan] = {
        plan.id: plan for plan in existing_plans
    }
    existing_by_slug = {plan.slug: plan for plan in existing_plans}
    received_plan_ids: set[UUID] = set()
    received_slugs: set[str] = set()
    now = datetime.now(UTC)

    for plan_payload in payload.plans:
        plan = None
        if plan_payload.id is not None:
            plan = existing_by_id.get(plan_payload.id)
        if plan is None:
            plan = existing_by_slug.get(plan_payload.slug)
        if plan is None:
            plan = SubscriptionPlan(created_at=now)
            session.add(plan)

        plan.slug = plan_payload.slug
        plan.name = plan_payload.name
        plan.price_ron = plan_payload.price_ron
        plan.old_price_ron = plan_payload.old_price_ron
        plan.discount_label = plan_payload.discount_label
        plan.billing_interval = plan_payload.billing_interval
        plan.badge = plan_payload.badge
        plan.description = plan_payload.description
        plan.material_limit = plan_payload.material_limit
        plan.ai_level = plan_payload.ai_level
        plan.storage = plan_payload.storage
        plan.stripe_product_id = plan_payload.stripe_product_id
        plan.stripe_price_id = plan_payload.stripe_price_id
        plan.is_visible = plan_payload.is_visible
        plan.is_featured = plan_payload.is_featured
        plan.sort_order = plan_payload.sort_order
        plan.updated_at = now
        plan.features = [
            SubscriptionPlanFeature(
                label=feature_payload.label,
                sort_order=feature_payload.sort_order,
            )
            for feature_payload in plan_payload.features
        ]

        if plan.id is not None:
            received_plan_ids.add(plan.id)
        received_slugs.add(plan.slug)

    for plan in existing_plans:
        if plan.id not in received_plan_ids and plan.slug not in received_slugs:
            await session.delete(plan)

    user_agent, ip_address = _client_context(request)
    add_audit_log(
        session,
        action="admin.subscription_plans.updated",
        actor=admin_user,
        resource_type="subscription_plans",
        details={
            "plan_count": len(payload.plans),
            "slugs": [plan.slug for plan in payload.plans],
            "featured_slugs": [
                plan.slug for plan in payload.plans if plan.is_featured
            ],
            "visible_slugs": [plan.slug for plan in payload.plans if plan.is_visible],
        },
        ip_address=ip_address,
        user_agent=user_agent,
    )
    await session.commit()

    plans = await _get_plans(session, include_hidden=True)
    return [_plan_response(plan) for plan in plans]
