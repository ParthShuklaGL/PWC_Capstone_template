# User stories: Nimbus CRM

**Stack you are given:** a finished Java 21 / Spring Boot API with JWT sign-in, on MySQL 8.
**Stack you choose:** React or Angular (or another SPA framework your mentor agrees to) for the front end.

The people using it are **sales reps** (role `USER`: Aisha, Ben) and the **Head of Inside Sales**
(role `ADMIN`: Priya, in the stakeholder brief).

How to read the status columns:
- **Backend** means the endpoint exists and is covered by the 127-check cross-check script and 40 JUnit tests.
- **Frontend** is your column. It starts at "No" for every row, and every row is yours.
- Screenshots of a reference front end for every story are in `docs/screenshots/`. They show one
  way to meet each story. They are a reference, not a specification to copy pixel for pixel.

## Sign-in and roles

| ID | As a... | I want to... | So that... | Backend | Frontend |
|---|---|---|---|---|---|
| AUTH-01 | anyone | sign in with my email and password | only Nimbus staff see customer data | Yes (`POST /api/auth/login`) | No |
| AUTH-02 | signed-in user | stay signed in when I refresh, and be sent back to sign-in when my session ends | I'm never stuck on a broken page | Yes (`GET /api/auth/me`, 401 `UNAUTHENTICATED`) | No |
| AUTH-03 | rep | see only the actions my role allows | I'm not offered buttons that will fail | Yes (403 `FORBIDDEN`) | No |
| AUTH-04 | anyone | see who I'm signed in as, and sign out | I know whose data I'm looking at | Yes (`GET /api/auth/me`) | No |

**Rules the backend enforces:** every endpoint except sign-in needs `Authorization: Bearer <token>`.
ADMIN manages accounts, contacts and deals and assigns deal owners. USER reads contacts and
accounts, logs activities, and works **only the deals they own**. Another rep's deal answers 404.

## Contacts

| ID | As a... | I want to... | So that... | Backend | Frontend |
|---|---|---|---|---|---|
| C1 | rep | see contacts 20 per page, in surname order, and filter by status (Prospect, Customer, Churned) | I can browse people | Yes (**but see PD-1**) | No |
| C2 | rep | search contacts by name or email | I can find someone fast | Yes | No |
| C3 | rep | open a contact and see their details, account and activity history | I know where the relationship stands | Yes (**but see PD-2**) | No |
| C4 | admin | add and edit a contact | the record is right | Yes (ADMIN) | No |
| C5 | admin | bulk-import leads from the agency's monthly CSV | nobody retypes them | Yes (ADMIN) | No |
| C6 | rep | log a call, email, meeting or note against a contact | the history is complete | Yes | No |
| C7 | rep | list accounts and the people at an account | I can see a company's contacts | Yes | No |
| ADM-01 | admin | add and edit accounts | new customers can be set up | Yes (ADMIN) | No |

## Deals (the Head of Inside Sales's request)

The brief is in `docs/stakeholder-brief.md`. The numbering follows the capstone problem statement.

| ID | As a... | I want to... | So that... | Backend | Frontend |
|---|---|---|---|---|---|
| US-02 | developer | turn the brief into a spec | ambiguities are settled before building | n/a | n/a |
| US-03 | rep | see my deals in a list (20 per page, stage filter, owner shown) and open one | the spreadsheet is no longer needed | Yes | No |
| US-04 | admin | create, edit and delete a deal (account, then a contact at that account, title, value, expected close date, owner) | deals are kept in the CRM | Yes (ADMIN) | No |
| ADM-03 | admin | choose and change which rep owns a deal | work is shared out and every deal has an owner | Yes (`GET /api/users`, `ownerRef`) | No |
| US-05 | rep | move my deal between stages, giving a close date to win and a reason to lose | the pipeline is accurate and invalid moves are blocked | Yes | No |
| US-06 | Head of Inside Sales | see a pipeline board with a column per stage, counts, values and one total | I have the Monday-call number without working it out by hand | Yes (`/api/deals/summary`, scoped to the caller) | No |
| US-07 | rep | see a contact's deals on their page and add an activity without leaving it | I see the whole relationship | Yes | No |

**Rules the backend enforces:**
- A deal moves forward or back one stage at a time. It can be Lost from any open stage and Won only from Negotiation. Won and Lost are final.
- Winning a deal needs a close date and marks the contact as a customer. Losing one never undoes that.
- Only a Prospecting deal can be deleted. A Won or Lost deal cannot be edited.
- A deal's stage history is recorded (what it moved from and to, and when).
- Amounts are in GBP, more than zero. The expected close date cannot be in the past.

---

## ⚠ Planted defects: these are in the backend on purpose

The backend you are given is not perfect, and you must **not** fix it. A real frontend developer
inherits APIs with problems. Your job is to **find each one, prove it with a request and its
response, protect the user from it in your UI where you can, and write it up** (see
`backend-java/docs/API-TESTING.md`, "Reporting a backend bug"). Finding and reporting these is
assessed in US-09.

| ID | Where | What is wrong | What your front end must do | Report it as |
|---|---|---|---|---|
| **PD-1** | `GET /api/contacts?page=&size=` | **CRM-142.** Each page is cut in insertion order, then sorted by surname *within the page*. Every page runs from about A to about W. Nadia Fenwick (C-00089) is on **page 5**, where surname order would put her on page 3. | Don't claim "sorted by surname" across pages. Offer search (C2) as the reliable way to find someone. Never sort only the visible page and present it as the global order. | `docs/bug-CRM-142.md` is the report from Inside Sales. Reproduce it, then write the developer's version |
| **PD-2** | `GET /api/contacts/{ref}` | **Data leak.** It returns the raw database entity instead of a response DTO. That includes `creditRiskNote` (finance-only: *"Late payer: 60+ days…"*), the internal `id` and `accountId`, and the account's own `id` and `createdAt`. **Every signed-in rep receives it.** | **Never render `creditRiskNote` or any `id`.** Don't log the response to the console, and don't store it in state you persist. Read only the fields your screen needs. Your UI hiding the field does not fix the leak: the data is still in the browser's network tab. Say so in your report. | Severity: high (confidential financial data exposed to every user). Expected: a DTO without these fields, or the note limited to finance |
| **PD-3** | `GET /api/contacts?status=CUSTOMERS` | An unknown status answers **500**, not 400 with `fields.status` like every other bad input. | Only ever send the three valid values. Show the generic error state if a 500 comes back. | Expected: 400 `VALIDATION_FAILED` with `fields.status` |
| **PD-4** | `POST /api/contacts/{ref}/activities` with `"type": "VISIT"` | The same: an unknown activity type answers **500**. | Offer a fixed list (CALL, EMAIL, MEETING, NOTE), never free text. | Expected: 400 with `fields.type` |

The cross-check script (`scripts/crosscheck-backend.mjs`, section 2) confirms that PD-1 to PD-3
are present. It **warns** if someone has "fixed" the starter.

## Not supported by the API (raise these with the stakeholder; don't build around them)

- "Who moved it" in the deal history. Users exist now, but the stage history still records only the time and the from/to stages.
- Amounts in several currencies. There is no currency field.
- A board that updates in real time. The API is plain request and response.
- Deleting accounts or contacts. There is no endpoint, by design.

## How to demo (once the database exists)

1. Create the database once: `db-setup/01-create-database.mysql.sql` (as MySQL root).
2. `cd backend-java && mvn spring-boot:run`. Swagger UI is at http://localhost:5080/swagger-ui.html.
3. Start your front end with `/api` proxied to `http://localhost:5080`.
4. Sign in as `admin@nimbus.test` / `Admin#2026` and as `aisha@nimbus.test` / `Rep#2026`, and show that each sees what their role allows.
