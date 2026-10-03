"""documents models. Owner: B. Defined by the lead in M0 (section 4 of the sprint plan)."""

from django.conf import settings
from django.db import models

from core.contracts import DocType


class Document(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="documents"
    )
    doc_type = models.CharField(max_length=40, choices=DocType.choices, default=DocType.OTHER)
    file = models.ForeignKey("core.StoredFile", on_delete=models.CASCADE, related_name="documents")
    extracted = models.JSONField(default=dict, blank=True)
    confidence = models.FloatField(null=True, blank=True)
    needs_review = models.BooleanField(default=False)  # R4
    issued_on = models.DateField(null=True, blank=True)
    expires_on = models.DateField(null=True, blank=True)
    confirmed = models.BooleanField(default=False)  # R2: only confirmed documents count
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Document {self.pk} ({self.doc_type})"
