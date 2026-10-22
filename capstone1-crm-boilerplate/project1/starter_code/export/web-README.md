# Nimbus CRM: reference front end (React)

The mentors' reference solution and demo for Capstone 1. It's a React 19 + TypeScript + Vite
single-page app that runs against the **Nimbus CRM Java API** (the `nimbus-crm-api` repository,
shipped to participants). It implements every user story, AUTH-01 to AUTH-04, C1 to C7, US-03 to
US-07 and ADM-01 to ADM-03, as an admin and as a sales rep.

> Not for participants during the capstone: it's the answer. Share the screenshots (in
> `screenshots/`, and in the API repo's `docs/screenshots/`), not this code.

## Run the demo

```bash
# 1. the API (from the nimbus-crm-api repo)
cd backend-java && mvn spring-boot:run        

# 2. this app
npm install
npm run dev                                      # http://localhost:5173, /api proxied to :5080
```

Sign in with the demo buttons on the login page: **Priya (Admin)**, **Aisha (Rep)** or **Ben (Rep)**.

### A five-minute demo script

1. Sign in as **Aisha**. The dashboard and pipeline show only her deals ("My deals", "My pipeline"). There's no New deal button anywhere.
2. Open one of her open deals. She can move it, but there's no Edit or Delete. Choose **Won** and the close date is asked for.
3. Type `/deals/new` in the address bar and the forbidden page appears. Open `/deals/D-00016` (Ben's) and it says not found, because the API answers 404.
4. Sign out, then sign in as **Priya**. She sees all 32 deals with an Owner column, can create a deal for Ben, and the form shows the server's messages beside each field.
5. Sign in as **Ben** and open the deal Priya just created for him.

## How sign-in works here

| File | Role |
|---|---|
| `src/api/crm.ts` | The only place that calls `fetch`. Adds `Authorization: Bearer <token>` to every call. A 401 ends the session |
| `src/auth/session.ts` | Keeps the token and user in `sessionStorage` (survives a refresh, gone when the tab closes) |
| `src/auth/AuthContext.tsx` | `useAuth()`, `<RequireAuth>`, `<RequireAdmin>`. After a refresh, `/auth/me` restores the user |
| `src/pages/LoginPage.tsx` | The sign-in form. `returnTo` is only followed when it's a same-site path |

Hiding a button is a courtesy. The API still refuses the action with 403 (or 404 for another
rep's deal), and the tests check both.

## Tests

```bash
npm test                     # 43 Vitest + Testing Library tests (no API needed)
npx playwright test          # 7 end-to-end specs against the running API and seeded data
SCREENSHOTS=1 npx playwright test screenshots    # re-capture every screen into screenshots/
```

Reset the database before the end-to-end run: `db-setup/02-reset-schema.mysql.sql` in the API
repo, then restart the API.

