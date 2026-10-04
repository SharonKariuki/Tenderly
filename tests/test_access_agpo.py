"""AGPO rules from access/agpo_rules.json, and the AGPO category API. Owner: B."""

from datetime import date

import pytest
from rest_framework.test import APIClient

from access import agpo
from accounts.models import User
from core.contracts import DocType


def test_the_rules_record_their_source_and_when_they_were_checked() -> None:
    source = agpo.rules()["source"]
    assert source["url"].startswith("https://agpo.go.ke/")
    date.fromisoformat(source["last_checked"])  # a real date, not a placeholder
    assert agpo.rules()["ownership"] == {
        **agpo.rules()["ownership"],
        "min_membership_percent": 70,
        "leadership_percent": 100,
    }


def test_categories_are_women_youth_pwd_and_none() -> None:
    assert agpo.category_ids() == ["women", "youth", "pwd", "none"]
    assert agpo.category("pwd")["label"] == "People with disabilities"


def test_pwd_registration_asks_for_the_ncpwd_document() -> None:
    pwd_docs = {doc["id"] for doc in agpo.required_documents("pwd")}
    women_docs = {doc["id"] for doc in agpo.required_documents("women")}
    assert pwd_docs - women_docs == {"ncpwd_registration"}
    assert {"national_id", "business_registration", "tax_compliance"} <= women_docs


def test_every_document_type_in_the_rules_is_a_known_doc_type() -> None:
    docs = agpo.rules()["common_documents"] + [
        doc for category in agpo.rules()["categories"] for doc in category["extra_documents"]
    ]
    for doc in docs:
        assert doc["doc_type"] is None or doc["doc_type"] in DocType.values, doc["id"]


def test_form_specific_documents_only_for_that_form() -> None:
    assert "cr12" not in {doc["id"] for doc in agpo.required_documents("youth")}
    assert "cr12" in {doc["id"] for doc in agpo.required_documents("youth", "limited_company")}


def test_no_category_needs_no_agpo_documents() -> None:
    assert agpo.required_documents("none") == []
    assert agpo.required_documents("") == []


@pytest.mark.parametrize(
    ("category", "reservation", "allowed"),
    [
        ("pwd", "pwd", True),
        ("pwd", "agpo", True),
        ("pwd", "open", True),
        ("pwd", "women", False),
        ("women", "pwd", False),
        ("none", "agpo", False),
        ("none", "open", True),
        ("", "open", True),
        ("pwd", "something_new", False),
        ("pwd", "_about", False),
    ],
)
def test_who_can_bid_on_a_reservation(category: str, reservation: str, allowed: bool) -> None:
    assert agpo.can_bid(category, reservation) is allowed


@pytest.mark.django_db
class TestAgpoApi:
    @pytest.fixture
    def user(self) -> User:
        return User.objects.create_user(email="owner@example.com")

    @pytest.fixture
    def client(self, user: User) -> APIClient:
        client = APIClient()
        client.force_authenticate(user)
        return client

    def test_choosing_pwd_adds_the_ncpwd_document(self, client: APIClient, user: User) -> None:
        response = client.put("/api/access/agpo/", {"agpo_category": "pwd"}, format="json")

        assert response.status_code == 200
        body = response.json()
        assert body["agpo_category"] == "pwd"
        assert "ncpwd_registration" in {doc["id"] for doc in body["required_documents"]}
        assert body["rules"]["source"]["last_checked"]
        user.refresh_from_db()
        assert user.agpo_category == "pwd"

    def test_an_unknown_category_is_refused(self, client: APIClient) -> None:
        response = client.put("/api/access/agpo/", {"agpo_category": "veterans"}, format="json")
        assert response.status_code == 400

    def test_no_category_by_default(self, client: APIClient) -> None:
        assert client.get("/api/access/agpo/").json()["agpo_category"] == "none"

    def test_needs_sign_in(self) -> None:
        assert APIClient().get("/api/access/agpo/").status_code == 401
