# CRM capstone: conclusion and how to hand it to learners

Repository: https://github.com/ParthShuklaGL/PWC_Capstone_template
Screenshot gallery (32 .NET, 31 Java): https://github.com/ParthShuklaGL/PWC_Capstone_template/blob/main/reference-solution/screenshots/README.md
Detail: [REVIEW.md](REVIEW.md) (links and evidence), [COMPARISON.md](COMPARISON.md) (.NET versus Java).

## What exists

Two full-stack CRM applications, built to **one API contract**, so the same React frontend runs unchanged on either backend.

| | .NET 10 + MySQL | Java Spring Boot + MySQL |
|---|---|---|
| Folder | `nimbus_crm/` | `reference-solution/java-crm/` |
| Frontend (shared) | `reference-solution/frontend/` | same |
| Automated tests | 100 pass | 142 pass (reported by the build agent) |
| Browser checks (same frontend) | 37 + 71 pass | 37 + 71 pass |

## Features (both)

- Register, sign in and sign out in three modes: JWT, cookie, server session. Roles USER and ADMIN. CSRF protection, lockout, rate limit.
- Accounts, contacts and deals: search, filters, paging, create, edit, delete (ADMIN only). Deal rules: the server sets the close date, and a lost deal needs a reason. Deleting a record that is still in use is refused with a reason.
- Four reports with CSV download, and an admin-only users list.
- Sample data: 8 accounts, 20 contacts, 18 deals, 30 activities.
- Errors in one standard format (RFC 9457) with field-level messages, and an OpenAPI contract.
- Frontend screens: sign-in, reports, users, accounts, contacts, deals (pipeline summary, stage change), phone and dark layouts.

## Conclusion

1. **Keep the hard backend parts inside the boilerplate:** sign-in modes, CSRF, roles and the error format. About a third of the Java code serves the six auth routes, and it is not what a frontend cohort is there to learn. Learners consume it.
2. **The CRUD size is right:** accounts, contacts and deals plus four reports give list, form, filter, refused-delete, role and download screens without more endpoints than the capstone days can use.
3. **The language can follow the cohort.** The contract is portable. Java fits the course prerequisite (read a Spring Boot controller); .NET has richer error handling and more test evidence.
4. **Not built yet:** an API for logging activities, the Figma design, the seeded exercises (bug, security issue, broken pipeline), and a trial with GitHub Copilot.

## Handing it to learners: two versions (a proposal, not yet built)

Both versions give learners the **backend and its OpenAPI contract, with no solution code**. They differ in how much frontend is supplied.

| | Easy version | Challenging version |
|---|---|---|
| What learners get | The backend, the contract, the sample data, and a frontend starter with sign-in, the API layer (including the CSRF handling) and the layout already working | The backend and the contract only |
| What they build | The accounts, contacts and deals screens: lists with search and paging, one create and edit form, the delete flow | The whole frontend: sign-in in all three modes, reports with CSV, users, accounts, contacts, deals, stage change |
| What is hard | Mapping server field errors to inputs, 401 versus 403 handling, ADMIN-only actions | Everything in the easy version, plus auth and CSRF, the "session ended" flow, a typed client from the contract, tests, accessibility, phone layout |
| Extras | Mock server from the contract so work can start before the backend runs | Seeded problems to find: a contract drift, a wrong-but-passing test, a security issue, a broken pipeline |
| Fits course days | Day 5 (contract-driven integration) and Day 6 (screens) | Days 5 to 8, then the capstone build and presentation |
| Reference to mark against | `reference-solution/` screenshots and the check logs | The same, plus the browser check scripts as an acceptance test |

**How to prepare a learner copy**
- Remove `reference-solution/` (it is the answer) and keep `nimbus_crm/` or `reference-solution/java-crm/` as the backend. The student briefs are in `nimbus_crm/docs/`.
- For the easy version, add a trimmed copy of the frontend with the screens removed. For the challenging version, add nothing.
- Hand out the screenshot gallery as the target picture, and the browser checks as the acceptance test.
- Note that the repository is public, so learners can find the solution unless it is moved to a private repo.

## Limits

Both backends and the screens were built by AI agents in one working session; no human hours were measured. All runs used temporary MySQL databases. The two learner versions above are a design proposal: the starter, the mocks and the seeded exercises still have to be made.
