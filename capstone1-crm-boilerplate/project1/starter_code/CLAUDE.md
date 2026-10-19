# CLAUDE.md - nimbus_crm

## Overview
Nimbus CRM: accounts, contacts, activities and a deal pipeline for Inside Sales.
React frontend plus an ASP.NET Core API on MySQL. There is no authentication yet
(see "Known gaps").

## Tech stack
- Backend: .NET 10, ASP.NET Core MVC controllers, EF Core 10, solution `backend/NimbusCrm.slnx`
- Database: MySQL 8 through `MySql.EntityFrameworkCore` 10.0.9 (Oracle provider; Pomelo has no EF Core 10 release)
- API docs: `AddOpenApi` and Scalar (`MapScalarApiReference`)
- Frontend: React 19, React Router 7, TypeScript, Vite, Vitest, Playwright (e2e folder is empty)
- Backend tests: xUnit 2 and NSubstitute
- Docker is not used; MySQL runs as the local Windows service on port 3306

## Structure
```
starter_code/
  backend/NimbusSales.Crm.Api/     Web/ (controllers, Dto/, Mapping/, exception handlers)
                                   Services/  Repositories/  Domain/  Data/  Migrations/  Auditing/
  backend/NimbusSales.Crm.Tests/   service, mapper, controller and rule tests
  frontend/src/                    api/crm.ts, pages/, components/, types.ts, constants.ts
  db-setup/                        MySQL scripts (create database, reset schema)
  docs/                            stakeholder brief, user stories, specs
```

## Commands
Run from `starter_code/`.
- Build: `dotnet build backend/NimbusCrm.slnx`
- Test: `dotnet test backend` (38 tests)
- Run API: `dotnet run --project backend/NimbusSales.Crm.Api` (http://localhost:5080)
- Frontend: `cd frontend && npm run dev`, then `npm run typecheck`, `npm test`, `npm run build`
- Add a migration: `dotnet ef migrations add <Name> --output-dir Migrations --project backend/NimbusSales.Crm.Api`
  (use `--output-dir Migrations`, otherwise the files land in a folder named after the namespace)
- One-time database setup (prompts for the MySQL root password, never put it in a file):
  `cd db-setup` then `mysql -u root -p -e "source 01-create-database.mysql.sql"`
- Start over: run `db-setup/02-reset-schema.mysql.sql`, then start the API (it migrates and re-seeds on start)

The Vite dev server proxies `/api` to port 5080, so the browser sees one origin.

## Architecture rules
- Request flow: controller, then service, then repository, then `CrmDbContext`. Controllers stay thin.
- Services own business rules and throw domain exceptions (`ContactNotFoundException`, `DealStageTransitionException` and so on).
- Exception handlers in `Web/` turn those into `{ "error": CODE, "message": text }` with the right status. Add a new exception there, not a try/catch in a controller.
- DTOs and hand-written mappers live in `Web/Dto` and `Web/Mapping`. Controllers return DTOs, never entities.
- Stage rules are pure functions in `Domain/DealStageRules.cs`. Do not copy them into a controller or a React component.
- The schema is owned by migrations. Change the model, then add a migration.
- Frontend: every HTTP call goes through `frontend/src/api/crm.ts`; response types live in `types.ts`; each screen has loading, ready and error states (`LoadStatus`).

## Conventions
- C#: file-scoped namespaces, `CancellationToken` on every async method, nullable reference types on.
- Enums travel as SCREAMING_SNAKE strings on the wire (`PROSPECT`, `NEGOTIATION`).
- Amounts are GBP `decimal(18,2)`. Dates are ISO strings; `ExpectedCloseDate` is a date only.
- Names: `[Entity]Service`, `I[Entity]Repository`, `[Entity]Response`, `[Entity]CreateRequest`, `[Entity]Mapper`.
- Tests: one behavior per test, named for the behavior, for example `GetByRefReturnsTheContact`. Do not test the framework.

## NEVER
- Return an EF entity from an endpoint (`GET /api/contacts/{ref}` still does; fix it, do not copy it).
- Use AutoMapper, the EF InMemory provider, `EnsureCreated`, or lazy-loading proxies.
- Put secrets in code or committed config. Use environment variables or `.env`.
- Log tokens, passwords or request bodies.
- Hand-edit a migration that has already been applied; add a new one.
- Add a package without asking.

## Known gaps
- No authentication or authorization: no users, owners or roles. Per-rep visibility and "who moved it" cannot be built until this exists.
- `GET /api/contacts/{ref}` returns the raw `Contact`, including the finance-only `CreditRiskNote`.
- `appsettings.json` holds the dev database password and a Postmark key. Move both to environment variables.
- No frontend for deals, the pipeline board, or logging an activity (the API for all of them exists).
- MySQL stores `DateTimeOffset` as `datetime`, so the time zone offset is not kept.

## Domain terms
Account = company. Contact = person at an account. Deal = opportunity with a Stage
(Prospecting, Qualified, Proposal, Negotiation, Won, Lost). Activity = call, email, meeting
or note logged on a contact.
A deal moves one stage at a time, forward or back. It can be Lost from any open stage and
Won only from Negotiation. Won and Lost are final. Winning needs a close date and marks the
contact as a customer.

## Git
`feature/`, `bugfix/`, `hotfix/` branches; commits `type: description`; tests pass before commit.
