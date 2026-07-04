from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Request, Response, status

from app.api.dependencies import (
    AppSettings,
    AuthServiceDependency,
    CurrentUser,
)
from app.schemas.auth import (
    EmailVerificationRequest,
    LoginRequest,
    MessageResponse,
    PasswordResetConfirmRequest,
    PasswordResetRequest,
    RegisterRequest,
)
from app.schemas.user import UserPreferencesUpdate, UserResponse
from app.services.auth import (
    AuthResult,
    EmailDeliveryUnavailableError,
    EmailAlreadyRegisteredError,
    InvalidEmailTokenError,
    InvalidCredentialsError,
    PendingEmailConfirmationError,
)

router = APIRouter(prefix="/api/auth", tags=["authentication"])


def _client_context(request: Request) -> tuple[str | None, str | None]:
    user_agent = request.headers.get("user-agent")
    ip_address = request.client.host if request.client is not None else None
    return user_agent, ip_address


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
) -> MessageResponse:
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
            detail="Emailul de confirmare nu a putut fi trimis momentan. Te rugăm să încerci din nou.",
        ) from exc

    return MessageResponse(
        message="Ți-am trimis un email de confirmare. Contul va fi creat după validarea adresei de email.",
    )


@router.post("/verify-email", response_model=UserResponse)
async def verify_email(
    payload: EmailVerificationRequest,
    request: Request,
    response: Response,
    service: AuthServiceDependency,
    settings: AppSettings,
) -> UserResponse:
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
    return UserResponse.model_validate(result.user)


@router.post("/login", response_model=UserResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    service: AuthServiceDependency,
    settings: AppSettings,
) -> UserResponse:
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
            detail="Contul este in asteptarea confirmarii. Verifica emailul primit si confirma adresa inainte sa te autentifici.",
        ) from exc

    _set_session_cookie(response, result, settings)
    return UserResponse.model_validate(result.user)


@router.post("/password-reset/request", response_model=MessageResponse)
async def request_password_reset(
    payload: PasswordResetRequest,
    request: Request,
    service: AuthServiceDependency,
) -> MessageResponse:
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
            detail="Emailul de resetare nu a putut fi trimis momentan. Te rugăm să încerci din nou.",
        ) from exc

    return MessageResponse(
        message="Dacă adresa există în platformă, vei primi în scurt timp un link pentru resetarea parolei.",
    )


@router.post("/password-reset/confirm", response_model=MessageResponse)
async def confirm_password_reset(
    payload: PasswordResetConfirmRequest,
    request: Request,
    response: Response,
    service: AuthServiceDependency,
    settings: AppSettings,
) -> MessageResponse:
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
async def get_me(current_user: CurrentUser) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.patch("/me/preferences", response_model=UserResponse)
async def update_preferences(
    payload: UserPreferencesUpdate,
    current_user: CurrentUser,
    service: AuthServiceDependency,
) -> UserResponse:
    user = await service.update_theme_preference(
        current_user,
        payload.theme_preference,
    )
    return UserResponse.model_validate(user)
