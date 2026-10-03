"""checks models. Owner: A (lead)."""

from django.conf import settings
from django.db import models


class Check(models.Model):
    """A stored readiness check, one per run. The latest row per (tender, version_no) wins."""

    tender = models.ForeignKey("tenders.Tender", on_delete=models.CASCADE, related_name="checks")
    version_no = models.PositiveIntegerField()
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="checks"
    )
    result = models.JSONField()  # core.contracts.CheckResult
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-pk"]
        indexes = [models.Index(fields=["tender", "version_no"])]

    def __str__(self) -> str:
        return f"Check {self.pk} (tender {self.tender_id} v{self.version_no})"
