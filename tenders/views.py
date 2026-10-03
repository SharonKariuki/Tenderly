"""tenders views. Owner: B.

M0 stubs returning canned JSON so the frontend contract exists from day one. Keep the class
names (tenderready/urls.py points at them) and replace the bodies in M2 and M3.
"""

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

STUB_REQUIREMENT = {
    "id": "r3",
    "label": "Valid Tax Compliance Certificate",
    "requirement_type": "mandatory_document",
    "required_doc_type": "kra_tax_compliance",
    "mandatory": True,
    "source_quote": "Bidders shall submit a valid Tax Compliance Certificate.",
    "page": 4,
}

STUB_TENDER = {
    "id": 12,
    "title": "Supply of office stationery (SAMPLE)",
    "current_version": 1,
    "created_at": "2026-10-03T10:05:00+03:00",
    "latest_version": {
        "version_no": 1,
        "source": "upload",
        "published_on": "2026-09-20",
        "deadline": "2026-10-20T10:00:00+03:00",
        "requirements": [STUB_REQUIREMENT],
        "summary_en": "The county is buying office stationery. Bids close on 20 October.",
        "created_at": "2026-10-03T10:05:00+03:00",
    },
}


class TenderListCreateView(APIView):
    @extend_schema(operation_id="tenders_list", responses=OpenApiTypes.OBJECT)
    def get(self, request: Request) -> Response:
        return Response([{key: STUB_TENDER[key] for key in ("id", "title", "current_version")}])

    @extend_schema(request=OpenApiTypes.OBJECT, responses=OpenApiTypes.OBJECT)
    def post(self, request: Request) -> Response:
        return Response(STUB_TENDER, status=status.HTTP_201_CREATED)


class TenderDetailView(APIView):
    @extend_schema(responses=OpenApiTypes.OBJECT)
    def get(self, request: Request, pk: int) -> Response:
        return Response({**STUB_TENDER, "id": pk})


class TenderSummaryView(APIView):
    @extend_schema(
        parameters=[OpenApiParameter("lang", str, enum=["en", "sw"], default="en")],
        responses=OpenApiTypes.OBJECT,
    )
    def get(self, request: Request, pk: int) -> Response:
        lang = request.query_params.get("lang", "en")
        return Response(
            {
                "tender_id": pk,
                "version_no": 1,
                "lang": lang,
                "summary": STUB_TENDER["latest_version"]["summary_en"],
                "needs_human_review": lang == "sw",  # R14
            }
        )
