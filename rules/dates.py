"""The one place dates are parsed and compared (R18). Owner: A (lead).

Deadlines are datetimes, expiry and issue dates are dates; everything is compared at date
level in Nairobi time. Nobody parses dates elsewhere.
"""

from datetime import date, datetime
from zoneinfo import ZoneInfo

from dateutil import parser

NAIROBI = ZoneInfo("Africa/Nairobi")


def deadline_date(deadline: datetime) -> date:
    """The calendar day the tender closes on, in Nairobi. A naive datetime is taken as
    Nairobi time already."""
    if deadline.tzinfo is None:
        return deadline.date()
    return deadline.astimezone(NAIROBI).date()


def parse_date(value: object) -> date | None:
    """A date from a date, a datetime or text such as "2026-10-12" or "12 October 2026".
    Day comes first in ambiguous text (12/10/2026 is 12 October). Unreadable input is None,
    never a guess (R4)."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return deadline_date(value)
    if isinstance(value, date):
        return value
    text = str(value).strip()
    if not text:
        return None
    try:
        return date.fromisoformat(text)
    except ValueError:
        pass
    try:
        return parser.parse(text, dayfirst=True).date()
    except (ValueError, OverflowError):
        return None


def days_before(day: date, reference: date) -> int:
    """How many days `day` falls before `reference`. Negative when it falls after."""
    return (reference - day).days
