import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class AiCreditRateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    feature: str
    size_tier: str
    threshold_max: int | None
    credits: int
    updated_at: datetime


class AiCreditRateUpdate(BaseModel):
    feature: str = Field(min_length=1, max_length=32)
    size_tier: str = Field(min_length=1, max_length=16)
    threshold_max: int | None = Field(default=None, ge=1, le=1000000)
    credits: int = Field(ge=0, le=1000)


class AiCreditRatesUpdate(BaseModel):
    rates: list[AiCreditRateUpdate] = Field(min_length=1, max_length=50)


class AiModelRateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    model: str
    cost_per_1k_input_tokens: Decimal
    cost_per_1k_output_tokens: Decimal
    updated_at: datetime


class AiModelRateUpdate(BaseModel):
    model: str = Field(min_length=1, max_length=80)
    cost_per_1k_input_tokens: Decimal = Field(ge=0, decimal_places=6)
    cost_per_1k_output_tokens: Decimal = Field(ge=0, decimal_places=6)


class AiModelRatesUpdate(BaseModel):
    rates: list[AiModelRateUpdate] = Field(min_length=1, max_length=50)
