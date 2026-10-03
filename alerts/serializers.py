"""alerts serializers. Owner: C."""

from rest_framework import serializers

from alerts.models import Alert


class AlertSerializer(serializers.ModelSerializer):
    tender_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = Alert
        fields = [
            "id",
            "tender_id",
            "changes",
            "message",
            "channel",
            "sent_at",
            "read_at",
            "created_at",
        ]
        read_only_fields = fields
