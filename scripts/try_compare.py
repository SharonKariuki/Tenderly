"""Run compare_versions on the sample pairs and report hits and misses. Owner: C.

Needs B's LLM client (llm/client.py) and GEMINI_API_KEY and LLM_MODEL in .env. The text
layer and hash come from pdfplumber and the deadlines from expected.json, so this script
does not depend on tender extraction.

Usage: python scripts/try_compare.py
Exit code 0 when at least 2 of the 3 pairs are fully correct (the M1 gate).
"""

import hashlib
import json
import os
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tenderready.settings")

import django  # noqa: E402

django.setup()

import pdfplumber  # noqa: E402

from core.contracts import TenderExtraction  # noqa: E402
from versions.compare import compare_versions, normalise  # noqa: E402

PAIRS_DIR = ROOT / "sample_data" / "tenders"
PAIRS_NEEDED = 2


def extraction(path: Path, deadline: str) -> TenderExtraction:
    with pdfplumber.open(path) as pdf:
        text = "\n".join(page.extract_text() or "" for page in pdf.pages)
    return TenderExtraction(
        deadline=datetime.fromisoformat(deadline),
        text=text,
        text_hash=hashlib.sha256(text.encode()).hexdigest(),
    )


def key(category: str, old_quote: str | None, new_quote: str | None) -> tuple:
    return (category, normalise(old_quote or ""), normalise(new_quote or ""))


def run_pair(folder: Path) -> bool:
    expected = json.loads((folder / "expected.json").read_text(encoding="utf-8"))
    old = extraction(folder / expected["tender"], expected["old_deadline"])
    new = extraction(folder / expected["addendum"], expected["new_deadline"])
    found = compare_versions(old, new)

    wanted = {key(c["category"], c["old_quote"], c["new_quote"]) for c in expected["changes"]}
    got = {key(c.category, c.old_quote, c.new_quote) for c in found}
    print(f"\n{folder.name}: {len(found)} changes found, {len(wanted)} expected")
    for change in found:
        mark = (
            "HIT  "
            if key(change.category, change.old_quote, change.new_quote) in wanted
            else "EXTRA"
        )
        print(f"  {mark} {change.category}: {change.explanation}")
    for category, _old, new_quote in sorted(wanted - got):
        print(f"  MISS  {category}: {new_quote}")
    return got == wanted


def main() -> int:
    try:
        import llm.client  # noqa: F401
    except ImportError:
        print("llm/client.py is not on this branch yet (B's feat/b-llm-client). Nothing was run.")
        return 2
    folders = sorted(path.parent for path in PAIRS_DIR.glob("*/expected.json"))
    correct = sum(run_pair(folder) for folder in folders)
    print(f"\n{correct} of {len(folders)} pairs fully correct (need {PAIRS_NEEDED}).")
    return 0 if correct >= PAIRS_NEEDED else 1


if __name__ == "__main__":
    sys.exit(main())
