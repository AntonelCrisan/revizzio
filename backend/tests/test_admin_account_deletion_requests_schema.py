from datetime import UTC, datetime
from uuid import UUID

from app.schemas.admin_account_deletion_requests import (
    AdminAccountDeletionRequestResponse,
)


def test_admin_account_deletion_request_response_accepts_model_fields() -> None:
    request = AdminAccountDeletionRequestResponse(
        id=UUID("33333333-3333-4333-8333-333333333333"),
        user_id=UUID("44444444-4444-4444-8444-444444444444"),
        full_name="Student Test",
        email="student@example.com",
        status="pending",
        resolved_by_user_id=None,
        resolved_at=None,
        resolution_note=None,
        ip_address="198.51.100.24",
        user_agent="pytest",
        created_at=datetime(2026, 8, 26, 12, 0, tzinfo=UTC),
    )

    assert request.email == "student@example.com"
    assert request.status == "pending"
