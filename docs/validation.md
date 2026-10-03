# Validation notes

What has been measured about the AI parts of TenderReady, and what has not. Every number
here comes from a script in `scripts/` run on the dummy and simulated files in
`sample_data/`. Nothing here is a claim about real tenders or real certificates.

## Status

| Measure | Script | Gate | Result |
|---|---|---|---|
| Per-field accuracy of document extraction | `scripts/try_extract.py` | M1 | **Not measured yet** |
| Missed and invented requirements on the three sample tenders | (see below) | M2 | **Not measured yet** |
| Changes caught and missed on the three sample pairs | `scripts/try_compare.py` | M1: 2 of 3 pairs fully correct | **Not measured yet** |
| Demo story passes three times in a row | `scripts/e2e_demo.py --runs 3` | M4 | **Passed with a faked model only** |

The three AI measures need `GEMINI_API_KEY` and `LLM_MODEL`, and neither was set when this
note was written. Each script exits with code 2 and says so instead of printing numbers.

## What has been proven without a model

- **The pipeline fits together.** `tests/test_full_flow.py` and one run of
  `scripts/e2e_demo.py --runs 3` over real HTTP (3 of 3 runs, all seven steps) use every real
  endpoint, rule and database write, with only the call to Gemini replaced by a fake that
  answers what a correct model would read. This shows that a correct reading produces the
  right checklist, flips, alert and duplicate handling. It does not show that Gemini reads
  the files correctly.
- **Quotes are checked by code, not trusted (R5).** A requirement or a change whose quote
  is not in the PDF text layer is dropped (`tests/test_tenders_api.py`,
  `tests/test_compare.py`). Every quote in `sample_data/tenders/*/expected.json` is in its
  PDF's text layer (`tests/test_sample_data.py`).
- **Untidy answers do not fail the request.** A document or requirement type outside the
  enum becomes `other` (or no document type), a confidence of `92` is read as `0.92`, and a
  `null` list is empty. Unreadable dates stay `null` and ask for review (R4).
- **Failures are clean.** No key gives `502 ai_not_configured` at once; a model that keeps
  failing gives `502 ai_failure` after two retries, and nothing is stored.

## How to collect the numbers

With the key set in `.env`:

```bash
python manage.py migrate
python scripts/try_extract.py      # prints the per-field table below
python scripts/try_compare.py      # prints HIT, EXTRA and MISS per pair
python manage.py runserver         # in another terminal:
python scripts/e2e_demo.py --runs 3
```

Missed and invented requirements: upload each `sample_data/tenders/*/tender_SIMULATED.pdf`
(Swagger or `e2e_demo.py`) and compare `latest_version.requirements` with the `MR1` to `MR5`
lines of that tender. A requirement the model invents without a matching quote is dropped
by the quote check, so it shows up as missed, not invented.

Fill in the tables below and keep the date and the model name, because results change with
the model.

### Document extraction (5 dummy documents)

Model: _not run_ &nbsp; Date: _not run_

| Field | Correct |
|---|---|
| document_type | - of 5 |
| holder_name | - of 5 |
| kra_pin | - of 5 |
| registration_number | - of 5 |
| issued_on | - of 5 |
| expires_on | - of 5 |
| directors | - of 5 |

### Tender requirements (3 sample tenders, 5 mandatory requirements each)

Model: _not run_ &nbsp; Date: _not run_

| Tender | Found | Missed | Invented |
|---|---|---|---|
| mashariki-cleaning | - of 5 | - | - |
| ziwani-chemicals | - of 5 | - | - |
| tumaini-computers | - of 5 | - | - |

### Compare (3 sample pairs, 3 true changes each)

Model: _not run_ &nbsp; Date: _not run_

| Pair | Caught | Missed | Extra |
|---|---|---|---|
| mashariki-cleaning | - of 3 | - | - |
| ziwani-chemicals | - of 3 | - | - |
| tumaini-computers | - of 3 | - | - |

## Known weak spots to test first

- **Scans and photos.** They have no text layer, so quotes cannot be checked: their
  requirements and changes are kept as the model gave them. Try one photographed page.
- **Long tenders.** The whole PDF goes to the model in one request; a real 60-page tender
  has not been tried.
- **The 12 October date.** The dummy AGPO certificate expires on 12 October 2026. From
  that day it counts as missing instead of expiring, and step 3 of `e2e_demo.py` fails
  until the date in `scripts/make_sample_documents.py` is moved.
- **Insight cases.** All 20 Rejection Insight cases are illustrative and have no source.
