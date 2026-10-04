"""documents views. Owner: B.

Thin (C8): validate, call the service, respond. OwnedViewMixin scopes every query to the
signed-in user (R19), so another user's document is a 404.

A trusted helper may list or upload an owner's documents by sending X-Acting-For with the
owner's id, within the permission the owner gave them (access app). Every helper action
is logged for the owner. Changing or deleting a document stays with the owner.
"""

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.generics import GenericAPIView, ListAPIView
from rest_framework.parsers import JSONParser, MultiPartParser
from rest_framework.request import Request
from rest_framework.response import Response

from access.models import HelperAction, HelperPermission
from access.services import acting_owner, log, log_view
from core.mixins import OwnedViewMixin
from documents.models import Document
from documents.serializers import (
    DocumentSerializer,
    DocumentUpdateSerializer,
    FileUploadSerializer,
)
from documents.services import create_document, delete_document, update_document


class DocumentListCreateView(ListAPIView):
    queryset = Document.objects.select_related("file")
    serializer_class = DocumentSerializer
    parser_classes = [MultiPartParser]

    def get_queryset(self):
        owner, helper = acting_owner(self.request, HelperPermission.VIEW)
        if helper:
            log_view(helper)
        return super().get_queryset().filter(owner=owner)

    @extend_schema(
        request={"multipart/form-data": FileUploadSerializer},
        responses={201: DocumentSerializer},
    )
    def post(self, request: Request) -> Response:
        upload = FileUploadSerializer(data=request.data)
        upload.is_valid(raise_exception=True)
        owner, helper = acting_owner(request, HelperPermission.UPLOAD)
        file = upload.validated_data["file"]
        document = create_document(owner, file.read(), file.content_type, file.name)
        if helper:
            log(helper, HelperAction.UPLOADED_DOCUMENT, file.name)
        return Response(DocumentSerializer(document).data, status=status.HTTP_201_CREATED)


class DocumentDetailView(OwnedViewMixin, GenericAPIView):
    queryset = Document.objects.select_related("file")
    serializer_class = DocumentSerializer
    parser_classes = [JSONParser]

    @extend_schema(request=DocumentUpdateSerializer, responses=DocumentSerializer)
    def patch(self, request: Request, pk: int) -> Response:
        changes = DocumentUpdateSerializer(data=request.data)
        changes.is_valid(raise_exception=True)
        document = update_document(self.get_object(), changes.validated_data)
        return Response(DocumentSerializer(document).data)

    @extend_schema(responses={204: None})
    def delete(self, request: Request, pk: int) -> Response:
        delete_document(self.get_object())
        return Response(status=status.HTTP_204_NO_CONTENT)
