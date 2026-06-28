from datetime import UTC, datetime

from app.models import CompanyData
from app.services.legal import render_company_placeholders


def build_company_data() -> CompanyData:
    return CompanyData(
        name="Revizzio SRL",
        social_location="Cluj-Napoca",
        cui="RO12345678",
        register_number="J12/1234/2026",
        social_capital="200 RON",
        email="contact@revizzio.test",
        privacy_email="privacy@revizzio.test",
        phone="0712345678",
        ai_provider="OpenAI",
        payment_provider="Stripe",
        hosting_provider="Vercel",
    )


def test_render_last_modified_placeholders() -> None:
    rendered = render_company_placeholders(
        (
            "[DATA ULTIMEI ACTUALIZĂRI] / "
            "[DATA ULTIMEI ACTUALIZARI] / "
            "{last_date_modified} / "
            "{phone}"
        ),
        build_company_data(),
        last_date_modified=datetime(2026, 6, 27, tzinfo=UTC),
    )

    assert rendered == "27.06.2026 / 27.06.2026 / 27.06.2026 / 0712345678"
