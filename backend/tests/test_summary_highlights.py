import asyncio
import uuid
from types import SimpleNamespace

from app.models import StudyProject, StudyProjectSummary
from app.services.projects import StudyProjectService


class _CommitSession:
    async def commit(self) -> None:
        return None


class _SummaryHighlightService(StudyProjectService):
    def __init__(self, project: StudyProject) -> None:
        self.project = project
        self.session = _CommitSession()

    async def get_project(self, user: object, project_id: uuid.UUID) -> StudyProject:
        return self.project


def _project_with_summary(content: str) -> StudyProject:
    project_id = uuid.uuid4()
    project = StudyProject(
        id=project_id,
        user_id=uuid.uuid4(),
        name="Pharma",
        subject_name="Farmacologie",
        institution_name="Facultate",
        slug="pharma",
        status="ready",
    )
    project.summary = StudyProjectSummary(
        project_id=project_id,
        content=content,
        estimated_reading_minutes=1,
    )
    project.summary_highlights = []
    return project


def test_summary_highlight_accepts_visible_selection_across_inline_markdown() -> None:
    content = "Efectul apare prin **transport activ** si difuzie."
    visible = "Efectul apare prin transport activ si difuzie."
    selected = "prin transport activ si difuzie"
    start_offset = visible.index(selected)
    end_offset = start_offset + len(selected)
    project = _project_with_summary(content)
    service = _SummaryHighlightService(project)

    asyncio.run(
        service.add_summary_highlight(
            user=SimpleNamespace(id=project.user_id),
            project_id=project.id,
            paragraph_index=0,
            text=selected,
            color="yellow",
            start_offset=start_offset,
            end_offset=end_offset,
        )
    )

    assert len(project.summary_highlights) == 1
    highlight = project.summary_highlights[0]
    assert highlight.text == selected
    assert highlight.start_offset == start_offset
    assert highlight.end_offset == end_offset
