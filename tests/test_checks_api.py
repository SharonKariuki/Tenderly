"""POST /api/tenders/{id}/check/ and GET /api/tenders/{id}/checks/latest/."""

from datetime import date, datetime

import pytest
from rest_framework.test import APIClient

from accounts.models import User
from checks.models import Check
from checks.services import recheck
from core.contracts import DISCLAIMER, CheckResult
from core.models import StoredFile
from documents.models import Document
from rules.dates import NAIROBI
from tenders.models import Tender, TenderVersion

pytestmark = pytest.mark.django_db

DEADLINE = datetime(2030, 10, 20, 10, 0, tzinfo=NAIROBI)
REQUIREMENTS = [
    {
        "id": "r1",
        "label": "Valid Tax Compliance Certificate",
        "requirement_type": "mandatory_document",
        "required_doc_type": "kra_tax_compliance",
        "mandatory": True,
        "source_quote": "Bidders shall submit a valid Tax Compliance Certificate.",
        "page": 4,
    },
    {
        "id": "r2",
        "label": "AGPO certificate",
        "requirement_type": "mandatory_document",
        "required_doc_type": "agpo_certificate",
        "mandatory": True,
        "source_quote": "This tender is reserved for AGPO-registered firms.",
        "page": 2,
    },
]


def stored_file(owner: User) -> StoredFile:
    return StoredFile.objects.create(
        owner=owner,
        filename="dummy.pdf",
        mime="application/pdf",
        size=1,
        sha256="0" * 64,
        data=b"x",
    )


def tender_for(owner: User, deadline: datetime = DEADLINE, requirements=None) -> Tender:
    tender = Tender.objects.create(owner=owner, title="Supply of stationery (SAMPLE)")
    TenderVersion.objects.create(
        tender=tender,
        version_no=1,
        file=stored_file(owner),
        text_hash="a" * 64,
        deadline=deadline,
        requirements=REQUIREMENTS if requirements is None else requirements,
    )
    return tender


def document_for(owner: User, expires_on: date, confirmed: bool = True, **extracted) -> Document:
    return Document.objects.create(
        owner=owner,
        doc_type="kra_tax_compliance",
        file=stored_file(owner),
        extracted=extracted,
        expires_on=expires_on,
        confirmed=confirmed,
    )


@pytest.fixture
def user() -> User:
    return User.objects.create_user(email="owner@example.com")


@pytest.fixture
def client(user: User) -> APIClient:
    api_client = APIClient()
    api_client.force_authenticate(user)
    return api_client


def test_check_returns_the_agreed_shape_with_expiring_and_missing_items(
    client: APIClient, user: User
) -> None:
    tender = tender_for(user)
    document = document_for(user, date(2030, 10, 12))

    response = client.post(f"/api/tenders/{tender.pk}/check/")

    assert response.status_code == 201
    result = CheckResult.model_validate(response.json())
    assert result.tender_id == tender.pk
    assert result.version_no == 1
    assert result.deadline == DEADLINE
    assert result.overall == "attention_needed"
    assert result.disclaimer == DISCLAIMER  # R15
    expiring, missing = result.items
    assert (expiring.status, expiring.doc_id) == ("expiring", document.pk)
    assert expiring.reason == "Expires 8 days before the deadline"
    assert expiring.source_quote == "Bidders shall submit a valid Tax Compliance Certificate."
    assert (missing.status, missing.doc_id) == ("missing", None)
    assert "score" not in response.json()  # R20


def test_check_is_stored_per_version(client: APIClient, user: User) -> None:
    tender = tender_for(user)

    response = client.post(f"/api/tenders/{tender.pk}/check/")

    check = Check.objects.get()
    assert (check.tender, check.version_no, check.owner) == (tender, 1, user)
    assert check.result == response.json()


def test_unconfirmed_documents_do_not_count(client: APIClient, user: User) -> None:
    # R2.
    tender = tender_for(user, requirements=REQUIREMENTS[:1])
    document_for(user, date(2031, 1, 1), confirmed=False)

    item = client.post(f"/api/tenders/{tender.pk}/check/").json()["items"][0]

    assert item["status"] == "missing"
    assert "Confirm your tax compliance certificate" in item["reason"]


def test_ready_when_every_requirement_is_met(client: APIClient, user: User) -> None:
    tender = tender_for(user, requirements=REQUIREMENTS[:1])
    document_for(user, date(2031, 1, 1))

    assert client.post(f"/api/tenders/{tender.pk}/check/").json()["overall"] == "ready"


def test_a_document_that_disagrees_with_the_profile_is_reported(
    client: APIClient, user: User
) -> None:
    user.kra_pin = "P000000000X"
    user.save()
    tender = tender_for(user, requirements=REQUIREMENTS[:1])
    document = document_for(user, date(2031, 1, 1), kra_pin="P111111111A")

    result = client.post(f"/api/tenders/{tender.pk}/check/").json()

    assert result["mismatches"] == [
        {"field": "kra_pin", "values": ["P000000000X", "P111111111A"], "doc_ids": [document.pk]}
    ]
    assert result["overall"] == "attention_needed"


def test_only_the_users_own_documents_are_used(client: APIClient, user: User) -> None:
    # R19.
    other = User.objects.create_user(email="other@example.com")
    document_for(other, date(2031, 1, 1))
    tender = tender_for(user, requirements=REQUIREMENTS[:1])

    assert client.post(f"/api/tenders/{tender.pk}/check/").json()["items"][0]["status"] == (
        "missing"
    )


def test_another_users_tender_is_a_404(client: APIClient) -> None:
    # R19.
    theirs = tender_for(User.objects.create_user(email="other@example.com"))

    assert client.post(f"/api/tenders/{theirs.pk}/check/").status_code == 404
    assert client.get(f"/api/tenders/{theirs.pk}/checks/latest/").status_code == 404
    assert not Check.objects.exists()


def test_the_check_uses_the_latest_version(client: APIClient, user: User) -> None:
    # R7, R8: an addendum adds version 2 with a later deadline; the certificate now falls short.
    tender = tender_for(user, requirements=REQUIREMENTS[:1])
    document_for(user, date(2030, 10, 25))
    assert client.post(f"/api/tenders/{tender.pk}/check/").json()["items"][0]["status"] == "met"

    TenderVersion.objects.create(
        tender=tender,
        version_no=2,
        file=stored_file(user),
        text_hash="b" * 64,
        deadline=datetime(2030, 11, 3, 10, 0, tzinfo=NAIROBI),
        requirements=REQUIREMENTS[:1],
    )
    result = client.post(f"/api/tenders/{tender.pk}/check/").json()

    assert result["version_no"] == 2
    assert result["items"][0]["status"] == "expiring"


def test_latest_returns_the_newest_stored_check(client: APIClient, user: User) -> None:
    tender = tender_for(user, requirements=REQUIREMENTS[:1])
    client.post(f"/api/tenders/{tender.pk}/check/")
    document_for(user, date(2031, 1, 1))
    second = client.post(f"/api/tenders/{tender.pk}/check/").json()

    response = client.get(f"/api/tenders/{tender.pk}/checks/latest/")

    assert response.status_code == 200
    assert response.json() == second
    assert second["overall"] == "ready"


def test_latest_is_404_before_any_check(client: APIClient, user: User) -> None:
    tender = tender_for(user)

    response = client.get(f"/api/tenders/{tender.pk}/checks/latest/")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


def test_unreadable_requirements_are_a_422(client: APIClient, user: User) -> None:
    tender = tender_for(user, requirements=[{"label": "no id, no type"}])

    response = client.post(f"/api/tenders/{tender.pk}/check/")

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_requirements"


def test_a_tender_without_a_version_is_a_422(client: APIClient, user: User) -> None:
    tender = Tender.objects.create(owner=user, title="Empty")

    response = client.post(f"/api/tenders/{tender.pk}/check/")

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "no_version"


def test_both_endpoints_are_private(settings, user: User) -> None:
    settings.DEMO_MODE = False
    tender = tender_for(user)

    assert APIClient().post(f"/api/tenders/{tender.pk}/check/").status_code == 401
    assert APIClient().get(f"/api/tenders/{tender.pk}/checks/latest/").status_code == 401


def add_version(tender: Tender, deadline: datetime, requirements: list, published_on=None) -> None:
    TenderVersion.objects.create(
        tender=tender,
        version_no=2,
        file=stored_file(tender.owner),
        text_hash="b" * 64,
        deadline=deadline,
        published_on=published_on,
        requirements=requirements,
    )


def test_the_check_is_idempotent(client: APIClient, user: User) -> None:
    tender = tender_for(user)

    first = client.post(f"/api/tenders/{tender.pk}/check/")
    second = client.post(f"/api/tenders/{tender.pk}/check/")

    assert (first.status_code, second.status_code) == (201, 200)
    assert second.json() == first.json()
    assert Check.objects.count() == 1


def test_a_changed_result_is_stored_as_a_new_row(client: APIClient, user: User) -> None:
    tender = tender_for(user, requirements=REQUIREMENTS[:1])
    client.post(f"/api/tenders/{tender.pk}/check/")
    document_for(user, date(2031, 1, 1))

    assert client.post(f"/api/tenders/{tender.pk}/check/").status_code == 201
    assert Check.objects.count() == 2


def test_the_first_version_has_no_deadline_note(client: APIClient, user: User) -> None:
    tender = tender_for(user)

    assert client.post(f"/api/tenders/{tender.pk}/check/").json()["deadline_note"] is None


def test_a_moved_deadline_puts_the_note_in_the_payload(client: APIClient, user: User) -> None:
    # R10.
    tender = tender_for(user)
    add_version(tender, datetime(2030, 10, 27, 10, 0, tzinfo=NAIROBI), REQUIREMENTS)

    note = client.post(f"/api/tenders/{tender.pk}/check/").json()["deadline_note"]

    assert note.startswith("The deadline moved from 20 October 2030 at 10:00 to 27 October 2030")
    assert "7 days later" in note


def test_recheck_reports_what_flipped_after_an_addendum(user: User) -> None:
    # R8: the deadline moves past the certificate's expiry and a new document is required.
    tender = tender_for(user, requirements=REQUIREMENTS[:1])
    document_for(user, date(2030, 10, 25))
    first, flips = recheck(user, tender)
    assert first.overall == "ready"
    assert flips == []

    add_version(tender, datetime(2030, 11, 3, 10, 0, tzinfo=NAIROBI), REQUIREMENTS)
    second, flips = recheck(user, tender)

    assert second.version_no == 2
    assert second.overall == "attention_needed"
    assert [(flip.requirement_id, flip.old_status, flip.new_status) for flip in flips] == [
        ("r1", "met", "expiring"),
        ("r2", None, "missing"),
    ]
