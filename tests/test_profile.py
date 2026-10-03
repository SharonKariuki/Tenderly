import pytest
from rest_framework.test import APIClient

from accounts.models import User

pytestmark = pytest.mark.django_db


@pytest.fixture
def user() -> User:
    return User.objects.create_user(email="owner@example.com", business_name="Demo Business Ltd")


@pytest.fixture
def client(user: User) -> APIClient:
    api_client = APIClient()
    api_client.force_authenticate(user)
    return api_client


def test_get_returns_the_signed_in_users_profile(client: APIClient) -> None:
    User.objects.create_user(email="other@example.com", business_name="Someone Else Ltd")

    response = client.get("/api/profile/")

    assert response.status_code == 200
    assert response.json() == {
        "email": "owner@example.com",
        "business_name": "Demo Business Ltd",
        "kra_pin": "",
        "reg_number": "",
        "agpo_category": "",
        "preferred_language": "en",
        "consent_at": None,
    }


def test_put_saves_the_profile(client: APIClient, user: User) -> None:
    response = client.put(
        "/api/profile/",
        {
            "business_name": "Demo Traders Ltd",
            "kra_pin": "p000000000x",
            "reg_number": "PVT-DEMO0001",
            "agpo_category": "women",
            "preferred_language": "sw",
        },
        format="json",
    )

    user.refresh_from_db()
    assert response.status_code == 200
    assert user.business_name == "Demo Traders Ltd"
    assert user.kra_pin == "P000000000X"  # stored uppercase (R12)
    assert user.preferred_language == "sw"


def test_consent_is_recorded_once(client: APIClient, user: User) -> None:
    first = client.put("/api/profile/", {"consent": True}, format="json").json()["consent_at"]
    second = client.put("/api/profile/", {"consent": True}, format="json").json()["consent_at"]

    assert first is not None
    assert second == first


def test_email_cannot_be_changed_through_the_profile(client: APIClient, user: User) -> None:
    client.put("/api/profile/", {"email": "new@example.com"}, format="json")

    user.refresh_from_db()
    assert user.email == "owner@example.com"


def test_a_malformed_kra_pin_is_rejected_in_the_error_format(client: APIClient) -> None:
    response = client.put("/api/profile/", {"kra_pin": "12345"}, format="json")

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "invalid_kra_pin"


def test_an_unknown_language_is_rejected(client: APIClient) -> None:
    assert client.put("/api/profile/", {"preferred_language": "fr"}, format="json").status_code == (
        400
    )
