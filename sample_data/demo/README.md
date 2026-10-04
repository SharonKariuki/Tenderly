# Demo pack: businesses, tenders and test cases

Owner: B. Everything here is a **DUMMY** or **SIMULATED** (R21): the businesses, people, PINs,
procuring entities and tender numbers are invented. Never present them as real.

The first demo pair stays where it was: **Demo Business Ltd** (`sample_data/documents`) with
the **Mashariki cleaning** tender (`sample_data/tenders/mashariki-cleaning`). This pack adds
two more businesses and the tenders that make every check result appear at least once.

Expected results assume the demo runs on **4 October 2026** or later and before
**29 October 2026**. A document that expired before today shows as *missing*, not *expiring*.

Regenerate the PDFs (byte-identical on every run):

```bash
python scripts/make_demo_pack.py
```

## What is in the pack

| Folder | What it is |
|---|---|
| `kilele-youth-tech/` | 6 documents for a youth-owned company. All are valid, so it is **ready** for Nyota. |
| `upendo-tailoring/` | 5 documents for a sole proprietor with a disability. Built to hit *unclear*, *missing* and a PIN mismatch. |
| `tenders/nyota-ict-support/` | Youth-only tender plus an addendum that pushes the deadline past Kilele's permit expiry |
| `tenders/baraka-uniforms/` | Disability-only tender plus an addendum that adds a business permit |
| `tenders/pwani-stationery-no-deadline/` | A request for quotation with **no closing date** |
| `negative/delivery_note_NOT_A_TENDER.pdf` | A delivery note. Uploading it as a tender must be refused. |

Each `expected.json` is the ground truth: what extraction should read from each document,
or the true changes in each addendum (same format as `sample_data/`).

### The traps built into the documents

| File | Trap | What the check should do |
|---|---|---|
| `kilele-youth-tech/national_id_DUMMY.pdf` | Name printed as "Rotich Brian Kiprono", while the company owners list (CR12) has "Brian Kiprono Rotich" | **No** mismatch, because word order is ignored |
| `kilele-youth-tech/business_permit_DUMMY.pdf` | Expires 31 Dec 2026 | *Met* for Nyota v1, then *expiring* after the addendum |
| `upendo-tailoring/tax_compliance_NO_EXPIRY_DUMMY.pdf` | No expiry date, and the PIN is **P000000008M** instead of P000000003M | *Unclear* (no expiry date) plus a KRA PIN mismatch with the profile |
| `upendo-tailoring/agpo_certificate_EXPIRED_DUMMY.pdf` | Expired on 29 Sep 2026 | *Missing*: "expired on 2026-09-29. Renew it before you bid." |
| `upendo-tailoring/business_registration_DUMMY.pdf` | Sole proprietor (business name), so there is no CR12 | No CR12 requirement in Baraka, so nothing missing |

---

## Onboarding: what to type for each business

Use a new email for each business so that their documents never mix.

| Step | Kilele Youth Tech Ltd | Upendo Tailoring Enterprises | Demo Business Ltd (existing pair) |
|---|---|---|---|
| Email | `kilele.demo@example.com` | `upendo.demo@example.com` | `demo.owner@example.com` |
| Password | `kilele-demo-passphrase-26` | `upendo-demo-passphrase-26` | `demo-owner-passphrase-26` |
| Consent | Tick it | Tick it | Tick it |
| Owner's name | Brian Kiprono Rotich | Mercy Wairimu Odhiambo | Wanjiru Achieng Kamau |
| Business name | Kilele Youth Tech Ltd | Upendo Tailoring Enterprises | Demo Business Ltd |
| KRA PIN | P000000002K | P000000003M | P000000000X |
| Registration number | PVT-DEMO0002 | BN-DEMO0003 | PVT-DEMO0001 |
| Business is owned by | Youth | Persons with disabilities | Women |
| Language | English | Kiswahili | English |
| Upload | all 6 files in `kilele-youth-tech/` | all 5 files in `upendo-tailoring/` | all 5 files in `sample_data/documents/` |
| Tender | `nyota-ict-support` | `baraka-uniforms` | `mashariki-cleaning` |

Profile request body for the API (`PUT /api/profile/`), for example for Kilele:

```json
{
  "business_name": "Kilele Youth Tech Ltd",
  "kra_pin": "P000000002K",
  "reg_number": "PVT-DEMO0002",
  "agpo_category": "youth",
  "preferred_language": "en",
  "consent": true
}
```

### Onboarding inputs that should be rejected or caught

| Input | Expected |
|---|---|
| Continue without ticking consent | Cannot go on; no document upload is possible |
| KRA PIN `12345` or `P00000000` (too short) | Field error, or a mismatch once the tax certificate is read |
| KRA PIN in lowercase, `p000000002k` | Accepted and treated the same as `P000000002K` (normalised) |
| Business name `Kilele Youth Tech Limited` | No mismatch with "Ltd" on the documents |
| Business name left empty | Profile cannot be saved, or the check asks for it |

---

## Use cases

| ID | Use case | Who |
|---|---|---|
| UC1 | Sign up, give consent and set up the business profile | Every owner |
| UC2 | Upload compliance documents, review what was read, confirm them | Every owner |
| UC3 | Upload a tender and see the requirements with the quote from the tender | Every owner |
| UC4 | Run the readiness check against the tender **deadline**, not today | Every owner |
| UC5 | Spot documents that disagree with each other or with the profile | Every owner |
| UC6 | Upload an addendum, see what changed, and get an alert for anything that flipped | Owner with a tender |
| UC7 | Paste a tender message from WhatsApp, SMS or email and get warning signs | Any owner |
| UC8 | Only see tenders reserved for the owner's group (women, youth, disability) | Every owner |
| UC9 | Be told clearly when a file cannot be read as a tender | Any owner |

---

## Test cases

### TC1. Ready to bid (Kilele, Nyota version 1)

Covers UC1 to UC5.

1. Sign up and onboard as Kilele (see the table above).
2. Upload the 6 files in `kilele-youth-tech/` and confirm each one.
3. Upload `tenders/nyota-ict-support/tender_SIMULATED.pdf`.
4. Run the check.

| Requirement | Expected |
|---|---|
| MR1 Business registration | Met |
| MR2 Tax compliance (to 31 Mar 2027) | Met, "Valid through the deadline." |
| MR3 AGPO youth (to 20 May 2027) | Met |
| MR4 CR12 | Met |
| MR5 National ID | Met |
| MR6 Business permit (to 31 Dec 2026) | Met |
| Deadline | 29 Oct 2026, 10:00 EAT |
| Overall | **Ready** |
| Mismatches | None (ID name order differs, which is allowed) |

### TC2. The addendum breaks a ready bid (Kilele, Nyota version 2)

Covers UC6. Continue from TC1.

1. Upload `tenders/nyota-ict-support/addendum_1_SIMULATED.pdf` to the same tender.

| Expected | Value |
|---|---|
| Deadline change | 29 Oct 2026 → **15 Jan 2027** |
| Business permit | Met → **Expiring**, "Expires 15 days before the deadline" |
| New requirement MR7 Audited accounts | **Missing** |
| Quantity change | Item 1, technicians 4 → 6 |
| Overall | Ready → **Attention needed** |
| Alert | In-app (and email) alert listing the 2 flips |

### TC3. Every kind of problem (Upendo, Baraka version 1)

Covers UC2, UC4 and UC5.

1. Onboard as Upendo with PIN **P000000003M**.
2. Upload and confirm the 5 files in `upendo-tailoring/`.
3. Upload `tenders/baraka-uniforms/tender_SIMULATED.pdf` and run the check.

| Requirement | Expected |
|---|---|
| MR1 Business registration | Met |
| MR2 Tax compliance (no expiry date) | **Unclear**, "Your tax clearance certificate has no expiry date. Add the expiry date to the document." |
| MR3 AGPO disability (expired 29 Sep 2026) | **Missing**, "Your women, youth and disability certificate expired on 2026-09-29. Renew it before you bid." |
| MR4 Disability registration card | Met |
| MR5 Audited accounts | **Missing**, "No confirmed audited accounts in your documents." |
| MR6 Sample uniforms | **Unclear**, "This cannot be checked from your documents…" |
| Mismatch | **KRA PIN**: profile P000000003M, tax certificate P000000008M (plus the false business name mismatch below) |
| Overall | **Attention needed** |

> **Known issue (confirmed against `rules/engine.py`).** The disability card's holder is the
> owner (Mercy Wairimu Odhiambo), not the business. `rules/mismatch.py` only skips national IDs
> when comparing business names, so the check today also reports a false **business name**
> mismatch: "Upendo Tailoring Enterprises" vs "Mercy Wairimu Odhiambo". Expected: no business
> name mismatch. Fix: also skip `ncpwd_registration` in `find_mismatches`.

### TC4. Fixing a document clears the problem (Upendo)

Covers UC2 and UC4. Continue from TC3.

1. Open the tax certificate, set the expiry date to **9 Jun 2027** and the PIN to
   **P000000003M**, then save.
2. Run the check again.

Expected: MR2 becomes **Met** and the KRA PIN mismatch is gone.

### TC5. An unconfirmed document does not count (any business)

Covers UC2 (R2).

1. Upload Kilele's tax certificate but **do not** confirm it. Run the Nyota check.

Expected: MR2 is **Missing**, "Confirm your tax clearance certificate so that it can count."
Confirm it, run again, and it becomes **Met**.

### TC6. Baraka addendum (Upendo, Baraka version 2)

Covers UC6. Continue from TC3.

| Expected | Value |
|---|---|
| Deadline change | 12 Nov 2026 → 26 Nov 2026 |
| New requirement MR7 Business permit | **Missing** |
| Quantity change | Item 3, sweaters 400 → 650 |
| Statuses that do not change | MR1 to MR6 |

### TC7. Tender with no closing date (Kilele, Pwani)

Covers UC3 and UC4.

1. As Kilele, upload `tenders/pwani-stationery-no-deadline/tender_SIMULATED.pdf` and run the check.

| Requirement | Expected |
|---|---|
| Deadline | Empty (none read) |
| MR1 Business registration | Met (it has no expiry date to check) |
| MR2 Tax compliance | **Unclear**, "The tender has no closing date to check against." |
| MR3 Business permit | **Unclear**, same reason |
| Overall | **Attention needed** |

### TC8. Not a tender (any business)

Covers UC9.

1. Upload `negative/delivery_note_NOT_A_TENDER.pdf` as a tender.

Expected: `422 unreadable_tender`, "No requirements or closing date could be read from this
file. Check that it is the tender document." Nothing is saved.

### TC9. The tender list matches the owner's group

Covers UC8.

| Owner | Expected |
|---|---|
| Kilele (youth) | Youth-only and open tenders shown; women-only tenders hidden or marked "not for you" |
| Upendo (disability) | Disability-only and open tenders shown; Nyota (youth only) not recommended |
| Change Kilele's group to "None of these groups" in Profile | Only open tenders remain |

### TC10. Each owner sees only their own data

Covers R19.

1. Sign in as Kilele and note a tender id from `GET /api/tenders/`.
2. Sign in as Upendo and call `GET /api/tenders/<that id>/`.

Expected: `404`. Upendo's document and tender lists contain none of Kilele's files.

### TC11. Original demo pair (Demo Business Ltd, Mashariki)

See `sample_data/documents/README.md`. In short: the AGPO certificate (expires 12 Oct 2026) is
*expiring* against the 20 Oct deadline, the tax certificate flips from *met* to *expiring* after
the addendum, the business permit the addendum adds is *missing*, and the ID name does not
match the CR12 directors.

---

## Messages to paste into "Check a message"

**Scam: should show all four warning signs.**

```
URGENT: Your company has been shortlisted for the supply of laptops to Nyota County.
Pay a registration fee of KES 5,000 to confirm your bid through M-Pesa Paybill 400200,
account NYOTA. Today only. Send the confirmation to nyota.tenders@gmail.com.
```

Expected: pay by M-Pesa, personal email address, money to confirm the bid, rushes you to act today.

**Partly suspicious: one warning sign.**

```
Dear supplier, the tender for school uniforms (BCEB/RFQ/009/2026-2027) is now open.
For the tender document, write to baraka.procurement@yahoo.com.
```

Expected: personal email address only.

**Genuine-looking: no warning signs.**

```
Nyota County Government invites sealed tenders for the Provision of ICT Support Services
(NCG/ONT/021/2026-2027). The tender document can be downloaded free of charge from the
county website. Closing date: 29 October 2026 at 10.00 a.m.
```

Expected: no warning signs, plus the reminder to upload the full PDF for a full check.

## Questions to try in "Ask"

| Question | Good answer mentions |
|---|---|
| What documents do I need for my top match? | The requirement list of the top tender |
| What am I missing to bid? (as Upendo) | Expired AGPO certificate, audited accounts, tax certificate without an expiry date |
| Which tenders close in the next 7 days? | Only tenders closing within 7 days of today |
| Why is my tax certificate unclear? | It has no expiry date |
| Nini kinakosekana ili niombe zabuni? (Kiswahili) | An answer in Kiswahili |

## Suggested 3-minute demo order

1. Kilele: onboard, upload documents, Nyota check shows **Ready** (TC1).
2. Upload the Nyota addendum: alert, the permit flips to expiring, audited accounts missing (TC2).
3. Switch to Upendo: Baraka check shows unclear, expired and the PIN mismatch (TC3).
4. Fix the tax certificate live and watch it turn green (TC4).
5. Paste the scam message (Check a message).
