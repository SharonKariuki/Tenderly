"""versions services. Owner: C.

store_addendum is the M2 storage step: a new version and its changes, no re-check yet.
process_addendum (M3) wraps it with the re-check and the alert.
"""

import hashlib
import io

import pdfplumber
from django.db import transaction

from core.contracts import AddendumResult, Change, Requirement, TenderExtraction, VersionSource
from core.exceptions import Unprocessable
from core.models import StoredFile
from tenders.models import Tender, TenderVersion
from tenders.services import extract_tender
from versions.compare import compare_versions
from versions.models import TenderChange

PDF_MIME = "application/pdf"


def read_text_layer(file_bytes: bytes, mime: str) -> str:
    """The text layer of a stored PDF. Scans and photos have none and give an empty string,
    which means quotes cannot be checked against them (R5)."""
    if mime != PDF_MIME:
        return ""
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            return "\n".join(page.extract_text() or "" for page in pdf.pages)
    except Exception:
        return ""


def merge_requirements(
    current: list[dict], added: list[Requirement], version_no: int
) -> list[dict]:
    """An addendum is a notice of amendments, not a full tender, so the new version keeps the
    current requirements and appends the ones the addendum adds. New ids are prefixed with
    the version so they never collide with the baseline ids."""
    known = {" ".join(str(item.get("label", "")).casefold().split()) for item in current}
    merged = list(current)
    for requirement in added:
        if " ".join(requirement.label.casefold().split()) in known:
            continue
        merged.append(
            requirement.model_copy(update={"id": f"v{version_no}-{requirement.id}"}).model_dump(
                mode="json"
            )
        )
    return merged


def saved_changes(version: TenderVersion) -> list[Change]:
    return [
        Change(
            category=row.category,
            old_quote=row.old_quote or None,
            new_quote=row.new_quote or None,
            explanation=row.explanation,
            affects_user=row.affects_user,
        )
        for row in TenderChange.objects.filter(to_version=version)
    ]


def unchanged(version: TenderVersion) -> AddendumResult:
    """R9: the upload is a version we already have. Nothing new is created."""
    return AddendumResult(
        created=False, version_no=version.version_no, changes=saved_changes(version)
    )


def store_addendum(tender: Tender, file_bytes: bytes, mime: str, filename: str) -> AddendumResult:
    versions = list(tender.versions.select_related("file").order_by("version_no"))
    if not versions:
        raise Unprocessable("This tender has no version to compare the addendum with.")
    latest = versions[-1]

    # R9, first gate: the very same file needs no extraction at all.
    sha256 = hashlib.sha256(file_bytes).hexdigest()
    for version in versions:
        if version.file.sha256 == sha256:
            return unchanged(version)

    extraction = extract_tender(file_bytes, mime)

    # R9, second gate: a different file with the same text.
    for version in versions:
        if extraction.text_hash and version.text_hash == extraction.text_hash:
            return unchanged(version)

    baseline = TenderExtraction(
        deadline=latest.deadline,
        requirements=latest.requirements,
        summary_en=latest.summary_en,
        text=read_text_layer(bytes(latest.file.data), latest.file.mime),
        text_hash=latest.text_hash,
    )
    changes = compare_versions(baseline, extraction)

    version_no = latest.version_no + 1
    with transaction.atomic():
        stored = StoredFile.objects.create(
            owner=tender.owner,
            filename=filename,
            mime=mime,
            size=len(file_bytes),
            sha256=sha256,
            data=file_bytes,
        )
        # R7: append-only. The latest version is read, never written.
        version = TenderVersion.objects.create(
            tender=tender,
            version_no=version_no,
            source=VersionSource.UPLOAD,
            file=stored,
            text_hash=extraction.text_hash,
            deadline=extraction.deadline or latest.deadline,
            requirements=merge_requirements(
                latest.requirements, extraction.requirements, version_no
            ),
            summary_en=latest.summary_en,
        )
        TenderChange.objects.bulk_create(
            TenderChange(
                tender=tender,
                from_version=latest,
                to_version=version,
                category=change.category,
                old_quote=change.old_quote or "",
                new_quote=change.new_quote or "",
                affects_user=change.affects_user,
                explanation=change.explanation,
            )
            for change in changes
        )
        tender.current_version = version_no
        tender.save(update_fields=["current_version"])

    return AddendumResult(created=True, version_no=version_no, changes=changes)


def process_addendum(tender: Tender, file_bytes: bytes, mime: str) -> AddendumResult:
    raise NotImplementedError("M3: feat/c-addenda-flow")
