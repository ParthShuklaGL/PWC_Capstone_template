# .NET CRM and Java CRM: what was built and what it tells us about the boilerplate

Purpose: decide how much backend functionality and complexity the frontend cohort's boilerplate should carry.
Two full CRM capstones were built to **one API contract** (the .NET OpenAPI file, `nimbus_crm/docs/openapi.json`), so the
same React frontend runs unchanged on either backend. Differences below are therefore backend differences only.

## 1. What both have

- Register, sign in, sign out in three modes (JWT Bearer, HttpOnly cookie, server session), CSRF for cookie and session, USER and ADMIN roles, lockout, rate limit, revocation of signed-out credentials.
- Accounts, contacts and deals: paged list with search and filters, get, create, update, delete (ADMIN only), with the deal rules (server-set close date, a lost deal needs a reason) and the delete refusals (409).
- Four reports with CSV download, computed by MySQL. Sample data (8 accounts, 20 contacts, 18 deals, 30 activities).
- Errors as RFC 9457 problem documents with the same field-name keys and codes.
- One React frontend: sign-in, reports, users, accounts, contacts, deals.

## 2. Results

| | .NET 10 | Java (Spring Boot 3.3, Java 21) |
|---|---|---|
| Automated tests | 100 pass (11 unit, 89 integration) against a real MySQL; run by the author of this document | 142 pass against a real MySQL (reported by the build agent; not re-run by the author) |
| CRUD proof: HTTP status sequence | reference run, 32 requests | identical, 32 of 32 (both sequences are in `reference-solution/java-crm/proof/status-sequence-comparison.txt`) |
| Same frontend, existing browser checks | 37 of 37 (reported by the build agent) | 37 of 37 (run by the author, nothing listening on the .NET port) |
| Same frontend, new CRM browser checks | 71 of 71 (reported by the build agent) | 71 of 71 (run by the author) |
| Frontend typecheck, unit tests, build | clean, 82 tests, builds (run by the author; backend independent) | |

## 3. Size and effort

| | .NET | Java |
|---|---|---|
| Production files / lines | 69 files, 3,448 lines (migration excluded) | 54 files, 3,111 lines |
| Test files / lines | 12 files, 1,408 lines | 11 files, 2,059 lines |
| Direct dependencies | 14 packages | 11 |
| Share of production code serving the six auth routes | about 1,257 lines | 1,024 lines (a third of the project) |

Frontend added for the CRM screens: 31 new files, about 2,660 lines including tests and browser scripts (reported by the build agent).
Source of the Java figures and the part-by-part notes: `reference-solution/java-crm/EFFORT.md` and `PARITY.md`.

## 4. Where the two differ

- **Authentication is the hard part in both.** .NET has built-in pieces (policy scheme, antiforgery, rate limiter, problem details). Spring has none of them as a unit, so the Java project hand-built a credential filter, CSRF service, rate-limit filter and error writer (about 645 lines of security code).
- **Validation and the 400 error shape** are easier in .NET (FluentValidation). The Java project wrote its own small validator to reproduce the same field keys.
- **Persistence and reports** are comparable. Spring Data and JPQL are shorter; Java entities are wordier.
- **Spring wins** on OpenAPI generation (one dependency), typed settings with startup checks, and Flyway migrations.
- **Deviations in Java** (documented in `PARITY.md`): passwords over 72 bytes refused (BCrypt limit), a JSON number accepted for a text field, no HTTPS redirect, HSTS or forwarded-header trust list, immediate rather than 30-second-cached revocation.
- **Gotcha found in Java:** Spring Security's session-fixation guard rotated the session id on every request until session management was disabled.

## 5. What this suggests for the boilerplate (the author's reading, for discussion)

1. **Keep authentication, CSRF, roles and the error contract inside the boilerplate.** They are where backend effort concentrates (a third of the Java code) and they are not what a frontend cohort is there to learn. Students should consume them.
2. **CRUD for accounts, contacts and deals plus four reports is the right size of surface**: enough for list, form, filter, delete-refusal, role-based and download screens, without more endpoints than a one-day build can use.
3. **The contract is portable.** Because one frontend ran on both backends, the language choice can follow the cohort rather than the capstone: Java if learners are expected to read Spring Boot controllers (as the course prerequisites say), .NET if the richer error handling and the existing test evidence matter more.
4. **Not covered by either backend**: logging activities, the Figma design, and the seeded exercises (bug, security issue, broken pipeline) for the later days.

## 6. Limits of this comparison

- Both backends and the CRM screens were built by AI agents in one working session. No human hours were measured, so no effort in hours is claimed.
- All runs used temporary MySQL databases, not a shared or developer database.
- Nothing was tried with GitHub Copilot.
- Line counts depend on code style.
