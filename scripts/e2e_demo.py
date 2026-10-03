"""Run the 3-minute demo story against a running API and report each step. Owner: C.

The seven steps are the sprint acceptance test (sprint plan, Appendix D):
  1. account registered and 5 documents confirmed
  2. tender uploaded, summary and checklist returned
  3. one certificate flagged expiring before the deadline, with its source quote
  4. addendum uploaded, version 2 created, new required document and moved deadline detected
  5. the checklist item flips
  6. in-app alert exists and the email is sent
  7. uploading the same addendum again creates nothing new

Usage:
  python scripts/e2e_demo.py --base-url http://127.0.0.1:8000 --runs 3

It needs B's dummy documents in sample_data/documents/ (at least five files, one of them a
tax compliance certificate that expires before the tender deadline) and uses the
mashariki-cleaning pair. Every run registers a fresh account. Exit code 0 only when every
step of every run passes. Only the standard library is used, so it runs anywhere.
"""

import argparse
import json
import mimetypes
import sys
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCUMENTS_DIR = ROOT / "sample_data" / "documents"
PAIR_DIR = ROOT / "sample_data" / "tenders" / "mashariki-cleaning"
PASSWORD = "Tender-demo-2026"
DOCUMENTS_NEEDED = 5
EMAIL_WAIT_SECONDS = 20
TIMEOUT_SECONDS = 120  # the first call can wake a sleeping server and database

STEPS = [
    "account registered and 5 documents confirmed",
    "tender uploaded, summary and checklist returned",
    "one certificate flagged expiring before the deadline, with its source quote",
    "addendum uploaded, version 2 created, new required document and moved deadline detected",
    "the checklist item flips",
    "in-app alert exists and the email is sent",
    "uploading the same addendum again creates nothing new",
]


class StepFailed(Exception):
    pass


def require(condition: object, message: str) -> None:
    if not condition:
        raise StepFailed(message)


def multipart(field: str, path: Path) -> tuple[bytes, str]:
    """Encode one file as multipart/form-data. Returns the body and its content type."""
    boundary = uuid.uuid4().hex
    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    head = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="{field}"; filename="{path.name}"\r\n'
        f"Content-Type: {mime}\r\n\r\n"
    ).encode()
    body = head + path.read_bytes() + f"\r\n--{boundary}--\r\n".encode()
    return body, f"multipart/form-data; boundary={boundary}"


class Api:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.token = ""

    def call(self, method: str, path: str, *, body: dict | None = None, file: Path | None = None):
        """Returns (status, parsed JSON or None). An error status is returned, not raised."""
        headers = {"Accept": "application/json"}
        data = None
        if file is not None:
            data, headers["Content-Type"] = multipart("file", file)
        elif body is not None:
            data, headers["Content-Type"] = json.dumps(body).encode(), "application/json"
        if self.token:
            headers["Authorization"] = f"Token {self.token}"
        request = urllib.request.Request(
            self.base_url + path, data=data, headers=headers, method=method
        )
        try:
            with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
                status, raw = response.status, response.read()
        except urllib.error.HTTPError as error:
            status, raw = error.code, error.read()
        except urllib.error.URLError as error:
            raise StepFailed(f"{method} {path}: cannot reach the API ({error.reason})") from error
        try:
            return status, json.loads(raw) if raw else None
        except ValueError:
            return status, None

    def expect(self, expected: int, method: str, path: str, **kwargs):
        status, payload = self.call(method, path, **kwargs)
        if status != expected:
            code = (
                (payload or {}).get("error", {}).get("code", "")
                if isinstance(payload, dict)
                else ""
            )
            raise StepFailed(f"{method} {path}: expected {expected}, got {status} {code}".rstrip())
        return payload


# --- The checks on each response. Pure, so they are tested without a server. ---


def expiring_item(check: dict) -> dict | None:
    """The first checklist item that expires before the deadline and carries its quote."""
    for item in check.get("items", []):
        if item.get("status") == "expiring" and item.get("source_quote"):
            return item
    return None


def detected(changes: list[dict]) -> set[str]:
    """Categories of the changes that carry at least one quote (R5)."""
    return {c["category"] for c in changes if c.get("old_quote") or c.get("new_quote")}


def real_flips(flips: list[dict]) -> list[dict]:
    """Flips of requirements that were already on the checklist: an item that changed status."""
    return [
        flip
        for flip in flips
        if flip.get("old_status") and flip.get("old_status") != flip.get("new_status")
    ]


# --- The seven steps ---


def step_1(api: Api, state: dict) -> str:
    files = sorted(p for p in state["documents_dir"].iterdir() if p.name != ".gitkeep")
    require(
        len(files) >= DOCUMENTS_NEEDED,
        f"need {DOCUMENTS_NEEDED} dummy documents in {state['documents_dir']}, found {len(files)}",
    )
    email = f"e2e-{uuid.uuid4().hex[:10]}@example.com"
    account = api.expect(
        201, "POST", "/api/auth/register", body={"email": email, "password": PASSWORD}
    )
    api.token = account["token"]
    profile = api.expect(
        200,
        "PUT",
        "/api/profile/",
        body={"business_name": "Demo Business Ltd", "kra_pin": "P000000000X", "consent": True},
    )
    require(profile.get("consent_at"), "consent was not recorded")

    ids = []
    for path in files[:DOCUMENTS_NEEDED]:
        document = api.expect(201, "POST", "/api/documents/", file=path)
        confirmed = api.expect(
            200, "PATCH", f"/api/documents/{document['id']}/", body={"confirmed": True}
        )
        require(confirmed.get("confirmed") is True, f"document {document['id']} is not confirmed")
        ids.append(document["id"])
    require(len(set(ids)) == DOCUMENTS_NEEDED, "uploads did not create five separate documents")
    listed = api.expect(200, "GET", "/api/documents/")
    confirmed_count = sum(1 for d in listed if d.get("confirmed") and d.get("id") in ids)
    require(
        confirmed_count == DOCUMENTS_NEEDED,
        f"{confirmed_count} of {DOCUMENTS_NEEDED} documents are listed as confirmed",
    )
    return f"{DOCUMENTS_NEEDED} documents confirmed"


def step_2(api: Api, state: dict) -> str:
    tender = api.expect(201, "POST", "/api/tenders/", file=state["tender_pdf"])
    state["tender_id"] = tender["id"]
    version = tender.get("latest_version") or {}
    require(tender.get("current_version") == 1, "the tender did not start at version 1")
    require(version.get("requirements"), "no requirements were returned")
    require(version.get("deadline"), "no deadline was returned")
    summary = api.expect(200, "GET", f"/api/tenders/{tender['id']}/summary/?lang=en")
    require(summary.get("tender_id") == tender["id"], "the summary is for another tender")
    require((summary.get("summary") or "").strip(), "the summary is empty")
    return f"tender {tender['id']}, {len(version['requirements'])} requirements"


def step_3(api: Api, state: dict) -> str:
    status, check = api.call("POST", f"/api/tenders/{state['tender_id']}/check/")
    require(status in (200, 201), f"POST check: expected 200 or 201, got {status}")
    require(check.get("version_no") == 1, "the check is not on version 1")
    require(check.get("disclaimer"), "the check carries no disclaimer")
    item = expiring_item(check)
    require(item, "no checklist item is expiring before the deadline with a source quote")
    state["check_v1"] = check
    return f"'{item['label']}' is expiring"


def step_4(api: Api, state: dict) -> str:
    path = f"/api/tenders/{state['tender_id']}/versions/"
    result = api.expect(201, "POST", path, file=state["addendum_pdf"])
    state["addendum"] = result
    require(result.get("created") is True, "created is not true")
    require(result.get("version_no") == 2, f"version_no is {result.get('version_no')}, not 2")
    found = detected(result.get("changes", []))
    require("deadline" in found, "the moved deadline was not detected with a quote")
    require("required_documents" in found, "the new required document was not detected")
    versions = api.expect(200, "GET", path)
    require([v["version_no"] for v in versions] == [1, 2], "the history is not versions 1 and 2")
    return f"version 2, {len(result['changes'])} changes"


def step_5(api: Api, state: dict) -> str:
    flips = real_flips(state["addendum"].get("flips", []))
    require(flips, "no checklist item changed status")
    status, check = api.call("POST", f"/api/tenders/{state['tender_id']}/check/")
    require(status in (200, 201), f"POST check: expected 200 or 201, got {status}")
    require(check.get("version_no") == 2, "the check is not on version 2")
    now = {item["requirement_id"]: item["status"] for item in check.get("items", [])}
    for flip in flips:
        require(
            now.get(flip["requirement_id"]) == flip["new_status"],
            f"'{flip['label']}' is not {flip['new_status']} in the new check",
        )
    first = flips[0]
    return f"'{first['label']}' went from {first['old_status']} to {first['new_status']}"


def step_6(api: Api, state: dict) -> str:
    alert_id = state["addendum"].get("alert_id")
    require(alert_id, "the addendum response has no alert_id")
    deadline = time.monotonic() + state["email_wait"]
    while True:
        alerts = api.expect(200, "GET", "/api/alerts/")
        alert = next((a for a in alerts if a.get("id") == alert_id), None)
        require(alert, f"alert {alert_id} is not in the list")
        require(alert.get("tender_id") == state["tender_id"], "the alert is for another tender")
        require((alert.get("message") or "").strip(), "the alert has no message")
        if alert.get("sent_at"):
            state["alert_count"] = len(alerts)
            return f"alert {alert_id}, email sent"
        if time.monotonic() >= deadline:
            raise StepFailed(
                f"alert {alert_id} exists but the email was not sent in {state['email_wait']} s"
            )
        time.sleep(1)


def step_7(api: Api, state: dict) -> str:
    path = f"/api/tenders/{state['tender_id']}/versions/"
    result = api.expect(200, "POST", path, file=state["addendum_pdf"])
    require(result.get("created") is False, "created is not false")
    require(result.get("version_no") == 2, "the duplicate did not point at version 2")
    require(len(api.expect(200, "GET", path)) == 2, "a third version was created")
    changes = api.expect(200, "GET", f"/api/tenders/{state['tender_id']}/changes/")
    require(
        len(changes) == len(state["addendum"]["changes"]), "the duplicate added changes to the log"
    )
    alerts = api.expect(200, "GET", "/api/alerts/")
    require(len(alerts) == state["alert_count"], "the duplicate created another alert")
    return "200, nothing created"


STEP_FUNCTIONS = [step_1, step_2, step_3, step_4, step_5, step_6, step_7]


def run_once(base_url: str, documents_dir: Path, email_wait: int) -> bool:
    api = Api(base_url)
    state = {
        "documents_dir": documents_dir,
        "tender_pdf": PAIR_DIR / "tender_SIMULATED.pdf",
        "addendum_pdf": PAIR_DIR / "addendum_1_SIMULATED.pdf",
        "email_wait": email_wait,
    }
    for number, (title, step) in enumerate(zip(STEPS, STEP_FUNCTIONS, strict=True), start=1):
        started = time.monotonic()
        try:
            detail = step(api, state)
        except StepFailed as failure:
            print(f"  FAIL  {number}. {title}\n        {failure}")
            for skipped in range(number + 1, len(STEPS) + 1):
                print(f"  SKIP  {skipped}. {STEPS[skipped - 1]}")
            return False
        except (KeyError, TypeError, AttributeError) as error:
            # A response that does not have the agreed shape (docs/handoff.md).
            print(f"  FAIL  {number}. {title}\n        unexpected response shape: {error!r}")
            return False
        print(f"  PASS  {number}. {title} ({detail}, {time.monotonic() - started:.1f} s)")
    return True


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run the TenderReady demo story end to end.")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--documents", type=Path, default=DOCUMENTS_DIR)
    parser.add_argument("--runs", type=int, default=1, help="the sprint gate is 3 in a row")
    parser.add_argument("--email-wait", type=int, default=EMAIL_WAIT_SECONDS)
    args = parser.parse_args(argv)

    passed = 0
    for run in range(1, args.runs + 1):
        print(f"Run {run} of {args.runs} against {args.base_url}")
        if not run_once(args.base_url, args.documents, args.email_wait):
            break
        passed += 1
    print(f"{passed} of {args.runs} runs passed.")
    return 0 if passed == args.runs else 1


if __name__ == "__main__":
    sys.exit(main())
