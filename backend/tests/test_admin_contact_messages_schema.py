import uuid
from datetime import UTC, datetime

from app.schemas.admin_contact_messages import AdminContactMessageResponse


def test_admin_contact_message_reference_uses_created_date_and_short_id() -> None:
    message_id = uuid.UUID("7b28274f-0000-4000-8000-000000000000")

    message = AdminContactMessageResponse(
        id=message_id,
        name="Crișan Antonel",
        email="antonel@example.com",
        category="suport",
        subject="Ajutor cont",
        message="Mesaj test",
        ip_address="127.0.0.1",
        user_agent="pytest",
        created_at=datetime(2026, 8, 25, 10, 30, tzinfo=UTC),
    )

    assert message.reference == "CON-20260825-7B28274F"
