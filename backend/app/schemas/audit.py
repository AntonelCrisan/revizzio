import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict

AuditLogStatus = Literal["success", "failure"]


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    actor_user_id: uuid.UUID | None
    actor_email: str | None
    actor_name: str | None
    action: str
    status: AuditLogStatus
    resource_type: str | None
    resource_id: str | None
    details: dict[str, Any]
    ip_address: str | None
    user_agent: str | None
    created_at: datetime
