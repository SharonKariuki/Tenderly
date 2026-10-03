"""Run extract_document on the dummy documents and print a per-field accuracy table. Owner: B.

Needs GEMINI_API_KEY and LLM_MODEL in .env and a migrated database (answers are cached).

Usage: python scripts/try_extract.py
Exit code 0 when every field of every document is read correctly, 2 when the AI is not
configured.
"""

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tenderready.settings")

import django  # noqa: E402

django.setup()

from django.conf import settings  # noqa: E402

from documents.services import extract_document  # noqa: E402
from rules.mismatch import name_tokens  # noqa: E402

DOCUMENTS_DIR = ROOT / "sample_data" / "documents"
FIELDS = (
    "document_type",
    "holder_name",
    "kra_pin",
    "registration_number",
    "issued_on",
    "expires_on",
    "directors",
)


def same(field: str, expected: object, actual: object) -> bool:
    if field == "directors":
        return {name_tokens(n) for n in expected} == {name_tokens(n) for n in actual}
    if isinstance(expected, str) and isinstance(actual, str):
        return " ".join(expected.casefold().split()) == " ".join(actual.casefold().split())
    return expected == actual


def main() -> int:
    if not settings.GEMINI_API_KEY or not settings.LLM_MODEL:
        print("GEMINI_API_KEY and LLM_MODEL are not set, so nothing was run.")
        return 2

    expected = json.loads((DOCUMENTS_DIR / "expected.json").read_text(encoding="utf-8"))
    correct = dict.fromkeys(FIELDS, 0)
    for filename, truth in expected.items():
        data = (DOCUMENTS_DIR / filename).read_bytes()
        result = extract_document(data, "application/pdf", filename).model_dump(mode="json")
        wrong = [f for f in FIELDS if not same(f, truth[f], result[f])]
        for field in FIELDS:
            correct[field] += field not in wrong
        # R16: field names only, never the values that were read.
        note = "all fields correct" if not wrong else "wrong: " + ", ".join(wrong)
        print(f"{filename}: {note} (confidence {result['confidence']:.2f})")

    total = len(expected)
    print("\n| Field | Correct |\n|---|---|")
    for field in FIELDS:
        print(f"| {field} | {correct[field]} of {total} |")
    return 0 if all(count == total for count in correct.values()) else 1


if __name__ == "__main__":
    sys.exit(main())
