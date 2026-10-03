"""DELETE /api/me/data/: every row and file of the user goes; nobody else's does."""

import pytest
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from accounts.models import User
from alerts.models import Alert
from checks.models import Check
from core.models import LLMCache, StoredFile
from documents.models import Document
from tenders.models import Tender, TenderVersion
from versions.models import TenderChange

pytestmark = pytest.mark.django_db

MODELS = [StoredFile, Document, Tender, TenderVersion, TenderChange, Check, Alert]


def fill(owner: User, sha256: str) -> None:
    """One of everything a user can own."""

    def stored_file() -> StoredFile:
        return StoredFile.objects.create(
            owner=owner,
            filename="dummy.pdf",
            mime="application/pdf",
            size=1,
            sha256=sha256,
            data=b"x",
        )

    Document.objects.create(owner=owner, doc_type="cr12", file=stored_file(), confirmed=True)
    tender = Tender.objects.create(owner=owner, title="Sample", current_version=2)
    first, second = (
        TenderVersion.objects.create(
            tender=tender, version_no=number, file=stored_file(), text_hash=str(number) * 64
        )
        for number in (1, 2)
    )
    change = TenderChange.objects.create(
        tender=tender, from_version=first, to_version=second, category="deadline"
    )
    Check.objects.create(tender=tender, version_no=2, owner=owner, result={})
    alert = Alert.objects.create(owner=owner, tender=tender, message="The deadline moved.")
    alert.changes.add(change)
    LLMCache.objects.create(cache_key=f"{sha256}:extract_document:v1", task="extract", result={})


@pytest.fixture
def user() -> User:
    return User.objects.create_user(
        email="owner@example.com",
        password="a-long-dummy-passphrase-42",
        business_name="Demo Business Ltd",
        kra_pin="P000000000X",
        reg_number="PVT-DEMO0001",
        agpo_category="women",
        consent_at=timezone.now(),
    )


@pytest.fixture
def client(user: User) -> APIClient:
    api_client = APIClient()
    api_client.force_authenticate(user)
    return api_client


def test_everything_the_user_owns_is_deleted(client: APIClient, user: User) -> None:
    fill(user, "a" * 64)

    response = client.delete("/api/me/data/")

    assert response.status_code == 200
    assert response.json() == {"deleted": {"documents": 1, "tenders": 1, "alerts": 1, "files": 3}}
    for model in MODELS:
        assert not model.objects.exists(), model.__name__
    assert not LLMCache.objects.exists()


def test_another_users_data_is_untouched(client: APIClient, user: User) -> None:
    # R19.
    other = User.objects.create_user(email="other@example.com", business_name="Someone Else Ltd")
    fill(user, "a" * 64)
    fill(other, "b" * 64)
    before = {model: model.objects.count() // 2 for model in MODELS}

    client.delete("/api/me/data/")

    for model in MODELS:
        assert model.objects.count() == before[model], model.__name__
    assert StoredFile.objects.filter(owner=other).count() == 3
    assert LLMCache.objects.get().cache_key.startswith("b")
    other.refresh_from_db()
    assert other.business_name == "Someone Else Ltd"


def test_the_profile_is_emptied_but_the_login_stays(client: APIClient, user: User) -> None:
    token = Token.objects.create(user=user)

    client.delete("/api/me/data/")

    user.refresh_from_db()
    assert (user.business_name, user.kra_pin, user.reg_number, user.agpo_category) == ("",) * 4
    assert user.consent_at is None
    assert user.email == "owner@example.com"
    assert user.check_password("a-long-dummy-passphrase-42")
    assert Token.objects.filter(pk=token.pk).exists()


def test_deleting_with_nothing_stored_is_fine(client: APIClient) -> None:
    response = client.delete("/api/me/data/")

    assert response.status_code == 200
    assert response.json() == {"deleted": {"documents": 0, "tenders": 0, "alerts": 0, "files": 0}}


def test_the_endpoint_is_private(settings) -> None:
    settings.DEMO_MODE = False

    assert APIClient().delete("/api/me/data/").status_code == 401
