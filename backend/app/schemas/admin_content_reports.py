import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ContentReportType = Literal[
    "drepturi_autor",
    "date_personale",
    "continut_incorect",
    "altul",
]


class AdminContentReportAttachmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    original_filename: str
    content_type: str | None
    size_bytes: int
    created_at: datetime


class AdminContentReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    registration_number: str
    name: str
    email: str
    report_type: ContentReportType
    content_reference: str
    description: str
    rights_evidence: str | None
    declaration: bool
    ip_address: str | None
    user_agent: str | None
    created_at: datetime
    attachments: list[AdminContentReportAttachmentResponse] = Field(
        default_factory=list,
    )
