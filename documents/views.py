"""documents views. Owner: B.

M0 stubs returning canned JSON so the frontend contract exists from day one. Keep the class
names (tenderready/urls.py points at them) and replace the bodies in M1.
"""

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

STUB_DOCUMENT = {
    "id": 7,
    "doc_type": "kra_tax_compliance",
    "filename": "tcc_dummy.pdf",
    "extracted": {
        "holder_name": "Demo Business Ltd",
        "kra_pin": "P000000000X",
        "registration_number": None,
        "directors": [],
    },
    "confidence": 0.92,
    "needs_review": False,
    "issued_on": "2025-10-12",
    "expires_on": "2026-10-12",
    "confirmed": False,
    "created_at": "2026-10-03T10:00:00+03:00",
}


class DocumentListCreateView(APIView):
    @extend_schema(responses=OpenApiTypes.OBJECT)
    def get(self, request: Request) -> Response:
        return Response([STUB_DOCUMENT])

    @extend_schema(request=OpenApiTypes.OBJECT, responses=OpenApiTypes.OBJECT)
    def post(self, request: Request) -> Response:
        return Response(STUB_DOCUMENT, status=status.HTTP_201_CREATED)


class DocumentDetailView(APIView):
    @extend_schema(request=OpenApiTypes.OBJECT, responses=OpenApiTypes.OBJECT)
    def patch(self, request: Request, pk: int) -> Response:
        return Response({**STUB_DOCUMENT, "id": pk, "confirmed": True})

    @extend_schema(responses={204: None})
    def delete(self, request: Request, pk: int) -> Response:
        return Response(status=status.HTTP_204_NO_CONTENT)
