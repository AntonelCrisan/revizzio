# ruff: noqa: E501
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
    / "Reviss_logo_dark.svg"
)


class EmailDeliveryError(Exception):
    pass


@dataclass(frozen=True)
class EmailMessage:
    to: str
    subject: str
    html: str
    text: str
    reply_to: str | None = None


class EmailService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def send(self, message: EmailMessage) -> None:
        await to_thread.run_sync(self._send_sync, message)

    def _send_sync(self, message: EmailMessage) -> None:
        if self._settings.resend_api_key is None:
            raise EmailDeliveryError("Serviciul de email nu este configurat.")

        payload = {
            "from": self._settings.resend_from_email,
            "to": [message.to],
            "subject": message.subject,
            "html": message.html,
            "text": message.text,
        }
        if message.reply_to:
            payload["reply_to"] = message.reply_to
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
                "User-Agent": "Reviss/1.0",
            },
        )

        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                if response.status >= 400:
                    raise EmailDeliveryError(
                        f"Serviciul de email a întors statusul {response.status}."
                    )
        except urllib.error.HTTPError as exc:
            response_body = exc.read().decode("utf-8", errors="replace")
            raise EmailDeliveryError(
                f"Serviciul de email a refuzat trimiterea: {response_body}"
            ) from exc
        except urllib.error.URLError as exc:
            raise EmailDeliveryError(
                "Serviciul de email nu a putut fi contactat."
            ) from exc


def _fallback_logo_html(app_name: str) -> str:
    return (
        '<span style="display: inline-block; color: #2d2823; '
        "font-family: Georgia, 'Times New Roman', serif; font-size: 28px; "
        f'font-weight: 700; line-height: 36px;">{escape(app_name)}</span>'
    )


@lru_cache(maxsize=8)
def default_email_logo_html(app_name: str = "Reviss") -> str:
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


def email_logo_html(logo_url: str | None, app_name: str = "Reviss") -> str:
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


def _detail_row_html(detail: str | tuple[str, str | None]) -> str:
    text, href = detail if isinstance(detail, tuple) else (detail, None)
    safe_text = escape(text)
    if href:
        safe_href = escape(href, quote=True)
        content = (
            f'<a href="{safe_href}" style="color: #675d54; text-decoration: underline;">'
            f"{safe_text} →</a>"
        )
    else:
        content = safe_text
    return f"""
        <tr>
          <td style="padding: 7px 0; vertical-align: top;">
            <span style="display: inline-block; width: 22px; height: 22px; border-radius: 999px; background: #eef5ea; color: #31422c; font-size: 13px; font-weight: 700; line-height: 22px; text-align: center;">✓</span>
          </td>
          <td style="padding: 7px 0 7px 10px; color: #675d54; font-size: 14px; line-height: 1.55;">
            {content}
          </td>
        </tr>
        """


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
    details: list[str] | list[tuple[str, str | None]],
) -> str:
    safe_app_name = escape(app_name)
    safe_action_url = escape(action_url, quote=True)
    detail_items = "".join(_detail_row_html(detail) for detail in details)

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
    *, verification_url: str, logo_html: str, app_name: str = "Reviss"
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


def email_change_confirmation_email(
    *, confirmation_url: str, logo_html: str, new_email: str, app_name: str = "Reviss"
) -> tuple[str, str]:
    text = (
        f"Ai cerut schimbarea adresei de email pentru contul {app_name} în "
        f"{new_email}.\n\n"
        f"Confirmă noua adresă aici: {confirmation_url}\n\n"
        "Linkul expiră automat și poate fi folosit o singură dată. "
        "Dacă nu tu ai cerut schimbarea, ignoră acest email."
    )
    html = _email_shell(
        app_name=app_name,
        eyebrow="Schimbare email",
        title="Confirmă noua adresă de email.",
        intro=(
            f"Am primit o solicitare de schimbare a adresei de email în "
            f"{new_email}. Confirmă adresa ca să finalizăm schimbarea."
        ),
        logo_html=logo_html,
        cta_label="Confirmă adresa",
        action_url=confirmation_url,
        note_title="Nu ai cerut tu schimbarea?",
        note=(
            "Poți ignora acest email. Adresa contului rămâne neschimbată atât "
            "timp cât nu accesezi linkul de confirmare."
        ),
        details=[
            "Linkul este valabil pentru o perioadă limitată.",
            "Poate fi folosit o singură dată.",
            "Adresa se schimbă doar după confirmare.",
        ],
    )
    return html, text


def notification_digest_email(
    *,
    items: list[tuple[str, str, str | None]],
    app_url: str,
    logo_html: str,
    app_name: str = "Reviss",
) -> tuple[str, str]:
    """items: (title, body, project_url) tuples. project_url links straight to
    the relevant project when the notification is about one (None otherwise).
    """
    is_digest = len(items) > 1
    title = (
        f"{len(items)} noutăți în contul tău" if is_digest else items[0][0]
    )
    intro = (
        "Iată ce s-a întâmplat de la ultima vizită:"
        if is_digest
        else items[0][1]
    )
    details: list[tuple[str, str | None]] = [
        (f"{item_title}: {item_body}", href) for item_title, item_body, href in items
    ]
    text_lines = [
        f"- {item_title}: {item_body}" + (f" ({href})" if href else "")
        for item_title, item_body, href in items
    ]
    text = (
        f"{title}\n\n{intro}\n\n"
        + "\n".join(text_lines)
        + f"\n\nDeschide Reviss: {app_url}"
    )
    single_project_url = items[0][2] if not is_digest else None
    html = _email_shell(
        app_name=app_name,
        eyebrow="Rezumat" if is_digest else "Notificare",
        title=title,
        intro=intro,
        logo_html=logo_html,
        cta_label="Vezi proiectul" if single_project_url else "Deschide Reviss",
        action_url=single_project_url or app_url,
        note_title="Vrei mai puține email-uri?",
        note="Poți opri aceste notificări din Setări → Notificări.",
        details=details,
    )
    return html, text


def password_reset_email(
    *, reset_url: str, logo_html: str, app_name: str = "Reviss"
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


def contact_confirmation_email(
    *,
    app_url: str,
    reference: str,
    category_label: str,
    subject: str,
    logo_html: str,
    app_name: str = "Reviss",
) -> tuple[str, str]:
    text = (
        f"Am primit mesajul tău către {app_name}.\n\n"
        f"Referință: {reference}\n"
        f"Categorie: {category_label}\n"
        f"Subiect: {subject}\n\n"
        "Îți vom răspunde pe email după ce analizăm solicitarea."
    )
    html = _email_shell(
        app_name=app_name,
        eyebrow="Mesaj primit",
        title="Am primit mesajul tău.",
        intro=(
            "Mulțumim că ne-ai scris. Solicitarea ta a fost înregistrată, "
            "iar echipa Reviss o va analiza cât de curând."
        ),
        logo_html=logo_html,
        cta_label="Înapoi la Reviss",
        action_url=app_url,
        note_title="Ce urmează?",
        note=(
            "Răspundem pe adresa de email folosită în formular. Păstrează "
            "numărul de referință dacă revii cu detalii suplimentare."
        ),
        details=[
            f"Referință: {reference}",
            f"Categorie: {category_label}",
            f"Subiect: {subject}",
        ],
    )
    return html, text


def contact_notification_email(
    *,
    app_url: str,
    reference: str,
    sender_name: str,
    sender_email: str,
    category_label: str,
    subject: str,
    message: str,
    logo_html: str,
    app_name: str = "Reviss",
) -> tuple[str, str]:
    trimmed_message = message.strip()
    preview_message = (
        f"{trimmed_message[:700]}..."
        if len(trimmed_message) > 700
        else trimmed_message
    )
    text = (
        "A fost trimis un mesaj nou din formularul de contact Reviss.\n\n"
        f"Referință: {reference}\n"
        f"Nume: {sender_name}\n"
        f"Email: {sender_email}\n"
        f"Categorie: {category_label}\n"
        f"Subiect: {subject}\n\n"
        f"Mesaj:\n{trimmed_message}"
    )
    html = _email_shell(
        app_name=app_name,
        eyebrow="Contact nou",
        title="Ai un mesaj nou în Reviss.",
        intro=(
            "Un utilizator a trimis o solicitare prin formularul public de "
            "contact. Mesajul complet este salvat și în baza de date."
        ),
        logo_html=logo_html,
        cta_label="Deschide Reviss",
        action_url=app_url,
        note_title="Mesaj",
        note=preview_message,
        details=[
            f"Referință: {reference}",
            f"Nume: {sender_name}",
            f"Email: {sender_email}",
            f"Categorie: {category_label}",
            f"Subiect: {subject}",
        ],
    )
    return html, text


def content_report_confirmation_email(
    *,
    app_url: str,
    reference: str,
    report_type_label: str,
    content_reference: str,
    attachment_names: list[str] | None,
    logo_html: str,
    app_name: str = "Reviss",
) -> tuple[str, str]:
    attachment_count = len(attachment_names or [])
    attachment_label = (
        f"{attachment_count} documente"
        if attachment_count != 1
        else "1 document"
    )
    text = (
        f"Am primit raportarea ta de conținut către {app_name}.\n\n"
        f"Număr de înregistrare: {reference}\n"
        f"Tip raportare: {report_type_label}\n"
        f"Conținut raportat: {content_reference}\n"
        f"Documente atașate: {attachment_label}\n\n"
        "Echipa Reviss va analiza sesizarea și va reveni dacă sunt necesare "
        "detalii suplimentare."
    )
    html = _email_shell(
        app_name=app_name,
        eyebrow="Raportare primită",
        title="Am înregistrat sesizarea ta.",
        intro=(
            "Mulțumim că ne-ai trimis detaliile. Raportarea a fost salvată, "
            "iar echipa Reviss o va analiza conform procedurilor interne."
        ),
        logo_html=logo_html,
        cta_label="Înapoi la Reviss",
        action_url=app_url,
        note_title="Ce urmează?",
        note=(
            "Păstrează numărul de înregistrare. Dacă avem nevoie de clarificări, "
            "îți vom scrie pe adresa folosită în formular."
        ),
        details=[
            f"Număr de înregistrare: {reference}",
            f"Tip raportare: {report_type_label}",
            f"Conținut raportat: {content_reference}",
            f"Documente atașate: {attachment_label}",
        ],
    )
    return html, text


def content_report_notification_email(
    *,
    app_url: str,
    reference: str,
    sender_name: str,
    sender_email: str,
    report_type_label: str,
    content_reference: str,
    description: str,
    rights_evidence: str | None,
    attachment_names: list[str] | None,
    logo_html: str,
    app_name: str = "Reviss",
) -> tuple[str, str]:
    trimmed_description = description.strip()
    preview_description = (
        f"{trimmed_description[:700]}..."
        if len(trimmed_description) > 700
        else trimmed_description
    )
    admin_url = f"{app_url.rstrip('/')}/admin/settings/raportari-continut"
    evidence_text = rights_evidence.strip() if rights_evidence else "-"
    attachment_list = ", ".join(attachment_names or []) or "-"
    text = (
        "A fost trimisă o raportare nouă de conținut în Reviss.\n\n"
        f"Număr de înregistrare: {reference}\n"
        f"Nume: {sender_name}\n"
        f"Email: {sender_email}\n"
        f"Tip raportare: {report_type_label}\n"
        f"Conținut raportat: {content_reference}\n\n"
        f"Descriere:\n{trimmed_description}\n\n"
        f"Dovezi / context:\n{evidence_text}\n\n"
        f"Documente atașate:\n{attachment_list}"
    )
    html = _email_shell(
        app_name=app_name,
        eyebrow="Raportare conținut",
        title="Ai o sesizare nouă de conținut.",
        intro=(
            "Un utilizator a trimis o raportare prin formularul public. "
            "Sesizarea completă este salvată și în zona de administrare."
        ),
        logo_html=logo_html,
        cta_label="Vezi raportările",
        action_url=admin_url,
        note_title="Descriere",
        note=preview_description,
        details=[
            f"Număr de înregistrare: {reference}",
            f"Nume: {sender_name}",
            f"Email: {sender_email}",
            f"Tip raportare: {report_type_label}",
            f"Conținut raportat: {content_reference}",
            f"Documente atașate: {attachment_list}",
        ],
    )
    return html, text


def withdrawal_confirmation_email(
    *,
    app_url: str,
    reference: str,
    subscription_or_order: str,
    order_number: str | None,
    logo_html: str,
    app_name: str = "Reviss",
) -> tuple[str, str]:
    order_label = order_number.strip() if order_number else "-"
    text = (
        f"Am primit solicitarea ta de retragere din contract către {app_name}.\n\n"
        f"Număr de înregistrare: {reference}\n"
        f"Abonament sau comandă: {subscription_or_order}\n"
        f"Număr comandă: {order_label}\n\n"
        "Echipa Reviss va analiza solicitarea și va reveni pe email dacă sunt "
        "necesare detalii suplimentare."
    )
    html = _email_shell(
        app_name=app_name,
        eyebrow="Retragere primită",
        title="Am primit solicitarea ta.",
        intro=(
            "Solicitarea de retragere din contract a fost înregistrată. "
            "O vom analiza și vom reveni pe email dacă avem nevoie de clarificări."
        ),
        logo_html=logo_html,
        cta_label="Înapoi la Reviss",
        action_url=app_url,
        note_title="Ce urmează?",
        note=(
            "Păstrează numărul de înregistrare. Acesta ne ajută să identificăm "
            "rapid solicitarea dacă revii cu detalii suplimentare."
        ),
        details=[
            f"Număr de înregistrare: {reference}",
            f"Abonament sau comandă: {subscription_or_order}",
            f"Număr comandă: {order_label}",
        ],
    )
    return html, text


def withdrawal_notification_email(
    *,
    app_url: str,
    reference: str,
    full_name: str,
    sender_email: str,
    subscription_or_order: str,
    order_number: str | None,
    reason: str | None,
    logo_html: str,
    app_name: str = "Reviss",
) -> tuple[str, str]:
    admin_url = f"{app_url.rstrip('/')}/admin/settings/retrageri-contract"
    order_label = order_number.strip() if order_number else "-"
    reason_text = reason.strip() if reason else "-"
    preview_reason = (
        f"{reason_text[:700]}..." if len(reason_text) > 700 else reason_text
    )
    text = (
        "A fost trimisă o solicitare nouă de retragere din contract în Reviss.\n\n"
        f"Număr de înregistrare: {reference}\n"
        f"Nume: {full_name}\n"
        f"Email: {sender_email}\n"
        f"Abonament sau comandă: {subscription_or_order}\n"
        f"Număr comandă: {order_label}\n\n"
        f"Motiv:\n{reason_text}"
    )
    html = _email_shell(
        app_name=app_name,
        eyebrow="Retragere contract",
        title="Ai o solicitare nouă de retragere.",
        intro=(
            "Un utilizator a trimis formularul public de retragere din contract. "
            "Solicitarea completă este salvată și în zona de administrare."
        ),
        logo_html=logo_html,
        cta_label="Vezi retragerile",
        action_url=admin_url,
        note_title="Motiv",
        note=preview_reason,
        details=[
            f"Număr de înregistrare: {reference}",
            f"Nume: {full_name}",
            f"Email: {sender_email}",
            f"Abonament sau comandă: {subscription_or_order}",
            f"Număr comandă: {order_label}",
        ],
    )
    return html, text


def account_deleted_email(
    *,
    app_url: str,
    full_name: str,
    logo_html: str,
    app_name: str = "Reviss",
) -> tuple[str, str]:
    first_name = full_name.strip().split(" ", 1)[0] if full_name.strip() else ""
    greeting = f"Bună, {first_name}." if first_name else "Bună."
    text = (
        f"{greeting}\n\n"
        f"Contul tău {app_name} a fost șters de un administrator.\n\n"
        "Nu mai poți accesa contul, proiectele sau materialele asociate lui. "
        "Dacă ai întrebări, ne poți contacta prin formularul public."
    )
    html = _email_shell(
        app_name=app_name,
        eyebrow="Cont șters",
        title="Contul tău a fost șters.",
        intro=(
            f"{greeting} Confirmăm că un administrator a șters contul tău "
            "Reviss."
        ),
        logo_html=logo_html,
        cta_label="Deschide Reviss",
        action_url=app_url,
        note_title="Ai nevoie de clarificări?",
        note=(
            "Dacă ai întrebări despre această acțiune, ne poți contacta prin "
            "formularul public de pe site."
        ),
        details=[
            "Contul nu mai poate fi accesat.",
            "Sesiunile active au fost închise odată cu ștergerea contului.",
            "Datele care trebuie păstrate legal pot rămâne în evidențele obligatorii.",
        ],
    )
    return html, text


def invoice_paid_email(
    *,
    invoice_url: str,
    invoice_pdf_url: str | None,
    invoice_number: str | None,
    amount_label: str,
    paid_at_label: str | None,
    plan_name: str | None,
    logo_html: str,
    app_name: str = "Reviss",
) -> tuple[str, str]:
    invoice_label = invoice_number or "factura ta"
    plan_label = plan_name or "abonamentul Reviss"
    paid_label = paid_at_label or "astăzi"
    pdf_line = f"\nPDF direct: {invoice_pdf_url}\n" if invoice_pdf_url else ""

    text = (
        f"Plata pentru {plan_label} a fost confirmată.\n\n"
        f"Factura {invoice_label} în valoare de {amount_label} este disponibilă aici:\n"
        f"{invoice_url}\n"
        f"{pdf_line}\n"
        "Mulțumim că folosești Reviss."
    )
    html = _email_shell(
        app_name=app_name,
        eyebrow="Factură abonament",
        title="Plata ta a fost confirmată.",
        intro=(
            f"Am înregistrat plata pentru {plan_label}. Factura este disponibilă "
            "în pagina securizată Stripe, de unde o poți vedea sau descărca."
        ),
        logo_html=logo_html,
        cta_label="Vezi factura",
        action_url=invoice_url,
        note_title="Despre factura ta",
        note=(
            "Factura este găzduită securizat de Stripe. Linkul include și opțiunea "
            "de descărcare PDF, acolo unde Stripe o oferă pentru această factură."
        ),
        details=[
            f"Plan: {plan_label}",
            f"Total plătit: {amount_label}",
            f"Data plății: {paid_label}",
            f"Număr factură: {invoice_label}",
        ],
    )
    return html, text
