import re
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

CookieConsentAction = Literal["accept_all", "reject_optional", "save_custom"]
ContactCategory = Literal[
    "suport",
    "facturare",
    "confidentialitate",
    "raportare_continut",
]
ContentReportType = Literal[
    "drepturi_autor",
    "date_personale",
    "continut_incorect",
    "altul",
]

CONTROL_CHAR_PATTERN = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def clean_text(value: str) -> str:
    return CONTROL_CHAR_PATTERN.sub("", " ".join(value.split())).strip()


def clean_multiline_text(value: str) -> str:
    normalized = CONTROL_CHAR_PATTERN.sub("", value).replace("\r\n", "\n")
    return "\n".join(line.strip() for line in normalized.splitlines()).strip()


class CookieConsentRequest(BaseModel):
    action: CookieConsentAction
    consent_version: str = Field(min_length=1, max_length=32)
    categories: dict[str, bool]

    @field_validator("categories")
    @classmethod
    def required_cookie_categories(cls, value: dict[str, bool]) -> dict[str, bool]:
        normalized = {
            "necessary": True,
            "functional": bool(value.get("functional", False)),
            "analytics": bool(value.get("analytics", False)),
            "marketing": bool(value.get("marketing", False)),
        }
        return normalized


class ContactRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    category: ContactCategory
    subject: str = Field(min_length=3, max_length=160)
    message: str = Field(min_length=10, max_length=5000)

    @field_validator("name", "subject")
    @classmethod
    def normalize_short_text(cls, value: str) -> str:
        return clean_text(value)

    @field_validator("message")
    @classmethod
    def normalize_message(cls, value: str) -> str:
        return clean_multiline_text(value)


class WithdrawalRequestPayload(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    subscription_or_order: str = Field(min_length=2, max_length=160)
    order_number: str | None = Field(default=None, max_length=80)
    reason: str | None = Field(default=None, max_length=5000)
    confirmation: bool

    @field_validator("full_name", "subscription_or_order", "order_number")
    @classmethod
    def normalize_optional_short_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = clean_text(value)
        return normalized or None

    @field_validator("reason")
    @classmethod
    def normalize_reason(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = clean_multiline_text(value)
        return normalized or None

    @field_validator("confirmation")
    @classmethod
    def confirmation_required(cls, value: bool) -> bool:
        if not value:
            raise ValueError("Confirmarea retragerii este obligatorie.")
        return value


class ContentReportRequestPayload(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    report_type: ContentReportType
    content_reference: str = Field(min_length=3, max_length=400)
    description: str = Field(min_length=10, max_length=5000)
    rights_evidence: str | None = Field(default=None, max_length=5000)
    declaration: bool

    @field_validator("name", "content_reference")
    @classmethod
    def normalize_short_text(cls, value: str) -> str:
        return clean_text(value)

    @field_validator("description", "rights_evidence")
    @classmethod
    def normalize_long_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = clean_multiline_text(value)
        return normalized or None

    @field_validator("declaration")
    @classmethod
    def declaration_required(cls, value: bool) -> bool:
        if not value:
            raise ValueError("Declarația este obligatorie.")
        return value


class SubscriptionCancellationRequest(BaseModel):
    plan_name: str = Field(min_length=2, max_length=80)
    renewal_date: str = Field(min_length=4, max_length=32)
    price: str = Field(min_length=2, max_length=40)

    @field_validator("plan_name", "renewal_date", "price")
    @classmethod
    def normalize_text(cls, value: str) -> str:
        return clean_text(value)


class ComplianceResponse(BaseModel):
    message: str
    registration_number: str | None = None
    active_until: str | None = None
