import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CheckoutSessionCreateRequest(BaseModel):
    plan_slug: str = Field(min_length=1, max_length=80)


class CheckoutSessionResponse(BaseModel):
    checkout_url: str
    session_id: str


class CheckoutSessionSyncRequest(BaseModel):
    session_id: str = Field(min_length=1, max_length=255)


class SubscriptionInvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    stripe_invoice_id: str
    number: str | None
    status: str
    currency: str
    amount_due: int
    amount_paid: int
    hosted_invoice_url: str | None
    invoice_pdf_url: str | None
    paid_at: datetime | None
    created_at: datetime
