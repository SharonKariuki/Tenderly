"""Alert text and email delivery (alerts/email.py). Owner: C. No database needed."""

from django.core.mail import EmailMultiAlternatives

from accounts.models import User
from alerts.email import build_alert, send_alert_email
from core.contracts import DISCLAIMER, AlertMessage, Change, ChangeCategory, CheckStatus, Flip

NEW_MISSING = Flip(
    requirement_id="r6",
    label="Valid Single Business Permit",
    old_status=None,
    new_status=CheckStatus.MISSING,
    reason="No confirmed document of this type",
)
NOW_EXPIRING = Flip(
    requirement_id="r2",
    label="Valid Tax Compliance Certificate",
    old_status=CheckStatus.MET,
    new_status=CheckStatus.EXPIRING,
    reason="Expires 6 days before the deadline",
)
NOW_MET = Flip(
    requirement_id="r4",
    label="Current CR12",
    old_status=CheckStatus.UNCLEAR,
    new_status=CheckStatus.MET,
)
DEADLINE_CHANGE = Change(
    category=ChangeCategory.DEADLINE,
    old_quote="on or before Tuesday, 20th October 2026",
    new_quote="on or before Tuesday, 3rd November 2026",
    explanation="The closing date moved by two weeks.",
)


def test_alert_counts_only_the_flips_that_affect_her():
    alert = build_alert([NEW_MISSING, NOW_EXPIRING, NOW_MET], [DEADLINE_CHANGE], None)

    assert alert.subject == "Tender update: 2 changes affect you"
    assert "Two changes affect you:" in alert.body_text
    assert 'New requirement "Valid Single Business Permit" is missing.' in alert.body_text
    assert (
        '"Valid Tax Compliance Certificate" was met and is now expiring before the deadline. '
        "Expires 6 days before the deadline." in alert.body_text
    )
    assert "Also changed on your checklist:" in alert.body_text
    assert '"Current CR12" was unclear and is now met.' in alert.body_text


def test_alert_with_one_flip_is_singular():
    alert = build_alert([NOW_EXPIRING], [], None)

    assert alert.subject == "Tender update: 1 change affects you"
    assert "One change affects you:" in alert.body_text


def test_alert_with_no_flips_says_nothing_affects_her():
    alert = build_alert([], [DEADLINE_CHANGE], None)

    assert alert.subject == "Tender update: an addendum was uploaded"
    assert "none of the changes affect your checklist" in alert.body_text


def test_alert_shows_quotes_note_link_and_disclaimer():
    alert = build_alert(
        [NOW_EXPIRING],
        [DEADLINE_CHANGE],
        "The deadline moved from 20 October to 3 November.",
        tender_title="Cleaning Services",
        result_url="https://app.example/tenders/12/result",
    )

    for body in (alert.body_text, alert.body_html):
        assert "Cleaning Services" in body
        assert "on or before Tuesday, 20th October 2026" in body  # R5: quotes travel with it
        assert "on or before Tuesday, 3rd November 2026" in body
        assert "The deadline moved from 20 October to 3 November." in body
        assert "https://app.example/tenders/12/result" in body  # R22
    assert DISCLAIMER in alert.body_text  # R15


def test_alert_html_escapes_document_text():
    change = Change(category=ChangeCategory.ELIGIBILITY, new_quote="<script>alert(1)</script>")

    alert = build_alert([], [change], None)

    assert "<script>" not in alert.body_html
    assert "&lt;script&gt;" in alert.body_html


def test_send_alert_email_sends_text_and_html(mailoutbox):
    user = User(email="owner@example.com")
    alert = AlertMessage(subject="Tender update", body_text="plain", body_html="<p>html</p>")

    assert send_alert_email(user, alert) is True

    assert len(mailoutbox) == 1
    assert mailoutbox[0].to == ["owner@example.com"]
    assert mailoutbox[0].body == "plain"
    assert mailoutbox[0].alternatives[0][0] == "<p>html</p>"


def test_send_alert_email_returns_false_when_sending_fails(monkeypatch, caplog):
    def broken_send(self, fail_silently=False):
        raise OSError("smtp is down")

    monkeypatch.setattr(EmailMultiAlternatives, "send", broken_send)
    user = User(pk=7, email="owner@example.com")

    assert send_alert_email(user, AlertMessage(subject="s", body_text="b")) is False  # R17
    assert "owner@example.com" not in caplog.text  # R16
    assert "user_id=7" in caplog.text
