"""Readiness rules (R1, R2, R3, R6). Owner: A (lead).

Pure Python: no database, no LLM (R3, C3). The same input always gives the same output.
"""

from datetime import date, datetime

from core.contracts import (
    CheckItem,
    CheckResult,
    CheckStatus,
    DocumentFacts,
    Flip,
    OverallStatus,
    ProfileFacts,
    Requirement,
)
from rules.dates import days_before, deadline_date
from rules.deadline_note import make_deadline_note  # noqa: F401  (contract import path)
from rules.doc_types import EXPIRING_DOC_TYPES, label_for, required_doc_type
from rules.mismatch import find_mismatches


def _days(count: int) -> str:
    return f"{count} day" if count == 1 else f"{count} days"


def check_requirement(
    requirement: Requirement,
    documents: list[DocumentFacts],
    deadline: datetime | None,
    today: date | None = None,
) -> CheckItem:
    """Judge one requirement against the user's documents at the tender deadline (R1).

    `today` is optional: when given, a document that has already expired is reported as
    missing instead of expiring.
    """

    def item(status: CheckStatus, reason: str, doc: DocumentFacts | None = None) -> CheckItem:
        return CheckItem(
            requirement_id=requirement.id,
            label=requirement.label,
            status=status,
            doc_id=doc.id if doc else None,
            expires_on=doc.expires_on if doc else None,
            reason=reason,
            source_quote=requirement.source_quote,
            page=requirement.page,
        )

    if not requirement.source_quote:
        # R5: a requirement without a quote from the tender is never judged.
        return item(CheckStatus.UNCLEAR, "No source quote in the tender. Read the tender document.")

    doc_type = required_doc_type(requirement)
    if doc_type is None:
        return item(
            CheckStatus.UNCLEAR,
            "This cannot be checked from your documents. Read the quote and confirm it yourself.",
        )

    name = label_for(doc_type)
    of_type = [doc for doc in documents if doc.doc_type == doc_type]
    confirmed = [doc for doc in of_type if doc.confirmed]
    if not confirmed:
        if of_type:
            # R2: an unconfirmed document counts as absent.
            return item(
                CheckStatus.MISSING, f"Confirm your {name} so that it can count.", of_type[0]
            )
        return item(CheckStatus.MISSING, f"No confirmed {name} in your documents.")

    if doc_type not in EXPIRING_DOC_TYPES:
        dated = [doc for doc in confirmed if doc.expires_on]
        if not dated:
            return item(CheckStatus.MET, f"Confirmed {name} on file.", confirmed[0])
        confirmed = dated

    if deadline is None:
        return item(
            CheckStatus.UNCLEAR, "The tender has no closing date to check against.", confirmed[0]
        )
    closes_on = deadline_date(deadline)

    dated = sorted(
        (doc for doc in confirmed if doc.expires_on), key=lambda doc: doc.expires_on, reverse=True
    )
    if dated and dated[0].expires_on >= closes_on:
        # R1: expiring on the deadline day itself is still met.
        return item(CheckStatus.MET, "Valid through the deadline.", dated[0])

    undated = [doc for doc in confirmed if not doc.expires_on]
    if undated:
        # R6: a null expiry date cannot be judged.
        return item(
            CheckStatus.UNCLEAR,
            f"Your {name} has no expiry date. Add the expiry date to the document.",
            undated[0],
        )

    best = dated[0]
    if today is not None and best.expires_on < today:
        return item(
            CheckStatus.MISSING,
            f"Your {name} expired on {best.expires_on.isoformat()}. Renew it before you bid.",
            best,
        )
    return item(
        CheckStatus.EXPIRING,
        f"Expires {_days(days_before(best.expires_on, closes_on))} before the deadline",
        best,
    )


def run_readiness_check(
    requirements: list[Requirement],
    documents: list[DocumentFacts],
    profile: ProfileFacts,
    deadline: datetime | None,
    today: date | None = None,
) -> CheckResult:
    """The checklist for one tender version. tender_id and version_no are set by the caller."""
    items = [check_requirement(req, documents, deadline, today) for req in requirements]
    mismatches = find_mismatches(documents, profile)

    mandatory = {req.id for req in requirements if req.mandatory}
    all_met = all(
        item.status == CheckStatus.MET for item in items if item.requirement_id in mandatory
    )
    # R20: no score, only ready or attention_needed.
    overall = OverallStatus.READY if all_met and not mismatches else OverallStatus.ATTENTION_NEEDED
    return CheckResult(deadline=deadline, overall=overall, items=items, mismatches=mismatches)


def diff_checks(old: CheckResult, new: CheckResult) -> list[Flip]:
    """What changed for the user between two checks of the same tender (R8).

    Items are paired by label first, because requirement ids can be renumbered between
    versions, and by requirement id otherwise. Unchanged items are left out; a requirement
    that is new has old_status None, one that was dropped has new_status None.
    """

    def key(label: str) -> str:
        return " ".join(label.lower().split())

    by_label = {key(item.label): item for item in old.items}
    by_id = {item.requirement_id: item for item in old.items}
    paired: set[str] = set()

    flips: list[Flip] = []
    for item in new.items:
        candidates = (by_label.get(key(item.label)), by_id.get(item.requirement_id))
        before = next((c for c in candidates if c and c.requirement_id not in paired), None)
        if before is not None:
            paired.add(before.requirement_id)
        if before is None or before.status != item.status:
            flips.append(
                Flip(
                    requirement_id=item.requirement_id,
                    label=item.label,
                    old_status=before.status if before else None,
                    new_status=item.status,
                    reason=item.reason,
                )
            )
    flips.extend(
        Flip(
            requirement_id=item.requirement_id,
            label=item.label,
            old_status=item.status,
            new_status=None,
            reason="No longer required in this version.",
        )
        for item in old.items
        if item.requirement_id not in paired
    )
    return flips
