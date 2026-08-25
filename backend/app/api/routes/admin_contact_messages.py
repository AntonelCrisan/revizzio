from fastapi import APIRouter, Query
from sqlalchemy import or_, select

from app.api.dependencies import CurrentAdminUser, DbSession
from app.models import ContactMessage
from app.schemas.admin_contact_messages import AdminContactMessageResponse

router = APIRouter(
    prefix="/api/admin/contact-messages",
    tags=["admin-contact-messages"],
)


@router.get("/", response_model=list[AdminContactMessageResponse])
async def get_admin_contact_messages(
    _: CurrentAdminUser,
    session: DbSession,
    category: str | None = Query(default=None, max_length=40),
    search: str | None = Query(default=None, max_length=320),
    limit: int = Query(default=200, ge=1, le=500),
) -> list[AdminContactMessageResponse]:
    query = (
        select(ContactMessage)
        .order_by(ContactMessage.created_at.desc(), ContactMessage.id.asc())
        .limit(limit)
    )

    if category:
        query = query.where(ContactMessage.category == category)

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.where(
            or_(
                ContactMessage.name.ilike(search_pattern),
                ContactMessage.email.ilike(search_pattern),
                ContactMessage.subject.ilike(search_pattern),
                ContactMessage.message.ilike(search_pattern),
            )
        )

    messages = list((await session.scalars(query)).all())
    return [AdminContactMessageResponse.model_validate(item) for item in messages]
