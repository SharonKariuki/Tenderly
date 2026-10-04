"""access services. Owner: B.

Helpers act for an owner within the permission the owner chose. Every helper action is
logged for the owner to see. Confirming a bid for submission is never delegated.
"""

from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.request import Request

from access.models import (
    AccessibilityPrefs,
    AccessRequest,
    BidConfirmation,
    BidStatus,
    Helper,
    HelperAction,
    HelperActivity,
    HelperStatus,
    new_invite_token,
)
from accounts.models import User
from tenders.models import Tender

ACTING_FOR_HEADER = "HTTP_X_ACTING_FOR"
VIEW_LOG_GAP = timedelta(hours=1)


def get_prefs(user: User) -> AccessibilityPrefs:
    prefs, _ = AccessibilityPrefs.objects.get_or_create(owner=user)
    return prefs


def log(helper: Helper, action: str, detail: str = "") -> HelperActivity:
    return HelperActivity.objects.create(
        owner=helper.owner, helper=helper, action=action, detail=detail[:255]
    )


def invite_url(helper: Helper) -> str:
    origin = settings.CORS_ALLOWED_ORIGINS[0] if settings.CORS_ALLOWED_ORIGINS else ""
    return f"{origin}/helper/accept?token={helper.token}"


@transaction.atomic
def invite_helper(owner: User, data: dict) -> Helper:
    if not data.get("email") and not data.get("phone"):
        raise ValidationError({"contact": "Add a phone number or an email address."})
    if data.get("email", "").lower() == owner.email.lower():
        raise ValidationError({"email": "You cannot invite yourself."})
    helper = Helper.objects.create(owner=owner, **data)
    log(helper, HelperAction.INVITED, f"Invited with {helper.permission} access")
    if helper.email:
        business = owner.business_name or "a business owner"
        send_mail(
            subject=f"{business} invited you to help on TenderReady",
            message=(
                f"Hello {helper.name},\n\n"
                f"{business} has invited you to help with their tenders on TenderReady.\n"
                f"Open this link to accept: {invite_url(helper)}\n\n"
                "If you were not expecting this, you can ignore this email."
            ),
            from_email=None,
            recipient_list=[helper.email],
        )
    return helper


@transaction.atomic
def accept_invite(user: User, token: str) -> Helper:
    helper = Helper.objects.select_for_update().filter(token=token).first()
    if helper is None or helper.status != HelperStatus.INVITED:
        raise NotFound("This invitation is not valid any more. Ask for a new one.")
    if helper.owner_id == user.pk:
        raise ValidationError({"token": "You cannot accept your own invitation."})
    helper.status = HelperStatus.ACTIVE
    helper.helper_user = user
    helper.accepted_at = timezone.now()
    helper.save(update_fields=["status", "helper_user", "accepted_at"])
    log(helper, HelperAction.ACCEPTED)
    return helper


def change_permission(helper: Helper, permission: str) -> Helper:
    if helper.status == HelperStatus.REMOVED:
        raise ValidationError({"permission": "This helper no longer has access."})
    if permission != helper.permission:
        helper.permission = permission
        helper.save(update_fields=["permission"])
        log(helper, HelperAction.PERMISSION_CHANGED, f"Now has {permission} access")
    return helper


def remove_helper(helper: Helper) -> Helper:
    if helper.status != HelperStatus.REMOVED:
        helper.status = HelperStatus.REMOVED
        helper.removed_at = timezone.now()
        # A new token makes the old invitation link useless.
        helper.token = new_invite_token()
        helper.save(update_fields=["status", "removed_at", "token"])
        log(helper, HelperAction.REMOVED)
    return helper


def acting_owner(request: Request, needed: str) -> tuple[User, Helper | None]:
    """The owner whose data this request touches. Without the X-Acting-For header it is
    the signed-in user. With it, the signed-in user must be an active helper of that owner
    with at least the `needed` permission."""
    raw = request.META.get(ACTING_FOR_HEADER)
    if not raw or str(raw) == str(request.user.pk):
        return request.user, None
    helper = (
        Helper.objects.select_related("owner")
        .filter(owner_id=raw if str(raw).isdigit() else None, helper_user=request.user)
        .filter(status=HelperStatus.ACTIVE)
        .first()
    )
    if helper is None:
        # Same answer whether the owner exists or not (R19).
        raise NotFound()
    if not helper.allows(needed):
        raise PermissionDenied("The owner has not given you this permission.")
    return helper.owner, helper


def log_view(helper: Helper) -> None:
    """Viewing is logged at most once an hour, so the log stays readable."""
    recent = HelperActivity.objects.filter(
        helper=helper,
        action=HelperAction.VIEWED_DOCUMENTS,
        created_at__gte=timezone.now() - VIEW_LOG_GAP,
    ).exists()
    if not recent:
        log(helper, HelperAction.VIEWED_DOCUMENTS)


def _owned_tender(owner: User, tender_id: int) -> Tender:
    tender = Tender.objects.filter(pk=tender_id, owner=owner).first()
    if tender is None:
        raise NotFound()
    return tender


def prepare_bid(
    owner: User, helper: Helper | None, tender_id: int, note: str = ""
) -> BidConfirmation:
    tender = _owned_tender(owner, tender_id)
    bid, _ = BidConfirmation.objects.get_or_create(owner=owner, tender=tender)
    if bid.status == BidStatus.CONFIRMED:
        raise ValidationError({"status": "The owner has already confirmed this bid."})
    bid.prepared_by = helper
    bid.note = note
    bid.save(update_fields=["prepared_by", "note"])
    if helper:
        log(helper, HelperAction.PREPARED_BID, tender.title or f"Tender {tender.pk}")
    return bid


def confirm_bid(request: Request, tender_id: int) -> BidConfirmation:
    """Only the owner, signed in as themselves, can confirm. A helper is always refused."""
    if request.META.get(ACTING_FOR_HEADER) and str(request.META[ACTING_FOR_HEADER]) != str(
        request.user.pk
    ):
        raise PermissionDenied("Only the business owner can confirm a bid for submission.")
    owner = request.user
    tender = _owned_tender(owner, tender_id)
    bid, _ = BidConfirmation.objects.get_or_create(owner=owner, tender=tender)
    bid.status = BidStatus.CONFIRMED
    bid.confirmed_at = timezone.now()
    bid.save(update_fields=["status", "confirmed_at"])
    if bid.prepared_by_id:
        log(
            bid.prepared_by, HelperAction.OWNER_CONFIRMED_BID, tender.title or f"Tender {tender.pk}"
        )
    return bid


def delete_access_data(user: User) -> None:
    """For delete-my-data: these rows can describe the owner's disability."""
    AccessRequest.objects.filter(owner=user).delete()
    BidConfirmation.objects.filter(owner=user).delete()
    Helper.objects.filter(owner=user).delete()  # takes the activity log with it
    Helper.objects.filter(helper_user=user).update(
        status=HelperStatus.REMOVED, helper_user=None, removed_at=timezone.now()
    )
    AccessibilityPrefs.objects.filter(owner=user).delete()
