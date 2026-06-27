from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Request, Response, status

from app.api.dependencies import (
    AppSettings,
    AuthServiceDependency,
    CurrentUser,
)
from app.schemas.auth import LoginRequest, MessageResponse, RegisterRequest
from app.schemas.user import UserPreferencesUpdate, UserResponse
from app.services.auth import (
    AuthResult,
    EmailAlreadyRegisteredError,
    InvalidCredentialsError,
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
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    payload: RegisterRequest,
    request: Request,
    response: Response,
    service: AuthServiceDependency,
    settings: AppSettings,
) -> UserResponse:
    user_agent, ip_address = _client_context(request)
    try:
        result = await service.register(
            payload,
            user_agent=user_agent,
            ip_address=ip_address,
        )
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

    _set_session_cookie(response, result, settings)
    return UserResponse.model_validate(result.user)


@router.post("/logout", response_model=MessageResponse)
async def logout(
    request: Request,
    response: Response,
    service: AuthServiceDependency,
    settings: AppSettings,
) -> MessageResponse:
    await service.logout(request.cookies.get(settings.session_cookie_name))
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
