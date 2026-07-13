from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class StudyProject(Base):
    __tablename__ = "study_projects"
    __table_args__ = (
        CheckConstraint(
            "status IN ('processing', 'awaiting_ai_json', 'ready', 'failed')",
            name="ck_study_projects_status",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    subject_name: Mapped[str] = mapped_column(String(160), nullable=False)
    institution_name: Mapped[str] = mapped_column(String(220), nullable=False)
    slug: Mapped[str] = mapped_column(String(180), nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="processing",
        server_default="processing",
        index=True,
    )
    material_rights_confirmed: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )
    combined_markdown_path: Mapped[str | None] = mapped_column(Text)
    prompt_path: Mapped[str | None] = mapped_column(Text)
    generated_json_path: Mapped[str | None] = mapped_column(Text)
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    user: Mapped[User] = relationship(back_populates="study_projects")
    files: Mapped[list[StudyProjectFile]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    imports: Mapped[list[StudyProjectImport]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    summary: Mapped[StudyProjectSummary | None] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    keywords: Mapped[list[StudyProjectKeyword]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="StudyProjectKeyword.sort_order",
    )
    flashcards: Mapped[list[StudyProjectFlashcard]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="StudyProjectFlashcard.sort_order",
    )
    quizzes: Mapped[list[StudyProjectQuiz]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="StudyProjectQuiz.sort_order",
    )
    strategies: Mapped[list[StudyProjectStrategy]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="StudyProjectStrategy.sort_order",
    )
    summary_highlights: Mapped[list[StudyProjectSummaryHighlight]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="StudyProjectSummaryHighlight.created_at",
    )
    archive: Mapped[StudyProjectArchive | None] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
        uselist=False,
    )


class StudyProjectArchive(Base):
    __tablename__ = "study_project_archives"
    __table_args__ = (
        UniqueConstraint(
            "project_id",
            name="uq_study_project_archives_project_id",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("study_projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    archived_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    project: Mapped[StudyProject] = relationship(back_populates="archive")
    user: Mapped[User] = relationship(back_populates="study_project_archives")


class StudyProjectFile(Base):
    __tablename__ = "study_project_files"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("study_projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str | None] = mapped_column(String(160))
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    source_path: Mapped[str] = mapped_column(Text, nullable=False)
    markdown_path: Mapped[str | None] = mapped_column(Text)
    markdown_char_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    conversion_status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="pending",
        server_default="pending",
    )
    conversion_error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    project: Mapped[StudyProject] = relationship(back_populates="files")


class StudyProjectImport(Base):
    __tablename__ = "study_project_imports"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("study_projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    json_path: Mapped[str] = mapped_column(Text, nullable=False)
    schema_version: Mapped[str] = mapped_column(String(40), nullable=False)
    payload: Mapped[dict[str, object]] = mapped_column(JSONB, nullable=False)
    imported_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    project: Mapped[StudyProject] = relationship(back_populates="imports")


class StudyProjectSummary(Base):
    __tablename__ = "study_project_summaries"
    __table_args__ = (
        UniqueConstraint(
            "project_id",
            name="uq_study_project_summaries_project_id",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("study_projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    estimated_reading_minutes: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    project: Mapped[StudyProject] = relationship(back_populates="summary")


class StudyProjectKeyword(Base):
    __tablename__ = "study_project_keywords"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("study_projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    term: Mapped[str] = mapped_column(String(180), nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    anchor_text: Mapped[str | None] = mapped_column(String(240))
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    project: Mapped[StudyProject] = relationship(back_populates="keywords")


class StudyProjectFlashcard(Base):
    __tablename__ = "study_project_flashcards"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("study_projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    front: Mapped[str] = mapped_column(Text, nullable=False)
    front_image: Mapped[str | None] = mapped_column(Text)
    back: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str | None] = mapped_column(String(120))
    difficulty: Mapped[str | None] = mapped_column(String(40))
    source_type: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        default="generated",
        server_default="generated",
    )
    source_quiz_question_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("study_project_quiz_questions.id", ondelete="SET NULL"),
        index=True,
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    project: Mapped[StudyProject] = relationship(back_populates="flashcards")


class StudyProjectQuiz(Base):
    __tablename__ = "study_project_quizzes"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("study_projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    complexity: Mapped[str | None] = mapped_column(String(60))
    question_type: Mapped[str | None] = mapped_column(String(60))
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    score_percent: Mapped[int | None] = mapped_column(Integer)
    correct_count: Mapped[int | None] = mapped_column(Integer)
    answered_count: Mapped[int | None] = mapped_column(Integer)

    project: Mapped[StudyProject] = relationship(back_populates="quizzes")
    questions: Mapped[list[StudyProjectQuizQuestion]] = relationship(
        back_populates="quiz",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="StudyProjectQuizQuestion.sort_order",
    )
    attempts: Mapped[list[StudyProjectQuizAttempt]] = relationship(
        back_populates="quiz",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="StudyProjectQuizAttempt.completed_at.desc()",
    )


class StudyProjectQuizAttempt(Base):
    __tablename__ = "study_project_quiz_attempts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    quiz_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("study_project_quizzes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    score_percent: Mapped[int] = mapped_column(Integer, nullable=False)
    correct_count: Mapped[int] = mapped_column(Integer, nullable=False)
    answered_count: Mapped[int] = mapped_column(Integer, nullable=False)
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    quiz: Mapped[StudyProjectQuiz] = relationship(back_populates="attempts")


class StudyProjectQuizQuestion(Base):
    __tablename__ = "study_project_quiz_questions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    quiz_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("study_project_quizzes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[str] = mapped_column(String(60), nullable=False)
    explanation: Mapped[str | None] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    quiz: Mapped[StudyProjectQuiz] = relationship(back_populates="questions")
    options: Mapped[list[StudyProjectQuizOption]] = relationship(
        back_populates="question",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="StudyProjectQuizOption.sort_order",
    )


class StudyProjectQuizOption(Base):
    __tablename__ = "study_project_quiz_options"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    question_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("study_project_quiz_questions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    label: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    question: Mapped[StudyProjectQuizQuestion] = relationship(back_populates="options")


class StudyProjectSummaryHighlight(Base):
    __tablename__ = "study_project_summary_highlights"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("study_projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    paragraph_index: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    color: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pink",
        server_default="pink",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    project: Mapped[StudyProject] = relationship(back_populates="summary_highlights")


class StudyProjectStrategy(Base):
    __tablename__ = "study_project_strategies"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("study_projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    project: Mapped[StudyProject] = relationship(back_populates="strategies")
