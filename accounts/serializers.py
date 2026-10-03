"""accounts serializers. Owner: A (lead)."""

import re

from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from rest_framework import serializers

from core.exceptions import InvalidCredentials

User = get_user_model()

KRA_PIN_RE = re.compile(r"^[AP]\d{9}[A-Z]$")


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_email(self, value: str) -> str:
        email = value.lower()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError(
                "An account with this email already exists.", code="email_taken"
            )
        return email

    def validate_password(self, value: str) -> str:
        validate_password(value)
        return value

    def create(self, validated_data: dict) -> "User":
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs: dict) -> dict:
        user = authenticate(
            request=self.context.get("request"),
            username=attrs["email"].lower(),
            password=attrs["password"],
        )
        if user is None:
            raise InvalidCredentials()
        attrs["user"] = user
        return attrs


class TokenResponseSerializer(serializers.Serializer):
    token = serializers.CharField()
    user_id = serializers.IntegerField()
    email = serializers.EmailField()


class ProfileSerializer(serializers.ModelSerializer):
    """The business profile. Consent is given by sending consent=true; the time is recorded
    once and never moved."""

    consent = serializers.BooleanField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            "email",
            "business_name",
            "kra_pin",
            "reg_number",
            "agpo_category",
            "preferred_language",
            "consent_at",
            "consent",
        ]
        read_only_fields = ["email", "consent_at"]

    def validate_kra_pin(self, value: str) -> str:
        pin = value.strip().upper()
        if pin and not KRA_PIN_RE.match(pin):
            raise serializers.ValidationError(
                "A KRA PIN is a letter (A or P), nine digits and a letter.", code="invalid_kra_pin"
            )
        return pin

    def update(self, instance: "User", validated_data: dict) -> "User":
        if validated_data.pop("consent", False) and instance.consent_at is None:
            instance.consent_at = timezone.now()
        return super().update(instance, validated_data)
