"""AGPO rules, read from agpo_rules.json. Owner: B.

Nothing about AGPO eligibility is written in code: categories, ownership thresholds,
required documents and who may bid on a reservation all come from the JSON file, which
records its source and the date it was last checked.
"""

import json
from functools import cache
from pathlib import Path

RULES_PATH = Path(__file__).resolve().parent / "agpo_rules.json"
NO_CATEGORY = "none"


@cache
def rules() -> dict:
    return json.loads(RULES_PATH.read_text(encoding="utf-8"))


def category_ids() -> list[str]:
    return [category["id"] for category in rules()["categories"]]


def category(category_id: str) -> dict:
    for item in rules()["categories"]:
        if item["id"] == category_id:
            return item
    raise KeyError(category_id)


def required_documents(category_id: str, business_form: str = "all") -> list[dict]:
    """The documents AGPO registration asks for in this category. `business_form` is
    "all", "limited_company" or "partnership"; form-specific documents are only included
    when it matches. No category means no AGPO registration, so no documents."""
    if not category_id or category_id == NO_CATEGORY:
        return []
    docs = rules()["common_documents"] + category(category_id)["extra_documents"]
    return [doc for doc in docs if doc["applies_to"] in ("all", business_form)]


def can_bid(category_id: str, reservation: str) -> bool:
    """Whether a business in this AGPO category may bid on a tender with this reservation.
    An unknown reservation is not guessed at: it returns False."""
    allowed = rules()["reservations"].get(reservation)
    if allowed is None or reservation.startswith("_"):
        return False
    return (category_id or NO_CATEGORY) in allowed
