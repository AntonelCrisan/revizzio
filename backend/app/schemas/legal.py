import re
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

LegalDocumentSlug = Literal["terms_conditions", "privacy_policy"]

CONTROL_CHAR_PATTERN = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def clean_short_text(value: str) -> str:
    return CONTROL_CHAR_PATTERN.sub("", " ".join(value.split())).strip()


def clean_html_text(value: str) -> str:
    return CONTROL_CHAR_PATTERN.sub("", value).replace("\r\n", "\n").strip()


class CompanyDataResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    social_location: str
    cui: str
    register_number: str
    social_capital: str
    email: EmailStr
    privacy_email: EmailStr
    phone: str
    ai_provider: str
    payment_provider: str
    hosting_provider: str
    last_date_modified: datetime


class CompanyDataUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=300)
    social_location: str = Field(min_length=1, max_length=500)
    cui: str = Field(min_length=1, max_length=80)
    register_number: str = Field(min_length=1, max_length=120)
    social_capital: str = Field(min_length=1, max_length=120)
    email: EmailStr
    privacy_email: EmailStr
    phone: str = Field(min_length=1, max_length=80)
    ai_provider: str = Field(min_length=1, max_length=160)
    payment_provider: str = Field(min_length=1, max_length=160)
    hosting_provider: str = Field(min_length=1, max_length=160)

    @field_validator(
        "name",
        "social_location",
        "cui",
        "register_number",
        "social_capital",
        "phone",
        "ai_provider",
        "payment_provider",
        "hosting_provider",
    )
    @classmethod
    def normalize_text(cls, value: str) -> str:
        return clean_short_text(value)


class LegalDocumentSectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    section_key: str
    title: str
    content: str
    rendered_content: str
    sort_order: int
    last_date_modified: datetime


class LegalDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    title: str
    content_html: str
    rendered_content_html: str
    last_date_modified: datetime
    sections: list[LegalDocumentSectionResponse]
    available_variables: list[str]


class LegalDocumentSectionUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    content: str = Field(min_length=1)

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        return clean_short_text(value)

    @field_validator("content")
    @classmethod
    def normalize_content(cls, value: str) -> str:
        return clean_html_text(value)
