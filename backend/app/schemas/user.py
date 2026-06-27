import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr

ThemePreference = Literal["light", "dark", "system"]


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str
    is_active: bool
    created_at: datetime
    theme_preference: ThemePreference


class UserPreferencesUpdate(BaseModel):
    theme_preference: ThemePreference
