"""Readiness check orchestration. Owner: A (lead).

Loads the rows, hands plain facts to the rules engine (which decides, R3) and stores the
result per tender version (R7).
"""

from django.utils import timezone
from pydantic import ValidationError
from rest_framework.exceptions import NotFound

from accounts.models import User
from checks.models import Check
from core.contracts import CheckResult, DocumentFacts, Flip, ProfileFacts, Requirement
from core.exceptions import Unprocessable
from documents.models import Document
from rules.engine import diff_checks, make_deadline_note, run_readiness_check
from tenders.models import Tender, TenderVersion


def document_facts(document: Document) -> DocumentFacts:
    extracted = document.extracted or {}
    return DocumentFacts(
        id=document.pk,
        doc_type=document.doc_type,
        confirmed=document.confirmed,
        issued_on=document.issued_on,
        expires_on=document.expires_on,
        holder_name=extracted.get("holder_name"),
        kra_pin=extracted.get("kra_pin"),
        registration_number=extracted.get("registration_number"),
        directors=extracted.get("directors") or [],
    )


def profile_facts(user: User) -> ProfileFacts:
    return ProfileFacts(
        business_name=user.business_name, kra_pin=user.kra_pin, reg_number=user.reg_number
    )


def latest_version(tender: Tender) -> TenderVersion:
    version = tender.versions.order_by("-version_no").first()
    if version is None:
        raise Unprocessable("This tender has no version to check yet.", code="no_version")
    return version


def build_result(user: User, tender: Tender, version: TenderVersion) -> CheckResult:
    try:
        requirements = [Requirement.model_validate(item) for item in version.requirements]
    except ValidationError as error:
        raise Unprocessable(
            "The requirements of this tender could not be read. Upload the tender again.",
            code="invalid_requirements",
        ) from error

    documents = [document_facts(doc) for doc in Document.objects.filter(owner=user)]
    result = run_readiness_check(
        requirements, documents, profile_facts(user), version.deadline, today=timezone.localdate()
    )
    result.tender_id = tender.pk
    result.version_no = version.version_no

    previous = tender.versions.filter(version_no__lt=version.version_no).order_by("-version_no")
    if previous := previous.first():
        result.deadline_note = make_deadline_note(
            previous.deadline, version.deadline, version.published_on
        )
    return result


def stored_check(user: User, tender: Tender, version_no: int) -> Check | None:
    """The newest stored check of one version (the latest row per version wins)."""
    return (
        Check.objects.filter(owner=user, tender=tender, version_no=version_no)
        .order_by("-created_at", "-pk")
        .first()
    )


def run_check(user: User, tender: Tender) -> tuple[Check, bool]:
    """Run the readiness check on the tender's latest version.

    Idempotent: when the result equals the stored one, that row is returned and nothing is
    written. Returns the check and whether a new row was created.
    """
    version = latest_version(tender)
    result = build_result(user, tender, version).model_dump(mode="json")
    existing = stored_check(user, tender, version.version_no)
    if existing is not None and existing.result == result:
        return existing, False
    check = Check.objects.create(
        tender=tender, version_no=version.version_no, owner=user, result=result
    )
    return check, True


def latest_check(user: User, tender: Tender) -> Check:
    """The newest stored check of the tender's latest version."""
    check = stored_check(user, tender, latest_version(tender).version_no)
    if check is None:
        raise NotFound("No check has been run on the latest version of this tender yet.")
    return check


def recheck(user: User, tender: Tender) -> tuple[CheckResult, list[Flip]]:
    """For the addenda flow (R8): check the latest version and report what flipped against
    the stored check of the version before it. No earlier check means no flips."""
    check, _ = run_check(user, tender)
    new = CheckResult.model_validate(check.result)
    before = (
        Check.objects.filter(owner=user, tender=tender, version_no__lt=check.version_no)
        .order_by("-version_no", "-created_at", "-pk")
        .first()
    )
    if before is None:
        return new, []
    return new, diff_checks(CheckResult.model_validate(before.result), new)
