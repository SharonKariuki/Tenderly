"""versions views. Owner: C.

R19: the tender is always loaded through request.user, so a user only reaches her own
versions and changes.
"""

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from tenders.models import Tender
from versions.models import TenderChange
from versions.serializers import (
    AddendumResultSerializer,
    AddendumUploadSerializer,
    TenderChangeSerializer,
    VersionSerializer,
)
from versions.services import process_addendum


class VersionListCreateView(APIView):
    parser_classes = [MultiPartParser]

    @extend_schema(responses=VersionSerializer(many=True))
    def get(self, request: Request, pk: int) -> Response:
        tender = get_object_or_404(Tender, pk=pk, owner=request.user)
        return Response(VersionSerializer(tender.versions.order_by("version_no"), many=True).data)

    @extend_schema(
        request={"multipart/form-data": AddendumUploadSerializer},
        responses={201: AddendumResultSerializer, 200: AddendumResultSerializer},
    )
    def post(self, request: Request, pk: int) -> Response:
        tender = get_object_or_404(Tender, pk=pk, owner=request.user)
        upload = AddendumUploadSerializer(data=request.data)
        upload.is_valid(raise_exception=True)
        file = upload.validated_data["file"]
        result = process_addendum(tender, file.read(), file.content_type, filename=file.name)
        # R9: a duplicate upload is a 200 with the version we already have.
        code = status.HTTP_201_CREATED if result.created else status.HTTP_200_OK
        return Response(result.model_dump(mode="json"), status=code)


class ChangeListView(APIView):
    @extend_schema(responses=TenderChangeSerializer(many=True))
    def get(self, request: Request, pk: int) -> Response:
        tender = get_object_or_404(Tender, pk=pk, owner=request.user)
        changes = TenderChange.objects.filter(tender=tender).select_related(
            "from_version", "to_version"
        )
        return Response(TenderChangeSerializer(changes, many=True).data)
