"""OwnedViewMixin (R19): a user only ever sees and creates their own rows."""

import pytest
from rest_framework import serializers
from rest_framework.generics import ListCreateAPIView, RetrieveAPIView
from rest_framework.test import APIRequestFactory, force_authenticate

from accounts.models import User
from core.mixins import OwnedViewMixin
from core.models import StoredFile

pytestmark = pytest.mark.django_db


class FileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StoredFile
        fields = ["id", "filename", "mime", "size", "sha256"]


class FileListCreateView(OwnedViewMixin, ListCreateAPIView):
    queryset = StoredFile.objects.all()
    serializer_class = FileSerializer


class FileDetailView(OwnedViewMixin, RetrieveAPIView):
    queryset = StoredFile.objects.all()
    serializer_class = FileSerializer


def stored_file(owner: User, filename: str) -> StoredFile:
    return StoredFile.objects.create(
        owner=owner, filename=filename, mime="application/pdf", size=1, sha256="0" * 64, data=b"x"
    )


@pytest.fixture
def users() -> tuple[User, User]:
    return (
        User.objects.create_user(email="owner@example.com"),
        User.objects.create_user(email="other@example.com"),
    )


def call(view, user: User, method: str = "get", data: dict | None = None, **kwargs):
    request = getattr(APIRequestFactory(), method)("/", data, format="json")
    force_authenticate(request, user)
    return view.as_view()(request, **kwargs)


def test_list_shows_only_the_users_rows(users: tuple[User, User]) -> None:
    owner, other = users
    stored_file(owner, "mine.pdf")
    stored_file(other, "theirs.pdf")

    response = call(FileListCreateView, owner)

    assert [row["filename"] for row in response.data] == ["mine.pdf"]


def test_another_users_row_is_a_404(users: tuple[User, User]) -> None:
    owner, other = users
    theirs = stored_file(other, "theirs.pdf")

    assert call(FileDetailView, owner, pk=theirs.pk).status_code == 404
    assert call(FileDetailView, other, pk=theirs.pk).status_code == 200


def test_new_rows_are_saved_with_the_user_as_owner(users: tuple[User, User]) -> None:
    owner, _ = users
    data = {"filename": "new.pdf", "mime": "application/pdf", "size": 1, "sha256": "0" * 64}

    response = call(FileListCreateView, owner, "post", data)

    assert response.status_code == 201
    assert StoredFile.objects.get(pk=response.data["id"]).owner == owner
