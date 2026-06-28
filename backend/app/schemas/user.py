import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

ThemePreference = Literal["light", "dark", "system"]
UserRole = Literal["admin", "user"]


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str
    is_active: bool
    role: UserRole
    created_at: datetime
    theme_preference: ThemePreference

    @field_validator("role", mode="before")
    @classmethod
    def normalize_role(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip().lower()
        return value


class UserPreferencesUpdate(BaseModel):
    theme_preference: ThemePreference
