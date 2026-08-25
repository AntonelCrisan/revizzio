import uuid
from datetime import UTC, datetime

from app.schemas.admin_content_reports import AdminContentReportResponse


def test_admin_content_report_response_serializes_registration_number() -> None:
    report = AdminContentReportResponse(
        id=uuid.UUID("8b28274f-0000-4000-8000-000000000000"),
        registration_number="RAP-20260825-8B28274F",
        name="Crișan Antonel",
        email="antonel@example.com",
        report_type="continut_incorect",
        content_reference="Proiect Pharma / card 12",
        description="Descriere raportare.",
        rights_evidence=None,
        declaration=True,
        ip_address="127.0.0.1",
        user_agent="pytest",
        created_at=datetime(2026, 8, 25, 10, 30, tzinfo=UTC),
        attachments=[
            {
                "id": uuid.UUID("8b28274f-0000-4000-8000-000000000001"),
                "original_filename": "dovada.pdf",
                "content_type": "application/pdf",
                "size_bytes": 1024,
                "created_at": datetime(2026, 8, 25, 10, 31, tzinfo=UTC),
            }
        ],
    )

    assert report.registration_number == "RAP-20260825-8B28274F"
    assert report.report_type == "continut_incorect"
    assert report.attachments[0].original_filename == "dovada.pdf"
