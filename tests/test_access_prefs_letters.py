"""Accessibility preferences and access support letters. Owner: B."""

import pytest
from rest_framework.test import APIClient

from access.models import AccessRequest
from accounts.models import User

pytestmark = pytest.mark.django_db

EVENT = {
    "event_key": "tender-4-briefing",
    "event_kind": "briefing",
    "event_title": "Stationery and office supplies",
    "event_date": "2026-10-14T10:00:00+03:00",
    "venue": "Afya House, 3rd floor boardroom",
    "entity_name": "State Department of Health",
    "tender_reference": "SDOH/2026/RFQ/034",
    "needs": ["wheelchair_access", "sign_language_interpreter"],
}


@pytest.fixture
def user() -> User:
    return User.objects.create_user(
        email="owner@example.com", first_name="Amina", last_name="Otieno", business_name="Amani Ltd"
    )


@pytest.fixture
def client(user: User) -> APIClient:
    client = APIClient()
    client.force_authenticate(user)
    return client


def other_client() -> APIClient:
    client = APIClient()
    client.force_authenticate(User.objects.create_user(email="other@example.com"))
    return client


class TestPrefs:
    def test_defaults(self, client: APIClient) -> None:
        body = client.get("/api/access/prefs/").json()
        assert body == {
            "text_size": "standard",
            "high_contrast": False,
            "reduce_motion": False,
            "dyslexia_spacing": False,
            "prompt_seen": False,
            "updated_at": body["updated_at"],
        }

    def test_partial_update_keeps_the_rest(self, client: APIClient) -> None:
        client.put("/api/access/prefs/", {"high_contrast": True}, format="json")
        response = client.put("/api/access/prefs/", {"text_size": "larger"}, format="json")

        assert response.status_code == 200
        assert response.json()["high_contrast"] is True
        assert response.json()["text_size"] == "larger"

    def test_unknown_text_size_is_refused(self, client: APIClient) -> None:
        response = client.put("/api/access/prefs/", {"text_size": "huge"}, format="json")
        assert response.status_code == 400

    def test_each_user_has_their_own(self, client: APIClient) -> None:
        client.put("/api/access/prefs/", {"reduce_motion": True}, format="json")
        assert other_client().get("/api/access/prefs/").json()["reduce_motion"] is False


class TestLetters:
    def test_drafts_a_polite_letter_with_only_the_chosen_needs(self, client: APIClient) -> None:
        response = client.post("/api/access/letters/", EVENT, format="json")

        assert response.status_code == 201
        letter = response.json()["letter_text"]
        assert letter.startswith("To: State Department of Health")
        assert "Dear Sir or Madam," in letter
        assert "tender briefing on 14 October 2026, at 10:00 at Afya House" in letter
        assert "(SDOH/2026/RFQ/034)" in letter
        assert "Kenyan Sign Language interpreter" in letter
        assert "wheelchair" in letter
        assert "remotely" not in letter
        assert "My name is Amina Otieno, of Amani Ltd." in letter
        assert letter.rstrip().endswith("Amina Otieno\nAmani Ltd\nowner@example.com")
        assert "—" not in letter and "–" not in letter  # no em or en dashes

    def test_kiswahili_letter(self, client: APIClient) -> None:
        response = client.post("/api/access/letters/", {**EVENT, "language": "sw"}, format="json")
        letter = response.json()["letter_text"]
        assert "Kwa anayehusika," in letter
        assert "14 Oktoba 2026" in letter
        assert "Mkalimani wa Lugha ya Ishara ya Kenya." in letter

    def test_a_need_in_the_owners_own_words(self, client: APIClient) -> None:
        response = client.post(
            "/api/access/letters/",
            {**EVENT, "needs": [], "other_need": "A seat near the front, please."},
            format="json",
        )
        assert response.status_code == 201
        assert "- A seat near the front, please." in response.json()["letter_text"]

    def test_at_least_one_need(self, client: APIClient) -> None:
        response = client.post("/api/access/letters/", {**EVENT, "needs": []}, format="json")
        assert response.status_code == 400

    def test_asking_again_for_the_same_event_replaces_the_draft(self, client: APIClient) -> None:
        client.post("/api/access/letters/", EVENT, format="json")
        response = client.post(
            "/api/access/letters/", {**EVENT, "needs": ["remote_attendance"]}, format="json"
        )
        assert response.status_code == 200
        assert AccessRequest.objects.count() == 1
        assert "remotely" in response.json()["letter_text"]

    def test_the_owner_edits_the_letter(self, client: APIClient) -> None:
        letter_id = client.post("/api/access/letters/", EVENT, format="json").json()["id"]
        response = client.patch(
            f"/api/access/letters/{letter_id}/",
            {"letter_text": "My own words.", "entity_name": "Changed"},
            format="json",
        )
        assert response.status_code == 200
        assert response.json()["letter_text"] == "My own words."
        assert response.json()["entity_name"] == "State Department of Health"  # read only

    def test_an_empty_letter_is_refused(self, client: APIClient) -> None:
        letter_id = client.post("/api/access/letters/", EVENT, format="json").json()["id"]
        response = client.patch(
            f"/api/access/letters/{letter_id}/", {"letter_text": "  "}, format="json"
        )
        assert response.status_code == 400

    def test_list_shows_which_events_have_support_requested(self, client: APIClient) -> None:
        client.post("/api/access/letters/", EVENT, format="json")
        keys = [item["event_key"] for item in client.get("/api/access/letters/").json()]
        assert keys == ["tender-4-briefing"]

    def test_another_users_letter_is_a_404(self, client: APIClient) -> None:
        letter_id = client.post("/api/access/letters/", EVENT, format="json").json()["id"]
        other = other_client()
        assert other.get(f"/api/access/letters/{letter_id}/").status_code == 404
        assert other.get("/api/access/letters/").json() == []


def test_delete_my_data_removes_access_rows(client: APIClient) -> None:
    client.post("/api/access/letters/", EVENT, format="json")
    client.post("/api/access/helpers/", {"name": "Wanjiru", "phone": "0712345678"}, format="json")

    assert client.delete("/api/me/data/").status_code == 200
    assert client.get("/api/access/letters/").json() == []
    assert client.get("/api/access/helpers/").json() == []
