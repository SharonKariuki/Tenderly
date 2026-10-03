"""Alerts endpoints and Rejection Insight. Owner: C."""

import pytest
from django.core.management import call_command
from rest_framework.test import APIClient

from accounts.models import User
from alerts.models import Alert
from core.contracts import DocType
from insight.models import RejectionCase
from insight.services import get_insights
from tenders.models import Tender

pytestmark = pytest.mark.django_db


@pytest.fixture
def owner() -> User:
    return User.objects.create_user(email="owner@example.com")


@pytest.fixture
def client(owner: User) -> APIClient:
    api_client = APIClient()
    api_client.force_authenticate(owner)
    return api_client


def make_alert(user: User, message: str = "One change affects you.") -> Alert:
    tender = Tender.objects.create(owner=user, title="Cleaning services")
    return Alert.objects.create(owner=user, tender=tender, message=message)


def test_alert_list_shows_only_her_own_alerts(client: APIClient, owner: User):
    mine = make_alert(owner)
    make_alert(User.objects.create_user(email="other@example.com"), "Not hers.")

    response = client.get("/api/alerts/")

    assert response.status_code == 200
    assert [alert["id"] for alert in response.json()] == [mine.pk]  # R19
    assert response.json()[0] == {
        "id": mine.pk,
        "tender_id": mine.tender_id,
        "changes": [],
        "message": "One change affects you.",
        "channel": "in_app",
        "sent_at": None,
        "read_at": None,
        "created_at": response.json()[0]["created_at"],
    }


def test_marking_an_alert_read_sets_read_at_once(client: APIClient, owner: User):
    alert = make_alert(owner)

    first = client.patch(f"/api/alerts/{alert.pk}/read/")
    second = client.patch(f"/api/alerts/{alert.pk}/read/")

    assert first.status_code == 200
    assert first.json()["read_at"] is not None
    assert second.json()["read_at"] == first.json()["read_at"]


def test_another_users_alert_cannot_be_marked_read(client: APIClient):
    alert = make_alert(User.objects.create_user(email="other@example.com"))

    response = client.patch(f"/api/alerts/{alert.pk}/read/")

    assert response.status_code == 404  # R19
    assert response.json()["error"]["code"] == "not_found"
    alert.refresh_from_db()
    assert alert.read_at is None


def test_alert_endpoints_are_private(settings):
    settings.DEMO_MODE = False

    assert APIClient().get("/api/alerts/").status_code == 401
    assert APIClient().patch("/api/alerts/1/read/").status_code == 401


def test_seed_command_loads_twenty_cases_and_is_idempotent():
    call_command("seed_insight")
    call_command("seed_insight")

    assert RejectionCase.objects.count() == 20


def test_get_insights_filters_by_document_type():
    call_command("seed_insight")

    cases = get_insights(DocType.CR12)

    assert len(cases) == 2
    assert {case.doc_type for case in cases} == {DocType.CR12}
    assert all(case.illustrative for case in cases)  # no public source yet, so labelled


def test_insight_endpoint_filters_and_validates_doc_type(client: APIClient):
    call_command("seed_insight")

    filtered = client.get("/api/insight/?doc_type=kra_tax_compliance")
    everything = client.get("/api/insight/")
    invalid = client.get("/api/insight/?doc_type=passport")

    assert filtered.status_code == 200
    assert len(filtered.json()) == 4
    assert set(filtered.json()[0]) == {
        "doc_type",
        "reason",
        "source_title",
        "source_url",
        "year",
        "tags",
        "illustrative",
    }
    assert len(everything.json()) == 20
    assert invalid.status_code == 400
    assert "error" in invalid.json()
