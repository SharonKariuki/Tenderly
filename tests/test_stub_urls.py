"""Every endpoint of the API contract (sprint plan section 4) that is still a stub is
registered and answers. Real endpoints have their own test files."""

import pytest
from rest_framework.test import APIClient

from accounts.models import User

CONTRACT = [
    ("get", "/api/profile/", 200),
    ("put", "/api/profile/", 200),
    ("delete", "/api/me/data/", 200),
    ("get", "/api/documents/", 200),
    ("get", "/api/tenders/", 200),
    ("get", "/api/alerts/", 200),
    ("get", "/api/insight/?doc_type=cr12", 200),
]

pytestmark = pytest.mark.django_db


@pytest.fixture
def client() -> APIClient:
    api_client = APIClient()
    api_client.force_authenticate(User.objects.create_user(email="owner@example.com"))
    return api_client


@pytest.mark.parametrize(("method", "url", "expected"), CONTRACT)
def test_endpoint_answers_for_a_signed_in_user(
    client: APIClient, method: str, url: str, expected: int
) -> None:
    assert getattr(client, method)(url).status_code == expected


@pytest.mark.parametrize(("method", "url", "expected"), CONTRACT)
def test_endpoint_is_private(settings, method: str, url: str, expected: int) -> None:
    settings.DEMO_MODE = False

    assert getattr(APIClient(), method)(url).status_code == 401


def test_unknown_url_is_404(client: APIClient) -> None:
    assert client.get("/api/nope/").status_code == 404


def test_docs_and_schema_are_public() -> None:
    assert APIClient().get("/api/docs/").status_code == 200
    assert APIClient().get("/api/schema/").status_code == 200
