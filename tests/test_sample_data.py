"""The sample tender pairs and the insight seed stay usable as ground truth. Owner: C."""

import json
import re
from pathlib import Path

import pdfplumber
import pytest

ROOT = Path(__file__).resolve().parent.parent
PAIRS = sorted((ROOT / "sample_data" / "tenders").glob("*/expected.json"))
SEED_FILE = ROOT / "insight" / "seed" / "rejection_cases.json"


def text_layer(path: Path) -> str:
    with pdfplumber.open(path) as pdf:
        text = " ".join(page.extract_text() or "" for page in pdf.pages)
    return re.sub(r"\s+", " ", text)


def test_three_pairs_exist():
    assert len(PAIRS) == 3


@pytest.mark.parametrize("expected_path", PAIRS, ids=lambda path: path.parent.name)
def test_expected_quotes_are_in_the_text_layers(expected_path: Path):
    expected = json.loads(expected_path.read_text(encoding="utf-8"))
    tender = text_layer(expected_path.parent / expected["tender"])
    addendum = text_layer(expected_path.parent / expected["addendum"])

    assert "SIMULATED" in tender and "SIMULATED" in addendum
    assert {change["category"] for change in expected["changes"]} == {
        "deadline",
        "required_documents",
        "specifications_quantities",
    }
    for change in expected["changes"]:
        if change["old_quote"]:
            assert change["old_quote"] in tender
        assert change["new_quote"] in addendum
        assert change["new_quote"] not in tender


def test_insight_seed_cases_have_every_field():
    cases = json.loads(SEED_FILE.read_text(encoding="utf-8"))
    fields = {"doc_type", "reason", "source_title", "source_url", "year", "tags", "illustrative"}
    assert len(cases) >= 5
    for case in cases:
        assert set(case) == fields
        assert case["reason"]
        # A case without a public source must say so (sprint plan M4: label the set).
        assert case["source_url"] or case["illustrative"]
