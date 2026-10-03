"""alerts views. Owner: C.

M0 stubs returning canned JSON so the frontend contract exists from day one. Keep the class
names (tenderready/urls.py points at them) and replace the bodies in M2.
"""

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

STUB_ALERT = {
    "id": 1,
    "tender_id": 12,
    "changes": [1],
    "message": "One change affects you: the deadline moved and your tax certificate now "
    "expires before it.",
    "channel": "in_app",
    "sent_at": "2026-10-03T11:00:00+03:00",
    "read_at": None,
    "created_at": "2026-10-03T11:00:00+03:00",
}


class AlertListView(APIView):
    @extend_schema(responses=OpenApiTypes.OBJECT)
    def get(self, request: Request) -> Response:
        return Response([STUB_ALERT])


class AlertReadView(APIView):
    @extend_schema(request=None, responses=OpenApiTypes.OBJECT)
    def patch(self, request: Request, pk: int) -> Response:
        return Response({**STUB_ALERT, "id": pk, "read_at": "2026-10-03T11:05:00+03:00"})
