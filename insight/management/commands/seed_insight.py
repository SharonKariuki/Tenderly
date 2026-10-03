"""Load the Rejection Insight seed cases. Owner: C.

Safe to run again: a case is matched on (doc_type, reason) and updated, never duplicated.

Usage: python manage.py seed_insight
"""

import json
from pathlib import Path

from django.core.management.base import BaseCommand

from core.contracts import InsightCase
from insight.models import RejectionCase

SEED_FILE = Path(__file__).resolve().parent.parent.parent / "seed" / "rejection_cases.json"


def load_seed_cases(path: Path = SEED_FILE) -> int:
    cases = [InsightCase.model_validate(row) for row in json.loads(path.read_text("utf-8"))]
    for case in cases:
        RejectionCase.objects.update_or_create(
            doc_type=case.doc_type,
            reason=case.reason,
            defaults=case.model_dump(mode="json", exclude={"doc_type", "reason"}),
        )
    return len(cases)


class Command(BaseCommand):
    help = "Load the Rejection Insight seed cases (idempotent)."

    def handle(self, *args, **options) -> None:
        count = load_seed_cases()
        self.stdout.write(f"Loaded {count} cases; {RejectionCase.objects.count()} in the table.")
