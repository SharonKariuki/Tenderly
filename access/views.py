"""access views. Owner: B.

Thin (C8): validate, call the service, respond. Owner-only views use OwnedViewMixin (R19).
"""

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.generics import GenericAPIView, ListAPIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from access import agpo, services
from access.letters import LetterInput, build_letter
from access.models import AccessRequest, Helper, HelperActivity, HelperPermission, HelperStatus
from access.serializers import (
    AcceptInviteSerializer,
    AccessibilityPrefsSerializer,
    AccessRequestCreateSerializer,
    AccessRequestSerializer,
    AgpoCategorySerializer,
    BidConfirmationSerializer,
    HelperActivitySerializer,
    HelperInviteSerializer,
    HelperOwnerSerializer,
    HelperPermissionSerializer,
    HelperSerializer,
    PrepareBidSerializer,
)
from core.mixins import OwnedViewMixin


class AccessibilityPrefsView(APIView):
    """The owner's accessibility settings, applied on every screen."""

    @extend_schema(responses=AccessibilityPrefsSerializer)
    def get(self, request: Request) -> Response:
        return Response(AccessibilityPrefsSerializer(services.get_prefs(request.user)).data)

    @extend_schema(request=AccessibilityPrefsSerializer, responses=AccessibilityPrefsSerializer)
    def put(self, request: Request) -> Response:
        serializer = AccessibilityPrefsSerializer(
            services.get_prefs(request.user), data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class AgpoView(APIView):
    """The AGPO rules (with their source and last checked date) and the owner's category."""

    @extend_schema(responses=OpenApiTypes.OBJECT)
    def get(self, request: Request) -> Response:
        category = request.user.agpo_category or agpo.NO_CATEGORY
        return Response(
            {
                "agpo_category": category,
                "required_documents": agpo.required_documents(category),
                "rules": agpo.rules(),
            }
        )

    @extend_schema(request=AgpoCategorySerializer, responses=OpenApiTypes.OBJECT)
    def put(self, request: Request) -> Response:
        serializer = AgpoCategorySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        request.user.agpo_category = serializer.validated_data["agpo_category"]
        request.user.save(update_fields=["agpo_category"])
        return self.get(request)


class HelperListCreateView(OwnedViewMixin, ListAPIView):
    queryset = Helper.objects.exclude(status=HelperStatus.REMOVED)
    serializer_class = HelperSerializer

    @extend_schema(request=HelperInviteSerializer, responses={201: HelperSerializer})
    def post(self, request: Request) -> Response:
        serializer = HelperInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        helper = services.invite_helper(request.user, serializer.validated_data)
        return Response(HelperSerializer(helper).data, status=status.HTTP_201_CREATED)


class HelperDetailView(OwnedViewMixin, GenericAPIView):
    queryset = Helper.objects.all()
    serializer_class = HelperSerializer

    @extend_schema(request=HelperPermissionSerializer, responses=HelperSerializer)
    def patch(self, request: Request, pk: int) -> Response:
        serializer = HelperPermissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        helper = services.change_permission(
            self.get_object(), serializer.validated_data["permission"]
        )
        return Response(HelperSerializer(helper).data)

    @extend_schema(responses=HelperSerializer)
    def delete(self, request: Request, pk: int) -> Response:
        """Remove access. The helper's past actions stay in the log."""
        return Response(HelperSerializer(services.remove_helper(self.get_object())).data)


class AcceptInviteView(APIView):
    @extend_schema(request=AcceptInviteSerializer, responses=HelperOwnerSerializer)
    def post(self, request: Request) -> Response:
        serializer = AcceptInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        helper = services.accept_invite(request.user, serializer.validated_data["token"])
        return Response(HelperOwnerSerializer(helper).data)


class HelpingListView(ListAPIView):
    """The owners the signed-in user helps, for the X-Acting-For header."""

    serializer_class = HelperOwnerSerializer

    def get_queryset(self):
        return Helper.objects.select_related("owner").filter(
            helper_user=self.request.user, status=HelperStatus.ACTIVE
        )


class HelperActivityListView(OwnedViewMixin, ListAPIView):
    queryset = HelperActivity.objects.select_related("helper")
    serializer_class = HelperActivitySerializer


class PrepareBidView(APIView):
    @extend_schema(request=PrepareBidSerializer, responses=BidConfirmationSerializer)
    def post(self, request: Request, pk: int) -> Response:
        serializer = PrepareBidSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        owner, helper = services.acting_owner(request, HelperPermission.PREPARE)
        bid = services.prepare_bid(owner, helper, pk, serializer.validated_data["note"])
        return Response(BidConfirmationSerializer(bid).data)


class ConfirmBidView(APIView):
    @extend_schema(request=None, responses=BidConfirmationSerializer)
    def post(self, request: Request, pk: int) -> Response:
        return Response(BidConfirmationSerializer(services.confirm_bid(request, pk)).data)


class AccessRequestListCreateView(OwnedViewMixin, ListAPIView):
    queryset = AccessRequest.objects.all()
    serializer_class = AccessRequestSerializer

    @extend_schema(request=AccessRequestCreateSerializer, responses={201: AccessRequestSerializer})
    def post(self, request: Request) -> Response:
        """Draft the letter. Sending again for the same event replaces the draft."""
        serializer = AccessRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = request.user
        letter = build_letter(
            LetterInput(
                **{k: v for k, v in data.items() if k != "event_key"},
                owner_name=user.get_full_name(),
                business_name=user.business_name,
                contact=user.email,
            )
        )
        access_request, created = AccessRequest.objects.update_or_create(
            owner=user,
            event_key=data["event_key"],
            defaults={**data, "letter_text": letter},
        )
        return Response(
            AccessRequestSerializer(access_request).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class AccessRequestDetailView(OwnedViewMixin, GenericAPIView):
    queryset = AccessRequest.objects.all()
    serializer_class = AccessRequestSerializer

    @extend_schema(responses=AccessRequestSerializer)
    def get(self, request: Request, pk: int) -> Response:
        return Response(AccessRequestSerializer(self.get_object()).data)

    @extend_schema(request=AccessRequestSerializer, responses=AccessRequestSerializer)
    def patch(self, request: Request, pk: int) -> Response:
        """Save the owner's edits to the letter."""
        serializer = AccessRequestSerializer(self.get_object(), data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @extend_schema(responses={204: None})
    def delete(self, request: Request, pk: int) -> Response:
        self.get_object().delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
