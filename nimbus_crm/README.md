# nimbus_crm

.NET 10 API with MySQL. Layers: `src/Domain` (no dependencies), `src/Application` (handlers, validators, interfaces), `src/Infrastructure` (EF Core, password hashing, seeding), `src/Api` (endpoints only).

## First-time setup

1. **Database.** Create `nimbus_crm` and a `crm_app` user yourself, as root, choosing your own password (never put it in a file):

   ```powershell
   $mysql  = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
   $secure = Read-Host "Choose a password for the crm_app MySQL user" -AsSecureString
   $pw     = [System.Net.NetworkCredential]::new("", $secure).Password
   $sql    = "CREATE DATABASE IF NOT EXISTS nimbus_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci; CREATE USER IF NOT EXISTS 'crm_app'@'localhost' IDENTIFIED BY '$pw'; GRANT ALL PRIVILEGES ON nimbus_crm.* TO 'crm_app'@'localhost';"
   & $mysql -u root -p -e $sql
   ```

2. **Secrets.** Neither value is stored in a file. Use user-secrets (or the environment variables `ConnectionStrings__Crm` and `Jwt__SigningKey`):

   ```powershell
   dotnet user-secrets set "ConnectionStrings:Crm" "Server=localhost;Port=3306;Database=nimbus_crm;User=crm_app;Password=$pw" --project src/Api
   $bytes = [byte[]]::new(48); [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
   dotnet user-secrets set "Jwt:SigningKey" ([Convert]::ToBase64String($bytes)) --project src/Api
   ```

   The API refuses to start without a connection string, or with a signing key shorter than 32 characters.

3. **Schema.** `dotnet ef database update -p src/Infrastructure -s src/Api`

4. **Run.** `dotnet run --project src/Api --launch-profile http` serves http://localhost:5090. API docs: `/scalar`. Health: `/health`.

## Development accounts

On an empty `Users` table, **only when the environment is Development and `Seed:Enabled` is true** (it is, in `appsettings.Development.json`), the API creates two accounts (section `Seed`):

| Username | Password | Role |
|---|---|---|
| `admin` | `Admin#Dev-2026!` | ADMIN |
| `demo` | `User#Dev-2026!` | USER |

These are published development credentials. They are never created in any other environment. Do not reuse them.

## Signing in: three ways, one rule

`POST /api/auth/login` with `{"username", "password", "mode"}`. `mode` is `Jwt`, `Cookie` or `Session`; leave it out and `Auth:DefaultMode` from configuration is used.

| Mode | What the client gets | How the client calls the API | `POST /api/auth/logout` |
|---|---|---|---|
| Jwt | `accessToken` in the response (15 minutes) | `Authorization: Bearer <token>` | token id is stored in the `RevokedTokens` table until it would expire |
| Cookie | `crm.auth` cookie (HttpOnly, SameSite=Lax) | the browser sends it | cookie cleared, its id stored as revoked |
| Session | `crm.session` cookie (HttpOnly, SameSite=Lax); the login lives on the server | the browser sends it | the server session is destroyed |

Every protected endpoint says only `RequireAuthorization()`. A single default scheme looks at the request and forwards to the right handler, so the same rule works for all three. `GET /api/auth/me` includes `authenticatedVia` to show which one answered.

**Precedence when a request carries more than one credential:** Bearer header, then the auth cookie, then the session cookie. The chosen credential decides the outcome; the others are not tried. Logout ends only the credential the request used, so signing out of one mode leaves the others signed in.

## CSRF

Cookie and session logins are sent by the browser on its own, so a state-changing request (anything other than GET, HEAD, OPTIONS, TRACE) authenticated that way needs an anti-forgery token:

1. `GET /api/auth/csrf` (signed in) returns `{"headerName":"X-CSRF-TOKEN","token":"..."}` and sets a `crm.csrf` cookie.
2. Send the token in the `X-CSRF-TOKEN` header. Fetch a new one after each login: the token is tied to the signed-in user.

A request without it gets `403` with code `CSRF_TOKEN_INVALID`. Bearer requests need no token. Login and register are open and are not CSRF-protected.

## Reports

Every report has a JSON route and a CSV route. All of them need a signed-in caller (any mode); users-by-role is **ADMIN only** (anonymous 401, USER 403).

| Report | JSON | CSV |
|---|---|---|
| Deals by stage: count and total value (GBP) for all six stages | `GET /api/reports/deals-by-stage` | `GET /api/reports/deals-by-stage.csv` |
| Contacts per account, biggest first, accounts with none show 0 | `GET /api/reports/contacts-per-account` | `GET /api/reports/contacts-per-account.csv` |
| Activities logged per user, most active first | `GET /api/reports/activities-per-user` | `GET /api/reports/activities-per-user.csv` |
| User counts by role (ADMIN only) | `GET /api/reports/users-by-role` | `GET /api/reports/users-by-role.csv` |

All counts and sums are computed by MySQL (`GROUP BY`, `COUNT`, `SUM`); the API never adds rows up in memory. The only in-memory step is listing a stage or role that has no rows as 0.

The CSV is RFC 4180: comma separated, CRLF line ends, UTF-8 without a byte-order mark, a header row, quotes doubled. Numbers use a dot and two decimals whatever the server's culture. Text starting with `=`, `+`, `-` or `@` gets a leading `'` so a spreadsheet will not run it as a formula. Responses carry `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename=<report>-<yyyy-MM-dd>.csv` and `Cache-Control: no-store`. Excel may need "Data > From Text/CSV" to read UTF-8 non-ASCII names correctly.

Sample data: in Development the API also seeds 8 accounts, 20 contacts, 18 deals and 30 activities (78 records with the two users), so every report shows real numbers. It only runs on empty tables, so a restart never duplicates anything. Each activity records the user who logged it (`Activities.UserId`); that is what "activities per user" counts.

## Tests

`dotnet test nimbus_crm.slnx` runs everything that needs no database (52 tests). The 30 tests that run the report, login, lockout, revocation and credential checks against a real MySQL are skipped until you point them at a server whose account may create and drop databases:

```powershell
$env:NIMBUS_TEST_MYSQL = "Server=127.0.0.1;Port=3306;User=root;Password=<password>"
dotnet test nimbus_crm.slnx
```

Each test class creates its own throwaway database (`nt_<random>`), builds it with the real migrations, and drops it afterwards. Never point this at a server holding data you care about.

## Roles

`USER` and `ADMIN`. Self-registration always creates a `USER`. `GET /api/users` (list users, no password data) is `ADMIN` only: anonymous gets 401, a USER gets 403, an ADMIN gets 200.

## Keeping credentials honest

After a JWT, cookie or session passes its own check, every request is checked once more: the user must still exist, be active, and still have the role the credential was issued with, and a JWT or cookie must not be on the revoked list. The revoked list lives in the database (`RevokedTokens`), so a restart or a second API instance does not bring a signed-out credential back. The user lookup is cached for 30 seconds, so deactivating a user or changing their role takes effect within that time. A background job deletes expired revoked rows hourly.

**Lockout.** After `Auth:MaxFailedLogins` (5) wrong passwords in a row an account refuses every sign-in, even with the right password, for `Auth:LockoutMinutes` (15). The answer is always the same generic 401, so it does not reveal which accounts exist or are locked. A good sign-in resets the count. Together with the per-address rate limit this slows guessing from one address and against one account; it also means someone can deliberately lock a known username for 15 minutes.

**Passwords.** PBKDF2-HMAC-SHA512 with 220,000 iterations (OWASP's figure for that function). A hash made with fewer iterations still works and is replaced by a stronger one at the next good sign-in.

**Signing key.** Must be 32+ characters with at least 12 different ones. To rotate: put the new key in `Jwt:SigningKey` and the old one in `Jwt:PreviousSigningKeys` (an array); old tokens keep verifying but new ones are signed with the new key. Remove the old key after `Jwt:AccessTokenMinutes`.

## Running behind a proxy, in production

| Setting | Meaning |
|---|---|
| `Network:TrustedProxies` | IP addresses of your reverse proxies (array). `X-Forwarded-For` and `X-Forwarded-Proto` are only believed from these and from loopback. Without this behind a proxy, every caller shares one rate-limit bucket. |
| `Security:RequireHttps` | `true` outside Development. Redirects HTTP to HTTPS once an HTTPS port is known (`ASPNETCORE_HTTPS_PORT`, or a proxy that sends `X-Forwarded-Proto: https`). HSTS is sent outside Development, over HTTPS, for non-local hosts. |
| `AllowedHosts` | `localhost;127.0.0.1` by default. Set it to your real host names. |
| `Docs:Enabled` | The OpenAPI document and `/scalar` exist only in Development unless this is `true`. |
| `DataProtection:KeysPath` | A directory for the key ring that protects auth cookies, session cookies and anti-forgery tokens. Set it to persistent storage (shared between instances) or every restart signs everyone out. Keys are stored unencrypted unless you add key protection for your host. A warning is logged outside Development if it is not set. |

Every response also carries `X-Content-Type-Options: nosniff` and `Referrer-Policy: no-referrer`; responses that carry tokens or report data carry `Cache-Control: no-store`.

## Configuration

| Key | Default | Meaning |
|---|---|---|
| `Auth:DefaultMode` | `Jwt` | mode used when a login names none, and which scheme answers a 401 with no credential |
| `Auth:CookieMinutes` | 60 | lifetime of the auth cookie |
| `Auth:SessionIdleMinutes` | 30 | session idle timeout |
| `Auth:LoginRateLimitPerMinute` | 10 | login and register attempts per client address per minute (429 beyond it) |
| `Auth:MaxFailedLogins`, `Auth:LockoutMinutes` | 5, 15 | account lockout (see above) |
| `Seed:Enabled` | `true` in Development file only | allows the development seeder to run |
| `Jwt:Issuer`, `Jwt:Audience`, `Jwt:AccessTokenMinutes` | see `appsettings.json` | token settings |
| `Jwt:SigningKey` | none, required | secret, 32+ characters, user-secrets or environment only |

## Known limits

- **Sessions are still held in memory.** A restart signs session users out (they just sign in again), and several API instances do not share sessions. Signed-out JWTs and cookies do survive restarts (see above). A shared session store needs a distributed-cache package that this solution does not include.
- Session ids are not rotated at sign-in, which is the built-in session's design. The remaining risk needs an attacker who can plant a cookie in the victim's browser. The fix is to replace the built-in session with a server-side ticket store, which is a design change.
- Register still says when a username or email is taken (409). That is a deliberate usability trade-off; the rate limit and lockout slow enumeration. Removing it needs email confirmation.
- A role change or deactivation can take up to 30 seconds to reach a signed-in user (the cache above).
- The rate limit and lockout counters are per account in the database, but the rate limiter itself is per instance.
- No breached-password check and no multi-factor sign-in.
- Data protection keys are not encrypted at rest by this app; protect the key directory or add key protection for your host.
