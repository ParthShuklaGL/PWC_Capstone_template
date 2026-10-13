# Capstone CRM: project review

Repository: https://github.com/ParthShuklaGL/PWC_Capstone_template

Two boilerplates for a frontend capstone. Each gives the student a working backend; the student builds the React frontend.

| | .NET CRM | Java FSD |
|---|---|---|
| Folder | [nimbus_crm](https://github.com/ParthShuklaGL/PWC_Capstone_template/tree/main/nimbus_crm) | [fsd-boilerplate](https://github.com/ParthShuklaGL/PWC_Capstone_template/tree/main/fsd-boilerplate) |
| Stack | .NET 10, ASP.NET Core, EF Core, MySQL | Spring Boot, Spring Security, MySQL, React |
| Database | MySQL | MySQL |

## 1. What the student does (frontend)

- Build sign-in and register screens.
- Keep the signed-in state and send the credential on every call.
- Handle 401 (go to sign-in), 403 (no access) and 400 (field errors beside the inputs).
- Build the data screens and show loading, empty and error states.
- Download CSV reports.
- Show or hide actions by role (the server enforces roles anyway).

## 2. What the backend provides

### .NET CRM

- Register, sign-in and sign-out in three modes: JWT Bearer, HttpOnly cookie, server-side session.
- Roles USER and ADMIN; CSRF protection for cookie and session modes.
- Hardening: PBKDF2 hashing, account lockout, sign-in rate limit, revocation of signed-out tokens.
- Reports (JSON and CSV): deals by stage, contacts per account, activities per user, users by role (ADMIN only).
- Users list (ADMIN only, paged).
- MySQL schema (User, Account, Contact, Deal, Activity) and 78 sample records in Development.
- CRUD for accounts, contacts and deals: paged list with search and filters, get, create, update, delete (delete is ADMIN only). Deals carry the stage rules (close date set by the server, a lost deal needs a reason).
- Not provided: an API for logging activities (they only feed a report).

### Java FSD

- Register, sign-in (JWT, cookie, session), sign-out, who-am-I.
- Products CRUD: list, get, create, update, delete.
- Reports with CSV export, and an ADMIN-only users list.
- MySQL schema through Spring Data.

## 3. Reference UI screenshots

These show what a finished frontend looks like. The reference solution source is in [reference-solution](https://github.com/ParthShuklaGL/PWC_Capstone_template/tree/main/reference-solution) (mentors only: it is the answer to the student assignment).

### .NET CRM

Folder: https://github.com/ParthShuklaGL/PWC_Capstone_template/tree/main/nimbus_crm/docs/screenshots

1. [Sign in](https://github.com/ParthShuklaGL/PWC_Capstone_template/blob/main/nimbus_crm/docs/screenshots/01-sign-in.png)
2. [Wrong password](https://github.com/ParthShuklaGL/PWC_Capstone_template/blob/main/nimbus_crm/docs/screenshots/02-sign-in-wrong-password.png)
3. [Register validation](https://github.com/ParthShuklaGL/PWC_Capstone_template/blob/main/nimbus_crm/docs/screenshots/03-register-validation.png)
4. [Reports, ADMIN](https://github.com/ParthShuklaGL/PWC_Capstone_template/blob/main/nimbus_crm/docs/screenshots/04-reports-admin.png)
5. [Users, ADMIN](https://github.com/ParthShuklaGL/PWC_Capstone_template/blob/main/nimbus_crm/docs/screenshots/05-users-admin.png)
6. [Reports, USER](https://github.com/ParthShuklaGL/PWC_Capstone_template/blob/main/nimbus_crm/docs/screenshots/06-reports-user.png)
7. [No access](https://github.com/ParthShuklaGL/PWC_Capstone_template/blob/main/nimbus_crm/docs/screenshots/07-no-access.png)
8. [Session ended](https://github.com/ParthShuklaGL/PWC_Capstone_template/blob/main/nimbus_crm/docs/screenshots/08-session-ended.png)
9. [Phone, dark mode](https://github.com/ParthShuklaGL/PWC_Capstone_template/blob/main/nimbus_crm/docs/screenshots/09-reports-phone-dark.png)
10. [API documentation: all endpoints, including accounts, contacts and deals](https://github.com/ParthShuklaGL/PWC_Capstone_template/blob/main/nimbus_crm/docs/screenshots/10-api-docs-endpoints.png)
11. [API documentation: creating a deal (request body and documented responses)](https://github.com/ParthShuklaGL/PWC_Capstone_template/blob/main/nimbus_crm/docs/screenshots/11-api-docs-create-deal.png)

Screenshots 1 to 9 are of a reference frontend; 10 and 11 are the API's own documentation page. There are no frontend screens for accounts, contacts or deals yet.

### Java FSD

Folder: https://github.com/ParthShuklaGL/PWC_Capstone_template/tree/main/fsd-boilerplate/docs/screenshots

1. [Sign in](https://github.com/ParthShuklaGL/PWC_Capstone_template/blob/main/fsd-boilerplate/docs/screenshots/01-sign-in.png)
2. [Wrong password](https://github.com/ParthShuklaGL/PWC_Capstone_template/blob/main/fsd-boilerplate/docs/screenshots/02-sign-in-wrong-password.png)
3. [Register](https://github.com/ParthShuklaGL/PWC_Capstone_template/blob/main/fsd-boilerplate/docs/screenshots/03-register.png)
4. [Products, ADMIN](https://github.com/ParthShuklaGL/PWC_Capstone_template/blob/main/fsd-boilerplate/docs/screenshots/04-products-admin.png)
5. [Edit product](https://github.com/ParthShuklaGL/PWC_Capstone_template/blob/main/fsd-boilerplate/docs/screenshots/05-products-edit.png)
6. [Validation error](https://github.com/ParthShuklaGL/PWC_Capstone_template/blob/main/fsd-boilerplate/docs/screenshots/06-products-validation-error.png)
7. [Users, ADMIN](https://github.com/ParthShuklaGL/PWC_Capstone_template/blob/main/fsd-boilerplate/docs/screenshots/07-users-admin.png)
8. [Reports, ADMIN](https://github.com/ParthShuklaGL/PWC_Capstone_template/blob/main/fsd-boilerplate/docs/screenshots/08-reports-admin.png)
9. [Products, USER (limited)](https://github.com/ParthShuklaGL/PWC_Capstone_template/blob/main/fsd-boilerplate/docs/screenshots/09-products-user-limited.png)
10. [Phone, dark mode](https://github.com/ParthShuklaGL/PWC_Capstone_template/blob/main/fsd-boilerplate/docs/screenshots/10-reports-phone-dark.png)

### Full CRM screens (accounts, contacts, deals), same app on both backends

Taken on 2026-10-13 from the reference solution, with the seeded sample data. The same frontend ran unchanged against each backend.

- .NET backend: https://github.com/ParthShuklaGL/PWC_Capstone_template/tree/main/reference-solution/screenshots/dotnet
- Java backend: https://github.com/ParthShuklaGL/PWC_Capstone_template/tree/main/reference-solution/screenshots/java
- Check logs (37 and 71 browser checks per backend, 82 unit tests): https://github.com/ParthShuklaGL/PWC_Capstone_template/tree/main/reference-solution/proof
- Backend comparison: https://github.com/ParthShuklaGL/PWC_Capstone_template/blob/main/COMPARISON.md

## 4. How to review

- Read each project's README: [nimbus_crm](https://github.com/ParthShuklaGL/PWC_Capstone_template/blob/main/nimbus_crm/README.md) and [fsd-boilerplate](https://github.com/ParthShuklaGL/PWC_Capstone_template/blob/main/fsd-boilerplate/README.md).
- Student tasks for the .NET CRM: [nimbus_crm/docs](https://github.com/ParthShuklaGL/PWC_Capstone_template/tree/main/nimbus_crm/docs) (a detailed and a simple version).
- Project plan: [plan.md](https://github.com/ParthShuklaGL/PWC_Capstone_template/blob/main/plan.md).

## 5. Verification status

- .NET CRM: 100 automated tests pass against a throwaway MySQL (11 unit, 89 integration), and the accounts, contacts and deals API was exercised with real HTTP requests (statuses, bodies, roles, CSRF). The reference frontend passed 37 unit tests and 37 real-browser checks against the API before the CRUD was added; it has no screens for the CRUD yet.
- Evidence files for the .NET CRM, in the repository:
  - [Live request and response log for the CRUD API](https://github.com/ParthShuklaGL/PWC_Capstone_template/blob/main/nimbus_crm/docs/proof/crud-proof-output.txt) (status codes and bodies, roles, validation, CSRF).
  - [Full test listing](https://github.com/ParthShuklaGL/PWC_Capstone_template/blob/main/nimbus_crm/docs/proof/test-results.txt) (100 tests by name, all passed).
  - [OpenAPI contract](https://github.com/ParthShuklaGL/PWC_Capstone_template/blob/main/nimbus_crm/docs/openapi.json) exported from the running API (20 paths).
- Java FSD: backend compiles and 5 JWT tests pass. Its user stories F1 to F16 were checked in a browser (see its user-stories.md).
- Not yet done: the .NET migration has not been applied to the author's own MySQL instance; everything above ran on throwaway databases.

## 6. Known gaps

- .NET: the CRUD API exists, but no frontend screens for it have been built or screenshotted yet (the published screenshots show sign-in, reports and users).
- .NET: no API for logging activities.
- .NET: deferred hardening items (xunit v3 migration, register user enumeration, session-id rotation, shared session store).
- Java: default development secrets are public in the repository; replace them before any real use.
