from datetime import datetime

from pydantic import BaseModel


class UsageResponse(BaseModel):
    materials_used: int
    materials_limit: int
    pages_processed: int
    pages_limit: int
    ai_credits_used: int
    ai_credits_limit: int
    ocr_pages_used: int
    ocr_pages_limit: int
    reset_date: datetime
