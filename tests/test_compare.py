"""Version comparison (versions/compare.py). Owner: C. No database and no real LLM."""

import json
from datetime import datetime
from pathlib import Path

import pdfplumber
import pytest

from core.contracts import ChangeCategory, TenderExtraction
from core.exceptions import AIFailure
from versions.compare import (
    CompareOutput,
    ProposedChange,
    compare_versions,
    deadline_change,
    quote_in_text,
    validate_quotes,
)

SAMPLES = Path(__file__).resolve().parent.parent / "sample_data" / "tenders"
PAIRS = sorted(path.parent for path in SAMPLES.glob("*/expected.json"))

OLD = TenderExtraction(
    text="Tenders must be submitted on or before\n20th October 2026.\nItem 1: Cleaners. 12.",
    text_hash="old-hash",
)
NEW = TenderExtraction(
    text="The closing date is now 3rd November 2026.\nMR6. Valid Single Business Permit.",
    text_hash="new-hash",
)


class FakeLLM:
    def __init__(self, *answers):
        self.answers = list(answers)
        self.calls = []

    def __call__(self, prompt, schema, file_bytes, mime, cache_key):
        self.calls.append({"prompt": prompt, "schema": schema, "cache_key": cache_key})
        return self.answers.pop(0)


def answer(*changes: dict) -> dict:
    return {"changes": list(changes)}


def pdf_text(path: Path) -> str:
    with pdfplumber.open(path) as pdf:
        return "\n".join(page.extract_text() or "" for page in pdf.pages)


def test_identical_hash_means_no_llm_call_and_no_changes():
    llm = FakeLLM()

    assert compare_versions(OLD, OLD.model_copy(), llm=llm) == []  # R9
    assert llm.calls == []


def test_quotes_are_found_across_line_breaks_and_case():
    assert quote_in_text("submitted on or before 20th October 2026", OLD.text)
    assert quote_in_text("VALID single  business permit", NEW.text)
    assert not quote_in_text("submitted on or before 21st October 2026", OLD.text)
    assert not quote_in_text("", OLD.text)
    assert not quote_in_text(None, OLD.text)


def test_changes_keep_only_quotes_that_are_in_the_documents():
    llm = FakeLLM(
        answer(
            {
                "category": "deadline",
                "old_quote": "on or before 20th October 2026",
                "new_quote": "The closing date is now 3rd November 2026.",
                "explanation": "The deadline moved.",
            },
            {
                "category": "required_documents",
                "old_quote": "A sentence the tender never contained.",
                "new_quote": "MR6. Valid Single Business Permit.",
                "explanation": "A business permit is now required.",
            },
            {
                "category": "eligibility",
                "old_quote": None,
                "new_quote": "Only firms from Mars may tender.",
                "explanation": "Invented by the model.",
            },
        )
    )

    changes = compare_versions(OLD, NEW, llm=llm)

    assert [change.category for change in changes] == ["deadline", "required_documents"]
    assert changes[0].old_quote == "on or before 20th October 2026"
    assert changes[1].old_quote is None  # the invented quote is dropped, the real one stays
    assert changes[1].new_quote == "MR6. Valid Single Business Permit."
    assert not any(change.affects_user for change in changes)  # set later by the addenda flow


def test_cache_key_and_prompt_carry_both_versions():
    llm = FakeLLM(answer())

    compare_versions(OLD, NEW, llm=llm)

    call = llm.calls[0]
    assert call["cache_key"] == "compare:v1:old-hash:new-hash"  # R11
    assert call["schema"] is CompareOutput
    assert OLD.text in call["prompt"] and NEW.text in call["prompt"]


def test_invalid_output_is_retried_once_then_fails_clearly():
    bad = answer({"category": "weather", "new_quote": "MR6. Valid Single Business Permit."})
    good = answer({"category": "required_documents", "new_quote": "MR6. Valid Single Business"})

    recovered = FakeLLM(bad, good)
    assert len(compare_versions(OLD, NEW, llm=recovered)) == 1
    assert len(recovered.calls) == 2

    with pytest.raises(AIFailure):  # C1, C5: a 502 with a clear message
        compare_versions(OLD, NEW, llm=FakeLLM(bad, bad))


def test_moved_deadline_is_reported_even_when_the_llm_misses_it():
    old = OLD.model_copy(update={"deadline": datetime.fromisoformat("2026-10-20T10:00:00+03:00")})
    new = NEW.model_copy(update={"deadline": datetime.fromisoformat("2026-11-03T10:00:00+03:00")})

    changes = compare_versions(old, new, llm=FakeLLM(answer()))

    assert [change.category for change in changes] == [ChangeCategory.DEADLINE]
    assert "20 October 2026 at 10:00 to 03 November 2026 at 10:00" in changes[0].explanation
    assert "check the addendum yourself" in changes[0].explanation


def test_no_deadline_fallback_without_two_different_deadlines():
    moment = datetime.fromisoformat("2026-10-20T10:00:00+03:00")

    assert deadline_change(None, moment) is None
    assert deadline_change(moment, None) is None
    assert deadline_change(moment, moment) is None


def test_validate_quotes_drops_a_change_with_no_quote_at_all():
    proposed = [ProposedChange(category=ChangeCategory.PRICING_FORMAT, explanation="No quotes.")]

    assert validate_quotes(proposed, OLD.text, NEW.text) == []


@pytest.mark.parametrize("pair", PAIRS, ids=lambda path: path.name)
def test_a_correct_answer_survives_validation_on_the_sample_pairs(pair: Path):
    expected = json.loads((pair / "expected.json").read_text(encoding="utf-8"))
    old = TenderExtraction(text=pdf_text(pair / expected["tender"]), text_hash="v1")
    new = TenderExtraction(text=pdf_text(pair / expected["addendum"]), text_hash="v2")

    changes = compare_versions(old, new, llm=FakeLLM(answer(*expected["changes"])))

    found = [(change.category, change.old_quote, change.new_quote) for change in changes]
    assert found == [
        (change["category"], change["old_quote"], change["new_quote"])
        for change in expected["changes"]
    ]
