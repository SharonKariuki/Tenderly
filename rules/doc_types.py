"""What the rules know about each document type. Owner: A (lead)."""

from core.contracts import DocType, Requirement

DOC_TYPE_LABELS: dict[DocType, str] = {
    DocType.KRA_TAX_COMPLIANCE: "tax compliance certificate",
    DocType.BUSINESS_REGISTRATION: "business registration certificate",
    DocType.AGPO_CERTIFICATE: "AGPO certificate",
    DocType.CR12: "CR12",
    DocType.NATIONAL_ID: "national ID",
    DocType.AUDITED_ACCOUNTS: "audited accounts",
    DocType.BANK_STATEMENT: "bank statement",
    DocType.BUSINESS_PERMIT: "business permit",
}

# Types issued for a fixed period. A confirmed document of one of these types with no expiry
# date cannot be judged (R6). The other types carry no expiry date at all.
EXPIRING_DOC_TYPES: frozenset[DocType] = frozenset(
    {DocType.KRA_TAX_COMPLIANCE, DocType.AGPO_CERTIFICATE, DocType.BUSINESS_PERMIT}
)


def required_doc_type(requirement: Requirement) -> DocType | None:
    """The document type that can satisfy a requirement, or None when no document can be
    mapped to it (R6). The type is the one the LLM chose from the enum (R13); nothing is
    guessed from the label."""
    doc_type = requirement.required_doc_type
    if doc_type is None or doc_type == DocType.OTHER:
        return None
    return DocType(doc_type)


def label_for(doc_type: DocType) -> str:
    return DOC_TYPE_LABELS.get(doc_type, "document")
