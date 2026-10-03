"""Generate the dummy business documents for the demo. Owner: B.

Every document is a DUMMY: the business, the people and every number are invented (R21).
expected.json lists what extraction should read from each file; it is the ground truth for
scripts/try_extract.py. The dates line up with the mashariki-cleaning tender pair (see
sample_data/documents/README.md).

Usage: python scripts/make_sample_documents.py
"""

import json
from pathlib import Path

from make_sample_tenders import build_pdf

OUT_DIR = Path(__file__).resolve().parent.parent / "sample_data" / "documents"

BANNER = "DUMMY DOCUMENT FOR DEMONSTRATION - NOT A REAL CERTIFICATE"
BUSINESS = "Demo Business Ltd"
KRA_PIN = "P000000000X"
REG_NUMBER = "PVT-DEMO0001"
DIRECTORS = ["Wanjiru Achieng Kamau", "Otieno Baraka Mwangi"]

DOCUMENTS = [
    {
        "file": "business_registration_DUMMY.pdf",
        "heading": "CERTIFICATE OF INCORPORATION",
        "lines": [
            f"Company name: {BUSINESS}",
            f"Company registration number: {REG_NUMBER}",
            "This is to certify that the above company was incorporated under the Companies "
            "Act as a private limited company.",
            "Date of incorporation: 14 March 2022",
        ],
        "expected": {
            "document_type": "business_registration",
            "holder_name": BUSINESS,
            "kra_pin": None,
            "registration_number": REG_NUMBER,
            "issued_on": "2022-03-14",
            "expires_on": None,
            "directors": [],
        },
    },
    {
        "file": "tax_compliance_DUMMY.pdf",
        "heading": "TAX COMPLIANCE CERTIFICATE",
        "lines": [
            f"Taxpayer name: {BUSINESS}",
            f"Personal Identification Number (PIN): {KRA_PIN}",
            "Certificate number: KRADUMMY0000001",
            "This is to confirm that the above taxpayer has filed the relevant tax returns and "
            "paid the taxes due.",
            "Date of issue: 29 October 2025",
            "This certificate is valid until: 28 October 2026",
        ],
        "expected": {
            "document_type": "kra_tax_compliance",
            "holder_name": BUSINESS,
            "kra_pin": KRA_PIN,
            "registration_number": None,
            "issued_on": "2025-10-29",
            "expires_on": "2026-10-28",
            "directors": [],
        },
    },
    {
        "file": "agpo_certificate_DUMMY.pdf",
        "heading": "ACCESS TO GOVERNMENT PROCUREMENT OPPORTUNITIES (AGPO) CERTIFICATE",
        "lines": [
            f"Enterprise name: {BUSINESS}",
            "Category: Women",
            "Certificate number: AGPO-DUMMY-000001",
            "The enterprise named above is registered under the AGPO programme.",
            "Date of issue: 13 October 2024",
            "Expiry date: 12 October 2026",
        ],
        "expected": {
            "document_type": "agpo_certificate",
            "holder_name": BUSINESS,
            "kra_pin": None,
            "registration_number": None,
            "issued_on": "2024-10-13",
            "expires_on": "2026-10-12",
            "directors": [],
        },
    },
    {
        "file": "cr12_DUMMY.pdf",
        "heading": "CR12 - OFFICIAL SEARCH OF COMPANY RECORDS",
        "lines": [
            f"Company name: {BUSINESS}",
            f"Company registration number: {REG_NUMBER}",
            "Date of issue: 1 September 2026",
            "Directors and shareholders:",
            f"1. {DIRECTORS[0]} - Director and shareholder - 600 ordinary shares",
            f"2. {DIRECTORS[1]} - Director and shareholder - 400 ordinary shares",
        ],
        "expected": {
            "document_type": "cr12",
            "holder_name": BUSINESS,
            "kra_pin": None,
            "registration_number": REG_NUMBER,
            "issued_on": "2026-09-01",
            "expires_on": None,
            "directors": DIRECTORS,
        },
    },
    {
        # The deliberate mismatch: the name is not one of the directors on the CR12.
        "file": "national_id_DUMMY.pdf",
        "heading": "NATIONAL IDENTITY CARD (SPECIMEN)",
        "lines": [
            "Full names: Wanjiru Akinyi Kamau",
            "Identity number: 00000000",
            "Date of issue: 5 June 2019",
            "Place of issue: Specimen",
        ],
        "expected": {
            "document_type": "national_id",
            "holder_name": "Wanjiru Akinyi Kamau",
            "kra_pin": None,
            "registration_number": None,
            "issued_on": "2019-06-05",
            "expires_on": None,
            "directors": [],
        },
    },
]


def document_lines(document: dict) -> list[tuple[str, str]]:
    lines = [("bold", BANNER), ("blank", ""), ("bold", document["heading"]), ("blank", "")]
    for text in document["lines"]:
        lines += [("text", text), ("blank", "")]
    return lines


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for document in DOCUMENTS:
        (OUT_DIR / document["file"]).write_bytes(build_pdf(document_lines(document)))
    expected = {document["file"]: document["expected"] for document in DOCUMENTS}
    (OUT_DIR / "expected.json").write_text(
        json.dumps(expected, indent=2) + "\n", encoding="utf-8", newline="\n"
    )
    print(f"Wrote {len(DOCUMENTS)} dummy documents to {OUT_DIR}")


if __name__ == "__main__":
    main()
