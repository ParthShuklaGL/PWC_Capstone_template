# Parity with the .NET backend (`nimbus_crm`)

Legend: **Matched** = same observable behaviour, with proof. **Differs** = a visible difference, explained. Proof pointers:
`P:` a transcript in [`proof/`](proof), `T:` an automated test (class `CrmCrudTests`, `AuthTests`, `ReportTests`, `UnitTests`,
`ErrorHandlerTests` in `src/test/java/com/example/crm`). All 142 tests pass against a real MySQL 8.0.46; see
`proof/test-results.txt`.

Headline result: the status-code sequence of `nimbus_crm/scripts/crud-proof.sh` is **identical** to the .NET run (32 of 32);
`proof/status-sequence-comparison.txt`. The three bodies that carry data (account, contact, deal) have identical field names in
identical order, and `auth-proof.sh` behaves as the .NET API does in all three modes (`proof/auth-proof-output.txt`).

## Routes and shapes

| Behaviour | Status | Proof |
|---|---|---|
| Same 20 routes (`openapi.json` path list) plus `/health` | Matched | P: headers-and-reports.txt section 10 (path-set diff against the .NET document: none missing, none extra) |
| JSON property names camelCase; field order in account, contact, deal, user, login, me, csrf, report rows | Matched | T: `anAccountCanBeCreated...`, `aContactCanBeCreated...`, `aDealIsCreated...`, `registerCreatesAPlainUser...`, `jwtLoginReturnsTheDocumentedShape` |
| Lists are `{items,page,size,total}`; `/api/users` is a plain array | Matched | T: `anAccountCanBeCreated...`, `theUserListIsAdminOnlyAndPaged` |
| `POST` gives 201 + relative `Location: /api/<resource>/<id>`; `DELETE` gives 204 | Matched | P: crud-proof-output.txt; T: all three create tests |
| Accounts carry `contactCount`; contacts `accountName`; deals `contactName/accountId/accountName/closedDate/lostReason/createdAt/updatedAt` | Matched | T: same |
| Enums are UPPER-CASE names out (`PROSPECTING`..`LOST`, `PROSPECT|CUSTOMER|CHURNED`, `USER|ADMIN`) | Matched | T: `aContactCanBeCreated...`, `aDealIsCreated...`, `usersByRoleShowsBothRolesUpperCase` |
| Enums accepted in any letter case in bodies and in the `stage`/`status` filters; numbers refused; unknown names refused | Matched | P: crud-proof sections 9, 9b, 14; T: `unreadableBodiesAndUnknownOrNumericEnums...`, `contactListFiltersByStatusInAnyCase...`, `dealListFiltersAndSortOrder` |
| Bad filter value: 400 with key `stage` / `status` (lower case, as .NET) and "Must be one of: ..." | Matched | P: crud-proof section 14 |
| Property names in request bodies matched without regard to case | Matched | T: `aJsonStringIsNotAcceptedForANumber...` |
| A JSON string is refused for a number (`"accountId":"5"` is 400) | Matched | T: same |
| A JSON number or boolean for a text field (`"name":123`) | **Differs**: Java coerces it to the text `"123"`; .NET answers 400. Jackson cannot be told to refuse this. | |
| Unreadable JSON, empty body: 400 `BAD_REQUEST`, no framework text | Matched | P: crud-proof section 9; T: `unreadableBodies...`, `anUnreadableBodyIsBadRequestWithoutFrameworkText` |
| Non-numeric id in a path is 404 (`/api/accounts/abc`), an id too big for a long too | Matched | T: `anUnknownOrNonNumericIdIsNotFound`, `anIdTooLargeForALong...` |
| Unknown route 404, wrong method 405, empty bodies | Matched | P: headers-and-reports.txt section 9 |

## CRM rules

| Behaviour | Status | Proof |
|---|---|---|
| Paging: page 0..10000, size 1..100, defaults 0 and 20; errors keyed `Page` / `Size`; non-integer is 400 `BAD_REQUEST` | Matched | T: `pagingOutsideTheLimits...`, `pagingEdgesAreAccepted`, `theUserListIsAdminOnlyAndPaged` |
| Search max 100 characters (`Search`), trimmed, case- and accent-insensitive "contains" | Matched (collation `utf8mb4_0900_ai_ci`, as .NET) | T: `anAccountCanBeCreated...` (uppercase/lowercase search), `contactListFilters...` |
| `%` and `_` typed into a search box | Java matches them literally (escaped). Not verified what the .NET provider does with them. | T: `searchTreatsPercentAndUnderscoreAsPlainText` |
| Sort orders: accounts by name, id; contacts by last name, first name, id; deals by expected close date, id | Matched | T: `anAccountListShowsContactCounts...`, `contactListFilters...`, `dealListFiltersAndSortOrder` |
| Filters: contacts `accountId`, `status`; deals `stage`, `contactId`, `accountId` | Matched | T: same |
| Max lengths (account 200/80/80/200, contact 80/80/160/40/120, deal title 200, lostReason 500), trimming, blank optional text becomes null | Matched | T: `accountMaximumLengthsAreEnforced`, `contactValidationAndMissingParents`, `dealValidationKeys` |
| Website must be a full http/https address with a host; `""` is refused, `null` is allowed | Matched | T: `aWebsiteMustBeAFullHttpOrHttpsAddress`, `UnitTests.httpAndHttps...` |
| Email rule: one `@`, not first, not last (ASP.NET attribute rule) | Matched | T: `UnitTests.badEmailsFail` |
| Deal value 0..1 000 000 000 000, at most 2 decimals | Matched | T: `dealValidationKeys` |
| Deal `closedDate` set by the server (today, UTC) on WON/LOST, ignored if the caller sends one, kept on later edits and on WON to LOST, cleared on reopen, set again on re-close | Matched | P: crud-proof sections 7 and 8; T: `closedDateIsSetByTheServerInUtcKept...` (clock frozen at 23:30 UTC) |
| LOST needs `lostReason` (blank refused, key `LostReason`); other stages clear it | Matched | P: crud-proof section 7; T: `lostNeedsAReasonAndOtherStagesClearIt` |
| 404 codes `ACCOUNT_NOT_FOUND`, `CONTACT_NOT_FOUND`, `DEAL_NOT_FOUND` (also for a missing parent on create/update) | Matched | T: `contactValidationAndMissingParents`, `dealValidationKeys` |
| 409 `ACCOUNT_HAS_CONTACTS`; 409 `CONTACT_HAS_HISTORY` (a deal or an activity) | Matched | P: crud-proof section 11; T: `deleteRefusalsAndAdminOnlyRule`, `aContactWithOnlyAnActivity...` |
| DELETE is ADMIN only: USER 403 (empty body), anonymous 401, and a role refusal comes before "not found" | Matched | P: crud-proof section 11; T: `deleteRefusalsAndAdminOnlyRule` |
| Missing `stage` means PROSPECTING, missing `status` PROSPECT, missing `accountId`/`contactId` is 0 and refused | Matched | |
| Missing `expectedCloseDate` | **Differs**: Java answers 400 (`ExpectedCloseDate`); .NET silently stores `0001-01-01`. | |
| Missing `value` | Matched in effect (treated as 0) | |

## Authentication

| Behaviour | Status | Proof |
|---|---|---|
| Register: 201 plain USER, no hash in the response; 409 `USERNAME_TAKEN`/`EMAIL_TAKEN`; 400 keys `Username`/`Email`/`Password` with the same length and character rules | Matched | P: auth-proof section 0; T: `registerCreatesAPlainUser...`, `registerRefusesDuplicates...`, `registerValidationUsesPascalCaseKeys` |
| Password over 72 UTF-8 bytes | **Differs**: refused at register (BCrypt reads only 72 bytes; Java refuses rather than silently truncating). .NET accepts up to 100 characters. | T: `registerValidation...`, `UnitTests.anOverlongPasswordIsNeverSilentlyTruncated` |
| Login `{user,mode,accessToken,expiresAt}`; mode `Jwt|Cookie|Session` any case, default Jwt; bad mode (numbers, lists, unknown) is 400 key `Mode` | Matched | P: auth-proof section 1; T: `jwtLoginReturnsTheDocumentedShape`, `theModeDefaultsToJwt...`, `anUnknownOrNumericModeIsRefused` |
| One generic 401 `INVALID_CREDENTIALS` for unknown user, wrong password, locked, deactivated | Matched | P: auth-proof section 0b; T: `everyLoginFailureGivesTheSameAnswer`, `fiveWrongPasswordsLock...` |
| Lockout after 5 failures for 15 minutes (counter resets on success and when a lockout starts) | Matched | T: `fiveWrongPasswordsLock...`, `aGoodLoginResetsTheFailureCount`, `failuresAgainstOneAccountDoNotLockAnother` |
| Login rate limit per client address, default 10/minute, configurable; 429 with no body | Matched | T: `UnitTests.loginAndRegisterAreLimitedPerClientPerMinute` (filter); the proof scripts ran with 1000 |
| `/api/auth/me` `{id,username,role,authenticatedVia}` with `Bearer`/`Cookies`/`Session` | Matched | P: auth-proof section 1; T: `meReportsTheCredentialThatWasUsed` |
| Bearer wins over cookie wins over session; an invalid Bearer is not rescued by a good cookie | Matched | P: auth-proof section 2; T: `aBearerHeaderWins...` |
| Logout ends only the credential used; the other two modes keep working | Matched | P: auth-proof section 2; T: `signingOutOfOneModeLeavesTheOthersWorking` |
| Logout revokes a JWT/cookie (replay is 401), session is destroyed (replay is 401); revocations persist in the database | Matched | P: auth-proof sections 1A, 1B, 1C; T: `loggingOutAJwtRevokesIt`, `cookieLogoutNeeds...`, `sessionLogoutDestroys...` |
| JWT 15 min / cookie 60 min / session 30 min idle; 30 s clock skew | Matched | T: `jwtLifetimeIsFifteenMinutesAndCookieLifetimeSixty` (session idle time is Tomcat's, not unit-tested) |
| Tampered, unsigned (`alg:none`), other-key, wrong-audience tokens refused; cookie value is not a valid Bearer token and vice versa | Matched | P: auth-proof section 3 (tampered); T: `forgedAndMisdirectedTokensAreRefused` |
| Deactivated or demoted user refused on the next request; deleted user refused | Matched, **stricter**: Java checks the database on every request, so it is immediate. The .NET API caches the user for up to 30 s. | T: `aDeactivatedUserIsRefused...`, `aChangedRoleEndsOldCredentials`, `aDeletedUsersCredentialIsRefused` |
| `GET /api/auth/csrf` returns `{headerName:"X-CSRF-TOKEN",token}` and sets HttpOnly `crm.csrf` (SameSite=Strict) | Matched | T: `csrfEndpointReturnsTheHeaderName...` |
| Cookie/session requests that change data without a valid token: 403 `CSRF_TOKEN_INVALID` (title "Invalid or missing CSRF token."); Bearer needs none; reads need none | Matched | P: crud-proof section 13, auth-proof 1B/1C; T: `cookieAndSessionChangesNeedTheToken...` |
| A token is tied to the user and to the cookie it was issued for | Matched | T: `aTokenBelongsToTheUserAndTheCookieItWasIssuedFor` |
| A role refusal (403, no body) comes before the CSRF check | Matched | T: `aRoleRefusalComesBeforeTheCsrfCheck` |
| `GET /api/users` ADMIN only: 401 / 403 / 200, paged, plain array, no password field | Matched | P: auth-proof section 3; T: `theUserListIsAdminOnlyAndPaged`, `...InEveryMode` |
| Passwords hashed with a standard algorithm, never returned or logged | Matched in kind: Spring Security **BCrypt** (work factor 12). The .NET API uses ASP.NET Identity PBKDF2. The hashes are not interchangeable. | T: `registerCreatesAPlainUser...`, `passwordsAreHashedWithASalt...`, `UnitTests.passwordsAreHashedAndVerified` |
| Signing key and DB password from the environment only; weak key stops startup; dev accounts only in the `dev` profile | Matched | T: `UnitTests.aShortOrRepetitiveSigningKeyStopsStartup`, `aMissingKeyStopsStartup...`; README |
| Cookie value format | **Differs** (invisible to clients): a signed JWT (readable, not encrypted: user id, name, role) instead of an ASP.NET data-protection ticket. HttpOnly, so scripts cannot read it. | |
| CSRF token format | **Differs** (opaque to clients): HMAC-SHA256 over the cookie value and user id, instead of the ASP.NET antiforgery format. | |
| `Cache-Control: no-store` on every `/api/**` response (including 401, 403, errors) | Matched (superset: .NET omits it on a 401 from the auth middleware) | P: headers-and-reports.txt section 8; T: `responsesAreNeverCachedAndCarryTheHardeningHeaders` |
| `nosniff`, `Referrer-Policy: no-referrer` | Matched. Spring also adds `X-Frame-Options: DENY` and `X-XSS-Protection: 0`. | P: any transcript |
| HTTPS redirect, HSTS, forwarded-header trust list, `AllowedHosts` host filter, persistent data-protection keys | **Not implemented** (deployment concerns of the .NET host; behind a TLS proxy set `COOKIE_SECURE=true`) | |

## Reports

| Behaviour | Status | Proof |
|---|---|---|
| `deals-by-stage`: all six stages in pipeline order, upper-case names, zero rows included, GBP `totalValue` | Matched | P: headers-and-reports.txt section 1; T: `dealsByStageListsAllSixStages...`, `anEmptyDatabaseStillShowsEverySlot` |
| `contacts-per-account`: biggest first then name, zero-contact accounts shown | Matched | P: section 2; T: `contactsPerAccountCounts...` |
| `activities-per-user`: most active first then username, users with none show 0 | Matched | P: section 3; T: `activitiesPerUserCountsEveryUser...` |
| `users-by-role`: USER then ADMIN, ADMIN only (403 empty body for USER, JSON and CSV) | Matched | P: section 5; T: `usersByRoleIsAdminOnly...` |
| Seed numbers equal the .NET screenshot: stages 3,3,3,2,5,2 with 46850.50, 94650.00, 99100.75, 147500.00, 137400.00, 27450.00; contacts 4,3,3,3,3,2,2,0; activities admin 20, demo 10 | Matched | P: headers-and-reports.txt sections 1-3; T: `theSampleDataProducesTheDocumentedReportNumbers` |
| Aggregates computed by MySQL, not in memory | Matched | T: `aggregatesAreComputedByMySqlNotInMemory` records the SQL: one `GROUP BY` + `COUNT(`/`SUM(` statement per report |
| CSV: header row, column order and names (`Stage,Deals,TotalValueGbp`, `AccountId,Account,Contacts`, `UserId,Username,Activities`, `Role,Users`), RFC 4180, CRLF, UTF-8 without BOM, dot decimals with two places, formula defusing with a leading `'` | Matched | P: headers-and-reports.txt sections 6-7; T: `dealsByStageCsvIsRfc4180...`, `csvTextIsUtf8WithoutABomAndDefusesFormulas`, `UnitTests.cells...` |
| `Content-Disposition: attachment; filename=<name>-<yyyy-MM-dd>.csv` (UTC date), `Cache-Control: no-store` | Matched | T: `csvResponsesCarryTheDownloadHeaders`, `theFileNameDateIsTheUtcDate` |
| `Content-Type: text/csv; charset=utf-8` | **Differs by one space**: Tomcat sends `text/csv;charset=utf-8`. Same media type and parameter. | P: headers-and-reports.txt section 6 |

## Errors and housekeeping

| Behaviour | Status | Proof |
|---|---|---|
| 400 validation: `type`, `title:"One or more validation errors occurred."`, `status`, `errors{PascalCase: [messages]}`, `traceId` | Matched (keys, status, title). Messages are FluentValidation-style but not always word for word; where .NET reports several messages for one field (for example an empty username gives three) Java may report fewer. | P: crud-proof section 4, 7 |
| 404/409/401 problems carry `code`, `detail`, `title`, `status`, `type` (`rfc9110#section-15.5.x`) | Matched | P: crud-proof sections 5, 11, 12 |
| `traceId` | **Differs**: a random W3C-shaped id, not linked to a real trace | |
| Generic 500 leaks nothing (title only); duplicate-key race is 409 `DUPLICATE_VALUE` | Matched | T: `ErrorHandlerTests` |
| Timestamps UTC ISO-8601 with `Z` | Matched, but Java keeps microsecond digits (`...16.347650Z`) where .NET trims trailing zeros (`...16.34765Z`). Both parse the same. | P: crud-proof section 2 |
| `expectedCloseDate` / `closedDate` as `yyyy-MM-dd` | Matched | P: crud-proof section 7 |
| `GET /health` returns `Healthy` | Matched (also checks the database; 503 `Unhealthy` if it fails) | T: `healthAnswersHealthyAndUnknownRoutes...` |
| OpenAPI document at `/openapi/v1.json` (dev profile) | Matched in paths (the same 20); generated by springdoc, so schemas and wording are not identical to the .NET document | P: headers-and-reports.txt section 10 |
| Logging | Spring Boot console logging instead of Serilog; request bodies, passwords, tokens and hashes are never logged | |
