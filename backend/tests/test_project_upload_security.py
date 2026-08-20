import pytest

from app.services.projects import (
    ProjectValidationError,
    _safe_filename,
    _validate_flashcard_image_signature,
    _validate_generated_payload,
    _validate_project_file_signature,
)


def test_flashcard_image_signature_accepts_real_png_header() -> None:
    _validate_flashcard_image_signature(".png", b"\x89PNG\r\n\x1a\nextra-bytes")


def test_flashcard_image_signature_rejects_fake_png_payload() -> None:
    with pytest.raises(ProjectValidationError, match="imagine valida"):
        _validate_flashcard_image_signature(".png", b"<script>alert(1)</script>")


def test_safe_filename_removes_path_parts_and_limits_length() -> None:
    filename = _safe_filename("../" + ("a" * 300) + ".pdf")

    assert "/" not in filename
    assert "\\" not in filename
    assert filename.endswith(".pdf")
    assert len(filename) <= 180


def test_project_file_signature_accepts_valid_pdf_header() -> None:
    _validate_project_file_signature(".pdf", b"%PDF-1.7\n")


def test_project_file_signature_rejects_fake_pdf_payload() -> None:
    with pytest.raises(ProjectValidationError, match="PDF"):
        _validate_project_file_signature(".pdf", b"MZ fake executable")


def test_project_file_signature_accepts_docx_zip_header() -> None:
    _validate_project_file_signature(".docx", b"PK\x03\x04extra")


def test_generated_payload_rejects_quiz_without_correct_answer() -> None:
    payload = {
        "quizzes": [
            {
                "questions": [
                    {
                        "options": [
                            {"label": "A", "is_correct": False},
                            {"label": "B", "is_correct": False},
                        ],
                    }
                ],
            }
        ],
    }

    with pytest.raises(ProjectValidationError, match="raspuns corect"):
        _validate_generated_payload(
            payload,
            include_study_pack=False,
            include_quizzes=True,
        )


def test_generated_payload_rejects_oversized_flashcard_list() -> None:
    payload = {
        "summary": {"content": "Rezumat scurt."},
        "flashcards": [{"front": "Q", "back": "A"}] * 141,
    }

    with pytest.raises(ProjectValidationError, match="flashcarduri"):
        _validate_generated_payload(
            payload,
            include_study_pack=True,
            include_quizzes=False,
        )
