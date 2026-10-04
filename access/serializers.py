"""access serializers. Owner: B."""

from rest_framework import serializers

from access import agpo
from access.models import (
    AccessibilityPrefs,
    AccessNeed,
    AccessRequest,
    BidConfirmation,
    EventKind,
    Helper,
    HelperActivity,
    HelperPermission,
    HelperRole,
)
from access.services import invite_url


class AccessibilityPrefsSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccessibilityPrefs
        fields = [
            "text_size",
            "high_contrast",
            "reduce_motion",
            "dyslexia_spacing",
            "prompt_seen",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]


class AgpoCategorySerializer(serializers.Serializer):
    agpo_category = serializers.ChoiceField(choices=[])

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["agpo_category"].choices = agpo.category_ids()


class HelperSerializer(serializers.ModelSerializer):
    invite_url = serializers.SerializerMethodField()

    class Meta:
        model = Helper
        fields = [
            "id",
            "name",
            "role",
            "email",
            "phone",
            "permission",
            "status",
            "invite_url",
            "created_at",
            "accepted_at",
            "removed_at",
        ]
        read_only_fields = ["status", "created_at", "accepted_at", "removed_at"]

    def get_invite_url(self, helper: Helper) -> str | None:
        return invite_url(helper) if helper.status == "invited" else None


class HelperInviteSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    role = serializers.ChoiceField(choices=HelperRole.choices, default=HelperRole.OTHER)
    email = serializers.EmailField(required=False, allow_blank=True, default="")
    phone = serializers.RegexField(
        r"^\+?[0-9 ]{9,15}$",
        required=False,
        allow_blank=True,
        default="",
        error_messages={"invalid": "Use a phone number like 0712 345 678 or +254 712 345 678."},
    )
    permission = serializers.ChoiceField(
        choices=HelperPermission.choices, default=HelperPermission.VIEW
    )


class HelperPermissionSerializer(serializers.Serializer):
    permission = serializers.ChoiceField(choices=HelperPermission.choices)


class AcceptInviteSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=64)


class HelperOwnerSerializer(serializers.ModelSerializer):
    """What a helper sees about each owner they help."""

    owner_id = serializers.IntegerField(source="owner.pk")
    business_name = serializers.CharField(source="owner.business_name")

    class Meta:
        model = Helper
        fields = ["id", "owner_id", "business_name", "permission"]


class HelperActivitySerializer(serializers.ModelSerializer):
    helper_name = serializers.CharField(source="helper.name")

    class Meta:
        model = HelperActivity
        fields = ["id", "helper", "helper_name", "action", "detail", "created_at"]


class BidConfirmationSerializer(serializers.ModelSerializer):
    prepared_by_name = serializers.CharField(source="prepared_by.name", default=None)

    class Meta:
        model = BidConfirmation
        fields = ["tender", "status", "prepared_by_name", "note", "prepared_at", "confirmed_at"]


class PrepareBidSerializer(serializers.Serializer):
    note = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")


class AccessRequestCreateSerializer(serializers.Serializer):
    event_key = serializers.CharField(max_length=80)
    event_kind = serializers.ChoiceField(choices=EventKind.choices)
    event_title = serializers.CharField(max_length=255)
    event_date = serializers.DateTimeField()
    venue = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    entity_name = serializers.CharField(max_length=255)
    tender_reference = serializers.CharField(
        max_length=100, required=False, allow_blank=True, default=""
    )
    needs = serializers.ListField(
        child=serializers.ChoiceField(choices=AccessNeed.choices), allow_empty=True
    )
    other_need = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
    language = serializers.ChoiceField(choices=["en", "sw"], default="en")

    def validate(self, attrs: dict) -> dict:
        if not attrs["needs"] and not attrs["other_need"].strip():
            raise serializers.ValidationError(
                {"needs": "Choose at least one kind of support, or describe what you need."}
            )
        attrs["needs"] = list(dict.fromkeys(attrs["needs"]))
        return attrs


class AccessRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccessRequest
        fields = [
            "id",
            "event_key",
            "event_kind",
            "event_title",
            "event_date",
            "venue",
            "entity_name",
            "tender_reference",
            "needs",
            "other_need",
            "language",
            "letter_text",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [f for f in fields if f != "letter_text"]

    def validate_letter_text(self, value: str) -> str:
        if not value.strip():
            raise serializers.ValidationError("The letter cannot be empty.")
        return value
