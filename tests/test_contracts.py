"""The shared vocabulary (sprint plan 3D) is fixed: these values are stored and sent as-is."""

import pytest
from pydantic import ValidationError

from core import contracts


@pytest.mark.parametrize(
    ("enum", "values"),
    [
        (contracts.CheckStatus, ["met", "missing", "expiring", "unclear"]),
        (contracts.OverallStatus, ["ready", "attention_needed"]),
        (
            contracts.DocType,
            [
                "kra_tax_compliance",
                "business_registration",
                "agpo_certificate",
                "cr12",
                "national_id",
                "audited_accounts",
                "bank_statement",
                "business_permit",
                "other",
                "ncpwd_registration",
            ],
        ),
        (
            contracts.RequirementType,
            [
                "mandatory_document",
                "eligibility",
                "specification",
                "financial",
                "submission",
                "other",
            ],
        ),
        (
            contracts.ChangeCategory,
            [
                "deadline",
                "eligibility",
                "required_documents",
                "specifications_quantities",
                "pricing_format",
                "submission_method",
            ],
        ),
        (contracts.Channel, ["in_app", "email"]),
        (contracts.VersionSource, ["upload", "email_forward"]),
    ],
)
def test_enum_values_match_the_plan(enum, values: list[str]) -> None:
    assert enum.values == values


def test_requirement_type_outside_the_enum_is_rejected() -> None:
    # R13: the type comes from the fixed enum, never free text.
    with pytest.raises(ValidationError):
        contracts.Requirement(id="r1", label="Anything", requirement_type="made_up")


def test_extracted_document_defaults_unseen_fields_to_null() -> None:
    # R4: null, never guess.
    document = contracts.ExtractedDocument(document_type="cr12", confidence=0.5)

    assert document.expires_on is None
    assert document.kra_pin is None
    assert document.directors == []


def test_check_result_carries_the_disclaimer_by_default() -> None:
    # R15.
    result = contracts.CheckResult(overall="ready")

    assert result.model_dump(mode="json")["disclaimer"] == contracts.DISCLAIMER
