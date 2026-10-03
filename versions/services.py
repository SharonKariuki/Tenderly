"""versions services. Owner: C. M0 signature stub (contract in section 4); implemented in M3."""

from core.contracts import AddendumResult
from tenders.models import Tender


def process_addendum(tender: Tender, file_bytes: bytes, mime: str) -> AddendumResult:
    raise NotImplementedError("M3: feat/c-addenda-flow")
