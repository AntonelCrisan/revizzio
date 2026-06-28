import re
from datetime import datetime

from app.models import CompanyData

PLACEHOLDER_KEYS = [
    "last_date_modified",
    "company_name",
    "name",
    "social_location",
    "cui",
    "register_number",
    "social_capital",
    "email",
    "privacy_email",
    "phone",
    "ai_provider",
    "payment_provider",
    "hosting_provider",
]

LEGACY_PLACEHOLDERS = {
    "[DATA ULTIMEI ACTUALIZĂRI]": "last_date_modified",
    "[DATA ULTIMEI ACTUALIZARI]": "last_date_modified",
    "[DENUMIRE_FIRMĂ]": "company_name",
    "[DENUMIRE_FIRMA]": "company_name",
    "[SEDIU_SOCIAL]": "social_location",
    "[CUI]": "cui",
    "[NR_REGISTRUL_COMERȚULUI]": "register_number",
    "[NR_REGISTRUL_COMERTULUI]": "register_number",
    "[CAPITAL_SOCIAL]": "social_capital",
    "[EMAIL_CONTACT]": "email",
    "[EMAIL_CONFIDENȚIALITATE]": "privacy_email",
    "[EMAIL_CONFIDENTIALITATE]": "privacy_email",
    "[TELEFON]": "phone",
    "[FURNIZOR_AI]": "ai_provider",
    "[FURNIZOR_PLĂȚI]": "payment_provider",
    "[FURNIZOR_PLATI]": "payment_provider",
    "[FURNIZOR_HOSTING]": "hosting_provider",
}

CURLY_PLACEHOLDER_PATTERN = re.compile(r"\{([a-zA-Z0-9_]+)\}")


def _format_romanian_date(value: datetime) -> str:
    return value.strftime("%d.%m.%Y")


def company_placeholder_values(
    company_data: CompanyData,
    *,
    last_date_modified: datetime,
) -> dict[str, str]:
    return {
        "last_date_modified": _format_romanian_date(last_date_modified),
        "company_name": company_data.name,
        "name": company_data.name,
        "social_location": company_data.social_location,
        "cui": company_data.cui,
        "register_number": company_data.register_number,
        "social_capital": company_data.social_capital,
        "email": company_data.email,
        "privacy_email": company_data.privacy_email,
        "phone": company_data.phone,
        "ai_provider": company_data.ai_provider,
        "payment_provider": company_data.payment_provider,
        "hosting_provider": company_data.hosting_provider,
    }


def render_company_placeholders(
    content: str,
    company_data: CompanyData,
    *,
    last_date_modified: datetime,
) -> str:
    values = company_placeholder_values(
        company_data,
        last_date_modified=last_date_modified,
    )

    rendered = content
    for placeholder, key in LEGACY_PLACEHOLDERS.items():
        rendered = rendered.replace(placeholder, values[key])

    def replace_curly_placeholder(match: re.Match[str]) -> str:
        key = match.group(1).lower()
        return values.get(key, match.group(0))

    return CURLY_PLACEHOLDER_PATTERN.sub(replace_curly_placeholder, rendered)
