"""The deadline note shown after an addendum (R10). Owner: A (lead).

Information, not a legal conclusion: it states what happened to the deadline and tells the
user to confirm with the procuring entity. It never cites or paraphrases a section of the
law. Pure Python (C3).
"""

from datetime import date, datetime

from rules.dates import NAIROBI, days_before, deadline_date

CONFIRM = "Confirm the closing date with the procuring entity."
LATE_AMENDMENT = (
    "Procurement law ties late amendments to an extension of the deadline, so ask the "
    "procuring entity whether the closing date will be extended. "
    "This is information, not a legal conclusion."
)


def _days(count: int) -> str:
    return f"{count} day" if count == 1 else f"{count} days"


def _when(deadline: datetime) -> str:
    local = deadline if deadline.tzinfo is None else deadline.astimezone(NAIROBI)
    return f"{local.day} {local:%B %Y} at {local:%H:%M}"


def make_deadline_note(
    old_deadline: datetime | None, new_deadline: datetime | None, published_on: date | None
) -> str | None:
    """A note about the deadline for a new tender version, or None when there is nothing
    to say. `published_on` is the day the new version (the addendum) was published."""
    if old_deadline is None or new_deadline is None:
        return None

    if new_deadline != old_deadline:
        moved = days_before(deadline_date(old_deadline), deadline_date(new_deadline))
        if moved > 0:
            change = f", {_days(moved)} later"
        elif moved < 0:
            change = f", {_days(-moved)} earlier"
        else:
            change = ""
        return (
            f"The deadline moved from {_when(old_deadline)} to {_when(new_deadline)}{change}. "
            f"{CONFIRM}"
        )

    if published_on is None:
        return None
    left = days_before(published_on, deadline_date(new_deadline))
    if left < 0:
        return None
    return (
        f"This addendum was published {_days(left)} before the deadline, and the deadline "
        f"did not move ({_when(new_deadline)}). {LATE_AMENDMENT}"
    )
