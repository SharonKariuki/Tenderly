"""checks views. Owner: A (lead).

M0 stubs returning the agreed check result shape (section 4). Made real in M2.
"""

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.contracts import DISCLAIMER


def stub_check(tender_id: int) -> dict:
    return {
        "tender_id": tender_id,
        "version_no": 1,
        "deadline": "2026-10-20T10:00:00+03:00",
        "overall": "attention_needed",
        "items": [
            {
                "requirement_id": "r3",
                "label": "Valid Tax Compliance Certificate",
                "status": "expiring",
                "doc_id": 7,
                "expires_on": "2026-10-12",
                "reason": "Expires 8 days before the deadline",
                "source_quote": "Bidders shall submit a valid Tax Compliance Certificate.",
                "page": 4,
                "insight": [],
            },
            {
                "requirement_id": "r5",
                "label": "AGPO certificate",
                "status": "missing",
                "doc_id": None,
                "expires_on": None,
                "reason": "No confirmed AGPO certificate in your documents",
                "source_quote": "This tender is reserved for AGPO-registered firms.",
                "page": 2,
                "insight": [],
            },
        ],
        "mismatches": [],
        "deadline_note": None,
        "disclaimer": DISCLAIMER,
    }


class CheckRunView(APIView):
    @extend_schema(request=None, responses=OpenApiTypes.OBJECT)
    def post(self, request: Request, pk: int) -> Response:
        return Response(stub_check(pk), status=status.HTTP_201_CREATED)


class LatestCheckView(APIView):
    @extend_schema(responses=OpenApiTypes.OBJECT)
    def get(self, request: Request, pk: int) -> Response:
        return Response(stub_check(pk))
