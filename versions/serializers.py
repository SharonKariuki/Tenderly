"""versions serializers. Owner: C."""

from django.conf import settings
from rest_framework import serializers

from core.contracts import ChangeCategory
from tenders.models import TenderVersion
from versions.models import TenderChange


class AddendumUploadSerializer(serializers.Serializer):
    file = serializers.FileField()

    def validate_file(self, upload):
        if upload.size > settings.MAX_UPLOAD_MB * 1024 * 1024:
            raise serializers.ValidationError(
                f"The file is larger than {settings.MAX_UPLOAD_MB} MB.", code="file_too_large"
            )
        return upload


class VersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TenderVersion
        fields = ["version_no", "source", "deadline", "published_on", "created_at"]
        read_only_fields = fields


class TenderChangeSerializer(serializers.ModelSerializer):
    from_version = serializers.IntegerField(source="from_version.version_no", read_only=True)
    to_version = serializers.IntegerField(source="to_version.version_no", read_only=True)

    class Meta:
        model = TenderChange
        fields = [
            "id",
            "from_version",
            "to_version",
            "category",
            "old_quote",
            "new_quote",
            "affects_user",
            "explanation",
        ]
        read_only_fields = fields


class ChangeSerializer(serializers.Serializer):
    category = serializers.ChoiceField(choices=ChangeCategory.choices)
    old_quote = serializers.CharField(allow_null=True)
    new_quote = serializers.CharField(allow_null=True)
    explanation = serializers.CharField(allow_blank=True)
    affects_user = serializers.BooleanField()


class AddendumResultSerializer(serializers.Serializer):
    """The AddendumResult contract (core.contracts)."""

    created = serializers.BooleanField()
    version_no = serializers.IntegerField()
    changes = ChangeSerializer(many=True)
    check = serializers.JSONField(allow_null=True)
    flips = serializers.ListField(child=serializers.JSONField())
    alert_id = serializers.IntegerField(allow_null=True)
