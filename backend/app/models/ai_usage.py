import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AiUsageLog(Base):
    __tablename__ = "ai_usage_logs"
    __table_args__ = (
        CheckConstraint(
            "feature IN ('chat', 'quiz', 'flashcards', 'summary', "
            "'explanation', 'ocr')",
            name="ck_ai_usage_logs_feature",
        ),
        CheckConstraint(
            "size_tier IS NULL OR size_tier IN ('small', 'medium', 'large')",
            name="ck_ai_usage_logs_size_tier",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    subscription_plan_slug: Mapped[str] = mapped_column(String(80), nullable=False)
    feature: Mapped[str] = mapped_column(String(32), nullable=False)
    size_tier: Mapped[str | None] = mapped_column(String(16), nullable=True)
    model: Mapped[str | None] = mapped_column(String(80), nullable=True)
    input_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    output_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cached_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    estimated_cost_usd: Mapped[Decimal | None] = mapped_column(
        Numeric(8, 4),
        nullable=True,
    )
    ai_credits_charged: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    ocr_pages_charged: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )


class AiCreditRate(Base):
    __tablename__ = "ai_credit_rates"
    __table_args__ = (
        CheckConstraint(
            "feature IN ('chat', 'quiz', 'flashcards', 'summary', 'explanation')",
            name="ck_ai_credit_rates_feature",
        ),
        CheckConstraint(
            "size_tier IN ('small', 'medium', 'large')",
            name="ck_ai_credit_rates_size_tier",
        ),
        UniqueConstraint(
            "feature",
            "size_tier",
            name="uq_ai_credit_rates_feature_size_tier",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    feature: Mapped[str] = mapped_column(String(32), nullable=False)
    size_tier: Mapped[str] = mapped_column(String(16), nullable=False)
    threshold_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    credits: Mapped[int] = mapped_column(Integer, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class AiModelRate(Base):
    __tablename__ = "ai_model_rates"
    __table_args__ = (UniqueConstraint("model", name="uq_ai_model_rates_model"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    model: Mapped[str] = mapped_column(String(80), nullable=False)
    cost_per_1k_input_tokens: Mapped[Decimal] = mapped_column(
        Numeric(10, 6),
        nullable=False,
        default=Decimal("0"),
    )
    cost_per_1k_output_tokens: Mapped[Decimal] = mapped_column(
        Numeric(10, 6),
        nullable=False,
        default=Decimal("0"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
