# Nimbus CRM API (Java)

The backend for the Nimbus Sales CRM capstone: accounts, contacts, activities and the deal
pipeline, behind JWT sign-in with two roles. It is finished and running. Your job is to build
the front end against it, test it through its API, and understand the database under it.

| | |
|---|---|
| Stack | Java 21, Spring Boot 3.3, Spring Security, Spring Data JPA (Hibernate), Flyway, MySQL 8 |
| Auth | `POST /api/auth/login` returns a JWT (HS256, 8 hours). Send it as `Authorization: Bearer <token>` |
| API docs | Swagger UI at http://localhost:5080/swagger-ui.html, OpenAPI JSON at `/v3/api-docs` |
| Data | 3 users, 30 accounts, 150 contacts, 224 activities, 32 deals across every stage |
| Tests | 40 JUnit tests (`mvn test`), plus an end-to-end check script (`scripts/crosscheck-backend.mjs`) |

**Where to go next**

- [../docs/KT-HANDOVER.md](../docs/KT-HANDOVER.md): the handover from the backend team, then the backlog in [../docs/backlog/](../docs/backlog/README.md)
- [docs/API-TESTING.md](docs/API-TESTING.md): how to test every endpoint, by hand and automatically
- [docs/DATABASE.md](docs/DATABASE.md): the schema, its keys and constraints, and why it is normalised the way it is
- [api-tests.http](api-tests.http): every endpoint, ready to click, for the VS Code REST Client extension

## Run it

You need JDK 21, Maven 3.9 and MySQL 8.

**1. Create the database and its user, once.** This needs the MySQL root password:

```bash
mysql -u root -p < ../db-setup/01-create-database.mysql.sql
```

That creates the `nimbus_crm` database and the `crm_app` user. It creates no tables.

**2. Start the API:**

```bash
mvn spring-boot:run
```

On the first start, Flyway runs `src/main/resources/db/migration/V1__schema.sql`, which creates the tables,
and then `V2__seed_data.sql`, which loads the data. Hibernate then checks that the Java entities
match the tables, and refuses to start if they don't. When `Started CrmApplication` appears, open
http://localhost:5080/swagger-ui.html.

**3. Sign in.** In Swagger UI, open `POST /api/auth/login`, choose "Try it out", and send one of
the demo accounts below. Copy the `token`, press **Authorize** at the top of the page and paste the
token there. Every request after that carries it.

### Demo accounts (local development only)

| Role | Email | Password | Who |
|---|---|---|---|
| ADMIN | `admin@nimbus.test` | `Admin#2026` | Priya Raghavan, Head of Inside Sales |
| USER | `aisha@nimbus.test` | `Rep#2026` | Aisha Khan, sales rep (owns 16 deals) |
| USER | `ben@nimbus.test` | `Rep#2026` | Ben Carter, sales rep (owns 16 deals) |

### Configuration

Every setting has a local default in `src/main/resources/application.yml` and can be overridden by
an environment variable:

| Variable | Default | |
|---|---|---|
| `DB_URL` | `jdbc:mysql://localhost:3306/nimbus_crm?serverTimezone=UTC` | |
| `DB_USERNAME` / `DB_PASSWORD` | `crm_app` / `Crm#App2026` | |
| `JWT_SECRET` | a development placeholder | At least 32 characters. Always set it outside your own machine |
| `JWT_EXPIRY_MINUTES` | `480` | |
| `PORT` | `5080` | The React starter's Vite proxy expects 5080 |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:5176,http://localhost:4200` | For a front end that calls the API directly instead of through a proxy |

PowerShell: `$env:DB_PASSWORD="..."; mvn spring-boot:run`. Bash: `DB_PASSWORD=... mvn spring-boot:run`.

### Start over

To put the data back the way it was, drop the tables and restart. Flyway will rebuild them and reload the data:

```bash
mysql -u crm_app -p nimbus_crm < ../db-setup/02-reset-schema.mysql.sql
mvn spring-boot:run
```

## What the API does

Base path `/api`. Every URL uses a business reference (`A-0008`, `C-00089`, `D-00016`, `U-0002`).
Database ids never leave the API.

| Area | Endpoint | Who |
|---|---|---|
| Auth | `POST /auth/login` | anyone |
| | `GET /auth/me` | signed in |
| | `GET /users` | ADMIN |
| Accounts | `GET /accounts`, `GET /accounts/{ref}`, `GET /accounts/{ref}/contacts` | signed in |
| | `POST /accounts`, `PUT /accounts/{ref}` | ADMIN |
| Contacts | `GET /contacts?page&size&status`, `GET /contacts/search?q`, `GET /contacts/{ref}` | signed in |
| | `POST /contacts`, `PUT /contacts/{ref}`, `POST /contacts/import` (text/csv) | ADMIN |
| Activities | `GET /contacts/{ref}/activities`, `POST /contacts/{ref}/activities` | signed in |
| Deals | `GET /deals?page&size&stage`, `GET /deals/{ref}`, `GET /deals/{ref}/history`, `GET /deals/summary`, `GET /contacts/{ref}/deals` | signed in (a USER sees only their own deals) |
| | `POST /deals/{ref}/stage` | signed in (a USER only on their own deals) |
| | `POST /deals`, `PUT /deals/{ref}`, `DELETE /deals/{ref}` | ADMIN |

### Rules the server enforces

- A deal moves forward or back **one stage at a time**. It can be LOST from any open stage, and WON
  only from NEGOTIATION. WON and LOST are final.
- Winning needs a `closeDate` and makes the contact a CUSTOMER. Losing needs a `lostReason` and
  never undoes a win.
- Only a PROSPECTING deal can be deleted. A WON or LOST deal cannot be edited.
- `value` is GBP and must be more than zero. `expectedCloseDate` cannot be in the past.
- The contact must work at the deal's account. The database enforces this as well (see DATABASE.md).
- A USER asking for another rep's deal gets **404**, not 403, so the API never confirms it exists.

### Error shapes

Every error is JSON, and your front end can rely on these shapes:

```jsonc
// 400: the body or a parameter is wrong. One message per field, ready to show beside that field.
{ "error": "VALIDATION_FAILED", "fields": { "title": "title is required", "value": "value must be greater than zero" } }

// 401, 403, 404, 409: one code to switch on, one message to show
{ "error": "UNAUTHENTICATED", "message": "Sign in to continue." }                  // no, expired or forged token
{ "error": "INVALID_CREDENTIALS", "message": "Email or password is incorrect." }   // login only
{ "error": "FORBIDDEN", "message": "Your role does not allow this action." }
{ "error": "DEAL_NOT_FOUND", "message": "No deal with reference D-99999" }        // also ACCOUNT_ / CONTACT_NOT_FOUND
{ "error": "DEAL_STAGE_TRANSITION_INVALID", "message": "Cannot move D-00001 from PROSPECTING to NEGOTIATION. A deal moves forward one stage at a time." }
{ "error": "DEAL_CLOSED", ... }  { "error": "DEAL_DELETE_NOT_ALLOWED", ... }
```

### Known issues

Open bugs are tracked as tickets in `../docs/backlog/`. If you think the backend is wrong, prove it
with a request and its response, and raise a bug report (see API-TESTING.md). Don't change it
quietly: the backend team owns this code.

## Project layout

```
src/main/java/com/nimbussales/crm/
  domain/       JPA entities and the pure stage rules (DealStageRules)
  repository/   Spring Data interfaces: the queries
  service/      business rules, transactions, the audit log
  security/     JWT issue and verify, the request filter, who may call what (SecurityConfig)
  web/          controllers, request/response records (dto/), the error handler
src/main/resources/
  application.yml
  db/migration/ V1__schema.sql (tables, keys, constraints), V2__seed_data.sql (data)
src/test/java/  unit tests (rules, JWT) and web-layer tests (security, validation, errors)
```

## Tests

```bash
mvn test                                    # 40 JUnit tests, no database needed
node ../scripts/crosscheck-backend.mjs      # 122 end-to-end checks against the running API
```

The cross-check changes data: it creates deals and closes some of them. Reset afterwards if you
want the seeded state back.
