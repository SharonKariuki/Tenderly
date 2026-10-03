# Frontend Handoff Sheet

Everything the frontend hour needs: where the API is, how to sign in, every endpoint, and a sample response for every screen. Swagger at `/api/docs/` is the live version of this sheet; if the two disagree, Swagger wins.

**API freeze: 2:50.** After the freeze, paths, field names and status codes do not change. Only bug fixes go in.

## Base URL

| Where | URL |
|---|---|
| Local | `http://127.0.0.1:8000` |
| Deployed (Render) | `https://<service>.onrender.com` (the lead posts the real URL in the team chat) |

The free Render instance sleeps when idle and Neon suspends too. Call `GET /api/health/` five minutes before the demo; the first call can take up to a minute.

## Signing in

1. `POST /api/auth/register` or `POST /api/auth/login` with `{"email": "...", "password": "..."}`.
2. Keep the `token` from the response.
3. Send it on every other request:

```
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b
```

```js
const API = import.meta.env.VITE_API_URL;

export async function api(path, { method = "GET", body } = {}) {
  const token = localStorage.getItem("token");
  const response = await fetch(API + path, {
    method,
    headers: {
      ...(token && { Authorization: `Token ${token}` }),
      ...(body && !(body instanceof FormData) && { "Content-Type": "application/json" }),
    },
    body: body instanceof FormData ? body : body && JSON.stringify(body),
  });
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) throw data.error; // { code, message }
  return data;
}
```

Notes:

- `register` and `login` have **no trailing slash**. Every other path ends with `/`.
- A request without a token gets `401`. Send the user back to the sign-in page.
- CORS allows the origins in the API's `FRONTEND_ORIGIN` setting (`http://localhost:5173` by default). Tell the lead your deployed frontend URL.
- If `DEMO_MODE` is on, requests without a token act as one shared demo account. It is a fallback for the demo, not a way to build screens.

## Errors

Every error has the same shape:

```json
{ "error": { "code": "invalid_credentials", "message": "Wrong email or password." } }
```

Show `message` to the user. Branch on `code` only when you need to.

| Status | Meaning | Codes you will meet |
|---|---|---|
| 400 | The request is wrong | `invalid`, `required`, `email_taken`, `invalid_kra_pin`, `password_too_short` |
| 401 | Not signed in, or wrong password | `not_authenticated`, `invalid_credentials` |
| 404 | Not found, or not yours | `not_found` |
| 422 | Understood but cannot be processed | `no_version`, `invalid_requirements` |
| 502 | The AI service failed after retries | `ai_failure` |

For a field error the message starts with the field name, for example `"email: An account with this email already exists."`.

## Endpoint list

**Real** endpoints read and write the database. **Stub** endpoints return the fixed sample shown below, whatever you send; their owner replaces them without changing the path.

| Endpoint | Purpose | State at freeze | Screen |
|---|---|---|---|
| `GET /api/health/` | Liveness, wakes the database | Real | all |
| `POST /api/auth/register` | Create an account, get a token | Real | 7.1 |
| `POST /api/auth/login` | Get a token | Real | 7.1 |
| `GET /api/profile/` | Business profile and consent | Real | 7.1 |
| `PUT /api/profile/` | Save profile, give consent | Real | 7.1 |
| `DELETE /api/me/data/` | Delete all my data | Real | 7.1 |
| `GET /api/documents/` | List documents | Stub (B) | 7.2 |
| `POST /api/documents/` | Upload and extract | Stub (B) | 7.2 |
| `PATCH /api/documents/{id}/` | Correct fields, confirm | Stub (B) | 7.2 |
| `DELETE /api/documents/{id}/` | Remove | Stub (B) | 7.2 |
| `GET /api/tenders/` | List tenders | Stub (B) | 7.5 |
| `POST /api/tenders/` | Upload a tender | Stub (B) | 7.3 |
| `GET /api/tenders/{id}/` | Tender with latest version | Stub (B) | 7.3 |
| `GET /api/tenders/{id}/summary/?lang=en\|sw` | Summary | Stub (B) | 7.3 |
| `POST /api/tenders/{id}/check/` | Run the readiness check | Real | 7.4 |
| `GET /api/tenders/{id}/checks/latest/` | Latest stored check | Real | 7.4 |
| `GET /api/tenders/{id}/versions/` | Version history | Stub (C) | 7.5 |
| `POST /api/tenders/{id}/versions/` | Upload an addendum | Stub (C) | 7.5 |
| `GET /api/tenders/{id}/changes/` | Change log | Stub (C) | 7.5 |
| `GET /api/alerts/` | In-app alerts | Stub (C) | 7.6 |
| `PATCH /api/alerts/{id}/read/` | Mark an alert read | Stub (C) | 7.6 |
| `GET /api/insight/?doc_type=` | Rejection Insight | Stub (C) | 7.4 |

The two check endpoints are real but need a real tender in the database. While `POST /api/tenders/` is a stub, they answer `404` for any id; build the result page against the sample in 7.4.

## 7.1 Sign up, sign in and consent

`POST /api/auth/register` returns `201`, `POST /api/auth/login` returns `200`:

```json
{ "token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b", "user_id": 3, "email": "owner@example.com" }
```

The password must be at least 8 characters, not all digits and not a common password.

`GET /api/profile/` and `PUT /api/profile/` return:

```json
{
  "email": "owner@example.com",
  "business_name": "Demo Business Ltd",
  "kra_pin": "P000000000X",
  "reg_number": "PVT-DEMO0001",
  "agpo_category": "women",
  "preferred_language": "en",
  "consent_at": "2026-10-03T12:00:00+03:00"
}
```

- `PUT` accepts any subset of `business_name`, `kra_pin`, `reg_number`, `agpo_category`, `preferred_language`.
- Consent: send `{"consent": true}`. `consent_at` is `null` until then; block uploads in the UI while it is `null`.
- `preferred_language` is `"en"` or `"sw"`.
- `kra_pin` is a letter (A or P), nine digits and a letter; it comes back uppercase.
- `email` cannot be changed.

`DELETE /api/me/data/` (ask for confirmation first) returns `200`:

```json
{ "deleted": { "documents": 5, "tenders": 1, "alerts": 1, "files": 7 } }
```

It removes her documents, tenders, checks, alerts and files, and empties the profile and consent. The login stays, so send her back to the consent step.

## 7.2 My documents

`GET /api/documents/` returns a list of these; `POST` (`multipart/form-data`, field `file`) returns one with `201`:

```json
{
  "id": 7,
  "doc_type": "kra_tax_compliance",
  "filename": "tcc_dummy.pdf",
  "extracted": {
    "holder_name": "Demo Business Ltd",
    "kra_pin": "P000000000X",
    "registration_number": null,
    "directors": []
  },
  "confidence": 0.92,
  "needs_review": false,
  "issued_on": "2025-10-12",
  "expires_on": "2026-10-12",
  "confirmed": false,
  "created_at": "2026-10-03T10:00:00+03:00"
}
```

- `PATCH /api/documents/{id}/` with corrected fields and `{"confirmed": true}` returns the document.
- `DELETE /api/documents/{id}/` returns `204` with no body.
- Highlight documents where `needs_review` is `true`. Show unconfirmed documents differently: **only confirmed documents count** in the check.
- A field the AI could not read is `null`. Show it empty; never fill it in.
- `doc_type` is one of `kra_tax_compliance`, `business_registration`, `agpo_certificate`, `cr12`, `national_id`, `audited_accounts`, `bank_statement`, `business_permit`, `other`.
- Uploads are capped at 10 MB. Dummy documents only.

## 7.3 New tender

`POST /api/tenders/` (`multipart/form-data`, field `file`) returns `201`; `GET /api/tenders/{id}/` returns the same shape:

```json
{
  "id": 12,
  "title": "Supply of office stationery (SAMPLE)",
  "current_version": 1,
  "created_at": "2026-10-03T10:05:00+03:00",
  "latest_version": {
    "version_no": 1,
    "source": "upload",
    "published_on": "2026-09-20",
    "deadline": "2026-10-20T10:00:00+03:00",
    "requirements": [
      {
        "id": "r3",
        "label": "Valid Tax Compliance Certificate",
        "requirement_type": "mandatory_document",
        "required_doc_type": "kra_tax_compliance",
        "mandatory": true,
        "source_quote": "Bidders shall submit a valid Tax Compliance Certificate.",
        "page": 4
      }
    ],
    "summary_en": "The county is buying office stationery. Bids close on 20 October.",
    "created_at": "2026-10-03T10:05:00+03:00"
  }
}
```

`GET /api/tenders/{id}/summary/?lang=sw`:

```json
{
  "tender_id": 12,
  "version_no": 1,
  "lang": "sw",
  "summary": "...",
  "needs_human_review": true
}
```

When `needs_human_review` is `true` (always for Kiswahili), show the "AI-generated, needs a human check" label.

## 7.4 Result page: can I bid?

`POST /api/tenders/{id}/check/` runs the check. It returns `201` when a new result is stored and `200` when nothing changed since the last run; the body is the same. `GET /api/tenders/{id}/checks/latest/` returns the stored one, or `404` if the check has never been run on the latest version.

```json
{
  "tender_id": 12,
  "version_no": 2,
  "deadline": "2026-10-27T10:00:00+03:00",
  "overall": "attention_needed",
  "items": [
    {
      "requirement_id": "r3",
      "label": "Valid Tax Compliance Certificate",
      "status": "expiring",
      "doc_id": 7,
      "expires_on": "2026-10-12",
      "reason": "Expires 15 days before the deadline",
      "source_quote": "Bidders shall submit a valid Tax Compliance Certificate.",
      "page": 4,
      "insight": []
    },
    {
      "requirement_id": "r5",
      "label": "AGPO certificate",
      "status": "missing",
      "doc_id": null,
      "expires_on": null,
      "reason": "No confirmed AGPO certificate in your documents.",
      "source_quote": "This tender is reserved for AGPO-registered firms.",
      "page": 2,
      "insight": []
    }
  ],
  "mismatches": [
    { "field": "kra_pin", "values": ["P000000000X", "P111111111A"], "doc_ids": [7, 9] }
  ],
  "deadline_note": "The deadline moved from 20 October 2026 at 10:00 to 27 October 2026 at 10:00, 7 days later. Confirm the closing date with the procuring entity.",
  "disclaimer": "Guidance only. Read the tender document and confirm with the procuring entity. Checks cover document content and dates, not official validity."
}
```

| `status` | Colour | Meaning |
|---|---|---|
| `met` | Green | A confirmed document that stays valid through the deadline day |
| `missing` | Red | No confirmed document of that type, or it has already expired |
| `expiring` | Amber | Valid today, but it runs out before the tender closes |
| `unclear` | Grey | The app cannot tell; she should read the quote |

- `overall` is `ready` or `attention_needed`. **There is no score.** Never write "you will win" or "you qualify".
- Show `reason` and `source_quote` (with `page`) under every line.
- `mismatches`: `field` is `business_name`, `kra_pin` or `directors`; `values` are the values that disagree. `doc_ids` may hold one id when a document disagrees with the profile.
- `deadline_note` is `null` on the first version.
- `insight` is a list of the objects shown under 7.4b; it may be empty.
- **Always show `disclaimer`** in the page footer.

### 7.4b Rejection Insight

`GET /api/insight/?doc_type=kra_tax_compliance`:

```json
[
  {
    "doc_type": "kra_tax_compliance",
    "reason": "Tax compliance certificate expired before the tender closing date.",
    "source_title": "Illustrative case (stub)",
    "source_url": "",
    "year": 2025,
    "tags": ["expiry"],
    "illustrative": true
  }
]
```

Label cases where `illustrative` is `true` as illustrative.

## 7.5 Tracked tenders and addenda

`GET /api/tenders/`:

```json
[{ "id": 12, "title": "Supply of office stationery (SAMPLE)", "current_version": 1 }]
```

`GET /api/tenders/{id}/versions/`:

```json
[
  { "version_no": 1, "source": "upload", "deadline": "2026-10-20T10:00:00+03:00" },
  { "version_no": 2, "source": "upload", "deadline": "2026-10-27T10:00:00+03:00" }
]
```

`GET /api/tenders/{id}/changes/`:

```json
[
  {
    "id": 1,
    "from_version": 1,
    "to_version": 2,
    "category": "deadline",
    "old_quote": "The closing date is 20 October 2026 at 10:00.",
    "new_quote": "The closing date is extended to 27 October 2026 at 10:00.",
    "affects_user": true,
    "explanation": "The deadline moved by one week."
  }
]
```

`category` is one of `deadline`, `eligibility`, `required_documents`, `specifications_quantities`, `pricing_format`, `submission_method`. Group the changes under these headings and show `old_quote` next to `new_quote`.

`POST /api/tenders/{id}/versions/` (`multipart/form-data`, field `file`) uploads an addendum and returns `201`:

```json
{
  "created": true,
  "version_no": 2,
  "changes": [{ "category": "deadline", "old_quote": "...", "new_quote": "...", "explanation": "...", "affects_user": true }],
  "check": { "...": "the check result shape from 7.4" },
  "flips": [
    {
      "requirement_id": "r3",
      "label": "Valid Tax Compliance Certificate",
      "old_status": "met",
      "new_status": "expiring",
      "reason": "Expires 15 days before the deadline"
    }
  ],
  "alert_id": 1
}
```

- `created` is `false` when the same addendum is uploaded twice; nothing new is stored.
- In a flip, `old_status` is `null` for a requirement the addendum added, and `new_status` is `null` for one it removed.
- Say on the page that the app cannot guarantee it has seen every addendum; the procuring entity's official channel is the authority.

## 7.6 Alerts and email

`GET /api/alerts/`:

```json
[
  {
    "id": 1,
    "tender_id": 12,
    "changes": [1],
    "message": "One change affects you: the deadline moved and your tax certificate now expires before it.",
    "channel": "in_app",
    "sent_at": "2026-10-03T11:00:00+03:00",
    "read_at": null,
    "created_at": "2026-10-03T11:00:00+03:00"
  }
]
```

- Unread means `read_at` is `null`; the bell count is the number of those.
- `PATCH /api/alerts/{id}/read/` (no body) returns the alert with `read_at` set. Call it when she opens the alert, then go to the result page of `tender_id`.
- The email is sent by the backend. If it fails, the alert is still in this list.

## Dates and times

- Date-times (`deadline`, `created_at`, `consent_at`) are ISO 8601 with the Nairobi offset: `2026-10-20T10:00:00+03:00`.
- Dates (`expires_on`, `issued_on`, `published_on`) are `YYYY-MM-DD`.
- Do not compare dates in the frontend. The API decides what is expiring; show what it returns.
