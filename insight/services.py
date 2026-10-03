"""insight services. Owner: C. M0 signature stub (contract in section 4); implemented in M2."""

from core.contracts import DocType, InsightCase


def get_insights(doc_type: DocType) -> list[InsightCase]:
    raise NotImplementedError("M2: feat/c-alerts-insight")
