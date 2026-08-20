import pytest

from app.services.projects import (
    ProjectValidationError,
    _validate_flashcard_image_signature,
)


def test_flashcard_image_signature_accepts_real_png_header() -> None:
    _validate_flashcard_image_signature(".png", b"\x89PNG\r\n\x1a\nextra-bytes")


def test_flashcard_image_signature_rejects_fake_png_payload() -> None:
    with pytest.raises(ProjectValidationError, match="imagine valida"):
        _validate_flashcard_image_signature(".png", b"<script>alert(1)</script>")

