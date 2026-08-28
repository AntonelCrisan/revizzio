from dataclasses import dataclass

import httpx

from app.core.config import Settings

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"
GOOGLE_REQUEST_TIMEOUT_SECONDS = 10.0


class GoogleOAuthError(Exception):
    pass


@dataclass(frozen=True)
class GoogleIdentity:
    sub: str
    email: str
    full_name: str


def _google_redirect_uri(settings: Settings) -> str:
    return f"{settings.public_app_url}/api/auth/google/callback"


async def exchange_code_for_identity(
    code: str,
    *,
    settings: Settings,
) -> GoogleIdentity:
    if settings.google_client_id is None or settings.google_client_secret is None:
        raise GoogleOAuthError("Google OAuth is not configured.")

    async with httpx.AsyncClient(timeout=GOOGLE_REQUEST_TIMEOUT_SECONDS) as client:
        try:
            token_response = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "code": code,
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret.get_secret_value(),
                    "redirect_uri": _google_redirect_uri(settings),
                    "grant_type": "authorization_code",
                },
            )
        except httpx.HTTPError as exc:
            raise GoogleOAuthError("Could not reach Google's token endpoint.") from exc

        if token_response.status_code != 200:
            raise GoogleOAuthError("Google rejected the authorization code.")

        id_token = token_response.json().get("id_token")
        if not id_token:
            raise GoogleOAuthError("Google's token response is missing an ID token.")

        try:
            tokeninfo_response = await client.get(
                GOOGLE_TOKENINFO_URL,
                params={"id_token": id_token},
            )
        except httpx.HTTPError as exc:
            raise GoogleOAuthError(
                "Could not reach Google's tokeninfo endpoint."
            ) from exc

    if tokeninfo_response.status_code != 200:
        raise GoogleOAuthError("Google's ID token could not be verified.")

    claims = tokeninfo_response.json()

    if claims.get("aud") != settings.google_client_id:
        raise GoogleOAuthError("Google ID token was issued for a different client.")
    if claims.get("email_verified") not in {"true", True}:
        raise GoogleOAuthError("Google account email is not verified.")

    sub = claims.get("sub")
    email = claims.get("email")
    if not sub or not email:
        raise GoogleOAuthError("Google ID token is missing required claims.")

    full_name = claims.get("name") or email

    return GoogleIdentity(sub=sub, email=email.lower(), full_name=full_name)
