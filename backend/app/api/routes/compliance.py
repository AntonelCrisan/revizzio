import time
import uuid
from collections import defaultdict
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.api.dependencies import AppSettings, CurrentUser, DbSession
from app.models import (
    ComplianceEvent,
    ContactMessage,
    ContentReport,
    SubscriptionCancellation,
    WithdrawalRequest,
)
from app.schemas.compliance import (
    ComplianceResponse,
    ContactRequest,
    ContentReportRequestPayload,
    CookieConsentRequest,
    SubscriptionCancellationRequest,
    WithdrawalRequestPayload,
)

router = APIRouter(prefix="/api/compliance", tags=["compliance"])

RATE_LIMIT_WINDOW_SECONDS = 600
RATE_LIMIT_MAX_REQUESTS = 30
_rate_limit_buckets: dict[str, list[float]] = defaultdict(list)


def _client_context(request: Request) -> tuple[str | None, str | None]:
    user_agent = request.headers.get("user-agent")
    ip_address = request.client.host if request.client is not None else None
    return user_agent, ip_address


def _registration_number(prefix: str) -> str:
    today = datetime.now(UTC).strftime("%Y%m%d")
    suffix = uuid.uuid4().hex[:8].upper()
    return f"{prefix}-{today}-{suffix}"


def _payload(data: Any) -> dict[str, object]:
    return data.model_dump(mode="json") if hasattr(data, "model_dump") else {}


async def protect_form_request(
    request: Request,
    settings: AppSettings,
) -> None:
    origin = request.headers.get("origin")
    referer = request.headers.get("referer")
    allowed_origins = set(settings.allowed_origins)

    if origin and origin not in allowed_origins:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Originea solicitării nu este permisă.",
        )

    if not origin and referer and not any(
        referer.startswith(allowed_origin) for allowed_origin in allowed_origins
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Referer-ul solicitării nu este permis.",
        )

    form_intent = request.headers.get("x-revizzio-form-intent")
    if not form_intent:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solicitarea nu a putut fi verificată.",
        )

    ip_address = request.client.host if request.client is not None else "unknown"
    bucket_key = f"{ip_address}:{request.url.path}"
    now = time.monotonic()
    bucket = [
        timestamp
        for timestamp in _rate_limit_buckets[bucket_key]
        if now - timestamp < RATE_LIMIT_WINDOW_SECONDS
    ]
    if len(bucket) >= RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Prea multe solicitări. Încearcă din nou mai târziu.",
        )
    bucket.append(now)
    _rate_limit_buckets[bucket_key] = bucket


FormProtection = Depends(protect_form_request)


@router.post(
    "/cookie-consent",
    response_model=ComplianceResponse,
    dependencies=[FormProtection],
)
async def log_cookie_consent(
    payload: CookieConsentRequest,
    request: Request,
    session: DbSession,
) -> ComplianceResponse:
    user_agent, ip_address = _client_context(request)
    session.add(
        ComplianceEvent(
            event_type="cookie_consent_changed",
            payload=_payload(payload),
            ip_address=ip_address,
            user_agent=user_agent,
        )
    )
    await session.commit()
    return ComplianceResponse(message="Preferințele cookie au fost salvate.")


@router.post(
    "/contact",
    response_model=ComplianceResponse,
    dependencies=[FormProtection],
)
async def create_contact_message(
    payload: ContactRequest,
    request: Request,
    session: DbSession,
) -> ComplianceResponse:
    user_agent, ip_address = _client_context(request)
    session.add(
        ContactMessage(
            name=payload.name,
            email=str(payload.email),
            category=payload.category,
            subject=payload.subject,
            message=payload.message,
            ip_address=ip_address,
            user_agent=user_agent,
        )
    )
    session.add(
        ComplianceEvent(
            event_type="contact_message_created",
            payload=_payload(payload),
            ip_address=ip_address,
            user_agent=user_agent,
        )
    )
    await session.commit()
    return ComplianceResponse(message="Mesajul a fost înregistrat.")


@router.post(
    "/withdrawal",
    response_model=ComplianceResponse,
    dependencies=[FormProtection],
)
async def create_withdrawal_request(
    payload: WithdrawalRequestPayload,
    request: Request,
    session: DbSession,
) -> ComplianceResponse:
    user_agent, ip_address = _client_context(request)
    registration_number = _registration_number("RET")
    session.add(
        WithdrawalRequest(
            registration_number=registration_number,
            full_name=payload.full_name,
            email=str(payload.email),
            subscription_or_order=payload.subscription_or_order,
            order_number=payload.order_number,
            reason=payload.reason,
            confirmation=payload.confirmation,
            ip_address=ip_address,
            user_agent=user_agent,
        )
    )
    session.add(
        ComplianceEvent(
            event_type="withdrawal_request_created",
            payload={
                **_payload(payload),
                "registration_number": registration_number,
                "email_confirmation_status": "queued",
            },
            ip_address=ip_address,
            user_agent=user_agent,
        )
    )
    await session.commit()
    return ComplianceResponse(
        message=(
            "Solicitarea de retragere a fost înregistrată. Confirmarea prin "
            "e-mail este pusă în coadă pentru trimitere."
        ),
        registration_number=registration_number,
    )


@router.post(
    "/content-report",
    response_model=ComplianceResponse,
    dependencies=[FormProtection],
)
async def create_content_report(
    payload: ContentReportRequestPayload,
    request: Request,
    session: DbSession,
) -> ComplianceResponse:
    user_agent, ip_address = _client_context(request)
    registration_number = _registration_number("RAP")
    session.add(
        ContentReport(
            registration_number=registration_number,
            name=payload.name,
            email=str(payload.email),
            report_type=payload.report_type,
            content_reference=payload.content_reference,
            description=payload.description,
            rights_evidence=payload.rights_evidence,
            declaration=payload.declaration,
            ip_address=ip_address,
            user_agent=user_agent,
        )
    )
    session.add(
        ComplianceEvent(
            event_type="content_report_created",
            payload={
                **_payload(payload),
                "registration_number": registration_number,
            },
            ip_address=ip_address,
            user_agent=user_agent,
        )
    )
    await session.commit()
    return ComplianceResponse(
        message="Sesizarea a fost înregistrată.",
        registration_number=registration_number,
    )


@router.post(
    "/subscription-cancel",
    response_model=ComplianceResponse,
    dependencies=[FormProtection],
)
async def cancel_subscription_renewal(
    payload: SubscriptionCancellationRequest,
    request: Request,
    session: DbSession,
    current_user: CurrentUser,
) -> ComplianceResponse:
    user_agent, ip_address = _client_context(request)
    active_until = "24 iulie 2026"
    session.add(
        SubscriptionCancellation(
            user_id=current_user.id,
            plan_name=payload.plan_name,
            renewal_date=payload.renewal_date,
            price=payload.price,
            active_until=active_until,
        )
    )
    session.add(
        ComplianceEvent(
            user_id=current_user.id,
            event_type="subscription_renewal_cancelled",
            payload={
                **_payload(payload),
                "active_until": active_until,
            },
            ip_address=ip_address,
            user_agent=user_agent,
        )
    )
    await session.commit()
    return ComplianceResponse(
        message="Reînnoirea automată a abonamentului a fost oprită.",
        active_until=active_until,
    )
