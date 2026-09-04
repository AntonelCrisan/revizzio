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
    label: str | None = None
    value = text
    if ": " in text:
        candidate_label, candidate_value = text.split(": ", 1)
        if len(candidate_label) <= 40 and candidate_value.strip():
            label = candidate_label
            value = candidate_value
    safe_value = escape(value)
    if href:
        safe_href = escape(href, quote=True)
        safe_value = (
            f'<a href="{safe_href}" style="color: #1c1a17; font-weight: 700; text-decoration: underline;">'
            f"{safe_value}</a>"
        )
    label_html = (
        f'<span style="display: block; margin-bottom: 3px; color: #6e6b65; font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;">{escape(label)}</span>'
        if label
        else ""
    )
    return f"""
        <tr>
          <td style="padding: 11px 0; border-bottom: 1px solid #e8e3d9; color: #33302b; font-size: 14px; line-height: 1.6;">
            {label_html}{safe_value}
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
    note_title: str | None = None,
    note: str | None = None,
    details: list[str] | list[tuple[str, str | None]] | None = None,
    details_title: str | None = None,
    footer_note: str | None = None,
    preheader: str | None = None,
) -> str:
    safe_app_name = escape(app_name)
    safe_action_url = escape(action_url, quote=True)
    detail_items = "".join(_detail_row_html(detail) for detail in details or [])

    details_block = ""
    if detail_items:
        details_heading = (
            f"""
                    <p style="margin: 0 0 4px; color: #6e6b65; font-size: 12px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;">
                      {escape(details_title)}
                    </p>
            """
            if details_title
            else ""
        )
        details_block = f"""
                <tr>
                  <td style="padding: 30px 0 0;">
                    {details_heading}
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top: 1px solid #e8e3d9;">
                      {detail_items}
                    </table>
                  </td>
                </tr>
        """

    note_block = ""
    if note:
        note_heading = (
            f"""
                          <p style="margin: 0 0 6px; color: #1c1a17; font-size: 13px; font-weight: 700;">
                            {escape(note_title)}
                          </p>
            """
            if note_title
            else ""
        )
        note_block = f"""
                <tr>
                  <td style="padding: 30px 0 0;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="border-left: 3px solid #d5cbb8; padding: 2px 0 2px 14px;">
                          {note_heading}
                          <p style="margin: 0; color: #4d4842; font-size: 13px; line-height: 1.65;">
                            {escape(note)}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
        """

    footer_text = footer_note or (
        f"Acest email a fost trimis automat de {app_name} către adresa ta de cont."
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
      <body style="margin: 0; padding: 0; width: 100%; background: #fbf9f5; color: #1c1a17; font-family: Arial, Helvetica, sans-serif;">
        <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; mso-hide: all;">
          {escape(preheader or intro)}
        </div>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width: 100%; background: #fbf9f5;">
          <tr>
            <td align="center" style="padding: 40px 24px 48px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width: 100%; max-width: 640px;">
                <tr>
                  <td style="padding: 0 0 22px; border-bottom: 1px solid #e8e3d9;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="height: 36px; vertical-align: middle;">
                          {logo_html}
                        </td>
                        <td align="right" style="vertical-align: middle; color: #6e6b65; font-size: 11px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase;">
                          {escape(eyebrow)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 34px 0 0;">
                    <h1 style="margin: 0; color: #1c1a17; font-family: Georgia, 'Times New Roman', serif; font-size: 30px; line-height: 1.18; letter-spacing: -0.02em;">
                      {escape(title)}
                    </h1>
                    <p style="margin: 16px 0 0; color: #4d4842; font-size: 16px; line-height: 1.7;">
                      {escape(intro)}
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 26px 0 0;">
                    <a href="{safe_action_url}" style="display: inline-block; border-radius: 6px; background: #1c1a17; color: #fbf9f5; font-size: 14px; font-weight: 700; line-height: 1; padding: 15px 22px; text-decoration: none;">
                      {escape(cta_label)}
                    </a>
                    <p style="margin: 14px 0 0; word-break: break-all; color: #6e6b65; font-size: 12px; line-height: 1.6;">
                      Dacă butonul nu se deschide, copiază acest link în browser:
                      <a href="{safe_action_url}" style="color: #6e6b65; text-decoration: underline;">{safe_action_url}</a>
                    </p>
                  </td>
                </tr>
{details_block}
{note_block}
                <tr>
                  <td style="padding: 34px 0 0;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top: 1px solid #e8e3d9;">
                      <tr>
                        <td style="padding: 20px 0 0;">
                          <p style="margin: 0; color: #6e6b65; font-size: 12px; line-height: 1.7;">
                            {escape(footer_text)}
                          </p>
                          <p style="margin: 6px 0 0; color: #8d887f; font-size: 12px; line-height: 1.7;">
                            {safe_app_name}
                          </p>
                        </td>
                      </tr>
                    </table>
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
        "Contul tău se creează abia după ce confirmi că această adresă de email "
        "îți aparține. Deschide linkul de mai jos și intri direct în cont.\n\n"
        f"Confirmă adresa de email: {verification_url}\n\n"
        "Linkul poate fi folosit o singură dată și expiră automat.\n"
        "Dacă nu ai cerut tu contul, ignoră acest email: fără confirmare nu se "
        "creează nimic."
    )
    html = _email_shell(
        app_name=app_name,
        eyebrow="Confirmare cont",
        title="Confirmă adresa de email",
        intro=(
            "Contul tău se creează abia după ce confirmăm că această adresă de "
            "email îți aparține. Apasă butonul de mai jos și intri direct în "
            "spațiul tău de studiu, unde cursurile devin rezumate, "
            "flashcard-uri și quiz-uri."
        ),
        preheader="Un singur clic și contul tău este activ.",
        logo_html=logo_html,
        cta_label="Confirmă adresa de email",
        action_url=verification_url,
        details_title="Ce trebuie să știi",
        details=[
            "Valabilitate: linkul poate fi folosit o singură dată și expiră automat.",
            "După confirmare: intri direct în cont, fără să mai introduci parola.",
            "Nu ai cerut tu contul: ignoră acest email, fără confirmare nu se creează nimic.",
        ],
        footer_note=(
            f"Acest email a fost trimis automat de {app_name} pentru că adresa "
            "a fost folosită la înregistrare."
        ),
    )
    return html, text


def email_change_confirmation_email(
    *, confirmation_url: str, logo_html: str, new_email: str, app_name: str = "Reviss"
) -> tuple[str, str]:
    text = (
        f"Ai cerut ca adresa de email a contului {app_name} să devină "
        f"{new_email}.\n\n"
        f"Confirmă noua adresă: {confirmation_url}\n\n"
        "Până la confirmare contul rămâne pe adresa veche, cu care te poți "
        "autentifica normal.\n"
        "Linkul poate fi folosit o singură dată și expiră automat.\n"
        "Dacă nu ai cerut tu schimbarea, ignoră acest email."
    )
    html = _email_shell(
        app_name=app_name,
        eyebrow="Schimbare email",
        title="Confirmă noua adresă de email",
        intro=(
            "Am primit o cerere de schimbare a adresei contului tău în "
            f"{new_email}. Apasă butonul de mai jos ca să finalizăm schimbarea."
        ),
        preheader=f"Confirmă mutarea contului pe {new_email}.",
        logo_html=logo_html,
        cta_label="Confirmă noua adresă",
        action_url=confirmation_url,
        details_title="Ce se întâmplă mai departe",
        details=[
            f"Adresă nouă: {new_email}",
            "Până la confirmare: contul rămâne pe adresa veche, cu care te poți autentifica normal.",
            "După confirmare: te autentifici doar cu adresa nouă și acolo primești notificările.",
            "Valabilitate: linkul poate fi folosit o singură dată și expiră automat.",
        ],
        note_title="Nu ai cerut tu schimbarea?",
        note=(
            "Ignoră acest email și nu deschide linkul. Dacă bănuiești că "
            "altcineva are acces la contul tău, schimbă-ți parola."
        ),
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
    details: list[tuple[str, str | None]] = []
    details_title: str | None = None

    if is_digest:
        title = f"Ai {len(items)} noutăți în contul tău"
        intro = (
            "De la ultima ta vizită s-au strâns câteva actualizări. Le găsești "
            "pe toate mai jos, iar butonul te duce direct în cont."
        )
        details = [
            (f"{item_title}: {item_body}", href)
            for item_title, item_body, href in items
        ]
        details_title = "Ce s-a întâmplat"
        text = (
            f"{title}\n\n{intro}\n\n"
            + "\n".join(
                f"- {item_title}: {item_body}" + (f" ({href})" if href else "")
                for item_title, item_body, href in items
            )
            + f"\n\nDeschide {app_name}: {app_url}"
        )
        preheader = f"{len(items)} actualizări noi în contul tău."
    else:
        item_title, item_body, item_url = items[0]
        title = item_title
        intro = item_body
        text = (
            f"{item_title}\n\n{item_body}\n\n"
            f"Deschide în {app_name}: {item_url or app_url}"
        )
        preheader = item_body

    single_project_url = items[0][2] if not is_digest else None
    html = _email_shell(
        app_name=app_name,
        eyebrow="Rezumat notificări" if is_digest else "Notificare",
        title=title,
        intro=intro,
        preheader=preheader,
        logo_html=logo_html,
        cta_label=(
            "Deschide proiectul" if single_project_url else f"Deschide {app_name}"
        ),
        action_url=single_project_url or app_url,
        details_title=details_title,
        details=details,
        note_title="Primești prea multe email-uri?",
        note=(
            "Poți alege exact ce notificări îți trimitem pe email din Setări → "
            "Notificări. În aplicație rămân vizibile toate."
        ),
        footer_note=(
            f"Acest email a fost trimis automat de {app_name} pentru "
            "notificările pe care le-ai activat."
        ),
    )
    return html, text


def password_reset_email(
    *, reset_url: str, logo_html: str, app_name: str = "Reviss"
) -> tuple[str, str]:
    text = (
        f"Ai cerut resetarea parolei pentru contul tău {app_name}.\n\n"
        f"Setează o parolă nouă: {reset_url}\n\n"
        "Parola actuală rămâne valabilă până când o schimbi din acest link.\n"
        "După schimbare, sesiunile deschise pe alte dispozitive se închid.\n"
        "Linkul poate fi folosit o singură dată și expiră automat.\n"
        "Dacă nu ai cerut tu resetarea, ignoră acest email."
    )
    html = _email_shell(
        app_name=app_name,
        eyebrow="Securitate cont",
        title="Setează o parolă nouă",
        intro=(
            "Am primit o cerere de resetare a parolei pentru contul tău. Apasă "
            "butonul de mai jos ca să îți alegi o parolă nouă."
        ),
        preheader="Linkul pentru resetarea parolei tale.",
        logo_html=logo_html,
        cta_label="Setează parola nouă",
        action_url=reset_url,
        details_title="Ce trebuie să știi",
        details=[
            "Până schimbi parola: parola actuală rămâne valabilă.",
            "După schimbare: sesiunile deschise pe alte dispozitive se închid.",
            "Valabilitate: linkul poate fi folosit o singură dată și expiră automat.",
        ],
        note_title="Nu ai cerut tu resetarea?",
        note=(
            "Ignoră acest email și nu deschide linkul. Nimeni nu îți poate "
            "schimba parola fără linkul primit în acest inbox."
        ),
        footer_note=(
            f"Acest email a fost trimis automat de {app_name} pentru cererea de "
            "resetare făcută pe această adresă."
        ),
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
        f"Am primit mesajul tău către {app_name} și l-am înregistrat.\n\n"
        f"Referință: {reference}\n"
        f"Categorie: {category_label}\n"
        f"Subiect: {subject}\n\n"
        "Îți răspundem pe adresa completată în formular. Dacă revii cu detalii, "
        "menționează numărul de referință.\n\n"
        f"Deschide {app_name}: {app_url}"
    )
    html = _email_shell(
        app_name=app_name,
        eyebrow="Mesaj primit",
        title="Am primit mesajul tău",
        intro=(
            "Mulțumim că ne-ai scris. Solicitarea a fost înregistrată cu datele "
            "de mai jos și a ajuns la echipa de suport."
        ),
        preheader=f"Solicitarea {reference} a fost înregistrată.",
        logo_html=logo_html,
        cta_label=f"Deschide {app_name}",
        action_url=app_url,
        details_title="Datele solicitării tale",
        details=[
            f"Referință: {reference}",
            f"Categorie: {category_label}",
            f"Subiect: {subject}",
        ],
        note_title="Ce urmează",
        note=(
            "Îți răspundem pe adresa completată în formular. Dacă revii cu "
            "detalii, menționează numărul de referință ca să legăm mesajele."
        ),
        footer_note=(
            "Acest email confirmă primirea mesajului trimis prin formularul de "
            f"contact {app_name}."
        ),
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
        f"Mesaj nou din formularul de contact {app_name}.\n\n"
        f"Referință: {reference}\n"
        f"Nume: {sender_name}\n"
        f"Email: {sender_email}\n"
        f"Categorie: {category_label}\n"
        f"Subiect: {subject}\n\n"
        f"Mesaj:\n{trimmed_message}\n\n"
        f"Deschide {app_name}: {app_url}"
    )
    html = _email_shell(
        app_name=app_name,
        eyebrow="Contact nou",
        title="Mesaj nou din formularul de contact",
        intro=(
            f"{sender_name} a trimis o solicitare în categoria "
            f"„{category_label}”. Poți răspunde direct la {sender_email}."
        ),
        preheader=f"{sender_name}: {subject}",
        logo_html=logo_html,
        cta_label=f"Deschide {app_name}",
        action_url=app_url,
        details_title="Detaliile expeditorului",
        details=[
            f"Referință: {reference}",
            f"Nume: {sender_name}",
            f"Email: {sender_email}",
            f"Categorie: {category_label}",
            f"Subiect: {subject}",
        ],
        note_title="Mesajul primit",
        note=preview_message,
        footer_note=(
            "Notificare internă. Mesajul complet este salvat și în baza de date "
            f"{app_name}."
        ),
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
    if attachment_count == 0:
        attachment_label = "niciun document"
    elif attachment_count == 1:
        attachment_label = "1 document"
    else:
        attachment_label = f"{attachment_count} documente"
    text = (
        "Am primit raportarea ta de conținut și am înregistrat-o.\n\n"
        f"Număr de înregistrare: {reference}\n"
        f"Tip raportare: {report_type_label}\n"
        f"Conținut raportat: {content_reference}\n"
        f"Documente atașate: {attachment_label}\n\n"
        "Analizăm sesizarea și îți scriem pe adresa din formular dacă avem "
        "nevoie de clarificări.\n\n"
        f"Deschide {app_name}: {app_url}"
    )
    html = _email_shell(
        app_name=app_name,
        eyebrow="Raportare primită",
        title="Am înregistrat sesizarea ta",
        intro=(
            "Mulțumim pentru detalii. Raportarea a fost salvată cu datele de "
            "mai jos și intră în analiză conform procedurilor interne."
        ),
        preheader=f"Sesizarea {reference} a fost înregistrată.",
        logo_html=logo_html,
        cta_label=f"Deschide {app_name}",
        action_url=app_url,
        details_title="Datele sesizării tale",
        details=[
            f"Număr de înregistrare: {reference}",
            f"Tip raportare: {report_type_label}",
            f"Conținut raportat: {content_reference}",
            f"Documente atașate: {attachment_label}",
        ],
        note_title="Ce urmează",
        note=(
            "Dacă avem nevoie de clarificări, îți scriem pe adresa folosită în "
            "formular. Păstrează numărul de înregistrare pentru orice revenire."
        ),
        footer_note=(
            "Acest email confirmă primirea raportării trimise prin formularul "
            f"{app_name}."
        ),
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
        f"Raportare nouă de conținut în {app_name}.\n\n"
        f"Număr de înregistrare: {reference}\n"
        f"Nume: {sender_name}\n"
        f"Email: {sender_email}\n"
        f"Tip raportare: {report_type_label}\n"
        f"Conținut raportat: {content_reference}\n\n"
        f"Descriere:\n{trimmed_description}\n\n"
        f"Dovezi / context:\n{evidence_text}\n\n"
        f"Documente atașate:\n{attachment_list}\n\n"
        f"Deschide raportările: {admin_url}"
    )
    html = _email_shell(
        app_name=app_name,
        eyebrow="Raportare conținut",
        title="Sesizare nouă de conținut",
        intro=(
            f"{sender_name} a raportat „{content_reference}” prin formularul "
            f"public, la categoria „{report_type_label}”. Sesizarea completă "
            "este în zona de administrare."
        ),
        preheader=f"{report_type_label}: {content_reference}",
        logo_html=logo_html,
        cta_label="Deschide raportările",
        action_url=admin_url,
        details_title="Detaliile sesizării",
        details=[
            f"Număr de înregistrare: {reference}",
            f"Nume: {sender_name}",
            f"Email: {sender_email}",
            f"Tip raportare: {report_type_label}",
            f"Conținut raportat: {content_reference}",
            f"Dovezi / context: {evidence_text}",
            f"Documente atașate: {attachment_list}",
        ],
        note_title="Descrierea trimisă",
        note=preview_description,
        footer_note=(
            "Notificare internă. Sesizarea completă este salvată în zona de "
            f"administrare {app_name}."
        ),
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
        "Am primit solicitarea ta de retragere din contract și am "
        "înregistrat-o.\n\n"
        f"Număr de înregistrare: {reference}\n"
        f"Abonament sau comandă: {subscription_or_order}\n"
        f"Număr comandă: {order_label}\n\n"
        "Verificăm solicitarea și îți scriem pe adresa din formular cu pașii "
        "următori.\n\n"
        f"Deschide {app_name}: {app_url}"
    )
    html = _email_shell(
        app_name=app_name,
        eyebrow="Retragere primită",
        title="Am primit solicitarea de retragere",
        intro=(
            "Cererea ta de retragere din contract a fost înregistrată cu datele "
            "de mai jos și intră în verificare."
        ),
        preheader=f"Solicitarea {reference} a fost înregistrată.",
        logo_html=logo_html,
        cta_label=f"Deschide {app_name}",
        action_url=app_url,
        details_title="Datele solicitării tale",
        details=[
            f"Număr de înregistrare: {reference}",
            f"Abonament sau comandă: {subscription_or_order}",
            f"Număr comandă: {order_label}",
        ],
        note_title="Ce urmează",
        note=(
            "Îți scriem pe adresa din formular cu pașii următori. Păstrează "
            "numărul de înregistrare pentru orice revenire."
        ),
        footer_note=(
            "Acest email confirmă primirea solicitării trimise prin formularul "
            f"{app_name}."
        ),
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
        f"Solicitare nouă de retragere din contract în {app_name}.\n\n"
        f"Număr de înregistrare: {reference}\n"
        f"Nume: {full_name}\n"
        f"Email: {sender_email}\n"
        f"Abonament sau comandă: {subscription_or_order}\n"
        f"Număr comandă: {order_label}\n\n"
        f"Motiv:\n{reason_text}\n\n"
        f"Deschide retragerile: {admin_url}"
    )
    html = _email_shell(
        app_name=app_name,
        eyebrow="Retragere contract",
        title="Solicitare nouă de retragere",
        intro=(
            f"{full_name} a cerut retragerea din contract pentru "
            f"„{subscription_or_order}”. Solicitarea completă este în zona de "
            "administrare."
        ),
        preheader=f"{full_name}: {subscription_or_order}",
        logo_html=logo_html,
        cta_label="Deschide retragerile",
        action_url=admin_url,
        details_title="Detaliile solicitării",
        details=[
            f"Număr de înregistrare: {reference}",
            f"Nume: {full_name}",
            f"Email: {sender_email}",
            f"Abonament sau comandă: {subscription_or_order}",
            f"Număr comandă: {order_label}",
        ],
        note_title="Motivul invocat",
        note=preview_reason,
        footer_note=(
            "Notificare internă. Solicitarea completă este salvată în zona de "
            f"administrare {app_name}."
        ),
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
        f"Un administrator a șters contul tău {app_name}. Nu te mai poți "
        "autentifica, iar proiectele, rezumatele, flashcard-urile și quiz-urile "
        "din cont nu mai pot fi accesate.\n\n"
        "Sesiunile deschise au fost închise, iar din datele tale rămân doar "
        "informațiile pe care legea ne obligă să le arhivăm.\n\n"
        "Dacă ai întrebări despre această decizie, scrie-ne prin formularul de "
        f"contact: {app_url}"
    )
    html = _email_shell(
        app_name=app_name,
        eyebrow="Cont șters",
        title="Contul tău a fost șters",
        intro=(
            f"{greeting} Un administrator a șters contul tău {app_name}, așa că "
            "autentificarea nu mai este posibilă și materialele din cont nu mai "
            "pot fi accesate."
        ),
        preheader="Autentificarea în cont nu mai este posibilă.",
        logo_html=logo_html,
        cta_label="Contactează-ne",
        action_url=app_url,
        details_title="Ce s-a întâmplat cu datele tale",
        details=[
            "Acces: nu te mai poți autentifica, iar sesiunile deschise au fost închise.",
            "Materiale: proiectele, rezumatele, flashcard-urile și quiz-urile nu mai sunt disponibile.",
            "Date păstrate: rămân doar informațiile pe care legea ne obligă să le arhivăm.",
        ],
        note_title="Ai întrebări despre această decizie?",
        note=(
            "Scrie-ne prin formularul de contact de pe site și îți explicăm "
            "motivul ștergerii."
        ),
        footer_note=(
            f"Acest email a fost trimis automat de {app_name} ca să te informeze "
            "despre ștergerea contului."
        ),
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
    invoice_label = invoice_number or "-"
    plan_label = plan_name or f"abonamentul {app_name}"
    paid_label = paid_at_label or "astăzi"
    pdf_line = f"Descarcă PDF-ul: {invoice_pdf_url}\n" if invoice_pdf_url else ""

    text = (
        f"Plata pentru {plan_label} a fost confirmată.\n\n"
        f"Plan: {plan_label}\n"
        f"Total plătit: {amount_label}\n"
        f"Data plății: {paid_label}\n"
        f"Număr factură: {invoice_label}\n\n"
        f"Vezi factura: {invoice_url}\n"
        f"{pdf_line}\n"
        "Abonamentul rămâne activ, nu trebuie să faci nimic.\n\n"
        f"Mulțumim că folosești {app_name}."
    )
    details: list[tuple[str, str | None]] = [
        (f"Plan: {plan_label}", None),
        (f"Total plătit: {amount_label}", None),
        (f"Data plății: {paid_label}", None),
        (f"Număr factură: {invoice_label}", None),
    ]
    if invoice_pdf_url:
        details.append(("Factură PDF: descarcă documentul", invoice_pdf_url))

    html = _email_shell(
        app_name=app_name,
        eyebrow="Factură abonament",
        title="Plata ta a fost confirmată",
        intro=(
            f"Am înregistrat plata de {amount_label} pentru {plan_label}. "
            "Abonamentul rămâne activ, nu trebuie să faci nimic."
        ),
        preheader=f"{amount_label} pentru {plan_label} — plată confirmată.",
        logo_html=logo_html,
        cta_label="Vezi factura",
        action_url=invoice_url,
        details_title="Detaliile plății",
        details=details,
        note_title="Despre factură",
        note=(
            "Factura este găzduită securizat de Stripe, procesatorul nostru de "
            "plăți, de unde o poți vedea și descărca oricând."
        ),
        footer_note=(
            f"Acest email a fost trimis automat de {app_name} după încasarea "
            "plății pentru abonamentul tău."
        ),
    )
    return html, text
