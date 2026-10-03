"""accounts views. Owner: A (lead).

Register, login and profile are real. me/data is a stub until M2.
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
from accounts.serializers import (
    LoginSerializer,
    ProfileSerializer,
    RegisterSerializer,
    TokenResponseSerializer,
)


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


class ProfileView(APIView):
    """The signed-in user's business profile and consent."""

    @extend_schema(responses=ProfileSerializer)
    def get(self, request: Request) -> Response:
        return Response(ProfileSerializer(request.user).data)

    @extend_schema(request=ProfileSerializer, responses=ProfileSerializer)
    def put(self, request: Request) -> Response:
        # Partial on purpose: the frontend saves the profile form and the consent tick apart.
        serializer = ProfileSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class MeDataView(APIView):
    """Stub (M0). Made real in M2; the stub deletes nothing."""

    @extend_schema(responses=OpenApiTypes.OBJECT)
    def delete(self, request: Request) -> Response:
        return Response({"deleted": {"documents": 0, "tenders": 0, "alerts": 0, "files": 0}})
