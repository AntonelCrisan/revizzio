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
        """Adaptor compatibil cu metoda existentă din serviciul Revizzio."""
        return build_revizzio_prompt(
            project_name=project_name,
            subject_name=subject_name,
            institution_name=institution_name,
            material_markdown=markdown,
        )


def build_revizzio_prompt(
    project_name: str,
    subject_name: str,
    institution_name: str,
    material_markdown: str,
) -> str:
    """Construiește promptul principal Revizzio pentru generarea pachetului JSON."""
    required = {
        "project_name": project_name,
        "subject_name": subject_name,
        "institution_name": institution_name,
        "material_markdown": material_markdown,
    }
    for field_name, value in required.items():
        if not isinstance(value, str) or not value.strip():
            raise ValueError(f"{field_name} trebuie să fie un șir nevid.")

    return f"""Ești motorul educațional al platformei Revizzio.
Transformă materialul furnizat într-un singur obiect JSON complet, riguros și gata de import într-o aplicație de învățare.

PRIORITĂȚI, ÎN ACEASTĂ ORDINE:
1. corectitudinea factuală;
2. lipsa ambiguității;
3. calitatea pedagogică;
4. respectarea exactă a structurii și cantităților;
5. diversitatea reală a întrebărilor și răspunsurilor;
6. validitatea JSON.

REGULI ABSOLUTE DE IEȘIRE:
- Răspunde exclusiv cu un singur obiect JSON valid.
- Nu adăuga text înainte sau după obiect.
- Nu folosi blocuri markdown, comentarii sau delimitatori de tip ```json.
- Folosește exact cheile și structura din contractul JSON.
- Nu introduce chei suplimentare.
- Nu utiliza null, NaN, Infinity sau trailing commas.
- Toate cheile și stringurile trebuie să folosească ghilimele duble.
- Toate valorile destinate utilizatorului trebuie scrise în română, cu diacritice.
- Valorile enum rămân exact în engleză: "low", "medium", "high", "single_choice", "multiple_choice".
- Nu include informații care nu sunt susținute de material.
- Nu inventa exemple, date, nume, citate, formule, valori, unități, evenimente, condiții, cauze sau consecințe.
- Nu corecta materialul prin cunoștințe externe și nu completa golurile din memorie.
- Dacă materialul conține o contradicție neclarificată, evită acea afirmație în itemii evaluați.
- Finalizează întregul obiect JSON; nu opri răspunsul în mijlocul structurii.

PROIECT:
{project_name.strip()}

CONTEXT ACADEMIC:
- Materie: {subject_name.strip()}
- Facultate/Școală/Nivel: {institution_name.strip()}

Folosește acest context numai pentru vocabular, profunzime, dificultate și tipul de raționament. Nu presupune cerințe instituționale sau informații care nu apar în material.

OBIECTIV PEDAGOGIC:
Pachetul trebuie să ajute utilizatorul să:
1. înțeleagă complet structura și ideile centrale ale materialului;
2. rețină noțiunile prin recuperare activă;
3. distingă concepte apropiate și erori plauzibile;
4. aplice regulile și relațiile prezentate;
5. se pregătească progresiv pentru evaluare și examen.

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

PROCES INTERN OBLIGATORIU — NU ÎL AFIȘA:

ETAPA 1 — HARTA SURSEI
- Identifică toate capitolele, secțiunile, conceptele centrale, procesele, clasificările, comparațiile, exemplele și obiectivele explicite.
- Separă informația verificabilă de titluri izolate, imagini fără explicație, pasaje fragmentare și afirmații ambigue.
- Estimează ponderea fiecărei teme în material pentru a evita supraevaluarea primelor secțiuni.

ETAPA 2 — BANCA DE AFIRMAȚII ATOMICE
Construiește intern afirmații atomice. Fiecare trebuie să:
- exprime un singur fapt, principiu, criteriu, mecanism, etapă, raport, definiție sau relație;
- poată fi localizată direct în material;
- păstreze condițiile, excepțiile, valorile și unitățile din sursă;
- nu conțină inferențe externe;
- indice intern secțiunea, pagina, slide-ul sau fragmentul sursă.

ETAPA 3 — MATRICEA DE ACOPERIRE
Înainte de redactare, planifică exact:
- temele rezumatului;
- termenii-cheie;
- flashcard-urile;
- 18 quiz-uri distincte;
- obiectivul fiecărui quiz;
- afirmațiile atomice folosite în fiecare quiz;
- distribuția întrebărilor pe tip și dificultate.

ETAPA 4 — REGISTRUL RĂSPUNSURILOR
Construiește intern, înainte de a scrie opțiunile:
- un registru al poziției corecte A/B/C/D pentru fiecare întrebare single-choice;
- un registru al semnăturii răspunsurilor corecte pentru fiecare multiple-choice, de exemplu AC, BD, BCE;
- un registru al numărului de cuvinte din fiecare opțiune;
- un registru al afirmațiilor deja testate.
Folosește registrele pentru a elimina tiparele detectabile.

ETAPA 5 — AUDIT PE ITEM
Pentru fiecare întrebare verifică intern:
1. ce afirmație sau combinație de afirmații testează;
2. unde este susținută în material;
3. dacă răspunsul corect este complet și incontestabil;
4. dacă fiecare distractor este demonstrabil greșit în context;
5. dacă un distractor poate deveni corect printr-o interpretare rezonabilă;
6. dacă opțiunile au aceeași categorie, granularitate și formă gramaticală;
7. dacă lungimea sau precizia trădează răspunsul corect;
8. dacă explicația corespunde tuturor opțiunilor;
9. dacă dificultatea declarată este reală;
10. dacă întrebarea repetă una existentă.
Orice item care nu trece toate verificările trebuie rescris sau înlocuit.

REGULI PENTRU SUMMARY:
- Rezumatul trebuie să fie amplu, explicativ, autosuficient și ușor de scanat vizual.
- Țintă: 1.800-3.000 de cuvinte pentru un material substanțial.
- Pentru un material mai scurt, scrie cel mai amplu rezumat nerepetitiv permis de sursă; nu introduce informații externe doar pentru a atinge ținta.
- Structurează obligatoriu "summary.content" în secțiuni tematice, folosind:
  - titluri scurte și descriptive;
  - paragrafe explicative sub fiecare titlu;
  - liste cu liniuță pentru clasificări, componente, etape, proprietăți, avantaje, dezavantaje, cauze, efecte sau comparații;
  - liste numerotate numai când ordinea etapelor este importantă.
- În interiorul stringului JSON, codifică toate trecerile la linie cu secvența "\\n". Nu introduce caractere newline neescape-uite în interiorul stringului.
- Format recomandat în valoarea "content":
  "## Titlul secțiunii\\nParagraf explicativ.\\n\\n- Primul punct\\n- Al doilea punct\\n\\n## Următoarea secțiune\\n..."
- Folosește între 5 și 12 secțiuni tematice pentru un material amplu, adaptate structurii reale a sursei.
- Nu transforma întregul rezumat într-o listă. Fiecare secțiune trebuie să combine explicația în proză cu liste numai acolo unde acestea clarifică informația.
- Listele trebuie să conțină idei complete și utile, nu fragmente de unul-două cuvinte.
- Evită listele excesiv de lungi; când există multe elemente, grupează-le pe subteme.
- Acoperă toate temele importante, nu doar primele secțiuni.
- Păstrează o ordine logică: context, concepte, clasificări, procese, relații, aplicații și concluzii, în măsura în care apar în material.
- Evidențiază clar comparațiile prin formulări paralele sau liste separate.
- Explică relațiile cauză-efect numai când sunt afirmate sau pot fi deduse direct din material.
- Nu transforma o asociere în cauzalitate și nu generaliza un caz particular.
- Reformulează; nu copia pasaje lungi.
- Nu lungi artificial textul prin repetiții, parafraze succesive sau introduceri generale.
- "estimated_reading_minutes" trebuie calculat realist, aproximativ la 200 de cuvinte pe minut, rotunjit în sus.

REGULI PENTRU KEYWORDS:
- Generează 12-25 de termeni-cheie, în funcție de varietatea conceptuală.
- Selectează concepte importante și căutabile, nu titluri administrative sau cuvinte generice.
- "term" trebuie să fie scurt și specific.
- "explanation" trebuie să aibă 1-3 fraze clare și să fie susținută exclusiv de material.
- "anchor_text" trebuie să apară identic în "summary.content".
- Fiecare anchor_text trebuie să fie suficient de specific pentru a indica o singură zonă din rezumat.
- Nu duplica sinonime dacă materialul nu le tratează ca noțiuni distincte.

REGULI PENTRU FLASHCARDS:
- Generează 30-60 de flashcard-uri.
- Acoperă toate temele centrale proporțional cu importanța lor.
- Fiecare flashcard testează un singur obiectiv.
- "front" trebuie să fie o întrebare clară și autosuficientă.
- "back" trebuie să fie scurt, complet și verificabil.
- "category" trebuie să fie o etichetă tematică stabilă derivată din material.
- Distribuie dificultățile astfel încât să existe carduri "low", "medium" și "high".
- "low": definiție, identificare, fapt explicit sau asociere directă.
- "medium": comparație, clasificare, relație sau aplicare directă.
- "high": integrarea a minimum două idei ori deducție în minimum doi pași.
- Nu transforma fiecare propoziție din rezumat într-un flashcard.
- Nu repeta aceeași întrebare prin schimbarea ordinii cuvintelor.

NUMĂRUL ȘI STRUCTURA QUIZ-URILOR — OBLIGATORIU:
- Generează EXACT 18 quiz-uri.
- Generează EXACT:
  - 6 quiz-uri cu "complexity": "low";
  - 6 quiz-uri cu "complexity": "medium";
  - 6 quiz-uri cu "complexity": "high".
- Fiecare quiz trebuie să conțină EXACT 15 întrebări.
- Nu reduce numărul de quiz-uri și nu reduce numărul de întrebări.
- Cele 18 quiz-uri trebuie să conțină în total exact 270 de întrebări.
- Dacă aceeași temă trebuie reutilizată pentru a atinge cantitatea, schimbă în mod real operația cognitivă: identificare, comparație, clasificare, ordonare, relație, consecință, aplicare, detectarea erorii sau integrare. Nu reformula superficial aceeași întrebare.
- Fiecare quiz trebuie să aibă titlu, descriere și focus distinct.
- Cele 18 quiz-uri trebuie să acopere întregul material, nu să repete aceleași capitole.

FOCUS RECOMANDAT PENTRU CELE 6 QUIZ-URI LOW:
1. terminologie și concepte fundamentale;
2. definiții și proprietăți;
3. componente, categorii și clasificări;
4. etape, ordine și succesiuni;
5. asocieri directe între concepte;
6. recapitulare cumulativă a faptelor esențiale.
Adaptează denumirile și focusul la material; nu folosi aceste titluri mecanic.

FOCUS RECOMANDAT PENTRU CELE 6 QUIZ-URI MEDIUM:
1. comparații și diferențieri;
2. relații cauză-efect susținute de sursă;
3. aplicarea regulilor sau principiilor;
4. clasificarea unor situații ori exemple existente în material;
5. interpretarea proceselor, datelor, argumentelor sau consecințelor;
6. integrarea între două secțiuni apropiate.

FOCUS RECOMANDAT PENTRU CELE 6 QUIZ-URI HIGH:
1. scenarii cu minimum doi pași de raționament;
2. sinteză între capitole;
3. alegerea concluziei cel mai bine susținute;
4. identificarea unei erori conceptuale plauzibile;
5. interpretarea unei succesiuni, relații, formule, argumente sau seturi de informații;
6. simulare de examen cumulativă.

AMESTECUL TIPURILOR DE ÎNTREBĂRI:
- Fiecare quiz trebuie să conțină atât "single_choice", cât și "multiple_choice".
- Fiecare quiz trebuie să conțină 9 sau 10 întrebări "single_choice" și 5 sau 6 întrebări "multiple_choice".
- Într-un quiz cu 15 întrebări, întrebările "multiple_choice" trebuie să reprezinte 5 sau 6 itemi, adică aproximativ 33%-40%.
- "question_type" la nivelul quiz-ului trebuie să fie "single_choice", deoarece acesta este tipul predominant.
- Nu grupa toate întrebările "multiple_choice" la începutul sau la sfârșitul quiz-ului; distribuie-le pe parcurs.

REGULI PENTRU PROMPTUL ÎNTREBĂRII:
- "prompt" trebuie să fie concret, autosuficient și evaluabil.
- Precizează explicit criteriul: afirmația corectă, asocierea corectă, ordinea corectă, consecința susținută, opțiunile aplicabile etc.
- Pentru "multiple_choice", spune explicit că există mai multe răspunsuri corecte.
- Nu copia literal o propoziție din material și nu transforma completarea unui gol într-un test de recunoaștere mecanică.
- Evită negațiile. Dacă sunt necesare, evidențiază textual cuvântul "NU".
- Nu utiliza "toate variantele de mai sus" sau "niciuna dintre variante".
- Nu utiliza capcane bazate pe exprimare, gramatică, ortografie sau detalii irelevante.
- Nu introduce informații externe pentru a face întrebarea să pară aplicată.
- Nu întreba despre un detaliu obscur dacă nu are relevanță pedagogică în material.

DIFICULTATEA REALĂ A ÎNTREBĂRILOR:
- "low": o afirmație explicită, identificare, asociere directă, clasificare de bază ori succesiune simplă.
- "medium": minimum o comparație, aplicare, clasificare, ordonare sau deducție directă.
- "high": minimum două afirmații distincte și minimum doi pași de raționament.
- Lungimea promptului nu determină dificultatea.
- O definiție, o dată, un nume, o formulă reprodusă sau o asociere unică nu poate fi "high".
- O întrebare high trebuie să ofere toate informațiile necesare pentru rezolvare și să aibă o concluzie unică.

REGULI PENTRU SINGLE_CHOICE:
- Exact 4 opțiuni.
- Exact 1 opțiune cu "is_correct": true.
- Răspunsul corect trebuie să fie complet corect, nu doar mai plauzibil sau mai detaliat.
- Cele trei variante greșite trebuie să fie demonstrabil greșite conform materialului.
- Pozițiile corecte A/B/C/D trebuie planificate înainte de redactarea opțiunilor.
- În interiorul fiecărui quiz, numărul răspunsurilor corecte pe A, B, C și D trebuie să difere cu maximum 1.
- Aceeași poziție nu poate fi corectă de trei ori consecutiv.
- Nu folosi secvențe previzibile precum A-B-C-D repetat, A-A-B-B-C-C sau alternanțe regulate.

REGULI PENTRU MULTIPLE_CHOICE:
- Între 4 și 6 opțiuni.
- Minimum 2 opțiuni corecte.
- Minimum 2 opțiuni greșite.
- Variază numărul răspunsurilor corecte: folosește în același quiz întrebări cu 2 și cu 3 răspunsuri corecte; pentru 6 opțiuni poți utiliza uneori 4 corecte, dar nu în mod repetitiv.
- Nu folosi aceeași semnătură a pozițiilor corecte în două întrebări consecutive.
- Aceeași semnătură, de exemplu AC sau BDE, nu poate apărea de mai mult de două ori în același quiz.
- Tiparul "primele două și ultima opțiune sunt corecte" — ABD pentru 4 opțiuni, ABE pentru 5, ABF pentru 6 — poate apărea cel mult o dată într-un quiz.
- Nu utiliza același număr de răspunsuri corecte la toate întrebările multiple-choice.
- Pentru fiecare poziție existentă A-F, proporția de apariții corecte trebuie să fie aproximativ echilibrată între întrebările în care poziția există; nicio poziție nu trebuie să fie aproape mereu corectă sau aproape mereu greșită.
- Nu marca toate opțiunile în afară de una ca fiind corecte.
- Fiecare opțiune trebuie să poată fi evaluată independent.

REGULI STRICTE PRIVIND LUNGIMEA ȘI FORMA OPȚIUNILOR:
- Răspunsul corect nu trebuie să fie identificabil prin lungime, precizie, vocabular sau structură.
- Toate opțiunile aceleiași întrebări trebuie să aibă aceeași formă gramaticală: toate sintagme nominale, toate propoziții, toate valori, toate etape sau toate asocieri.
- Toate opțiunile trebuie să aibă aceeași granularitate conceptuală.
- Pentru opțiuni de maximum 8 cuvinte, diferența dintre cea mai lungă și cea mai scurtă opțiune nu trebuie să depășească 2 cuvinte.
- Pentru opțiuni mai lungi, cea mai lungă opțiune nu trebuie să depășească aproximativ 125% din lungimea celei mai scurte.
- Dacă adevărul cere o formulare lungă, extinde distractorii cu detalii relevante și greșite, fără a-i face ambigui.
- Dacă distractorii sunt natural mai scurți, scurtează răspunsul corect fără pierderea sensului.
- În fiecare quiz, răspunsul corect poate fi opțiunea unică cea mai lungă în maximum o singură întrebare single-choice.
- În fiecare quiz, răspunsul corect poate fi opțiunea unică cea mai scurtă în maximum o singură întrebare single-choice.
- La multiple-choice, opțiunile corecte nu trebuie să fie, ca grup, mai lungi sau mai detaliate decât opțiunile greșite.
- Răspunsul corect nu trebuie să conțină în mod exclusiv calificări, excepții, paranteze sau explicații absente din distractori.
- Nu utiliza absoluturi precum "întotdeauna", "niciodată", "exclusiv" doar pentru a face distractorii evident falși, decât dacă materialul folosește explicit acea relație absolută.

TESTUL ORB AL OPȚIUNILOR — OBLIGATORIU INTERN:
Înainte de finalizare, ignoră marcajele is_correct și verifică fiecare întrebare ca și cum nu ai ști răspunsul. Rescrie opțiunile dacă răspunsul poate fi ghicit prin:
- lungime;
- nivel de detaliu;
- formulare mai academică;
- acord gramatical cu promptul;
- repetiția unui cuvânt din întrebare;
- calificări și excepții prezente numai în răspunsul corect;
- faptul că distractorii sunt absurzi sau din altă categorie.

REGULI PENTRU DISTRACTORI:
- Fiecare distractor trebuie să fie o confuzie realistă produsă de concepte apropiate din material.
- Un distractor nu poate fi doar absent din material; trebuie să fie incompatibil cu relația sau criteriul testat.
- Nu utiliza sinonime ale răspunsului corect.
- Nu utiliza variante parțial adevărate.
- Nu utiliza opțiuni suprapuse semantic.
- Nu combina două afirmații într-o opțiune dacă una este adevărată și cealaltă falsă.
- Nu utiliza termeni complet fără legătură sau variante comice/absurde.
- Nu repeta același distractor în întrebări diferite decât dacă rolul său conceptual este diferit.

REGULI PENTRU EXPLICAȚII:
- Fiecare întrebare trebuie să aibă o explicație pedagogică, clară și autosuficientă.
- Pentru single-choice, explică de ce răspunsul corect este corect și de ce fiecare dintre cele trei variante greșite nu îndeplinește criteriul.
- Pentru multiple-choice, explică separat de ce fiecare opțiune corectă trebuie selectată și fiecare opțiune greșită trebuie exclusă.
- Pentru high, prezintă succint lanțul de raționament în minimum doi pași.
- Explicația trebuie să rămână exclusiv în limitele materialului.
- Nu folosi explicații circulare sau formule precum "conform textului" fără justificare.
- Nu introduce informații noi care nu au fost necesare pentru rezolvarea întrebării.

REGULI PENTRU DOMENII CU FORMULE, CALCULE SAU DATE:
Aplică numai dacă materialul conține asemenea informații:
- folosește exclusiv formulele, metodele, constantele și convențiile din material;
- păstrează unitățile și verifică compatibilitatea lor;
- verifică fiecare calcul și rezultat intermediar;
- nu inventa valori și nu presupune reguli de rotunjire;
- asigură-te că datele sunt suficiente;
- folosește distractori proveniți din erori realiste de formulă, semn, unitate, etapă sau ordine a operațiilor;
- verifică să nu existe două opțiuni numeric echivalente.

REGULI PENTRU DOMENII INTERPRETATIVE:
Aplică atunci când materialul conține teorii, texte, argumente, evenimente sau perspective:
- diferențiază faptele de interpretări;
- atribuie ideile autorului, curentului, perioadei sau teoriei corecte;
- nu transforma o interpretare în adevăr universal;
- nu inventa citate;
- precizează criteriul de evaluare;
- nu folosi ca distractori interpretări alternative compatibile cu materialul.

REGULA ANTI-REPETIȚIE ȘI DIVERSITATE:
- Nu repeta același prompt cu alte cuvinte.
- Nu utiliza același set de opțiuni în întrebări diferite.
- Nu transforma o întrebare low într-una high doar prin adăugarea unui scenariu decorativ.
- Aceeași afirmație atomică nu trebuie să fie răspunsul central în mai mult de trei întrebări din întregul pachet.
- Dacă o afirmație este reutilizată, trebuie testată prin altă operație cognitivă și cu alt context logic.
- Două quiz-uri nu pot avea peste 20% întrebări bazate pe aceleași afirmații atomice.
- Titlurile și descrierile trebuie să reflecte diferențe reale de focus.

REGULI PENTRU STRATEGIES:
- Generează 4-8 strategii concrete și adaptate materialului.
- Fiecare strategie trebuie să specifice ce parte a materialului se folosește, ce acțiune se execută și ce rezultat urmărește.
- Folosește metode relevante: recuperare activă, comparație tabelară, hartă conceptuală, cronologie, reconstrucția unui proces, rezolvare de probleme, explicare cu voce tare, repetare spațiată sau clasificare.
- Evită sfaturi generice precum "citește atent" sau "învață mai mult".

AUDIT FINAL OBLIGATORIU — NU ÎL AFIȘA:

AUDIT DE CANTITATE:
- există exact 18 quiz-uri;
- există exact 6 low, 6 medium și 6 high;
- fiecare quiz are exact 15 întrebări;
- întregul pachet are exact 270 de întrebări;
- fiecare quiz conține 9-10 întrebări single-choice și 5-6 întrebări multiple-choice;
- fiecare quiz conține ambele tipuri de întrebări;
- rezumatul este amplu, structurat și nerepetitiv.

AUDIT STRUCTURAL:
- obiectul poate fi parsată prin JSON.parse;
- schema_version este exact "revizzio.manual.v1";
- nu există chei suplimentare;
- fiecare întrebare are prompt, type, options și explanation;
- fiecare single-choice are exact 4 opțiuni și exact una corectă;
- fiecare multiple-choice are 4-6 opțiuni, minimum două corecte și minimum două greșite;
- toate valorile enum sunt valide.

AUDIT FACTUAL:
- fiecare afirmație este susținută de material;
- răspunsul corect este complet și neechivoc;
- fiecare distractor este demonstrabil greșit;
- nu există cunoștințe externe, generalizări sau cauzalități inventate;
- valorile, formulele, unitățile, cronologia și ordinea etapelor sunt corecte.

AUDIT ANTI-PATTERN:
- pozițiile A/B/C/D sunt echilibrate în fiecare quiz;
- aceeași poziție nu este corectă de trei ori consecutiv;
- nu există secvențe regulate detectabile;
- semnăturile multiple-choice sunt variate;
- tiparul primele două plus ultima nu se repetă;
- numărul răspunsurilor corecte la multiple-choice variază;
- nicio poziție A-F nu este aproape mereu corectă;
- răspunsul corect nu este sistematic cea mai lungă opțiune;
- opțiunile sunt apropiate ca lungime, formă și granularitate;
- testul orb al opțiunilor este trecut.

AUDIT PEDAGOGIC:
- dificultatea declarată corespunde raționamentului real;
- întrebările high necesită minimum doi pași;
- explicațiile justifică toate opțiunile;
- quiz-urile au focus distinct;
- întregul material este acoperit echilibrat;
- nu există duplicate conceptuale superficiale.

Dacă orice regulă nu este respectată, corectează sau regenerează itemii afectați înainte de a emite JSON-ul final.

MATERIAL MARKDOWN DE PROCESAT:
{material_markdown.strip()}
"""


def build_revizzio_validation_prompt(
    material_markdown: str,
    generated_json: str,
) -> str:
    """Construiește un prompt separat pentru auditarea independentă a rezultatului."""
    if not isinstance(material_markdown, str) or not material_markdown.strip():
        raise ValueError("material_markdown trebuie să fie un șir nevid.")
    if not isinstance(generated_json, str) or not generated_json.strip():
        raise ValueError("generated_json trebuie să fie un șir nevid.")

    return f"""Acționezi ca auditor independent pentru un pachet educațional Revizzio.
Primești materialul-sursă și un JSON generat. Verifică fiecare item exclusiv față de material.

SCOP:
Corectează JSON-ul astfel încât să fie factual, neambiguu, pedagogic și conform tuturor regulilor de mai jos.
Returnează exclusiv JSON-ul integral corectat, fără explicații externe și fără markdown.
Nu adăuga chei noi și păstrează schema "revizzio.manual.v1".

VERIFICĂ OBLIGATORIU:
- exact 18 quiz-uri: 6 low, 6 medium, 6 high;
- exact 15 întrebări în fiecare quiz;
- exact 270 de întrebări în întregul pachet;
- 9-10 întrebări single_choice și 5-6 întrebări multiple_choice în fiecare quiz;
- single_choice: exact 4 opțiuni și exact una corectă;
- multiple_choice: 4-6 opțiuni, minimum două corecte și minimum două greșite;
- echilibru A/B/C/D la single-choice;
- nicio poziție corectă de trei ori consecutiv;
- semnături multiple-choice variate și nerepetitive;
- tiparul primele două plus ultima cel mult o dată per quiz;
- variația numărului de răspunsuri corecte la multiple-choice;
- opțiuni apropiate ca lungime, formă gramaticală și granularitate;
- răspunsul corect să nu fie sistematic cel mai lung, mai precis sau mai academic;
- fiecare distractor să fie plauzibil și demonstrabil greșit;
- fiecare explicație să justifice toate opțiunile;
- fiecare întrebare high să necesite minimum doi pași de raționament;
- lipsa duplicatelor și acoperirea echilibrată a materialului;
- rezumat amplu, coerent și nerepetitiv;
- JSON valid, fără chei suplimentare.

METODĂ INTERNĂ:
1. localizează sursa fiecărei afirmații;
2. marchează intern itemii incorecți, ambigui sau nesusținuți;
3. rescrie itemii problematici folosind alte afirmații bine susținute;
4. reechilibrează opțiunile și pozițiile corecte;
5. rulează un test orb al opțiunilor;
6. validează din nou întregul obiect;
7. emite numai JSON-ul integral final.

MATERIAL-SURSĂ:
{material_markdown.strip()}

JSON DE AUDITAT:
{generated_json.strip()}
"""
