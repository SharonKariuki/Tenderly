"""alerts models. Owner: C. Defined by the lead in M0 (section 4 of the sprint plan)."""

from django.conf import settings
from django.db import models

from core.contracts import Channel


class Alert(models.Model):
    """R17: the in-app row is written first; the email is sent after commit."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="alerts"
    )
    tender = models.ForeignKey("tenders.Tender", on_delete=models.CASCADE, related_name="alerts")
    changes = models.ManyToManyField("versions.TenderChange", blank=True, related_name="alerts")
    message = models.TextField()
    channel = models.CharField(max_length=10, choices=Channel.choices, default=Channel.IN_APP)
    sent_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-pk"]

    def __str__(self) -> str:
        return f"Alert {self.pk}"
