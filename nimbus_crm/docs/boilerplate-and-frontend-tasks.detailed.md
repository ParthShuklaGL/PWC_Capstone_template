# CRM capstone: the boilerplate you receive, and the frontend you build (detailed version)

This is the detailed version. A shorter, plainer version with the same scope is in
[boilerplate-and-frontend-tasks.simple.md](boilerplate-and-frontend-tasks.simple.md).

## 1. How the work is split

| Part | Who | Status |
|---|---|---|
| Backend API (`nimbus_crm/src`), MySQL schema, sample data, tests | Provided (the boilerplate) | Built. Verified on a test database with 82 automated tests and a scripted live proof. |
| Frontend (React + TypeScript + Vite) | **You** | Not started. This document is your brief. |

You do not change the backend. If you think it has a bug, write it down with the request you sent and the response you got.

## 2. What the boilerplate gives you

### 2.1 Running it

Needs .NET 10 SDK and a local MySQL 8. From the `nimbus_crm` folder:

1. `scripts\setup-dev.ps1` creates the database and stores the secrets (you are prompted for passwords; nothing is written to a file in the repo).
2. `dotnet ef database update -p src/Infrastructure -s src/Api` creates the tables.
3. `dotnet run --project src/Api --launch-profile http` serves **http://localhost:5090**. On first start in Development it seeds two accounts and 76 sample records (8 accounts, 20 contacts, 18 deals, 30 activities).
4. `GET /health` returns `Healthy`. Interactive API docs are at `/scalar` (Development only).

Seeded development accounts (published on purpose, development only):

| Username | Password | Role |
|---|---|---|
| `admin` | `Admin#Dev-2026!` | ADMIN |
| `demo` | `User#Dev-2026!` | USER |

### 2.2 The API you can call

JSON property names are camelCase. All errors are RFC 9457 problem documents (`application/problem+json`):

```json
{ "type": "...", "title": "Conflict", "status": 409, "detail": "That username is already taken.",
  "code": "USERNAME_TAKEN", "traceId": "00-..." }
```
Validation failures (400) add `"errors": { "Username": ["..."], "Password": ["..."] }`, keyed by property name.

**Accounts and sign-in**

| Method and path | Needs | Request | Success | Failures |
|---|---|---|---|---|
| `POST /api/auth/register` | nothing | `{username, email, password}` | `201` user | `400` field errors; `409` `USERNAME_TAKEN` or `EMAIL_TAKEN`; `429` |
| `POST /api/auth/login` | nothing | `{username, password, mode?}` | `200` `{user, mode, accessToken, expiresAt}` | `400` bad `mode`; `401` `INVALID_CREDENTIALS`; `429` |
| `GET /api/auth/me` | signed in | none | `200` `{id, username, role, authenticatedVia}` | `401` |
| `GET /api/auth/csrf` | signed in | none | `200` `{headerName, token}` | `401` |
| `POST /api/auth/logout` | signed in (+ CSRF token for cookie and session) | none | `204` | `401`; `403` `CSRF_TOKEN_INVALID` |
| `GET /api/users?page=&size=` | **ADMIN** | page 0 to 10000, size 1 to 100 | `200` array of users | `401`; `403`; `400` |

`mode` is `"Jwt"`, `"Cookie"` or `"Session"` (names only; numbers are rejected). Leave it out and the server's default applies. A user is `{id, username, email, role, isActive, createdAt}`, and **never** contains a password.

Input rules: username 3 to 50 characters (letters, digits, `.`, `_`, `-`); email up to 160; password 10 to 100.

**Reports.** Each has a JSON route and a CSV route (`.csv` suffix). Any signed-in user may call them except `users-by-role`, which is ADMIN only.

| Report | JSON row |
|---|---|
| `deals-by-stage` | `{stage, deals, totalValue}`: all six stages `PROSPECTING, QUALIFIED, PROPOSAL, NEGOTIATION, WON, LOST`, zeros included, in pipeline order. Values are GBP. |
| `contacts-per-account` | `{accountId, account, contacts}`: biggest first, accounts with none show 0 |
| `activities-per-user` | `{userId, username, activities}` |
| `users-by-role` (ADMIN) | `{role, users}` |

CSV responses carry `Content-Type: text/csv; charset=utf-8` and `Content-Disposition: attachment; filename=<report>-<yyyy-MM-dd>.csv`.

### 2.3 The three ways to sign in (and what each means for the frontend)

| Mode | After login | How you call the API | Sign-out | Lifetime |
|---|---|---|---|---|
| `Jwt` | `accessToken` in the response body | `Authorization: Bearer <token>` header on every request | `POST /api/auth/logout` with the header | 15 minutes, no refresh |
| `Cookie` | server sets the HttpOnly `crm.auth` cookie | the browser sends it; JavaScript cannot read it | `POST /api/auth/logout` with a CSRF token | 60 minutes |
| `Session` | server sets the HttpOnly `crm.session` cookie | the browser sends it | `POST /api/auth/logout` with a CSRF token | 30 minutes idle |

Every protected endpoint accepts any of the three. A request that carries more than one is answered using the Bearer header first, then the auth cookie, then the session cookie.

**CSRF.** For Cookie and Session, any request other than GET, HEAD, OPTIONS or TRACE needs a token:

1. After signing in, `GET /api/auth/csrf`. This also sets a `crm.csrf` cookie.
2. Send `X-CSRF-TOKEN: <token>` on the state-changing request (logout, for now).
3. Fetch a new token after every sign-in; a token belongs to the user who was signed in when it was issued.

JWT requests need no CSRF token.

### 2.4 Things that will happen to your app

- A credential stops working when it is signed out, expires, or its user is deactivated or has a different role. A deactivation or role change can take up to 30 seconds to be noticed. Your app must handle a `401` on any call by returning to the sign-in screen.
- After 5 wrong passwords in a row an account is locked for 15 minutes. The response is the same generic `401`, so the UI cannot (and must not claim to) tell the user why.
- Sign-in and register are rate limited per client address (`429`).
- Sessions live in server memory: if the API restarts, session sign-ins end.
- There is **no CORS**. The browser must see the API on the same origin as the page, so use the Vite dev-server proxy (section 4.1), not direct calls to port 5090.

### 2.5 What the boilerplate does *not* give you

- No frontend at all.
- **No endpoints yet for accounts, contacts, deals or activities.** The tables and the sample data exist (and the reports read them), but there is no create, read, update or delete API for them. The deal list, deal detail, stage-move and pipeline-board screens (US-03 to US-07 in the original CRM brief) need those endpoints and are **not** part of this brief.
- No password reset, email confirmation or multi-factor sign-in.

## 3. What you build

Create `frontend/` beside `src/`: React, TypeScript, Vite, React Router. Follow these conventions (the original capstone frontend uses them too):

- Every HTTP call lives in one file (`src/api/client.ts` plus a small module per area). Components never call `fetch`.
- Response and request types live in `src/types.ts`. No `any`.
- Every screen that loads data shows **loading**, **empty** and **error** states, and uses one status type for it (`'loading' | 'ready' | 'error'`).
- One place turns a problem document into a message for the user; components do not parse error bodies.

### Task F1. Sign in, sign out, and "who am I"

**Build:** a sign-in form (username, password, sign-in method: JWT, Cookie or Session), a header showing the user's name, role and method, and a sign-out button. A register form.

**Acceptance criteria**

- Given valid credentials and each method in turn, when I sign in, then I land on the home screen and the header shows my name, role and `authenticatedVia`.
- Given a wrong password, then I see "Invalid username or password." and no field is flagged as the culprit.
- Given invalid register input, then each server message in `errors` appears beside the matching field.
- Given a `409`, then I see the server's message.
- Given I reload the page, then I am still signed in for Cookie and Session (the app calls `/api/auth/me` at start-up); for JWT I am signed in only if I chose to keep the token (see the decision below).
- Given I press sign out, then the credential is ended on the server (a replay of the old token or cookie gets `401`) and I return to the sign-in screen.
- Sign out for Cookie or Session first fetches a CSRF token and sends it. For JWT it sends the header only.
- The submit button is disabled while a request runs, so a double click cannot send two requests.

**Decision you must make and defend in your write-up:** where to keep a JWT. Memory is safest but lost on reload; `localStorage` survives reload but is readable by any script on the page. Cookie and Session avoid the question because JavaScript never sees the credential.

### Task F2. Role-aware navigation and guards

**Build:** a protected-route wrapper. Signed-out users are sent to sign-in. The "Users" link and the users-by-role report appear only for ADMIN.

**Acceptance criteria**

- Given I am USER, then I cannot see the Users link, and opening `/users` directly shows a "not allowed" message (the server's `403` is the real guard; the hidden link is only a convenience).
- Given any call returns `401`, then the app clears its signed-in state and returns to sign-in with a "session ended" notice.

### Task F3. Users list (ADMIN)

**Build:** a table of users from `GET /api/users` with paging controls (previous, next, page number).

**Acceptance criteria**

- Shows username, email, role and active status. Never shows or asks for a password.
- Page size 20; Next is disabled on the last page (a page with fewer rows than the page size); Previous is disabled on page 0.
- Loading, empty ("No users.") and error states are all present.

### Task F4. Reports page

**Build:** a page with four sections, one per report, each a table with its columns labelled for a person (not raw property names), plus a "Download CSV" button each.

**Acceptance criteria**

- `deals-by-stage` shows all six stages in pipeline order, the count and the value formatted as GBP, with two decimals.
- `contacts-per-account` lists accounts with 0 contacts too.
- `users-by-role` is shown only to ADMIN. For a USER the section is absent, not an error.
- The CSV button saves a file named as the server names it (`Content-Disposition`). In JWT mode a plain link cannot carry the header, so fetch the file with the `Authorization` header and save the response as a file.
- Each section handles loading, empty and error independently: one failing report does not blank the page.

### Task F5. Quality gates

- **API layer tests** (Vitest): sign in success, `401`, `409` with fields, a `204` with no body, and the problem-document-to-message function.
- **Component tests:** the sign-in form shows server field errors beside the right inputs; the guard redirects when signed out.
- `npm run typecheck`, `npm test` and `npm run build` all pass.
- Works at phone width (no horizontal page scroll) and can be used with the keyboard only; every input has a label.

## 4. Practical notes

### 4.1 Dev-server proxy

```ts
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': { target: 'http://localhost:5090', changeOrigin: true } } },
});
```
Call `'/api/...'` (relative) everywhere. `AllowedHosts` on the server is `localhost;127.0.0.1`, so open the app at `http://localhost:5173`.

### 4.2 Pitfalls we expect

| Pitfall | What to do instead |
|---|---|
| Calling `http://localhost:5090` directly from the page | Use the proxy and relative URLs; there is no CORS. |
| Sending the CSRF token before signing in | Fetch it after sign-in; it is tied to the signed-in user. |
| Using a CSRF token from a previous session | Fetch a fresh one after each sign-in. |
| Treating `403` as "sign in again" | `403` means signed in but not allowed (or a CSRF failure). Only `401` means signed out. |
| Telling the user an account is "locked" or "does not exist" | The server deliberately answers every failure the same; show the same message. |
| Storing the password, or logging requests that contain it | Never. |
| Parsing the error body in every component | One helper converts a problem document into a message. |

## 5. Suggested marking guide

| Area | Weight | Evidence |
|---|---|---|
| F1 sign-in, sign-out, all three modes work | 30% | Recorded run of each mode; replay of an old credential gets `401` |
| F2 guards and role handling | 15% | USER versus ADMIN walk-through |
| F3 users list | 10% | Paging and states |
| F4 reports and CSV | 20% | All four sections; CSV opens correctly |
| F5 tests and quality gates | 15% | Test output; build output |
| Write-up: token storage decision, error handling approach | 10% | One page |

## 6. Hand-in checklist

- [ ] `frontend/` with the three scripts passing
- [ ] A short screen recording or screenshots of F1 to F4
- [ ] The one-page write-up (token storage; how `401` and `403` are handled)
- [ ] A list of any backend behaviour you found surprising, with request and response
