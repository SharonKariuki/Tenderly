"""Tenders API: upload with extraction, list, detail and summary. Owner: B.

The LLM is faked at llm.client.call_model; the quotes are checked against the real text
layer of the sample tender.
"""

import json
from datetime import datetime
from pathlib import Path

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from accounts.models import User
from core.models import StoredFile
from llm import client as llm_client
from rules.dates import NAIROBI, parse_deadline
from tenders.models import Tender, TenderVersion
from tenders import services as tender_services
from tenders.services import (
    RequirementOutput,
    TenderOutput,
    extract_tender,
    kept_requirements,
    text_hash,
)

pytestmark = pytest.mark.django_db

PAIR = Path(__file__).resolve().parent.parent / "sample_data" / "tenders" / "mashariki-cleaning"
TENDER_PDF = (PAIR / "tender_SIMULATED.pdf").read_bytes()
TCC_QUOTE = "MR2. Valid Tax Compliance Certificate issued by the Kenya Revenue Authority."
TENDER_ANSWER = {
    "title": "Provision of Cleaning and Sanitation Services for County Offices",
    "published_on": None,
    "deadline": "2026-10-20T10:00",
    "requirements": [
        {
            "label": "Valid Tax Compliance Certificate",
            "requirement_type": "mandatory_document",
            "required_doc_type": "kra_tax_compliance",
            "mandatory": True,
            "source_quote": TCC_QUOTE,
            "page": 1,
        },
        {
            "label": "Performance bond",
            "requirement_type": "financial",
            "required_doc_type": None,
            "mandatory": True,
            "source_quote": "Bidders must provide a performance bond of ten per cent.",
            "page": 2,
        },
    ],
    "summary_en": "The county is buying cleaning services. Bids close on 20 October 2026.",
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
    settings.GEMINI_API_KEY = "test-key"
    settings.LLM_MODEL = "test-model"

    class Calls(list):
        answer: object = TENDER_ANSWER

    calls = Calls()

    def fake_call_model(prompt, file_bytes, mime):
        calls.append(mime)
        return json.dumps(calls.answer)

    monkeypatch.setattr(llm_client, "call_model", fake_call_model)
    monkeypatch.setattr(llm_client.time, "sleep", lambda seconds: None)
    return calls


def upload(client: APIClient, data: bytes = TENDER_PDF, mime: str = "application/pdf"):
    file = SimpleUploadedFile("tender.pdf", data, content_type=mime)
    return client.post("/api/tenders/", {"file": file}, format="multipart")


def test_upload_creates_the_tender_and_version_one(client, owner, model_calls):
    response = upload(client)

    assert response.status_code == 201
    body = response.json()
    assert body["title"] == TENDER_ANSWER["title"] and body["current_version"] == 1
    version = body["latest_version"]
    assert version["version_no"] == 1 and version["source"] == "upload"
    assert version["deadline"].startswith("2026-10-20T10:00:00")
    assert version["summary_en"] == TENDER_ANSWER["summary_en"]
    assert set(body) == {"id", "title", "current_version", "created_at", "latest_version"}

    stored = TenderVersion.objects.get()
    assert stored.tender.owner == owner
    assert stored.deadline == datetime(2026, 10, 20, 10, 0, tzinfo=NAIROBI)
    assert len(stored.text_hash) == 64
    assert bytes(stored.file.data) == TENDER_PDF


def test_a_requirement_whose_quote_is_not_in_the_tender_is_dropped(client, model_calls):
    requirements = upload(client).json()["latest_version"]["requirements"]

    assert requirements == [
        {
            "id": "r1",
            "label": "Valid Tax Compliance Certificate",
            "requirement_type": "mandatory_document",
            "required_doc_type": "kra_tax_compliance",
            "mandatory": True,
            "source_quote": TCC_QUOTE,
            "page": 1,
        }
    ]  # R5: the invented performance bond is gone


def test_a_file_with_nothing_to_check_is_a_422_and_stores_nothing(client, model_calls):
    model_calls.answer = {"title": "Letter", "requirements": [], "summary_en": "A letter."}

    response = upload(client)

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "unreadable_tender"
    assert not Tender.objects.exists() and not StoredFile.objects.exists()


def test_wrong_file_type_is_rejected_before_the_model(client, model_calls):
    assert upload(client, b"hello", "text/plain").status_code == 400
    assert model_calls == []


def test_list_and_detail_show_only_her_tenders(client, model_calls):
    tender_id = upload(client).json()["id"]
    other = APIClient()
    other.force_authenticate(User.objects.create_user(email="other@example.com"))

    assert client.get("/api/tenders/").json() == [
        {"id": tender_id, "title": TENDER_ANSWER["title"], "current_version": 1}
    ]
    assert client.get(f"/api/tenders/{tender_id}/").json()["id"] == tender_id
    assert other.get("/api/tenders/").json() == []  # R19
    assert other.get(f"/api/tenders/{tender_id}/").status_code == 404
    assert other.get(f"/api/tenders/{tender_id}/summary/").status_code == 404


def test_summary_supports_english_and_cached_kiswahili(client, model_calls, monkeypatch):
    tender_id = upload(client).json()["id"]
    english = {
        "tender_id": tender_id,
        "version_no": 1,
        "lang": "en",
        "summary": TENDER_ANSWER["summary_en"],
        "needs_human_review": False,
    }
    calls = []

    def translate(prompt, schema, cache_key=None):
        calls.append((prompt, cache_key))
        return {"summary": "Kaunti inanunua huduma za usafi."}

    monkeypatch.setattr(tender_services, "generate_json", translate)

    assert client.get(f"/api/tenders/{tender_id}/summary/").json() == english
    kiswahili = client.get(f"/api/tenders/{tender_id}/summary/?lang=sw").json()
    assert kiswahili == {
        **english,
        "lang": "sw",
        "summary": "Kaunti inanunua huduma za usafi.",
        "needs_human_review": True,
    }
    # Stored on the version after first generation; repeat requests make no model call.
    assert client.get(f"/api/tenders/{tender_id}/summary/?lang=sw").json() == kiswahili
    assert len(calls) == 1 and calls[0][1].startswith("summary_sw:v1:")
    assert client.get(f"/api/tenders/{tender_id}/summary/?lang=fr").status_code == 400


def test_extract_tender_returns_the_text_layer_and_reads_the_file_once(model_calls):
    first = extract_tender(TENDER_PDF, "application/pdf")
    second = extract_tender(TENDER_PDF, "application/pdf")

    assert "MR2. Valid Tax Compliance Certificate" in first.text
    assert first.text_hash == second.text_hash
    assert len(model_calls) == 1  # R11


def test_a_scan_keeps_its_requirements_because_there_is_no_text_to_check():
    proposed = [RequirementOutput(label="Permit", source_quote="Attach a valid permit.")]

    assert [item.id for item in kept_requirements(proposed, "")] == ["r1"]
    assert kept_requirements(proposed, "A tender about something else.") == []


def test_an_untidy_requirement_is_read_without_guessing():
    output = TenderOutput.model_validate(
        {
            "requirements": [
                {
                    "label": "Permit",
                    "requirement_type": "licence",
                    "required_doc_type": "permit",
                    "mandatory": None,
                    "page": "two",
                }
            ],
            "summary_en": None,
        }
    )

    requirement = output.requirements[0]
    assert requirement.requirement_type == "other" and requirement.required_doc_type is None
    assert requirement.mandatory is True and requirement.page is None
    assert output.summary_en == ""
    assert TenderOutput.model_validate({"requirements": None}).requirements == []


def test_text_hash_ignores_spacing_and_falls_back_to_the_file():
    assert text_hash("Closing  date\n20 October", b"a") == text_hash(
        "closing date 20 October", b"b"
    )
    assert text_hash("", b"a") != text_hash("", b"b")


def test_parse_deadline_takes_bare_text_as_nairobi_time():
    assert parse_deadline("2026-10-20T10:00") == datetime(2026, 10, 20, 10, 0, tzinfo=NAIROBI)
    assert parse_deadline("20 October 2026 10:00") == datetime(2026, 10, 20, 10, 0, tzinfo=NAIROBI)
    assert parse_deadline("2026-10-20T10:00:00+03:00").utcoffset().total_seconds() == 10800
    assert parse_deadline("soon") is None and parse_deadline(None) is None
