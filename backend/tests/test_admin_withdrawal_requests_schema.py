from datetime import UTC, datetime
from uuid import UUID

from app.schemas.admin_withdrawal_requests import AdminWithdrawalRequestResponse


def test_admin_withdrawal_request_response_accepts_model_fields() -> None:
    request = AdminWithdrawalRequestResponse(
        id=UUID("22222222-2222-4222-8222-222222222222"),
        registration_number="RET-20260825-ABCDEF12",
        full_name="Student Test",
        email="student@example.com",
        subscription_or_order="Focus lunar",
        order_number="INV-123",
        reason="Solicit retragerea din contract.",
        confirmation=True,
        email_confirmation_status="sent",
        ip_address="198.51.100.24",
        user_agent="pytest",
        created_at=datetime(2026, 8, 25, 12, 0, tzinfo=UTC),
    )

    assert request.registration_number == "RET-20260825-ABCDEF12"
    assert request.email_confirmation_status == "sent"
