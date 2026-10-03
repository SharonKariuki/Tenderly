"""versions services. Owner: C.

process_addendum is the whole addenda flow: store version n+1, compare it with the version
before, re-run the check, mark the changes that affect the user and write the alert.
"""

import hashlib
import io
import logging
import time
from dataclasses import dataclass
from functools import partial

import pdfplumber
from django.db import transaction

from alerts import services as alert_services
from alerts.email import build_alert
from alerts.models import Alert
from checks.services import recheck, run_check, stored_check
from core.contracts import (
    AddendumResult,
    Change,
    ChangeCategory,
    CheckResult,
    CheckStatus,
    Flip,
    Requirement,
    TenderExtraction,
    VersionSource,
)
from core.exceptions import Unprocessable
from core.models import StoredFile
from tenders.models import Tender, TenderVersion
from tenders.services import extract_tender
from versions.compare import compare_versions, normalise
from versions.models import TenderChange

logger = logging.getLogger(__name__)

PDF_MIME = "application/pdf"

# Changes that add something to the checklist. The other categories (quantities, pricing,
# submission method) are not on the checklist, so the app cannot tell whether they affect her.
REQUIREMENT_CATEGORIES = (ChangeCategory.REQUIRED_DOCUMENTS, ChangeCategory.ELIGIBILITY)


@dataclass(frozen=True)
class PendingVersion:
    """An addendum that was read and compared but not saved yet."""

    latest: TenderVersion
    extraction: TenderExtraction
    changes: list[Change]
    sha256: str


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


def unchanged(tender: Tender, version: TenderVersion) -> AddendumResult:
    """R9: the upload is a version we already have. Nothing is created; the stored check of
    that version is returned as it is, not run again."""
    check = stored_check(tender.owner, tender, version.version_no)
    return AddendumResult(
        created=False,
        version_no=version.version_no,
        changes=saved_changes(version),
        check=CheckResult.model_validate(check.result) if check else None,
    )


def read_addendum(tender: Tender, file_bytes: bytes, mime: str) -> TenderVersion | PendingVersion:
    """Extract and compare an upload without writing anything. Returns the existing version
    when the upload is one we already have (R9)."""
    versions = list(tender.versions.select_related("file").order_by("version_no"))
    if not versions:
        raise Unprocessable(
            "This tender has no version to compare the addendum with.", code="no_version"
        )
    latest = versions[-1]

    # R9, first gate: the very same file needs no extraction at all.
    sha256 = hashlib.sha256(file_bytes).hexdigest()
    for version in versions:
        if version.file.sha256 == sha256:
            return version

    extraction = extract_tender(file_bytes, mime)

    # R9, second gate: a different file with the same text.
    for version in versions:
        if extraction.text_hash and version.text_hash == extraction.text_hash:
            return version

    baseline = TenderExtraction(
        deadline=latest.deadline,
        requirements=latest.requirements,
        summary_en=latest.summary_en,
        text=read_text_layer(bytes(latest.file.data), latest.file.mime),
        text_hash=latest.text_hash,
    )
    return PendingVersion(
        latest=latest,
        extraction=extraction,
        changes=compare_versions(baseline, extraction),
        sha256=sha256,
    )


def save_version(
    tender: Tender, pending: PendingVersion, file_bytes: bytes, mime: str, filename: str
) -> tuple[TenderVersion, list[TenderChange]]:
    """R7: append-only. The latest version is read, never written."""
    latest, extraction = pending.latest, pending.extraction
    version_no = latest.version_no + 1
    stored = StoredFile.objects.create(
        owner=tender.owner,
        filename=filename,
        mime=mime,
        size=len(file_bytes),
        sha256=pending.sha256,
        data=file_bytes,
    )
    version = TenderVersion.objects.create(
        tender=tender,
        version_no=version_no,
        source=VersionSource.UPLOAD,
        file=stored,
        text_hash=extraction.text_hash,
        deadline=extraction.deadline or latest.deadline,
        requirements=merge_requirements(latest.requirements, extraction.requirements, version_no),
        summary_en=latest.summary_en,
    )
    rows = [
        TenderChange.objects.create(
            tender=tender,
            from_version=latest,
            to_version=version,
            category=change.category,
            old_quote=change.old_quote or "",
            new_quote=change.new_quote or "",
            explanation=change.explanation,
        )
        for change in pending.changes
    ]
    tender.current_version = version_no
    tender.save(update_fields=["current_version"])
    return version, rows


def _same_sentence(quote: str | None, other: str | None) -> bool:
    if not quote or not other:
        return False
    a, b = normalise(quote), normalise(other)
    return a in b or b in a


def mark_affected(changes: list[Change], flips: list[Flip], check: CheckResult) -> list[Change]:
    """Decide which changes affect the user (pure, C3). The flips of the re-run check are the
    evidence, never the LLM:

    - a deadline change affects her when a requirement she already had stopped being met;
    - a new required document or eligibility rule affects her when the requirement it added
      is not met. The two are matched by quote; an added requirement with no quote counts
      for every such change, because the app cannot tell them apart.
    """
    bad = [flip for flip in flips if flip.new_status not in (None, CheckStatus.MET)]
    deadline_hit = any(flip.old_status is not None for flip in bad)
    added_ids = {flip.requirement_id for flip in bad if flip.old_status is None}
    added_quotes = [item.source_quote for item in check.items if item.requirement_id in added_ids]

    marked = []
    for change in changes:
        if change.category == ChangeCategory.DEADLINE:
            affected = deadline_hit
        elif change.category in REQUIREMENT_CATEGORIES:
            affected = any(
                quote is None or _same_sentence(change.new_quote, quote) for quote in added_quotes
            )
        else:
            affected = False
        marked.append(change.model_copy(update={"affects_user": affected}))
    return marked


def process_addendum(
    tender: Tender, file_bytes: bytes, mime: str, *, filename: str = "addendum"
) -> AddendumResult:
    started = time.monotonic()
    pending = read_addendum(tender, file_bytes, mime)
    if isinstance(pending, TenderVersion):
        return unchanged(tender, pending)

    user = tender.owner
    with transaction.atomic():
        # R8: the flips must show what the addendum did, so the version before it is checked
        # against today's documents first (a no-op when its stored check is still current).
        run_check(user, tender)
        version, rows = save_version(tender, pending, file_bytes, mime, filename)
        check, flips = recheck(user, tender)

        changes = mark_affected(pending.changes, flips, check)
        for row, change in zip(rows, changes, strict=True):
            if change.affects_user:
                row.affects_user = True
                row.save(update_fields=["affects_user"])

        message = build_alert(
            flips,
            changes,
            check.deadline_note,
            tender_title=tender.title,
            result_url=alert_services.result_url(tender.pk),
        )
        # R17: the in-app row first; the email only after the commit, off the request.
        alert = Alert.objects.create(owner=user, tender=tender, message=message.body_text)
        alert.changes.set(rows)
        transaction.on_commit(partial(alert_services.send_later, alert.pk, user.pk, message))

    # R16: ids, sizes and timings only.
    logger.info(
        "addendum stored tender_id=%s version_no=%s bytes=%s changes=%s flips=%s seconds=%.2f",
        tender.pk,
        version.version_no,
        len(file_bytes),
        len(changes),
        len(flips),
        time.monotonic() - started,
    )
    return AddendumResult(
        created=True,
        version_no=version.version_no,
        changes=changes,
        check=check,
        flips=flips,
        alert_id=alert.pk,
    )
