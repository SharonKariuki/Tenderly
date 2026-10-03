"""The addenda flow: version, changes, re-check, flips and alert in one upload. Owner: C.

Tender extraction (B) and the LLM are faked, so this proves the orchestration only. The
quotes are checked against the real text layers of the sample pair.
"""

import hashlib
import json
from datetime import date, datetime
from pathlib import Path

import pytest
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from accounts.models import User
from alerts import services as alert_services
from alerts.models import Alert
from checks.models import Check
from core.contracts import Change, CheckItem, CheckResult, Flip, Requirement, TenderExtraction
from core.models import StoredFile
from documents.models import Document
from tenders.models import Tender, TenderVersion
from versions import compare, services
from versions.models import TenderChange
from versions.services import mark_affected, read_text_layer

pytestmark = pytest.mark.django_db

PAIR = Path(__file__).resolve().parent.parent / "sample_data" / "tenders" / "mashariki-cleaning"
EXPECTED = json.loads((PAIR / "expected.json").read_text(encoding="utf-8"))
TENDER_PDF = (PAIR / EXPECTED["tender"]).read_bytes()
ADDENDUM_PDF = (PAIR / EXPECTED["addendum"]).read_bytes()
PERMIT_QUOTE = EXPECTED["changes"][1]["new_quote"]
TODAY = date(2026, 10, 1)
REQUIREMENTS = [
    {
        "id": "r1",
        "label": "Valid Tax Compliance Certificate",
        "requirement_type": "mandatory_document",
        "required_doc_type": "kra_tax_compliance",
        "source_quote": "Bidders shall submit a valid Tax Compliance Certificate.",
    }
]


def stored_file(owner: User, data: bytes = b"x") -> StoredFile:
    return StoredFile.objects.create(
        owner=owner,
        filename="file.pdf",
        mime="application/pdf",
        size=len(data),
        sha256=hashlib.sha256(data).hexdigest(),
        data=data,
    )


@pytest.fixture(autouse=True)
def fixed_today(monkeypatch) -> None:
    monkeypatch.setattr("checks.services.timezone.localdate", lambda: TODAY)


@pytest.fixture
def owner() -> User:
    return User.objects.create_user(email="owner@example.com")


@pytest.fixture
def client(owner: User) -> APIClient:
    api_client = APIClient()
    api_client.force_authenticate(owner)
    return api_client


@pytest.fixture
def tender(owner: User) -> Tender:
    """Version 1 closes on 20 October; her tax certificate runs to 25 October, so it is met
    until the addendum moves the deadline to 3 November."""
    tender = Tender.objects.create(owner=owner, title="Cleaning services (SIMULATED)")
    TenderVersion.objects.create(
        tender=tender,
        version_no=1,
        file=stored_file(owner, TENDER_PDF),
        text_hash="hash-v1",
        deadline=datetime.fromisoformat(EXPECTED["old_deadline"]),
        requirements=REQUIREMENTS,
    )
    Document.objects.create(
        owner=owner,
        doc_type="kra_tax_compliance",
        file=stored_file(owner),
        expires_on=date(2026, 10, 25),
        confirmed=True,
    )
    return tender


@pytest.fixture
def faked_ai(monkeypatch) -> list:
    """Stand in for B's extract_tender and for the LLM behind compare_versions."""
    calls = []

    def fake_extract_tender(file_bytes: bytes, mime: str) -> TenderExtraction:
        calls.append(mime)
        return TenderExtraction(
            deadline=datetime.fromisoformat(EXPECTED["new_deadline"]),
            requirements=[
                Requirement(
                    id="r1",
                    label="Valid Single Business Permit",
                    requirement_type="mandatory_document",
                    required_doc_type="business_permit",
                    source_quote=PERMIT_QUOTE,
                    page=1,
                )
            ],
            text=read_text_layer(file_bytes, mime),
            text_hash="hash-v2",
        )

    def fake_llm(prompt, schema, file_bytes, mime, cache_key):
        return {"changes": EXPECTED["changes"]}

    monkeypatch.setattr(services, "extract_tender", fake_extract_tender)
    monkeypatch.setattr(compare, "_default_llm", lambda: fake_llm)
    return calls


@pytest.fixture
def email_now(monkeypatch) -> None:
    """Send the email in the test's own thread instead of a background one."""
    monkeypatch.setattr(alert_services, "send_later", alert_services.deliver_alert_email)


def upload(client: APIClient, tender: Tender, data: bytes = ADDENDUM_PDF):
    file = SimpleUploadedFile("addendum.pdf", data, content_type="application/pdf")
    return client.post(f"/api/tenders/{tender.pk}/versions/", {"file": file}, format="multipart")


def test_addendum_returns_check_flips_and_alert(client, tender, faked_ai):
    response = upload(client, tender)

    assert response.status_code == 201
    body = response.json()
    assert body["created"] is True and body["version_no"] == 2
    assert body["check"]["version_no"] == 2
    assert body["check"]["deadline_note"]  # R10: carried by the check from version 2 on
    assert body["flips"] == [
        {
            "requirement_id": "r1",
            "label": "Valid Tax Compliance Certificate",
            "old_status": "met",
            "new_status": "expiring",
            "reason": body["flips"][0]["reason"],
        },
        {
            "requirement_id": "v2-r1",
            "label": "Valid Single Business Permit",
            "old_status": None,
            "new_status": "missing",
            "reason": body["flips"][1]["reason"],
        },
    ]
    assert body["alert_id"] == Alert.objects.get().pk


def test_changes_are_marked_by_what_flipped(client, tender, faked_ai):
    body = upload(client, tender).json()

    affected = {change["category"]: change["affects_user"] for change in body["changes"]}
    assert affected == {
        "deadline": True,
        "required_documents": True,
        "specifications_quantities": False,
    }
    stored = dict(TenderChange.objects.values_list("category", "affects_user"))
    assert stored == affected


def test_nothing_is_marked_when_her_documents_still_cover_the_new_version(
    client, owner, tender, faked_ai
):
    Document.objects.filter(owner=owner).update(expires_on=date(2027, 1, 31))
    Document.objects.create(
        owner=owner,
        doc_type="business_permit",
        file=stored_file(owner),
        expires_on=date(2027, 1, 31),
        confirmed=True,
    )

    body = upload(client, tender).json()

    assert [flip["new_status"] for flip in body["flips"]] == ["met"]
    assert not any(change["affects_user"] for change in body["changes"])
    assert "none of the changes affect your checklist" in Alert.objects.get().message


def test_flips_are_reported_even_if_the_first_version_was_never_checked(
    client, owner, tender, faked_ai
):
    assert not Check.objects.exists()

    body = upload(client, tender).json()

    assert sorted(Check.objects.values_list("version_no", flat=True)) == [1, 2]
    assert len(body["flips"]) == 2


def test_alert_row_is_written_and_scoped_to_the_owner(client, owner, tender, faked_ai):
    upload(client, tender)

    alert = Alert.objects.get()
    assert alert.owner == owner and alert.tender == tender
    assert alert.changes.count() == 3
    assert "Two changes affect you:" in alert.message
    assert f"/tenders/{tender.pk}" in alert.message  # R22
    assert alert.sent_at is None  # the email has not been sent inside the request


def test_email_is_sent_after_commit(
    client, owner, tender, faked_ai, email_now, django_capture_on_commit_callbacks
):
    with django_capture_on_commit_callbacks(execute=True) as callbacks:
        upload(client, tender)

    assert len(callbacks) == 1
    assert [message.to for message in mail.outbox] == [[owner.email]]
    assert f"/tenders/{tender.pk}" in mail.outbox[0].body
    assert Alert.objects.get().sent_at is not None


def test_email_failure_does_not_fail_the_request(
    client, tender, faked_ai, email_now, settings, django_capture_on_commit_callbacks
):
    settings.EMAIL_BACKEND = "tests.test_addenda_flow.BrokenBackend"

    with django_capture_on_commit_callbacks(execute=True):
        response = upload(client, tender)

    assert response.status_code == 201  # R17
    alert = Alert.objects.get()
    assert alert.pk == response.json()["alert_id"]
    assert alert.sent_at is None


def test_same_addendum_twice_creates_nothing(client, tender, faked_ai):
    upload(client, tender)
    counts = (TenderVersion.objects.count(), TenderChange.objects.count(), Check.objects.count())

    response = upload(client, tender)

    assert response.status_code == 200  # R9
    body = response.json()
    assert body["created"] is False and body["version_no"] == 2
    assert body["check"]["version_no"] == 2
    assert body["flips"] == [] and body["alert_id"] is None
    assert (
        TenderVersion.objects.count(),
        TenderChange.objects.count(),
        Check.objects.count(),
    ) == counts
    assert Alert.objects.count() == 1
    assert len(faked_ai) == 1


def test_a_failed_recheck_stores_nothing(client, tender, faked_ai, monkeypatch):
    def broken(user, tender):
        raise RuntimeError("boom")

    monkeypatch.setattr(services, "recheck", broken)
    client.raise_request_exception = False

    response = upload(client, tender)

    assert response.status_code == 500
    assert tender.versions.count() == 1
    assert not TenderChange.objects.exists() and not Alert.objects.exists()


def test_another_user_cannot_upload_to_her_tender(tender, faked_ai):
    stranger = APIClient()
    stranger.force_authenticate(User.objects.create_user(email="other@example.com"))

    assert upload(stranger, tender).status_code == 404  # R19
    assert tender.versions.count() == 1


def check_with(*items: CheckItem) -> CheckResult:
    return CheckResult(overall="attention_needed", items=list(items))


def test_mark_affected_matches_a_new_requirement_to_its_change_by_quote():
    changes = [
        Change(category="required_documents", new_quote="Bidders must attach a valid permit."),
        Change(category="required_documents", new_quote="Bidders must attach a bank statement."),
    ]
    flips = [Flip(requirement_id="v2-r1", label="Permit", new_status="missing")]
    check = check_with(
        CheckItem(
            requirement_id="v2-r1",
            label="Permit",
            status="missing",
            source_quote="Bidders must attach a valid permit.",
        )
    )

    assert [c.affects_user for c in mark_affected(changes, flips, check)] == [True, False]


def test_mark_affected_ignores_requirements_that_were_removed_or_are_met():
    changes = [Change(category="deadline", new_quote="x"), Change(category="eligibility")]
    flips = [
        Flip(requirement_id="r1", label="A", old_status="expiring", new_status="met"),
        Flip(requirement_id="r2", label="B", old_status="missing", new_status=None),
        Flip(requirement_id="v2-r1", label="C", new_status="met"),
    ]

    assert not any(c.affects_user for c in mark_affected(changes, flips, check_with()))


class BrokenBackend:
    def __init__(self, *args, **kwargs) -> None:
        pass

    def send_messages(self, messages) -> int:
        raise ConnectionError("mail server is down")
