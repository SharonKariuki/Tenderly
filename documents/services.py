"""documents services. Owner: B.

extract_document reads one business document with the LLM. Whatever it could not read stays
null, and a low confidence asks the user to review (R4).
"""

import hashlib

from django.db import transaction
from pydantic import BaseModel, Field, field_validator

from accounts.models import User
from core.contracts import REVIEW_CONFIDENCE_THRESHOLD, DocType, ExtractedDocument
from core.models import StoredFile
from documents.models import Document
from llm.client import generate_json
from llm.prompts_extract import DOCUMENT_PROMPT, DOCUMENT_PROMPT_VERSION
from rules.dates import parse_date

EXTRACT_TASK = "extract_document"
EXTRACTED_FIELDS = ("holder_name", "kra_pin", "registration_number", "directors")


class DocumentOutput(BaseModel):
    """What the LLM must return. Dates arrive as text and are parsed in one place (R18)."""

    document_type: DocType = DocType.OTHER
    holder_name: str | None = None
    kra_pin: str | None = None
    registration_number: str | None = None
    issued_on: str | None = None
    expires_on: str | None = None
    directors: list[str] = Field(default_factory=list)
    confidence: float = Field(default=0, ge=0, le=1)

    @field_validator("document_type", mode="before")
    @classmethod
    def unknown_type_is_other(cls, value: object) -> object:
        """A type outside the enum is "other", not a failed answer (R13)."""
        return value if value in DocType.values else DocType.OTHER

    @field_validator("directors", mode="before")
    @classmethod
    def null_list_is_empty(cls, value: object) -> object:
        return value or []

    @field_validator("confidence", mode="before")
    @classmethod
    def percent_to_fraction(cls, value: object) -> object:
        """Some answers give 92 for 0.92. Anything unreadable is 0, which asks for review."""
        try:
            number = float(value)
        except (TypeError, ValueError):
            return 0
        return number / 100 if 1 < number <= 100 else number


def clean(value: str | None) -> str | None:
    """Blank text is the same as not visible (R4)."""
    value = (value or "").strip()
    return value or None


def to_extracted(output: DocumentOutput) -> ExtractedDocument:
    """Apply R4 to the LLM's answer (pure, C3): unreadable dates become null, and a low
    confidence or an unreadable date asks for the user's review."""
    issued_on, expires_on = parse_date(output.issued_on), parse_date(output.expires_on)
    unreadable_date = (clean(output.issued_on) and issued_on is None) or (
        clean(output.expires_on) and expires_on is None
    )
    kra_pin = clean(output.kra_pin)
    return ExtractedDocument(
        document_type=output.document_type,
        holder_name=clean(output.holder_name),
        kra_pin=kra_pin.upper() if kra_pin else None,
        registration_number=clean(output.registration_number),
        issued_on=issued_on,
        expires_on=expires_on,
        directors=[name.strip() for name in output.directors if name and name.strip()],
        confidence=output.confidence,
        needs_review=bool(unreadable_date) or output.confidence < REVIEW_CONFIDENCE_THRESHOLD,
    )


def extract_document(file_bytes: bytes, mime: str, filename: str) -> ExtractedDocument:
    sha256 = hashlib.sha256(file_bytes).hexdigest()
    # R11: the same file with the same prompt is read once.
    cache_key = f"{EXTRACT_TASK}:{DOCUMENT_PROMPT_VERSION}:{sha256}"
    raw = generate_json(DOCUMENT_PROMPT, DocumentOutput, file_bytes, mime, cache_key)
    return to_extracted(DocumentOutput.model_validate(raw))


def create_document(user: User, file_bytes: bytes, mime: str, filename: str) -> Document:
    """Extract first, then store the file and the document together. Nothing is stored when
    extraction fails. A new document is never confirmed: only the user confirms (R2)."""
    extracted = extract_document(file_bytes, mime, filename)
    with transaction.atomic():
        stored = StoredFile.objects.create(
            owner=user,
            filename=filename,
            mime=mime,
            size=len(file_bytes),
            sha256=hashlib.sha256(file_bytes).hexdigest(),
            data=file_bytes,
        )
        return Document.objects.create(
            owner=user,
            doc_type=extracted.document_type,
            file=stored,
            extracted=extracted.model_dump(mode="json", include=set(EXTRACTED_FIELDS)),
            confidence=extracted.confidence,
            needs_review=extracted.needs_review,
            issued_on=extracted.issued_on,
            expires_on=extracted.expires_on,
        )


def update_document(document: Document, changes: dict) -> Document:
    """The user's corrections and confirmation. Corrected values replace the extracted ones;
    confirming means she has reviewed the document."""
    fields = dict(changes)
    corrections = fields.pop("extracted", None)
    if corrections:
        document.extracted = {**(document.extracted or {}), **corrections}
    for name, value in fields.items():
        setattr(document, name, value)
    if fields.get("confirmed"):
        document.needs_review = False
    document.save()
    return document


def delete_document(document: Document) -> None:
    """The stored file goes too; the document row goes with it."""
    document.file.delete()
