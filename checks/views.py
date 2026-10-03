"""checks views. Owner: A (lead). Thin: find the user's tender, call the service (C8)."""

from django.shortcuts import get_object_or_404
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from checks.services import latest_check, run_check
from tenders.models import Tender


class CheckRunView(APIView):
    """Run the readiness check on the latest version of the tender. 201 when a new result is
    stored, 200 when nothing changed since the stored one."""

    @extend_schema(request=None, responses={201: OpenApiTypes.OBJECT, 200: OpenApiTypes.OBJECT})
    def post(self, request: Request, pk: int) -> Response:
        tender = get_object_or_404(Tender, pk=pk, owner=request.user)  # R19
        check, created = run_check(request.user, tender)
        return Response(
            check.result, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )


class LatestCheckView(APIView):
    """The latest stored check of the tender's latest version."""

    @extend_schema(responses=OpenApiTypes.OBJECT)
    def get(self, request: Request, pk: int) -> Response:
        tender = get_object_or_404(Tender, pk=pk, owner=request.user)  # R19
        return Response(latest_check(request.user, tender).result)
