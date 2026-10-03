"""insight views. Owner: C.

M0 stub returning canned JSON so the frontend contract exists from day one. Keep the class
name (tenderready/urls.py points at it) and replace the body in M2.
"""

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView


class InsightListView(APIView):
    @extend_schema(parameters=[OpenApiParameter("doc_type", str)], responses=OpenApiTypes.OBJECT)
    def get(self, request: Request) -> Response:
        doc_type = request.query_params.get("doc_type", "kra_tax_compliance")
        return Response(
            [
                {
                    "doc_type": doc_type,
                    "reason": "Tax compliance certificate expired before the tender closing date.",
                    "source_title": "Illustrative case (stub)",
                    "source_url": "",
                    "year": 2025,
                    "tags": ["expiry"],
                    "illustrative": True,
                }
            ]
        )
