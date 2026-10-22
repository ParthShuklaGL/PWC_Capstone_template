# Nimbus CRM: Capstone 1 (Deals UI)

You are joining the **frontend team** for Nimbus Sales' CRM. The backend team has finished the API: accounts, contacts, activities and a deal pipeline, behind JWT sign-in with two roles. They are handing it over to you. Your team builds the web UI in **React or Angular**, in its own repository, working through a sprint backlog the way you would at work.

**Start here:**
1. **[KT handover](docs/KT-HANDOVER.md)** ([PDF pack](docs/KT-PACK.pdf)): what exists, what the client wants, what isn't supported, and how we work.
2. **[Stakeholder brief](docs/stakeholder-brief.md)**: the client's own words.
3. **[Backlog](docs/backlog/README.md)** and **[sprint plan](docs/SPRINT-PLAN.md)**: 24 tickets over three sprints.
4. **[Designs](docs/designs/README.md)**: the design intent for the main screens.

| Folder | What it is |
|---|---|
| [`backend/`](backend/) | The REST API: Java 21, Spring Boot 3.3, Spring Security (JWT), JPA, Flyway, MySQL 8. Owned by the backend team: run it, don't change it |
| [`db-setup/`](db-setup/) | Creates the database and its user, and resets it to the seeded data |
| [`docs/`](docs/) | The handover, the brief, the backlog, the sprint plan, the designs, the spec template, the review checklist, and a reported bug |
| [`scripts/`](scripts/) | `crosscheck-backend.mjs` (end-to-end API checks) and `check-db.sql` (a read-only look at the data) |

Backend reference: [API-TESTING.md](backend/docs/API-TESTING.md) covers testing the API and reporting a defect. [DATABASE.md](backend/docs/DATABASE.md) covers the schema, keys, normalisation and exercises.

## Run the backend

You need JDK 21, Maven 3.9, Node 22 and MySQL 8.

```bash
mysql -u root -p < db-setup/01-create-database.mysql.sql   # once: database + crm_app user
cd backend && mvn spring-boot:run                          # API on http://localhost:5080
```

Check that it works:
- **Swagger UI** at http://localhost:5080/swagger-ui.html opens.
- `curl -i http://localhost:5080/api/deals` answers `401`: the API is protected.
- `mysql -u crm_app -p nimbus_crm < scripts/check-db.sql` shows 3 users, 30 accounts, 150 contacts, 224 activities, 32 deals and 12 foreign keys.
- `node scripts/crosscheck-backend.mjs` reports `122 passed, 0 failed`. It changes data, so reset afterwards:

```bash
mysql -u crm_app -p nimbus_crm < db-setup/02-reset-schema.mysql.sql   # then restart the API
```

If MySQL isn't on `localhost:3306`, set `DB_URL`, for example `DB_URL="jdbc:mysql://127.0.0.1:3307/nimbus_crm?serverTimezone=UTC"`.

## Test accounts (local development only)

| Role | Email | Password |
|---|---|---|
| ADMIN (Priya, product owner) | `admin@nimbus.test` | `Admin#2026` |
| USER (sales rep) | `aisha@nimbus.test` | `Rep#2026` |
| USER (sales rep) | `ben@nimbus.test` | `Rep#2026` |
