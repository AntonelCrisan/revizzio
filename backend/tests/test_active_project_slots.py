"""Active project slot accounting and the study gate.

The slot cap is what makes a downgrade felt: projects over it are deactivated
(kept, visible, unusable) rather than archived or deleted. These tests pin the
rules that a stale browser tab or an archive/restore round-trip must not bypass.
"""

import asyncio
from datetime import UTC, datetime

import pytest

from app.services.plan_errors import (
    ActiveProjectSlotsFullError,
    PlanSelectionRequiredError,
    ProjectDeactivatedError,
)
from app.services.projects import StudyProjectService


class _FakePlan:
    def __init__(self, slots):
        self.active_project_slots = slots


class _FakeUser:
    def __init__(self, slots=None):
        self.id = "user-1"
        self.current_plan = _FakePlan(slots) if slots is not None else None


class _FakeProject:
    def __init__(self, deactivated=False):
        self.deactivated_at = datetime.now(UTC) if deactivated else None


class _SlotService(StudyProjectService):
    """Only the slot logic, with the active-project count stubbed."""

    def __init__(self, active_count):
        self._active_count = active_count

    async def count_active_projects(self, user):
        return self._active_count


def test_slots_come_from_the_plan() -> None:
    service = _SlotService(0)
    assert service._active_project_slots(_FakeUser(slots=10)) == 10


def test_slots_fall_back_to_the_free_allowance_without_a_plan() -> None:
    """A user with no plan loaded must not silently get unlimited slots."""
    service = _SlotService(0)
    assert service._active_project_slots(_FakeUser(slots=None)) == 2


def test_slots_ignore_a_nonsensical_plan_value() -> None:
    service = _SlotService(0)
    assert service._active_project_slots(_FakeUser(slots=0)) == 2


def test_deactivated_project_cannot_be_studied() -> None:
    service = _SlotService(1)
    with pytest.raises(ProjectDeactivatedError) as exc:
        asyncio.run(
            service._assert_project_is_studiable(
                user=_FakeUser(slots=10),
                project=_FakeProject(deactivated=True),
            )
        )
    assert exc.value.code == "PROJECT_DEACTIVATED"


def test_over_the_cap_blocks_every_project_until_the_user_chooses() -> None:
    """This is what a stale tab hits: the account, not the project, is at fault."""
    service = _SlotService(active_count=25)
    with pytest.raises(PlanSelectionRequiredError) as exc:
        asyncio.run(
            service._assert_project_is_studiable(
                user=_FakeUser(slots=2),
                project=_FakeProject(),
            )
        )
    assert exc.value.code == "PLAN_SELECTION_REQUIRED"
    # The message has to name both numbers, it is the whole prompt.
    assert "2" in str(exc.value) and "25" in str(exc.value)


def test_within_the_cap_is_allowed() -> None:
    service = _SlotService(active_count=2)
    asyncio.run(
        service._assert_project_is_studiable(
            user=_FakeUser(slots=2),
            project=_FakeProject(),
        )
    )


def test_exactly_at_the_cap_is_allowed() -> None:
    """`used == slots` is a full house, not an overflow."""
    service = _SlotService(active_count=10)
    asyncio.run(
        service._assert_project_is_studiable(
            user=_FakeUser(slots=10),
            project=_FakeProject(),
        )
    )


def test_slot_status_reports_what_the_modal_needs() -> None:
    service = _SlotService(active_count=25)
    status = asyncio.run(service.active_project_slot_status(_FakeUser(slots=2)))
    assert status == {"slots": 2, "used": 25, "over_limit": True, "must_choose": True}

    service = _SlotService(active_count=1)
    status = asyncio.run(service.active_project_slot_status(_FakeUser(slots=2)))
    assert status == {"slots": 2, "used": 1, "over_limit": False, "must_choose": False}


def test_slots_full_error_carries_its_code() -> None:
    """The frontend keys the upgrade prompt off this code."""
    assert ActiveProjectSlotsFullError().code == "ACTIVE_PROJECT_SLOTS_FULL"


def test_list_projects_orders_active_before_deactivated() -> None:
    """A deactivated project cannot be opened, so it must not outrank one that can.

    Asserted on the query's ORDER BY rather than through the DB, so the rule is
    pinned even if nobody re-reads the SQL.
    """
    import inspect

    source = inspect.getsource(StudyProjectService.list_projects)
    order_at = source.index(".order_by(")
    deactivated_at = source.index("deactivated_at.is_not(None)", order_at)
    created_at = source.index("created_at.desc()", order_at)

    # Activation is the primary key, creation date only breaks ties.
    assert deactivated_at < created_at


def test_slot_count_and_project_list_use_the_same_statuses() -> None:
    """A slot may only be consumed by a project the dashboard actually shows.

    If the count included hidden statuses (failed, processing) an over-cap
    account could never get back under the cap: the selection modal would offer
    nothing to release while every study route stayed blocked -- a permanent
    lockout with no way out from the UI.
    """
    import inspect

    from app.models.study_project import SLOT_OCCUPYING_STATUSES

    list_source = inspect.getsource(StudyProjectService.list_projects)
    count_source = inspect.getsource(StudyProjectService.count_active_projects)

    assert "SLOT_OCCUPYING_STATUSES" in list_source
    assert "SLOT_OCCUPYING_STATUSES" in count_source
    # Neither may hard-code its own status list and drift from the other.
    assert '"ready"' not in count_source
    assert SLOT_OCCUPYING_STATUSES == ("ready", "generating_quizzes")


def test_activation_and_restore_serialise_the_quota_check() -> None:
    """Both read the count then write, so they need the per-user advisory lock.

    Without it two concurrent activations can each see a free slot, push the
    account over the cap, and lock every project behind PLAN_SELECTION_REQUIRED.
    """
    import inspect

    for method in (
        StudyProjectService.activate_project,
        StudyProjectService.restore_project,
    ):
        source = inspect.getsource(method)
        lock_at = source.index("_lock_user_plan_quota")
        count_at = source.index("count_active_projects")
        assert lock_at < count_at, f"{method.__name__} counts before locking"


def test_rename_does_not_enforce_slots_on_the_way_out() -> None:
    """Renaming committed the change and then raised, leaving a stale UI."""
    import inspect

    source = inspect.getsource(StudyProjectService.rename_project)
    assert source.count("enforce_slots=False") == 2, (
        "rename_project must read and return with the slot gate off"
    )


def test_bulk_selection_only_trusts_the_users_own_projects() -> None:
    """keep_project_ids comes from the client, so it must be intersected.

    Without the selectable_ids filter a caller could pass another account's
    project id, or a hidden one, and have it claim a slot.
    """
    import inspect

    source = inspect.getsource(StudyProjectService.apply_active_project_selection)

    filter_at = source.index("selectable_ids")
    intersect_at = source.index("if pid in selectable_ids")
    assert filter_at < intersect_at

    # The candidate set is scoped to the caller and to visible statuses.
    candidates = source[source.index("selectable_ids = set(") :]
    assert "StudyProject.user_id == user.id" in candidates
    assert "SLOT_OCCUPYING_STATUSES" in candidates
    assert "~StudyProject.archive.has()" in candidates


def test_bulk_selection_rejects_more_ids_than_the_plan_allows() -> None:
    """Otherwise the client could keep everything active by sending every id."""
    import inspect

    source = inspect.getsource(StudyProjectService.apply_active_project_selection)
    assert "len(unique_ids) > slots" in source
    assert "ActiveProjectSlotsFullError" in source
    # And it locks before deciding, like the single-project paths.
    assert source.index("_lock_user_plan_quota") < source.index(
        "len(unique_ids) > slots"
    )


def test_activation_writes_avoid_the_eager_loaded_query() -> None:
    """Flipping one timestamp must not pull the ten-relation study pack.

    _project_query eager-loads ten relations (~13 extra queries); using it for a
    scalar write cost 27 queries per deactivate.
    """
    import inspect

    for method in (
        StudyProjectService.deactivate_project,
        StudyProjectService.activate_project,
    ):
        source = inspect.getsource(method)
        assert "_fetch_project_row" in source, f"{method.__name__} re-reads the pack"
