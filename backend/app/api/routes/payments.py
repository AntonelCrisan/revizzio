from fastapi import APIRouter, HTTPException, Request, status

from app.api.dependencies import AppSettings, CurrentUser, DbSession
from app.schemas.payments import (
    CheckoutSessionCreateRequest,
    CheckoutSessionResponse,
    CheckoutSessionSyncRequest,
    SubscriptionInvoiceResponse,
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
