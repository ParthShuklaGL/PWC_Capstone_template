# Java CRM backend (Spring Boot 3 + MySQL 8)

A second implementation of the CRM API that `nimbus_crm/` (the .NET backend) already provides. It exposes the **same
routes, the same JSON and the same business rules**, so the one React frontend in `reference-solution/frontend/` can run
against either backend. Nothing in `nimbus_crm/`, `fsd-boilerplate/` or `reference-solution/frontend/` was changed.

* Java 21, Spring Boot 3.3.5 (Web, Security, Data JPA), Flyway, MySQL Connector/J, JJWT.
* Listens on **http://localhost:5091** by default (the .NET API uses 5090).
* Package `com.example.crm`: `domain`, `repo`, `service`, `web` (+ `web/dto`), `security`, `config`, `seeding`.
* What matches the .NET API and what does not: see [PARITY.md](PARITY.md). Size and effort numbers: [EFFORT.md](EFFORT.md).
  Real request/response transcripts and test output: [proof/](proof).

## Run it

You need JDK 21, Maven 3.9 and a MySQL 8 you can create a database and user in.

```sql
CREATE DATABASE crm CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'crm'@'localhost' IDENTIFIED BY '<choose a password>';
GRANT ALL ON crm.* TO 'crm'@'localhost';
```

Set the secrets in your shell (they are never in a file in this folder), then start it:

```powershell
$env:DB_PASSWORD = "<the password you chose>"
$env:JWT_SIGNING_KEY = (1..4 | % { [guid]::NewGuid().ToString("N") }) -join ""   # any random 32+ characters
.\run.ps1                    # builds if needed, starts hidden, waits for /health.  Add -RaiseLoginLimit for the proof scripts
.\stop.ps1                   # stops it
```

`run.ps1` starts the **dev** profile, which creates the tables (Flyway) and, on empty tables, the two published
development accounts and the sample data (8 accounts, 20 contacts, 18 deals, 30 activities):

| Username | Password | Role |
|---|---|---|
| `admin` | `Admin#Dev-2026!` | ADMIN |
| `demo` | `User#Dev-2026!` | USER |

These exist **only** in `application-dev.yml` / the `dev` profile. Without that profile nothing is seeded and no account exists
until someone registers (self-registration makes a USER; make an admin with SQL).

By hand: `mvn -DskipTests package` then `java -jar target/crm.jar --spring.profiles.active=dev`.

### Environment variables

| Variable | Required | Default | Meaning |
|---|---|---|---|
| `DB_PASSWORD` | yes | | MySQL password. The app will not start without it. |
| `JWT_SIGNING_KEY` | yes | | HMAC key, at least 32 characters with at least 12 different ones. A short or repetitive key stops startup. |
| `DB_URL` | no | `jdbc:mysql://127.0.0.1:3306/crm?...` | JDBC URL |
| `DB_USER` | no | `crm` | MySQL user |
| `SERVER_PORT` | no | `5091` | HTTP port |
| `LOGIN_RATE_LIMIT_PER_MINUTE` | no | `10` | Register/login attempts per client address per minute (429 beyond). `run.ps1 -RaiseLoginLimit` sets 1000. |
| `COOKIE_SECURE` | no | `false` | Set `true` behind HTTPS so cookies get the Secure flag |
| `SPRING_PROFILES_ACTIVE` | no | none | `dev` seeds the sample data and exposes `/openapi/v1.json` |

Other settings (`application.yml`): `app.auth.default-mode` (Jwt), `cookie-minutes` (60), `max-failed-logins` (5),
`lockout-minutes` (15), `bcrypt-strength` (12); `app.jwt.issuer/audience/access-token-minutes` (15); session idle time is
`server.servlet.session.timeout` (30m).

### Use it with the frontend

Point the frontend's dev-server proxy at port 5091 instead of 5090 (the API has no CORS, exactly like the .NET one):
`'/api': { target: 'http://localhost:5091' }`.

## Test it

```powershell
mvn test                     # 56 pure unit tests run; the 71 database tests are SKIPPED, not failed (BUILD SUCCESS)
```

The integration tests start the real application on a random port and talk to it over HTTP. They need a MySQL server where
the account may create and drop databases (never a database you care about; each run creates `ct_<random>` and drops it when the JVM exits):

```powershell
$env:CRM_TEST_MYSQL_URL = "jdbc:mysql://127.0.0.1:3398"      # no database name
$env:CRM_TEST_MYSQL_USER = "..."; $env:CRM_TEST_MYSQL_PASSWORD = "..."
mvn test                     # 142 tests
```

The tests cover: CRUD happy paths, validation keys, the deal close-date rules (with a movable clock), delete refusals,
ADMIN-only delete, enum case handling, strict JSON, paging limits, the four reports on a hand-computed data set and on the
real sample data (the documented numbers), proof that MySQL does the counting (the SQL is recorded), CSV text and headers,
sign-in in all three modes, logout revocation and replay, CSRF, lockout (with time travel), forged and expired tokens,
deactivated and demoted users, the user list, rate limiting, password hashing, and the shape of every error.

### Run the .NET proof scripts against this API

```powershell
.\run.ps1 -RaiseLoginLimit
$env:BASE_URL = "http://localhost:5091"
bash ..\..\nimbus_crm\scripts\crud-proof.sh
bash ..\..\nimbus_crm\scripts\auth-proof.sh
```

## The contract it implements

`openapi.json` in `nimbus_crm/docs` is the contract; in the dev profile this API also serves its own generated description at
`/openapi/v1.json` (same 20 paths). In short:

| Area | Routes |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login` (`{username,password,mode}`, mode `Jwt`/`Cookie`/`Session`), `POST /api/auth/logout`, `GET /api/auth/me`, `GET /api/auth/csrf`, `GET /api/users?page&size` (ADMIN) |
| CRM | `/api/accounts`, `/api/contacts`, `/api/deals`: `GET ?page&size&search[&filters]`, `GET /{id}`, `POST` (201 + `Location`), `PUT /{id}`, `DELETE /{id}` (204, ADMIN only) |
| Reports | `/api/reports/{deals-by-stage, contacts-per-account, activities-per-user, users-by-role}` and the same with `.csv` (`users-by-role` is ADMIN only) |
| Other | `GET /health` |

Errors are RFC 9457 problem documents (`application/problem+json`): 400 validation with PascalCase field keys
(`{"errors":{"Name":["..."]}}`), 400 `BAD_REQUEST` for unreadable JSON or an unknown/numeric enum, 401 and 403 with no body,
404 and 409 with a `code` and `detail`, 429 with no body, and a generic 500 that leaks nothing. Every `/api/**` response sends
`Cache-Control: no-store`. Timestamps are UTC ISO-8601 with `Z`; `expectedCloseDate` and `closedDate` are `yyyy-MM-dd`.

### How the three sign-in modes work here

| Mode | Credential | Stored where | Ends when |
|---|---|---|---|
| `Jwt` | `Authorization: Bearer <token>`, HS256, 15 min | nowhere (stateless); a sign-out writes its `jti` to the `revoked_tokens` table | expires, signed out, user deactivated or role changed |
| `Cookie` | HttpOnly `crm.auth` cookie holding a second, differently-audienced signed token, 60 min | same as Jwt | same |
| `Session` | HttpOnly `crm.session` cookie holding only a Tomcat session id, 30 min idle | server memory | idle, signed out, user deactivated or role changed, restart |

A Bearer header wins over the auth cookie, which wins over the session cookie. Cookie and Session requests that change data
must send `X-CSRF-TOKEN` (get one from `GET /api/auth/csrf`, which also sets the `crm.csrf` cookie); Bearer needs none.
Passwords are hashed with Spring Security's BCrypt. Five wrong passwords lock an account for 15 minutes, with the same generic
401 for every failure.

## Layout

```
src/main/java/com/example/crm
  domain/    JPA entities and enums (Account, Contact, Deal, Activity, User, RevokedToken)
  repo/      Spring Data repositories, including the GROUP BY report queries
  service/   AccountService, ContactService, DealService, ReportService, AuthService, Validation
  web/       controllers, DTO records, problem-document building, exception handler, CSV writer
  security/  the three-mode authentication filter, JWT service, CSRF, revocation, rate limit, security chain
  config/    typed settings, Jackson rules, the clock
  seeding/   dev-profile seeder and sample data
src/main/resources  application.yml, application-dev.yml, db/migration/V1__init.sql
src/test/java       integration tests (real HTTP + MySQL) and unit tests
proof/              transcripts and test output from real runs
```

## Known deviations

See [PARITY.md](PARITY.md) for the full list. The ones a frontend could notice: the CSV `Content-Type` is
`text/csv;charset=utf-8` (no space; same media type), timestamps keep microsecond digits instead of trimming zeros, a missing
`expectedCloseDate` is a 400 instead of silently becoming `0001-01-01`, and passwords longer than 72 bytes are refused at
registration.
