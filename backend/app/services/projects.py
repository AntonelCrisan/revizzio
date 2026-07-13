# ruff: noqa: E501

from __future__ import annotations

import json
import logging
import mimetypes
import os
import re
import shutil
import subprocess
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import UploadFile
from markitdown import MarkItDown
from markitdown._markitdown import UnsupportedFormatException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from starlette.concurrency import run_in_threadpool

from app.core.config import Settings
from app.models import (
    StudyProject,
    StudyProjectArchive,
    StudyProjectFile,
    StudyProjectFlashcard,
    StudyProjectImport,
    StudyProjectKeyword,
    StudyProjectQuiz,
    StudyProjectQuizAttempt,
    StudyProjectQuizOption,
    StudyProjectQuizQuestion,
    StudyProjectStrategy,
    StudyProjectSummary,
    StudyProjectSummaryHighlight,
    StudyProjectSummaryNote,
    User,
)
from app.schemas.projects import StudyProjectResponse

logger = logging.getLogger("revizzio.projects")

ALLOWED_EXTENSIONS = {
    ".csv",
    ".doc",
    ".docx",
    ".html",
    ".md",
    ".pdf",
    ".ppt",
    ".pptx",
    ".txt",
    ".xls",
    ".xlsx",
}
LEGACY_OFFICE_TARGETS = {
    ".doc": ".docx",
    ".ppt": ".pptx",
}
MAX_JSON_IMPORT_BYTES = 5 * 1024 * 1024
MAX_FLASHCARD_IMAGE_BYTES = 5 * 1024 * 1024
ALLOWED_FLASHCARD_IMAGE_EXTENSIONS = {".gif", ".jpeg", ".jpg", ".png", ".webp"}


class ProjectError(Exception):
    pass


class ProjectValidationError(ProjectError):
    pass


class ProjectNotFoundError(ProjectError):
    pass


class ProjectConversionError(ProjectError):
    pass


class LegacyOfficeFormatError(ProjectConversionError):
    pass


def _clean_text(value: str) -> str:
    return re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", value).strip()


def _slugify(value: str) -> str:
    slug = (
        value.lower()
        .strip()
        .replace("ă", "a")
        .replace("â", "a")
        .replace("î", "i")
        .replace("ș", "s")
        .replace("ş", "s")
        .replace("ț", "t")
        .replace("ţ", "t")
    )
    slug = re.sub(r"[^a-z0-9]+", "-", slug).strip("-")
    return slug or f"proiect-{uuid.uuid4().hex[:8]}"


def _safe_filename(filename: str) -> str:
    clean_name = Path(filename or "material").name
    stem = re.sub(r"[^A-Za-z0-9._-]+", "-", Path(clean_name).stem).strip("-")
    suffix = Path(clean_name).suffix.lower()
    return f"{stem or 'material'}{suffix}"


def _long_path(path: Path) -> Path:
    """Bypass Windows' 260-char MAX_PATH limit for deeply nested storage roots."""
    if os.name != "nt":
        return path
    resolved = str(path if path.is_absolute() else path.resolve())
    if resolved.startswith("\\\\?\\"):
        return path
    return Path(f"\\\\?\\{resolved}")


def _validate_upload_extension(filename: str) -> None:
    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise ProjectValidationError(
            f"Tipul de fisier {extension or '(fara extensie)'} nu este acceptat."
        )
    target_suffix = LEGACY_OFFICE_TARGETS.get(extension)
    if target_suffix is not None and _office_converter_path() is None:
        raise ProjectValidationError(
            f"Fisierul {extension} este un format Office vechi. "
            f"Salveaza-l ca {target_suffix} si incarca-l din nou."
        )


def _office_converter_path() -> str | None:
    soffice_path = shutil.which("soffice")
    if soffice_path:
        return soffice_path

    for candidate in (
        Path("C:/Program Files/LibreOffice/program/soffice.exe"),
        Path("C:/Program Files (x86)/LibreOffice/program/soffice.exe"),
    ):
        if candidate.exists():
            return str(candidate)
    return None


def _convert_legacy_office_file(path: Path) -> Path:
    target_suffix = LEGACY_OFFICE_TARGETS.get(path.suffix.lower())
    if target_suffix is None:
        return path

    soffice_path = _office_converter_path()
    if soffice_path is None:
        raise LegacyOfficeFormatError(
            f"Fisierul {path.suffix.lower()} este un format Office vechi. "
            f"Salveaza-l ca {target_suffix} si incarca-l din nou."
        )

    output_dir = path.parent / "converted"
    output_dir.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            soffice_path,
            "--headless",
            "--convert-to",
            target_suffix.lstrip("."),
            "--outdir",
            str(output_dir),
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    converted_path = output_dir / f"{path.stem}{target_suffix}"
    if not converted_path.exists():
        raise LegacyOfficeFormatError(
            f"Fisierul {path.name} nu a putut fi convertit automat."
        )
    return converted_path


def _read_markdown(path: Path) -> str:
    converter = MarkItDown()
    convertible_path = _convert_legacy_office_file(path)
    result = converter.convert(convertible_path)
    return _clean_text(result.text_content)


def _string_or_default(value: object, default: str = "") -> str:
    if isinstance(value, str):
        return _clean_text(value)
    if value is None:
        return default
    return _clean_text(str(value))


def _list_value(value: object) -> list[Any]:
    return value if isinstance(value, list) else []


def _dict_value(value: object) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


class StudyProjectService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self.session = session
        self.settings = settings

    async def list_projects(self, user: User) -> list[StudyProject]:
        result = await self.session.scalars(
            self._project_query()
            .where(
                StudyProject.user_id == user.id,
                ~StudyProject.archive.has(),
            )
            .order_by(StudyProject.created_at.desc())
        )
        return list(result.all())

    async def list_archived_projects(self, user: User) -> list[StudyProject]:
        result = await self.session.scalars(
            self._project_query()
            .join(StudyProjectArchive)
            .where(
                StudyProject.user_id == user.id,
                StudyProjectArchive.user_id == user.id,
            )
            .order_by(StudyProjectArchive.archived_at.desc())
        )
        return list(result.all())

    async def get_project(
        self,
        user: User,
        project_id: uuid.UUID,
        *,
        include_archived: bool = False,
    ) -> StudyProject:
        conditions = [
            StudyProject.id == project_id,
            StudyProject.user_id == user.id,
        ]
        if not include_archived:
            conditions.append(~StudyProject.archive.has())

        project = await self.session.scalar(
            self._project_query().where(*conditions)
        )
        if project is None:
            raise ProjectNotFoundError("Proiectul nu a fost gasit.")
        return project

    async def rename_project(
        self,
        *,
        user: User,
        project_id: uuid.UUID,
        name: str,
    ) -> StudyProject:
        project = await self.get_project(user, project_id)
        clean_name = _clean_text(name)
        if len(clean_name) < 2:
            raise ProjectValidationError("Numele proiectului este prea scurt.")

        project.name = clean_name[:160]
        project.slug = _slugify(clean_name)
        project.updated_at = datetime.now(UTC)
        await self.session.commit()
        return await self.get_project(user, project.id)

    async def archive_project(
        self,
        *,
        user: User,
        project_id: uuid.UUID,
    ) -> StudyProject:
        project = await self.get_project(user, project_id)
        project.archive = StudyProjectArchive(
            project_id=project.id,
            user_id=user.id,
        )
        project.updated_at = datetime.now(UTC)
        await self.session.commit()
        return await self.get_project(user, project.id, include_archived=True)

    async def restore_project(
        self,
        *,
        user: User,
        project_id: uuid.UUID,
    ) -> StudyProject:
        project = await self.get_project(user, project_id, include_archived=True)
        if project.archive is None or project.archive.user_id != user.id:
            raise ProjectNotFoundError("Proiectul arhivat nu a fost gasit.")

        await self.session.delete(project.archive)
        project.updated_at = datetime.now(UTC)
        await self.session.commit()
        return await self.get_project(user, project.id)

    async def delete_project(self, *, user: User, project_id: uuid.UUID) -> None:
        project = await self.get_project(user, project_id, include_archived=True)
        project_dir = self._project_dir(user.id, project.id)

        await self.session.delete(project)
        await self.session.commit()
        self._delete_project_storage(project_dir)

    async def prepare_project(
        self,
        *,
        user: User,
        name: str,
        subject_name: str,
        institution_name: str,
        material_rights_confirmed: bool,
        uploads: list[UploadFile],
    ) -> StudyProject:
        project_name = _clean_text(name)
        subject = _clean_text(subject_name)
        institution = _clean_text(institution_name)
        if len(project_name) < 2:
            raise ProjectValidationError("Numele proiectului este prea scurt.")
        if len(subject) < 2:
            raise ProjectValidationError("Numele materiei este prea scurt.")
        if len(institution) < 2:
            raise ProjectValidationError(
                "Numele facultatii sau scolii este prea scurt."
            )
        if not material_rights_confirmed:
            raise ProjectValidationError(
                "Trebuie sa confirmi ca ai dreptul sa folosesti materialul."
            )
        if not uploads:
            raise ProjectValidationError("Incarca cel putin un fisier.")
        for upload in uploads:
            _validate_upload_extension(upload.filename or "material")

        project = StudyProject(
            user_id=user.id,
            name=project_name[:160],
            subject_name=subject[:160],
            institution_name=institution[:220],
            slug=_slugify(project_name),
            status="processing",
            material_rights_confirmed=True,
        )
        self.session.add(project)
        await self.session.flush()

        project_dir = self._project_dir(user.id, project.id)
        source_dir = project_dir / "source"
        markdown_dir = project_dir / "markdown"
        source_dir.mkdir(parents=True, exist_ok=True)
        markdown_dir.mkdir(parents=True, exist_ok=True)

        markdown_parts: list[str] = []
        max_upload_bytes = self.settings.project_upload_max_mb * 1024 * 1024

        for upload_index, upload in enumerate(uploads):
            file_model = await self._store_and_convert_file(
                project=project,
                upload=upload,
                upload_index=upload_index,
                source_dir=source_dir,
                markdown_dir=markdown_dir,
                max_upload_bytes=max_upload_bytes,
            )
            if file_model.markdown_path:
                markdown = Path(file_model.markdown_path).read_text(encoding="utf-8")
                heading = (
                    f"# Material {upload_index + 1}: "
                    f"{file_model.original_filename}"
                )
                markdown_parts.append("\n\n".join([heading, markdown]))

        if not markdown_parts:
            project.status = "failed"
            project.error_message = "Niciun fisier nu a putut fi convertit."
            await self.session.commit()
            raise ProjectConversionError(project.error_message)

        combined_markdown = "\n\n---\n\n".join(markdown_parts)
        combined_path = project_dir / "revizzio-material.md"
        prompt_path = project_dir / "revizzio-prompt.txt"
        combined_path.write_text(combined_markdown, encoding="utf-8")
        prompt_path.write_text(
            self._build_prompt(
                project_name=project.name,
                subject_name=project.subject_name,
                institution_name=project.institution_name,
                markdown=combined_markdown,
            ),
            encoding="utf-8",
        )

        project.combined_markdown_path = str(combined_path)
        project.prompt_path = str(prompt_path)
        project.status = "awaiting_ai_json"
        project.updated_at = datetime.now(UTC)
        await self.session.commit()
        return await self.get_project(user, project.id)

    async def import_ai_json(
        self,
        *,
        user: User,
        project_id: uuid.UUID,
        upload: UploadFile,
    ) -> StudyProject:
        project = await self.get_project(user, project_id)
        payload = await self._read_json_upload(upload)

        project_dir = self._project_dir(user.id, project.id)
        imports_dir = project_dir / "imports"
        imports_dir.mkdir(parents=True, exist_ok=True)
        json_path = imports_dir / f"ai-output-{uuid.uuid4().hex[:8]}.json"
        json_path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

        await self._clear_generated_content(project)
        self._apply_generated_payload(project, payload)
        project.generated_json_path = str(json_path)
        project.status = "ready"
        project.error_message = None
        project.updated_at = datetime.now(UTC)
        self.session.add(
            StudyProjectImport(
                project_id=project.id,
                original_filename=_safe_filename(upload.filename or "ai-output.json"),
                json_path=str(json_path),
                schema_version=_string_or_default(
                    payload.get("schema_version"), "revizzio.manual.v1"
                )[:40],
                payload=payload,
            )
        )
        await self.session.commit()
        return await self.get_project(user, project.id)

    async def create_quiz_mistake_flashcard(
        self,
        *,
        user: User,
        project_id: uuid.UUID,
        question_id: uuid.UUID,
    ) -> StudyProject:
        project = await self.get_project(user, project_id)

        question = await self.session.scalar(
            select(StudyProjectQuizQuestion)
            .join(StudyProjectQuiz)
            .where(
                StudyProjectQuizQuestion.id == question_id,
                StudyProjectQuiz.project_id == project.id,
            )
            .options(
                selectinload(StudyProjectQuizQuestion.options),
                selectinload(StudyProjectQuizQuestion.quiz),
            )
        )
        if question is None:
            raise ProjectNotFoundError("Intrebarea nu a fost gasita.")

        existing_flashcard = await self.session.scalar(
            select(StudyProjectFlashcard).where(
                StudyProjectFlashcard.project_id == project.id,
                StudyProjectFlashcard.source_type == "quiz_mistake",
                StudyProjectFlashcard.source_quiz_question_id == question.id,
            )
        )
        if existing_flashcard is None:
            correct_options = [
                option.label.strip()
                for option in question.options
                if option.is_correct and option.label.strip()
            ]
            correct_answer = "; ".join(correct_options) or "Vezi explicatia quizului."
            explanation = _clean_text(question.explanation or "")
            back_parts = [f"Raspuns corect: {correct_answer}"]
            if explanation:
                back_parts.append(explanation)

            project.flashcards.append(
                StudyProjectFlashcard(
                    front=question.prompt,
                    back=" ".join(back_parts),
                    category=question.quiz.title,
                    difficulty="quiz_mistake",
                    source_type="quiz_mistake",
                    source_quiz_question_id=question.id,
                    sort_order=len(project.flashcards),
                )
            )
            project.updated_at = datetime.now(UTC)
            await self.session.commit()

        return await self.get_project(user, project.id)

    async def create_manual_flashcard(
        self,
        *,
        user: User,
        project_id: uuid.UUID,
        front: str | None,
        back: str,
        category: str | None,
        difficulty: str | None,
        front_image: UploadFile | None,
    ) -> StudyProject:
        project = await self.get_project(user, project_id)
        clean_front = _clean_text(front or "")
        clean_back = _clean_text(back)
        clean_category = _clean_text(category or "")[:120] or None
        clean_difficulty = _clean_text(difficulty or "")[:40] or None

        has_image = front_image is not None and bool(front_image.filename)
        if not clean_front and not has_image:
            raise ProjectValidationError("Adauga o intrebare sau o imagine.")
        if not clean_back:
            raise ProjectValidationError("Adauga raspunsul flashcardului.")

        flashcard = StudyProjectFlashcard(
            id=uuid.uuid4(),
            project_id=project.id,
            front=clean_front,
            back=clean_back,
            category=clean_category,
            difficulty=clean_difficulty,
            source_type="manually",
            sort_order=len(project.flashcards),
        )

        if has_image and front_image is not None:
            flashcard.front_image = await self._store_flashcard_front_image(
                user_id=user.id,
                project_id=project.id,
                flashcard_id=flashcard.id,
                upload=front_image,
            )

        project.flashcards.append(flashcard)
        project.updated_at = datetime.now(UTC)
        await self.session.commit()
        return await self.get_project(user, project.id)

    async def flashcard_front_image_path(
        self,
        *,
        user: User,
        project_id: uuid.UUID,
        flashcard_id: uuid.UUID,
    ) -> tuple[Path, str]:
        project = await self.get_project(user, project_id)
        flashcard = next(
            (
                item
                for item in project.flashcards
                if item.id == flashcard_id and item.front_image
            ),
            None,
        )
        if flashcard is None or not flashcard.front_image:
            raise ProjectNotFoundError("Imaginea flashcardului nu exista.")

        project_dir = self._project_dir(user.id, project.id).resolve()
        image_path = (project_dir / flashcard.front_image).resolve()
        if project_dir != image_path and project_dir not in image_path.parents:
            raise ProjectNotFoundError("Imaginea flashcardului nu exista.")

        long_image_path = _long_path(image_path)
        if not long_image_path.exists() or not long_image_path.is_file():
            raise ProjectNotFoundError("Imaginea flashcardului nu exista.")

        media_type = mimetypes.guess_type(image_path.name)[0] or "image/jpeg"
        return long_image_path, media_type

    async def set_flashcard_review(
        self,
        *,
        user: User,
        project_id: uuid.UUID,
        flashcard_id: uuid.UUID,
        review: bool,
    ) -> StudyProject:
        project = await self.get_project(user, project_id)
        flashcard = next(
            (item for item in project.flashcards if item.id == flashcard_id),
            None,
        )
        if flashcard is None:
            raise ProjectNotFoundError("Flashcardul nu a fost gasit.")

        flashcard.review = review
        await self.session.commit()
        return await self.get_project(user, project.id)

    async def add_summary_highlight(
        self,
        *,
        user: User,
        project_id: uuid.UUID,
        paragraph_index: int,
        text: str,
        color: str,
    ) -> StudyProject:
        project = await self.get_project(user, project_id)
        clean_text = _clean_text(text)
        if not clean_text:
            raise ProjectValidationError(
                "Selecteaza un fragment de text pentru highlight."
            )

        existing = next(
            (
                highlight
                for highlight in project.summary_highlights
                if highlight.paragraph_index == paragraph_index
                and highlight.text == clean_text
            ),
            None,
        )
        if existing is not None:
            existing.color = color
        else:
            project.summary_highlights.append(
                StudyProjectSummaryHighlight(
                    project_id=project.id,
                    paragraph_index=paragraph_index,
                    text=clean_text,
                    color=color,
                )
            )
        await self.session.commit()
        return await self.get_project(user, project.id)

    async def update_summary_highlight_color(
        self,
        *,
        user: User,
        project_id: uuid.UUID,
        highlight_id: uuid.UUID,
        color: str,
    ) -> StudyProject:
        project = await self.get_project(user, project_id)
        highlight = next(
            (item for item in project.summary_highlights if item.id == highlight_id),
            None,
        )
        if highlight is None:
            raise ProjectNotFoundError("Highlight-ul nu a fost gasit.")

        highlight.color = color
        await self.session.commit()
        return await self.get_project(user, project.id)

    async def delete_summary_highlight(
        self,
        *,
        user: User,
        project_id: uuid.UUID,
        highlight_id: uuid.UUID,
    ) -> StudyProject:
        project = await self.get_project(user, project_id)
        highlight = next(
            (item for item in project.summary_highlights if item.id == highlight_id),
            None,
        )
        if highlight is None:
            raise ProjectNotFoundError("Highlight-ul nu a fost gasit.")

        await self.session.delete(highlight)
        project.summary_highlights.remove(highlight)
        await self.session.commit()
        return await self.get_project(user, project.id)

    async def add_summary_note(
        self,
        *,
        user: User,
        project_id: uuid.UUID,
        paragraph_index: int,
        text: str,
        note: str,
    ) -> StudyProject:
        project = await self.get_project(user, project_id)
        clean_text = _clean_text(text)
        clean_note = _clean_text(note)
        if not clean_text:
            raise ProjectValidationError(
                "Selecteaza un fragment de text pentru notita."
            )
        if not clean_note:
            raise ProjectValidationError("Scrie continutul notitei.")

        existing = next(
            (
                item
                for item in project.summary_notes
                if item.paragraph_index == paragraph_index
                and item.text == clean_text
            ),
            None,
        )
        if existing is not None:
            existing.note = clean_note
        else:
            project.summary_notes.append(
                StudyProjectSummaryNote(
                    project_id=project.id,
                    paragraph_index=paragraph_index,
                    text=clean_text,
                    note=clean_note,
                )
            )
        await self.session.commit()
        return await self.get_project(user, project.id)

    async def update_summary_note(
        self,
        *,
        user: User,
        project_id: uuid.UUID,
        note_id: uuid.UUID,
        note: str,
    ) -> StudyProject:
        project = await self.get_project(user, project_id)
        summary_note = next(
            (item for item in project.summary_notes if item.id == note_id),
            None,
        )
        if summary_note is None:
            raise ProjectNotFoundError("Notita nu a fost gasita.")

        clean_note = _clean_text(note)
        if not clean_note:
            raise ProjectValidationError("Scrie continutul notitei.")

        summary_note.note = clean_note
        await self.session.commit()
        return await self.get_project(user, project.id)

    async def delete_summary_note(
        self,
        *,
        user: User,
        project_id: uuid.UUID,
        note_id: uuid.UUID,
    ) -> StudyProject:
        project = await self.get_project(user, project_id)
        summary_note = next(
            (item for item in project.summary_notes if item.id == note_id),
            None,
        )
        if summary_note is None:
            raise ProjectNotFoundError("Notita nu a fost gasita.")

        await self.session.delete(summary_note)
        project.summary_notes.remove(summary_note)
        await self.session.commit()
        return await self.get_project(user, project.id)

    async def complete_quiz(
        self,
        *,
        user: User,
        project_id: uuid.UUID,
        quiz_id: uuid.UUID,
        correct_count: int,
        answered_count: int,
    ) -> StudyProject:
        project = await self.get_project(user, project_id)
        quiz = next((item for item in project.quizzes if item.id == quiz_id), None)
        if quiz is None:
            raise ProjectNotFoundError("Quiz-ul nu a fost gasit.")

        clean_answered = max(answered_count, 0)
        clean_correct = max(min(correct_count, clean_answered), 0)
        score_percent = (
            round((clean_correct / clean_answered) * 100) if clean_answered else 0
        )

        completed_at = datetime.now(UTC)
        quiz.completed_at = completed_at
        quiz.score_percent = score_percent
        quiz.correct_count = clean_correct
        quiz.answered_count = clean_answered
        quiz.attempts.append(
            StudyProjectQuizAttempt(
                quiz_id=quiz.id,
                score_percent=score_percent,
                correct_count=clean_correct,
                answered_count=clean_answered,
                completed_at=completed_at,
            )
        )
        await self.session.commit()
        return await self.get_project(user, project.id)

    def to_response(self, project: StudyProject) -> StudyProjectResponse:
        return StudyProjectResponse(
            id=project.id,
            name=project.name,
            subject_name=project.subject_name,
            institution_name=project.institution_name,
            slug=project.slug,
            status=project.status,
            material_rights_confirmed=project.material_rights_confirmed,
            error_message=project.error_message,
            created_at=project.created_at,
            updated_at=project.updated_at,
            is_archived=project.archive is not None,
            archived_at=project.archive.archived_at if project.archive else None,
            file_count=len(project.files),
            summary_count=1 if project.summary is not None else 0,
            keyword_count=len(project.keywords),
            flashcard_count=len(project.flashcards),
            quiz_count=len(project.quizzes),
            strategy_count=len(project.strategies),
            summary_highlight_count=len(project.summary_highlights),
            markdown_download_url=(
                f"/api/projects/{project.id}/markdown"
                if project.combined_markdown_path
                else None
            ),
            prompt_download_url=(
                f"/api/projects/{project.id}/prompt" if project.prompt_path else None
            ),
            files=project.files,
            summary=project.summary,
            keywords=project.keywords,
            flashcards=project.flashcards,
            quizzes=project.quizzes,
            strategies=project.strategies,
            summary_highlights=project.summary_highlights,
            summary_notes=project.summary_notes,
        )

    def download_path(self, project: StudyProject, kind: str) -> Path:
        path_value = (
            project.combined_markdown_path
            if kind == "markdown"
            else project.prompt_path
        )
        if not path_value:
            raise ProjectNotFoundError("Fisierul cerut nu exista.")

        path = Path(path_value)
        storage_root = self.settings.project_storage_dir.resolve()
        resolved_path = path.resolve()
        if storage_root not in resolved_path.parents:
            raise ProjectNotFoundError("Fisierul cerut nu exista.")
        if not resolved_path.exists():
            raise ProjectNotFoundError("Fisierul cerut nu exista.")
        return resolved_path

    def _project_query(self):
        return select(StudyProject).options(
            selectinload(StudyProject.files),
            selectinload(StudyProject.summary),
            selectinload(StudyProject.keywords),
            selectinload(StudyProject.flashcards),
            selectinload(StudyProject.quizzes)
            .selectinload(StudyProjectQuiz.questions)
            .selectinload(StudyProjectQuizQuestion.options),
            selectinload(StudyProject.quizzes).selectinload(StudyProjectQuiz.attempts),
            selectinload(StudyProject.strategies),
            selectinload(StudyProject.summary_highlights),
            selectinload(StudyProject.summary_notes),
            selectinload(StudyProject.archive),
        )

    def _project_dir(self, user_id: uuid.UUID, project_id: uuid.UUID) -> Path:
        return self.settings.project_storage_dir / str(user_id) / str(project_id)

    def _delete_project_storage(self, project_dir: Path) -> None:
        storage_root = self.settings.project_storage_dir.resolve()
        resolved_project_dir = project_dir.resolve()
        if (
            storage_root != resolved_project_dir
            and storage_root not in resolved_project_dir.parents
        ):
            logger.warning(
                "Skipped deleting project storage outside root: %s",
                resolved_project_dir,
            )
            return

        shutil.rmtree(resolved_project_dir, ignore_errors=True)

    async def _store_flashcard_front_image(
        self,
        *,
        user_id: uuid.UUID,
        project_id: uuid.UUID,
        flashcard_id: uuid.UUID,
        upload: UploadFile,
    ) -> str:
        safe_name = _safe_filename(upload.filename or "front-image")
        extension = Path(safe_name).suffix.lower()
        if extension not in ALLOWED_FLASHCARD_IMAGE_EXTENSIONS:
            raise ProjectValidationError(
                "Imaginea trebuie sa fie PNG, JPG, WEBP sau GIF."
            )
        if upload.content_type and not upload.content_type.startswith("image/"):
            raise ProjectValidationError("Fisierul incarcat nu pare sa fie imagine.")

        relative_path = Path("flashcard-images") / f"{flashcard_id}-front{extension}"
        image_path = self._project_dir(user_id, project_id) / relative_path
        temp_image_path = image_path.with_suffix(f"{image_path.suffix}.tmp")
        long_image_path = _long_path(image_path)
        long_temp_image_path = _long_path(temp_image_path)
        size_bytes = 0

        try:
            long_image_path.parent.mkdir(parents=True, exist_ok=True)
            with long_temp_image_path.open("wb") as destination:
                while chunk := await upload.read(1024 * 1024):
                    size_bytes += len(chunk)
                    if size_bytes > MAX_FLASHCARD_IMAGE_BYTES:
                        raise ProjectValidationError(
                            "Imaginea pentru flashcard nu poate depasi 5MB."
                        )
                    destination.write(chunk)
            long_temp_image_path.replace(long_image_path)
        except ProjectValidationError:
            long_temp_image_path.unlink(missing_ok=True)
            raise
        except OSError as exc:
            long_temp_image_path.unlink(missing_ok=True)
            logger.exception(
                "Could not store flashcard image %s at %s",
                safe_name,
                image_path,
            )
            detail = exc.strerror or str(exc)
            raise ProjectValidationError(
                f"Imaginea nu a putut fi salvata pe server: {detail}"
            ) from exc

        return relative_path.as_posix()

    async def _store_and_convert_file(
        self,
        *,
        project: StudyProject,
        upload: UploadFile,
        upload_index: int,
        source_dir: Path,
        markdown_dir: Path,
        max_upload_bytes: int,
    ) -> StudyProjectFile:
        safe_name = _safe_filename(upload.filename or f"material-{upload_index + 1}")
        _validate_upload_extension(safe_name)

        extension = Path(safe_name).suffix.lower()
        storage_stem = f"{upload_index + 1:02d}-{uuid.uuid4().hex[:16]}"
        source_path = source_dir / f"{storage_stem}{extension}"
        temp_source_path = source_dir / f"u-{uuid.uuid4().hex[:16]}.tmp"
        size_bytes = 0
        try:
            source_path.parent.mkdir(parents=True, exist_ok=True)
            markdown_dir.mkdir(parents=True, exist_ok=True)
            with temp_source_path.open("wb") as destination:
                while chunk := await upload.read(1024 * 1024):
                    size_bytes += len(chunk)
                    if size_bytes > max_upload_bytes:
                        raise ProjectValidationError(
                            f"Fisierul {safe_name} depaseste limita de "
                            f"{self.settings.project_upload_max_mb}MB."
                        )
                    destination.write(chunk)
            temp_source_path.replace(source_path)
        except ProjectValidationError:
            temp_source_path.unlink(missing_ok=True)
            raise
        except OSError as exc:
            temp_source_path.unlink(missing_ok=True)
            logger.exception(
                "Could not store uploaded file %s at %s",
                safe_name,
                source_path,
            )
            detail = exc.strerror or str(exc)
            raise ProjectConversionError(
                f"Fisierul incarcat nu a putut fi salvat pe server: {detail}"
            ) from exc

        file_model = StudyProjectFile(
            project_id=project.id,
            original_filename=safe_name,
            content_type=upload.content_type,
            size_bytes=size_bytes,
            source_path=str(source_path),
            conversion_status="processing",
        )
        self.session.add(file_model)
        await self.session.flush()

        markdown_path = markdown_dir / f"{source_path.stem}.md"
        try:
            markdown = await run_in_threadpool(_read_markdown, source_path)
        except (Exception, UnsupportedFormatException) as exc:  # noqa: BLE001
            file_model.conversion_status = "failed"
            file_model.conversion_error = str(exc)[:1000]
            if isinstance(exc, LegacyOfficeFormatError):
                raise ProjectValidationError(str(exc)) from exc
            if isinstance(exc, UnsupportedFormatException):
                raise ProjectConversionError(
                    f"Fisierul {safe_name} nu este suportat de converter. "
                    "Incearca PDF, DOCX, PPTX, XLSX, TXT sau Markdown."
                ) from exc
            raise ProjectConversionError(
                f"Fisierul {safe_name} nu a putut fi convertit."
            ) from exc

        markdown_path.write_text(markdown, encoding="utf-8")
        file_model.markdown_path = str(markdown_path)
        file_model.markdown_char_count = len(markdown)
        file_model.conversion_status = "converted"
        return file_model

    async def _read_json_upload(self, upload: UploadFile) -> dict[str, Any]:
        filename = upload.filename or "ai-output.json"
        if Path(filename).suffix.lower() != ".json":
            raise ProjectValidationError("Incarca un fisier JSON valid.")

        content = await upload.read(MAX_JSON_IMPORT_BYTES + 1)
        if len(content) > MAX_JSON_IMPORT_BYTES:
            raise ProjectValidationError("Fisierul JSON este prea mare.")

        try:
            payload = json.loads(content.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ProjectValidationError("Fisierul JSON nu este valid.") from exc
        if not isinstance(payload, dict):
            raise ProjectValidationError("JSON-ul trebuie sa contina un obiect.")
        return payload

    async def _clear_generated_content(self, project: StudyProject) -> None:
        if project.summary is not None:
            await self.session.delete(project.summary)
        for collection in (project.keywords, project.quizzes, project.strategies):
            for item in list(collection):
                await self.session.delete(item)
            collection.clear()
        for flashcard in list(project.flashcards):
            if flashcard.source_type == "generated":
                await self.session.delete(flashcard)
                project.flashcards.remove(flashcard)
        await self.session.flush()

    def _apply_generated_payload(
        self,
        project: StudyProject,
        payload: dict[str, Any],
    ) -> None:
        summary_value = payload.get("summary") or payload.get("rezumat")
        summary_content = ""
        reading_minutes: int | None = None
        if isinstance(summary_value, dict):
            summary_content = _string_or_default(
                summary_value.get("content") or summary_value.get("text")
            )
            minutes_value = summary_value.get("estimated_reading_minutes")
            if isinstance(minutes_value, int) and minutes_value > 0:
                reading_minutes = minutes_value
        else:
            summary_content = _string_or_default(summary_value)
        if summary_content:
            project.summary = StudyProjectSummary(
                content=summary_content,
                estimated_reading_minutes=reading_minutes,
            )

        for index, item in enumerate(
            _list_value(payload.get("keywords") or payload.get("cuvinte_cheie"))
        ):
            item_dict = _dict_value(item)
            term = _string_or_default(item_dict.get("term") or item_dict.get("word"))
            explanation = _string_or_default(
                item_dict.get("explanation") or item_dict.get("definition")
            )
            if not term or not explanation:
                continue
            project.keywords.append(
                StudyProjectKeyword(
                    term=term[:180],
                    explanation=explanation,
                    anchor_text=_string_or_default(item_dict.get("anchor_text"))[:240]
                    or None,
                    sort_order=index,
                )
            )

        for index, item in enumerate(_list_value(payload.get("flashcards"))):
            item_dict = _dict_value(item)
            front = _string_or_default(
                item_dict.get("front")
                or item_dict.get("question")
                or item_dict.get("intrebare")
            )
            back = _string_or_default(
                item_dict.get("back")
                or item_dict.get("answer")
                or item_dict.get("raspuns")
            )
            if not front or not back:
                continue
            project.flashcards.append(
                StudyProjectFlashcard(
                    front=front,
                    back=back,
                    category=(
                        _string_or_default(item_dict.get("category"))[:120] or None
                    ),
                    difficulty=_string_or_default(item_dict.get("difficulty"))[:40]
                    or None,
                    source_type="generated",
                    sort_order=index,
                )
            )

        for index, item in enumerate(_list_value(payload.get("strategies"))):
            item_dict = _dict_value(item)
            title = _string_or_default(item_dict.get("title"))
            description = _string_or_default(item_dict.get("description"))
            if not title or not description:
                continue
            project.strategies.append(
                StudyProjectStrategy(
                    title=title[:180],
                    description=description,
                    sort_order=index,
                )
            )

        for quiz_index, item in enumerate(
            _list_value(payload.get("quizzes") or payload.get("quizuri"))
        ):
            item_dict = _dict_value(item)
            quiz = StudyProjectQuiz(
                title=_string_or_default(item_dict.get("title"), "Quiz")[:180],
                description=_string_or_default(item_dict.get("description")) or None,
                complexity=_string_or_default(item_dict.get("complexity"))[:60] or None,
                question_type=_string_or_default(item_dict.get("question_type"))[:60]
                or None,
                sort_order=quiz_index,
            )
            for question_index, question_item in enumerate(
                _list_value(item_dict.get("questions") or item_dict.get("intrebari"))
            ):
                question_dict = _dict_value(question_item)
                prompt = _string_or_default(
                    question_dict.get("prompt")
                    or question_dict.get("question")
                    or question_dict.get("intrebare")
                )
                if not prompt:
                    continue
                question = StudyProjectQuizQuestion(
                    prompt=prompt,
                    question_type=_string_or_default(
                        question_dict.get("type") or question_dict.get("question_type"),
                        "single_choice",
                    )[:60],
                    explanation=_string_or_default(question_dict.get("explanation"))
                    or None,
                    sort_order=question_index,
                )
                for option_index, option_item in enumerate(
                    _list_value(question_dict.get("options"))
                ):
                    option_dict = _dict_value(option_item)
                    label = _string_or_default(
                        option_dict.get("label") or option_dict.get("text")
                    )
                    if not label:
                        continue
                    question.options.append(
                        StudyProjectQuizOption(
                            label=label,
                            is_correct=bool(option_dict.get("is_correct")),
                            sort_order=option_index,
                        )
                    )
                quiz.questions.append(question)
            project.quizzes.append(quiz)

    def _build_prompt(
        self,
        *,
        project_name: str,
        subject_name: str,
        institution_name: str,
        markdown: str,
    ) -> str:
        return f"""Ești motorul educațional al platformei Revizzio.
Misiunea ta este să transformi materialul de curs furnizat într-un singur obiect JSON, gata de import într-o aplicație de învățare.

REGULI ABSOLUTE DE IEȘIRE:
- Răspunde exclusiv cu JSON valid, fără text înainte sau după obiect.
- Nu folosi blocuri markdown, comentarii, explicații externe sau delimitatori de tip ```json.
- Folosește exact cheile și structura definite în contractul JSON.
- Toate valorile destinate utilizatorului trebuie scrise în limba română, cu diacritice.
- Valorile enum trebuie să rămână exact în engleză, conform contractului: "low", "medium", "high", "single_choice", "multiple_choice".
- Nu introduce chei suplimentare.
- Nu folosi valori null. Folosește liste goale numai când materialul nu permite în mod real generarea unor itemi valizi.
- Nu include nicio informație care nu este susținută de material.
- Nu inventa exemple, contexte, date, nume, citate, formule, valori, unități, evenimente, cauze sau consecințe.
- Dacă materialul este insuficient, generează mai puțini itemi. Calitatea și corectitudinea au prioritate față de cantitate.

PROIECT:
{project_name}

CONTEXT ACADEMIC:
- Materie: {subject_name}
- Facultate/Școală/Nivel: {institution_name}

Folosește acest context numai pentru nivelul de limbaj, profunzimea explicațiilor și dificultatea evaluării. Nu presupune cerințe instituționale, convenții sau cunoștințe care nu apar în material.

OBIECTIV PEDAGOGIC:
Generează un pachet de studiu care ajută utilizatorul să:
1. înțeleagă ideile principale și relațiile dintre ele;
2. rețină conceptele prin flashcard-uri;
3. se testeze prin quiz-uri corecte și neambigue;
4. identifice termenii esențiali;
5. aplice strategii concrete de învățare adaptate materialului.

CONTRACT JSON OBLIGATORIU:
{{
  "schema_version": "revizzio.manual.v1",
  "summary": {{
    "content": "string",
    "estimated_reading_minutes": 1
  }},
  "keywords": [
    {{
      "term": "string",
      "explanation": "string",
      "anchor_text": "string"
    }}
  ],
  "flashcards": [
    {{
      "front": "string",
      "back": "string",
      "category": "string",
      "difficulty": "low"
    }}
  ],
  "quizzes": [
    {{
      "title": "string",
      "description": "string",
      "complexity": "low",
      "question_type": "single_choice",
      "questions": [
        {{
          "prompt": "string",
          "type": "single_choice",
          "options": [
            {{ "label": "string", "is_correct": true }},
            {{ "label": "string", "is_correct": false }}
          ],
          "explanation": "string"
        }}
      ]
    }}
  ],
  "strategies": [
    {{
      "title": "string",
      "description": "string"
    }}
  ]
}}

PROCES INTERN OBLIGATORIU:
Execută intern următoarele etape înainte de a redacta obiectul final. Nu afișa etapele și nu adăuga rezultatele lor ca metadate în JSON.

ETAPA 1 — ANALIZA SURSEI:
- Identifică structura materialului: capitole, secțiuni, teme, concepte centrale și obiective explicite.
- Separă conținutul textual clar de titluri izolate, imagini fără explicație, fragmente incomplete și pasaje ambigue.
- Identifică eventualele contradicții interne. Nu genera itemi din informații contradictorii dacă materialul nu le clarifică.

ETAPA 2 — BANCA DE AFIRMAȚII ATOMICE:
Construiește intern o bancă de afirmații verificabile. O afirmație atomică trebuie să:
- exprime un singur fapt, principiu, mecanism, raport, criteriu, etapă, regulă sau relație;
- poată fi localizată direct într-un pasaj, slide, pagină, tabel sau secțiune;
- păstreze exact condițiile, excepțiile, valorile și unitățile din sursă;
- nu combine informații fără legătură;
- nu conțină completări din cunoștințe externe.

ETAPA 3 — PLANUL DE ACOPERIRE:
- Distribuie conținutul proporțional cu importanța, densitatea și întinderea secțiunilor.
- Nu concentra majoritatea itemilor în primele pagini sau slide-uri.
- Nu supraevalua o secțiune scurtă doar pentru că este ușor de transformat în întrebări.
- Asigură focus distinct pentru fiecare quiz.

ETAPA 4 — GENERAREA ȘI VERIFICAREA:
Pentru fiecare întrebare verifică intern:
1. afirmația sau combinația exactă de afirmații testate;
2. locul din material care susține răspunsul;
3. dacă răspunsul corect este complet și incontestabil susținut;
4. dacă fiecare distractor este clar greșit în contextul întrebării;
5. dacă o interpretare rezonabilă ar putea face corect un distractor;
6. dacă explicația adaugă informații din afara materialului;
7. dacă dificultatea declarată corespunde operațiilor mentale necesare.
Dacă un item nu trece toate verificările, elimină-l și generează altul.

REGULI PENTRU SUMMARY:
- Scrie un rezumat coerent și complet, nu o colecție de propoziții izolate.
- Păstrează ordinea logică a materialului, nu neapărat ordinea fiecărui slide dacă aceasta este fragmentată.
- Explică definițiile, clasificările, etapele, comparațiile și relațiile cauză–efect numai atunci când sunt susținute explicit.
- Diferențiază clar între fapt, ipoteză, interpretare, exemplu și opinie, dacă materialul face această distincție.
- Nu transforma o asociere în cauzalitate și nu generaliza un caz particular într-o regulă universală.
- Reformulează; nu copia pasaje lungi.
- Poți folosi paragrafe și liste scurte în interiorul stringului "content".
- "estimated_reading_minutes" trebuie să fie un număr întreg realist pentru citirea rezumatului, minimum 1.

REGULI PENTRU KEYWORDS:
- Generează între 8 și 20 de termeni, în funcție de densitatea materialului.
- Alege concepte importante și căutabile, nu titluri administrative sau cuvinte generice.
- "term" trebuie să fie scurt și specific.
- "explanation" trebuie să explice termenul în 1-3 fraze, exclusiv pe baza materialului.
- "anchor_text" trebuie să fie un fragment scurt care apare identic în "summary.content".
- Fiecare "anchor_text" trebuie să identifice clar o singură zonă relevantă din rezumat.
- Nu dubla termeni sinonimi decât dacă materialul îi tratează distinct.

REGULI PENTRU FLASHCARDS:
- Generează între 12 și 40 de flashcard-uri numai dacă materialul permite varietate reală.
- Fiecare flashcard trebuie să testeze un singur obiectiv.
- "front" trebuie să fie o întrebare clară și autosuficientă.
- "back" trebuie să fie scurt, complet și verificabil în material.
- "category" trebuie să fie o etichetă tematică stabilă și utilă, derivată din structura materialului.
- "difficulty" poate fi numai "low", "medium" sau "high".
- "low": recunoaștere, definiție, identificare, fapt explicit.
- "medium": comparație, relație, clasificare sau aplicare directă.
- "high": integrarea a minimum două idei sau deducție susținută explicit de material.
- Evită întrebările vagi, răspunsurile de tip „depinde” și formulările care solicită enumerări foarte lungi.
- Nu transforma fiecare propoziție din rezumat într-un flashcard.

REGULI GENERALE PENTRU QUIZ-URI:
- Creează quiz-uri ca pentru o aplicație reală de evaluare, nu ca o listă superficială.
- Creează ideal 9 quiz-uri numai dacă materialul oferă suficiente afirmații distincte și verificabile:
  1. trei quiz-uri "low" pentru recapitulare;
  2. trei quiz-uri "medium" pentru înțelegere și aplicare;
  3. trei quiz-uri "high" pentru analiză și pregătire de examen.
- Pentru materiale mai scurte, creează minimum 3 quiz-uri: unul "low", unul "medium" și unul "high".
- Nu forța un quiz "high" dacă materialul nu permite raționament în minimum doi pași; generează mai puține quiz-uri, dar păstrează cele trei niveluri atunci când există suport suficient.
- Fiecare quiz trebuie să aibă între 8 și 14 întrebări numai dacă materialul permite. În caz contrar, poate avea mai puține, dar niciodată întrebări de umplutură.
- Fiecare quiz trebuie să aibă un focus distinct: concepte fundamentale, comparații, procese, clasificări, aplicarea regulilor, interpretarea datelor, relații cauzale, sinteză sau erori frecvente susținute de material.
- "question_type" indică tipul predominant din quiz și trebuie să fie "single_choice" sau "multiple_choice".
- Fiecare întrebare își declară separat tipul în câmpul "type".

REGULI PENTRU ÎNTREBĂRI:
- "prompt" trebuie să fie concret, autosuficient și evaluabil.
- Precizează criteriul cerut: afirmația corectă, asocierea corectă, ordinea corectă, consecința susținută, opțiunile care se aplică etc.
- Pentru "multiple_choice", indică explicit în prompt că pot exista mai multe răspunsuri corecte.
- Evită întrebările construite prin copiere literală a unei propoziții.
- Evită formulările negative de tip „care NU este” când poți formula pozitiv. Dacă o negație este necesară, evidențiază clar cuvântul „NU” în text.
- Nu folosi „toate variantele de mai sus” sau „niciuna dintre variante”.
- Nu folosi capcane bazate pe gramatică, lungimea opțiunii sau detalii nerelevante.
- Nu solicita cunoștințe din afara materialului.
- Nu introduce situații, date sau condiții inventate doar pentru a face întrebarea să pară aplicată.

DEFINIREA DIFICULTĂȚII QUIZ-URILOR:
- "low": testează o singură afirmație explicită prin recunoaștere, identificare, clasificare de bază sau asociere directă.
- "medium": necesită cel puțin o comparație, aplicare, clasificare, ordonare sau deducție directă din informațiile furnizate.
- "high": integrează minimum două afirmații distincte și necesită minimum doi pași de raționament. Toate informațiile necesare trebuie să fie în material și, când este necesar, în scenariul întrebării.
- Lungimea întrebării nu determină dificultatea.
- Nu clasifica drept "high" o definiție, o dată, un nume, o formulă reprodusă, o enumerare memorată sau o singură asociere directă.

REGULI PENTRU SCENARII ȘI APLICAȚII:
- Construiește scenarii numai când materialul oferă suficiente elemente pentru o concluzie unică.
- Folosește exclusiv concepte, condiții, valori, exemple, procese și relații prezente în material.
- Nu adăuga personaje, simptome, date, rezultate, ipoteze, condiții sau consecințe care schimbă problema și nu apar în sursă.
- Scenariul trebuie să testeze aplicarea cunoștinței, nu ghicirea intenției autorului.
- Dacă materialul nu permite diferențierea sigură între variante, nu genera scenariul.

REGULI PENTRU DOMENII CU CALCULE, FORMULE SAU DATE:
Aplică aceste reguli numai dacă materialul conține astfel de elemente:
- Folosește numai formulele, metodele, constantele și convențiile prezentate.
- Păstrează unitățile și verifică compatibilitatea dimensională când este relevantă.
- Verifică intern fiecare calcul și fiecare rezultat intermediar.
- Nu inventa valori și nu presupune reguli de rotunjire.
- Asigură-te că datele sunt suficiente și că exact opțiunile marcate corect corespund rezultatului.
- Distractorii pot reflecta erori realiste de formulă, semn, unitate, ordine a operațiilor sau etapă omisă, dar trebuie să rămână neechivoc greșiți.

REGULI PENTRU DOMENII INTERPRETATIVE:
Aplică aceste reguli când materialul conține teorii, texte, argumente, evenimente, perspective sau interpretări:
- Atribuie corect ideile autorului, curentului, perioadei sau teoriei.
- Nu prezenta o interpretare drept fapt universal dacă materialul nu o face.
- Nu inventa citate și nu atribui idei fără suport.
- Pentru întrebările de analiză, precizează criteriul pe baza căruia se alege răspunsul.
- Nu folosi drept distractori interpretări alternative care sunt compatibile cu materialul.

REGULI PENTRU OPȚIUNI:
Pentru "single_choice":
- exact 4 opțiuni;
- exact 1 opțiune cu "is_correct": true;
- răspunsul corect trebuie să fie complet corect, nu doar mai bun decât celelalte.

Pentru "multiple_choice":
- între 4 și 6 opțiuni;
- minimum 2 opțiuni corecte;
- minimum 1 opțiune greșită;
- fiecare opțiune trebuie să poată fi evaluată independent.

Pentru toate opțiunile:
- Distractorii trebuie să fie plauzibili, dar clar greșiți conform materialului.
- Un distractor nu poate fi doar „nemenționat”; trebuie să fie incompatibil cu relația sau criteriul testat.
- Opțiunile trebuie să aparțină aceleiași categorii conceptuale și să aibă lungimi relativ apropiate.
- Nu folosi sinonime ale răspunsului corect, variante parțial adevărate, opțiuni suprapuse sau două formulări ale aceleiași idei.
- Nu combina într-o opțiune două afirmații dacă una poate fi adevărată și cealaltă falsă.
- Nu face răspunsul corect evident prin precizie, vocabular, lungime sau formulare.

REGULA DISTRIBUIRII RĂSPUNSURILOR:
- Calculează distribuția A/B/C/D numai pentru întrebările "single_choice".
- În fiecare quiz, diferența dintre cea mai frecventă și cea mai rară poziție corectă nu trebuie să depășească 1, atunci când numărul de întrebări single-choice permite folosirea tuturor pozițiilor.
- Pentru exact 8 întrebări single-choice, fiecare poziție A, B, C și D trebuie să fie corectă exact de 2 ori.
- La nivelul întregului pachet, distribuția pozițiilor corecte trebuie să fie cât mai echilibrată, fără secvențe sau tipare ușor detectabile.
- Pentru "multiple_choice", variază numărul și pozițiile opțiunilor corecte. Nu repeta aceeași combinație în mod previzibil.
- După reordonarea opțiunilor, verifică din nou corectitudinea marcajelor și a explicației.

REGULA EXPLICAȚIILOR:
- Fiecare întrebare trebuie să aibă o explicație pedagogică și autosuficientă.
- Pentru "single_choice", explică de ce varianta corectă este corectă și de ce fiecare distractor nu îndeplinește criteriul întrebării.
- Pentru "multiple_choice", explică separat de ce fiecare opțiune corectă trebuie selectată și fiecare opțiune greșită trebuie exclusă.
- Pentru întrebările "high", prezintă succint pașii de raționament.
- Explicația nu trebuie să introducă informații, exemple sau concluzii care nu apar în material.
- Nu folosi explicații circulare precum „este corect deoarece aceasta este varianta corectă” sau „conform textului”.

REGULA ANTI-REPETIȚIE:
- Nu testa aceeași afirmație atomică în mai mult de două întrebări din întregul pachet.
- Nu reformula aceeași întrebare schimbând doar ordinea cuvintelor sau opțiunilor.
- Nu crea întrebări "high" care sunt versiuni mai lungi ale unor întrebări "low".
- Nu repeta aceeași asociere simplă în quiz-uri diferite.
- Nu folosi aceleași seturi de opțiuni în mai multe întrebări.

REGULI PENTRU STRATEGIES:
- Generează între 3 și 6 strategii concrete, adaptate structurii și tipului de conținut.
- Fiecare strategie trebuie să descrie o acțiune aplicabilă direct: comparație tabelară, reconstrucția unui proces, repetare spațiată, recuperare activă, clasificare, rezolvare de probleme, cronologie, hartă conceptuală sau altă metodă potrivită sursei.
- Menționează explicit ce părți ale materialului trebuie folosite și cum.
- Evită sfaturi generice precum „învață mai mult”, „citește atent” sau „repetă materia”.

AUDIT FINAL OBLIGATORIU:
Înainte de răspuns, verifică întregul obiect și regenerează orice item invalid.

Audit structural:
- JSON-ul poate fi parsată cu JSON.parse;
- nu există trailing commas;
- toate cheile și stringurile folosesc ghilimele duble;
- nu există text în afara obiectului;
- schema_version este exact "revizzio.manual.v1";
- toate valorile enum sunt valide;
- fiecare quiz are întrebări;
- fiecare întrebare are prompt, type, options și explanation;
- fiecare "single_choice" are exact 4 opțiuni și exact un răspuns corect;
- fiecare "multiple_choice" are 4-6 opțiuni, minimum două corecte și minimum una greșită.

Audit factual și pedagogic:
- fiecare afirmație este susținută de material;
- fiecare răspuns corect este complet și neechivoc;
- fiecare distractor este clar greșit în context;
- nu există informații externe, generalizări nepermise sau cauzalități inventate;
- explicația corespunde exact întrebării și tuturor opțiunilor;
- dificultatea declarată corespunde raționamentului necesar;
- quiz-urile au focus distinct și acoperire echilibrată;
- nu există duplicate conceptuale sau tipare evidente ale răspunsurilor;
- valorile, unitățile, formulele, ordinea etapelor și calculele sunt corecte, dacă apar.

Dacă un item nu trece auditul, nu îl păstra. Înlocuiește-l cu un item bazat pe altă informație bine susținută.

MATERIAL MARKDOWN DE PROCESAT:
{markdown}
"""
