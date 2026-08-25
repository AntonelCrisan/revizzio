import asyncio
import json
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from collections import defaultdict
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select

from app.api.dependencies import AppSettings, CurrentUser, DbSession
from app.core.config import Settings
from app.models import (
    CompanyData,
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
from app.services.email import (
    EmailDeliveryError,
    EmailMessage,
    EmailService,
    contact_confirmation_email,
    contact_notification_email,
    email_logo_html,
)

router = APIRouter(prefix="/api/compliance", tags=["compliance"])

MAX_USER_AGENT_LENGTH = 512
RATE_LIMIT_WINDOW_SECONDS = 600
RATE_LIMIT_MAX_REQUESTS = 30
RECAPTCHA_TIMEOUT_SECONDS = 5
_rate_limit_buckets: dict[str, list[float]] = defaultdict(list)
CONTACT_CATEGORY_LABELS = {
    "suport": "Suport",
    "facturare": "Facturare",
    "confidentialitate": "Confidențialitate",
    "raportare_continut": "Raportare conținut",
}


def _client_ip(request: Request) -> str | None:
    for header_name in ("x-forwarded-for", "x-real-ip", "cf-connecting-ip"):
        header_value = request.headers.get(header_name)
        if not header_value:
            continue
        client_ip = header_value.split(",", 1)[0].strip()
        if client_ip:
            return client_ip[:64]

    return request.client.host if request.client is not None else None


def _client_context(request: Request) -> tuple[str | None, str | None]:
    user_agent = request.headers.get("user-agent")
    if user_agent is not None:
        user_agent = user_agent[:MAX_USER_AGENT_LENGTH]
    ip_address = _client_ip(request)
    return user_agent, ip_address


def _registration_number(prefix: str) -> str:
    today = datetime.now(UTC).strftime("%Y%m%d")
    suffix = uuid.uuid4().hex[:8].upper()
    return f"{prefix}-{today}-{suffix}"


def _contact_reference(contact_message_id: uuid.UUID) -> str:
    today = datetime.now(UTC).strftime("%Y%m%d")
    suffix = contact_message_id.hex[:8].upper()
    return f"CON-{today}-{suffix}"


def _configured_email(value: str | None) -> str | None:
    if value is None:
        return None
    email = value.strip()
    if not email or (email.startswith("[") and email.endswith("]")):
        return None
    if "@" not in email or email.startswith("@"):
        return None
    return email[:320]


async def _contact_notification_recipient(session: DbSession) -> str | None:
    company_data = await session.scalar(select(CompanyData).order_by(CompanyData.id))
    if company_data is None:
        return None
    return _configured_email(company_data.email)


def _payload(data: Any) -> dict[str, object]:
    if not hasattr(data, "model_dump"):
        return {}
    return data.model_dump(mode="json", exclude={"recaptcha_token"})


def _email_event_payload(
    *,
    reference: str,
    email_type: str,
    recipient: str | None,
    error: str | None = None,
) -> dict[str, object]:
    payload: dict[str, object] = {
        "reference": reference,
        "email_type": email_type,
    }
    if recipient:
        payload["recipient"] = recipient
    if error:
        payload["error"] = error[:500]
    return payload


async def _send_contact_email(
    *,
    session: DbSession,
    settings: Settings,
    reference: str,
    email_type: str,
    message: EmailMessage,
    ip_address: str | None,
    user_agent: str | None,
) -> bool:
    try:
        await EmailService(settings).send(message)
    except EmailDeliveryError as exc:
        session.add(
            ComplianceEvent(
                event_type="contact_email_failed",
                payload=_email_event_payload(
                    reference=reference,
                    email_type=email_type,
                    recipient=message.to,
                    error=str(exc),
                ),
                ip_address=ip_address,
                user_agent=user_agent,
            )
        )
        await session.commit()
        return False

    session.add(
        ComplianceEvent(
            event_type="contact_email_sent",
            payload=_email_event_payload(
                reference=reference,
                email_type=email_type,
                recipient=message.to,
            ),
            ip_address=ip_address,
            user_agent=user_agent,
        )
    )
    await session.commit()
    return True


async def _send_contact_emails(
    *,
    payload: ContactRequest,
    reference: str,
    session: DbSession,
    settings: Settings,
    ip_address: str | None,
    user_agent: str | None,
) -> bool:
    category_label = CONTACT_CATEGORY_LABELS.get(payload.category, payload.category)
    logo_html = email_logo_html(settings.email_logo_url, app_name="Reviss")
    html, text = contact_confirmation_email(
        app_url=settings.public_app_url,
        reference=reference,
        category_label=category_label,
        subject=payload.subject,
        logo_html=logo_html,
    )
    confirmation_sent = await _send_contact_email(
        session=session,
        settings=settings,
        reference=reference,
        email_type="confirmation",
        message=EmailMessage(
            to=str(payload.email),
            subject=f"Am primit mesajul tău Reviss ({reference})",
            html=html,
            text=text,
        ),
        ip_address=ip_address,
        user_agent=user_agent,
    )

    notification_recipient = await _contact_notification_recipient(session)
    if notification_recipient is None:
        session.add(
            ComplianceEvent(
                event_type="contact_email_skipped",
                payload=_email_event_payload(
                    reference=reference,
                    email_type="notification",
                    recipient=None,
                    error="company_data.email nu este configurat.",
                ),
                ip_address=ip_address,
                user_agent=user_agent,
            )
        )
        await session.commit()
        return confirmation_sent

    html, text = contact_notification_email(
        app_url=settings.public_app_url,
        reference=reference,
        sender_name=payload.name,
        sender_email=str(payload.email),
        category_label=category_label,
        subject=payload.subject,
        message=payload.message,
        logo_html=logo_html,
    )
    await _send_contact_email(
        session=session,
        settings=settings,
        reference=reference,
        email_type="notification",
        message=EmailMessage(
            to=notification_recipient,
            subject=f"Mesaj nou Reviss: {payload.subject}",
            html=html,
            text=text,
            reply_to=str(payload.email),
        ),
        ip_address=ip_address,
        user_agent=user_agent,
    )
    return confirmation_sent


def _rate_limit_policy(
    request: Request,
    settings: Settings,
) -> tuple[int, int]:
    if request.url.path == "/api/compliance/contact":
        return (
            settings.contact_rate_limit_window_seconds,
            settings.contact_rate_limit_max_requests,
        )

    return RATE_LIMIT_WINDOW_SECONDS, RATE_LIMIT_MAX_REQUESTS


def _post_recaptcha_verification(
    *,
    verify_url: str,
    secret: str,
    token: str,
    remote_ip: str | None,
) -> dict[str, object]:
    form_data = {
        "secret": secret,
        "response": token,
    }
    if remote_ip:
        form_data["remoteip"] = remote_ip

    request = urllib.request.Request(
        verify_url,
        data=urllib.parse.urlencode(form_data).encode("utf-8"),
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Reviss/1.0",
        },
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=RECAPTCHA_TIMEOUT_SECONDS) as response:
        charset = response.headers.get_content_charset("utf-8")
        return json.loads(response.read().decode(charset))


async def verify_contact_recaptcha(
    token: str,
    request: Request,
    settings: Settings,
) -> None:
    if settings.recaptcha_secret_key is None:
        if settings.environment == "production":
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Protecția anti-spam nu este configurată.",
            )
        return

    normalized_token = token.strip()
    if not normalized_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirmă verificarea anti-spam înainte de trimitere.",
        )

    try:
        verification = await asyncio.to_thread(
            _post_recaptcha_verification,
            verify_url=settings.recaptcha_verify_url,
            secret=settings.recaptcha_secret_key.get_secret_value(),
            token=normalized_token,
            remote_ip=_client_ip(request),
        )
    except (
        TimeoutError,
        OSError,
        json.JSONDecodeError,
        urllib.error.URLError,
    ) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Verificarea anti-spam nu este disponibilă momentan.",
        ) from exc

    if verification.get("success") is not True:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Verificarea anti-spam a eșuat. Reîncarcă pagina și încearcă "
                "din nou."
            ),
        )


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

    form_intent = request.headers.get("x-reviss-form-intent")
    if not form_intent:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solicitarea nu a putut fi verificată.",
        )

    ip_address = _client_ip(request) or "unknown"
    bucket_key = f"{ip_address}:{request.url.path}"
    now = time.monotonic()
    rate_limit_window_seconds, rate_limit_max_requests = _rate_limit_policy(
        request,
        settings,
    )
    bucket = [
        timestamp
        for timestamp in _rate_limit_buckets[bucket_key]
        if now - timestamp < rate_limit_window_seconds
    ]
    if len(bucket) >= rate_limit_max_requests:
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
    settings: AppSettings,
) -> ComplianceResponse:
    await verify_contact_recaptcha(payload.recaptcha_token, request, settings)
    user_agent, ip_address = _client_context(request)
    contact_message = ContactMessage(
        name=payload.name,
        email=str(payload.email),
        category=payload.category,
        subject=payload.subject,
        message=payload.message,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    session.add(contact_message)
    await session.flush()
    reference = _contact_reference(contact_message.id)
    session.add(
        ComplianceEvent(
            event_type="contact_message_created",
            payload={
                **_payload(payload),
                "reference": reference,
                "contact_message_id": str(contact_message.id),
            },
            ip_address=ip_address,
            user_agent=user_agent,
        )
    )
    await session.commit()
    confirmation_sent = await _send_contact_emails(
        payload=payload,
        reference=reference,
        session=session,
        settings=settings,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    message = "Mesajul a fost înregistrat."
    if confirmation_sent:
        message += " Ți-am trimis confirmarea pe email."
    else:
        message += " Confirmarea pe email nu a putut fi trimisă momentan."
    return ComplianceResponse(message=message, registration_number=reference)


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
