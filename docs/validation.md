# Validation notes

What has been measured about the AI parts of TenderReady. Every number here comes from a
script in `scripts/` run on the dummy and simulated files in `sample_data/`. Nothing here is
a claim about real tenders or real certificates.

Measured on 4 October 2026 with `LLM_MODEL=gemini-3.5-flash-lite` on the free tier, on a
local server with a throwaway SQLite database.

## Status

| Measure | Script | Gate | Result |
|---|---|---|---|
| Per-field accuracy of document extraction | `scripts/try_extract.py` | M1 | **35 of 35 fields** |
| Missed and invented requirements on the three sample tenders | (see below) | M2 | **0 missed, 0 invented** of 15 |
| Changes caught and missed on the three sample pairs | `scripts/try_compare.py` | M1: 2 of 3 pairs fully correct | **3 of 3 pairs, 9 of 9 changes** |
| Demo story passes three times in a row | `scripts/e2e_demo.py --runs 3` | M4 | **3 of 3 runs, all seven steps** |

## Results

### Document extraction (5 dummy documents)

| Field | Correct |
|---|---|
| document_type | 5 of 5 |
| holder_name | 5 of 5 |
| kra_pin | 5 of 5 |
| registration_number | 5 of 5 |
| issued_on | 5 of 5 |
| expires_on | 5 of 5 |
| directors | 5 of 5 |

The first run (prompt v1, `gemini-3.5-flash`) got 34 of 35: it read the ID card number as a
registration number. Prompt v2 says a registration number is never an ID, certificate or
PIN number, and gets 35 of 35. The deliberate name mismatch on the ID is read as printed,
so the check reports it.

### Tender requirements (3 sample tenders, 5 mandatory requirements each)

| Tender | Found | Missed | Invented | Extra, with a verified quote |
|---|---|---|---|---|
| mashariki-cleaning | 5 of 5 | 0 | 0 | 1 (the AGPO eligibility clause) |
| ziwani-chemicals | 5 of 5 | 0 | 0 | 1 (the eligibility clause) |
| tumaini-computers | 5 of 5 | 0 | 0 | 0 |

Every deadline was read correctly. Every document type was mapped correctly; the
manufacturer authorisation letter is `other`, so the check shows it as unclear (R6).
The extra lines are real eligibility requirements whose quote is in the tender. Whether an
eligibility clause is listed is not consistent between tenders.

### Compare (3 sample pairs, 3 true changes each)

| Pair | Caught | Missed | Extra |
|---|---|---|---|
| mashariki-cleaning | 3 of 3 | 0 | 0 |
| ziwani-chemicals | 3 of 3 | 0 | 0 |
| tumaini-computers | 3 of 3 | 0 | 0 |

Every quote was found word for word in its document.

### Demo story

`scripts/e2e_demo.py --runs 3` against `runserver`: 3 of 3 runs, all seven steps. The AGPO
certificate (expires 12 October) is expiring; the tax certificate flips from met to
expiring when the addendum moves the deadline to 3 November; the alert is written and its
email sent (console backend); the second upload of the addendum creates nothing. Runs 2
and 3 reuse cached answers (R11), as the app is designed to.

## What went wrong on the way, and what changed

- **Model names.** `gemini-2.5-flash` and `gemini-2.5-flash-lite` are closed to new keys
  (404). `LLM_MODEL` must be a model name such as `gemini-3.5-flash-lite`, not the name of
  the key in AI Studio.
- **Free-tier quota.** The free tier allows **20 requests a day per model** for
  `gemini-3.5-flash` and `gemini-3.8-flash` (`gemini-flash-latest` is `gemini-3.8-flash`),
  and both were used up during these runs. One full demo on new files costs 8 requests (5
  documents, the tender, the addendum, the compare); the same files again cost nothing
  because answers are cached. Keep a separate key for the live demo.
- **503 "high demand".** `gemini-3-flash-preview` and `gemini-3.5-flash` answered 503 at
  times. The client retries twice; a spike longer than that is a 502 for the user.
- **Answer shape.** `gemini-3.5-flash-lite` sometimes returns a bare list instead of
  `{"changes": [...]}`, and `gemini-3.5-flash` once returned text that was not plain JSON.
  The client now accepts a bare list for a schema with one list field and reads JSON from
  inside a code fence or a sentence. The answer is still validated against the schema.

## Known weak spots to test next

- **Scans and photos.** They have no text layer, so quotes cannot be checked: their
  requirements and changes are kept as the model gave them. Not measured.
- **Long tenders.** The whole PDF goes to the model in one request; a real 60-page tender
  has not been tried.
- **Other models.** All the numbers above are for `gemini-3.5-flash-lite`. Measure again
  after changing `LLM_MODEL`.
- **The 12 October date.** From 12 October 2026 the dummy AGPO certificate counts as
  missing instead of expiring, and step 3 of `e2e_demo.py` fails until the date in
  `scripts/make_sample_documents.py` is moved.
- **Insight cases.** All 20 Rejection Insight cases are illustrative and have no source.

## How to measure again

```bash
python manage.py migrate
python scripts/try_extract.py
python scripts/try_compare.py
python manage.py runserver         # in another terminal:
python scripts/e2e_demo.py --runs 3
```

Missed and invented requirements: upload each `sample_data/tenders/*/tender_SIMULATED.pdf`
and compare `latest_version.requirements` with the `MR1` to `MR5` lines of that tender.
