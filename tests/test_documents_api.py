"""Documents API: upload with extraction, list, correct, confirm, delete. Owner: B.

The LLM is faked at llm.client.call_model, so everything else is the real code path.
"""

import json
from datetime import date
from pathlib import Path

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from accounts.models import User
from core.models import LLMCache, StoredFile
from documents.models import Document
from documents.services import DocumentOutput, to_extracted
from llm import client as llm_client

pytestmark = pytest.mark.django_db

SAMPLES = Path(__file__).resolve().parent.parent / "sample_data" / "documents"
TCC_PDF = (SAMPLES / "tax_compliance_DUMMY.pdf").read_bytes()
TCC_ANSWER = {
    "document_type": "kra_tax_compliance",
    "holder_name": "Demo Business Ltd",
    "kra_pin": "p000000000x",
    "registration_number": None,
    "issued_on": "2025-10-29",
    "expires_on": "28 October 2026",
    "directors": [],
    "confidence": 0.93,
}


@pytest.fixture
def owner() -> User:
    return User.objects.create_user(email="owner@example.com")


@pytest.fixture
def client(owner: User) -> APIClient:
    api_client = APIClient()
    api_client.force_authenticate(owner)
    return api_client


@pytest.fixture
def model_calls(monkeypatch, settings) -> list:
    """Fake the model itself. The answer can be changed through model_calls.answer."""
    settings.GEMINI_API_KEY = "test-key"
    settings.LLM_MODEL = "test-model"

    class Calls(list):
        answer: object = TCC_ANSWER

    calls = Calls()

    def fake_call_model(prompt, file_bytes, mime):
        calls.append(mime)
        if isinstance(calls.answer, Exception):
            raise calls.answer
        return json.dumps(calls.answer)

    monkeypatch.setattr(llm_client, "call_model", fake_call_model)
    monkeypatch.setattr(llm_client.time, "sleep", lambda seconds: None)
    return calls


def upload(client: APIClient, data: bytes = TCC_PDF, mime: str = "application/pdf"):
    file = SimpleUploadedFile("tcc_dummy.pdf", data, content_type=mime)
    return client.post("/api/documents/", {"file": file}, format="multipart")


def test_upload_extracts_and_returns_the_agreed_shape(client, owner, model_calls):
    response = upload(client)

    assert response.status_code == 201
    body = response.json()
    assert body == {
        "id": body["id"],
        "doc_type": "kra_tax_compliance",
        "filename": "tcc_dummy.pdf",
        "extracted": {
            "holder_name": "Demo Business Ltd",
            "kra_pin": "P000000000X",
            "registration_number": None,
            "directors": [],
        },
        "confidence": 0.93,
        "needs_review": False,
        "issued_on": "2025-10-29",
        "expires_on": "2026-10-28",
        "confirmed": False,  # R2: only the user confirms
        "created_at": body["created_at"],
    }
    stored = StoredFile.objects.get()
    assert stored.owner == owner and stored.size == len(TCC_PDF) and bytes(stored.data) == TCC_PDF


def test_low_confidence_needs_review_and_missing_fields_stay_null(client, model_calls):
    model_calls.answer = {"document_type": "other", "confidence": 0.4}

    body = upload(client).json()

    assert body["needs_review"] is True  # R4
    assert body["expires_on"] is None and body["extracted"]["holder_name"] is None


def test_the_same_file_is_read_by_the_model_once(client, model_calls):
    upload(client)
    upload(client)

    assert len(model_calls) == 1  # R11
    assert Document.objects.count() == 2
    assert LLMCache.objects.get().task == "extract_document"


def test_ai_failure_is_a_502_and_stores_nothing(client, model_calls):
    model_calls.answer = ConnectionError("down")

    response = upload(client)

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "ai_failure"
    assert len(model_calls) == 3  # R17: two retries
    assert not Document.objects.exists() and not StoredFile.objects.exists()


def test_wrong_type_and_oversized_files_are_rejected(client, model_calls, settings):
    assert upload(client, b"hello", "text/plain").json()["error"]["code"] == "unsupported_file_type"
    settings.MAX_UPLOAD_MB = 0
    assert upload(client).json()["error"]["code"] == "file_too_large"
    assert client.post("/api/documents/", {}, format="multipart").status_code == 400
    assert model_calls == []


def test_list_shows_only_her_documents(client, model_calls):
    upload(client)
    other = APIClient()
    other.force_authenticate(User.objects.create_user(email="other@example.com"))

    assert len(client.get("/api/documents/").json()) == 1
    assert other.get("/api/documents/").json() == []  # R19


def test_patch_corrects_fields_and_confirms(client, model_calls):
    model_calls.answer = {**TCC_ANSWER, "confidence": 0.5}
    document_id = upload(client).json()["id"]

    response = client.patch(
        f"/api/documents/{document_id}/",
        {"expires_on": "2026-11-30", "extracted": {"kra_pin": "a123456789b"}, "confirmed": True},
        format="json",
    )

    assert response.status_code == 200
    body = response.json()
    assert body["expires_on"] == "2026-11-30" and body["confirmed"] is True
    assert body["needs_review"] is False
    assert body["extracted"]["kra_pin"] == "A123456789B"
    assert body["extracted"]["holder_name"] == "Demo Business Ltd"  # untouched fields stay


def test_patch_rejects_a_bad_date_and_an_unknown_type(client, model_calls):
    document_id = upload(client).json()["id"]

    assert (
        client.patch(
            f"/api/documents/{document_id}/", {"expires_on": "soon"}, format="json"
        ).status_code
        == 400
    )
    assert (
        client.patch(
            f"/api/documents/{document_id}/", {"doc_type": "passport"}, format="json"
        ).status_code
        == 400
    )


def test_delete_removes_the_document_and_its_file(client, model_calls):
    document_id = upload(client).json()["id"]

    assert client.delete(f"/api/documents/{document_id}/").status_code == 204
    assert not Document.objects.exists() and not StoredFile.objects.exists()


def test_another_user_cannot_change_or_delete_her_document(client, model_calls):
    document_id = upload(client).json()["id"]
    other = APIClient()
    other.force_authenticate(User.objects.create_user(email="other@example.com"))

    assert (
        other.patch(
            f"/api/documents/{document_id}/", {"confirmed": True}, format="json"
        ).status_code
        == 404
    )
    assert other.delete(f"/api/documents/{document_id}/").status_code == 404
    assert Document.objects.get().confirmed is False


def test_an_untidy_answer_is_read_without_guessing():
    output = DocumentOutput.model_validate(
        {"document_type": "passport", "directors": None, "confidence": 92}
    )

    assert output.document_type == "other"  # R13: outside the enum
    assert output.directors == [] and output.confidence == 0.92
    assert DocumentOutput.model_validate({"confidence": "high"}).confidence == 0


def test_to_extracted_never_guesses():
    extracted = to_extracted(
        DocumentOutput(
            document_type="agpo_certificate",
            holder_name="  ",
            issued_on="2024-10-13",
            expires_on="next year",
            directors=["  Wanjiru Kamau ", ""],
            confidence=0.95,
        )
    )

    assert extracted.holder_name is None
    assert extracted.issued_on == date(2024, 10, 13)
    assert extracted.expires_on is None and extracted.needs_review is True  # unreadable date
    assert extracted.directors == ["Wanjiru Kamau"]
