"""Mismatch checks on normalised values (R12) and the dates helper (R18). Pure Python."""

from datetime import date, datetime

import pytest

from core.contracts import DocType, DocumentFacts, ProfileFacts
from rules.dates import NAIROBI, deadline_date, parse_date
from rules.mismatch import find_mismatches, normalise_business_name

PROFILE = ProfileFacts(business_name="Demo Business Ltd", kra_pin="P000000000X")


def document(
    doc_id: int, doc_type: DocType = DocType.KRA_TAX_COMPLIANCE, **fields
) -> DocumentFacts:
    return DocumentFacts(id=doc_id, doc_type=doc_type, confirmed=True, **fields)


@pytest.mark.parametrize(
    "name",
    ["DEMO BUSINESS LIMITED", "Demo  Business Ltd.", " demo business, ltd ", "Demo Business LTD"],
)
def test_business_names_are_compared_normalised(name: str) -> None:
    assert normalise_business_name(name) == "demo business ltd"
    assert find_mismatches([document(7, holder_name=name)], PROFILE) == []


def test_a_different_business_name_is_flagged_with_both_values() -> None:
    documents = [
        document(7, holder_name="Demo Business Ltd"),
        document(9, DocType.BUSINESS_REGISTRATION, holder_name="Demo Traders Ltd"),
    ]

    (mismatch,) = find_mismatches(documents, PROFILE)

    assert mismatch.field == "business_name"
    assert mismatch.values == ["Demo Business Ltd", "Demo Traders Ltd"]
    assert mismatch.doc_ids == [7, 9]


def test_kra_pin_matches_whatever_the_case() -> None:
    assert find_mismatches([document(7, kra_pin=" p000000000x ")], PROFILE) == []


def test_a_different_kra_pin_is_flagged() -> None:
    documents = [document(7, kra_pin="P000000000X"), document(9, kra_pin="P000000001X")]

    (mismatch,) = find_mismatches(documents, PROFILE)

    assert mismatch.field == "kra_pin"
    assert mismatch.values == ["P000000000X", "P000000001X"]
    assert mismatch.doc_ids == [7, 9]


def test_a_document_that_disagrees_with_the_profile_is_flagged() -> None:
    (mismatch,) = find_mismatches([document(7, kra_pin="P111111111A")], PROFILE)

    assert mismatch.values == ["P000000000X", "P111111111A"]
    assert mismatch.doc_ids == [7]


def test_directors_are_compared_as_name_token_sets() -> None:
    documents = [
        document(7, DocType.CR12, directors=["Jane Wanjiru Doe", "Mary Achieng"]),
        document(9, DocType.CR12, directors=["ACHIENG, Mary", "Doe Jane Wanjiru"]),
    ]

    assert find_mismatches(documents, PROFILE) == []


def test_different_directors_are_flagged() -> None:
    documents = [
        document(7, DocType.CR12, directors=["Jane Wanjiru Doe"]),
        document(9, DocType.CR12, directors=["Jane Wanjiru Doe", "Mary Achieng"]),
    ]

    (mismatch,) = find_mismatches(documents, PROFILE)

    assert mismatch.field == "directors"
    assert mismatch.doc_ids == [7, 9]


def test_a_national_id_that_is_not_a_listed_director_is_flagged() -> None:
    documents = [
        document(7, DocType.CR12, directors=["Jane Wanjiru Doe"]),
        document(9, DocType.NATIONAL_ID, holder_name="Jane Wanjiku Doe"),
    ]

    (mismatch,) = find_mismatches(documents, PROFILE)

    assert mismatch.field == "directors"
    assert mismatch.values == ["Jane Wanjiku Doe", "Jane Wanjiru Doe"]
    assert mismatch.doc_ids == [9, 7]


def test_the_person_on_a_national_id_is_not_compared_to_the_business_name() -> None:
    documents = [
        document(7, DocType.CR12, directors=["Jane Wanjiru Doe"]),
        document(9, DocType.NATIONAL_ID, holder_name="Doe Jane Wanjiru"),
    ]

    assert find_mismatches(documents, PROFILE) == []


def test_unconfirmed_documents_are_not_compared() -> None:
    # R2.
    unconfirmed = DocumentFacts(
        id=7, doc_type=DocType.KRA_TAX_COMPLIANCE, confirmed=False, kra_pin="P111111111A"
    )

    assert find_mismatches([unconfirmed], PROFILE) == []


def test_an_empty_profile_is_not_a_mismatch() -> None:
    assert find_mismatches([document(7, kra_pin="P000000000X")], ProfileFacts()) == []


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("2026-10-12", date(2026, 10, 12)),
        ("12 October 2026", date(2026, 10, 12)),
        ("12/10/2026", date(2026, 10, 12)),  # day first
        (date(2026, 10, 12), date(2026, 10, 12)),
        ("", None),
        (None, None),
        ("not a date", None),  # R4: null, never guess
    ],
)
def test_parse_date(value: object, expected: date | None) -> None:
    assert parse_date(value) == expected


def test_deadline_date_is_the_nairobi_calendar_day() -> None:
    assert deadline_date(datetime(2026, 10, 20, 10, 0, tzinfo=NAIROBI)) == date(2026, 10, 20)
    assert deadline_date(datetime.fromisoformat("2026-10-20T22:30:00+00:00")) == date(2026, 10, 21)
