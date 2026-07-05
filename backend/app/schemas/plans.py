import re
import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

CONTROL_CHAR_PATTERN = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def clean_short_text(value: str) -> str:
    return CONTROL_CHAR_PATTERN.sub("", " ".join(value.split())).strip()


def clean_long_text(value: str) -> str:
    return CONTROL_CHAR_PATTERN.sub("", value).replace("\r\n", "\n").strip()


class SubscriptionPlanFeatureResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    label: str
    sort_order: int


class SubscriptionPlanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    name: str
    price_ron: Decimal
    old_price_ron: Decimal | None
    discount_label: str | None
    billing_interval: str
    badge: str | None
    description: str
    material_limit: str
    ai_level: str
    storage: str
    stripe_product_id: str | None = None
    stripe_price_id: str | None = None
    is_visible: bool
    is_featured: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime
    features: list[SubscriptionPlanFeatureResponse]


class SubscriptionPlanFeatureUpdate(BaseModel):
    id: uuid.UUID | None = None
    label: str = Field(min_length=1, max_length=300)
    sort_order: int = Field(ge=0)

    @field_validator("label")
    @classmethod
    def normalize_label(cls, value: str) -> str:
        return clean_short_text(value)


class SubscriptionPlanUpdate(BaseModel):
    id: uuid.UUID | None = None
    slug: str = Field(min_length=1, max_length=80)
    name: str = Field(min_length=1, max_length=120)
    price_ron: Decimal = Field(ge=0, decimal_places=2)
    old_price_ron: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    discount_label: str | None = Field(default=None, max_length=120)
    billing_interval: str = Field(min_length=1, max_length=40)
    badge: str | None = Field(default=None, max_length=80)
    description: str = Field(min_length=1, max_length=800)
    material_limit: str = Field(min_length=1, max_length=300)
    ai_level: str = Field(min_length=1, max_length=300)
    storage: str = Field(min_length=1, max_length=300)
    stripe_product_id: str | None = Field(default=None, max_length=120)
    stripe_price_id: str | None = Field(default=None, max_length=120)
    is_visible: bool
    is_featured: bool
    sort_order: int = Field(ge=0)
    features: list[SubscriptionPlanFeatureUpdate] = Field(
        default_factory=list,
        max_length=20,
    )

    @field_validator("slug")
    @classmethod
    def normalize_slug(cls, value: str) -> str:
        slug = clean_short_text(value).lower()
        if not SLUG_PATTERN.fullmatch(slug):
            raise ValueError("Slugul poate contine litere mici, cifre si cratime.")
        return slug

    @field_validator(
        "name",
        "billing_interval",
        "discount_label",
        "badge",
        "stripe_product_id",
        "stripe_price_id",
        mode="after",
    )
    @classmethod
    def normalize_short_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = clean_short_text(value)
        return cleaned or None

    @field_validator("description", "material_limit", "ai_level", "storage")
    @classmethod
    def normalize_long_text(cls, value: str) -> str:
        return clean_long_text(value)


class SubscriptionPlansUpdate(BaseModel):
    plans: list[SubscriptionPlanUpdate] = Field(min_length=1, max_length=12)

    @model_validator(mode="after")
    def validate_unique_slugs(self) -> "SubscriptionPlansUpdate":
        slugs = [plan.slug for plan in self.plans]
        if len(slugs) != len(set(slugs)):
            raise ValueError("Slugurile planurilor trebuie sa fie unice.")
        return self
