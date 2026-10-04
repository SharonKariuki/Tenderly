"""tenders views. Owner: B.

Thin (C8): validate, call the service, respond. OwnedViewMixin scopes every query to the
signed-in user (R19), so another user's tender is a 404.
"""

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.generics import GenericAPIView, ListAPIView, RetrieveAPIView
from rest_framework.parsers import MultiPartParser
from rest_framework.request import Request
from rest_framework.response import Response

from core.exceptions import Unprocessable
from core.mixins import OwnedViewMixin
from documents.serializers import FileUploadSerializer
from tenders.models import Tender
from tenders.serializers import (
    SummaryQuerySerializer,
    SummarySerializer,
    TenderListSerializer,
    TenderSerializer,
)
from tenders.services import create_tender, latest_version, summary_for_language


class TenderListCreateView(OwnedViewMixin, ListAPIView):
    queryset = Tender.objects.all()
    serializer_class = TenderListSerializer
    parser_classes = [MultiPartParser]

    @extend_schema(operation_id="tenders_list")
    def get(self, request: Request, *args, **kwargs) -> Response:
        return super().get(request, *args, **kwargs)

    @extend_schema(
        request={"multipart/form-data": FileUploadSerializer},
        responses={201: TenderSerializer},
    )
    def post(self, request: Request) -> Response:
        upload = FileUploadSerializer(data=request.data)
        upload.is_valid(raise_exception=True)
        file = upload.validated_data["file"]
        tender = create_tender(request.user, file.read(), file.content_type, file.name)
        return Response(TenderSerializer(tender).data, status=status.HTTP_201_CREATED)


class TenderDetailView(OwnedViewMixin, RetrieveAPIView):
    queryset = Tender.objects.all()
    serializer_class = TenderSerializer


class TenderSummaryView(OwnedViewMixin, GenericAPIView):
    queryset = Tender.objects.all()
    serializer_class = SummarySerializer

    @extend_schema(parameters=[SummaryQuerySerializer], responses=SummarySerializer)
    def get(self, request: Request, pk: int) -> Response:
        query = SummaryQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        tender = self.get_object()
        version = latest_version(tender)
        if version is None:
            raise Unprocessable("This tender has no version yet.", code="no_version")
        lang = query.validated_data["lang"]
        summary, needs_human_review = summary_for_language(version, lang)
        return Response(
            {
                "tender_id": tender.pk,
                "version_no": version.version_no,
                "lang": lang,
                "summary": summary,
                "needs_human_review": needs_human_review,
            }
        )
