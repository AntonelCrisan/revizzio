import uuid

import pytest

from app.core.config import Settings
from app.models import (
    StudyProject,
    StudyProjectFile,
    StudyProjectFlashcard,
    StudyProjectQuizOption,
    StudyProjectQuizQuestion,
    StudyProjectSummary,
)
from app.services.projects import (
    ProjectValidationError,
    StudyProjectService,
    _quiz_mistake_flashcard_back,
    _safe_filename,
    _validate_flashcard_image_signature,
    _validate_generated_payload,
    _validate_project_file_signature,
    build_reviss_quiz_pack_prompt,
)

BASE_SETTINGS = {
    "database_url": "postgresql+asyncpg://user:password@localhost:5432/revizzio",
    "session_secret": "a-secure-session-secret-with-more-than-32-characters",
}


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


def test_project_markdown_can_be_read_from_persisted_db_content(tmp_path) -> None:
    settings = Settings(**BASE_SETTINGS, project_storage_dir=tmp_path)
    service = StudyProjectService(  # type: ignore[arg-type]
        session=None,
        settings=settings,
    )
    project_id = uuid.uuid4()
    project = StudyProject(
        id=project_id,
        user_id=uuid.uuid4(),
        name="Drept civil",
        subject_name="Drept",
        institution_name="Facultate",
        slug="drept-civil",
        combined_markdown_path=str(tmp_path / "missing.md"),
    )
    project.files = [
        StudyProjectFile(
            project_id=project_id,
            original_filename="curs.pdf",
            size_bytes=128,
            source_path=str(tmp_path / "missing.pdf"),
            markdown_content="Continut complet pentru quizuri.",
            markdown_char_count=33,
            conversion_status="converted",
        )
    ]

    assert service._read_project_markdown(project) == (
        "# Material 1: curs.pdf\n\nContinut complet pentru quizuri."
    )


def test_quiz_prompt_keeps_full_material_and_targets_selected_language() -> None:
    material = "Curs in romana care trebuie acoperit integral."

    prompt = build_reviss_quiz_pack_prompt(
        project_name="Biologie",
        subject_name="Biologie celulara",
        institution_name="Facultate",
        summary="Rezumat generat.",
        flashcard_context="- Q: Ce este celula?\n  A: Unitatea de baza.",
        material_markdown=material,
        quiz_groups_per_complexity=1,
        questions_per_quiz=8,
        target_language="en",
    )

    assert "English" in prompt
    assert "MATERIAL MARKDOWN COMPLET" in prompt
    assert material in prompt


def test_quiz_mistake_flashcard_back_does_not_prefix_correct_answer() -> None:
    question_id = uuid.uuid4()
    question = StudyProjectQuizQuestion(
        id=question_id,
        quiz_id=uuid.uuid4(),
        prompt="What is a local indication of the rectal route?",
        question_type="single_choice",
        explanation="Hemorrhoids are a local indication.",
        sort_order=0,
    )
    question.options = [
        StudyProjectQuizOption(
            question_id=question_id,
            label="Hemorrhoids",
            is_correct=True,
            sort_order=0,
        )
    ]

    assert _quiz_mistake_flashcard_back(question) == (
        "Hemorrhoids are a local indication."
    )

    question.explanation = ""

    assert _quiz_mistake_flashcard_back(question) == "Hemorrhoids"
    assert not _quiz_mistake_flashcard_back(question).startswith("Raspuns corect:")


def test_ai_selection_prompts_target_account_language(tmp_path) -> None:
    settings = Settings(**BASE_SETTINGS, project_storage_dir=tmp_path)
    service = StudyProjectService(  # type: ignore[arg-type]
        session=None,
        settings=settings,
    )
    project_id = uuid.uuid4()
    project = StudyProject(
        id=project_id,
        user_id=uuid.uuid4(),
        name="Pharma",
        subject_name="Pharmacology",
        institution_name="University",
        slug="pharma",
        status="ready",
    )
    project.summary = StudyProjectSummary(
        project_id=project_id,
        content="The rectal route is used for local effects.",
        estimated_reading_minutes=1,
    )

    prompt = service._build_summary_selection_prompt(
        project=project,
        selected_text="local effects",
        selected_block="The rectal route is used for local effects.",
        previous_block="",
        next_block="",
        keywords_context="",
        target_language="en",
    )

    assert "Raspunde in English" in prompt
    assert "traduce fidel conceptele in English" in prompt
    assert "Raspunde in romana" not in prompt


def test_flashcard_and_chat_ai_prompts_target_account_language(tmp_path) -> None:
    settings = Settings(**BASE_SETTINGS, project_storage_dir=tmp_path)
    service = StudyProjectService(  # type: ignore[arg-type]
        session=None,
        settings=settings,
    )
    project_id = uuid.uuid4()
    project = StudyProject(
        id=project_id,
        user_id=uuid.uuid4(),
        name="Pharma",
        subject_name="Pharmacology",
        institution_name="University",
        slug="pharma",
        status="ready",
    )
    project.summary = StudyProjectSummary(
        project_id=project_id,
        content="The rectal route is used for local effects.",
        estimated_reading_minutes=1,
    )
    flashcard = StudyProjectFlashcard(
        project_id=project_id,
        front="What are the main local indications of the rectal route?",
        back="Hemorrhoids and anal fissures.",
        category="Routes",
        difficulty="medium",
        source_type="generated",
        sort_order=0,
    )
    project.flashcards = [flashcard]
    project.keywords = []
    project.strategies = []
    project.quizzes = []

    flashcard_prompt = service._build_flashcard_selection_prompt(
        project=project,
        flashcard=flashcard,
        side="question",
        selected_text="rectal route",
        selected_side_text=flashcard.front,
        summary_context=project.summary.content,
        keywords_context="",
        target_language="fr",
    )
    chat_prompt = service._build_project_chat_prompt(
        project=project,
        message="Explain this flashcard",
        history=[],
        conversation_summary="",
        target_language="fr",
    )

    assert "Raspunde in French" in flashcard_prompt
    assert "answer\" si \"bullets\", trebuie sa fie in French" in flashcard_prompt
    assert (
        "Textul final din cheia JSON \"answer\" trebuie sa fie in French."
        in chat_prompt
    )
    assert "Raspunde in romana" not in flashcard_prompt
    assert "Raspunde in romana" not in chat_prompt
