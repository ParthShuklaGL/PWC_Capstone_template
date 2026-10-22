# Participant guide: building the front end

The backend is finished, secured and running. You build the screens that people use: sign-in,
contacts, deals, the pipeline board, and the admin screens. Each one is checked against the real
API, never against mock data. Pick React or Angular. Everything here applies to both, and the
few framework-specific parts show both.

> **Ground rules**
> - Don't change the backend. If it's wrong, prove it with a request and write it up (see API-TESTING.md, "Reporting a backend bug").
> - The server is the authority. Hiding a button from a rep is a courtesy; the 403 is the protection. Build both.
> - Every screen handles four states: **loading**, **empty**, **error**, and **loaded**.

## 0. Before you write a screen

1. Start the API (see the [README](../README.md)) and sign in through Swagger UI as each of the three demo users.
2. Send every block in `api-tests.http` once. You should know what each endpoint returns before you draw a screen for it.
3. Read `../docs/stakeholder-brief.md` and `../docs/user-stories.md`. List the questions you would ask Priya before building.
4. Point your dev server at the API with a proxy, so the browser sees one origin and CORS never comes up:

**React (Vite):** `vite.config.ts`

```ts
server: { proxy: { '/api': { target: 'http://localhost:5080', changeOrigin: true } } }
```

**Angular:** `proxy.conf.json`, then `ng serve --proxy-config proxy.conf.json`

```json
{ "/api": { "target": "http://localhost:5080", "secure": false, "changeOrigin": true } }
```

If you call the API directly instead (for example `http://localhost:5080/api` from port 4200),
your origin must be in `CORS_ALLOWED_ORIGINS`. Ports 5173, 5176 and 4200 are allowed by default.

## 1. Suggested order

Build in vertical slices. Finish one story end to end, with its tests, before you start the next.
Each slice builds on the one before.

| # | Slice | Stories | Main endpoints |
|---|---|---|---|
| 1 | Sign-in and the app shell | AUTH-01 to AUTH-04 | `POST /auth/login`, `GET /auth/me` |
| 2 | Contacts | C1, C2, C3 | `GET /contacts`, `/contacts/search`, `/contacts/{ref}`, `/contacts/{ref}/activities` |
| 3 | Deals list and detail | US-03 | `GET /deals`, `/deals/{ref}`, `/deals/{ref}/history` |
| 4 | Pipeline board | US-06 | `GET /deals/summary`, `GET /deals?stage=` |
| 5 | Moving a deal | US-05 | `POST /deals/{ref}/stage` |
| 6 | Contact page: deals and activity | US-07, C6 | `GET /contacts/{ref}/deals`, `POST /contacts/{ref}/activities` |
| 7 | Admin: create, edit and delete deals, choose an owner | US-04, ADM-03 | `POST/PUT/DELETE /deals`, `GET /users`, `GET /accounts/{ref}/contacts` |
| 8 | Admin: accounts and contacts | ADM-01, ADM-02, C4, C7 | `POST/PUT /accounts`, `POST/PUT /contacts` |
| 9 | Stretch | C5, a report of your choice | `POST /contacts/import` |

## 2. The stories

### Sign-in and roles

| ID | As a… | I want to… | Acceptance criteria |
|---|---|---|---|
| AUTH-01 | anyone | sign in with my email and password | A wrong password shows "Email or password is incorrect." and keeps the email filled in. Empty fields are flagged before sending. The button is disabled while the request is in flight. Success lands on the page I first asked for, or `/` |
| AUTH-02 | a signed-in user | stay signed in when I refresh, and be signed out when my session ends | After a refresh, the app calls `GET /auth/me` to restore the user. Any 401 from any call clears the session and returns to sign-in with "Your session has ended". A sign-out button clears everything |
| AUTH-03 | a rep | only see actions I'm allowed to take | Reps never see Create, Edit or Delete for deals, contacts or accounts, or any Admin menu. Typing an admin URL directly shows a "not allowed" page, not a broken screen |
| AUTH-04 | anyone | see who I'm signed in as | The header shows the display name and role from `/auth/me` |

### Contacts (C1–C7), deals (US-03–US-07) and admin

| ID | As a… | I want to… | Acceptance criteria (in addition to `../docs/user-stories.md`) |
|---|---|---|---|
| US-03 | rep | list my deals, 20 a page, filter by stage, and open one | The rep sees only their own deals, the admin sees all, and both show an **Owner** column. Value is shown as GBP (`£145,000.00`), dates as `23 Oct 2026`. The stage filter and page number survive a refresh (keep them in the URL) |
| US-04 | admin | create, edit and delete a deal | Pick the account first, then a contact **from that account only** (`/accounts/{ref}/contacts`). Every 400 `fields` message appears beside its input. Delete is offered only for PROSPECTING deals and asks for confirmation. A 409 `DEAL_DELETE_NOT_ALLOWED` is shown, not swallowed |
| US-05 | rep | move a deal between stages | Offer only the legal moves (one step forward, one back, LOST from any open stage, WON only from NEGOTIATION). Winning asks for a close date and losing asks for a reason. A 409 shows the server's `message`. WON and LOST deals show no move control |
| US-06 | Head of Sales | see the pipeline board | One column per stage, in pipeline order, each with a count and total. One "open pipeline" figure. The numbers come from `/deals/summary`, not from adding up a page of deals in the browser. A rep sees their own board |
| US-07 | rep | see a contact's deals and log an activity on their page | The new activity appears at the top without a full reload. The contact's "last contacted" date updates |
| ADM-01 | admin | add and edit accounts | Name is required. Each length limit is shown as the server reports it |
| ADM-02 | admin | add and edit contacts | The account is required. A bad email address shows the server's message. A new contact starts as PROSPECT |
| ADM-03 | admin | choose who owns a deal | An owner dropdown from `GET /users` on create and edit. It defaults to me. The owner shows on the list and detail pages |

## 3. Authentication, step by step

The flow is the same in every framework:

```
login form --POST /api/auth/login--> { token, expiresAt, user }
   keep token + user (+ expiresAt)
every API call:  Authorization: Bearer <token>
401 from anywhere  -> forget the token, go to /login?returnTo=<where you were>
403                -> "Your role does not allow this action." (stay on the page)
app start / refresh -> if a token is stored: GET /api/auth/me to restore the user, or treat as signed out
```

**Where to keep the token.** Keeping it only in memory is safest, but a refresh signs the user out.
`sessionStorage` survives a refresh and is cleared when the tab closes, which is a reasonable
choice for this capstone. Avoid `localStorage` for tokens in real systems: any script that runs on
the page can read it. Whichever you choose, write down why. It's a good review question.

**Attach the header in one place, never per call.**

React: one wrapper around `fetch`, used by every API function:

```ts
// src/api/http.ts
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = sessionStorage.getItem('token');
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (res.status === 401 && path !== '/auth/login') {
    sessionStorage.clear();
    window.location.assign(`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`);
  }
  if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
  return res.status === 204 ? (undefined as T) : res.json();
}
```

Angular: a functional interceptor, registered with `provideHttpClient(withInterceptors([authInterceptor]))`:

```ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token();
  const authed = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(authed).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !req.url.endsWith('/auth/login')) {
        auth.signOut();
        router.navigate(['/login'], { queryParams: { returnTo: router.url } });
      }
      return throwError(() => err);
    }),
  );
};
```

**Guard the routes.** In React, use a `<RequireAuth>` / `<RequireRole role="ADMIN">` wrapper around
route elements. In Angular, use `CanActivateFn` guards that read the signed-in user. Guards only
improve the experience. They are not security: the server checks again on every call.

**Role-aware UI.** Read `user.role` (`ADMIN` | `USER`) from the login response or `/auth/me`.
Don't decode the JWT in the browser to find the role. The API already tells you.

## 4. Showing what the server says

Write one error handler and use it everywhere:

| Status | `error` | What the user sees |
|---|---|---|
| 400 | `VALIDATION_FAILED` | Each `fields[name]` message under its input, plus a summary at the top for screen readers |
| 401 | `UNAUTHENTICATED` / `INVALID_CREDENTIALS` | Back to sign-in / "Email or password is incorrect." |
| 403 | `FORBIDDEN` | "You don't have permission to do that." |
| 404 | `*_NOT_FOUND` | A "not found" page with a link back to the list |
| 409 | `DEAL_*` | The server's `message`, as it is. It's already written for people |
| 5xx / network | — | "Something went wrong. Try again." Log the details to the console, never show a stack trace |

Formatting:
`new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value)` for money,
and `new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })`
for dates. Send dates back to the API as `yyyy-MM-dd`.

## 5. Testing your front end

Aim for three layers. Each story needs at least one test at the layer that best proves it.

| Layer | React | Angular | Prove things like |
|---|---|---|---|
| Unit / component | Vitest + Testing Library | Jasmine/Karma or Jest + Angular Testing Library | the stage control offers only legal moves; a 400 puts each message beside its field; a rep sees no Delete button |
| Mocked API | MSW (Mock Service Worker) | `HttpTestingController` | a 401 sends you to sign-in with `returnTo`; a 409 message is shown as it is |
| End to end | Playwright | Playwright or Cypress | sign in as Aisha, open the board, move one of her deals; sign in as admin, create a deal for Ben, sign in as Ben and find it |

Rules that keep tests honest:

- Assert on what the user sees (text, roles, labels), not on component internals.
- Give every test that sees "nothing" a reason to have seen something. An empty-list test passes for the wrong reason if the request never ran.
- End-to-end tests run against the real API. Reset the database first (`db-setup/02-reset-schema.mysql.sql`, then restart the API) so the data is known: 32 deals, 16 each for Aisha and Ben, and an open pipeline of £1,247,500.
- Sign in through the API in a Playwright `beforeEach` and put the token in storage. Don't type into the login form in every test (keep one test that does).

## 6. Definition of done, per story

- [ ] It works for every role that can see it, and shows the right refusal to the roles that can't
- [ ] The loading, empty, error and loaded states each exist and are reachable
- [ ] Every 400 / 404 / 409 the endpoint can return has been triggered by hand and looks right
- [ ] At least one automated test proves the acceptance criteria
- [ ] Money, dates and stage names display consistently with the rest of the app
- [ ] It works with keyboard only, and form errors are announced
- [ ] No token, password or `creditRiskNote` appears in the UI, the console or the URL
- [ ] Anything you found wrong with the backend is written up, with its request and response
