"""alerts views. Owner: C.

R19: every query here is filtered by request.user, so one user never sees another's alerts.
"""

from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from alerts.models import Alert
from alerts.serializers import AlertSerializer


class AlertListView(APIView):
    @extend_schema(responses=AlertSerializer(many=True))
    def get(self, request: Request) -> Response:
        alerts = Alert.objects.filter(owner=request.user).prefetch_related("changes")
        return Response(AlertSerializer(alerts, many=True).data)


class AlertReadView(APIView):
    @extend_schema(request=None, responses=AlertSerializer)
    def patch(self, request: Request, pk: int) -> Response:
        alert = get_object_or_404(Alert, pk=pk, owner=request.user)
        if alert.read_at is None:
            alert.read_at = timezone.now()
            alert.save(update_fields=["read_at"])
        return Response(AlertSerializer(alert).data)
