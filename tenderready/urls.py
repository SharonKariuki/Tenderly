"""URL configuration. Lead-only file (G8): ask in chat, additive changes only.

Every endpoint of the API contract (section 4) is registered here in M0. Owners replace the
view bodies, never the names, so this file does not need to change again.
"""

from django.contrib import admin
from django.urls import path
from django.views.generic import RedirectView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from accounts.views import LoginView, MeDataView, ProfileView, RegisterView
from alerts.views import AlertListView, AlertReadView
from checks.views import CheckRunView, LatestCheckView
from core.views import health
from documents.views import DocumentDetailView, DocumentListCreateView
from insight.views import InsightListView
from tenders.views import TenderDetailView, TenderListCreateView, TenderSummaryView
from versions.views import ChangeListView, VersionListCreateView

urlpatterns = [
    # The bare address is what people type first; send them to the docs.
    path("", RedirectView.as_view(pattern_name="docs"), name="root"),
    path("admin/", admin.site.urls),
    path("api/health/", health, name="health"),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
    # accounts (A)
    path("api/auth/register", RegisterView.as_view(), name="auth-register"),
    path("api/auth/login", LoginView.as_view(), name="auth-login"),
    path("api/profile/", ProfileView.as_view(), name="profile"),
    path("api/me/data/", MeDataView.as_view(), name="me-data"),
    # documents (B)
    path("api/documents/", DocumentListCreateView.as_view(), name="document-list"),
    path("api/documents/<int:pk>/", DocumentDetailView.as_view(), name="document-detail"),
    # tenders (B)
    path("api/tenders/", TenderListCreateView.as_view(), name="tender-list"),
    path("api/tenders/<int:pk>/", TenderDetailView.as_view(), name="tender-detail"),
    path("api/tenders/<int:pk>/summary/", TenderSummaryView.as_view(), name="tender-summary"),
    # checks (A)
    path("api/tenders/<int:pk>/check/", CheckRunView.as_view(), name="check-run"),
    path("api/tenders/<int:pk>/checks/latest/", LatestCheckView.as_view(), name="check-latest"),
    # versions (C)
    path("api/tenders/<int:pk>/versions/", VersionListCreateView.as_view(), name="version-list"),
    path("api/tenders/<int:pk>/changes/", ChangeListView.as_view(), name="change-list"),
    # alerts and insight (C)
    path("api/alerts/", AlertListView.as_view(), name="alert-list"),
    path("api/alerts/<int:pk>/read/", AlertReadView.as_view(), name="alert-read"),
    path("api/insight/", InsightListView.as_view(), name="insight-list"),
]
