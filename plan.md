# Plan: finish both capstone projects

Two projects, done in this order. A step is done only when its check has been run and its output seen.

| # | Project | Goal | Status |
|---|---|---|---|
| 1 | CRM (`capstone1-crm-boilerplate/project1/starter_code`) | MySQL database created, API running | Blocked on you |
| 2 | FSD (`fsd-boilerplate`) | Backend compiles, every flow verified | Not started |
| 3 | CRM | Deal screens built, review checklist US-03 to US-07 passed | Not started |

Docker is not used. Both projects run on the local MySQL 8 service (port 3306).

Ports: CRM API 5080, CRM React dev server 5176 (proxies `/api` to 5080), FSD API 8080, FSD React 5173, MySQL 3306.

## Where things stand

| Item | Written | Verified |
|---|---|---|
| CRM backend on MySQL (provider, migrations, scripts) | Yes | Builds, 38/38 tests pass. Never run against live MySQL |
| CRM contacts screens | Yes | Not run |
| CRM deal screens, pipeline board | No | n/a |
| FSD frontend | Yes | `npm run build` passes |
| FSD backend (auth, CRUD, reports, Docker, README) | Yes | Never compiled |

Known environment gaps: no JDK or Maven (Docker is no longer needed), and the MySQL root password is only known to you.

---

## Phase 1: CRM database and API (you, then me)

1. **You:** create the database and user. The command prompts for the root password in your own terminal.
   ```powershell
   cd "C:\Users\Parth Shukla\Downloads\CapstoneBoilerplate_react\capstone1-crm-boilerplate\project1\starter_code\db-setup"
   & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -e "source 01-create-database.mysql.sql"
   ```
2. **Check:** `mysql -u crm_app -p"Crm#App2026" -e "SHOW DATABASES LIKE 'nimbus_crm'"` lists `nimbus_crm`.
3. **Me:** `dotnet run --project NimbusSales.Crm.Api` from `backend/`. Migrations apply and seed data loads on start.
4. **Check:** `GET http://localhost:5080/api/deals/summary` returns 200, and `http://localhost:5176/` loads the contacts list.
5. **Me:** if migrations or seeding fail on MySQL, fix them one error at a time and show each error with its fix.
6. **Decision for you:** move the dev password and the Postmark key out of `appsettings.json` into environment variables, and make sure `.env` is in `.gitignore`? (Recommended.)

Done when: the API answers on 5080 and the CRM page shows contacts.

## Phase 2: FSD backend

1. **Environment.** Check `java -version` and `mvn -v`.
   - If missing, install JDK 21 (Temurin) and Maven, for example with winget (`winget install EclipseAdoptium.Temurin.21.JDK` and `winget install Apache.Maven`). Open a new terminal afterwards.
2. **Build.** `mvn clean verify` in `fsd-boilerplate/backend`. Fix each compile error and failing test one at a time.
3. **Unit test.** Confirm `JwtServiceTest` (5 tests) passes.
4. **Database.** You run `db/01-create-database.sql` once, with the same root-password prompt as Phase 1. It creates the `fsd` database and user on the local MySQL.
5. **Run.** Start the API on 8080 and confirm the tables are created and the two seeded users exist.
6. **Verify each flow with curl against the live API:**
   1. Register a new user. Expected 201. A duplicate username gives 409.
   2. Log in as `demo` and as `admin` in each of the three modes separately: JWT, cookie, session. Then all together, to confirm they don't conflict.
   3. Products: create, read, update, delete, search, paging. A blank name or a negative price or quantity gives a 400 with a message beside the field.
   4. Authorization: unauthenticated gets 401, USER gets 403 on delete and on `/api/users`, ADMIN succeeds.
   5. Reports: category totals match the data, low stock lists items under 5, the user report is admin-only, and the CSV opens with the right header row and values.
7. **UI.** Run the frontend against the live API and click through login, products, users and reports.
8. **README.** Follow the README exactly as a new user would (local MySQL, `mvn spring-boot:run`, `npm run dev`) and fix every wrong step. The Docker files stay in the repo as optional and are not tested.

Done when: every item in step 6 has a recorded request and response, and the README works from a clean start.

## Phase 3: CRM deal screens and review

1. **Run the review checklist (US-03 to US-07)** against the live API. Report PASS, FAIL or BLOCKED for each, with the request and the response.
2. **Build the frontend, matching the existing style** (`api/crm.ts`, `types.ts`, `constants.ts`, one page per route, `LoadStatus` for loading/ready/error):
   1. Types and API functions: deals, deal summary, stage move, contact deals, log activity.
   2. `/deals` list: 20 per page, stage filter, search, header link.
   3. `/deals/:dealRef` detail: full deal, links to its account and contact, a not-found message for an unknown ref.
   4. Create, edit and delete form: account, then contacts at that account, then title, value and close date. Field errors from a 400 show beside the input. Submit is disabled while a request runs. Delete asks first and shows the 409 message.
   5. Stage-move control: asks for a close date when winning and a reason when losing. Error messages for invalid-transition, closed-deal and delete-not-allowed live in one map, not in the component.
   6. `/pipeline` board: a column per stage with count and value, and an overall total. Totals come from the summary endpoint, not summed in the browser. A move refetches both the summary and the deals.
   7. Contact page: deals section linking to each deal, and an add-activity form that shows the new activity without a reload.
3. **Tests.** Add tests that can actually fail, for example a stage-control test and an API-error test.
4. **Checks.** Run typecheck, lint (if configured), the frontend build, Vitest and the 38 backend tests.
5. **Manual test** every new screen against the live API.
6. **Re-run the review checklist** and compare with step 1.

Done when: the checklist items are PASS or have an explained reason, and every check above passes.

---

## Working rules
- Small changes, with the relevant check after each one.
- No "works" without command output or a test result.
- No hard-coded secrets: environment variables or `.env`, with `.env` in `.gitignore`.
- Nothing working is deleted or rewritten without saying why.
- If I need your input (password, install permission, a decision), I stop and ask one question.
- After each phase: a features table (written, verified, evidence), a bugs table (file, fix), the remaining work with your next action, and a "ready for demo?" verdict.

## What I need from you, in order
1. Run the Phase 1 database command and tell me when it is done.
2. Answer the secrets question in Phase 1, step 6.
3. Before Phase 2: allow me to install JDK 21 and Maven with winget, or install them yourself.

## Capstone submission gaps today
- CRM: no database yet, no deal screens, review not run.
- FSD: backend never compiled or run.
- Both: no demo evidence yet, and `AGENTS.md` in the CRM repo is still wrong.
