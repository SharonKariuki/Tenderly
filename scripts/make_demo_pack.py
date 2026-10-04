"""Generate the demo pack: two more dummy businesses and the tenders that exercise every
check result. Owner: B.

Everything is a DUMMY or SIMULATED: the businesses, people, numbers, procuring entities and
tender numbers are invented (R21). The test cases that use these files are in
sample_data/demo/README.md. The first demo pair (Demo Business Ltd and mashariki-cleaning)
stays where it is, in sample_data/documents and sample_data/tenders.

Usage: python scripts/make_demo_pack.py
"""

import json
from pathlib import Path

from make_sample_tenders import BANNER as TENDER_BANNER
from make_sample_tenders import addendum_changes, addendum_lines, build_pdf, tender_lines

OUT_DIR = Path(__file__).resolve().parent.parent / "sample_data" / "demo"

DOC_BANNER = "DUMMY DOCUMENT FOR DEMONSTRATION - NOT A REAL CERTIFICATE"

KILELE = "Kilele Youth Tech Ltd"
KILELE_PIN = "P000000002K"
KILELE_REG = "PVT-DEMO0002"
KILELE_DIRECTORS = ["Brian Kiprono Rotich", "Faith Njeri Mutua"]

UPENDO = "Upendo Tailoring Enterprises"
UPENDO_PIN = "P000000003M"
UPENDO_REG = "BN-DEMO0003"
UPENDO_OWNER = "Mercy Wairimu Odhiambo"


def expected(
    document_type: str,
    holder_name: str,
    *,
    kra_pin: str | None = None,
    registration_number: str | None = None,
    issued_on: str | None = None,
    expires_on: str | None = None,
    directors: list[str] | None = None,
) -> dict:
    return {
        "document_type": document_type,
        "holder_name": holder_name,
        "kra_pin": kra_pin,
        "registration_number": registration_number,
        "issued_on": issued_on,
        "expires_on": expires_on,
        "directors": directors or [],
    }


# Kilele Youth Tech Ltd: youth-owned, every document valid. Ready for nyota-ict-support until
# the addendum moves the deadline past the business permit's expiry.
KILELE_DOCUMENTS = [
    {
        "file": "business_registration_DUMMY.pdf",
        "heading": "CERTIFICATE OF INCORPORATION",
        "lines": [
            f"Company name: {KILELE}",
            f"Company registration number: {KILELE_REG}",
            "This is to certify that the above company was incorporated under the Companies "
            "Act as a private limited company.",
            "Date of incorporation: 7 February 2023",
        ],
        "expected": expected(
            "business_registration", KILELE, registration_number=KILELE_REG, issued_on="2023-02-07"
        ),
    },
    {
        "file": "tax_compliance_DUMMY.pdf",
        "heading": "TAX COMPLIANCE CERTIFICATE",
        "lines": [
            f"Taxpayer name: {KILELE}",
            f"Personal Identification Number (PIN): {KILELE_PIN}",
            "Certificate number: KRADUMMY0000002",
            "This is to confirm that the above taxpayer has filed the relevant tax returns and "
            "paid the taxes due.",
            "Date of issue: 1 April 2026",
            "This certificate is valid until: 31 March 2027",
        ],
        "expected": expected(
            "kra_tax_compliance",
            KILELE,
            kra_pin=KILELE_PIN,
            issued_on="2026-04-01",
            expires_on="2027-03-31",
        ),
    },
    {
        "file": "agpo_certificate_DUMMY.pdf",
        "heading": "ACCESS TO GOVERNMENT PROCUREMENT OPPORTUNITIES (AGPO) CERTIFICATE",
        "lines": [
            f"Enterprise name: {KILELE}",
            "Category: Youth",
            "Certificate number: AGPO-DUMMY-000002",
            "The enterprise named above is registered under the AGPO programme.",
            "Date of issue: 21 May 2025",
            "Expiry date: 20 May 2027",
        ],
        "expected": expected(
            "agpo_certificate", KILELE, issued_on="2025-05-21", expires_on="2027-05-20"
        ),
    },
    {
        "file": "cr12_DUMMY.pdf",
        "heading": "CR12 - OFFICIAL SEARCH OF COMPANY RECORDS",
        "lines": [
            f"Company name: {KILELE}",
            f"Company registration number: {KILELE_REG}",
            "Date of issue: 15 August 2026",
            "Directors and shareholders:",
            f"1. {KILELE_DIRECTORS[0]} - Director and shareholder - 500 ordinary shares",
            f"2. {KILELE_DIRECTORS[1]} - Director and shareholder - 500 ordinary shares",
        ],
        "expected": expected(
            "cr12",
            KILELE,
            registration_number=KILELE_REG,
            issued_on="2026-08-15",
            directors=KILELE_DIRECTORS,
        ),
    },
    {
        # The same director as on the CR12, with the names in another order. It must not be
        # reported as a mismatch.
        "file": "national_id_DUMMY.pdf",
        "heading": "NATIONAL IDENTITY CARD (SPECIMEN)",
        "lines": [
            "Full names: Rotich Brian Kiprono",
            "Identity number: 00000002",
            "Date of issue: 2 November 2018",
            "Place of issue: Specimen",
        ],
        "expected": expected("national_id", "Rotich Brian Kiprono", issued_on="2018-11-02"),
    },
    {
        "file": "business_permit_DUMMY.pdf",
        "heading": "SINGLE BUSINESS PERMIT",
        "lines": [
            "Issued by: Nyota County Government (simulated)",
            f"Business name: {KILELE}",
            "Permit number: SBP-DUMMY-000002",
            "Activity: ICT services and computer repair",
            "Date of issue: 2 January 2026",
            "This permit expires on: 31 December 2026",
        ],
        "expected": expected(
            "business_permit", KILELE, issued_on="2026-01-02", expires_on="2026-12-31"
        ),
    },
]

# Upendo Tailoring Enterprises: a sole proprietor with a disability, so no CR12. Built to show
# unclear, expired and mismatch results against baraka-uniforms.
UPENDO_DOCUMENTS = [
    {
        "file": "business_registration_DUMMY.pdf",
        "heading": "CERTIFICATE OF REGISTRATION OF BUSINESS NAME",
        "lines": [
            f"Business name: {UPENDO}",
            f"Registration number: {UPENDO_REG}",
            f"Proprietor: {UPENDO_OWNER}",
            "Nature of business: Tailoring and garment making",
            "Date of registration: 19 July 2021",
        ],
        "expected": expected(
            "business_registration", UPENDO, registration_number=UPENDO_REG, issued_on="2021-07-19"
        ),
    },
    {
        # Two traps: no expiry date anywhere (unclear, R6) and a PIN that differs from the one
        # entered in the profile by one digit (mismatch, R12).
        "file": "tax_compliance_NO_EXPIRY_DUMMY.pdf",
        "heading": "TAX COMPLIANCE CERTIFICATE",
        "lines": [
            f"Taxpayer name: {UPENDO}",
            "Personal Identification Number (PIN): P000000008M",
            "Certificate number: KRADUMMY0000003",
            "This is to confirm that the above taxpayer has filed the relevant tax returns and "
            "paid the taxes due.",
            "Date of issue: 10 June 2026",
        ],
        "expected": expected(
            "kra_tax_compliance", UPENDO, kra_pin="P000000008M", issued_on="2026-06-10"
        ),
    },
    {
        # Expired before the demo day (4 October 2026): missing, not expiring.
        "file": "agpo_certificate_EXPIRED_DUMMY.pdf",
        "heading": "ACCESS TO GOVERNMENT PROCUREMENT OPPORTUNITIES (AGPO) CERTIFICATE",
        "lines": [
            f"Enterprise name: {UPENDO}",
            "Category: Persons with disabilities",
            "Certificate number: AGPO-DUMMY-000003",
            "The enterprise named above is registered under the AGPO programme.",
            "Date of issue: 30 September 2024",
            "Expiry date: 29 September 2026",
        ],
        "expected": expected(
            "agpo_certificate", UPENDO, issued_on="2024-09-30", expires_on="2026-09-29"
        ),
    },
    {
        "file": "disability_card_DUMMY.pdf",
        "heading": "NATIONAL COUNCIL FOR PERSONS WITH DISABILITIES - REGISTRATION CARD (SPECIMEN)",
        "lines": [
            f"Name: {UPENDO_OWNER}",
            "Registration number: NCPWD-DUMMY-000003",
            "Date of registration: 11 March 2020",
        ],
        "expected": expected("ncpwd_registration", UPENDO_OWNER, issued_on="2020-03-11"),
    },
    {
        "file": "national_id_DUMMY.pdf",
        "heading": "NATIONAL IDENTITY CARD (SPECIMEN)",
        "lines": [
            f"Full names: {UPENDO_OWNER}",
            "Identity number: 00000003",
            "Date of issue: 14 January 2016",
            "Place of issue: Specimen",
        ],
        "expected": expected("national_id", UPENDO_OWNER, issued_on="2016-01-14"),
    },
]

# Tender pairs built with the same layout as sample_data/tenders.
TENDER_PAIRS = [
    {
        # Kilele is ready for version 1. The addendum moves the deadline past the permit's
        # expiry (31 Dec 2026) and adds audited accounts, which Kilele does not have.
        "slug": "nyota-ict-support",
        "entity": "Nyota County Government",
        "tender_no": "NCG/ONT/021/2026-2027",
        "title": "Provision of ICT Support Services for County Offices",
        "eligibility": (
            "This tender is reserved for enterprises owned by youth and registered under the "
            "Access to Government Procurement Opportunities (AGPO) programme."
        ),
        "old_deadline": ("Thursday, 29th October 2026 at 10.00 a.m.", "2026-10-29T10:00:00+03:00"),
        "new_deadline": ("Friday, 15th January 2027 at 10.00 a.m.", "2027-01-15T10:00:00+03:00"),
        "requirements": [
            "Copy of the Certificate of Incorporation or Business Registration Certificate.",
            "Valid Tax Compliance Certificate issued by the Kenya Revenue Authority.",
            "Valid AGPO Certificate in the youth category.",
            "Current CR12 form issued within the last twelve (12) months.",
            "Copy of the National Identity Card of each director.",
            "Valid Single Business Permit issued by a County Government.",
        ],
        "new_requirement": "Audited accounts for the last two (2) financial years.",
        "items": [
            ("On-site ICT support technicians", "technicians", 4),
            ("Network points installed and tested", "points", 60),
            ("Laptops and desktops serviced each quarter", "machines", 150),
        ],
        "quantity_change": (0, 6),
    },
    {
        # Upendo hits every result except expiring: met, missing (expired and absent),
        # unclear (no expiry date, and a requirement no document can meet) and a PIN mismatch.
        "slug": "baraka-uniforms",
        "entity": "Baraka County Education Board",
        "tender_no": "BCEB/RFQ/009/2026-2027",
        "title": "Supply and Delivery of School Uniforms",
        "eligibility": (
            "This tender is reserved for enterprises owned by persons with disabilities and "
            "registered under the Access to Government Procurement Opportunities (AGPO) "
            "programme."
        ),
        "old_deadline": ("Thursday, 12th November 2026 at 11.00 a.m.", "2026-11-12T11:00:00+03:00"),
        "new_deadline": ("Thursday, 26th November 2026 at 11.00 a.m.", "2026-11-26T11:00:00+03:00"),
        "requirements": [
            "Copy of the Certificate of Incorporation or Business Registration Certificate.",
            "Valid Tax Compliance Certificate issued by the Kenya Revenue Authority.",
            "Valid AGPO Certificate in the persons with disabilities category.",
            "Copy of the registration card from the National Council for Persons with "
            "Disabilities.",
            "Audited accounts for the last two (2) financial years.",
            "Two (2) sample uniforms of each size delivered to the procurement office before "
            "the closing date.",
        ],
        "new_requirement": "Valid Single Business Permit issued by a County Government.",
        "items": [
            ("Primary school shirts, white, sizes 24 to 34", "pieces", 800),
            ("Primary school shorts and skirts, navy blue", "pieces", 800),
            ("School sweaters, maroon, V-neck", "pieces", 400),
        ],
        "quantity_change": (2, 650),
    },
]

# A request for quotation with no closing date: every dated document is unclear.
NO_DEADLINE_LINES = [
    ("bold", TENDER_BANNER),
    ("blank", ""),
    ("bold", "PWANI MARITIME TRAINING COLLEGE"),
    ("bold", "REQUEST FOR QUOTATION No. PMTC/RFQ/112/2026-2027"),
    ("bold", "SUPPLY OF OFFICE STATIONERY"),
    ("blank", ""),
    ("bold", "1. Invitation"),
    (
        "text",
        "Pwani Maritime Training College invites quotations from eligible suppliers for the "
        "supply of office stationery. This request is open to all suppliers registered in Kenya.",
    ),
    ("blank", ""),
    ("bold", "2. Closing date"),
    (
        "text",
        "The closing date for this request for quotation will be communicated to interested "
        "suppliers through an addendum.",
    ),
    ("blank", ""),
    ("bold", "3. Mandatory requirements"),
    ("text", "MR1. Copy of the Certificate of Incorporation or Business Registration Certificate."),
    ("text", "MR2. Valid Tax Compliance Certificate issued by the Kenya Revenue Authority."),
    ("text", "MR3. Valid Single Business Permit issued by a County Government."),
    ("blank", ""),
    ("bold", "4. Schedule of requirements"),
    ("text", "Item 1: A4 printing paper, 80 gsm. Quantity: 300 reams."),
    ("text", "Item 2: Blue ballpoint pens. Quantity: 50 boxes."),
    ("text", "Item 3: Box files. Quantity: 120 pieces."),
]

# A delivery note: no requirements and no closing date, so the upload must be refused.
NOT_A_TENDER_LINES = [
    ("bold", "SIMULATED DOCUMENT FOR DEMONSTRATION - NOT A REAL DELIVERY NOTE"),
    ("blank", ""),
    ("bold", "MWANGAZA OFFICE SUPPLIES (SIMULATED)"),
    ("bold", "DELIVERY NOTE No. DN-DUMMY-0457"),
    ("blank", ""),
    ("text", "Delivered to: Kilele Youth Tech Ltd"),
    ("text", "Date delivered: 2 October 2026"),
    ("blank", ""),
    ("text", "1. A4 printing paper, 80 gsm - 10 reams"),
    ("text", "2. Toner cartridge, black - 2 pieces"),
    ("text", "3. Extension cable, 4-way - 3 pieces"),
    ("blank", ""),
    ("text", "Received in good order by: ____________________   Signature: __________"),
]


def document_lines(document: dict) -> list[tuple[str, str]]:
    lines = [("bold", DOC_BANNER), ("blank", ""), ("bold", document["heading"]), ("blank", "")]
    for text in document["lines"]:
        lines += [("text", text), ("blank", "")]
    return lines


def write_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8", newline="\n")


def write_documents(folder: Path, documents: list[dict]) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    for document in documents:
        (folder / document["file"]).write_bytes(build_pdf(document_lines(document)))
    write_json(folder / "expected.json", {d["file"]: d["expected"] for d in documents})


def main() -> None:
    write_documents(OUT_DIR / "kilele-youth-tech", KILELE_DOCUMENTS)
    write_documents(OUT_DIR / "upendo-tailoring", UPENDO_DOCUMENTS)

    for sample in TENDER_PAIRS:
        folder = OUT_DIR / "tenders" / sample["slug"]
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "tender_SIMULATED.pdf").write_bytes(build_pdf(tender_lines(sample)))
        (folder / "addendum_1_SIMULATED.pdf").write_bytes(build_pdf(addendum_lines(sample)))
        write_json(
            folder / "expected.json",
            {
                "tender": "tender_SIMULATED.pdf",
                "addendum": "addendum_1_SIMULATED.pdf",
                "old_deadline": sample["old_deadline"][1],
                "new_deadline": sample["new_deadline"][1],
                "changes": addendum_changes(sample),
            },
        )

    edge = OUT_DIR / "tenders" / "pwani-stationery-no-deadline"
    edge.mkdir(parents=True, exist_ok=True)
    (edge / "tender_SIMULATED.pdf").write_bytes(build_pdf(NO_DEADLINE_LINES))

    negative = OUT_DIR / "negative"
    negative.mkdir(parents=True, exist_ok=True)
    (negative / "delivery_note_NOT_A_TENDER.pdf").write_bytes(build_pdf(NOT_A_TENDER_LINES))

    print(f"Wrote the demo pack to {OUT_DIR}")


if __name__ == "__main__":
    main()
