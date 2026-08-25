import uuid
from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, computed_field

ContactMessageCategory = Literal[
    "suport",
    "facturare",
    "confidentialitate",
    "raportare_continut",
]


class AdminContactMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: str
    category: ContactMessageCategory
    subject: str
    message: str
    ip_address: str | None
    user_agent: str | None
    created_at: datetime

    @computed_field
    @property
    def reference(self) -> str:
        created_at = self.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=UTC)
        return f"CON-{created_at.astimezone(UTC):%Y%m%d}-{self.id.hex[:8].upper()}"
