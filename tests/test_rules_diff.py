"""diff_checks (R8): what flipped between two checks. Pure Python."""

from core.contracts import CheckItem, CheckResult, CheckStatus, OverallStatus
from rules.engine import diff_checks


def check(*items: tuple[str, str, CheckStatus]) -> CheckResult:
    return CheckResult(
        overall=OverallStatus.ATTENTION_NEEDED,
        items=[
            CheckItem(requirement_id=rid, label=label, status=status, reason=f"{label} is {status}")
            for rid, label, status in items
        ],
    )


TCC = ("r1", "Tax Compliance Certificate", CheckStatus.MET)


def test_identical_checks_have_no_flips() -> None:
    assert diff_checks(check(TCC), check(TCC)) == []


def test_a_changed_status_is_a_flip_with_the_new_reason() -> None:
    new = check(("r1", "Tax Compliance Certificate", CheckStatus.EXPIRING))

    (flip,) = diff_checks(check(TCC), new)

    assert (flip.requirement_id, flip.old_status, flip.new_status) == ("r1", "met", "expiring")
    assert flip.reason == "Tax Compliance Certificate is expiring"


def test_a_new_requirement_has_no_old_status() -> None:
    new = check(TCC, ("r2", "AGPO certificate", CheckStatus.MISSING))

    (flip,) = diff_checks(check(TCC), new)

    assert (flip.requirement_id, flip.old_status, flip.new_status) == ("r2", None, "missing")


def test_a_dropped_requirement_has_no_new_status() -> None:
    old = check(TCC, ("r2", "AGPO certificate", CheckStatus.MISSING))

    (flip,) = diff_checks(old, check(TCC))

    assert (flip.requirement_id, flip.old_status, flip.new_status) == ("r2", "missing", None)


def test_renumbered_requirements_are_paired_by_label() -> None:
    old = check(TCC, ("r2", "AGPO certificate", CheckStatus.MISSING))
    new = check(
        ("r1", "AGPO  certificate ", CheckStatus.MISSING),
        ("r2", "Tax Compliance Certificate", CheckStatus.EXPIRING),
    )

    (flip,) = diff_checks(old, new)

    assert (flip.requirement_id, flip.old_status, flip.new_status) == ("r2", "met", "expiring")


def test_a_reworded_requirement_is_paired_by_id() -> None:
    new = check(("r1", "Valid tax compliance certificate from KRA", CheckStatus.EXPIRING))

    (flip,) = diff_checks(check(TCC), new)

    assert (flip.old_status, flip.new_status) == ("met", "expiring")


def test_an_improvement_is_also_a_flip() -> None:
    old = check(("r1", "Tax Compliance Certificate", CheckStatus.MISSING))

    (flip,) = diff_checks(old, check(TCC))

    assert (flip.old_status, flip.new_status) == ("missing", "met")
