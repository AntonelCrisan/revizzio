import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

ThemePreference = Literal["light", "dark", "system"]
UserRole = Literal["admin", "user"]


class UserPlanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    name: str
    price_ron: Decimal
    billing_interval: str
    badge: str | None
    material_limit: str
    ai_level: str
    storage: str
    is_featured: bool


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str
    is_active: bool
    role: UserRole
    created_at: datetime
    theme_preference: ThemePreference
    current_plan: UserPlanResponse | None = None

    @field_validator("role", mode="before")
    @classmethod
    def normalize_role(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip().lower()
        return value


class UserPreferencesUpdate(BaseModel):
    theme_preference: ThemePreference
