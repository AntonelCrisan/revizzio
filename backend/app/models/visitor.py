import uuid
from datetime import date as date_type
from datetime import datetime

from sqlalchemy import Date, DateTime, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class VisitorVisit(Base):
    __tablename__ = "visitor_visits"
    __table_args__ = (
        UniqueConstraint(
            "visitor_hash",
            "visit_date",
            name="uq_visitor_visits_visitor_hash_visit_date",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    visitor_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    visit_date: Mapped[date_type] = mapped_column(Date, nullable=False, index=True)
    path: Mapped[str | None] = mapped_column(String(300), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
