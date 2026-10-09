# FSD boilerplate: React + Spring Boot + MySQL

A small full-stack app with the pieces most projects need: user accounts, a CRUD data set,
three ways to sign in, role-based access and a report.

## Run it

Needs MySQL 8, JDK 21, Maven and Node 20+. Docker is optional (see the end).

```bash
# 1. once: create the database and user (prompts for your MySQL root password)
mysql -u root -p -e "source db/01-create-database.sql"

# 2. API on http://localhost:8080 (tables are created on first start)
cd backend && mvn spring-boot:run

# 3. UI on http://localhost:5173
cd frontend && npm install && npm run dev
```

Settings come from environment variables (`DB_URL`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`,
`ADMIN_PASSWORD`, `USER_PASSWORD`, `COOKIE_SECURE`). The defaults in `application.yml` are for
local development only.

Optional: `docker compose up --build -d` runs MySQL (port 3307) and the API in containers.

Seeded logins (change them via `ADMIN_PASSWORD` / `USER_PASSWORD`):

| User | Password | Role |
|---|---|---|
| admin | Admin#12345 | ADMIN |
| demo | User#12345 | USER |

## What is where

| Need | Where |
|---|---|
| Login, register, logout, "who am I" | `AuthController` |
| Users CRUD (admin only) | `UserController`, `UsersPage.tsx` |
| Data CRUD (products) | `ProductController`, `ProductsPage.tsx` |
| Reporting + CSV export | `ReportController`, `ReportsPage.tsx` |
| Security rules | `SecurityConfig` |
| Token create/verify | `JwtService` |
| Every HTTP call from the UI | `frontend/src/api.ts` |

## Three auth modes

All three are live at once and every protected endpoint accepts any of them.

| Mode | Login endpoint | How the browser proves itself | State lives |
|---|---|---|---|
| JWT | `POST /api/auth/jwt/login` | `Authorization: Bearer <token>` | the client |
| Cookie | `POST /api/auth/cookie/login` | HttpOnly `access_token` cookie holding the JWT | the client |
| Session | `POST /api/auth/session/login` | `JSESSIONID` cookie | the server |

Logout (`POST /api/auth/logout`) ends the session and clears the cookie. A JWT cannot be
revoked before it expires (60 minutes); the client just forgets it.

## Access rules

| Endpoint | Who |
|---|---|
| `/api/auth/register`, `/api/auth/*/login` | anyone |
| `/api/products` read, create, update | any signed-in user |
| `DELETE /api/products/{id}` | ADMIN |
| `/api/users/**`, `/api/reports/users` | ADMIN |
| everything else under `/api` | any signed-in user |

## Before real use

- Set `JWT_SECRET` (32+ bytes) and the seed passwords. Set `COOKIE_SECURE=true` behind HTTPS.
- CSRF protection is off because the UI and API share an origin and cookies are `SameSite=Lax`.
  Turn it on before serving the API to any other origin.
- `ddl-auto: update` creates the tables for you. Move to Flyway or Liquibase for production.
- No login rate limiting or account lockout yet.
