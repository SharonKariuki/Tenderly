"""Version comparison. Owner: C.

The LLM proposes the changes; the pure functions here decide what is kept (C3):
every change must carry a quote that is really in the text layer (R5).
"""

import re
from collections.abc import Callable
from datetime import datetime

from pydantic import BaseModel, Field, ValidationError

from core.contracts import Change, ChangeCategory, TenderExtraction
from core.exceptions import AIFailure
from versions.prompts import COMPARE_PROMPT, COMPARE_PROMPT_VERSION

COMPARE_TASK = "compare"


class ProposedChange(BaseModel):
    category: ChangeCategory
    old_quote: str | None = None
    new_quote: str | None = None
    explanation: str = ""


class CompareOutput(BaseModel):
    """What the LLM must return. Validated before anything is used (C1)."""

    changes: list[ProposedChange] = Field(default_factory=list)


def normalise(text: str) -> str:
    """Make a quote comparable with a PDF text layer: line breaks, repeated spaces, curly
    quotes and case must not decide whether a quote is found."""
    text = text.replace("‘", "'").replace("’", "'")
    text = text.replace("“", '"').replace("”", '"')
    return re.sub(r"\s+", " ", text).strip().casefold()


def quote_in_text(quote: str | None, text: str) -> bool:
    return bool(quote and quote.strip()) and normalise(quote) in normalise(text)


def validate_quotes(changes: list[ProposedChange], old_text: str, new_text: str) -> list[Change]:
    """R5: drop any quote that is not in its document, and any change left with no quote."""
    kept = []
    for change in changes:
        old_quote = change.old_quote if quote_in_text(change.old_quote, old_text) else None
        new_quote = change.new_quote if quote_in_text(change.new_quote, new_text) else None
        if old_quote is None and new_quote is None:
            continue
        kept.append(
            Change(
                category=change.category,
                old_quote=old_quote,
                new_quote=new_quote,
                explanation=change.explanation,
            )
        )
    return kept


def deadline_change(old: datetime | None, new: datetime | None) -> Change | None:
    """The deadline is the change she must never miss, so it is taken from the two extracted
    deadlines when the LLM did not report it with a valid quote."""
    if old is None or new is None or old == new:
        return None
    return Change(
        category=ChangeCategory.DEADLINE,
        explanation=(
            f"The closing date moved from {old:%d %B %Y at %H:%M} to {new:%d %B %Y at %H:%M}. "
            "The exact sentence was not found, so check the addendum yourself."
        ),
    )


def compare_cache_key(old: TenderExtraction, new: TenderExtraction) -> str:
    """R11: the same pair with the same prompt is never sent twice."""
    return f"{COMPARE_TASK}:{COMPARE_PROMPT_VERSION}:{old.text_hash}:{new.text_hash}"


def _default_llm() -> Callable:
    from llm.client import generate_json  # B's client; imported late so tests need no LLM

    return generate_json


def compare_versions(
    old: TenderExtraction, new: TenderExtraction, *, llm: Callable | None = None
) -> list[Change]:
    if old.text_hash and old.text_hash == new.text_hash:
        return []  # R9: identical text, no LLM call, no changes

    generate_json = llm or _default_llm()
    prompt = COMPARE_PROMPT.format(old_text=old.text, new_text=new.text)
    output = None
    for _attempt in range(2):  # C1: invalid output is retried once
        raw = generate_json(prompt, CompareOutput, None, None, compare_cache_key(old, new))
        try:
            output = CompareOutput.model_validate(raw)
            break
        except ValidationError:
            continue
    if output is None:
        raise AIFailure("The AI could not compare the two versions. Please try again.")

    changes = validate_quotes(output.changes, old.text, new.text)
    if not any(change.category == ChangeCategory.DEADLINE for change in changes):
        fallback = deadline_change(old.deadline, new.deadline)
        if fallback:
            changes.insert(0, fallback)
    return changes
