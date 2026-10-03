"""versions views. Owner: C.

M0 stubs returning canned JSON so the frontend contract exists from day one. Keep the class
names (tenderready/urls.py points at them) and replace the bodies in M2 and M3.
"""

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

STUB_CHANGE = {
    "id": 1,
    "from_version": 1,
    "to_version": 2,
    "category": "deadline",
    "old_quote": "The closing date is 20 October 2026 at 10:00.",
    "new_quote": "The closing date is extended to 27 October 2026 at 10:00.",
    "affects_user": True,
    "explanation": "The deadline moved by one week.",
}

STUB_VERSIONS = [
    {"version_no": 1, "source": "upload", "deadline": "2026-10-20T10:00:00+03:00"},
    {"version_no": 2, "source": "upload", "deadline": "2026-10-27T10:00:00+03:00"},
]


class VersionListCreateView(APIView):
    @extend_schema(responses=OpenApiTypes.OBJECT)
    def get(self, request: Request, pk: int) -> Response:
        return Response(STUB_VERSIONS)

    @extend_schema(request=OpenApiTypes.OBJECT, responses=OpenApiTypes.OBJECT)
    def post(self, request: Request, pk: int) -> Response:
        return Response(
            {
                "created": True,
                "version_no": 2,
                "changes": [STUB_CHANGE],
                "check": None,
                "flips": [
                    {
                        "requirement_id": "r3",
                        "label": "Valid Tax Compliance Certificate",
                        "old_status": "met",
                        "new_status": "expiring",
                        "reason": "The deadline moved past the certificate's expiry date",
                    }
                ],
                "alert_id": 1,
            },
            status=status.HTTP_201_CREATED,
        )


class ChangeListView(APIView):
    @extend_schema(responses=OpenApiTypes.OBJECT)
    def get(self, request: Request, pk: int) -> Response:
        return Response([STUB_CHANGE])
