from __future__ import annotations

import json
import logging
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
    StudyProjectFile,
    StudyProjectFlashcard,
    StudyProjectImport,
    StudyProjectKeyword,
    StudyProjectQuiz,
    StudyProjectQuizOption,
    StudyProjectQuizQuestion,
    StudyProjectStrategy,
    StudyProjectSummary,
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
            .where(StudyProject.user_id == user.id)
            .order_by(StudyProject.created_at.desc())
        )
        return list(result.all())

    async def get_project(self, user: User, project_id: uuid.UUID) -> StudyProject:
        project = await self.session.scalar(
            self._project_query().where(
                StudyProject.id == project_id,
                StudyProject.user_id == user.id,
            )
        )
        if project is None:
            raise ProjectNotFoundError("Proiectul nu a fost gasit.")
        return project

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
            file_count=len(project.files),
            summary_count=1 if project.summary is not None else 0,
            keyword_count=len(project.keywords),
            flashcard_count=len(project.flashcards),
            quiz_count=len(project.quizzes),
            strategy_count=len(project.strategies),
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
            selectinload(StudyProject.strategies),
        )

    def _project_dir(self, user_id: uuid.UUID, project_id: uuid.UUID) -> Path:
        return self.settings.project_storage_dir / str(user_id) / str(project_id)

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
        for collection in (
            project.keywords,
            project.flashcards,
            project.quizzes,
            project.strategies,
        ):
            for item in list(collection):
                await self.session.delete(item)
            collection.clear()
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
        return f"""Esti motorul educational al platformei Revizzio.
Misiunea ta este sa transformi un material de curs in date structurate JSON
care pot fi importate direct intr-o aplicatie de invatare.

IMPORTANT:
- Raspunde STRICT cu JSON valid.
- Nu folosi markdown in afara valorilor text din JSON.
- Nu adauga comentarii, explicatii, ```json sau text inainte/dupa JSON.
- Toate cheile JSON trebuie sa fie exact in engleza, ca in schema.
- Toate valorile pentru utilizator trebuie scrise in romana, cu diacritice.
- Daca materialul nu sustine o afirmatie, nu o include.
- Nu inventa exemple, date, ani, formule sau concepte care nu apar in material.
- Daca o sectiune are informatie insuficienta, genereaza mai putine item-uri,
  dar pastreaza schema JSON valida.

PROIECT:
{project_name}

CONTEXT ACADEMIC:
- Materie: {subject_name}
- Facultate/Scoala: {institution_name}

Foloseste acest context pentru nivelul de limbaj, exemplele permise si
dificultatea quiz-urilor. Nu presupune insa cerinte specifice institutiei daca
nu apar in material.

OBIECTIV PEDAGOGIC:
Genereaza un pachet de studiu care ajuta studentul sa:
1. inteleaga ideile principale;
2. retina conceptele prin flashcard-uri;
3. se testeze prin quiz-uri de calitate;
4. identifice termeni cheie;
5. primeasca strategii concrete de invatare.

CONTRACT JSON OBLIGATORIU:
Returneaza un singur obiect JSON cu structura:
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

REGULI PENTRU SUMMARY:
- Scrie un rezumat complet, nu doar puncte scurte.
- Structureaza natural pe paragrafe si liste scurte daca ajuta.
- Pastreaza ordinea logica a materialului.
- Explica relatiile cauza-efect, comparatiile si definitiile importante.
- Nu copia pasaje lungi; reformuleaza clar.
- "estimated_reading_minutes" trebuie sa fie un numar intreg realist.

REGULI PENTRU KEYWORDS:
- Genereaza 8-20 termeni, in functie de densitatea materialului.
- "term" trebuie sa fie un concept cautabil, nu o propozitie lunga.
- "explanation" trebuie sa explice termenul in 1-3 fraze clare.
- "anchor_text" trebuie sa fie un fragment scurt care apare sau poate fi regasit
  usor in rezumat, pentru highlight/link intern.
- Evita termeni generici precum "introducere", "capitol", "exemplu".

REGULI PENTRU FLASHCARDS:
- Genereaza 12-40 flashcard-uri, daca materialul permite.
- Fiecare flashcard testeaza un singur lucru.
- "front" trebuie sa fie o intrebare clara, nu titlu.
- "back" trebuie sa fie raspunsul complet, dar scurt.
- Foloseste dificultati:
  - "low": definitii, identificare, fapte de baza;
  - "medium": comparatii, relatii, aplicare simpla;
  - "high": rationament, consecinte, integrarea mai multor idei.
- Evita intrebari vagi: "Ce stii despre X?"
- Evita raspunsuri de tip "depinde" fara explicatie.

REGULI FOARTE IMPORTANTE PENTRU QUIZZES:
Genereaza quiz-uri ca pentru o aplicatie reala, nu ca o lista superficiala.

Numar si organizare:
- Creeaza ideal 9 quiz-uri daca materialul permite, grupate astfel:
  1. 3 quiz-uri de recapitulare cu complexitate "low";
  2. 3 quiz-uri de intelegere si aplicare cu complexitate "medium";
  3. 3 quiz-uri de pregatire examen cu complexitate "high".
- Daca materialul este prea scurt, creeaza minimum 3 quiz-uri:
  1 recapitulare, 1 intelegere/aplicare, 1 pregatire examen.
- Fiecare quiz trebuie sa aiba 8-14 intrebari daca materialul permite.
- Fiecare quiz trebuie sa aiba un focus distinct, de exemplu:
  concepte de baza, comparatii, mecanisme, cazuri aplicate, capcane de examen,
  sinteza intre capitole sau interpretarea unor consecinte.
- Amesteca intrebari "single_choice" si "multiple_choice" unde are sens.
- "question_type" la nivel de quiz arata tipul predominant, dar fiecare intrebare
  are propriul camp "type".

Reguli pentru intrebari:
- "prompt" trebuie sa fie o intrebare concreta, evaluabila.
- Intrebarile low pot verifica definitii, identificari si legaturi directe, dar
  nu trebuie sa fie triviale sau de tip "ce este X?" daca se poate formula mai bine.
- Intrebarile medium cer comparatii, aplicare, recunoasterea unei relatii,
  identificarea unei exceptii sau explicarea unei consecinte.
- Intrebarile high trebuie sa semene cu intrebari de examen: scenarii scurte,
  integrarea mai multor concepte, rationament pe baza materialului, alegerea
  variantei celei mai corecte si excluderea distractorilor plauzibili.
- Nu formula intrebari cu raspuns evident dintr-un singur cuvant daca nu e util.
- Nu folosi "toate variantele de mai sus" sau "niciuna dintre variante".
- Nu folosi formulari ambigue sau capcane nedrepte.
- Evita intrebari banale precum "Ce este definitia...?" repetate de multe ori.
- Nu copia literal fraze din rezumat ca prompt; transforma informatia in sarcina
  de testare.

Reguli pentru optiuni:
- Pentru "single_choice":
  - exact 4 optiuni;
  - exact 1 optiune cu "is_correct": true.
- Pentru "multiple_choice":
  - 4-6 optiuni;
  - cel putin 2 optiuni corecte;
  - cel putin 1 optiune gresita.
- Distractorii trebuie sa fie plauzibili, dar clar gresiti conform materialului.
- Optiunile trebuie sa aiba lungimi relativ apropiate, ca raspunsul corect sa nu
  fie evident vizual.
- Nu repeta aceeasi idee in doua optiuni.
- Nu include optiuni care sunt partial adevarate daca intrebarea nu cere asta.
- Ordinea optiunilor trebuie amestecata real:
  - raspunsul corect NU trebuie sa fie mereu prima optiune;
  - intr-un quiz, distribuie raspunsurile corecte pe pozitii diferite;
  - pentru single_choice foloseste pozitiile A, B, C si D aproximativ echilibrat;
  - pentru multiple_choice variaza combinatiile corecte: nu folosi mereu primele
    doua sau primele trei optiuni;
  - nu crea tipare detectabile, de exemplu corect doar A, apoi doar B, apoi doar C.
- Distractorii trebuie sa fie concepte confundabile din material, nu variante
  absurde puse doar ca umplutura.

Reguli pentru explicatii:
- Fiecare intrebare trebuie sa aiba "explanation".
- Explicatia trebuie sa spuna de ce raspunsul corect este corect si, pe scurt,
  de ce distractorii sunt gresiti sau incompleti.
- Explicatia trebuie sa fie utila pentru invatare, nu doar "conform textului".
- Pentru intrebarile high, explicatia trebuie sa arate lantul de rationament,
  nu doar sa numeasca raspunsul corect.

REGULI PENTRU STRATEGIES:
- Genereaza 3-6 strategii concrete.
- Fiecare strategie trebuie sa fie aplicabila direct pe material.
- Evita sfaturi generice precum "invata mai mult" sau "citeste atent".

VALIDARE INAINTE SA RASPUNZI:
Inainte de a returna JSON-ul, verifica mental:
- JSON-ul este valid si poate fi parsut cu JSON.parse?
- Nu exista trailing commas?
- Toate stringurile sunt intre ghilimele duble?
- Nu exista text in afara obiectului JSON?
- Exista "schema_version": "revizzio.manual.v1"?
- Fiecare quiz are intrebari?
- Fiecare intrebare are optiuni si explicatie?
- La single_choice exista exact un raspuns corect?
- La multiple_choice exista minimum doua raspunsuri corecte?
- Raspunsurile corecte sunt distribuite pe pozitii diferite, fara tipar evident?
- Exista 3 niveluri clare de quiz: recapitulare, intelegere/aplicare, examen?
- Intrebarile de examen necesita rationament si nu sunt doar definitii simple?

MATERIAL MARKDOWN DE PROCESAT:
{markdown}
"""
