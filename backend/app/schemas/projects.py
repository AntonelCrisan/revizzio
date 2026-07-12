import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class StudyProjectFileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    original_filename: str
    content_type: str | None
    size_bytes: int
    markdown_char_count: int
    conversion_status: str
    conversion_error: str | None
    created_at: datetime


class StudyProjectSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    content: str
    estimated_reading_minutes: int | None


class StudyProjectKeywordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    term: str
    explanation: str
    anchor_text: str | None
    sort_order: int


class StudyProjectFlashcardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    front: str
    back: str
    category: str | None
    difficulty: str | None
    source_type: str
    source_quiz_question_id: uuid.UUID | None
    sort_order: int


class StudyProjectQuizOptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    label: str
    is_correct: bool
    sort_order: int


class StudyProjectQuizQuestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    prompt: str
    question_type: str
    explanation: str | None
    sort_order: int
    options: list[StudyProjectQuizOptionResponse] = Field(default_factory=list)


class StudyProjectQuizResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: str | None
    complexity: str | None
    question_type: str | None
    sort_order: int
    questions: list[StudyProjectQuizQuestionResponse] = Field(default_factory=list)


class StudyProjectStrategyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: str
    sort_order: int


class StudyProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    subject_name: str
    institution_name: str
    slug: str
    status: str
    material_rights_confirmed: bool
    error_message: str | None
    created_at: datetime
    updated_at: datetime
    is_archived: bool = False
    archived_at: datetime | None = None
    file_count: int = 0
    summary_count: int = 0
    keyword_count: int = 0
    flashcard_count: int = 0
    quiz_count: int = 0
    strategy_count: int = 0
    markdown_download_url: str | None = None
    prompt_download_url: str | None = None
    files: list[StudyProjectFileResponse] = Field(default_factory=list)
    summary: StudyProjectSummaryResponse | None = None
    keywords: list[StudyProjectKeywordResponse] = Field(default_factory=list)
    flashcards: list[StudyProjectFlashcardResponse] = Field(default_factory=list)
    quizzes: list[StudyProjectQuizResponse] = Field(default_factory=list)
    strategies: list[StudyProjectStrategyResponse] = Field(default_factory=list)


class StudyProjectPrepareResponse(BaseModel):
    project: StudyProjectResponse
    markdown_download_url: str
    prompt_download_url: str
    next_step: str


class StudyProjectImportResponse(BaseModel):
    project: StudyProjectResponse
    imported: bool
    message: str


class StudyProjectRenameRequest(BaseModel):
    name: str = Field(min_length=2, max_length=160)


class StudyProjectQuizMistakeFlashcardCreate(BaseModel):
    question_id: uuid.UUID
