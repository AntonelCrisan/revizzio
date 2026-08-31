from urllib.parse import urlparse

from fastapi import HTTPException, Request, status

from app.api.dependencies import AppSettings


def request_origin(request: Request) -> str | None:
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


def protect_state_changing_request(request: Request, settings: AppSettings) -> None:
    if request.method in {"GET", "HEAD", "OPTIONS"}:
        return

    origin = request_origin(request)
    if origin is None:
        return

    if origin not in {allowed.rstrip("/") for allowed in settings.allowed_origins}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cererea nu a putut fi verificata.",
        )
