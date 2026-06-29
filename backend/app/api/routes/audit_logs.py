from fastapi import APIRouter, Query
from sqlalchemy import or_, select

from app.api.dependencies import CurrentAdminUser, DbSession
from app.models import AuditLog
from app.schemas.audit import AuditLogResponse

router = APIRouter(prefix="/api/admin/audit-logs", tags=["admin-audit-logs"])


@router.get("/", response_model=list[AuditLogResponse])
async def get_admin_audit_logs(
    _: CurrentAdminUser,
    session: DbSession,
    action: str | None = Query(default=None, max_length=120),
    status: str | None = Query(default=None, pattern="^(success|failure)$"),
    actor: str | None = Query(default=None, max_length=320),
    limit: int = Query(default=200, ge=1, le=500),
) -> list[AuditLogResponse]:
    query = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)

    if action:
        query = query.where(AuditLog.action == action)

    if status:
        query = query.where(AuditLog.status == status)

    if actor:
        actor_pattern = f"%{actor.strip()}%"
        query = query.where(
            or_(
                AuditLog.actor_email.ilike(actor_pattern),
                AuditLog.actor_name.ilike(actor_pattern),
            )
        )

    logs = list((await session.scalars(query)).all())
    return [AuditLogResponse.model_validate(log) for log in logs]
