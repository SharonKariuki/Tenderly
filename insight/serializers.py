"""insight serializers. Owner: C."""

from rest_framework import serializers

from core.contracts import DocType


class InsightQuerySerializer(serializers.Serializer):
    doc_type = serializers.ChoiceField(choices=DocType.choices, required=False)


class InsightCaseSerializer(serializers.Serializer):
    doc_type = serializers.ChoiceField(choices=DocType.choices)
    reason = serializers.CharField()
    source_title = serializers.CharField(allow_blank=True)
    source_url = serializers.CharField(allow_blank=True)
    year = serializers.IntegerField(allow_null=True)
    tags = serializers.ListField(child=serializers.CharField())
    illustrative = serializers.BooleanField()
