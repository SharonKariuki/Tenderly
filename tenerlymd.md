# TenderReady: Backend Sprint Plan (Django + Neon)

**Event:** GirlCode Kenya Hackathon, Konza Technopolis, 3-4 October 2026
**Stack:** Django + PostgreSQL on Neon. Every tool on the free tier. Email for login and alerts.
**Team:** 3 members. **Status:** working draft, 3 October 2026.

> Items marked **(verify)** must be checked against the vendor's current documentation or a primary legal source before being relied on or quoted publicly. This plan is general project guidance, not legal advice.

---

## 1. Sprint at a glance

**Goal.** In 4 hours, have a working MVP. Hours 0:00 to 3:00 build the backend (this plan). Hours 3:00 to 4:00 the whole team builds the frontend on top of the frozen API.

The backend must deliver the demo story: a woman uploads her documents and a tender, sees one certificate flagged *valid today but expiring before the deadline*, uploads an addendum, and the checklist flips to red with an email alert.

### Timeline

| Milestone | Window | Theme | Gate (must be true to move on) |
|---|---|---|---|
| M0 | 0:00 - 0:30 | Foundation and contracts | Django skeleton on dev (bootstrap by 0:25), all tables created on Neon, LLM client returns JSON from a sample PDF, sample tenders and dummy documents committed |
| M1 | 0:30 - 1:15 | Building blocks in parallel | Rules engine tested; document upload and extraction works; compare function works from a script on 3 pairs |
| M2 | 1:15 - 2:00 | Tender pipeline and readiness check | Upload tender, then requirements; POST check returns a checklist with at least one "expiring" item |
| M3 | 2:00 - 2:40 | Addenda end to end | Addendum upload creates version 2, flips the checklist, writes an alert and sends an email |
| M4 | 2:40 - 3:00 | Hardening, freeze, handoff | e2e script passes 3 times in a row; API freeze 2:50; dev merged to main 2:55 |
| Frontend | 3:00 - 4:00 | Whole team on UI | Feature freeze 3:40; rehearsal and backup video 3:40 - 4:00 |

### Roles (fill in names)

| Member | Role | Owns |
|---|---|---|
| **A** (Part 1) [name] | Lead and Core: integrator, only merger. Django project, accounts and email login, rules engine, readiness check API, deploy | The decision logic (met / missing / expiring) and everything shared |
| **B** (Part 2) [name] | AI and Documents: LLM client, document extraction, tender requirement extraction, summaries (EN / SW) | Turning PDFs and photos into trusted structured data |
| **C** (Part 3) [name] | Addenda, Alerts and Insight: version comparison, orchestration, email and in-app alerts, Rejection Insight dataset | The differentiator: the Addenda Watcher |

### Scope (MoSCoW)

| Tier | Items |
|---|---|
| Must | Document vault with extraction and user confirmation; tender upload with requirement extraction; deadline-aware readiness check; Addenda Watcher by manual upload (compare, re-check, in-app alert and email) |
| Should | Rejection Insight on seed data (target 20+ cases); Kiswahili summary; delete-my-data endpoint; cross-document mismatch flags |
| Could | Bid / no-bid and cash-flow card (only if M3 closes early) |
| Not now | Tender discovery, portal scraping, consortium module, WhatsApp / SMS, vector DB, custom OCR, Celery / Redis |

---

## 2. Free tech stack, Django and Neon

> **What changed from the project documentation.** The backend is **Django with Django REST Framework** and the database is **PostgreSQL on Neon**. Neon gives us Postgres only (no login system and no file storage), so Django's built-in users cover **login by email** and a small **StoredFile** table keeps uploaded files in Postgres for the MVP. The AI is the free Google Gemini tier behind one adapter, because the Claude API in the project documentation is paid. Free-tier limits and model names change: check each item marked (verify) in its dashboard.

| Need | Choice (free) | Notes |
|---|---|---|
| Language / framework | Python 3.11+, **Django 5**, Django REST Framework, drf-spectacular, django-cors-headers | Swagger UI at `/api/docs/` is the frontend contract. Pydantic is kept only to validate LLM output |
| Database | **PostgreSQL on Neon** (free), psycopg 3, dj-database-url | Use the pooled connection string with `sslmode=require`. Free tier is small (about 0.5 GB per project) and compute suspends when idle (verify) |
| Schema | Django migrations | The only way the schema changes. No hand edits in the Neon console |
| Login | Django users with **email as the username**; DRF token authentication | Endpoints: register, login. A demo-user fallback behind `DEMO_MODE` protects the demo |
| Uploaded files | `StoredFile` model (BinaryField) in Neon, 10 MB cap | Zero extra services, durable on free hosts. MVP only; move to object storage later |
| LLM (read PDFs, extract, compare, summarise, Kiswahili) | Google Gemini API free tier via google-genai, JSON output mode | Accepts PDFs and images directly. Rate limited, see pain points. Fallback: Groq free tier for text only (verify) |
| PDF text layer | pdfplumber | Text hashing, quote validation, diff pre-check (free, offline) |
| **Email** | Django email framework with Gmail SMTP and an app password | Free, reaches any address (verify daily limit). Console backend in dev, so nothing breaks without SMTP. Brevo free tier is the backup |
| Background work | A Python thread started with `transaction.on_commit` | Sends email without blocking. Celery and Redis are deliberately skipped |
| Tests and lint | pytest, pytest-django, ruff | Rules engine tests are pure Python and need no database |
| Hosting | Render free web service (gunicorn, whitenoise) or run locally; the database stays on Neon | Free instance sleeps when idle: wake it 5 minutes before the demo (verify) |
| Code and PRs | GitHub free | Branch protection on private repos may need a paid plan (verify); otherwise follow the rules by discipline |

### Why PostgreSQL on Neon works for this team

| Point | Detail |
|---|---|
| Relational where we need it | Checks stored per tender version, changes linked to versions, alerts linked to changes. JSONB columns hold the irregular parts (extracted fields, requirements, check results). |
| Branching | Neon can copy a database into a branch in seconds. Give each developer a branch to run migrations on, and keep one shared "dev" branch for the deployed API (verify the free branch limit). If the limit blocks you, share one database and let only the lead run `migrate`. |
| Cold starts | An idle Neon database suspends and the first query is slower. Warm it before the demo (hit `/api/health/` and one data endpoint). |
| What Neon does not give | Auth and file storage. We cover both in Django, which is also why every query must be scoped to the logged-in user (rule R19). |

### Dependencies (pin exact versions on day one)

```text
Django  djangorestframework  drf-spectacular  django-cors-headers  whitenoise  gunicorn
psycopg[binary]  dj-database-url  python-dotenv
google-genai  pydantic  pdfplumber  python-dateutil
pytest  pytest-django  ruff
```

---

## 3. Canonical rules

These rules are binding for the whole sprint. **3A** is how we work, **3B** is how we write code, **3C** is what the product must always do, **3D** fixes the shared vocabulary so three people never invent three names for the same thing.

### 3A. Git and pull request rules

| ID | Rule |
|---|---|
| G1 | **Never push to main.** Nobody does, including the lead. main only changes when the lead merges dev into main at 2:55 and at the final freeze. |
| G2 | **Everything goes to dev first.** Work happens on a feature branch cut from dev; the branch is pushed and a PR is opened with base = dev. The only direct push to dev is the lead's bootstrap commit in M0. |
| G3 | **Always sync first.** Before starting any task: checkout dev, pull, then run `python manage.py migrate`. Before pushing or opening a PR: fetch and rebase on origin/dev, then rerun tests. After the lead announces a merge, pull and migrate again. |
| G4 | **Only the lead (A) merges.** B and C open the PR, post the link in the team chat, and wait. Do not click merge, do not self-approve. The lead's own PRs get a quick look from a teammate, then the lead merges. |
| G5 | **One branch per task**, named `feat/<a, b or c>-<topic>` or `fix/<a, b or c>-<topic>`. Target 45 minutes of work per PR at most. Small PRs get merged fast; big ones block everyone. |
| G6 | **Every PR carries a proper description** using the template in Appendix A: what was implemented, files touched, API changes, migrations and env changes, how to test, rules touched, limitations. PRs with an empty or "wip" description are sent back unmerged. |
| G7 | **A PR must be runnable:** the server starts, migrations apply, pytest passes, ruff is clean, no `.env`, no keys, no real IDs or real company documents (dummy data only). |
| G8 | **Touch only files and apps you own** (section 4). Shared files (`contracts.py`, `settings.py`, `urls.py`, core models) are lead-only: ask in chat and the lead adds it, additive changes only. |
| G9 | Commit messages: `type(scope): message`, for example `feat(rules): flag expiring docs at deadline`. |
| G10 | Resolve your own conflicts by rebasing. Never force-push dev or main. `--force-with-lease` is allowed on your own feature branch only. |
| G11 | **Lead review SLA: 10 minutes.** Merge order follows dependencies. If you are blocked, say so in the chat; do not wait silently. |
| G12 | Bugs found on dev are fixed the same way: `fix/` branch, PR to dev, lead merges. |
| G13 | **Migrations:** only the owner of an app runs `makemigrations` for it, and the migration file is committed in the same PR as the model change. Never edit or delete a migration that is already on dev. If two migrations collide, the lead runs `makemigrations --merge`. |

### 3B. Code conventions

| ID | Rule |
|---|---|
| C1 | Type hints everywhere. DRF serializers validate every request and response. **Pydantic validates every LLM output** before it is saved; invalid output is retried once, then returns a clear error. |
| C2 | Prompts live in the prompt modules (`llm/prompts_extract.py` for B, `versions/prompts.py` for C), as named constants, never inline in services. |
| C3 | Pure functions for logic that decides things (rules, deadline note, check diff, quote validation) so they can be unit tested without network or database. |
| C4 | Configuration only through `settings.py` reading environment variables. Keep `.env.example` current. Model name in `LLM_MODEL`, never hard-coded. |
| C5 | Error format everywhere, set once in a DRF exception handler: `{"error": {"code": "...", "message": "..."}}`. Status codes: 200, 201, 400, 401, 404, 422, 502 (AI failure). |
| C6 | Every service has at least one pytest test or a runnable script in `scripts/` that proves it works on the sample data. |
| C7 | Ruff clean. No print or log of document contents, IDs or PINs anywhere (rule R16). |
| C8 | Views are thin: parse, call a service function, serialise. Business logic lives in `services.py` or the rules package, not in views or serializers. |

### 3C. Canonical product rules

| ID | Rule | Implementation detail |
|---|---|---|
| R1 | **Validity is judged at the tender deadline, not today.** | `expires_on < deadline_date` means **expiring**. `expires_on` equal to the deadline date is still **met**. |
| R2 | Only **confirmed** documents count. | An unconfirmed document is treated as absent; the result says "confirm your document". |
| R3 | **The AI never decides pass or fail.** The LLM extracts and explains; the rules package decides. | No LLM call anywhere inside `rules/`. The check is deterministic: same input, same output. |
| R4 | **Null, never guess.** | Fields not visible in the document are null. Confidence below 0.7 sets `needs_review = true` and the user must confirm. |
| R5 | **Every requirement and every change carries a source quote and page.** | Items without a quote are dropped or marked unclear. The AI may not add requirements that are not in the document. |
| R6 | Anything the rules cannot judge is **unclear**, shown with its quote. | Includes requirements with no mappable document type, and documents with a null expiry date. |
| R7 | **Versions are append-only.** | An addendum creates version n+1. The baseline is never overwritten. Requirements and deadline are stored per version. A check is stored per version. |
| R8 | After every new version, **re-run the same readiness check** on the new requirements and new deadline. | Alert logic compares the previous check to the new one and reports flips (for example met to expiring). |
| R9 | Identical text hash means **no LLM call** and the answer "no changes". | Saves free-tier quota and makes duplicate uploads idempotent. |
| R10 | The deadline-extension note is **information, not a legal conclusion**. | Show old and new deadline and say the law ties late amendments to an extension (verify section 75 wording before quoting). |
| R11 | Cache LLM results by (file hash, task, prompt version). | Model `LLMCache`. Never pay or wait twice for the same file. |
| R12 | Mismatch checks use normalised values. | Business name: lowercase, trim, collapse spaces, strip punctuation, treat LTD and LIMITED as equal. KRA PIN: uppercase exact match. Directors: compare as name token sets. |
| R13 | Requirement type comes from a **fixed enum**, chosen by the LLM, not free text. | Removes the document-type mapping problem. See 3D. |
| R14 | Kiswahili output is flagged **`needs_human_review = true`**. | English first. Never present Kiswahili as verified. |
| R15 | Every result payload carries the disclaimer. | "Guidance only. Read the tender document and confirm with the procuring entity. Checks cover document content and dates, not official validity." |
| R16 | **No document contents, IDs or PINs in logs.** | Log ids, sizes, timings and error codes only. |
| R17 | AI failures: 2 retries with backoff, then HTTP 502 with a clear message. **Email failure never fails the request.** | The in-app alert row is written first; the email is sent in a thread after commit. |
| R18 | Dates: `TIME_ZONE = Africa/Nairobi` with `USE_TZ = True`. Deadlines are DateTimeFields, expiry and issue dates are DateFields; compare at date level. | One helper in `rules/dates.py`; nobody parses dates elsewhere. |
| R19 | **Every query is scoped to the logged-in user.** | All views inherit `OwnedViewMixin` (built by A in M1), which filters by `request.user`. No unscoped `Model.objects.all()` in a view. Neon does not enforce this for us. |
| R20 | No score and no "you will win / lose". Explain gaps only. Never claim official verification or guaranteed eligibility. | Overall status is one of: `ready`, `attention_needed`. |
| R21 | Demos and dev use dummy or consented documents only. | The free LLM tier may use inputs to improve products (verify): never upload real IDs or real certificates. |
| R22 | **Email is the login identity and an alert channel.** | Users sign in with email and password. Every alert is saved in the app and emailed to the account address. The email contains a link back to the result page. |

### 3D. Shared vocabulary

Defined once in `core/contracts.py` and as Django `TextChoices`.

| Name | Values |
|---|---|
| CheckStatus | `met`, `missing`, `expiring`, `unclear` |
| OverallStatus | `ready`, `attention_needed` |
| DocType | `kra_tax_compliance`, `business_registration`, `agpo_certificate`, `cr12`, `national_id`, `audited_accounts`, `bank_statement`, `business_permit`, `other` |
| RequirementType | `mandatory_document`, `eligibility`, `specification`, `financial`, `submission`, `other` |
| ChangeCategory | `deadline`, `eligibility`, `required_documents`, `specifications_quantities`, `pricing_format`, `submission_method` |
| Channel | `in_app`, `email` |
| VersionSource | `upload`, `email_forward` (email_forward is Could, not in this sprint) |

---

## 4. Apps, file ownership and data model

```text
tenderready-api/
  manage.py   requirements.txt   .env.example   README.md   render.yaml
  tenderready/        settings.py  urls.py  wsgi.py                       (A) lead-only
  core/               contracts.py  permissions.py  exceptions.py
                      models.py (StoredFile, LLMCache)  mixins.py         (A)
  accounts/           email User, register, login, profile, me/data       (A)
  rules/              engine.py  mismatch.py  dates.py  doc_types.py
                      deadline_note.py  (pure Python, no DB, no LLM)      (A)
  checks/             Check model, check views, diff_checks               (A)
  llm/                client.py  prompts_extract.py                       (B)
  documents/          models, views, services.py                          (B)
  tenders/            Tender, TenderVersion, views, services, summary     (B)
  versions/           TenderChange, compare.py, orchestration, views      (C)
  alerts/             Alert model, email.py, views                        (C)
  insight/            RejectionCase, seed command, views                  (C)
  sample_data/documents (B)   sample_data/tenders (C)
  scripts/            e2e_demo.py  try_compare.py  send_test_email.py     (C)
  tests/              test_rules* (A)  test_extract* (B)  test_compare* (C)
  .github/pull_request_template.md                                        (A)
```

**Contract-first.** In M0 the lead creates every app, **defines every model and applies the first migrations to Neon**, registers every URL with a stub view returning canned JSON, and publishes `contracts.py` with the function signatures below. B and C code against them from minute 25, so nobody waits for anybody's implementation, and later migrations are rare and additive.

```python
# documents/services.py (B)
extract_document(file_bytes, mime, filename) -> ExtractedDocument
# tenders/services.py (B)
extract_tender(file_bytes, mime) -> TenderExtraction
# TenderExtraction = deadline, requirements[], summary_en, text, text_hash
# rules/engine.py (A)
run_readiness_check(requirements, documents, profile, deadline) -> CheckResult
make_deadline_note(old_deadline, new_deadline, published_on) -> str | None
diff_checks(old: CheckResult, new: CheckResult) -> list[Flip]
# versions/compare.py (C)
compare_versions(old: TenderExtraction, new: TenderExtraction) -> list[Change]
# versions/services.py (C)
process_addendum(tender, file_bytes, mime) -> AddendumResult
# alerts/email.py (C)
build_alert(flips, changes, deadline_note) -> AlertMessage
send_alert_email(user, alert) -> bool
# insight/services.py (C)
get_insights(doc_type) -> list[InsightCase]
```

### Data model (Django models, created by the lead in M0, stored on Neon)

Based on the project documentation, with one deliberate change: **requirements, deadline and summaries are stored on `TenderVersion`, not on `Tender`**, because an addendum can change all of them.

| Model (app) | Fields |
|---|---|
| User (accounts) | email (unique, the login), password, business_name, kra_pin, reg_number, agpo_category, preferred_language, consent_at |
| StoredFile (core) | id, owner, filename, mime, size, sha256, data (binary). Max 10 MB, enforced in the upload service |
| Document (documents) | id, owner, doc_type, file (StoredFile), extracted (JSON), confidence, needs_review, issued_on, expires_on, confirmed, created_at |
| Tender (tenders) | id, owner, title, current_version, created_at |
| TenderVersion (tenders) | id, tender, version_no, source, file (StoredFile), text_hash, published_on, deadline, requirements (JSON), summary_en, summary_sw, created_at. Unique (tender, version_no) |
| TenderChange (versions) | id, tender, from_version, to_version, category, old_quote, new_quote, affects_user, explanation |
| Check (checks) | id, tender, version_no, owner, result (JSON), created_at (latest row per version wins) |
| Alert (alerts) | id, owner, tender, changes, message, channel, sent_at, read_at |
| LLMCache (core) | cache_key (unique), task, result (JSON), created_at |
| RejectionCase (insight) | id, doc_type, reason, source_title, source_url, year, tags, illustrative |

### API contract

Django REST Framework, all under `/api/`. Swagger UI at `/api/docs/`.

| Endpoint | Purpose | Owner | By |
|---|---|---|---|
| `GET /api/health/` | Liveness (also warms Neon) | A | M0 |
| `POST /api/auth/register`, `/api/auth/login` | Create account with email and password; get a token | A | M1 |
| `GET, PUT /api/profile/` | Business profile and consent | A | M1 |
| `POST /api/documents/` | Upload; store; extract; save as unconfirmed | B | M1 |
| `GET /api/documents/` | List with expiry and needs_review | B | M1 |
| `PATCH /api/documents/{id}/` | Correct fields and confirm | B | M1 |
| `DELETE /api/documents/{id}/` | Remove file and row | B | M1 |
| `POST /api/tenders/` | Upload tender; create v1; extract requirements and summary | B | M2 |
| `GET /api/tenders/`, `/api/tenders/{id}/` | List; detail with latest version | B | M2 |
| `GET /api/tenders/{id}/summary/?lang=en` or `sw` | Summary (Kiswahili generated on demand, cached) | B | M3 |
| `POST /api/tenders/{id}/check/` | Run readiness check on the latest version | A | M2 |
| `GET /api/tenders/{id}/checks/latest/` | Latest stored check | A | M2 |
| `POST /api/tenders/{id}/versions/` | Upload addendum; compare; re-check; alert (full flow in M3) | C | M2 / M3 |
| `GET /api/tenders/{id}/versions/`, `/changes/` | Version history and change log | C | M2 |
| `GET /api/alerts/`, `PATCH /api/alerts/{id}/read/` | In-app alerts | C | M2 |
| `GET /api/insight/?doc_type=` | Rejection Insight from seed data | C | M2 |
| `DELETE /api/me/data/` | Delete all rows and files of the user | A | M2 |

### Check result shape

Agreed in M0. Do not change after M2 without telling everyone.

```json
{
  "tender_id": 12,
  "version_no": 2,
  "deadline": "2026-10-20T10:00:00+03:00",
  "overall": "attention_needed",
  "items": [
    {
      "requirement_id": "r3",
      "label": "Valid Tax Compliance Certificate",
      "status": "expiring",
      "doc_id": 7,
      "expires_on": "2026-10-12",
      "reason": "Expires 8 days before the deadline",
      "source_quote": "...",
      "page": 4,
      "insight": []
    }
  ],
  "mismatches": [
    { "field": "kra_pin", "values": ["...", "..."], "doc_ids": [7, 9] }
  ],
  "deadline_note": null,
  "disclaimer": "Guidance only. Read the tender document and confirm with the procuring entity..."
}
```

---

## 5. Milestones, tasks and deliverables

Each deliverable is a PR to dev (G2). A five-minute sync happens at every gate: what merged, what is blocked, what slips.

### M0: Foundation and contracts (0:00 - 0:30)

**Goal:** Everyone can run the API locally against Neon, and everyone codes against the same contracts. B and C start with prep work that does not need the repo, so nobody is blocked while A builds the skeleton.

| Owner | Tasks | Deliverables (branch / PR) |
|---|---|---|
| **A** | Create the GitHub repo with main and dev; add teammates; protect main and dev if the plan allows (verify). Create the Neon project and a database branch per developer; share connection strings privately (pooled, `sslmode=require`). Scaffold the Django project and apps. Custom **email User**; DRF token auth with register and login; demo-user fallback behind `DEMO_MODE`; DRF exception handler (C5); CORS; drf-spectacular. **Define every model, run `makemigrations` and `migrate` on Neon.** Register **all URLs with stub views** returning canned JSON, so `urls.py` is never edited again. Write `contracts.py` (enums 3D plus models) and the signature stubs. | Bootstrap commit on dev by 0:25 (the only direct push); initial migrations applied on Neon; README 5-line run guide and `.env.example`; `pull_request_template.md`; connection strings shared by 0:15 |
| **B** | Create your own Gemini API key in AI Studio and test one call with a PDF in a scratch script. After 0:25: build the `llm` app, `generate_json(prompt, schema, file_bytes, mime, cache_key)` with JSON mode, 2 retries with backoff, `LLMCache` lookup, a typed `LLMError`, model from `LLM_MODEL`. Prepare 6 **dummy** documents: valid TCC, TCC expiring 12 Oct, AGPO certificate, business registration, CR12, ID with a deliberate name mismatch. | PR `feat/b-llm-client`, merged by 0:40; `sample_data/documents/` (dummy only) |
| **C** | Collect 2-3 real public tenders (PDF). Hand-craft an addendum for each (move the deadline, add a required document, change a quantity); name them SIMULATED. Set up Gmail: 2-step verification, app password, and test Django's `send_mail` with the SMTP backend. Draft the rejection case format and the first 5 cases from public Review Board reports. | PR `feat/c-sample-data` (tenders, addenda); `scripts/send_test_email.py` working; insight seed file with 5 cases |

**GATE:** Skeleton on dev; every member runs `runserver`, runs `migrate` on Neon and sees `/api/docs/`; llm client returns valid JSON from a sample PDF; sample documents and tender/addendum pairs exist.

### M1: Building blocks in parallel (0:30 - 1:15)

**Goal:** Each member finishes one independently testable block. No block depends on another's unfinished code.

| Owner | Tasks | Deliverables (branch / PR) |
|---|---|---|
| **A** | Rules package: `check_requirement` and `run_readiness_check` implementing R1, R2, R6; mismatch checks (R12); dates helper (R18); `doc_types` mapping. Write **12 or more pytest cases**: met, missing, expiring, expiry equal to deadline, unconfirmed document, already expired, null expiry gives unclear, name normalisation, PIN mismatch, director mismatch, unmappable requirement. Build `OwnedViewMixin` (R19). Register, login and profile endpoints made real. | PR `feat/a-rules-engine` (tests passing); PR `feat/a-auth-profile` |
| **B** | Documents app: POST upload (type and size limit 10 MB, save `StoredFile` with hash, cache, extract), list, PATCH confirm/correct, DELETE, all through `OwnedViewMixin`. Extraction schema: document_type, holder_name, kra_pin, registration_number, issue and expiry dates, directors, confidence. Apply R4. Run it on the 6 dummy documents and put a **per-field accuracy table** in the PR. | PR `feat/b-documents-api`; accuracy table in the PR description |
| **C** | `compare_versions`: prompt with the ChangeCategory enum, exact old and new quotes, quote validation against the text layer, hash short-circuit (R9). Script `try_compare.py` runs the 3 sample pairs and prints changes; record what was caught and missed. Alerts email module: `build_alert` and `send_alert_email` with HTML plus text body, console backend when SMTP is not set (so dev never breaks). | PR `feat/c-compare`; PR `feat/c-email`; detection notes (hits / misses) in the PR |

**GATE:** pytest green for rules; a PDF uploaded through Swagger returns extracted, unconfirmed fields; `try_compare.py` shows correct changes on at least 2 of 3 pairs; an email arrives in a real inbox.

### M2: Tender pipeline and readiness check (1:15 - 2:00)

**Goal:** From uploaded documents plus an uploaded tender to a stored, explainable checklist. Addendum storage and the alert endpoints are ready for M3.

| Owner | Tasks | Deliverables (branch / PR) |
|---|---|---|
| **B** | `extract_tender`: deadline, requirements (id, label, requirement_type, required_doc_type, mandatory, source_quote, page), summary_en. Quote validator (R5): drop requirements whose quote is not found in the text layer; for scans, lower confidence. `POST /api/tenders/` creates the tender and version 1 with `text_hash`; list and detail. Run on the 3 tenders and **count missed and invented requirements**. | PR `feat/b-tenders-api`; missed / invented count in the PR |
| **A** | POST check and GET latest check: load confirmed documents, latest version requirements and deadline, run the engine, store per version, return the agreed shape (R15, R20). Deadline-note function (R10). `DELETE /api/me/data/`. Walk the whole flow in Swagger and report bugs to the owner. | PR `feat/a-checks-api`; PR `feat/a-deadline-note`; PR `feat/a-me-data` |
| **C** | Versions storage: POST addendum stores version n+1 with hash and runs compare, saves `TenderChange` rows (no re-check yet). List versions and changes. Alerts: list and mark read. Insight: `RejectionCase` model loaded by a management command, `get_insights`, `GET /api/insight/`; grow to 15 cases. | PR `feat/c-versions-storage`; PR `feat/c-alerts-insight`; 15 seed cases loaded |

**GATE:** In Swagger: upload and confirm 5 documents, upload a tender, POST check returns at least one expiring and one missing item with source quotes.

### M3: Addenda end to end (2:00 - 2:40)

**Goal:** The product's differentiator works: one addendum upload produces new requirements, a re-run check, flips, and an alert.

| Owner | Tasks | Deliverables (branch / PR) |
|---|---|---|
| **C** | Orchestration `process_addendum()`: store version, extract (B), compare, re-run check (A), diff previous and new checks, set `affects_user` on each change, build a plain-language alert such as "two changes affect you: a new required document you are missing, and the deadline moved so your tax certificate now expires before it". Write the in-app alert first, then send the email in a thread after commit (R17). Response returns version, changes, new check, flips, alert. | PR `feat/c-addenda-flow`; same addendum twice returns 200 and no new version (R9) |
| **A** | Finalise `run_readiness_check` and `diff_checks` as importable functions for C. Make the check idempotent. Surface mismatch flags and the deadline note in the payload. Deploy to Render (free): gunicorn, whitenoise, environment variables, migrate on release; point `DATABASE_URL` at the shared Neon dev branch. Enable CORS for the frontend URL. Confirm the deployed `/api/docs/` works. | PR `feat/a-diff-and-deploy`; public base URL shared with the team |
| **B** | Kiswahili summary on demand with `needs_human_review` (R14), cached. Attach Rejection Insight snippets to every non-met check item through `get_insights`. Scan fallback and low-confidence flags end to end. **Could:** bid / no-bid card from rules plus user-supplied payment days, only if the rest is done. | PR `feat/b-summary-sw`; PR `feat/b-insight-attach`; optional: PR `feat/b-bid-card` |

**GATE:** Upload the simulated addendum: version 2 appears, one checklist item flips to a worse status, an in-app alert exists and an email arrives.

### M4: Hardening, freeze and handoff (2:40 - 3:00)

**Goal:** A stable, documented API for the frontend hour.

| Owner | Tasks | Deliverables (branch / PR) |
|---|---|---|
| **C** | Write `scripts/e2e_demo.py` that runs the 3-minute demo story against the API (register, upload documents, tender, check, addendum, check, alert). Run it with the team; it must pass 3 times in a row. | PR `feat/c-e2e-script` |
| **B** | Bug bash on extraction and requirements. Write `docs/validation.md` with the numbers collected so far (field accuracy, missed and invented requirements). Add seed cases (target at least 20 in total, label the set illustrative if short). | PR `feat/b-validation-notes` |
| **A** | README API quickstart and a **Frontend Handoff Sheet**: base URL, login and token header, endpoint list, sample JSON for every screen. **API freeze at 2:50.** Merge dev into main at 2:55 and tag `backend-v0.1`. After the freeze, only bug fixes. Warm Neon and Render. | PR `feat/a-handoff-docs`; main tagged `backend-v0.1` at 2:55 |

**GATE:** e2e script green three times on the deployed API; `/api/docs/` matches the handoff sheet; main contains the tagged freeze.

### If you fall behind: the cut order

Cut from the top of this list first. **Never cut:** rules engine, document extraction, tender extraction, versioning and compare, re-check on addendum.

| Cut order | What goes | What stays as the fallback |
|---|---|---|
| 1 | Bid / no-bid card | Nothing; it was a Could |
| 2 | Kiswahili summary | English summary only |
| 3 | Rejection Insight attached to check items | Standalone `GET /api/insight/` |
| 4 | Email delivery through SMTP | In-app alert and the console-printed email (say so in the pitch) |
| 5 | Quote validator (R5) | Keep quotes from the LLM, but mark confidence lower |
| 6 | Registration screen | Demo-user fallback (`DEMO_MODE`) with one pre-made account |

---

## 6. Pain points and how we avoid them

| # | Pain point | Why it hurts | Mitigation | Owner |
|---|---|---|---|---|
| 1 | Free LLM rate limits, shared key | Three developers on one key hit per-minute and daily caps, and calls fail mid-demo | Each developer uses their own AI Studio key; a separate demo key nobody touches until M4; cache by file hash (R11); hash short-circuit (R9); one retry policy in the client | B |
| 2 | Free tier may use inputs for product improvement (verify) | Real IDs and certificates could leave the system | Dummy or consented documents only (R21); say so on the privacy slide | All |
| 3 | LLM invents or misses requirements | A fake requirement destroys trust in the checklist | Source quote mandatory (R5); validator against the text layer; measure missed and invented counts and report them honestly | B |
| 4 | Scans and photos reduce accuracy | Wrong dates give wrong verdicts | Confidence field; `needs_review` forces user confirmation (R4); rules ignore unconfirmed documents (R2) | B / A |
| 5 | Lead as the only merger is a bottleneck | Two PRs waiting means two people idle | Small PRs (G5), 10-minute SLA (G11), stubs and contracts so work does not wait on merges | A |
| 6 | Merge conflicts in shared files | Lost time in the last minutes | One owner per app (G8); every URL pre-registered in M0; `settings.py`, `urls.py`, `contracts.py` and core models lead-only and additive | A |
| 7 | Django migration conflicts | Two people changing models in the same app create clashing migration numbers | All models defined in M0; only the app owner makes migrations (G13); never edit a migration already on dev; lead resolves with `makemigrations --merge`; everyone runs `migrate` after every pull | A |
| 8 | Secrets leaking to git | `SECRET_KEY`, `DATABASE_URL` and API keys exposed publicly | Only `.env` (git-ignored); `.env.example` has names only; keys shared in a private channel; rotate if leaked | All |
| 9 | Neon suspends and Render sleeps | First demo request is slow or times out | Hit `/api/health/` and one data endpoint 5 minutes before the demo; pooled connection string; local run as fallback; backup video | A |
| 10 | Email setup takes longer than expected | Gmail app passwords need 2-step verification | Start it in M0 (C); console email backend as fallback; the in-app alert is the source of truth (R17); Brevo free tier as backup | C |
| 11 | No real addendum available | The key demo moment has no data | Hand-crafted simulated addenda in M0; label them SIMULATED in the demo | C |
| 12 | Date and timezone bugs | An expiry off by one day flips a verdict | One date helper (R18); boundary tests: expiry equal to deadline, one day before, one day after | A |
| 13 | Scope creep | The core flow is not finished by 3:00 | MoSCoW tiers and the cut order; bid / no-bid only after M3 | A |
| 14 | Frontend blocked by changing APIs | The last hour is wasted on rework | Contracts in M0, API freeze 2:50, handoff sheet, Swagger as the single source of truth | A |
| 15 | Kiswahili quality | Wrong wording harms trust | Flag `needs_human_review` (R14); ask a Kiswahili speaker on site to check one sample | B |
| 16 | Files stored in the database | Neon free storage is small; large uploads fill it | 10 MB cap per file; delete-my-data removes files; move to object storage after the hackathon | B / A |
| 17 | Hackathon rules | Prizes depend on explaining the code and doing the work at the event | Everyone must be able to explain the module they own; rules engine and compare prompt get a 2-minute walkthrough from their owners | All |

---

## 7. Frontend hour (3:00 - 4:00)

The backend is frozen, so the frontend work is pure integration. Free options: a React app (Vite or Next.js) with Tailwind, deployed on Vercel free, calling the API base URL on the handoff sheet with the login token in the `Authorization` header. Each part below starts with a plain-English description of what the user sees and what happens, so every team member builds with the same picture in mind.

| Time | What happens |
|---|---|
| 3:00 - 3:10 | A sets up the app shell, the API client and the token handling; B and C read the handoff sheet and pick their screens |
| 3:10 - 3:40 | Build and integrate the six parts below in parallel. Same Git rules (G1 to G12) |
| 3:40 | Feature freeze. A merges dev into main |
| 3:40 - 4:00 | Rehearse the 3-minute demo with the e2e data; record the backup video; wake Neon and Render |

### 7.1 Sign up, sign in and consent (owner: B)

> **In plain English**
> A business owner opens the app and creates an account with her **email address** and a password. Before she can upload anything she reads a short notice saying what we keep (her documents), that an AI reads them, and that she can delete everything whenever she wants. She ticks a box to agree, then adds her business name, KRA PIN and registration number, and picks English or Kiswahili. After that she lands on her documents page. A "Delete my data" button lives in her settings.

| Part | Detail |
|---|---|
| Calls the API | `POST /api/auth/register` and `/api/auth/login`; `GET` and `PUT /api/profile/`; `DELETE /api/me/data/` (settings button, with a confirmation) |
| Must show | Email and password form with clear error messages; consent notice with a required checkbox; profile form and language choice |
| Done when | A new user can register, sign in, accept consent, save the profile, and reach the documents page; a returning user stays signed in |

### 7.2 My documents (owner: B)

> **In plain English**
> This is her digital folder of business papers. She adds a photo or PDF of a certificate, for example her tax compliance certificate. The app reads it and **fills in the details itself**: who it belongs to, the numbers and the dates. She checks that it read everything correctly, fixes any mistake, and presses Confirm. Papers the app is unsure about are highlighted so she looks at them first. Every paper shows a badge for how long it stays valid, so she sees early that one is about to expire. Only confirmed papers count when the app checks a tender.

| Part | Detail |
|---|---|
| Calls the API | `POST /api/documents/` (upload); `GET /api/documents/`; `PATCH /api/documents/{id}/` (edit and confirm); `DELETE /api/documents/{id}/` |
| Must show | Upload button for PDF and photo with a progress state; editable extracted fields and a "needs review" highlight; Confirm button, expiry badge, delete |
| Done when | She can upload a dummy certificate, correct a field, confirm it, and see its expiry badge; unconfirmed papers are visibly different |

### 7.3 New tender (owner: C)

> **In plain English**
> She has found a tender she might bid on. She uploads the tender PDF. The app reads it and explains in simple words **what is being bought, when it closes, who can bid, and which documents are required**. She confirms the closing date, because everything else depends on it. She can switch the summary between English and Kiswahili (the Kiswahili is clearly marked as needing a human check). Then she presses "Check if I qualify".

| Part | Detail |
|---|---|
| Calls the API | `POST /api/tenders/` (upload); `GET /api/tenders/{id}/`; `GET /api/tenders/{id}/summary/?lang=en` or `sw` |
| Must show | Upload with editable closing date; summary with an English / Kiswahili toggle and the "AI-generated" label; "Check if I qualify" button |
| Done when | Uploading the sample tender shows a summary and the requirements list, and the button leads to the result page |

### 7.4 Result page: can I bid? (owner: A)

> **In plain English**
> This answers the question "am I ready?". She sees a **checklist with one line per requirement**, using colours. Green means she has the paper and it stays valid through closing day. Red means no matching paper. Amber means **expiring**: valid today, but it runs out before the tender closes. Grey means the app cannot tell and she should read the quote. Under every line she sees the exact sentence from the tender that the line came from, so she can check it herself. If her papers disagree (a different business name or KRA PIN) a warning appears. For lines that are not green, a short note explains how bids have been rejected for that reason. There is no score and no promise of winning; a footer says this is guidance only and she must confirm with the procuring entity.

| Part | Detail |
|---|---|
| Calls the API | `POST /api/tenders/{id}/check/`; `GET /api/tenders/{id}/checks/latest/` |
| Must show | Coloured checklist with status, reason and source quote; mismatch warnings, deadline note, Rejection Insight snippets; the disclaimer footer on the page |
| Done when | The sample data shows an amber "expiring" line with its reason and quote, and a red "missing" line, with the disclaimer visible |

### 7.5 Tracked tenders and addenda, the demo moment (owner: C)

> **In plain English**
> This is a list of the tenders she is following, and each one keeps a history of versions. When the procuring entity publishes an **addendum** (a notice that changes the tender), she uploads it. The app compares the old and new versions and shows **what changed in plain language**, with the old sentence next to the new one, grouped under headings such as deadline or documents required. Then it checks her papers again and shows **what flipped**, for example "your tax certificate was green and is now amber, because the deadline moved". If the app is not sure about a change, it says "check the addendum yourself". It also says plainly that it cannot guarantee it has seen every addendum, and the procuring entity's official channel is the authority.

| Part | Detail |
|---|---|
| Calls the API | `GET /api/tenders/`; `GET /api/tenders/{id}/versions/` and `/changes/`; `POST /api/tenders/{id}/versions/` (addendum upload) |
| Must show | Tender list and version history with a reviewed marker; side-by-side old and new quotes per change; flipped items from the new check; the limits statement |
| Done when | Uploading the simulated addendum shows version 2, the changes, and a checklist line turning from green or amber to red |

### 7.6 Alerts and email (owner: C)

> **In plain English**
> Whenever an addendum affects her, she gets an **email in plain words**, for example "Two changes affect you: a new required document you do not have yet, and a moved deadline that makes your tax certificate expire before it", with a link back to the result page. The same message also appears under a bell icon in the app, with an unread dot until she opens it. If the email fails to send, the alert still shows in the app, so she never loses it.

| Part | Detail |
|---|---|
| Calls the API | `GET /api/alerts/`; `PATCH /api/alerts/{id}/read/`; the email itself is sent by the backend (Django email, Gmail SMTP) |
| Must show | Bell icon with unread count and a list of alerts; click-through to the right result page; alert marked as read on open |
| Done when | After the addendum upload the bell shows a new alert, the email arrives in the demo inbox with a working link, and opening the alert clears the unread dot |

---

## Appendix A. Pull request template

Save as `.github/pull_request_template.md`. GitHub pre-fills every PR with it.

```markdown
## What was implemented
<!-- 2-5 bullet points in plain language -->

## Milestone and owner
M_ / A | B | C        Branch: feat/_-_       Base: dev

## Files, apps and modules touched
<!-- list files; confirm they belong to an app you own (G8) -->

## API changes
<!-- endpoint, request, example response. "None" if none -->

## Migrations / env changes
<!-- migration file names (G13), new env vars added to .env.example -->

## Canonical rules touched
<!-- e.g. R1, R4, R9 and how the code honours them -->

## How to test
<!-- exact commands or Swagger steps, plus the expected result -->

## Evidence
<!-- pytest output, curl/Swagger response, accuracy table -->

## Known limitations
<!-- what does not work yet; what a reviewer should not expect -->

## Checklist
- [ ] Synced with dev, rebased, and ran migrate before opening this PR (G3)
- [ ] Server starts, migrations apply, pytest passes, ruff clean (G7)
- [ ] No .env, keys, real IDs or real documents committed
- [ ] Queries are scoped to the user (R19); no contents or IDs in logs (R16)
- [ ] Description is complete; I will not merge this myself (G4)
```

## Appendix B. Daily Git commands

```bash
# 1. START of every task: sync first
git checkout dev
git pull origin dev
python manage.py migrate
git checkout -b feat/b-documents-api

# 2. Work in small commits (model change? makemigrations for YOUR app only)
python manage.py makemigrations documents
git add documents/
git commit -m "feat(documents): extract fields and save as unconfirmed"

# 3. BEFORE pushing: sync again, rerun tests
git fetch origin
git rebase origin/dev
python manage.py migrate
pytest -q && ruff check .

# 4. Push your branch (never main, never dev) and open a PR with base = dev
git push -u origin feat/b-documents-api
# Post the PR link in the team chat. Wait for the lead to merge.

# 5. After the lead merges: sync again
git checkout dev && git pull origin dev && python manage.py migrate
```

## Appendix C. `.env.example` (names only, never values)

```bash
SECRET_KEY=
DEBUG=true
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=         # Neon pooled connection string, sslmode=require
GEMINI_API_KEY=
LLM_MODEL=            # check the current model name in AI Studio
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend   # smtp in production
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=  # Gmail app password
DEFAULT_FROM_EMAIL=
DEMO_MODE=false       # true enables the demo-user fallback
FRONTEND_ORIGIN=http://localhost:5173
MAX_UPLOAD_MB=10
```

## Appendix D. Definition of done and demo acceptance test

| Level | Done means |
|---|---|
| Task | Code on a feature branch; tests or a script prove it; migrations committed; PR has a full description; lead has merged it into dev |
| Milestone | Gate sentence is true on dev, demonstrated live in Swagger or by script, not just "works on my machine" |
| Sprint | `e2e_demo.py` passes: (1) account registered and 5 documents confirmed; (2) tender uploaded, summary and checklist returned; (3) one certificate flagged expiring before the deadline with its source quote; (4) addendum uploaded, version 2 created, new required document and moved deadline detected; (5) the checklist item flips; (6) in-app alert exists and the email is sent; (7) uploading the same addendum again creates nothing new |