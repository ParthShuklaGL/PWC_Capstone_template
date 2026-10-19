# Mentor guide — Capstone 1: Pipeline CRM (Frontend + Copilot)

**Do not give this file to learners.** It contains the backend's rules, the planted defects,
the answers to the stakeholder's ambiguities and the scoring bands.

---

## 1. How the project is built

The starter is a working ASP.NET Core + React CRM covering **Accounts**, **Contacts** and
**Activities**, plus a finished **deal pipeline backend**. Learners do not build or change any
backend code. They build the deal pipeline **screens** on top of a running API, using the
React boilerplate and GitHub Copilot, from the user stories in `problem-statement.md`.

| | |
|---|---|
| Backend | ASP.NET Core 10 (`net10.0`), EF Core 10, SQL Server, EF Core migrations, OpenAPI + Scalar |
| Backend tests | xUnit 2.9.3, NSubstitute 6.2.0. The 8 originals plus `DealStageRulesTests` (pure logic) |
| Frontend | React 19.2.8, TypeScript 7.0.2, Vite 8.2.2, `react-router-dom` 7.18.3, plain CSS |
| Frontend tests | Vitest 5, Testing Library, jsdom. 11 tests, all green. Playwright configured, no specs |
| Seed data | 30 accounts, 150 contacts, 224 activities, **32 deals** (seeded on startup) |
| Ports | API 5080, Vite dev 5173, SQL Server 1433 (local) or 1434 (Docker) |
| Files you hand out | `problem-statement.md` and `starter_code/`. Nothing else |
| Files you keep | this guide and `frontend-prompts.md` |

### Before you hand it out: verify the backend in VS Code

The deals backend was written without a .NET compiler available. **Build and run it once
yourself before the cohort sees it.** In order:

1. `cd backend && dotnet build`. Fix any compile error first. Most likely places: the hand-written
   migration `Migrations/20261005100000_AddDeals.cs` and the edited `CrmDbContextModelSnapshot.cs`.
2. `dotnet test`. Expect the original 8 plus the new rule tests, all green.
3. Start SQL Server and the API (section 4), then run `node scripts/crosscheck-backend.mjs`.
   On a fresh database the expected result is **`98 passed, 0 failed, 0 warnings`**. The script
   itself was tested against a stand-in API with the same rules, including a deliberately broken
   one (it failed on the broken rules and exited 1), so a failure points at the backend.
4. If the migration will not apply, delete `Migrations/20261005100000_AddDeals.cs` and run
   `dotnet ef migrations add AddDeals --project NimbusSales.Crm.Api` instead. The model is
   what matters; the migration is just its description.

---

## 2. What the backend does (so you can answer, and so you can spot a learner's wrong claim)

### Endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/api/deals?page&size&stage` | Ordered by expected close date, then id, **inside the query before paging**. 20 per page default, max 100. Unknown stage is 400 |
| POST | `/api/deals` | 201. Body `title, accountRef, contactRef, value, expectedCloseDate`. Always starts in PROSPECTING |
| GET | `/api/deals/{dealRef}` | Includes `accountName`, `contactName`, `contactStatus` |
| PUT | `/api/deals/{dealRef}` | Title, value, expected close date. 409 `DEAL_CLOSED` once WON or LOST |
| DELETE | `/api/deals/{dealRef}` | 204 only while PROSPECTING. Otherwise 409 `DEAL_DELETE_NOT_ALLOWED` |
| POST | `/api/deals/{dealRef}/stage` | Body `stage`, plus `closeDate` (to win) or `lostReason` (to lose) |
| GET | `/api/deals/summary` | All six stages with count and total value, plus `openCount` and `openValue` |
| GET | `/api/deals/{dealRef}/history` | `fromStage` (null on the first row), `toStage`, `changedAt`. **No "who"** |
| GET | `/api/contacts/{contactRef}/deals` | That contact's deals |

### The pipeline rules

Stages, in order: `PROSPECTING → QUALIFIED → PROPOSAL → NEGOTIATION → WON | LOST`.

| From \ To | PROSPECTING | QUALIFIED | PROPOSAL | NEGOTIATION | WON | LOST |
|---|---|---|---|---|---|---|
| PROSPECTING | no (same) | yes | no | no | no | yes, with reason |
| QUALIFIED | yes (back one) | no (same) | yes | no | no | yes, with reason |
| PROPOSAL | no | yes (back one) | no (same) | yes | no | yes, with reason |
| NEGOTIATION | no | no | yes (back one) | no (same) | yes, with close date | yes, with reason |
| WON, LOST | no | no | no | no | no | no |

A refused move is **409 `DEAL_STAGE_TRANSITION_INVALID`** with a message that says why. A move
that is allowed but is missing what closing needs (`closeDate` to win, `lostReason` to lose)
is **400 `VALIDATION_FAILED`** with `fields.closeDate` or `fields.lostReason`.

Decisions the brief did not make, which the backend makes and you should be able to defend:

- **A deal can be lost from any open stage.** Priya's list ends "Won or Lost" after
  Negotiation, but a deal that dies at Prospecting must be closable. Won is only from NEGOTIATION.
- **Winning makes the contact a CUSTOMER. Losing never undoes it** (Priya's answer to item 4).
  Seed contact `C-00003` has one won and one lost deal to show it.
- **Only a PROSPECTING deal can be deleted.** Anything further along is closed by losing it.
- **Expected close date may not be in the past** when a deal is created or when the date is changed.
- **Value is GBP, greater than zero, to the penny.** No currency field is stored. The response
  carries `"currency": "GBP"` so the UI never has to guess.
- **The summary's open total is the four open stages.** Won and Lost are reported but excluded.

### Error codes

| Status | `error` | When |
|---|---|---|
| 404 | `DEAL_NOT_FOUND` | Unknown deal reference |
| 404 | `CONTACT_NOT_FOUND`, `ACCOUNT_NOT_FOUND` | Unknown contact or account when creating or listing |
| 400 | `VALIDATION_FAILED` + `fields{}` | Shape errors, past date, contact not at that account, missing close date or reason, unknown stage |
| 409 | `DEAL_STAGE_TRANSITION_INVALID` | A move the pipeline does not allow |
| 409 | `DEAL_CLOSED` | Editing a WON or LOST deal |
| 409 | `DEAL_DELETE_NOT_ALLOWED` | Deleting a deal past PROSPECTING |

The deals area has its **own `IExceptionHandler`** (`DealsExceptionHandler`), the third of three,
following the split-by-area convention the other two set up.

### What is deliberately not built

No authentication (so no owner, no "reps see only their own deals", no "who moved it"), no
currency conversion, no real-time push, no weighted pipeline value, no soft delete.

---

## 3. The planted defects

Every one of these is meant to be found. Several are in the backend, because the learners'
job is to **find, evidence and report** them from the frontend side, not to fix them.

| # | Plant | Where | Surfaces in |
|---|---|---|---|
| 1 | **CRM-142**: ordering applied after paging | `ContactRepository.ListAsync` and `ContactService.ListAsync` | US-09 |
| 2 | Stale, wrong `AGENTS.md` | repository root | US-01 |
| 3 | Vague, contradictory brief | `docs/stakeholder-brief.md` | US-02 |
| 4 | **Wrong-but-passing test** | `frontend/src/pages/ContactsPage.test.tsx`, "shows an error message when the contacts cannot be loaded" | US-08 |
| 5 | Committed third-party secret | `NimbusSales.Crm.Api/appsettings.json`, `Nimbus:Mail:ApiKey` | US-09 |
| 6 | Entity returned from a controller | `ContactsController.Get()`, leaks `creditRiskNote` | US-09 |
| 7 | CI frontend job on Node 18 | `.github/workflows/ci.yml` | US-10 |
| 8 | A test step that cannot fail the build | `ci.yml`, `continue-on-error: true` on the backend tests | US-10 |
| 9 | `compose.yaml` has no `web` service; README is two stale commands | repository root | US-10 |
| 10 | **`nginx.conf` strips `/api`** (not in the original list; found while building this) | `frontend/nginx.conf` | US-10 |

**Plant 1: CRM-142.** `ContactRepository.ListAsync` pages with no `ORDER BY`; the service then
sorts the twenty rows it was handed. Every page runs A to W and starts over. `C-00089` (Nadia
Fenwick) appears on page 5 and belongs on page 3. From the browser this is visible as the
repeating alphabet and as the wrong page for a named person. The learner's job in US-09 is to
say **which layer** is responsible (the API response is already wrong, so it is not the UI),
rule out the UI sorting, and write the ticket for the platform team. **Sorting in the browser is
the wrong fix**: it can only sort twenty rows. Note the new deals list orders correctly, so
learners can compare the two as evidence.

**Plant 4: the wrong-but-passing test.** The test is named for the error state but asserts
`getByText(/loading contacts/i)`. It runs synchronously, before the rejected promise has
settled, so it sees the loading message and passes. It would pass if the error handling were
deleted. The fix is `await screen.findByRole('alert')` and an assertion on the message text.
A learner who finds it by reading will usually say "it never waits"; a stronger one shows it
still passes after the `.catch` is removed from `ContactsPage`.

**Plant 5: the secret.** `"ApiKey": "pm_live_7Qd2XkR9vHbN4tLzA8eWcYs3JfMgUp6D"`. The `crm_app` password in `appsettings.json` and the `sa` password in `compose.yaml` are
local development credentials and are **not** the finding.
A learner who looks only in `frontend/` will find nothing, and that is the point of "look
beyond the frontend folder". Removing the value matters less than saying it must be rotated.

**Plant 6: the leak.** `GET /api/contacts/{contactRef}` is declared to return the `Contact`
entity, so the JSON carries thirteen properties: `id`, `contactRef`, `accountId`, `account`
(with its own `id` and `createdAt`), `firstName`, `lastName`, `email`, `phone`, `jobTitle`,
`status`, `creditRiskNote`, `lastContactedAt`, `createdAt`. The frontend type `ContactDetail`
deliberately does not declare `creditRiskNote`, so the UI never shows it and nothing looks
wrong. The point is **it is in the Network tab**. Hiding it in the UI is not a fix; the fix is
a response DTO on the server, which is the platform team's change, so the learner writes the
ticket. Confirm: `curl -s http://localhost:5080/api/contacts/C-00089`.

**Plant 10: nginx.** `proxy_pass http://api:5080/;` with `location /api/` makes nginx replace the
matched `/api/` with `/`, so the API receives `/contacts` and answers 404. The fix is
`proxy_pass http://api:5080;` (no trailing slash and no path). A learner finds it in US-10 when
the UI in the container loads but shows no data, and prompt 3 of that story is designed to lead
them to it.

**Smaller things a good review will also surface**

- `Pagination` hard-codes "contacts" in its status text and `aria-label="Contact list pages"`.
  Reusing it for deals as-is shows "— 32 contacts". `StatusFilter` is contact-specific too.
  The story says to reuse them "where they fit"; they only partly do.
- `ContactsController` takes `status` as a string and calls `Enum.Parse`, so
  `?status=CUSTOMERS` is a **500**, not a 400. The new deals endpoints parse safely and answer
  400. The UI cannot trigger it, but the cross-check script reports it.
- **`request()` in `frontend/src/api/crm.ts` calls `response.json()` on every success**, so the
  `204 No Content` from `DELETE /api/deals/{dealRef}` throws in the browser even though the
  delete worked. Learners meet it in US-04. The deals list then looks stale because the error
  path skips the refresh.
- `Contacts.Email` has no unique index; `NextContactRefAsync` is racy. Real, minor, not worth
  fixing here. A good learner says so.
- The deals backend has no "who": `DealHistoryResponse` carries no user.

If a learner reports something not on this list, check it against the code before crediting
it. Hallucinated findings are common, and "one finding you rejected" is a scoring requirement.

---

## 4. Running it in VS Code

Open `starter_code` in VS Code and accept the recommended extensions. Every command is also a
task under **Terminal > Run Task**.

**Database and API, option A (Docker):**

```bash
docker compose up -d db                 # SQL Server on localhost,1434
```

then **F5** and pick *API (.NET) - SQL Server in Docker*. First start applies the migrations and
seeds the data. The API is on `http://localhost:5080`; Scalar is at `/scalar/v1`.

**Option B (SQL Server installed):** `sqlcmd -S localhost -E -C -i db-setup/01-create-logins.sql`
once, then **F5** and pick *API (.NET) - local SQL Server*. **Option C:** `docker compose up --build api db`.

**Check the backend:** `node scripts/crosscheck-backend.mjs`. It prints PASS/FAIL per check and
exits 0 only if nothing failed. Section 2 of its output lists the planted defects and reports
`WARN` if one is missing. It changes data (it wins and loses deals; closed deals cannot be
deleted), so reset between runs if you want the seeded numbers back: `docker compose down -v`
(Docker) or `db-setup/02-reset-schema.sql` (local), then restart the API.

**Frontend:** `cd frontend && npm install && npm run dev`, then `http://localhost:5173`.
`npm run test` runs the 11 starter tests.

**Seeded numbers to check a learner's screens against** (fresh database):

| Stage | Deals | Value (GBP) |
|---|---|---|
| PROSPECTING | 5 | 136,750.00 |
| QUALIFIED | 5 | 342,500.00 |
| PROPOSAL | 5 | 318,750.00 |
| NEGOTIATION | 5 | 449,500.00 |
| WON | 7 | 325,000.00 |
| LOST | 5 | 228,000.00 |
| **Open (first four)** | **20** | **1,247,500.00** |

32 deals in total: page 1 holds 20 and page 2 holds 12. Page 1 starts with `D-00024`
(expected close 2026-05-29); page 2 starts with `D-00003` (2026-11-14). `C-00001` (a Prospect)
has `D-00016` in NEGOTIATION: win it and she becomes a Customer. `C-00003` has one won and one
lost deal. `D-00004` is in PROSPECTING and can be deleted.

---

## 5. The stakeholder brief: planted ambiguities and your answers

You play **Priya Raghavan**. Learners may ask you questions; answer in character, briefly, and
do not volunteer anything they did not ask for. What matters is whether they *asked*.

| # | What the brief says | Why it is a problem | Answer if asked |
|---|---|---|---|
| 1 | "Everyone here already knows the stages so I will not list them out" | The stages are never enumerated, and "not just anything to anything" is not a rule | Prospecting, Qualified, Proposal, Negotiation, then Won or Lost. It can go back one stage. It cannot jump forward more than one. Won and Lost are final. A deal can be lost at any point; it can only be won from Negotiation |
| 2 | "Total value of the pipeline, broken down by stage" | Does it include Lost? Won? Weighted by likelihood? | Open deals only: not Won, not Lost. I would also like a weighted number but I do not know how you would work it out. *(If pressed: not now.)* |
| 3 | "Reps should only see their own deals" | **The application has no authentication whatsoever.** No user, no login, no owner | I did not realise. What would it take? *(Correct learner answer: flag as out of scope, name the dependency, do not fake it with a dropdown.)* |
| 4 | "When a deal is won… reflected on the customer record" | Says nothing about Lost, or about a contact with several deals | Won makes them a Customer. Losing one deal should not undo that if they are already buying something else |
| 5 | "Full audit history of every stage change" **vs** "keep it simple, this is a day of work" | Direct contradiction | If it is a choice, I want the pipeline value first. Audit can wait |
| 6 | "Ideally the board updates in real time" | Websockets? Polling? Or refetch after an action? | I meant I do not want to press F5. *(Refetch-on-action is a perfectly good answer.)* |
| 7 | "Marcus reckons the amounts should be in the deal's own currency… most of our deals are in one currency anyway" | Multi-currency changes the summary maths | Everything is GBP today. Do not build currency conversion |
| 8 | "who moved it, when, and from what to what" | The history has no "who", for the same reason as item 3 | I did not think about that. Leave it, and tell Compliance why |
| 9 | (not in the brief) What does closing a deal need? | Won needs a close date and Lost needs a reason, or the API answers 400 | Yes, I want a reason on every lost deal. Close date when it is won |

**Scoring signal.** Count how many of 1–8 appear in the learner's *Assumptions & Open Questions*.
Item 3 separates a 3 from a 2: it **cannot be built** and must be escalated, not invented. A
learner who adds an "owner" dropdown to the form has missed the point. Item 8 is the same
mistake in disguise, and item 9 is the one nobody can know without reading the API or asking.

---

## 6. Rubric: 35 points

Eight parameters. The headings match `Capstone-Evaluation-Rubric-AllTracks.xlsx`; the sub-rows
are rewritten for the frontend-over-a-real-backend capstone, because the draft rows assume mocks,
an MCP server and role-based reporting that this version does not have.

| Parameter | Max | Sub-row | Pts | Full marks if |
|---|---|---|---|---|
| **Requirement Analysis** | 4 | Specification | 2 | `deal-pipeline-ui.md` written **before** the code (check the commit order), ACs numbered and testable, contract summary verified against the real API |
| | | Ambiguities | 2 | 5 or more of items 1–9 surfaced with reasoned assumptions, **including item 3 escalated, not faked** |
| **Prompt Construction** | 4 | Revision | 2 | The journal shows a prompt that failed, why, and the rewrite that worked, with a real difference in output |
| | | Mode | 2 | Ask, Plan and Agent used on purpose and the reason given (not Agent for a one-line question) |
| **Architecture & Design** | 4 | Harness | 2 | Path-scoped instructions and a custom agent, skill or prompt exist and **visibly change** Copilot's output |
| | | Onboarding | 2 | The brief names real files and functions in an end-to-end trace, and `AGENTS.md` is corrected claim by claim |
| **Code Generation** | 4 | CRUD and moves | 2 | List, detail, create, edit, delete and stage moves work against the live API; server rules are surfaced in plain language |
| | | Board | 1 | Board and totals come from `/deals/summary`, refresh after a move without F5, match the list |
| | | Conventions and states | 1 | One API file, typed, no `any`; distinct loading, empty and error states; cross-record screens (US-07) stay in step |
| **Test Generation & Audit** | 4 | Coverage | 1 | Tests named for ACs cover list states, validation and every stage-move message |
| | | Audit | 2 | The wrong-but-passing test (plant 4) found and explained |
| | | Evidence | 1 | `test-audit-note.md` records what it checked, why it was wrong, the fix, and that at least three tests go red when the code is broken |
| **Code Review** | 4 | Review | 2 | Run on the learner's own diff against `review-checklist.md`, recorded with severity, decision and reason |
| | | Critique | 2 | A concrete note on what it caught and missed, and **at least one finding rejected** with sound reasoning |
| **Security, Governance & Documentation** | 4 | Checklist | 1 | `validation-checklist.md` complete and specific to this submission |
| | | Leak | 1 | Plant 6 found from the Network tab, all properties listed, ticket for the platform team, **not hidden in the UI** |
| | | Secret | 1 | Plant 5 found, removed, sourced from outside the repository, and flagged for rotation |
| | | CRM-142 | 1 | Reproduced from the UI, the responsible layer named with evidence, one alternative ruled out, ticket written; **not sorted in the browser** |
| **Repository & Deliverables** | 7 | Agent files | 1 | `AGENTS.md` and instruction files present and specific to this repo |
| | | CI | 2 | Node version fixed **and** `continue-on-error` found and removed (the second is the better catch) and the frontend tests run in the pipeline |
| | | Containers | 1 | `web` service added; `docker compose up --build` shows live data (plant 10 found if hit) |
| | | README | 1 | Gets a new joiner running on a clean machine, tested by following it literally |
| | | Architecture | 1 | `architecture.html` with a data-flow diagram from browser to database |
| | | Decisions | 1 | `design-decisions.md` says what was delegated, what was hand-written, and why |

**Applying the bands**

- **A working application with no artifacts cannot exceed 15.** Most rows are read from
  documents. Say this to the cohort on day one.
- **An artifact that describes work not present in the code scores 0 for that row.** A test
  note claiming a finding the repository does not show is worse than no note.
- Half marks are for "present but thin": say so in the feedback and name what would have earned
  the rest.

---

## 7. Running the day

| When | What |
|---|---|
| Start | Learners clone, start the backend, run `node scripts/crosscheck-backend.mjs`, open Scalar. Anyone whose cross-check fails fixes their environment before US-01 |
| US-01, US-02 | Learners ask you questions as Priya. Hold the line on item 3 |
| US-03 to US-07 | Spot-check against the seeded numbers in section 4. Ask "where does that total come from?" |
| US-08 | Ask each learner to break one component in one line and show which tests go red |
| US-09 | Ask for the Network-tab evidence for the leak, and which layer CRM-142 belongs to |
| US-10 | Ask them to run `docker compose up --build` while you watch |

`frontend-prompts.md` is a reference run of the whole capstone with Copilot: the prompts, the
mode for each, and what to check afterwards. Use it to rehearse before the cohort arrives, and
as the key when a learner's first prompt goes badly.

---

## 8. Adapting this to the other five capstones

The same shape works for all of them: a finished backend feature on the existing starter, the
existing UI as boilerplate, a cross-check script and the same eight-row rubric. What changes
per capstone: the domain and its rules, the planted defect for the "ordering after paging" slot,
the leaked field, and the one request in the brief that cannot be built. Reuse from this
project: `DealsExceptionHandler` as the pattern for a third handler, the `fields` validation
shape, and `scripts/crosscheck-backend.mjs` (change the endpoints and expected numbers).
