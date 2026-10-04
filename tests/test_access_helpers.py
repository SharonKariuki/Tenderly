"""Trusted helpers: invite, permissions, removal, activity log, bid confirmation. Owner: B.

The LLM is faked at llm.client.call_model, as in test_documents_api.
"""

import json
from pathlib import Path

import pytest
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from access.models import Helper, HelperActivity
from accounts.models import User
from documents.models import Document
from llm import client as llm_client
from tenders.models import Tender

pytestmark = pytest.mark.django_db

TCC_PDF = (
    Path(__file__).resolve().parent.parent
    / "sample_data"
    / "documents"
    / "tax_compliance_DUMMY.pdf"
).read_bytes()
TCC_ANSWER = {
    "document_type": "kra_tax_compliance",
    "holder_name": "Demo Business Ltd",
    "kra_pin": "P000000000X",
    "registration_number": None,
    "issued_on": "2025-10-29",
    "expires_on": "2026-10-28",
    "directors": [],
    "confidence": 0.93,
}


@pytest.fixture(autouse=True)
def fake_model(monkeypatch, settings) -> None:
    settings.GEMINI_API_KEY = "test-key"
    settings.LLM_MODEL = "test-model"
    monkeypatch.setattr(llm_client, "call_model", lambda *args: json.dumps(TCC_ANSWER))


@pytest.fixture
def owner() -> User:
    return User.objects.create_user(email="owner@example.com", business_name="Amani Ltd")


@pytest.fixture
def helper_user() -> User:
    return User.objects.create_user(email="helper@example.com")


def signed_in(user: User, acting_for: User | None = None) -> APIClient:
    client = APIClient()
    client.force_authenticate(user)
    if acting_for is not None:
        client.credentials(HTTP_X_ACTING_FOR=str(acting_for.pk))
    return client


def invite(owner: User, permission: str = "view", **extra) -> dict:
    data = {"name": "Wanjiru", "role": "accountant", "email": "helper@example.com"}
    data.update(permission=permission, **extra)
    response = signed_in(owner).post("/api/access/helpers/", data, format="json")
    assert response.status_code == 201, response.json()
    return response.json()


def active_helper(owner: User, helper_user: User, permission: str = "view") -> Helper:
    helper = invite(owner, permission)
    token = Helper.objects.get(pk=helper["id"]).token
    assert (
        signed_in(helper_user).post("/api/access/helpers/accept/", {"token": token}).status_code
        == 200
    )
    return Helper.objects.get(pk=helper["id"])


def upload(client: APIClient):
    file = SimpleUploadedFile("tcc.pdf", TCC_PDF, content_type="application/pdf")
    return client.post("/api/documents/", {"file": file}, format="multipart")


def actions(owner: User) -> list[str]:
    return list(
        HelperActivity.objects.filter(owner=owner)
        .order_by("created_at")
        .values_list("action", flat=True)
    )


class TestInvite:
    def test_invite_by_email_sends_a_link(self, owner: User) -> None:
        body = invite(owner)

        assert body["status"] == "invited"
        assert body["invite_url"].endswith(Helper.objects.get().token)
        assert len(mail.outbox) == 1
        assert mail.outbox[0].to == ["helper@example.com"]
        assert body["invite_url"] in mail.outbox[0].body
        assert actions(owner) == ["invited"]

    def test_invite_by_phone_returns_a_link_to_share(self, owner: User) -> None:
        body = invite(owner, email="", phone="+254 712 345 678")
        assert body["invite_url"] and mail.outbox == []

    def test_a_phone_or_email_is_needed(self, owner: User) -> None:
        response = signed_in(owner).post("/api/access/helpers/", {"name": "Wanjiru"}, format="json")
        assert response.status_code == 400

    def test_accepting_makes_the_helper_active(self, owner: User, helper_user: User) -> None:
        helper = active_helper(owner, helper_user)
        assert helper.status == "active" and helper.helper_user == helper_user
        helping = signed_in(helper_user).get("/api/access/helping/").json()
        assert helping == [
            {
                "id": helper.pk,
                "owner_id": owner.pk,
                "business_name": "Amani Ltd",
                "permission": "view",
            }
        ]

    def test_an_invitation_works_once(self, owner: User, helper_user: User) -> None:
        helper = active_helper(owner, helper_user)
        again = signed_in(helper_user).post("/api/access/helpers/accept/", {"token": helper.token})
        assert again.status_code == 404

    def test_the_owner_cannot_accept_their_own_invitation(self, owner: User) -> None:
        invite(owner)
        token = Helper.objects.get().token
        response = signed_in(owner).post("/api/access/helpers/accept/", {"token": token})
        assert response.status_code == 400


class TestPermissions:
    def test_view_only_helper_sees_documents_and_it_is_logged(
        self, owner: User, helper_user: User
    ) -> None:
        upload(signed_in(owner))
        active_helper(owner, helper_user, "view")
        helper = signed_in(helper_user, acting_for=owner)

        assert len(helper.get("/api/documents/").json()) == 1
        helper.get("/api/documents/")  # viewing again within the hour is not logged twice
        assert actions(owner) == ["invited", "accepted", "viewed_documents"]

    def test_view_only_helper_cannot_upload(self, owner: User, helper_user: User) -> None:
        active_helper(owner, helper_user, "view")
        response = upload(signed_in(helper_user, acting_for=owner))
        assert response.status_code == 403
        assert Document.objects.count() == 0

    def test_upload_helper_uploads_to_the_owner(self, owner: User, helper_user: User) -> None:
        active_helper(owner, helper_user, "upload")
        response = upload(signed_in(helper_user, acting_for=owner))

        assert response.status_code == 201
        assert Document.objects.get().owner == owner
        assert actions(owner)[-1] == "uploaded_document"

    def test_helper_cannot_change_or_delete_the_owners_documents(
        self, owner: User, helper_user: User
    ) -> None:
        doc_id = upload(signed_in(owner)).json()["id"]
        active_helper(owner, helper_user, "prepare")
        helper = signed_in(helper_user, acting_for=owner)
        assert (
            helper.patch(
                f"/api/documents/{doc_id}/", {"confirmed": True}, format="json"
            ).status_code
            == 404
        )
        assert helper.delete(f"/api/documents/{doc_id}/").status_code == 404

    def test_a_stranger_acting_for_an_owner_gets_a_404(self, owner: User) -> None:
        stranger = User.objects.create_user(email="stranger@example.com")
        assert signed_in(stranger, acting_for=owner).get("/api/documents/").status_code == 404

    def test_an_invited_helper_has_no_access_until_they_accept(
        self, owner: User, helper_user: User
    ) -> None:
        invite(owner)
        assert signed_in(helper_user, acting_for=owner).get("/api/documents/").status_code == 404

    def test_the_owner_changes_the_permission(self, owner: User, helper_user: User) -> None:
        helper = active_helper(owner, helper_user, "view")
        response = signed_in(owner).patch(
            f"/api/access/helpers/{helper.pk}/", {"permission": "upload"}, format="json"
        )
        assert response.json()["permission"] == "upload"
        assert upload(signed_in(helper_user, acting_for=owner)).status_code == 201


class TestRemoveAccess:
    def test_remove_access_ends_access_and_keeps_the_log(
        self, owner: User, helper_user: User
    ) -> None:
        helper = active_helper(owner, helper_user, "upload")
        response = signed_in(owner).delete(f"/api/access/helpers/{helper.pk}/")

        assert response.status_code == 200 and response.json()["status"] == "removed"
        assert signed_in(helper_user, acting_for=owner).get("/api/documents/").status_code == 404
        assert signed_in(owner).get("/api/access/helpers/").json() == []
        log = signed_in(owner).get("/api/access/helpers/activity/").json()
        assert [item["action"] for item in log] == ["removed", "accepted", "invited"]
        assert log[0]["helper_name"] == "Wanjiru"

    def test_an_unused_invite_link_stops_working(self, owner: User, helper_user: User) -> None:
        invite(owner)
        helper = Helper.objects.get()
        old_token = helper.token
        signed_in(owner).delete(f"/api/access/helpers/{helper.pk}/")
        response = signed_in(helper_user).post("/api/access/helpers/accept/", {"token": old_token})
        assert response.status_code == 404

    def test_only_the_owner_manages_their_helpers(self, owner: User, helper_user: User) -> None:
        helper = active_helper(owner, helper_user, "prepare")
        assert signed_in(helper_user).delete(f"/api/access/helpers/{helper.pk}/").status_code == 404
        assert signed_in(helper_user).get("/api/access/helpers/activity/").json() == []


class TestBidConfirmation:
    @pytest.fixture
    def tender(self, owner: User) -> Tender:
        return Tender.objects.create(owner=owner, title="Stationery and office supplies")

    def test_prepare_helper_prepares_and_only_the_owner_confirms(
        self, owner: User, helper_user: User, tender: Tender
    ) -> None:
        active_helper(owner, helper_user, "prepare")
        helper = signed_in(helper_user, acting_for=owner)

        prepared = helper.post(f"/api/access/bids/{tender.pk}/prepare/", {"note": "All attached"})
        assert prepared.status_code == 200
        assert prepared.json()["status"] == "prepared"
        assert prepared.json()["prepared_by_name"] == "Wanjiru"

        assert helper.post(f"/api/access/bids/{tender.pk}/confirm/").status_code == 403

        confirmed = signed_in(owner).post(f"/api/access/bids/{tender.pk}/confirm/")
        assert confirmed.status_code == 200 and confirmed.json()["status"] == "confirmed"
        assert actions(owner)[-2:] == ["prepared_bid", "owner_confirmed_bid"]

    def test_upload_helper_cannot_prepare(
        self, owner: User, helper_user: User, tender: Tender
    ) -> None:
        active_helper(owner, helper_user, "upload")
        response = signed_in(helper_user, acting_for=owner).post(
            f"/api/access/bids/{tender.pk}/prepare/"
        )
        assert response.status_code == 403

    def test_a_confirmed_bid_cannot_be_prepared_again(
        self, owner: User, helper_user: User, tender: Tender
    ) -> None:
        active_helper(owner, helper_user, "prepare")
        signed_in(owner).post(f"/api/access/bids/{tender.pk}/confirm/")
        response = signed_in(helper_user, acting_for=owner).post(
            f"/api/access/bids/{tender.pk}/prepare/"
        )
        assert response.status_code == 400

    def test_another_users_tender_is_a_404(self, tender: Tender) -> None:
        stranger = User.objects.create_user(email="stranger@example.com")
        assert signed_in(stranger).post(f"/api/access/bids/{tender.pk}/confirm/").status_code == 404
