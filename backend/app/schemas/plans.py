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
    conditions: str
    active_project_limit: int
    monthly_material_limit: int
    files_per_project_limit: int
    file_size_limit_mb: int
    project_size_limit_mb: int
    estimated_page_limit: int
    initial_flashcard_limit: int
    quiz_groups_per_complexity: int
    quiz_questions_per_quiz: int
    allow_scanned_documents: bool
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
    conditions: str = Field(min_length=1, max_length=1200)
    active_project_limit: int = Field(ge=0, le=1000)
    monthly_material_limit: int = Field(ge=0, le=10000)
    files_per_project_limit: int = Field(ge=1, le=200)
    file_size_limit_mb: int = Field(ge=1, le=2048)
    project_size_limit_mb: int = Field(ge=1, le=10240)
    estimated_page_limit: int = Field(ge=1, le=10000)
    initial_flashcard_limit: int = Field(ge=1, le=500)
    quiz_groups_per_complexity: int = Field(ge=1, le=12)
    quiz_questions_per_quiz: int = Field(ge=3, le=50)
    allow_scanned_documents: bool
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

    @field_validator(
        "description",
        "material_limit",
        "ai_level",
        "storage",
        "conditions",
    )
    @classmethod
    def normalize_long_text(cls, value: str) -> str:
        return clean_long_text(value)

    @model_validator(mode="after")
    def validate_limit_relationships(self) -> SubscriptionPlanUpdate:
        if self.project_size_limit_mb < self.file_size_limit_mb:
            raise ValueError(
                "Limita totala a proiectului trebuie sa fie cel putin egala "
                "cu limita unui fisier."
            )
        return self


class SubscriptionPlansUpdate(BaseModel):
    plans: list[SubscriptionPlanUpdate] = Field(min_length=1, max_length=12)

    @model_validator(mode="after")
    def validate_unique_plan_identifiers(self) -> SubscriptionPlansUpdate:
        slugs = [plan.slug for plan in self.plans]
        if len(slugs) != len(set(slugs)):
            raise ValueError("Slugurile planurilor trebuie sa fie unice.")

        stripe_price_ids = [
            plan.stripe_price_id for plan in self.plans if plan.stripe_price_id
        ]
        if len(stripe_price_ids) != len(set(stripe_price_ids)):
            raise ValueError("Stripe Price ID trebuie sa fie unic pentru fiecare plan.")
        return self
