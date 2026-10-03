"""Deadline note (R10): information about the deadline, never a legal conclusion."""

from datetime import date, datetime

from rules.dates import NAIROBI
from rules.engine import make_deadline_note

OLD = datetime(2026, 10, 20, 10, 0, tzinfo=NAIROBI)


def test_a_later_deadline_shows_both_dates_and_the_gap() -> None:
    new = datetime(2026, 10, 27, 10, 0, tzinfo=NAIROBI)

    assert make_deadline_note(OLD, new, date(2026, 10, 15)) == (
        "The deadline moved from 20 October 2026 at 10:00 to 27 October 2026 at 10:00, "
        "7 days later. Confirm the closing date with the procuring entity."
    )


def test_an_earlier_deadline_says_earlier() -> None:
    new = datetime(2026, 10, 19, 10, 0, tzinfo=NAIROBI)

    assert "1 day earlier" in make_deadline_note(OLD, new, None)


def test_a_new_time_on_the_same_day_gives_no_day_count() -> None:
    new = datetime(2026, 10, 20, 14, 0, tzinfo=NAIROBI)

    note = make_deadline_note(OLD, new, None)

    assert "to 20 October 2026 at 14:00." in note
    assert "later" not in note
    assert "earlier" not in note


def test_deadlines_are_shown_in_nairobi_time() -> None:
    new = datetime.fromisoformat("2026-10-27T07:00:00+00:00")

    assert "27 October 2026 at 10:00" in make_deadline_note(OLD, new, None)


def test_an_unmoved_deadline_after_an_addendum_points_to_the_procuring_entity() -> None:
    note = make_deadline_note(OLD, OLD, date(2026, 10, 17))

    assert note.startswith("This addendum was published 3 days before the deadline")
    assert "ask the procuring entity" in note
    assert "not a legal conclusion" in note


def test_the_note_never_cites_a_section_or_states_an_obligation() -> None:
    notes = [
        make_deadline_note(OLD, OLD, date(2026, 10, 17)),
        make_deadline_note(OLD, datetime(2026, 10, 27, 10, 0, tzinfo=NAIROBI), None),
    ]

    for note in notes:
        assert "section" not in note.lower()
        assert "must" not in note.lower()


def test_nothing_to_say() -> None:
    assert make_deadline_note(None, OLD, date(2026, 10, 1)) is None  # first version
    assert make_deadline_note(OLD, None, date(2026, 10, 1)) is None  # no deadline extracted
    assert make_deadline_note(OLD, OLD, None) is None  # same deadline, no publication date
    assert make_deadline_note(OLD, OLD, date(2026, 10, 25)) is None  # published after closing
