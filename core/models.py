"""core models. Owner: A (lead)."""

from django.conf import settings
from django.db import models


class StoredFile(models.Model):
    """An uploaded file kept in Postgres for the MVP. The 10 MB cap (MAX_UPLOAD_MB) is
    enforced in the upload service."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="stored_files"
    )
    filename = models.CharField(max_length=255)
    mime = models.CharField(max_length=100)
    size = models.PositiveIntegerField()
    sha256 = models.CharField(max_length=64, db_index=True)
    data = models.BinaryField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"StoredFile {self.pk}"


class LLMCache(models.Model):
    """R11: LLM results cached by (file hash, task, prompt version)."""

    cache_key = models.CharField(max_length=255, unique=True)
    task = models.CharField(max_length=50)
    result = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"LLMCache {self.task} {self.pk}"
