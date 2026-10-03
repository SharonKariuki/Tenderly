"""Generate the sample tenders and their simulated addenda. Owner: C.

Every document is SIMULATED: the procuring entities and tender numbers are invented (R21).
Each pair gets an expected.json listing the true changes, which is the ground truth for
try_compare.py and the compare tests.

Usage: python scripts/make_sample_tenders.py
"""

import json
import textwrap
from pathlib import Path

OUT_DIR = Path(__file__).resolve().parent.parent / "sample_data" / "tenders"

BANNER = "SIMULATED DOCUMENT FOR DEMONSTRATION - NOT A REAL TENDER"
WRAP_WIDTH = 84
LINES_PER_PAGE = 48

SAMPLES = [
    {
        "slug": "mashariki-cleaning",
        "entity": "Mashariki County Government",
        "tender_no": "MCG/ONT/014/2026-2027",
        "title": "Provision of Cleaning and Sanitation Services for County Offices",
        "eligibility": (
            "This tender is reserved for enterprises owned by women and registered under the "
            "Access to Government Procurement Opportunities (AGPO) programme."
        ),
        "old_deadline": ("Tuesday, 20th October 2026 at 10.00 a.m.", "2026-10-20T10:00:00+03:00"),
        "new_deadline": ("Tuesday, 3rd November 2026 at 10.00 a.m.", "2026-11-03T10:00:00+03:00"),
        "requirements": [
            "Copy of the Certificate of Incorporation or Business Registration Certificate.",
            "Valid Tax Compliance Certificate issued by the Kenya Revenue Authority.",
            "Valid AGPO Certificate in the women category.",
            "Current CR12 form issued within the last twelve (12) months.",
            "Copy of the National Identity Card of each director.",
        ],
        "new_requirement": "Valid Single Business Permit issued by a County Government.",
        "items": [
            ("Trained cleaners deployed daily to county offices", "cleaners", 12),
            ("Multipurpose liquid detergent supplied each month", "litres", 40),
            ("Sanitary bins serviced every two weeks", "bins", 25),
        ],
        "quantity_change": (0, 18),
    },
    {
        "slug": "ziwani-chemicals",
        "entity": "Ziwani Water and Sanitation Company",
        "tender_no": "ZWSC/T/007/2026-2027",
        "title": "Supply and Delivery of Water Treatment Chemicals",
        "eligibility": (
            "This tender is open to all eligible suppliers registered in Kenya who have supplied "
            "water treatment chemicals to at least one public entity."
        ),
        "old_deadline": ("Tuesday, 27th October 2026 at 11.00 a.m.", "2026-10-27T11:00:00+03:00"),
        "new_deadline": ("Tuesday, 10th November 2026 at 11.00 a.m.", "2026-11-10T11:00:00+03:00"),
        "requirements": [
            "Copy of the Certificate of Incorporation or Business Registration Certificate.",
            "Valid Tax Compliance Certificate issued by the Kenya Revenue Authority.",
            "Current CR12 form issued within the last twelve (12) months.",
            "Audited accounts for the last two (2) financial years.",
            "Valid Single Business Permit issued by a County Government.",
        ],
        "new_requirement": "Certified bank statements for the last six (6) months.",
        "items": [
            ("Aluminium sulphate in 50 kg bags", "bags", 500),
            ("Calcium hypochlorite in 45 kg drums", "drums", 120),
            ("Soda ash in 50 kg bags", "bags", 200),
        ],
        "quantity_change": (0, 750),
    },
    {
        "slug": "tumaini-computers",
        "entity": "Tumaini Technical Training Institute",
        "tender_no": "TTTI/OT/003/2026-2027",
        "title": "Supply, Delivery and Installation of Desktop Computers",
        "eligibility": (
            "This tender is reserved for enterprises owned by youth, women and persons with "
            "disabilities registered under the AGPO programme."
        ),
        "old_deadline": ("Friday, 6th November 2026 at 12.00 noon", "2026-11-06T12:00:00+03:00"),
        "new_deadline": ("Friday, 20th November 2026 at 12.00 noon", "2026-11-20T12:00:00+03:00"),
        "requirements": [
            "Copy of the Certificate of Incorporation or Business Registration Certificate.",
            "Valid Tax Compliance Certificate issued by the Kenya Revenue Authority.",
            "Valid AGPO Certificate in the youth, women or persons with disabilities category.",
            "Manufacturer authorisation letter for the computers offered.",
            "Copy of the National Identity Card of each director.",
        ],
        "new_requirement": "Current CR12 form issued within the last twelve (12) months.",
        "items": [
            ("Desktop computers with monitor, keyboard and mouse", "units", 40),
            ("Uninterruptible power supply units of 650 VA", "units", 40),
            ("Network laser printers", "units", 4),
        ],
        "quantity_change": (0, 55),
    },
]


def closing_sentence(deadline_text: str) -> str:
    return f"Completed tenders must be submitted on or before {deadline_text} East African Time."


def item_sentence(number: int, item: tuple[str, str, int]) -> str:
    description, unit, quantity = item
    return f"Item {number}: {description}. Quantity: {quantity} {unit}."


def requirement_sentence(number: int, text: str) -> str:
    return f"MR{number}. {text}"


def tender_lines(sample: dict) -> list[tuple[str, str]]:
    lines = [
        ("bold", BANNER),
        ("blank", ""),
        ("bold", sample["entity"].upper()),
        ("bold", f"TENDER No. {sample['tender_no']}"),
        ("bold", sample["title"].upper()),
        ("blank", ""),
        ("bold", "1. Invitation to tender"),
        (
            "text",
            f"{sample['entity']} invites sealed tenders from eligible tenderers for the "
            f"{sample['title']}. Tendering will be conducted under the open national "
            "competitive method using this standard tender document.",
        ),
        ("blank", ""),
        ("bold", "2. Eligibility"),
        ("text", sample["eligibility"]),
        ("blank", ""),
        ("bold", "3. Closing date"),
        ("text", closing_sentence(sample["old_deadline"][0])),
        (
            "text",
            "Tenders will be opened immediately after the closing time in the presence of "
            "tenderers or their representatives who choose to attend. Late tenders will be "
            "rejected.",
        ),
        ("blank", ""),
        ("bold", "4. Mandatory requirements (preliminary evaluation)"),
        (
            "text",
            "Tenderers must submit all the documents listed below. A tender that does not "
            "meet every mandatory requirement will be declared non-responsive and will not "
            "be evaluated further.",
        ),
    ]
    for number, text in enumerate(sample["requirements"], start=1):
        lines.append(("text", requirement_sentence(number, text)))
    lines += [("blank", ""), ("bold", "5. Schedule of requirements")]
    for number, item in enumerate(sample["items"], start=1):
        lines.append(("text", item_sentence(number, item)))
    lines += [
        ("blank", ""),
        ("bold", "6. Pricing and submission"),
        (
            "text",
            "Prices must be quoted in Kenya Shillings, inclusive of all taxes, and must "
            "remain valid for 120 days from the closing date.",
        ),
        (
            "text",
            "Tenders must be submitted in a plain sealed envelope marked with the tender "
            "number and deposited in the tender box at the main office reception.",
        ),
    ]
    return lines


def addendum_changes(sample: dict) -> list[dict]:
    """The true changes of the pair, in the order the addendum states them."""
    index, new_quantity = sample["quantity_change"]
    old_item = sample["items"][index]
    new_item = (old_item[0], old_item[1], new_quantity)
    new_number = len(sample["requirements"]) + 1
    return [
        {
            "category": "deadline",
            "old_quote": closing_sentence(sample["old_deadline"][0]),
            "new_quote": closing_sentence(sample["new_deadline"][0]),
        },
        {
            "category": "required_documents",
            "old_quote": None,
            "new_quote": requirement_sentence(new_number, sample["new_requirement"]),
        },
        {
            "category": "specifications_quantities",
            "old_quote": item_sentence(index + 1, old_item),
            "new_quote": item_sentence(index + 1, new_item),
        },
    ]


def addendum_lines(sample: dict) -> list[tuple[str, str]]:
    deadline, document, quantity = addendum_changes(sample)
    return [
        ("bold", BANNER),
        ("blank", ""),
        ("bold", sample["entity"].upper()),
        ("bold", f"ADDENDUM No. 1 TO TENDER No. {sample['tender_no']}"),
        ("bold", sample["title"].upper()),
        ("blank", ""),
        (
            "text",
            "This addendum amends the tender document and forms part of it. Tenderers must "
            "take it into account when preparing their tenders.",
        ),
        ("blank", ""),
        ("bold", "1. Closing date (clause 3)"),
        ("text", f'The sentence that read: "{deadline["old_quote"]}"'),
        ("text", f'is deleted and replaced with: "{deadline["new_quote"]}"'),
        ("blank", ""),
        ("bold", "2. Mandatory requirements (clause 4)"),
        ("text", "The following mandatory requirement is added:"),
        ("text", document["new_quote"]),
        ("blank", ""),
        ("bold", "3. Schedule of requirements (clause 5)"),
        ("text", f'The line that read: "{quantity["old_quote"]}"'),
        ("text", f'is deleted and replaced with: "{quantity["new_quote"]}"'),
        ("blank", ""),
        ("text", "All other terms and conditions of the tender document remain unchanged."),
    ]


def escape_pdf_text(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def build_pdf(lines: list[tuple[str, str]]) -> bytes:
    """A minimal text-only PDF (Helvetica, A4) with a real text layer and no timestamps,
    so the output is byte-identical on every run."""
    rows: list[tuple[str, str]] = []
    for style, text in lines:
        if style == "blank":
            rows.append(("text", ""))
        else:
            rows += [(style, part) for part in textwrap.wrap(text, WRAP_WIDTH)]
    pages = [rows[i : i + LINES_PER_PAGE] for i in range(0, len(rows), LINES_PER_PAGE)]

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"",  # the page tree, filled in once the page object numbers are known
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    ]
    page_numbers = []
    for page in pages:
        commands = ["BT", "14 TL", "72 770 Td"]
        for style, text in page:
            font = "/F2 10.5 Tf" if style == "bold" else "/F1 10.5 Tf"
            commands.append(f"{font} ({escape_pdf_text(text)}) Tj T*")
        commands.append("ET")
        stream = "\n".join(commands).encode("cp1252")
        content_number = len(objects) + 2
        page_numbers.append(len(objects) + 1)
        objects.append(
            (
                "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
                "/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> "
                f"/Contents {content_number} 0 R >>"
            ).encode()
        )
        objects.append(f"<< /Length {len(stream)} >>\nstream\n".encode() + stream + b"\nendstream")
    kids = " ".join(f"{number} 0 R" for number in page_numbers)
    objects[1] = f"<< /Type /Pages /Kids [{kids}] /Count {len(page_numbers)} >>".encode()

    pdf = bytearray(b"%PDF-1.4\n")
    offsets = []
    for number, body in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf += f"{number} 0 obj\n".encode() + body + b"\nendobj\n"
    xref_offset = len(pdf)
    pdf += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode()
    for offset in offsets:
        pdf += f"{offset:010d} 00000 n \n".encode()
    pdf += (
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n"
    ).encode()
    return bytes(pdf)


def main() -> None:
    for sample in SAMPLES:
        folder = OUT_DIR / sample["slug"]
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "tender_SIMULATED.pdf").write_bytes(build_pdf(tender_lines(sample)))
        (folder / "addendum_1_SIMULATED.pdf").write_bytes(build_pdf(addendum_lines(sample)))
        expected = {
            "tender": "tender_SIMULATED.pdf",
            "addendum": "addendum_1_SIMULATED.pdf",
            "old_deadline": sample["old_deadline"][1],
            "new_deadline": sample["new_deadline"][1],
            "changes": addendum_changes(sample),
        }
        (folder / "expected.json").write_text(
            json.dumps(expected, indent=2) + "\n", encoding="utf-8", newline="\n"
        )
        print(f"wrote {folder.name}")


if __name__ == "__main__":
    main()
