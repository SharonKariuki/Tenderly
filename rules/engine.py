"""Readiness rules (R1, R2, R3, R6). Owner: A (lead).

Pure Python: no database, no LLM (R3, C3). M0 signature stubs; implemented in M1 to M3.
"""

from datetime import date, datetime

from core.contracts import CheckResult, DocumentFacts, Flip, ProfileFacts, Requirement


def run_readiness_check(
    requirements: list[Requirement],
    documents: list[DocumentFacts],
    profile: ProfileFacts,
    deadline: datetime,
) -> CheckResult:
    raise NotImplementedError("M1: feat/a-rules-engine")


def make_deadline_note(
    old_deadline: datetime | None, new_deadline: datetime | None, published_on: date | None
) -> str | None:
    raise NotImplementedError("M2: feat/a-deadline-note")


def diff_checks(old: CheckResult, new: CheckResult) -> list[Flip]:
    raise NotImplementedError("M3: feat/a-diff-and-deploy")
