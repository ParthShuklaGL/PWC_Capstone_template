# Capstone 1 — Nimbus Sales Pipeline CRM

**Track:** Frontend Specialist · React 19 · TypeScript · GitHub Copilot, building on a finished ASP.NET Core API

You build the deal pipeline screens for Nimbus CRM against a real, running backend, and you are graded on how well you turn a vague stakeholder brief into a trustworthy UI with Copilot.

## 1. The situation

**Nimbus Sales** is a 40-person B2B SaaS company. Their in-house CRM tracks accounts, contacts and activities. It does not track **deals**. Those live in a shared spreadsheet that four people edit, nobody trusts, and which lost a quarter of forecast last March when someone sorted one column without selecting the others.

A platform team has now built the deal pipeline **backend**: the database, the stage rules, the validation, the pipeline total. Nothing renders it yet. Priya Raghavan, Head of Inside Sales, wants it on screen before the quarter closes. Her email is in `docs/stakeholder-brief.md`.

**You are the frontend developer.** You have GitHub Copilot, and everything from the last eight days applies: reading an unfamiliar codebase with an agent, writing a specification before code, generating and reviewing implementations, and shipping.

### What is different in this capstone

- The backend is real. There are no mocks and no JSON files standing in for data. A request that is wrong gets a real 400, 404 or 409 back.
- You do not write or change backend code. If the backend is wrong, you prove it, write it up, and raise it, as a real frontend developer would.
- Your stories are about **what the user sees and does**: CRUD screens, rule feedback, totals, and the error states in between.
- The brief is still vague, still contradictory, and still contains at least one request that cannot be built. Finding those is graded.

## 2. What you are inheriting

The starter builds, runs and passes its tests before you touch anything.

| | |
| --- | --- |
| **Backend (finished, read-only to you)** | ASP.NET Core 10, EF Core 10, SQL Server, OpenAPI with Scalar. Accounts, contacts, activities and the new **deals** API. |
| **Frontend boilerplate (yours)** | React 19, TypeScript, Vite, `react-router-dom`, plain CSS. Contacts list and contact detail already work. One typed API file, `src/api/crm.ts`. |
| **Data** | 30 accounts, 150 contacts and 224 activities, plus 32 seeded deals across every stage. Seeded on startup. |
| **Tests** | A small Vitest and Testing Library suite (11 tests), and a Playwright config with no specs. |
| **Repo extras** | `docs/`, `AGENTS.md`, `.github/workflows/ci.yml`, `Dockerfile`, `compose.yaml`. |

It also carries what a two-year-old codebase with no owner tends to carry: a stale `AGENTS.md`, a defect Inside Sales has already complained about, a test that passes for the wrong reason, an endpoint that returns more than it should, a committed secret and a build pipeline that has been red for weeks. They are not labelled.

### The API you build against

Base path `/api`. Every URL uses a business reference such as `C-00089`, never a database id. The browsable reference is at `http://localhost:5080/scalar/v1`.

| Area | Endpoint | Use |
| --- | --- | --- |
| Contacts (existing) | `GET /contacts?page&size&status` | Paged contact list |
| | `GET /contacts/search?q=` | Search by name |
| | `GET /contacts/{contactRef}` | One contact |
| | `PUT /contacts/{contactRef}` | Edit a contact |
| | `GET` / `POST /contacts/{contactRef}/activities` | List and log activities |
| Accounts (existing) | `GET /accounts`, `GET /accounts/{accountRef}`, `GET /accounts/{accountRef}/contacts` | Companies and their people |
| **Deals (new)** | `GET /deals?stage&page&size` | Paged deal list, filterable by stage |
| | `POST /deals` | Create a deal for an account and contact |
| | `GET /deals/{dealRef}` | One deal |
| | `PUT /deals/{dealRef}` | Edit title, value, expected close date |
| | `DELETE /deals/{dealRef}` | Remove a deal. The API decides when this is allowed |
| | `POST /deals/{dealRef}/stage` | Move a deal to another stage |
| | `GET /deals/summary` | Pipeline value and deal count per stage |
| | `GET /deals/{dealRef}/history` | Every move: from stage, to stage and when. There is no "who": the app has no authentication |
| | `GET /contacts/{contactRef}/deals` | Deals driven by one contact |

**Errors share one shape.** `404 {"error":"DEAL_NOT_FOUND","message":"..."}`, `400 {"error":"VALIDATION_FAILED","fields":{"value":"..."}}` and `409 {"error":"<STABLE_CODE>","message":"..."}` for a refused stage move. The exact codes are in Scalar.

The stages and the rules between them are **not listed here**. Priya says everyone knows them. Ask your mentor, who plays Priya, then check what the API actually enforces.

## 3. The user stories

Ten stories, in order. Each has **acceptance criteria** (your definition of done) and a **Copilot prompt ladder**: **Ask** to understand, **Plan** to decide, **Agent** to build, **Verify** to prove. The ladders are scaffolds. Replace the bracketed parts with real names from the repo, and when a prompt gives poor output, rewrite it and keep the before and after in your prompt journal.

### US-01 · Onboard and configure your agent

**Story:** As a new developer, I want Copilot to know this repo's real conventions, so that what it generates matches the code I am joining.

**Acceptance criteria**

- `docs/onboarding-brief.md` explains each frontend layer and traces one click end to end: click, route, component, `src/api/crm.ts`, HTTP, controller, database, JSON, render.
- `AGENTS.md` is corrected for this repo (ports, commands, the API-layer rule, the error shape). Every claim in it is one you verified.
- At least one path-scoped `.github/instructions/*.instructions.md`, plus one custom agent, skill or prompt file.
- Your instruction files change Copilot's output in a way you can show (for example, it stops calling `fetch` inside components).

**Prompt ladder**

1. **Ask:** "Explain this repo to a new frontend developer. List each folder, what it is responsible for, and how a page gets its data. Cite file names."
2. **Ask:** "Trace what happens when I open `/contacts/C-00089`, from the router to the SQL query and back to the rendered screen. Name every file and function."
3. **Ask:** "Read `AGENTS.md`. For each claim, say whether the repository contradicts it and name the file that proves it."
4. **Agent:** "Rewrite `AGENTS.md` using only the facts you verified above. Then create `.github/instructions/frontend.instructions.md` scoped to `frontend/src/**` with the conventions you found."
5. **Verify:** Ask Copilot to add a small new API call. If it ignores your instructions, tighten the file and try again.

### US-02 · Turn the brief into a specification

**Story:** As the developer, I want a spec another developer could build from, so that nobody has to guess what Priya meant.

**Acceptance criteria**

- `docs/specs/deal-pipeline-ui.md`, copied from `docs/specs/_template.md`, with numbered `AC-01`, `AC-02`… each written Given / When / Then and independently checkable.
- **Assumptions & Open Questions:** every place the brief did not tell you enough, what you assumed, and why that is safe. An empty section is a failed section.
- **Contract Summary:** what you verified in Scalar, and every request in the brief the API cannot support.
- An **Out of Scope** section, and every contradiction in the brief named with a recommendation.
- A **Traceability** table mapping each AC to its test (completed in US-08).
- At least three questions put to your mentor, with her answers recorded.

**Prompt ladder**

1. **Ask:** "Read `docs/stakeholder-brief.md`. List every ambiguity, every pair of requests that contradict each other, and every request that depends on something this system does not have. Quote the sentence for each."
2. **Ask:** "Read the OpenAPI document. For each request in the brief, say whether the API supports it fully, partly or not at all."
3. **Plan:** "Draft the questions I should ask Priya, ordered by how much each answer changes the build."
4. **Agent:** "Fill `docs/specs/_template.md` as `deal-pipeline-ui.md`. Do not invent answers. Where Priya's reply is missing, put the question under Open Questions."
5. **Verify:** "Review this spec as a sceptical developer. Which AC cannot be tested as written?"

### US-03 · See every deal, and open one

**Story:** As Inside Sales, I want to browse deals and open one, so that I no longer need the spreadsheet.

**Acceptance criteria**

- A `/deals` route, linked from the header, lists deals 20 per page with a stage filter.
- Each row shows reference, title, account, contact, stage, value in GBP and expected close date, formatted with the existing helpers in `constants.ts`.
- `/deals/:dealRef` shows the whole deal and links to its account and contact.
- Loading, empty and error states are visibly different. An unknown reference shows "deal not found", not a blank page.
- All HTTP goes through `src/api/crm.ts`. New types live in `src/types.ts`. No `any`.

**Prompt ladder**

1. **Ask:** "Which existing page is closest to a deals list? What would I copy and what would I change?"
2. **Plan:** "Plan the types, API functions, routes and components for a deals list and detail page. Reuse `Pagination` and `StatusFilter` where they fit. List files to create or edit. No code yet."
3. **Agent:** "Implement step 1 of the plan only: the types and API functions. Stop and show me the diff."
4. **Agent:** "Now build `DealsPage` and `DealDetailPage` following `ContactsPage` and `ContactDetailPage`."
5. **Verify:** Run `npm run typecheck`. Stop the API and reload. Describe what the user sees, and fix it if it is not helpful.

### US-04 · Create, edit and delete a deal

**Story:** As a rep, I want to create and edit a deal for an account and contact, so that the pipeline is current.

**Acceptance criteria**

- The create form picks an account, then a contact **at that account**, then takes title, value and expected close date.
- Client-side checks mirror the backend rules. Messages in a 400 `fields` map appear beside the right input.
- Editing pre-fills the form. Saving shows the updated deal.
- Delete asks for confirmation. If the API refuses with a 409, the user sees the API's message and the list is unchanged.
- A double click cannot submit twice. Nothing on screen is stale after a save.

**Prompt ladder**

1. **Ask:** "Which validation rules does `POST /api/deals` enforce? Read the request DTO and the OpenAPI schema. List each field, its rule and its error message."
2. **Plan:** "Plan one deal form that works for create and edit. How do I map the `fields` object in a 400 response onto inputs?"
3. **Agent:** "Build `DealForm` one step at a time: fields first, then submit and error mapping, then the delete action. Show the diff after each."
4. **Verify:** Submit an empty form, a negative value and a contact from a different account. Record what the API says and what the UI shows.

### US-05 · Move a deal between stages

**Story:** As a rep, I want to move a deal and be told clearly when I cannot, so that nobody puts a deal in a silly state.

**Acceptance criteria**

- The detail page has a stage-move control. It does not offer obviously illegal moves, but it never relies on that: the server is the authority.
- A move that needs extra information (closing as won or lost) asks for it first and sends what the API requires.
- A refused move shows a plain-English message, not a status code or raw JSON, and the deal on screen is unchanged.
- After a successful move, the detail page and any list or board on screen show the new stage without a manual refresh.
- Moving a deal back a stage works, because the brief says deals do go backwards.

**Prompt ladder**

1. **Ask:** "Read the stage endpoint, its DTO and the service that enforces transitions. List every allowed and every refused move, and the error code for each refusal."
2. **Plan:** "Where should the stage rules live, in the client or the server? Plan the control and the mapping from error code to message. Justify the split."
3. **Agent:** "Build `StageMoveControl` and a single `stageErrorMessages` map. Keep the rules out of the component."
4. **Verify:** Trigger every refusal you found in step 1. Paste each real API response into your prompt journal and check the text the user sees.

### US-06 · The pipeline board and the number that matters

**Story:** As Priya, I want to see pipeline value per stage at any moment, so that I can take one number into Monday's leadership call.

**Acceptance criteria**

- A `/pipeline` route shows deals in a column per stage, with a deal count and a value total per column and one overall total.
- Totals come from `GET /deals/summary`, not from adding up rows in the browser. You can show they agree with the deal list for the stages involved.
- What the overall total includes (open deals only, or all?) is settled with Priya, written in the spec and labelled on screen in plain words.
- Moving a deal updates the board and the totals without a manual refresh. "Real time" is dealt with in your spec as an explicit decision, not silently over-built.
- Money is shown in GBP with thousands separators. An empty column has an empty state. The board is usable at tablet width.

**Prompt ladder**

1. **Ask:** "What does `GET /api/deals/summary` return, and which stages and deals does it include? Check the service code, not only the schema."
2. **Plan:** "Plan the board with plain CSS and existing components. What state do I need, and what triggers a refetch? Compare polling, refetch-on-action and websockets against what Priya actually asked for."
3. **Agent:** "Build `PipelineBoard` and `StageColumn`. Fetch the summary and the deals once, and share them through one hook."
4. **Verify:** Work out one stage's total by hand from the deal list and compare it with the summary. Record the result.

### US-07 · Across records: contact page and customer status

**Story:** As Inside Sales, I want to see a contact's deals from their record and whether they are a paying customer, so that I know who is a prospect.

**Acceptance criteria**

- The contact detail page lists that contact's deals, each linking to the deal.
- After a deal is won, the contact shows the status the API returns. You confirmed this by reloading, not by assuming.
- Losing a deal never makes the UI claim something the API did not return. What the screen shows about a contact with several deals is stated in your spec.
- The contact page can log an activity (call, email, meeting or note) with validation, and it appears in the timeline straight away.
- Moving a deal, then opening the contact, never shows stale data.

**Prompt ladder**

1. **Ask:** "What happens to the contact record when a deal is won or lost? Find the backend code that does it and summarise it."
2. **Plan:** "Where should data fetching live so that the list, the board and the contact page stay in step? Compare a shared hook, a small cache and refetch-on-navigation."
3. **Agent:** "Add `ContactDeals` and `ActivityForm` to the contact page, reusing the patterns from US-03 and US-04."
4. **Verify:** Win a deal for a prospect, then open that contact. Then lose a different deal for the same contact and check again.

### US-08 · Test it, then audit the tests

**Story:** As a team, we want tests that fail when the UI is wrong, not tests that merely run.

**Acceptance criteria**

- Vitest and Testing Library tests cover the list states, the form validation and every stage-move error message. Test names carry their AC id, for example `AC_05_RefusedMoveShowsMessage`.
- At least two Playwright specs run against the live stack: create then move a deal, and a refused move.
- The new tests are written by a dedicated test-writer agent, and you audit them by hand.
- At least one test already in the repo passes while asserting the wrong thing. You find it, explain it and correct it in `docs/test-audit-note.md`: what it actually checked, why that was wrong, and the fix.
- You show, by breaking the code on purpose, that at least three of your tests go red when they should.
- The Traceability table in your spec is complete.

**Prompt ladder**

1. **Ask:** "Read every existing test. For each one, say what would have to be wrong for it to fail. Flag any assertion that cannot fail."
2. **Agent:** "Create `.github/agents/test-writer.agent.md` that writes Testing Library tests from acceptance criteria, asserting visible behaviour and not implementation."
3. **Agent:** "Using the test-writer agent, write tests for AC-05 and AC-06 from `docs/specs/deal-pipeline-ui.md`."
4. **Verify:** "Break `StageMoveControl` in one line. Which tests go red? If none do, those tests are wrong."

### US-09 · Review and harden

**Story:** As a team, we want to find what a reviewer or an attacker would find before they do.

**Acceptance criteria**

- An AI-assisted review of your own diff against `docs/review-checklist.md`, recorded in `docs/review-report.md` with severity, decision and reason for each finding. At least one finding is **rejected** with sound reasoning, and one thing the review missed is named.
- **Confidentiality.** From the browser's Network tab, find the response that carries a field the UI never shows, an internal credit-risk note on a contact. List every property in that response, confirm the UI does not render or log it, and write a ticket for the platform team. You do not hide it in the UI and call it fixed.
- **Secret.** Find the committed secret in the repository (look beyond the frontend folder), remove it, replace it with a setting that is read from outside the repository, and note that it must be rotated because it is in git history.
- **CRM-142.** Reproduce the contact list ordering problem from the UI, show with evidence which layer causes it, rule out at least one other explanation, and write the bug report. You do not sort in the browser to hide it.
- **"Reps should only see their own deals."** Write the escalation: why this cannot be built (the app has no authentication), what it would take, and what you chose not to fake.
- `docs/validation-checklist.md` is complete and specific to your submission.

**Prompt ladder**

1. **Ask:** "Review my diff against `docs/review-checklist.md`. For each finding give severity, file and line, and a fix." Then check every finding against the code yourself.
2. **Ask:** "List every property returned by `GET /api/contacts/C-00089` and say which the frontend type declares. Which ones should a browser never receive?"
3. **Ask:** "Search the repo and its git history for credentials. For each hit, say whether it is a secret and why."
4. **Ask:** "The contact list repeats A to W on every page. From the network responses alone, which layer is to blame? Give me two hypotheses and the evidence that would separate them."

### US-10 · Ship it

**Story:** As the team, we want a build that fails when it should, a stack that comes up with one command and a README that works on a clean machine.

**Acceptance criteria**

- The frontend `Dockerfile` already exists. Review it, then add the missing `web` service to `compose.yaml` so that `docker compose up --build` brings up the database, the API and the UI together, and the UI at `http://localhost:8080` shows live data. If it does not, find out why and fix it.
- The CI pipeline is fixed using `docs/ci-failing-run.log` as your only diagnostic input, **and** you find the problem the log does not show: a step that reports green when the suite is red. The pipeline also runs your frontend tests.
- `README.md` gets a new joiner running on a clean machine, tested by following it literally.
- `architecture.html` shows the final architecture and a data-flow diagram from browser to database.
- `docs/design-decisions.md` records what you delegated to Copilot, what you wrote by hand, and why.

**Prompt ladder**

1. **Ask:** "Read `docs/ci-failing-run.log` and `.github/workflows/ci.yml`. What fails and why? What else in the workflow is wrong that the log cannot show?"
2. **Agent:** "Fix the workflow, and add a step that runs the frontend tests. Explain why a pipeline that cannot fail is worse than a red one."
3. **Ask:** "Read `frontend/Dockerfile`, `frontend/nginx.conf` and `compose.yaml`. Trace a request for `/api/contacts` from the browser through nginx to the API. What path does the API receive?"
4. **Agent:** "Add a `web` service to `compose.yaml` that builds `./frontend` and publishes it on port 8080, depending on `api`."
5. **Verify:** Run `docker compose up --build`. Open `http://localhost:8080`. Follow your own README from a fresh clone, line by line.

### Stretch · The audit trail

Priya said audit history could wait, but compliance has asked twice. If time allows, add a timeline to the deal page from `GET /deals/{dealRef}/history`: from which stage to which, and when. Handle the empty state. Compliance also asked *who* moved it: say in your spec why the API cannot tell you (there is no authentication), and what would have to exist first. Record why you built the timeline after the board.

## 4. How you must work

- **Specification before code.** US-02 is finished before you start US-03. This is the one process rule, and it is assessed.
- **Prompt journal, kept as you go.** `docs/prompt-journal.md`, at least ten entries, in the order things happened: the prompt, the mode (Ask, Plan or Agent), what came back, and whether you accepted, rejected or rewrote it, and why. Revise at least one prompt after a poor first result and keep the before and after. This is explicitly graded.
- **Ask Priya.** Your mentor plays her. She does not volunteer answers, so what you ask matters.
- **Backend is read-only.** When the backend is wrong or missing something, write it in `docs/backend-tickets.md` with evidence. Do not work around it silently.
- **One commit per story,** with the story id in the message.

## 5. What you submit

| Artifact | Path |
| --- | --- |
| Onboarding brief | `docs/onboarding-brief.md` |
| Specification | `docs/specs/deal-pipeline-ui.md` |
| Prompt journal (10 entries minimum) | `docs/prompt-journal.md` |
| Test audit note | `docs/test-audit-note.md` |
| Review report | `docs/review-report.md` |
| Backend tickets and CRM-142 report | `docs/backend-tickets.md` |
| Validation checklist | `docs/validation-checklist.md` |
| Design decisions | `docs/design-decisions.md` |
| Final architecture and data flow | `architecture.html` |
| Agent briefing | `AGENTS.md` |
| Path-scoped instructions, agent, skill or prompt | `.github/instructions/`, `.github/agents/` |
| Working application | `frontend/` |
| Unit, component and end-to-end tests | `frontend/src/**/*.test.tsx`, `frontend/e2e/` |
| Dockerfile, fixed pipeline, README | `frontend/Dockerfile`, `.github/workflows/ci.yml`, `README.md` |

Delete `node_modules/` and build output, then zip the project as `capstone-<your-name>.zip`.

## 6. How you will be assessed

35 points on the shared rubric in `Capstone-Evaluation-Rubric-AllTracks.xlsx`. Read its mark bands before you start. The gap between half and full marks on each row is specific.

| Parameter | Points | Mainly evidenced by |
| --- | --- | --- |
| Requirement Analysis | 4 | US-02 specification |
| Prompt Construction | 4 | US-01 harness files, prompt journal |
| Architecture & Design | 4 | US-01 onboarding brief, layering in US-03 to US-07 |
| Code Generation | 4 | US-03 to US-07 working screens |
| Test Generation & Audit | 4 | US-08 |
| Code Review | 4 | US-09 review report |
| Security, Governance & Documentation | 4 | US-09 findings, validation checklist |
| Repository & Deliverables Completeness | 7 | US-10 and every artifact above |

An artifact that describes work not present in the code scores zero for its row. A working application with no artifacts cannot score well, because most rows are read from documents.

## 7. Getting started

You need **Node 22**, the **.NET 10 SDK**, **Docker Desktop** and **VS Code**. Open the `starter_code` folder in VS Code and accept the recommended extensions (C# Dev Kit, REST Client, GitHub Copilot, Vitest, Playwright). Every command below is also a task: **Terminal > Run Task**.

You never edit .NET code, but the API has to be running while you work.

### 1. Start the backend

| Choose one | Steps |
| --- | --- |
| **A. SQL Server in Docker (easiest)** | `docker compose up -d db`, then press **F5** and pick **API (.NET) - SQL Server in Docker**. The API creates the schema and seeds the data on first start. |
| **B. SQL Server on your machine** | One-off: `sqlcmd -S localhost -E -C -i db-setup/01-create-logins.sql` (SQL Server needs TCP/IP and mixed-mode authentication switched on). Then **F5** and pick **API (.NET) - local SQL Server**. |
| **C. Everything in Docker** | `docker compose up --build api db` |

The API listens on `http://localhost:5080`. The browsable reference is at `http://localhost:5080/scalar/v1`, and `backend/Crm.http` has a ready-made request for every endpoint (click **Send Request** with the REST Client extension).

To start the data over: `docker compose down -v` (options A and C), or run `db-setup/02-reset-schema.sql` (option B), then start the API again.

### 2. Check the backend is healthy

```bash
node scripts/crosscheck-backend.mjs
```

It calls every endpoint and prints PASS or FAIL for each. It changes data (it wins and loses a few deals), so reset the database afterwards if you want the seeded state back. Anything marked WARN is a defect planted on purpose: leave it alone.

### 3. Run the frontend

| Do this | Command |
| --- | --- |
| Install and run the UI | `cd frontend && npm install && npm run dev` (opens on `http://localhost:5173`) |
| Type-check | `npm run typecheck` |
| Component tests | `npm run test` |
| End-to-end tests | `npx playwright install chromium` once, then `npx playwright test` |
| Production build | `npm run build` |

Read `docs/stakeholder-brief.md` and `docs/bug-CRM-142.md` before US-01. Then open a chat, and decide what you are asking for before you ask for it.
