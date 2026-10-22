# Nimbus CRM: Capstone 1 backend and participant kit

You're the front-end developer at **Nimbus Sales**. A platform team has finished the CRM's
backend: accounts, contacts, activities and a deal pipeline, behind JWT sign-in with two roles.
Nothing renders it yet. Your job is to build the front end, in **React or Angular**, against this
real, running API.

| | |
|---|---|
| `backend-java/` | The API: Java 21, Spring Boot 3.3, Spring Security (JWT), JPA, Flyway, MySQL 8. **Run it, don't change it.** |
| `db-setup/` | Creates the database and its user, and resets it to the seeded state |
| `docs/` | The brief, the user stories (**including the planted defects you must find**), a bug report, a spec template, the review checklist, and reference screenshots of every screen |
| `scripts/crosscheck-backend.mjs` | 127 end-to-end checks that prove the API behaves as documented |

## Start in five minutes

You need MySQL 8, JDK 21 and Maven 3.9.

```bash
mysql -u root -p < db-setup/01-create-database.mysql.sql   # once: database + crm_app user
cd backend-java
mvn spring-boot:run                                          # http://localhost:5080
```

Then open **http://localhost:5080/swagger-ui.html**, sign in with `POST /api/auth/login`, press
**Authorize**, and paste the token.

| Role | Email | Password |
|---|---|---|
| ADMIN | `admin@nimbus.test` | `Admin#2026` |
| USER (sales rep) | `aisha@nimbus.test` | `Rep#2026` |
| USER (sales rep) | `ben@nimbus.test` | `Rep#2026` |

Check that everything works: `node scripts/crosscheck-backend.mjs` should print `127 passed, 0 failed`.
It changes some data, so reset afterwards (see `backend-java/README.md`, "Start over").

## Then build your front end, in its own repository

1. Read `docs/stakeholder-brief.md` and `docs/user-stories.md`, including the **⚠ Planted defects** section.
2. Follow **`backend-java/docs/PARTICIPANT-GUIDE.md`**: the build order, the sign-in flow for React and
   Angular, how to show the server's errors, how to test, and the definition of done.
3. Look at **`docs/screenshots/`** to see one way each story can look, as an admin and as a rep.
4. Test the API as you go: **`backend-java/docs/API-TESTING.md`** and **`backend-java/api-tests.http`**.
5. Understand the data: **`backend-java/docs/DATABASE.md`** covers the tables, keys, constraints and normalisation, with exercises.

Create your front end in a **separate repository** (for example `nimbus-crm-ui-react` or
`nimbus-crm-ui-angular`), and point its dev-server proxy at `http://localhost:5080`. Raise
backend problems as bug reports with a request and its response. Don't edit this code.
