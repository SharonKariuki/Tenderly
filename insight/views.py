"""insight views. Owner: C."""

from drf_spectacular.utils import extend_schema
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from insight.serializers import InsightCaseSerializer, InsightQuerySerializer
from insight.services import get_insights


class InsightListView(APIView):
    """Rejection cases are public reference data, not user data, so there is no owner
    filter here (R19 covers user rows). Signing in is still required."""

    @extend_schema(parameters=[InsightQuerySerializer], responses=InsightCaseSerializer(many=True))
    def get(self, request: Request) -> Response:
        query = InsightQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        cases = get_insights(query.validated_data.get("doc_type"))
        return Response(InsightCaseSerializer(cases, many=True).data)
