# Dummy business documents

Owner: B. Everything here is a **DUMMY**: the business, the people and every number are
invented for the demo (R21). Never put a real certificate or a real ID in this folder.

| File | What it is | Dates |
|---|---|---|
| `business_registration_DUMMY.pdf` | Certificate of incorporation | No expiry |
| `tax_compliance_DUMMY.pdf` | Tax compliance certificate | Valid until 28 Oct 2026 |
| `agpo_certificate_DUMMY.pdf` | AGPO certificate, women category | Expires 12 Oct 2026 |
| `cr12_DUMMY.pdf` | CR12 with two directors | Issued 1 Sep 2026 |
| `national_id_DUMMY.pdf` | Specimen ID whose name is **not** one of the CR12 directors | No expiry |

`expected.json` lists what extraction should read from each file. It is the ground truth
for `scripts/try_extract.py`.

## How they line up with the demo tender (`mashariki-cleaning`)

- The AGPO certificate expires on 12 Oct, before the 20 Oct deadline: it is *expiring* in
  version 1. After 12 Oct 2026 it has already expired and shows as *missing* instead.
- The tax compliance certificate runs to 28 Oct: it is *met* in version 1 and flips to
  *expiring* when the addendum moves the deadline to 3 Nov.
- There is no business permit, so the requirement the addendum adds is *missing*.
- The ID name differs from the directors on the CR12, so the check reports a mismatch.

## Regenerating

The PDFs are built from `scripts/make_sample_documents.py` and are byte-identical on every
run:

```bash
python scripts/make_sample_documents.py
```
