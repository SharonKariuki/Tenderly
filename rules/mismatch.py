"""Cross-document mismatch checks on normalised values (R12). Owner: A (lead).

Pure Python (C3). Only confirmed documents are compared (R2).
"""

import re

from core.contracts import DocType, DocumentFacts, Mismatch, ProfileFacts

_NOT_WORD = re.compile(r"[^\w\s]")
_SPACES = re.compile(r"\s+")


def normalise_business_name(name: str) -> str:
    """Lowercase, no punctuation, single spaces, and LIMITED treated as LTD."""
    words = _SPACES.sub(" ", _NOT_WORD.sub(" ", name.lower())).strip().split(" ")
    return " ".join("ltd" if word == "limited" else word for word in words)


def normalise_kra_pin(pin: str) -> str:
    """Uppercase, exact match otherwise."""
    return pin.strip().upper()


def name_tokens(name: str) -> frozenset[str]:
    """A person's name as a set of tokens, so word order and punctuation do not matter."""
    return frozenset(_NOT_WORD.sub(" ", name.lower()).split())


def _disagreement(field: str, entries: list[tuple[str, str, int | None]]) -> Mismatch | None:
    """entries are (raw value, normalised value, doc id or None for the profile). A mismatch
    when more than one normalised value is present."""
    seen: dict[str, str] = {}
    doc_ids: list[int] = []
    for raw, key, doc_id in entries:
        seen.setdefault(key, raw)
        if doc_id is not None:
            doc_ids.append(doc_id)
    if len(seen) < 2:
        return None
    return Mismatch(field=field, values=list(seen.values()), doc_ids=doc_ids)


def _director_mismatches(documents: list[DocumentFacts]) -> list[Mismatch]:
    mismatches: list[Mismatch] = []
    with_directors = [doc for doc in documents if doc.directors]

    # Two documents that both list directors must list the same people.
    listed = _disagreement(
        "directors",
        [
            (
                ", ".join(doc.directors),
                "|".join(sorted(" ".join(sorted(name_tokens(name))) for name in doc.directors)),
                doc.id,
            )
            for doc in with_directors
        ],
    )
    if listed:
        mismatches.append(listed)

    # A national ID must belong to one of the listed directors.
    for identity in documents:
        if identity.doc_type != DocType.NATIONAL_ID or not identity.holder_name:
            continue
        for doc in with_directors:
            if name_tokens(identity.holder_name) not in {name_tokens(n) for n in doc.directors}:
                mismatches.append(
                    Mismatch(
                        field="directors",
                        values=[identity.holder_name, ", ".join(doc.directors)],
                        doc_ids=[identity.id, doc.id],
                    )
                )
    return mismatches


def find_mismatches(documents: list[DocumentFacts], profile: ProfileFacts) -> list[Mismatch]:
    confirmed = [doc for doc in documents if doc.confirmed]

    names = [(profile.business_name, normalise_business_name(profile.business_name), None)]
    names += [
        (doc.holder_name, normalise_business_name(doc.holder_name), doc.id)
        for doc in confirmed
        # The holder of a national ID is a person, not the business.
        if doc.holder_name and doc.doc_type != DocType.NATIONAL_ID
    ]
    pins = [(profile.kra_pin, normalise_kra_pin(profile.kra_pin), None)]
    pins += [
        (doc.kra_pin, normalise_kra_pin(doc.kra_pin), doc.id) for doc in confirmed if doc.kra_pin
    ]

    mismatches = [
        _disagreement("business_name", [entry for entry in names if entry[1]]),
        _disagreement("kra_pin", [entry for entry in pins if entry[1]]),
    ]
    return [m for m in mismatches if m] + _director_mismatches(confirmed)
