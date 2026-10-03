"""versions models. Owner: C. Defined by the lead in M0 (section 4 of the sprint plan)."""

from django.db import models

from core.contracts import ChangeCategory


class TenderChange(models.Model):
    """One change between two versions of a tender. Every change carries its quotes (R5)."""

    tender = models.ForeignKey("tenders.Tender", on_delete=models.CASCADE, related_name="changes")
    from_version = models.ForeignKey(
        "tenders.TenderVersion", on_delete=models.CASCADE, related_name="changes_from"
    )
    to_version = models.ForeignKey(
        "tenders.TenderVersion", on_delete=models.CASCADE, related_name="changes_to"
    )
    category = models.CharField(max_length=40, choices=ChangeCategory.choices)
    old_quote = models.TextField(blank=True)
    new_quote = models.TextField(blank=True)
    affects_user = models.BooleanField(default=False)
    explanation = models.TextField(blank=True)

    class Meta:
        ordering = ["tender", "to_version", "pk"]

    def __str__(self) -> str:
        return f"TenderChange {self.pk} ({self.category})"
