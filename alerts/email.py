"""Alert email. Owner: C. M0 signature stubs (contract in section 4); implemented in M1."""

from accounts.models import User
from core.contracts import AlertMessage, Change, Flip


def build_alert(
    flips: list[Flip], changes: list[Change], deadline_note: str | None
) -> AlertMessage:
    raise NotImplementedError("M1: feat/c-email")


def send_alert_email(user: User, alert: AlertMessage) -> bool:
    raise NotImplementedError("M1: feat/c-email")
