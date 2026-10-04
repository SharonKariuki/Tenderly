"""Rules engine (R1, R2, R5, R6, R20). Pure Python: no database, no network."""

from datetime import date, datetime

from core.contracts import (
    DISCLAIMER,
    CheckStatus,
    DocType,
    DocumentFacts,
    OverallStatus,
    ProfileFacts,
    Requirement,
    RequirementType,
)
from rules.dates import NAIROBI
from rules.engine import check_requirement, run_readiness_check

DEADLINE = datetime(2026, 10, 20, 10, 0, tzinfo=NAIROBI)
PROFILE = ProfileFacts(business_name="Demo Business Ltd", kra_pin="P000000000X")


def requirement(doc_type: DocType | None = DocType.KRA_TAX_COMPLIANCE, **changes) -> Requirement:
    fields = {
        "id": "r1",
        "label": "Valid Tax Compliance Certificate",
        "requirement_type": RequirementType.MANDATORY_DOCUMENT,
        "required_doc_type": doc_type,
        "source_quote": "Bidders shall submit a valid Tax Compliance Certificate.",
        "page": 4,
    }
    return Requirement(**{**fields, **changes})


def document(expires_on: date | None = date(2027, 6, 30), **changes) -> DocumentFacts:
    fields = {
        "id": 7,
        "doc_type": DocType.KRA_TAX_COMPLIANCE,
        "confirmed": True,
        "expires_on": expires_on,
    }
    return DocumentFacts(**{**fields, **changes})


def test_met_when_the_document_outlives_the_deadline() -> None:
    item = check_requirement(requirement(), [document()], DEADLINE)

    assert item.status == CheckStatus.MET
    assert item.doc_id == 7
    assert item.source_quote == "Bidders shall submit a valid Tax Compliance Certificate."
    assert item.page == 4


def test_missing_when_there_is_no_document_of_that_type() -> None:
    other = document(doc_type=DocType.CR12, expires_on=None)

    item = check_requirement(requirement(), [other], DEADLINE)

    assert item.status == CheckStatus.MISSING
    assert item.doc_id is None


def test_expiring_when_the_document_ends_before_the_deadline() -> None:
    # R1: valid today, but not on the day the tender closes.
    item = check_requirement(requirement(), [document(date(2026, 10, 12))], DEADLINE)

    assert item.status == CheckStatus.EXPIRING
    assert item.expires_on == date(2026, 10, 12)
    assert item.reason == "Expires 8 days before the deadline"


def test_expiry_on_the_deadline_day_is_still_met() -> None:
    assert check_requirement(requirement(), [document(date(2026, 10, 20))], DEADLINE).status == (
        CheckStatus.MET
    )


def test_expiry_one_day_before_the_deadline_is_expiring() -> None:
    item = check_requirement(requirement(), [document(date(2026, 10, 19))], DEADLINE)

    assert item.status == CheckStatus.EXPIRING
    assert item.reason == "Expires 1 day before the deadline"


def test_deadline_day_is_taken_in_nairobi_time() -> None:
    # 22:30 UTC on the 20th is already the 21st in Nairobi, so a document that ends on the
    # 20th does not reach the deadline.
    late = datetime.fromisoformat("2026-10-20T22:30:00+00:00")

    assert check_requirement(requirement(), [document(date(2026, 10, 20))], late).status == (
        CheckStatus.EXPIRING
    )


def test_unconfirmed_document_counts_as_absent() -> None:
    # R2.
    item = check_requirement(requirement(), [document(confirmed=False)], DEADLINE)

    assert item.status == CheckStatus.MISSING
    assert "Confirm your tax clearance certificate" in item.reason
    assert item.doc_id == 7


def test_already_expired_is_expiring_without_today_and_missing_with_it() -> None:
    expired = [document(date(2026, 9, 1))]

    assert check_requirement(requirement(), expired, DEADLINE).status == CheckStatus.EXPIRING

    item = check_requirement(requirement(), expired, DEADLINE, today=date(2026, 10, 3))
    assert item.status == CheckStatus.MISSING
    assert "expired on 2026-09-01" in item.reason


def test_null_expiry_on_a_dated_document_type_is_unclear() -> None:
    # R6.
    item = check_requirement(requirement(), [document(None)], DEADLINE)

    assert item.status == CheckStatus.UNCLEAR
    assert item.doc_id == 7


def test_document_type_without_an_expiry_date_is_met_when_confirmed() -> None:
    cr12 = document(None, doc_type=DocType.CR12)

    assert check_requirement(requirement(DocType.CR12), [cr12], DEADLINE).status == CheckStatus.MET


def test_unmappable_requirement_is_unclear_and_keeps_its_quote() -> None:
    # R6: nothing in the document vault can prove this.
    experience = requirement(
        None,
        label="Five years of similar experience",
        requirement_type=RequirementType.ELIGIBILITY,
        source_quote="Bidders must show five years of similar experience.",
    )

    item = check_requirement(experience, [document()], DEADLINE)

    assert item.status == CheckStatus.UNCLEAR
    assert item.source_quote == "Bidders must show five years of similar experience."


def test_requirement_of_type_other_is_unclear() -> None:
    assert check_requirement(requirement(DocType.OTHER), [document()], DEADLINE).status == (
        CheckStatus.UNCLEAR
    )


def test_requirement_without_a_source_quote_is_never_judged() -> None:
    # R5.
    item = check_requirement(requirement(source_quote=None), [document()], DEADLINE)

    assert item.status == CheckStatus.UNCLEAR


def test_missing_deadline_is_unclear() -> None:
    assert check_requirement(requirement(), [document()], None).status == CheckStatus.UNCLEAR


def test_the_longest_valid_document_wins() -> None:
    old = document(date(2026, 10, 12), id=7)
    renewed = document(date(2027, 10, 12), id=9)

    item = check_requirement(requirement(), [old, renewed], DEADLINE)

    assert item.status == CheckStatus.MET
    assert item.doc_id == 9


def test_overall_is_ready_when_every_mandatory_requirement_is_met() -> None:
    result = run_readiness_check([requirement()], [document()], PROFILE, DEADLINE)

    assert result.overall == OverallStatus.READY
    assert result.deadline == DEADLINE
    assert result.disclaimer == DISCLAIMER  # R15


def test_overall_needs_attention_when_one_item_is_expiring_and_one_missing() -> None:
    requirements = [
        requirement(),
        requirement(DocType.AGPO_CERTIFICATE, id="r2", label="AGPO certificate"),
    ]

    result = run_readiness_check(requirements, [document(date(2026, 10, 12))], PROFILE, DEADLINE)

    assert result.overall == OverallStatus.ATTENTION_NEEDED
    assert [item.status for item in result.items] == [CheckStatus.EXPIRING, CheckStatus.MISSING]


def test_an_unmet_optional_requirement_does_not_block_ready() -> None:
    optional = requirement(DocType.BUSINESS_PERMIT, id="r2", label="Permit", mandatory=False)

    result = run_readiness_check([requirement(), optional], [document()], PROFILE, DEADLINE)

    assert result.overall == OverallStatus.READY
    assert result.items[1].status == CheckStatus.MISSING


def test_a_mismatch_needs_attention_even_when_everything_is_met() -> None:
    wrong_pin = document(kra_pin="P999999999Z")

    result = run_readiness_check([requirement()], [wrong_pin], PROFILE, DEADLINE)

    assert result.items[0].status == CheckStatus.MET
    assert result.overall == OverallStatus.ATTENTION_NEEDED
    assert result.mismatches[0].field == "kra_pin"


def test_the_check_is_deterministic() -> None:
    # R3: same input, same output.
    arguments = ([requirement()], [document(date(2026, 10, 12))], PROFILE, DEADLINE)

    assert run_readiness_check(*arguments) == run_readiness_check(*arguments)
