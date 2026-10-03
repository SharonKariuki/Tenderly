"""accounts views. Owner: A (lead).

Register and login are real. Profile and me/data are stubs until M1 and M2.
"""

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.serializers import LoginSerializer, RegisterSerializer, TokenResponseSerializer


def token_payload(user: User) -> dict:
    token, _ = Token.objects.get_or_create(user=user)
    return {"token": token.key, "user_id": user.pk, "email": user.email}


class RegisterView(APIView):
    authentication_classes: list = []
    permission_classes = [AllowAny]

    @extend_schema(request=RegisterSerializer, responses={201: TokenResponseSerializer})
    def post(self, request: Request) -> Response:
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(token_payload(user), status=status.HTTP_201_CREATED)


class LoginView(APIView):
    authentication_classes: list = []
    permission_classes = [AllowAny]

    @extend_schema(request=LoginSerializer, responses={200: TokenResponseSerializer})
    def post(self, request: Request) -> Response:
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        return Response(token_payload(serializer.validated_data["user"]))


STUB_PROFILE = {
    "email": "demo@tenderready.local",
    "business_name": "Demo Business",
    "kra_pin": "P000000000X",
    "reg_number": "PVT-DEMO0001",
    "agpo_category": "women",
    "preferred_language": "en",
    "consent_at": None,
}


class ProfileView(APIView):
    """Stub (M0). Made real in M1."""

    @extend_schema(responses=OpenApiTypes.OBJECT)
    def get(self, request: Request) -> Response:
        return Response(STUB_PROFILE)

    @extend_schema(request=OpenApiTypes.OBJECT, responses=OpenApiTypes.OBJECT)
    def put(self, request: Request) -> Response:
        return Response(STUB_PROFILE)


class MeDataView(APIView):
    """Stub (M0). Made real in M2; the stub deletes nothing."""

    @extend_schema(responses=OpenApiTypes.OBJECT)
    def delete(self, request: Request) -> Response:
        return Response({"deleted": {"documents": 0, "tenders": 0, "alerts": 0, "files": 0}})
