import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr

AccountDeletionRequestStatus = Literal["pending", "completed", "cancelled"]


class AdminAccountDeletionRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID | None
    full_name: str
    email: EmailStr
    status: AccountDeletionRequestStatus
    resolved_by_user_id: uuid.UUID | None
    resolved_at: datetime | None
    resolution_note: str | None
    ip_address: str | None
    user_agent: str | None
    created_at: datetime
