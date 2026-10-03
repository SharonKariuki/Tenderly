"""Addendum storage, version history and change log. Owner: C.

Tender extraction (B) and the LLM are faked; the quotes are checked against the real text
layers of the sample pair.
"""

import hashlib
import json
from datetime import datetime
from pathlib import Path

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from accounts.models import User
from core.contracts import Requirement, TenderExtraction
from core.models import StoredFile
from tenders.models import Tender, TenderVersion
from versions import compare, services
from versions.models import TenderChange
from versions.services import merge_requirements, read_text_layer

pytestmark = pytest.mark.django_db

PAIR = Path(__file__).resolve().parent.parent / "sample_data" / "tenders" / "mashariki-cleaning"
EXPECTED = json.loads((PAIR / "expected.json").read_text(encoding="utf-8"))
TENDER_PDF = (PAIR / EXPECTED["tender"]).read_bytes()
ADDENDUM_PDF = (PAIR / EXPECTED["addendum"]).read_bytes()
BASELINE_REQUIREMENTS = [
    {"id": "r1", "label": "Business Registration Certificate", "requirement_type": "other"},
    {"id": "r2", "label": "Valid Tax Compliance Certificate", "requirement_type": "other"},
]


@pytest.fixture
def owner() -> User:
    return User.objects.create_user(email="owner@example.com")


@pytest.fixture
def client(owner: User) -> APIClient:
    api_client = APIClient()
    api_client.force_authenticate(owner)
    return api_client


@pytest.fixture
def tender(owner: User) -> Tender:
    tender = Tender.objects.create(owner=owner, title="Cleaning services")
    stored = StoredFile.objects.create(
        owner=owner,
        filename="tender.pdf",
        mime="application/pdf",
        size=len(TENDER_PDF),
        sha256=hashlib.sha256(TENDER_PDF).hexdigest(),
        data=TENDER_PDF,
    )
    TenderVersion.objects.create(
        tender=tender,
        version_no=1,
        file=stored,
        text_hash="hash-v1",
        deadline=datetime.fromisoformat(EXPECTED["old_deadline"]),
        requirements=BASELINE_REQUIREMENTS,
        summary_en="Cleaning services for county offices.",
    )
    return tender


@pytest.fixture
def extract_calls(monkeypatch) -> list:
    """Stand in for B's extract_tender and for the LLM behind compare_versions."""
    calls = []

    def fake_extract_tender(file_bytes: bytes, mime: str) -> TenderExtraction:
        calls.append(mime)
        return TenderExtraction(
            deadline=datetime.fromisoformat(EXPECTED["new_deadline"]),
            requirements=[
                Requirement(
                    id="r1",
                    label="Valid Single Business Permit",
                    requirement_type="mandatory_document",
                    required_doc_type="business_permit",
                    source_quote=EXPECTED["changes"][1]["new_quote"],
                    page=1,
                )
            ],
            text=read_text_layer(file_bytes, mime),
            text_hash="hash-v2",
        )

    def fake_llm(prompt, schema, file_bytes, mime, cache_key):
        return {"changes": EXPECTED["changes"]}

    monkeypatch.setattr(services, "extract_tender", fake_extract_tender)
    monkeypatch.setattr(compare, "_default_llm", lambda: fake_llm)
    return calls


def upload(client: APIClient, tender: Tender, data: bytes = ADDENDUM_PDF):
    file = SimpleUploadedFile("addendum.pdf", data, content_type="application/pdf")
    return client.post(f"/api/tenders/{tender.pk}/versions/", {"file": file}, format="multipart")


def test_addendum_creates_version_two_with_its_changes(client, tender, extract_calls):
    response = upload(client, tender)

    assert response.status_code == 201
    body = response.json()
    assert body["created"] is True
    assert body["version_no"] == 2
    assert [change["category"] for change in body["changes"]] == [
        "deadline",
        "required_documents",
        "specifications_quantities",
    ]
    assert body["check"]["version_no"] == 2
    assert body["alert_id"] is not None

    tender.refresh_from_db()
    assert tender.current_version == 2
    assert TenderChange.objects.filter(tender=tender).count() == 3


def test_new_version_carries_requirements_forward_and_baseline_is_untouched(
    client, tender, extract_calls
):
    upload(client, tender)

    first, second = tender.versions.order_by("version_no")
    assert first.requirements == BASELINE_REQUIREMENTS  # R7
    assert first.deadline == datetime.fromisoformat(EXPECTED["old_deadline"])
    assert second.deadline == datetime.fromisoformat(EXPECTED["new_deadline"])
    assert [item["id"] for item in second.requirements] == ["r1", "r2", "v2-r1"]
    assert second.requirements[-1]["required_doc_type"] == "business_permit"
    assert second.summary_en == first.summary_en


def test_same_addendum_twice_returns_200_and_no_new_version(client, tender, extract_calls):
    first = upload(client, tender)
    second = upload(client, tender)

    assert first.status_code == 201
    assert second.status_code == 200  # R9
    assert second.json()["created"] is False
    assert second.json()["version_no"] == 2
    assert len(second.json()["changes"]) == 3
    assert tender.versions.count() == 2
    assert TenderChange.objects.count() == 3
    assert len(extract_calls) == 1  # the duplicate never reached extraction


def test_a_different_file_with_the_same_text_creates_nothing(client, tender, extract_calls):
    upload(client, tender)

    response = upload(client, tender, ADDENDUM_PDF + b"\n% rescanned copy")

    assert response.status_code == 200
    assert tender.versions.count() == 2


def test_uploading_the_original_tender_again_creates_nothing(client, tender, extract_calls):
    response = upload(client, tender, TENDER_PDF)

    assert response.status_code == 200
    assert response.json() == {
        "created": False,
        "version_no": 1,
        "changes": [],
        "check": None,
        "flips": [],
        "alert_id": None,
    }
    assert extract_calls == []


def test_version_history_and_change_log(client, tender, extract_calls):
    upload(client, tender)

    versions = client.get(f"/api/tenders/{tender.pk}/versions/").json()
    changes = client.get(f"/api/tenders/{tender.pk}/changes/").json()

    assert [version["version_no"] for version in versions] == [1, 2]
    assert versions[1]["source"] == "upload"
    assert versions[1]["deadline"].startswith("2026-11-03T10:00:00")
    assert changes[0]["from_version"] == 1 and changes[0]["to_version"] == 2
    assert changes[0]["category"] == "deadline"
    assert changes[0]["old_quote"] == EXPECTED["changes"][0]["old_quote"]  # R5
    assert changes[1]["old_quote"] == ""
    assert set(changes[0]) == {
        "id",
        "from_version",
        "to_version",
        "category",
        "old_quote",
        "new_quote",
        "affects_user",
        "explanation",
    }


def test_another_users_tender_is_not_reachable(tender, extract_calls):
    stranger = APIClient()
    stranger.force_authenticate(User.objects.create_user(email="other@example.com"))

    assert stranger.get(f"/api/tenders/{tender.pk}/versions/").status_code == 404  # R19
    assert stranger.get(f"/api/tenders/{tender.pk}/changes/").status_code == 404
    assert upload(stranger, tender).status_code == 404
    assert tender.versions.count() == 1


def test_version_endpoints_are_private(settings, tender):
    settings.DEMO_MODE = False

    assert APIClient().get(f"/api/tenders/{tender.pk}/versions/").status_code == 401
    assert APIClient().post(f"/api/tenders/{tender.pk}/versions/").status_code == 401
    assert APIClient().get(f"/api/tenders/{tender.pk}/changes/").status_code == 401


def test_upload_needs_a_file_within_the_size_cap(client, tender, extract_calls, settings):
    missing = client.post(f"/api/tenders/{tender.pk}/versions/", {}, format="multipart")
    settings.MAX_UPLOAD_MB = 0
    too_large = upload(client, tender)

    assert missing.status_code == 400
    assert too_large.status_code == 400
    assert too_large.json()["error"]["code"] == "file_too_large"
    assert tender.versions.count() == 1


def test_merge_requirements_skips_a_requirement_the_tender_already_has():
    added = [
        Requirement(id="r1", label="valid  tax compliance certificate", requirement_type="other"),
        Requirement(id="r2", label="Bank statements", requirement_type="financial"),
    ]

    merged = merge_requirements(BASELINE_REQUIREMENTS, added, 3)

    assert [item["id"] for item in merged] == ["r1", "r2", "v3-r2"]


def test_text_layer_is_empty_for_images_and_broken_files():
    assert "MASHARIKI COUNTY GOVERNMENT" in read_text_layer(TENDER_PDF, "application/pdf")
    assert read_text_layer(b"not a pdf", "application/pdf") == ""
    assert read_text_layer(b"\x89PNG", "image/png") == ""
