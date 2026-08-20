from fastapi import APIRouter, HTTPException, Request, status

from app.api.dependencies import AppSettings, CurrentUser, DbSession
from app.models import UserSubscription
from app.schemas.payments import (
    CheckoutSessionCreateRequest,
    CheckoutSessionResponse,
    CheckoutSessionSyncRequest,
    CurrentSubscriptionResponse,
    SubscriptionActionResponse,
    SubscriptionInvoiceResponse,
    SubscriptionStatusResponse,
)
from app.schemas.user import UserResponse
from app.services.stripe_payments import (
    StripeConfigurationError,
    StripePaymentService,
    StripePlanUnavailableError,
    StripeRequestError,
    StripeSignatureError,
)

router = APIRouter(prefix="/api/payments", tags=["payments"])


def _client_context(request: Request) -> tuple[str | None, str | None]:
    user_agent = request.headers.get("user-agent")
    ip_address = request.client.host if request.client is not None else None
    return user_agent, ip_address


def _subscription_response(
    subscription: UserSubscription | None,
) -> CurrentSubscriptionResponse | None:
    if subscription is None or subscription.plan is None:
        return None

    return CurrentSubscriptionResponse(
        id=subscription.id,
        plan_id=subscription.plan_id,
        plan_slug=subscription.plan.slug,
        plan_name=subscription.plan.name,
        status=subscription.status,
        current_period_start=subscription.current_period_start,
        current_period_end=subscription.current_period_end,
        cancel_at_period_end=subscription.cancel_at_period_end,
        canceled_at=subscription.canceled_at,
    )


@router.post("/checkout-session", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    payload: CheckoutSessionCreateRequest,
    request: Request,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> CheckoutSessionResponse:
    service = StripePaymentService(session, settings)
    user_agent, ip_address = _client_context(request)

    try:
        checkout_session = await service.create_checkout_session(
            user=current_user,
            plan_slug=payload.plan_slug,
            user_agent=user_agent,
            ip_address=ip_address,
        )
    except StripeConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe nu este configurat complet.",
        ) from exc
    except StripePlanUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except StripeRequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Stripe nu a putut crea sesiunea de plata.",
        ) from exc

    return CheckoutSessionResponse(
        checkout_url=checkout_session.checkout_url,
        session_id=checkout_session.session_id,
    )


@router.get("/invoices", response_model=list[SubscriptionInvoiceResponse])
async def list_subscription_invoices(
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> list[SubscriptionInvoiceResponse]:
    service = StripePaymentService(session, settings)
    invoices = await service.list_user_invoices(user=current_user)
    return [
        SubscriptionInvoiceResponse.model_validate(invoice)
        for invoice in invoices
    ]


@router.get("/subscription", response_model=SubscriptionStatusResponse)
async def get_subscription_status(
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> SubscriptionStatusResponse:
    service = StripePaymentService(session, settings)
    subscription = await service.get_current_paid_subscription(user=current_user)
    return SubscriptionStatusResponse(
        subscription=_subscription_response(subscription),
    )


@router.post("/subscription/cancel", response_model=SubscriptionActionResponse)
async def cancel_subscription_renewal(
    request: Request,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> SubscriptionActionResponse:
    service = StripePaymentService(session, settings)
    user_agent, ip_address = _client_context(request)

    try:
        user, subscription = await service.schedule_subscription_cancellation(
            user=current_user,
            user_agent=user_agent,
            ip_address=ip_address,
        )
    except StripeConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe nu este configurat complet.",
        ) from exc
    except StripePlanUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except StripeRequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Stripe nu a putut actualiza abonamentul.",
        ) from exc

    return SubscriptionActionResponse(
        user=UserResponse.model_validate(user),
        subscription=_subscription_response(subscription),
        message="Reînnoirea abonamentului a fost anulată.",
    )


@router.post("/subscription/resume", response_model=SubscriptionActionResponse)
async def resume_subscription_renewal(
    request: Request,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> SubscriptionActionResponse:
    service = StripePaymentService(session, settings)
    user_agent, ip_address = _client_context(request)

    try:
        user, subscription = await service.resume_subscription_renewal(
            user=current_user,
            user_agent=user_agent,
            ip_address=ip_address,
        )
    except StripeConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe nu este configurat complet.",
        ) from exc
    except StripePlanUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except StripeRequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Stripe nu a putut actualiza abonamentul.",
        ) from exc

    return SubscriptionActionResponse(
        user=UserResponse.model_validate(user),
        subscription=_subscription_response(subscription),
        message="Reînnoirea abonamentului a fost reactivată.",
    )


@router.post("/checkout-session/sync", response_model=UserResponse)
async def sync_checkout_session(
    payload: CheckoutSessionSyncRequest,
    request: Request,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> UserResponse:
    service = StripePaymentService(session, settings)
    user_agent, ip_address = _client_context(request)

    try:
        user = await service.sync_completed_checkout_session(
            user=current_user,
            session_id=payload.session_id,
            user_agent=user_agent,
            ip_address=ip_address,
        )
    except StripeConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe nu este configurat complet.",
        ) from exc
    except StripePlanUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except StripeRequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Stripe nu a putut confirma sesiunea de plata.",
        ) from exc

    return UserResponse.model_validate(user)


@router.post("/stripe/webhook")
async def handle_stripe_webhook(
    request: Request,
    session: DbSession,
    settings: AppSettings,
) -> dict[str, bool]:
    service = StripePaymentService(session, settings)
    payload = await request.body()
    signature_header = request.headers.get("stripe-signature")

    try:
        await service.handle_webhook(
            payload=payload,
            signature_header=signature_header,
        )
    except (StripeConfigurationError, StripeSignatureError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return {"received": True}
