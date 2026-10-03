"""accounts services. Owner: A (lead)."""

from django.db import transaction

from accounts.models import User
from alerts.models import Alert
from checks.models import Check
from core.models import LLMCache, StoredFile
from documents.models import Document
from tenders.models import Tender

PROFILE_FIELDS = ("business_name", "kra_pin", "reg_number", "agpo_category")


@transaction.atomic
def delete_user_data(user: User) -> dict[str, int]:
    """Delete every row and file the user owns, and empty the business profile and consent.

    The login (email and password) stays, so the user can start again. Returns how many of
    each were deleted.
    """
    files = StoredFile.objects.filter(owner=user)
    hashes = list(files.values_list("sha256", flat=True).distinct())
    counts = {
        "documents": Document.objects.filter(owner=user).count(),
        "tenders": Tender.objects.filter(owner=user).count(),
        "alerts": Alert.objects.filter(owner=user).count(),
        "files": files.count(),
    }

    # Tenders take their versions, changes, checks and alerts with them.
    Tender.objects.filter(owner=user).delete()
    Check.objects.filter(owner=user).delete()
    Alert.objects.filter(owner=user).delete()
    Document.objects.filter(owner=user).delete()
    files.delete()
    # Cached LLM results hold what was read from the user's files (R11 keys them by file hash).
    for sha256 in hashes:
        LLMCache.objects.filter(cache_key__contains=sha256).delete()

    for field in PROFILE_FIELDS:
        setattr(user, field, "")
    user.consent_at = None
    user.save(update_fields=[*PROFILE_FIELDS, "consent_at"])
    return counts
