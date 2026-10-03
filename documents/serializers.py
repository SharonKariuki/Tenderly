"""documents serializers. Owner: B."""

from django.conf import settings
from rest_framework import serializers

from core.contracts import DocType
from documents.models import Document

ALLOWED_MIMES = ("application/pdf", "image/jpeg", "image/png", "image/webp")


class FileUploadSerializer(serializers.Serializer):
    """One uploaded file: a PDF or a photo, up to MAX_UPLOAD_MB."""

    file = serializers.FileField()

    def validate_file(self, upload):
        if upload.size > settings.MAX_UPLOAD_MB * 1024 * 1024:
            raise serializers.ValidationError(
                f"The file is larger than {settings.MAX_UPLOAD_MB} MB.", code="file_too_large"
            )
        if upload.content_type not in ALLOWED_MIMES:
            raise serializers.ValidationError(
                "Upload a PDF or a photo (JPEG, PNG or WebP).", code="unsupported_file_type"
            )
        return upload


class ExtractedFieldsSerializer(serializers.Serializer):
    holder_name = serializers.CharField(allow_null=True, allow_blank=True, required=False)
    kra_pin = serializers.CharField(allow_null=True, allow_blank=True, required=False)
    registration_number = serializers.CharField(allow_null=True, allow_blank=True, required=False)
    directors = serializers.ListField(child=serializers.CharField(), required=False)

    def validate(self, attrs: dict) -> dict:
        """A field she empties is not visible, not an empty string (R4)."""
        for name in ("holder_name", "kra_pin", "registration_number"):
            if name in attrs:
                attrs[name] = (attrs[name] or "").strip() or None
        if attrs.get("kra_pin"):
            attrs["kra_pin"] = attrs["kra_pin"].upper()
        return attrs

    def to_representation(self, instance: dict) -> dict:
        instance = instance or {}
        return {
            "holder_name": instance.get("holder_name"),
            "kra_pin": instance.get("kra_pin"),
            "registration_number": instance.get("registration_number"),
            "directors": instance.get("directors") or [],
        }


class DocumentSerializer(serializers.ModelSerializer):
    filename = serializers.CharField(source="file.filename", read_only=True)
    extracted = ExtractedFieldsSerializer(read_only=True)

    class Meta:
        model = Document
        fields = [
            "id",
            "doc_type",
            "filename",
            "extracted",
            "confidence",
            "needs_review",
            "issued_on",
            "expires_on",
            "confirmed",
            "created_at",
        ]
        read_only_fields = fields


class DocumentUpdateSerializer(serializers.Serializer):
    """The fields the user may correct. Everything is optional; only what is sent changes."""

    doc_type = serializers.ChoiceField(choices=DocType.choices, required=False)
    issued_on = serializers.DateField(allow_null=True, required=False)
    expires_on = serializers.DateField(allow_null=True, required=False)
    confirmed = serializers.BooleanField(required=False)
    extracted = ExtractedFieldsSerializer(required=False)
