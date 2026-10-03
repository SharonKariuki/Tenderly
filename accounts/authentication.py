"""Demo-user fallback (cut order 6). Owner: A (lead)."""

from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework.authentication import BaseAuthentication
from rest_framework.request import Request

DEMO_EMAIL = "demo@tenderready.local"


class DemoUserAuthentication(BaseAuthentication):
    """With DEMO_MODE on, a request that carries no token acts as the one pre-made demo
    account. Listed after TokenAuthentication, so a real token always wins."""

    def authenticate(self, request: Request) -> tuple | None:
        if not settings.DEMO_MODE:
            return None
        user_model = get_user_model()
        user = user_model.objects.filter(email=DEMO_EMAIL).first()
        if user is None:
            user = user_model.objects.create_user(email=DEMO_EMAIL, business_name="Demo Business")
        return (user, None)

    def authenticate_header(self, request: Request) -> str:
        # Keeps unauthenticated requests at 401 rather than 403 when DEMO_MODE is off.
        return "Token"
