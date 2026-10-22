# Nimbus CRM

Accounts, contacts, activities and the deal pipeline for Nimbus Sales.

```bash
cd backend-java && mvn spring-boot:run      # Java API on http://localhost:5080 (Swagger UI: /swagger-ui.html)
cd frontend && npm install && npm run dev   # React front end, proxies /api to 5080
```

Every endpoint except sign-in needs a bearer token. Sign in as `admin@nimbus.test` / `Admin#2026`,
or as a rep: `aisha@nimbus.test` or `ben@nimbus.test` / `Rep#2026`.

Start with [backend-java/README.md](backend-java/README.md), then
[backend-java/docs/PARTICIPANT-GUIDE.md](backend-java/docs/PARTICIPANT-GUIDE.md).

`backend/` holds the earlier ASP.NET Core version of the same API. It is kept for reference.
