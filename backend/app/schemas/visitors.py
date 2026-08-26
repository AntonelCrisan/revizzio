from pydantic import BaseModel, Field


class VisitorPingRequest(BaseModel):
    path: str | None = Field(default=None, max_length=300)


class VisitorPingResponse(BaseModel):
    tracked: bool


class VisitorStatsResponse(BaseModel):
    total_visitors: int
    visitors_today: int
    visitors_last_7_days: int
    visitors_last_30_days: int
