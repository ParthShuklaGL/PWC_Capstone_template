# Reference solution: a working frontend for nimbus_crm

Screens: sign-in, **Reports**, **Accounts**, **Contacts**, **Deals** (each with search, filters, paging, create, edit, delete for ADMIN only, and on Deals a pipeline summary and a quick stage change) and **Users** (ADMIN).

A complete, tested React + TypeScript frontend for the `nimbus_crm` .NET API, built to the student brief in
[nimbus_crm/docs](../nimbus_crm/docs). Use it to **run the whole CRM**, to **try a change and see that nothing broke**,
and to **retake the screenshots** that are in this repository.

> **Mentors only.** This folder is the answer to the student assignment: do not give it to students. It is published in the repository so mentors can run, test and extend the whole CRM; to share the repository with students, remove this folder from their copy first.

**Two complete full-stack CRMs, one frontend.** The same React app runs unchanged against the .NET backend
([../nimbus_crm](../nimbus_crm), port 5090) and the Java Spring Boot backend ([java-crm](java-crm), port 5091), because both
implement the same API contract. Both seed the same sample data (8 accounts, 20 contacts, 18 deals, 30 activities, two users).
Verified on 2026-10-13 on throwaway MySQL 8.0 databases: the frontend passed 82 unit tests, typecheck and build, and the real-browser
suites passed **37 of 37 and 71 of 71 against each backend**. Logs are in [proof](proof) and pictures in [screenshots](screenshots).
[../COMPARISON.md](../COMPARISON.md) compares the two backends.

## What is here

```
reference-solution/
  run-all.ps1          start the .NET API and the frontend, wait until both answer
  stop-all.ps1         stop them again
  frontend/            React + TypeScript app (src/, e2e/ browser checks and screenshot generators, vite.config.ts)
  java-crm/            the Java Spring Boot backend (see its README, PARITY.md and EFFORT.md; run.ps1 / stop.ps1)
  screenshots/dotnet/  17 pictures taken against the .NET backend
  screenshots/java/    the same 17 taken against the Java backend
  proof/               test and browser-check logs (proof/dotnet, proof/java, plus the frontend unit tests and build)
```

To run the frontend against the Java backend, start it with `.\java-crm\run.ps1`, then in `frontend` run
`$env:API_URL = "http://localhost:5091"; npm run dev`.

## Run the whole CRM

One-time setup (needs the .NET 10 SDK, Node 20 or newer, and a local MySQL 8):

```powershell
cd ..\nimbus_crm
powershell -ExecutionPolicy Bypass -File .\scripts\setup-dev.ps1        # database, user and secrets (you type the passwords)
dotnet ef database update -p src/Infrastructure -s src/Api               # tables
cd ..\reference-solution
```

Then, any time:

```powershell
.\run-all.ps1        # API on http://localhost:5090, app on http://localhost:5180, opens the browser
.\stop-all.ps1       # when you are done
```

`run-all.ps1` checks the prerequisites first (secrets set, ports free, packages installed) and says exactly what is missing.
On the first start in Development the API seeds two accounts and the sample data (8 accounts, 20 contacts, 18 deals, 30 activities):

| Username | Password | Role |
|---|---|---|
| `admin` | `Admin#Dev-2026!` | ADMIN |
| `demo` | `User#Dev-2026!` | USER |

## Test it

Run these from `frontend/`:

| Command | What it does | Needs the app running? |
|---|---|---|
| `npm run typecheck` | TypeScript, strict | no |
| `npm test` | 82 unit tests: the API layer (including the CSRF header), error messages, the sign-in form, the route guards, the sign-in state and sign-out, the accounts/contacts/deals forms and pages | no |
| `npm run build` | typecheck and production build | no |
| `npm run e2e` | 37 checks in a real browser against the real API (below) | **yes** |
| `npm run e2e:crm` | 71 checks of the accounts, contacts and deals screens in a real browser against the real API (below) | **yes** |
| `npm run screenshots` | retakes the nine published screenshots | **yes** |
| `npm run screenshots:crm` | takes the eight CRM screenshots into `reference-solution/screenshots/` | **yes** |

For the last two start the app with a higher sign-in limit (the checks sign in about 30 times; the API normally allows 10 a minute):

```powershell
.\run-all.ps1 -RaiseLoginLimit
cd frontend
npm run e2e
npm run screenshots
```

`npm run e2e` drives your installed Edge (or Chrome; set `BROWSER_PATH` to use another) and checks, against the acceptance criteria in the brief:
all three sign-in modes (header, reload, sign-out, the CSRF token before a cookie or session sign-out, refusal when a signed-out
credential is replayed), the generic wrong-password message, field errors beside their inputs, the USER and ADMIN views, the report
numbers, all four CSV downloads (file name, header row, CRLF), the "session ended" flow, and that the reports page never scrolls
sideways at 320, 390, 768 and 1100 px. It registers one throwaway user per run (the API has no delete). It expects the development
sample data, so run it against a fresh development database.

`npm run screenshots` writes to `../nimbus_crm/docs/screenshots` (override with `SCREENSHOT_DIR`).
Take the screenshots on a fresh development database, or before running `npm run e2e`: the checks register a throwaway user,
which would then appear as an extra row in the users list and the activities-per-user report.

`npm run e2e:crm` creates an account, a contact and deals (named `E2E <id> ...`), edits them, checks that server field errors appear
beside the right input, that blocked deletes show the server's 409 message, that a USER sees no Delete buttons and a hand-made
delete is 403, that moving a deal to Won shows the close date the server stamped and Lost needs a reason, that search, filters and
paging change the rows and the request, that Jwt, Cookie and Session sign-ins can each create and delete a deal (Cookie and Session send
`X-CSRF-TOKEN`), and that the three lists and the deal form never scroll sideways from 320 to 1100 px. It deletes what it created
(through the UI, then a safety net through the API), so it leaves the sample data as it found it and can be run again.

`npm run screenshots:crm` writes to `reference-solution/screenshots` (override with `SCREENSHOT_DIR`): accounts list, new-account form with
server field errors, contacts filtered, deals with the pipeline summary, deal edit with the lost reason, the blocked-delete message, the
USER view without Delete buttons, and deals on a phone in dark mode. It saves nothing. Set `SCREENSHOT_DIR=screenshots/dotnet` or `screenshots/java` to keep the two sets apart.

## Making a change

1. Edit the code in `frontend/src`.
2. `npm run typecheck` and `npm test`.
3. `.\run-all.ps1 -RaiseLoginLimit`, look at it in the browser, then `npm run e2e`.
4. If a screen changed, `npm run screenshots` and look at the pictures.
5. Commit the refreshed screenshots and any doc changes. Keep this folder out of any copy you give to students.

If the **API** changes (an endpoint, a field name, an error code), update `src/types.ts` and the matching file in `src/api/`
first; nothing checks at run time that the server still sends the shape the types claim.

## Where things are

| Need | File |
|---|---|
| Every HTTP call; the 401 and 204 handling; file downloads | `src/api/http.ts` |
| Sign in, register, who am I, sign out (with the CSRF step) | `src/api/auth.ts` |
| Where the JWT is kept, and why | `src/api/tokenStore.ts` |
| Users and reports calls; CSV download | `src/api/users.ts`, `src/api/reports.ts` |
| Accounts, contacts and deals calls (list, get, create, update, delete; pickers) | `src/api/crm.ts` |
| The CSRF token on every POST, PUT and DELETE made without a JWT | `src/api/http.ts` (`csrfHeaders`) |
| Response and problem-document types | `src/types.ts` |
| Turning a failed request into words, and field messages | `src/errors.ts` |
| Signed-in state, "session ended" | `src/auth/AuthContext.tsx` |
| Route guards (signed in, ADMIN only) | `src/components/RequireAuth.tsx` |
| Page shell and navigation | `src/components/Layout.tsx` |
| Loading, empty and error handling for one report | `src/components/ReportSection.tsx`, `src/useLoad.ts` |
| The screens | `src/pages/` (`SignInPage`, `ReportsPage`, `AccountsPage`, `ContactsPage`, `DealsPage`, `UsersPage`, `NotAllowedPage`) |
| Forms, field-error mapping, dialogs, pager, pipeline summary | `src/components/` (`AccountForm`, `ContactForm`, `DealForm`, `FormFields`, `ConfirmDialog`, `LostReasonDialog`, `Pager`, `PipelineSummary`), `src/useFormState.ts`, `src/useListParams.ts`, `src/useDeleteFlow.ts` |
| Styles, light and dark, phone layout | `src/styles.css` |

## Decisions worth knowing

- **Relative `/api` URLs only.** The API sends no CORS headers, so the page and the API must share an origin; the Vite dev server proxies `/api`.
- **The JWT is kept in `sessionStorage`**: it survives a reload in the same tab, is gone when the tab closes, but a script on the page could read it. Cookie and Session sign-in avoid the question because the browser holds those credentials where scripts cannot reach.
- **401 means "not signed in", 403 means "not allowed".** A 401 from a signed-in call returns the user to sign-in with a notice; a 401 from sign-in itself is just a wrong password.
- **The server says the same thing for every failed sign-in** (wrong password, unknown user, locked account), and so does the UI.
- **Cookie and session sign-ins need the CSRF token on every change.** The shared http layer fetches one from `GET /api/auth/csrf` before any POST, PUT or DELETE when the browser holds no JWT; a Bearer caller sends none.
- **Server field errors are matched by lower-cased name** (`Website`, `FirstName`, `LostReason` ...) and shown beside the input; anything else (404, 409, 403, BAD_REQUEST) is shown as one message. The browser only checks what the server also requires (blank required fields, the lost reason).
- **Lists keep their filters and page in the address**, so "contacts of this account" and "deals of this contact" are plain links.
- **Totals are never added up in the browser.** Every number shown comes from the API.
