import hashlib
from datetime import UTC, datetime
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException, Request, Response, status

from app.api.dependencies import (
    AppSettings,
    AuthServiceDependency,
    CurrentUser,
    DbSession,
)
from app.core.rate_limit import _memory_rate_limit_buckets, consume_rate_limit
from app.models import User
from app.schemas.auth import (
    ChangePasswordRequest,
    ConfirmEmailChangeRequest,
    EmailVerificationRequest,
    LoginRequest,
    MessageResponse,
    PasswordResetConfirmRequest,
    PasswordResetRequest,
    RegisterRequest,
    RequestEmailChangeRequest,
    UpdateFullNameRequest,
)
from app.schemas.preferences import StudyPreferencesResponse, StudyPreferencesUpdate
from app.schemas.user import UserPreferencesUpdate, UserResponse
from app.services.auth import (
    AccountDeletionRequestAlreadyPendingError,
    AuthResult,
    AuthService,
    EmailAlreadyRegisteredError,
    EmailDeliveryUnavailableError,
    EmailUnchangedError,
    InvalidCredentialsError,
    InvalidEmailTokenError,
    PendingEmailConfirmationError,
)
from app.services.pdf_export import account_data_export_pdf
from app.services.preferences import PreferencesService, StudyPreferences

router = APIRouter(prefix="/api/auth", tags=["authentication"])

MAX_USER_AGENT_LENGTH = 512
AUTH_RATE_LIMIT_WINDOW_SECONDS = 300
AUTH_RATE_LIMIT_IDENTITY_POLICIES = {
    "register": 5,
    "login": 10,
    "me/deletion-request": 3,
    "me/password": 8,
    "me/name": 10,
    "me/email/request": 5,
    "email/confirm": 10,
    "me/newsletter-consent/withdraw": 10,
    "me/data-export": 10,
    "me/study-preferences": 20,
    "password-reset/request": 5,
    "password-reset/confirm": 10,
}
AUTH_RATE_LIMIT_IP_POLICIES = {
    "register": 20,
    "verify-email": 60,
    "login": 50,
    "me/deletion-request": 10,
    "me/password": 20,
    "me/name": 20,
    "me/email/request": 20,
    "email/confirm": 30,
    "me/newsletter-consent/withdraw": 20,
    "me/data-export": 20,
    "me/study-preferences": 40,
    "password-reset/request": 20,
    "password-reset/confirm": 30,
}
_auth_rate_limit_buckets = _memory_rate_limit_buckets


async def _user_response(user: User, service: AuthService) -> UserResponse:
    response = UserResponse.model_validate(user)
    has_pending_deletion = await service.has_pending_account_deletion_request(user)
    return response.model_copy(
        update={"account_deletion_request_pending": has_pending_deletion}
    )


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


def _normalized_rate_limit_value(value: str | None) -> str:
    normalized = value.strip().lower() if value else "global"
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


async def _enforce_auth_rate_limit(
    request: Request,
    action: str,
    *,
    identity: str | None = None,
) -> None:
    ip_address = _client_ip(request) or "unknown"
    await consume_rate_limit(
        bucket_key=f"auth:{action}:{ip_address}:ip",
        max_requests=AUTH_RATE_LIMIT_IP_POLICIES[action],
        window_seconds=AUTH_RATE_LIMIT_WINDOW_SECONDS,
        error_message="Prea multe incercari. Incearca din nou peste putin timp.",
    )
    if identity is None or action not in AUTH_RATE_LIMIT_IDENTITY_POLICIES:
        return

    await consume_rate_limit(
        bucket_key=(
            f"auth:{action}:{ip_address}:{_normalized_rate_limit_value(identity)}"
        ),
        max_requests=AUTH_RATE_LIMIT_IDENTITY_POLICIES[action],
        window_seconds=AUTH_RATE_LIMIT_WINDOW_SECONDS,
        error_message="Prea multe incercari. Incearca din nou peste putin timp.",
    )


def _request_origin(request: Request) -> str | None:
    origin = request.headers.get("origin")
    if origin:
        return origin.rstrip("/")

    referer = request.headers.get("referer")
    if not referer:
        return None

    parsed_referer = urlparse(referer)
    if not parsed_referer.scheme or not parsed_referer.netloc:
        return None
    return f"{parsed_referer.scheme}://{parsed_referer.netloc}"


def _protect_auth_origin(request: Request, settings: AppSettings) -> None:
    origin = _request_origin(request)
    if origin is None:
        return

    if origin not in {allowed.rstrip("/") for allowed in settings.allowed_origins}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cererea nu a putut fi verificata.",
        )


def _set_session_cookie(
    response: Response,
    result: AuthResult,
    settings: AppSettings,
) -> None:
    max_age = (
        max(int((result.expires_at - datetime.now(UTC)).total_seconds()), 0)
        if result.persistent
        else None
    )
    response.set_cookie(
        key=settings.session_cookie_name,
        value=result.session_token,
        max_age=max_age,
        expires=result.expires_at if result.persistent else None,
        path="/",
        domain=settings.session_cookie_domain,
        secure=settings.session_cookie_secure,
        httponly=True,
        samesite=settings.session_cookie_samesite,
    )


def _clear_session_cookie(
    response: Response,
    settings: AppSettings,
) -> None:
    response.delete_cookie(
        key=settings.session_cookie_name,
        path="/",
        domain=settings.session_cookie_domain,
        secure=settings.session_cookie_secure,
        httponly=True,
        samesite=settings.session_cookie_samesite,
    )


@router.post(
    "/register",
    response_model=MessageResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def register(
    payload: RegisterRequest,
    request: Request,
    service: AuthServiceDependency,
    settings: AppSettings,
) -> MessageResponse:
    _protect_auth_origin(request, settings)
    await _enforce_auth_rate_limit(
        request,
        "register",
        identity=str(payload.email),
    )
    user_agent, ip_address = _client_context(request)
    try:
        await service.register(
            payload,
            user_agent=user_agent,
            ip_address=ip_address,
        )
    except EmailAlreadyRegisteredError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Există deja un cont asociat acestei adrese de email.",
        ) from exc
    except EmailDeliveryUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Emailul de confirmare nu a putut fi trimis momentan. "
                "Te rugăm să încerci din nou."
            ),
        ) from exc

    return MessageResponse(
        message=(
            "Ți-am trimis un email de confirmare. Contul va fi creat după "
            "validarea adresei de email."
        ),
    )


@router.post("/verify-email", response_model=UserResponse)
async def verify_email(
    payload: EmailVerificationRequest,
    request: Request,
    response: Response,
    service: AuthServiceDependency,
    settings: AppSettings,
) -> UserResponse:
    _protect_auth_origin(request, settings)
    await _enforce_auth_rate_limit(request, "verify-email")
    user_agent, ip_address = _client_context(request)
    try:
        result = await service.verify_email(
            payload.token,
            user_agent=user_agent,
            ip_address=ip_address,
        )
    except InvalidEmailTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Linkul de confirmare este invalid sau a expirat.",
        ) from exc
    except EmailAlreadyRegisteredError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Există deja un cont asociat acestei adrese de email.",
        ) from exc

    _set_session_cookie(response, result, settings)
    return await _user_response(result.user, service)


@router.post("/login", response_model=UserResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    service: AuthServiceDependency,
    settings: AppSettings,
) -> UserResponse:
    _protect_auth_origin(request, settings)
    await _enforce_auth_rate_limit(
        request,
        "login",
        identity=str(payload.email),
    )
    user_agent, ip_address = _client_context(request)
    try:
        result = await service.login(
            payload,
            user_agent=user_agent,
            ip_address=ip_address,
        )
    except InvalidCredentialsError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Emailul sau parola sunt incorecte.",
        ) from exc
    except PendingEmailConfirmationError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Contul este in asteptarea confirmarii. Verifica emailul "
                "primit si confirma adresa inainte sa te autentifici."
            ),
        ) from exc

    _set_session_cookie(response, result, settings)
    return await _user_response(result.user, service)


@router.post("/password-reset/request", response_model=MessageResponse)
async def request_password_reset(
    payload: PasswordResetRequest,
    request: Request,
    service: AuthServiceDependency,
    settings: AppSettings,
) -> MessageResponse:
    _protect_auth_origin(request, settings)
    await _enforce_auth_rate_limit(
        request,
        "password-reset/request",
        identity=str(payload.email),
    )
    user_agent, ip_address = _client_context(request)
    try:
        await service.request_password_reset(
            payload,
            user_agent=user_agent,
            ip_address=ip_address,
        )
    except EmailDeliveryUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Emailul de resetare nu a putut fi trimis momentan. "
                "Te rugăm să încerci din nou."
            ),
        ) from exc

    return MessageResponse(
        message=(
            "Dacă adresa există în platformă, vei primi în scurt timp un link "
            "pentru resetarea parolei."
        ),
    )


@router.post("/password-reset/confirm", response_model=MessageResponse)
async def confirm_password_reset(
    payload: PasswordResetConfirmRequest,
    request: Request,
    response: Response,
    service: AuthServiceDependency,
    settings: AppSettings,
) -> MessageResponse:
    _protect_auth_origin(request, settings)
    await _enforce_auth_rate_limit(
        request,
        "password-reset/confirm",
        identity=payload.token,
    )
    user_agent, ip_address = _client_context(request)
    try:
        await service.reset_password(
            token=payload.token,
            password=payload.password,
            user_agent=user_agent,
            ip_address=ip_address,
        )
    except InvalidEmailTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Linkul de resetare este invalid sau a expirat.",
        ) from exc

    _clear_session_cookie(response, settings)
    return MessageResponse(message="Parola a fost actualizată. Te poți autentifica.")


@router.post("/logout", response_model=MessageResponse)
async def logout(
    request: Request,
    response: Response,
    service: AuthServiceDependency,
    settings: AppSettings,
) -> MessageResponse:
    user_agent, ip_address = _client_context(request)
    await service.logout(
        request.cookies.get(settings.session_cookie_name),
        user_agent=user_agent,
        ip_address=ip_address,
    )
    _clear_session_cookie(response, settings)
    return MessageResponse(message="Sesiunea a fost închisă.")


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: CurrentUser,
    service: AuthServiceDependency,
) -> UserResponse:
    return await _user_response(current_user, service)


@router.patch("/me/preferences", response_model=UserResponse)
async def update_preferences(
    payload: UserPreferencesUpdate,
    current_user: CurrentUser,
    service: AuthServiceDependency,
) -> UserResponse:
    user = await service.update_preferences(
        current_user,
        theme_preference=payload.theme_preference,
        language_preference=payload.language_preference,
    )
    return await _user_response(user, service)


def _study_preferences_response(
    study_preferences: StudyPreferences,
) -> StudyPreferencesResponse:
    response = StudyPreferencesResponse.model_validate(study_preferences.preferences)
    return response.model_copy(
        update={"newsletter_consent": study_preferences.newsletter_consent}
    )


@router.get("/me/study-preferences", response_model=StudyPreferencesResponse)
async def get_study_preferences(
    request: Request,
    current_user: CurrentUser,
    session: DbSession,
) -> StudyPreferencesResponse:
    await _enforce_auth_rate_limit(
        request,
        "me/study-preferences",
        identity=str(current_user.id),
    )
    service = PreferencesService(session)
    study_preferences = await service.get(current_user)
    return _study_preferences_response(study_preferences)


@router.patch("/me/study-preferences", response_model=StudyPreferencesResponse)
async def update_study_preferences(
    payload: StudyPreferencesUpdate,
    request: Request,
    current_user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> StudyPreferencesResponse:
    _protect_auth_origin(request, settings)
    await _enforce_auth_rate_limit(
        request,
        "me/study-preferences",
        identity=str(current_user.id),
    )
    service = PreferencesService(session)
    study_preferences = await service.update(
        current_user,
        study_pace=payload.study_pace,
        ai_feedback_style=payload.ai_feedback_style,
        automation_daily_review=payload.automation_daily_review,
        automation_quiz_after_summary=payload.automation_quiz_after_summary,
        automation_weak_concept_alerts=payload.automation_weak_concept_alerts,
        notify_email_enabled=payload.notify_email_enabled,
        notify_alert_project_ready=payload.notify_alert_project_ready,
        notify_alert_billing=payload.notify_alert_billing,
        notify_frequency=payload.notify_frequency,
        newsletter_consent=payload.newsletter_consent,
    )
    return _study_preferences_response(study_preferences)


@router.patch("/me/password", response_model=MessageResponse)
async def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    current_user: CurrentUser,
    service: AuthServiceDependency,
    settings: AppSettings,
) -> MessageResponse:
    _protect_auth_origin(request, settings)
    await _enforce_auth_rate_limit(
        request,
        "me/password",
        identity=str(current_user.id),
    )
    current_session_token = request.cookies.get(settings.session_cookie_name)
    if current_session_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autentificarea este necesară.",
        )

    user_agent, ip_address = _client_context(request)
    try:
        await service.change_password(
            current_user,
            current_password=payload.current_password,
            new_password=payload.new_password,
            current_session_token=current_session_token,
            user_agent=user_agent,
            ip_address=ip_address,
        )
    except InvalidCredentialsError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Parola curentă este incorectă.",
        ) from exc

    return MessageResponse(
        message="Parola a fost actualizată. Celelalte sesiuni au fost revocate.",
    )


@router.patch("/me/name", response_model=UserResponse)
async def update_full_name(
    payload: UpdateFullNameRequest,
    request: Request,
    current_user: CurrentUser,
    service: AuthServiceDependency,
    settings: AppSettings,
) -> UserResponse:
    _protect_auth_origin(request, settings)
    await _enforce_auth_rate_limit(
        request,
        "me/name",
        identity=str(current_user.id),
    )
    user = await service.update_full_name(current_user, full_name=payload.full_name)
    return await _user_response(user, service)


@router.post("/me/email/change-request", response_model=MessageResponse)
async def request_email_change(
    payload: RequestEmailChangeRequest,
    request: Request,
    current_user: CurrentUser,
    service: AuthServiceDependency,
    settings: AppSettings,
) -> MessageResponse:
    _protect_auth_origin(request, settings)
    await _enforce_auth_rate_limit(
        request,
        "me/email/request",
        identity=str(current_user.id),
    )
    user_agent, ip_address = _client_context(request)
    try:
        await service.request_email_change(
            current_user,
            new_email=str(payload.new_email),
            current_password=payload.current_password,
            user_agent=user_agent,
            ip_address=ip_address,
        )
    except InvalidCredentialsError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Parola curentă este incorectă.",
        ) from exc
    except EmailUnchangedError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Adresa introdusă este identică cu cea curentă.",
        ) from exc
    except EmailAlreadyRegisteredError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Există deja un cont asociat acestei adrese de email.",
        ) from exc
    except EmailDeliveryUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Emailul de confirmare nu a putut fi trimis momentan. "
                "Te rugăm să încerci din nou."
            ),
        ) from exc

    return MessageResponse(
        message=(
            f"Ți-am trimis un email de confirmare la {payload.new_email}. "
            "Adresa se schimbă după confirmare."
        ),
    )


@router.post("/email/confirm", response_model=MessageResponse)
async def confirm_email_change(
    payload: ConfirmEmailChangeRequest,
    request: Request,
    service: AuthServiceDependency,
    settings: AppSettings,
) -> MessageResponse:
    _protect_auth_origin(request, settings)
    await _enforce_auth_rate_limit(request, "email/confirm", identity=payload.token)
    user_agent, ip_address = _client_context(request)
    try:
        await service.confirm_email_change(
            payload.token,
            user_agent=user_agent,
            ip_address=ip_address,
        )
    except InvalidEmailTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Linkul de confirmare este invalid sau a expirat.",
        ) from exc
    except EmailAlreadyRegisteredError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Există deja un cont asociat acestei adrese de email.",
        ) from exc

    return MessageResponse(message="Adresa de email a fost schimbată.")


@router.post("/me/newsletter-consent/withdraw", response_model=MessageResponse)
async def withdraw_newsletter_consent(
    request: Request,
    current_user: CurrentUser,
    service: AuthServiceDependency,
    settings: AppSettings,
) -> MessageResponse:
    _protect_auth_origin(request, settings)
    await _enforce_auth_rate_limit(
        request,
        "me/newsletter-consent/withdraw",
        identity=str(current_user.id),
    )
    await service.withdraw_newsletter_consent(current_user)
    return MessageResponse(
        message="Consimțământul pentru newsletter a fost retras.",
    )


@router.get("/me/data-export")
async def export_account_data(
    request: Request,
    current_user: CurrentUser,
    service: AuthServiceDependency,
) -> Response:
    await _enforce_auth_rate_limit(
        request,
        "me/data-export",
        identity=str(current_user.id),
    )
    payload = await service.export_account_data(current_user)
    body = account_data_export_pdf(payload)
    return Response(
        content=body,
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="reviss-date-cont.pdf"',
        },
    )


@router.post(
    "/me/deletion-request",
    response_model=MessageResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def request_account_deletion(
    request: Request,
    current_user: CurrentUser,
    service: AuthServiceDependency,
    settings: AppSettings,
) -> MessageResponse:
    _protect_auth_origin(request, settings)
    await _enforce_auth_rate_limit(
        request,
        "me/deletion-request",
        identity=str(current_user.id),
    )
    user_agent, ip_address = _client_context(request)
    try:
        await service.request_account_deletion(
            current_user,
            user_agent=user_agent,
            ip_address=ip_address,
        )
    except AccountDeletionRequestAlreadyPendingError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Ai deja o solicitare de ștergere înregistrată. "
                "Un administrator o va procesa."
            ),
        ) from exc
    return MessageResponse(
        message=(
            "Solicitarea de ștergere a contului a fost înregistrată. "
            "Un administrator o va procesa."
        ),
    )
