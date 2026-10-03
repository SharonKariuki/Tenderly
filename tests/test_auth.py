import pytest
from rest_framework.test import APIClient

from accounts.authentication import DEMO_EMAIL
from accounts.models import User

PASSWORD = "a-long-dummy-passphrase-42"

pytestmark = pytest.mark.django_db


def test_register_creates_an_email_user_and_returns_a_token() -> None:
    response = APIClient().post(
        "/api/auth/register", {"email": "Owner@Example.com", "password": PASSWORD}, format="json"
    )

    assert response.status_code == 201
    assert response.json()["email"] == "owner@example.com"
    assert response.json()["token"]
    assert User.objects.get(email="owner@example.com").check_password(PASSWORD)


def test_register_rejects_a_taken_email_in_the_error_format() -> None:
    User.objects.create_user(email="owner@example.com", password=PASSWORD)

    response = APIClient().post(
        "/api/auth/register", {"email": "owner@example.com", "password": PASSWORD}, format="json"
    )

    assert response.status_code == 400
    assert response.json() == {
        "error": {
            "code": "email_taken",
            "message": "email: An account with this email already exists.",
        }
    }


def test_register_rejects_a_weak_password() -> None:
    response = APIClient().post(
        "/api/auth/register", {"email": "owner@example.com", "password": "12345"}, format="json"
    )

    assert response.status_code == 400
    assert response.json()["error"]["message"].startswith("password: ")
    assert not User.objects.exists()


def test_login_returns_a_token_that_opens_a_private_endpoint() -> None:
    User.objects.create_user(email="owner@example.com", password=PASSWORD)
    client = APIClient()

    login = client.post(
        "/api/auth/login", {"email": "owner@example.com", "password": PASSWORD}, format="json"
    )
    client.credentials(HTTP_AUTHORIZATION=f"Token {login.json()['token']}")

    assert login.status_code == 200
    assert client.get("/api/profile/").status_code == 200


def test_login_with_a_wrong_password_is_401() -> None:
    User.objects.create_user(email="owner@example.com", password=PASSWORD)

    response = APIClient().post(
        "/api/auth/login", {"email": "owner@example.com", "password": "wrong"}, format="json"
    )

    assert response.status_code == 401
    assert response.json() == {
        "error": {"code": "invalid_credentials", "message": "Wrong email or password."}
    }


def test_no_token_is_401_in_the_error_format(settings) -> None:
    settings.DEMO_MODE = False

    response = APIClient().get("/api/profile/")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "not_authenticated"


def test_demo_mode_serves_requests_without_a_token_as_the_demo_user(settings) -> None:
    settings.DEMO_MODE = True

    response = APIClient().get("/api/profile/")

    assert response.status_code == 200
    assert User.objects.filter(email=DEMO_EMAIL).count() == 1
