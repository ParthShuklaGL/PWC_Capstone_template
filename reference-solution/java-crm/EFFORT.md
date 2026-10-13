# Effort and complexity: Java (Spring Boot) versus the .NET backend

Honest numbers for comparing the two implementations of the same contract. Measured with `wc -l` on the files in this
folder and in `nimbus_crm/` (Java: `src/main/java`, `src/test/java`; .NET: `src/**/*.cs` and `tests/**/*.cs`, with `obj/`,
`bin/` excluded). "Code" lines drop blank lines and comment-only lines. Generated code is excluded where it exists (see below).

## Size

| | Java (this folder) | .NET (`nimbus_crm`) |
|---|---|---|
| Production source files | 54 `.java` | 69 `.cs` (excluding migrations) |
| Production lines (all) | 3,111 | 3,448 |
| Production lines (code only) | 2,534 | 2,620 |
| Other production files | `application.yml` (64), `application-dev.yml` (18), `V1__init.sql` (89), 2 PowerShell scripts | 3 `appsettings*.json`, 1 migration (886 lines, **generated** by `dotnet ef`, excluded above), 2 helper scripts |
| Test files | 11 `.java` | 12 `.cs` |
| Test lines (all / code only) | 2,059 / 1,690 | 1,408 / 1,116 |
| Automated tests (all pass) | 142 (86 of them need MySQL and are skipped when `CRM_TEST_MYSQL_URL` is unset) | 100 (as stated in `nimbus_crm/docs`) |
| Direct dependencies | 11 in `pom.xml` (web, security, data-jpa, mysql connector, flyway-core, flyway-mysql, 3 JJWT, springdoc, test starter) | 14 distinct package references in `src` (FluentValidation x2, Mediator x2, JwtBearer, OpenApi, EF Core x3, MySql EF provider, IdentityModel x2, Scalar, Serilog) plus xUnit, the test SDK and runner |

Where the Java lines go (production, all lines):

| Area | Java | .NET (comparable files) |
|---|---|---|
| Auth: modes, CSRF, revocation, lockout, rate limit, JWT, hashing, user list, settings | 1,024 (security 645, AuthService 116, AuthController 159, DTOs 28, settings 77) | 1,257 (Api/Auth, Infrastructure/Security, Application/Auth, AuthEndpoints, contracts, abstractions, users) |
| Accounts, contacts, deals (rules, DTOs, endpoints, list filters) | 602 | 873 |
| Validation helper | 151 | folded into the CRUD files (FluentValidation validators) |
| Reports + CSV | 233 | 262 |
| Error shapes and exception handling | 254 | 202 |
| Entities, repositories / EF mapping | 451 | 423 |
| Seeding (mostly the data tables) | 303 | 257 |
| Wiring (Program/DI, `WebConfig`, `CrmApplication`) | 65 | 173 |

The two backends are about the same size. Java is shorter where Spring Data and annotations replace explicit EF mapping and
where there is no mediator layer; it is longer where it has to hand-build what ASP.NET ships (the three-mode credential
filter, CSRF, a typed problem-document writer, a validation collector).

## Where the effort went, part by part

| Part | .NET did | Spring needed | Verdict |
|---|---|---|---|
| **Three sign-in modes in one pipeline** | A "policy scheme" selects Bearer, cookie or session per request; each scheme has its own handler; `CredentialCheck` runs after any of them. About 520 lines in `Api/Auth` (including the options, key validator and parsers). | A custom `OncePerRequestFilter` (97 lines) picks the credential and sets the `Authentication`; Spring Security is told to keep no session, no CSRF, no form login (`SecurityConfig`, 54). `JwtTokenService` (104) issues and reads two differently-audienced tokens. Spring has no built-in "cookie JWT" or "one filter, three schemes", so this is **the most custom code in the project**. | .NET easier (it is configuration there, code here) |
| **A gotcha that cost a debugging round** | n/a | With session management left on, Spring Security's session-fixation guard rotated the `crm.session` id on *every* request, because the app (deliberately) stores nothing in a security context. The symptom was a session that "worked" once and then logged out. The fix is one line (`sessionManagement(disable)`), but the cause is invisible unless you read the filter order. | Spring surprise |
| **CSRF** | `AddAntiforgery` + `IAntiforgery.GetAndStoreTokens` / `IsRequestValidAsync` (cookie token + user-bound request token) and a 38-line endpoint filter. | Spring's own CSRF is built for form posts and its `CsrfFilter` runs *before* authorization, so a USER's forbidden DELETE would answer 403 for the wrong reason. I turned it off and wrote `CsrfService` (HMAC-SHA256, JDK only, 79 lines) and a `HandlerInterceptor` (40 lines) that runs after authorization, to keep the .NET ordering. | .NET far easier |
| **Revocation (logout replay is 401)** | `DatabaseTokenRevocationList` + cleaner `BackgroundService` + memory cache + entity/mapping, about 150 lines. | `CredentialValidator` (56 lines: revoke, check, scheduled cleanup) plus a 12-line entity/repository. No cache, so it is immediate. | Comparable; Java simpler because it skips the cache |
| **Lockout and generic login failure** | `LoginCommandHandler`. | `AuthService.login`. The one subtlety: the failed-attempt counter must be saved even though the call ends in an exception, which under Spring's default transaction rules would roll it back. `@Transactional(noRollbackFor = ApiException.class)` is the fix and the sort of thing that is easy to miss. | Comparable, with a trap |
| **Rate limit** | `AddRateLimiter` fixed window, 10 lines. | No Spring built-in for this. A 71-line servlet filter (or add Bucket4j or Resilience4j). | .NET easier |
| **Password hashing** | `IPasswordHasher` over ASP.NET Identity (PBKDF2, rehash on login). | `BCryptPasswordEncoder` (a one-liner), but BCrypt reads only 72 bytes, so there is a guard, a decoy hash for timing, and a documented deviation (`PasswordService`, 44 lines). | Comparable |
| **Validation and the 400 error shape** | FluentValidation validators next to each command; keys come out as `Name`, `LostReason` for free (after dropping the `Input.` prefix). | Bean Validation produces camelCase keys and a different message format, and cannot express "LostReason is required when Stage is LOST" without a custom class-level constraint. I skipped it and wrote a 151-line `Validation` collector that emits PascalCase keys and FluentValidation-style messages, called from each service. That is also why `spring-boot-starter-validation` is not a dependency. | .NET easier; Java ended up with a small home-grown fluent validator |
| **Enum handling** | `JsonStringEnumConverter(SnakeCaseUpper, allowIntegerValues:false)` plus a 20-line `TryParseName` for the query filters. | Three Jackson switches (`ACCEPT_CASE_INSENSITIVE_ENUMS`, `FAIL_ON_NUMBERS_FOR_ENUMS`, case-insensitive properties) in 8 lines, plus the same query-filter parser (30 lines) because Spring's own `String` to enum binding is case-sensitive. Upper-case on output is free because the Java constant names are already upper-case. | Comparable, Java slightly easier |
| **Unreadable JSON, unknown enum names, wrong types as one `BAD_REQUEST`** | `BadHttpRequestException` handler. | Override `handleHttpMessageNotReadable` and `handleTypeMismatch` of `ResponseEntityExceptionHandler`. A residual gap: Jackson cannot be told to refuse `"name":123` for a text field (a deviation). | Comparable, one gap |
| **Problem-document (RFC 9457) bodies** | `AddProblemDetails`, `Results.Problem`, `ValidationProblem`. | Spring 6 has `ProblemDetail`, but the .NET field set (`type` URLs, `traceId`, `code`, `errors`) and "401/403 with an empty body" need hand-building: `Problems` (84) + `GlobalExceptionHandler` (91) + `ApiException` (63). | .NET easier |
| **401/403 with empty bodies, no redirects** | Cookie handler events. | Two lambdas in `SecurityConfig`. | Comparable |
| **Report aggregation** | LINQ `GroupBy` / correlated `Count` translated to SQL. | Four JPQL `@Query` methods with `GROUP BY` and `left join ... on`, returning interface projections; "all six stages even when empty" is filled in Java in both. The JPQL is explicit, the LINQ is implicit; both compute in MySQL. | Comparable |
| **CSV** | `CsvWriter` (62 lines). | A near line-for-line port (60). One real problem: Spring/Tomcat rewrite `Content-Type` to `text/csv;charset=utf-8` (no space), so the controller writes the bytes straight to the response and the difference is recorded. | Comparable |
| **Seeding** | `IHostedService`, same tables. | `ApplicationRunner` in the `dev` profile (92) + the same data tables (211). The one rule worth noting: `@Profile("dev")` plus `app.seed.enabled`, so production can never seed. | Comparable |
| **Persistence and schema** | EF Core entities + 6 configuration classes + a generated migration (886 lines). | JPA annotations on the entities (≈50 lines each, mostly getters and setters because I did not add Lombok) + a hand-written Flyway SQL file (89 lines). Java entities are wordier; the hand-written schema is easier to read than the generated migration. | Java entities are boilerplate-heavy |
| **List filters, paging, sorting** | LINQ `Where` / `OrderBy` / `Skip` / `Take`. | `JpaSpecificationExecutor` + a 29-line `Specs` helper + `@EntityGraph` overrides to avoid one query per row. Dynamic optional filters are more ceremony than LINQ. | .NET easier |
| **OpenAPI document** | `AddOpenApi` + Scalar UI, with hand-written `Produces` metadata. | `springdoc` (one dependency, one property) generated all 20 paths with no annotations; I hid `/health`. | Spring easier |
| **Tests** | xUnit with a throwaway-database fixture (`MySqlFixture`), skipped when `NIMBUS_TEST_MYSQL` is unset. 12 files. | JUnit 5 + a real server on a random port + a 90-line HTTP helper (`Api`) + a movable `Clock` bean + a SQL-recording `StatementInspector`. Real HTTP exercised cookies, sessions and headers for free, which is also how the session-id bug above was caught. | Comparable; Java tests are longer because they are end to end |

## What was hardest, in order

1. **Authentication that behaves like the .NET one**: the credential filter, keeping Spring Security out of the way
   (session management, CSRF, anonymous filter order), the persisted revocation, and the CSRF design. About a third of the
   production lines (1,024 of 3,111) serve the six auth routes.
2. **Matching the exact error contract** (PascalCase keys, empty 401/403 bodies, `BAD_REQUEST` for any unreadable body, 404 for
   a non-numeric id), which in Spring means overriding a framework exception handler method by method.
3. **Dynamic list queries** with optional filters and no N+1 selects.
4. Everything else (CRUD rules, reports, CSV, seeding) was straightforward ports of small, clear .NET code.

## Where Spring needed a lot of custom code to match the contract

* `CredentialAuthenticationFilter`, `JwtTokenService`, `CsrfService`, `CsrfInterceptor`, `LoginRateLimitFilter`, `PasswordService`
  (645 lines in `security/`, none of which Spring supplies as a unit).
* `Validation`, `Problems`, `GlobalExceptionHandler`, `ApiException` (about 400 lines) to reproduce one error shape.
* `Specs` and the `@EntityGraph` overrides for the filtered lists.
* Entities and DTOs: Java records make DTOs short, but entities are about 50 lines each of accessors.

## What Spring made easy

* Repositories, transactions and the `GROUP BY` report queries (a few lines each).
* Typed settings with startup validation (`@ConfigurationProperties` records: a weak signing key stops the app in one line).
* Flyway migrations and the OpenAPI document.
* Strong password hashing is a one-line bean (with the 72-byte caveat).

## Caveats on these numbers

* Line counts depend on style (Java here uses braces and one-line accessors; .NET uses file-scoped namespaces and records).
* The .NET figure for "tests" counts 100 xUnit cases; Java counts 142 because several areas (CSRF binding, forged tokens,
  SQL recording, strict JSON) were tested more finely, not because the .NET code is less tested for its own contract.
* Time: this backend, its tests and these documents were produced autonomously by an AI agent in one session, after reading the
  .NET code. No human time was measured, so no hours are claimed. The relative picture above (auth and the error shape are
  the costly parts in Spring) is the finding.
