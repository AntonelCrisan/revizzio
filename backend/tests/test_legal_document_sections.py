from app.api.routes.legal import (
    _normalize_section_sort_order,
    _unique_section_key,
)
from app.models import LegalDocument, LegalDocumentSection
from app.schemas.legal import LegalDocumentSectionCreate


def build_document(*sections: LegalDocumentSection) -> LegalDocument:
    document = LegalDocument(
        slug="privacy_policy",
        title="Politica de confidentialitate",
    )
    document.sections = list(sections)
    return document


def build_section(section_key: str, sort_order: int) -> LegalDocumentSection:
    return LegalDocumentSection(
        section_key=section_key,
        title=section_key.replace("_", " ").title(),
        content=f"<h2>{section_key}</h2><p>Continut.</p>",
        sort_order=sort_order,
    )


def test_unique_section_key_uses_normalized_title() -> None:
    document = build_document()

    assert _unique_section_key(document, "Secțiune nouă") == "sectiune_noua"


def test_unique_section_key_adds_suffix_for_existing_key() -> None:
    document = build_document(
        build_section("drepturile_utilizatorilor", 0),
        build_section("drepturile_utilizatorilor_2", 1),
    )

    assert (
        _unique_section_key(document, "Drepturile utilizatorilor")
        == "drepturile_utilizatorilor_3"
    )


def test_normalize_section_sort_order_closes_gaps() -> None:
    first = build_section("first", 10)
    second = build_section("second", 4)
    third = build_section("third", 7)

    _normalize_section_sort_order([first, second, third])

    assert second.sort_order == 0
    assert third.sort_order == 1
    assert first.sort_order == 2


def test_section_create_payload_normalizes_text() -> None:
    payload = LegalDocumentSectionCreate(
        title="  Drepturi   utilizatori  ",
        content="\r\n<h2>Drepturi</h2>\x00<p>Text.</p>  ",
    )

    assert payload.title == "Drepturi utilizatori"
    assert payload.content == "<h2>Drepturi</h2><p>Text.</p>"
