"""insight services. Owner: C."""

from core.contracts import DocType, InsightCase
from insight.models import RejectionCase


def get_insights(doc_type: DocType | None = None) -> list[InsightCase]:
    """Rejection cases for one document type, or every case when no type is given."""
    cases = RejectionCase.objects.all()
    if doc_type:
        cases = cases.filter(doc_type=doc_type)
    return [
        InsightCase(
            doc_type=case.doc_type,
            reason=case.reason,
            source_title=case.source_title,
            source_url=case.source_url,
            year=case.year,
            tags=case.tags,
            illustrative=case.illustrative,
        )
        for case in cases
    ]
