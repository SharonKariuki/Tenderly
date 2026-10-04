"""Shared vocabulary and data shapes (sprint plan 3D and section 4). Owner: A, lead-only (G8).

Everyone codes against this file. Changes are additive only: ask in chat.
The enums are Django TextChoices so models and serializers reuse them; the shapes
are Pydantic models so every LLM output is validated before it is saved (C1).
"""

from datetime import date, datetime

from django.db import models
from pydantic import BaseModel, Field

# R15: carried by every result payload.
DISCLAIMER = (
    "Guidance only. Read the tender document and confirm with the procuring entity. "
    "Checks cover document content and dates, not official validity."
)

# R4: below this confidence a document needs the user's review.
REVIEW_CONFIDENCE_THRESHOLD = 0.7


class CheckStatus(models.TextChoices):
    MET = "met"
    MISSING = "missing"
    EXPIRING = "expiring"
    UNCLEAR = "unclear"


class OverallStatus(models.TextChoices):
    READY = "ready"
    ATTENTION_NEEDED = "attention_needed"


class DocType(models.TextChoices):
    KRA_TAX_COMPLIANCE = "kra_tax_compliance"
    BUSINESS_REGISTRATION = "business_registration"
    AGPO_CERTIFICATE = "agpo_certificate"
    CR12 = "cr12"
    NATIONAL_ID = "national_id"
    AUDITED_ACCOUNTS = "audited_accounts"
    BANK_STATEMENT = "bank_statement"
    BUSINESS_PERMIT = "business_permit"
    OTHER = "other"
    # Added for persons with disabilities under AGPO (access/agpo_rules.json).
    NCPWD_REGISTRATION = "ncpwd_registration"


class RequirementType(models.TextChoices):
    MANDATORY_DOCUMENT = "mandatory_document"
    ELIGIBILITY = "eligibility"
    SPECIFICATION = "specification"
    FINANCIAL = "financial"
    SUBMISSION = "submission"
    OTHER = "other"


class ChangeCategory(models.TextChoices):
    DEADLINE = "deadline"
    ELIGIBILITY = "eligibility"
    REQUIRED_DOCUMENTS = "required_documents"
    SPECIFICATIONS_QUANTITIES = "specifications_quantities"
    PRICING_FORMAT = "pricing_format"
    SUBMISSION_METHOD = "submission_method"


class Channel(models.TextChoices):
    IN_APP = "in_app"
    EMAIL = "email"


class VersionSource(models.TextChoices):
    UPLOAD = "upload"
    EMAIL_FORWARD = "email_forward"  # Could, not in this sprint


# --- Documents (B) ---


class ExtractedDocument(BaseModel):
    """Output of extract_document. Fields not visible in the document are null (R4)."""

    document_type: DocType
    holder_name: str | None = None
    kra_pin: str | None = None
    registration_number: str | None = None
    issued_on: date | None = None
    expires_on: date | None = None
    directors: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0, le=1)
    needs_review: bool = False


# --- Tenders (B) ---


class Requirement(BaseModel):
    """One tender requirement. Stored as JSON on TenderVersion.requirements."""

    id: str
    label: str
    requirement_type: RequirementType
    required_doc_type: DocType | None = None
    mandatory: bool = True
    source_quote: str | None = None  # R5: no quote means dropped or unclear
    page: int | None = None


class TenderExtraction(BaseModel):
    """Output of extract_tender."""

    deadline: datetime | None = None
    requirements: list[Requirement] = Field(default_factory=list)
    summary_en: str = ""
    text: str = ""
    text_hash: str = ""


# --- Readiness check (A) ---


class DocumentFacts(BaseModel):
    """What the rules engine needs from a Document row. Built by the caller, so rules/ never
    touches the database (C3)."""

    id: int
    doc_type: DocType
    confirmed: bool  # R2: unconfirmed counts as absent
    issued_on: date | None = None
    expires_on: date | None = None
    holder_name: str | None = None
    kra_pin: str | None = None
    registration_number: str | None = None
    directors: list[str] = Field(default_factory=list)


class ProfileFacts(BaseModel):
    """What the rules engine needs from the user's business profile."""

    business_name: str = ""
    kra_pin: str = ""
    reg_number: str = ""


class CheckItem(BaseModel):
    requirement_id: str
    label: str
    status: CheckStatus
    doc_id: int | None = None
    expires_on: date | None = None
    reason: str = ""
    source_quote: str | None = None
    page: int | None = None
    insight: list[dict] = Field(default_factory=list)


class Mismatch(BaseModel):
    field: str
    values: list[str]
    doc_ids: list[int]


class CheckResult(BaseModel):
    """The check result shape agreed in M0. Do not change after M2 without telling everyone."""

    tender_id: int | None = None
    version_no: int | None = None
    deadline: datetime | None = None
    overall: OverallStatus  # R20: no score
    items: list[CheckItem] = Field(default_factory=list)
    mismatches: list[Mismatch] = Field(default_factory=list)
    deadline_note: str | None = None
    disclaimer: str = DISCLAIMER


class Flip(BaseModel):
    """One requirement whose status differs between two checks (R8)."""

    requirement_id: str
    label: str
    old_status: CheckStatus | None = None  # None: the requirement is new in this version
    new_status: CheckStatus | None = None  # None: the requirement was removed
    reason: str = ""


# --- Addenda, alerts and insight (C) ---


class Change(BaseModel):
    """Output of compare_versions. Every change carries its quotes (R5)."""

    category: ChangeCategory
    old_quote: str | None = None
    new_quote: str | None = None
    explanation: str = ""
    affects_user: bool = False


class AlertMessage(BaseModel):
    """Output of build_alert."""

    subject: str
    body_text: str
    body_html: str = ""


class AddendumResult(BaseModel):
    """Output of process_addendum. created is False for a duplicate upload (R9)."""

    created: bool
    version_no: int
    changes: list[Change] = Field(default_factory=list)
    check: CheckResult | None = None
    flips: list[Flip] = Field(default_factory=list)
    alert_id: int | None = None


class InsightCase(BaseModel):
    """Output of get_insights: one rejection case from the seed data."""

    doc_type: DocType
    reason: str
    source_title: str = ""
    source_url: str = ""
    year: int | None = None
    tags: list[str] = Field(default_factory=list)
    illustrative: bool = False
