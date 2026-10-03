# Sample tenders and simulated addenda

Owner: C. Everything here is **SIMULATED**: the procuring entities, tender numbers and
contents are invented for the demo (R21). Do not present them as real tenders.

Each folder is one pair:

| File | What it is |
|---|---|
| `tender_SIMULATED.pdf` | Version 1 of the tender |
| `addendum_1_SIMULATED.pdf` | An addendum that moves the deadline, adds a required document and changes a quantity |
| `expected.json` | The true changes with their exact quotes: the ground truth for `scripts/try_compare.py` and the tests |

| Pair | Deadline in the tender | Deadline in the addendum | Required document added |
|---|---|---|---|
| `mashariki-cleaning` (demo pair) | 20 Oct 2026, 10:00 | 3 Nov 2026, 10:00 | Single business permit |
| `ziwani-chemicals` | 27 Oct 2026, 11:00 | 10 Nov 2026, 11:00 | Bank statements |
| `tumaini-computers` | 6 Nov 2026, 12:00 | 20 Nov 2026, 12:00 | CR12 |

All times are East African Time.

## Dates the dummy documents must line up with (for B)

The demo uses `mashariki-cleaning`:

- A tax compliance certificate expiring **12 Oct 2026** is *expiring* against the 20 Oct deadline.
- A certificate expiring between **21 Oct and 2 Nov 2026** is *met* in version 1 and flips to
  *expiring* once the addendum moves the deadline to 3 Nov.
- No dummy business permit means the added requirement shows as *missing*.

## Regenerating

The PDFs are built from `scripts/make_sample_tenders.py` and are byte-identical on every run:

```bash
python scripts/make_sample_tenders.py
```
