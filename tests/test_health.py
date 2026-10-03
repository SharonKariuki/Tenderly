import pytest
from django.test import Client


@pytest.mark.django_db
def test_health_returns_ok_and_reaches_the_database() -> None:
    response = Client().get("/api/health/")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}


def test_the_root_address_redirects_to_the_docs() -> None:
    response = Client().get("/")

    assert response.status_code == 302
    assert response["Location"] == "/api/docs/"
