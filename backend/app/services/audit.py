import uuid
from collections.abc import Mapping, Sequence
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AuditLog, User

SENSITIVE_KEY_PARTS = (
    "authorization",
    "cookie",
    "password",
    "secret",
    "token",
)


def _trim(value: str, max_length: int) -> str:
    return value if len(value) <= max_length else f"{value[: max_length - 3]}..."


def _safe_json(value: Any) -> Any:
    if isinstance(value, Mapping):
        clean: dict[str, Any] = {}
        for key, item in value.items():
            string_key = str(key)
            lowered_key = string_key.lower()
            if any(part in lowered_key for part in SENSITIVE_KEY_PARTS):
                clean[string_key] = "[redacted]"
            else:
                clean[string_key] = _safe_json(item)
        return clean

    if isinstance(value, str):
        return _trim(value, 1000)

    if isinstance(value, bool) or value is None or isinstance(value, int | float):
        return value

    if isinstance(value, Decimal):
        return str(value)

    if isinstance(value, uuid.UUID):
        return str(value)

    if isinstance(value, datetime):
        return value.isoformat()

    if isinstance(value, Sequence) and not isinstance(value, str | bytes | bytearray):
        return [_safe_json(item) for item in value]

    return str(value)


def add_audit_log(
    session: AsyncSession,
    *,
    action: str,
    status: str = "success",
    actor: User | None = None,
    actor_user_id: uuid.UUID | None = None,
    actor_email: str | None = None,
    actor_name: str | None = None,
    resource_type: str | None = None,
    resource_id: str | None = None,
    details: Mapping[str, Any] | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> None:
    if actor is not None:
        actor_user_id = actor.id
        actor_email = actor.email
        actor_name = actor.full_name

    session.add(
        AuditLog(
            actor_user_id=actor_user_id,
            actor_email=_trim(actor_email, 320) if actor_email else None,
            actor_name=_trim(actor_name, 120) if actor_name else None,
            action=_trim(action, 120),
            status=_trim(status, 24),
            resource_type=_trim(resource_type, 80) if resource_type else None,
            resource_id=_trim(resource_id, 120) if resource_id else None,
            details=_safe_json(dict(details or {})),
            ip_address=_trim(ip_address, 64) if ip_address else None,
            user_agent=_trim(user_agent, 512) if user_agent else None,
        )
    )
