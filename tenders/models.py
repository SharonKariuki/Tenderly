"""tenders models. Owner: B. Defined by the lead in M0 (section 4 of the sprint plan)."""

from django.conf import settings
from django.db import models

from core.contracts import VersionSource


class Tender(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="tenders"
    )
    title = models.CharField(max_length=255)
    current_version = models.PositiveIntegerField(default=1)  # version_no of the latest version
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Tender {self.pk}"


class TenderVersion(models.Model):
    """R7: append-only. Requirements, deadline and summaries live here, not on Tender,
    because an addendum can change all of them."""

    tender = models.ForeignKey(Tender, on_delete=models.CASCADE, related_name="versions")
    version_no = models.PositiveIntegerField()
    source = models.CharField(
        max_length=20, choices=VersionSource.choices, default=VersionSource.UPLOAD
    )
    file = models.ForeignKey(
        "core.StoredFile", on_delete=models.CASCADE, related_name="tender_versions"
    )
    text_hash = models.CharField(max_length=64, db_index=True)  # R9
    published_on = models.DateField(null=True, blank=True)
    deadline = models.DateTimeField(null=True, blank=True)
    requirements = models.JSONField(default=list, blank=True)
    summary_en = models.TextField(blank=True)
    summary_sw = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["tender", "version_no"]
        constraints = [
            models.UniqueConstraint(
                fields=["tender", "version_no"], name="unique_tender_version_no"
            )
        ]

    def __str__(self) -> str:
        return f"Tender {self.tender_id} v{self.version_no}"
