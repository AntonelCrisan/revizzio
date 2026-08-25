import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AdminWithdrawalRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    registration_number: str
    full_name: str
    email: str
    subscription_or_order: str
    order_number: str | None
    reason: str | None
    confirmation: bool
    email_confirmation_status: str
    ip_address: str | None
    user_agent: str | None
    created_at: datetime
