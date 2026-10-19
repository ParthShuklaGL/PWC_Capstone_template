# Frontend prompts — Capstone 1: Pipeline CRM

**Do not give this file to learners.** It is the reference run of the whole capstone with
GitHub Copilot in VS Code: the prompts, the mode for each, and what to check afterwards. Use it
to rehearse before the cohort arrives, to test the starter, and as the key when a learner's
first prompt goes badly.

Learners get the shorter prompt ladders inside `problem-statement.md`. These are the fuller,
paste-ready versions, written against the real files in `starter_code/`.

---

## How to use this file

**Setup (once).** Open the `starter_code` folder in VS Code. Start the backend and confirm it is
healthy (`node scripts/crosscheck-backend.mjs`, see `mentor-guide.md` section 4). Run
`cd frontend && npm install && npm run dev`.

**Copilot Chat modes.** *Ask* answers questions and changes nothing. *Plan* proposes a design
and changes nothing. *Agent* edits files and runs commands. Each prompt below says which to use.
Switch mode in the chat box before you send.

**Referring to files.** Type `#file:` and pick the file, or `#codebase` to let Copilot search.
The prompts use paths like `#file:frontend/src/api/crm.ts`. In a prompt, the part in
`[square brackets]` is yours to fill in from the previous step's answer.

**Rhythm.** For every story: Ask to understand, Plan to decide, Agent to build in small steps
(one diff at a time), then verify in the browser and with the checks listed. Commit once per
story with the story id in the message.

**Keep the journal.** For each prompt, add a row to `docs/prompt-journal.md`: the prompt, the
mode, what came back, accepted / rejected / rewritten, and why. The rewrites below ("If the
first answer is weak") are there so you have a real before and after to record.

---

## US-01 · Onboard and configure your agent

**1. Ask**
> Explain this repository to a developer who will only work on the frontend. List each folder
> under #codebase, what it is responsible for, and how a page gets its data from the API to the
> screen. Cite file names. Do not guess: if you are not sure, say so.

*Check:* it should name `frontend/src/api/crm.ts` as the one place that calls the backend,
`types.ts`, `constants.ts`, `pages/` and `components/`, and the Vite proxy in `vite.config.ts`.

**2. Ask**
> Trace what happens when I open /contacts/C-00089 in the browser. Start at the router in
> #file:frontend/src/App.tsx and follow it through the component, #file:frontend/src/api/crm.ts,
> the HTTP request, the backend controller, service, repository and SQL, and back to the rendered
> screen. Name every file and function.

*Check:* the backend half should name `ContactsController.Get`, `ContactService.GetByRefAsync`
and `ContactRepository.FindByRefAsync` with its `Include(c => c.Account)`.

**3. Ask**
> Read #file:AGENTS.md. For each claim in it, say whether the repository contradicts it and name
> the file that proves it. Then list important facts about this repo that AGENTS.md does not
> mention.

*Check:* every claim is wrong (in-memory database, port 5000, `npm start`, AutoMapper,
`ContactsController.ListAll`, a `Reporting/` folder). Missing facts: ports 5080 and 5173, the
API-layer rule, the error shape, no authentication.

**4. Agent**
> Rewrite #file:AGENTS.md using only facts you verified in the previous answers. Include: how to
> run the backend and the frontend, the rule that components never call fetch (everything goes
> through frontend/src/api/crm.ts), where types live, the error response shape
> ({error, message} and {error, fields}), that enums travel as SCREAMING_SNAKE strings, that
> there is no authentication, and that the backend is read-only for this task. Then create
> .github/instructions/frontend.instructions.md scoped with applyTo: "frontend/src/**" that
> states the frontend conventions you found: LoadStatus for screen state, the `cancelled` flag in
> effects, no `any`, shared helpers in constants.ts for dates and status labels.

**5. Verify (Agent, in a new chat)**
> Add a function to the API layer that fetches GET /api/accounts. Follow the repo's conventions.

*Check:* it should add a typed function to `crm.ts` and a type to `types.ts` without being told.
If it calls `fetch` elsewhere, tighten the instructions file and run it again.

**Also create** one reusable prompt file, for example `.github/prompts/new-screen.prompt.md`
("Add a new screen following ContactsPage: types, API function, route, loading/empty/error
states"), and note in the journal what changed in Copilot's output.

---

## US-02 · Turn the brief into a specification

**1. Ask**
> Read #file:docs/stakeholder-brief.md. List every ambiguity, every pair of requests that
> contradict each other, and every request that depends on something this system does not have.
> Quote the sentence for each.

*Check against `mentor-guide.md` section 5.* Expect: stages not listed, "total value" undefined,
reps' own deals (no authentication), what happens on Lost, audit vs "a day of work", real time,
currency. A first answer usually misses the authentication point.

**1b. If the first answer is weak** (record the before and after)

*Weak:* "What is wrong with this brief?"

*Better:*
> Read #file:docs/stakeholder-brief.md and #file:backend/NimbusSales.Crm.Api/Program.cs. For
> "Reps should only see their own deals", check what the application knows about who is making a
> request. Is there a user, a login, a token or an owner field anywhere in #codebase? Say what
> would have to exist before this could be built, and do not suggest a workaround.

**2. Ask**
> Open the OpenAPI document at http://localhost:5080/openapi/v1.json (or read the controllers in
> #file:backend/NimbusSales.Crm.Api/Web/DealsController.cs). For each request in the brief, say
> whether the API supports it fully, partly or not at all. Show the endpoint that supports it.

**3. Plan**
> Draft the questions I should ask Priya, ordered by how much each answer changes what I build.
> One line each, and say what I will assume if she does not answer.

*Then ask your mentor, who plays Priya, at least three of them, and write her answers down.*

**4. Agent**
> Copy #file:docs/specs/_template.md to docs/specs/deal-pipeline-ui.md and fill it in. Do not
> invent answers. Where Priya's answer is missing, put the question under Open Questions. Write
> acceptance criteria as AC-01, AC-02, each Given / When / Then. Include a Contract Summary table
> of what I verified in the API, an Out of Scope section, and leave the Traceability test column
> empty for now.

**5. Verify (Ask)**
> Review #file:docs/specs/deal-pipeline-ui.md as a sceptical developer who has to build from it.
> Which acceptance criteria cannot be tested as written? Which request in the brief is not
> covered by anything?

---

## US-03 · See every deal, and open one

**1. Ask**
> Which existing page in #file:frontend/src/pages is closest to a deals list, and which to a
> deal detail? What would I copy and what would I change? Also check #file:frontend/src/components:
> where do Pagination and StatusFilter assume they are showing contacts?

*Check:* it should notice `Pagination` says "contacts" in its text and `aria-label`, and
`StatusFilter` is built from contact statuses. Those are the reuse traps.

**2. Plan**
> Plan the types, API functions, routes and components for a deals list at /deals and a detail
> page at /deals/:dealRef. The API is in #file:backend/NimbusSales.Crm.Api/Web/DealsController.cs
> and the response shape is in #file:backend/NimbusSales.Crm.Api/Web/Dto/DealResponse.cs. List
> the files to create or edit. Say how you will reuse or generalise Pagination and StatusFilter.
> No code yet.

**3. Agent**
> Implement only step 1 of the plan: the Deal types in #file:frontend/src/types.ts and the
> fetchDeals and fetchDeal functions in #file:frontend/src/api/crm.ts. Money is a number in GBP,
> dates are yyyy-MM-dd strings. No any. Stop and show me the diff.

**4. Agent**
> Now build DealsPage and DealDetailPage following ContactsPage and ContactDetailPage, add the
> routes and a "Deals" link in the header in #file:frontend/src/App.tsx. Show a distinct loading,
> empty and error state. Format money and dates with helpers in constants.ts. Make Pagination
> accept a noun so it does not say "contacts" on the deals page.

**5. Verify**

Run `npm run typecheck`. Then in the browser:

- `/deals` shows **20 rows**, then page 2 shows **12**. Page 1 starts with `D-00024`
  (2026-05-29); page 2 starts with `D-00003`.
- Filter to NEGOTIATION: **5** deals.
- `/deals/D-00016` shows "Procurement automation", £145,000.00, and links to its account and contact.
- `/deals/D-99999` shows a "deal not found" message, not a blank page.
- Stop the API and reload: a readable error, not a spinner forever.

**If the first answer is weak** — *Weak:* "Build a deals page." *Better:* use prompts 2 to 4: the
plan names the files, the first Agent step is only types and API functions, and the second builds
the screens from the existing ones.

---

## US-04 · Create, edit and delete a deal

**1. Ask**
> Which validation rules does POST /api/deals enforce? Read
> #file:backend/NimbusSales.Crm.Api/Web/Dto/DealCreateRequest.cs and
> #file:backend/NimbusSales.Crm.Api/Services/DealService.cs. List each field, its rule and the
> exact error message, and say which rules are on the shape of the body and which are business
> rules checked later.

*Check:* title required and 200 max, value above zero, date required, **expected close date not
in the past**, **the contact must work at the account**.

**2. Ask (the 204 trap)**
> Look at the request function in #file:frontend/src/api/crm.ts. What happens when the server
> answers 204 No Content, as DELETE /api/deals/{dealRef} does?

*Check:* it calls `response.json()`, which throws on an empty body. The learner must handle it.

**3. Plan**
> Plan one DealForm component for create and edit. How do I load a contact list that is filtered
> to the chosen account (GET /api/accounts and GET /api/accounts/{accountRef}/contacts)? How do I
> map the `fields` object of a 400 response onto the right inputs? How do I stop a double submit?
> How should the value input be held and sent so no pennies are lost? And what must happen to
> the request function for DELETE?

**4. Agent**
> Fix the request function in crm.ts so a 204 response returns without parsing a body. Add
> createDeal, updateDeal, deleteDeal, fetchAccounts and fetchAccountContacts. Stop and show me the diff.

**5. Agent**
> Build DealForm: account select, then a contact select filtered to that account, then title,
> value and expected close date. Show each message from a 400 `fields` response beside its input.
> Disable the submit button while the request runs. Use it for /deals/new and /deals/:dealRef/edit.
> Show the diff before you run anything.

**6. Agent**
> Add a Delete button on the detail page with a confirmation. If the API answers 409, show its
> `message` and leave the list unchanged.

**7. Verify**

- Submit an empty form: every missing field is flagged beside its input.
- Value `-5`, value `0`, a date in the past: each shows the API's message.
- Pick account `A-0001` and contact `C-00001`: the form does not offer it, and if forced the API
  says the contact does not work at that account.
- Create a deal, then edit it, then delete it (PROSPECTING, so it is allowed).
- Try to delete `D-00016` (NEGOTIATION): a 409 message appears and the list is unchanged.
- Double-click Submit: one deal is created, not two.

---

## US-05 · Move a deal between stages

**1. Ask**
> Read #file:backend/NimbusSales.Crm.Api/Domain/DealStageRules.cs,
> #file:backend/NimbusSales.Crm.Api/Services/DealService.cs (MoveToStageAsync) and
> #file:backend/NimbusSales.Crm.Api/Web/DealsExceptionHandler.cs. List every allowed move and
> every refused move, the error code and status for each refusal, and what extra information
> closing a deal needs.

**2. Plan**
> Where should the stage rules live: in the client or the server? Plan a StageMoveControl and a
> single map from error code to a plain-English message. The server is the authority, so the
> control may hide obviously illegal moves but must never rely on that. Justify the split.

**3. Agent**
> Build StageMoveControl for the deal detail page: show the stages the deal could reasonably move
> to, ask for a close date when winning and a reason when losing, and send POST
> /api/deals/{dealRef}/stage. Put all messages in one stageErrorMessages map keyed by error code.
> Keep the rules out of the component. On success, show the new stage without a manual refresh.

**4. Verify.** Trigger every refusal and paste the **real** responses into your journal:

| Do this | Expect |
|---|---|
| Open `D-00004` (PROSPECTING), force a move to NEGOTIATION | 409 `DEAL_STAGE_TRANSITION_INVALID`, a plain message, deal unchanged |
| Move a PROPOSAL deal straight to WON | 409, "can only be won from NEGOTIATION" |
| Win a NEGOTIATION deal with no close date | 400 with `fields.closeDate`, shown beside the date input |
| Lose a deal with no reason | 400 with `fields.lostReason`, shown beside the reason input |
| Go back two stages | 409 |
| Open a WON deal (`D-00021`) | The control explains it is closed, not just disabled |
| Go back one stage | Works |

---

## US-06 · The pipeline board and the number that matters

**1. Ask**
> What does GET /api/deals/summary return? Read #file:backend/NimbusSales.Crm.Api/Services/DealService.cs
> (SummariseAsync) and #file:backend/NimbusSales.Crm.Api/Services/DealSummary.cs. Which stages are
> included, and what do openCount and openValue cover?

*Check:* all six stages with zeros where empty; `openValue` is the four open stages only.

**2. Plan**
> Plan a /pipeline board with plain CSS: a column per stage with a count and a value, and one
> overall total. State: what do I fetch, where does it live, and what triggers a refetch after a
> stage move? Compare polling, refetch-on-action and websockets against what Priya asked for.
> Recommend one and say why.

**3. Agent**
> Build PipelineBoard and StageColumn. Fetch /api/deals/summary and /api/deals?size=100 once, share
> them through one useDealsPipeline hook, and refetch both after any stage move. Show the totals
> from the summary, never summed in the browser. Label the overall total in plain words ("open
> deals: Prospecting to Negotiation"). Empty columns show an empty state. Usable at tablet width.

**4. Verify**

- The header total reads **£1,247,500.00 across 20 open deals** on a fresh database.
- Columns read: Prospecting 5 / £136,750.00, Qualified 5 / £342,500.00, Proposal 5 / £318,750.00,
  Negotiation 5 / £449,500.00, Won 7 / £325,000.00, Lost 5 / £228,000.00.
- Add up the Negotiation cards by hand: it matches the column.
- Move a deal from the board or its detail page: the board and the totals change with no F5.
- Throttle or stop the API mid-move: the board does not show a half-updated state.

**If the first answer is weak** — *Weak:* "Make a kanban board." The agent will usually add
`reduce()` over the deal list and show its own total. *Better:* the prompt above names the
endpoint and forbids summing in the browser. Record both.

---

## US-07 · Across records: contact page and customer status

**1. Ask**
> What happens to the contact record when a deal is won or lost? Find the code in
> #file:backend/NimbusSales.Crm.Api/Services/DealService.cs and summarise it, including what
> happens when the contact already has another won deal.

**2. Plan**
> Where should data fetching live so that the deals list, the board and the contact page stay in
> step after a stage move? Compare one shared hook, a small cache and refetch-on-navigation, and
> recommend the smallest one that works.

**3. Agent**
> Add a ContactDeals section to #file:frontend/src/pages/ContactDetailPage.tsx using GET
> /api/contacts/{contactRef}/deals, each deal linking to /deals/:dealRef. Add an ActivityForm
> (type CALL, EMAIL, MEETING or NOTE, subject, notes) that POSTs to
> /api/contacts/{contactRef}/activities and shows the new activity in the timeline straight away.

**4. Verify**

- `C-00001` is a **Prospect** with `D-00016` in NEGOTIATION. Win it (with a close date), reload
  the contact: **Customer**.
- `C-00003` has one won and one lost deal and is a Customer. Lose another deal for them: still a Customer.
- Log a call: it appears at the top of the timeline without a reload.
- Move a deal, then open its contact: no stale status.

---

## US-08 · Test it, then audit the tests

**1. Ask**
> Read every test under #file:frontend/src. For each one, say what would have to be wrong for it
> to fail. Flag any assertion that cannot fail, and any test that checks something other than
> what its name says.

*Check:* it should flag **"shows an error message when the contacts cannot be loaded"** in
`ContactsPage.test.tsx`: it asserts the loading text, synchronously, so it passes whether or not
the error handling works. If Copilot misses it, ask again with: "Look especially at tests that
use mockRejectedValue and ask whether they wait for the promise to settle."

**2. Agent**
> Create .github/agents/test-writer.agent.md: a custom agent that writes Vitest and Testing
> Library tests from acceptance criteria. It must assert visible behaviour (text, roles, what the
> user sees), await asynchronous results with findBy, never assert implementation details, and
> name each test after its AC id, for example AC_05_RefusedMoveShowsMessage.

**3. Agent (using the test-writer agent)**
> Using the test-writer agent, write tests for AC-05 and AC-06 from #file:docs/specs/deal-pipeline-ui.md:
> a refused stage move shows the server's message and leaves the deal unchanged, and the board
> shows the totals from the summary. Mock only the API module.

**4. Agent**
> Correct the wrong-but-passing test in ContactsPage.test.tsx so it waits for the alert and checks
> its text. Write docs/test-audit-note.md: what the test actually checked, why that was wrong,
> and the correction.

**5. Verify (mutation check)**
> Break StageMoveControl in one line (for example, always send the same stage). Run npm run test.
> Which tests go red? If none do, those tests are wrong.

Do this at least three times with three different breaks, and keep the output. Then write two
Playwright specs in `frontend/e2e/` against the live stack: create a deal then move it, and a
refused move.

---

## US-09 · Review and harden

**1. Ask**
> Review my changes against #file:docs/review-checklist.md. For each finding give the severity,
> the file and line, and a suggested fix. Only report things you can point to in the code.

*Then check every finding against the code yourself.* Copilot will usually invent at least one.
Keep one you reject, and say why.

**2. Ask**
> List every property returned by GET /api/contacts/C-00089, using the controller in
> #file:backend/NimbusSales.Crm.Api/Web/ContactsController.cs. Which does the TypeScript type
> ContactDetail in #file:frontend/src/types.ts declare? Which ones should a browser never receive,
> and where would the fix belong?

*Check:* thirteen properties; `creditRiskNote`, `id` and `accountId` are not in the frontend
type. The fix is a response DTO on the server. Then open the browser's **Network** tab on a
contact page and show the field in the response. Write the ticket for the platform team in
`docs/backend-tickets.md`.

**3. Ask**
> Search the whole repository, not just the frontend folder, and its git history for credentials.
> For each hit say whether it is a secret and why. Ignore local development passwords for the
> local database.

*Check:* the finding is `Nimbus:Mail:ApiKey` in `appsettings.json`. The fix is a setting read from
outside the repository, and a note that it needs rotating.

**4. Ask**
> The contact list on /contacts repeats A to W on every page, and a contact I know is on page 5
> when surname order says page 3. From the network responses alone, which layer is responsible?
> Give me two hypotheses and the evidence that would separate them.

*Then do it by hand:* open the Network tab, request `/api/contacts?page=0&size=20` and
`?page=1&size=20`, and show that **the API response itself** repeats the alphabet, so the UI is
not at fault. Rule out your own client by showing it does not sort. Compare with
`/api/deals?page=0` and `?page=1`, which are in global order. **Do not sort in the browser.**

**5. Plan**
> Write the escalation note for "Reps should only see their own deals": why it cannot be built
> in this application today, what would have to exist first, and what I chose not to fake.

---

## US-10 · Ship it

**1. Ask**
> Read #file:docs/ci-failing-run.log and #file:.github/workflows/ci.yml. What fails and why? What
> else in the workflow is wrong that the log cannot show?

*Check:* the log shows Node 18 with Vite 8 and `crypto.hash is not a function`. The part the log
cannot show is `continue-on-error: true` on the backend tests.

**2. Agent**
> Fix the workflow: use Node 22, remove continue-on-error, and add a step to the frontend job
> that runs npm run test. Explain why a pipeline that cannot fail is worse than a red one.

**3. Ask**
> Read #file:frontend/Dockerfile, #file:frontend/nginx.conf and #file:compose.yaml. Trace a request
> for /api/contacts from the browser through nginx to the API. What path does the API receive?

*Check:* with `proxy_pass http://api:5080/;` nginx replaces `/api/` with `/`, so the API receives
`/contacts` and answers 404. If Copilot says the config is fine, ask: "Apply nginx's rule for a
proxy_pass that has a URI part, step by step."

**4. Agent**
> Add a `web` service to compose.yaml that builds ./frontend, publishes port 8080:80 and depends on
> api. Fix nginx.conf so /api requests reach the API with their path intact.

**5. Verify.** `docker compose up --build`, open `http://localhost:8080`: contacts and deals load.
Then follow your own README from a fresh clone, line by line.

**6. Agent**
> Write README.md so that a new joiner can run the backend, run the frontend, run the tests and
> run the whole stack in Docker on a clean machine. Only include commands I have run.

**7. Agent**
> Create architecture.html: a single page with the final architecture (browser, Vite or nginx,
> API, SQL Server) and a data-flow diagram of one request from click to database and back.
> Write docs/design-decisions.md: what I delegated to Copilot, what I wrote by hand, and why.

---

## Stretch · The audit trail

**Ask**
> What does GET /api/deals/{dealRef}/history return, and what does it not return that the brief
> asked for? Check #file:backend/NimbusSales.Crm.Api/Web/Dto/DealHistoryResponse.cs.

*Check:* from, to and when; **no "who"**, because there is no authentication.

**Agent**
> Add a StageHistory timeline to the deal detail page from /api/deals/{dealRef}/history: oldest
> first, from stage to stage with the date, an empty state, and a note that the API does not
> record who made the move.

---

## When a learner's first prompt goes badly: examples to keep

| Story | Weak first prompt | Why it fails | Rewrite that works |
|---|---|---|---|
| US-02 | "What is wrong with the brief?" | Finds ambiguities, misses the authentication blocker | Point it at `Program.cs` and ask what the app knows about who is calling |
| US-03 | "Build a deals page" | Invents its own API calls and types, ignores `crm.ts` | Plan first, then types and API functions only, then the screens |
| US-04 | "Add a delete button" | Calls `request()`, which throws on 204 | Ask what `request()` does with an empty body first |
| US-06 | "Make a kanban board" | Sums deal values in the browser | Name `/api/deals/summary` and forbid summing |
| US-08 | "Write tests for the deals page" | Tests assert that things render, not what they say | Create the test-writer agent with explicit rules, then use it |
| US-10 | "Fix the pipeline" | Fixes the Node version only | Ask what else is wrong that the log cannot show |
