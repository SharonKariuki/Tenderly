"""View mixins. Owner: A (lead)."""

from django.db.models import QuerySet
from rest_framework.serializers import BaseSerializer


class OwnedViewMixin:
    """R19: every query is scoped to the logged-in user.

    Put it first in the bases of a DRF generic view or viewset whose model has an owner:

        class DocumentListCreateView(OwnedViewMixin, ListCreateAPIView):
            queryset = Document.objects.all()
            serializer_class = DocumentSerializer

    Lists show only the user's rows, a row of another user is a 404, and new rows are saved
    with the user as owner. For a read-only view of rows owned through a parent, set
    `owner_field` to the path, for example "tender__owner".
    """

    owner_field = "owner"

    def get_queryset(self) -> QuerySet:
        return super().get_queryset().filter(**{self.owner_field: self.request.user})

    def perform_create(self, serializer: BaseSerializer) -> None:
        serializer.save(owner=self.request.user)
