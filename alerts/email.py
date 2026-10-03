"""Alert email. Owner: C.

build_alert is pure (C3): it turns flips and changes into plain-language text.
send_alert_email never raises: a failed email must not fail the request (R17).
"""

import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.utils.html import escape

from accounts.models import User
from core.contracts import (
    DISCLAIMER,
    AlertMessage,
    Change,
    ChangeCategory,
    CheckStatus,
    Flip,
)

logger = logging.getLogger(__name__)

NUMBER_WORDS = ("No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten")

STATUS_WORDS = {
    CheckStatus.MET: "met",
    CheckStatus.MISSING: "missing",
    CheckStatus.EXPIRING: "expiring before the deadline",
    CheckStatus.UNCLEAR: "unclear",
}

CATEGORY_WORDS = {
    ChangeCategory.DEADLINE: "Deadline",
    ChangeCategory.ELIGIBILITY: "Eligibility",
    ChangeCategory.REQUIRED_DOCUMENTS: "Required documents",
    ChangeCategory.SPECIFICATIONS_QUANTITIES: "Specifications and quantities",
    ChangeCategory.PRICING_FORMAT: "Pricing format",
    ChangeCategory.SUBMISSION_METHOD: "Submission method",
}


def affects_user(flip: Flip) -> bool:
    """A flip needs her attention unless the requirement went away or is now met."""
    return flip.new_status not in (None, CheckStatus.MET)


def describe_flip(flip: Flip) -> str:
    reason = f" {flip.reason.rstrip('.')}." if flip.reason else ""
    if flip.new_status is None:
        return f'"{flip.label}" is no longer required.'
    new = STATUS_WORDS[flip.new_status]
    if flip.old_status is None:
        return f'New requirement "{flip.label}" is {new}.{reason}'
    return f'"{flip.label}" was {STATUS_WORDS[flip.old_status]} and is now {new}.{reason}'


def describe_change(change: Change) -> list[str]:
    lines = [f"{CATEGORY_WORDS[change.category]}: {change.explanation}".rstrip(": ")]
    if change.old_quote:
        lines.append(f'Before: "{change.old_quote}"')
    if change.new_quote:
        lines.append(f'Now: "{change.new_quote}"')
    return lines


def headline(count: int) -> str:
    if count == 0:
        return "The tender changed, but none of the changes affect your checklist."
    number = NUMBER_WORDS[count] if count < len(NUMBER_WORDS) else str(count)
    return f"{number} change affects you:" if count == 1 else f"{number} changes affect you:"


def build_alert(
    flips: list[Flip],
    changes: list[Change],
    deadline_note: str | None,
    *,
    tender_title: str = "",
    result_url: str = "",
) -> AlertMessage:
    affecting = [flip for flip in flips if affects_user(flip)]
    other = [flip for flip in flips if not affects_user(flip)]
    title = tender_title or "your tender"
    intro = f"An addendum was uploaded for {title}."
    lead = headline(len(affecting))

    text = [intro, "", lead]
    text += [f"- {describe_flip(flip)}" for flip in affecting]
    if other:
        text += ["", "Also changed on your checklist:"]
        text += [f"- {describe_flip(flip)}" for flip in other]
    if changes:
        text += ["", "What changed in the tender:"]
        for change in changes:
            first, *rest = describe_change(change)
            text += [f"- {first}"] + [f"  {line}" for line in rest]
    if deadline_note:
        text += ["", deadline_note]
    if result_url:
        text += ["", f"See your updated checklist: {result_url}"]
    text += ["", DISCLAIMER]

    html = [f"<p>{escape(intro)}</p>", f"<p><strong>{escape(lead)}</strong></p>"]
    if affecting:
        html.append(_html_list(describe_flip(flip) for flip in affecting))
    if other:
        html.append("<p>Also changed on your checklist:</p>")
        html.append(_html_list(describe_flip(flip) for flip in other))
    if changes:
        html.append("<p>What changed in the tender:</p>")
        html.append(_html_list("\n".join(describe_change(change)) for change in changes))
    if deadline_note:
        html.append(f"<p>{escape(deadline_note)}</p>")
    if result_url:
        html.append(f'<p><a href="{escape(result_url)}">See your updated checklist</a></p>')
    html.append(f"<p><small>{escape(DISCLAIMER)}</small></p>")

    count = len(affecting)
    verb = "change affects" if count == 1 else "changes affect"
    subject = (
        f"Tender update: {count} {verb} you" if count else "Tender update: an addendum was uploaded"
    )
    return AlertMessage(subject=subject, body_text="\n".join(text), body_html="\n".join(html))


def _html_list(items) -> str:
    rows = "".join(f"<li>{escape(item).replace(chr(10), '<br>')}</li>" for item in items)
    return f"<ul>{rows}</ul>"


def send_alert_email(user: User, alert: AlertMessage) -> bool:
    """R22: alerts go to the account address. Returns False instead of raising (R17)."""
    if not user.email:
        return False
    message = EmailMultiAlternatives(
        subject=alert.subject,
        body=alert.body_text,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
    )
    if alert.body_html:
        message.attach_alternative(alert.body_html, "text/html")
    try:
        return message.send() == 1
    except Exception as exc:
        # R16: the id and the error type only, never the address or the message.
        logger.warning("alert email failed user_id=%s error=%s", user.pk, type(exc).__name__)
        return False
