from datetime import date, timedelta

from app.services.study_activity import _streak_length


def _days_ago(n: int, *, today: date) -> date:
    return today - timedelta(days=n)


def test_streak_length_no_activity_is_zero() -> None:
    today = date(2026, 8, 31)

    assert _streak_length([], today=today) == 0


def test_streak_length_single_day_today() -> None:
    today = date(2026, 8, 31)

    assert _streak_length([today], today=today) == 1


def test_streak_length_single_day_yesterday_still_counts() -> None:
    today = date(2026, 8, 31)

    assert _streak_length([_days_ago(1, today=today)], today=today) == 1


def test_streak_length_stale_activity_is_zero() -> None:
    today = date(2026, 8, 31)

    # Last activity was 2 days ago — the streak already broke.
    assert _streak_length([_days_ago(2, today=today)], today=today) == 0


def test_streak_length_counts_consecutive_days() -> None:
    today = date(2026, 8, 31)
    dates = [_days_ago(n, today=today) for n in range(7)]

    assert _streak_length(dates, today=today) == 7


def test_streak_length_stops_at_gap() -> None:
    today = date(2026, 8, 31)
    dates = [
        _days_ago(0, today=today),
        _days_ago(1, today=today),
        _days_ago(2, today=today),
        _days_ago(4, today=today),  # gap: day 3 is missing
        _days_ago(5, today=today),
    ]

    assert _streak_length(dates, today=today) == 3


def test_streak_length_anchors_on_yesterday_when_today_has_no_activity_yet() -> None:
    today = date(2026, 8, 31)
    dates = [
        _days_ago(1, today=today),
        _days_ago(2, today=today),
        _days_ago(3, today=today),
    ]

    assert _streak_length(dates, today=today) == 3
