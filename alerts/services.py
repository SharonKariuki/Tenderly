"""alerts services. Owner: C.

R17: the in-app Alert row is the source of truth. The email is sent afterwards, off the
request, and a failure only means sent_at stays empty.
"""

import logging
import threading

from django.conf import settings
from django.db import connections
from django.utils import timezone

from accounts.models import User
from alerts.email import send_alert_email
from alerts.models import Alert
from core.contracts import AlertMessage

logger = logging.getLogger(__name__)


def result_url(tender_id: int) -> str:
    """R22: the link back to the result page. Empty when no frontend origin is configured."""
    origins = getattr(settings, "CORS_ALLOWED_ORIGINS", [])
    return f"{origins[0].rstrip('/')}/tenders/{tender_id}" if origins else ""


def deliver_alert_email(alert_id: int, user_id: int, message: AlertMessage) -> bool:
    """Send the email of a saved alert and stamp sent_at. Never raises (R17)."""
    try:
        sent = send_alert_email(User.objects.get(pk=user_id), message)
        if sent:
            Alert.objects.filter(pk=alert_id).update(sent_at=timezone.now())
        return sent
    except Exception as exc:
        # R16: ids and the error type only.
        logger.warning("alert delivery failed alert_id=%s error=%s", alert_id, type(exc).__name__)
        return False


def _deliver_and_close(alert_id: int, user_id: int, message: AlertMessage) -> None:
    try:
        deliver_alert_email(alert_id, user_id, message)
    finally:
        connections.close_all()  # the thread owns its own database connection


def send_later(alert_id: int, user_id: int, message: AlertMessage) -> None:
    """Send the email in a thread so the request never waits for the mail server."""
    threading.Thread(
        target=_deliver_and_close, args=(alert_id, user_id, message), daemon=True
    ).start()
