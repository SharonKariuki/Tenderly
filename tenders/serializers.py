"""tenders serializers. Owner: B."""

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from tenders.models import Tender, TenderVersion
from tenders.services import latest_version


class TenderListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tender
        fields = ["id", "title", "current_version"]
        read_only_fields = fields


class LatestVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TenderVersion
        fields = [
            "version_no",
            "source",
            "published_on",
            "deadline",
            "requirements",
            "summary_en",
            "created_at",
        ]
        read_only_fields = fields


class TenderSerializer(serializers.ModelSerializer):
    latest_version = serializers.SerializerMethodField()

    class Meta:
        model = Tender
        fields = ["id", "title", "current_version", "created_at", "latest_version"]
        read_only_fields = fields

    @extend_schema_field(LatestVersionSerializer(allow_null=True))
    def get_latest_version(self, tender: Tender) -> dict | None:
        version = latest_version(tender)
        return LatestVersionSerializer(version).data if version else None


class SummaryQuerySerializer(serializers.Serializer):
    lang = serializers.ChoiceField(choices=["en", "sw"], default="en")


class SummarySerializer(serializers.Serializer):
    tender_id = serializers.IntegerField()
    version_no = serializers.IntegerField()
    lang = serializers.CharField()
    summary = serializers.CharField(allow_blank=True)
    needs_human_review = serializers.BooleanField()
