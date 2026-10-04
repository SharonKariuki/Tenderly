"""tenders services. Owner: B.

extract_tender reads a tender document or an addendum with the LLM. Code, not the LLM,
decides what is kept: a requirement whose quote is not in the text layer is dropped (R5).
"""

import hashlib
import io
from dataclasses import dataclass
from datetime import date
from pathlib import PurePath

import pdfplumber
from django.db import transaction
from pydantic import BaseModel, Field, field_validator

from accounts.models import User
from core.contracts import DocType, Requirement, RequirementType, TenderExtraction
from core.exceptions import Unprocessable
from core.models import StoredFile
from llm.client import generate_json
from llm.prompts_extract import (
    SUMMARY_SW_PROMPT,
    SUMMARY_SW_PROMPT_VERSION,
    TENDER_PROMPT,
    TENDER_PROMPT_VERSION,
)
from rules.dates import parse_date, parse_deadline
from tenders.models import Tender, TenderVersion
from versions.compare import quote_in_text

EXTRACT_TASK = "extract_tender"
PDF_MIME = "application/pdf"


class RequirementOutput(BaseModel):
    label: str
    requirement_type: RequirementType = RequirementType.OTHER  # R13: from the fixed enum
    required_doc_type: DocType | None = None
    mandatory: bool = True
    source_quote: str | None = None
    page: int | None = None

    @field_validator("requirement_type", mode="before")
    @classmethod
    def unknown_type_is_other(cls, value: object) -> object:
        """R13: a value outside the enum is "other", not a failed answer."""
        return value if value in RequirementType.values else RequirementType.OTHER

    @field_validator("required_doc_type", mode="before")
    @classmethod
    def unknown_doc_type_is_none(cls, value: object) -> object:
        """No mappable document means the check shows the line as unclear (R6)."""
        return value if value in DocType.values else None

    @field_validator("mandatory", mode="before")
    @classmethod
    def null_is_mandatory(cls, value: object) -> object:
        return True if value is None else value

    @field_validator("page", mode="before")
    @classmethod
    def unreadable_page_is_none(cls, value: object) -> object:
        try:
            return int(value) if value is not None else None
        except (TypeError, ValueError):
            return None


class TenderOutput(BaseModel):
    """What the LLM must return. Dates arrive as text and are parsed in one place (R18)."""

    title: str | None = None
    published_on: str | None = None
    deadline: str | None = None
    requirements: list[RequirementOutput] = Field(default_factory=list)
    summary_en: str = ""

    @field_validator("requirements", mode="before")
    @classmethod
    def null_list_is_empty(cls, value: object) -> object:
        return value or []

    @field_validator("summary_en", mode="before")
    @classmethod
    def null_summary_is_empty(cls, value: object) -> object:
        return value or ""


class KiswahiliSummaryOutput(BaseModel):
    summary: str


@dataclass(frozen=True)
class TenderReading:
    """The extraction contract plus the two facts only the tender row needs."""

    extraction: TenderExtraction
    title: str
    published_on: date | None


def text_layer(file_bytes: bytes, mime: str) -> str:
    """The text layer of a PDF. A scan or a photo has none and gives an empty string."""
    if mime != PDF_MIME:
        return ""
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            return "\n".join(page.extract_text() or "" for page in pdf.pages)
    except Exception:
        return ""


def text_hash(text: str, file_bytes: bytes) -> str:
    """R9: two files with the same words are the same version. Without a text layer the
    file itself is hashed."""
    words = " ".join(text.split()).casefold()
    return hashlib.sha256(words.encode() if words else file_bytes).hexdigest()


def kept_requirements(proposed: list[RequirementOutput], text: str) -> list[Requirement]:
    """R5 (pure, C3). With a text layer, a requirement is kept only when its quote is really
    in the document. A scan has no text to check against, so its requirements are kept with
    the quote the LLM gave. Ids are given here, in document order."""
    kept = []
    for requirement in proposed:
        quote = (requirement.source_quote or "").strip() or None
        if not requirement.label.strip():
            continue
        if text and not quote_in_text(quote, text):
            continue
        kept.append(
            Requirement(
                id=f"r{len(kept) + 1}",
                label=requirement.label.strip(),
                requirement_type=requirement.requirement_type,
                required_doc_type=requirement.required_doc_type,
                mandatory=requirement.mandatory,
                source_quote=quote,
                page=requirement.page,
            )
        )
    return kept


def read_tender(file_bytes: bytes, mime: str) -> TenderReading:
    sha256 = hashlib.sha256(file_bytes).hexdigest()
    # R11: the same file with the same prompt is read once.
    cache_key = f"{EXTRACT_TASK}:{TENDER_PROMPT_VERSION}:{sha256}"
    raw = generate_json(TENDER_PROMPT, TenderOutput, file_bytes, mime, cache_key)
    output = TenderOutput.model_validate(raw)

    text = text_layer(file_bytes, mime)
    extraction = TenderExtraction(
        deadline=parse_deadline(output.deadline),
        requirements=kept_requirements(output.requirements, text),
        summary_en=output.summary_en.strip(),
        text=text,
        text_hash=text_hash(text, file_bytes),
    )
    return TenderReading(
        extraction=extraction,
        title=(output.title or "").strip(),
        published_on=parse_date(output.published_on),
    )


def extract_tender(file_bytes: bytes, mime: str) -> TenderExtraction:
    return read_tender(file_bytes, mime).extraction


def create_tender(user: User, file_bytes: bytes, mime: str, filename: str) -> Tender:
    """Extract first, then store the tender, the file and version 1 together. Nothing is
    stored when extraction fails or finds nothing to check."""
    reading = read_tender(file_bytes, mime)
    extraction = reading.extraction
    if not extraction.requirements and extraction.deadline is None:
        raise Unprocessable(
            "No requirements or closing date could be read from this file. "
            "Check that it is the tender document.",
            code="unreadable_tender",
        )
    with transaction.atomic():
        stored = StoredFile.objects.create(
            owner=user,
            filename=filename,
            mime=mime,
            size=len(file_bytes),
            sha256=hashlib.sha256(file_bytes).hexdigest(),
            data=file_bytes,
        )
        tender = Tender.objects.create(
            owner=user, title=(reading.title or PurePath(filename).stem)[:255], current_version=1
        )
        TenderVersion.objects.create(
            tender=tender,
            version_no=1,
            file=stored,
            text_hash=extraction.text_hash,
            published_on=reading.published_on,
            deadline=extraction.deadline,
            requirements=[item.model_dump(mode="json") for item in extraction.requirements],
            summary_en=extraction.summary_en,
        )
    return tender


def latest_version(tender: Tender) -> TenderVersion | None:
    return tender.versions.order_by("-version_no").first()


def summary_for_language(version: TenderVersion, lang: str) -> tuple[str, bool]:
    """Return the saved English summary or generate a cached Kiswahili translation.

    Kiswahili is always flagged for a human review (R14). The English summary is the sole
    source for translation so the model cannot add details absent from the extraction.
    """
    if lang == "en":
        return version.summary_en, False
    if version.summary_sw:
        return version.summary_sw, True
    cache_key = f"summary_sw:{SUMMARY_SW_PROMPT_VERSION}:{version.text_hash}"
    translated = generate_json(
        SUMMARY_SW_PROMPT.format(summary=version.summary_en),
        KiswahiliSummaryOutput,
        cache_key=cache_key,
    )["summary"].strip()
    version.summary_sw = translated
    version.save(update_fields=["summary_sw"])
    return translated, True
