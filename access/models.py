"""access models: accessibility preferences, trusted helpers, bid confirmation and access
support requests. Owner: B.

Every row belongs to the business owner (R19). A helper is another user who acts on the
owner's behalf within the permission the owner chose.
"""

import secrets

from django.conf import settings
from django.db import models


class TextSize(models.TextChoices):
    STANDARD = "standard"
    LARGE = "large"
    LARGER = "larger"


class AccessibilityPrefs(models.Model):
    owner = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="accessibility_prefs"
    )
    text_size = models.CharField(max_length=10, choices=TextSize.choices, default=TextSize.STANDARD)
    high_contrast = models.BooleanField(default=False)
    reduce_motion = models.BooleanField(default=False)
    dyslexia_spacing = models.BooleanField(default=False)
    # The settings are offered once during sign up; this records that they were offered.
    prompt_seen = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"AccessibilityPrefs {self.pk}"


class HelperRole(models.TextChoices):
    FAMILY = "family"
    ACCOUNTANT = "accountant"
    INTERPRETER = "interpreter"
    OTHER = "other"


class HelperPermission(models.TextChoices):
    """Each level includes the ones before it. Submitting a bid is never delegated."""

    VIEW = "view"
    UPLOAD = "upload"
    PREPARE = "prepare"


PERMISSION_RANK = {
    HelperPermission.VIEW: 1,
    HelperPermission.UPLOAD: 2,
    HelperPermission.PREPARE: 3,
}


class HelperStatus(models.TextChoices):
    INVITED = "invited"
    ACTIVE = "active"
    REMOVED = "removed"


def new_invite_token() -> str:
    return secrets.token_urlsafe(24)


class Helper(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="helpers"
    )
    name = models.CharField(max_length=120)
    role = models.CharField(max_length=20, choices=HelperRole.choices, default=HelperRole.OTHER)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    permission = models.CharField(
        max_length=10, choices=HelperPermission.choices, default=HelperPermission.VIEW
    )
    status = models.CharField(
        max_length=10, choices=HelperStatus.choices, default=HelperStatus.INVITED
    )
    token = models.CharField(max_length=64, unique=True, default=new_invite_token)
    helper_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="helping",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    removed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Helper {self.pk}"

    def allows(self, needed: str) -> bool:
        return self.status == HelperStatus.ACTIVE and (
            PERMISSION_RANK[HelperPermission(self.permission)]
            >= PERMISSION_RANK[HelperPermission(needed)]
        )


class HelperAction(models.TextChoices):
    INVITED = "invited"
    ACCEPTED = "accepted"
    PERMISSION_CHANGED = "permission_changed"
    REMOVED = "removed"
    VIEWED_DOCUMENTS = "viewed_documents"
    UPLOADED_DOCUMENT = "uploaded_document"
    PREPARED_BID = "prepared_bid"
    OWNER_CONFIRMED_BID = "owner_confirmed_bid"


class HelperActivity(models.Model):
    """The log shown on the Documents screen. Kept when a helper is removed."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="helper_activity"
    )
    helper = models.ForeignKey(Helper, on_delete=models.CASCADE, related_name="activity")
    action = models.CharField(max_length=30, choices=HelperAction.choices)
    detail = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"HelperActivity {self.pk} ({self.action})"


class BidStatus(models.TextChoices):
    PREPARED = "prepared"
    CONFIRMED = "confirmed"


class BidConfirmation(models.Model):
    """A helper may prepare a bid; only the owner confirms it for submission."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bid_confirmations"
    )
    tender = models.ForeignKey(
        "tenders.Tender", on_delete=models.CASCADE, related_name="bid_confirmations"
    )
    status = models.CharField(max_length=10, choices=BidStatus.choices, default=BidStatus.PREPARED)
    prepared_by = models.ForeignKey(
        Helper, on_delete=models.SET_NULL, null=True, blank=True, related_name="prepared_bids"
    )
    note = models.CharField(max_length=500, blank=True)
    prepared_at = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["owner", "tender"], name="one_bid_per_tender")
        ]

    def __str__(self) -> str:
        return f"BidConfirmation {self.pk} ({self.status})"


class EventKind(models.TextChoices):
    BRIEFING = "briefing"
    SITE_VISIT = "site_visit"


class AccessNeed(models.TextChoices):
    WHEELCHAIR_ACCESS = "wheelchair_access"
    SIGN_LANGUAGE_INTERPRETER = "sign_language_interpreter"
    ACCESSIBLE_DOCUMENTS = "accessible_documents"
    REMOTE_ATTENDANCE = "remote_attendance"


class AccessRequest(models.Model):
    """An accommodation request letter for a tender briefing or site visit.

    `event_key` is the calendar event's id in the frontend, so the event can carry the
    "Support requested" chip.
    """

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="access_requests"
    )
    event_key = models.CharField(max_length=80)
    event_kind = models.CharField(max_length=20, choices=EventKind.choices)
    event_title = models.CharField(max_length=255)
    event_date = models.DateTimeField()
    venue = models.CharField(max_length=255, blank=True)
    entity_name = models.CharField(max_length=255)
    tender_reference = models.CharField(max_length=100, blank=True)
    needs = models.JSONField(default=list)
    other_need = models.CharField(max_length=500, blank=True)
    language = models.CharField(max_length=2, default="en")
    letter_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["owner", "event_key"], name="one_request_per_event")
        ]

    def __str__(self) -> str:
        return f"AccessRequest {self.pk}"
