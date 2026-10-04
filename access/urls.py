"""access URLs, mounted at api/access/ (tenderready/urls.py). Owner: B."""

from django.urls import path

from access import views

urlpatterns = [
    path("prefs/", views.AccessibilityPrefsView.as_view(), name="access-prefs"),
    path("agpo/", views.AgpoView.as_view(), name="access-agpo"),
    path("helpers/", views.HelperListCreateView.as_view(), name="helper-list"),
    path("helpers/<int:pk>/", views.HelperDetailView.as_view(), name="helper-detail"),
    path("helpers/accept/", views.AcceptInviteView.as_view(), name="helper-accept"),
    path("helpers/activity/", views.HelperActivityListView.as_view(), name="helper-activity"),
    path("helping/", views.HelpingListView.as_view(), name="helping-list"),
    path("bids/<int:pk>/prepare/", views.PrepareBidView.as_view(), name="bid-prepare"),
    path("bids/<int:pk>/confirm/", views.ConfirmBidView.as_view(), name="bid-confirm"),
    path("letters/", views.AccessRequestListCreateView.as_view(), name="letter-list"),
    path("letters/<int:pk>/", views.AccessRequestDetailView.as_view(), name="letter-detail"),
]
