"""Readiness check orchestration. Owner: A (lead).

Loads the rows, hands plain facts to the rules engine (which decides, R3) and stores the
result per tender version (R7).
"""

from django.utils import timezone
from pydantic import ValidationError
from rest_framework.exceptions import NotFound

from accounts.models import User
from checks.models import Check
from core.contracts import CheckResult, DocumentFacts, ProfileFacts, Requirement
from core.exceptions import Unprocessable
from documents.models import Document
from rules.engine import run_readiness_check
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


def run_check(user: User, tender: Tender) -> Check:
    """Run the readiness check on the tender's latest version and store it."""
    version = latest_version(tender)
    try:
        requirements = [Requirement.model_validate(item) for item in version.requirements]
    except ValidationError as error:
        raise Unprocessable(
            "The requirements of this tender could not be read. Upload the tender again.",
            code="invalid_requirements",
        ) from error

    documents = [document_facts(doc) for doc in Document.objects.filter(owner=user)]
    result: CheckResult = run_readiness_check(
        requirements, documents, profile_facts(user), version.deadline, today=timezone.localdate()
    )
    result.tender_id = tender.pk
    result.version_no = version.version_no
    return Check.objects.create(
        tender=tender,
        version_no=version.version_no,
        owner=user,
        result=result.model_dump(mode="json"),
    )


def latest_check(user: User, tender: Tender) -> Check:
    """The newest stored check of the tender's latest version."""
    version = latest_version(tender)
    check = (
        Check.objects.filter(owner=user, tender=tender, version_no=version.version_no)
        .order_by("-created_at", "-pk")
        .first()
    )
    if check is None:
        raise NotFound("No check has been run on the latest version of this tender yet.")
    return check
