"""The whole demo story through the real endpoints, with only the model itself faked.

Every service, view, rule and database write is the real one. The fake model answers each
prompt with what a correct model would read from the dummy documents and the sample pair,
so this proves the parts fit together. It does not prove that a real model reads the files
correctly: scripts/try_extract.py, scripts/try_compare.py and scripts/e2e_demo.py do that.
"""

import hashlib
import json
from datetime import date
from pathlib import Path

import pytest
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from alerts import services as alert_services
from llm import client as llm_client
from llm.prompts_extract import DOCUMENT_PROMPT, TENDER_PROMPT

pytestmark = pytest.mark.django_db

SAMPLES = Path(__file__).resolve().parent.parent / "sample_data"
DOCUMENTS = SAMPLES / "documents"
PAIR = SAMPLES / "tenders" / "mashariki-cleaning"
EXPECTED_DOCUMENTS = json.loads((DOCUMENTS / "expected.json").read_text(encoding="utf-8"))
EXPECTED_PAIR = json.loads((PAIR / "expected.json").read_text(encoding="utf-8"))
TENDER_PDF = (PAIR / EXPECTED_PAIR["tender"]).read_bytes()
ADDENDUM_PDF = (PAIR / EXPECTED_PAIR["addendum"]).read_bytes()
TODAY = date(2026, 10, 5)

MANDATORY = [
    ("Business registration certificate", "business_registration",
     "MR1. Copy of the Certificate of Incorporation or Business Registration Certificate."),
    ("Valid Tax Compliance Certificate", "kra_tax_compliance",
     "MR2. Valid Tax Compliance Certificate issued by the Kenya Revenue Authority."),
    ("Valid AGPO Certificate", "agpo_certificate",
     "MR3. Valid AGPO Certificate in the women category."),
    ("Current CR12", "cr12",
     "MR4. Current CR12 form issued within the last twelve (12) months."),
    ("National ID of each director", "national_id",
     "MR5. Copy of the National Identity Card of each director."),
]  # fmt: skip


def requirement(label: str, doc_type: str, quote: str) -> dict:
    return {
        "label": label,
        "requirement_type": "mandatory_document",
        "required_doc_type": doc_type,
        "mandatory": True,
        "source_quote": quote,
        "page": 1,
    }


TENDER_ANSWER = {
    "title": "Provision of Cleaning and Sanitation Services (SIMULATED)",
    "deadline": EXPECTED_PAIR["old_deadline"],
    "requirements": [requirement(*row) for row in MANDATORY],
    "summary_en": "The county is buying cleaning services. Bids close on 20 October 2026.",
}
ADDENDUM_ANSWER = {
    "title": "Addendum No. 1",
    "deadline": EXPECTED_PAIR["new_deadline"],
    "requirements": [
        requirement(
            "Valid Single Business Permit",
            "business_permit",
            EXPECTED_PAIR["changes"][1]["new_quote"],
        )
    ],
    "summary_en": "The closing date moves to 3 November 2026.",
}


def correct_model(prompt: str, file_bytes: bytes | None, mime: str | None) -> str:
    """What a model that reads everything correctly would answer."""
    if prompt.startswith(DOCUMENT_PROMPT):
        by_hash = {
            hashlib.sha256((DOCUMENTS / name).read_bytes()).hexdigest(): fields
            for name, fields in EXPECTED_DOCUMENTS.items()
        }
        return json.dumps({**by_hash[hashlib.sha256(file_bytes).hexdigest()], "confidence": 0.95})
    if prompt.startswith(TENDER_PROMPT):
        return json.dumps(TENDER_ANSWER if file_bytes == TENDER_PDF else ADDENDUM_ANSWER)
    return json.dumps({"changes": EXPECTED_PAIR["changes"]})  # the compare prompt


@pytest.fixture(autouse=True)
def environment(monkeypatch, settings) -> None:
    settings.GEMINI_API_KEY = "test-key"
    settings.LLM_MODEL = "test-model"
    monkeypatch.setattr(llm_client, "call_model", correct_model)
    monkeypatch.setattr("checks.services.timezone.localdate", lambda: TODAY)
    monkeypatch.setattr(alert_services, "send_later", alert_services.deliver_alert_email)


def post_file(client: APIClient, url: str, name: str, data: bytes):
    file = SimpleUploadedFile(name, data, content_type="application/pdf")
    return client.post(url, {"file": file}, format="multipart")


def test_the_demo_story_end_to_end(django_capture_on_commit_callbacks):
    client = APIClient()

    # 1. Account, consent, five documents confirmed.
    account = client.post(
        "/api/auth/register",
        {"email": "owner@example.com", "password": "Tender-demo-2026"},
        format="json",
    ).json()
    client.credentials(HTTP_AUTHORIZATION=f"Token {account['token']}")
    profile = {"business_name": "Demo Business Ltd", "kra_pin": "P000000000X", "consent": True}
    assert client.put("/api/profile/", profile, format="json").status_code == 200
    for name in EXPECTED_DOCUMENTS:
        document = post_file(client, "/api/documents/", name, (DOCUMENTS / name).read_bytes())
        assert document.status_code == 201
        confirmed = client.patch(
            f"/api/documents/{document.json()['id']}/", {"confirmed": True}, format="json"
        )
        assert confirmed.json()["confirmed"] is True
    assert len(client.get("/api/documents/").json()) == 5

    # 2. Tender uploaded: summary and checklist.
    tender = post_file(client, "/api/tenders/", "tender.pdf", TENDER_PDF).json()
    tender_id = tender["id"]
    assert len(tender["latest_version"]["requirements"]) == 5
    assert client.get(f"/api/tenders/{tender_id}/summary/").json()["summary"]

    # 3. One certificate is expiring before the deadline, with its quote.
    check = client.post(f"/api/tenders/{tender_id}/check/").json()
    status_of = {item["label"]: item["status"] for item in check["items"]}
    assert status_of == {
        "Business registration certificate": "met",
        "Valid Tax Compliance Certificate": "met",
        "Valid AGPO Certificate": "expiring",
        "Current CR12": "met",
        "National ID of each director": "met",
    }
    agpo = next(item for item in check["items"] if item["status"] == "expiring")
    assert agpo["source_quote"] == MANDATORY[2][2] and agpo["expires_on"] == "2026-10-12"
    assert [m["field"] for m in check["mismatches"]] == ["directors"]  # the specimen ID

    # 4. Addendum: version 2, moved deadline and new required document detected.
    with django_capture_on_commit_callbacks(execute=True):
        addendum = post_file(
            client, f"/api/tenders/{tender_id}/versions/", "addendum.pdf", ADDENDUM_PDF
        )
    assert addendum.status_code == 201
    result = addendum.json()
    assert result["created"] is True and result["version_no"] == 2
    assert {c["category"]: c["affects_user"] for c in result["changes"]} == {
        "deadline": True,
        "required_documents": True,
        "specifications_quantities": False,
    }

    # 5. The checklist item flips.
    flips = {flip["label"]: (flip["old_status"], flip["new_status"]) for flip in result["flips"]}
    assert flips == {
        "Valid Tax Compliance Certificate": ("met", "expiring"),
        "Valid Single Business Permit": (None, "missing"),
    }
    assert client.post(f"/api/tenders/{tender_id}/check/").json()["version_no"] == 2

    # 6. The in-app alert exists and the email went out.
    alert = client.get("/api/alerts/").json()[0]
    assert alert["id"] == result["alert_id"] and alert["tender_id"] == tender_id
    assert alert["sent_at"] is not None
    assert "Two changes affect you:" in alert["message"]
    assert mail.outbox[0].to == ["owner@example.com"]

    # 7. The same addendum again creates nothing.
    again = post_file(client, f"/api/tenders/{tender_id}/versions/", "addendum.pdf", ADDENDUM_PDF)
    assert again.status_code == 200 and again.json()["created"] is False
    assert len(client.get(f"/api/tenders/{tender_id}/versions/").json()) == 2
    assert len(client.get(f"/api/tenders/{tender_id}/changes/").json()) == 3
    assert len(client.get("/api/alerts/").json()) == 1
