from __future__ import annotations

import json
import urllib.error
import urllib.request
from dataclasses import dataclass
from functools import lru_cache
from html import escape
from pathlib import Path

from anyio import to_thread

from app.core.config import Settings

RESEND_EMAILS_URL = "https://api.resend.com/emails"
PROJECT_DIR = Path(__file__).resolve().parents[3]
DEFAULT_LOGO_PATH = (
    PROJECT_DIR
    / "frontend"
    / "public"
    / "assets"
    / "logos"
    / "revizzio-logo-dark.svg"
)


class EmailDeliveryError(Exception):
    pass


@dataclass(frozen=True)
class EmailMessage:
    to: str
    subject: str
    html: str
    text: str


class EmailService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def send(self, message: EmailMessage) -> None:
        await to_thread.run_sync(self._send_sync, message)

    def _send_sync(self, message: EmailMessage) -> None:
        if self._settings.resend_api_key is None:
            raise EmailDeliveryError("RESEND_API_KEY nu este configurat.")

        payload = {
            "from": self._settings.resend_from_email,
            "to": [message.to],
            "subject": message.subject,
            "html": message.html,
            "text": message.text,
        }
        body = json.dumps(payload).encode("utf-8")
        request = urllib.request.Request(
            RESEND_EMAILS_URL,
            data=body,
            method="POST",
            headers={
                "Authorization": (
                    f"Bearer {self._settings.resend_api_key.get_secret_value()}"
                ),
                "Accept": "application/json",
                "Content-Type": "application/json",
                "User-Agent": "Revizzio/1.0",
            },
        )

        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                if response.status >= 400:
                    raise EmailDeliveryError(
                        f"Resend a întors statusul {response.status}."
                    )
        except urllib.error.HTTPError as exc:
            response_body = exc.read().decode("utf-8", errors="replace")
            raise EmailDeliveryError(
                f"Resend a refuzat trimiterea emailului: {response_body}"
            ) from exc
        except urllib.error.URLError as exc:
            raise EmailDeliveryError(
                "Serviciul Resend nu a putut fi contactat."
            ) from exc


def _fallback_logo_html(app_name: str) -> str:
    return (
        '<span style="display: inline-block; color: #2d2823; '
        "font-family: Georgia, 'Times New Roman', serif; font-size: 28px; "
        f'font-weight: 700; line-height: 36px;">{escape(app_name)}</span>'
    )


@lru_cache(maxsize=8)
def default_email_logo_html(app_name: str = "Revizzio") -> str:
    try:
        logo_svg = DEFAULT_LOGO_PATH.read_text(encoding="utf-8")
    except OSError:
        return _fallback_logo_html(app_name)

    logo_svg = logo_svg.replace('<?xml version="1.0" encoding="UTF-8"?>', "").strip()
    aria_label = escape(app_name, quote=True)
    if "<svg " in logo_svg:
        logo_svg = logo_svg.replace(
            "<svg ",
            (
                f'<svg role="img" aria-label="{aria_label}" width="158" '
                'height="36" style="display:block;width:158px;'
                'max-width:158px;height:auto;" '
            ),
            1,
        )
    return logo_svg


def email_logo_html(logo_url: str | None, app_name: str = "Revizzio") -> str:
    if logo_url:
        safe_logo_url = escape(logo_url, quote=True)
        safe_app_name = escape(app_name, quote=True)
        return (
            f'<img src="{safe_logo_url}" width="158" height="36" '
            f'alt="{safe_app_name}" style="display:block;width:158px;'
            'max-width:158px;height:auto;border:0;outline:none;'
            'text-decoration:none;">'
        )
    return default_email_logo_html(app_name)


def _email_shell(
    *,
    app_name: str,
    eyebrow: str,
    title: str,
    intro: str,
    logo_html: str,
    cta_label: str,
    action_url: str,
    note_title: str,
    note: str,
    details: list[str],
) -> str:
    safe_app_name = escape(app_name)
    safe_action_url = escape(action_url, quote=True)
    detail_items = "".join(
        f"""
        <tr>
          <td style="padding: 7px 0; vertical-align: top;">
            <span style="display: inline-block; width: 22px; height: 22px; border-radius: 999px; background: #eef5ea; color: #31422c; font-size: 13px; font-weight: 700; line-height: 22px; text-align: center;">✓</span>
          </td>
          <td style="padding: 7px 0 7px 10px; color: #675d54; font-size: 14px; line-height: 1.55;">
            {escape(detail)}
          </td>
        </tr>
        """
        for detail in details
    )

    return f"""
    <!doctype html>
    <html lang="ro">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="color-scheme" content="light">
        <title>{escape(title)}</title>
      </head>
      <body style="margin: 0; padding: 0; background: #f6f1e9; color: #2d2823; font-family: Arial, Helvetica, sans-serif;">
        <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">
          {escape(intro)}
        </div>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #f6f1e9; padding: 32px 14px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 620px; overflow: hidden; border: 1px solid #e5dacb; border-radius: 28px; background: #fffdfa; box-shadow: 0 22px 70px rgba(48, 39, 31, 0.12);">
                <tr>
                  <td style="padding: 28px 30px 0;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="height: 42px;">
                          {logo_html}
                        </td>
                        <td align="right" style="color: #8a7b6b; font-size: 11px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase;">
                          {escape(eyebrow)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 34px 30px 8px;">
                    <h1 style="margin: 0; color: #2d2823; font-family: Georgia, 'Times New Roman', serif; font-size: 36px; line-height: 1.08; letter-spacing: -0.03em;">
                      {escape(title)}
                    </h1>
                    <p style="margin: 18px 0 0; color: #675d54; font-size: 16px; line-height: 1.65;">
                      {escape(intro)}
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 22px 30px 8px;">
                    <a href="{safe_action_url}" style="display: inline-block; border-radius: 999px; background: #3e352f; color: #fff8ec; font-size: 15px; font-weight: 800; line-height: 1; padding: 16px 22px; text-decoration: none;">
                      {escape(cta_label)}
                    </a>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 22px 30px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top: 1px solid #ede3d6; border-bottom: 1px solid #ede3d6; padding: 14px 0;">
                      {detail_items}
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 0 30px 28px;">
                    <div style="border: 1px solid #d9e3d1; border-radius: 20px; background: #f3f8ef; padding: 16px 18px;">
                      <p style="margin: 0 0 6px; color: #31422c; font-size: 13px; font-weight: 800;">
                        {escape(note_title)}
                      </p>
                      <p style="margin: 0; color: #53624d; font-size: 13px; line-height: 1.6;">
                        {escape(note)}
                      </p>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 0 30px 30px;">
                    <p style="margin: 0; color: #8a7b6b; font-size: 12px; line-height: 1.6;">
                      Dacă butonul nu funcționează, copiază linkul acesta în browser:
                    </p>
                    <p style="margin: 8px 0 0; word-break: break-all; color: #5f534a; font-size: 12px; line-height: 1.6;">
                      <a href="{safe_action_url}" style="color: #5f534a; text-decoration: underline;">{safe_action_url}</a>
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="background: #181411; padding: 18px 30px; color: #bdb0a2; font-size: 12px; line-height: 1.6;">
                    Email trimis automat de {safe_app_name}. Dacă nu ai cerut această acțiune, poți ignora mesajul în siguranță.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
    """


def verification_email(
    *, verification_url: str, logo_html: str, app_name: str = "Revizzio"
) -> tuple[str, str]:
    text = (
        f"Bine ai venit în {app_name}.\n\n"
        "Confirmă adresa de email ca să îți activăm contul și să îți pregătim "
        "spațiul de studiu.\n\n"
        f"Confirmă emailul aici: {verification_url}\n\n"
        "Linkul expiră automat și poate fi folosit o singură dată."
    )
    html = _email_shell(
        app_name=app_name,
        eyebrow="Confirmare cont",
        title="Ești la un pas de spațiul tău de studiu.",
        intro=(
            "Confirmă adresa de email ca să activăm contul și să îți pregătim "
            "locul unde cursurile devin rezumate, flashcard-uri și quiz-uri."
        ),
        logo_html=logo_html,
        cta_label="Confirmă emailul",
        action_url=verification_url,
        note_title="De ce cerem confirmarea?",
        note=(
            "Vrem să ne asigurăm că această adresă îți aparține înainte să "
            "creăm contul și să legăm progresul de ea."
        ),
        details=[
            "Contul se creează doar după validarea emailului.",
            "Linkul expiră automat și poate fi folosit o singură dată.",
            "După confirmare vei intra direct în contul tău.",
        ],
    )
    return html, text


def password_reset_email(
    *, reset_url: str, logo_html: str, app_name: str = "Revizzio"
) -> tuple[str, str]:
    text = (
        f"Ai cerut resetarea parolei pentru {app_name}.\n\n"
        f"Alege o parolă nouă aici: {reset_url}\n\n"
        "Linkul expiră automat și poate fi folosit o singură dată. "
        "Dacă nu tu ai cerut resetarea, ignoră acest email."
    )
    html = _email_shell(
        app_name=app_name,
        eyebrow="Securitate",
        title="Hai să îți setăm o parolă nouă.",
        intro=(
            "Am primit o solicitare de resetare a parolei pentru contul tău. "
            "Alege o parolă nouă, iar sesiunile vechi vor fi închise automat."
        ),
        logo_html=logo_html,
        cta_label="Resetează parola",
        action_url=reset_url,
        note_title="Nu ai cerut tu resetarea?",
        note=(
            "Poți ignora acest email. Parola ta rămâne neschimbată atât timp "
            "cât nu accesezi linkul de resetare."
        ),
        details=[
            "Linkul este valabil pentru o perioadă limitată.",
            "Poate fi folosit o singură dată.",
            "După schimbarea parolei, sesiunile vechi sunt revocate.",
        ],
    )
    return html, text
