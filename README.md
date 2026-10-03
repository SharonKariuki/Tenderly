# TenderReady API

Backend for **TenderReady**, built for the GirlCode Kenya Hackathon (Konza Technopolis, 3-4 October 2026).

A business owner uploads her compliance documents and a tender. TenderReady extracts the requirements, checks her documents **against the tender deadline, not today's date**, and shows a checklist of what is met, missing, expiring or unclear, each with the source quote from the tender. When an addendum is uploaded, the **Addenda Watcher** compares versions, re-runs the check, and alerts her in the app and by email about anything that flipped.

**Stack:** Python 3.11+, Django 5, Django REST Framework, PostgreSQL on Neon, Google Gemini (free tier), pytest, ruff. Everything is on a free tier.

The full sprint plan is in [tenerlymd.md](tenerlymd.md). It is the source of truth; this README is the short version.

> **Backend v0.1.** Real today: accounts (register, login, profile, delete-my-data), the rules engine and the readiness check endpoints. Documents, tenders, versions, alerts and insight are registered and return sample JSON until their owners' PRs land. The [Frontend Handoff Sheet](docs/handoff.md) lists the state of every endpoint.

## Setup

```bash
# 1. Clone and switch to dev
git clone https://github.com/SharonKariuki/Tenderly.git
cd Tenderly
git checkout dev

# 2. Virtual environment
python -m venv .venv
source .venv/Scripts/activate      # Windows Git Bash
# .venv\Scripts\Activate.ps1       # Windows PowerShell
# source .venv/bin/activate        # macOS / Linux

# 3. Install
pip install -r requirements.txt

# 4. Environment: copy the example and fill in the values shared privately by the lead
cp .env.example .env

# 5. Apply migrations to your Neon database (DATABASE_URL in .env)
python manage.py migrate

# 6. Run
python manage.py runserver

# 7. Tests and lint
pytest
ruff check .
```

Then open:

- http://127.0.0.1:8000/api/health/ returns `{"status": "ok"}`
- http://127.0.0.1:8000/api/docs/ is the Swagger UI, the contract for the frontend

Notes:

- When you run `pytest` with a Neon `DATABASE_URL` in `.env`, the tests try to create their database on Neon. Run them on SQLite instead: `DATABASE_URL=sqlite:///db.sqlite3 pytest`.
- `.env` is git-ignored. Never commit it, and never put real values in `.env.example`.
- `DATABASE_URL` is the Neon **pooled** connection string with `sslmode=require`. If it is empty, Django falls back to a local `db.sqlite3` so the checks and tests still run.
- Dummy or consented documents only (R21). Never upload real IDs or real certificates.

## API quickstart

The frontend contract is the [Frontend Handoff Sheet](docs/handoff.md): base URL, token header, every endpoint and a sample response for every screen.

```bash
# 1. Register (or POST /api/auth/login) and keep the token
curl -X POST http://127.0.0.1:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "owner@example.com", "password": "a-long-dummy-passphrase-42"}'
# {"token": "<token>", "user_id": 1, "email": "owner@example.com"}

# 2. Send the token on every other request
curl http://127.0.0.1:8000/api/profile/ -H "Authorization: Token <token>"

# 3. Save the profile and give consent
curl -X PUT http://127.0.0.1:8000/api/profile/ \
  -H "Authorization: Token <token>" -H "Content-Type: application/json" \
  -d '{"business_name": "Demo Business Ltd", "kra_pin": "P000000000X", "consent": true}'

# 4. Run the readiness check on a tender
curl -X POST http://127.0.0.1:8000/api/tenders/12/check/ -H "Authorization: Token <token>"
```

In Swagger (`/api/docs/`), click **Authorize** and enter `Token <token>`.

Every error is `{"error": {"code": "...", "message": "..."}}`.

## Deploy

The API runs on a free Render web service, with the database on Neon. [render.yaml](render.yaml) describes the service and [build.sh](build.sh) installs, collects static files and applies migrations.

1. On render.com: **New > Blueprint**, pick this repository.
2. Fill in `DATABASE_URL` (Neon pooled string) and `FRONTEND_ORIGIN` (the frontend URL). `SECRET_KEY` is generated.
3. Open `https://<service>.onrender.com/api/health/`, then `/api/docs/`.

The service deploys the `main` branch. It sleeps when idle: call `/api/health/` five minutes before a demo.

## Apps and ownership

Touch only the apps you own (G8).

| Path | Contents | Owner |
|---|---|---|
| `tenderready/` | `settings.py`, `urls.py`, `wsgi.py` | A (lead-only) |
| `core/` | contracts, permissions, exceptions, `StoredFile`, `LLMCache`, mixins | A |
| `accounts/` | email user, register, login, profile, `me/data` | A |
| `rules/` | engine, mismatch, dates, doc types, deadline note (pure Python, no DB, no LLM) | A |
| `checks/` | `Check` model, check views, `diff_checks` | A |
| `llm/` | LLM client, extraction prompts | B |
| `documents/` | document models, views, services | B |
| `tenders/` | `Tender`, `TenderVersion`, views, services, summary | B |
| `versions/` | `TenderChange`, compare, orchestration, views | C |
| `alerts/` | `Alert` model, email, views | C |
| `insight/` | `RejectionCase`, seed command, views | C |
| `sample_data/documents/` | dummy documents | B |
| `sample_data/tenders/` | sample tenders and simulated addenda | C |
| `scripts/` | `e2e_demo.py`, `try_compare.py`, `send_test_email.py` | C |
| `tests/` | `test_rules*` (A), `test_extract*` (B), `test_compare*` (C) | shared |
| `docs/` | validation notes, handoff sheet | shared |
| `.github/pull_request_template.md` | PR template | A |

| Role | Member | GitHub |
|---|---|---|
| **A** (Part 1): lead, core, rules, checks, deploy. The only merger | Sharon Kariuki | @SharonKariuki |
| **B** (Part 2): AI and documents | Brenda | @Brenda031-create |
| **C** (Part 3): addenda, alerts, insight | Stephanie | @stephiewahome-hue |

Shared files (`core/contracts.py`, `tenderready/settings.py`, `tenderready/urls.py`, core models) are lead-only: ask in chat and the lead adds it, additive changes only.

## Git rules

| ID | Rule |
|---|---|
| G1 | **Never push to main.** Nobody does, including the lead. main only changes when the lead merges dev into main at 2:55 and at the final freeze. |
| G2 | **Everything goes to dev first.** Work happens on a feature branch cut from dev; the branch is pushed and a PR is opened with base = dev. The only direct push to dev is the lead's bootstrap commit in M0. |
| G3 | **Always sync first.** Before starting any task: checkout dev, pull, then run `python manage.py migrate`. Before pushing or opening a PR: fetch and rebase on origin/dev, then rerun tests. After the lead announces a merge, pull and migrate again. |
| G4 | **Only the lead (A) merges.** B and C open the PR, post the link in the team chat, and wait. Do not click merge, do not self-approve. The lead's own PRs get a quick look from a teammate, then the lead merges. |
| G5 | **One branch per task**, named `feat/<a, b or c>-<topic>` or `fix/<a, b or c>-<topic>`. Target 45 minutes of work per PR at most. Small PRs get merged fast; big ones block everyone. |
| G6 | **Every PR carries a proper description** using the [PR template](.github/pull_request_template.md): what was implemented, files touched, API changes, migrations and env changes, how to test, rules touched, limitations. PRs with an empty or "wip" description are sent back unmerged. |
| G7 | **A PR must be runnable:** the server starts, migrations apply, pytest passes, ruff is clean, no `.env`, no keys, no real IDs or real company documents (dummy data only). |
| G8 | **Touch only files and apps you own.** Shared files are lead-only: ask in chat and the lead adds it, additive changes only. |
| G9 | Commit messages: `type(scope): message`, for example `feat(rules): flag expiring docs at deadline`. |
| G10 | Resolve your own conflicts by rebasing. Never force-push dev or main. `--force-with-lease` is allowed on your own feature branch only. |
| G11 | **Lead review SLA: 10 minutes.** Merge order follows dependencies. If you are blocked, say so in the chat; do not wait silently. |
| G12 | Bugs found on dev are fixed the same way: `fix/` branch, PR to dev, lead merges. |
| G13 | **Migrations:** only the owner of an app runs `makemigrations` for it, and the migration file is committed in the same PR as the model change. Never edit or delete a migration that is already on dev. If two migrations collide, the lead runs `makemigrations --merge`. |

### How the rules are enforced

| What | How |
|---|---|
| G1, G2, G10 | `main` and `dev` are protected: changes arrive by pull request only, with no force-pushes and no branch deletion. On `main` this applies to the lead too. |
| G4 | [CODEOWNERS](.github/CODEOWNERS) makes the lead the required reviewer of every PR to `dev`. A PR to `main` needs one approval from a teammate. |
| G7, G13 | The **CI** check runs ruff, `manage.py check`, `makemigrations --check`, `migrate` (on a throwaway SQLite database) and pytest on every PR. |
| G1, G2, G5 to G10, G13 | The **PR conventions** check ([check_pr.py](.github/scripts/check_pr.py)) fails a PR when the base is not `dev`, the branch name or a commit message is off-format, a template section is empty or a checklist box is unticked, a `.env` file is included, a file outside the author's apps is touched, an existing migration is edited, or the branch contains a merge commit. |

Both checks must be green before a PR can be merged. If a check blocks something legitimate, say so in the chat; the lead decides.

### Daily commands

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

## Milestones

Tasks are tracked as GitHub issues, one per member per milestone, labelled `part-1` / `part-2` / `part-3` and `M0` to `M4`.

| Milestone | Window | Theme |
|---|---|---|
| M0 | 0:00 - 0:30 | Foundation and contracts |
| M1 | 0:30 - 1:15 | Building blocks in parallel |
| M2 | 1:15 - 2:00 | Tender pipeline and readiness check |
| M3 | 2:00 - 2:40 | Addenda end to end |
| M4 | 2:40 - 3:00 | Hardening, freeze and handoff |

## If we fall behind: the cut order

Cut from the top of this list first. **Never cut:** rules engine, document extraction, tender extraction, versioning and compare, re-check on addendum.

| Cut order | What goes | What stays as the fallback |
|---|---|---|
| 1 | Bid / no-bid card | Nothing; it was a Could |
| 2 | Kiswahili summary | English summary only |
| 3 | Rejection Insight attached to check items | Standalone `GET /api/insight/` |
| 4 | Email delivery through SMTP | In-app alert and the console-printed email (say so in the pitch) |
| 5 | Quote validator (R5) | Keep quotes from the LLM, but mark confidence lower |
| 6 | Registration screen | Demo-user fallback (`DEMO_MODE`) with one pre-made account |
