"""insight models. Owner: C. Defined by the lead in M0 (section 4 of the sprint plan)."""

from django.db import models

from core.contracts import DocType


class RejectionCase(models.Model):
    """A public rejection case from the seed data. Not user data, so not owner-scoped."""

    doc_type = models.CharField(max_length=40, choices=DocType.choices, db_index=True)
    reason = models.TextField()
    source_title = models.CharField(max_length=255, blank=True)
    source_url = models.URLField(max_length=500, blank=True)
    year = models.PositiveIntegerField(null=True, blank=True)
    tags = models.JSONField(default=list, blank=True)
    illustrative = models.BooleanField(default=False)

    class Meta:
        ordering = ["doc_type", "-year", "pk"]

    def __str__(self) -> str:
        return f"RejectionCase {self.pk} ({self.doc_type})"
